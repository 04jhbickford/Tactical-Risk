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
  oceanReef: '#7AADB0',
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
  sky: '#C5D2DC',
  ground: '#24343C',
  key: '#FFE2B0',
  fill: '#7E9AAB',
  cream: '#F0E6D2',
};

// P31 HARD: live Risk bonus continents from data/continents.json (7 groups).
// Muted print hexes — parchment stain, not candy Risk primaries, not Confirm gold fills.
// USSR is NOT a bonus continent (Russia/Ukraine/Karelia are Asia).
export const REGION_WASH = {
  Europe: '#4E7388',
  Asia: '#6A8A3C',
  Africa: '#B08948',
  'Middle East': '#C4A068',
  'North America': '#6A8B6E',
  'South America': '#8A6848',
  Oceania: '#7A7B8A',
  // Leftover tile key only — never remap live bonus groups onto this.
  USSR: '#8A7355',
};
export const LIVE_CONTINENTS = [
  'Europe',
  'Asia',
  'Africa',
  'Middle East',
  'North America',
  'South America',
  'Oceania',
];
export const CONTINENT_WASH_STRENGTH = 0.28;
// Runtime multiply so Europe/USSR/Africa still split at 390 after lighting.
// P23: punch is LOD-invariant — hold at near; do not flatten when dollying in.
export const CONTINENT_CHROMA_PUNCH = 0.42;

export const USSR_LANDS = new Set([
  'Russia',
  'Karelia S.S.R.',
  'Ukraine S.S.R.',
  'Novosibirsk',
  'Evenki National Okrug',
  'Soviet Far East',
  'Mongolia',
]);

// Molded A&A plastic body colors (aa-europe-pieces / risk-board-pieces).
// P29 HARD: tabletop chroma — DE field-grey, SU green, UK khaki-tan,
// US olive, JP orange-red. UK tan stays browner than Confirm gold #C4A35A.
export const PLASTIC = {
  Germans: '#6A6C68',
  Russians: '#2F7A2A',
  British: '#B89050',
  Americans: '#4E6828',
  Japanese: '#D24A1C',
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
export const PAPER_UV = 20;
const PAPER_UV_SHIFT = {
  Europe: [0.00, 0.00],
  USSR: [0.41, 0.17],
  Africa: [0.18, 0.46],
  'Middle East': [0.33, 0.09],
  Asia: [0.22, 0.38],
  'North America': [0.55, 0.12],
  'South America': [0.08, 0.52],
  Oceania: [0.47, 0.29],
};
export const OCEAN_UV = 24;
// Image-gen wash tiles ARE the albedo. Do not flatten to hex + 14% — that
// was the GIS fail. GRAIN_* only feeds the procedural fallback sheet.
export const GRAIN_MULTIPLY = 0.78;
export const GRAIN_STRENGTH = GRAIN_MULTIPLY;
export const OCEAN_GRAIN = 0.50;
export const OCEAN_OPEN_DARKEN = 0.64;
export const TOOTH_STRENGTH = 0.42;
// P26: loud mid tooth / clean near — LOD scales the normal, not the bake.
export const TOOTH_NORMAL_MID = 2.05;
export const TOOTH_NORMAL_NEAR = 1.08;
export const TOOTH_ROUGH_MID = 0.76;
export const TOOTH_ROUGH_NEAR = 0.86;

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
let worldLandMap = null;
const landSheets = new Map();
const washMaps = new Map();

export function setWorldLandMap(tex) {
  worldLandMap = tex || null;
}

export function getPaperImage() {
  return paperTex?.image || grainCanvas || null;
}

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

// Macro cardboard tooth — mid-frequency fibers that read at 390 arm's-length.
// Keep features ≥4px in a 512 tile so near does not turn into 1px speckle.
function bakeGrainField(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const blotchPeriod = 7;
  const fiberPeriod = 18;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const blotch = fbm(x / 68, y / 56, blotchPeriod, 4);
      const fiber = fbm(x / 10, y / 36, fiberPeriod, 3);
      const weave = fbm(x / 7 + 1.3, y / 9 + 0.4, 16, 2);
      const pulp = fbm(x / 24 + 3.1, y / 20 + 1.7, 11, 3);
      const fleck = wrapHash(x, y, size);
      let v = 0.46 + blotch * 0.34 + fiber * 0.28 + (weave - 0.5) * 0.22 + (pulp - 0.5) * 0.10;
      if (fleck > 0.994) v += 0.10;
      if (fleck < 0.008) v -= 0.08;
      v = Math.max(0.18, Math.min(1, v));
      const i = (y * size + x) * 4;
      d[i] = Math.round(214 * v);
      d[i + 1] = Math.round(198 * v);
      d[i + 2] = Math.round(148 * v);
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
  overlayPhoto(ctx, img, size, 0.40, 'multiply');
  // P25: macro paper tooth at 390 mid — punch fiber, not 1px speckle.
  overlayPhoto(ctx, grainCanvas, size, 0.48, 'soft-light');
  overlayPhoto(ctx, grainCanvas, size, TOOTH_STRENGTH, 'overlay');
  overlayPhoto(ctx, grainCanvas, size, 0.22, 'multiply');
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
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.46;
    ctx.drawImage(grainImg, 0, 0, size, size);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.40;
    ctx.drawImage(grainImg, 0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvasTex(canvas, { srgb });
}

function bakeOcean(img) {
  // Printed slate-teal: deep #3D5A66 + shelf #4F6E78 + paper grain.
  if (!grainCanvas) grainCanvas = bakeGrainField(512);
  const size = img ? (img.naturalWidth || img.width || 512) : 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.oceanDeep;
  ctx.fillRect(0, 0, size, size);
  if (img) ctx.drawImage(img, 0, 0, size, size);
  const shelf = ctx.createRadialGradient(size * 0.45, size * 0.42, size * 0.06, size * 0.5, size * 0.5, size * 0.92);
  shelf.addColorStop(0, PALETTE.oceanReef || '#7AADB0');
  shelf.addColorStop(0.22, PALETTE.oceanShelf);
  shelf.addColorStop(0.52, mixHexCss(PALETTE.oceanShelf, PALETTE.oceanDeep, 0.40));
  shelf.addColorStop(0.78, PALETTE.oceanDeep);
  shelf.addColorStop(1, mixHexCss(PALETTE.oceanDeep, '#152428', 0.62));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.90;
  ctx.fillStyle = shelf;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  overlayPhoto(ctx, grainCanvas, size, OCEAN_GRAIN, 'overlay');
  overlayPhoto(ctx, grainCanvas, size, 0.28, 'multiply');
  oceanMap = canvasTex(canvas);
  return oceanMap;
}

function mixHexCss(a, b, t) {
  return `#${mixHex(a, b, t).toString(16).padStart(6, '0')}`;
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
  overlayPhoto(ctx, grainCanvas, size, 0.58, 'multiply');
  overlayPhoto(ctx, grainCanvas, size, TOOTH_STRENGTH, 'soft-light');
  if (paperTex?.image) overlayPhoto(ctx, paperTex.image, size, 0.52, 'soft-light');
  const tex = canvasTex(canvas);
  landSheets.set(key, tex);
  return tex;
}

export function bonusContinent(territory) {
  if (!territory || territory.isWater) return null;
  const key = territory.continent;
  return LIVE_CONTINENTS.includes(key) ? key : 'Europe';
}

function continentKey(territory) {
  // P31: bonus group == live continents.json. Do not remap USSR_LANDS.
  return bonusContinent(territory) || 'Europe';
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
  if (!grainCanvas) grainCanvas = bakeGrainField(512);
  paperTex = parchment ? imageToTex(parchment, '#C4B896', grainCanvas) : bakeParchment(null);
  oceanMap = bakeOcean(ocean);
  paperNormal = pN ? imageToTex(pN, '#8080ff', null, { srgb: false }) : null;
  paperAO = pAO ? imageToTex(pAO, '#ffffff', null, { srgb: false }) : null;
  oceanNormal = oN ? imageToTex(oN, '#8080ff', null, { srgb: false }) : null;
  landSheets.clear();
  washMaps.clear();
  names.forEach((k, i) => {
    const hex = REGION_WASH[k] || PALETTE.landBase;
    // Stack: parchment+grain → continent wash (baked). Faction is a color tint.
    washMaps.set(k, imageToTex(washes[i], hex, grainCanvas));
  });
  return { paperTex, oceanMap, paperNormal, paperAO, oceanNormal };
}

export function makePaperTexture() {
  if (paperTex) return paperTex;
  paperTex = bakeParchment(null);
  return paperTex;
}

export function applyPaperUVs(geometry, territory) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  const key = territory ? continentKey(territory) : 'Europe';
  const [ox, oy] = PAPER_UV_SHIFT[key] || [0, 0];
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / PAPER_UV + ox, -pos.getZ(i) / PAPER_UV + oy);
  }
  uv.needsUpdate = true;
  geometry.setAttribute('uv2', uv.clone());
}

export function regionWashFor(territory) {
  if (!territory) return REGION_WASH.Europe;
  const key = bonusContinent(territory) || 'Europe';
  return REGION_WASH[key] || PALETTE.landBase;
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
  const world = worldLandMap;
  const sheet = world || washMaps.get(key) || bakeLandSheet(washHex);
  // World bake already carries parchment + continent + biome. Owner stays a
  // light wash. P31: a bit more live-continent chroma so bonus groups read.
  const continentTint = mixHex('#ffffff', region, world ? 0.24 : CONTINENT_CHROMA_PUNCH);
  const tint = ownerHex ? mixHex(`#${continentTint.toString(16).padStart(6, '0')}`, ownerHex, world ? 0.08 : OWNER_WASH_STRENGTH) : continentTint;
  const top = new THREE.MeshStandardMaterial({
    map: sheet,
    normalMap: world ? null : (paperNormal || null),
    aoMap: world ? null : (paperAO || null),
    aoMapIntensity: world ? 0 : (paperAO ? 1.08 : 0),
    color: tint,
    roughness: 0.76,
    metalness: 0.0,
    envMapIntensity: 0.14,
    transparent: false,
    side: THREE.DoubleSide,
    emissive: 0xc4b896,
    emissiveIntensity: 0.045,
  });
  if (top.normalMap) top.normalScale.set(TOOTH_NORMAL_MID, TOOTH_NORMAL_MID);
  const wall = new THREE.MeshStandardMaterial({
    color: sideHex,
    roughness: 0.84,
    metalness: 0.0,
    envMapIntensity: 0.18,
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
    metalness: 0.14,
    envMapIntensity: 0.42,
    transparent: false,
    vertexColors: true,
  });
  if (mat.normalMap) mat.normalScale.set(0.92, 0.92);
  return mat;
}

export function makeFoamMaterial() {
  makePaperTexture();
  return new THREE.MeshStandardMaterial({
    color: 0xd9d2c0,
    map: paperTex,
    transparent: true,
    opacity: 0.28,
    roughness: 0.78,
    metalness: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.18,
  });
}

export function makeOceanMesh(width, height) {
  const geo = new THREE.PlaneGeometry(width, height, 32, 24);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  // Print-ink shelf: lighter near Europe/N.Africa, darker toward open sea.
  // Local verts; mesh is later placed at (WORLD_W/2, y, -WORLD_H/2).
  const shelfX = 62;
  const shelfZ = 28;
  for (let i = 0; i < pos.count; i++) {
    if (uv) uv.setXY(i, pos.getX(i) / OCEAN_UV, -pos.getZ(i) / OCEAN_UV);
    const d = Math.hypot(pos.getX(i) - shelfX, pos.getZ(i) - shelfZ);
    const t = Math.min(1, Math.max(0, (d - 28) / 160));
    const shade = 1 - t * OCEAN_OPEN_DARKEN;
    // Printed shelf vs deep — no cyan reef punch (P30 quiet lanes).
    const reef = 1 - t;
    colors[i * 3] = shade * (0.90 + reef * 0.04);
    colors[i * 3 + 1] = shade * (0.93 + reef * 0.05);
    colors[i * 3 + 2] = shade * (0.90 + reef * 0.04);
  }
  if (uv) {
    uv.needsUpdate = true;
    geo.setAttribute('uv2', uv.clone());
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = makeOceanMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.12;
  mesh.renderOrder = 0;
  mesh.receiveShadow = false;
  mesh.userData.kind = 'ocean';
  return mesh;
}

export function applyLodTooth(landMats, band) {
  const near = band === 'near';
  const n = near ? TOOTH_NORMAL_NEAR : TOOTH_NORMAL_MID;
  const r = near ? TOOTH_ROUGH_NEAR : TOOTH_ROUGH_MID;
  if (!landMats) return { n, r, near };
  for (const mats of landMats.values()) {
    if (mats?.top?.normalMap) mats.top.normalScale.set(n, n);
    if (mats?.top) mats.top.roughness = r;
  }
  return { n, r, near };
}

export function hexColorInt(hex) {
  return hexColor(hex);
}

export { hexColor, mixHex };
