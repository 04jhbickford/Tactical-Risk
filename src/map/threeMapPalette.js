// Preview-only Three.js palette. Not Canvas live art. No neon teal.
// Warm bone land, deep desaturated ocean, amber reserved for Confirm.

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
  oceanDeep: '#152228',
  oceanShelf: '#2a4046',
  oceanFog: '#152228',
  foam: '#c5d2cc',
  landBone: '#d8cfc0',
  landInk: '#3a3228',
  landBevel: '#8d8274',
  border: '#3d342c',
  waterHair: '#1c3036',
  select: '#d4a84b',
  selectSoft: '#e6c36a',
  confirm: '#c9a44a',
  boneText: '#f3ead6',
  sky: '#e6ddd0',
  ground: '#24302c',
  key: '#fff4e4',
  fill: '#8ea4ae',
};

export const OCEAN_DEEP = 0x152228;
export const OCEAN_SHELF = 0x2a4046;

let paperTex = null;

export function makePaperTexture() {
  if (paperTex) return paperTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.landBone;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 93721.1947) % 1;
    const px = Math.abs(x) * 256;
    const py = Math.abs(y) * 256;
    const shade = i % 5 === 0 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${i % 7 === 0 ? 0.045 : 0.028})`;
    ctx.fillRect(px, py, 1.2, 1.2);
  }
  paperTex = new THREE.CanvasTexture(canvas);
  paperTex.colorSpace = THREE.SRGBColorSpace;
  paperTex.wrapS = THREE.RepeatWrapping;
  paperTex.wrapT = THREE.RepeatWrapping;
  paperTex.anisotropy = 4;
  return paperTex;
}

export function applyPaperUVs(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / 18, -pos.getZ(i) / 18);
  }
  uv.needsUpdate = true;
}

export function landWashHex(ownerHex) {
  if (!ownerHex) return PALETTE.landBone;
  return `#${mixHex(PALETTE.landBone, ownerHex, 0.22).toString(16).padStart(6, '0')}`;
}

export function makeLandMaterials(ownerHex) {
  const wash = mixHex(PALETTE.landBone, ownerHex || PALETTE.landBone, 0.2);
  const side = darkenHex(`#${wash.toString(16).padStart(6, '0')}`, 0.38);
  const paper = makePaperTexture();
  const top = new THREE.MeshStandardMaterial({
    map: paper,
    color: wash,
    roughness: 0.86,
    metalness: 0.02,
    emissive: 0x000000,
    envMapIntensity: 0.2,
  });
  const wall = new THREE.MeshStandardMaterial({
    color: side,
    roughness: 0.92,
    metalness: 0,
    emissive: 0x000000,
  });
  return { top, side: wall, bottom: wall };
}

export function makeOceanMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDeep: { value: new THREE.Color(PALETTE.oceanDeep) },
      uShelf: { value: new THREE.Color(PALETTE.oceanShelf) },
      uCamera: { value: new THREE.Vector3() },
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
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec3 viewDir = normalize(uCamera - vWorld);
        float ndv = max(dot(normalize(vN), viewDir), 0.0);
        float fres = pow(1.0 - ndv, 2.4);
        vec3 col = mix(uDeep, uShelf, fres * 0.48);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: true,
  });
}

export function makeOceanMesh(width, height) {
  const geo = new THREE.PlaneGeometry(width, height, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = makeOceanMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.08;
  mesh.receiveShadow = false;
  mesh.userData.kind = 'ocean';
  return mesh;
}

export function hexColorInt(hex) {
  return hexColor(hex);
}
