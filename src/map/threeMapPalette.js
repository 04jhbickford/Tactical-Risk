// Preview-only Three.js palette. A&A printed board (AA-HECORRECT-11).
// Continent washes + phone-visible cardboard grain. Not Canvas live art.
// Ink Blue is money-only — never recolor this war board.

import * as THREE from 'three';

function hexColor(hex, fallback = 0x888888) {
  const n = Number.parseInt(String(hex || '').replace('#', ''), 16);
  return Number.isFinite(n) ? n : fallback;
}

function mixHex(hex, toward, t) {
  const a = hexColor(hex);
  const b = hexColor(toward);
  const mix = (shift) => {
    const av = (a >> shift) & 255;
    const bv = (b >> shift) & 255;
    return Math.round(av + (bv - av) * t);
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

export const PALETTE = {
  landBase: '#C4B896',
  landBone: '#C4B896',
  landShadow: '#8A7A58',
  landGrain: '#B7AA82',
  landInk: '#3A3428',
  landBevel: '#8A7A58',
  // AA-PALETTE slate-teal — printed A&A sea, not charcoal noise.
  oceanDeep: '#3D5A66',
  oceanShelf: '#4F6E78',
  oceanFog: '#3D5A66',
  foam: '#D9D2C0',
  border: '#3A3428',
  waterHair: '#3A3428',
  select: '#C4A35A',
  selectSoft: '#C4A35A',
  confirm: '#C4A35A',
  legal: '#6B7F4A',
  boneText: '#E8E2D4',
  hud: '#1E2420',
  hudInk: '#E8E2D4',
  sky: '#E8E0C8',
  ground: '#5A6A58',
  key: '#FFF6E4',
  fill: '#D4C8A4',
};

// Soft but unmistakable region washes — match refs/aa-board-continents.png.
export const REGION_WASH = {
  Europe: '#8C9A52',
  USSR: '#C4A06A',
  Africa: '#D6B85C',
  'Middle East': '#D4BC68',
  Asia: '#8EAE6A',
  'North America': '#86A85E',
  'South America': '#6F9848',
  Oceania: '#A3B06A',
};

export const USSR_LANDS = new Set([
  'Russia',
  'Karelia S.S.R.',
  'Ukraine S.S.R.',
  'Novosibirsk',
  'Evenki National Okrug',
  'Soviet Far East',
  'Mongolia',
]);

// Molded A&A plastic body colors (refs/aa-plastic-units.png).
export const PLASTIC = {
  Germans: '#5A5C59',
  Russians: '#2F5A28',
  British: '#B08948',
  Americans: '#3F4F22',
  Japanese: '#B8441E',
};

export const FACTION_WASH = {
  Russians: '#6B8B4A',
  Germans: '#7A7A72',
  British: '#6A7A8A',
  Americans: '#5C6B4A',
  Japanese: '#A87A48',
};

export const OCEAN_DEEP = 0x3d5a66;
export const OCEAN_SHELF = 0x4f6e78;
export const PAPER_UV = 48;
export const OCEAN_UV = 56;
// Overlay + multiply punch — 8–14% is invisible at 390. Glance must read scanned board.
export const GRAIN_STRENGTH = 0.86;

export const BOARD_TEX = {
  parchment: 'assets/three/board/board-parchment-tile.png',
  ocean: 'assets/three/board/board-ocean-tile.png',
};

export const WASH_TEX = {
  Europe: 'assets/three/board/wash-europe.png',
  USSR: 'assets/three/board/wash-ussr.png',
  Africa: 'assets/three/board/wash-africa.png',
  'Middle East': 'assets/three/board/wash-middle-east.png',
  Asia: 'assets/three/board/wash-asia.png',
  'North America': 'assets/three/board/wash-north-america.png',
  'South America': 'assets/three/board/wash-south-america.png',
  Oceania: 'assets/three/board/wash-oceania.png',
};

let paperTex = null;
let oceanMap = null;
let grainCanvas = null;
const landSheets = new Map();
const washMaps = new Map();

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

function wrapHash(ix, iy, period) {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, period) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = wrapHash(x0, y0, period);
  const n10 = wrapHash(x0 + 1, y0, period);
  const n01 = wrapHash(x0, y0 + 1, period);
  const n11 = wrapHash(x0 + 1, y0 + 1, period);
  return n00 + (n10 - n00) * sx + (n01 - n00) * sy + (n11 - n01 - n10 + n00) * sx * sy;
}

function fbm(x, y, period, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const p = Math.max(2, Math.round(period / freq));
    sum += valueNoise(x * freq, y * freq, p) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / (norm || 1);
}

function canvasTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Large-scale cardboard / pulp — designed to read at 390, not 1px speckle.
function bakeGrainField(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const blotchPeriod = 7;
  const fiberPeriod = 22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const blotch = fbm(x / 74, y / 62, blotchPeriod, 5);
      const fiber = fbm(x / 14, y / 46, fiberPeriod, 3);
      const pulp = fbm(x / 28 + 3.1, y / 24 + 1.7, 11, 3);
      const fleck = wrapHash(x, y, size);
      let v = 0.50 + blotch * 0.38 + fiber * 0.16 + (pulp - 0.5) * 0.10;
      if (fleck > 0.992) v += 0.16;
      if (fleck < 0.012) v -= 0.14;
      v = Math.max(0.22, Math.min(1, v));
      const i = (y * size + x) * 4;
      d[i] = Math.round(210 * v);
      d[i + 1] = Math.round(196 * v);
      d[i + 2] = Math.round(150 * v);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function overlayPhoto(ctx, img, size, alpha, mode) {
  if (!img) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, size, size);
  ctx.restore();
}

function bakeParchment(img) {
  const size = 512;
  grainCanvas = bakeGrainField(size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#D2C49A';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(grainCanvas, 0, 0);
  overlayPhoto(ctx, img, size, GRAIN_STRENGTH, 'overlay');
  overlayPhoto(ctx, img, size, 0.28, 'multiply');
  paperTex = canvasTex(canvas);
  return paperTex;
}

function imageToTex(img, fallbackHex, grainImg = null) {
  const size = img ? (img.naturalWidth || img.width || 512) : 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fallbackHex;
  ctx.fillRect(0, 0, size, size);
  if (img) ctx.drawImage(img, 0, 0, size, size);
  if (grainImg) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = GRAIN_STRENGTH;
    ctx.drawImage(grainImg, 0, 0, size, size);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.34;
    ctx.drawImage(grainImg, 0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvasTex(canvas);
}

function bakeOcean(img) {
  // Generated printed slate-teal tile is the SoT. Do not greyscale it.
  oceanMap = imageToTex(img, PALETTE.oceanDeep);
  return oceanMap;
}

function bakeLandSheet(washHex) {
  const key = String(washHex || PALETTE.landBase).toLowerCase();
  if (landSheets.has(key)) return landSheets.get(key);
  if (!grainCanvas) grainCanvas = bakeGrainField(512);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = washHex || PALETTE.landBase;
  ctx.fillRect(0, 0, size, size);
  // Punch: overlay + multiply of large-scale cardboard. Must read at 390.
  overlayPhoto(ctx, grainCanvas, size, GRAIN_STRENGTH, 'overlay');
  overlayPhoto(ctx, grainCanvas, size, 0.48, 'multiply');
  if (paperTex?.image) overlayPhoto(ctx, paperTex.image, size, 0.40, 'soft-light');
  const tex = canvasTex(canvas);
  landSheets.set(key, tex);
  return tex;
}

function continentKey(territory) {
  if (!territory) return 'Europe';
  if (USSR_LANDS.has(territory.name)) return 'USSR';
  return WASH_TEX[territory.continent] ? territory.continent : 'Europe';
}

export async function loadBoardTextures() {
  if (paperTex && oceanMap && washMaps.size) return { paperTex, oceanMap };
  const names = Object.keys(WASH_TEX);
  const [parchment, ocean, ...washes] = await Promise.all([
    loadImage(BOARD_TEX.parchment),
    loadImage(BOARD_TEX.ocean),
    ...names.map((k) => loadImage(WASH_TEX[k])),
  ]);
  paperTex = parchment ? imageToTex(parchment, '#C4B896') : bakeParchment(null);
  oceanMap = bakeOcean(ocean);
  landSheets.clear();
  washMaps.clear();
  names.forEach((k, i) => {
    washMaps.set(k, washes[i]
      ? imageToTex(washes[i], REGION_WASH[k] || PALETTE.landBase, parchment)
      : null);
  });
  return { paperTex, oceanMap };
}

export function makePaperTexture() {
  if (paperTex) return paperTex;
  paperTex = bakeParchment(null);
  return paperTex;
}

export function applyPaperUVs(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / PAPER_UV, -pos.getZ(i) / PAPER_UV);
  }
  uv.needsUpdate = true;
}

export function regionWashFor(territory) {
  if (!territory) return REGION_WASH.Europe;
  if (USSR_LANDS.has(territory.name)) return REGION_WASH.USSR;
  return REGION_WASH[territory.continent] || PALETTE.landBase;
}

export function landWashHex(ownerHex, regionHex) {
  const base = regionHex || PALETTE.landBase;
  if (!ownerHex) return base;
  return `#${mixHex(base, ownerHex, 0.12).toString(16).padStart(6, '0')}`;
}

export function factionWash(owner) {
  return FACTION_WASH[owner] || null;
}

export function plasticColor(owner) {
  return PLASTIC[owner] || '#8E8F8C';
}

export function makeLandMaterials(regionHex, ownerHex, territory) {
  const region = regionHex || PALETTE.landBase;
  const wash = ownerHex ? mixHex(region, ownerHex, 0.12) : hexColor(region);
  const washHex = `#${wash.toString(16).padStart(6, '0')}`;
  const sideHex = mixHex(region, PALETTE.landShadow, 0.45);
  const key = continentKey(territory);
  const sheet = washMaps.get(key) || bakeLandSheet(washHex);
  // MeshBasic — printed cardboard. Lighting must not crush grain to flat olive.
  const top = new THREE.MeshBasicMaterial({
    map: sheet,
    color: 0xffffff,
    transparent: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const wall = new THREE.MeshBasicMaterial({
    color: sideHex,
    transparent: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const seal = new THREE.MeshBasicMaterial({
    map: sheet,
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });
  return { top, side: wall, bottom: wall, seal };
}

export function makeOceanMaterial() {
  makePaperTexture();
  if (!oceanMap) bakeOcean(null);
  return new THREE.MeshBasicMaterial({
    map: oceanMap,
    color: 0xffffff,
    transparent: false,
    toneMapped: false,
  });
}

export function makeOceanMesh(width, height) {
  const geo = new THREE.PlaneGeometry(width, height, 8, 8);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (pos && uv) {
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / OCEAN_UV, -pos.getZ(i) / OCEAN_UV);
    }
    uv.needsUpdate = true;
  }
  const mat = makeOceanMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.12;
  mesh.renderOrder = 0;
  mesh.receiveShadow = false;
  mesh.userData.kind = 'ocean';
  return mesh;
}

export function hexColorInt(hex) {
  return hexColor(hex);
}

export { hexColor, mixHex };
