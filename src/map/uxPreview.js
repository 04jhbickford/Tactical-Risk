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
  createPreviewFlow,
  DEMO,
  FLOW_INSPECT,
  FLOW_COMBAT_MOVE,
} from './uxPreviewFlows.js';

const SELECT_GOLD = '#C4A35A';
const ATTACK_CORAL = '#C45A5A';
const EUROPE_FIT = { minX: 620, minY: 180, maxX: 1680, maxY: 980 };

function applyLiveContinents(list, bonusGroups) {
  const of = new Map();
  for (const c of bonusGroups || []) {
    for (const n of c.territories || []) of.set(n, c.name);
  }
  for (const t of list || []) {
    if (of.has(t.name)) t.continent = of.get(t.name);
  }
}

function strokeSelectOutline(ctx, territory, territoryRenderer, zoom, color = SELECT_GOLD) {
  if (!territory) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.4, 3.4 / Math.max(0.18, zoom));
  ctx.shadowColor = 'rgba(30, 36, 32, 0.72)';
  ctx.shadowBlur = 10 / Math.max(0.18, zoom);
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
  const placements = { ...(setup.classic?.unitPlacements || {}) };
  const owners = setup.classic?.territoryOwners || {};
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
  const germans = factions.find((f) => f.id === 'Germans');
  const inspectOnly = (() => {
    const params = new URLSearchParams(location.search);
    const v = String(params.get('inspect') || '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  })();

  const flow = createPreviewFlow({
    placements,
    owners,
    mode: inspectOnly ? FLOW_INSPECT : FLOW_COMBAT_MOVE,
  });

  const chrome = injectThreeChrome({
    seat: inspectOnly ? 'Russians' : DEMO.seat,
    ipc: inspectOnly ? (russians?.startingPUs || 24) : DEMO.ipc,
    phase: inspectOnly ? 'PLACE' : 'COMBAT MOVE',
  });
  chrome.setSeat(
    inspectOnly ? 'Russians' : DEMO.seat,
    inspectOnly ? (russians?.color || '#B22222') : (germans?.color || DEMO.seatColor),
  );

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
  window.addEventListener('resize', resizeCanvas);

  let selected = null;
  let selectedUnitType = null;
  let confirmed = false;
  let stacksExpanded = false;
  let hover = null;

  function landByName(name) {
    return territories.find((t) => t.name === name) || null;
  }

  function paintChrome() {
    const snap = flow.snapshot();
    if (snap.mode === FLOW_INSPECT) {
      chrome.setPhase('PLACE');
      chrome.setDoneButton({ on: false });
      chrome.paintSelection({
        land: selected,
        stacks: selected ? (placements[selected.name] || []) : [],
        unitType: selectedUnitType,
        confirmed,
      });
      return;
    }
    if (snap.mode === FLOW_COMBAT_MOVE) {
      chrome.setPhase('COMBAT MOVE');
      const src = landByName(DEMO.source);
      chrome.setDoneButton({
        label: 'End Combat Movement →',
        on: snap.done,
        disabled: !snap.done,
      });
      chrome.paintCombatMove({
        land: src,
        stacks: placements[DEMO.source] || [],
        staged: snap.staged,
        dest: snap.dest,
        cta: flow.currentCta(),
      });
      selected = src;
      return;
    }
    if (snap.mode === FLOW_BATTLE) {
      chrome.setPhase('BATTLE');
      chrome.setDoneButton({ on: false });
      chrome.paintBattle({
        dest: snap.dest || DEMO.dests[0],
        phase: snap.battlePhase,
        step: snap.battleStep,
        hint: snap.battleHint,
        attHits: snap.attHits,
        defHits: snap.defHits,
        retreated: snap.retreated,
        cta: flow.currentCta(),
      });
      selected = landByName(snap.dest || DEMO.source);
      return;
    }
    chrome.setPhase('LAND AIR');
    chrome.setDoneButton({ on: false });
    chrome.paintAirLanding({
      remaining: snap.airRemaining,
      units: flow.state.airUnits,
      landings: snap.landings,
      options: DEMO.landingOptions,
      cta: flow.currentCta(),
    });
    selected = landByName(flow.selectedName());
  }

  function refresh() {
    paintChrome();
    camera.dirty = true;
  }

  chrome.onStackToggle = (on) => {
    stacksExpanded = on;
    camera.dirty = true;
  };
  chrome.onUnitPick = (type) => {
    if (flow.snapshot().mode === FLOW_INSPECT) {
      selectedUnitType = type || null;
      confirmed = false;
      paintChrome();
      camera.dirty = true;
      return;
    }
    flow.tapUnit(type);
    refresh();
  };
  chrome.onConfirm = () => {
    if (flow.snapshot().mode === FLOW_INSPECT) {
      confirmed = true;
      paintChrome();
      return;
    }
    flow.confirm();
    refresh();
  };
  chrome.onDone = () => {
    flow.confirm();
    refresh();
  };
  chrome.onFlowAction = (action, extra) => {
    if (action === 'start-inspect') {
      flow.flowAction('start-inspect');
      chrome.setSeat('Russians', russians?.color || '#B22222');
      chrome.setIpc(russians?.startingPUs || 24);
      selected = null;
      refresh();
      return;
    }
    if (action === 'start-combat') {
      flow.startCombatMove();
      chrome.setSeat(DEMO.seat, germans?.color || DEMO.seatColor);
      chrome.setIpc(DEMO.ipc);
      fitEast();
      refresh();
      return;
    }
    flow.flowAction(action, extra);
    refresh();
  };

  function fitEurope() {
    camera.fitBounds(EUROPE_FIT, {
      padding: 12,
      padTop: 56,
      padBottom: 96,
      fillFrame: true,
    });
  }
  function fitEast() {
    camera.fitBounds(DEMO.eastFit, {
      padding: 12,
      padTop: 56,
      padBottom: 132,
      fillFrame: true,
    });
  }
  if (inspectOnly) fitEurope();
  else fitEast();

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
    if (flow.snapshot().mode !== FLOW_INSPECT) {
      if (next?.name) flow.tapLand(next.name);
      refresh();
      return;
    }
    selected = next || null;
    selectedUnitType = null;
    confirmed = false;
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
    if (btn.dataset.zoom === 'fit') fitEurope();
    else camera.zoomBy(btn.dataset.zoom);
  });
  chrome.confirm.addEventListener('click', (e) => {
    e.stopPropagation();
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
      const highlights = flow.highlightNames();
      for (const name of highlights) {
        const t = landByName(name);
        if (!t) continue;
        const attack = DEMO.dests.includes(name) || DEMO.landingOptions.includes(name);
        strokeSelectOutline(
          ctx,
          t,
          territoryRenderer,
          camera.zoom,
          attack && name !== DEMO.source ? ATTACK_CORAL : SELECT_GOLD,
        );
      }
      if (selected && !highlights.includes(selected.name)) {
        strokeSelectOutline(ctx, selected, territoryRenderer, camera.zoom);
      }
      renderPreviewStacks(ctx, {
        territories,
        placements,
        images,
        zoom: camera.zoom,
        selectedName: selected?.name || null,
        stacksExpanded,
        factionColors,
      });
      ctx.restore();
    }
  }

  function loop() {
    if (camera.dirty || camera._targetX !== null) {
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
      guideOn: false,
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
      idleConfirm: 'Select a territory',
      confirmGold: SELECT_GOLD,
      stress: stressOn,
      flow: flow.snapshot(),
    };
  };

  window.__uxPreview = {
    inspect,
    flow,
    selectLand: (name) => {
      const t = territories.find((x) => x.name === name);
      if (t) selectLand(t);
      return t?.name || null;
    },
    frameEurope: fitEurope,
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
    startCombatMove: () => {
      flow.startCombatMove();
      chrome.setSeat(DEMO.seat, germans?.color || DEMO.seatColor);
      chrome.setIpc(DEMO.ipc);
      fitEast();
      refresh();
    },
    tapLand: (name) => {
      flow.tapLand(name);
      refresh();
      return flow.snapshot();
    },
    tapUnit: (type) => {
      flow.tapUnit(type);
      refresh();
      return flow.snapshot();
    },
    confirmFlow: () => {
      flow.confirm();
      refresh();
      return flow.snapshot();
    },
    flowAction: (action, extra) => {
      flow.flowAction(action, extra);
      refresh();
      return flow.snapshot();
    },
  };

  paintChrome();
  console.log('[ux-preview]', inspect());
  reportStartupStatus('Preview ready', 100);
  dismissStartupLoader();
}
