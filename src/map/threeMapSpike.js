// Timeboxed Three.js map spike. Gated by ?three=1 from main.js.
// Reuses territories.json polygons + continents.json colors + existing #hud.
// Units are placeholder meshes. No SCHEMA / MP / Confirm / HUD rewrite.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { MAP_WIDTH, MAP_HEIGHT } from './camera.js';
import { TerritoryMap } from './territoryMap.js';
import {
  dismissStartupLoader,
  reportStartupError,
  reportStartupStatus,
} from '../ui/startupLoader.js';

const SCALE = 0.1;
const LAND_HEIGHT = 2.2;
const TAP_PX = 8;
const MAX_RING_POINTS = 180;

const FACTION_COLORS = {
  Americans: '#556B2F',
  Germans: '#4A4A4A',
  British: '#B8860B',
  Japanese: '#FF8C00',
  Russians: '#B22222',
  Neutral: '#8B7355',
};

export function isThreeSpikeRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const v = String(new URLSearchParams(search).get('three') || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

// Shape XY (worldX, worldY) then rotateX(-90) → scene (x, height, -worldY).
function worldToScene(x, y) {
  return { x: x * SCALE, z: -y * SCALE };
}

function sceneToWorld(x, z) {
  return { x: x / SCALE, y: -z / SCALE };
}

function simplifyRing(poly, maxPts = MAX_RING_POINTS) {
  if (!poly || poly.length < 3) return null;
  if (poly.length <= maxPts) return poly;
  const step = Math.ceil(poly.length / maxPts);
  const out = [];
  for (let i = 0; i < poly.length; i += step) out.push(poly[i]);
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
  return out.length >= 3 ? out : null;
}

function polygonCentroid(poly) {
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
  return { cx: Math.abs(cx / (6 * area)), cy: Math.abs(cy / (6 * area)), area };
}

function territoryCenter(territory) {
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
  return { x: sx / total, y: sy / total };
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function hexColor(hex, fallback = 0x888888) {
  const n = Number.parseInt(String(hex || '').replace('#', ''), 16);
  return Number.isFinite(n) ? n : fallback;
}

function paintHud(selected) {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const land = selected?.name || 'none — click a land';
  const owner = selected?.originalOwner ? ` · ${selected.originalOwner}` : '';
  hud.innerHTML = `
    <span class="hud-title">Tactical Risk</span>
    <span class="lobby-version-badge">${GAME_VERSION}</span>
    <span class="hud-phase" style="color:#c9a44a">THREE SPIKE</span>
    <span class="hud-current-turn" style="margin-left:auto">
      <span class="hud-turn-info">
        <span class="hud-player-name">${land}${owner}</span>
        <span class="hud-phase-label">SCHEMA ${SCHEMA_VERSION} · Canvas 2D unchanged at /</span>
      </span>
    </span>
  `;
}

function injectSpikeChrome() {
  const style = document.createElement('style');
  style.textContent = `
    #mapCanvas, #minimap, #sidebar { display:none !important; }
    #threeCanvas {
      position:absolute; inset:0; width:100%; height:100%;
      display:block; touch-action:none; cursor:grab;
    }
    #threeCanvas.is-panning { cursor:grabbing; }
    #threeCanvas.is-hovering { cursor:pointer; }
    #three-spike-hint {
      position:absolute; left:16px; bottom:16px; z-index:12;
      max-width:min(420px, calc(100vw - 32px));
      padding:10px 12px; border-radius:8px;
      background:rgba(20,20,40,0.88); color:#e8dcc4;
      font-size:13px; line-height:1.4;
      border:1px solid rgba(201,164,74,0.35);
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);

  const hint = document.createElement('div');
  hint.id = 'three-spike-hint';
  hint.textContent = 'Drag to pan · wheel / pinch to zoom · click or tap a land. Units are placeholder meshes.';
  document.body.appendChild(hint);
}

function makeLandMesh(territory, colorHex) {
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
    depth: LAND_HEIGHT,
    bevelEnabled: false,
  });
  geom.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({
    color: hexColor(colorHex),
    emissive: 0x000000,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.territory = territory;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function addPlaceholderUnits(group, territory, ownerColor) {
  const center = territoryCenter(territory);
  if (!center) return;
  const { x, z } = worldToScene(center.x, center.y);
  const n = 1 + (hashName(territory.name) % 3);
  const color = hexColor(ownerColor);
  for (let i = 0; i < n; i++) {
    const kind = (hashName(territory.name) + i) % 2;
    const geom = kind === 0
      ? new THREE.CylinderGeometry(1.1, 1.3, 4.2, 8)
      : new THREE.BoxGeometry(2.2, 3.4, 2.2);
    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshLambertMaterial({ color }),
    );
    const ox = (i - (n - 1) / 2) * 4.2;
    mesh.position.set(x + ox, LAND_HEIGHT + 2.2, z);
    mesh.userData.territory = territory;
    mesh.userData.placeholderUnit = true;
    group.add(mesh);
  }
}

export async function bootThreeMapSpike() {
  reportStartupStatus('Three.js spike — loading map data…', 30);
  injectSpikeChrome();
  paintHud(null);

  let territories;
  let continents;
  try {
    const [tRes, cRes] = await Promise.all([
      fetch('data/territories.json'),
      fetch('data/continents.json'),
    ]);
    if (!tRes.ok || !cRes.ok) throw new Error('map data fetch failed');
    territories = await tRes.json();
    continents = await cRes.json();
  } catch (err) {
    console.error(err);
    reportStartupError('Three.js spike could not load territory data.');
    return;
  }

  reportStartupStatus('Building Three.js board…', 70);

  const continentColor = new Map();
  for (const c of continents) {
    for (const name of c.territories || []) continentColor.set(name, c.color);
  }

  const lands = territories.filter((t) => !t.isWater);
  const territoryMap = new TerritoryMap(lands);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_WIDTH * SCALE * 1.15, MAP_HEIGHT * SCALE * 1.15),
    new THREE.MeshLambertMaterial({ color: 0x44c5bd }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set((MAP_WIDTH * SCALE) / 2, 0, -(MAP_HEIGHT * SCALE) / 2);
  scene.add(ocean);

  const landGroup = new THREE.Group();
  const pickables = [];
  for (const land of lands) {
    const mesh = makeLandMesh(land, continentColor.get(land.name) || '#7a8b6f');
    if (!mesh) continue;
    landGroup.add(mesh);
    pickables.push(mesh);
    addPlaceholderUnits(landGroup, land, FACTION_COLORS[land.originalOwner] || FACTION_COLORS.Neutral);
  }
  scene.add(landGroup);

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const sun = new THREE.DirectionalLight(0xfff4d6, 0.85);
  sun.position.set(80, 140, 40);
  scene.add(sun);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.id = 'threeCanvas';
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
  const cx = (MAP_WIDTH * SCALE) / 2;
  const cz = -(MAP_HEIGHT * SCALE) / 2;
  // North is +Z (world Y=0). Stand south of the board, light tilt, north-up.
  camera.position.set(cx, 360, cz - 200);
  camera.lookAt(cx, 0, cz);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(cx, 0, cz);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = false;
  controls.minDistance = 48;
  controls.maxDistance = 620;
  controls.zoomSpeed = 0.9;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let selected = null;
  let hovered = null;
  let pointerDown = null;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize);

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickLand(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits[0]?.object?.userData?.territory) return hits[0].object.userData.territory;

    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      const w = sceneToWorld(hitPoint.x, hitPoint.z);
      return territoryMap.hitTest(w.x, w.y);
    }
    return null;
  }

  function paintSelection(next, { hover = false } = {}) {
    if (hover) {
      if (hovered && hovered !== selected) {
        hovered.material.emissive?.setHex(0x000000);
      }
      hovered = null;
      if (next) {
        const mesh = pickables.find((m) => m.userData.territory === next);
        if (mesh && mesh !== selected) {
          mesh.material.emissive.setHex(0x333018);
          hovered = mesh;
        }
      }
      renderer.domElement.classList.toggle('is-hovering', !!next);
      return;
    }

    if (selected) selected.material.emissive.setHex(0x000000);
    selected = null;
    if (next) {
      const mesh = pickables.find((m) => m.userData.territory === next);
      if (mesh) {
        mesh.material.emissive.setHex(0x664400);
        selected = mesh;
      }
    }
    paintHud(next);
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    pointerDown = { x: e.clientX, y: e.clientY };
    renderer.domElement.classList.add('is-panning');
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    renderer.domElement.classList.remove('is-panning');
    if (!pointerDown) return;
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    pointerDown = null;
    if (dx * dx + dy * dy > TAP_PX * TAP_PX) return;
    paintSelection(pickLand(e));
  });

  renderer.domElement.addEventListener('pointercancel', () => {
    pointerDown = null;
    renderer.domElement.classList.remove('is-panning');
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (pointerDown) return;
    paintSelection(pickLand(e), { hover: true });
  });

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  reportStartupStatus('Three.js spike ready', 100);
  dismissStartupLoader();
  console.log(`[three-spike] ${GAME_VERSION} SCHEMA ${SCHEMA_VERSION} lands=${lands.length}`);
}
