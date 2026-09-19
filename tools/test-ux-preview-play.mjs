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
  pickCasualty,
  confirm,
  confirmLabel,
  confirmGold,
  confirmEnabled,
  highlights,
  guideCopy,
  guideSteps,
  combatMoveStep,
  battleCard,
  inspectPlay,
  driveCombatMove,
  driveBattleMid,
  driveAirChoice,
  driveLanded,
  resetScenario,
  stackQty,
  destLegal,
  legalDests,
  casualtyChoiceNeeded,
} from '../src/map/uxPreviewScenario.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

assert(!/try combat/i.test(confirmLabel(createScenario())), 'no Try label at idle');
assert(!String(guideCopy(createScenario())).toLowerCase().includes('try combat'), 'no Try in guide');

const move = createScenario();
assert(move.phase === PHASE.COMBAT_MOVE, 'starts combat move');
assert(confirmLabel(move) === 'Tap a glowing stack', 'idle label explains why');
assert(confirmGold(move) === false, 'idle not gold');
assert(confirmEnabled(move) === false, 'idle Confirm disabled — no wizard');
assert(highlights(move).origin === SCENARIO.origin, 'origin marked on load');
assert(highlights(move).pulse.includes(SCENARIO.origin), 'origin pulses on load');
assert(highlights(move).labels.includes(SCENARIO.origin), 'origin name labeled');
assert(highlights(move).labels.includes(SCENARIO.dest), 'finland labeled');
assert(highlights(move).labels.includes(SCENARIO.ukraine), 'ukraine labeled');
assert(combatMoveStep(move) === 1, 'step 1 on load');
assert(guideCopy(move).includes('1 Tap attack-from'), 'numbered strip');
assert(guideSteps(move).steps[0] === 'Tap attack-from', 'step copy');

tapLand(move, SCENARIO.origin);
assert(move.attackFrom === SCENARIO.origin, 'attack-from selected');
assert(confirmLabel(move) === 'Pick units to attack', 'need units');
assert(!highlights(move).pulse.includes(SCENARIO.origin), 'origin pulse stops after tap');
assert(combatMoveStep(move) === 2, 'step 2 after origin tap');

pickUnit(move, 'fighter');
assert(move.selectedUnits.fighter === 1, 'fighter staged');
pickUnit(move, 'fighter');
assert(!move.selectedUnits.fighter, 'fighter chip toggles off');
pickUnit(move, 'fighter');
assert(move.selectedUnits.fighter === 1, 'fighter chip toggles on');
assert(confirmGold(move) === false, 'air only cannot take');
tapLand(move, SCENARIO.dest);
assert(move.destPicked == null, 'no dest without ground');

pickUnit(move, 'factory');
assert(!move.selectedUnits.factory, 'factory chip is static');
pickUnit(move, 'aaGun');
assert(!move.selectedUnits.aaGun, 'AA chip is static');

pickUnit(move, 'infantry');
assert(move.selectedUnits.infantry === 3, 'inf staged');
pickUnit(move, 'infantry');
assert(!move.selectedUnits.infantry, 'inf chip toggles off');
pickUnit(move, 'infantry');
assert(move.selectedUnits.infantry === 3, 'inf chip toggles back');
assert(highlights(move).legal.includes(SCENARIO.dest), 'finland legal');
assert(highlights(move).legal.includes(SCENARIO.ukraine), 'ukraine legal dest');
assert(highlights(move).pulse.includes(SCENARIO.dest), 'dest pulses after units');
assert(highlights(move).pulse.includes(SCENARIO.ukraine), 'ukraine pulses after units');
assert(combatMoveStep(move) === 3, 'step 3 after ground');
assert(confirmLabel(move) === 'Tap a glowing enemy land', 'dest hint');

tapLand(move, SCENARIO.dest);
assert(move.destPicked === SCENARIO.dest, 'dest picked');
assert(confirmGold(move) === true, 'confirm gold on staged move');
assert(confirmEnabled(move) === true, 'confirm enabled when staged+dest');
assert(confirmLabel(move) === `Confirm: Attack ${SCENARIO.dest}`, 'named dest confirm');
assert(combatMoveStep(move) === 4, 'step 4 confirm');
assert(!highlights(move).pulse.includes(SCENARIO.dest), 'dest pulse stops after pick');

const ukrainePath = createScenario();
tapLand(ukrainePath, SCENARIO.origin);
pickUnit(ukrainePath, 'infantry');
assert(legalDests(ukrainePath).includes(SCENARIO.ukraine), 'ukraine is a legal dest');
tapLand(ukrainePath, SCENARIO.ukraine);
assert(ukrainePath.destPicked === SCENARIO.ukraine, 'ukraine dest picked');
assert(destLegal(ukrainePath) === true, 'ukraine path legal');
assert(confirmEnabled(ukrainePath) === true, 'Attack enables on Ukraine dest');
assert(confirmLabel(ukrainePath) === `Confirm: Attack ${SCENARIO.ukraine}`, 'named Ukraine confirm');
pickUnit(ukrainePath, 'infantry');
assert(ukrainePath.destPicked == null, 'unstage ground clears dest');
assert(confirmEnabled(ukrainePath) === false, 'Attack grays when chips toggle off');

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
assert(move.battle.attChoice === true, 'attacker has a casualty choice');
assert(move.battle.defChoice === false, '2 INF vs 2 hits is forced');
assert(casualtyChoiceNeeded(move.placements[SCENARIO.dest], 'Russians', 1) === true, 'INF vs FTR is a choice');
assert(confirmEnabled(move) === false, 'Take hits waits for the pick');
assert(confirmLabel(move) === 'Choose which unit dies', 'casualty CTA');
assert(battleCard(move).casualty?.att?.choice === true, 'casualty sheet for attacker');
assert(Object.keys(move.battle.pendingAtt).length === 0, 'optional hit is not auto-assigned');

confirm(move);
assert(move.battle.step === BATTLE_STEP.COMBAT_RESULT, 'cannot skip the picker');

pickCasualty(move, 'att', 'infantry');
assert(move.battle.pendingAtt.infantry === 1, 'INF chosen');
assert(confirmEnabled(move) === true, 'Take hits after pick');
assert(confirmLabel(move) === 'Confirm: Take hits', 'hits CTA');
pickCasualty(move, 'att', 'infantry');
assert(!move.battle.pendingAtt.infantry, 'casualty chip toggles off');
assert(confirmEnabled(move) === false, 'un-pick disables Confirm');
pickCasualty(move, 'att', 'fighter');
assert(move.battle.pendingAtt.fighter === 1, 'can choose the fighter instead');
pickCasualty(move, 'att', 'fighter');
pickCasualty(move, 'att', 'infantry');

confirm(move);
assert(move.battle.step === BATTLE_STEP.WON, 'attacker wins');
assert(move.owners[SCENARIO.dest] === 'Russians', 'finland taken');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Germans') === 0, 'defenders gone');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Russians') === 2, '1 INF lost');
assert(stackQty(move.placements[SCENARIO.dest], 'fighter', 'Russians') === 1, 'FTR kept');

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

const infOnly = createScenario();
tapLand(infOnly, SCENARIO.origin);
pickUnit(infOnly, 'infantry');
assert(highlights(infOnly).pulse.includes(SCENARIO.dest), 'dest pulses after ground pick');
assert(confirmGold(infOnly) === false, 'not legal until dest tap');

const mid = createScenario();
driveBattleMid(mid);
assert(mid.phase === PHASE.BATTLE, 'drive battle');
assert(mid.battle.step === BATTLE_STEP.COMBAT_RESULT, 'drive mid-fight');
const snap = inspectPlay(mid);
assert(snap.confirmGold === true, 'inspect gold after casualty pick');
assert(snap.attackHits === 2, 'inspect hits');
assert(snap.pendingAtt.infantry === 1, 'drive picks INF');

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
assert(done.attackFrom == null, 'replay clears attack-from');
assert(stackQty(done.placements[SCENARIO.origin], 'infantry') === 3, 'pocket restored');
assert(SELECT_GOLD === '#C4A35A', 'confirm gold token');

if (failures) {
  console.error(`${failures} ux-preview play checks failed`);
  process.exit(1);
}
console.log('ux-preview play Combat Move / Battle / Air Land checks passed');
