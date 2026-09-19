// Playable UX preview: Combat Move → Battle → Air Land.
// Run: node tools/test-ux-preview-play.mjs

import {
  PHASE,
  BATTLE_STEP,
  SCENARIO,
  GERMANS_SCENARIO,
  SELECT_GOLD,
  ATTACK_HINT,
  createScenario,
  createGermansMidflow,
  tapLand,
  pickUnit,
  pickCasualty,
  confirm,
  confirmLabel,
  confirmGold,
  confirmEnabled,
  confirmHint,
  highlights,
  guideCopy,
  battleCard,
  inspectPlay,
  driveCombatMove,
  driveBattleMid,
  driveCasualtySelect,
  driveAirChoice,
  driveLanded,
  resetScenario,
  stackQty,
  destLegal,
  isCombatMoveIdle,
  COMBAT_MOVE_START,
  assignedHits,
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
assert(isCombatMoveIdle(move) === true, 'idle start');
assert(confirmLabel(move) === 'Select your stack', 'idle has no Try CTA');
assert(confirmGold(move) === false, 'idle not gold');
assert(confirmEnabled(move) === false, 'idle Confirm disabled — manual only');
assert(highlights(move).origins.includes(SCENARIO.origin), 'idle origin pulse');
assert(highlights(move).labels.some((t) => t.kind === 'from'), 'idle FROM label');
assert(guideCopy(move) === COMBAT_MOVE_START, 'one-line start tip');

tapLand(move, SCENARIO.origin);
assert(move.selected === SCENARIO.origin, 'origin selected');
assert(isCombatMoveIdle(move) === false, 'manual path leaves idle');
assert(confirmEnabled(move) === false, 'mid-select Confirm waits for dest');
assert(confirmLabel(move) === 'Pick infantry, then a dest', 'need units');

pickUnit(move, 'fighter');
assert(move.selectedUnits.fighter === 1, 'fighter staged');
assert(confirmGold(move) === false, 'air only cannot take');
tapLand(move, SCENARIO.dest);
assert(move.destPicked === SCENARIO.dest, 'dest can be picked without ground');
assert(destLegal(move) === false, 'no dest legal without ground');
assert(confirmHint(move) === ATTACK_HINT, 'hint when dest but no ground');
assert(confirmGold(move) === false, 'Attack stays gray without ground');

pickUnit(move, 'infantry');
assert(move.selectedUnits.infantry === 3, 'inf staged');
assert(destLegal(move) === true, 'dest legal after ground');
assert(confirmGold(move) === true, 'confirm gold after unit select');
assert(confirmEnabled(move) === true, 'confirm enabled on dest + units');
assert(confirmLabel(move) === `Confirm: Move to ${SCENARIO.dest}`, 'named dest confirm');
assert(highlights(move).labels.some((t) => t.kind === 'to'), 'TO label while staging');

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
assert(move.battle.step === BATTLE_STEP.CASUALTIES, 'choice goes to casualty select');
assert(move.battle.attChoice === true, 'attacker has INF+FTR choice');
assert(move.battle.needAtt === 1, 'one hit to assign');
assert(assignedHits(move.battle.pendingAtt) === 0, 'hits not auto-assigned');
assert(confirmEnabled(move) === false, 'Take hits waits for pick');
assert(confirmGold(move) === false, 'casualty Confirm not gold yet');
assert(battleCard(move).casualties === true, 'casualty card');

pickCasualty(move, 'infantry', 'att');
assert(move.battle.pendingAtt.infantry === 1, 'INF assigned');
assert(confirmEnabled(move) === true, 'Take hits after pick');
assert(confirmGold(move) === true, 'casualty Confirm gold');

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

const idleConfirm = createScenario();
confirm(idleConfirm);
assert(idleConfirm.phase === PHASE.COMBAT_MOVE, 'idle Confirm is a no-op');
assert(idleConfirm.destPicked == null, 'no auto-start');

const mid = createScenario();
driveBattleMid(mid);
assert(mid.phase === PHASE.BATTLE, 'drive battle');
assert(mid.battle.step === BATTLE_STEP.CASUALTIES, 'drive lands on casualty choice');
const snap = inspectPlay(mid);
assert(snap.confirmGold === false, 'inspect not gold until pick');
assert(snap.attackHits === 2, 'inspect hits');

const hits = createScenario();
driveCasualtySelect(hits);
assert(hits.battle.pendingAtt.infantry === 1, 'drive assigns INF');
assert(confirmGold(hits) === true, 'drive casualty gold');

const germans = createGermansMidflow();
assert(germans.seat === 'Germans', 'germans seat');
assert(germans.origin === GERMANS_SCENARIO.origin, 'ukraine origin');
assert(germans.destPicked === GERMANS_SCENARIO.dest, 'karelia dest already picked');
assert(destLegal(germans) === false, 'stuck until units');
assert(confirmGold(germans) === false, 'Attack gray at dest-only');
assert(confirmHint(germans) === ATTACK_HINT, 'germans hint');
assert(confirmLabel(germans) === `Attack ${GERMANS_SCENARIO.dest}`, 'Attack dest label');
pickUnit(germans, 'infantry');
assert(destLegal(germans) === true, 'unit select lights dest');
assert(confirmGold(germans) === true, 'Attack gold after unit select');

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
