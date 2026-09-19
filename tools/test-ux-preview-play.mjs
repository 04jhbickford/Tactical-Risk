// Playable UX preview: Combat Move → Battle → Air Land.
// Manual only — no Try / auto-start. Run: node tools/test-ux-preview-play.mjs

import {
  PHASE,
  BATTLE_STEP,
  SCENARIO,
  SELECT_GOLD,
  LABEL_LANDS,
  createScenario,
  tapLand,
  pickUnit,
  adjustUnit,
  pickLoss,
  confirm,
  confirmLabel,
  confirmGold,
  confirmEnabled,
  highlights,
  battleCard,
  inspectPlay,
  airLandRoster,
  driveCombatMove,
  driveBattleMid,
  driveAirChoice,
  driveLanded,
  resetScenario,
  stackQty,
  lossesReady,
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
assert(confirmLabel(move) === 'Select units', 'idle hint');
assert(confirmGold(move) === false, 'idle not gold');
assert(confirmEnabled(move) === false, 'idle disabled — no Try');
assert(highlights(move).origin === SCENARIO.origin, 'origin marked on load');
assert(highlights(move).pulse.includes(SCENARIO.origin), 'origin pulses on load');
assert(LABEL_LANDS.includes('Ukraine S.S.R.'), 'ukraine labeled');
assert(LABEL_LANDS.includes('Karelia S.S.R.'), 'karelia labeled');

tapLand(move, 'Ukraine S.S.R.');
assert(move.selected == null, 'ukraine before origin does not steal selection');
assert(confirmEnabled(move) === false, 'ukraine first keeps Attack gray');

tapLand(move, SCENARIO.origin);
assert(move.selected === SCENARIO.origin, 'origin selected');
assert(confirmLabel(move) === 'Select units', 'select units after origin');
assert(!highlights(move).pulse.includes(SCENARIO.origin), 'origin pulse stops after tap');

const stepped = createScenario();
tapLand(stepped, SCENARIO.origin);
assert((stepped.selectedUnits.infantry || 0) === 0, 'INF starts 0/3');
adjustUnit(stepped, 'infantry', 1);
assert(stepped.selectedUnits.infantry === 1, 'INF + → 1/3');
adjustUnit(stepped, 'infantry', 1);
adjustUnit(stepped, 'infantry', 1);
assert(stepped.selectedUnits.infantry === 3, 'INF + + + → 3/3');
adjustUnit(stepped, 'infantry', 1);
assert(stepped.selectedUnits.infantry === 3, 'INF + at max stays 3');
adjustUnit(stepped, 'infantry', -1);
assert(stepped.selectedUnits.infantry === 2, 'INF − → 2/3');
adjustUnit(stepped, 'fighter', 1);
assert(stepped.selectedUnits.fighter === 1, 'FTR + → 1/1');
adjustUnit(stepped, 'fighter', 1);
assert(stepped.selectedUnits.fighter === 1, 'FTR + at max stays 1');

tapLand(move, 'Ukraine S.S.R.');
assert(move.destPicked == null, 'ukraine dest ignored until units');
assert(move.selected === SCENARIO.origin, 'chips stay on origin after ukraine tap');

pickUnit(move, 'fighter');
assert(move.selectedUnits.fighter === 1, 'fighter staged');
assert(confirmGold(move) === false, 'air only cannot take');
tapLand(move, SCENARIO.dest);
assert(move.destPicked == null, 'no dest without ground');

pickUnit(move, 'infantry');
assert(move.selectedUnits.infantry === 3, 'inf staged');
assert(highlights(move).legal.includes(SCENARIO.dest), 'finland legal');
assert(highlights(move).legal.includes('Ukraine S.S.R.'), 'ukraine legal dest');
assert(highlights(move).pulse.includes(SCENARIO.dest), 'finland pulses after units');
assert(highlights(move).pulse.includes('Ukraine S.S.R.'), 'ukraine pulses after units');
assert(confirmLabel(move) === 'Pick target', 'pick target hint');
assert(confirmGold(move) === false, 'gray until dest tap');

tapLand(move, 'Ukraine S.S.R.');
assert(move.destPicked === 'Ukraine S.S.R.', 'ukraine dest legal');
assert(confirmGold(move) === true, 'gold Attack after ukraine dest');
assert(confirmLabel(move) === 'Confirm: Attack Ukraine S.S.R.', 'named ukraine attack');

tapLand(move, SCENARIO.dest);
assert(move.destPicked === SCENARIO.dest, 'finland dest');
assert(confirmLabel(move) === `Confirm: Attack ${SCENARIO.dest}`, 'named finland attack');
assert(confirmEnabled(move) === true, 'confirm when legal');

confirm(move);
assert(move.phase === PHASE.BATTLE, 'entered battle');
assert(move.battle.step === BATTLE_STEP.AA_READY, 'AA first');
assert(stackQty(move.placements[SCENARIO.origin], 'infantry') === 0, 'origin emptied of INF');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Russians') === 3, 'INF on dest');
assert(confirmLabel(move) === 'Confirm: Fire AA', 'AA CTA');

confirm(move);
assert(move.battle.aaHits === 0, 'seeded AA miss');
confirm(move);
assert(move.battle.step === BATTLE_STEP.COMBAT_READY, 'combat ready');
confirm(move);
assert(move.battle.step === BATTLE_STEP.COMBAT_RESULT, 'mid-fight');
assert(move.battle.attackHits === 2, 'demo 2 attack hits');
assert(move.battle.defenseHits === 1, 'demo 1 defense hit');
assert(lossesReady(move) === false, 'optional attacker loss not auto-picked');
assert(!move.battle.pendingAtt.infantry, 'no cheapest INF auto-assign');
assert(confirmEnabled(move) === false, 'take hits disabled until assign');
assert(confirmLabel(move) === 'Assign casualties', 'assign hint');
assert(battleCard(move).pickers?.length >= 1, 'casualty picker shown');

pickLoss(move, 'att', 'fighter');
assert(move.battle.pendingAtt.fighter === 1, 'chose fighter');
pickLoss(move, 'att', 'infantry');
assert(move.battle.pendingAtt.infantry === 1, 'switched to INF');
assert(!move.battle.pendingAtt.fighter, 'fighter unassigned');
assert(lossesReady(move) === true, 'losses assigned');
assert(confirmLabel(move) === 'Confirm: Take hits', 'hits CTA after assign');

confirm(move);
assert(move.battle.step === BATTLE_STEP.WON, 'attacker wins');
assert(move.owners[SCENARIO.dest] === 'Russians', 'finland taken');
assert(stackQty(move.placements[SCENARIO.dest], 'infantry', 'Russians') === 2, '1 INF lost');

confirm(move);
assert(move.phase === PHASE.AIR_LAND, 'air land');
assert(confirmGold(move) === false, 'air idle not gold');
assert(confirmLabel(move) === 'Confirm land', 'planes-only Confirm land');
assert(highlights(move).landable.includes('Russia'), 'russia landable');
const planes = airLandRoster(move);
assert(planes.length === 1 && planes[0].type === 'fighter', 'air roster is planes only');
assert(!planes.some((p) => p.type === 'infantry'), 'dest INF not in air sheet');

tapLand(move, 'Germany');
assert(move.landingDest == null, 'illegal land ignored');
tapLand(move, 'Russia');
assert(confirmLabel(move) === 'Confirm: Land in Russia', 'named land confirm');
confirm(move);
assert(move.phase === PHASE.DONE, 'done');
assert(stackQty(move.placements.Russia, 'fighter', 'Russians') === 1, 'fighter in Russia');
assert(confirmGold(move) === false, 'done confirm not gold');

const mid = createScenario();
driveBattleMid(mid);
assert(mid.phase === PHASE.BATTLE, 'drive battle');
assert(mid.battle.step === BATTLE_STEP.COMBAT_RESULT, 'drive mid-fight waits for picker');
assert(inspectPlay(mid).lossesReady === false, 'drive does not auto-pick');

const air = createScenario();
driveAirChoice(air);
assert(air.phase === PHASE.AIR_LAND, 'drive air');

const done = createScenario();
driveLanded(done, 'Russia');
assert(done.phase === PHASE.DONE, 'drive landed');
resetScenario(done);
assert(done.phase === PHASE.COMBAT_MOVE, 'replay resets');
assert(stackQty(done.placements[SCENARIO.origin], 'infantry') === 3, 'pocket restored');
assert(SELECT_GOLD === '#C4A35A', 'confirm gold token');

if (failures) {
  console.error(`${failures} ux-preview play checks failed`);
  process.exit(1);
}
console.log('ux-preview play Combat Move / Battle / Air Land checks passed');
