// Side-project: full local vs-AI game on Three HUD + main Canvas art.
// Gated by ?three=1&solo=1. Preview only — do not merge to main.

import { Camera, MAP_WIDTH } from './camera.js';
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
} from './uxPreviewUnits.js';
import {
  dismissStartupLoader,
  reportStartupError,
  reportStartupStatus,
} from '../ui/startupLoader.js';
import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { isSoloRequested, soloSeatRequested, soloAiRequested } from './uxPreviewFlag.js';
import {
  bindSealedActivate,
  clientPointOf,
  eventElement,
  shouldIgnoreMapHit,
} from './threeChromeEvents.js';
import { SELECT_GOLD, LAND_TEAL } from './uxPreviewScenario.js';
import { GameState, GAME_PHASES, TURN_PHASES, SETUP_TURN_PHASE, stampClassicCapitals } from '../state/gameState.js';
import { AIController } from '../ai/aiController.js';
import { createSoloSession } from './uxSoloAdapter.js';
import {
  clearSoloSave,
  hasSoloSave,
  readSoloSave,
  soloNewGameHref,
  writeSoloSave,
} from './uxSoloSave.js';

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

function classicRoster(setup, seatId, aiLevel) {
  const factions = setup.classic?.factions || [];
  return factions.map((f) => ({
    ...f,
    isAI: f.id !== seatId,
    aiDifficulty: f.id === seatId ? 'human' : aiLevel,
  }));
}

function prepareClassicTurn(gameState) {
  stampClassicCapitals(gameState);
  if (gameState.phase === GAME_PHASES.PLAYING && gameState.turnPhase === SETUP_TURN_PHASE) {
    gameState.turnPhase = TURN_PHASES.DEVELOP_TECH;
  }
  for (const p of gameState.players || []) {
    if (!gameState.playerTechs[p.id]) {
      gameState.playerTechs[p.id] = { techTokens: 0, unlockedTechs: [] };
    }
    if (!gameState.riskCards[p.id]) gameState.riskCards[p.id] = [];
  }
  gameState._initFriendlyTerritoriesAtTurnStart?.();
}

function restartSolo() {
  clearSoloSave();
  location.href = soloNewGameHref(location.href);
}

export async function bootUxSolo() {
  if (!isSoloRequested()) {
    reportStartupError('Solo vs AI needs ?three=1&solo=1');
    return;
  }

  reportStartupStatus('Solo vs AI — loading board…', 24);

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
    reportStartupError('Solo vs AI could not load territory data.');
    return;
  }

  const canvas = document.getElementById('mapCanvas');
  if (!canvas) {
    reportStartupError('Solo vs AI missing #mapCanvas.');
    return;
  }

  const seatId = (() => {
    const asked = soloSeatRequested();
    const ids = (setup.classic?.factions || []).map((f) => f.id);
    return ids.includes(asked) ? asked : 'Russians';
  })();
  const aiLevel = soloAiRequested();

  const gameState = new GameState(setup, territories, continents);
  gameState.isMultiplayer = false;
  gameState.soloLocal = true;
  gameState.unitDefs = unitDefs;
  gameState.initGame('classic', classicRoster(setup, seatId, aiLevel), { alliancesEnabled: true });

  const saved = readSoloSave();
  let resumed = false;
  if (saved?.state) {
    try {
      gameState.loadFromJSON(saved.state);
      gameState.isMultiplayer = false;
      gameState.soloLocal = true;
      resumed = true;
    } catch (err) {
      console.warn('Solo autosave discarded:', err);
      clearSoloSave();
    }
  }
  prepareClassicTurn(gameState);

  const session = createSoloSession({ gameState, unitDefs, seatId, hasSave: resumed });
  const ai = new AIController();
  ai.setUnitDefs(unitDefs);
  ai.setCanAct(() => !!session.ui.started && !gameState.gameOver);
  ai.setOnStatusUpdate((msg) => {
    session.setNotice(msg);
    paintChrome();
  });
  ai.setOnAction(() => {
    session.syncMode();
    paintChrome();
    camera.dirty = true;
  });
  ai.setGameState(gameState);

  const ctx = canvas.getContext('2d');
  const camera = new Camera(canvas);
  camera.usePhoneMinZoom = true;

  const mapRenderer = new MapRenderer();
  const territoryRenderer = new TerritoryRenderer(territories, continents);
  const territoryMap = new TerritoryMap(territories);
  territoryRenderer.setGameState(gameState);

  const factions = setup.classic?.factions || [];
  const factionColors = new Map(factions.map((f) => [f.id, f.color]));
  const seat = gameState.getPlayer(seatId);

  const chrome = injectThreeChrome({
    seat: seat?.name || seatId,
    ipc: gameState.getIPCs(seatId),
    phase: 'SOLO',
  });
  chrome.setSeat(seat?.name || seatId, seat?.color || '#B22222');
  const note = chrome.sheet?.querySelector('.three-sheet-note');
  if (note) {
    note.textContent = `Solo vs AI · ${GAME_VERSION} · SCHEMA ${SCHEMA_VERSION} · no lobby · do not merge.`;
  }
  const newGameBtn = document.createElement('button');
  newGameBtn.type = 'button';
  newGameBtn.className = 'three-sheet-row';
  newGameBtn.dataset.sheet = 'new-solo';
  newGameBtn.textContent = 'New Game vs AI';
  if (note) chrome.sheet.insertBefore(newGameBtn, note);
  else chrome.sheet?.appendChild(newGameBtn);
  bindSealedActivate(newGameBtn, null, () => restartSolo());

  reportStartupStatus('Loading tiles and unit chits…', 52);
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
    fitEurope();
  });

  let stacksExpanded = false;

  function placements() {
    return gameState.units || {};
  }

  function paintChrome() {
    const model = session.chromeModel(territories);
    chrome.setPhase(model.phase);
    chrome.setIpc(model.ipc);
    chrome.setSeat(model.seat, seat?.color || '#B22222');
    chrome.paintPlay({
      land: model.land,
      stacks: model.stacks,
      steppers: model.steppers,
      airLand: model.airLand,
      label: model.label,
      gold: model.gold,
      enabled: model.enabled,
      battle: model.battle,
      replay: model.replay,
      route: model.route,
    });
    const strip = model.shell?.steps?.length
      ? model.shell.steps
      : [model.phase];
    const stripNow = model.shell?.current || 1;
    chrome.setPhaseStrip(strip, stripNow);
  }

  chrome.onStackToggle = (on) => {
    stacksExpanded = on;
    camera.dirty = true;
  };
  chrome.onUnitPick = (type) => {
    session.adjustUnit(type, 1);
    paintChrome();
    camera.dirty = true;
  };
  chrome.onUnitStep = (type, delta) => {
    session.adjustUnit(type, delta);
    paintChrome();
    camera.dirty = true;
  };
  chrome.onLossPick = (side, type) => {
    session.adjustLoss(side, type, 1);
    paintChrome();
    camera.dirty = true;
  };
  chrome.onLossStep = (side, type, delta) => {
    session.adjustLoss(side, type, delta);
    paintChrome();
    camera.dirty = true;
  };

  function fitEurope() {
    camera.fitBounds(EUROPE_FIT, {
      padding: 12,
      padTop: 56,
      padBottom: 96,
      fillFrame: true,
    });
  }
  fitEurope();
  paintChrome();

  function pickAt(sx, sy) {
    const world = camera.screenToWorld(sx, sy);
    world.x = ((world.x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
    const fromStack = hitTestPreviewStack(world.x, world.y, {
      territories,
      placements: placements(),
      zoom: camera.zoom,
      selectedName: session.ui.selected,
      stacksExpanded,
    });
    return fromStack || territoryMap.hitTest(world.x, world.y);
  }

  function selectLand(next) {
    if (next?.name) session.tap(next.name);
    paintChrome();
    camera.dirty = true;
  }

  function eventFromChrome(e) {
    const node = eventElement(e);
    if (!node || typeof node.closest !== 'function') return false;
    return !!node.closest('#three-bottom, #three-l0, #three-zoom, #three-sheet, #three-phase-strip');
  }

  function ignoreMapHit(e) {
    const pt = clientPointOf(e);
    return shouldIgnoreMapHit({
      sheetOpen: chrome.isSheetOpen(),
      targetInChrome: eventFromChrome(e),
      clientX: pt?.x,
      clientY: pt?.y,
      rects: chrome.hitRects(),
    });
  }

  canvas.addEventListener('mousedown', (e) => {
    if (ignoreMapHit(e)) return;
    camera.onMouseDown(e);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (camera.onMouseMove(e)) {
      canvas.classList.add('is-panning');
      return;
    }
    if (ignoreMapHit(e)) {
      canvas.classList.remove('is-hovering');
      return;
    }
    const hit = pickAt(e.clientX, e.clientY);
    canvas.classList.toggle('is-hovering', !!hit);
    camera.dirty = true;
  });
  window.addEventListener('mouseup', (e) => {
    const wasDrag = camera.onMouseUp();
    canvas.classList.remove('is-panning');
    if (wasDrag) return;
    if (ignoreMapHit(e)) return;
    selectLand(pickAt(e.clientX, e.clientY));
  });
  canvas.addEventListener('wheel', (e) => camera.onWheel(e), { passive: false });

  let pinch = null;
  canvas.addEventListener('touchstart', (e) => {
    if (ignoreMapHit(e)) {
      e.preventDefault();
      return;
    }
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
      if (wasDrag || ignoreMapHit(e)) return;
      const t = e.changedTouches[0];
      if (t) selectLand(pickAt(t.clientX, t.clientY));
    }
  });

  bindSealedActivate(chrome.zoom, '[data-zoom]', (e, btn) => {
    if (btn.dataset.zoom === 'fit') fitEurope();
    else camera.zoomBy(btn.dataset.zoom);
  });
  bindSealedActivate(chrome.confirm, null, () => {
    if (chrome.confirm.disabled) return;
    if (gameState.gameOver) {
      restartSolo();
      return;
    }
    session.confirm();
    if (session.ui.started) {
      writeSoloSave({ gameState, seatId, aiLevel });
      ai.checkAndProcessAI();
    }
    paintChrome();
    camera.dirty = true;
  });

  gameState.subscribe(() => {
    territoryRenderer.setGameState(gameState);
    session.syncMode();
    if (session.ui.started && !gameState.gameOver) {
      writeSoloSave({ gameState, seatId, aiLevel });
    }
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
    const marks = session.highlights();
    const byName = (name) => territories.find((t) => t.name === name);
    const wave = 0.5 + 0.5 * Math.sin(performance.now() / 280);
    const pulsing = new Set(marks.pulse || []);

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
      if (session.ui.selected && session.ui.selected !== marks.origin && session.ui.selected !== marks.dest) {
        const landColor = (marks.landable || []).includes(session.ui.selected) ? LAND_TEAL : SELECT_GOLD;
        strokeSelectOutline(ctx, byName(session.ui.selected), territoryRenderer, camera.zoom, {
          color: landColor,
          width: 3.2,
        });
      }
      renderPreviewStacks(ctx, {
        territories,
        placements: placements(),
        images,
        zoom: camera.zoom,
        selectedName: session.ui.selected || null,
        stacksExpanded,
        factionColors,
        pulseNames: marks.pulse || [],
        pulseWave: wave,
      });
      ctx.restore();
    }
  }

  function loop() {
    const pulsing = session.highlights().pulse?.length > 0;
    if (camera.dirty || camera._targetX !== null || pulsing) {
      camera.dirty = false;
      paint();
    }
    requestAnimationFrame(loop);
  }
  paint();
  requestAnimationFrame(loop);

  window.__uxSolo = {
    inspect: () => ({
      artSource: 'main',
      uxSource: 'threeSolo',
      sideProject: true,
      doNotMerge: true,
      version: GAME_VERSION,
      schema: SCHEMA_VERSION,
      soloQuery: '?three=1&solo=1',
      seat: seatId,
      ai: aiLevel,
      lobby: false,
      firebase: false,
      resumed,
      hasSave: hasSoloSave(),
      capitals: Object.fromEntries(
        (gameState.players || []).map((p) => [p.id, gameState.playerState[p.id]?.capitalTerritory || null]),
      ),
      mapSize: { w: MAP_WIDTH },
      lod: lodBandFromZoom(camera.zoom),
      play: session.inspect(),
    }),
    newGame: () => restartSolo(),
    confirm: () => {
      session.confirm();
      paintChrome();
      camera.dirty = true;
      return session.inspect();
    },
    tap: (name) => {
      session.tap(name);
      paintChrome();
      camera.dirty = true;
      return session.inspect();
    },
    adjustUnit: (type, delta = 1) => {
      session.adjustUnit(type, delta);
      paintChrome();
      camera.dirty = true;
      return session.inspect();
    },
    chrome,
    session,
    gameState,
  };

  console.log('[ux-solo]', window.__uxSolo.inspect());
  reportStartupStatus('Solo vs AI ready', 100);
  dismissStartupLoader();
}
