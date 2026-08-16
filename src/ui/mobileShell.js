// Phone chrome (V2.63/V2.64). Visual split only.
// iPhone shell is max-width: 480px so the V2.61 tablet band (481–900)
// and desktop ≥901px stay on their existing trees. matchMedia sets
// html.mobile-shell once; phone CSS lives in @media (max-width: 480px)
// and html.mobile-shell. No rules / combat / schema changes here.

import { GAME_PHASES, TURN_PHASE_ORDER, TURN_PHASE_NAMES } from '../state/gameState.js';

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

// Place Capital has no real Actions-tab chrome (no unit rows / buy list).
// Collapse the sheet to a thin peek: one hint + one CTA. Do not also
// render the phase header, body copy, and tab strip.
export function shouldCollapseMobileTray({ mobile, phase } = {}) {
  return !!mobile && phase === GAME_PHASES.CAPITAL_PLACEMENT;
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
