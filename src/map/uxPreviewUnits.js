// Main-branch unit chits + STACK-LOD for the UX preview. Preview only.

import { getUnitIconPath } from '../utils/unitIcons.js';
import { UnitRenderer } from './unitRenderer.js';
import {
  planBoardStack,
  neighborDistanceMap,
  territoryFootprint,
  JAPAN_HOME_CENTER,
} from './threeMapDensity.js';

const FACTION_FALLBACK = {
  Russians: '#B22222',
  Germans: '#4A4A4A',
  British: '#B8860B',
  Japanese: '#FF8C00',
  Americans: '#556B2F',
};

export function lodBandFromZoom(zoom) {
  const z = Number(zoom) || 0;
  if (z < 0.38) return 'far';
  if (z < 0.90) return 'mid';
  return 'near';
}

export function stackTotal(stacks) {
  return (stacks || []).reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

export function stackOwner(stacks, territory) {
  return stacks?.[0]?.owner || territory?.originalOwner || 'Russians';
}

export function preloadUnitImages(unitDefs, factionIds) {
  const images = {};
  const types = Object.keys(unitDefs || {});
  const factions = factionIds?.length
    ? factionIds
    : ['Americans', 'Germans', 'British', 'Japanese', 'Russians'];
  const pending = [];
  for (const factionId of factions) {
    images[factionId] = {};
    for (const unitType of types) {
      const path = getUnitIconPath(unitType, factionId);
      if (!path) continue;
      const img = new Image();
      pending.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
      img.src = path;
      images[factionId][unitType] = img;
    }
  }
  return { images, ready: Promise.all(pending) };
}

function polygonCentroid(poly) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  area = Math.abs(area) / 2;
  if (area === 0) return { cx: 0, cy: 0, area: 0 };
  const factor = 1 / (6 * area);
  return { cx: Math.abs(cx * factor), cy: Math.abs(cy * factor), area };
}

export function territoryCenter(territory) {
  if (territory?.name === 'Japan' && !territory.isWater) {
    return { x: JAPAN_HOME_CENTER.x, y: JAPAN_HOME_CENTER.y };
  }
  const polygons = territory?.polygons || [];
  if (!polygons.length) {
    const c = territory?.center;
    return c ? { x: c[0], y: c[1] } : null;
  }
  if (territory.isWater) {
    const manual = UnitRenderer.SEA_ZONE_CENTERS?.[territory.name];
    if (manual) return { x: manual.x, y: manual.y };
    let best = null;
    for (const poly of polygons) {
      if (!poly || poly.length < 3) continue;
      const next = polygonCentroid(poly);
      if (!best || next.area > best.area) best = next;
    }
    return best ? { x: best.cx, y: best.cy } : null;
  }
  let total = 0;
  let sx = 0;
  let sy = 0;
  for (const poly of polygons) {
    if (!poly || poly.length < 3) continue;
    const { cx, cy, area } = polygonCentroid(poly);
    if (area > 0) {
      sx += cx * area;
      sy += cy * area;
      total += area;
    }
  }
  if (!total) return null;
  let x = sx / total;
  let y = sy / total;
  const off = UnitRenderer.TERRITORY_CENTER_OFFSETS?.[territory.name];
  if (off) {
    x += off.x;
    y += off.y;
  }
  return { x, y };
}

function screenPx(zoom, px) {
  return Math.max(0.5, px / Math.max(0.12, zoom));
}

function drawCountBadge(ctx, x, y, text, zoom, piecePx = 24) {
  const fontPx = Math.max(8, Math.min(11, piecePx * 0.40));
  const fontSize = screenPx(zoom, fontPx);
  ctx.font = `700 ${fontSize}px -apple-system, "SF Pro Text", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padX = screenPx(zoom, Math.max(3, fontPx * 0.35));
  const h = fontSize + screenPx(zoom, 3);
  const w = Math.max(h, ctx.measureText(text).width + padX * 2);
  ctx.fillStyle = '#1A1610';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#F4EFE4';
  ctx.fillText(text, x, y);
}

function drawChit(ctx, img, x, y, size, ownerColor) {
  const pad = size * 0.08;
  ctx.save();
  ctx.fillStyle = ownerColor || '#4A4A4A';
  ctx.strokeStyle = 'rgba(20,16,10,0.88)';
  ctx.lineWidth = Math.max(1.2, size * 0.06);
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.16);
  ctx.fill();
  ctx.stroke();
  if (img?.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x - size / 2 + pad, y - size / 2 + pad, size - pad * 2, size - pad * 2);
  }
  ctx.restore();
}

export function collectStackCenters(territories, placements) {
  const centers = [];
  for (const t of territories) {
    const stacks = placements[t.name];
    if (!stacks?.length) continue;
    const center = territoryCenter(t);
    if (!center) continue;
    centers.push({ name: t.name, x: center.x, y: center.y, t, stacks, center });
  }
  return centers;
}

export function planForTerritory(entry, {
  zoom,
  selectedName,
  stacksExpanded,
  neighbors,
  cssWidth = 390,
  footprint,
}) {
  const band = lodBandFromZoom(zoom);
  return planBoardStack({
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
}

export function renderPreviewStacks(ctx, {
  territories,
  placements,
  images,
  zoom,
  selectedName,
  stacksExpanded,
  factionColors,
  cssWidth = 390,
  footprints,
}) {
  const entries = collectStackCenters(territories, placements);
  const neighbors = neighborDistanceMap(entries);
  for (const entry of entries) {
    const { t, stacks, center } = entry;
    const footprint = footprints?.get(t.name) || territoryFootprint(t);
    const plan = planForTerritory(entry, {
      zoom, selectedName, stacksExpanded, neighbors, cssWidth, footprint,
    });
    const owner = stackOwner(stacks, t);
    const color = factionColors?.get(owner) || FACTION_FALLBACK[owner] || '#4A4A4A';
    const piece = plan.pieceWorld;
    if (plan.mode !== 'cluster') {
      const img = images?.[owner]?.[plan.shown[0]?.type];
      drawChit(ctx, img, center.x, center.y, piece, color);
      drawCountBadge(
        ctx,
        center.x + piece * 0.36,
        center.y + piece * 0.36,
        String(stackTotal(stacks)),
        zoom,
        plan.piecePx,
      );
      continue;
    }
    plan.shown.forEach((stack, i) => {
      const pt = plan.pts[i] || { x: 0, z: 0 };
      const img = images?.[stack.owner || owner]?.[stack.type];
      const px = center.x + pt.x;
      const py = center.y + pt.z;
      drawChit(ctx, img, px, py, piece, factionColors?.get(stack.owner || owner) || color);
      drawCountBadge(
        ctx,
        px + piece * 0.34,
        py + piece * 0.34,
        String(stack.quantity),
        zoom,
        plan.piecePx,
      );
    });
    if (plan.overflowQty > 0) {
      const pt = plan.pts[plan.shown.length] || { x: piece * 0.7, z: 0 };
      drawCountBadge(ctx, center.x + pt.x, center.y + pt.z, `+${plan.overflowQty}`, zoom, plan.piecePx);
    }
  }
}

export function hitTestPreviewStack(worldX, worldY, {
  territories,
  placements,
  zoom,
  selectedName,
  stacksExpanded,
  cssWidth = 390,
}) {
  const entries = collectStackCenters(territories, placements);
  const neighbors = neighborDistanceMap(entries);
  let best = null;
  let bestD = Infinity;
  for (const entry of entries) {
    const plan = planForTerritory(entry, {
      zoom,
      selectedName,
      stacksExpanded,
      neighbors,
      cssWidth,
      footprint: territoryFootprint(entry.t),
    });
    const d = Math.hypot(worldX - entry.center.x, worldY - entry.center.y);
    const reach = plan.radius || plan.pieceWorld * 0.7;
    if (d <= reach && d <= bestD) {
      bestD = d;
      best = entry.t;
    }
  }
  return best;
}
