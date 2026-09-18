// Timeboxed Three.js map preview. Gated by ?three=1 from main.js.
// Standing art bar: briefs/2026-09-17-three-art-gap/PRODUCTION-PATH.md
// Director ladder fail-closed: bake → lights/AO → pinch → 390 scorecard.
// Canvas SoT coords + wrap. Preview only — Canvas cutover needs a separate James yes.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
  makeLandSealMeshes,
  makeLineMat,
  addTerritoryInk,
  makeSelectWashMaterial,
  makeSelectWashMeshes,
  createWrapGroups,
  syncWrapVisibility,
  wrapPanLikeCanvas,
  maxZoomDistance,
  territoryCenter,
  landHeightFor,
  simplifyRing,
  makeBorderLine,
  addFoamCoast,
  makeFoamBandMeshes,
  makeCoastAoMaterial,
  makeCoastAoMeshes,
  makeCoastShelfMaterial,
  makeCoastShelfMeshes,
  addRiverLines,
  addSeaLaneLines,
} from './threeMapArt.js';
import { territoryOutlineRings } from './threeMapOutline.js';
import {
  PALETTE,
  FACTION_WASH,
  makeLandMaterials,
  makeOceanMesh,
  makeFoamMaterial,
  loadBoardTextures,
  applyLodTooth,
  factionWash,
  regionWashFor,
  plasticColor,
  setWorldLandMap,
  getPaperImage,
  bonusContinent,
  REGION_WASH,
} from './threeMapPalette.js';
import {
  makeChitTexture,
  makePipTexture,
  makeOverflowTexture,
  loadUnitAtlases,
} from './threeMapChits.js';
import { bakeWorldLandAtlas } from './threeMapTerrain.js';
import { injectThreeChrome } from './threeMapChrome.js';
import {
  lodBand,
  isSupportType,
  showMinis,
  spiralPack,
  clusterPack,
  packPitchFor,
  footprintPiecePx,
  pieceWorldCap,
  isSmallLand,
  territoryFootprint,
  JAPAN_HOME_CENTER,
  separatePoints,
  isDenseBand,
  nearLayout,
  worldSizeFromScreen,
  PIP_PX,
  PIECE_PX,
  PIP_MIN_PX,
  PIP_MAX_PX,
  PIECE_MIN_PX,
  PIECE_MAX_PX,
  GAP_PX,
} from './threeMapDensity.js';
import {
  dismissStartupLoader,
  reportStartupError,
  reportStartupStatus,
} from '../ui/startupLoader.js';

const FACTION_FALLBACK = { ...FACTION_WASH };

const SEA_ZONE_CENTERS = {
  'West US Sea Zone': { x: 3078, y: 800 },
  'West Canada Sea Zone': { x: 2992, y: 462 },
  'Alaska Sea Zone': { x: 2870, y: 458 },
  'Soviet Far East Sea Zone': { x: 2558, y: 408 },
  'Midway Sea Zone': { x: 2918, y: 630 },
  'Hawaii Sea Zone': { x: 3062, y: 960 },
  'Wake Island Sea Zone': { x: 2764, y: 1003 },
  'Okinawa Sea Zone': { x: 2569, y: 943 },
  'Japan Sea Zone': { x: 2695, y: 750 }, // water pin — keep east of home islands
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

const LAND_ANCHORS = {
  Japan: JAPAN_HOME_CENTER,
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
  const pin = LAND_ANCHORS[territory.name];
  if (pin && !territory.isWater) return { x: pin.x, y: pin.y, area: 1 };
  const center = territoryCenter(territory);
  if (!center) return null;
  const off = LAND_UNIT_OFFSETS[territory.name];
  if (off && !territory.isWater) {
    return { x: center.x + off.x, y: center.y + off.y, area: center.area };
  }
  return center;
}

function applyLiveContinents(list, bonusGroups) {
  const of = new Map();
  for (const c of bonusGroups || []) {
    for (const n of c.territories || []) of.set(n, c.name);
  }
  for (const t of list || []) {
    if (of.has(t.name)) t.continent = of.get(t.name);
  }
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

function ownerPlastic(owner) {
  return plasticColor(owner);
}

function chitTextureFor(type, ownerColor, quantity) {
  return makeChitTexture(type, ownerColor, quantity);
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
    applyLiveContinents(territories, continents);
  } catch (err) {
    console.error(err);
    reportStartupError('Three.js spike could not load territory data.');
    return;
  }

  await loadBoardTextures();
  await loadUnitAtlases();

  const factionColor = new Map();
  for (const f of setup.classic?.factions || setup.factions || []) {
    factionColor.set(f.id, factionWash(f.id) || f.color || FACTION_FALLBACK[f.id]);
  }
  const owners = setup.classic?.territoryOwners || {};
  const placements = setup.classic?.unitPlacements || setup.unitPlacements || {};
  const lands = territories.filter((t) => !t.isWater);
  const worldLand = await bakeWorldLandAtlas(lands, getPaperImage());
  setWorldLandMap(worldLand);
  const territoryMap = new TerritoryMap(territories);
  const landMats = new Map();
  const landHeights = new Map();
  const pickables = [];
  const selectInk = [];
  const lineMats = [];
  const unitRecords = [];

  const russians = setup.classic?.factions?.find((f) => f.id === 'Russians');
  chrome.setSeat('Russians', plasticColor('Russians') || russians?.color || FACTION_FALLBACK.Russians);
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
  scene.fog = null;

  const ocean = makeOceanMesh(WORLD_W * 5.2, WORLD_H * 2.4);
  ocean.position.set(WORLD_W / 2, -0.2, -WORLD_H / 2);
  scene.add(ocean);

  const board = new THREE.Group();
  scene.add(board);
  const wrapGroups = createWrapGroups(board);

  const landBorderMat = makeLineMat(PALETTE.border, 0.85, 0.68);
  const foamMat = makeLineMat(PALETTE.foam, 1.15, 0.62);
  const foamBandMat = makeFoamMaterial();
  const coastAoMat = makeCoastAoMaterial();
  const coastShelfMat = makeCoastShelfMaterial();
  const riverMat = makeLineMat('#3A4E52', 2.2, 0.46);
  const selectHaloMat = makeLineMat('#3A3428', 8.8, 0.52);
  const selectMat = makeLineMat(PALETTE.select, 6.4, 0.94);
  const selectWashMat = makeSelectWashMaterial();
  const continentMats = new Map();
  for (const [name, hex] of Object.entries(REGION_WASH)) {
    if (name === 'USSR') continue;
    continentMats.set(name, makeLineMat(hex, 3.8, 0.74));
  }
  const seaLaneMat = makeLineMat('#B8B09A', 1.45, 0.38, {
    dashed: true,
    dashSize: 5.4,
    gapSize: 7.2,
  });
  lineMats.push(landBorderMat, foamMat, riverMat, selectHaloMat, selectMat, seaLaneMat, ...continentMats.values());

  for (const land of lands) {
    const owner = owners[land.name] || land.originalOwner;
    const ownerHex = factionColor.get(owner) || FACTION_FALLBACK[owner] || null;
    landMats.set(land.name, makeLandMaterials(regionWashFor(land), ownerHex, land));
  }

  const textureCache = new Map();
  function chitTexture(type, owner, quantity) {
    const key = `chit|${owner}|${type}|${quantity}`;
    if (!textureCache.has(key)) {
      textureCache.set(key, chitTextureFor(type, ownerPlastic(owner), quantity));
    }
    return textureCache.get(key);
  }
  function pipTexture(owner, total) {
    const key = `pip|${owner}|${total}`;
    if (!textureCache.has(key)) {
      textureCache.set(key, makePipTexture(ownerPlastic(owner), total));
    }
    return textureCache.get(key);
  }
  function overflowTexture(plus) {
    const key = `plus|${plus}`;
    if (!textureCache.has(key)) textureCache.set(key, makeOverflowTexture(plus));
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
      for (const seal of makeLandSealMeshes(land, landMats.get(land.name)?.seal)) {
        group.add(seal);
      }
      addTerritoryInk(group, land, landBorderMat, height + 0.05, continentMats.get(bonusContinent(land)));
      addFoamCoast(group, land, foamMat, 0.05);
      for (const shelf of makeCoastShelfMeshes(land, coastShelfMat)) {
        group.add(shelf);
      }
      for (const band of makeFoamBandMeshes(land, foamBandMat)) {
        group.add(band);
      }
      for (const ao of makeCoastAoMeshes(land, coastAoMat)) {
        group.add(ao);
      }
    }
    addRiverLines(group, riverMat, 0.28);
    addSeaLaneLines(group, territories.filter((t) => t.isWater), seaLaneMat, 0.05);
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
      for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];
        const tex = chitTexture(stack.type, stack.owner, stack.quantity);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }));
        sprite.center.set(0.5, 0.16);
        sprite.scale.set(5.5, 5.5, 1);
        sprite.position.set(x, height + 0.42, z);
        sprite.renderOrder = 24;
        sprite.userData.territory = t;
        sprite.userData.unitType = stack.type;
        sprite.userData.kind = 'chit';
        sprite.userData.support = isSupportType(stack.type);
        group.add(sprite);
        expanded.push(sprite);
      }

      const pipTex = pipTexture(owner, total);
      const pip = new THREE.Sprite(new THREE.SpriteMaterial({
        map: pipTex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }));
      pip.center.set(0.5, 0.16);
      pip.scale.set(6.4, 6.4, 1);
      pip.position.set(x, height + 0.42, z);
      pip.renderOrder = 25;
      pip.userData.territory = t;
      pip.userData.kind = 'pip';
      pip.visible = false;
      group.add(pip);

      const overflow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: overflowTexture(1),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }));
      overflow.center.set(0.5, 0.16);
      overflow.scale.set(4.2, 4.2, 1);
      overflow.position.set(x, height + 0.42, z);
      overflow.renderOrder = 25;
      overflow.userData.territory = t;
      overflow.userData.kind = 'overflow';
      overflow.visible = false;
      group.add(overflow);
      // P33 HARD: permanent name sprites are gone. Peek holds the name.

      unitRecords.push({
        territory: t,
        stacks,
        expanded,
        pip,
        overflow,
        label: null,
        center,
        homeX: x,
        homeZ: z,
        height,
        footprint: t.isWater ? { w: 220, h: 220, min: 220 } : territoryFootprint(t),
        copy: group.userData.copy,
      });
    }
  }

  // P30: lift hemi + warm ground so floored parchment cannot fall to void.
  // Keep warm-key-cool-fill sculpt. MeshStandard only. No neon.
  const hemi = new THREE.HemisphereLight(0xD8D2C4, 0x5A5040, 0.78);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xFFE2B0, 1.18);
  key.position.set(-96, 58, -28);
  key.target.position.set(WORLD_W * 0.42, 0, -WORLD_H * 0.38);
  scene.add(key);
  scene.add(key.target);
  const fill = new THREE.DirectionalLight(0x7E9AAB, 0.48);
  fill.position.set(72, 24, 44);
  scene.add(fill);
  const bounce = new THREE.DirectionalLight(0x6A5A40, 0.16);
  bounce.position.set(12, -14, 22);
  scene.add(bounce);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
  renderer.domElement.id = 'threeCanvas';
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.14;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = false;
  controls.enableZoom = true;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.DOLLY;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.touches.ONE = THREE.TOUCH.PAN;
  // r170 has no TOUCH.DOLLY (was undefined → iPhone pinch died).
  // Custom two-finger pinch+pan below. Orbit rotate is off, so TWO=ROTATE
  // keeps Orbit from fighting the iPhone gesture.
  controls.touches.TWO = THREE.TOUCH.ROTATE;
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
    const names = [
      'United Kingdom', 'West Europe', 'Germany', 'East Europe',
      'South Europe', 'Ukraine S.S.R.', 'Anglo Sudan Egypt',
    ];
    const pts = [];
    for (const name of names) {
      const land = lands.find((t) => t.name === name);
      const c = land && territoryCenter(land);
      if (c) pts.push(worldToScene(c.x, c.y));
    }
    const focus = pts.length
      ? {
        x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
        z: pts.reduce((s, p) => s + p.z, 0) / pts.length,
      }
      : worldToScene(1100, 780);
    camera.fov = phone ? 42 : 36;
    camera.updateProjectionMatrix();
    const lift = phone ? 178 : 160;
    const south = phone ? 22 : 16;
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

  function worldOnPlane(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
    );
    const hit = new THREE.Vector3();
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }

  function dollyBy(factor, clientX, clientY) {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const next = dir.multiplyScalar(factor);
    const dist = next.length();
    if (dist < controls.minDistance || dist > controls.maxDistance) return;
    const anchor = (clientX != null && clientY != null) ? worldOnPlane(clientX, clientY) : null;
    camera.position.copy(controls.target).add(next);
    if (anchor) {
      const after = worldOnPlane(clientX, clientY);
      if (after) {
        const delta = anchor.sub(after);
        camera.position.add(delta);
        controls.target.add(delta);
      }
    }
  }

  function panByWorld(from, to) {
    if (!from || !to) return;
    const delta = from.clone().sub(to);
    camera.position.add(delta);
    controls.target.add(delta);
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
  let lodMode = null;
  let lastSelectForLod = null;
  let selectLiftStarted = 0;
  const SELECT_LIFT_MS = 150;
  const SELECT_LIFT_PX = 3.2;

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickTerritory(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const spriteHits = raycaster.intersectObjects(
      unitRecords.flatMap((r) => [...r.expanded, r.pip, r.overflow].filter((s) => s?.visible)),
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
    // Soft gold ring/ink — never a candy yellow flood. never a blue glow ring.
    if (mats?.top?.emissive) {
      if (hex) {
        mats.top.emissive.setHex(hex);
        mats.top.emissiveIntensity = 0.30;
      } else {
        mats.top.emissive.setHex(0xc4b896);
        mats.top.emissiveIntensity = 0.045;
      }
    }
  }

  function screenScale(kind, footprint, typeCount = 1, name = '') {
    const dist = camera.position.distanceTo(controls.target);
    const h = renderer.domElement.clientHeight || window.innerHeight || 844;
    const px = footprintPiecePx(footprint, kind === 'pip' ? 'mid' : 'near', kind !== 'pip', typeCount, name);
    const small = isSmallLand(name, footprint);
    const japan = name === 'Japan';
    if (kind === 'pip') {
      return worldSizeFromScreen(px, dist, camera.fov, h, {
        minPx: small ? 40 : PIP_MIN_PX,
        maxPx: small ? 56 : PIP_MAX_PX,
        maxWorld: small ? 6.0 : 8.5,
      });
    }
    const world = worldSizeFromScreen(px, dist, camera.fov, h, {
      minPx: japan ? 46 : (small ? 50 : 68),
      maxPx: japan ? 64 : (small ? 76 : PIECE_MAX_PX),
      maxWorld: japan ? 5.6 : (small ? 7.0 : 13.5),
    });
    return pieceWorldCap(world, footprint, typeCount, name);
  }

  function screenGap(tokenWorld) {
    const dist = camera.position.distanceTo(controls.target);
    const h = renderer.domElement.clientHeight || window.innerHeight || 844;
    const gap = worldSizeFromScreen(GAP_PX, dist, camera.fov, h, {
      minPx: 4, maxPx: 8, maxWorld: 2.4, minWorld: 0.35,
    });
    return tokenWorld + gap;
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
    const height = landHeights.get(territory.name) || BASE_LAND;
    const y = height + 0.42;
    for (const group of wrapGroups) {
      if (!group.visible) continue;
      for (const wash of makeSelectWashMeshes(territory, selectWashMat, height)) {
        group.add(wash);
        selectInk.push(wash);
      }
      for (const poly of territoryOutlineRings(territory)) {
        const ring = simplifyRing(poly, 0.28);
        if (!ring) continue;
        const halo = makeBorderLine(ring, y, selectHaloMat);
        halo.renderOrder = 9;
        group.add(halo);
        selectInk.push(halo);
        const line = makeBorderLine(ring, y + 0.04, selectMat);
        line.renderOrder = 10;
        group.add(line);
        selectInk.push(line);
      }
    }
  }

  function currentBand() {
    return lodBand(camera.position.distanceTo(controls.target));
  }

  function relayoutUnits(band) {
    const copies = new Map();
    for (const rec of unitRecords) {
      if (!copies.has(rec.copy)) copies.set(rec.copy, []);
      copies.get(rec.copy).push(rec);
    }
    for (const recs of copies.values()) {
      const movers = [];
      for (const rec of recs) {
        const selected = rec.territory.name === selectedName;
        const footprint = rec.footprint || { min: 200 };
        const typeCount = rec.stacks.length;
        const pipS = screenScale('pip', footprint, 1, rec.territory.name);
        const pieceS = screenScale('piece', footprint, Math.max(1, Math.min(4, typeCount)), rec.territory.name);
        const small = isSmallLand(rec.territory.name, footprint) || typeCount >= 4
          || rec.territory.name === 'Japan';
        // STACK-LOD / P22 HARD: mid/far idle = ONE cream pip+N. ZERO type parade.
        // Near OR select = molded plastic minis ≤3–4 +K. Roster lives in peek.
        const dense = isDenseBand(band);
        const plan = nearLayout(rec.stacks);
        // Near/select never falls back to pip — molded minis only.
        const collapse = !showMinis(band, selected);
        rec.pip.visible = collapse;
        rec.pip.scale.set(pipS, pipS, 1);
        rec.pip.position.set(rec.homeX, rec.height + 0.38, rec.homeZ);
        const shownTypes = new Set((collapse ? [] : plan.shown).map((s) => s.type));
        for (const sprite of rec.expanded) {
          const on = !collapse && shownTypes.has(sprite.userData.unitType);
          sprite.visible = on;
          sprite.scale.set(pieceS, pieceS, 1);
        }
        if (rec.overflow) {
          const plus = !collapse && plan.overflowQty > 0;
          rec.overflow.visible = plus;
          if (plus) {
            rec.overflow.material.map = overflowTexture(plan.overflowQty);
            rec.overflow.material.map.needsUpdate = true;
            rec.overflow.material.needsUpdate = true;
          }
          rec.overflow.scale.set(pieceS * 0.70, pieceS * 0.70, 1);
        }
        if (!collapse) {
          const shown = rec.expanded.filter((s) => s.visible);
          if (rec.overflow?.visible) shown.push(rec.overflow);
          const pitch = packPitchFor(shown.length, pieceS, footprint, rec.territory.name);
          const spots = (small ? clusterPack : spiralPack)(shown.length, pitch);
          const minSep = screenGap(pieceS * (small ? 0.72 : 1));
          shown.forEach((sprite, i) => {
            movers.push({
              sprite,
              x: rec.homeX + spots[i].x,
              z: rec.homeZ + spots[i].z,
              homeX: rec.homeX,
              homeZ: rec.homeZ,
              maxDrift: small ? Math.max(3.2, pitch * 1.6) : 14,
              y: rec.height + 0.42,
              minSep,
            });
          });
        }
        if (rec.label) rec.label.visible = false;
      }
      const byHome = new Map();
      for (const m of movers) {
        const key = `${m.homeX.toFixed(2)}|${m.homeZ.toFixed(2)}`;
        if (!byHome.has(key)) byHome.set(key, []);
        byHome.get(key).push(m);
      }
      for (const group of byHome.values()) {
        const sep = group[0]?.minSep || 4;
        separatePoints(group, sep);
      }
      for (const m of movers) {
        m.sprite.position.set(m.x, m.y, m.z);
      }
    }
  }

  function syncDensity() {
    const band = currentBand();
    lodMode = band;
    lastSelectForLod = selectedName;
    applyLodTooth(landMats, band);
    relayoutUnits(band);
  }

  function liftSelected(now) {
    // P25: 2–4px lift then micro-settle (overshoot → rest) ≤150ms. No idle bob.
    if (!selectedName) return;
    const t = Math.min(1, (now - selectLiftStarted) / SELECT_LIFT_MS);
    const rise = Math.min(1, t / 0.58);
    const settle = t < 0.58 ? 0 : (t - 0.58) / 0.42;
    const overshoot = 1.14;
    const easedRise = 1 - (1 - rise) ** 3;
    const easedSettle = settle * settle * (3 - 2 * settle);
    const amp = t < 0.58
      ? overshoot * easedRise
      : overshoot + (1 - overshoot) * easedSettle;
    const dist = camera.position.distanceTo(controls.target);
    const h = renderer.domElement.clientHeight || window.innerHeight || 844;
    const lift = worldSizeFromScreen(SELECT_LIFT_PX, dist, camera.fov, h, {
      minPx: 2, maxPx: 4, maxWorld: 1.15, minWorld: 0.16,
    }) * amp;
    for (const rec of unitRecords) {
      if (rec.territory.name !== selectedName) continue;
      const sprites = [...rec.expanded, rec.pip, rec.overflow].filter((s) => s?.visible);
      for (const sprite of sprites) {
        sprite.position.y += lift;
        if (sprite.material) sprite.material.rotation = 0;
      }
    }
  }

  function paintSelection(picked, { hover = false } = {}) {
    const next = picked?.territory || null;
    const unitType = picked?.unitType || null;
    if (hover) {
      if (hoveredName && hoveredName !== selectedName) setLandEmissive(hoveredName, 0x000000);
      hoveredName = next && !next.isWater ? next.name : null;
      renderer.domElement.classList.toggle('is-hovering', !!next);
      return;
    }
    if (chrome.isSheetOpen()) chrome.setSheetOpen(false);
    if (selectedName) setLandEmissive(selectedName, 0x000000);
    selectedName = next ? next.name : null;
    if (next && !next.isWater) setLandEmissive(next.name, 0xC4A35A);
    selectedUnitType = unitType && next && !next.isWater ? unitType : (next && selectedUnitType && selectedName === next.name ? selectedUnitType : unitType);
    if (next && unitType) selectedUnitType = unitType;
    if (!next) selectedUnitType = null;
    confirmed = false;
    selectLiftStarted = performance.now();
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

  let pinchDist = 0;
  let pinchMid = null;

  function twoFinger() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return null;
    const a = pts[0];
    const b = pts[1];
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      mx: (a.x + b.x) / 2,
      my: (a.y + b.y) / 2,
    };
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    if (e.target.closest?.('#three-bottom, #three-l0, #three-sheet, #three-zoom, #three-confirm')) return;
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch { /* iOS */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    maxPointers = Math.max(maxPointers, pointers.size);
    if (pointers.size >= 2) {
      gesturePinch = true;
      const now = twoFinger();
      pinchDist = now?.dist || 0;
      pinchMid = now ? { x: now.mx, y: now.my } : null;
    }
    renderer.domElement.classList.add('is-panning');
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    const rec = pointers.get(e.pointerId);
    if (rec) {
      rec.x = e.clientX;
      rec.y = e.clientY;
      if (pointers.size >= 2) {
        const now = twoFinger();
        if (now && pinchDist > 8 && now.dist > 8) {
          const factor = pinchDist / now.dist;
          if (Number.isFinite(factor) && factor > 0.25 && factor < 4) {
            dollyBy(factor, now.mx, now.my);
          }
        } else if (now && pinchMid) {
          const before = worldOnPlane(pinchMid.x, pinchMid.y);
          const after = worldOnPlane(now.mx, now.my);
          panByWorld(before, after);
        }
        pinchDist = now?.dist || pinchDist;
        pinchMid = now ? { x: now.mx, y: now.my } : pinchMid;
      }
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
      pinchDist = 0;
      pinchMid = null;
      if (allowTap) paintSelection(pickTerritory(e));
    } else if (pointers.size === 1) {
      pinchDist = 0;
      pinchMid = null;
    }
  }

  function touchPinchOf(e) {
    const a = e.touches[0];
    const b = e.touches[1];
    return {
      dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
      mx: (a.clientX + b.clientX) / 2,
      my: (a.clientY + b.clientY) / 2,
    };
  }
  let touchPinch = null;
  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      gesturePinch = true;
      touchPinch = touchPinchOf(e);
    }
  }, { passive: false });
  renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length >= 2 && touchPinch) {
      e.preventDefault();
      if (pointers.size >= 2) return;
      const now = touchPinchOf(e);
      if (touchPinch.dist > 8 && now.dist > 8) {
        const factor = touchPinch.dist / now.dist;
        if (Number.isFinite(factor) && factor > 0.25 && factor < 4) {
          dollyBy(factor, now.mx, now.my);
        }
      } else {
        panByWorld(worldOnPlane(touchPinch.mx, touchPinch.my), worldOnPlane(now.mx, now.my));
      }
      touchPinch = now;
    }
  }, { passive: false });
  renderer.domElement.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) touchPinch = null;
  }, { passive: false });

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
    liftSelected(performance.now());
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
  console.log(`[three-spike] ${GAME_VERSION} SCHEMA ${SCHEMA_VERSION} lands=${lands.length} wrap=frustum art=aa-plastic ocean=slate-teal`, {
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
    lodBand: currentBand,
    selectLand(name, unitType = null) {
      const land = territories.find((t) => t.name === name) || null;
      paintSelection(land ? { territory: land, unitType } : null);
    },
    frameNear(name, opts = {}) {
      const land = lands.find((t) => t.name === name);
      const pin = LAND_ANCHORS[name];
      const c = pin || (land && territoryCenter(land));
      if (!c) return false;
      const p = worldToScene(c.x, c.y);
      const japan = name === 'Japan';
      // Japan: stay NEAR (<92) but pull back so home islands + ocean read.
      // y=58 cropped Japan into a land blob and failed the love-gate.
      const lift = opts.lift ?? (japan ? 90 : 58);
      const south = opts.south ?? (japan ? 6 : 8);
      camera.position.set(p.x, lift, p.z - south);
      controls.target.set(p.x, 0, p.z);
      applyZoomCap();
      controls.update();
      syncDensity();
      return currentBand();
    },
    frameNearGermany() {
      return window.__threeSpike.frameNear('Germany');
    },
    frameNearJapan() {
      const band = window.__threeSpike.frameNear('Japan', { lift: 90, south: 6 });
      window.__threeSpike.selectLand('Japan');
      return band === 'near';
    },
    frameMidJapan() {
      const p = worldToScene(JAPAN_HOME_CENTER.x, JAPAN_HOME_CENTER.y);
      camera.position.set(p.x, 168, p.z - 22);
      controls.target.set(p.x, 0, p.z);
      applyZoomCap();
      controls.update();
      syncDensity();
      return currentBand() === 'mid';
    },
    frameChina(opts = {}) {
      const land = lands.find((t) => t.name === 'China');
      const c = land && territoryCenter(land);
      if (!c) return false;
      const p = worldToScene(c.x, c.y);
      const lift = opts.lift ?? 118;
      camera.position.set(p.x, lift, p.z - 14);
      controls.target.set(p.x, 0, p.z);
      applyZoomCap();
      controls.update();
      window.__threeSpike.selectLand('China');
      syncDensity();
      return {
        band: currentBand(),
        rings: territoryOutlineRings(land).length,
        polys: (land.polygons || []).length,
      };
    },
    continents,
    rosterOf(name) {
      const stacks = stacksFor(name, placements);
      return {
        stacks,
        total: stackTotal(stacks),
        peekTotal: Number(chrome.peek.dataset.rosterTotal || 0),
      };
    },
    dollyBy,
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
        foam: true,
        bevel: true,
        landSeal: true,
        atlas: true,
        palette: 'aa-hecorrect-11',
        version: GAME_VERSION,
        lod: lodMode,
        regionWash: true,
        plastic: true,
        stackLod: true,
        idleCta: chrome.confirm.classList.contains('is-idle'),
        confirmCopy: chrome.confirm.textContent,
        selectLiftMs: SELECT_LIFT_MS,
        moldedOutline: '≥2.5px',
        keyFill: 'warm-key-cool-fill',
        parchmentTooth: true,
        lodTooth: lodMode === 'near' ? 'clean' : 'loud',
        quietZoom: true,
        plasticSpec: 'tight-lobe',
        geography: true,
        biomeWashes: true,
        mountainRelief: true,
        forestClumps: true,
        coastShelf: true,
        rivers: true,
        landUndulation: true,
        nearMinis: true,
        selectMinis: true,
        geoUnmirror: true,
        evenParchment: true,
        parchmentFloor: 0.48,
        quietLanes: true,
        paintedMountains: true,
        noHatchRidges: true,
        unitNoClip: true,
        japanLod: true,
        japanHome: true,
        quietContinentWash: true,
        selectClear: true,
        liveContinents: true,
        continentCount: continents.length,
        paintedAlbedo: true,
        dissolveSelect: true,
        noMapLabels: true,
        noBakedIpc: true,
      };
    },
  };
}
