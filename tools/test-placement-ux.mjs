// Unit checks for V2.59 initial-deploy naval-remainder UX.
// Run: node tools/test-placement-ux.mjs

import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GameState } = await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const { computeInitialPlacementUX } =
  await import(pathToFileURL(join(root, 'src/ui/playerPanel.js')));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

const unitDefs = {
  infantry: { isLand: true },
  factory: { isBuilding: true },
  fighter: { isAir: true },
  transport: { isSea: true },
  battleship: { isSea: true },
};

console.log('=== Version stamps ===');
check('GAME_VERSION is V2.64', GAME_VERSION === 'V2.64');
check('SCHEMA_VERSION stays 11', SCHEMA_VERSION === 11);

console.log('=== computeInitialPlacementUX: land selected, only naval remain, valid sea exists ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 0,
    limit: 6,
    totalRemaining: 6,
    landAirRemaining: 0,
    navalRemaining: 6,
    hasPlaceable: true,
    totalQueued: 0,
    selectedKind: 'owned-land',
  });
  check('Done hidden (ships still placeable at sea)', ux.showDone === false);
  check('sea-zone hint shown', ux.needSeaHint === true);
  check('not stuck', ux.stuckWithNaval === false);
  check('hint tells player to click a coastal sea zone',
    /sea zone/i.test(ux.hint) && /coastal/i.test(ux.hint));
}

console.log('=== computeInitialPlacementUX: invalid/random sea, only naval, valid drop exists ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 0,
    limit: 6,
    totalRemaining: 6,
    landAirRemaining: 0,
    navalRemaining: 6,
    hasPlaceable: true,
    totalQueued: 0,
    selectedKind: 'other',
  });
  check('Done still hidden', ux.showDone === false);
  check('same sea-zone hint', ux.needSeaHint === true);
}

console.log('=== computeInitialPlacementUX: valid sea selected, ships remain ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 0,
    limit: 6,
    totalRemaining: 6,
    landAirRemaining: 0,
    navalRemaining: 6,
    hasPlaceable: true,
    totalQueued: 0,
    selectedKind: 'valid-sea',
  });
  check('Done hidden — must place ships', ux.showDone === false);
  check('no redirect hint on a legal sea', ux.needSeaHint === false);
  check('no stuck message', ux.stuckWithNaval === false);
  check('no hint text', ux.hint === null);
}

console.log('=== computeInitialPlacementUX: landlocked / no legal naval drop ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 0,
    limit: 6,
    totalRemaining: 6,
    landAirRemaining: 0,
    navalRemaining: 6,
    hasPlaceable: false,
    totalQueued: 0,
    selectedKind: 'owned-land',
  });
  check('Done shown so the player is not hard-locked', ux.showDone === true);
  check('no "go click a sea" hint (there is none)', ux.needSeaHint === false);
  check('stuck flag set', ux.stuckWithNaval === true);
  check('hint explains there is no legal sea zone',
    /no legal sea zone/i.test(ux.hint));
}

console.log('=== computeInitialPlacementUX: mixed land+naval, land selected ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 0,
    limit: 6,
    totalRemaining: 12,
    landAirRemaining: 6,
    navalRemaining: 6,
    hasPlaceable: true,
    totalQueued: 0,
    selectedKind: 'owned-land',
  });
  check('Done hidden (land still to place)', ux.showDone === false);
  check('no naval-only hint while land remains', ux.needSeaHint === false);
}

console.log('=== computeInitialPlacementUX: round limit reached with ships left ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 6,
    limit: 6,
    totalRemaining: 2,
    landAirRemaining: 0,
    navalRemaining: 2,
    hasPlaceable: true,
    totalQueued: 0,
    selectedKind: 'owned-land',
  });
  check('Done shown after 6/6 this round', ux.showDone === true);
  check('no sea hint this round (limit hit)', ux.needSeaHint === false);
}

console.log('=== computeInitialPlacementUX: queued units block Done ===');
{
  const ux = computeInitialPlacementUX({
    placedThisRound: 6,
    limit: 6,
    totalRemaining: 0,
    landAirRemaining: 0,
    navalRemaining: 0,
    hasPlaceable: false,
    totalQueued: 2,
    selectedKind: 'valid-sea',
  });
  check('Done hidden while a deploy is queued', ux.showDone === false);
}

console.log('=== hasPlaceableUnits: landlocked vs coastal vs enemy-occupied sea ===');
{
  const territories = [
    { name: 'Inland', isWater: false, connections: ['AlsoInland'] },
    { name: 'AlsoInland', isWater: false, connections: ['Inland'] },
    { name: 'Coast', isWater: false, connections: ['OpenSea', 'EnemySea'] },
    { name: 'OpenSea', isWater: true, connections: ['Coast'] },
    { name: 'EnemySea', isWater: true, connections: ['Coast'] },
  ];
  const gs = new GameState({ risk: { factions: [] } }, territories, []);
  gs.players = [
    { id: 'landlocked', name: 'L' },
    { id: 'coastal', name: 'C' },
    { id: 'enemy', name: 'E' },
  ];
  gs.territoryState = {
    Inland: { owner: 'landlocked' },
    AlsoInland: { owner: 'landlocked' },
    Coast: { owner: 'coastal' },
  };
  gs.units = {
    EnemySea: [{ type: 'battleship', quantity: 1, owner: 'enemy' }],
  };
  gs.unitsToPlace = {
    landlocked: [{ type: 'transport', quantity: 6 }],
    coastal: [{ type: 'transport', quantity: 6 }],
  };

  check('landlocked + only ships → not placeable (Done-when-stuck)',
    gs.hasPlaceableUnits('landlocked', unitDefs) === false);
  check('coastal + empty adjacent sea + only ships → placeable (no Done-away)',
    gs.hasPlaceableUnits('coastal', unitDefs) === true);

  // Isolate the enemy-occupied-only coast: give coastal only EnemySea as water.
  gs.territories = [
    { name: 'Coast', isWater: false, connections: ['EnemySea'] },
    { name: 'EnemySea', isWater: true, connections: ['Coast'] },
  ];
  gs.territoryByName = {};
  for (const t of gs.territories) gs.territoryByName[t.name] = t;
  gs.territoryState = { Coast: { owner: 'coastal' } };
  check('coastal + only enemy-occupied sea + only ships → not placeable',
    gs.hasPlaceableUnits('coastal', unitDefs) === false);

  gs.unitsToPlace.coastal = [{ type: 'infantry', quantity: 1 }];
  check('land units remain placeable even with no legal sea',
    gs.hasPlaceableUnits('coastal', unitDefs) === true);
}

console.log(failures === 0 ? '\nALL PLACEMENT UX CHECKS PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
