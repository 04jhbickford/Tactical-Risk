// Canvas-SoT geography + wrap helpers for the ?three=1 preview.
// Bone plates + hairline/foam. Does not replace live Canvas.

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { MAP_WIDTH, MAP_HEIGHT } from './camera.js';
import { applyPaperUVs } from './threeMapPalette.js';
import {
  applyWorldLandUVs,
  getWorldLandTex,
  landHeightForTerrain,
  sculptLandRelief,
  makeCoastShelfMaterial,
  RIVERS,
} from './threeMapTerrain.js';

export const SCALE = 0.1;
export const WORLD_W = MAP_WIDTH * SCALE;
export const WORLD_H = MAP_HEIGHT * SCALE;
export const BASE_LAND = 0.76;
export const MT_LAND = 1.82;
export const WRAP_COPIES = [-1, 0, 1];

const TILE_SIZE = 256;
const TILE_COLS = 14;
const TILE_ROWS = 8;
const BAKE_W = 1750;
const BAKE_H = 1000;

export function worldToScene(x, y) {
  // Mirror X so west is left when the camera looks north (UK west of Germany).
  return { x: (MAP_WIDTH - x) * SCALE, z: -y * SCALE };
}

export function sceneToWorld(x, z) {
  return { x: MAP_WIDTH - x / SCALE, y: -z / SCALE };
}

export function wrapWorldX(x) {
  return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}

export function hexColor(hex, fallback = 0x888888) {
  const n = Number.parseInt(String(hex || '').replace('#', ''), 16);
  return Number.isFinite(n) ? n : fallback;
}

export function mixHex(hex, toward, t) {
  const a = hexColor(hex);
  const b = hexColor(toward);
  const mix = (shift) => {
    const av = (a >> shift) & 255;
    const bv = (b >> shift) & 255;
    return Math.round(av + (bv - av) * t);
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

export function darkenHex(hex, amt) {
  return mixHex(hex, '#000000', amt);
}

export function loadImage(src) {
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

function loadImageTimeout(src, timeoutMs = 20000) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      done(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    img.src = src;
  });
}

async function mapPool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

export async function bakeWorldTexture() {
  // Unused on the preview board. Sand fill only — never neon/tile ocean.
  const canvas = document.createElement('canvas');
  canvas.width = BAKE_W;
  canvas.height = BAKE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#C4B896';
  ctx.fillRect(0, 0, BAKE_W, BAKE_H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { texture: tex, hasSmallMap: false, baseCount: 0, reliefCount: 0 };
}

export function applyWorldUVs(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i) / SCALE;
    const wy = -pos.getZ(i) / SCALE;
    uv.setXY(i, wx / MAP_WIDTH, 1 - wy / MAP_HEIGHT);
  }
  uv.needsUpdate = true;
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((p[1] - a[1]) * dx - (p[0] - a[0]) * dy) / len;
}

function rdp(points, epsilon) {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDist(points[i], points[0], points[end]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

export function simplifyRing(poly, epsilon = 0.7) {
  if (!poly || poly.length < 3) return null;
  const ring = rdp(poly, epsilon);
  return ring.length >= 3 ? ring : poly;
}

export function polygonCentroid(poly) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  area = Math.abs(area) / 2;
  if (area === 0) return { cx: 0, cy: 0, area: 0 };
  const factor = 1 / (6 * area);
  return { cx: Math.abs(cx * factor), cy: Math.abs(cy * factor), area };
}

export function territoryCenter(territory) {
  let total = 0;
  let sx = 0;
  let sy = 0;
  for (const poly of territory.polygons || []) {
    if (!poly || poly.length < 3) continue;
    const { cx, cy, area } = polygonCentroid(poly);
    if (area > 0) {
      sx += cx * area;
      sy += cy * area;
      total += area;
    }
  }
  if (total === 0) return null;
  return { x: sx / total, y: sy / total, area: total };
}

export function landHeightFor(territory, center) {
  void center;
  return landHeightForTerrain(territory);
}

function inflateRing(ring, amt) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of ring) {
    cx += x;
    cy += y;
  }
  cx /= ring.length;
  cy /= ring.length;
  return ring.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * amt, y + (dy / len) * amt];
  });
}

function shapeFromRing(ring) {
  const shape = new THREE.Shape();
  shape.moveTo((MAP_WIDTH - ring[0][0]) * SCALE, ring[0][1] * SCALE);
  for (let i = 1; i < ring.length; i++) {
    shape.lineTo((MAP_WIDTH - ring[i][0]) * SCALE, ring[i][1] * SCALE);
  }
  shape.closePath();
  return shape;
}

export function makeLandMesh(territory, materials, height) {
  const shapes = [];
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly, 0.45);
    if (!ring) continue;
    shapes.push(shapeFromRing(inflateRing(ring, 1.4)));
  }
  if (!shapes.length) return null;

  // Soft crease AO — thicker bevel so walls catch the warm key.
  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.20,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  sculptLandRelief(geom, territory, height);
  geom.computeVertexNormals();
  if (getWorldLandTex()) applyWorldLandUVs(geom);
  else applyPaperUVs(geom, territory);
  // r170 ExtrudeGeometry: group 0 = lids (top+bottom), group 1 = walls.
  // [side, top] hid the atlas fiber on 1px edges and left GIS-flat lids.
  const mats = [materials.top, materials.side];
  for (const mat of mats) {
    if (!mat) continue;
    mat.side = THREE.DoubleSide;
    mat.transparent = false;
    mat.depthWrite = true;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;
  }
  const mesh = new THREE.Mesh(geom, mats);
  mesh.userData.territory = territory;
  mesh.userData.landHeight = height;
  mesh.renderOrder = 1;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function makeLandSealMeshes(territory, material) {
  const meshes = [];
  if (!material) return meshes;
  material.side = THREE.DoubleSide;
  material.transparent = false;
  material.depthWrite = true;
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly, 0.35);
    if (!ring) continue;
    const geom = new THREE.ShapeGeometry(shapeFromRing(inflateRing(ring, 2.4)));
    geom.rotateX(-Math.PI / 2);
    if (getWorldLandTex()) applyWorldLandUVs(geom);
    else applyPaperUVs(geom, territory);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.y = 0.05;
    mesh.renderOrder = 1;
    mesh.userData.territory = territory;
    mesh.userData.kind = 'land-seal';
    meshes.push(mesh);
  }
  return meshes;
}

export function makeLineMat(color, linewidth, opacity = 0.72) {
  const mat = new LineMaterial({
    color,
    linewidth,
    worldUnits: false,
    transparent: opacity < 0.99,
    opacity,
    depthTest: true,
    depthWrite: false,
    dashed: false,
  });
  if (typeof window !== 'undefined') {
    mat.resolution.set(window.innerWidth || 1, window.innerHeight || 1);
  }
  return mat;
}

export function makeBorderLine(ring, y, material) {
  const positions = [];
  for (const [wx, wy] of ring) {
    const p = worldToScene(wx, wy);
    positions.push(p.x, y, p.z);
  }
  const first = worldToScene(ring[0][0], ring[0][1]);
  positions.push(first.x, y, first.z);
  const geo = new LineGeometry();
  geo.setPositions(positions);
  const line = new Line2(geo, material);
  line.computeLineDistances();
  return line;
}

export function addTerritoryInk(group, territory, material, y) {
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly);
    if (!ring) continue;
    const line = makeBorderLine(ring, y, material);
    line.userData.territory = territory;
    line.renderOrder = 2;
    group.add(line);
  }
}

export function addFoamCoast(group, territory, material, y = 0.03) {
  if (territory.isWater) return;
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly);
    if (!ring) continue;
    const line = makeBorderLine(ring, y, material);
    line.userData.territory = territory;
    line.userData.kind = 'foam';
    line.renderOrder = 1;
    group.add(line);
  }
}

export function makeFoamBandMeshes(territory, material) {
  const meshes = [];
  if (!material || territory?.isWater) return meshes;
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly, 0.55);
    if (!ring || ring.length < 4) continue;
    const outer = inflateRing(ring, 4.4);
    const inner = inflateRing(ring, 1.1);
    const shape = shapeFromRing(outer);
    const hole = shapeFromRing(inner.slice().reverse());
    shape.holes.push(hole);
    const geom = new THREE.ShapeGeometry(shape, 1);
    geom.rotateX(-Math.PI / 2);
    applyPaperUVs(geom, territory);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.y = 0.07;
    mesh.renderOrder = 2;
    mesh.userData.territory = territory;
    mesh.userData.kind = 'foam-mask';
    meshes.push(mesh);
  }
  return meshes;
}

export function makeCoastAoMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x1a1610,
    transparent: true,
    opacity: 0.22,
    roughness: 1,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0,
  });
}

export { makeCoastShelfMaterial };

export function makeCoastShelfMeshes(territory, material) {
  const meshes = [];
  if (!material || territory?.isWater) return meshes;
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly, 0.6);
    if (!ring || ring.length < 4) continue;
    const outer = inflateRing(ring, 9.6);
    const inner = inflateRing(ring, 2.2);
    const shape = shapeFromRing(outer);
    const hole = shapeFromRing(inner.slice().reverse());
    shape.holes.push(hole);
    const geom = new THREE.ShapeGeometry(shape, 1);
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.y = 0.02;
    mesh.renderOrder = 1;
    mesh.userData.territory = territory;
    mesh.userData.kind = 'coast-shelf';
    meshes.push(mesh);
  }
  return meshes;
}

export function addRiverLines(group, material, y = 0.22) {
  for (const pts of RIVERS) {
    if (!pts || pts.length < 2) continue;
    const positions = [];
    for (const [wx, wy] of pts) {
      const p = worldToScene(wx, wy);
      positions.push(p.x, y, p.z);
    }
    const geo = new LineGeometry();
    geo.setPositions(positions);
    const line = new Line2(geo, material);
    line.computeLineDistances();
    line.renderOrder = 3;
    line.userData.kind = 'river';
    group.add(line);
  }
}

export function makeCoastAoMeshes(territory, material) {
  const meshes = [];
  if (!material || territory?.isWater) return meshes;
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly, 0.6);
    if (!ring || ring.length < 4) continue;
    const outer = inflateRing(ring, 6.2);
    const inner = inflateRing(ring, 0.4);
    const shape = shapeFromRing(outer);
    const hole = shapeFromRing(inner.slice().reverse());
    shape.holes.push(hole);
    const geom = new THREE.ShapeGeometry(shape, 1);
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.y = 0.03;
    mesh.renderOrder = 1;
    mesh.userData.territory = territory;
    mesh.userData.kind = 'coast-ao';
    meshes.push(mesh);
  }
  return meshes;
}

export function makeBoardTexturePlane() {
  // Intentionally empty — a full-map textured quad was the neon-teal
  // rectangle / ghost-tile artifact. Ocean is a scene-level plane now.
  return null;
}

export function createWrapGroups(parent) {
  return WRAP_COPIES.map((copy) => {
    const group = new THREE.Group();
    group.userData.copy = copy;
    group.position.x = copy * WORLD_W;
    parent.add(group);
    return group;
  });
}

export function visibleCopyRange(camera) {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
    [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  const hit = new THREE.Vector3();
  for (const [nx, ny] of ndc) {
    const caster = new THREE.Raycaster();
    caster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    if (caster.ray.intersectPlane(plane, hit)) {
      minX = Math.min(minX, hit.x);
      maxX = Math.max(maxX, hit.x);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { start: 0, end: 0, minX: 0, maxX: WORLD_W };
  }
  const pad = WORLD_W * 0.01;
  const start = Math.floor((minX - pad) / WORLD_W);
  const end = Math.floor((maxX + pad) / WORLD_W);
  return { start, end, minX, maxX };
}

export function syncWrapVisibility(groups, camera) {
  const { start, end } = visibleCopyRange(camera);
  let shown = 0;
  for (const group of groups) {
    const copy = group.userData.copy;
    group.visible = copy >= start && copy <= end;
    if (group.visible) shown += 1;
  }
  return shown;
}

export function wrapPanLikeCanvas(camera, controls) {
  const x = controls.target.x;
  if (x < -WORLD_W || x > WORLD_W * 2) {
    const wrapped = ((x % WORLD_W) + WORLD_W) % WORLD_W;
    const dx = wrapped - x;
    controls.target.x += dx;
    camera.position.x += dx;
  }
  const minZ = -WORLD_H - 8;
  const maxZ = 8;
  let dz = 0;
  if (controls.target.z < minZ) dz = minZ - controls.target.z;
  else if (controls.target.z > maxZ) dz = maxZ - controls.target.z;
  if (dz) {
    controls.target.z += dz;
    camera.position.z += dz;
  }
}

export function maxZoomDistance(aspect, fovDeg) {
  const fov = THREE.MathUtils.degToRad(fovDeg || 40);
  const wide = Math.max(aspect || 1, 0.55);
  const wantW = WORLD_W * 1.04;
  const dist = wantW / (2 * Math.tan(fov / 2) * wide * 1.12);
  return THREE.MathUtils.clamp(dist, 150, 268);
}
