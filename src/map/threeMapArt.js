// Canvas-SoT map art + wrap helpers for the ?three=1 preview.
// Reuses map/smallMap.jpeg and base+relief tiles. Does not replace live Canvas.

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { MAP_WIDTH, MAP_HEIGHT } from './camera.js';

export const SCALE = 0.1;
export const WORLD_W = MAP_WIDTH * SCALE;
export const WORLD_H = MAP_HEIGHT * SCALE;
export const BASE_LAND = 1.55;
export const MT_LAND = 2.65;
export const WRAP_COPIES = [-1, 0, 1];

const TILE_SIZE = 256;
const TILE_COLS = 14;
const TILE_ROWS = 8;
const BAKE_W = 1750;
const BAKE_H = 1000;

export function worldToScene(x, y) {
  return { x: x * SCALE, z: -y * SCALE };
}

export function sceneToWorld(x, z) {
  return { x: x / SCALE, y: -z / SCALE };
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
  const canvas = document.createElement('canvas');
  canvas.width = BAKE_W;
  canvas.height = BAKE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#44C5BD';
  ctx.fillRect(0, 0, BAKE_W, BAKE_H);

  const small = await loadImageTimeout('map/smallMap.jpeg', 8000);
  if (small) ctx.drawImage(small, 0, 0, BAKE_W, BAKE_H);

  const sx = BAKE_W / MAP_WIDTH;
  const sy = BAKE_H / MAP_HEIGHT;
  const keys = [];
  for (let col = 0; col < TILE_COLS; col++) {
    for (let row = 0; row < TILE_ROWS; row++) {
      keys.push({ col, row, key: `${col}_${row}` });
    }
  }
  const tiles = await mapPool(keys, 12, async ({ col, row, key }) => {
    const [base, relief] = await Promise.all([
      loadImageTimeout(`map/baseTiles/${key}.png`),
      loadImageTimeout(`map/reliefTiles/${key}.png`),
    ]);
    return { col, row, base, relief };
  });
  let baseCount = 0;
  let reliefCount = 0;
  for (const tile of tiles) {
    if (!tile.base) continue;
    ctx.drawImage(
      tile.base,
      tile.col * TILE_SIZE * sx,
      tile.row * TILE_SIZE * sy,
      TILE_SIZE * sx,
      TILE_SIZE * sy,
    );
    baseCount += 1;
  }
  ctx.globalAlpha = 0.62;
  for (const tile of tiles) {
    if (!tile.relief) continue;
    ctx.drawImage(
      tile.relief,
      tile.col * TILE_SIZE * sx,
      tile.row * TILE_SIZE * sy,
      TILE_SIZE * sx,
      TILE_SIZE * sy,
    );
    reliefCount += 1;
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { texture: tex, hasSmallMap: !!small, baseCount, reliefCount };
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

export function simplifyRing(poly) {
  if (!poly || poly.length < 3) return null;
  const ring = rdp(poly, 1.6);
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
  let hash = 0;
  const str = territory.name || '';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  if ((center?.area || 0) > 3500 && hash % 3 === 0) return MT_LAND;
  if (hash % 3 === 1) return BASE_LAND + 0.22;
  return BASE_LAND;
}

export function makeLandMesh(territory, materials, height) {
  const shapes = [];
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly);
    if (!ring) continue;
    const shape = new THREE.Shape();
    shape.moveTo(ring[0][0] * SCALE, ring[0][1] * SCALE);
    for (let i = 1; i < ring.length; i++) {
      shape.lineTo(ring[i][0] * SCALE, ring[i][1] * SCALE);
    }
    shape.closePath();
    shapes.push(shape);
  }
  if (!shapes.length) return null;

  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  applyWorldUVs(geom);
  const mesh = new THREE.Mesh(geom, [materials.top, materials.side]);
  mesh.userData.territory = territory;
  mesh.userData.landHeight = height;
  return mesh;
}

export function makeLineMat(color, linewidth) {
  return new LineMaterial({
    color,
    linewidth,
    worldUnits: false,
    transparent: true,
    opacity: 0.9,
    depthTest: true,
  });
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
    group.add(line);
  }
}

export function makeBoardTexturePlane(texture) {
  const geo = new THREE.PlaneGeometry(WORLD_W, WORLD_H, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + WORLD_W / 2) / WORLD_W;
    const v = 0.5 + pos.getZ(i) / WORLD_H;
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(WORLD_W / 2, 0.02, -WORLD_H / 2);
  mesh.receiveShadow = false;
  return mesh;
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
  const pad = WORLD_W * 0.02;
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
  const fov = THREE.MathUtils.degToRad(fovDeg || 42);
  const wide = Math.max(aspect || 1, 0.55);
  const wantW = WORLD_W * 1.22;
  const dist = wantW / (2 * Math.tan(fov / 2) * wide * 1.08);
  return THREE.MathUtils.clamp(dist, 210, 420);
}
