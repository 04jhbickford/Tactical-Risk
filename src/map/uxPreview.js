// Side-project hybrid: main Canvas art/tiles + Three HUD.
// Gated by ?three=1 or ?ux=1. Preview only — do not merge to main.

import { Camera, MAP_WIDTH, MAP_HEIGHT } from './camera.js';
import { MapRenderer } from './mapRenderer.js';
import { TerritoryRenderer } from './territoryRenderer.js';
import { TerritoryMap } from './territoryMap.js';
import { injectThreeChrome } from './threeMapChrome.js';
import {
  lodBandFromZoom,
  preloadUnitImages,
  renderPreviewStacks,
  hitTestPreviewStack,
  territoryCenter,
  layoutAllPreviewStacks,
  overlapReport,
  stressStacks,
  STRESS_LAND_TYPES,
} from './uxPreviewUnits.js';
import {
  dismissStartupLoader,
  reportStartupError,
  reportStartupStatus,
} from '../ui/startupLoader.js';
import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import {
  PHASE,
  SELECT_GOLD,
  LAND_TEAL,
  createScenario,
  applyScenarioPocket,
  tapLand,
  pickUnit,
  confirm as confirmPlay,
  confirmLabel,
  confirmGold,
  confirmEnabled,
  guideCopy,
  guideSteps,
  highlights,
  battleCard,
  inspectPlay,
  dismissGuide,
  driveCombatMove,
  driveBattleMid,
  driveAirChoice,
  driveLanded,
  resetScenario,
} from './uxPreviewScenario.js';

const EUROPE_FIT = { minX: 620, minY: 180, maxX: 1680, maxY: 980 };
// Finland Norway (1002,220) + Karelia (1313,250) + Russia (1651,357).
const POCKET_FIT = { minX: 960, minY: 80, maxX: 1720, maxY: 380 };
const LAND_FIT = { minX: 980, minY: 70, maxX: 1820, maxY: 460 };

function applyLiveContinents(list, bonusGroups) {
  const of = new Map();
  for (const c of bonusGroups || []) {
    for (const n of c.territories || []) of.set(n, c.name);
  }
  for (const t of list || []) {
    if (of.has(t.name)) t.continent = of.get(t.name);
  }
}

function strokeSelectOutline(ctx, territory, territoryRenderer, zoom, {
  color = SELECT_GOLD,
  dashed = false,
  width = 3.4,
} = {}) {
  if (!territory) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.2, width / Math.max(0.18, zoom));
  ctx.shadowColor = 'rgba(30, 36, 32, 0.72)';
  ctx.shadowBlur = dashed ? 0 : 10 / Math.max(0.18, zoom);
  if (dashed) ctx.setLineDash([10 / Math.max(0.18, zoom), 7 / Math.max(0.18, zoom)]);
  if (territory.polygons.length === 1) {
    territoryRenderer._strokePoly(ctx, territory.polygons[0]);
  } else {
    const edges = territoryRenderer._getExternalEdgesWithTolerance(
      territory.polygons,
      territory.name,
    );
    territoryRenderer._strokeEdges(ctx, edges);
  }
  ctx.restore();
}

function selectRingCount(territory, territoryRenderer) {
  if (!territory) return 0;
  if (territory.polygons.length === 1) return 1;
  const edges = territoryRenderer._getExternalEdgesWithTolerance(
    territory.polygons,
    territory.name,
  );
  return edges?.length ? 1 : territory.polygons.length;
}

export async function bootUxPreview() {
  reportStartupStatus('UX preview — loading main map art…', 28);

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
    reportStartupError('UX preview could not load territory data.');
    return;
  }

  const canvas = document.getElementById('mapCanvas');
  if (!canvas) {
    reportStartupError('UX preview missing #mapCanvas.');
    return;
  }
  const ctx = canvas.getContext('2d');
  const camera = new Camera(canvas);
  camera.usePhoneMinZoom = true;

  const mapRenderer = new MapRenderer();
  const territoryRenderer = new TerritoryRenderer(territories, continents);
  const territoryMap = new TerritoryMap(territories);
  const classicPlacements = { ...(setup.classic?.unitPlacements || {}) };
  const classicOwners = setup.classic?.territoryOwners || {};
  const pocket = applyScenarioPocket(classicPlacements, classicOwners);
  const placements = pocket.placements;
  const owners = pocket.owners;
  let play = createScenario({ placements, owners });
  const stressOn = (() => {
    const params = new URLSearchParams(location.search);
    const v = String(params.get('stress') || '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  })();
  if (stressOn) {
    placements.Japan = stressStacks('Japanese', STRESS_LAND_TYPES);
    placements.Germany = stressStacks('Germans', STRESS_LAND_TYPES);
  }
  const factions = setup.classic?.factions || setup.factions || [];
  const factionColors = new Map(factions.map((f) => [f.id, f.color]));
  const russians = factions.find((f) => f.id === 'Russians');

  const chrome = injectThreeChrome({
    seat: 'Russians',
    ipc: russians?.startingPUs || 24,
    phase: PHASE.COMBAT_MOVE,
  });
  chrome.setSeat('Russians', russians?.color || '#B22222');

  reportStartupStatus('Loading main tiles and unit chits…', 52);
  const { images, ready: imagesReady } = preloadUnitImages(
    unitDefs,
    factions.map((f) => f.id),
  );
  await Promise.all([mapRenderer.load(), imagesReady]);

  function resizeCanvas() {
    const dpr = devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    camera.onResize();
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    fitPocket();
  });

  let selected = null;
  let stacksExpanded = false;
  let hover = null;

  function landByName(name) {
    return territories.find((t) => t.name === name) || null;
  }

  function syncSelectionFromPlay() {
    selected = landByName(play.selected);
  }

  function paintChrome() {
    chrome.setPhase(play.phase);
    const marks = highlights(play);
    let focusName = play.selected || marks.origin || marks.dest || null;
    if (play.phase === PHASE.COMBAT_MOVE && (play.selected === play.origin || play.destPicked)) {
      focusName = play.origin;
    }
    if (play.phase === PHASE.AIR_LAND && !play.landingDest) {
      focusName = play.dest;
    }
    const land = landByName(focusName);
    const picked = Object.keys(play.selectedUnits || {}).filter((t) => play.selectedUnits[t]);
    let route = '';
    if (play.phase === PHASE.COMBAT_MOVE && play.destPicked) {
      route = `${play.origin} → ${play.dest}`;
    } else if (play.phase === PHASE.AIR_LAND) {
      route = play.landingDest ? `Land in ${play.landingDest}` : 'Pick teal land';
    } else if (play.phase === PHASE.DONE && play.landingDest) {
      route = `Landed · ${play.landingDest}`;
    }
    chrome.paintPlay({
      land,
      stacks: land ? (placements[land.name] || []) : [],
      unitTypes: picked,
      label: confirmLabel(play),
      gold: confirmGold(play),
      enabled: confirmEnabled(play),
      guide: guideCopy(play),
      guideOn: true,
      guideSteps: guideSteps(play),
      battle: battleCard(play),
      replay: play.phase === PHASE.DONE,
      route,
    });
  }

  chrome.onStackToggle = (on) => {
    stacksExpanded = on;
    camera.dirty = true;
  };
  chrome.onUnitPick = (type) => {
    pickUnit(play, type);
    syncSelectionFromPlay();
    paintChrome();
    camera.dirty = true;
  };
  chrome.onGuideDismiss = () => {
    dismissGuide(play);
    paintChrome();
  };

  function fitEurope() {
    camera.fitBounds(EUROPE_FIT, {
      padding: 12,
      padTop: 56,
      padBottom: 96,
      fillFrame: true,
    });
  }
  function fitPocket() {
    const bounds = play.phase === PHASE.AIR_LAND || play.phase === PHASE.DONE
      ? LAND_FIT
      : POCKET_FIT;
    camera.fitBounds(bounds, {
      padding: 12,
      padTop: 92,
      padBottom: 144,
      fillFrame: false,
    });
  }
  fitPocket();
  paintChrome();

  function pickAt(sx, sy) {
    const world = camera.screenToWorld(sx, sy);
    world.x = ((world.x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
    const fromStack = hitTestPreviewStack(world.x, world.y, {
      territories,
      placements,
      zoom: camera.zoom,
      selectedName: selected?.name,
      stacksExpanded,
    });
    return fromStack || territoryMap.hitTest(world.x, world.y);
  }

  function selectLand(next) {
    tapLand(play, next?.name);
    syncSelectionFromPlay();
    if (play.phase === PHASE.AIR_LAND && play.landingDest) fitPocket();
    paintChrome();
    camera.dirty = true;
  }

  canvas.addEventListener('mousedown', (e) => camera.onMouseDown(e));
  canvas.addEventListener('mousemove', (e) => {
    if (camera.onMouseMove(e)) {
      canvas.classList.add('is-panning');
      return;
    }
    const hit = pickAt(e.clientX, e.clientY);
    hover = hit;
    canvas.classList.toggle('is-hovering', !!hit);
    camera.dirty = true;
  });
  window.addEventListener('mouseup', (e) => {
    const wasDrag = camera.onMouseUp();
    canvas.classList.remove('is-panning');
    if (wasDrag) return;
    if (chrome.isSheetOpen()) return;
    selectLand(pickAt(e.clientX, e.clientY));
  });
  canvas.addEventListener('wheel', (e) => camera.onWheel(e), { passive: false });

  let pinch = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = e.touches;
      pinch = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom: camera.zoom,
      };
      camera._dragging = false;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      camera.onMouseDown({ button: 0, clientX: t.clientX, clientY: t.clientY, preventDefault() { e.preventDefault(); } });
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (pinch && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const factor = dist / Math.max(1, pinch.dist);
      camera.zoom = Math.max(camera.minZoom, Math.min(3, pinch.zoom * factor));
      camera.onResize();
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      camera.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinch = null;
    if (e.touches.length === 0) {
      const wasDrag = camera.onMouseUp();
      canvas.classList.remove('is-panning');
      if (wasDrag || chrome.isSheetOpen()) return;
      const t = e.changedTouches[0];
      if (t) selectLand(pickAt(t.clientX, t.clientY));
    }
  });

  chrome.zoom.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-zoom]');
    if (!btn) return;
    e.stopPropagation();
    if (btn.dataset.zoom === 'fit') fitPocket();
    else camera.zoomBy(btn.dataset.zoom);
  });
  chrome.confirm.addEventListener('click', (e) => {
    e.stopPropagation();
    if (chrome.confirm.disabled) return;
    const before = play.phase;
    confirmPlay(play);
    syncSelectionFromPlay();
    if (play.phase !== before) fitPocket();
    paintChrome();
    camera.dirty = true;
  });

  function paint() {
    camera.update();
    const dpr = devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3CC0BF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    camera.applyTransform(ctx);

    const viewport = camera.getViewport();
    const startCopy = Math.floor(viewport.x / MAP_WIDTH);
    const endCopy = Math.floor((viewport.x + viewport.width) / MAP_WIDTH);
    for (let copy = startCopy; copy <= endCopy; copy++) {
      const offsetX = copy * MAP_WIDTH;
      ctx.save();
      ctx.translate(offsetX, 0);
      const localViewport = {
        x: viewport.x - offsetX,
        y: viewport.y,
        width: viewport.width,
        height: viewport.height,
      };
      mapRenderer.render(ctx, localViewport, { flatOcean: false });
      territoryRenderer.renderWaterMask(ctx);
      territoryRenderer.renderOwnershipOverlays(ctx, camera.zoom);
      territoryRenderer.renderTerrainTexture(ctx, camera.zoom);
      territoryRenderer.renderTerritoryOutlines(ctx, camera.zoom);
      const marks = highlights(play);
      const byName = (name) => territories.find((t) => t.name === name);
      const wave = 0.5 + 0.5 * Math.sin(performance.now() / 280);
      const pulsing = new Set(marks.pulse || []);
      for (const name of marks.legal || []) {
        ctx.save();
        if (pulsing.has(name)) ctx.globalAlpha = 0.42 + 0.58 * wave;
        strokeSelectOutline(ctx, byName(name), territoryRenderer, camera.zoom, {
          color: SELECT_GOLD,
          dashed: true,
          width: pulsing.has(name) ? 3.4 + 1.2 * wave : 2.6,
        });
        ctx.restore();
      }
      for (const name of marks.landable || []) {
        strokeSelectOutline(ctx, byName(name), territoryRenderer, camera.zoom, {
          color: LAND_TEAL,
          dashed: true,
          width: 2.8,
        });
      }
      if (marks.origin) {
        ctx.save();
        if (pulsing.has(marks.origin)) ctx.globalAlpha = 0.46 + 0.54 * wave;
        strokeSelectOutline(ctx, byName(marks.origin), territoryRenderer, camera.zoom, {
          color: SELECT_GOLD,
          width: pulsing.has(marks.origin) ? 3.8 + 1.4 * wave : 3.2,
        });
        ctx.restore();
      }
      if (marks.dest) {
        strokeSelectOutline(ctx, byName(marks.dest), territoryRenderer, camera.zoom, {
          color: SELECT_GOLD,
          width: 3.6,
        });
      }
      if (selected && selected.name !== marks.origin && selected.name !== marks.dest) {
        const landColor = (marks.landable || []).includes(selected.name) ? LAND_TEAL : SELECT_GOLD;
        strokeSelectOutline(ctx, selected, territoryRenderer, camera.zoom, {
          color: landColor,
          width: 3.2,
        });
      }
      renderPreviewStacks(ctx, {
        territories,
        placements,
        images,
        zoom: camera.zoom,
        selectedName: selected?.name || null,
        stacksExpanded,
        factionColors,
        pulseNames: marks.pulse || [],
        pulseWave: wave,
      });
      if (pulsing.has(play.origin) && play.phase === PHASE.COMBAT_MOVE) {
        const originLand = byName(play.origin);
        const center = originLand && territoryCenter(originLand);
        if (center) {
          const z = Math.max(0.22, camera.zoom);
          const w = 54 / z;
          const h = 22 / z;
          const x = center.x;
          const y = center.y - 40 / z;
          ctx.save();
          ctx.globalAlpha = 0.78 + 0.22 * wave;
          ctx.fillStyle = SELECT_GOLD;
          ctx.beginPath();
          ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
          ctx.fill();
          ctx.fillStyle = '#1E2420';
          ctx.font = `700 ${14 / z}px -apple-system, "SF Pro Text", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = 1;
          ctx.fillText('TAP', x, y);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  function loop() {
    const pulsing = highlights(play).pulse?.length > 0;
    if (camera.dirty || camera._targetX !== null || pulsing) {
      camera.dirty = false;
      paint();
    }
    requestAnimationFrame(loop);
  }
  paint();
  requestAnimationFrame(loop);

  function currentLayouts() {
    return layoutAllPreviewStacks({
      territories,
      placements,
      zoom: camera.zoom,
      selectedName: selected?.name || null,
      stacksExpanded,
    });
  }

  function frameNamed(name, zoom = 1.15) {
    const t = territories.find((x) => x.name === name);
    const c = t && territoryCenter(t);
    camera.zoom = zoom;
    if (c) {
      camera.x = c.x;
      camera.y = c.y;
    }
    camera.onResize();
    camera.dirty = true;
    return t?.name || null;
  }

  const inspect = () => {
    const band = lodBandFromZoom(camera.zoom);
    const chinaT = territories.find((t) => t.name === 'China');
    const germany = territories.find((t) => t.name === 'Germany');
    const japan = territories.find((t) => t.name === 'Japan');
    const layouts = currentLayouts();
    const japanLayout = layouts.find((l) => l.name === 'Japan');
    const germanyLayout = layouts.find((l) => l.name === 'Germany');
    const overlap = overlapReport(layouts);
    return {
      artSource: 'main',
      uxSource: 'threePreview',
      sideProject: true,
      doNotMerge: true,
      version: GAME_VERSION,
      schema: SCHEMA_VERSION,
      mapSize: { w: MAP_WIDTH, h: MAP_HEIGHT },
      tiles: { base: mapRenderer.baseCount, relief: mapRenderer.reliefCount, smallMap: !!mapRenderer.smallMap },
      worldPlate: false,
      lod: band,
      zoom: Number(camera.zoom.toFixed(3)),
      stacksExpanded,
      selected: selected?.name || null,
      selectOutlineOnly: true,
      selectColor: SELECT_GOLD,
      guideOn: !!play.guideOn,
      vizP1Coach: false,
      iconPack: 'noOverlap',
      overlap,
      china: chinaT ? {
        name: 'China',
        polys: chinaT.polygons.length,
        rings: selectRingCount(chinaT, territoryRenderer),
      } : null,
      germany: germany ? {
        ...territoryCenter(germany),
        tokens: germanyLayout?.tokens.length || 0,
        piece: germanyLayout ? Number(germanyLayout.size.toFixed(2)) : null,
        expand: !!germanyLayout?.expand,
      } : null,
      japan: japan ? {
        ...territoryCenter(japan),
        tokens: japanLayout?.tokens.length || 0,
        piece: japanLayout ? Number(japanLayout.size.toFixed(2)) : null,
        expand: !!japanLayout?.expand,
        overlap: japanLayout ? Number(japanLayout.overlap.toFixed(3)) : 0,
      } : null,
      owners: Object.keys(owners).length,
      placements: Object.keys(placements).length,
      continents: continents.length,
      idleConfirm: 'Tap the glowing red stack',
      phaseStrip: guideSteps(play),
      pulse: highlights(play).pulse,
      confirmGold: SELECT_GOLD,
      stress: stressOn,
      play: inspectPlay(play),
    };
  };

  window.__uxPreview = {
    inspect,
    selectLand: (name) => {
      const t = territories.find((x) => x.name === name);
      if (t) selectLand(t);
      return t?.name || null;
    },
    pickUnit: (type) => {
      pickUnit(play, type);
      syncSelectionFromPlay();
      paintChrome();
      camera.dirty = true;
      return { ...(play.selectedUnits || {}) };
    },
    confirm: () => {
      confirmPlay(play);
      syncSelectionFromPlay();
      fitPocket();
      paintChrome();
      camera.dirty = true;
      return inspectPlay(play);
    },
    frameEurope: fitEurope,
    framePocket: fitPocket,
    frameNear: () => frameNamed('Germany', 1.15),
    frameJapan: () => frameNamed('Japan', 1.15),
    frameNamed,
    setStacksExpanded: (on) => {
      stacksExpanded = !!on;
      chrome.setStacksExpanded(stacksExpanded);
      camera.dirty = true;
    },
    stressMaxTypes: (name = 'Japan') => {
      const owner = name === 'Germany' ? 'Germans' : 'Japanese';
      placements[name] = stressStacks(owner, STRESS_LAND_TYPES);
      camera.dirty = true;
      return placements[name].length;
    },
    overlapReport: () => overlapReport(currentLayouts()),
    layouts: currentLayouts,
    chrome,
    playInspect: () => inspectPlay(play),
    reset: () => {
      resetScenario(play);
      syncSelectionFromPlay();
      fitPocket();
      paintChrome();
      camera.dirty = true;
      return inspectPlay(play);
    },
    drive: (step) => {
      if (step === 'move') driveCombatMove(play);
      else if (step === 'battle') driveBattleMid(play);
      else if (step === 'air') driveAirChoice(play);
      else if (step === 'landed') driveLanded(play, 'Russia');
      syncSelectionFromPlay();
      fitPocket();
      paintChrome();
      camera.dirty = true;
      return inspectPlay(play);
    },
  };

  console.log('[ux-preview]', inspect());
  reportStartupStatus('Preview ready', 100);
  dismissStartupLoader();
}
