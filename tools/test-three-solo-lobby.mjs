// Lobby → setup → deploy → classic match. Run: node tools/test-three-solo-lobby.mjs

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
  setLobbyMode,
  setLobbySeat,
  setLobbyAiCount,
  lobbyStartOptions,
  lobbyCanStart,
  parseSoloLobbySearch,
} from '../src/map/threeSoloLobby.js';
import { startSoloMatch, buildSoloPlayers, inspectSolo } from '../src/map/threeSoloMatch.js';
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
  inspectPlay,
  legalDests,
} from '../src/map/threeSoloPlay.js';
import { GAME_PHASES, TURN_PHASES } from '../src/state/gameState.js';
import { findUndefinedPaths } from '../src/state/persistState.js';

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

const parsed = parseSoloLobbySearch('?three=1&solo=1');
assert(parsed.mode === 'classic', 'default classic');
assert(parsed.skip === false, 'lobby open by default');
assert(parseSoloLobbySearch('?solo=1&go=1').skip === true, 'go=1 skips lobby');

const lobby = createSoloLobby(setup, '?three=1&solo=1');
assert(lobby.open === true, 'lobby starts open');
assert(lobby.humanSeat === 'Russians', 'default Russians');
assert(lobbyCanStart(lobby), 'can start');
setLobbySeat(lobby, 'Germans');
assert(lobby.humanSeat === 'Germans', 'seat Germans');
setLobbyMode(lobby, 'risk');
assert(lobby.mode === 'risk', 'risk mode');
setLobbyAiCount(lobby, -1);
assert(lobby.aiCount === 3, 'risk AI 3 after minus from 4');
const opts = lobbyStartOptions(lobby);
assert(opts.mode === 'risk' && opts.humanSeat === 'Germans', 'start options');

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

const risk = startSoloMatch(setup, territories, continents, {
  mode: 'risk',
  humanSeat: 'Russians',
  aiCount: 2,
  aiDifficulty: 'easy',
});
risk.unitDefs = unitDefs;
assert(risk.gameMode === 'risk', 'risk mode');
assert(risk.phase === GAME_PHASES.CAPITAL_PLACEMENT, 'opens on capital');
assert(risk.players.length === 3, '1 human + 2 AI');
assert(risk.currentPlayer.id === 'Russians' && !risk.currentPlayer.isAI, 'human places first');

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
