// Shared solo boot: Risk lobby→capital→deploy→PLAYING and classic 1942.
// Canvas main and Three hybrid both import src/state/soloMatch.js.
// Run: node tools/test-solo-match.mjs

import { readFileSync } from 'node:fs';
import { GameState, GAME_PHASES, TURN_PHASES } from '../src/state/gameState.js';
import {
  startClassicSolo,
  startRiskSolo,
  buildSoloPlayers,
  inspectSolo,
  completeSoloSetup,
  firstOwnedLand,
  ownedLandNames,
  DEFAULT_HUMAN_SEAT,
} from '../src/state/soloMatch.js';
import { GAME_VERSION } from '../src/version.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
}

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

assert(String(GAME_VERSION).startsWith('V2.81.56'), 'GAME_VERSION is V2.81.56 line');

const riskPlayers = buildSoloPlayers(setup, { mode: 'risk', humanSeat: 'British' });
assert(riskPlayers.length === 5, 'risk five factions');
assert(riskPlayers[0].id === 'British' && riskPlayers[0].isAI === false, 'chosen seat first');
assert(riskPlayers.filter((p) => p.isAI).length === 4, 'four AI');

const risk = startRiskSolo(setup, territories, continents, { humanSeat: 'British' });
const riskInfo = inspectSolo(risk);
assert(riskInfo.mode === 'risk', 'risk mode');
assert(riskInfo.setup === true, 'opens on setup');
assert(risk.phase === GAME_PHASES.CAPITAL_PLACEMENT, 'capital placement');
assert(riskInfo.playing === false, 'not playing yet');
assert(riskInfo.human.id === 'British', 'human British');
assert(risk.currentPlayer.id === 'British', 'human places capital first');
assert(riskInfo.ownedCount > 0, 'human owns random lands');
assert(riskInfo.unitsToPlace > 0, 'deploy pool exists');
assert(risk.isMultiplayer === false, 'solo not multiplayer');
assert(risk.getIPCs('British') === 18, '5p starting IPCs');

const capital = firstOwnedLand(risk, 'British');
assert(!!capital, 'has an owned land for capital');
assert(ownedLandNames(risk, 'British').includes(capital), 'capital dest listed');
assert(risk.placeCapital(capital) === true, 'human capital commits');
assert(risk.playerState.British.capitalTerritory === capital, 'capital stamped');
assert(risk.territoryState[capital].isCapital === true, 'isCapital');
assert(risk.currentPlayer.isAI === true, 'next seat is AI');

assert(completeSoloSetup(risk, unitDefs) === true, 'AI finishes setup');
assert(risk.phase === GAME_PHASES.PLAYING, 'reached PLAYING');
assert(risk.turnPhase === TURN_PHASES.DEVELOP_TECH, 'opens develop tech');
assert(
  risk.players.every((p) => !!risk.playerState[p.id]?.capitalTerritory),
  'every seat has a capital',
);
risk.currentPlayerIndex = risk.players.findIndex((p) => p.id === 'British');

const others = risk.players
  .filter((p) => p.id !== 'British')
  .map((p) => risk.playerState[p.id].capitalTerritory);
risk.units[others[0]] = [
  ...(risk.units[others[0]] || []),
  { type: 'infantry', quantity: 1, owner: 'British' },
];
risk.units[others[1]] = [
  ...(risk.units[others[1]] || []),
  { type: 'infantry', quantity: 1, owner: 'British' },
];
const cap0 = risk.captureOccupiedTerritory(others[0], { unitDefs, force: true });
const cap1 = risk.captureOccupiedTerritory(others[1], { unitDefs, force: true });
assert(cap0.captured === true, 'shared capture flips first AI capital');
assert(cap1.captured === true, 'shared capture flips second AI capital');
risk._checkVictoryConditions();
assert(risk.gameOver === true, 'majority capitals wins Risk');
assert(risk.winner === 'British', 'human wins');

const classic = startClassicSolo(setup, territories, continents);
const classicInfo = inspectSolo(classic);
assert(classicInfo.mode === 'classic', 'classic still boots');
assert(classicInfo.playing === true, 'classic skips setup');
assert(classicInfo.human.id === DEFAULT_HUMAN_SEAT, 'default Russians');
assert(classicInfo.stamped === true, '1942 capitals stamped');

const lobby = new GameState(setup, territories, continents);
assert(lobby.phase === GAME_PHASES.LOBBY, 'fresh state is lobby');
assert(lobby.gameMode == null, 'lobby has no mode');

if (failures) {
  console.error(`${failures} solo match checks failed`);
  process.exit(1);
}
console.log('solo match lobby→setup→deploy→win checks passed');
