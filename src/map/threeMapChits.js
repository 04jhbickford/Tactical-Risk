// From-scratch preview unit chits. No stock art, no Canvas utility PNGs.
// Readable at 390. Faction rim + bone face + glyph.

import * as THREE from 'three';

const GLYPH = {
  infantry: 'inf',
  armour: 'tnk',
  artillery: 'art',
  fighter: 'ftr',
  bomber: 'bmb',
  tacticalBomber: 'ftr',
  transport: 'ship',
  submarine: 'ship',
  destroyer: 'ship',
  cruiser: 'ship',
  battleship: 'ship',
  carrier: 'ship',
  factory: 'fac',
  aaGun: 'aa',
};

function strokeFill(ctx, fill, stroke, width) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fill();
  ctx.stroke();
}

function drawInf(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.28, s * 0.16, 0, Math.PI * 2);
  ctx.moveTo(cx, cy - s * 0.1);
  ctx.lineTo(cx, cy + s * 0.18);
  ctx.moveTo(cx - s * 0.22, cy + 0.02 * s);
  ctx.lineTo(cx, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.26, cy + s * 0.08);
  ctx.moveTo(cx - s * 0.1, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.16, cy + s * 0.38);
  ctx.moveTo(cx + s * 0.1, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.38);
  ctx.strokeStyle = '#1c1812';
  ctx.lineWidth = s * 0.09;
  ctx.stroke();
}

function drawTnk(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.36, cy + s * 0.02, s * 0.72, s * 0.22, s * 0.06);
  ctx.moveTo(cx - s * 0.14, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.14, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.04);
  ctx.moveTo(cx + s * 0.18, cy - s * 0.04);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.08);
  ctx.strokeStyle = '#1c1812';
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    ctx.moveTo(cx + i * s * 0.09, cy + s * 0.24);
    ctx.arc(cx + i * s * 0.09, cy + s * 0.24, s * 0.045, 0, Math.PI * 2);
  }
  ctx.fillStyle = '#1c1812';
  ctx.fill();
}

function drawFtr(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.08, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.32);
  ctx.lineTo(cx, cy + s * 0.2);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.32);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.02);
  ctx.closePath();
  strokeFill(ctx, '#1c1812', '#1c1812', 1);
}

function drawShip(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.24);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.24);
  ctx.lineTo(cx + s * 0.42, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.16);
  ctx.lineTo(cx - s * 0.04, cy - s * 0.16);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.04);
  ctx.closePath();
  strokeFill(ctx, '#1c1812', '#1c1812', 1);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.02, cy - s * 0.16);
  ctx.lineTo(cx + s * 0.02, cy - s * 0.34);
  ctx.strokeStyle = '#1c1812';
  ctx.lineWidth = s * 0.06;
  ctx.stroke();
}

function drawArt(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx - s * 0.08, cy + s * 0.16, s * 0.12, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.2, cy + s * 0.16, s * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1812';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.16, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.36, cy - s * 0.22);
  ctx.lineWidth = s * 0.1;
  ctx.strokeStyle = '#1c1812';
  ctx.stroke();
}

function drawBmb(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy);
  ctx.lineTo(cx + s * 0.4, cy);
  ctx.moveTo(cx - s * 0.04, cy);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.22);
  ctx.lineTo(cx + s * 0.16, cy - s * 0.22);
  ctx.lineTo(cx, cy);
  ctx.moveTo(cx + s * 0.12, cy);
  ctx.lineTo(cx + s * 0.04, cy + s * 0.22);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.22);
  ctx.strokeStyle = '#1c1812';
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
}

function drawFac(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.rect(cx - s * 0.28, cy - s * 0.04, s * 0.56, s * 0.32);
  ctx.moveTo(cx - s * 0.2, cy - s * 0.04);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.28);
  ctx.lineTo(cx - s * 0.08, cy - s * 0.04);
  ctx.moveTo(cx + s * 0.02, cy - s * 0.04);
  ctx.lineTo(cx + s * 0.02, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.04);
  ctx.strokeStyle = '#1c1812';
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
}

function drawAa(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.28);
  ctx.lineTo(cx, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.28, cy - s * 0.32);
  ctx.moveTo(cx - s * 0.2, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.28);
  ctx.strokeStyle = '#1c1812';
  ctx.lineWidth = s * 0.09;
  ctx.stroke();
}

const DRAW = {
  inf: drawInf,
  tnk: drawTnk,
  ftr: drawFtr,
  ship: drawShip,
  art: drawArt,
  bmb: drawBmb,
  fac: drawFac,
  aa: drawAa,
};

export function glyphKey(type) {
  return GLYPH[type] || 'inf';
}

export function paintChit(ctx, { type, ownerColor, quantity, w = 160, h = 160 } = {}) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = ownerColor || '#4a3d2e';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e6cf';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  const draw = DRAW[glyphKey(type)] || drawInf;
  draw(ctx, cx, cy, r * 1.05);
  if (quantity > 1) {
    ctx.fillStyle = ownerColor || '#4a3d2e';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.22, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e6cf';
    ctx.font = `700 ${Math.round(h * 0.16)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(quantity), w * 0.78, h * 0.225);
  }
}

export function paintPip(ctx, { ownerColor, total, size = 128 } = {}) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = ownerColor || '#4a3d2e';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e6cf';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2218';
  ctx.font = `700 ${Math.round(size * 0.34)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), size / 2, size / 2 + 1);
}

export function makeChitTexture(type, ownerColor, quantity, shortLabel) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
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
