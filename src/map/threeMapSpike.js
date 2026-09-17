// Timeboxed Three.js map spike. Gated by ?three=1 from main.js.
// Reuses territories.json, continents.json, classic setup units, unit icons.
// No SCHEMA / MP / Confirm / HUD rewrite. Preview only.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
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
const BASE_LAND = 3.4;
const MT_LAND = 9.2;
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

const FACTION_FALLBACK = {
  Russians: '#B22222',
  Germans: '#4A4A4A',
  British: '#B8860B',
  Japanese: '#FF8C00',
  Americans: '#556B2F',
};

// Stolen from Canvas UnitRenderer so the spike stays off the MP/gameState path.
const SEA_ZONE_CENTERS = {
  'West US Sea Zone': { x: 3078, y: 800 },
  'West Canada Sea Zone': { x: 2992, y: 462 },
  'Alaska Sea Zone': { x: 2870, y: 458 },
  'Soviet Far East Sea Zone': { x: 2558, y: 408 },
  'Midway Sea Zone': { x: 2918, y: 630 },
  'Hawaii Sea Zone': { x: 3062, y: 960 },
  'Wake Island Sea Zone': { x: 2764, y: 1003 },
  'Okinawa Sea Zone': { x: 2569, y: 943 },
  'New Zealand Sea Zone': { x: 2964, y: 1658 },
  'South Pacific Sea Zone': { x: 2992, y: 1314 },
  'Solomon Islands Sea Zone': { x: 2778, y: 1288 },
  'Caroline Islands Sea Zone': { x: 2500, y: 1080 },
  'New Guinea Sea Zone': { x: 2566, y: 1306 },
  'North Australia Sea Zone': { x: 2574, y: 1516 },
  'Kwangtung Sea Zone': { x: 2342, y: 862 },
  'French Indo China Sea Zone': { x: 2163, y: 1201 },
  'Borneo Sea Zone': { x: 2318, y: 1364 },
  'East Indies Sea Zone': { x: 1998, y: 1426 },
  'West Australia Sea Zone': { x: 2094, y: 1520 },
  'Indian Ocean Sea Zone': { x: 1688, y: 1186 },
  'Red Sea Zone': { x: 1568, y: 1292 },
  'Mozambique Sea Zone': { x: 1440, y: 1464 },
  'Congo Sea Zone': { x: 784, y: 1474 },
  'Black Sea Zone': { x: 1348, y: 648 },
  'Caspian Sea Zone': { x: 1512, y: 626 },
  'East Mediteranean Sea Zone': { x: 1264, y: 832 },
  'Central Mediteranean Sea Zone': { x: 1132, y: 834 },
  'West Mediteranean Sea Zone': { x: 912, y: 760 },
  'North Sea Zone': { x: 668, y: 232 },
  'Baltic Sea Zone': { x: 1106, y: 342 },
  'West Spain Sea Zone': { x: 638, y: 614 },
  'North Atlantic Sea Zone': { x: 472, y: 890 },
  'West Africa Sea Zone': { x: 624, y: 1236 },
  'North Brazil Sea Zone': { x: 464, y: 1148 },
  'Gulf of Mexico Sea Zone': { x: 3452, y: 924 },
  'Carribean Sea Zone': { x: 266, y: 1086 },
  'West Panama Sea Zone': { x: 54, y: 1200 },
};

const LAND_UNIT_OFFSETS = {
  'Finland Norway': { x: 0, y: -60 },
  'East Canada': { x: 60, y: 0 },
};

export function isThreeSpikeRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const v = String(new URLSearchParams(search).get('three') || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function isCoarsePointer() {
  try {
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 720;
  } catch {
    return window.innerWidth <= 720;
  }
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

function hashName(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
  const ring = rdp(poly, 1.6);
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
  return { x: sx / total, y: sy / total, area: total };
}

function landHeightFor(territory, center) {
  const hash = hashName(territory.name);
  if ((center?.area || 0) > 3500 && hash % 3 === 0) return MT_LAND;
  if (hash % 3 === 1) return BASE_LAND + 0.35;
  return BASE_LAND;
}

function unitAnchor(territory) {
  const sea = SEA_ZONE_CENTERS[territory.name];
  if (territory.isWater && sea) return { x: sea.x, y: sea.y, area: 1 };
  const center = territoryCenter(territory);
  if (!center) return null;
  const off = LAND_UNIT_OFFSETS[territory.name];
  if (off && !territory.isWater) {
    return { x: center.x + off.x, y: center.y + off.y, area: center.area };
  }
  return center;
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
  const land = selected?.name || 'none — tap a land or sea';
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
        <span class="hud-phase-label">${units || `SCHEMA ${SCHEMA_VERSION} · wrap · typed units`}</span>
      </span>
    </span>
  `;
}

function injectSpikeChrome() {
  document.documentElement.classList.add('three-spike');
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
    #three-spike-hint {
      position:absolute; left:max(12px, env(safe-area-inset-left));
      bottom:max(12px, env(safe-area-inset-bottom));
      z-index:12;
      max-width:min(420px, calc(100vw - 88px));
      padding:8px 10px; border-radius:8px;
      background:rgba(16,18,32,0.86); color:#e8dcc4;
      font-size:12px; line-height:1.35;
      border:1px solid rgba(201,164,74,0.35);
      pointer-events:none;
    }
    #three-zoom-controls {
      position:absolute; right:max(12px, env(safe-area-inset-right));
      bottom:max(16px, env(safe-area-inset-bottom));
      z-index:20; display:flex; flex-direction:column; gap:8px;
    }
    #three-zoom-controls button {
      width:44px; height:44px; border-radius:10px;
      border:1px solid rgba(255,255,255,0.25);
      background:rgba(20,24,38,0.88); color:#fff;
      font-size:22px; line-height:1; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    @media (max-width:720px) {
      #three-spike-hint { font-size:11px; max-width:calc(100vw - 76px); }
    }
  `;
  document.head.appendChild(style);

  const hint = document.createElement('div');
  hint.id = 'three-spike-hint';
  hint.textContent = 'Drag / one-finger pan · pinch or +/− zoom · tap land or sea. Wraps east–west like Canvas.';
  document.body.appendChild(hint);

  const zoom = document.createElement('div');
  zoom.id = 'three-zoom-controls';
  zoom.innerHTML = `
    <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
    <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
    <button type="button" data-zoom="fit" aria-label="Fit map">Fit</button>
  `;
  document.body.appendChild(zoom);
  return { hint, zoom };
}

function makeLineMat(color, linewidth) {
  return new LineMaterial({
    color,
    linewidth,
    worldUnits: false,
    transparent: true,
    opacity: 0.96,
    depthTest: true,
  });
}

function makeBorderLine(ring, y, material) {
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

function addTerritoryInk(group, territory, material, y, offsetX) {
  for (const poly of territory.polygons || []) {
    const ring = simplifyRing(poly);
    if (!ring) continue;
    const line = makeBorderLine(ring, y, material);
    line.position.x = offsetX;
    line.userData.territory = territory;
    group.add(line);
  }
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
    bevelSize: 0.16,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, [materials.top, materials.side]);
  mesh.userData.territory = territory;
  mesh.userData.landHeight = height;
  return mesh;
}

function addCheapMountains(group, territory, center, height, offsetX, coneGeo, coneMat) {
  if (!center || center.area < 3500) return;
  const hash = hashName(territory.name);
  if (hash % 3 !== 0) return;
  const count = 2 + (hash % 3);
  const { x, z } = worldToScene(center.x, center.y);
  for (let i = 0; i < count; i++) {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    const ox = ((hash * (i + 3)) % 90) / 8 - 5.5;
    const oz = ((hash * (i + 7)) % 70) / 8 - 4;
    const h = 7.5 + (hash % 5) * 0.7;
    cone.scale.set(1.6 + (i % 2) * 0.45, h / 3.2, 1.6 + (i % 2) * 0.35);
    cone.position.set(x + offsetX + ox, height + (3.2 * cone.scale.y) / 2, z + oz);
    cone.userData.territory = territory;
    group.add(cone);
  }
}

async function makeUnitTexture(type, owner, quantity, unitDefs, ownerColor) {
  const factionImg = await loadImage(getUnitIconPath(type, owner));
  const genericImg = factionImg ? null : await loadImage(getGenericUnitIconPath(type, unitDefs));
  const img = factionImg || genericImg;
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 188;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 160, 188);

  ctx.fillStyle = ownerColor || '#2a2438';
  ctx.beginPath();
  ctx.arc(80, 70, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f3ead2';
  ctx.beginPath();
  ctx.arc(80, 70, 58, 0, Math.PI * 2);
  ctx.fill();

  if (img) {
    ctx.drawImage(img, 18, 8, 124, 124);
  } else {
    ctx.fillStyle = '#1a1420';
    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TYPE_SHORT[type] || '?', 80, 70);
  }

  ctx.fillStyle = 'rgba(18, 16, 24, 0.92)';
  ctx.strokeStyle = ownerColor || '#c9a44a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(22, 142, 116, 38, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4ead4';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TYPE_SHORT[type] || formatUnitName(type), 80, 161);

  if (quantity > 1) {
    ctx.fillStyle = '#c9a44a';
    ctx.beginPath();
    ctx.arc(128, 26, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1420';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#1a1420';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(`×${quantity}`, 128, 27);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function stacksFor(name, placements) {
  return placements[name] || [];
}

export async function bootThreeMapSpike() {
  reportStartupStatus('Three.js spike — loading map data…', 30);
  const chrome = injectSpikeChrome();
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
  const factionColor = new Map();
  for (const f of setup.classic?.factions || setup.factions || []) {
    factionColor.set(f.id, f.color || FACTION_FALLBACK[f.id]);
  }
  const placements = setup.classic?.unitPlacements || setup.unitPlacements || {};
  const lands = territories.filter((t) => !t.isWater);
  const waters = territories.filter((t) => t.isWater);
  const territoryMap = new TerritoryMap(territories);
  const landMats = new Map();
  const landHeights = new Map();
  const pickables = [];
  const selectInk = [];
  const lineMats = [];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10161c);
  scene.fog = new THREE.Fog(0x10161c, 520, 1280);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W * 3.4, WORLD_H * 1.35),
    new THREE.MeshStandardMaterial({
      color: 0x17656a,
      roughness: 0.92,
      metalness: 0.04,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(WORLD_W / 2, -0.02, -WORLD_H / 2);
  scene.add(ocean);

  const shelf = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W * 3.05, WORLD_H * 1.02),
    new THREE.MeshStandardMaterial({
      color: 0x0f4b50,
      roughness: 1,
      metalness: 0,
    }),
  );
  shelf.rotation.x = -Math.PI / 2;
  shelf.position.set(WORLD_W / 2, 0.01, -WORLD_H / 2);
  scene.add(shelf);

  const board = new THREE.Group();
  scene.add(board);

  const landBorderMat = makeLineMat(0x1a1408, 2.15);
  const landRimMat = makeLineMat(0x3a2c14, 1.15);
  const waterBorderMat = makeLineMat(0x0c3c3a, 1.05);
  const selectMat = makeLineMat(0xe8c35a, 3.4);
  lineMats.push(landBorderMat, landRimMat, waterBorderMat, selectMat);

  for (const land of lands) {
    const fill = continentColor.get(land.name) || '#7a8b6f';
    landMats.set(land.name, {
      top: new THREE.MeshStandardMaterial({
        color: darkenHex(fill, 0.06),
        roughness: 0.84,
        metalness: 0.03,
        emissive: 0x000000,
      }),
      side: new THREE.MeshStandardMaterial({
        color: darkenHex(fill, 0.5),
        roughness: 0.9,
        metalness: 0.02,
      }),
    });
  }

  const coneGeo = new THREE.ConeGeometry(1.55, 3.2, 5);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x5c4634,
    roughness: 0.94,
    metalness: 0.02,
  });

  const textureCache = new Map();
  async function unitTexture(type, owner, quantity) {
    const key = `${owner}|${type}|${quantity}`;
    if (!textureCache.has(key)) {
      textureCache.set(
        key,
        makeUnitTexture(type, owner, quantity, unitDefs, factionColor.get(owner) || FACTION_FALLBACK[owner]),
      );
    }
    return textureCache.get(key);
  }

  for (const copy of WRAP_COPIES) {
    const offsetX = copy * WORLD_W;
    for (const land of lands) {
      const center = territoryCenter(land);
      const height = landHeightFor(land, center);
      landHeights.set(land.name, height);
      const mesh = makeLandMesh(land, landMats.get(land.name), height);
      if (!mesh) continue;
      mesh.position.x = offsetX;
      board.add(mesh);
      pickables.push(mesh);
      addTerritoryInk(board, land, landBorderMat, height + 0.14, offsetX);
      addTerritoryInk(board, land, landRimMat, height + 0.22, offsetX);
      addCheapMountains(board, land, center, height, offsetX, coneGeo, coneMat);
    }
    for (const water of waters) {
      addTerritoryInk(board, water, waterBorderMat, 0.06, offsetX);
    }
  }

  const unitSprites = [];
  for (const copy of WRAP_COPIES) {
    const offsetX = copy * WORLD_W;
    for (const t of territories) {
      const stacks = stacksFor(t.name, placements);
      if (!stacks.length) continue;
      const center = unitAnchor(t);
      if (!center) continue;
      const { x, z } = worldToScene(center.x, center.y);
      const crowded = stacks.length >= 3;
      const cols = Math.min(t.isWater || crowded ? 3 : 2, stacks.length);
      const tokenW = crowded ? 8.1 : (t.isWater ? 9.2 : 10.0);
      const tokenH = crowded ? 9.5 : (t.isWater ? 10.8 : 11.7);
      const gapX = tokenW + 1.9;
      const gapZ = crowded ? 4.0 : 3.4;
      const height = t.isWater ? 0.4 : (landHeights.get(t.name) || BASE_LAND);
      for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];
        const tex = await unitTexture(stack.type, stack.owner, stack.quantity);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: true,
          depthWrite: false,
        }));
        const col = i % cols;
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, stacks.length - row * cols);
        sprite.scale.set(tokenW, tokenH, 1);
        sprite.position.set(
          x + offsetX + (col - (inRow - 1) / 2) * gapX,
          height + 7.2 + row * 6.4,
          z + row * gapZ,
        );
        sprite.renderOrder = 4;
        sprite.userData.territory = t;
        sprite.userData.unitType = stack.type;
        sprite.userData.baseScale = { x: tokenW, y: tokenH };
        board.add(sprite);
        unitSprites.push(sprite);
      }
    }
  }

  scene.add(new THREE.HemisphereLight(0xc8d6ea, 0x3a2a18, 0.72));
  const sun = new THREE.DirectionalLight(0xfff1d0, 0.78);
  sun.position.set(120, 210, 80);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8eb4c8, 0.22);
  fill.position.set(-80, 90, -40);
  scene.add(fill);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.id = 'threeCanvas';
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.14;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = false;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.touches.TWO = THREE.TOUCH.DOLLY;
  controls.minDistance = 42;
  controls.maxDistance = 780;
  controls.zoomSpeed = isCoarsePointer() ? 1.15 : 0.95;
  controls.panSpeed = isCoarsePointer() ? 1.45 : 1.05;

  function frameBoard() {
    const phone = isCoarsePointer();
    const cx = WORLD_W / 2;
    const cz = -WORLD_H / 2;
    camera.fov = phone ? 46 : 40;
    camera.updateProjectionMatrix();
    camera.position.set(cx, phone ? 248 : 210, cz - (phone ? 168 : 132));
    controls.target.set(cx, 0, cz);
    controls.update();
  }

  function resizeLineMats(w, h) {
    for (const mat of lineMats) mat.resolution.set(w, h);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    resizeLineMats(w, h);
    controls.zoomSpeed = isCoarsePointer() ? 1.15 : 0.95;
    controls.panSpeed = isCoarsePointer() ? 1.45 : 1.05;
  }
  frameBoard();
  resize();
  window.addEventListener('resize', resize);

  function wrapPanLikeCanvas() {
    const x = controls.target.x;
    if (x < -WORLD_W || x > WORLD_W * 2) {
      const wrapped = ((x % WORLD_W) + WORLD_W) % WORLD_W;
      const dx = wrapped - x;
      controls.target.x += dx;
      camera.position.x += dx;
    }
    const minZ = -WORLD_H - 10;
    const maxZ = 10;
    let dz = 0;
    if (controls.target.z < minZ) dz = minZ - controls.target.z;
    else if (controls.target.z > maxZ) dz = maxZ - controls.target.z;
    if (dz) {
      controls.target.z += dz;
      camera.position.z += dz;
    }
  }

  function dollyBy(factor) {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const next = dir.multiplyScalar(factor);
    const dist = next.length();
    if (dist < controls.minDistance || dist > controls.maxDistance) return;
    camera.position.copy(controls.target).add(next);
  }

  chrome.zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
  chrome.zoom.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.zoom === 'fit') frameBoard();
    else if (btn.dataset.zoom === 'in') dollyBy(0.82);
    else dollyBy(1.22);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let selectedName = null;
  let hoveredName = null;
  const pointers = new Map();
  let gesturePinch = false;
  let maxPointers = 0;

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

  function clearSelectInk() {
    for (const line of selectInk.splice(0)) {
      board.remove(line);
      line.geometry?.dispose?.();
    }
  }

  function drawSelectInk(territory) {
    clearSelectInk();
    if (!territory || territory.isWater) return;
    const y = (landHeights.get(territory.name) || BASE_LAND) + 0.38;
    for (const copy of WRAP_COPIES) {
      const offsetX = copy * WORLD_W;
      for (const poly of territory.polygons || []) {
        const ring = simplifyRing(poly);
        if (!ring) continue;
        const line = makeBorderLine(ring, y, selectMat);
        line.position.x = offsetX;
        line.renderOrder = 3;
        board.add(line);
        selectInk.push(line);
      }
    }
  }

  function tokenZoom() {
    const dist = camera.position.distanceTo(controls.target);
    return THREE.MathUtils.clamp(dist / 210, 0.72, 1.55);
  }

  function pulseUnits(name, on) {
    const zoom = tokenZoom();
    for (const sprite of unitSprites) {
      const base = sprite.userData.baseScale;
      if (!base) continue;
      const match = on && sprite.userData.territory?.name === name;
      const s = zoom * (match ? 1.1 : 1);
      sprite.scale.set(base.x * s, base.y * s, 1);
    }
  }

  function paintSelection(next, { hover = false } = {}) {
    if (hover) {
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x000000);
      hoveredName = next && !next.isWater ? next.name : null;
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x2f2610);
      renderer.domElement.classList.toggle('is-hovering', !!next);
      return;
    }
    if (selectedName) setLandEmissive(selectedName, 0x000000);
    pulseUnits(selectedName, false);
    selectedName = next && !next.isWater ? next.name : null;
    if (selectedName) setLandEmissive(selectedName, 0x6a4300);
    pulseUnits(selectedName, true);
    drawSelectInk(next && !next.isWater ? next : null);
    paintHud(next, next ? stacksFor(next.name, placements) : []);
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    maxPointers = Math.max(maxPointers, pointers.size);
    if (pointers.size >= 2) gesturePinch = true;
    renderer.domElement.classList.add('is-panning');
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    const rec = pointers.get(e.pointerId);
    if (rec) {
      rec.x = e.clientX;
      rec.y = e.clientY;
      return;
    }
    if (!isCoarsePointer()) paintSelection(pickTerritory(e), { hover: true });
  });

  function endPointer(e) {
    const start = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size === 0) renderer.domElement.classList.remove('is-panning');
    if (!start) return;
    const slop = e.pointerType === 'touch' ? 16 : 8;
    const dx = e.clientX - start.sx;
    const dy = e.clientY - start.sy;
    const pinched = gesturePinch || maxPointers >= 2;
    if (pointers.size === 0) {
      const allowTap = !pinched && (dx * dx + dy * dy) <= slop * slop;
      gesturePinch = false;
      maxPointers = 0;
      if (allowTap) paintSelection(pickTerritory(e));
    }
  }

  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      gesturePinch = false;
      maxPointers = 0;
      renderer.domElement.classList.remove('is-panning');
    }
  });

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    wrapPanLikeCanvas();
    pulseUnits(selectedName, true);
    renderer.render(scene, camera);
  }
  tick();

  reportStartupStatus('Three.js spike ready', 100);
  dismissStartupLoader();
  console.log(`[three-spike] ${GAME_VERSION} SCHEMA ${SCHEMA_VERSION} lands=${lands.length} wrap=3 polish`);
}
