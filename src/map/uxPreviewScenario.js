// Playable UX preview scenario — Combat Move → Battle → Air Land.
// Preview only. Seeded Karelia pocket. Do not merge to main.

export const PHASE = {
  COMBAT_MOVE: 'COMBAT MOVE',
  BATTLE: 'BATTLE',
  AIR_LAND: 'AIR LAND',
  DONE: 'DONE',
};

export const BATTLE_STEP = {
  AA_READY: 'aaReady',
  AA_RESULT: 'aaResult',
  COMBAT_READY: 'combatReady',
  COMBAT_RESULT: 'combatResult',
  WON: 'won',
};

export const UNIT_DEFS = {
  infantry: { attack: 1, defense: 2, cost: 3, isAir: false, isAA: false },
  artillery: { attack: 2, defense: 2, cost: 4, isAir: false, isAA: false },
  armour: { attack: 3, defense: 3, cost: 5, isAir: false, isAA: false },
  fighter: { attack: 3, defense: 4, cost: 10, isAir: true, isAA: false },
  bomber: { attack: 4, defense: 1, cost: 12, isAir: true, isAA: false },
  tacticalBomber: { attack: 3, defense: 3, cost: 11, isAir: true, isAA: false },
  aaGun: { attack: 0, defense: 0, cost: 5, isAir: false, isAA: true },
  factory: { attack: 0, defense: 0, cost: 15, isAir: false, isAA: false },
};

export const COMBAT_TYPES = [
  'infantry', 'artillery', 'armour', 'fighter', 'bomber', 'tacticalBomber',
];
export const AIR_TYPES = ['fighter', 'bomber', 'tacticalBomber'];
export const GROUND_TYPES = ['infantry', 'artillery', 'armour'];

export const MAX_ATTACKER = {
  infantry: 10,
  armour: 6,
  artillery: 6,
  fighter: 4,
  bomber: 3,
};

export const MAX_DEFENDER = {
  infantry: 8,
  armour: 5,
  artillery: 5,
  fighter: 3,
  bomber: 2,
  aaGun: 2,
};

export const MAX_ALT_DEFENDER = {
  infantry: 4,
  armour: 2,
  artillery: 2,
  fighter: 1,
  aaGun: 1,
};

export const SCENARIOS = {
  'karelia-finland-air': {
    id: 'karelia-finland-air',
    seat: 'Russians',
    ipc: 24,
    origin: 'Karelia S.S.R.',
    dest: 'Finland Norway',
    legalDests: ['Finland Norway', 'Ukraine S.S.R.'],
    landable: ['Karelia S.S.R.', 'Russia'],
    labels: ['Karelia S.S.R.', 'Finland Norway', 'Ukraine S.S.R.', 'Russia'],
    seed: 1941,
  },
  'max-both-sides': {
    id: 'max-both-sides',
    seat: 'Russians',
    ipc: 24,
    origin: 'Karelia S.S.R.',
    dest: 'Ukraine S.S.R.',
    legalDests: ['Ukraine S.S.R.', 'East Europe'],
    landable: ['Karelia S.S.R.', 'Russia'],
    labels: ['Karelia S.S.R.', 'Ukraine S.S.R.', 'East Europe', 'Russia'],
    seed: 1942,
  },
};

export const SCENARIO = SCENARIOS['karelia-finland-air'];

export function scenarioById(id) {
  const key = String(id || '').toLowerCase().trim();
  if (key === 'max' || key === 'maxed' || key === 'max-both-sides' || key === 'stress-combat') {
    return SCENARIOS['max-both-sides'];
  }
  return SCENARIOS['karelia-finland-air'];
}

function stacksFromCounts(counts, owner) {
  return Object.entries(counts || {})
    .filter(([, n]) => (Number(n) || 0) > 0)
    .map(([type, quantity]) => ({ type, quantity: Number(quantity) || 0, owner }));
}

export const SELECT_GOLD = '#C4A35A';
export const LEGAL_GOLD = '#C4A35A';
export const LAND_TEAL = '#5BA8A0';

export const GUIDE = {
  [PHASE.COMBAT_MOVE]: 'Tap origin · select units · tap dest · Confirm',
  [PHASE.BATTLE]: 'One Confirm at a time — AA, then dice, then hits.',
  [PHASE.AIR_LAND]: 'Teal lands can take the aircraft. Tap one, Confirm.',
  [PHASE.DONE]: 'Aircraft landed. Confirm is idle — Replay if you want.',
};

export const LABEL_LANDS = SCENARIO.labels;

const DEMO_ROLLS = {
  aa: [4],
  attack: [1, 2, 5, 3],
  defense: [2, 6],
};

function cloneStacks(stacks) {
  return (stacks || []).map((s) => ({ ...s }));
}

function clonePlacements(src) {
  const out = {};
  for (const [name, stacks] of Object.entries(src || {})) {
    out[name] = cloneStacks(stacks);
  }
  return out;
}

export function seedPlacements(spec = SCENARIO) {
  const scenario = typeof spec === 'string' ? scenarioById(spec) : (spec || SCENARIO);
  if (scenario.id === 'max-both-sides') {
    return {
      [scenario.origin]: stacksFromCounts(MAX_ATTACKER, 'Russians'),
      [scenario.dest]: stacksFromCounts(MAX_DEFENDER, 'Germans'),
      'East Europe': stacksFromCounts(MAX_ALT_DEFENDER, 'Germans'),
      Russia: [
        { type: 'infantry', quantity: 2, owner: 'Russians' },
      ],
    };
  }
  return {
    [SCENARIO.origin]: [
      { type: 'infantry', quantity: 3, owner: 'Russians' },
      { type: 'fighter', quantity: 1, owner: 'Russians' },
    ],
    [SCENARIO.dest]: [
      { type: 'infantry', quantity: 2, owner: 'Germans' },
      { type: 'aaGun', quantity: 1, owner: 'Germans' },
    ],
    'Ukraine S.S.R.': [
      { type: 'infantry', quantity: 2, owner: 'Germans' },
    ],
    Russia: [
      { type: 'infantry', quantity: 1, owner: 'Russians' },
    ],
  };
}

export function seedOwners(spec = SCENARIO) {
  const scenario = typeof spec === 'string' ? scenarioById(spec) : (spec || SCENARIO);
  if (scenario.id === 'max-both-sides') {
    return {
      [scenario.origin]: 'Russians',
      [scenario.dest]: 'Germans',
      'East Europe': 'Germans',
      Russia: 'Russians',
    };
  }
  return {
    [SCENARIO.origin]: 'Russians',
    [SCENARIO.dest]: 'Germans',
    'Ukraine S.S.R.': 'Germans',
    Russia: 'Russians',
  };
}

export function createScenario(overrides = {}) {
  const spec = scenarioById(overrides.id || overrides.demo);
  const { id: _id, demo: _demo, ...rest } = overrides;
  return {
    id: spec.id,
    seat: spec.seat,
    ipc: spec.ipc,
    origin: spec.origin,
    dest: spec.dest,
    legalDests: [...spec.legalDests],
    landable: [...spec.landable],
    labels: [...(spec.labels || LABEL_LANDS)],
    seed: spec.seed,
    phase: PHASE.COMBAT_MOVE,
    selected: null,
    selectedUnits: {},
    destPicked: null,
    landingDest: null,
    landed: false,
    guideOn: true,
    placements: seedPlacements(spec),
    owners: seedOwners(spec),
    battle: null,
    rngCursor: 0,
    ...rest,
    id: spec.id,
  };
}

export function applyScenarioPocket(basePlacements, baseOwners, spec = SCENARIO) {
  const scenario = typeof spec === 'string' ? scenarioById(spec) : (spec || SCENARIO);
  const placements = clonePlacements(basePlacements);
  const owners = { ...(baseOwners || {}) };
  const seeded = seedPlacements(scenario);
  const seededOwners = seedOwners(scenario);
  for (const [name, stacks] of Object.entries(seeded)) {
    placements[name] = cloneStacks(stacks);
  }
  Object.assign(owners, seededOwners);
  return { placements, owners };
}

export function stackQty(stacks, type, owner = null) {
  return (stacks || [])
    .filter((s) => s.type === type && (!owner || s.owner === owner))
    .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

export function totalQty(stacks) {
  return (stacks || []).reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

export function pickedCount(selectedUnits) {
  return Object.values(selectedUnits || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

export function hasGround(selectedUnits) {
  return GROUND_TYPES.some((type) => (Number(selectedUnits?.[type]) || 0) > 0);
}

export function hasAir(selectedUnits) {
  return AIR_TYPES.some((type) => (Number(selectedUnits?.[type]) || 0) > 0);
}

function combatUnits(stacks, owner) {
  return (stacks || [])
    .filter((s) => (
      s.owner === owner
      && (s.quantity || 0) > 0
      && s.type !== 'factory'
      && s.type !== 'aaGun'
    ))
    .sort((a, b) => {
      const ia = COMBAT_TYPES.indexOf(a.type);
      const ib = COMBAT_TYPES.indexOf(b.type);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
}

function aaCount(stacks, owner) {
  return (stacks || [])
    .filter((s) => s.owner === owner && s.type === 'aaGun')
    .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

function airCount(stacks, owner) {
  return (stacks || [])
    .filter((s) => s.owner === owner && UNIT_DEFS[s.type]?.isAir)
    .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

function removeQty(stacks, type, owner, qty) {
  let left = qty;
  for (const s of stacks) {
    if (left <= 0) break;
    if (s.type !== type || (owner && s.owner !== owner)) continue;
    const take = Math.min(s.quantity || 0, left);
    s.quantity -= take;
    left -= take;
  }
  return stacks.filter((s) => (s.quantity || 0) > 0);
}

function addQty(stacks, type, owner, qty) {
  const list = stacks || [];
  const existing = list.find((s) => s.type === type && s.owner === owner);
  if (existing) existing.quantity += qty;
  else list.push({ type, owner, quantity: qty });
  return list;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function d6(rng) {
  return 1 + Math.floor(rng() * 6);
}

function usePocketDemoRolls(state) {
  if (state?.id === 'max-both-sides') return false;
  const attInf = Number(state.selectedUnits.infantry) || 0;
  const attFtr = Number(state.selectedUnits.fighter) || 0;
  const defInf = stackQty(state.placements[state.dest], 'infantry', 'Germans');
  return attInf === 3 && attFtr === 1 && defInf === 2;
}

function useMaxDemoRolls(state) {
  if (state?.id !== 'max-both-sides') return false;
  const land = GROUND_TYPES.filter((t) => (Number(state.selectedUnits?.[t]) || 0) > 0).length;
  const air = AIR_TYPES.filter((t) => (Number(state.selectedUnits?.[t]) || 0) > 0).length;
  return pickedCount(state.selectedUnits) >= 12 && land >= 2 && air >= 1;
}

function scenarioSeed(state) {
  return Number(state?.seed) || SCENARIO.seed;
}

function takeDie(state, scripted, rng) {
  if (scripted && scripted.length) return scripted.shift();
  return d6(rng);
}

function cheapestLosses(stacks, owner, hits) {
  const taken = {};
  let left = hits;
  for (const type of COMBAT_TYPES) {
    if (left <= 0) break;
    const have = (stacks || [])
      .filter((s) => s.owner === owner && s.type === type)
      .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
    const n = Math.min(have, left);
    if (n > 0) {
      taken[type] = n;
      left -= n;
    }
  }
  return taken;
}

function applyLosses(stacks, owner, taken) {
  let next = stacks;
  for (const [type, qty] of Object.entries(taken || {})) {
    next = removeQty(next, type, owner, qty);
  }
  return next;
}

function formatLoss(taken) {
  const short = {
    infantry: 'INF',
    artillery: 'ART',
    armour: 'TNK',
    fighter: 'FTR',
    bomber: 'BMB',
    tacticalBomber: 'TAC',
  };
  const parts = Object.entries(taken || {})
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${short[type] || type}×${n}`);
  return parts.join(' ') || 'none';
}

export function legalDests(state) {
  return [...(state?.legalDests || SCENARIO.legalDests)];
}

export function isLegalDest(state, name) {
  return !!name && legalDests(state).includes(name);
}

export function tapLand(state, name) {
  if (!state || !name) return state;
  if (state.phase === PHASE.BATTLE) {
    state.selected = state.dest;
    return state;
  }
  if (state.phase === PHASE.AIR_LAND) {
    if (state.landable.includes(name)) {
      state.selected = name;
      state.landingDest = name;
    }
    return state;
  }
  if (state.phase === PHASE.DONE) {
    state.selected = name;
    return state;
  }
  if (name === state.origin) {
    state.selected = name;
    if (!pickedCount(state.selectedUnits)) {
      state.selectedUnits = {};
    }
    return state;
  }
  if (isLegalDest(state, name)) {
    if (hasGround(state.selectedUnits)) {
      state.destPicked = name;
      state.dest = name;
      state.selected = name;
    }
    return state;
  }
  return state;
}

export function pickUnit(state, type) {
  if (!state || state.phase !== PHASE.COMBAT_MOVE) return state;
  const have = stackQty(state.placements[state.origin], type);
  if (have <= 0) return state;
  if ((Number(state.selectedUnits[type]) || 0) > 0) {
    delete state.selectedUnits[type];
  } else {
    state.selectedUnits[type] = have;
  }
  if (!hasGround(state.selectedUnits)) state.destPicked = null;
  return state;
}

// Combat-move sheet steppers: INF [-] 0/3 [+]. One tap = ±1.
export function adjustUnit(state, type, delta = 1) {
  if (!state || state.phase !== PHASE.COMBAT_MOVE) return state;
  const have = stackQty(state.placements[state.origin], type);
  if (have <= 0) return state;
  const step = Number(delta);
  if (!Number.isFinite(step) || step === 0) return state;
  const cur = Number(state.selectedUnits[type]) || 0;
  const next = Math.max(0, Math.min(have, cur + step));
  if (next <= 0) delete state.selectedUnits[type];
  else state.selectedUnits[type] = next;
  if (!hasGround(state.selectedUnits)) state.destPicked = null;
  return state;
}

export function assignedCount(taken) {
  return Object.values(taken || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

export function lossMenu(stacks, owner, hits) {
  const units = combatUnits(stacks, owner);
  const total = totalQty(units);
  const need = Math.min(Math.max(0, Number(hits) || 0), total);
  const types = units.filter((u) => (u.quantity || 0) > 0);
  const forced = need <= 0 || types.length <= 1 || total <= need;
  return {
    need,
    forced,
    units: types.map((u) => ({ type: u.type, quantity: u.quantity })),
  };
}

export function lossesReady(state) {
  const battle = state?.battle;
  if (!battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return false;
  const dest = state.placements[state.dest] || [];
  const att = lossMenu(dest, 'Russians', battle.defenseHits);
  const def = lossMenu(dest, 'Germans', battle.attackHits);
  return assignedCount(battle.pendingAtt) === att.need
    && assignedCount(battle.pendingDef) === def.need;
}

export function pickLoss(state, side, type) {
  const battle = state?.battle;
  if (!battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return state;
  const dest = state.placements[state.dest] || [];
  const owner = side === 'att' ? 'Russians' : 'Germans';
  const hits = side === 'att' ? battle.defenseHits : battle.attackHits;
  const menu = lossMenu(dest, owner, hits);
  if (menu.forced || menu.need <= 0) return state;
  const key = side === 'att' ? 'pendingAtt' : 'pendingDef';
  const cur = { ...(battle[key] || {}) };
  const have = stackQty(dest, type, owner);
  if (have <= 0) return state;
  const thisN = Number(cur[type]) || 0;
  if (menu.need === 1) {
    battle[key] = thisN > 0 ? {} : { [type]: 1 };
    return state;
  }
  const used = assignedCount(cur);
  if (thisN > 0 && (used >= menu.need || thisN >= have)) {
    cur[type] = thisN - 1;
    if (cur[type] <= 0) delete cur[type];
  } else if (used < menu.need && thisN < have) {
    cur[type] = thisN + 1;
  }
  battle[key] = cur;
  return state;
}

export function confirmEnabled(state) {
  if (!state) return false;
  if (state.phase === PHASE.COMBAT_MOVE) {
    return !!state.destPicked && hasGround(state.selectedUnits);
  }
  if (state.phase === PHASE.BATTLE) {
    if (!state.battle) return false;
    if (state.battle.step === BATTLE_STEP.COMBAT_RESULT) return lossesReady(state);
    return true;
  }
  if (state.phase === PHASE.AIR_LAND) return !!state.landingDest && !state.landed;
  if (state.phase === PHASE.DONE) return true;
  return false;
}

export function confirmGold(state) {
  if (!state || state.phase === PHASE.DONE) return false;
  return confirmEnabled(state);
}

export function confirmLabel(state) {
  if (!state) return 'Select units';
  if (state.phase === PHASE.COMBAT_MOVE) {
    if (state.destPicked && hasGround(state.selectedUnits)) {
      return `Confirm: Attack ${state.destPicked || state.dest}`;
    }
    if (state.selected !== state.origin && !pickedCount(state.selectedUnits)) {
      return 'Select units';
    }
    if (!hasGround(state.selectedUnits)) return 'Select units';
    return 'Pick target';
  }
  if (state.phase === PHASE.BATTLE) {
    const step = state.battle?.step;
    if (step === BATTLE_STEP.AA_READY) return 'Confirm: Fire AA';
    if (step === BATTLE_STEP.AA_RESULT) return 'Confirm: Continue';
    if (step === BATTLE_STEP.COMBAT_READY) return 'Confirm: Roll combat';
    if (step === BATTLE_STEP.COMBAT_RESULT) {
      return lossesReady(state) ? 'Confirm: Take hits' : 'Assign casualties';
    }
    if (step === BATTLE_STEP.WON) return `Confirm: Take ${state.dest}`;
    return 'Battle';
  }
  if (state.phase === PHASE.AIR_LAND) {
    if (!state.landingDest) return 'Confirm land';
    return `Confirm: Land in ${state.landingDest}`;
  }
  if (state.phase === PHASE.DONE) {
    return state.landingDest
      ? `Landed in ${state.landingDest} · Replay`
      : 'Replay scenario';
  }
  return 'Select units';
}

export function airLandRoster(state) {
  if (state?.phase !== PHASE.AIR_LAND) return [];
  return Object.entries(state.selectedUnits || {})
    .filter(([, n]) => Number(n) > 0)
    .map(([type, quantity]) => ({ type, quantity: Number(quantity) || 0 }));
}

export function guideCopy(state) {
  return GUIDE[state?.phase] || GUIDE[PHASE.COMBAT_MOVE];
}

export function guideSteps() {
  return { persistent: false, current: 0, steps: [] };
}

export function highlights(state) {
  const out = {
    origin: null,
    dest: null,
    legal: [],
    landable: [],
    selected: state?.selected || null,
    pulse: [],
    labels: [...(state?.labels || LABEL_LANDS)],
  };
  if (!state) return out;
  if (state.phase === PHASE.COMBAT_MOVE) {
    out.origin = state.origin;
    const originTapped = state.selected === state.origin || pickedCount(state.selectedUnits);
    if (!originTapped) out.pulse.push(state.origin);
    if (hasGround(state.selectedUnits)) {
      out.legal = legalDests(state);
      if (!state.destPicked) out.pulse.push(...out.legal);
    }
    if (state.destPicked) out.dest = state.destPicked;
  }
  if (state.phase === PHASE.BATTLE) {
    out.origin = state.origin;
    out.dest = state.dest;
  }
  if (state.phase === PHASE.AIR_LAND) {
    out.dest = state.dest;
    out.landable = [...state.landable];
    if (state.landingDest) out.selected = state.landingDest;
  }
  if (state.phase === PHASE.DONE && state.landingDest) {
    out.selected = state.landingDest;
  }
  return out;
}

function selectedAirCount(selectedUnits) {
  return AIR_TYPES.reduce((n, type) => n + (Number(selectedUnits?.[type]) || 0), 0);
}

function startBattle(state) {
  const destStacks = state.placements[state.dest] || [];
  const guns = aaCount(destStacks, 'Germans');
  const planes = selectedAirCount(state.selectedUnits);
  state.phase = PHASE.BATTLE;
  state.selected = state.dest;
  state.battle = {
    step: guns > 0 && planes > 0 ? BATTLE_STEP.AA_READY : BATTLE_STEP.COMBAT_READY,
    round: 0,
    aaGuns: guns,
    aaPlanes: planes,
    aaHits: 0,
    aaDice: [],
    attackDice: [],
    defenseDice: [],
    attackHits: 0,
    defenseHits: 0,
    pendingAtt: {},
    pendingDef: {},
    log: [],
  };
  return state;
}

function applyCombatMove(state) {
  if (state.destPicked) state.dest = state.destPicked;
  const from = state.placements[state.origin] || [];
  let dest = state.placements[state.dest] || [];
  for (const [type, qty] of Object.entries(state.selectedUnits)) {
    const n = Number(qty) || 0;
    if (n <= 0) continue;
    state.placements[state.origin] = removeQty(from, type, 'Russians', n);
    dest = addQty(dest, type, 'Russians', n);
  }
  state.placements[state.dest] = dest;
  return startBattle(state);
}

function removeCheapestAir(state, hits) {
  let left = hits;
  let dest = state.placements[state.dest] || [];
  for (const type of AIR_TYPES) {
    if (left <= 0) break;
    const have = stackQty(dest, type, 'Russians');
    const take = Math.min(have, left);
    if (take <= 0) continue;
    dest = removeQty(dest, type, 'Russians', take);
    if ((Number(state.selectedUnits[type]) || 0) > 0) {
      state.selectedUnits[type] = Math.max(0, (Number(state.selectedUnits[type]) || 0) - take);
      if (state.selectedUnits[type] <= 0) delete state.selectedUnits[type];
    }
    left -= take;
  }
  state.placements[state.dest] = dest;
}

function rollAA(state) {
  const battle = state.battle;
  const rng = mulberry32(scenarioSeed(state) + state.rngCursor);
  const pocket = usePocketDemoRolls(state);
  const maxed = useMaxDemoRolls(state);
  const scripted = pocket
    ? [...DEMO_ROLLS.aa]
    : (maxed ? Array.from({ length: battle.aaPlanes }, () => 4) : null);
  const dice = [];
  let hits = 0;
  for (let i = 0; i < battle.aaPlanes; i++) {
    const face = takeDie(state, scripted, rng);
    dice.push(face);
    if (face === 1) hits += 1;
  }
  state.rngCursor += 1;
  battle.aaDice = dice;
  battle.aaHits = hits;
  if (hits > 0) removeCheapestAir(state, hits);
  battle.step = BATTLE_STEP.AA_RESULT;
  battle.log.push(hits ? `AA hit ×${hits}` : 'AA missed');
  return state;
}

function scriptedFacesFor(units, attr, hitsWanted) {
  const faces = [];
  let left = Math.max(0, Number(hitsWanted) || 0);
  for (const unit of units || []) {
    const val = Number(UNIT_DEFS[unit.type]?.[attr]) || 0;
    for (let i = 0; i < (unit.quantity || 0); i++) {
      if (left > 0 && val > 0) {
        faces.push(Math.min(6, val));
        left -= 1;
      } else {
        faces.push(6);
      }
    }
  }
  return faces;
}

function rollCombat(state) {
  const battle = state.battle;
  battle.round += 1;
  const dest = state.placements[state.dest] || [];
  const attackers = combatUnits(dest, 'Russians');
  const defenders = combatUnits(dest, 'Germans');
  const rng = mulberry32(scenarioSeed(state) + 17 + state.rngCursor);
  const pocket = usePocketDemoRolls(state) && battle.round === 1;
  const maxed = useMaxDemoRolls(state);
  const attTotal = totalQty(attackers);
  const defTotal = totalQty(defenders);
  let attScript = pocket ? [...DEMO_ROLLS.attack] : null;
  let defScript = pocket ? [...DEMO_ROLLS.defense] : null;
  if (maxed && !pocket) {
    const attHits = battle.round === 1
      ? Math.min(6, Math.max(1, defTotal - 2))
      : defTotal;
    const defHits = battle.round === 1
      ? Math.min(3, Math.max(1, attTotal - 2))
      : Math.min(2, Math.max(0, attTotal - 1));
    attScript = scriptedFacesFor(attackers, 'attack', attHits);
    defScript = scriptedFacesFor(defenders, 'defense', defHits);
  }

  const attackDice = [];
  let attackHits = 0;
  for (const unit of attackers) {
    const def = UNIT_DEFS[unit.type] || { attack: 1 };
    for (let i = 0; i < (unit.quantity || 0); i++) {
      const face = takeDie(state, attScript, rng);
      attackDice.push({ type: unit.type, face, hit: face <= def.attack });
      if (face <= def.attack) attackHits += 1;
    }
  }

  const defenseDice = [];
  let defenseHits = 0;
  for (const unit of defenders) {
    const def = UNIT_DEFS[unit.type] || { defense: 2 };
    for (let i = 0; i < (unit.quantity || 0); i++) {
      const face = takeDie(state, defScript, rng);
      defenseDice.push({ type: unit.type, face, hit: face <= def.defense });
      if (face <= def.defense) defenseHits += 1;
    }
  }

  state.rngCursor += 1;
  battle.attackDice = attackDice;
  battle.defenseDice = defenseDice;
  battle.attackHits = attackHits;
  battle.defenseHits = defenseHits;
  const attMenu = lossMenu(dest, 'Russians', defenseHits);
  const defMenu = lossMenu(dest, 'Germans', attackHits);
  battle.pendingAtt = attMenu.forced ? cheapestLosses(dest, 'Russians', defenseHits) : {};
  battle.pendingDef = defMenu.forced ? cheapestLosses(dest, 'Germans', attackHits) : {};
  battle.attForced = attMenu.forced;
  battle.defForced = defMenu.forced;
  battle.step = BATTLE_STEP.COMBAT_RESULT;
  battle.log.push(`R${battle.round} ATK ${attackHits} · DEF ${defenseHits}`);
  return state;
}

function applyHits(state) {
  const battle = state.battle;
  let dest = state.placements[state.dest] || [];
  dest = applyLosses(dest, 'Russians', battle.pendingAtt);
  dest = applyLosses(dest, 'Germans', battle.pendingDef);
  state.placements[state.dest] = dest;
  const defendersLeft = totalQty(combatUnits(dest, 'Germans'));
  const attackersLeft = totalQty(combatUnits(dest, 'Russians'));
  battle.pendingAtt = {};
  battle.pendingDef = {};
  if (defendersLeft <= 0 && attackersLeft > 0) {
    state.owners[state.dest] = 'Russians';
    dest = removeQty(dest, 'aaGun', 'Germans', 99);
    state.placements[state.dest] = dest;
    battle.step = BATTLE_STEP.WON;
    battle.log.push(`Attacker takes ${state.dest}`);
    return state;
  }
  if (attackersLeft <= 0) {
    battle.step = BATTLE_STEP.WON;
    battle.failed = true;
    battle.log.push('Attack failed');
    return state;
  }
  battle.step = BATTLE_STEP.COMBAT_READY;
  return state;
}

function survivingAir(state) {
  const dest = state.placements[state.dest] || [];
  const roster = {};
  for (const type of AIR_TYPES) {
    const n = stackQty(dest, type, 'Russians');
    if (n > 0) roster[type] = n;
  }
  return roster;
}

function startAirLand(state) {
  const roster = survivingAir(state);
  const planes = Object.values(roster).reduce((n, q) => n + q, 0);
  if (planes <= 0 || state.battle?.failed) {
    state.phase = PHASE.DONE;
    state.landingDest = null;
    state.selected = state.dest;
    return state;
  }
  state.phase = PHASE.AIR_LAND;
  state.landingDest = null;
  state.landed = false;
  state.destPicked = null;
  state.selectedUnits = roster;
  state.selected = state.dest;
  return state;
}

function applyLanding(state) {
  if (!state.landingDest) return state;
  let from = state.placements[state.dest] || [];
  const roster = survivingAir(state);
  const qty = Object.values(roster).reduce((n, q) => n + q, 0);
  if (qty <= 0) {
    state.phase = PHASE.DONE;
    return state;
  }
  let dest = state.placements[state.landingDest] || [];
  for (const [type, n] of Object.entries(roster)) {
    from = removeQty(from, type, 'Russians', n);
    dest = addQty(dest, type, 'Russians', n);
  }
  state.placements[state.dest] = from;
  state.placements[state.landingDest] = dest;
  state.landed = true;
  state.phase = PHASE.DONE;
  state.selected = state.landingDest;
  state.selectedUnits = {};
  return state;
}

export function resetScenario(state) {
  const spec = scenarioById(state?.id);
  const seeded = seedPlacements(spec);
  const seededOwners = seedOwners(spec);
  if (state?.placements) {
    for (const [name, stacks] of Object.entries(seeded)) {
      state.placements[name] = cloneStacks(stacks);
    }
  }
  if (state?.owners) Object.assign(state.owners, seededOwners);
  if (!state) return createScenario();
  state.id = spec.id;
  state.origin = spec.origin;
  state.dest = spec.dest;
  state.legalDests = [...spec.legalDests];
  state.landable = [...spec.landable];
  state.labels = [...(spec.labels || LABEL_LANDS)];
  state.seed = spec.seed;
  state.phase = PHASE.COMBAT_MOVE;
  state.selected = null;
  state.selectedUnits = {};
  state.destPicked = null;
  state.landingDest = null;
  state.landed = false;
  state.guideOn = true;
  state.battle = null;
  state.rngCursor = 0;
  return state;
}

export function confirm(state) {
  if (!state || !confirmEnabled(state)) return state;
  if (state.phase === PHASE.COMBAT_MOVE) return applyCombatMove(state);
  if (state.phase === PHASE.BATTLE) {
    const step = state.battle?.step;
    if (step === BATTLE_STEP.AA_READY) return rollAA(state);
    if (step === BATTLE_STEP.AA_RESULT) {
      state.battle.step = BATTLE_STEP.COMBAT_READY;
      return state;
    }
    if (step === BATTLE_STEP.COMBAT_READY) return rollCombat(state);
    if (step === BATTLE_STEP.COMBAT_RESULT) return applyHits(state);
    if (step === BATTLE_STEP.WON) return startAirLand(state);
  }
  if (state.phase === PHASE.AIR_LAND) return applyLanding(state);
  if (state.phase === PHASE.DONE) return resetScenario(state);
  return state;
}

export function dismissGuide(state) {
  if (state) state.guideOn = false;
  return state;
}

export function battleCard(state) {
  const battle = state?.battle;
  if (!battle || state.phase !== PHASE.BATTLE) return null;
  const step = battle.step;
  if (step === BATTLE_STEP.AA_READY) {
    return {
      kicker: 'AA fire',
      title: state.dest,
      body: `${battle.aaGuns} gun vs ${battle.aaPlanes} aircraft · hit on 1`,
      dice: [],
    };
  }
  if (step === BATTLE_STEP.AA_RESULT) {
    return {
      kicker: 'AA results',
      title: battle.aaHits ? `Hit ×${battle.aaHits}` : 'Missed',
      body: battle.aaHits ? 'Cheapest aircraft removed' : 'Aircraft safe · next is combat',
      dice: battle.aaDice.map((face) => ({ face, hit: face === 1 })),
    };
  }
  if (step === BATTLE_STEP.COMBAT_READY) {
    return {
      kicker: battle.round ? `Round ${battle.round + 1}` : 'Combat',
      title: state.dest,
      body: 'Russians attack · Germans defend',
      dice: [],
    };
  }
  if (step === BATTLE_STEP.COMBAT_RESULT) {
    const dest = state.placements[state.dest] || [];
    const attMenu = lossMenu(dest, 'Russians', battle.defenseHits);
    const defMenu = lossMenu(dest, 'Germans', battle.attackHits);
    return {
      kicker: `Round ${battle.round}`,
      title: `ATK ${battle.attackHits} · DEF ${battle.defenseHits}`,
      body: attMenu.forced && defMenu.forced
        ? `Hits: you −${formatLoss(battle.pendingAtt)} · they −${formatLoss(battle.pendingDef)}`
        : 'Tap a unit to take each hit — do not auto-pick',
      dice: [
        ...battle.attackDice.map((d) => ({ ...d, side: 'atk' })),
        ...battle.defenseDice.map((d) => ({ ...d, side: 'def' })),
      ],
      pickers: [
        !attMenu.forced && attMenu.need > 0 ? {
          side: 'att',
          label: `You assign ${attMenu.need}`,
          need: attMenu.need,
          taken: { ...(battle.pendingAtt || {}) },
          units: attMenu.units,
        } : null,
        !defMenu.forced && defMenu.need > 0 ? {
          side: 'def',
          label: `They assign ${defMenu.need}`,
          need: defMenu.need,
          taken: { ...(battle.pendingDef || {}) },
          units: defMenu.units,
        } : null,
      ].filter(Boolean),
    };
  }
  if (step === BATTLE_STEP.WON) {
    return {
      kicker: battle.failed ? 'Held' : 'Taken',
      title: battle.failed ? 'Defender holds' : state.dest,
      body: battle.failed ? 'No landing — replay from Confirm' : 'Land the aircraft next',
      dice: [],
    };
  }
  return null;
}

function fillOptionalLosses(state) {
  const battle = state?.battle;
  if (!battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return state;
  const dest = state.placements[state.dest] || [];
  const sides = [
    { key: 'att', owner: 'Russians', hits: battle.defenseHits },
    { key: 'def', owner: 'Germans', hits: battle.attackHits },
  ];
  for (const side of sides) {
    const menu = lossMenu(dest, side.owner, side.hits);
    if (menu.forced || menu.need <= 0) continue;
    const pendingKey = side.key === 'att' ? 'pendingAtt' : 'pendingDef';
    for (const unit of menu.units) {
      let guard = 0;
      while (assignedCount(battle[pendingKey]) < menu.need && guard++ < 24) {
        const before = assignedCount(battle[pendingKey]);
        pickLoss(state, side.key, unit.type);
        if (assignedCount(battle[pendingKey]) <= before) break;
      }
    }
  }
  return state;
}

export function driveCombatMove(state) {
  tapLand(state, state.origin);
  const origin = state.placements[state.origin] || [];
  for (const type of COMBAT_TYPES) {
    const have = stackQty(origin, type);
    if (have > 0) state.selectedUnits[type] = have;
  }
  tapLand(state, state.dest);
  return state;
}

export function driveBattleMid(state) {
  driveCombatMove(state);
  confirm(state);
  if (state.battle?.step === BATTLE_STEP.AA_READY) confirm(state);
  if (state.battle?.step === BATTLE_STEP.AA_RESULT) confirm(state);
  if (state.battle?.step === BATTLE_STEP.COMBAT_READY) confirm(state);
  return state;
}

export function driveAirChoice(state) {
  driveBattleMid(state);
  let guard = 0;
  while (state.phase === PHASE.BATTLE && guard++ < 16) {
    const step = state.battle?.step;
    if (step === BATTLE_STEP.COMBAT_RESULT) {
      fillOptionalLosses(state);
      if (!lossesReady(state)) pickLoss(state, 'att', 'infantry');
      confirm(state);
      continue;
    }
    if (step === BATTLE_STEP.WON) {
      confirm(state);
      break;
    }
    confirm(state);
  }
  return state;
}

export function driveLanded(state, dest = 'Russia') {
  driveAirChoice(state);
  tapLand(state, dest);
  confirm(state);
  return state;
}

function countMap(stacks, owner = null) {
  const out = {};
  for (const s of stacks || []) {
    if (owner && s.owner !== owner) continue;
    out[s.type] = (out[s.type] || 0) + (Number(s.quantity) || 0);
  }
  return out;
}

export function inspectPlay(state) {
  const marks = highlights(state);
  const originName = state?.origin || SCENARIO.origin;
  const destName = state?.dest || SCENARIO.dest;
  return {
    scenario: state?.id || SCENARIO.id,
    phase: state?.phase || null,
    selected: state?.selected || null,
    origin: originName,
    dest: state?.destPicked || destName,
    landingDest: state?.landingDest || null,
    landed: !!state?.landed,
    selectedUnits: { ...(state?.selectedUnits || {}) },
    airLandRoster: airLandRoster(state),
    confirmLabel: confirmLabel(state),
    confirmGold: confirmGold(state),
    confirmEnabled: confirmEnabled(state),
    guideOn: false,
    guide: guideCopy(state),
    legalDests: legalDests(state),
    labels: [...(state?.labels || LABEL_LANDS)],
    lossesReady: lossesReady(state),
    pendingAtt: { ...(state?.battle?.pendingAtt || {}) },
    pendingDef: { ...(state?.battle?.pendingDef || {}) },
    battleStep: state?.battle?.step || null,
    aaHits: state?.battle?.aaHits ?? null,
    attackHits: state?.battle?.attackHits ?? null,
    defenseHits: state?.battle?.defenseHits ?? null,
    highlights: marks,
    attacker: countMap(state?.placements?.[originName], 'Russians'),
    defender: countMap(state?.placements?.[destName], 'Germans'),
    karelia: cloneStacks(state?.placements?.['Karelia S.S.R.']),
    finland: cloneStacks(state?.placements?.['Finland Norway']),
    ukraine: cloneStacks(state?.placements?.['Ukraine S.S.R.']),
    eastEurope: cloneStacks(state?.placements?.['East Europe']),
    russia: cloneStacks(state?.placements?.Russia),
    owners: { ...(state?.owners || {}) },
  };
}
