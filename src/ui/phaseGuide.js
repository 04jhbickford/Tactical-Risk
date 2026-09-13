// First-session, one-job phase tips. Dismissible; re-open from the menu.
// Copy is Tactical Risk — not Catan / Settlecoast.

import { GAME_PHASES, TURN_PHASES } from '../state/gameState.js';

export const PHASE_GUIDE_STORAGE_KEY = 'tacticalRisk_phaseGuides';

export const PHASE_GUIDE_IDS = {
  CAPITAL: 'capital',
  DEPLOY: 'deploy',
  ATTACK: 'attack',
  FORTIFY: 'fortify',
};

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
        <p class="phase-guide-kicker">This phase</p>
        <h2 class="phase-guide-title"></h2>
        <p class="phase-guide-job"></p>
        <div class="phase-guide-actions">
          <button type="button" class="phase-guide-dismiss">Got it</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);
    this.el.querySelector('.phase-guide-dismiss')?.addEventListener('click', () => {
      this.dismissCurrent();
    });
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
    this.el.querySelector('.phase-guide-title').textContent = guide.title;
    this.el.querySelector('.phase-guide-job').textContent = guide.job;
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
