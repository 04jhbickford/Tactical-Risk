// Fat Karelia → Ukraine max battle. Run: node tools/test-ux-preview-max.mjs

import {
  PHASE,
  MAX_ATTACK,
  MAX_DEFEND,
  MAX_SCENARIO,
  createScenario,
  tapLand,
  adjustUnit,
  pickUnit,
  confirm,
  confirmLabel,
  confirmEnabled,
  battleCard,
  airLandRoster,
  driveCombatMove,
  driveBattleMid,
  driveAirChoice,
  lossesReady,
  stackQty,
} from '../src/map/uxPreviewScenario.js';
import { isMaxBattleRequested } from '../src/map/uxPreviewFlag.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

assert(isMaxBattleRequested('?three=1&max=1') === true, 'max=1');
assert(isMaxBattleRequested('?three=1&stress=1') === true, 'stress=1 alias');
assert(isMaxBattleRequested('?three=1&demo=max') === true, 'demo=max');
assert(isMaxBattleRequested('?three=1') === false, 'plain three is small pocket');

const play = createScenario({ max: true });
assert(play.maxBattle === true, 'max flag');
assert(play.dest === MAX_SCENARIO.dest, 'default dest Ukraine');
assert(play.origin === 'Karelia S.S.R.', 'from Karelia');
assert(stackQty(play.placements[play.origin], 'infantry') === MAX_ATTACK.infantry, 'atk INF');
assert(stackQty(play.placements[play.origin], 'artillery') === MAX_ATTACK.artillery, 'atk ART');
assert(stackQty(play.placements[play.origin], 'armour') === MAX_ATTACK.armour, 'atk TNK');
assert(stackQty(play.placements[play.origin], 'fighter') === MAX_ATTACK.fighter, 'atk FTR');
assert(stackQty(play.placements[play.origin], 'bomber') === MAX_ATTACK.bomber, 'atk BMB');
assert(stackQty(play.placements[MAX_SCENARIO.dest], 'infantry', 'Germans') === MAX_DEFEND.infantry, 'def INF');
assert(stackQty(play.placements[MAX_SCENARIO.dest], 'artillery', 'Germans') === MAX_DEFEND.artillery, 'def ART');
assert(stackQty(play.placements[MAX_SCENARIO.dest], 'armour', 'Germans') === MAX_DEFEND.armour, 'def TNK');
assert(stackQty(play.placements[MAX_SCENARIO.dest], 'fighter', 'Germans') === MAX_DEFEND.fighter, 'def FTR');
assert(stackQty(play.placements[MAX_SCENARIO.dest], 'aaGun', 'Germans') === MAX_DEFEND.aaGun, 'def AA');

tapLand(play, play.origin);
adjustUnit(play, 'infantry', 1);
adjustUnit(play, 'infantry', 1);
assert(play.selectedUnits.infantry === 2, 'partial INF 2/10');
assert(play.selectedUnits.infantry < MAX_ATTACK.infantry, 'not auto-all');

const full = createScenario({ max: true });
tapLand(full, full.origin);
pickUnit(full, 'infantry');
assert(full.selectedUnits.infantry === MAX_ATTACK.infantry, 'toggle still maxes');
adjustUnit(full, 'infantry', -1);
assert(full.selectedUnits.infantry === MAX_ATTACK.infantry - 1, 'stepper can drop one');

const mid = createScenario({ max: true });
driveBattleMid(mid);
assert(mid.phase === PHASE.BATTLE, 'max entered battle');
assert(mid.battle.step === 'combatResult', 'first-round result');
assert(mid.battle.attackHits === 2, 'scripted 2 ATK hits');
assert(mid.battle.defenseHits === 1, 'scripted 1 DEF hit');
assert(lossesReady(mid) === false, 'mixed types — optional casualties');
assert(battleCard(mid).pickers?.length >= 1, 'casualty pickers shown');
assert(mid.battle.defForced === false, 'defender has a choice');
assert(mid.battle.attForced === false, 'attacker has a choice');

const air = createScenario({ max: true });
driveAirChoice(air);
assert(air.phase === PHASE.AIR_LAND, 'air land after take');
assert(confirmLabel(air) === 'Confirm land', 'Confirm land idle');
const roster = airLandRoster(air);
assert(roster.every((u) => u.type === 'fighter' || u.type === 'bomber'), 'planes only');
assert(!roster.some((u) => u.type === 'infantry' || u.type === 'armour'), 'no dest land roster');
assert(confirmEnabled(air) === false, 'need teal dest');
tapLand(air, 'Russia');
assert(confirmLabel(air) === 'Confirm: Land in Russia', 'named land');

if (failures) {
  console.error(`${failures} ux-preview max-battle checks failed`);
  process.exit(1);
}
console.log('ux-preview max Karelia→Ukraine battle checks passed');
