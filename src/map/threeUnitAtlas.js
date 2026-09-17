// Arc cream-chit atlas for ?three=1. Slices the attached sheets only.
// Faction = rim tint on the cream face. No UI glyphs, no text pills.

import * as THREE from 'three';

export const SHEET_LAND_AIR = 'assets/three/units/units-land-air-cream.png';
export const SHEET_NAVAL = 'assets/three/units/units-naval-cream.png';

// 2×2 sheet order (Arc). Do not invent a second set.
const LAND_AIR_ORDER = ['infantry', 'armour', 'fighter', 'bomber'];
const NAVAL_ORDER = ['battleship', 'carrier', 'submarine', 'transport'];

// Closest sheet face for types not printed. Derived FAC/AA/ART stamp
// relief onto a blank disc cloned from these sheets (same plastic).
const ALIAS = {
  tacticalBomber: 'fighter',
  destroyer: 'battleship',
  cruiser: 'battleship',
};

const DERIVED = new Set(['artillery', 'aaGun', 'factory']);

const FACE = '#F0E6D2';
const GLYPH = '#2C2820';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`atlas missing ${src}`));
    img.src = src;
  });
}

function drawToCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, image: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

function isCream(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const warmth = r - b;
  if (max < 148) return false;
  if (sat < 9 && warmth < 8) return false;
  return warmth > 8 && r > 168 && g > 148;
}

function findDiscs(imageData, expect) {
  const { width: w, height: h, data } = imageData;
  const step = 3;
  const seen = new Uint8Array(w * h);
  const blobs = [];

  const idx = (x, y) => y * w + x;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const p = idx(x, y);
      if (seen[p]) continue;
      const i = p * 4;
      if (!isCream(data[i], data[i + 1], data[i + 2])) continue;
      const stack = [[x, y]];
      seen[p] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sx = 0;
      let sy = 0;
      let n = 0;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        sx += cx;
        sy += cy;
        n += 1;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (let oy = -step; oy <= step; oy += step) {
          for (let ox = -step; ox <= step; ox += step) {
            const nx = cx + ox;
            const ny = cy + oy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const np = idx(nx, ny);
            if (seen[np]) continue;
            const ni = np * 4;
            if (!isCream(data[ni], data[ni + 1], data[ni + 2])) continue;
            seen[np] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (n < 80) continue;
      const bw = maxX - minX;
      const bh = maxY - minY;
      if (bw < 40 || bh < 40) continue;
      blobs.push({
        cx: sx / n,
        cy: sy / n,
        minX,
        maxX,
        minY,
        maxY,
        r: Math.max(bw, bh) * 0.52,
        n,
      });
    }
  }

  blobs.sort((a, b) => b.n - a.n);
  const picked = blobs.slice(0, expect);
  picked.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));
  if (picked.length === 4) {
    const top = picked.filter((b) => b.cy < h * 0.5).sort((a, b) => a.cx - b.cx);
    const bot = picked.filter((b) => b.cy >= h * 0.5).sort((a, b) => a.cx - b.cx);
    if (top.length === 2 && bot.length === 2) return [...top, ...bot];
  }
  return picked;
}

function extractDisc(srcCanvas, blob, size = 256) {
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d');
  const pad = blob.r * 0.08;
  const r = blob.r + pad;
  const sx = blob.cx - r;
  const sy = blob.cy - r;
  const d = r * 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.49, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(srcCanvas, sx, sy, d, d, 0, 0, size, size);
  ctx.restore();
  return out;
}

function blankDiscFrom(src) {
  const w = src.width;
  const h = src.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = w * 0.46;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  const data = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / R;
      if (d < 0.62 || d > 0.78) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue;
      sr += data[i];
      sg += data[i + 1];
      sb += data[i + 2];
      n += 1;
    }
  }
  if (!n) return src;
  sr /= n;
  sg /= n;
  sb /= n;
  const face = (sr + sg + sb) / 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / R;
      if (d > 0.58) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3] < 180) continue;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < face - 6) {
        data[i] = sr;
        data[i + 1] = sg;
        data[i + 2] = sb;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function stampRelief(ctx, cx, cy, s, path) {
  ctx.save();
  ctx.translate(cx + s * 0.03, cy + s * 0.04);
  ctx.fillStyle = 'rgba(70, 58, 40, 0.22)';
  path(ctx, 0, 0, s);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#e4d6bc';
  path(ctx, 0, 0, s);
  ctx.fill();
  ctx.translate(-s * 0.02, -s * 0.025);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255, 248, 236, 0.28)';
  path(ctx, 0, 0, s);
  ctx.fill();
  ctx.restore();
}

function pathArt(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x - s * 0.1, y + s * 0.16, s * 0.13, s * 0.13, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.18, y + s * 0.16, s * 0.13, s * 0.13, 0, 0, Math.PI * 2);
  ctx.moveTo(x - s * 0.2, y + s * 0.02);
  ctx.lineTo(x + s * 0.36, y - s * 0.28);
  ctx.lineTo(x + s * 0.28, y - s * 0.12);
  ctx.lineTo(x - s * 0.08, y + s * 0.08);
  ctx.closePath();
}

function pathAa(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, y + s * 0.28);
  ctx.lineTo(x + s * 0.22, y + s * 0.28);
  ctx.lineTo(x + s * 0.16, y + s * 0.12);
  ctx.lineTo(x - s * 0.16, y + s * 0.12);
  ctx.closePath();
  ctx.moveTo(x - s * 0.04, y + s * 0.12);
  ctx.lineTo(x + s * 0.06, y - s * 0.32);
  ctx.lineTo(x + s * 0.16, y - s * 0.28);
  ctx.lineTo(x + s * 0.04, y + s * 0.12);
  ctx.closePath();
}

function pathFac(ctx, x, y, s) {
  ctx.beginPath();
  ctx.rect(x - s * 0.3, y - s * 0.02, s * 0.6, s * 0.32);
  ctx.moveTo(x - s * 0.28, y - s * 0.02);
  ctx.lineTo(x - s * 0.28, y - s * 0.3);
  ctx.lineTo(x - s * 0.12, y - s * 0.02);
  ctx.moveTo(x - s * 0.04, y - s * 0.02);
  ctx.lineTo(x - s * 0.04, y - s * 0.3);
  ctx.lineTo(x + s * 0.12, y - s * 0.02);
  ctx.closePath();
}

function deriveDisc(blank, type) {
  const out = document.createElement('canvas');
  out.width = blank.width;
  out.height = blank.height;
  const ctx = out.getContext('2d');
  ctx.drawImage(blank, 0, 0);
  const path = type === 'factory' ? pathFac : type === 'aaGun' ? pathAa : pathArt;
  stampRelief(ctx, out.width / 2, out.height / 2, out.width * 0.42, path);
  return out;
}

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export async function loadUnitAtlas() {
  const [landImg, navyImg] = await Promise.all([
    loadImage(SHEET_LAND_AIR),
    loadImage(SHEET_NAVAL),
  ]);
  const land = drawToCanvas(landImg);
  const navy = drawToCanvas(navyImg);
  const landDiscs = findDiscs(land.image, 4);
  const navyDiscs = findDiscs(navy.image, 4);
  if (landDiscs.length < 4 || navyDiscs.length < 4) {
    throw new Error(`atlas slice failed land=${landDiscs.length} navy=${navyDiscs.length}`);
  }

  const faces = new Map();
  LAND_AIR_ORDER.forEach((type, i) => faces.set(type, extractDisc(land.canvas, landDiscs[i])));
  NAVAL_ORDER.forEach((type, i) => faces.set(type, extractDisc(navy.canvas, navyDiscs[i])));

  const blank = blankDiscFrom(faces.get('fighter') || faces.get('infantry'));
  for (const type of DERIVED) faces.set(type, deriveDisc(blank, type));
  for (const [from, to] of Object.entries(ALIAS)) {
    if (faces.has(to)) faces.set(from, faces.get(to));
  }

  return {
    faces,
    blank,
    types: [...faces.keys()],
    landCount: landDiscs.length,
    navyCount: navyDiscs.length,
  };
}

function composeChit(face, ownerColor, quantity) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const r = size * 0.48;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fillStyle = ownerColor || '#5A5A52';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, r * 0.86, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(face, 0, 0, size, size);
  ctx.restore();
  if (quantity > 1) {
    const qr = size * 0.13;
    const qx = size * 0.78;
    const qy = size * 0.22;
    ctx.beginPath();
    ctx.arc(qx, qy, qr, 0, Math.PI * 2);
    ctx.fillStyle = ownerColor || '#5A5A52';
    ctx.fill();
    ctx.fillStyle = FACE;
    ctx.font = `700 ${Math.round(size * 0.14)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(quantity), qx, qy + 1);
  }
  return canvas;
}

export function makeAtlasChitTexture(atlas, type, ownerColor, quantity) {
  const key = ALIAS[type] || type;
  const face = atlas.faces.get(key) || atlas.faces.get('infantry') || atlas.blank;
  return canvasTexture(composeChit(face, ownerColor, quantity));
}

export function makeAtlasPipTexture(atlas, ownerColor, total) {
  const canvas = composeChit(atlas.blank, ownerColor, 0);
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.fillStyle = GLYPH;
  ctx.font = `700 ${Math.round(size * 0.34)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), size / 2, size / 2 + 2);
  return canvasTexture(canvas);
}

export function paintAtlasStrip(atlas, dest, ownerColor = '#8B3A3A') {
  const types = [
    'infantry', 'armour', 'artillery', 'fighter',
    'bomber', 'aaGun', 'factory', 'transport',
    'submarine', 'destroyer', 'cruiser', 'battleship', 'carrier',
  ];
  const cols = 7;
  const cell = 128;
  dest.width = cols * cell;
  dest.height = Math.ceil(types.length / cols) * cell;
  const ctx = dest.getContext('2d');
  ctx.fillStyle = '#C4B896';
  ctx.fillRect(0, 0, dest.width, dest.height);
  types.forEach((type, i) => {
    const face = atlas.faces.get(ALIAS[type] || type) || atlas.blank;
    const chit = composeChit(face, ownerColor, type === 'infantry' ? 4 : 1);
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    ctx.drawImage(chit, x + 8, y + 8, cell - 16, cell - 16);
  });
}

export function packOffsets(count, spacing) {
  if (count <= 1) return [{ dx: 0, dz: 0 }];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const out = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    out.push({
      dx: (col - (inRow - 1) / 2) * spacing,
      dz: (row - (rows - 1) / 2) * spacing,
    });
  }
  return out;
}
