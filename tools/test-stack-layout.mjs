import { readFileSync } from 'fs';
import {
  planBoardStack,
  neighborDistanceMap,
  territoryFootprint,
  denseFootprint,
  crowdMaxTypeStacks,
  JAPAN_HOME_CENTER,
} from '../src/map/threeMapDensity.js';
import { territoryCenter, collectStackCenters, lodBandFromZoom } from '../src/map/uxPreviewUnits.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const territories = JSON.parse(readFileSync(new URL('../data/territories.json', import.meta.url), 'utf8'));
const setup = JSON.parse(readFileSync(new URL('../data/setup.json', import.meta.url), 'utf8'));
const placements = structuredClone(setup.classic.unitPlacements);

function circlesOverlap(a, b) {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return d < a.r + b.r - 0.5;
}

function plansAt({ zoom, cssWidth = 390, stacksExpanded = false, selectedName = null }) {
  const band = lodBandFromZoom(zoom);
  const entries = collectStackCenters(territories, placements);
  const neighbors = neighborDistanceMap(entries);
  return entries.map((entry) => {
    const footprint = territoryFootprint(entry.t);
    const plan = planBoardStack({
      stacks: entry.stacks,
      footprint,
      name: entry.name,
      zoom,
      band,
      stacksExpanded,
      selected: entry.name === selectedName,
      neighborDist: neighbors.get(entry.name) || 240,
      cssWidth,
    });
    return { entry, plan, footprint };
  });
}

function boxes(rows) {
  return rows.map(({ entry, plan }) => ({
    name: entry.name,
    x: entry.center.x,
    y: entry.center.y,
    r: plan.radius,
    mode: plan.mode,
  }));
}

function assertNoOverlap(rows, label) {
  const cs = boxes(rows);
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      assert(
        !circlesOverlap(cs[i], cs[j]),
        `${label}: ${cs[i].name} overlaps ${cs[j].name} (d=${Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y).toFixed(1)} r=${cs[i].r.toFixed(1)}+${cs[j].r.toFixed(1)})`,
      );
    }
  }
}

const ZOOM_MID_390 = 0.422;
const ZOOM_OUT = 0.22;
const ZOOM_IN = 1.15;

for (const zoom of [ZOOM_OUT, ZOOM_MID_390, 0.70, ZOOM_IN]) {
  const rows = plansAt({ zoom, cssWidth: 390, stacksExpanded: false });
  assertNoOverlap(rows, `idle z=${zoom}`);
  const japan = rows.find((r) => r.entry.name === 'Japan');
  assert(japan.plan.mode === 'pip', `Japan idle z=${zoom} is pip`);
}

const japanCrowd = crowdMaxTypeStacks('Japanese');
assert(japanCrowd.length >= 8, 'max-type roster');
placements.Japan = japanCrowd;

const crowdedMid = plansAt({ zoom: ZOOM_MID_390, cssWidth: 390, stacksExpanded: true, selectedName: 'Japan' });
const japanMid = crowdedMid.find((r) => r.entry.name === 'Japan');
assert(japanMid.plan.mode === 'pip', `crowded Japan mid expand stays pip (${japanMid.plan.reason})`);
assertNoOverlap(crowdedMid, 'crowded Japan mid + expand');

const ukMid = crowdedMid.find((r) => r.entry.name === 'United Kingdom');
assert(ukMid.plan.mode === 'pip', 'UK mid expand stays pip');

const germanyIdle = plansAt({ zoom: ZOOM_MID_390, cssWidth: 390 }).find((r) => r.entry.name === 'Germany');
assert(germanyIdle.plan.mode === 'pip', 'Germany mid idle pip');
assert(germanyIdle.plan.piecePx <= 30, `Germany pip capped on phone (${germanyIdle.plan.piecePx})`);

const expandedMid = plansAt({ zoom: ZOOM_MID_390, cssWidth: 390, stacksExpanded: true });
assertNoOverlap(expandedMid, 'global expand mid 390');
for (const row of expandedMid) {
  const fp = denseFootprint(row.entry.name, row.footprint);
  assert(row.plan.radius * 2 <= fp.min + 8, `${row.entry.name} cluster wider than land (${row.plan.radius} vs ${fp.min})`);
}

const nearExpand = plansAt({ zoom: ZOOM_IN, cssWidth: 390, stacksExpanded: true, selectedName: 'Germany' });
assertNoOverlap(nearExpand, 'near expand 390');
const germanyNear = nearExpand.find((r) => r.entry.name === 'Germany');
assert(germanyNear.plan.mode === 'cluster' || germanyNear.plan.mode === 'pip', 'Germany near has a plan');
if (germanyNear.plan.mode === 'cluster') {
  assert(germanyNear.plan.shown.length <= 3, 'Germany cluster typed cap');
}

const japanNear = plansAt({ zoom: 1.4, cssWidth: 390, stacksExpanded: true, selectedName: 'Japan' })
  .find((r) => r.entry.name === 'Japan');
assert(japanNear.plan.radius * 2 <= denseFootprint('Japan', japanNear.footprint).min + 4, 'Japan near cluster in footprint');

const chromeH = plansAt({ zoom: ZOOM_MID_390, cssWidth: 390, stacksExpanded: false });
assertNoOverlap(chromeH, '390 chrome width');

const japanCenter = territoryCenter(territories.find((t) => t.name === 'Japan'));
assert(Math.abs(japanCenter.x - JAPAN_HOME_CENTER.x) < 1, 'Japan home pin');

console.log('stack layout: no-overlap at out/mid/in + Japan crowd + 390 chrome');
