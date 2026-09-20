// Lobby → setup → deploy-6 → classic match. Run: node tools/test-three-solo-lobby.mjs

import { readFileSync } from 'node:fs';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
}

import {
  createSoloLobby,
  applyLobbyAction,
  setLobbyMode,
  toggleLobbySeat,
  setLobbyOccupant,
  setLobbyIpc,
  lobbyStartOptions,
  lobbyCanStart,
  lobbyStartLabel,
  lobbyBuildPlayers,
  parseSoloLobbySearch,
  STARTING_IPC_OPTIONS,
  AI_DIFFICULTIES,
} from '../src/map/threeSoloLobby.js';
import { startSoloMatch, buildSoloPlayers } from '../src/map/threeSoloMatch.js';
import {
  createSoloPlay,
  tapLand,
  adjustUnit,
  confirm,
  confirmLabel,
  confirmEnabled,
  capitalDests,
  deployPool,
  deployDests,
  deployWave,
  inspectPlay,
  legalDests,
} from '../src/map/threeSoloPlay.js';
import {
  SETUP_TUTORIAL_STEPS,
  shouldShowSetupTutorial,
  dismissTutorial,
  tutorialWasDismissed,
} from '../src/map/threeSetupTutorial.js';
import { GAME_PHASES, TURN_PHASES } from '../src/state/gameState.js';
import { findUndefinedPaths } from '../src/state/persistState.js';
import { GAME_VERSION } from '../src/version.js';

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

assert(GAME_VERSION === 'V2.81.56-ux-solo.5', 'tip stamp ux-solo.5');
assert(AI_DIFFICULTIES.map((d) => d.id).join(',') === 'human,easy,medium,hard', 'main occupant labels');
assert(STARTING_IPC_OPTIONS.join(',') === '40,60,80,100,120,150', 'main IPC ladder');

const parsed = parseSoloLobbySearch('?three=1&solo=1');
assert(parsed.mode === 'risk', 'default Risk like main local');
assert(parsed.skip === false, 'lobby open by default');
assert(parseSoloLobbySearch('?solo=1&go=1').skip === true, 'go=1 skips lobby');
assert(parseSoloLobbySearch('?mode=classic').mode === 'classic', 'mode=classic');

const lobby = createSoloLobby(setup, '?three=1&solo=1');
assert(lobby.open === true, 'lobby starts open');
assert(lobby.screen === 'main', 'main menu first');
assert(lobby.mode === 'risk', 'risk default');
assert(!lobbyCanStart(lobby), 'cannot start with 0 seats');
assert(lobbyStartLabel(lobby) === 'Select at least 2 players', 'main Start copy');

applyLobbyAction(lobby, 'screen', 'setup');
assert(lobby.screen === 'setup', 'Local Play → setup');
toggleLobbySeat(lobby, 'Russians');
toggleLobbySeat(lobby, 'Germans');
setLobbyOccupant(lobby, 'Germans', 'medium');
assert(lobbyCanStart(lobby), '2 seats can start');
assert(lobbyStartLabel(lobby) === 'Start Game (2 Players)', 'Start Game (N Players)');
setLobbyIpc(lobby, 100);
assert(lobby.startingIPCs === 100, 'IPC 100');
const players = lobbyBuildPlayers(lobby);
assert(players.length === 2, '2 players');
assert(players.find((p) => p.id === 'Russians')?.isAI === false, 'Russians human');
assert(players.find((p) => p.id === 'Germans')?.isAI === true, 'Germans AI');
assert(players.find((p) => p.id === 'Germans')?.aiDifficulty === 'medium', 'Easy/Med/Hard per seat');

const skip = createSoloLobby(setup, '?three=1&solo=1&go=1&seat=British&ai=2&diff=easy');
assert(skip.open === false, 'go=1 closed');
assert(skip.selectedPlayers[0] === 'British', 'skip human British');
assert(skip.selectedPlayers.length === 3, '1 + 2 AI');
assert(skip.playerAI.British === 'human', 'human occupant');

setLobbyMode(lobby, 'classic');
assert(lobby.mode === 'classic', 'classic mode tile');

const classicPlayers = buildSoloPlayers(setup, { mode: 'classic', humanSeat: 'British' });
assert(classicPlayers[0].id === 'British' && !classicPlayers[0].isAI, 'human first');
assert(classicPlayers.filter((p) => p.isAI).length === 4, '4 AI classic');

const classic = startSoloMatch(setup, territories, continents, {
  mode: 'classic',
  humanSeat: 'Americans',
});
classic.unitDefs = unitDefs;
assert(classic.phase === GAME_PHASES.PLAYING, 'classic skips to playing');
assert(classic.currentPlayer.id === 'Americans', 'Americans first');
assert(classic.territoryState.Russia?.isCapital === true, 'capitals stamped');
const classicPlay = createSoloPlay(classic, unitDefs);
assert(inspectPlay(classicPlay).setupPhase === GAME_PHASES.PLAYING, 'playing inspect');

const risk = startSoloMatch(setup, territories, continents, lobbyStartOptions(createSoloLobby(setup, '?go=1&mode=risk&seat=Russians&ai=2&diff=easy')));
risk.unitDefs = unitDefs;
assert(risk.gameMode === 'risk', 'risk mode');
assert(risk.phase === GAME_PHASES.CAPITAL_PLACEMENT, 'opens on capital');
assert(risk.players.length === 3, '1 human + 2 AI');
assert(risk.currentPlayer.id === 'Russians' && !risk.currentPlayer.isAI, 'human places first');
assert(shouldShowSetupTutorial(risk), 'tutorial on first setup');
dismissTutorial();
assert(tutorialWasDismissed(), 'tutorial dismiss persisted');
assert(!shouldShowSetupTutorial(risk), 'dismissed stays closed');
assert(SETUP_TUTORIAL_STEPS.length === 3, 'tutorial has 3 steps');

const play = createSoloPlay(risk, unitDefs);
const caps = capitalDests(play);
assert(caps.length > 0, 'owned capital dests');
const pick = caps[0];
tapLand(play, pick);
assert(play.destPicked === pick, 'capital dest picked');
assert(confirmEnabled(play), 'capital confirm');
assert(confirmLabel(play).includes('Capital'), 'capital label');
confirm(play);
assert(risk.playerState.Russians.capitalTerritory === pick, 'capital stamped');
assert(risk.currentPlayer.isAI, 'next seat is AI');

while (risk.phase === GAME_PHASES.CAPITAL_PLACEMENT) {
  const ai = risk.currentPlayer;
  const owned = Object.entries(risk.territoryState)
    .filter(([name, s]) => s.owner === ai.id && !risk.territoryByName[name]?.isWater)
    .map(([name]) => name);
  assert(owned.length > 0, `AI ${ai.id} has a capital dest`);
  risk.placeCapital(owned[0]);
}
assert(risk.phase === GAME_PHASES.UNIT_PLACEMENT, 'all capitals → deploy');
assert(risk.currentPlayer.id === 'Russians', 'human deploys first');

const wave0 = deployWave(play);
assert(wave0.limit === 6, 'wave cap 6');
assert(wave0.placed === 0, '0 placed');
assert(!confirmEnabled(play), 'Pass disabled at 0 of 6');
assert(confirmLabel(play).includes('0 of 6'), 'Deploy 0 of 6 copy');
assert(wave0.meter.includes('0/6'), 'budget meter');

const pool = deployPool(play);
assert(pool.some((p) => p.type === 'infantry' && p.quantity > 0), 'deploy infantry');
adjustUnit(play, 'infantry', 1);
const dests = deployDests(play);
assert(dests.includes(pick), 'can deploy on capital');
tapLand(play, pick);
assert(confirmLabel(play).includes('Deploy'), 'deploy label');
confirm(play);
const inf = (risk.units[pick] || []).find((u) => u.type === 'infantry' && u.owner === 'Russians');
assert((inf?.quantity || 0) >= 2, 'starting INF + deploy');
assert(risk.unitsPlacedThisRound === 1, '1 of 6 placed');
assert(!confirmEnabled(play), 'Pass still locked after 1');

while (risk.unitsPlacedThisRound < 6) {
  adjustUnit(play, 'infantry', 1);
  tapLand(play, pick);
  if (!confirmEnabled(play)) break;
  confirm(play);
}
assert(risk.unitsPlacedThisRound === 6, 'placed 6');
assert(confirmEnabled(play), 'Pass enabled at 6 of 6');
assert(confirmLabel(play).startsWith('Pass'), 'Pass CTA');
confirm(play);
assert(risk.currentPlayer.isAI, 'Pass advances seat');

const json = risk.toJSON();
assert(findUndefinedPaths(json).length === 0, 'risk toJSON has no undefined');

const seaPlay = createSoloPlay(classic, unitDefs);
classic.turnPhase = TURN_PHASES.COMBAT_MOVE;
const sz = Object.keys(classic.units).find((name) => {
  const t = classic.territoryByName[name];
  return t?.isWater && (classic.units[name] || []).some((u) => u.owner === 'Americans' && u.type === 'transport');
});
if (sz) {
  tapLand(seaPlay, sz);
  const ships = (classic.units[sz] || []).filter((u) => u.owner === 'Americans' && u.type !== 'factory');
  if (ships.some((u) => u.type === 'battleship' || u.type === 'destroyer' || u.type === 'cruiser')) {
    const type = ships.find((u) => ['battleship', 'destroyer', 'cruiser', 'submarine'].includes(u.type))?.type;
    if (type) {
      adjustUnit(seaPlay, type, 1);
      const dests = legalDests(seaPlay);
      assert(Array.isArray(dests), 'naval dests array');
    }
  }
}

console.log(failures ? `${failures} lobby/setup check(s) failed` : 'All lobby/setup checks passed');
process.exit(failures ? 1 : 0);
