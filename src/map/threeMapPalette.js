// Preview-only Three.js palette. Arc A&A printed-board lock (AA-PALETTE.md).
// Parchment land + muted sea tiles. No neon teal. Not live Canvas.

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
  boneText: '#E8E2D4',
  sky: '#E8E2D4',
  ground: '#3A3428',
  key: '#F3E6C8',
  fill: '#8F8468',
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

function cropCenterCanvas(img, frac = 0.58, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const sw = img.width * frac;
  const sh = img.height * frac;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size, size);
  return canvas;
}

function canvasTex(canvas) {
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
    parchment: canvasTex(cropCenterCanvas(parchmentImg, 0.56)),
    ocean: canvasTex(cropCenterCanvas(oceanImg, 0.62)),
  };
  return boardCache;
}

export function makePaperTexture() {
  if (boardCache?.parchment) return boardCache.parchment;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.landBone;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 93721.1947) % 1;
    ctx.fillStyle = `rgba(80,70,40,${i % 7 === 0 ? 0.05 : 0.03})`;
    ctx.fillRect(Math.abs(x) * 256, Math.abs(y) * 256, 1.2, 1.2);
  }
  return canvasTex(canvas);
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
  return `#${mixHex(PALETTE.landBone, ownerHex, 0.18).toString(16).padStart(6, '0')}`;
}

export function factionRim(ownerId, fallbackHex) {
  return FACTION_WASH[ownerId] || fallbackHex || PALETTE.landInk;
}

export function makeLandMaterials(ownerHex, parchment) {
  const wash = mixHex(PALETTE.landBone, ownerHex || PALETTE.landBone, 0.18);
  const side = darkenHex(PALETTE.landBevel, 0.12);
  const paper = parchment || makePaperTexture();
  const top = new THREE.MeshStandardMaterial({
    map: paper,
    color: wash,
    roughness: 0.92,
    metalness: 0,
    emissive: 0x000000,
    envMapIntensity: 0,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const wall = new THREE.MeshStandardMaterial({
    color: side,
    roughness: 0.95,
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
        float fres = pow(1.0 - ndv, 2.8);
        float depth = clamp((abs(vWorld.z) / 240.0), 0.0, 1.0);
        vec3 base = mix(uShelf, uDeep, 0.28 + depth * 0.42 + fres * 0.08);
        if (uHasTile > 0.5) {
          vec3 grain = texture2D(uTile, vWorld.xz * 0.011).rgb;
          base = mix(base, grain * vec3(0.72, 0.82, 0.86), 0.40);
          base = mix(base, uDeep, 0.18 + depth * 0.22);
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
