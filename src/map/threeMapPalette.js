// Preview-only Three.js palette. A&A printed board (AA-HECORRECT-11).
// Continent washes + visible cardboard grain. Not Canvas live art.
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
  oceanDeep: '#7A90A0',
  oceanShelf: '#8AA0AE',
  oceanFog: '#7A90A0',
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
  sky: '#F0E8D4',
  ground: '#8A7A58',
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

export const OCEAN_DEEP = 0x7a90a0;
export const OCEAN_SHELF = 0x8aa0ae;
export const PAPER_UV = 11;
export const OCEAN_UV = 14;
export const GRAIN_STRENGTH = 0.78;

export const BOARD_TEX = {
  parchment: 'assets/three/board/board-parchment-tile.png',
  ocean: 'assets/three/board/board-ocean-tile.png',
};

let paperTex = null;
let oceanMap = null;

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

function addSpeckle(ctx, size, count, alpha) {
  for (let i = 0; i < count; i++) {
    const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1);
    const y = ((Math.sin(i * 78.233) * 93721.1947) % 1);
    const px = Math.abs(x) * size;
    const py = Math.abs(y) * size;
    const shade = i % 4 === 0 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${i % 5 === 0 ? alpha : alpha * 0.55})`;
    ctx.fillRect(px, py, i % 9 === 0 ? 2.1 : 1.15, i % 11 === 0 ? 2.1 : 1.15);
  }
}

function contrastGrain(ctx, size, amount) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.30 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    const v = Math.max(0, Math.min(255, 128 + (l - 128) * amount));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

function bakeParchment(img) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#D8CDA8';
  ctx.fillRect(0, 0, size, size);
  if (img) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = GRAIN_STRENGTH;
    ctx.drawImage(img, 0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  addSpeckle(ctx, size, 9800, 0.12);
  contrastGrain(ctx, size, 3.15);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#8A7A52';
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function bakeOcean(img) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.oceanShelf;
  ctx.fillRect(0, 0, size, size);
  if (img) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.70;
    ctx.drawImage(img, 0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  addSpeckle(ctx, size, 4800, 0.06);
  contrastGrain(ctx, size, 1.85);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export async function loadBoardTextures() {
  if (paperTex && oceanMap) return { paperTex, oceanMap };
  const [parchment, ocean] = await Promise.all([
    loadImage(BOARD_TEX.parchment),
    loadImage(BOARD_TEX.ocean),
  ]);
  paperTex = bakeParchment(parchment);
  oceanMap = bakeOcean(ocean);
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

export function makeLandMaterials(regionHex, ownerHex) {
  const region = regionHex || PALETTE.landBase;
  const wash = ownerHex ? mixHex(region, ownerHex, 0.12) : hexColor(region);
  const side = mixHex(region, PALETTE.landShadow, 0.45);
  const paper = makePaperTexture();
  const top = new THREE.MeshLambertMaterial({
    map: paper,
    color: wash,
    emissive: 0x000000,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const wall = new THREE.MeshLambertMaterial({
    color: side,
    emissive: 0x000000,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const seal = new THREE.MeshLambertMaterial({
    map: paper,
    color: wash,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
  });
  return { top, side: wall, bottom: wall, seal };
}

export function makeOceanMaterial() {
  if (oceanMap) {
    return new THREE.MeshLambertMaterial({
      map: oceanMap,
      color: 0xc8d4dc,
      transparent: false,
    });
  }
  return new THREE.MeshLambertMaterial({
    color: PALETTE.oceanShelf,
    transparent: false,
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
