import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lodBandFromZoom,
  shouldExpandPreview,
  previewTypeLayout,
  previewChitWorldSize,
  chitGridPack,
  maxTokenOverlap,
  layoutPreviewTerritory,
  layoutAllPreviewStacks,
  overlapReport,
  stressStacks,
  STRESS_LAND_TYPES,
  PREVIEW_CHIT_GAP,
  PREVIEW_WORLD_CAP_FAR,
} from '../src/map/uxPreviewUnits.js';
import { showMinis, territoryFootprint } from '../src/map/threeMapDensity.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const territories = JSON.parse(readFileSync(join(root, 'data/territories.json'), 'utf8'));
const setup = JSON.parse(readFileSync(join(root, 'data/setup.json'), 'utf8'));
const placements = setup.classic.unitPlacements;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function byName(name) {
  return territories.find((t) => t.name === name);
}

assert(lodBandFromZoom(0.2) === 'far', 'far');
assert(lodBandFromZoom(0.35) === 'far', '390 Fit Europe is far');
assert(lodBandFromZoom(0.55) === 'mid', 'mid');
assert(lodBandFromZoom(1.2) === 'near', 'near');
assert(showMinis('mid', false) === false, 'mid idle collapse');
assert(showMinis('mid', true) === true, 'mid select expand');
assert(shouldExpandPreview('far', false, true) === false, 'far never global-expands');
assert(shouldExpandPreview('mid', false, true) === true, 'mid toggle expands');
assert(shouldExpandPreview('mid', true, false) === true, 'mid select expands');
assert(shouldExpandPreview('near', false, false) === true, 'near expands');

const pack2 = chitGridPack(2, 20);
assert(Math.abs(pack2[1].x - pack2[0].x) >= 19.9, '2-pack full pitch');
const pack4 = chitGridPack(4, 20);
const d04 = Math.hypot(pack4[0].x - pack4[3].x, pack4[0].y - pack4[3].y);
assert(d04 >= 20, '4-pack diagonal at least pitch');

const japan = byName('Japan');
const germany = byName('Germany');
const zooms = [0.22, 0.35, 0.55, 0.90, 1.15, 2.0];

for (const zoom of zooms) {
  const idle = layoutAllPreviewStacks({
    territories,
    placements,
    zoom,
    selectedName: null,
    stacksExpanded: false,
  });
  const idleRep = overlapReport(idle);
  assert(idleRep.inner <= 0.05, `idle inner overlap @${zoom}: ${idleRep.inner}`);
  assert(idleRep.foreign <= 0.05, `idle foreign overlap @${zoom}: ${idleRep.foreign}`);

  const japanSel = layoutPreviewTerritory({
    territory: japan,
    stacks: placements.Japan,
    zoom,
    selected: true,
  });
  assert(japanSel.overlap <= 0.05, `Japan selected overlap @${zoom}: ${japanSel.overlap}`);
  assert(japanSel.size <= 36, `Japan piece capped @${zoom}: ${japanSel.size}`);

  const maxJapan = layoutPreviewTerritory({
    territory: japan,
    stacks: stressStacks('Japanese'),
    zoom,
    selected: true,
  });
  assert(maxJapan.tokens.length <= 3, `Japan max types token cap @${zoom}: ${maxJapan.tokens.length}`);
  assert(maxJapan.overlap <= 0.05, `Japan max-type overlap @${zoom}: ${maxJapan.overlap}`);
  assert(maxJapan.tokens.some((t) => t.kind === 'overflow'), 'Japan max types use +K');

  const maxGer = layoutPreviewTerritory({
    territory: germany,
    stacks: stressStacks('Germans'),
    zoom,
    selected: true,
  });
  assert(maxGer.tokens.length <= 4, `Germany max types token cap @${zoom}`);
  assert(maxGer.overlap <= 0.05, `Germany max-type overlap @${zoom}: ${maxGer.overlap}`);
}

const farPip = previewChitWorldSize({
  zoom: 0.35,
  footprint: territoryFootprint(germany),
  name: 'Germany',
  tokenCount: 1,
  expand: false,
});
assert(farPip <= PREVIEW_WORLD_CAP_FAR, `Fit pip must not blob continents: ${farPip}`);
assert(farPip >= 11, `Fit pip still tappable: ${farPip}`);

const layout = previewTypeLayout(stressStacks('Japanese'), {
  name: 'Japan',
  footprint: territoryFootprint(japan),
  expand: true,
});
assert(layout.shown.length === 1, `Japan shows 1 type + overflow, got ${layout.shown.length}`);
assert(layout.overflowQty > 0, 'Japan overflow qty');
assert(STRESS_LAND_TYPES.length === 8, '8 land kinds in stress set');
assert(PREVIEW_CHIT_GAP === 4, 'gap');

const expandedMid = layoutAllPreviewStacks({
  territories,
  placements,
  zoom: 0.55,
  selectedName: 'Germany',
  stacksExpanded: true,
});
const expRep = overlapReport(expandedMid);
assert(expRep.clean, `expanded mid must stay clean: ${JSON.stringify(expRep)}`);

console.log('ux-preview no-overlap stack checks passed');
