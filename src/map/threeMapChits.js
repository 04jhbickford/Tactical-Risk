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

export function paintChit(ctx, { type, ownerColor, quantity, shortLabel, w = 160, h = 188 } = {}) {
  const cx = w / 2;
  const faceY = h * 0.38;
  const r = Math.min(w, h) * 0.36;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = ownerColor || '#3a3228';
  ctx.beginPath();
  ctx.arc(cx, faceY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(243,234,214,0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#efe6d6';
  ctx.beginPath();
  ctx.arc(cx, faceY, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  const draw = DRAW[glyphKey(type)] || drawInf;
  draw(ctx, cx, faceY, r * 1.15);
  ctx.fillStyle = 'rgba(22, 18, 14, 0.9)';
  ctx.beginPath();
  ctx.roundRect(w * 0.14, h * 0.74, w * 0.72, h * 0.2, 8);
  ctx.fill();
  ctx.strokeStyle = ownerColor || '#c9a44a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#f3ead6';
  ctx.font = `700 ${Math.round(h * 0.11)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shortLabel || glyphKey(type).toUpperCase(), cx, h * 0.84);
  if (quantity > 1) {
    ctx.fillStyle = '#1c1812';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.14, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3ead6';
    ctx.font = '700 18px "Segoe UI", sans-serif';
    ctx.fillText(`×${quantity}`, w * 0.8, h * 0.145);
  }
}

export function paintPip(ctx, { ownerColor, total, size = 128 } = {}) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = ownerColor || '#3a3228';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(243,234,214,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#efe6d6';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1812';
  ctx.font = `700 ${Math.round(size * 0.34)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), size / 2, size / 2 + 1);
}

export function makeChitTexture(type, ownerColor, quantity, shortLabel) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 188;
  paintChit(canvas.getContext('2d'), { type, ownerColor, quantity, shortLabel });
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
