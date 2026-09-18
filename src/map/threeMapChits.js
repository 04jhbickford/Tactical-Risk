// Cream plastic CHITS + faction rim. AA-PALETTE / SCORE P0.
// Mid = pip+N only (no type parade, no pedestal minis).
// Near = typed cream discs from the embossed chit atlas.
// NOT black Lucide stamps. NOT number-coins. NOT 3D pedestal minis.

import * as THREE from 'three';
import { PLASTIC, PALETTE } from './threeMapPalette.js';

const CREAM = PALETTE.cream || '#F0E6D2';

export const UNIT_ATLAS = {
  land: 'assets/three/units/units-land-plastic.png',
  naval: 'assets/three/units/units-naval-plastic.png',
  landAir: 'assets/three/units/units-land-air-cream.png',
  navalCream: 'assets/three/units/units-naval-cream.png',
};

export const ATLAS_CELL = {
  infantry: { atlas: 'land', col: 0, row: 0 },
  armour: { atlas: 'land', col: 1, row: 0 },
  artillery: { atlas: 'land', col: 2, row: 0 },
  fighter: { atlas: 'land', col: 3, row: 0 },
  tacticalBomber: { atlas: 'land', col: 0, row: 1 },
  bomber: { atlas: 'land', col: 0, row: 1 },
  aaGun: { atlas: 'land', col: 1, row: 1 },
  factory: { atlas: 'land', col: 2, row: 1 },
  battleship: { atlas: 'naval', col: 0, row: 0 },
  destroyer: { atlas: 'naval', col: 0, row: 0 },
  cruiser: { atlas: 'naval', col: 0, row: 0 },
  carrier: { atlas: 'naval', col: 1, row: 0 },
  submarine: { atlas: 'naval', col: 0, row: 1 },
  transport: { atlas: 'naval', col: 1, row: 1 },
};

export const CHIT_CELL = {
  infantry: { atlas: 'landAir', col: 0, row: 0, cols: 2 },
  armour: { atlas: 'landAir', col: 1, row: 0, cols: 2 },
  fighter: { atlas: 'landAir', col: 0, row: 1, cols: 2 },
  bomber: { atlas: 'landAir', col: 1, row: 1, cols: 2 },
  tacticalBomber: { atlas: 'landAir', col: 1, row: 1, cols: 2 },
  battleship: { atlas: 'navalCream', col: 0, row: 0, cols: 2 },
  destroyer: { atlas: 'navalCream', col: 0, row: 0, cols: 2 },
  cruiser: { atlas: 'navalCream', col: 0, row: 0, cols: 2 },
  carrier: { atlas: 'navalCream', col: 1, row: 0, cols: 2 },
  submarine: { atlas: 'navalCream', col: 0, row: 1, cols: 2 },
  transport: { atlas: 'navalCream', col: 1, row: 1, cols: 2 },
};

const atlases = { land: null, naval: null, landAir: null, navalCream: null };

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
  if (atlases.landAir && atlases.navalCream) return atlases;
  const [land, naval, landAir, navalCream] = await Promise.all([
    loadImage(UNIT_ATLAS.land),
    loadImage(UNIT_ATLAS.naval),
    loadImage(UNIT_ATLAS.landAir),
    loadImage(UNIT_ATLAS.navalCream),
  ]);
  atlases.land = land;
  atlases.naval = naval;
  atlases.landAir = landAir;
  atlases.navalCream = navalCream;
  return atlases;
}

export function atlasCellFor(type) {
  return ATLAS_CELL[type] || null;
}

export function plasticFor(owner) {
  return PLASTIC[owner] || '#8E8F8C';
}

function hexRgb(hex) {
  const n = Number.parseInt(String(hex || '').replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(hex, toward, t) {
  const a = hexRgb(hex);
  const b = hexRgb(toward);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function drawBadge(ctx, x, y, label, scale) {
  const text = String(label);
  ctx.font = `700 ${Math.round(scale * 0.22)}px -apple-system, "SF Pro Text", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const bw = Math.max(scale * 0.28, tw + scale * 0.14);
  const bh = scale * 0.26;
  ctx.fillStyle = '#1A1610';
  ctx.beginPath();
  const r = bh * 0.5;
  ctx.moveTo(x - bw / 2 + r, y - bh / 2);
  ctx.arcTo(x + bw / 2, y - bh / 2, x + bw / 2, y + bh / 2, r);
  ctx.arcTo(x + bw / 2, y + bh / 2, x - bw / 2, y + bh / 2, r);
  ctx.arcTo(x - bw / 2, y + bh / 2, x - bw / 2, y - bh / 2, r);
  ctx.arcTo(x - bw / 2, y - bh / 2, x + bw / 2, y - bh / 2, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F4EFE4';
  ctx.fillText(text, x, y + 1);
}

function pathInf(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.78, s * 0.38, s * 0.10, 0, 0, Math.PI * 2);
  ctx.moveTo(cx - s * 0.20, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.04, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.78);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.78);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.04, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.20, cy + s * 0.78);
  ctx.lineTo(cx + s * 0.02, cy + s * 0.78);
  ctx.closePath();
  ctx.roundRect(cx - s * 0.22, cy - s * 0.22, s * 0.44, s * 0.50, s * 0.08);
  ctx.moveTo(cx + s * 0.16, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.30, cy + s * 0.12);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.06);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.16, cy - s * 0.06);
  ctx.lineTo(cx - s * 0.36, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.16);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.04);
  ctx.closePath();
  ctx.ellipse(cx, cy - s * 0.42, s * 0.16, s * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy - s * 0.54, s * 0.20, s * 0.14, 0, 0, Math.PI * 2);
}

function pathTnk(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.82, cy + s * 0.08, s * 1.64, s * 0.42, s * 0.14);
  ctx.roundRect(cx - s * 0.58, cy - s * 0.10, s * 1.08, s * 0.32, s * 0.08);
  ctx.roundRect(cx - s * 0.20, cy - s * 0.36, s * 0.42, s * 0.32, s * 0.08);
  ctx.rect(cx + s * 0.16, cy - s * 0.28, s * 0.72, s * 0.12);
}

function pathArt(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.38, cy + s * 0.40, s * 0.22, s * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + s * 0.30, cy + s * 0.40, s * 0.22, s * 0.22, 0, 0, Math.PI * 2);
  ctx.roundRect(cx - s * 0.26, cy - s * 0.02, s * 0.48, s * 0.28, s * 0.06);
  ctx.moveTo(cx - s * 0.04, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.72, cy - s * 0.58);
  ctx.lineTo(cx + s * 0.82, cy - s * 0.44);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.16);
  ctx.closePath();
}

function pathFtr(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.90);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.96, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.86, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.58);
  ctx.lineTo(cx + s * 0.36, cy + s * 0.70);
  ctx.lineTo(cx, cy + s * 0.56);
  ctx.lineTo(cx - s * 0.36, cy + s * 0.70);
  ctx.lineTo(cx - s * 0.10, cy + s * 0.58);
  ctx.lineTo(cx - s * 0.10, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.86, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.96, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.08);
  ctx.closePath();
}

function pathBmb(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.88);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.16);
  ctx.lineTo(cx + s * 1.00, cy + s * 0.00);
  ctx.lineTo(cx + s * 0.90, cy + s * 0.16);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.62);
  ctx.lineTo(cx + s * 0.28, cy + s * 0.82);
  ctx.lineTo(cx, cy + s * 0.70);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.82);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.62);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.90, cy + s * 0.16);
  ctx.lineTo(cx - s * 1.00, cy + s * 0.00);
  ctx.lineTo(cx - s * 0.14, cy - s * 0.16);
  ctx.closePath();
  ctx.ellipse(cx - s * 0.36, cy + s * 0.00, s * 0.14, s * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + s * 0.36, cy + s * 0.00, s * 0.14, s * 0.16, 0, 0, Math.PI * 2);
}

function pathAa(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.42, s * 0.42, s * 0.18, 0, 0, Math.PI * 2);
  ctx.roundRect(cx - s * 0.18, cy - s * 0.06, s * 0.36, s * 0.38, s * 0.06);
  ctx.moveTo(cx - s * 0.08, cy + s * 0.02);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.82);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.82);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.02);
  ctx.closePath();
}

function pathFac(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.rect(cx - s * 0.68, cy - s * 0.02, s * 1.36, s * 0.62);
  ctx.moveTo(cx - s * 0.68, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.46, cy - s * 0.40);
  ctx.lineTo(cx - s * 0.24, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.40);
  ctx.lineTo(cx + s * 0.20, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.40);
  ctx.lineTo(cx + s * 0.64, cy - s * 0.02);
  ctx.closePath();
  ctx.rect(cx + s * 0.28, cy - s * 0.74, s * 0.20, s * 0.72);
}

function pathShip(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.96, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.68, cy - s * 0.10);
  ctx.lineTo(cx + s * 0.62, cy - s * 0.10);
  ctx.lineTo(cx + s * 0.96, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.68, cy + s * 0.22);
  ctx.lineTo(cx - s * 0.68, cy + s * 0.22);
  ctx.closePath();
  ctx.roundRect(cx - s * 0.20, cy - s * 0.34, s * 0.52, s * 0.30, s * 0.05);
}

function pathCarrier(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.94, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.60, cy - s * 0.16);
  ctx.lineTo(cx + s * 0.70, cy - s * 0.16);
  ctx.lineTo(cx + s * 0.94, cy + s * 0.02);
  ctx.lineTo(cx + s * 0.68, cy + s * 0.20);
  ctx.lineTo(cx - s * 0.68, cy + s * 0.20);
  ctx.closePath();
  ctx.roundRect(cx + s * 0.28, cy - s * 0.06, s * 0.28, s * 0.28, s * 0.04);
}

function pathSub(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.04, s * 0.92, s * 0.22, 0, 0, Math.PI * 2);
  ctx.roundRect(cx - s * 0.10, cy - s * 0.34, s * 0.28, s * 0.28, s * 0.04);
}

function pathTr(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.88, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.58, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.68, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.90, cy + s * 0.10);
  ctx.lineTo(cx + s * 0.60, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.60, cy + s * 0.28);
  ctx.closePath();
  ctx.roundRect(cx - s * 0.26, cy - s * 0.32, s * 0.60, s * 0.32, s * 0.05);
}

const PATHS = {
  infantry: pathInf,
  armour: pathTnk,
  artillery: pathArt,
  fighter: pathFtr,
  bomber: pathBmb,
  tacticalBomber: pathBmb,
  aaGun: pathAa,
  factory: pathFac,
  battleship: pathShip,
  destroyer: pathShip,
  cruiser: pathShip,
  carrier: pathCarrier,
  submarine: pathSub,
  transport: pathTr,
};

function drawContactShadow(ctx, cx, cy, s) {
  // Soft ground blob UNDER the mini — never a black disc over the sculpt.
  ctx.save();
  ctx.fillStyle = 'rgba(28, 22, 16, 0.20)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.04, cy + s * 0.86, s * 0.70, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(28, 22, 16, 0.10)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.04, cy + s * 0.88, s * 0.86, s * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlasticBody(ctx, pathFn, cx, cy, s, color) {
  drawContactShadow(ctx, cx, cy, s);

  ctx.save();
  pathFn(ctx, cx, cy, s);
  const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  g.addColorStop(0, mixRgb(color, '#FFFFFF', 0.22));
  g.addColorStop(0.42, color);
  g.addColorStop(1, mixRgb(color, '#8A7355', 0.28));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.save();
  pathFn(ctx, cx, cy, s);
  ctx.strokeStyle = '#1A1610';
  ctx.lineWidth = Math.max(5, s * 0.07);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  pathFn(ctx, cx, cy, s);
  ctx.clip();
  const hi = ctx.createRadialGradient(cx - s * 0.28, cy - s * 0.34, s * 0.04, cx, cy, s);
  hi.addColorStop(0, 'rgba(255,255,255,0.36)');
  hi.addColorStop(0.42, 'rgba(255,255,255,0.06)');
  hi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  ctx.restore();
}

function plasticBodyColor(faction) {
  // ART-PIPELINE: cream #F0E6D2 body. Faction is a rim, not a dye that reads black at 390.
  return mixRgb(CREAM, faction || '#8E8F8C', 0.12);
}

function tintAtlasCell(img, cell, color) {
  const cols = cell.atlas === 'land' ? 4 : 2;
  const sw = img.width / cols;
  const sh = img.height / 2;
  const sx = cell.col * sw;
  const sy = cell.row * sh;
  const off = document.createElement('canvas');
  off.width = 256;
  off.height = 256;
  const ox = off.getContext('2d', { willReadFrequently: true });
  ox.clearRect(0, 0, 256, 256);
  ox.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
  const pix = ox.getImageData(0, 0, 256, 256);
  const d = pix.data;
  const [tr, tg, tb] = hexRgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const lum = (0.30 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    // Atlas is already cream-lifted. Keep sculpt; never floor to a black stamp.
    const shade = 0.72 + lum * 0.38;
    d[i] = Math.max(0, Math.min(255, (d[i] * 0.72) + (tr * shade) * 0.28));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] * 0.72) + (tg * shade) * 0.28));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] * 0.72) + (tb * shade) * 0.28));
  }
  ox.putImageData(pix, 0, 0);
  return off;
}

function drawPhotorealPlastic(ctx, type, cx, cy, s, color, faction) {
  const cell = atlasCellFor(type);
  const img = cell ? atlases[cell.atlas] : null;
  if (!cell || !img) return false;
  const tinted = tintAtlasCell(img, cell, color);
  const d = s * 2.20;
  const x = cx - d / 2;
  const y = cy - d / 2 - s * 0.02;
  // Outline lives OUTSIDE the alpha via drop-shadow so it cannot sit under
  // the cream feather and collapse the 64px pip to a black stamp.
  // ~8px on a 256 atlas ≈ 2px screen at mid.
  ctx.save();
  ctx.filter = [
    'drop-shadow(0 0 2px #3A3228)',
    'drop-shadow(0 0 2px #3A3228)',
    'drop-shadow(0 0 1px #1A1610)',
    `drop-shadow(0 0 1px ${faction || '#8E8F8C'})`,
  ].join(' ');
  ctx.drawImage(tinted, x, y, d, d);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const hi = ctx.createRadialGradient(cx - s * 0.30, cy - s * 0.46, s * 0.04, cx, cy, s * 1.15);
  hi.addColorStop(0, 'rgba(255,255,255,0.42)');
  hi.addColorStop(0.34, 'rgba(255,255,255,0.10)');
  hi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.04, s * 0.90, s * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

function drawMolded(ctx, type, cx, cy, s, color, { shadow = true } = {}) {
  if (shadow) drawContactShadow(ctx, cx, cy, s);
  const body = plasticBodyColor(color);
  if (!drawPhotorealPlastic(ctx, type, cx, cy, s, body, color)) {
    drawPlasticBody(ctx, PATHS[type] || pathInf, cx, cy, s, body);
  }
}

function drawCreamDisc(ctx, cx, cy, r, faction, { shadow = true } = {}) {
  if (shadow) {
    ctx.save();
    ctx.fillStyle = 'rgba(28, 22, 16, 0.20)';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.04, cy + r * 0.88, r * 0.90, r * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  const body = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  body.addColorStop(0, '#F7F0E2');
  body.addColorStop(0.42, CREAM);
  body.addColorStop(1, '#D4C4A8');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = '#1A1610';
  ctx.lineWidth = Math.max(4, r * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - Math.max(5, r * 0.09), 0, Math.PI * 2);
  ctx.strokeStyle = faction || '#8E8F8C';
  ctx.lineWidth = Math.max(5, r * 0.10);
  ctx.stroke();
  ctx.restore();
}

function stampChitGlyph(ctx, type, cx, cy, r) {
  const cell = CHIT_CELL[type];
  const img = cell ? atlases[cell.atlas] : null;
  if (cell && img) {
    const cols = cell.cols || 2;
    const sw = img.width / cols;
    const sh = img.height / 2;
    const d = r * 2.08;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cell.col * sw, cell.row * sh, sw, sh, cx - d / 2, cy - d / 2, d, d);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(r * 0.012, r * 0.012);
  ctx.fillStyle = 'rgba(44, 40, 32, 0.38)';
  (PATHS[type] || pathInf)(ctx, 0, 0, 42);
  ctx.fill();
  ctx.restore();
}

function drawCreamChit(ctx, {
  type = null,
  ownerColor,
  quantity = 0,
  w = 256,
  h = 256,
  shadow = true,
  glyph = true,
} = {}) {
  const cx = w / 2;
  const cy = h / 2 - Math.min(w, h) * 0.02;
  const r = Math.min(w, h) * 0.38;
  ctx.clearRect(0, 0, w, h);
  drawCreamDisc(ctx, cx, cy, r, ownerColor, { shadow });
  if (glyph && type) stampChitGlyph(ctx, type, cx, cy, r);
  if (quantity >= 1) drawBadge(ctx, w * 0.82, h * 0.84, quantity, Math.min(w, h) * 0.85);
}

export function paintPiece(ctx, { type, ownerColor, quantity, w = 256, h = 256, shadow = true } = {}) {
  // Near: typed cream chit + faction rim. Not a pedestal mini.
  drawCreamChit(ctx, { type, ownerColor, quantity, w, h, shadow, glyph: true });
}

export function paintPip(ctx, { ownerColor, total, type = 'infantry', size = 256 } = {}) {
  // Mid/far = pip+N only. Type glyphs only on near. Never a type parade.
  drawCreamChit(ctx, {
    type: null,
    ownerColor,
    quantity: total,
    w: size,
    h: size,
    shadow: true,
    glyph: false,
  });
}

export function paintOverflow(ctx, { plus, size = 192 } = {}) {
  ctx.clearRect(0, 0, size, size);
  drawBadge(ctx, size / 2, size / 2, `+${plus}`, size * 1.35);
}

function chitTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeChitTexture(type, ownerColor, quantity) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  paintPiece(canvas.getContext('2d'), { type, ownerColor, quantity });
  return chitTex(canvas);
}

export function makePipTexture(ownerColor, total, type = 'infantry') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  paintPip(canvas.getContext('2d'), { ownerColor, total, type, size: 256 });
  return chitTex(canvas);
}

export function makeOverflowTexture(plus) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  paintOverflow(canvas.getContext('2d'), { plus });
  return chitTex(canvas);
}

export function pieceIconDataUrl(type, ownerColor, quantity = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  paintPiece(canvas.getContext('2d'), { type, ownerColor, quantity, w: 96, h: 96 });
  return canvas.toDataURL('image/png');
}
