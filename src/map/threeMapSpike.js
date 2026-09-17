// Timeboxed Three.js map spike. Gated by ?three=1.
// Preview only. No SCHEMA / MP / Confirm rewrite.

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
const WORLD_H = MAP_HEIGHT * SCALE;
const WRAP_COPIES = [-1, 0, 1];
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
const HEIGHT_BY_CONTINENT = {
  'Asia': 3.5,
  'Europe': 2.7,
  'North America': 2.9,
  'South America': 3.2,
  'Africa': 2.45,
  'Middle East': 2.6,
  'Oceania': 1.65,
};
const FACTION_HEX = {
  Americans: '#6B8E23',
  Germans: '#6A6A6A',
  British: '#DAA520',
  Japanese: '#FF8C00',
  Russians: '#DC143C',
  Neutral: '#8B7355',
};

const inkMat = new THREE.LineBasicMaterial({ color: 0x140e08 });
const inkGold = new THREE.LineBasicMaterial({ color: 0xd4a017 });
const seaInk = new THREE.LineBasicMaterial({ color: 0x0a3331 });
const mtnMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });

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
  const ch = (s) => {
    const av = (a >> s) & 255;
    const bv = (b >> s) & 255;
    return Math.round(av + (bv - av) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function darkenHex(hex, amt) {
  return mixHex(hex, '#000000', amt);
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
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
  const ring = rdp(poly, 1.8);
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

function isPhoneShell() {
  const w = window.innerWidth || 800;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  return w < 720 || (touch && w < 980);
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

function stacksFor(name, placements) {
  return placements[name] || [];
}

function paintHud(selected, stacks, phone) {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const land = selected?.name || 'Tap a land or sea';
  const owner = selected?.originalOwner && !selected.isWater ? selected.originalOwner : '';
  const chips = (stacks || []).map((s) => (
    `<span class="three-chip">${TYPE_SHORT[s.type] || formatUnitName(s.type)} ×${s.quantity}</span>`
  )).join('');
  hud.innerHTML = `
    <span class="hud-title">Tactical Risk</span>
    <span class="lobby-version-badge">${GAME_VERSION}</span>
    <span class="hud-phase" style="color:#c9a44a">THREE SPIKE</span>
    <span class="hud-current-turn three-sel" style="margin-left:auto">
      <span class="hud-turn-info">
        <span class="hud-player-name">${land}${owner ? ` · ${owner}` : ''}</span>
        <span class="hud-phase-label">${chips || `SCHEMA ${SCHEMA_VERSION}`}</span>
      </span>
    </span>
  `;
  hud.classList.toggle('is-phone', !!phone);
}

function injectSpikeChrome(phone) {
  const style = document.createElement('style');
  style.textContent = `
    #mapCanvas, #minimap, #sidebar { display:none !important; }
    #threeCanvas {
      position:absolute; inset:0; width:100%; height:100%;
      display:block; touch-action:none; cursor:grab;
      -webkit-user-select:none; user-select:none;
    }
    #threeCanvas.is-panning { cursor:grabbing; }
    #threeCanvas.is-hovering { cursor:pointer; }
    #hud.is-phone {
      height:auto; min-height:calc(48px + env(safe-area-inset-top, 0px));
      padding: env(safe-area-inset-top, 0px) 12px 8px;
      flex-wrap:wrap; gap:8px; align-items:flex-start;
    }
    #hud .three-chip {
      display:inline-block; margin:2px 4px 0 0; padding:2px 7px;
      border-radius:999px; background:rgba(201,164,74,.18);
      border:1px solid rgba(201,164,74,.4); color:#f4ead4;
      font-size:11px; font-weight:700; letter-spacing:.04em;
    }
    #three-spike-hint {
      position:absolute; left:12px; right:12px;
      bottom:calc(12px + env(safe-area-inset-bottom, 0px)); z-index:12;
      max-width:min(560px, calc(100vw - 24px));
      padding:10px 12px; border-radius:10px;
      background:rgba(12,14,24,0.9); color:#e8dcc4;
      font-size:${phone ? 14 : 13}px; line-height:1.4;
      border:1px solid rgba(201,164,74,0.4);
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);
  const hint = document.createElement('div');
  hint.id = 'three-spike-hint';
  hint.textContent = phone
    ? 'Drag to pan · pinch zoom · tap a land. Map wraps at the Pacific like Canvas.'
    : 'Drag to pan (Pacific wrap) · wheel zoom · click a land. Classic world at distance; wrap copies only near the seam.';
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

function landHeight(land, continent) {
  const base = HEIGHT_BY_CONTINENT[continent] ?? 2.4;
  const h = hashName(land.name);
  return base + (h % 7) * 0.08;
}

function makeLandMesh(territory, materials, height) {
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
    bevelThickness: 0.18,
    bevelSize: 0.12,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, [materials.top, materials.side]);
  mesh.userData.territory = territory;
  mesh.userData.baseHeight = height;
  return mesh;
}

function addInk(group, territory, material, y, store) {
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly);
    if (!ring) continue;
    const line = makeRingLine(ring, y, material);
    line.userData.territory = territory;
    group.add(line);
    store?.push(line);
  }
}

function addMountains(group, land, height) {
  const seed = hashName(land.name);
  if (seed % 3 !== 0) return;
  const center = territoryCenter(land);
  if (!center) return;
  const { x, z } = worldToScene(center.x, center.y);
  const n = 2 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + (seed % 5) * 0.12, 3.2 + (i % 3) * 0.7, 5),
      mtnMat,
    );
    cone.position.set(
      x + ((seed * (i + 1)) % 9) - 4.5,
      height + 1.8,
      z + ((seed * (i + 3)) % 7) - 3.5,
    );
    cone.userData.territory = land;
    group.add(cone);
  }
}

async function makeUnitTexture(type, owner, quantity, unitDefs) {
  const factionImg = await loadImage(getUnitIconPath(type, owner));
  const genericImg = factionImg ? null : await loadImage(getGenericUnitIconPath(type, unitDefs));
  const img = factionImg || genericImg;
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  const pip = FACTION_HEX[owner] || '#c9a44a';
  ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
  ctx.strokeStyle = pip;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(6, 6, 148, 164, 14);
  ctx.fill();
  ctx.stroke();
  if (img) ctx.drawImage(img, 22, 14, 116, 116);
  else {
    ctx.fillStyle = '#f4ead4';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(TYPE_SHORT[type] || '?', 80, 88);
  }
  ctx.fillStyle = '#f4ead4';
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(TYPE_SHORT[type] || formatUnitName(type), 80, 154);
  if (quantity > 1) {
    ctx.fillStyle = '#c9a44a';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`×${quantity}`, 142, 36);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export async function bootThreeMapSpike() {
  const phone = isPhoneShell();
  const tapPx = phone ? 16 : 8;
  reportStartupStatus('Three.js spike — loading map data…', 28);
  injectSpikeChrome(phone);
  paintHud(null, [], phone);

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

  reportStartupStatus('Building the board…', 62);

  const continentOf = new Map();
  const continentColor = new Map();
  for (const c of continents) {
    for (const name of c.territories || []) {
      continentColor.set(name, c.color);
      continentOf.set(name, c.name);
    }
  }
  const placements = setup.classic?.unitPlacements || setup.unitPlacements || {};
  const lands = territories.filter((t) => !t.isWater);
  const waters = territories.filter((t) => t.isWater);
  const territoryMap = new TerritoryMap(territories);
  const landMats = new Map();
  const landInk = new Map();
  const pickables = [];
  const unitSprites = [];
  const wrapGroups = {
    [-1]: new THREE.Group(),
    0: new THREE.Group(),
    1: new THREE.Group(),
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 420, 980);

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W * 4.2, WORLD_H * 2.2),
    new THREE.MeshLambertMaterial({ color: 0x0c1a22 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.set(WORLD_W / 2, -0.8, -WORLD_H / 2);
  scene.add(table);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W * 3.05, WORLD_H * 1.12),
    new THREE.MeshLambertMaterial({ color: 0x2bb3ab }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(WORLD_W / 2, 0, -WORLD_H / 2);
  scene.add(ocean);

  const board = new THREE.Group();
  scene.add(board);
  for (const copy of WRAP_COPIES) {
    wrapGroups[copy].visible = copy === 0;
    board.add(wrapGroups[copy]);
  }

  for (const land of lands) {
    const fill = continentColor.get(land.name) || '#7a8b6f';
    landMats.set(land.name, {
      top: new THREE.MeshLambertMaterial({ color: hexColor(fill), emissive: 0x000000 }),
      side: new THREE.MeshLambertMaterial({ color: darkenHex(fill, 0.48) }),
    });
    landInk.set(land.name, []);
  }

  const textureCache = new Map();
  async function unitTexture(type, owner, quantity) {
    const key = `${owner}|${type}|${quantity}`;
    if (!textureCache.has(key)) textureCache.set(key, makeUnitTexture(type, owner, quantity, unitDefs));
    return textureCache.get(key);
  }

  for (const copy of WRAP_COPIES) {
    const group = wrapGroups[copy];
    const offsetX = copy * WORLD_W;
    for (const land of lands) {
      const continent = continentOf.get(land.name);
      const height = landHeight(land, continent);
      const mesh = makeLandMesh(land, landMats.get(land.name), height);
      if (!mesh) continue;
      mesh.position.x = offsetX;
      group.add(mesh);
      pickables.push(mesh);
      addInk(group, land, inkMat, height + 0.16, landInk.get(land.name));
      for (const line of landInk.get(land.name).slice(-((land.polygons || []).length))) {
        line.position.x = offsetX;
      }
      addMountains(group, land, height);
    }
    for (const child of group.children) {
      if (child.geometry?.type === 'ConeGeometry' && child.userData.placedCopy == null) {
        child.position.x += offsetX;
        child.userData.placedCopy = copy;
      }
    }
    for (const water of waters) {
      addInk(group, water, seaInk, 0.07);
    }
    for (const child of group.children) {
      if (child.isLine && child.userData.territory?.isWater && child.userData.placedCopy == null) {
        child.position.x = offsetX;
        child.userData.placedCopy = copy;
      }
    }
  }

  for (const copy of WRAP_COPIES) {
    const group = wrapGroups[copy];
    const offsetX = copy * WORLD_W;
    for (const t of territories) {
      const stacks = stacksFor(t.name, placements);
      if (!stacks.length) continue;
      const center = territoryCenter(t);
      if (!center) continue;
      const { x, z } = worldToScene(center.x, center.y);
      const cols = Math.min(t.isWater ? 2 : 3, stacks.length);
      const gap = phone ? 7.6 : 6.6;
      for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];
        const tex = await unitTexture(stack.type, stack.owner, stack.quantity);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: true,
          sizeAttenuation: true,
        }));
        const col = i % cols;
        const row = Math.floor(i / cols);
        const h = t.isWater ? 4.2 : (landHeight(t, continentOf.get(t.name)) + 5.4);
        sprite.scale.set(5.6, 6.2, 1);
        sprite.position.set(
          x + offsetX + (col - (Math.min(cols, stacks.length) - 1) / 2) * gap,
          h + row * 6.4,
          z + row * 1.6,
        );
        sprite.userData.territory = t;
        sprite.userData.unitType = stack.type;
        group.add(sprite);
        unitSprites.push(sprite);
      }
    }
  }

  scene.add(new THREE.HemisphereLight(0xe7f3ff, 0x3a2a16, 0.72));
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));
  const sun = new THREE.DirectionalLight(0xfff1d0, 0.72);
  sun.position.set(70, 180, 40);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88b8c8, 0.22);
  fill.position.set(-80, 60, -40);
  scene.add(fill);

  const renderer = new THREE.WebGLRenderer({ antialias: !phone, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.id = 'threeCanvas';
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(phone ? 48 : 40, 1, 1, 5000);
  const cx = WORLD_W / 2;
  const cz = -WORLD_H / 2;
  if (phone) camera.position.set(cx, 430, cz - 90);
  else camera.position.set(cx, 348, cz - 188);
  camera.lookAt(cx, 0, cz);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(cx, 0, cz);
  controls.enableDamping = true;
  controls.dampingFactor = phone ? 0.14 : 0.08;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = false;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.minDistance = phone ? 72 : 48;
  controls.maxDistance = phone ? 780 : 700;
  controls.zoomSpeed = phone ? 1.15 : 0.95;
  controls.panSpeed = phone ? 0.85 : 1;

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

  function wrapPanLikeCanvas() {
    const x = controls.target.x;
    if (x < 0 || x > WORLD_W) {
      const wrapped = ((x % WORLD_W) + WORLD_W) % WORLD_W;
      const dx = wrapped - x;
      controls.target.x += dx;
      camera.position.x += dx;
    }
  }

  function updateWrapVisibility() {
    const dist = camera.position.distanceTo(controls.target);
    const x = controls.target.x;
    const zoomed = dist < (phone ? 300 : 260);
    const nearSeam = x < WORLD_W * 0.2 || x > WORLD_W * 0.8;
    const show = zoomed && nearSeam;
    wrapGroups[-1].visible = show;
    wrapGroups[1].visible = show;
    wrapGroups[0].visible = true;
  }

  function updateUnitScale() {
    const dist = camera.position.distanceTo(controls.target);
    const s = THREE.MathUtils.clamp(3.8 + (300 - dist) * 0.018, 3.4, 7.2);
    for (const sp of unitSprites) sp.scale.set(s, s * 1.1, 1);
  }

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickTerritory(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const visiblePick = pickables.filter((m) => m.visible && m.parent?.visible !== false);
    const hits = raycaster.intersectObjects(visiblePick, false);
    if (hits[0]?.object?.userData?.territory) return hits[0].object.userData.territory;
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      const w = sceneToWorld(hitPoint.x, hitPoint.z);
      return territoryMap.hitTest(wrapWorldX(w.x), w.y);
    }
    return null;
  }

  function setLandLook(name, { emissive, gold }) {
    const mats = landMats.get(name);
    if (mats?.top?.emissive) mats.top.emissive.setHex(emissive);
    for (const line of landInk.get(name) || []) line.material = gold ? inkGold : inkMat;
  }

  function paintSelection(next, { hover = false } = {}) {
    if (hover) {
      if (phone) return;
      if (hoveredName && hoveredName !== selectedName) setLandLook(hoveredName, { emissive: 0x000000, gold: false });
      hoveredName = next && !next.isWater ? next.name : null;
      if (hoveredName && hoveredName !== selectedName) setLandLook(hoveredName, { emissive: 0x2a220c, gold: false });
      renderer.domElement.classList.toggle('is-hovering', !!next);
      return;
    }
    if (selectedName) setLandLook(selectedName, { emissive: 0x000000, gold: false });
    selectedName = next && !next.isWater ? next.name : next?.name || null;
    if (next && !next.isWater) setLandLook(next.name, { emissive: 0x6a4a00, gold: true });
    paintHud(next, next ? stacksFor(next.name, placements) : [], phone);
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
    if (dx * dx + dy * dy > tapPx * tapPx) return;
    paintSelection(pickTerritory(e));
  });
  renderer.domElement.addEventListener('pointercancel', () => {
    pointerDown = null;
    renderer.domElement.classList.remove('is-panning');
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (pointerDown || e.pointerType === 'touch') return;
    paintSelection(pickTerritory(e), { hover: true });
  });

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    wrapPanLikeCanvas();
    updateWrapVisibility();
    updateUnitScale();
    renderer.render(scene, camera);
  }
  tick();

  reportStartupStatus('Three.js spike ready', 100);
  dismissStartupLoader();
  console.log(`[three-spike] ${GAME_VERSION} SCHEMA ${SCHEMA_VERSION} phone=${phone}`);
}
