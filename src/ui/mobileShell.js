// Phone chrome (V2.63/V2.64). Visual split only.
// iPhone shell is max-width: 480px so the V2.61 tablet band (481–900)
// and desktop ≥901px stay on their existing trees. Phone CSS lives in
// @media (max-width: 480px) and html.mobile-shell.
// Landscape phones are typically 667–932 wide × ~390 tall — width-only
// 480px would drop them into the tablet tree. Height ≤480 and width <901
// keeps that viewport on the phone shell. Desktop ≥901 and tablet 481–900
// (when height is omitted or >480) stay frozen. No rules / combat / schema changes.

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_ORDER, TURN_PHASE_NAMES } from '../state/gameState.js';
import { MAP_WIDTH, MAP_HEIGHT } from '../map/camera.js';

export const MOBILE_SHELL_MAX_WIDTH = 480;
export const MOBILE_SHELL_QUERY = `(max-width: ${MOBILE_SHELL_MAX_WIDTH}px)`;
export const TABLET_CHROME_MAX_WIDTH = 900;
export const DESKTOP_MIN_WIDTH = 901;

const listeners = [];

export function shouldUseMobileShell(viewportWidth, viewportHeight) {
  const width = Number(viewportWidth);
  if (!Number.isFinite(width)) return false;
  if (width <= MOBILE_SHELL_MAX_WIDTH) return true;
  if (viewportHeight == null || viewportHeight === '') return false;
  const height = Number(viewportHeight);
  if (!Number.isFinite(height)) return false;
  return height <= MOBILE_SHELL_MAX_WIDTH && width < DESKTOP_MIN_WIDTH;
}

export function isMobileShell() {
  return typeof document !== 'undefined' &&
    document.documentElement.classList.contains('mobile-shell');
}

export function onMobileShellChange(fn) {
  if (typeof fn === 'function') listeners.push(fn);
}

function notify(active) {
  for (const fn of listeners) {
    try { fn(active); } catch { /* listener errors must not break chrome */ }
  }
}

export function applyMobileShellClass(viewportWidth, root = (typeof document !== 'undefined' ? document.documentElement : null), viewportHeight) {
  if (!root) return false;
  const active = shouldUseMobileShell(viewportWidth, viewportHeight);
  root.classList.toggle('mobile-shell', active);
  return active;
}

export function setShellFlag(name, on, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!root || !name) return;
  root.classList.toggle(name, !!on);
}

// Handoff must hide HUD / panel / zoom / chips — not sit on top of them.
export function shouldHideAllGameChrome({ handoffVisible } = {}) {
  return !!handoffVisible;
}

// Auto-battle / combat popup must not leave End Turn, Done, or Max up.
export function shouldHideTurnActionChrome({ combatVisible } = {}) {
  return !!combatVisible;
}

// One enabled primary CTA. End Turn and Done never coexist. Disabled
// (illegal) actions are dropped — not greyed on top of another green.
export function pickMobilePrimaryButtons(buttons) {
  const enabled = (Array.isArray(buttons) ? buttons : []).filter(b => b && !b.disabled);
  const hasDone = enabled.some(b => b.action === 'finish-placement');
  const filtered = hasDone
    ? enabled.filter(b => b.action !== 'next-phase')
    : enabled;
  const primary = filtered.find(b => b.primary) || filtered[0];
  return primary ? [primary] : [];
}

// Always-visible phase identity. Do not copy the tablet 9px / hidden-dots path.
// Playing: "3/7 Combat Movement". Setup phases keep their name.
export function formatMobilePhaseLabel(gamePhase, turnPhase) {
  if (gamePhase === GAME_PHASES.CAPITAL_PLACEMENT) return 'Place Capital';
  if (gamePhase === GAME_PHASES.UNIT_PLACEMENT) return 'Initial Deployment';
  if (gamePhase === GAME_PHASES.PLAYING) {
    const name = TURN_PHASE_NAMES[turnPhase] || 'Playing';
    const idx = TURN_PHASE_ORDER.indexOf(turnPhase);
    if (idx >= 0) return `${idx + 1}/${TURN_PHASE_ORDER.length} ${name}`;
    return name;
  }
  return 'Setup';
}

// Visible chip meta — never title-only IPC / Surrendered.
export function formatMobilePlayerMeta({ ipcs, surrendered } = {}) {
  const parts = [];
  if (Number.isFinite(Number(ipcs))) parts.push(`${Number(ipcs)}$`);
  if (surrendered) parts.push('OUT');
  return parts.join(' · ');
}

// Phone in-game chrome: Players / Territory / Log live in the menu sheet.
// Never keep a permanent 4-tab bar on the map.
export function shouldShowPhoneChromeTabs({ mobile } = {}) {
  return !mobile;
}

// Initial deployment on phone is a tray of remaining units, not the
// desktop queue/+/-/confirm sheet squeezed into the bottom overlay.
export function shouldUsePhonePlacementTray({ mobile, phase } = {}) {
  return !!mobile && phase === GAME_PHASES.UNIT_PLACEMENT;
}

// Purchase / tech / movement / mobilize still have a body in the DOM.
// V2.67: that body is a hidden region until the peek tray expands.
export function shouldShowPhonePanelBody({
  mobile,
  phase,
  turnPhase,
  airLanding,
  movePending,
} = {}) {
  if (!mobile) return true;
  if (airLanding || movePending) return true;
  if (phase === GAME_PHASES.UNIT_PLACEMENT) return true;
  if (phase === GAME_PHASES.PLAYING) {
    return turnPhase === TURN_PHASES.DEVELOP_TECH
      || turnPhase === TURN_PHASES.PURCHASE
      || turnPhase === TURN_PHASES.COMBAT_MOVE
      || turnPhase === TURN_PHASES.NON_COMBAT_MOVE
      || turnPhase === TURN_PHASES.MOBILIZE;
  }
  return false;
}

// One row of unit/action chips on the peek detent so Purchase /
// Mobilize / Deploy stay one-handed without opening the full list.
export function shouldShowPhonePeekUnitRow({ mobile, phase, turnPhase } = {}) {
  if (!mobile) return false;
  if (phase === GAME_PHASES.UNIT_PLACEMENT) return true;
  if (phase === GAME_PHASES.PLAYING) {
    return turnPhase === TURN_PHASES.DEVELOP_TECH
      || turnPhase === TURN_PHASES.PURCHASE
      || turnPhase === TURN_PHASES.MOBILIZE;
  }
  return false;
}

// Default phone chrome is map + thin peek. Expand is opt-in.
// Air-landing / move-confirm keep the body up so those flows stay visible.
export function shouldPeekPhoneTray({
  mobile,
  expanded,
  airLanding,
  movePending,
} = {}) {
  if (!mobile) return false;
  if (expanded) return false;
  if (airLanding || movePending) return false;
  return true;
}

// Phone always peeks unless expanded (or air-landing / move-confirm).
// Desktop never collapses. phase/turnPhase kept so existing callers compile.
export function shouldCollapseMobileTray({
  mobile,
  phase,
  turnPhase,
  airLanding,
  movePending,
  expanded,
} = {}) {
  void phase;
  void turnPhase;
  return shouldPeekPhoneTray({ mobile, expanded, airLanding, movePending });
}

// Expanded detent cap — one sheet, not a 280px column or 42/50dvh cover.
export const PHONE_PEEK_EXPANDED_MAX_DVH = 36;

export const PHONE_MIN_ZOOM_FLOOR = 0.10;
export const PHONE_FIT_PAD_TOP = 64;
export const PHONE_FIT_PAD_BOTTOM = 120;

export function phoneUnitIconSize(zoom, { mobile } = {}) {
  if (mobile) return Math.max(20, Math.min(36, 28 * Math.max(Number(zoom) || 0, 0.35)));
  return Math.max(14, Math.min(24, 20 * (Number(zoom) || 0)));
}

export function shouldHideUnitsAtZoom(zoom, { mobile } = {}) {
  return !mobile && (Number(zoom) || 0) < 0.35;
}

export function territoryFitPoint(t) {
  if (!t) return null;
  if (Array.isArray(t.center) && Number.isFinite(t.center[0]) && Number.isFinite(t.center[1])) {
    return { x: t.center[0], y: t.center[1] };
  }
  const poly = t.polygons?.[0];
  if (!Array.isArray(poly) || poly.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of poly) {
    if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      sx += p[0];
      sy += p[1];
      n++;
    }
  }
  return n ? { x: sx / n, y: sy / n } : null;
}

export function boundsFromPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return null;
  // Scattered worldwide sets are a world fit, not a tiny bbox.
  if (maxX - minX > MAP_WIDTH * 0.7) return null;
  return { minX, minY, maxX, maxY };
}

// When owned land spans the world, still return a regional window around
// the centroid so Fit is not a letterboxed world poster.
export function phoneProblemBounds(points) {
  const tight = boundsFromPoints(points);
  if (tight) return tight;
  if (!Array.isArray(points) || points.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    sx += p.x;
    sy += p.y;
    n++;
  }
  if (!n) return null;
  const cx = sx / n;
  const cy = sy / n;
  const hw = MAP_WIDTH * 0.16;
  const hh = MAP_HEIGHT * 0.20;
  return {
    minX: cx - hw,
    maxX: cx + hw,
    minY: Math.max(0, cy - hh),
    maxY: Math.min(MAP_HEIGHT, cy + hh),
  };
}

// Contain the problem in the padded rect, but never zoom out so far that
// the 2000-tall map letterboxes on the teal canvas (#3CC0BF).
export function phoneFitZoom({ cssW, cssH, canvasH, bw, bh, maxZoom = 3 } = {}) {
  const w = Math.max(1, Number(cssW) || 1);
  const h = Math.max(1, Number(cssH) || 1);
  const ch = Math.max(1, Number(canvasH) || h);
  const boxW = Math.max(1, Number(bw) || 1);
  const boxH = Math.max(1, Number(bh) || 1);
  const contain = Math.min(w / boxW, h / boxH);
  const fillHeight = ch / MAP_HEIGHT;
  return Math.min(maxZoom, Math.max(contain, fillHeight));
}

export function phoneFitLetterboxesMap({ canvasH, zoom } = {}) {
  const z = Number(zoom);
  const h = Number(canvasH);
  if (!Number.isFinite(z) || z <= 0 || !Number.isFinite(h) || h <= 0) return true;
  return h / z > MAP_HEIGHT + 0.5;
}

export function collectPhoneFitPoints(territories, predicate) {
  const list = Array.isArray(territories) ? territories : Object.values(territories || {});
  const pts = [];
  for (const t of list) {
    if (predicate && !predicate(t)) continue;
    const p = territoryFitPoint(t);
    if (p) pts.push(p);
  }
  return pts;
}

function uniqueNames(list) {
  const out = [];
  const seen = new Set();
  for (const n of Array.isArray(list) ? list : []) {
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function indexTerritoriesByName(territories) {
  const list = Array.isArray(territories) ? territories : Object.values(territories || {});
  const byName = {};
  for (const t of list) {
    if (t?.name) byName[t.name] = t;
  }
  return byName;
}

export function neighborNamesOf(name, byName) {
  const conns = byName?.[name]?.connections;
  return Array.isArray(conns) ? conns.filter(Boolean) : [];
}

// Owned + dests. Selected never replaces that set (one-chip Fit).
// Owned ≤ 1 (Place Capital / first deploy): legal dests / that name, then expand.
export function collectPhoneFitFocusNames({
  ownedNames = [],
  selectedName,
  destinationNames = [],
} = {}) {
  const owned = uniqueNames(ownedNames);
  const dests = uniqueNames(destinationNames);
  if (owned.length <= 1) return uniqueNames([...owned, ...dests, selectedName]);
  return uniqueNames([...owned, ...dests]);
}

export function expandPhoneFitRegionNames(names, territories) {
  const byName = indexTerritoriesByName(territories);
  const out = [];
  const seen = new Set();
  const add = (n) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  for (const name of uniqueNames(names)) {
    add(name);
    for (const n of neighborNamesOf(name, byName)) add(n);
  }
  return out;
}

function ownedClusterContaining(ownedNames, startName, byName) {
  const owned = new Set(ownedNames);
  if (!startName || !owned.has(startName)) return [];
  const out = [];
  const seen = new Set([startName]);
  const stack = [startName];
  while (stack.length) {
    const cur = stack.pop();
    out.push(cur);
    for (const n of neighborNamesOf(cur, byName)) {
      if (!owned.has(n) || seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return out;
}

function allOwnedClusters(ownedNames, byName) {
  const seen = new Set();
  const clusters = [];
  for (const name of ownedNames) {
    if (seen.has(name)) continue;
    const cluster = ownedClusterContaining(ownedNames, name, byName);
    for (const n of cluster) seen.add(n);
    if (cluster.length) clusters.push(cluster);
  }
  return clusters;
}

// Worldwide empires: prefer the capital's cluster, else the largest.
// Never the whole poster. Never a single selected chip.
export function pickPhoneFitOwnedCluster(ownedNames, territories) {
  const owned = uniqueNames(ownedNames);
  if (owned.length <= 1) return owned;
  const byName = indexTerritoriesByName(territories);
  const pts = [];
  for (const name of owned) {
    const p = territoryFitPoint(byName[name]);
    if (p) pts.push(p);
  }
  if (boundsFromPoints(pts)) return owned;
  const clusters = allOwnedClusters(owned, byName);
  const capital = clusters.find(c => c.some(n => byName[n]?.isCapital));
  if (capital) return capital;
  clusters.sort((a, b) => b.length - a.length);
  return clusters[0] || owned;
}

function destsNearSeed(dests, seed, byName) {
  const seedSet = new Set(seed);
  return uniqueNames(dests).filter(d => (
    seedSet.has(d) || neighborNamesOf(d, byName).some(n => seedSet.has(n))
  ));
}

// Regional window: owned + neighbors / legal dests. Includes adjacent sea
// so a coastal starting region still shows coastline.
export function resolvePhoneFitRegionNames({
  ownedNames = [],
  selectedName,
  destinationNames = [],
  territories,
} = {}) {
  const byName = indexTerritoriesByName(territories);
  const owned = uniqueNames(ownedNames);
  const dests = uniqueNames(destinationNames);
  let seedOwned = owned;
  const ownedPts = [];
  for (const name of owned) {
    const p = territoryFitPoint(byName[name]);
    if (p) ownedPts.push(p);
  }
  const worldwide = owned.length > 1 && !boundsFromPoints(ownedPts);
  if (worldwide) {
    const preferred = owned.includes(selectedName)
      ? selectedName
      : (owned.find(n => dests.includes(n)) || null);
    seedOwned = preferred
      ? (ownedClusterContaining(owned, preferred, byName) || pickPhoneFitOwnedCluster(owned, territories))
      : pickPhoneFitOwnedCluster(owned, territories);
  }
  const seed = collectPhoneFitFocusNames({
    ownedNames: seedOwned,
    selectedName: seedOwned.length <= 1 ? selectedName : null,
    destinationNames: worldwide ? destsNearSeed(dests, seedOwned, byName) : dests,
  });
  return expandPhoneFitRegionNames(seed, territories);
}

// One chip is not a region. Pad a tiny bbox so Fit never frames a single tile.
export const PHONE_FIT_MIN_REGION_W = MAP_WIDTH * 0.14;
export const PHONE_FIT_MIN_REGION_H = MAP_HEIGHT * 0.16;

export function ensurePhoneFitRegionBounds(bounds) {
  if (!bounds) return null;
  let { minX, maxX, minY, maxY } = bounds;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  if (maxX - minX < PHONE_FIT_MIN_REGION_W) {
    minX = cx - PHONE_FIT_MIN_REGION_W / 2;
    maxX = cx + PHONE_FIT_MIN_REGION_W / 2;
  }
  if (maxY - minY < PHONE_FIT_MIN_REGION_H) {
    minY = cy - PHONE_FIT_MIN_REGION_H / 2;
    maxY = cy + PHONE_FIT_MIN_REGION_H / 2;
  }
  return {
    minX,
    maxX,
    minY: Math.max(0, minY),
    maxY: Math.min(MAP_HEIGHT, maxY),
  };
}

// Fit the relevant map on phone enter / Fit tap. Desktop camera is untouched.
export function applyPhoneCameraFit(camera, {
  gameState,
  territories,
  selectedName,
  destinationNames,
} = {}) {
  if (!camera) return;
  camera.usePhoneMinZoom = true;
  const insets = {
    padding: 12,
    padTop: PHONE_FIT_PAD_TOP,
    padBottom: PHONE_FIT_PAD_BOTTOM,
  };
  const playerId = gameState?.currentPlayer?.id;
  const ownedNames = [];
  if (playerId && territories) {
    const list = Array.isArray(territories) ? territories : Object.values(territories || {});
    for (const t of list) {
      if (!t || t.isWater) continue;
      if (gameState.getOwner?.(t.name) === playerId) ownedNames.push(t.name);
    }
  }
  const focus = resolvePhoneFitRegionNames({
    ownedNames,
    selectedName,
    destinationNames,
    territories,
  });
  const focusSet = new Set(focus);
  const pts = collectPhoneFitPoints(territories, (t) => focusSet.has(t.name));
  const bounds = ensurePhoneFitRegionBounds(phoneProblemBounds(pts));
  if (bounds) {
    camera.fitBounds(bounds, { ...insets, fillFrame: true });
    return;
  }
  camera.fitWorld({ ...insets, fillFrame: true });
}

export function worldFitBounds() {
  return { minX: 0, minY: 0, maxX: MAP_WIDTH, maxY: MAP_HEIGHT };
}

export function shouldHighlightPhoneLegalTerritories({ mobile, phase } = {}) {
  return !!mobile && (
    phase === GAME_PHASES.CAPITAL_PLACEMENT || phase === GAME_PHASES.UNIT_PLACEMENT
  );
}

// Screen-space owned *edge* — Polytopia/Civ border ink, not a wash.
// 2.5 world-px was 0.3 CSS px at ~0.11 (invisible). 8 CSS px + 55% fill shouted.
// Ink + muted gold so faction fill is never the only owned cue.
export const PHONE_LEGAL_FILL_ALPHA = 0;
export const PHONE_LEGAL_OUTLINE_CSS_PX = 2;
export const PHONE_LEGAL_EDGE_INK = '#2a1f08';
export const PHONE_LEGAL_EDGE_COLOR = '#c9a227';

export function phoneLegalOutlineWidth(zoom) {
  const z = Number(zoom);
  if (!Number.isFinite(z) || z <= 0) return PHONE_LEGAL_OUTLINE_CSS_PX;
  return Math.max(PHONE_LEGAL_OUTLINE_CSS_PX, PHONE_LEGAL_OUTLINE_CSS_PX / z);
}

export function collectPhoneLegalTerritoryNames({
  mobile,
  phase,
  playerId,
  territories,
  getOwner,
} = {}) {
  if (!shouldHighlightPhoneLegalTerritories({ mobile, phase }) || !playerId) return [];
  const list = Array.isArray(territories) ? territories : Object.values(territories || {});
  const names = [];
  for (const t of list) {
    if (!t || t.isWater) continue;
    if (getOwner?.(t.name) === playerId) names.push(t.name);
  }
  return names;
}

// Faction swatch keeps the raw color. Text on the dark HUD must stay readable.
export function readableFactionTextColor(hex) {
  const raw = String(hex ?? '').trim();
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (!m) return raw || '#e0e0e0';
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum >= 0.45) return `#${h.toLowerCase()}`;
  const lift = Math.min(1, (0.55 - lum) / 0.55 + 0.35);
  const mix = (c) => Math.round(c + (255 - c) * lift);
  const to = (n) => mix(n).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function initMobileShell() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const apply = () => {
    const active = applyMobileShellClass(window.innerWidth, document.documentElement, window.innerHeight);
    notify(active);
  };

  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);

  const mq = window.matchMedia(MOBILE_SHELL_QUERY);
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', apply);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(apply);
  }
}
