import { remainingAirLandingsToAssign } from '../src/state/airLanding.js';
import {
  combatMoveCta,
  battlePrimaryCta,
  airLandingCta,
  stagedSummary,
  createPreviewFlow,
  DEMO,
  FLOW_COMBAT_MOVE,
} from '../src/map/uxPreviewFlows.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(combatMoveCta({ destName: '' }).label === 'Select a destination', 'idle dest');
assert(combatMoveCta({ destName: 'Karelia S.S.R.', staged: {} }).disabled === true, 'attack waits for units');
assert(combatMoveCta({ destName: 'Karelia S.S.R.', staged: {} }).label === 'Attack Karelia S.S.R.', 'named attack');
assert(combatMoveCta({ destName: 'Karelia S.S.R.', staged: { infantry: 2 } }).disabled === false, 'attack ready');
assert(combatMoveCta({ destName: 'Ukraine S.S.R.', staged: { infantry: 1 }, confirmed: true }).label === 'End Combat Movement →', 'end phase');

assert(battlePrimaryCta('aaFire').label === 'Fire AA Guns', 'aa');
assert(battlePrimaryCta('aaResults').label === 'Continue', 'aa continue');
assert(battlePrimaryCta('ready').label === 'Roll Dice', 'roll');
assert(battlePrimaryCta('selectCasualties', { canConfirmCasualties: false }).disabled === true, 'cas locked');
assert(battlePrimaryCta('selectCasualties', { canConfirmCasualties: true }).label === 'Confirm Casualties', 'cas');
assert(battlePrimaryCta('resolved').label === 'End Battle', 'end battle');

assert(airLandingCta(1).label === 'Confirm All Landings', 'air busy');
assert(airLandingCta(1).disabled === true, 'air busy disabled');
assert(airLandingCta(0).label === 'Done →', 'air done');
assert(airLandingCta(0).disabled === false, 'air done enabled');
assert(remainingAirLandingsToAssign([{ type: 'fighter', id: 'fighter_0', landingOptions: ['Germany'] }], {}) === 1, 'remaining SoT');
assert(remainingAirLandingsToAssign([{ type: 'fighter', id: 'fighter_0', landingOptions: ['Germany'], destination: 'Germany' }], { fighter_0: 'Germany' }) === 0, 'remaining 0');

assert(stagedSummary({ infantry: 2, armour: 1 }) === 'INF×2 TNK×1', 'summary');

const placements = {
  'Ukraine S.S.R.': [
    { type: 'armour', quantity: 2, owner: 'Germans' },
    { type: 'infantry', quantity: 3, owner: 'Germans' },
    { type: 'fighter', quantity: 1, owner: 'Germans' },
  ],
  'Karelia S.S.R.': [
    { type: 'infantry', quantity: 3, owner: 'Russians' },
    { type: 'aaGun', quantity: 1, owner: 'Russians' },
  ],
  Germany: [],
  'Eastern Europe': [],
};
const flow = createPreviewFlow({
  placements,
  owners: { 'Ukraine S.S.R.': 'Germans', 'Karelia S.S.R.': 'Russians' },
  mode: FLOW_COMBAT_MOVE,
});

flow.tapLand('Karelia S.S.R.');
flow.tapUnit('infantry');
flow.tapUnit('infantry');
flow.tapUnit('fighter');
let snap = flow.snapshot();
assert(snap.dest === 'Karelia S.S.R.', 'dest');
assert(snap.staged.infantry === 2, 'staged inf');
assert(snap.confirmLabel === 'Attack Karelia S.S.R.', 'cta mid-flow');
assert(snap.confirmDisabled === false, 'cta ready');

flow.confirm();
snap = flow.snapshot();
assert(snap.mode === 'battle', 'enter battle');
assert(snap.battlePhase === 'aaFire', 'aa first because fighter');
assert(snap.battleStep === 'odds', 'odds chip');

flow.confirm(); // AA results
flow.confirm(); // ready
flow.confirm(); // select cas
assert(flow.snapshot().battlePhase === 'selectCasualties', 'cas phase');
assert(flow.currentCta().disabled === true, 'cas not assigned');
flow.flowAction('assign-att');
flow.flowAction('assign-def');
assert(flow.currentCta().disabled === false, 'cas ready');
flow.confirm();
assert(flow.snapshot().battlePhase === 'resolved', 'resolved');
flow.confirm();
snap = flow.snapshot();
assert(snap.mode === 'airLanding', 'air after battle');
assert(snap.airRemaining === 1, 'one AF');
assert(snap.confirmLabel === 'Confirm All Landings', 'air confirm locked');
flow.tapLand('Germany');
snap = flow.snapshot();
assert(snap.airRemaining === 0, 'named dest');
assert(snap.confirmLabel === 'Done →', 'Done at 0 remaining');
flow.confirm();
snap = flow.snapshot();
assert(snap.done === true, 'flow complete');
assert(snap.mode === 'combatMove', 'back to move');
assert((placements.Germany || []).some((s) => s.type === 'fighter'), 'fighter landed');
assert(DEMO.source === 'Ukraine S.S.R.', 'demo source');

console.log('ux-preview combat/battle/air flow checks passed');
