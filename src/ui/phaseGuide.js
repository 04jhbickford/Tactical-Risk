// First-session, one-job phase tips. Dismissible; re-open from the menu.
// Copy is Tactical Risk — not Catan / Settlecoast.

import { GAME_PHASES, TURN_PHASES } from '../state/gameState.js';

export const PHASE_GUIDE_STORAGE_KEY = 'tacticalRisk_phaseGuides';
export const PHASE_GUIDE_MAP_GUARD_MS = 400;

let mapGuardUntil = 0;

export const PHASE_GUIDE_IDS = {
  CAPITAL: 'capital',
  DEPLOY: 'deploy',
  ATTACK: 'attack',
  FORTIFY: 'fortify',
};

export const PHASE_GUIDE_ORDER = [
  PHASE_GUIDE_IDS.CAPITAL,
  PHASE_GUIDE_IDS.DEPLOY,
  PHASE_GUIDE_IDS.ATTACK,
  PHASE_GUIDE_IDS.FORTIFY,
];

export const PHASE_GUIDES = {
  [PHASE_GUIDE_IDS.CAPITAL]: {
    id: PHASE_GUIDE_IDS.CAPITAL,
    title: 'Place Capital',
    job: 'Tap one of your lands, then Confirm. That city becomes your capital.',
  },
  [PHASE_GUIDE_IDS.DEPLOY]: {
    id: PHASE_GUIDE_IDS.DEPLOY,
    title: 'Initial Deploy',
    job: 'Tap land, pick a unit, then Confirm. Max fills the count — Confirm still places.',
  },
  [PHASE_GUIDE_IDS.ATTACK]: {
    id: PHASE_GUIDE_IDS.ATTACK,
    title: 'Attack',
    job: 'Tap your stack, tap an enemy land, then Confirm Attack.',
  },
  [PHASE_GUIDE_IDS.FORTIFY]: {
    id: PHASE_GUIDE_IDS.FORTIFY,
    title: 'Fortify',
    job: 'Move leftover units between your lands, then Confirm.',
  },
};

export function phaseGuidePageIndex(id) {
  const i = PHASE_GUIDE_ORDER.indexOf(id);
  return i >= 0 ? i + 1 : 0;
}

export function adjacentPhaseGuideId(id, delta) {
  const i = PHASE_GUIDE_ORDER.indexOf(id);
  if (i < 0) return null;
  const next = i + Number(delta || 0);
  if (next < 0 || next >= PHASE_GUIDE_ORDER.length) return null;
  return PHASE_GUIDE_ORDER[next];
}

export function resolvePhaseGuideId(phase, turnPhase) {
  if (phase === GAME_PHASES.CAPITAL_PLACEMENT) return PHASE_GUIDE_IDS.CAPITAL;
  if (phase === GAME_PHASES.UNIT_PLACEMENT) return PHASE_GUIDE_IDS.DEPLOY;
  if (phase === GAME_PHASES.PLAYING && turnPhase === TURN_PHASES.COMBAT_MOVE) {
    return PHASE_GUIDE_IDS.ATTACK;
  }
  if (phase === GAME_PHASES.PLAYING && turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
    return PHASE_GUIDE_IDS.FORTIFY;
  }
  return null;
}

export function readPhaseGuideStore(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(PHASE_GUIDE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writePhaseGuideStore(store, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(PHASE_GUIDE_STORAGE_KEY, JSON.stringify(store || {}));
  } catch {
    /* private mode / quota — tips still work this session */
  }
}

export function shouldShowPhaseGuide(id, store = readPhaseGuideStore()) {
  if (!id || !PHASE_GUIDES[id]) return false;
  return store[id] !== 'dismissed';
}

export function dismissPhaseGuide(id, store = readPhaseGuideStore(), storage = globalThis.localStorage) {
  const next = { ...store, [id]: 'dismissed' };
  writePhaseGuideStore(next, storage);
  return next;
}

export function resetPhaseGuides(storage = globalThis.localStorage) {
  writePhaseGuideStore({}, storage);
  return {};
}

export function armPhaseGuideMapGuard(now = Date.now(), ms = PHASE_GUIDE_MAP_GUARD_MS) {
  mapGuardUntil = Number(now) + Number(ms);
  return mapGuardUntil;
}

export function shouldBlockMapForPhaseGuide(now = Date.now()) {
  return Number(now) < Number(mapGuardUntil);
}

export function isPhaseGuideChromeTarget(target) {
  return !!(target?.closest?.('#phase-guide') || target?.closest?.('.phase-guide-card'));
}

export function pointHitsPhaseGuideChrome(clientX, clientY, root = (typeof document !== 'undefined' ? document.getElementById('phase-guide') : null)) {
  if (!root || root.classList?.contains('hidden') || root.hidden) return false;
  const card = root.querySelector?.('.phase-guide-card') || root;
  const r = card.getBoundingClientRect?.();
  if (!r || r.width <= 0 || r.height <= 0) return false;
  const x = Number(clientX);
  const y = Number(clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

// Got it dismisses this job. Next pages; last page Next is also dismiss.
export function resolvePhaseGuideControl({ action, currentId } = {}) {
  if (action === 'prev') {
    const id = adjacentPhaseGuideId(currentId, -1);
    return id ? { kind: 'show', id } : { kind: 'noop', id: currentId || null };
  }
  if (action === 'next') {
    const id = adjacentPhaseGuideId(currentId, 1);
    return id ? { kind: 'show', id } : { kind: 'dismiss', id: currentId || null };
  }
  if (action === 'dismiss' || action === 'got-it') {
    return { kind: 'dismiss', id: currentId || null };
  }
  if (action === 'goto' && currentId) {
    return { kind: 'show', id: currentId };
  }
  return { kind: 'noop', id: currentId || null };
}

export function reopenPhaseGuide(id, store = readPhaseGuideStore(), storage = globalThis.localStorage) {
  if (!id || !PHASE_GUIDES[id]) return store;
  const next = { ...store };
  delete next[id];
  writePhaseGuideStore(next, storage);
  return next;
}

export class PhaseGuide {
  constructor({ storage } = {}) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.gameState = null;
    this.el = null;
    this._visibleId = null;
    this._forceId = null;
    this._create();
  }

  setGameState(gameState) {
    this.gameState = gameState;
    gameState?.subscribe?.(() => this.sync());
    this.sync();
  }

  _create() {
    if (typeof document === 'undefined') return;
    this.el = document.createElement('div');
    this.el.id = 'phase-guide';
    this.el.className = 'phase-guide hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-live', 'polite');
    this.el.innerHTML = `
      <div class="phase-guide-card">
        <div class="phase-guide-head">
          <p class="phase-guide-kicker">Phase tips</p>
          <p class="phase-guide-page" aria-live="polite"></p>
        </div>
        <div class="phase-guide-contents" role="tablist" aria-label="Phase tip contents"></div>
        <h2 class="phase-guide-title"></h2>
        <p class="phase-guide-job"></p>
        <p class="phase-guide-manual">Manual — no auto-advance</p>
        <div class="phase-guide-actions">
          <button type="button" class="phase-guide-prev" data-guide-action="prev">Previous</button>
          <button type="button" class="phase-guide-next" data-guide-action="next">Next</button>
          <button type="button" class="phase-guide-dismiss" data-guide-action="got-it">Got it</button>
        </div>
      </div>
    `;
    const contents = this.el.querySelector('.phase-guide-contents');
    for (const id of PHASE_GUIDE_ORDER) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'phase-guide-chip';
      btn.dataset.guideId = id;
      btn.dataset.guideAction = 'goto';
      btn.textContent = PHASE_GUIDES[id].title.replace(/^Place /, '').replace(/^Initial /, '');
      contents.appendChild(btn);
    }
    document.body.appendChild(this.el);
    const isolate = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      armPhaseGuideMapGuard();
    };
    for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click']) {
      this.el.addEventListener(type, (e) => {
        if (!isPhaseGuideChromeTarget(e.target)) return;
        isolate(e);
        if (type !== 'click' && type !== 'pointerup') return;
        const btn = e.target?.closest?.('[data-guide-action]');
        if (!btn || this.el.classList.contains('hidden')) return;
        this._applyOnce(btn.dataset.guideAction, btn.dataset.guideId);
      }, true);
    }
  }

  _applyOnce(action, gotoId) {
    const now = Date.now();
    if (now - (this._lastApplyAt || 0) < 350) return;
    this._lastApplyAt = now;
    this._applyControl(action, gotoId);
  }

  _applyControl(action, gotoId) {
    const resolved = resolvePhaseGuideControl({
      action,
      currentId: action === 'goto' ? gotoId : this._visibleId,
    });
    armPhaseGuideMapGuard();
    if (resolved.kind === 'show' && resolved.id) this.reopen(resolved.id);
    else if (resolved.kind === 'dismiss') this.dismissCurrent();
  }

  currentId() {
    if (this._forceId) return this._forceId;
    if (!this.gameState) return null;
    return resolvePhaseGuideId(this.gameState.phase, this.gameState.turnPhase);
  }

  sync() {
    const id = this.currentId();
    const store = readPhaseGuideStore(this.storage);
    if (this._forceId) {
      this._show(this._forceId);
      return;
    }
    if (id && shouldShowPhaseGuide(id, store)) this._show(id);
    else this.hide();
  }

  reopen(preferredId) {
    const id = preferredId || this.currentId() || PHASE_GUIDE_IDS.CAPITAL;
    this._forceId = id;
    reopenPhaseGuide(id, readPhaseGuideStore(this.storage), this.storage);
    this._show(id);
  }

  dismissCurrent() {
    const id = this._visibleId || this.currentId();
    this._forceId = null;
    if (id) dismissPhaseGuide(id, readPhaseGuideStore(this.storage), this.storage);
    this.hide();
  }

  _show(id) {
    const guide = PHASE_GUIDES[id];
    if (!guide || !this.el) return;
    this._visibleId = id;
    const page = phaseGuidePageIndex(id);
    this.el.querySelector('.phase-guide-title').textContent = guide.title;
    this.el.querySelector('.phase-guide-job').textContent = guide.job;
    const pageEl = this.el.querySelector('.phase-guide-page');
    if (pageEl) pageEl.textContent = `${page} / ${PHASE_GUIDE_ORDER.length}`;
    const prev = this.el.querySelector('.phase-guide-prev');
    const next = this.el.querySelector('.phase-guide-next');
    if (prev) prev.disabled = !adjacentPhaseGuideId(id, -1);
    if (next) next.disabled = false;
    this.el.querySelectorAll('.phase-guide-chip').forEach((chip) => {
      const on = chip.dataset.guideId === id;
      chip.classList.toggle('is-current', on);
      chip.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    this.el.classList.remove('hidden');
    this.el.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this._visibleId = null;
    this._forceId = null;
    if (!this.el) return;
    this.el.classList.add('hidden');
    this.el.setAttribute('aria-hidden', 'true');
  }
}
