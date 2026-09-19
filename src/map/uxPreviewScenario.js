// Playable UX preview scenario — Combat Move → Battle → Air Land.
// Preview only. Seeded Karelia pocket. Manual taps only. Do not merge to main.

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
  fighter: { attack: 3, defense: 4, cost: 10, isAir: true, isAA: false },
  bomber: { attack: 4, defense: 1, cost: 12, isAir: true, isAA: false },
  aaGun: { attack: 0, defense: 0, cost: 5, isAir: false, isAA: true },
  armour: { attack: 3, defense: 2, cost: 5, isAir: false, isAA: false },
  artillery: { attack: 2, defense: 2, cost: 4, isAir: false, isAA: false },
  factory: { attack: 0, defense: 0, cost: 15, isAir: false, isAA: false },
};

export const COMBAT_TYPES = ['infantry', 'armour', 'artillery', 'fighter', 'bomber'];

export const SCENARIO = {
  id: 'karelia-finland-air',
  seat: 'Russians',
  ipc: 24,
  origin: 'Karelia S.S.R.',
  dest: 'Finland Norway',
  ukraine: 'Ukraine S.S.R.',
  landable: ['Karelia S.S.R.', 'Russia'],
  seed: 1941,
};

export const POCKET_LINKS = {
  'Karelia S.S.R.': [
    'Baltic Sea Zone', 'East Europe', 'Finland Norway',
    'Karelia Sea Zone', 'Russia', 'Ukraine S.S.R.',
  ],
  'Finland Norway': ['Karelia S.S.R.', 'Baltic Sea Zone', 'Karelia Sea Zone'],
  'Ukraine S.S.R.': [
    'Black Sea Zone', 'Caspian Sea Zone', 'East Europe',
    'Karelia S.S.R.', 'Persia', 'Russia', 'Turkey',
  ],
  Russia: ['Karelia S.S.R.', 'Ukraine S.S.R.', 'East Europe'],
  'East Europe': ['Karelia S.S.R.', 'Ukraine S.S.R.', 'Finland Norway', 'Russia'],
};

export const SELECT_GOLD = '#C4A35A';
export const LEGAL_GOLD = '#C4A35A';
export const LAND_TEAL = '#5BA8A0';

export const MOVE_STEPS = [
  'Tap attack-from',
  'Pick units',
  'Tap attack-to',
  'Confirm',
];

export const GUIDE = {
  [PHASE.COMBAT_MOVE]: '1 Tap attack-from · 2 Pick units · 3 Tap attack-to · 4 Confirm',
  [PHASE.BATTLE]: 'One Confirm at a time — AA, then dice, then choose hits.',
  [PHASE.AIR_LAND]: 'Teal lands can take the fighter. Tap one, Confirm.',
  [PHASE.DONE]: 'Fighter landed. Confirm is idle — Replay if you want.',
};

const DEMO_ROLLS = {
  aa: [4],
  attack: [1, 2, 5, 3],
  defense: [2, 6],
};

const TYPE_SHORT = {
  infantry: 'INF',
  armour: 'TNK',
  artillery: 'ART',
  fighter: 'FTR',
  bomber: 'BMB',
  aaGun: 'AA',
  factory: 'FAC',
};

export function shortType(type) {
  return TYPE_SHORT[type] || String(type || '?').slice(0, 3).toUpperCase();
}

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

export function seedPlacements() {
  return {
    [SCENARIO.origin]: [
      { type: 'infantry', quantity: 3, owner: 'Russians' },
      { type: 'fighter', quantity: 1, owner: 'Russians' },
    ],
    [SCENARIO.dest]: [
      { type: 'infantry', quantity: 2, owner: 'Germans' },
      { type: 'aaGun', quantity: 1, owner: 'Germans' },
    ],
    [SCENARIO.ukraine]: [
      { type: 'armour', quantity: 2, owner: 'Germans' },
      { type: 'infantry', quantity: 3, owner: 'Germans' },
      { type: 'fighter', quantity: 1, owner: 'Germans' },
    ],
    Russia: [
      { type: 'infantry', quantity: 1, owner: 'Russians' },
    ],
  };
}

export function seedOwners() {
  return {
    [SCENARIO.origin]: 'Russians',
    [SCENARIO.dest]: 'Germans',
    [SCENARIO.ukraine]: 'Germans',
    Russia: 'Russians',
    'East Europe': 'Germans',
  };
}

export function createScenario(overrides = {}) {
  return {
    id: SCENARIO.id,
    seat: SCENARIO.seat,
    ipc: SCENARIO.ipc,
    origin: SCENARIO.origin,
    dest: SCENARIO.dest,
    landable: [...SCENARIO.landable],
    connections: { ...POCKET_LINKS },
    phase: PHASE.COMBAT_MOVE,
    selected: null,
    attackFrom: null,
    selectedUnits: {},
    destPicked: null,
    landingDest: null,
    landed: false,
    guideOn: true,
    placements: seedPlacements(),
    owners: seedOwners(),
    battle: null,
    rngCursor: 0,
    ...overrides,
  };
}

export function applyScenarioPocket(basePlacements, baseOwners) {
  const placements = clonePlacements(basePlacements);
  const owners = { ...(baseOwners || {}) };
  const seeded = seedPlacements();
  const seededOwners = seedOwners();
  for (const [name, stacks] of Object.entries(seeded)) {
    placements[name] = cloneStacks(stacks);
  }
  Object.assign(owners, seededOwners);
  return { placements, owners };
}

export function attachConnections(state, territories) {
  if (!state) return state;
  const links = { ...POCKET_LINKS };
  for (const t of territories || []) {
    if (t?.name && Array.isArray(t.connections)) links[t.name] = [...t.connections];
  }
  state.connections = links;
  return state;
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

export function isCombatType(type) {
  return COMBAT_TYPES.includes(type);
}

export function hasGround(selectedUnits) {
  return (Number(selectedUnits?.infantry) || 0) > 0
    || (Number(selectedUnits?.armour) || 0) > 0
    || (Number(selectedUnits?.artillery) || 0) > 0;
}

export function hasAir(selectedUnits) {
  return (Number(selectedUnits?.fighter) || 0) > 0
    || (Number(selectedUnits?.bomber) || 0) > 0;
}

function combatUnits(stacks, owner) {
  return (stacks || [])
    .filter((s) => (
      s.owner === owner
      && (s.quantity || 0) > 0
      && isCombatType(s.type)
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

function useDemoRolls(state) {
  const attInf = Number(state.selectedUnits.infantry) || 0;
  const attFtr = Number(state.selectedUnits.fighter) || 0;
  const dest = state.destPicked || state.dest;
  const defInf = stackQty(state.placements[dest], 'infantry', 'Germans');
  return dest === SCENARIO.dest && attInf === 3 && attFtr === 1 && defInf === 2;
}

function takeDie(state, scripted, rng) {
  if (scripted && scripted.length) return scripted.shift();
  return d6(rng);
}

export function lossCount(taken) {
  return Object.values(taken || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

export function cheapestLosses(stacks, owner, hits) {
  const taken = {};
  let left = hits;
  for (const type of COMBAT_TYPES) {
    if (left <= 0) break;
    const have = stackQty(stacks, type, owner);
    const n = Math.min(have, left);
    if (n > 0) {
      taken[type] = n;
      left -= n;
    }
  }
  return taken;
}

export function casualtyPool(stacks, owner) {
  return combatUnits(stacks, owner).map((s) => ({
    type: s.type,
    quantity: s.quantity,
  }));
}

export function casualtyChoiceNeeded(stacks, owner, hits) {
  const pool = casualtyPool(stacks, owner);
  const total = pool.reduce((n, s) => n + (Number(s.quantity) || 0), 0);
  const need = Math.min(Math.max(0, hits), total);
  if (need <= 0) return false;
  if (need >= total) return false;
  return pool.filter((s) => (s.quantity || 0) > 0).length > 1;
}

function applyLosses(stacks, owner, taken) {
  let next = stacks;
  for (const [type, qty] of Object.entries(taken || {})) {
    next = removeQty(next, type, owner, qty);
  }
  return next;
}

function formatLoss(taken) {
  const parts = Object.entries(taken || {})
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${shortType(type)}×${n}`);
  return parts.join(' ') || 'none';
}

export function landLinks(state, name) {
  return state?.connections?.[name] || POCKET_LINKS[name] || [];
}

export function isEnemyLand(state, name) {
  if (!state || !name) return false;
  const owner = state.owners?.[name];
  return !!owner && owner !== state.seat;
}

export function isFriendlyLand(state, name) {
  if (!state || !name) return false;
  return state.owners?.[name] === state.seat;
}

export function landCombatQty(state, name, owner = null) {
  return totalQty(combatUnits(state?.placements?.[name], owner || state?.seat));
}

export function legalOrigins(state) {
  if (!state) return [];
  const names = new Set([
    ...Object.keys(state.owners || {}),
    ...Object.keys(state.placements || {}),
  ]);
  const out = [];
  for (const name of names) {
    if (!isFriendlyLand(state, name)) continue;
    if (landCombatQty(state, name, state.seat) <= 0) continue;
    const dests = landLinks(state, name).filter((n) => isEnemyLand(state, n));
    if (!dests.length) continue;
    out.push(name);
  }
  return out.sort((a, b) => {
    if (a === SCENARIO.origin) return -1;
    if (b === SCENARIO.origin) return 1;
    return a.localeCompare(b);
  });
}

export function legalDests(state, from = null) {
  const origin = from || state?.attackFrom;
  if (!state || !origin || !hasGround(state.selectedUnits)) return [];
  return landLinks(state, origin)
    .filter((name) => isEnemyLand(state, name))
    .sort((a, b) => {
      if (a === SCENARIO.dest) return -1;
      if (b === SCENARIO.dest) return 1;
      return a.localeCompare(b);
    });
}

export function destLegal(state) {
  return !!state
    && state.phase === PHASE.COMBAT_MOVE
    && !!state.attackFrom
    && !!state.destPicked
    && hasGround(state.selectedUnits)
    && legalDests(state, state.attackFrom).includes(state.destPicked);
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

  const origins = legalOrigins(state);
  if (origins.includes(name)) {
    if (state.attackFrom !== name) {
      state.attackFrom = name;
      state.selectedUnits = {};
      state.destPicked = null;
    }
    state.selected = name;
    return state;
  }

  if (state.attackFrom && hasGround(state.selectedUnits) && legalDests(state).includes(name)) {
    state.destPicked = name;
    state.selected = name;
    return state;
  }

  state.selected = name;
  return state;
}

export function pickUnit(state, type) {
  if (!state || state.phase !== PHASE.COMBAT_MOVE) return state;
  if (!isCombatType(type)) return state;
  let from = state.attackFrom;
  if (!from && legalOrigins(state).includes(state.selected)) {
    from = state.selected;
    state.attackFrom = from;
  }
  if (!from) return state;
  const have = stackQty(state.placements[from], type, state.seat);
  if (have <= 0) return state;
  if ((Number(state.selectedUnits[type]) || 0) > 0) {
    delete state.selectedUnits[type];
  } else {
    state.selectedUnits[type] = have;
  }
  if (!hasGround(state.selectedUnits)) state.destPicked = null;
  return state;
}

export function casualtiesReady(state) {
  const battle = state?.battle;
  if (!battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return true;
  return lossCount(battle.pendingAtt) >= (battle.attNeed || 0)
    && lossCount(battle.pendingDef) >= (battle.defNeed || 0);
}

export function pickCasualty(state, side, type) {
  const battle = state?.battle;
  if (!state || !battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return state;
  if (!isCombatType(type)) return state;
  const dest = state.placements[state.dest] || [];
  const owner = side === 'def' ? (battle.defender || state.owners[state.dest]) : state.seat;
  const key = side === 'def' ? 'pendingDef' : 'pendingAtt';
  const need = side === 'def' ? battle.defNeed : battle.attNeed;
  const pending = { ...(battle[key] || {}) };
  const have = stackQty(dest, type, owner);
  if (have <= 0 || need <= 0) return state;
  const already = Number(pending[type]) || 0;
  if (already > 0) {
    delete pending[type];
  } else {
    const room = need - (lossCount(pending) - already);
    const take = Math.min(have, Math.max(0, room));
    if (take > 0) pending[type] = take;
  }
  battle[key] = pending;
  return state;
}

export function confirmEnabled(state) {
  if (!state) return false;
  if (state.phase === PHASE.COMBAT_MOVE) return destLegal(state);
  if (state.phase === PHASE.BATTLE) {
    if (!state.battle) return false;
    if (state.battle.step === BATTLE_STEP.COMBAT_RESULT) return casualtiesReady(state);
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

export function combatMoveStep(state) {
  if (!state || state.phase !== PHASE.COMBAT_MOVE) return 0;
  if (destLegal(state)) return 4;
  if (state.attackFrom && hasGround(state.selectedUnits)) return 3;
  if (state.attackFrom || pickedCount(state.selectedUnits)) return 2;
  return 1;
}

export function confirmLabel(state) {
  if (!state) return 'Tap a glowing stack';
  if (state.phase === PHASE.COMBAT_MOVE) {
    if (destLegal(state)) return `Confirm: Attack ${state.destPicked}`;
    if (!state.attackFrom) return 'Tap a glowing stack';
    if (!pickedCount(state.selectedUnits)) return 'Pick units to attack';
    if (!hasGround(state.selectedUnits)) return 'Need a ground unit to take land';
    return 'Tap a glowing enemy land';
  }
  if (state.phase === PHASE.BATTLE) {
    const step = state.battle?.step;
    if (step === BATTLE_STEP.AA_READY) return 'Confirm: Fire AA';
    if (step === BATTLE_STEP.AA_RESULT) return 'Confirm: Continue';
    if (step === BATTLE_STEP.COMBAT_READY) return 'Confirm: Roll combat';
    if (step === BATTLE_STEP.COMBAT_RESULT) {
      return casualtiesReady(state) ? 'Confirm: Take hits' : 'Choose which unit dies';
    }
    if (step === BATTLE_STEP.WON) return `Confirm: Take ${state.dest}`;
    return 'Battle';
  }
  if (state.phase === PHASE.AIR_LAND) {
    if (!state.landingDest) return 'Tap a landable territory';
    return `Confirm: Land in ${state.landingDest}`;
  }
  if (state.phase === PHASE.DONE) {
    return state.landingDest
      ? `Landed in ${state.landingDest} · Replay`
      : 'Replay scenario';
  }
  return 'Tap a glowing stack';
}

export function guideCopy(state) {
  return GUIDE[state?.phase] || GUIDE[PHASE.COMBAT_MOVE];
}

export function guideSteps(state) {
  if (state?.phase === PHASE.COMBAT_MOVE) {
    return {
      persistent: true,
      current: combatMoveStep(state),
      steps: [...MOVE_STEPS],
    };
  }
  if (state?.phase === PHASE.BATTLE && state.battle?.step === BATTLE_STEP.COMBAT_RESULT) {
    return {
      persistent: true,
      current: casualtiesReady(state) ? 2 : 1,
      steps: ['Choose casualties', 'Confirm hits'],
    };
  }
  return {
    persistent: true,
    current: 0,
    steps: [guideCopy(state)],
  };
}

export function highlights(state) {
  const out = {
    origin: null,
    dest: null,
    legal: [],
    origins: [],
    landable: [],
    labels: [],
    selected: state?.selected || null,
    pulse: [],
  };
  if (!state) return out;
  if (state.phase === PHASE.COMBAT_MOVE) {
    const origins = legalOrigins(state);
    out.origins = origins;
    out.origin = state.attackFrom || SCENARIO.origin;
    if (!state.attackFrom) out.pulse.push(...origins);
    const dests = legalDests(state);
    out.legal = dests;
    if (hasGround(state.selectedUnits) && !state.destPicked) out.pulse.push(...dests);
    if (state.destPicked) out.dest = state.destPicked;
    out.labels = [...new Set([
      ...origins,
      ...dests,
      SCENARIO.origin,
      SCENARIO.dest,
      SCENARIO.ukraine,
      'Russia',
    ])];
  }
  if (state.phase === PHASE.BATTLE) {
    out.origin = state.origin;
    out.dest = state.dest;
    out.labels = [state.origin, state.dest].filter(Boolean);
  }
  if (state.phase === PHASE.AIR_LAND) {
    out.dest = state.dest;
    out.landable = [...state.landable];
    if (state.landingDest) out.selected = state.landingDest;
    out.labels = [...state.landable, state.dest];
  }
  if (state.phase === PHASE.DONE && state.landingDest) {
    out.selected = state.landingDest;
    out.labels = [state.landingDest, state.dest, state.origin];
  }
  return out;
}

function startBattle(state) {
  const destStacks = state.placements[state.dest] || [];
  const defender = state.owners[state.dest] || 'Germans';
  const guns = aaCount(destStacks, defender);
  const planes = Number(state.selectedUnits.fighter) || 0;
  state.phase = PHASE.BATTLE;
  state.selected = state.dest;
  state.battle = {
    step: guns > 0 && planes > 0 ? BATTLE_STEP.AA_READY : BATTLE_STEP.COMBAT_READY,
    round: 0,
    defender,
    aaGuns: guns,
    aaPlanes: planes,
    aaHits: 0,
    aaDice: [],
    attackDice: [],
    defenseDice: [],
    attackHits: 0,
    defenseHits: 0,
    attNeed: 0,
    defNeed: 0,
    attChoice: false,
    defChoice: false,
    pendingAtt: {},
    pendingDef: {},
    log: [],
  };
  return state;
}

function applyCombatMove(state) {
  const fromName = state.attackFrom || state.origin;
  const toName = state.destPicked;
  const from = state.placements[fromName] || [];
  let dest = state.placements[toName] || [];
  for (const [type, qty] of Object.entries(state.selectedUnits)) {
    const n = Number(qty) || 0;
    if (n <= 0) continue;
    state.placements[fromName] = removeQty(from, type, state.seat, n);
    dest = addQty(dest, type, state.seat, n);
  }
  state.placements[toName] = dest;
  state.origin = fromName;
  state.dest = toName;
  return startBattle(state);
}

function rollAA(state) {
  const battle = state.battle;
  const rng = mulberry32(SCENARIO.seed + state.rngCursor);
  const scripted = useDemoRolls(state) ? [...DEMO_ROLLS.aa] : null;
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
  if (hits > 0) {
    const dest = state.placements[state.dest] || [];
    const airTypes = combatUnits(dest, state.seat).filter((s) => UNIT_DEFS[s.type]?.isAir);
    if (airTypes.length <= 1 || hits >= airCount(dest, state.seat)) {
      state.placements[state.dest] = removeQty(dest, airTypes[0]?.type || 'fighter', state.seat, hits);
      const lostType = airTypes[0]?.type || 'fighter';
      if ((Number(state.selectedUnits[lostType]) || 0) > 0) {
        state.selectedUnits[lostType] = Math.max(0, state.selectedUnits[lostType] - hits);
      }
    }
  }
  battle.step = BATTLE_STEP.AA_RESULT;
  battle.log.push(hits ? `AA hit ×${hits}` : 'AA missed');
  return state;
}

function assignCasualties(state) {
  const battle = state.battle;
  const dest = state.placements[state.dest] || [];
  const defender = battle.defender || state.owners[state.dest];
  battle.attNeed = Math.min(battle.defenseHits, totalQty(combatUnits(dest, state.seat)));
  battle.defNeed = Math.min(battle.attackHits, totalQty(combatUnits(dest, defender)));
  battle.attChoice = casualtyChoiceNeeded(dest, state.seat, battle.attNeed);
  battle.defChoice = casualtyChoiceNeeded(dest, defender, battle.defNeed);
  battle.pendingAtt = battle.attChoice ? {} : cheapestLosses(dest, state.seat, battle.attNeed);
  battle.pendingDef = battle.defChoice ? {} : cheapestLosses(dest, defender, battle.defNeed);
}

function rollCombat(state) {
  const battle = state.battle;
  battle.round += 1;
  const dest = state.placements[state.dest] || [];
  const defender = battle.defender || state.owners[state.dest];
  const attackers = combatUnits(dest, state.seat);
  const defenders = combatUnits(dest, defender);
  const rng = mulberry32(SCENARIO.seed + 17 + state.rngCursor);
  const demo = useDemoRolls(state) && battle.round === 1;
  const attScript = demo ? [...DEMO_ROLLS.attack] : null;
  const defScript = demo ? [...DEMO_ROLLS.defense] : null;

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
  assignCasualties(state);
  battle.step = BATTLE_STEP.COMBAT_RESULT;
  battle.log.push(`R${battle.round} ATK ${attackHits} · DEF ${defenseHits}`);
  return state;
}

function applyHits(state) {
  const battle = state.battle;
  if (!casualtiesReady(state)) return state;
  let dest = state.placements[state.dest] || [];
  const defender = battle.defender || state.owners[state.dest];
  dest = applyLosses(dest, state.seat, battle.pendingAtt);
  dest = applyLosses(dest, defender, battle.pendingDef);
  state.placements[state.dest] = dest;
  const defendersLeft = totalQty(combatUnits(dest, defender));
  const attackersLeft = totalQty(combatUnits(dest, state.seat));
  battle.pendingAtt = {};
  battle.pendingDef = {};
  battle.attNeed = 0;
  battle.defNeed = 0;
  battle.attChoice = false;
  battle.defChoice = false;
  if (defendersLeft <= 0 && attackersLeft > 0) {
    state.owners[state.dest] = state.seat;
    dest = removeQty(dest, 'aaGun', defender, 99);
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

function startAirLand(state) {
  const dest = state.placements[state.dest] || [];
  const planes = airCount(dest, state.seat);
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
  state.attackFrom = null;
  state.selectedUnits = { fighter: planes };
  state.selected = state.dest;
  return state;
}

function applyLanding(state) {
  if (!state.landingDest) return state;
  let from = state.placements[state.dest] || [];
  const qty = airCount(from, state.seat);
  if (qty <= 0) {
    state.phase = PHASE.DONE;
    return state;
  }
  from = removeQty(from, 'fighter', state.seat, qty);
  state.placements[state.dest] = from;
  state.placements[state.landingDest] = addQty(
    state.placements[state.landingDest] || [],
    'fighter',
    state.seat,
    qty,
  );
  state.landed = true;
  state.phase = PHASE.DONE;
  state.selected = state.landingDest;
  state.selectedUnits = {};
  return state;
}

export function resetScenario(state) {
  const seeded = seedPlacements();
  const seededOwners = seedOwners();
  if (state?.placements) {
    for (const [name, stacks] of Object.entries(seeded)) {
      state.placements[name] = cloneStacks(stacks);
    }
  }
  if (state?.owners) Object.assign(state.owners, seededOwners);
  if (!state) return createScenario();
  state.phase = PHASE.COMBAT_MOVE;
  state.selected = null;
  state.attackFrom = null;
  state.selectedUnits = {};
  state.destPicked = null;
  state.landingDest = null;
  state.landed = false;
  state.guideOn = true;
  state.battle = null;
  state.rngCursor = 0;
  state.origin = SCENARIO.origin;
  state.dest = SCENARIO.dest;
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

function casualtySide(state, side) {
  const battle = state?.battle;
  if (!battle) return null;
  const dest = state.placements[state.dest] || [];
  const owner = side === 'def' ? (battle.defender || state.owners[state.dest]) : state.seat;
  const need = side === 'def' ? battle.defNeed : battle.attNeed;
  const choice = side === 'def' ? battle.defChoice : battle.attChoice;
  const pending = side === 'def' ? battle.pendingDef : battle.pendingAtt;
  if (need <= 0 && !choice) return null;
  return {
    side,
    owner,
    need,
    choice,
    picked: lossCount(pending),
    pending: { ...(pending || {}) },
    pool: casualtyPool(dest, owner),
  };
}

export function battleCard(state) {
  const battle = state?.battle;
  if (!battle || state.phase !== PHASE.BATTLE) return null;
  const step = battle.step;
  if (step === BATTLE_STEP.AA_READY) {
    return {
      kicker: 'AA fire',
      title: state.dest,
      body: `${battle.aaGuns} gun vs ${battle.aaPlanes} fighter · hit on 1`,
      dice: [],
    };
  }
  if (step === BATTLE_STEP.AA_RESULT) {
    return {
      kicker: 'AA results',
      title: battle.aaHits ? `Hit ×${battle.aaHits}` : 'Missed',
      body: battle.aaHits ? 'Aircraft removed' : 'Fighter is safe · next is combat',
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
    const att = casualtySide(state, 'att');
    const def = casualtySide(state, 'def');
    const choose = (att?.choice && att.picked < att.need) || (def?.choice && def.picked < def.need);
    return {
      kicker: `Round ${battle.round}`,
      title: `ATK ${battle.attackHits} · DEF ${battle.defenseHits}`,
      body: choose
        ? 'Rules give a choice — tap the unit that dies. Confirm stays gray until the pick is complete.'
        : `Hits: you −${formatLoss(battle.pendingAtt)} · they −${formatLoss(battle.pendingDef)}`,
      dice: [
        ...battle.attackDice.map((d) => ({ ...d, side: 'atk' })),
        ...battle.defenseDice.map((d) => ({ ...d, side: 'def' })),
      ],
      casualty: { att, def },
    };
  }
  if (step === BATTLE_STEP.WON) {
    return {
      kicker: battle.failed ? 'Held' : 'Taken',
      title: battle.failed ? 'Defender holds' : state.dest,
      body: battle.failed ? 'No landing — replay from Confirm' : 'Land the fighter next',
      dice: [],
    };
  }
  return null;
}

export function driveCombatMove(state) {
  tapLand(state, state.origin);
  pickUnit(state, 'infantry');
  pickUnit(state, 'fighter');
  tapLand(state, state.dest);
  return state;
}

export function driveBattleMid(state) {
  driveCombatMove(state);
  confirm(state);
  confirm(state);
  confirm(state);
  confirm(state);
  if (state.battle?.attChoice) pickCasualty(state, 'att', 'infantry');
  if (state.battle?.defChoice) {
    const def = casualtySide(state, 'def');
    const first = def?.pool?.[0]?.type;
    if (first) pickCasualty(state, 'def', first);
  }
  return state;
}

export function driveAirChoice(state) {
  driveBattleMid(state);
  confirm(state);
  confirm(state);
  return state;
}

export function driveLanded(state, dest = 'Russia') {
  driveAirChoice(state);
  tapLand(state, dest);
  confirm(state);
  return state;
}

export function inspectPlay(state) {
  const marks = highlights(state);
  return {
    scenario: state?.id || SCENARIO.id,
    phase: state?.phase || null,
    selected: state?.selected || null,
    attackFrom: state?.attackFrom || null,
    origin: state?.origin || null,
    dest: state?.destPicked || state?.dest || null,
    landingDest: state?.landingDest || null,
    landed: !!state?.landed,
    selectedUnits: { ...(state?.selectedUnits || {}) },
    confirmLabel: confirmLabel(state),
    confirmGold: confirmGold(state),
    confirmEnabled: confirmEnabled(state),
    destLegal: destLegal(state),
    legalOrigins: legalOrigins(state),
    legalDests: legalDests(state),
    guideOn: !!state?.guideOn,
    guide: guideCopy(state),
    guideSteps: guideSteps(state),
    combatMoveStep: combatMoveStep(state),
    battleStep: state?.battle?.step || null,
    attChoice: state?.battle?.attChoice ?? null,
    defChoice: state?.battle?.defChoice ?? null,
    attNeed: state?.battle?.attNeed ?? null,
    defNeed: state?.battle?.defNeed ?? null,
    pendingAtt: { ...(state?.battle?.pendingAtt || {}) },
    pendingDef: { ...(state?.battle?.pendingDef || {}) },
    aaHits: state?.battle?.aaHits ?? null,
    attackHits: state?.battle?.attackHits ?? null,
    defenseHits: state?.battle?.defenseHits ?? null,
    highlights: marks,
    karelia: cloneStacks(state?.placements?.[SCENARIO.origin]),
    finland: cloneStacks(state?.placements?.[SCENARIO.dest]),
    ukraine: cloneStacks(state?.placements?.[SCENARIO.ukraine]),
    russia: cloneStacks(state?.placements?.Russia),
    owners: { ...(state?.owners || {}) },
  };
}
