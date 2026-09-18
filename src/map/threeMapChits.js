// Cream plastic chits for ?three=1. AA-PALETTE / STACK-LOD lock.
// Face #F0E6D2 + faction rim + dark outline + contact shadow.
// P22 HARD: mid/far pip = cream token + N ONLY. ZERO type parade.
// Near = same cream token + type glyph. Kill grey figurines / atlas soldiers.

import * as THREE from 'three';
import { PLASTIC, PALETTE } from './threeMapPalette.js';

const CREAM = PALETTE.cream || '#F0E6D2';

export const UNIT_ATLAS = {
  land: 'assets/three/units/units-land-plastic.png',
  naval: 'assets/three/units/units-naval-plastic.png',
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
  // Soft ground blob UNDER the chit — never a black disc over the cream face.
  ctx.save();
  ctx.fillStyle = 'rgba(28, 22, 16, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.05, cy + s * 0.78, s * 0.72, s * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(28, 22, 16, 0.12)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.05, cy + s * 0.84, s * 0.88, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCreamToken(ctx, cx, cy, s, faction) {
  const rx = s * 0.92;
  const ry = s * 0.70;
  const side = s * 0.20;

  // Dark outline (outer wall).
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + side + 1, rx + 3.5, ry + 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy - 1, rx + 3.5, ry + 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1610';
  ctx.fill();

  // Cylinder side — cream plastic, not grey figurine.
  const sideGrad = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy + side);
  sideGrad.addColorStop(0, mixRgb(CREAM, '#8A7355', 0.28));
  sideGrad.addColorStop(0.45, '#D4C4A8');
  sideGrad.addColorStop(1, mixRgb(CREAM, '#6A5A40', 0.35));
  ctx.beginPath();
  ctx.ellipse(cx, cy + side, rx, ry, 0, 0, Math.PI);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = sideGrad;
  ctx.fill();

  // Faction rim painted on the side + lip.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + side * 0.18, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = faction || '#8E8F8C';
  ctx.lineWidth = Math.max(6, s * 0.16);
  ctx.stroke();
  ctx.restore();

  // Cream #F0E6D2 top face.
  const top = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  top.addColorStop(0, '#FFF8EC');
  top.addColorStop(0.38, CREAM);
  top.addColorStop(1, '#D8C8AC');
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = top;
  ctx.fill();

  // Dark inner outline so the cream punches at 64px.
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#1A1610';
  ctx.lineWidth = Math.max(3, s * 0.055);
  ctx.stroke();

  // Faction lip on the top edge.
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 6, ry - 5, 0, 0, Math.PI * 2);
  ctx.strokeStyle = faction || '#8E8F8C';
  ctx.lineWidth = Math.max(4, s * 0.09);
  ctx.stroke();

  // Toy sheen on cream plastic.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 8, ry - 7, 0, 0, Math.PI * 2);
  ctx.clip();
  const hi = ctx.createRadialGradient(cx - rx * 0.28, cy - ry * 0.36, s * 0.04, cx, cy, s);
  hi.addColorStop(0, 'rgba(255,255,255,0.55)');
  hi.addColorStop(0.40, 'rgba(255,255,255,0.10)');
  hi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  ctx.restore();
}

function drawTypeGlyph(ctx, type, cx, cy, s) {
  const pathFn = PATHS[type];
  if (!pathFn) return;
  ctx.save();
  pathFn(ctx, cx, cy + s * 0.02, s * 0.38);
  ctx.fillStyle = '#2C2820';
  ctx.fill();
  ctx.restore();
}

function paintCreamChit(ctx, {
  faction,
  quantity,
  glyph = null,
  w = 256,
  h = 256,
  shadow = true,
} = {}) {
  const cx = w / 2;
  const cy = h / 2 - Math.min(w, h) * 0.06;
  const s = Math.min(w, h) * 0.38;
  ctx.clearRect(0, 0, w, h);
  if (shadow) drawContactShadow(ctx, cx, cy, s);
  drawCreamToken(ctx, cx, cy, s, faction);
  // Near only. Mid/far pass glyph:null — ZERO type parade.
  if (glyph) drawTypeGlyph(ctx, glyph, cx, cy, s);
  if (quantity >= 1) drawBadge(ctx, w * 0.82, h * 0.86, quantity, Math.min(w, h) * 0.85);
}

export function paintPiece(ctx, { type, ownerColor, quantity, w = 256, h = 256, shadow = true } = {}) {
  paintCreamChit(ctx, {
    faction: ownerColor,
    quantity,
    glyph: type || 'infantry',
    w,
    h,
    shadow,
  });
}

export function paintPip(ctx, { ownerColor, total, size = 256 } = {}) {
  // P22 HARD: mid/far = cream plastic chit + faction rim + N.
  // ZERO type parade. No soldier, ship, tank, or atlas figurine.
  paintCreamChit(ctx, {
    faction: ownerColor,
    quantity: total,
    glyph: null,
    w: size,
    h: size,
    shadow: true,
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

export function makePipTexture(ownerColor, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  paintPip(canvas.getContext('2d'), { ownerColor, total, size: 256 });
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
