// S1 classic solo vs AI — GameState boot, not the Karelia seed engine.
// Run: node tools/test-three-solo.mjs

import { readFileSync } from 'node:fs';
import { GameState } from '../src/state/gameState.js';
import { CLASSIC_CAPITALS } from '../src/state/classicCapitals.js';
import {
  buildClassicSoloPlayers,
  startClassicSolo,
  inspectSolo,
  placementsFromState,
} from '../src/map/threeSoloMatch.js';
import {
  isSoloRequested,
  isUxPreviewRequested,
  isMaxBattleRequested,
  soloHref,
  stripPreviewParams,
} from '../src/map/uxPreviewFlag.js';
import { createScenario } from '../src/map/uxPreviewScenario.js';

const setup = JSON.parse(readFileSync(new URL('../data/setup.json', import.meta.url)));
const territories = JSON.parse(readFileSync(new URL('../data/territories.json', import.meta.url)));
const continents = JSON.parse(readFileSync(new URL('../data/continents.json', import.meta.url)));

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

assert(isSoloRequested('?three=1&solo=1') === true, 'solo+three');
assert(isSoloRequested('?ux=1&solo=yes') === true, 'solo+ux');
assert(isSoloRequested('?solo=1') === false, 'solo alone is not preview');
assert(isSoloRequested('?three=1') === false, 'three alone is not solo');
assert(isUxPreviewRequested('?three=1&max=1') === true, 'max still preview');
assert(isMaxBattleRequested('?three=1&max=1') === true, 'max fixture flag');
assert(isMaxBattleRequested('?three=1&solo=1') === false, 'solo is not max');
assert(soloHref('https://ex.test/?three=1&max=1').includes('solo=1'), 'soloHref sets solo');
assert(!soloHref('https://ex.test/?three=1&max=1').includes('max='), 'soloHref drops max');
assert(!stripPreviewParams('https://ex.test/?three=1&solo=1').includes('solo'), 'strip solo');

const players = buildClassicSoloPlayers(setup);
assert(players.length === 5, 'five factions');
assert(players.filter((p) => !p.isAI).length === 1, 'one human');
assert(players.filter((p) => p.isAI).length === 4, 'four AI');
assert(players[0].id === 'Russians' && players[0].isAI === false, 'human Russians first');
assert(players.slice(1).every((p) => p.aiDifficulty === 'medium'), 'medium AI');

const raw = new GameState(setup, territories, continents);
raw.initGame('classic', players, { alliancesEnabled: true });
assert(raw.playerState.Russians.capitalTerritory == null, 'classic init still nulls capitals');
assert(raw.turnPhase === 'setup', 'classic init leaves turnPhase setup');

const gs = startClassicSolo(setup, territories, continents);
const info = inspectSolo(gs);
assert(info.mode === 'classic', 'classic mode');
assert(info.playing === true, 'playing');
assert(info.turnPhase === 'develop_tech', 'opens on develop tech');
assert(info.human.id === 'Russians', 'human seat');
assert(info.ai.length === 4, 'ai seats');
assert(info.stamped === true, 'capitals stamped');
assert(info.capitals.Russians === 'Russia', 'Russia capital');
assert(info.capitals.Germans === 'Germany', 'Germany capital');
assert(info.capitals.British === 'United Kingdom', 'UK capital');
assert(info.capitals.Japanese === 'Japan', 'Japan capital');
assert(info.capitals.Americans === 'East US', 'East US capital');
assert(gs.territoryState.Germany.isCapital === true, 'Germany isCapital');
assert(info.ipc.Russians === 24, 'Russian starting IPC');
assert(info.ipc.Germans === 32, 'German starting IPC');
assert((gs.units['Karelia S.S.R.'] || []).length > 0, 'Karelia has classic stacks');
assert(Object.keys(CLASSIC_CAPITALS).length === 5, 'five capitals');
assert(placementsFromState(gs)['Karelia S.S.R.']?.length > 0, 'placements from state');
assert(gs.isMultiplayer === false, 'no multiplayer');

const pocket = createScenario();
assert(pocket.id === 'karelia-finland-air', 'pocket seed untouched');
assert(pocket.phase === 'COMBAT MOVE', 'pocket still combat-move');

if (failures) {
  console.error(`${failures} solo checks failed`);
  process.exit(1);
}
console.log('three solo S1 checks passed');
