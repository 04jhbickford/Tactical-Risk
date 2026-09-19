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
  CASUALTIES: 'casualties',
  WON: 'won',
};

export const UNIT_DEFS = {
  infantry: { attack: 1, defense: 2, cost: 3, isAir: false, isAA: false },
  fighter: { attack: 3, defense: 4, cost: 10, isAir: true, isAA: false },
  aaGun: { attack: 0, defense: 0, cost: 5, isAir: false, isAA: true },
  armour: { attack: 3, defense: 2, cost: 5, isAir: false, isAA: false },
  factory: { attack: 0, defense: 0, cost: 15, isAir: false, isAA: false },
};

export const SCENARIO = {
  id: 'karelia-finland-air',
  seat: 'Russians',
  ipc: 24,
  origin: 'Karelia S.S.R.',
  dest: 'Finland Norway',
  landable: ['Karelia S.S.R.', 'Russia'],
  seed: 1941,
  attackVerb: 'confirm',
};

export const GERMANS_SCENARIO = {
  id: 'ukraine-karelia',
  seat: 'Germans',
  ipc: 32,
  origin: 'Ukraine S.S.R.',
  dest: 'Karelia S.S.R.',
  landable: ['Ukraine S.S.R.', 'East Europe'],
  seed: 1941,
  attackVerb: 'attack',
};

export const MOVEABLE = ['infantry', 'armour', 'artillery', 'fighter', 'bomber'];
export const ATTACK_HINT = 'Tap units above to attack';

const POCKET_ON = new Set(['1', 'true', 'yes', 'germans']);

export function isGermansTip(state) {
  return state?.seat === 'Germans' || state?.id === GERMANS_SCENARIO.id;
}

export function pocketFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const raw = String(params.get('germans') || params.get('seat') || '').toLowerCase();
  if (POCKET_ON.has(raw)) return GERMANS_SCENARIO;
  return SCENARIO;
}

export const SELECT_GOLD = '#C4A35A';
export const LEGAL_GOLD = '#C4A35A';
export const LAND_TEAL = '#5BA8A0';

export const GUIDE = {
  [PHASE.COMBAT_MOVE]: 'Tap your stack → units → enemy land → Confirm',
  [PHASE.BATTLE]: 'One Confirm at a time — AA, then dice, then hits.',
  [PHASE.AIR_LAND]: 'Teal lands can take the fighter. Tap one, Confirm.',
  [PHASE.DONE]: 'Fighter landed. Confirm is idle — Replay if you want.',
};

export const COMBAT_MOVE_START = 'Tap your stack → units → enemy land → Confirm';

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

export function seedPlacements(pocket = SCENARIO) {
  if (pocket?.id === GERMANS_SCENARIO.id || pocket?.seat === 'Germans') {
    return {
      [GERMANS_SCENARIO.origin]: [
        { type: 'armour', quantity: 2, owner: 'Germans' },
        { type: 'infantry', quantity: 3, owner: 'Germans' },
        { type: 'fighter', quantity: 1, owner: 'Germans' },
      ],
      [GERMANS_SCENARIO.dest]: [
        { type: 'armour', quantity: 1, owner: 'Russians' },
        { type: 'infantry', quantity: 3, owner: 'Russians' },
        { type: 'fighter', quantity: 1, owner: 'Russians' },
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
    Russia: [
      { type: 'infantry', quantity: 1, owner: 'Russians' },
    ],
  };
}

export function seedOwners(pocket = SCENARIO) {
  if (pocket?.id === GERMANS_SCENARIO.id || pocket?.seat === 'Germans') {
    return {
      [GERMANS_SCENARIO.origin]: 'Germans',
      [GERMANS_SCENARIO.dest]: 'Russians',
    };
  }
  return {
    [SCENARIO.origin]: 'Russians',
    [SCENARIO.dest]: 'Germans',
    Russia: 'Russians',
  };
}

function pocketDefaults(overrides = {}) {
  if (overrides.id === GERMANS_SCENARIO.id || overrides.seat === 'Germans') {
    return GERMANS_SCENARIO;
  }
  return SCENARIO;
}

export function createScenario(overrides = {}) {
  const pocket = pocketDefaults(overrides);
  return {
    id: pocket.id,
    seat: pocket.seat,
    ipc: pocket.ipc,
    origin: pocket.origin,
    dest: pocket.dest,
    landable: [...pocket.landable],
    attackVerb: pocket.attackVerb,
    phase: PHASE.COMBAT_MOVE,
    selected: null,
    selectedUnits: {},
    destPicked: null,
    landingDest: null,
    landed: false,
    guideOn: true,
    placements: seedPlacements(pocket),
    owners: seedOwners(pocket),
    battle: null,
    rngCursor: 0,
    ...overrides,
  };
}

export function applyScenarioPocket(basePlacements, baseOwners, pocket = SCENARIO) {
  const placements = clonePlacements(basePlacements);
  const owners = { ...(baseOwners || {}) };
  const seeded = seedPlacements(pocket);
  const seededOwners = seedOwners(pocket);
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
  return (Number(selectedUnits?.infantry) || 0) > 0
    || (Number(selectedUnits?.armour) || 0) > 0;
}

export function hasAir(selectedUnits) {
  return (Number(selectedUnits?.fighter) || 0) > 0
    || (Number(selectedUnits?.bomber) || 0) > 0;
}

function combatUnits(stacks, owner) {
  const order = ['infantry', 'armour', 'fighter', 'bomber'];
  return (stacks || [])
    .filter((s) => (
      s.owner === owner
      && (s.quantity || 0) > 0
      && s.type !== 'factory'
      && s.type !== 'aaGun'
    ))
    .sort((a, b) => {
      const ia = order.indexOf(a.type);
      const ib = order.indexOf(b.type);
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
  const defInf = stackQty(state.placements[state.dest], 'infantry', 'Germans');
  return attInf === 3 && attFtr === 1 && defInf === 2;
}

function takeDie(state, scripted, rng) {
  if (scripted && scripted.length) return scripted.shift();
  return d6(rng);
}

function cheapestLosses(stacks, owner, hits) {
  const order = ['infantry', 'armour', 'fighter', 'bomber'];
  const taken = {};
  let left = hits;
  for (const type of order) {
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
  const parts = Object.entries(taken || {})
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${type === 'infantry' ? 'INF' : type === 'fighter' ? 'FTR' : type}×${n}`);
  return parts.join(' ') || 'none';
}

export function attackerOf(state) {
  return state?.seat || 'Russians';
}

export function defenderOf(state) {
  const att = attackerOf(state);
  const marked = state?.owners?.[state.dest];
  if (marked && marked !== att) return marked;
  return att === 'Russians' ? 'Germans' : 'Russians';
}

export function autoStage(state) {
  if (!state) return state;
  const stacks = state.placements[state.origin] || [];
  const next = {};
  for (const type of MOVEABLE) {
    const n = stackQty(stacks, type, attackerOf(state));
    if (n > 0) next[type] = n;
  }
  state.selectedUnits = next;
  return state;
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
    return state;
  }
  if (name === state.dest) {
    state.destPicked = name;
    state.selected = state.origin;
    return state;
  }
  if (name !== state.origin && name !== state.dest) {
    state.selected = name;
  }
  return state;
}

export function pickCasualty(state, type, side = 'att') {
  const battle = state?.battle;
  if (!state || state.phase !== PHASE.BATTLE || battle?.step !== BATTLE_STEP.CASUALTIES) {
    return state;
  }
  const dest = state.placements[state.dest] || [];
  const owner = side === 'def' ? defenderOf(state) : attackerOf(state);
  const need = side === 'def' ? (battle.needDef || 0) : (battle.needAtt || 0);
  const pending = side === 'def' ? battle.pendingDef : battle.pendingAtt;
  if (assignedHits(pending) >= need) return state;
  const have = stackQty(dest, type, owner);
  const already = Number(pending[type]) || 0;
  if (already >= have) return state;
  pending[type] = already + 1;
  return state;
}

export function pickUnit(state, type) {
  if (!state) return state;
  if (state.phase === PHASE.BATTLE && state.battle?.step === BATTLE_STEP.CASUALTIES) {
    return pickCasualty(state, type, 'att');
  }
  if (state.phase !== PHASE.COMBAT_MOVE) return state;
  const have = stackQty(state.placements[state.origin], type, attackerOf(state));
  if (have <= 0) return state;
  if ((Number(state.selectedUnits[type]) || 0) > 0) {
    delete state.selectedUnits[type];
  } else {
    state.selectedUnits[type] = have;
  }
  return state;
}

export function adjustUnit(state, type, delta) {
  if (state?.phase === PHASE.BATTLE && state.battle?.step === BATTLE_STEP.CASUALTIES) {
    if (Number(delta) > 0) return pickCasualty(state, type, 'att');
    const pending = state.battle.pendingAtt || {};
    const cur = Number(pending[type]) || 0;
    if (cur <= 1) delete pending[type];
    else pending[type] = cur - 1;
    return state;
  }
  if (!state || state.phase !== PHASE.COMBAT_MOVE) return state;
  const have = stackQty(state.placements[state.origin], type, attackerOf(state));
  if (have <= 0) return state;
  const cur = Number(state.selectedUnits[type]) || 0;
  const next = Math.max(0, Math.min(have, cur + Number(delta || 0)));
  if (next <= 0) delete state.selectedUnits[type];
  else state.selectedUnits[type] = next;
  return state;
}

export function isCombatMoveIdle(state) {
  return !!state
    && state.phase === PHASE.COMBAT_MOVE
    && !state.destPicked
    && !pickedCount(state.selectedUnits)
    && state.selected !== state.origin;
}

export function destLegal(state) {
  return !!state
    && state.phase === PHASE.COMBAT_MOVE
    && !!state.destPicked
    && hasGround(state.selectedUnits);
}

export function assignedHits(taken) {
  return Object.values(taken || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

export function casualtyChoice(stacks, owner, hits) {
  const units = combatUnits(stacks, owner);
  const total = totalQty(units);
  const need = Math.min(Math.max(0, Number(hits) || 0), total);
  const types = units.filter((u) => (u.quantity || 0) > 0);
  const choice = need > 0 && types.length > 1 && need < total;
  return { need, choice, types };
}

export function confirmEnabled(state) {
  if (!state) return false;
  if (state.phase === PHASE.COMBAT_MOVE) return destLegal(state);
  if (state.phase === PHASE.BATTLE) {
    if (!state.battle) return false;
    if (state.battle.step === BATTLE_STEP.CASUALTIES) {
      return assignedHits(state.battle.pendingAtt) >= (state.battle.needAtt || 0)
        && assignedHits(state.battle.pendingDef) >= (state.battle.needDef || 0);
    }
    return true;
  }
  if (state.phase === PHASE.AIR_LAND) return !!state.landingDest && !state.landed;
  if (state.phase === PHASE.DONE) return true;
  return false;
}

export function confirmGold(state) {
  if (!state || state.phase === PHASE.DONE) return false;
  if (state.phase === PHASE.COMBAT_MOVE) return destLegal(state);
  return confirmEnabled(state);
}

export function attackLabel(state) {
  if (!state) return 'Attack';
  return isGermansTip(state)
    ? `Attack ${state.dest}`
    : `Confirm: Move to ${state.dest}`;
}

export function confirmHint(state) {
  if (!state) return '';
  if (state.phase === PHASE.BATTLE && state.battle?.step === BATTLE_STEP.CASUALTIES) {
    if (!confirmEnabled(state)) return 'Tap a unit to take the hit';
    return '';
  }
  if (state.phase !== PHASE.COMBAT_MOVE) return '';
  if (state.destPicked && !hasGround(state.selectedUnits)) return ATTACK_HINT;
  return '';
}

export function needsChipPulse(state) {
  return !!state
    && state.phase === PHASE.COMBAT_MOVE
    && !!state.destPicked
    && !hasGround(state.selectedUnits);
}

export function confirmLabel(state) {
  if (!state) return 'Select your stack';
  if (state.phase === PHASE.COMBAT_MOVE) {
    if (destLegal(state) || state.destPicked) return attackLabel(state);
    if (isGermansTip(state)) return `Attack ${state.dest}`;
    if (state.selected !== state.origin) return 'Select your stack';
    if (!hasGround(state.selectedUnits)) return 'Pick infantry, then a dest';
    return `Tap ${state.dest}`;
  }
  if (state.phase === PHASE.BATTLE) {
    const step = state.battle?.step;
    if (step === BATTLE_STEP.AA_READY) return 'Confirm: Fire AA';
    if (step === BATTLE_STEP.AA_RESULT) return 'Confirm: Continue';
    if (step === BATTLE_STEP.COMBAT_READY) return 'Confirm: Roll combat';
    if (step === BATTLE_STEP.COMBAT_RESULT) return 'Confirm: Take hits';
    if (step === BATTLE_STEP.CASUALTIES) return 'Confirm: Take hits';
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
  return 'Select your stack';
}

export function guideCopy(state) {
  return GUIDE[state?.phase] || GUIDE[PHASE.COMBAT_MOVE];
}

export function highlights(state) {
  const out = {
    origin: null,
    dest: null,
    legal: [],
    origins: [],
    labels: [],
    landable: [],
    selected: state?.selected || null,
  };
  if (!state) return out;
  if (state.phase === PHASE.COMBAT_MOVE) {
    if (isCombatMoveIdle(state)) {
      out.origins = [state.origin];
      out.labels = [{ name: state.origin, kind: 'from' }];
    }
    if (
      state.selected === state.origin
      || pickedCount(state.selectedUnits)
      || state.destPicked
    ) {
      out.origin = state.origin;
    }
    out.legal = [state.dest];
    if (state.destPicked) out.dest = state.destPicked;
    if (out.origin || state.destPicked) {
      out.labels = [
        { name: state.origin, kind: 'from' },
        state.destPicked ? { name: state.destPicked, kind: 'to' } : null,
      ].filter(Boolean);
    }
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

function startBattle(state) {
  const destStacks = state.placements[state.dest] || [];
  const guns = aaCount(destStacks, defenderOf(state));
  const planes = Number(state.selectedUnits.fighter) || 0;
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
  const from = state.placements[state.origin] || [];
  let dest = state.placements[state.dest] || [];
  for (const [type, qty] of Object.entries(state.selectedUnits)) {
    const n = Number(qty) || 0;
    if (n <= 0) continue;
    state.placements[state.origin] = removeQty(from, type, attackerOf(state), n);
    dest = addQty(dest, type, attackerOf(state), n);
  }
  state.placements[state.dest] = dest;
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
    state.placements[state.dest] = removeQty(dest, 'fighter', attackerOf(state), hits);
    if ((Number(state.selectedUnits.fighter) || 0) > 0) {
      state.selectedUnits.fighter = Math.max(0, state.selectedUnits.fighter - hits);
    }
  }
  battle.step = BATTLE_STEP.AA_RESULT;
  battle.log.push(hits ? `AA hit ×${hits}` : 'AA missed');
  return state;
}

function rollCombat(state) {
  const battle = state.battle;
  battle.round += 1;
  const dest = state.placements[state.dest] || [];
  const attackers = combatUnits(dest, attackerOf(state));
  const defenders = combatUnits(dest, defenderOf(state));
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
  const attOpt = casualtyChoice(dest, attackerOf(state), defenseHits);
  const defOpt = casualtyChoice(dest, defenderOf(state), attackHits);
  battle.needAtt = attOpt.need;
  battle.needDef = defOpt.need;
  battle.attChoice = attOpt.choice;
  battle.defChoice = defOpt.choice;
  battle.pendingAtt = attOpt.choice ? {} : cheapestLosses(dest, attackerOf(state), defenseHits);
  battle.pendingDef = defOpt.choice ? {} : cheapestLosses(dest, defenderOf(state), attackHits);
  battle.step = (attOpt.choice || defOpt.choice)
    ? BATTLE_STEP.CASUALTIES
    : BATTLE_STEP.COMBAT_RESULT;
  battle.log.push(`R${battle.round} ATK ${attackHits} · DEF ${defenseHits}`);
  return state;
}

function applyHits(state) {
  const battle = state.battle;
  let dest = state.placements[state.dest] || [];
  dest = applyLosses(dest, attackerOf(state), battle.pendingAtt);
  dest = applyLosses(dest, defenderOf(state), battle.pendingDef);
  state.placements[state.dest] = dest;
  const defendersLeft = totalQty(combatUnits(dest, defenderOf(state)));
  const attackersLeft = totalQty(combatUnits(dest, attackerOf(state)));
  battle.pendingAtt = {};
  battle.pendingDef = {};
  if (defendersLeft <= 0 && attackersLeft > 0) {
    state.owners[state.dest] = attackerOf(state);
    dest = removeQty(dest, 'aaGun', defenderOf(state), 99);
    state.placements[state.dest] = dest;
    battle.step = BATTLE_STEP.WON;
    battle.log.push('Attacker takes Finland Norway');
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
  const planes = airCount(dest, attackerOf(state));
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
  state.selectedUnits = { fighter: planes };
  state.selected = state.dest;
  return state;
}

function applyLanding(state) {
  if (!state.landingDest) return state;
  let from = state.placements[state.dest] || [];
  const qty = airCount(from, attackerOf(state));
  if (qty <= 0) {
    state.phase = PHASE.DONE;
    return state;
  }
  from = removeQty(from, 'fighter', attackerOf(state), qty);
  state.placements[state.dest] = from;
  state.placements[state.landingDest] = addQty(
    state.placements[state.landingDest] || [],
    'fighter',
    attackerOf(state),
    qty,
  );
  state.landed = true;
  state.phase = PHASE.DONE;
  state.selected = state.landingDest;
  state.selectedUnits = {};
  return state;
}

export function resetScenario(state) {
  const pocket = isGermansTip(state) ? GERMANS_SCENARIO : SCENARIO;
  const seeded = seedPlacements(pocket);
  const seededOwners = seedOwners(pocket);
  if (state?.placements) {
    for (const [name, stacks] of Object.entries(seeded)) {
      state.placements[name] = cloneStacks(stacks);
    }
  }
  if (state?.owners) Object.assign(state.owners, seededOwners);
  if (!state) return createScenario();
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

export function createGermansMidflow(overrides = {}) {
  const state = createScenario({ ...GERMANS_SCENARIO, ...overrides });
  tapLand(state, state.origin);
  tapLand(state, state.dest);
  return state;
}

export function confirm(state) {
  if (!state || !confirmEnabled(state)) return state;
  if (state.phase === PHASE.COMBAT_MOVE) {
    if (destLegal(state)) return applyCombatMove(state);
    return state;
  }
  if (state.phase === PHASE.BATTLE) {
    const step = state.battle?.step;
    if (step === BATTLE_STEP.AA_READY) return rollAA(state);
    if (step === BATTLE_STEP.AA_RESULT) {
      state.battle.step = BATTLE_STEP.COMBAT_READY;
      return state;
    }
    if (step === BATTLE_STEP.COMBAT_READY) return rollCombat(state);
    if (step === BATTLE_STEP.COMBAT_RESULT || step === BATTLE_STEP.CASUALTIES) {
      return applyHits(state);
    }
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
      body: `${battle.aaGuns} gun vs ${battle.aaPlanes} fighter · hit on 1`,
      dice: [],
    };
  }
  if (step === BATTLE_STEP.AA_RESULT) {
    return {
      kicker: 'AA results',
      title: battle.aaHits ? `Hit ×${battle.aaHits}` : 'Missed',
      body: battle.aaHits ? 'Cheapest aircraft removed' : 'Fighter is safe · next is combat',
      dice: battle.aaDice.map((face) => ({ face, hit: face === 1 })),
    };
  }
  if (step === BATTLE_STEP.COMBAT_READY) {
    return {
      kicker: battle.round ? `Round ${battle.round + 1}` : 'Combat',
      title: state.dest,
      body: `${attackerOf(state)} attack · ${defenderOf(state)} defend`,
      dice: [],
    };
  }
  if (step === BATTLE_STEP.COMBAT_RESULT) {
    return {
      kicker: `Round ${battle.round}`,
      title: `ATK ${battle.attackHits} · DEF ${battle.defenseHits}`,
      body: `Hits: you −${formatLoss(battle.pendingAtt)} · they −${formatLoss(battle.pendingDef)}`,
      dice: [
        ...battle.attackDice.map((d) => ({ ...d, side: 'atk' })),
        ...battle.defenseDice.map((d) => ({ ...d, side: 'def' })),
      ],
    };
  }
  if (step === BATTLE_STEP.CASUALTIES) {
    const have = assignedHits(battle.pendingAtt);
    const need = battle.needAtt || 0;
    return {
      kicker: 'Select hits',
      title: `You ${have}/${need} · they ${formatLoss(battle.pendingDef) || 'none'}`,
      body: battle.attChoice ? 'Tap your units to assign hits' : 'Hits assigned',
      dice: [
        ...battle.attackDice.map((d) => ({ ...d, side: 'atk' })),
        ...battle.defenseDice.map((d) => ({ ...d, side: 'def' })),
      ],
      casualties: true,
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
  return state;
}

export function driveCasualtySelect(state) {
  driveBattleMid(state);
  if (state.battle?.step === BATTLE_STEP.CASUALTIES) {
    pickCasualty(state, 'infantry', 'att');
  }
  return state;
}

export function driveAirChoice(state) {
  driveBattleMid(state);
  if (state.battle?.step === BATTLE_STEP.CASUALTIES) {
    pickCasualty(state, 'infantry', 'att');
    confirm(state);
  } else if (state.battle?.step === BATTLE_STEP.COMBAT_RESULT) {
    confirm(state);
  }
  confirm(state);
  return state;
}

export function driveLanded(state, dest = 'Russia') {
  driveAirChoice(state);
  tapLand(state, dest);
  confirm(state);
  return state;
}

export function driveGermansMid(state) {
  if (!state) return createGermansMidflow();
  resetScenario(state);
  tapLand(state, state.origin);
  tapLand(state, state.dest);
  return state;
}

export function inspectPlay(state) {
  const marks = highlights(state);
  return {
    scenario: state?.id || SCENARIO.id,
    phase: state?.phase || null,
    selected: state?.selected || null,
    origin: state?.origin || null,
    dest: state?.destPicked || null,
    landingDest: state?.landingDest || null,
    landed: !!state?.landed,
    selectedUnits: { ...(state?.selectedUnits || {}) },
    confirmLabel: confirmLabel(state),
    confirmGold: confirmGold(state),
    confirmEnabled: confirmEnabled(state),
    destLegal: destLegal(state),
    idle: isCombatMoveIdle(state),
    hint: confirmHint(state),
    pulseChips: needsChipPulse(state),
    seat: state?.seat || null,
    guideOn: !!state?.guideOn,
    guide: guideCopy(state),
    battleStep: state?.battle?.step || null,
    aaHits: state?.battle?.aaHits ?? null,
    attackHits: state?.battle?.attackHits ?? null,
    defenseHits: state?.battle?.defenseHits ?? null,
    highlights: marks,
    karelia: cloneStacks(state?.placements?.[SCENARIO.origin]),
    finland: cloneStacks(state?.placements?.[SCENARIO.dest]),
    russia: cloneStacks(state?.placements?.Russia),
    owners: { ...(state?.owners || {}) },
  };
}
