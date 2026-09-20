// S7–S9: purchase, mobilize, tech dice, victory + New Game.
// Run: node tools/test-three-solo-econ.mjs

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
  createSoloPlay,
  tapLand,
  adjustUnit,
  confirm,
  confirmLabel,
  confirmEnabled,
  canEndPhase,
  pendingQty,
  shopCapacity,
  legalPlaceDests,
  inspectPlay,
  chromeModel,
  factoryDests,
  BUY_TYPES,
} from '../src/map/threeSoloPlay.js';
import { startClassicSolo } from '../src/map/threeSoloMatch.js';
import { createScenario } from '../src/map/uxPreviewScenario.js';
import { TURN_PHASES } from '../src/state/gameState.js';

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

function fresh() {
  const gs = startClassicSolo(setup, territories, continents);
  gs.unitDefs = unitDefs;
  return createSoloPlay(gs, unitDefs);
}

function qty(play, name, type, owner) {
  return (play.gameState.units[name] || [])
    .filter((s) => s.type === type && (!owner || s.owner === owner))
    .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

function scriptRng(faces) {
  let i = 0;
  return () => faces[Math.min(i++, faces.length - 1)];
}

// --- S8 tech skip still works (S2 path) ---
const skip = fresh();
assert(skip.gameState.turnPhase === TURN_PHASES.DEVELOP_TECH, 'open tech');
assert(typeof skip.gameState.getCollectIncomeAmount === 'function', 'income preview on GameState');
assert(skip.gameState.getCollectIncomeAmount('Russians') >= 10, 'classic Russia collects ≥ capital 10');
assert(confirmLabel(skip).startsWith('End Phase'), 'skip tech End Phase');
const model = chromeModel(skip);
assert(model.steppers?.some((s) => s.type === 'techDie'), 'tech die stepper');
confirm(skip);
assert(skip.gameState.turnPhase === TURN_PHASES.PURCHASE, 'skipped to purchase');

// --- S8 tech roll + breakthrough ---
const tech = fresh();
const startIpc = tech.gameState.getIPCs('Russians');
adjustUnit(tech, 'techDie', 1);
assert(tech.tech.dice === 1, 'one research die');
assert(confirmLabel(tech).includes('Roll'), 'roll label');
tech.rng = scriptRng([6]);
confirm(tech);
assert(tech.gameState.getIPCs('Russians') === startIpc - 5, 'paid 5 IPC');
assert(tech.tech.breakthrough === true, 'breakthrough on 6');
assert(confirmEnabled(tech) === false, 'must pick a tech');
adjustUnit(tech, 'jets', 1);
assert(tech.tech.pick === 'jets', 'picked jets');
assert(confirmEnabled(tech) === true, 'unlock Confirm on');
confirm(tech);
assert(tech.gameState.hasTech('Russians', 'jets') === true, 'jets unlocked');
assert(tech.gameState.turnPhase === TURN_PHASES.PURCHASE, 'unlock advances to buy');

// --- S8 miss then End Phase ---
const miss = fresh();
adjustUnit(miss, 'techDie', 1);
miss.rng = scriptRng([2]);
confirm(miss);
assert(miss.tech.breakthrough === false, 'no breakthrough');
assert(canEndPhase(miss) === true, 'can end after miss');
confirm(miss);
assert(miss.gameState.turnPhase === TURN_PHASES.PURCHASE, 'miss then purchase');

// --- S7 purchase + factory cap ---
const buy = fresh();
confirm(buy);
assert(buy.gameState.turnPhase === TURN_PHASES.PURCHASE, 'on purchase');
const shop0 = shopCapacity(buy);
assert(shop0.max >= 20, 'capital 20 + factory');
assert(shop0.used === 0, 'nothing queued');
const ipcBuy = buy.gameState.getIPCs('Russians');
adjustUnit(buy, 'infantry', 1);
adjustUnit(buy, 'infantry', 1);
assert(pendingQty(buy, 'infantry') === 2, '2 infantry queued');
assert(buy.gameState.getIPCs('Russians') === ipcBuy - 6, 'spent 6 IPC');
assert(confirmLabel(buy).includes('queued'), 'queued on Confirm');
adjustUnit(buy, 'infantry', -1);
assert(pendingQty(buy, 'infantry') === 1, 'undo one infantry');
assert(buy.gameState.getIPCs('Russians') === ipcBuy - 3, 'refund 3');
adjustUnit(buy, 'infantry', 1);
assert(chromeModel(buy).steppers.some((s) => s.type === 'infantry' && s.picked === 2), 'INF tiles');
confirm(buy);
assert(buy.gameState.turnPhase === TURN_PHASES.COMBAT_MOVE, 'buy then combat-move');
confirm(buy);
assert(buy.gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE, 'empty combat skipped');
confirm(buy);
assert(buy.gameState.turnPhase === TURN_PHASES.MOBILIZE, 'mobilize after buy');

// --- S7 mobilize at factory ---
assert(factoryDests(buy).includes('Russia'), 'Russia factory dest');
assert(legalPlaceDests(buy).includes('Russia'), 'place dests include Russia');
assert(canEndPhase(buy) === false, 'cannot end with pending');
tapLand(buy, 'Russia');
adjustUnit(buy, 'infantry', 1);
adjustUnit(buy, 'infantry', 1);
assert(buy.destPicked === 'Russia', 'Russia dest');
assert(confirmLabel(buy).includes('Place'), 'place label');
const rusInf = qty(buy, 'Russia', 'infantry', 'Russians');
confirm(buy);
assert(qty(buy, 'Russia', 'infantry', 'Russians') === rusInf + 2, '2 infantry placed');
assert(pendingQty(buy) === 0, 'queue empty');
assert(canEndPhase(buy) === true, 'End Phase after place');
confirm(buy);
assert(!!buy.income, 'income gate after place');
assert(buy.income.amount > 0, 'classic Russia has income');
confirm(buy);
assert(buy.gameState.currentPlayer.id === 'Germans', 'income → German AI');

// --- S9 victory + New Game ---
const win = fresh();
win.gameState.territoryState.Germany.owner = 'Russians';
win.gameState.territoryState.Japan.owner = 'Russians';
win.gameState._checkVictoryConditions();
assert(win.gameState.gameOver === true, 'game over');
assert(win.gameState.winner === 'Allies', 'Allies win');
assert(confirmLabel(win) === 'New Game vs AI', 'victory Confirm');
assert(confirmEnabled(win) === true, 'victory Confirm on');
assert(chromeModel(win).battle?.kicker === 'Victory', 'victory card');
confirm(win);
assert(win._newGame === true, 'Confirm requests New Game');

const lose = fresh();
lose.gameState.territoryState.Russia.owner = 'Germans';
lose.gameState.territoryState['United Kingdom'].owner = 'Germans';
lose.gameState._checkVictoryConditions();
assert(lose.gameState.gameOver === true, 'axis game over');
assert(lose.gameState.winner === 'Axis', 'Axis win');
assert(chromeModel(lose).battle?.kicker === 'Defeat', 'defeat card for human Allies');
assert(confirmLabel(lose) === 'New Game vs AI', 'lose Confirm');

assert(BUY_TYPES.includes('carrier'), 'full navy in shop');
assert(BUY_TYPES.includes('tacticalBomber'), 'TAC in shop');
assert(chromeModel(fresh()).steppers.some((s) => s.type === 'techDie'), 'tech stepper still');

const pocket = createScenario();
assert(pocket.id === 'karelia-finland-air', 'pocket seed untouched');

const inspect = inspectPlay(fresh());
assert(inspect.turnPhase === 'develop_tech', 'inspect tech');
assert(inspect.gameOver === false, 'not over at start');

if (failures) {
  console.error(`${failures} solo econ checks failed`);
  process.exit(1);
}
console.log('three solo S7–S9 checks passed');
