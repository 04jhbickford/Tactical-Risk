// Faction-colored molded A&A plastic. No chit discs.
// Match refs/aa-plastic-units.png: solid body color, thick dark outline, shadow.

import * as THREE from 'three';
import { PLASTIC } from './threeMapPalette.js';

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

function drawPlasticBody(ctx, pathFn, cx, cy, s, color) {
  ctx.save();
  ctx.shadowColor = 'rgba(12, 10, 8, 0.55)';
  ctx.shadowBlur = s * 0.18;
  ctx.shadowOffsetX = s * 0.06;
  ctx.shadowOffsetY = s * 0.14;
  pathFn(ctx, cx, cy, s);
  const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  g.addColorStop(0, mixRgb(color, '#FFFFFF', 0.38));
  g.addColorStop(0.42, color);
  g.addColorStop(1, mixRgb(color, '#000000', 0.42));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.save();
  pathFn(ctx, cx, cy, s);
  ctx.strokeStyle = '#1A1610';
  ctx.lineWidth = Math.max(9, s * 0.13);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  pathFn(ctx, cx, cy, s);
  ctx.clip();
  const hi = ctx.createRadialGradient(cx - s * 0.28, cy - s * 0.32, s * 0.04, cx, cy, s);
  hi.addColorStop(0, 'rgba(255,255,255,0.28)');
  hi.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  hi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  ctx.restore();
}

function drawAtlasTint(ctx, type, cx, cy, s, color) {
  const cell = atlasCellFor(type);
  const img = cell ? atlases[cell.atlas] : null;
  if (!cell || !img) return false;
  const sw = img.width / (cell.atlas === 'land' ? 4 : 2);
  const sh = img.height / 2;
  const sx = cell.col * sw;
  const sy = cell.row * sh;
  const d = s * 2.05;
  const off = document.createElement('canvas');
  off.width = 256;
  off.height = 256;
  const ox = off.getContext('2d');
  ox.clearRect(0, 0, 256, 256);
  ox.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
  ox.globalCompositeOperation = 'multiply';
  ox.fillStyle = color;
  ox.fillRect(0, 0, 256, 256);
  ox.globalCompositeOperation = 'destination-in';
  ox.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);

  ctx.save();
  ctx.shadowColor = 'rgba(12, 10, 8, 0.55)';
  ctx.shadowBlur = s * 0.18;
  ctx.shadowOffsetX = s * 0.06;
  ctx.shadowOffsetY = s * 0.14;
  ctx.drawImage(off, cx - d / 2, cy - d / 2, d, d);
  ctx.restore();

  // Thick dark outline from alpha
  ctx.save();
  ctx.shadowColor = '#1A1610';
  ctx.shadowBlur = Math.max(6, s * 0.08);
  ctx.globalAlpha = 0.95;
  ctx.drawImage(off, cx - d / 2, cy - d / 2, d, d);
  ctx.restore();
  ctx.drawImage(off, cx - d / 2, cy - d / 2, d, d);
  return true;
}

function drawFallback(ctx, type, cx, cy, s, color) {
  const pathFn = PATHS[type] || pathInf;
  if (type === 'infantry') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(7, s * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.08, cy + s * 0.02);
    ctx.lineTo(cx + s * 0.58, cy - s * 0.40);
    ctx.stroke();
    ctx.restore();
  }
  drawPlasticBody(ctx, pathFn, cx, cy, s, color);
}

export function paintPiece(ctx, { type, ownerColor, quantity, w = 256, h = 256 } = {}) {
  const cx = w / 2;
  const cy = h / 2;
  const s = Math.min(w, h) * 0.38;
  ctx.clearRect(0, 0, w, h);
  const usedAtlas = drawAtlasTint(ctx, type, cx, cy, s, ownerColor);
  if (!usedAtlas) drawFallback(ctx, type, cx, cy, s, ownerColor);
  if (quantity > 1) drawBadge(ctx, w * 0.78, h * 0.80, quantity, Math.min(w, h));
}

export function paintPip(ctx, { ownerColor, total, types = [], size = 192 } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.shadowColor = 'rgba(12, 10, 8, 0.55)';
  ctx.shadowBlur = r * 0.28;
  ctx.shadowOffsetX = r * 0.08;
  ctx.shadowOffsetY = r * 0.16;
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, mixRgb(ownerColor, '#FFFFFF', 0.32));
  g.addColorStop(0.5, ownerColor);
  g.addColorStop(1, mixRgb(ownerColor, '#000000', 0.38));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#1A1610';
  ctx.lineWidth = Math.max(10, r * 0.16);
  ctx.stroke();
  drawBadge(ctx, cx, cy, total, size * 1.15);
  if (types.length > 1) {
    const n = Math.min(types.length, 5);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const dx = cx + Math.cos(a) * r * 0.78;
      const dy = cy + Math.sin(a) * r * 0.78;
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = '#1A1610';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = mixRgb(ownerColor, '#FFFFFF', 0.25);
      ctx.fill();
    }
  }
}

export function paintOverflow(ctx, { plus, size = 192 } = {}) {
  ctx.clearRect(0, 0, size, size);
  drawBadge(ctx, size / 2, size / 2, `+${plus}`, size * 1.35);
}

export function makeChitTexture(type, ownerColor, quantity) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  paintPiece(canvas.getContext('2d'), { type, ownerColor, quantity });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makePipTexture(ownerColor, total, types = []) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  paintPip(canvas.getContext('2d'), { ownerColor, total, types });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeOverflowTexture(plus) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  paintOverflow(canvas.getContext('2d'), { plus });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function pieceIconDataUrl(type, ownerColor, quantity = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  paintPiece(canvas.getContext('2d'), { type, ownerColor, quantity, w: 96, h: 96 });
  return canvas.toDataURL('image/png');
}
