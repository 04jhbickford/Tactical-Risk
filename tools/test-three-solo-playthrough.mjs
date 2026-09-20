// Full tip playthrough: lobby → Risk setup → deploy 6 → all playing phases → win/lose.
// Run: node tools/test-three-solo-playthrough.mjs

import { readFileSync } from 'node:fs';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
}

import { AIController } from '../src/ai/aiController.js';
import {
  createSoloLobby,
  lobbyCanStart,
  lobbyStartOptions,
  setLobbyOccupant,
  toggleLobbySeat,
  applyLobbyAction,
} from '../src/map/threeSoloLobby.js';
import { startSoloMatch } from '../src/map/threeSoloMatch.js';
import {
  createSoloPlay,
  tapLand,
  adjustUnit,
  confirm,
  confirmLabel,
  confirmEnabled,
  canEndPhase,
  playStage,
  inspectPlay,
  chromeModel,
  BUY_TYPES,
  PLAY_STAGE,
  RISK_CARDS,
} from '../src/map/threeSoloPlay.js';
import { GAME_PHASES, TURN_PHASES } from '../src/state/gameState.js';

const setup = JSON.parse(readFileSync(new URL('../data/setup.json', import.meta.url)));
const territories = JSON.parse(readFileSync(new URL('../data/territories.json', import.meta.url)));
const continents = JSON.parse(readFileSync(new URL('../data/continents.json', import.meta.url)));
const unitDefs = JSON.parse(readFileSync(new URL('../data/units.json', import.meta.url)));

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

const lobby = createSoloLobby(setup, '?three=1&solo=1');
assert(lobby.mode === 'risk', 'default Risk');
assert(lobbyCanStart(lobby) === false, '0 seats cannot start');
applyLobbyAction(lobby, 'screen', 'setup');
toggleLobbySeat(lobby, 'Russians');
toggleLobbySeat(lobby, 'Germans');
toggleLobbySeat(lobby, 'British');
setLobbyOccupant(lobby, 'Germans', 'medium');
setLobbyOccupant(lobby, 'British', 'easy');
assert(lobbyCanStart(lobby), '1 Human + AIs can start');
setLobbyOccupant(lobby, 'Japanese', 'empty');
assert(lobby.selectedPlayers.includes('Japanese') === false, 'Empty clears unseated');
assert(lobbyCanStart(lobby), 'still legal after Empty');

const options = lobbyStartOptions(lobby);
assert(options.mode === 'risk', 'start Risk');
assert(options.players.some((p) => !p.isAI), '≥1 Human');
assert(options.players.some((p) => p.isAI), '≥1 AI');

const gs = startSoloMatch(setup, territories, continents, options);
gs.unitDefs = unitDefs;
const play = createSoloPlay(gs, unitDefs);
assert(gs.phase === GAME_PHASES.CAPITAL_PLACEMENT, 'setup capital');
assert(!gs.currentPlayer.isAI, 'human places first');

const cap = Object.entries(gs.territoryState)
  .find(([name, state]) => state.owner === gs.currentPlayer.id && !gs.territoryByName[name]?.isWater)?.[0];
assert(!!cap, 'human owns land');
tapLand(play, cap);
assert(confirmEnabled(play), 'capital Confirm');
confirm(play);
assert(gs.playerState.Russians.capitalTerritory === cap, 'capital stamped');

while (gs.phase === GAME_PHASES.CAPITAL_PLACEMENT) {
  const ai = gs.currentPlayer;
  const owned = Object.entries(gs.territoryState)
    .filter(([name, s]) => s.owner === ai.id && !gs.territoryByName[name]?.isWater)
    .map(([name]) => name);
  gs.placeCapital(owned[0]);
}
assert(gs.phase === GAME_PHASES.UNIT_PLACEMENT, 'deploy after capitals');

let deployGuard = 0;
while (gs.phase === GAME_PHASES.UNIT_PLACEMENT && deployGuard++ < 80) {
  if (gs.currentPlayer.isAI) {
    const ai = gs.currentPlayer;
    const dests = Object.entries(gs.territoryState)
      .filter(([name, s]) => s.owner === ai.id && !gs.territoryByName[name]?.isWater)
      .map(([name]) => name);
    const pool = gs.getUnitsToPlace?.(ai.id) || [];
    const land = pool.find((p) => (p.quantity || 0) > 0 && unitDefs[p.type] && !unitDefs[p.type].isSea);
    let placed = 0;
    while (land && placed < 6 && dests[0]) {
      const result = gs.placeInitialUnit(dests[0], land.type, unitDefs);
      if (result?.success === false) break;
      placed += 1;
    }
    gs.finishPlacementRound(unitDefs, { allowNavalSkip: true });
    continue;
  }
  const dest = Object.entries(gs.territoryState)
    .find(([name, state]) => state.owner === gs.currentPlayer.id && !gs.territoryByName[name]?.isWater)?.[0];
  while ((gs.unitsPlacedThisRound || 0) < 6) {
    const pool = (gs.getKnownUnitsToPlace?.(gs.currentPlayer.id, unitDefs)
      || gs.getUnitsToPlace?.(gs.currentPlayer.id) || [])
      .find((p) => (p.quantity || 0) > 0 && unitDefs[p.type] && !unitDefs[p.type].isSea);
    if (!pool) break;
    play.selectedUnits = {};
    adjustUnit(play, pool.type, 1);
    tapLand(play, dest);
    if (!confirmEnabled(play)) break;
    confirm(play);
  }
  assert(canEndPhase(play) || (gs.unitsPlacedThisRound || 0) >= 6, 'Pass after 6');
  if (canEndPhase(play)) confirm(play);
}
assert(gs.phase === GAME_PHASES.PLAYING, 'deploy finished → PLAYING');
assert(gs.turnPhase === TURN_PHASES.DEVELOP_TECH, 'opens Tech');
assert(!gs.currentPlayer.isAI, 'human first playing seat');

assert(confirmLabel(play).startsWith('End Phase'), 'skip Tech');
confirm(play);
assert(gs.turnPhase === TURN_PHASES.PURCHASE, 'Buy after Tech skip');
const shop = chromeModel(play).steppers || [];
assert(shop.some((s) => s.type === 'carrier'), 'CV in shop');
assert(shop.some((s) => s.type === 'battleship'), 'BB in shop');
assert(shop.some((s) => s.type === 'tacticalBomber'), 'TAC in shop');
assert(BUY_TYPES.includes('cruiser'), 'CA listed');
adjustUnit(play, 'infantry', 1);
assert((gs.pendingPurchases || []).some((p) => p.type === 'infantry'), 'queued INF');
confirm(play);
assert(gs.turnPhase === TURN_PHASES.COMBAT_MOVE, 'Move after Buy');

const origin = Object.keys(gs.units).find((name) => {
  if (gs.territoryByName[name]?.isWater) return false;
  return (gs.units[name] || []).some((u) => (
    u.owner === gs.currentPlayer.id && u.type === 'infantry' && (u.quantity || 0) > 0
  ));
});
assert(!!origin, 'combat origin exists');
tapLand(play, origin);
assert(playStage(play) === PLAY_STAGE.ORIGIN, 'ORIGIN stage');
assert(confirmEnabled(play) === false, 'Confirm gated until dest');
adjustUnit(play, 'infantry', 1);
assert(playStage(play) === PLAY_STAGE.UNITS, 'UNITS stage');
assert(confirmEnabled(play) === false, 'Confirm still gated');
const dest = inspectPlay(play).legalDests[0];
if (dest) {
  tapLand(play, dest);
  assert(playStage(play) === PLAY_STAGE.CONFIRM, 'CONFIRM when legal');
  assert(confirmEnabled(play) === true, 'Confirm on at CONFIRM');
  confirm(play);
  assert(playStage(play) === PLAY_STAGE.IDLE, 'commit returns IDLE');
}

assert(canEndPhase(play), 'can End Phase combat-move');
confirm(play);
if (gs.turnPhase === TURN_PHASES.COMBAT) {
  let guard = 0;
  while (play.battle && guard++ < 40) confirm(play);
  if (play.landing) {
    const landTo = play.landing.landable[0];
    if (landTo) {
      tapLand(play, landTo);
      const type = Object.keys(play.landing.airLeft || [])[0];
      if (type) adjustUnit(play, type, 1);
      confirm(play);
    }
  }
  if (canEndPhase(play)) confirm(play);
}
assert(gs.turnPhase === TURN_PHASES.NON_COMBAT_MOVE
  || gs.turnPhase === TURN_PHASES.MOBILIZE
  || !!play.income, 'reached NCM / Place / Income');

if (gs.turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
  assert(canEndPhase(play), 'NCM can end');
  confirm(play);
}
if (gs.turnPhase === TURN_PHASES.MOBILIZE) {
  const place = inspectPlay(play).placeDests[0];
  if (place) {
    tapLand(play, place);
    adjustUnit(play, 'infantry', 1);
    confirm(play);
  }
  if (canEndPhase(play) && !play.income) confirm(play);
}
assert(!!play.income || gs.lastIncome || gs.currentPlayer.isAI, 'income gate or collected');
if (play.income) {
  assert(playStage(play) === PLAY_STAGE.INCOME, 'INCOME stage');
  assert(confirmLabel(play).includes('Collect') || confirmLabel(play).includes('income'), 'collect CTA');
  const before = gs.getIPCs(gs.currentPlayer.id);
  confirm(play);
  assert(gs.currentPlayer.isAI || gs.getIPCs(gs.currentPlayer.id) >= before, 'collect applied or handed off');
}

const over = startSoloMatch(setup, territories, continents, {
  mode: 'classic',
  humanSeat: 'Russians',
});
over.unitDefs = unitDefs;
over.territoryState.Germany.owner = 'Russians';
over.territoryState.Japan.owner = 'Russians';
over._checkVictoryConditions();
const winPlay = createSoloPlay(over, unitDefs);
assert(over.gameOver === true, 'classic alliance win');
assert(chromeModel(winPlay).battle?.kicker === 'Victory', 'Victory chrome');
assert(confirmLabel(winPlay) === 'New Game vs AI', 'New Game on win');

const loseGs = startSoloMatch(setup, territories, continents, {
  mode: 'classic',
  humanSeat: 'Russians',
});
loseGs.unitDefs = unitDefs;
loseGs.territoryState.Russia.owner = 'Germans';
loseGs.territoryState['United Kingdom'].owner = 'Germans';
loseGs._checkVictoryConditions();
const losePlay = createSoloPlay(loseGs, unitDefs);
assert(loseGs.winner === 'Axis', 'Axis victory');
assert(chromeModel(losePlay).battle?.kicker === 'Defeat', 'Defeat chrome');

const ai = new AIController();
ai.setUnitDefs(unitDefs);
ai.setCanAct(() => true);
ai.setGameState(loseGs);
const processed = await ai.checkAndProcessAI();
assert(processed === false, 'AI stops on gameOver');

assert(RISK_CARDS === 'riskCards', 'card trade type');
assert(gs.getCollectIncomeAmount, 'GameState income preview');

if (failures) {
  console.error(`${failures} playthrough checks failed`);
  process.exit(1);
}
console.log('three solo playthrough checks passed');
