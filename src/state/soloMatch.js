// Shared solo-vs-AI match boot. Canvas main (`lobby.js` / `main.js`) and
// Three hybrid (`threeSoloBoot.js`, `?three=1&solo=1`) both import this so
// Risk lobby→capital→deploy and classic 1942 stay one engine.
//
// Hybrid consumers of the V2.81.56 GameState capture path:
//   threeSoloPlay.applyHits → captureOccupiedTerritory
//   AIController.resolveCombat / moveUnits → same GameState methods
//   nextPhase NCM heal + movementUI.canMoveTo → ensureOccupationOwners
// Cherry-pick this file + classicCapitals.js with the capture commit.

import { GameState, GAME_PHASES, TURN_PHASE_NAMES } from './gameState.js';
import {
  CLASSIC_CAPITALS,
  prepareClassicSoloState,
} from './classicCapitals.js';

export const DEFAULT_HUMAN_SEAT = 'Russians';
export const DEFAULT_AI_DIFFICULTY = 'medium';

export function soloFactions(setup, mode = 'classic') {
  if (mode === 'risk') return setup?.risk?.factions || setup?.factions || [];
  return setup?.classic?.factions || setup?.factions || [];
}

export function buildSoloPlayers(setup, {
  humanSeat = DEFAULT_HUMAN_SEAT,
  aiDifficulty = DEFAULT_AI_DIFFICULTY,
  mode = 'classic',
} = {}) {
  const factions = soloFactions(setup, mode);
  const humanId = humanSeat || DEFAULT_HUMAN_SEAT;
  const players = factions.map((faction) => {
    const human = faction.id === humanId;
    return {
      ...faction,
      isAI: !human,
      aiDifficulty: human ? 'human' : (aiDifficulty || DEFAULT_AI_DIFFICULTY),
    };
  });
  const human = players.find((p) => !p.isAI);
  if (!human) return players;
  return [human, ...players.filter((p) => p !== human)];
}

export function startClassicSolo(setup, territories, continents, options = {}) {
  const players = options.players || buildSoloPlayers(setup, { ...options, mode: 'classic' });
  const gameState = new GameState(setup, territories, continents);
  gameState.isMultiplayer = false;
  gameState.initGame('classic', players, { alliancesEnabled: true });
  prepareClassicSoloState(gameState);
  return gameState;
}

export function startRiskSolo(setup, territories, continents, options = {}) {
  const players = options.players || buildSoloPlayers(setup, { ...options, mode: 'risk' });
  const gameState = new GameState(setup, territories, continents);
  gameState.isMultiplayer = false;
  const startingIPCs = options.startingIPCs
    ?? setup?.risk?.startingIPCs
    ?? 18;
  gameState.initGame('risk', players, {
    alliancesEnabled: false,
    startingIPCs,
  });
  return gameState;
}

export function placementsFromState(gameState) {
  const out = {};
  for (const [name, stacks] of Object.entries(gameState?.units || {})) {
    out[name] = (stacks || []).map((s) => ({
      type: s.type,
      quantity: Number(s.quantity) || 0,
      owner: s.owner,
    }));
  }
  return out;
}

export function inspectSolo(gameState) {
  const players = gameState?.players || [];
  const capitals = {};
  const ipc = {};
  for (const player of players) {
    capitals[player.id] = gameState.playerState?.[player.id]?.capitalTerritory || null;
    ipc[player.id] = gameState.getIPCs?.(player.id) ?? gameState.playerState?.[player.id]?.ipcs ?? 0;
  }
  const human = players.find((p) => !p.isAI) || null;
  const current = gameState?.currentPlayer || null;
  const owned = human
    ? Object.entries(gameState?.territoryState || {})
      .filter(([, state]) => state.owner === human.id)
      .map(([name]) => name)
    : [];
  return {
    solo: true,
    mode: gameState?.gameMode || null,
    phase: gameState?.phase || null,
    playing: gameState?.phase === GAME_PHASES.PLAYING,
    setup: gameState?.phase === GAME_PHASES.CAPITAL_PLACEMENT
      || gameState?.phase === GAME_PHASES.UNIT_PLACEMENT,
    turnPhase: gameState?.turnPhase || null,
    turnPhaseName: TURN_PHASE_NAMES[gameState?.turnPhase] || gameState?.turnPhase || null,
    currentPlayer: current ? { id: current.id, name: current.name, isAI: !!current.isAI } : null,
    human: human ? { id: human.id, name: human.name, isAI: false } : null,
    ai: players.filter((p) => p.isAI).map((p) => ({
      id: p.id,
      name: p.name,
      isAI: true,
      aiDifficulty: p.aiDifficulty || DEFAULT_AI_DIFFICULTY,
    })),
    capitals,
    classicCapitals: { ...CLASSIC_CAPITALS },
    ipc,
    ownedCount: owned.length,
    unitsToPlace: human
      ? (gameState.getTotalUnitsToPlace?.(human.id) || 0)
      : 0,
    landCount: Object.keys(gameState?.territoryState || {}).length,
    unitTerritories: Object.keys(gameState?.units || {}).length,
    stamped: Object.values(CLASSIC_CAPITALS).every((name) => (
      gameState?.territoryState?.[name]?.isCapital === true
    )),
  };
}

export function ownedLandNames(gameState, playerId) {
  if (!gameState || !playerId) return [];
  return Object.entries(gameState.territoryState || {})
    .filter(([name, state]) => (
      state.owner === playerId && !gameState.territoryByName?.[name]?.isWater
    ))
    .map(([name]) => name)
    .sort();
}

export function firstOwnedLand(gameState, playerId) {
  return ownedLandNames(gameState, playerId)[0] || null;
}

export function adjacentOpenSeas(gameState, playerId) {
  const seas = [];
  for (const land of ownedLandNames(gameState, playerId)) {
    for (const conn of gameState.getConnections?.(land) || []) {
      const t = gameState.territoryByName?.[conn];
      if (!t?.isWater) continue;
      const enemy = (gameState.units[conn] || []).some((u) => (
        u.owner !== playerId && (Number(u.quantity) || 0) > 0
      ));
      if (!enemy && !seas.includes(conn)) seas.push(conn);
    }
  }
  return seas;
}

export function autoPlaceCurrentCapital(gameState) {
  const dest = firstOwnedLand(gameState, gameState?.currentPlayer?.id);
  if (!dest) return false;
  return gameState.placeCapital(dest) === true;
}

export function autoPlaceCurrentDeployRound(gameState, unitDefs = {}) {
  const player = gameState?.currentPlayer;
  if (!player || gameState.phase !== GAME_PHASES.UNIT_PLACEMENT) {
    return { ok: false, reason: 'wrong-phase' };
  }
  const land = gameState.playerState?.[player.id]?.capitalTerritory
    || firstOwnedLand(gameState, player.id);
  const seas = adjacentOpenSeas(gameState, player.id);
  const limit = gameState.getUnitsPerRoundLimit?.() || 6;
  let placed = 0;
  let guard = 0;
  while (placed < limit && guard++ < 24) {
    const pool = (gameState.getUnitsToPlace?.(player.id) || [])
      .filter((u) => (Number(u.quantity) || 0) > 0);
    if (!pool.length) break;
    let did = false;
    for (const row of pool) {
      const def = unitDefs[row.type] || {};
      const dest = def.isSea ? seas[0] : land;
      if (!dest) continue;
      const result = gameState.placeInitialUnit(dest, row.type, unitDefs);
      if (result?.success === false) continue;
      placed += 1;
      did = true;
      break;
    }
    if (!did) break;
  }
  return gameState.finishPlacementRound(unitDefs, { allowNavalSkip: true });
}

// Deterministic setup driver for tests and headless AI. The Three chrome
// still lets the human pick capital / deploy; this only fills AI seats or
// proves lobby→PLAYING on the shared engine.
export function completeSoloSetup(gameState, unitDefs = {}, { maxSteps = 80 } = {}) {
  let steps = 0;
  while (gameState?.phase !== GAME_PHASES.PLAYING && steps++ < maxSteps) {
    if (gameState.phase === GAME_PHASES.CAPITAL_PLACEMENT) {
      if (!autoPlaceCurrentCapital(gameState)) break;
      continue;
    }
    if (gameState.phase === GAME_PHASES.UNIT_PLACEMENT) {
      const result = autoPlaceCurrentDeployRound(gameState, unitDefs);
      if (result?.ok === false) break;
      continue;
    }
    break;
  }
  return gameState?.phase === GAME_PHASES.PLAYING;
}

export { CLASSIC_CAPITALS };
