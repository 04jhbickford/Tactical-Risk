// Partial air land: planes by type/count + dest. Run:
// node tools/test-ux-preview-air-land.mjs

import {
  PHASE,
  createScenario,
  tapLand,
  adjustLanding,
  confirm,
  confirmLabel,
  confirmEnabled,
  airLandRoster,
  driveAirChoice,
  stackQty,
} from '../src/map/uxPreviewScenario.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

const air = createScenario({ max: true });
driveAirChoice(air);
assert(air.phase === PHASE.AIR_LAND, 'air land after take');
const roster = airLandRoster(air);
assert(roster.every((u) => u.type === 'fighter' || u.type === 'bomber'), 'planes only');
assert(!roster.some((u) => u.type === 'infantry' || u.type === 'armour'), 'no dest roster');
assert((air.airLeft.fighter || 0) >= 2, 'enough FTR to split');
assert((air.airLeft.bomber || 0) >= 1, 'enough BMB to split');

const startFtr = air.airLeft.fighter;
const startBmb = air.airLeft.bomber;

tapLand(air, 'Russia');
assert(confirmEnabled(air) === false, 'dest without pick is idle');
adjustLanding(air, 'fighter', 1);
adjustLanding(air, 'fighter', 1);
assert(air.landingPick.fighter === 2, 'partial FTR 2');
assert(air.landingPick.bomber == null, 'BMB not in this drop');
assert(confirmLabel(air) === 'Confirm: Land in Russia', 'named Russia');
confirm(air);
assert(air.phase === PHASE.AIR_LAND, 'still air land — planes remain');
assert(stackQty(air.placements.Russia, 'fighter', 'Russians') === 2, '2 FTR in Russia');
assert(stackQty(air.placements.Russia, 'bomber', 'Russians') === 0, 'no BMB in Russia yet');
assert(air.airLeft.fighter === startFtr - 2, 'FTR remaining');
assert(air.airLeft.bomber === startBmb, 'BMB still aloft');

tapLand(air, 'Karelia S.S.R.');
adjustLanding(air, 'bomber', 1);
assert(air.landingPick.bomber === 1, '1 BMB to Karelia');
confirm(air);
assert(stackQty(air.placements['Karelia S.S.R.'], 'bomber', 'Russians') === 1, 'BMB landed Karelia');
assert(stackQty(air.placements.Russia, 'bomber', 'Russians') === 0, 'BMB not dumped to Russia');

if (failures) {
  console.error(`${failures} ux-preview air-land split checks failed`);
  process.exit(1);
}
console.log('ux-preview partial air-land dest split checks passed');
