// Photoreal molded A&A plastics from the James/Arc image-gen atlas.
// ART-PIPELINE / AA-RISK-HOMAGE: cream #F0E6D2 body + faction rim.
// ≥2px dark outline, contact shadow, toy sheen.
// NOT cream discs. NOT grey matte silhouettes. NOT number-coins.

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
  return `rgb(${m[0]},${m[1]},${m[2]})`;
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
  ctx.save();
  ctx.fillStyle = 'rgba(18, 14, 10, 0.38)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.05, cy + s * 0.84, s * 0.82, s * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlasticBody(ctx, pathFn, cx, cy, s, color) {
  drawContactShadow(ctx, cx, cy, s);

  ctx.save();
  pathFn(ctx, cx, cy + s * 0.02, s * 1.04);
  ctx.fillStyle = '#14110C';
  ctx.fill();
  ctx.restore();

  ctx.save();
  pathFn(ctx, cx, cy, s);
  const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  g.addColorStop(0, mixRgb(color, '#FFFFFF', 0.28));
  g.addColorStop(0.38, color);
  g.addColorStop(1, mixRgb(color, '#000000', 0.42));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.save();
  pathFn(ctx, cx, cy, s);
  ctx.strokeStyle = '#1A1610';
  ctx.lineWidth = Math.max(12, s * 0.18);
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
  return mixRgb(CREAM, faction || '#8E8F8C', 0.16);
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
  const ox = off.getContext('2d');
  ox.clearRect(0, 0, 256, 256);
  ox.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
  const pix = ox.getImageData(0, 0, 256, 256);
  const d = pix.data;
  const [tr, tg, tb] = hexRgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const lum = (0.30 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    // Baked atlas outline is a fat black halo — at 390 it is the whole sprite.
    if (lum < 0.16) {
      d[i + 3] = 0;
      continue;
    }
    const shade = 0.62 + (lum ** 0.70) * 0.52;
    d[i] = Math.max(0, Math.min(255, tr * shade));
    d[i + 1] = Math.max(0, Math.min(255, tg * shade));
    d[i + 2] = Math.max(0, Math.min(255, tb * shade));
  }
  ox.putImageData(pix, 0, 0);
  return off;
}

function factionRimFrom(tinted, faction) {
  // 2–3px faction RING, not a filled 1.10× silhouette (that reads as a black stamp at mid).
  const w = tinted.width;
  const h = tinted.height;
  const src = tinted.getContext('2d').getImageData(0, 0, w, h);
  const rim = document.createElement('canvas');
  rim.width = w;
  rim.height = h;
  const rx = rim.getContext('2d');
  const out = rx.createImageData(w, h);
  const sd = src.data;
  const od = out.data;
  const [fr, fg, fb] = hexRgb(faction || '#8E8F8C');
  const R = 4;
  const R2 = R * R;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] >= 16) continue;
      let hit = false;
      for (let dy = -R; dy <= R && !hit; dy++) {
        for (let dx = -R; dx <= R && !hit; dx++) {
          if (dx * dx + dy * dy > R2) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (sd[(yy * w + xx) * 4 + 3] >= 16) hit = true;
        }
      }
      if (hit) {
        od[i] = fr;
        od[i + 1] = fg;
        od[i + 2] = fb;
        od[i + 3] = 255;
      }
    }
  }
  rx.putImageData(out, 0, 0);
  return rim;
}

function drawPhotorealPlastic(ctx, type, cx, cy, s, color, faction) {
  const cell = atlasCellFor(type);
  const img = cell ? atlases[cell.atlas] : null;
  if (!cell || !img) return false;
  const tinted = tintAtlasCell(img, cell, color);
  const d = s * 2.36;
  const rim = factionRimFrom(tinted, faction);
  ctx.drawImage(rim, cx - d / 2, cy - d / 2 - s * 0.04, d, d);
  ctx.drawImage(tinted, cx - d / 2, cy - d / 2 - s * 0.04, d, d);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const hi = ctx.createRadialGradient(cx - s * 0.30, cy - s * 0.46, s * 0.04, cx, cy, s * 1.15);
  hi.addColorStop(0, 'rgba(255,255,255,0.58)');
  hi.addColorStop(0.34, 'rgba(255,255,255,0.14)');
  hi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.04, s * 0.94, s * 1.08, 0, 0, Math.PI * 2);
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

export function paintPiece(ctx, { type, ownerColor, quantity, w = 256, h = 256, shadow = true } = {}) {
  const cx = w / 2;
  const cy = h / 2 - Math.min(w, h) * 0.02;
  const s = Math.min(w, h) * 0.42;
  ctx.clearRect(0, 0, w, h);
  drawMolded(ctx, type, cx, cy, s, ownerColor, { shadow });
  if (quantity >= 1) drawBadge(ctx, w * 0.82, h * 0.84, quantity, Math.min(w, h) * 0.85);
}

export function paintPip(ctx, { ownerColor, total, type = 'infantry', size = 256 } = {}) {
  // Mid/far = ONE plastic silhouette + N. Never a numbered coin / disc.
  // No contact blob at mid — it reads as a black stamp at 390.
  paintPiece(ctx, {
    type: type || 'infantry',
    ownerColor,
    quantity: total,
    w: size,
    h: size,
    shadow: false,
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
