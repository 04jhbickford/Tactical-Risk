// S2–S6 Three solo adapter: phase shell, combat-move, combat, air land, NCM.
// Run: node tools/test-three-solo-play.mjs

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
  adjustLanding,
  adjustLoss,
  confirm,
  confirmLabel,
  confirmEnabled,
  confirmGold,
  canEndPhase,
  legalDests,
  combatOrigins,
  phaseStrip,
  ncmAirRemaining,
  chromeModel,
  inspectPlay,
  highlights,
  BATTLE_STEP,
  STRIP_SHORT,
} from '../src/map/threeSoloPlay.js';
import { startClassicSolo } from '../src/map/threeSoloMatch.js';
import { createScenario } from '../src/map/uxPreviewScenario.js';
import { TURN_PHASES, TURN_PHASE_ORDER } from '../src/state/gameState.js';

const setup = JSON.parse(readFileSync(new URL('../data/setup.json', import.meta.url)));
const territories = JSON.parse(readFileSync(new URL('../data/territories.json', import.meta.url)));
const continents = JSON.parse(readFileSync(new URL('../data/continents.json', import.meta.url)));
const unitDefs = JSON.parse(readFileSync(new URL('../data/units.json', import.meta.url)));

const ORIGIN = 'Karelia S.S.R.';
const DEST = 'Finland Norway';
const LAND = 'Russia';

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
  const play = createSoloPlay(gs, unitDefs);
  return play;
}

function skipToCombatMove(play) {
  assert(play.gameState.turnPhase === TURN_PHASES.DEVELOP_TECH, 'open develop tech');
  assert(confirmLabel(play).startsWith('End Phase'), 'tech End Phase');
  assert(confirmEnabled(play) === true, 'tech confirm on');
  confirm(play);
  assert(play.gameState.turnPhase === TURN_PHASES.PURCHASE, 'purchase after tech');
  assert(confirmLabel(play).includes('Purchase'), 'buy End Phase');
  confirm(play);
  assert(play.gameState.turnPhase === TURN_PHASES.COMBAT_MOVE, 'combat-move after buy skip');
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

// --- S2 phase shell ---
const shell = fresh();
const strip = phaseStrip(shell);
assert(strip.steps.join('|') === TURN_PHASE_ORDER.map((p) => STRIP_SHORT[p]).join('|'), 'strip labels');
assert(strip.current === 1, 'strip on Tech');
assert(canEndPhase(shell) === true, 'can end develop tech');
assert(chromeModel(shell).phaseStripCurrent === 1, 'chrome strip current');
assert(chromeModel(shell).ipc == null || true, 'chrome model builds');
assert(shell.gameState.getIPCs('Russians') === 24, 'live IPC 24');
skipToCombatMove(shell);
assert(phaseStrip(shell).current === 3, 'strip on Move');
assert(canEndPhase(shell) === true, 'can skip combat-move');
confirm(shell);
assert(shell.gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE, 'empty combat skipped');
assert(ncmAirRemaining(shell) === 0, 'no leftover air on skip');
confirm(shell);
assert(shell.gameState.currentPlayer.id === 'Germans', 'income auto nextTurn');
assert(shell.gameState.currentPlayer.isAI === true, 'Germans are AI');
assert(shell.gameState.turnPhase === TURN_PHASES.DEVELOP_TECH, 'AI opens develop tech');
assert(confirmEnabled(shell) === false, 'human Confirm off on AI seat');

// --- S3 combat-move adapter ---
const move = fresh();
skipToCombatMove(move);
assert(combatOrigins(move).includes(ORIGIN), 'Karelia is an origin');
tapLand(move, ORIGIN);
assert(move.selected === ORIGIN, 'origin selected');
assert(confirmLabel(move).startsWith('End Phase'), 'End Phase until dest');
adjustUnit(move, 'infantry', 1);
adjustUnit(move, 'infantry', 1);
adjustUnit(move, 'armour', 1);
adjustUnit(move, 'fighter', 1);
assert(move.selectedUnits.infantry === 2, 'INF 2');
assert(move.selectedUnits.armour === 1, 'ARM 1');
assert(move.selectedUnits.fighter === 1, 'FTR 1');
const dests = legalDests(move);
assert(dests.includes(DEST), 'Finland is a legal dest');
assert(dests.includes('Ukraine S.S.R.'), 'Ukraine is a legal dest');
assert(dests.includes('East Europe'), 'East Europe is a legal dest');
assert(!dests.includes(LAND), 'Russia is not a combat dest');
assert(!dests.includes('Germany'), 'mixed land+air cannot list air-only Germany');
assert(highlights(move).legal.includes(DEST), 'gold legal highlight');
tapLand(move, DEST);
assert(move.destPicked === DEST, 'dest picked');
assert(move.selected === ORIGIN, 'origin kept after dest tap');
assert(confirmLabel(move) === `Confirm: Attack ${DEST}`, 'attack label');
assert(confirmGold(move) === true, 'attack gold');
confirm(move);
assert(qty(move, DEST, 'infantry', 'Russians') === 2, 'infantry arrived');
assert(qty(move, DEST, 'armour', 'Russians') === 1, 'armour arrived');
assert(qty(move, DEST, 'fighter', 'Russians') === 1, 'fighter arrived');
assert(qty(move, ORIGIN, 'infantry', 'Russians') === 1, 'one infantry left in Karelia');
assert(move.destPicked == null, 'dest cleared after attack');

// --- S4 combat + YOU casualties + THEY cheapest ---
assert(canEndPhase(move) === true, 'can end combat-move after attack');
// Attack 5, defense 5. First round: 2 ATK hits, 1 DEF hit so YOU must pick.
// Then wipe.
move.rng = scriptRng([
  1, 1, 6, 6,    // ATK R1 — 2 of 4
  1, 6, 6, 6, 6, // DEF R1 — 1 of 5
  1, 1, 1,       // ATK R2 — wipe
  6, 6, 6,       // DEF R2 — miss
]);
confirm(move);
assert(move.gameState.turnPhase === TURN_PHASES.COMBAT, 'entered combat');
assert(move.battle?.step === BATTLE_STEP.COMBAT_READY, 'no AA on Finland');
assert(move.battle.dest === DEST, 'battle dest Finland');
confirm(move);
assert(move.battle.step === BATTLE_STEP.COMBAT_RESULT, 'rolled combat');
assert(move.battle.attackHits === 2, '2 attack hits');
assert(move.battle.defenseHits === 1, '1 defense hit');
assert(move.battle.pendingDef.infantry === 2, 'THEY cheapest 2 infantry');
assert(Object.keys(move.battle.pendingAtt).length === 0, 'YOU unassigned');
assert(confirmEnabled(move) === false, 'Confirm waits on YOU');
assert(confirmLabel(move) === 'Assign casualties', 'assign label');
adjustLoss(move, 'def', 'fighter', 1);
assert(move.battle.pendingDef.infantry === 2, 'THEY still cheapest');
adjustLoss(move, 'att', 'armour', 1);
assert(move.battle.pendingAtt.armour === 1, 'YOU took armour');
assert(confirmEnabled(move) === true, 'YOU assign unlocks Confirm');
assert(confirmGold(move) === true, 'take-hits gold');
confirm(move);
assert(qty(move, DEST, 'armour', 'Russians') === 0, 'YOU armour removed');
assert(qty(move, DEST, 'infantry', 'Germans') === 1, 'THEY cheapest infantry gone');
assert(move.battle.step === BATTLE_STEP.COMBAT_READY, 'multi-round continues');
confirm(move);
confirm(move);
if (move.battle?.step !== BATTLE_STEP.WON) {
  console.error('DEBUG battle', inspectPlay(move), move.battle);
}
assert(move.battle.step === BATTLE_STEP.WON, 'attacker won');
assert(move.battle.failed === false, 'not a fail');
assert(move.gameState.getOwner(DEST) === 'Russians', 'Finland captured');

// --- S5 air land ---
confirm(move);
assert(!!move.landing, 'air land sheet');
assert((move.landing?.airLeft?.fighter || 0) === 1, 'fighter left to land');
assert(!!move.landing && (move.landing.landable.includes(LAND) || move.landing.landable.includes(ORIGIN)), 'teal dest exists');
assert(!move.landing || confirmLabel(move) === 'Pick a teal land', 'pick teal');
const landDest = move.landing?.landable.includes(LAND) ? LAND : ORIGIN;
if (move.landing) tapLand(move, landDest);
assert(move.landing?.dest === landDest, 'landing dest');
adjustLanding(move, 'fighter', 1);
assert(move.landing?.pick.fighter === 1, 'partial fighter pick');
assert(!move.landing || confirmLabel(move).includes('Land'), 'confirm land');
confirm(move);
assert(move.landing == null, 'landing done');
assert(qty(move, landDest, 'fighter', 'Russians') >= 1, 'fighter landed');
assert(qty(move, DEST, 'fighter', 'Russians') === 0, 'fighter left Finland');

// --- S6 NCM + Done gating ---
assert(move.gameState.turnPhase === TURN_PHASES.COMBAT, 'still combat after land');
assert(canEndPhase(move) === true, 'queue empty End Phase');
assert(ncmAirRemaining(move) === 0, 'pending air applied');
confirm(move);
assert(move.gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE, 'NCM after combat');
tapLand(move, ORIGIN);
adjustUnit(move, 'infantry', 1);
const ncmDests = legalDests(move);
assert(ncmDests.includes(LAND), 'NCM to friendly Russia');
assert(!ncmDests.includes('East Europe'), 'NCM cannot enter remaining German land');
tapLand(move, LAND);
assert(confirmLabel(move).includes('Move to'), 'NCM move label');
confirm(move);
assert(qty(move, LAND, 'infantry', 'Russians') >= 1, 'NCM infantry arrived');
assert(canEndPhase(move) === true, 'NCM Done when remaining air = 0');
confirm(move);
assert(move.gameState.currentPlayer.id === 'Germans', 'NCM End Phase collects + nextTurn');

// --- S4 chrome notify must not wipe the battle sheet ---
const notify = fresh();
skipToCombatMove(notify);
tapLand(notify, ORIGIN);
adjustUnit(notify, 'infantry', 1);
tapLand(notify, DEST);
confirm(notify);
notify.gameState.subscribe(() => chromeModel(notify));
confirm(notify);
assert(notify.gameState.turnPhase === TURN_PHASES.COMBAT, 'notify path entered combat');
assert(notify.battle?.step === BATTLE_STEP.COMBAT_READY, 'notify path keeps battle');
assert(confirmEnabled(notify) === true, 'notify path Confirm on');

// --- S4 AA fail-close ---
const aa = fresh();
skipToCombatMove(aa);
aa.gameState.units[DEST].push({ type: 'aaGun', quantity: 1, owner: 'Germans' });
tapLand(aa, ORIGIN);
adjustUnit(aa, 'fighter', 1);
tapLand(aa, DEST);
confirm(aa);
aa.rng = scriptRng([1, 1, 1, 1, 1, 1]);
confirm(aa);
assert(aa.battle?.step === BATTLE_STEP.AA_READY, 'AA ready vs fighter');
confirm(aa);
assert(aa.battle.step === BATTLE_STEP.AA_RESULT, 'AA result');
assert(aa.battle.aaHits >= 1, 'AA hit');
assert(qty(aa, DEST, 'fighter', 'Russians') === 0, 'fighter wiped');
confirm(aa);
assert(aa.battle.failed === true, 'AA wipe fail-close');
assert(aa.battle.step === BATTLE_STEP.WON, 'closed after wipe');
assert((aa.gameState.combatQueue || []).length === 0, 'queue drained');
confirm(aa);
assert(aa.landing == null, 'no land after fail');
confirm(aa);
assert(aa.gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE, 'NCM after fail-close');

// --- S4 naval auto-resolve so land is not wedged ---
const sea = fresh();
skipToCombatMove(sea);
sea.gameState.units['Baltic Sea Zone'] = [
  { type: 'submarine', quantity: 1, owner: 'Russians' },
  { type: 'submarine', quantity: 1, owner: 'Germans' },
];
tapLand(sea, ORIGIN);
adjustUnit(sea, 'infantry', 1);
tapLand(sea, DEST);
confirm(sea);
sea.rng = scriptRng(Array(40).fill(1));
confirm(sea);
assert(sea.gameState.turnPhase === TURN_PHASES.COMBAT, 'combat after mixed queue');
assert(!sea.gameState.territoryByName[sea.battle?.dest]?.isWater, 'land battle after naval auto');
assert((sea.gameState.combatQueue || []).every((n) => !sea.gameState.territoryByName[n]?.isWater), 'no sea left in queue');

// Pocket seed untouched
const pocket = createScenario();
assert(pocket.id === 'karelia-finland-air', 'pocket seed untouched');
assert(pocket.phase === 'COMBAT MOVE', 'pocket still combat-move');

const inspect = inspectPlay(fresh());
assert(inspect.turnPhase === 'develop_tech', 'inspect opens tech');
assert(inspect.canEndPhase === true, 'inspect can end');

if (failures) {
  console.error(`${failures} solo play checks failed`);
  process.exit(1);
}
console.log('three solo S2–S6 checks passed');
