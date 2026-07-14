// Surrender / leave-game support for Tactical Risk multiplayer
// Applies a surrender directly to a serialized game state (the `state` field of a
// Firestore game document), so a player can leave a game from the "My Games" list
// without loading the full game session.
//
// The transform mirrors the live-session rules in gameState.js:
// - the player keeps their slot in players[] but is flagged `surrendered`
//   (nextTurn / finishPlacementRound / placeCapital skip surrendered players)
// - their territories become neutral and their capital stops counting for victory
// - their units are removed from the board (including carrier/transport cargo)
// - if it was their turn, the turn advances to the next non-surrendered player

import {
  doc,
  runTransaction,
  serverTimestamp,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from './firebase.js';

const PHASE_PLAYING = 'playing';
const PHASE_UNIT_PLACEMENT = 'unit_placement';
const TURN_PHASE_TECH = 'develop_tech';

// Mutates the serialized state in place. Returns a summary:
// { changed, currentPlayerId, gameOver, humansRemain }
export function applySurrenderToState(state, oderId) {
  const result = { changed: false, currentPlayerId: null, gameOver: false, humansRemain: false };
  if (!state?.players) return result;

  const playerIndex = state.players.findIndex(p => p.oderId === oderId);
  if (playerIndex === -1) return result;

  const player = state.players[playerIndex];
  if (player.surrendered) return result; // Already surrendered

  player.surrendered = true;
  result.changed = true;

  // Neutralize territories; a surrendered player's capital no longer counts
  // toward capital-victory thresholds
  const capital = state.playerState?.[player.id]?.capitalTerritory;
  for (const [territory, tState] of Object.entries(state.territoryState || {})) {
    if (tState.owner === player.id) {
      tState.owner = null;
      if (territory === capital) {
        tState.isCapital = false;
      }
    }
  }

  // Remove the player's units from the board, including aircraft on carriers
  // and cargo on transports owned by other players
  for (const [territory, units] of Object.entries(state.units || {})) {
    const remaining = units.filter(u => u.owner !== player.id);
    for (const unit of remaining) {
      if (unit.aircraft) {
        unit.aircraft = unit.aircraft.filter(a => a.owner !== player.id);
      }
      if (unit.cargo) {
        unit.cargo = unit.cargo.filter(c => c.owner !== player.id);
      }
    }
    state.units[territory] = remaining;
  }

  // Nothing left to deploy
  if (state.unitsToPlace) {
    state.unitsToPlace[player.id] = [];
  }
  // No pending purchases
  if (state.pendingPurchases) {
    state.pendingPurchases = state.pendingPurchases.filter(p => p.owner !== player.id);
  }

  const activePlayers = state.players.filter(p => !p.surrendered);
  result.humansRemain = activePlayers.some(p => !p.isAI);

  // Victory check: last non-surrendered player standing wins
  if (activePlayers.length === 1 && !state.gameOver) {
    state.gameOver = true;
    state.winner = activePlayers[0].name;
    state.winCondition = 'Last player standing — all others surrendered';
    result.gameOver = true;
  } else if (activePlayers.length === 0) {
    state.gameOver = true;
    result.gameOver = true;
  }

  // If it was the surrendering player's turn, advance to the next non-surrendered player
  if (state.currentPlayerIndex === playerIndex && !state.gameOver) {
    let idx = state.currentPlayerIndex;
    for (let i = 0; i < state.players.length; i++) {
      idx = (idx + 1) % state.players.length;
      const candidate = state.players[idx];
      if (candidate.surrendered) continue;
      // During deployment, prefer a player that still has units to place
      if (state.phase === PHASE_UNIT_PLACEMENT) {
        const toPlace = state.unitsToPlace?.[candidate.id] || [];
        if (!toPlace.some(u => u.quantity > 0)) continue;
      }
      break;
    }
    state.currentPlayerIndex = idx;

    if (state.phase === PHASE_UNIT_PLACEMENT) {
      // If nobody has units left to place, the deployment phase is over
      const anyoneCanPlace = state.players.some(p =>
        !p.surrendered && (state.unitsToPlace?.[p.id] || []).some(u => u.quantity > 0)
      );
      if (!anyoneCanPlace) {
        state.phase = PHASE_PLAYING;
        state.turnPhase = TURN_PHASE_TECH;
      }
      state.unitsPlacedThisRound = 0;
    } else if (state.phase === PHASE_PLAYING) {
      // Fresh turn for the next player
      state.turnPhase = TURN_PHASE_TECH;
      state.combatQueue = [];
    }

    // Force clients to recompute turn-start snapshots for the new current player
    delete state.friendlyTerritoriesAtTurnStart;
    delete state.factoriesAtTurnStart;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  result.currentPlayerId = currentPlayer?.oderId || null;

  return result;
}

// Surrender/leave a game from outside a live session (e.g. the My Games list).
// Uses a transaction so we never clobber a concurrent state push.
export async function leaveGame(gameId, userId) {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Not connected' };

  try {
    const gameRef = doc(db, 'games', gameId);

    const outcome = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (!snapshot.exists()) {
        return { success: false, error: 'Game not found' };
      }

      const data = snapshot.data();

      // Game never initialized (still 'starting' with no state): just remove
      // the player from the roster so it drops off their list
      if (!data.state) {
        transaction.update(gameRef, {
          playerUserIds: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
        return { success: true, surrendered: false };
      }

      const state = data.state;
      const result = applySurrenderToState(state, userId);
      if (!result.changed) {
        // Not a player in the state (spectator?) — still remove from roster
        transaction.update(gameRef, {
          playerUserIds: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
        return { success: true, surrendered: false };
      }

      // If the game is over, or no human players remain (AI-only games
      // can't continue — the host ran the AI), finish the game
      const status = (result.gameOver || !result.humansRemain) ? 'finished' : (data.status || 'active');

      // If the leaving player was the host, hand the host flag (and with it AI
      // control) to the next active human. Clients pick this up on (re)join.
      let lobbyData = data.lobbyData;
      if (lobbyData?.players?.some(p => p.oderId === userId && p.isHost)) {
        const surrenderedIds = new Set(
          state.players.filter(p => p.surrendered).map(p => p.oderId)
        );
        const nextHost = lobbyData.players.find(
          p => !p.isAI && p.oderId !== userId && !surrenderedIds.has(p.oderId)
        );
        if (nextHost) {
          lobbyData = {
            ...lobbyData,
            players: lobbyData.players.map(p => ({
              ...p,
              isHost: p.oderId === nextHost.oderId
            }))
          };
        }
      }

      transaction.update(gameRef, {
        state,
        stateVersion: (data.stateVersion || 0) + 1,
        currentPlayerId: result.currentPlayerId,
        status,
        lobbyData,
        playerUserIds: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });

      return { success: true, surrendered: true, gameFinished: status === 'finished' };
    });

    return outcome;
  } catch (error) {
    console.error('[Surrender] leaveGame failed:', error);
    return { success: false, error: error.message };
  }
}
