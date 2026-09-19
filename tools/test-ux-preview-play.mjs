// Playable UX preview: Combat Move → Battle → Air Land.
// Run: node tools/test-ux-preview-play.mjs

import {
  PHASE,
  BATTLE_STEP,
  SCENARIO,
  SELECT_GOLD,
  createScenario,
  tapLand,
  pickUnit,
  confirm,
  confirmLabel,
  confirmGold,
  confirmEnabled,
  highlights,
  guideCopy,
  battleCard,
  inspectPlay,
  driveCombatMove,
  driveBattleMid,
  driveAirChoice,
  driveLanded,
  resetScenario,
  stackQty,
} from '../src/map/uxPreviewScenario.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

const move = createScenario();
assert(move.phase === PHASE.COMBAT_MOVE, 'starts combat move');
assert(confirmLabel(move) === 'Select your stack', 'idle label');
assert(confirmGold(move) === false, 'idle not gold');
assert(confirmEnabled(move) === false, 'idle disabled');

tapLand(move, SCENARIO.origin);
assert(move.selected === SCENARIO.origin, 'origin selected');
assert(confirmLabel(move) === 'Pick infantry, then a dest', 'need units');

pickUnit(move, 'fighter');
assert(move.selectedUnits.fighter === 1, 'fighter staged');
assert(confirmGold(move) === false, 'air only cannot take');
tapLand(move, SCENARIO.dest);
assert(move.destPicked == null, 'no dest without ground');

pickUnit(move, 'infantry');
assert(move.selectedUnits.infantry === 3, 'inf staged');
assert(highlights(move).legal.includes(SCENARIO.dest), 'finland legal');
assert(guideCopy(move).includes('Karelia'), 'brief guide');

tapLand(move, SCENARIO.dest);
assert(move.destPicked === SCENARIO.dest, 'dest picked');
assert(confirmGold(move) === true, 'confirm gold on staged move');
assert(confirmLabel(move) === `Confirm: Move to ${SCENARIO.dest}`, 'named dest confirm');

confirm(move);
assert(move.phase === PHASE.BATTLE, 'entered battle');
assert(move.battle.step === BATTLE_STEP.AA_READY, 'AA first');
assert(stackQty(move.placements[SCENARIO.origin], 'infantry') === 0, 'origin emptied of INF');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Russians') === 3, 'INF on dest');
assert(confirmLabel(move) === 'Confirm: Fire AA', 'AA CTA');
assert(confirmGold(move) === true, 'AA gold');
assert(battleCard(move).kicker === 'AA fire', 'AA card');

confirm(move);
assert(move.battle.step === BATTLE_STEP.AA_RESULT, 'AA result');
assert(move.battle.aaHits === 0, 'seeded AA miss');
assert(battleCard(move).title === 'Missed', 'AA miss title');
assert(stackQty(move.placements[SCENARIO.dest], 'fighter', 'Russians') === 1, 'fighter lives');

confirm(move);
assert(move.battle.step === BATTLE_STEP.COMBAT_READY, 'combat ready');
assert(confirmLabel(move) === 'Confirm: Roll combat', 'roll CTA');

confirm(move);
assert(move.battle.step === BATTLE_STEP.COMBAT_RESULT, 'mid-fight');
assert(move.battle.attackHits === 2, 'demo 2 attack hits');
assert(move.battle.defenseHits === 1, 'demo 1 defense hit');
assert(confirmLabel(move) === 'Confirm: Take hits', 'hits CTA');
assert(battleCard(move).title.includes('ATK 2'), 'dice card title');
assert(battleCard(move).dice.length >= 6, 'dice faces shown');

confirm(move);
assert(move.battle.step === BATTLE_STEP.WON, 'attacker wins');
assert(move.owners[SCENARIO.dest] === 'Russians', 'finland taken');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Germans') === 0, 'defenders gone');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Russians') === 2, '1 INF lost');

confirm(move);
assert(move.phase === PHASE.AIR_LAND, 'air land');
assert(confirmGold(move) === false, 'air idle not gold');
assert(confirmLabel(move) === 'Tap a landable territory', 'air idle');
assert(highlights(move).landable.includes('Russia'), 'russia landable');
assert(highlights(move).landable.includes(SCENARIO.origin), 'karelia landable');

tapLand(move, 'Germany');
assert(move.landingDest == null, 'illegal land ignored');
tapLand(move, 'Russia');
assert(move.landingDest === 'Russia', 'russia chosen');
assert(confirmGold(move) === true, 'land confirm gold');
assert(confirmLabel(move) === 'Confirm: Land in Russia', 'named land confirm');

confirm(move);
assert(move.phase === PHASE.DONE, 'done');
assert(move.landed === true, 'landed flag');
assert(stackQty(move.placements.Russia, 'fighter', 'Russians') === 1, 'fighter in Russia');
assert(stackQty(move.placements[SCENARIO.dest], 'fighter', 'Russians') === 0, 'fighter left finland');
assert(confirmGold(move) === false, 'done confirm not gold — does not stick');
assert(confirmEnabled(move) === true, 'replay enabled');
assert(confirmLabel(move).includes('Landed in Russia'), 'landed label');

const mid = createScenario();
driveBattleMid(mid);
assert(mid.phase === PHASE.BATTLE, 'drive battle');
assert(mid.battle.step === BATTLE_STEP.COMBAT_RESULT, 'drive mid-fight');
const snap = inspectPlay(mid);
assert(snap.confirmGold === true, 'inspect gold mid-fight');
assert(snap.attackHits === 2, 'inspect hits');

const air = createScenario();
driveAirChoice(air);
assert(air.phase === PHASE.AIR_LAND, 'drive air');
assert(air.landingDest == null, 'air waits for tap');

const done = createScenario();
driveLanded(done, 'Russia');
assert(done.phase === PHASE.DONE, 'drive landed');
assert(done.landingDest === 'Russia', 'landed russia');
resetScenario(done);
assert(done.phase === PHASE.COMBAT_MOVE, 'replay resets');
assert(stackQty(done.placements[SCENARIO.origin], 'infantry') === 3, 'pocket restored');
assert(SELECT_GOLD === '#C4A35A', 'confirm gold token');

if (failures) {
  console.error(`${failures} ux-preview play checks failed`);
  process.exit(1);
}
console.log('ux-preview play Combat Move / Battle / Air Land checks passed');
