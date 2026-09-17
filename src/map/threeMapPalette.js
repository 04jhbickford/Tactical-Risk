// Preview-only Three.js palette. Viz AA-PALETTE.md hex lock is SoT.
// Do not freestyle. Not live Canvas.

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
  oceanDeep: '#3D5A66',
  oceanShelf: '#4F6E78',
  oceanFog: '#3D5A66',
  foam: '#D9D2C0',
  landBone: '#C4B896',
  landInk: '#3A3428',
  landBevel: '#8F8468',
  landGrain: '#B7AA82',
  border: '#3A3428',
  waterHair: '#3D5A66',
  select: '#C4A35A',
  selectSoft: '#C4A35A',
  confirm: '#C4A35A',
  chitFace: '#F0E6D2',
  chitGlyph: '#2C2820',
  hudPanel: '#1E2420',
  hudInk: '#E8E2D4',
  boneText: '#E8E2D4',
  sky: '#E8E2D4',
  ground: '#8F8468',
  key: '#F0E6D2',
  fill: '#8F8468',
};

export const FACTION_WASH = {
  Russians: '#8B3A3A',
  Germans: '#5A5A52',
  British: '#4A5C7A',
  Americans: '#5C6B4A',
  Japanese: '#8A6B3A',
};

export const WASH_T = 0.18;
export const GRAIN_T = 0.11;
export const OCEAN_DEEP = 0x3d5a66;
export const OCEAN_SHELF = 0x4f6e78;

const PARCHMENT_SRC = 'assets/three/board/board-parchment-tile.png';
const OCEAN_SRC = 'assets/three/board/board-ocean-tile.png';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`board tile missing ${src}`));
    img.src = src;
  });
}

function cropCenter(img, frac, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const sw = img.width * frac;
  const sh = img.height * frac;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size, size);
  return canvas;
}

function bakeLandGrain(parchmentImg) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.landBone;
  ctx.fillRect(0, 0, size, size);
  if (parchmentImg) {
    const src = cropCenter(parchmentImg, 0.56, size);
    ctx.globalAlpha = GRAIN_T;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(src, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = PALETTE.landGrain;
    ctx.globalAlpha = GRAIN_T;
    for (let i = 0; i < 3800; i++) {
      const x = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * size;
      const y = Math.abs((Math.sin(i * 78.233) * 93721.1947) % 1) * size;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function bakeOceanNoise(oceanImg) {
  if (!oceanImg) return null;
  const canvas = cropCenter(oceanImg, 0.62, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

let boardCache = null;

export async function loadBoardTextures() {
  if (boardCache) return boardCache;
  const [parchmentImg, oceanImg] = await Promise.all([
    loadImage(PARCHMENT_SRC),
    loadImage(OCEAN_SRC),
  ]);
  boardCache = {
    parchment: bakeLandGrain(parchmentImg),
    ocean: bakeOceanNoise(oceanImg),
  };
  return boardCache;
}

export function makePaperTexture() {
  if (boardCache?.parchment) return boardCache.parchment;
  return bakeLandGrain(null);
}

export function applyPaperUVs(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / 28, -pos.getZ(i) / 28);
  }
  uv.needsUpdate = true;
}

export function landWashHex(ownerHex) {
  if (!ownerHex) return PALETTE.landBone;
  return `#${mixHex(PALETTE.landBone, ownerHex, WASH_T).toString(16).padStart(6, '0')}`;
}

export function factionRim(ownerId, fallbackHex) {
  return FACTION_WASH[ownerId] || fallbackHex || PALETTE.landInk;
}

export function makeLandMaterials(ownerHex, parchment) {
  const paper = parchment || makePaperTexture();
  const tint = ownerHex ? mixHex('#FFFFFF', ownerHex, WASH_T) : 0xffffff;
  const wash = ownerHex ? mixHex(PALETTE.landBone, ownerHex, WASH_T) : hexColor(PALETTE.landBone);
  const top = new THREE.MeshLambertMaterial({
    map: paper,
    color: tint,
    emissive: 0x000000,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const wall = new THREE.MeshStandardMaterial({
    color: hexColor(PALETTE.landBevel),
    roughness: 0.94,
    metalness: 0,
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

export function makeOceanMaterial(oceanTile) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDeep: { value: new THREE.Color(PALETTE.oceanDeep) },
      uShelf: { value: new THREE.Color(PALETTE.oceanShelf) },
      uCamera: { value: new THREE.Vector3() },
      uTile: { value: oceanTile || null },
      uHasTile: { value: oceanTile ? 1 : 0 },
    },
    vertexShader: `
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uShelf;
      uniform vec3 uCamera;
      uniform sampler2D uTile;
      uniform float uHasTile;
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec3 viewDir = normalize(uCamera - vWorld);
        float ndv = max(dot(normalize(vN), viewDir), 0.0);
        float fres = pow(1.0 - ndv, 3.2);
        float depth = clamp((abs(vWorld.z) / 240.0), 0.0, 1.0);
        vec3 base = mix(uShelf, uDeep, 0.55 + depth * 0.08 + fres * 0.04);
        if (uHasTile > 0.5) {
          float lum = dot(texture2D(uTile, vWorld.xz * 0.008).rgb, vec3(0.30, 0.59, 0.11));
          base *= 0.96 + lum * 0.08;
        }
        gl_FragColor = vec4(base, 1.0);
      }
    `,
    toneMapped: true,
  });
}

export function makeOceanMesh(width, height, oceanTile) {
  const geo = new THREE.PlaneGeometry(width, height, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = makeOceanMaterial(oceanTile);
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
