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
// Pure transform lives in surrenderCore.js (no Firebase imports) so the node
// robustness harness can exercise the exact same logic. Re-exported here for
// existing importers.
import { applySurrenderToState } from './surrenderCore.js';
export { applySurrenderToState };

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
