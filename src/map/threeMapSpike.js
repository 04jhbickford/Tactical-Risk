// Timeboxed Three.js map spike. Gated by ?three=1 from main.js.
// Reuses territories.json, continents.json, classic setup units, unit icons.
// No SCHEMA / MP / Confirm / HUD rewrite. Preview only.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { MAP_WIDTH, MAP_HEIGHT } from './camera.js';
import { TerritoryMap } from './territoryMap.js';
import { getUnitIconPath, getGenericUnitIconPath } from '../utils/unitIcons.js';
import { formatUnitName } from '../utils/unitNames.js';
import {
  dismissStartupLoader,
  reportStartupError,
  reportStartupStatus,
} from '../ui/startupLoader.js';

const SCALE = 0.1;
const WORLD_W = MAP_WIDTH * SCALE;
const LAND_HEIGHT = 2.4;
const TAP_PX = 8;
const WRAP_COPIES = [-1, 0, 1];
const BORDER_Y = LAND_HEIGHT + 0.12;
const TYPE_SHORT = {
  infantry: 'INF',
  armour: 'TNK',
  artillery: 'ART',
  fighter: 'FTR',
  bomber: 'BMB',
  tacticalBomber: 'TAC',
  transport: 'TRN',
  submarine: 'SUB',
  destroyer: 'DD',
  cruiser: 'CA',
  battleship: 'BB',
  carrier: 'CV',
  factory: 'FAC',
  aaGun: 'AA',
};

const landBorderMat = new THREE.LineBasicMaterial({ color: 0x1a1408 });
const waterBorderMat = new THREE.LineBasicMaterial({ color: 0x0d3f3c });

export function isThreeSpikeRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const v = String(new URLSearchParams(search).get('three') || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function wrapWorldX(x) {
  return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}

function worldToScene(x, y) {
  return { x: x * SCALE, z: -y * SCALE };
}

function sceneToWorld(x, z) {
  return { x: x / SCALE, y: -z / SCALE };
}

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

function simplifyRing(poly) {
  if (!poly || poly.length < 3) return null;
  const ring = rdp(poly, 2.4);
  return ring.length >= 3 ? ring : poly;
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

function paintHud(selected, stacks) {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const land = selected?.name || 'none — click a land or sea';
  const owner = selected?.originalOwner && !selected.isWater ? ` · ${selected.originalOwner}` : '';
  const units = (stacks || [])
    .map((s) => `${formatUnitName(s.type)} ×${s.quantity}`)
    .join(' · ');
  hud.innerHTML = `
    <span class="hud-title">Tactical Risk</span>
    <span class="lobby-version-badge">${GAME_VERSION}</span>
    <span class="hud-phase" style="color:#c9a44a">THREE SPIKE</span>
    <span class="hud-current-turn" style="margin-left:auto">
      <span class="hud-turn-info">
        <span class="hud-player-name">${land}${owner}</span>
        <span class="hud-phase-label">${units || `SCHEMA ${SCHEMA_VERSION} · wrap + typed units`}</span>
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
      max-width:min(520px, calc(100vw - 32px));
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
  hint.textContent = 'Drag to pan (wraps east–west like Canvas) · wheel / pinch zoom · click a land or sea. Icons are INF / TNK / ART / FTR / ships from classic setup.';
  document.body.appendChild(hint);
}

function makeRingLine(ring, y, material) {
  const positions = [];
  for (const [wx, wy] of ring) {
    const p = worldToScene(wx, wy);
    positions.push(p.x, y, p.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineLoop(geo, material);
}

function makeLandMesh(territory, colorHex, materials) {
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
    curveSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, [materials.top, materials.side]);
  mesh.userData.territory = territory;
  return mesh;
}

function addTerritoryInk(group, territory, material, y, offsetX) {
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly);
    if (!ring) continue;
    const line = makeRingLine(ring, y, material);
    line.position.x = offsetX;
    line.userData.territory = territory;
    group.add(line);
  }
}

async function makeUnitTexture(type, owner, quantity, unitDefs) {
  const factionImg = await loadImage(getUnitIconPath(type, owner));
  const genericImg = factionImg ? null : await loadImage(getGenericUnitIconPath(type, unitDefs));
  const img = factionImg || genericImg;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 148;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(12, 14, 24, 0.72)';
  ctx.strokeStyle = 'rgba(244, 234, 212, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 140, 10);
  ctx.fill();
  ctx.stroke();
  if (img) {
    ctx.drawImage(img, 16, 10, 96, 96);
  } else {
    ctx.fillStyle = '#e8dcc4';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(TYPE_SHORT[type] || '?', 64, 70);
  }
  ctx.fillStyle = '#f4ead4';
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(TYPE_SHORT[type] || formatUnitName(type), 64, 128);
  if (quantity > 1) {
    ctx.fillStyle = '#c9a44a';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(`×${quantity}`, 100, 28);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function stacksFor(name, placements) {
  return placements[name] || [];
}

export async function bootThreeMapSpike() {
  reportStartupStatus('Three.js spike — loading map data…', 30);
  injectSpikeChrome();
  paintHud(null, []);

  let territories;
  let continents;
  let setup;
  let unitDefs;
  try {
    const [tRes, cRes, sRes, uRes] = await Promise.all([
      fetch('data/territories.json'),
      fetch('data/continents.json'),
      fetch('data/setup.json'),
      fetch('data/units.json'),
    ]);
    if (!tRes.ok || !cRes.ok || !sRes.ok || !uRes.ok) throw new Error('map data fetch failed');
    territories = await tRes.json();
    continents = await cRes.json();
    setup = await sRes.json();
    unitDefs = await uRes.json();
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
  const placements = setup.classic?.unitPlacements || setup.unitPlacements || {};
  const lands = territories.filter((t) => !t.isWater);
  const waters = territories.filter((t) => t.isWater);
  const territoryMap = new TerritoryMap(territories);
  const landMats = new Map();
  const pickables = [];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141422);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W * 3.2, MAP_HEIGHT * SCALE * 1.2),
    new THREE.MeshBasicMaterial({ color: 0x2aa8a1 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(WORLD_W / 2, 0, -(MAP_HEIGHT * SCALE) / 2);
  scene.add(ocean);

  const board = new THREE.Group();
  scene.add(board);

  for (const land of lands) {
    const fill = continentColor.get(land.name) || '#7a8b6f';
    landMats.set(land.name, {
      top: new THREE.MeshLambertMaterial({
        color: hexColor(fill),
        emissive: 0x000000,
      }),
      side: new THREE.MeshLambertMaterial({
        color: darkenHex(fill, 0.42),
      }),
    });
  }

  const textureCache = new Map();
  async function unitTexture(type, owner, quantity) {
    const key = `${owner}|${type}|${quantity}`;
    if (!textureCache.has(key)) {
      textureCache.set(key, makeUnitTexture(type, owner, quantity, unitDefs));
    }
    return textureCache.get(key);
  }

  for (const copy of WRAP_COPIES) {
    const offsetX = copy * WORLD_W;
    for (const land of lands) {
      const mats = landMats.get(land.name);
      const mesh = makeLandMesh(land, continentColor.get(land.name), mats);
      if (!mesh) continue;
      mesh.position.x = offsetX;
      board.add(mesh);
      pickables.push(mesh);
      addTerritoryInk(board, land, landBorderMat, BORDER_Y, offsetX);
    }
    for (const water of waters) {
      addTerritoryInk(board, water, waterBorderMat, 0.08, offsetX);
    }
  }

  for (const copy of WRAP_COPIES) {
    const offsetX = copy * WORLD_W;
    for (const t of territories) {
      const stacks = stacksFor(t.name, placements);
      if (!stacks.length) continue;
      const center = territoryCenter(t);
      if (!center) continue;
      const { x, z } = worldToScene(center.x, center.y);
      const cols = t.isWater ? 3 : Math.min(4, stacks.length);
      for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];
        const tex = await unitTexture(stack.type, stack.owner, stack.quantity);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: true,
        }));
        const col = i % cols;
        const row = Math.floor(i / cols);
        sprite.scale.set(8.4, 9.6, 1);
        sprite.position.set(
          x + offsetX + (col - (Math.min(cols, stacks.length) - 1) / 2) * 9.2,
          LAND_HEIGHT + 6.2 + row * 8.5,
          z + row * 2.2,
        );
        sprite.userData.territory = t;
        sprite.userData.unitType = stack.type;
        board.add(sprite);
      }
    }
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.92));
  const sun = new THREE.DirectionalLight(0xfff4d6, 0.38);
  sun.position.set(90, 160, 50);
  scene.add(sun);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.id = 'threeCanvas';
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 5000);
  const cx = WORLD_W / 2;
  const cz = -(MAP_HEIGHT * SCALE) / 2;
  camera.position.set(cx, 360, cz - 200);
  camera.lookAt(cx, 0, cz);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(cx, 0, cz);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = false;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.minDistance = 48;
  controls.maxDistance = 720;
  controls.zoomSpeed = 0.9;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let selectedName = null;
  let hoveredName = null;
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

  // Canvas camera.js: no X clamp; renormalize only when x leaves [-W, 2W].
  function wrapPanLikeCanvas() {
    const x = controls.target.x;
    if (x < -WORLD_W || x > WORLD_W * 2) {
      const wrapped = ((x % WORLD_W) + WORLD_W) % WORLD_W;
      const dx = wrapped - x;
      controls.target.x += dx;
      camera.position.x += dx;
    }
  }

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickTerritory(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits[0]?.object?.userData?.territory) return hits[0].object.userData.territory;

    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      const w = sceneToWorld(hitPoint.x, hitPoint.z);
      return territoryMap.hitTest(wrapWorldX(w.x), w.y);
    }
    return null;
  }

  function setLandEmissive(name, hex) {
    const mats = landMats.get(name);
    if (mats?.top?.emissive) mats.top.emissive.setHex(hex);
  }

  function paintSelection(next, { hover = false } = {}) {
    if (hover) {
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x000000);
      hoveredName = next && !next.isWater ? next.name : null;
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x2a2410);
      renderer.domElement.classList.toggle('is-hovering', !!next);
      return;
    }
    if (selectedName) setLandEmissive(selectedName, 0x000000);
    selectedName = next && !next.isWater ? next.name : null;
    if (selectedName) setLandEmissive(selectedName, 0x5a3d00);
    paintHud(next, next ? stacksFor(next.name, placements) : []);
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
    paintSelection(pickTerritory(e));
  });

  renderer.domElement.addEventListener('pointercancel', () => {
    pointerDown = null;
    renderer.domElement.classList.remove('is-panning');
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (pointerDown) return;
    paintSelection(pickTerritory(e), { hover: true });
  });

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    wrapPanLikeCanvas();
    renderer.render(scene, camera);
  }
  tick();

  reportStartupStatus('Three.js spike ready', 100);
  dismissStartupLoader();
  console.log(`[three-spike] ${GAME_VERSION} SCHEMA ${SCHEMA_VERSION} lands=${lands.length} wrap=3`);
}
