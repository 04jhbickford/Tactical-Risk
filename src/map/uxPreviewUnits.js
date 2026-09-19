// Main-branch unit chits + STACK-LOD for the UX preview. Preview only.

import { getUnitIconPath } from '../utils/unitIcons.js';
import { UnitRenderer } from './unitRenderer.js';
import {
  showMinis,
  nearLayout,
  clusterPack,
  sortStacks,
  territoryFootprint,
  footprintPiecePx,
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

function drawCountBadge(ctx, x, y, text, zoom) {
  const fontSize = screenPx(zoom, 12);
  ctx.font = `700 ${fontSize}px -apple-system, "SF Pro Text", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padX = screenPx(zoom, 5);
  const h = fontSize + screenPx(zoom, 4);
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

export function renderPreviewStacks(ctx, {
  territories,
  placements,
  images,
  zoom,
  selectedName,
  stacksExpanded,
  factionColors,
}) {
  const band = lodBandFromZoom(zoom);
  for (const t of territories) {
    const stacks = placements[t.name];
    if (!stacks?.length) continue;
    const center = territoryCenter(t);
    if (!center) continue;
    const selected = t.name === selectedName;
    const expand = stacksExpanded || showMinis(band, selected);
    const owner = stackOwner(stacks, t);
    const color = factionColors?.get(owner) || FACTION_FALLBACK[owner] || '#4A4A4A';
    const total = stackTotal(stacks);
    const footprint = territoryFootprint(t);
    if (!expand) {
      const pip = screenPx(zoom, footprintPiecePx(footprint, band, false, 1, t.name));
      const img = images?.[owner]?.[sortStacks(stacks)[0]?.type];
      drawChit(ctx, img, center.x, center.y, pip, color);
      drawCountBadge(ctx, center.x + pip * 0.42, center.y + pip * 0.42, String(total), zoom);
      continue;
    }
    const layout = nearLayout(stacks);
    const n = layout.shown.length + (layout.overflowQty > 0 ? 1 : 0);
    const piece = screenPx(zoom, footprintPiecePx(footprint, band, true, layout.shown.length, t.name));
    const pitch = piece * 0.72;
    const pts = clusterPack(n, pitch);
    layout.shown.forEach((stack, i) => {
      const pt = pts[i] || { x: 0, z: 0 };
      const img = images?.[stack.owner || owner]?.[stack.type];
      const px = center.x + pt.x;
      const py = center.y + pt.z;
      drawChit(ctx, img, px, py, piece, factionColors?.get(stack.owner || owner) || color);
      drawCountBadge(ctx, px + piece * 0.38, py + piece * 0.38, String(stack.quantity), zoom);
    });
    if (layout.overflowQty > 0) {
      const pt = pts[layout.shown.length] || { x: piece * 0.7, z: 0 };
      drawCountBadge(ctx, center.x + pt.x, center.y + pt.z, `+${layout.overflowQty}`, zoom);
    }
  }
}

export function hitTestPreviewStack(worldX, worldY, { territories, placements, zoom, selectedName, stacksExpanded }) {
  const band = lodBandFromZoom(zoom);
  const radius = screenPx(zoom, 36);
  let best = null;
  let bestD = radius;
  for (const t of territories) {
    const stacks = placements[t.name];
    if (!stacks?.length) continue;
    const center = territoryCenter(t);
    if (!center) continue;
    const expand = stacksExpanded || showMinis(band, t.name === selectedName);
    const d = Math.hypot(worldX - center.x, worldY - center.y);
    const reach = expand ? radius * 1.8 : radius;
    if (d <= reach && d <= bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
