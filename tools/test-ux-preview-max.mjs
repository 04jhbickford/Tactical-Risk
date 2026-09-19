// Max both-sides combat stress demo. Run: node tools/test-ux-preview-max.mjs

import {
  PHASE,
  BATTLE_STEP,
  MAX_ATTACKER,
  MAX_DEFENDER,
  MAX_ALT_DEFENDER,
  createScenario,
  tapLand,
  adjustUnit,
  pickUnit,
  pickLoss,
  confirm,
  confirmLabel,
  confirmGold,
  confirmEnabled,
  highlights,
  battleCard,
  airLandRoster,
  driveCombatMove,
  driveBattleMid,
  driveAirChoice,
  driveLanded,
  resetScenario,
  stackQty,
  lossesReady,
  hasGround,
  inspectPlay,
} from '../src/map/uxPreviewScenario.js';
import { parseUxDemo } from '../src/map/uxPreviewFlag.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

assert(parseUxDemo('?three=1&demo=max') === 'max-both-sides', 'query seeds max');

const max = createScenario({ id: 'max-both-sides' });
assert(max.id === 'max-both-sides', 'max id');
assert(max.origin === 'Karelia S.S.R.', 'origin Karelia');
assert(max.dest === 'Ukraine S.S.R.', 'dest Ukraine — spacious, not Japan');
assert(max.legalDests.includes('Ukraine S.S.R.'), 'ukraine legal');
assert(max.legalDests.includes('East Europe'), 'east europe legal');
assert(!max.legalDests.includes('Finland Norway'), 'finland not the max pair');
assert(max.legalDests.every((n) => n !== 'Japan'), 'not tiny Japan');

for (const [type, qty] of Object.entries(MAX_ATTACKER)) {
  assert(stackQty(max.placements[max.origin], type, 'Russians') === qty, `atk ${type}×${qty}`);
}
for (const [type, qty] of Object.entries(MAX_DEFENDER)) {
  assert(stackQty(max.placements[max.dest], type, 'Germans') === qty, `def ${type}×${qty}`);
}
assert(stackQty(max.placements['East Europe'], 'aaGun', 'Germans') === MAX_ALT_DEFENDER.aaGun, 'alt dest AA');
assert(stackQty(max.placements.Russia, 'infantry', 'Russians') === 2, 'russia land pad');

assert(confirmEnabled(max) === false, 'idle disabled — no Try');
assert(confirmGold(max) === false, 'idle not gold');
assert(highlights(max).pulse.includes('Karelia S.S.R.'), 'origin pulses');

tapLand(max, 'Karelia S.S.R.');
assert((max.selectedUnits.infantry || 0) === 0, 'INF starts 0/10');
adjustUnit(max, 'infantry', 1);
assert(max.selectedUnits.infantry === 1, 'INF + → 1/10');
adjustUnit(max, 'armour', 1);
adjustUnit(max, 'artillery', 1);
assert(hasGround({ artillery: 1 }) === true, 'ART is ground');
assert(hasGround({ bomber: 2 }) === false, 'air only is not ground');
adjustUnit(max, 'fighter', 2);
adjustUnit(max, 'bomber', 2);
assert(max.selectedUnits.fighter === 2, 'FTR partial 2/4');
assert(max.selectedUnits.bomber === 2, 'BMB partial 2/3');
assert(confirmLabel(max) === 'Pick target', 'pick target after mixed stack');

tapLand(max, 'Ukraine S.S.R.');
assert(max.destPicked === 'Ukraine S.S.R.', 'ukraine dest');
assert(confirmLabel(max) === 'Confirm: Attack Ukraine S.S.R.', 'named attack');
assert(confirmEnabled(max) === true, 'manual confirm ready');

const full = createScenario({ id: 'max-both-sides' });
driveCombatMove(full);
assert(full.selectedUnits.infantry === MAX_ATTACKER.infantry, 'drive takes all INF');
assert(full.selectedUnits.bomber === MAX_ATTACKER.bomber, 'drive takes bombers');
assert(full.destPicked === 'Ukraine S.S.R.', 'drive dest ukraine');

driveBattleMid(full);
assert(full.phase === PHASE.BATTLE, 'entered battle');
assert(full.battle.aaHits === 0, 'max AA miss so planes survive');
assert(full.battle.step === BATTLE_STEP.COMBAT_RESULT, 'mid-fight');
assert(full.battle.attackHits >= 1, 'scripted attack hits');
assert(full.battle.defenseHits >= 1, 'scripted defense hits');
assert(lossesReady(full) === false, 'optional losses not auto-picked');
assert(confirmLabel(full) === 'Assign casualties', 'assign hint');
const card = battleCard(full);
assert(card.pickers?.length >= 1, 'casualty optionality');
const types = new Set((card.pickers || []).flatMap((p) => (p.units || []).map((u) => u.type)));
assert(types.size >= 3, 'picker has mixed types');

pickLoss(full, 'att', 'infantry');
pickLoss(full, 'att', 'armour');
pickLoss(full, 'att', 'artillery');
pickLoss(full, 'def', 'infantry');
pickLoss(full, 'def', 'infantry');
pickLoss(full, 'def', 'armour');
pickLoss(full, 'def', 'artillery');
pickLoss(full, 'def', 'fighter');
pickLoss(full, 'def', 'bomber');
assert(full.battle.pendingDef.infantry === 2, 'can stack two INF hits');
assert(lossesReady(full) === true, 'assigned mixed casualties');

const air = createScenario({ id: 'max-both-sides' });
driveAirChoice(air);
assert(air.phase === PHASE.AIR_LAND, 'air land after take');
assert(confirmLabel(air) === 'Confirm land', 'planes-only Confirm land');
const planes = airLandRoster(air);
assert(planes.length >= 1, 'air roster present');
assert(planes.every((p) => p.type === 'fighter' || p.type === 'bomber'), 'roster is planes only');
assert(!planes.some((p) => p.type === 'infantry' || p.type === 'armour' || p.type === 'artillery' || p.type === 'aaGun'), 'no land/AA on land sheet');
assert(planes.some((p) => p.type === 'fighter'), 'fighters to land');
assert(planes.some((p) => p.type === 'bomber'), 'bombers to land');
assert(confirmGold(air) === false, 'land idle until dest');

tapLand(air, 'East Europe');
assert(air.landingDest == null, 'enemy dest not landable');
tapLand(air, 'Russia');
assert(air.landingDest === 'Russia', 'russia landable');
assert(confirmLabel(air) === 'Confirm: Land in Russia', 'named land');
const ftr = planes.find((p) => p.type === 'fighter').quantity;
const bmb = planes.find((p) => p.type === 'bomber').quantity;
confirm(air);
assert(air.phase === PHASE.DONE, 'landed');
assert(stackQty(air.placements.Russia, 'fighter', 'Russians') === ftr, 'fighters in Russia');
assert(stackQty(air.placements.Russia, 'bomber', 'Russians') === bmb, 'bombers in Russia');
assert(stackQty(air.placements['Ukraine S.S.R.'], 'fighter', 'Russians') === 0, 'no planes left on dest');
assert(inspectPlay(air).attacker, 'inspect reports attacker');

const done = createScenario({ id: 'max-both-sides' });
driveLanded(done, 'Russia');
assert(done.phase === PHASE.DONE, 'drive landed max');
resetScenario(done);
assert(done.id === 'max-both-sides', 'replay keeps max');
assert(stackQty(done.placements['Karelia S.S.R.'], 'infantry') === MAX_ATTACKER.infantry, 'max pocket restored');
assert(done.dest === 'Ukraine S.S.R.', 'replay dest ukraine');

if (failures) {
  console.error(`${failures} ux-preview max demo checks failed`);
  process.exit(1);
}
console.log('ux-preview max both-sides combat stress checks passed');
