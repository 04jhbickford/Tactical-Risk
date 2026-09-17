// Preview unit chits from cream molded A&A atlases.
// Faction = rim tint only. Cream face stays. No UI glyph icons.

import * as THREE from 'three';

export const CHIT_FACE = '#F0E6D2';
export const CHIT_SIDE = '#D4C4A8';
export const CHIT_INK = '#2C2820';

export const UNIT_ATLAS = {
  land: 'assets/three/units/units-land-air-cream.png',
  naval: 'assets/three/units/units-naval-cream.png',
};

// 2×2 cells. Land: INF TNK / FTR BMB. Naval: BB CV / SS TR.
export const ATLAS_CELL = {
  infantry: { atlas: 'land', col: 0, row: 0 },
  armour: { atlas: 'land', col: 1, row: 0 },
  fighter: { atlas: 'land', col: 0, row: 1 },
  tacticalBomber: { atlas: 'land', col: 0, row: 1 },
  bomber: { atlas: 'land', col: 1, row: 1 },
  battleship: { atlas: 'naval', col: 0, row: 0 },
  destroyer: { atlas: 'naval', col: 0, row: 0 },
  cruiser: { atlas: 'naval', col: 0, row: 0 },
  carrier: { atlas: 'naval', col: 1, row: 0 },
  submarine: { atlas: 'naval', col: 0, row: 1 },
  transport: { atlas: 'naval', col: 1, row: 1 },
};

const atlases = { land: null, naval: null };

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadUnitAtlases() {
  if (atlases.land && atlases.naval) return atlases;
  const [land, naval] = await Promise.all([
    loadImage(UNIT_ATLAS.land),
    loadImage(UNIT_ATLAS.naval),
  ]);
  atlases.land = land;
  atlases.naval = naval;
  return atlases;
}

export function atlasCellFor(type) {
  return ATLAS_CELL[type] || null;
}

function drawRimDisc(ctx, cx, cy, r, ownerColor) {
  ctx.fillStyle = 'rgba(42, 34, 24, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.12, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ownerColor || '#5A5A52';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCreamFace(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#F6EEDC');
  g.addColorStop(0.72, CHIT_FACE);
  g.addColorStop(1, CHIT_SIDE);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawAtlasFace(ctx, type, cx, cy, r) {
  const cell = atlasCellFor(type);
  const img = cell ? atlases[cell.atlas] : null;
  if (!cell || !img) {
    drawCreamFace(ctx, cx, cy, r);
    return;
  }
  const sw = img.width / 2;
  const sh = img.height / 2;
  const sx = cell.col * sw;
  const sy = cell.row * sh;
  const d = r * 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, cx - r, cy - r, d, d);
  ctx.restore();
}

function drawQty(ctx, w, h, r, ownerColor, quantity) {
  if (!(quantity > 1)) return;
  const bx = w * 0.78;
  const by = h * 0.78;
  const br = r * 0.22;
  ctx.fillStyle = ownerColor || '#5A5A52';
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHIT_FACE;
  ctx.beginPath();
  ctx.arc(bx, by, br * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHIT_INK;
  ctx.font = `700 ${Math.round(h * 0.14)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(quantity), bx, by + 1);
}

export function paintChit(ctx, { type, ownerColor, quantity, w = 192, h = 192 } = {}) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  ctx.clearRect(0, 0, w, h);
  drawRimDisc(ctx, cx, cy, r, ownerColor);
  drawAtlasFace(ctx, type, cx, cy, r * 0.86);
  drawQty(ctx, w, h, r, ownerColor, quantity);
}

export function paintPip(ctx, { ownerColor, total, size = 128 } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;
  ctx.clearRect(0, 0, size, size);
  drawRimDisc(ctx, cx, cy, r, ownerColor);
  drawCreamFace(ctx, cx, cy, r * 0.78);
  ctx.fillStyle = CHIT_INK;
  ctx.font = `700 ${Math.round(size * 0.36)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy + 1);
}

export function makeChitTexture(type, ownerColor, quantity) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  paintChit(canvas.getContext('2d'), { type, ownerColor, quantity });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makePipTexture(ownerColor, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  paintPip(canvas.getContext('2d'), { ownerColor, total });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
