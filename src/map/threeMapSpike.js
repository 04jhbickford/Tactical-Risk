// Timeboxed Three.js map preview. Gated by ?three=1 from main.js.
// Canvas SoT coords + wrap. Bone/ocean art. Preview only — do not replace live Canvas.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { TerritoryMap } from './territoryMap.js';
import {
  WORLD_W,
  WORLD_H,
  BASE_LAND,
  WRAP_COPIES,
  worldToScene,
  sceneToWorld,
  wrapWorldX,
  makeLandMesh,
  makeLineMat,
  addTerritoryInk,
  createWrapGroups,
  syncWrapVisibility,
  wrapPanLikeCanvas,
  maxZoomDistance,
  territoryCenter,
  landHeightFor,
  simplifyRing,
  makeBorderLine,
} from './threeMapArt.js';
import { PALETTE, makeLandMaterials, makeOceanMesh } from './threeMapPalette.js';
import { makeChitTexture, makePipTexture } from './threeMapChits.js';
import { injectThreeChrome, shortType } from './threeMapChrome.js';
import {
  dismissStartupLoader,
  reportStartupError,
  reportStartupStatus,
} from '../ui/startupLoader.js';

const FACTION_FALLBACK = {
  Russians: '#B22222',
  Germans: '#4A4A4A',
  British: '#B8860B',
  Japanese: '#FF8C00',
  Americans: '#556B2F',
};

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

const LABEL_OFFSETS = {
  'Eire': { x: 0, y: -18 },
  'United Kingdom': { x: 0, y: -18 },
  'Germany': { x: 0, y: -16 },
  'West Europe': { x: 0, y: -14 },
  'South Europe': { x: 8, y: 12 },
  'East Europe': { x: 0, y: -14 },
  'Ukraine S.S.R.': { x: 10, y: -16 },
  'Anglo Sudan Egypt': { x: 0, y: 18 },
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

function stacksFor(name, placements) {
  return placements[name] || [];
}

function stackTotal(stacks) {
  return stacks.reduce((n, s) => n + (s.quantity || 0), 0);
}

function stackOwner(stacks, territory) {
  return stacks[0]?.owner || territory.originalOwner || 'Russians';
}

function chitTextureFor(type, ownerColor, quantity) {
  return makeChitTexture(type, ownerColor, quantity, shortType(type));
}

function makeLabelTexture(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 320, 64);
  ctx.font = '600 20px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(21, 34, 40, 0.72)';
  ctx.lineWidth = 4;
  ctx.strokeText(name, 160, 32);
  ctx.fillStyle = '#efe6d6';
  ctx.fillText(name, 160, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function bootThreeMapSpike() {
  reportStartupStatus('Three.js spike — loading map data…', 28);
  const chrome = injectThreeChrome({ seat: 'Russians', ipc: 24, phase: 'PLACE' });

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

  const factionColor = new Map();
  for (const f of setup.classic?.factions || setup.factions || []) {
    factionColor.set(f.id, f.color || FACTION_FALLBACK[f.id]);
  }
  const owners = setup.classic?.territoryOwners || {};
  const placements = setup.classic?.unitPlacements || setup.unitPlacements || {};
  const lands = territories.filter((t) => !t.isWater);
  const territoryMap = new TerritoryMap(territories);
  const landMats = new Map();
  const landHeights = new Map();
  const pickables = [];
  const selectInk = [];
  const lineMats = [];
  const unitRecords = [];

  const russians = setup.classic?.factions?.find((f) => f.id === 'Russians');
  chrome.setSeat('Russians', russians?.color || FACTION_FALLBACK.Russians);
  chrome.setIpc(russians?.startingPUs || 24);

  const egypt = lands.find((t) => t.name === 'Anglo Sudan Egypt');
  const germany = lands.find((t) => t.name === 'Germany');
  const canada = lands.find((t) => t.name === 'East Canada');
  const egyptC = egypt && territoryCenter(egypt);
  const germanyC = germany && territoryCenter(germany);
  const canadaC = canada && territoryCenter(canada);
  const africaSouthOfEurope = egyptC && germanyC && egyptC.y > germanyC.y + 200;
  const africaNotUnderNA = egyptC && canadaC && egyptC.x > canadaC.x + 400;
  console.log('[three-spike] geo SoT', {
    egypt: egyptC,
    germany: germanyC,
    eastCanada: canadaC,
    africaSouthOfEurope,
    africaNotUnderNA,
    continents: continents.length,
    unitTypes: Object.keys(unitDefs || {}).length,
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.oceanDeep);
  scene.fog = new THREE.Fog(PALETTE.oceanFog, 780, 1500);

  const ocean = makeOceanMesh(WORLD_W * 5.2, WORLD_H * 2.4);
  ocean.position.set(WORLD_W / 2, -0.08, -WORLD_H / 2);
  scene.add(ocean);

  const board = new THREE.Group();
  scene.add(board);
  const wrapGroups = createWrapGroups(board);

  const landBorderMat = makeLineMat(PALETTE.border, 0.7, 0.5);
  const selectMat = makeLineMat(PALETTE.select, 1.55, 0.92);
  lineMats.push(landBorderMat, selectMat);

  for (const land of lands) {
    const owner = owners[land.name] || land.originalOwner;
    const ownerHex = factionColor.get(owner) || FACTION_FALLBACK[owner] || PALETTE.landBone;
    landMats.set(land.name, makeLandMaterials(ownerHex));
  }

  const textureCache = new Map();
  function chitTexture(type, owner, quantity) {
    const key = `chit|${owner}|${type}|${quantity}`;
    if (!textureCache.has(key)) {
      textureCache.set(
        key,
        chitTextureFor(type, factionColor.get(owner) || FACTION_FALLBACK[owner], quantity),
      );
    }
    return textureCache.get(key);
  }
  function pipTexture(owner, total) {
    const key = `pip|${owner}|${total}`;
    if (!textureCache.has(key)) {
      textureCache.set(key, makePipTexture(factionColor.get(owner) || FACTION_FALLBACK[owner], total));
    }
    return textureCache.get(key);
  }
  function labelTexture(name) {
    const key = `label|${name}`;
    if (!textureCache.has(key)) textureCache.set(key, makeLabelTexture(name));
    return textureCache.get(key);
  }

  reportStartupStatus('Building Three.js board…', 62);
  for (const group of wrapGroups) {
    for (const land of lands) {
      const center = territoryCenter(land);
      const height = landHeightFor(land, center);
      landHeights.set(land.name, height);
      const mesh = makeLandMesh(land, landMats.get(land.name), height);
      if (!mesh) continue;
      group.add(mesh);
      pickables.push(mesh);
      addTerritoryInk(group, land, landBorderMat, height + 0.05);
    }
  }

  for (const group of wrapGroups) {
    for (const t of territories) {
      const stacks = stacksFor(t.name, placements);
      if (!stacks.length) continue;
      const center = unitAnchor(t);
      if (!center) continue;
      const { x, z } = worldToScene(center.x, center.y);
      const height = t.isWater ? 0.4 : (landHeights.get(t.name) || BASE_LAND);
      const owner = stackOwner(stacks, t);
      const total = stackTotal(stacks);
      const expanded = [];
      const cols = Math.min(t.isWater || stacks.length >= 3 ? 3 : 2, stacks.length);
      const tokenW = 7.4;
      const tokenH = 7.4;
      for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];
        const tex = chitTexture(stack.type, stack.owner, stack.quantity);
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
          x + (col - (inRow - 1) / 2) * (tokenW + 1.6),
          height + 5.4 + row * 5.2,
          z + row * 3.2,
        );
        sprite.renderOrder = 4;
        sprite.userData.territory = t;
        sprite.userData.unitType = stack.type;
        sprite.userData.kind = 'chit';
        group.add(sprite);
        expanded.push(sprite);
      }

      const pipTex = pipTexture(owner, total);
      const pip = new THREE.Sprite(new THREE.SpriteMaterial({
        map: pipTex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      }));
      pip.scale.set(6.4, 6.4, 1);
      pip.position.set(x, height + 5.0, z);
      pip.renderOrder = 5;
      pip.userData.territory = t;
      pip.userData.kind = 'pip';
      pip.visible = false;
      group.add(pip);

      let label = null;
      if (!t.isWater) {
        const labTex = labelTexture(t.name);
        label = new THREE.Sprite(new THREE.SpriteMaterial({
          map: labTex,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }));
        const lo = LABEL_OFFSETS[t.name] || { x: 0, y: -36 };
        const lp = worldToScene(center.x + lo.x, center.y + lo.y);
        label.scale.set(24, 4.8, 1);
        label.position.set(lp.x, height + 3.2, lp.z);
        label.renderOrder = 6;
        label.userData.territory = t;
        label.userData.kind = 'label';
        group.add(label);
      }

      unitRecords.push({
        territory: t,
        stacks,
        expanded,
        pip,
        label,
        center,
      });
    }
  }

  scene.add(new THREE.HemisphereLight(PALETTE.sky, PALETTE.ground, 0.95));
  const sun = new THREE.DirectionalLight(PALETTE.key, 0.42);
  sun.position.set(30, 240, 12);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(PALETTE.fill, 0.12);
  fill.position.set(-90, 90, -40);
  scene.add(fill);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.domElement.id = 'threeCanvas';
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
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
  controls.minDistance = 38;
  controls.maxDistance = 268;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = 0.42;
  controls.minAzimuthAngle = Math.PI;
  controls.maxAzimuthAngle = Math.PI;
  controls.zoomSpeed = isCoarsePointer() ? 1.15 : 0.95;
  controls.panSpeed = isCoarsePointer() ? 1.45 : 1.05;

  function applyZoomCap() {
    const cap = maxZoomDistance(camera.aspect, camera.fov);
    controls.maxDistance = cap;
    const dist = camera.position.distanceTo(controls.target);
    if (dist > cap) {
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setLength(cap);
      camera.position.copy(controls.target).add(dir);
    }
  }

  function frameEuropeAfrica() {
    const phone = isCoarsePointer();
    // Med / Egypt / Germany. Overhead so south walls are not camera-facing slabs.
    const focus = worldToScene(1160, 860);
    camera.fov = phone ? 42 : 36;
    camera.updateProjectionMatrix();
    const lift = phone ? 196 : 176;
    const south = phone ? 26 : 20;
    camera.position.set(focus.x, lift, focus.z - south);
    controls.target.set(focus.x, 0, focus.z);
    applyZoomCap();
    controls.update();
  }

  function frameWorld() {
    const phone = isCoarsePointer();
    const cx = WORLD_W / 2;
    const cz = -WORLD_H / 2;
    camera.fov = phone ? 42 : 36;
    camera.updateProjectionMatrix();
    const cap = maxZoomDistance(camera.aspect, camera.fov);
    camera.position.set(cx, Math.min(cap * 0.86, phone ? 220 : 200), cz - Math.min(cap * 0.14, phone ? 32 : 24));
    controls.target.set(cx, 0, cz);
    applyZoomCap();
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
    applyZoomCap();
    controls.zoomSpeed = isCoarsePointer() ? 1.15 : 0.95;
    controls.panSpeed = isCoarsePointer() ? 1.45 : 1.05;
  }
  resize();
  frameEuropeAfrica();
  window.addEventListener('resize', resize);

  function dollyBy(factor) {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const next = dir.multiplyScalar(factor);
    const dist = next.length();
    if (dist < controls.minDistance || dist > controls.maxDistance) return;
    camera.position.copy(controls.target).add(next);
  }

  chrome.zoom.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.zoom === 'fit') frameEuropeAfrica();
    else if (btn.dataset.zoom === 'in') dollyBy(0.82);
    else dollyBy(1.22);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let selectedName = null;
  let selectedUnitType = null;
  let confirmed = false;
  let hoveredName = null;
  const pointers = new Map();
  let gesturePinch = false;
  let maxPointers = 0;
  let denseMode = null;

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickTerritory(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const spriteHits = raycaster.intersectObjects(
      unitRecords.flatMap((r) => [...r.expanded, r.pip].filter((s) => s.visible)),
      false,
    );
    if (spriteHits[0]?.object?.userData?.territory) {
      return {
        territory: spriteHits[0].object.userData.territory,
        unitType: spriteHits[0].object.userData.unitType || null,
      };
    }
    const hits = raycaster.intersectObjects(pickables.filter((m) => m.visible && m.parent?.visible), false);
    if (hits[0]?.object?.userData?.territory) {
      return { territory: hits[0].object.userData.territory, unitType: null };
    }
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      const w = sceneToWorld(hitPoint.x, hitPoint.z);
      const t = territoryMap.hitTest(wrapWorldX(w.x), w.y);
      return t ? { territory: t, unitType: null } : null;
    }
    return null;
  }

  function setLandEmissive(name, hex) {
    const mats = landMats.get(name);
    if (mats?.top?.emissive) mats.top.emissive.setHex(hex);
  }

  function clearSelectInk() {
    for (const line of selectInk.splice(0)) {
      line.parent?.remove(line);
      line.geometry?.dispose?.();
    }
  }

  function drawSelectInk(territory) {
    clearSelectInk();
    if (!territory || territory.isWater) return;
    const y = (landHeights.get(territory.name) || BASE_LAND) + 0.28;
    for (const group of wrapGroups) {
      if (!group.visible) continue;
      for (const poly of territory.polygons || []) {
        const ring = simplifyRing(poly);
        if (!ring) continue;
        const line = makeBorderLine(ring, y, selectMat);
        line.renderOrder = 4;
        group.add(line);
        selectInk.push(line);
      }
    }
  }

  function isDense() {
    const dist = camera.position.distanceTo(controls.target);
    return dist > 72;
  }

  function syncDensity() {
    const next = isDense();
    const force = denseMode === null;
    if (!force && next === denseMode) {
      for (const rec of unitRecords) {
        const expand = rec.territory.name === selectedName || !next;
        rec.pip.visible = !expand;
        for (const s of rec.expanded) s.visible = expand;
        if (rec.label) {
          rec.label.visible = !rec.territory.isWater
            && rec.territory.name !== selectedName
            && rec.stacks.length === 0;
        }
      }
      return;
    }
    denseMode = next;
    for (const rec of unitRecords) {
      const expand = rec.territory.name === selectedName || !denseMode;
      rec.pip.visible = !expand;
      for (const s of rec.expanded) s.visible = expand;
      if (rec.label) {
          rec.label.visible = !rec.territory.isWater
            && rec.territory.name !== selectedName
            && rec.stacks.length === 0;
      }
    }
  }

  function paintSelection(picked, { hover = false } = {}) {
    const next = picked?.territory || null;
    const unitType = picked?.unitType || null;
    if (hover) {
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x000000);
      hoveredName = next && !next.isWater ? next.name : null;
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x1a1408);
      renderer.domElement.classList.toggle('is-hovering', !!next);
      return;
    }
    if (chrome.isSheetOpen()) chrome.setSheetOpen(false);
    if (selectedName) setLandEmissive(selectedName, 0x000000);
    selectedName = next ? next.name : null;
    selectedUnitType = unitType && next && !next.isWater ? unitType : (next && selectedUnitType && selectedName === next.name ? selectedUnitType : unitType);
    if (next && unitType) selectedUnitType = unitType;
    if (!next) selectedUnitType = null;
    confirmed = false;
    if (selectedName && !next?.isWater) setLandEmissive(selectedName, 0x161008);
    drawSelectInk(next && !next.isWater ? next : null);
    syncDensity();
    chrome.paintSelection({
      land: next,
      stacks: next ? stacksFor(next.name, placements) : [],
      unitType: selectedUnitType,
      confirmed,
    });
  }

  chrome.confirm.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedName) return;
    confirmed = true;
    const land = territories.find((t) => t.name === selectedName);
    chrome.paintSelection({
      land,
      stacks: stacksFor(selectedName, placements),
      unitType: selectedUnitType,
      confirmed,
    });
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    if (e.target.closest?.('#three-bottom, #three-l0, #three-sheet, #three-zoom, #three-confirm')) return;
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
    wrapPanLikeCanvas(camera, controls);
    applyZoomCap();
    const shown = syncWrapVisibility(wrapGroups, camera);
    syncDensity();
    if (ocean.material?.uniforms?.uCamera) {
      ocean.material.uniforms.uCamera.value.copy(camera.position);
    }
    renderer.domElement.dataset.wrapCopies = String(shown);
    renderer.render(scene, camera);
  }
  tick();

  function screenXYOf(name) {
    const t = lands.find((l) => l.name === name);
    const c = t && territoryCenter(t);
    if (!c) return null;
    const p = worldToScene(c.x, c.y);
    const v = new THREE.Vector3(p.x, 0.5, p.z).project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (1 - v.y) * 0.5 * window.innerHeight,
    };
  }
  function screenYOf(name) {
    return screenXYOf(name)?.y ?? null;
  }

  reportStartupStatus('Three.js spike ready', 100);
  dismissStartupLoader();
  const germanyXY = screenXYOf('Germany');
  const egyptXY = screenXYOf('Anglo Sudan Egypt');
  const ukXY = screenXYOf('United Kingdom');
  const westEuropeXY = screenXYOf('West Europe');
  const africaSouthOnScreen = egyptXY && germanyXY && egyptXY.y > germanyXY.y;
  const europeNorthOnScreen = ukXY && germanyXY && ukXY.y < germanyXY.y + 80;
  const ukWestOfGermany = ukXY && germanyXY && ukXY.x < germanyXY.x;
  const westEuropeWestOfGermany = westEuropeXY && germanyXY && westEuropeXY.x < germanyXY.x;
  console.log(`[three-spike] ${GAME_VERSION} SCHEMA ${SCHEMA_VERSION} lands=${lands.length} wrap=frustum art=sand-plate ocean=quiet`, {
    africaSouthOfEurope,
    africaNotUnderNA,
    africaSouthOnScreen,
    europeNorthOnScreen,
    ukWestOfGermany,
    westEuropeWestOfGermany,
    germanyXY,
    egyptXY,
    ukXY,
  });
  window.__threeSpike = {
    frameEuropeAfrica,
    frameWorld,
    WRAP_COPIES,
    screenYOf,
    screenXYOf,
    inspect() {
      const mats = pickables[0]?.material;
      const list = Array.isArray(mats) ? mats : [mats];
      return {
        name: pickables[0]?.userData?.territory?.name,
        verts: pickables[0]?.geometry?.attributes?.position?.count,
        materialCount: list.length,
        hasTileMap: list.some((m) => m?.map && m.map !== list[0]?.map && m.map?.image?.width > 400),
        wrap: renderer.domElement.dataset.wrapCopies,
        africaSouthOfEurope,
        africaNotUnderNA,
        africaSouthOnScreen,
        europeNorthOnScreen,
        ukWestOfGermany,
        westEuropeWestOfGermany,
        waterInk: false,
        foam: false,
        bevel: false,
      };
    },
  };
}
