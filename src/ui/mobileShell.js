// Phone chrome (V2.63/V2.64). Visual split only.
// iPhone shell is max-width: 480px so the V2.61 tablet band (481–900)
// and desktop ≥901px stay on their existing trees. matchMedia sets
// html.mobile-shell once; phone CSS lives in @media (max-width: 480px)
// and html.mobile-shell. No rules / combat / schema changes here.

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_ORDER, TURN_PHASE_NAMES } from '../state/gameState.js';
import { MAP_WIDTH, MAP_HEIGHT } from '../map/camera.js';

export const MOBILE_SHELL_MAX_WIDTH = 480;
export const MOBILE_SHELL_QUERY = `(max-width: ${MOBILE_SHELL_MAX_WIDTH}px)`;
export const TABLET_CHROME_MAX_WIDTH = 900;
export const DESKTOP_MIN_WIDTH = 901;

const listeners = [];

export function shouldUseMobileShell(viewportWidth) {
  return Number(viewportWidth) <= MOBILE_SHELL_MAX_WIDTH;
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

export function applyMobileShellClass(viewportWidth, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!root) return false;
  const active = shouldUseMobileShell(viewportWidth);
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

// Purchase / tech / movement / mobilize still need a body. Idle phases
// (combat resolve, collect income) and Place Capital collapse to peek.
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

// Place Capital and idle playing phases: thin peek (one hint + one CTA).
// Do not also render the phase header, body copy, and tab strip.
export function shouldCollapseMobileTray({
  mobile,
  phase,
  turnPhase,
  airLanding,
  movePending,
} = {}) {
  if (!mobile) return false;
  return !shouldShowPhonePanelBody({ mobile, phase, turnPhase, airLanding, movePending });
}

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

// Fit the relevant map on phone enter / Fit tap. Desktop camera is untouched.
export function applyPhoneCameraFit(camera, { gameState, territories } = {}) {
  if (!camera) return;
  camera.usePhoneMinZoom = true;
  const insets = {
    padding: 12,
    padTop: PHONE_FIT_PAD_TOP,
    padBottom: PHONE_FIT_PAD_BOTTOM,
  };
  const phase = gameState?.phase;
  const playerId = gameState?.currentPlayer?.id;

  if (
    (phase === GAME_PHASES.UNIT_PLACEMENT || phase === GAME_PHASES.CAPITAL_PLACEMENT)
    && playerId && territories
  ) {
    const pts = collectPhoneFitPoints(territories, (t) => {
      if (t.isWater) return false;
      return gameState.getOwner?.(t.name) === playerId;
    });
    const bounds = boundsFromPoints(pts);
    if (bounds) {
      camera.fitBounds(bounds, insets);
      return;
    }
  }

  if (phase === GAME_PHASES.PLAYING && gameState && territories) {
    const pts = collectPhoneFitPoints(territories, (t) => (
      gameState.players?.some((p) => gameState.getCapital?.(p.id) === t.name)
    ));
    const bounds = boundsFromPoints(pts);
    if (bounds) {
      camera.fitBounds(bounds, insets);
      return;
    }
  }

  camera.fitWorld(insets);
}

export function worldFitBounds() {
  return { minX: 0, minY: 0, maxX: MAP_WIDTH, maxY: MAP_HEIGHT };
}

export function shouldHighlightPhoneLegalTerritories({ mobile, phase } = {}) {
  return !!mobile && (
    phase === GAME_PHASES.CAPITAL_PLACEMENT || phase === GAME_PHASES.UNIT_PLACEMENT
  );
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

  const mq = window.matchMedia(MOBILE_SHELL_QUERY);
  const apply = () => {
    const active = applyMobileShellClass(window.innerWidth);
    notify(active);
  };

  apply();
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', apply);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(apply);
  }
}
