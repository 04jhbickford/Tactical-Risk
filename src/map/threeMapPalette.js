// Preview-only Three.js palette. Standing SoT: PRODUCTION-PATH.md
// A&A homage + Risk continent washes (AA-RISK-HOMAGE + AA-PALETTE).
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
  landShadow: '#8F8468',
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
  cream: '#F0E6D2',
};

// Viz AA-PALETTE continent washes — Risk glance, A&A print (18–28% over parchment).
export const REGION_WASH = {
  Europe: '#6B7A4A',
  USSR: '#8A7355',
  Africa: '#B08948',
  'Middle East': '#A09058',
  Asia: '#5F7A5A',
  'North America': '#6A8B6E',
  'South America': '#5A8A72',
  Oceania: '#7A6B8A',
};
export const CONTINENT_WASH_STRENGTH = 0.28;

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
  Russians: '#8B3A3A',
  Germans: '#5A5A52',
  British: '#4A5C7A',
  Americans: '#5C6B4A',
  Japanese: '#8A6B3A',
};
export const OWNER_WASH_STRENGTH = 0.18;

export const OCEAN_DEEP = 0x3d5a66;
export const OCEAN_SHELF = 0x4f6e78;
export const PAPER_UV = 18;
export const OCEAN_UV = 24;
// Image-gen wash tiles ARE the albedo. Do not flatten to hex + 14% — that
// was the GIS fail. GRAIN_* only feeds the procedural fallback sheet.
export const GRAIN_MULTIPLY = 0.42;
export const GRAIN_STRENGTH = GRAIN_MULTIPLY;

export const BOARD_TEX = {
  parchment: 'assets/three/board/board-parchment-tile.png',
  ocean: 'assets/three/board/board-ocean-tile.png',
  parchmentNormal: 'assets/three/board/board-parchment-normal.png',
  parchmentAO: 'assets/three/board/board-parchment-ao.png',
  oceanNormal: 'assets/three/board/board-ocean-normal.png',
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
let paperNormal = null;
let paperAO = null;
let oceanNormal = null;
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

function canvasTex(canvas, { srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  // Mipmaps average fiber to flat olive at 390 mid. Keep the tooth.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
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

function imageToTex(img, fallbackHex, grainImg = null, { srgb = true } = {}) {
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
  return canvasTex(canvas, { srgb });
}

function bakeOcean(img) {
  // Printed slate-teal paper is already color-locked in the baker.
  // Draw the tile as albedo — a second color crush reads charcoal.
  const size = img ? (img.naturalWidth || img.width || 512) : 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.oceanDeep;
  ctx.fillRect(0, 0, size, size);
  if (img) ctx.drawImage(img, 0, 0, size, size);
  oceanMap = canvasTex(canvas);
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
  const [parchment, ocean, pN, pAO, oN, ...washes] = await Promise.all([
    loadImage(BOARD_TEX.parchment),
    loadImage(BOARD_TEX.ocean),
    loadImage(BOARD_TEX.parchmentNormal),
    loadImage(BOARD_TEX.parchmentAO),
    loadImage(BOARD_TEX.oceanNormal),
    ...names.map((k) => loadImage(WASH_TEX[k])),
  ]);
  paperTex = parchment ? imageToTex(parchment, '#C4B896') : bakeParchment(null);
  oceanMap = bakeOcean(ocean);
  paperNormal = pN ? imageToTex(pN, '#8080ff', null, { srgb: false }) : null;
  paperAO = pAO ? imageToTex(pAO, '#ffffff', null, { srgb: false }) : null;
  oceanNormal = oN ? imageToTex(oN, '#8080ff', null, { srgb: false }) : null;
  landSheets.clear();
  washMaps.clear();
  names.forEach((k, i) => {
    const hex = REGION_WASH[k] || PALETTE.landBase;
    // Stack: parchment+grain → continent wash (baked). Faction is a color tint.
    washMaps.set(k, imageToTex(washes[i], hex));
  });
  return { paperTex, oceanMap, paperNormal, paperAO, oceanNormal };
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
  geometry.setAttribute('uv2', uv.clone());
}

export function regionWashFor(territory) {
  if (!territory) return REGION_WASH.Europe;
  if (USSR_LANDS.has(territory.name)) return REGION_WASH.USSR;
  return REGION_WASH[territory.continent] || PALETTE.landBase;
}

export function landWashHex(ownerHex, regionHex) {
  const base = regionHex || PALETTE.landBase;
  if (!ownerHex) return base;
  return `#${mixHex(base, ownerHex, OWNER_WASH_STRENGTH).toString(16).padStart(6, '0')}`;
}

export function factionWash(owner) {
  return FACTION_WASH[owner] || null;
}

export function plasticColor(owner) {
  return PLASTIC[owner] || '#8E8F8C';
}

export function makeLandMaterials(regionHex, ownerHex, territory) {
  const region = regionHex || PALETTE.landBase;
  const washHex = `#${(ownerHex ? mixHex(region, ownerHex, OWNER_WASH_STRENGTH) : hexColor(region)).toString(16).padStart(6, '0')}`;
  const sideHex = mixHex(region, PALETTE.landShadow, 0.45);
  const key = continentKey(territory);
  const sheet = washMaps.get(key) || bakeLandSheet(washHex);
  // Faction ownership sits ON the continent wash — never 100% replace it.
  const tint = ownerHex ? mixHex('#ffffff', ownerHex, OWNER_WASH_STRENGTH) : 0xffffff;
  const top = new THREE.MeshStandardMaterial({
    map: sheet,
    normalMap: paperNormal || null,
    aoMap: paperAO || null,
    aoMapIntensity: paperAO ? 0.72 : 0,
    color: tint,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.16,
    transparent: false,
    side: THREE.DoubleSide,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
  if (top.normalMap) top.normalScale.set(0.82, 0.82);
  const wall = new THREE.MeshStandardMaterial({
    color: sideHex,
    roughness: 0.88,
    metalness: 0.0,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const seal = new THREE.MeshStandardMaterial({
    map: sheet,
    color: tint,
    roughness: 0.94,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
  });
  return { top, side: wall, bottom: wall, seal };
}

export function makeOceanMaterial() {
  makePaperTexture();
  if (!oceanMap) bakeOcean(null);
  const mat = new THREE.MeshStandardMaterial({
    map: oceanMap,
    normalMap: oceanNormal || null,
    color: 0xffffff,
    roughness: 0.40,
    metalness: 0.16,
    envMapIntensity: 0.62,
    transparent: false,
  });
  if (mat.normalMap) mat.normalScale.set(0.55, 0.55);
  return mat;
}

export function makeFoamMaterial() {
  makePaperTexture();
  return new THREE.MeshStandardMaterial({
    color: 0xd9d2c0,
    map: paperTex,
    transparent: true,
    opacity: 0.22,
    roughness: 0.78,
    metalness: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.18,
  });
}

export function makeOceanMesh(width, height) {
  const geo = new THREE.PlaneGeometry(width, height, 16, 16);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (pos && uv) {
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / OCEAN_UV, -pos.getZ(i) / OCEAN_UV);
    }
    uv.needsUpdate = true;
    geo.setAttribute('uv2', uv.clone());
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
