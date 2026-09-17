// Preview-only Three.js palette. A&A printed-board lock (AA-PALETTE.md).
// Not Canvas live art. No neon teal / cyan coast bloom.

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

function darkenHex(hex, amt) {
  return mixHex(hex, '#000000', amt);
}

export const PALETTE = {
  landBase: '#C4B896',
  landBone: '#C4B896',
  landShadow: '#8F8468',
  landGrain: '#B7AA82',
  landInk: '#3A3428',
  landBevel: '#8F8468',
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
  sky: '#E8E0D0',
  ground: '#8F8468',
  key: '#FFF1DC',
  fill: '#B7AA82',
};

export const FACTION_WASH = {
  Russians: '#8B3A3A',
  Germans: '#5A5A52',
  British: '#4A5C7A',
  Americans: '#5C6B4A',
  Japanese: '#8A6B3A',
};

export const OCEAN_DEEP = 0x3d5a66;
export const OCEAN_SHELF = 0x4f6e78;

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

function makeRepeatTex(image, colorSpace = THREE.SRGBColorSpace) {
  const tex = new THREE.Texture(image);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function bakeParchment(img) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // Lifted print paper so ACES + matte land still reads khaki, not mud.
  ctx.fillStyle = '#D2C6A0';
  ctx.fillRect(0, 0, 512, 512);
  if (img) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.1;
    ctx.drawImage(img, 0, 0, 512, 512);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    for (let i = 0; i < 4200; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 93721.1947) % 1;
      const px = Math.abs(x) * 512;
      const py = Math.abs(y) * 512;
      const shade = i % 5 === 0 ? 255 : 0;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${i % 7 === 0 ? 0.045 : 0.028})`;
      ctx.fillRect(px, py, 1.2, 1.2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export async function loadBoardTextures() {
  if (paperTex && oceanMap) return { paperTex, oceanMap };
  const [parchment, ocean] = await Promise.all([
    loadImage(BOARD_TEX.parchment),
    loadImage(BOARD_TEX.ocean),
  ]);
  paperTex = bakeParchment(parchment);
  oceanMap = ocean ? makeRepeatTex(ocean) : null;
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
    uv.setXY(i, pos.getX(i) / 34, -pos.getZ(i) / 34);
  }
  uv.needsUpdate = true;
}

export function landWashHex(ownerHex) {
  if (!ownerHex) return PALETTE.landBase;
  return `#${mixHex(PALETTE.landBase, ownerHex, 0.18).toString(16).padStart(6, '0')}`;
}

export function factionWash(owner) {
  return FACTION_WASH[owner] || null;
}

export function makeLandMaterials(ownerHex) {
  const wash = mixHex('#D2C6A0', ownerHex || PALETTE.landBase, 0.16);
  const side = hexColor(PALETTE.landShadow);
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
  const seal = new THREE.MeshBasicMaterial({
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
      color: 0x6e8790,
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
      uv.setXY(i, pos.getX(i) / 42, -pos.getZ(i) / 42);
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
