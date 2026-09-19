// Preview-only Combat Move → Battle → air landing walkthrough.
// Labels and Done gating match live Canvas. No rule-engine changes.

import { remainingAirLandingsToAssign, landingKeyFor } from '../state/airLanding.js';
import { resolvePhoneCombatStep, resolveCombatNextLine } from '../ui/combatUI.js';

const TYPE_SHORT = {
  infantry: 'INF',
  armour: 'TNK',
  artillery: 'ART',
  fighter: 'FTR',
  bomber: 'BMB',
  tacticalBomber: 'TAC',
};

function shortType(type) {
  return TYPE_SHORT[type] || String(type || '?').slice(0, 3).toUpperCase();
}

export const FLOW_INSPECT = 'inspect';
export const FLOW_COMBAT_MOVE = 'combatMove';
export const FLOW_BATTLE = 'battle';
export const FLOW_AIR = 'airLanding';

export const DEMO = {
  seat: 'Germans',
  seatColor: '#4A4A4A',
  ipc: 32,
  source: 'Ukraine S.S.R.',
  dests: ['Karelia S.S.R.', 'Caucasus'],
  landingOptions: ['Ukraine S.S.R.', 'Eastern Europe', 'Germany'],
  eastFit: { minX: 980, minY: 220, maxX: 1680, maxY: 920 },
};

const MOVEABLE = new Set(['infantry', 'armour', 'fighter', 'bomber', 'tacticalBomber', 'artillery']);

export function stagedSummary(staged = {}) {
  return Object.entries(staged)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${shortType(type)}×${n}`)
    .join(' ');
}

export function combatMoveCta({ destName = '', staged = {}, confirmed = false } = {}) {
  if (confirmed) {
    return { label: `End Combat Movement →`, disabled: false, kind: 'end-phase' };
  }
  if (!destName) {
    return { label: 'Select a destination', disabled: true, kind: 'idle' };
  }
  const summary = stagedSummary(staged);
  if (!summary) {
    return { label: `Attack ${destName}`, disabled: true, kind: 'attack', selectUnits: true };
  }
  return { label: `Attack ${destName}`, disabled: false, kind: 'attack' };
}

export function battlePrimaryCta(phase, { canConfirmCasualties = false, remainingAir = 1 } = {}) {
  if (phase === 'aaFire') return { label: 'Fire AA Guns', disabled: false };
  if (phase === 'aaResults') return { label: 'Continue', disabled: false };
  if (phase === 'ready') return { label: 'Roll Dice', disabled: false };
  if (phase === 'selectCasualties') {
    return { label: 'Confirm Casualties', disabled: !canConfirmCasualties };
  }
  if (phase === 'selectRetreat') return { label: 'Tap a land above', disabled: true };
  if (phase === 'resolved') return { label: 'End Battle', disabled: false };
  if (phase === 'airLanding') {
    return remainingAir > 0
      ? { label: 'Confirm All Landings', disabled: true }
      : { label: 'Confirm Landings', disabled: false };
  }
  return { label: 'Select a territory', disabled: true };
}

export function airLandingCta(remaining) {
  if (remaining > 0) {
    return { label: 'Confirm All Landings', disabled: true, done: false };
  }
  return { label: 'Done →', disabled: false, done: true };
}

function stackQty(stacks, type) {
  return (stacks || []).find((s) => s.type === type)?.quantity || 0;
}

function cloneStacks(stacks) {
  return (stacks || []).map((s) => ({ ...s }));
}

function takeUnits(stacks, staged) {
  const next = cloneStacks(stacks);
  for (const [type, n] of Object.entries(staged || {})) {
    const row = next.find((s) => s.type === type);
    if (!row) continue;
    row.quantity = Math.max(0, row.quantity - n);
  }
  return next.filter((s) => s.quantity > 0);
}

function addUnits(stacks, owner, units) {
  const next = cloneStacks(stacks);
  for (const u of units || []) {
    if (!u?.type || !(u.quantity > 0)) continue;
    const row = next.find((s) => s.type === u.type && s.owner === owner);
    if (row) row.quantity += u.quantity;
    else next.push({ type: u.type, quantity: u.quantity, owner });
  }
  return next;
}

export function createPreviewFlow({
  placements,
  owners,
  mode = FLOW_COMBAT_MOVE,
} = {}) {
  const board = placements;
  const landOwners = { ...(owners || {}) };

  const state = {
    mode,
    source: DEMO.source,
    dest: null,
    staged: {},
    moveConfirmed: false,
    battlePhase: 'aaFire',
    attHits: 0,
    defHits: 0,
    retreatDest: null,
    retreated: false,
    airUnits: [],
    selectedLandings: {},
    airApplied: false,
    done: false,
  };

  function sourceStacks() {
    return board[DEMO.source] || [];
  }

  function resetBattleForces() {
    state.attHits = 0;
    state.defHits = 0;
    state.retreatDest = null;
    state.retreated = false;
    state.battlePhase = (state.staged.fighter || 0) > 0 ? 'aaFire' : 'ready';
  }

  function airRemaining() {
    return remainingAirLandingsToAssign(state.airUnits, state.selectedLandings);
  }

  function snapshot() {
    const cta = currentCta();
    return {
      mode: state.mode,
      source: state.source,
      dest: state.dest,
      staged: { ...state.staged },
      stagedLine: stagedSummary(state.staged),
      battlePhase: state.battlePhase,
      battleStep: resolvePhoneCombatStep(state.battlePhase),
      battleHint: resolveCombatNextLine(state.battlePhase, {
        winner: state.retreated ? 'defender' : 'attacker',
      }),
      attHits: state.attHits,
      defHits: state.defHits,
      retreatDest: state.retreatDest,
      retreated: state.retreated,
      airRemaining: airRemaining(),
      landings: { ...state.selectedLandings },
      airApplied: state.airApplied,
      done: state.done,
      confirmLabel: cta.label,
      confirmDisabled: !!cta.disabled,
      guideOn: false,
      vizP1Coach: false,
      iconPack: 'noOverlap',
    };
  }

  function currentCta() {
    if (state.mode === FLOW_COMBAT_MOVE) {
      return combatMoveCta({
        destName: state.dest,
        staged: state.staged,
        confirmed: state.moveConfirmed,
      });
    }
    if (state.mode === FLOW_BATTLE) {
      return battlePrimaryCta(state.battlePhase, {
        canConfirmCasualties: state.attHits >= 1 && state.defHits >= 1,
        remainingAir: airRemaining(),
      });
    }
    if (state.mode === FLOW_AIR) {
      return airLandingCta(airRemaining());
    }
    return { label: 'Select a territory', disabled: true };
  }

  function startCombatMove() {
    state.mode = FLOW_COMBAT_MOVE;
    state.dest = null;
    state.staged = {};
    state.moveConfirmed = false;
    state.airUnits = [];
    state.selectedLandings = {};
    state.airApplied = false;
    state.done = false;
    resetBattleForces();
  }

  function tapUnit(type) {
    if (state.mode === FLOW_COMBAT_MOVE) {
      if (!MOVEABLE.has(type)) return snapshot();
      const max = stackQty(sourceStacks(), type);
      if (max <= 0) return snapshot();
      const cur = state.staged[type] || 0;
      state.staged[type] = cur >= max ? 0 : cur + 1;
      if (state.staged[type] === 0) delete state.staged[type];
      return snapshot();
    }
    if (state.mode === FLOW_BATTLE && state.battlePhase === 'selectCasualties') {
      if (type === 'infantry' || type === 'armour' || type === 'fighter') {
        if (state.attHits < 1) state.attHits = 1;
        else if (state.defHits < 1) state.defHits = 1;
      }
      return snapshot();
    }
    return snapshot();
  }

  function tapLand(name) {
    if (!name) return snapshot();
    if (state.mode === FLOW_COMBAT_MOVE) {
      if (DEMO.dests.includes(name)) state.dest = name;
      return snapshot();
    }
    if (state.mode === FLOW_BATTLE && state.battlePhase === 'selectRetreat') {
      if (name === DEMO.source) {
        state.retreatDest = name;
        state.retreated = true;
        state.battlePhase = 'resolved';
      }
      return snapshot();
    }
    if (state.mode === FLOW_AIR) {
      if (!DEMO.landingOptions.includes(name)) return snapshot();
      const pending = state.airUnits.find((u, i) => !state.selectedLandings[landingKeyFor(u, i)] && !(Array.isArray(u.landingOptions) && u.landingOptions.length === 0));
      if (!pending) return snapshot();
      const idx = state.airUnits.indexOf(pending);
      state.selectedLandings[landingKeyFor(pending, idx)] = name;
      pending.destination = name;
      return snapshot();
    }
    return snapshot();
  }

  function enterAirLanding() {
    const fighters = state.staged.fighter || 0;
    state.airUnits = [];
    for (let i = 0; i < fighters; i++) {
      state.airUnits.push({
        id: `fighter_${i}`,
        type: 'fighter',
        quantity: 1,
        landingOptions: [...DEMO.landingOptions],
      });
    }
    state.selectedLandings = {};
    state.airApplied = false;
    if (state.airUnits.length === 0) {
      state.mode = FLOW_COMBAT_MOVE;
      state.moveConfirmed = true;
      state.done = true;
      return;
    }
    state.mode = FLOW_AIR;
  }

  function applyMoveToBoard() {
    const stagedUnits = Object.entries(state.staged)
      .filter(([, n]) => n > 0)
      .map(([type, quantity]) => ({ type, quantity, owner: DEMO.seat }));
    board[DEMO.source] = takeUnits(board[DEMO.source], state.staged);
    if (state.retreated) {
      board[DEMO.source] = addUnits(board[DEMO.source], DEMO.seat, stagedUnits.filter((u) => u.type !== 'fighter'));
      return;
    }
    const ground = stagedUnits.filter((u) => u.type !== 'fighter' && u.type !== 'bomber' && u.type !== 'tacticalBomber');
    const dest = state.dest || DEMO.dests[0];
    board[dest] = addUnits(board[dest], DEMO.seat, ground);
    landOwners[dest] = DEMO.seat;
  }

  function applyAirLandings() {
    if (state.airApplied) return;
    const plan = state.airUnits.map((u, i) => ({
      type: u.type,
      quantity: 1,
      dest: state.selectedLandings[landingKeyFor(u, i)] || u.destination,
    })).filter((p) => p.dest);
    for (const p of plan) {
      board[p.dest] = addUnits(board[p.dest], DEMO.seat, [{ type: p.type, quantity: p.quantity, owner: DEMO.seat }]);
    }
    state.airApplied = true;
  }

  function confirm() {
    const cta = currentCta();
    if (cta.disabled) return snapshot();

    if (state.mode === FLOW_COMBAT_MOVE && cta.kind === 'attack') {
      state.moveConfirmed = true;
      resetBattleForces();
      state.mode = FLOW_BATTLE;
      return snapshot();
    }
    if (state.mode === FLOW_COMBAT_MOVE && cta.kind === 'end-phase') {
      state.done = true;
      return snapshot();
    }

    if (state.mode === FLOW_BATTLE) {
      const phase = state.battlePhase;
      if (phase === 'aaFire') state.battlePhase = 'aaResults';
      else if (phase === 'aaResults') state.battlePhase = 'ready';
      else if (phase === 'ready') state.battlePhase = 'selectCasualties';
      else if (phase === 'selectCasualties') state.battlePhase = 'resolved';
      else if (phase === 'resolved') {
        applyMoveToBoard();
        enterAirLanding();
      }
      return snapshot();
    }

    if (state.mode === FLOW_AIR && cta.done) {
      applyAirLandings();
      state.mode = FLOW_COMBAT_MOVE;
      state.moveConfirmed = true;
      state.done = true;
      return snapshot();
    }
    return snapshot();
  }

  function flowAction(action, extra = {}) {
    if (action === 'retreat' && state.mode === FLOW_BATTLE && state.battlePhase === 'ready') {
      state.battlePhase = 'selectRetreat';
      return snapshot();
    }
    if (action === 'auto-battle' && state.mode === FLOW_BATTLE && state.battlePhase === 'ready') {
      state.attHits = 1;
      state.defHits = 1;
      state.battlePhase = 'selectCasualties';
      return snapshot();
    }
    if (action === 'assign-att') {
      state.attHits = 1;
      return snapshot();
    }
    if (action === 'assign-def') {
      state.defHits = 1;
      return snapshot();
    }
    if (action === 'pick-landing' && extra.name) {
      return tapLand(extra.name);
    }
    if (action === 'start-combat') {
      startCombatMove();
      return snapshot();
    }
    if (action === 'start-inspect') {
      state.mode = FLOW_INSPECT;
      return snapshot();
    }
    return snapshot();
  }

  if (mode === FLOW_COMBAT_MOVE) startCombatMove();

  return {
    DEMO,
    state,
    snapshot,
    currentCta,
    tapUnit,
    tapLand,
    confirm,
    flowAction,
    startCombatMove,
    airRemaining,
    legalDests: () => (state.mode === FLOW_COMBAT_MOVE ? DEMO.dests : []),
    legalLandings: () => (state.mode === FLOW_AIR ? DEMO.landingOptions : []),
    highlightNames: () => {
      if (state.mode === FLOW_COMBAT_MOVE) return [DEMO.source, ...DEMO.dests];
      if (state.mode === FLOW_BATTLE && state.battlePhase === 'selectRetreat') return [DEMO.source];
      if (state.mode === FLOW_AIR) return DEMO.landingOptions;
      return [];
    },
    selectedName: () => {
      if (state.mode === FLOW_AIR) {
        const pending = state.airUnits.find((u, i) => !state.selectedLandings[landingKeyFor(u, i)]);
        return pending ? (state.dest || DEMO.source) : (Object.values(state.selectedLandings)[0] || DEMO.source);
      }
      if (state.mode === FLOW_BATTLE) return state.dest || DEMO.source;
      return state.dest || DEMO.source;
    },
  };
}
