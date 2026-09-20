// V2.81.56: land conquer flips owner; NCM into newly owned hex; fighters
// persist; combat turnEvents never carry undefined (Firestore hiccup).
// Run: node tools/test-territory-capture.mjs

import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
}

function makeEl() {
  const classSet = new Set();
  const el = {
    id: '',
    className: '',
    innerHTML: '',
    style: {},
    children: [],
    classList: {
      add(...names) { names.forEach((n) => classSet.add(n)); },
      remove(...names) { names.forEach((n) => classSet.delete(n)); },
      contains(name) { return classSet.has(name); },
      toggle(name, force) {
        if (force) classSet.add(name);
        else classSet.delete(name);
      },
    },
    appendChild(child) { this.children.push(child); return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
  return el;
}

if (typeof globalThis.document === 'undefined') {
  const documentElement = makeEl();
  const body = makeEl();
  globalThis.document = {
    documentElement,
    body,
    createElement() { return makeEl(); },
    getElementById() { return null; },
  };
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const { GameState, GAME_PHASES, TURN_PHASES } =
  await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const {
  shouldCaptureOccupiedTerritory,
  unitCanCaptureLand,
} = await import(pathToFileURL(join(root, 'src/state/territoryCapture.js')));
const { stripUndefinedDeep, hasUndefinedDeep } =
  await import(pathToFileURL(join(root, 'src/state/persistState.js')));
const { CombatUI } =
  await import(pathToFileURL(join(root, 'src/ui/combatUI.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

const unitDefs = {
  infantry: { cost: 3, attack: 1, defense: 2, movement: 1, isLand: true },
  armour: { cost: 5, attack: 3, defense: 3, movement: 2, isLand: true },
  fighter: { cost: 10, attack: 3, defense: 4, movement: 4, isAir: true },
  aaGun: { cost: 5, attack: 0, defense: 0, movement: 1, isLand: true, antiAir: true },
  factory: { cost: 15, isBuilding: true },
};

function makeUSTheater() {
  const territories = [
    { name: 'West US', isWater: false, connections: ['East US', 'West Canada', 'Mexico'] },
    { name: 'East US', isWater: false, connections: ['West US', 'East Canada'] },
    { name: 'West Canada', isWater: false, connections: ['West US', 'East Canada'] },
    { name: 'East Canada', isWater: false, connections: ['East US', 'West Canada'] },
    { name: 'Mexico', isWater: false, connections: ['West US'] },
  ];
  const gs = new GameState({ risk: { factions: [] } }, territories, []);
  gs.players = [
    { id: 'Americans', name: 'Robert', oderId: 'robert', alliance: 'allies' },
    { id: 'Germans', name: 'Sean', oderId: 'sean', alliance: 'axis' },
  ];
  gs.currentPlayerIndex = 0;
  gs.phase = GAME_PHASES.PLAYING;
  gs.turnPhase = TURN_PHASES.COMBAT;
  gs.alliancesEnabled = true;
  gs.territoryState = {
    'West US': { owner: 'Americans' },
    'East US': { owner: 'Americans' },
    'West Canada': { owner: 'Germans' },
    'East Canada': { owner: 'Americans' },
    Mexico: { owner: 'Americans' },
  };
  gs.playerState = {
    Americans: { ipcs: 24, hasPlacedCapital: true, capitalTerritory: 'East US' },
    Germans: { ipcs: 12, hasPlacedCapital: true, capitalTerritory: 'West Europe' },
  };
  gs.friendlyTerritoriesAtTurnStart = new Set(['West US', 'East US', 'East Canada', 'Mexico']);
  gs.units = {
    'West US': [
      { type: 'infantry', quantity: 3, owner: 'Americans' },
      { type: 'fighter', quantity: 1, owner: 'Americans' },
    ],
    'East US': [{ type: 'infantry', quantity: 1, owner: 'Americans' }],
    'West Canada': [{ type: 'infantry', quantity: 1, owner: 'Germans' }],
  };
  gs.pendingPurchases = [{ type: 'fighter', quantity: 1, owner: 'Americans', cost: 10 }];
  return gs;
}

console.log('=== Version ===');
check('GAME_VERSION is V2.81.56', GAME_VERSION === 'V2.81.56');
check('SCHEMA_VERSION stays 11', SCHEMA_VERSION === 11);

console.log('=== Pure capture predicates ===');
check('infantry can capture', unitCanCaptureLand({ type: 'infantry', quantity: 1 }, unitDefs));
check('fighter cannot capture', !unitCanCaptureLand({ type: 'fighter', quantity: 1 }, unitDefs));
check('AA cannot capture', !unitCanCaptureLand({ type: 'aaGun', quantity: 1 }, unitDefs));
check('occupied enemy land with infantry captures', shouldCaptureOccupiedTerritory({
  territoryName: 'West Canada',
  currentOwner: 'Germans',
  playerId: 'Americans',
  units: [
    { type: 'infantry', owner: 'Americans', quantity: 1 },
    { type: 'fighter', owner: 'Americans', quantity: 1 },
  ],
  unitDefs,
}));
check('air-only occupier does not capture', !shouldCaptureOccupiedTerritory({
  territoryName: 'West Canada',
  currentOwner: 'Germans',
  playerId: 'Americans',
  units: [{ type: 'fighter', owner: 'Americans', quantity: 2 }],
  unitDefs,
}));
check('live enemy infantry still blocks', !shouldCaptureOccupiedTerritory({
  territoryName: 'West Canada',
  currentOwner: 'Germans',
  playerId: 'Americans',
  units: [
    { type: 'infantry', owner: 'Americans', quantity: 1 },
    { type: 'infantry', owner: 'Germans', quantity: 1 },
  ],
  unitDefs,
}));

console.log('=== GameState capture after a won land fight ===');
{
  const gs = makeUSTheater();
  gs.units['West Canada'] = [
    { type: 'infantry', quantity: 2, owner: 'Americans', moved: true },
    { type: 'fighter', quantity: 1, owner: 'Americans', moved: true },
  ];
  const result = gs.captureOccupiedTerritory('West Canada', { unitDefs, notify: false });
  check('capture reports success', result.captured === true);
  check('West Canada owner is Americans', gs.getOwner('West Canada') === 'Americans');
  check('fighter still on the hex after capture',
    (gs.units['West Canada'] || []).some((u) => u.type === 'fighter' && u.quantity === 1));
  check('pending fighter purchase still queued',
    gs.pendingPurchases.some((p) => p.type === 'fighter' && p.quantity === 1));
}

console.log('=== Dequeue of a won hex flips owner (V2.81.54 hole) ===');
{
  const gs = makeUSTheater();
  gs.units['West Canada'] = [
    { type: 'infantry', quantity: 1, owner: 'Americans', moved: true },
    { type: 'factory', quantity: 1, owner: 'Germans' },
  ];
  gs.combatQueue = ['West Canada'];
  const ui = new CombatUI();
  ui.setGameState(gs);
  ui.setUnitDefs(unitDefs);
  const result = ui.showNextCombat();
  check('won leftover is not re-opened', result.shown === false);
  check('queue emptied', gs.combatQueue.length === 0);
  check('dequeue captured West Canada', gs.getOwner('West Canada') === 'Americans');
  check('factory transferred',
    (gs.units['West Canada'] || []).some((u) => u.type === 'factory' && u.owner === 'Americans'));
}

console.log('=== NCM leftover infantry into newly owned West Canada ===');
{
  const gs = makeUSTheater();
  gs.units['West Canada'] = [
    { type: 'infantry', quantity: 1, owner: 'Americans', moved: true },
  ];
  gs.turnPhase = TURN_PHASES.NON_COMBAT_MOVE;
  gs.ensureOccupationOwners({ unitDefs, notify: false });
  check('ensureOccupationOwners flipped West Canada before NCM',
    gs.getOwner('West Canada') === 'Americans');
  const first = gs.moveUnits('West US', 'East US', [{ type: 'infantry', quantity: 2 }], unitDefs);
  check('partial NCM 2 infantry West US → East US', first.success === true);
  const leftover = (gs.units['West US'] || []).find((u) => u.type === 'infantry' && !u.moved);
  check('1 unmoved infantry remains in West US', leftover?.quantity === 1);
  const second = gs.moveUnits('West US', 'West Canada', [{ type: 'infantry', quantity: 1 }], unitDefs);
  check('remaining infantry can NCM into newly owned West Canada', second.success === true);
  check('West US fighter purchase / start stack still present',
    (gs.units['West US'] || []).some((u) => u.type === 'fighter' && u.quantity === 1)
    && gs.pendingPurchases.some((p) => p.type === 'fighter'));
}

console.log('=== Combat log / toJSON has no undefined (Firestore hiccup) ===');
{
  const gs = makeUSTheater();
  gs.logCombat({
    territory: 'West Canada',
    attacker: 'Robert',
    defender: 'Sean',
    winner: 'attacker',
    attackerSurvivors: 2,
  });
  const event = gs.turnEvents.find((e) => e.type === 'combat');
  check('logCombat omits missing losses instead of undefined',
    event && event.attackerLosses === undefined && !('attackerLosses' in event)
    && event.defenderLosses === undefined && !('defenderLosses' in event));
  check('outcome uses winner token, not player name', event.outcome === 'attacker');
  const json = gs.toJSON();
  check('toJSON has no undefined anywhere', hasUndefinedDeep(json) === false);
  const poisoned = { turnEvents: [{ type: 'combat', attackerLosses: undefined, extra: 1 }] };
  const cleaned = stripUndefinedDeep(poisoned);
  check('stripUndefinedDeep drops undefined keys',
    !('attackerLosses' in cleaned.turnEvents[0]) && cleaned.turnEvents[0].extra === 1);
}

console.log('=== Air-only win does not flip ===');
{
  const gs = makeUSTheater();
  gs.units['West Canada'] = [{ type: 'fighter', quantity: 1, owner: 'Americans', moved: true }];
  const result = gs.captureOccupiedTerritory('West Canada', { unitDefs, notify: false });
  check('air-only does not capture', result.captured === false);
  check('West Canada stays German', gs.getOwner('West Canada') === 'Germans');
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll territory-capture checks passed');
