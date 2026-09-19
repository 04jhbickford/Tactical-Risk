// Three solo play adapter: GameState + .11 chrome. Do not grow uxPreviewScenario.

import {
  GAME_PHASES,
  TURN_PHASES,
  TURN_PHASE_ORDER,
  TURN_PHASE_NAMES,
} from '../state/gameState.js';
import {
  countLivingUnits,
  getEnemyCombatUnits,
  getFriendlyCombatUnits,
  territoryCombatAlreadyResolved,
} from '../ui/combatUI.js';
import { remainingAirLandingsToAssign } from '../state/airLanding.js';

export const BATTLE_STEP = {
  AA_READY: 'aaReady',
  AA_RESULT: 'aaResult',
  COMBAT_READY: 'combatReady',
  COMBAT_RESULT: 'combatResult',
  WON: 'won',
};

export const STRIP_SHORT = {
  [TURN_PHASES.DEVELOP_TECH]: 'Tech',
  [TURN_PHASES.PURCHASE]: 'Buy',
  [TURN_PHASES.COMBAT_MOVE]: 'Move',
  [TURN_PHASES.COMBAT]: 'Fight',
  [TURN_PHASES.NON_COMBAT_MOVE]: 'NCM',
  [TURN_PHASES.MOBILIZE]: 'Place',
  [TURN_PHASES.COLLECT_INCOME]: 'Income',
};

const COMBAT_ORDER = [
  'infantry', 'artillery', 'armour',
  'fighter', 'tacticalBomber', 'bomber',
  'submarine', 'destroyer', 'cruiser', 'battleship', 'carrier', 'transport',
];

const AIR_ORDER = ['fighter', 'tacticalBomber', 'bomber'];
const LAND_TEAL = '#5BA8A0';
export { LAND_TEAL };

export function createSoloPlay(gameState, unitDefs = {}) {
  return {
    gameState,
    unitDefs,
    selected: null,
    selectedUnits: {},
    destPicked: null,
    battle: null,
    landing: null,
    aiStatus: null,
    rng: null,
    _phase: gameState?.turnPhase || null,
    _player: gameState?.currentPlayer?.id || null,
  };
}

export function resetUi(play) {
  if (!play) return play;
  play.selected = null;
  play.selectedUnits = {};
  play.destPicked = null;
  play.battle = null;
  play.landing = null;
  return play;
}

export function isHumanTurn(play) {
  const p = play?.gameState?.currentPlayer;
  return !!(p && !p.isAI);
}

export function isPlaying(play) {
  return play?.gameState?.phase === GAME_PHASES.PLAYING;
}

export function pickedCount(selectedUnits) {
  return Object.values(selectedUnits || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

export function hasGround(selectedUnits, unitDefs = {}) {
  return Object.entries(selectedUnits || {}).some(([type, qty]) => (
    Number(qty) > 0 && unitDefs[type]?.isLand
  ));
}

export function hasAir(selectedUnits, unitDefs = {}) {
  return Object.entries(selectedUnits || {}).some(([type, qty]) => (
    Number(qty) > 0 && unitDefs[type]?.isAir
  ));
}

export function hasSea(selectedUnits, unitDefs = {}) {
  return Object.entries(selectedUnits || {}).some(([type, qty]) => (
    Number(qty) > 0 && unitDefs[type]?.isSea
  ));
}

function defOf(play, type) {
  return play.unitDefs?.[type] || {};
}

function stackQty(stacks, type, owner = null) {
  return (stacks || [])
    .filter((s) => s.type === type && (!owner || s.owner === owner))
    .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
}

function movableStacks(play, name) {
  const player = play.gameState.currentPlayer;
  if (!player || !name) return [];
  return (play.gameState.units[name] || []).filter((u) => (
    u.owner === player.id
    && (Number(u.quantity) || 0) > 0
    && !u.moved
    && u.type !== 'factory'
    && u.type !== 'aaGun'
  ));
}

export function combatOrigins(play) {
  const player = play.gameState.currentPlayer;
  if (!player) return [];
  return Object.keys(play.gameState.units || {}).filter((name) => movableStacks(play, name).length > 0);
}

function isEnemyLand(play, name) {
  const owner = play.gameState.getOwner(name);
  const player = play.gameState.currentPlayer;
  if (!player || !owner) return false;
  return owner !== player.id && !play.gameState.areAllies(player.id, owner);
}

function isFriendlyLand(play, name) {
  const owner = play.gameState.getOwner(name);
  const player = play.gameState.currentPlayer;
  if (!player || !owner) return false;
  return owner === player.id || play.gameState.areAllies(player.id, owner);
}

export function legalDests(play) {
  const from = play.selected;
  const picked = play.selectedUnits;
  if (!from || !pickedCount(picked)) return [];
  const gs = play.gameState;
  const dests = new Set();
  const combat = gs.turnPhase === TURN_PHASES.COMBAT_MOVE;
  const ncm = gs.turnPhase === TURN_PHASES.NON_COMBAT_MOVE;
  if (!combat && !ncm) return [];

  const ground = hasGround(picked, play.unitDefs);
  const air = hasAir(picked, play.unitDefs);
  const sea = hasSea(picked, play.unitDefs);
  const adj = gs.getConnections(from) || [];

  if (combat) {
    for (const to of adj) {
      const t = gs.territoryByName[to];
      if (ground && !t?.isWater && isEnemyLand(play, to)) dests.add(to);
      if (sea && t?.isWater && isEnemyLand(play, to)) dests.add(to);
      if (air && isEnemyLand(play, to)) dests.add(to);
    }
    if (air) {
      let range = 1;
      for (const [type, qty] of Object.entries(picked)) {
        if (Number(qty) > 0 && play.unitDefs[type]?.isAir) {
          range = Math.max(range, Number(play.unitDefs[type].movement) || 1);
        }
      }
      const reach = gs.getReachableTerritoriesForAir(from, range, gs.currentPlayer.id, true);
      for (const name of reach.keys()) {
        if (isEnemyLand(play, name)) dests.add(name);
      }
    }
  }

  if (ncm) {
    for (const to of adj) {
      const t = gs.territoryByName[to];
      if (ground && !t?.isWater && isFriendlyLand(play, to)) dests.add(to);
      if (sea && t?.isWater && isFriendlyLand(play, to)) dests.add(to);
      if (air && isFriendlyLand(play, to)) dests.add(to);
    }
    if (air) {
      let range = 1;
      for (const [type, qty] of Object.entries(picked)) {
        if (Number(qty) > 0 && play.unitDefs[type]?.isAir) {
          range = Math.max(range, Number(play.unitDefs[type].movement) || 1);
        }
      }
      const reach = gs.getReachableTerritoriesForAir(from, range, gs.currentPlayer.id, false);
      for (const name of reach.keys()) {
        if (isFriendlyLand(play, name)) dests.add(name);
      }
    }
  }

  dests.delete(from);
  return [...dests];
}

export function phaseStrip(play) {
  const current = TURN_PHASE_ORDER.indexOf(play.gameState?.turnPhase);
  return {
    steps: TURN_PHASE_ORDER.map((p) => STRIP_SHORT[p] || TURN_PHASE_NAMES[p]),
    current: current >= 0 ? current + 1 : 1,
  };
}

export function ncmAirRemaining(play) {
  const units = (play.gameState?.pendingAirLandings || [])
    .flatMap((entry) => entry.units || [])
    .filter((unit) => !unit.applied);
  return remainingAirLandingsToAssign(units, {});
}

export function canEndPhase(play) {
  if (!isPlaying(play) || !isHumanTurn(play)) return false;
  if (play.landing) return remainingAirCount(play) <= 0;
  if (play.battle) return play.battle.step === BATTLE_STEP.WON && !play.landing;
  const phase = play.gameState.turnPhase;
  if (phase === TURN_PHASES.COMBAT) {
    return (play.gameState.combatQueue || []).length === 0;
  }
  if (phase === TURN_PHASES.NON_COMBAT_MOVE) {
    return ncmAirRemaining(play) <= 0 && !pickedCount(play.selectedUnits);
  }
  if (phase === TURN_PHASES.COMBAT_MOVE) {
    return !play.destPicked;
  }
  return true;
}

function rollDie(play, context) {
  if (typeof play.rng === 'function') return play.rng(context);
  return play.gameState._rollDie(context);
}

function combatUnitsAt(play, name, owner) {
  return (play.gameState.units[name] || []).filter((u) => (
    u.owner === owner
    && (Number(u.quantity) || 0) > 0
    && u.type !== 'factory'
    && u.type !== 'aaGun'
  )).sort((a, b) => COMBAT_ORDER.indexOf(a.type) - COMBAT_ORDER.indexOf(b.type));
}

function removeQty(units, type, owner, qty) {
  let left = qty;
  for (const s of units) {
    if (left <= 0) break;
    if (s.type !== type || (owner && s.owner !== owner)) continue;
    const take = Math.min(Number(s.quantity) || 0, left);
    s.quantity -= take;
    left -= take;
  }
  return units.filter((s) => (Number(s.quantity) || 0) > 0 || s.type === 'factory');
}

function cheapestLosses(stacks, owner, hits, order = COMBAT_ORDER) {
  const taken = {};
  let left = hits;
  for (const type of order) {
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

function assignedCount(taken) {
  return Object.values(taken || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

function lossMenu(stacks, owner, hits) {
  const list = (stacks || []).filter((s) => (
    s.owner === owner && (Number(s.quantity) || 0) > 0 && s.type !== 'factory' && s.type !== 'aaGun'
  ));
  const total = list.reduce((n, s) => n + (Number(s.quantity) || 0), 0);
  const need = Math.min(Math.max(0, Number(hits) || 0), total);
  const types = list.filter((u) => (u.quantity || 0) > 0);
  const forced = need <= 0 || types.length <= 1 || total <= need;
  return {
    need,
    forced,
    units: types.map((u) => ({ type: u.type, quantity: u.quantity })),
  };
}

export function syncPlay(play) {
  const phase = play.gameState.turnPhase;
  const player = play.gameState.currentPlayer?.id || null;
  if (play._phase !== phase || play._player !== player) {
    const keepBattle = play.battle && phase === TURN_PHASES.COMBAT && play._player === player;
    const keepLand = play.landing && play._player === player;
    play._phase = phase;
    play._player = player;
    if (!keepBattle && !keepLand) {
      play.selectedUnits = {};
      play.destPicked = null;
      play.battle = null;
      play.landing = null;
    }
    if (phase === TURN_PHASES.COMBAT && isHumanTurn(play) && !play.battle && !play.landing) {
      enterCombat(play);
    }
  }
  return play;
}

export function resolveNavalQueue(play) {
  const gs = play.gameState;
  gs._detectCombats?.();
  const defs = play.unitDefs;
  let guard = 0;
  while ((gs.combatQueue || []).length && guard++ < 80) {
    const name = gs.combatQueue[0];
    const t = gs.territoryByName[name];
    const units = gs.units[name] || [];
    if (territoryCombatAlreadyResolved(units, gs.currentPlayer?.id, (a, b) => gs.areAllies(a, b))) {
      gs.combatQueue.shift();
      continue;
    }
    if (!t?.isWater) break;
    let safety = 40;
    while (safety-- > 0) {
      const result = gs.resolveCombat(name, defs);
      if (!result || result.resolved) break;
    }
  }
  return play;
}

export function enterCombat(play) {
  const gs = play.gameState;
  resolveNavalQueue(play);
  const playerId = gs.currentPlayer?.id;
  while ((gs.combatQueue || []).length) {
    const name = gs.combatQueue[0];
    const units = gs.units[name] || [];
    if (territoryCombatAlreadyResolved(units, playerId, (a, b) => gs.areAllies(a, b))) {
      gs.combatQueue.shift();
      continue;
    }
    startBattle(play, name);
    return play;
  }
  return play;
}

function startBattle(play, dest) {
  const gs = play.gameState;
  const player = gs.currentPlayer;
  const stacks = gs.units[dest] || [];
  const enemies = getEnemyCombatUnits(stacks, player.id, (a, b) => gs.areAllies(a, b));
  const friends = getFriendlyCombatUnits(stacks, player.id);
  const aaGuns = stackQty(stacks, 'aaGun', enemies[0]?.owner);
  const planes = friends.filter((s) => defOf(play, s.type).isAir)
    .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
  play.selected = dest;
  play.destPicked = dest;
  play.battle = {
    dest,
    step: aaGuns > 0 && planes > 0 ? BATTLE_STEP.AA_READY : BATTLE_STEP.COMBAT_READY,
    round: 0,
    aaGuns,
    aaPlanes: planes,
    aaHits: 0,
    aaDice: [],
    attackDice: [],
    defenseDice: [],
    attackHits: 0,
    defenseHits: 0,
    pendingAtt: {},
    pendingDef: {},
    attForced: false,
    defForced: false,
    failed: false,
    log: [],
  };
  return play;
}

function rollAA(play) {
  const battle = play.battle;
  const dest = battle.dest;
  const player = play.gameState.currentPlayer;
  const dice = [];
  let hits = 0;
  for (let i = 0; i < battle.aaPlanes; i++) {
    const face = rollDie(play, 'aa');
    dice.push(face);
    if (face === 1) hits += 1;
  }
  battle.aaDice = dice;
  battle.aaHits = hits;
  if (hits > 0) {
    const stacks = play.gameState.units[dest] || [];
    const taken = cheapestLosses(stacks, player.id, hits, AIR_ORDER);
    let next = stacks;
    for (const [type, qty] of Object.entries(taken)) {
      next = removeQty(next, type, player.id, qty);
    }
    play.gameState.units[dest] = next;
  }
  play.gameState.recordCombatTelemetry?.({
    kind: 'aa',
    territory: dest,
    hits,
    rolls: dice,
    wiped: countLivingUnits(getFriendlyCombatUnits(play.gameState.units[dest], player.id)) <= 0,
  });
  battle.step = BATTLE_STEP.AA_RESULT;
  battle.log.push(hits ? `AA hit ×${hits}` : 'AA missed');
  play.gameState._notify();
  return play;
}

function failCloseIfWiped(play) {
  const dest = play.battle.dest;
  const player = play.gameState.currentPlayer;
  const friends = getFriendlyCombatUnits(play.gameState.units[dest] || [], player.id);
  if (countLivingUnits(friends) > 0) return false;
  play.battle.step = BATTLE_STEP.WON;
  play.battle.failed = true;
  play.gameState.combatQueue = (play.gameState.combatQueue || []).filter((t) => t !== dest);
  play.battle.log.push('Attack failed');
  play.gameState._notify();
  return true;
}

function rollCombat(play) {
  const battle = play.battle;
  const dest = battle.dest;
  const gs = play.gameState;
  const player = gs.currentPlayer;
  const destStacks = gs.units[dest] || [];
  const attackers = combatUnitsAt(play, dest, player.id);
  const defOwner = destStacks.find((s) => (
    s.owner !== player.id && !gs.areAllies(player.id, s.owner) && s.type !== 'factory'
  ))?.owner;
  const defenders = combatUnitsAt(play, dest, defOwner);
  battle.round += 1;

  const attackDice = [];
  let attackHits = 0;
  for (const unit of attackers) {
    const def = defOf(play, unit.type);
    for (let i = 0; i < (unit.quantity || 0); i++) {
      const face = rollDie(play, 'attack');
      const hit = face <= (def.attack || 0);
      attackDice.push({ type: unit.type, face, hit, side: 'atk' });
      if (hit) attackHits += 1;
    }
  }

  const defenseDice = [];
  let defenseHits = 0;
  for (const unit of defenders) {
    const def = defOf(play, unit.type);
    for (let i = 0; i < (unit.quantity || 0); i++) {
      const face = rollDie(play, 'defense');
      const hit = face <= (def.defense || 0);
      defenseDice.push({ type: unit.type, face, hit, side: 'def' });
      if (hit) defenseHits += 1;
    }
  }

  battle.attackDice = attackDice;
  battle.defenseDice = defenseDice;
  battle.attackHits = attackHits;
  battle.defenseHits = defenseHits;
  const attMenu = lossMenu(destStacks, player.id, defenseHits);
  const defMenu = lossMenu(destStacks, defOwner, attackHits);
  battle.pendingAtt = attMenu.forced ? cheapestLosses(destStacks, player.id, defenseHits) : {};
  battle.pendingDef = cheapestLosses(destStacks, defOwner, attackHits);
  battle.attForced = attMenu.forced;
  battle.defForced = defMenu.forced;
  battle.defOwner = defOwner;
  battle.step = BATTLE_STEP.COMBAT_RESULT;
  battle.log.push(`R${battle.round} ATK ${attackHits} · DEF ${defenseHits}`);
  gs.recordCombatTelemetry?.({
    kind: 'combat',
    territory: dest,
    hits: { attack: attackHits, defense: defenseHits },
    attackRolls: attackDice.map((d) => d.face),
    defenseRolls: defenseDice.map((d) => d.face),
    attackForce: attackers,
    defenseForce: defenders,
  });
  return play;
}

function applyHits(play) {
  const battle = play.battle;
  const dest = battle.dest;
  const gs = play.gameState;
  const player = gs.currentPlayer;
  let stacks = gs.units[dest] || [];
  const attMenu = lossMenu(stacks, player.id, battle.defenseHits);
  const defMenu = lossMenu(stacks, battle.defOwner, battle.attackHits);
  if (assignedCount(battle.pendingAtt) !== attMenu.need) {
    battle.pendingAtt = cheapestLosses(stacks, player.id, battle.defenseHits);
  }
  if (assignedCount(battle.pendingDef) !== defMenu.need) {
    battle.pendingDef = cheapestLosses(stacks, battle.defOwner, battle.attackHits);
  }
  for (const [type, qty] of Object.entries(battle.pendingAtt || {})) {
    stacks = removeQty(stacks, type, player.id, qty);
  }
  for (const [type, qty] of Object.entries(battle.pendingDef || {})) {
    stacks = removeQty(stacks, type, battle.defOwner, qty);
  }
  gs.units[dest] = stacks;
  battle.pendingAtt = {};
  battle.pendingDef = {};
  const friends = getFriendlyCombatUnits(stacks, player.id);
  const enemies = getEnemyCombatUnits(stacks, player.id, (a, b) => gs.areAllies(a, b));
  if (countLivingUnits(enemies) <= 0 && countLivingUnits(friends) > 0) {
    const t = gs.territoryByName[dest];
    const hasLand = friends.some((u) => defOf(play, u.type).isLand);
    if (hasLand && !t?.isWater) {
      const prev = gs.getOwner(dest);
      gs.territoryState[dest].owner = player.id;
      for (const unit of stacks) {
        if (unit.type === 'factory' || unit.type === 'aaGun') unit.owner = player.id;
      }
      gs.handleCapitalCapture?.(dest, player.id, prev);
    }
    gs.combatQueue = (gs.combatQueue || []).filter((n) => n !== dest);
    battle.step = BATTLE_STEP.WON;
    battle.failed = false;
    battle.log.push(`Attacker takes ${dest}`);
    gs._notify();
    return play;
  }
  if (countLivingUnits(friends) <= 0) {
    gs.combatQueue = (gs.combatQueue || []).filter((n) => n !== dest);
    battle.step = BATTLE_STEP.WON;
    battle.failed = true;
    battle.log.push('Attack failed');
    gs._notify();
    return play;
  }
  battle.step = BATTLE_STEP.COMBAT_READY;
  gs._notify();
  return play;
}

function remainingAirCount(play) {
  if (!play.landing) return 0;
  return Object.values(play.landing.airLeft || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

function startAirLand(play) {
  const battle = play.battle;
  const dest = battle?.dest;
  const player = play.gameState.currentPlayer;
  const stacks = play.gameState.units[dest] || [];
  const air = {};
  for (const type of AIR_ORDER) {
    const n = stackQty(stacks, type, player.id);
    if (n > 0) air[type] = n;
  }
  const planes = Object.values(air).reduce((n, q) => n + q, 0);
  play.battle = null;
  if (planes <= 0 || battle?.failed) {
    play.landing = null;
    enterCombat(play);
    return play;
  }
  play.gameState.addPendingAirLandings?.(dest, Object.entries(air).map(([type, quantity]) => ({
    id: type,
    type,
    quantity,
  })));
  const landable = new Set();
  for (const type of Object.keys(air)) {
    for (const opt of play.gameState.getAirLandingOptions(dest, type, play.unitDefs) || []) {
      if (opt.territory && !opt.isCarrier) landable.add(opt.territory);
    }
  }
  if (!landable.size) {
    play.landing = null;
    enterCombat(play);
    return play;
  }
  play.landing = {
    origin: dest,
    dest: null,
    pick: {},
    airLeft: { ...air },
    landable: [...landable],
  };
  play.selected = dest;
  return play;
}

function applyLanding(play) {
  const land = play.landing;
  if (!land?.dest || !pickedCount(land.pick)) return play;
  const plan = [];
  for (const [type, qty] of Object.entries(land.pick)) {
    const n = Math.min(Number(qty) || 0, Number(land.airLeft[type]) || 0);
    if (n <= 0) continue;
    plan.push({ id: `${type}_${plan.length}`, type, quantity: n, destination: land.dest });
  }
  if (!plan.length) return play;
  const landings = Object.fromEntries(plan.map((p) => [p.id, p.destination]));
  const result = play.gameState.applyAirLandings(land.origin, {
    landings,
    airUnitsToLand: plan,
    unitDefs: play.unitDefs,
  });
  if (result?.success === false) return play;
  for (const item of plan) {
    land.airLeft[item.type] = (Number(land.airLeft[item.type]) || 0) - item.quantity;
    if (land.airLeft[item.type] <= 0) delete land.airLeft[item.type];
  }
  land.pick = {};
  if (remainingAirCount(play) <= 0) {
    play.landing = null;
    enterCombat(play);
  }
  return play;
}

function unitsToMoveFromPick(selectedUnits) {
  return Object.entries(selectedUnits || {})
    .filter(([, n]) => Number(n) > 0)
    .map(([type, quantity]) => ({ type, quantity: Number(quantity) }));
}

export function youLossesReady(play) {
  const battle = play.battle;
  if (!battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return false;
  const dest = play.gameState.units[battle.dest] || [];
  const player = play.gameState.currentPlayer;
  const menu = lossMenu(dest, player.id, battle.defenseHits);
  return assignedCount(battle.pendingAtt) === menu.need;
}

export function tapLand(play, name) {
  syncPlay(play);
  if (!name) return play;
  if (!isHumanTurn(play)) {
    play.selected = name;
    return play;
  }
  if (play.landing) {
    if (play.landing.landable.includes(name)) {
      play.selected = name;
      play.landing.dest = name;
    }
    return play;
  }
  if (play.battle) {
    play.selected = play.battle.dest;
    return play;
  }
  const phase = play.gameState.turnPhase;
  if (phase !== TURN_PHASES.COMBAT_MOVE && phase !== TURN_PHASES.NON_COMBAT_MOVE) {
    play.selected = name;
    return play;
  }
  const dests = legalDests(play);
  if (pickedCount(play.selectedUnits) && dests.includes(name)) {
    play.destPicked = name;
    return play;
  }
  if (movableStacks(play, name).length) {
    if (play.selected !== name) {
      play.selectedUnits = {};
      play.destPicked = null;
    }
    play.selected = name;
    return play;
  }
  if (dests.includes(name)) {
    play.destPicked = name;
    return play;
  }
  play.selected = name;
  return play;
}

export function adjustUnit(play, type, delta = 1) {
  syncPlay(play);
  const phase = play.gameState.turnPhase;
  if (phase !== TURN_PHASES.COMBAT_MOVE && phase !== TURN_PHASES.NON_COMBAT_MOVE) return play;
  if (play.landing) return play;
  const have = stackQty(movableStacks(play, play.selected), type);
  if (have <= 0) return play;
  const step = Number(delta);
  if (!Number.isFinite(step) || step === 0) return play;
  const cur = Number(play.selectedUnits[type]) || 0;
  const next = Math.max(0, Math.min(have, cur + step));
  if (next <= 0) delete play.selectedUnits[type];
  else play.selectedUnits[type] = next;
  if (!pickedCount(play.selectedUnits)) play.destPicked = null;
  return play;
}

export function adjustLanding(play, type, delta = 1) {
  if (!play.landing || !defOf(play, type).isAir) return play;
  const have = Number(play.landing.airLeft?.[type]) || 0;
  if (have <= 0) return play;
  const step = Number(delta);
  if (!Number.isFinite(step) || step === 0) return play;
  const cur = Number(play.landing.pick?.[type]) || 0;
  const next = Math.max(0, Math.min(have, cur + step));
  if (next <= 0) delete play.landing.pick[type];
  else play.landing.pick[type] = next;
  return play;
}

export function adjustLoss(play, side, type, delta = 1) {
  const battle = play.battle;
  if (!battle || battle.step !== BATTLE_STEP.COMBAT_RESULT) return play;
  if (side === 'def') return play;
  const dest = play.gameState.units[battle.dest] || [];
  const player = play.gameState.currentPlayer;
  const menu = lossMenu(dest, player.id, battle.defenseHits);
  if (menu.forced || menu.need <= 0) return play;
  const have = stackQty(dest, type, player.id);
  if (have <= 0) return play;
  const step = Number(delta);
  if (!Number.isFinite(step) || step === 0) return play;
  const cur = { ...(battle.pendingAtt || {}) };
  const thisN = Number(cur[type]) || 0;
  if (menu.need === 1) {
    if (step > 0) battle.pendingAtt = { [type]: 1 };
    else if (thisN > 0) battle.pendingAtt = {};
    return play;
  }
  const used = assignedCount(cur);
  if (step > 0 && thisN < have && used < menu.need) cur[type] = thisN + 1;
  else if (step < 0 && thisN > 0) {
    cur[type] = thisN - 1;
    if (cur[type] <= 0) delete cur[type];
  }
  battle.pendingAtt = cur;
  return play;
}

export function confirmEnabled(play) {
  syncPlay(play);
  if (!isPlaying(play) || !isHumanTurn(play)) return false;
  if (play.landing) {
    return !!play.landing.dest && pickedCount(play.landing.pick) > 0;
  }
  if (play.battle) {
    if (play.battle.step === BATTLE_STEP.COMBAT_RESULT) return youLossesReady(play);
    return true;
  }
  const phase = play.gameState.turnPhase;
  if (phase === TURN_PHASES.COMBAT_MOVE || phase === TURN_PHASES.NON_COMBAT_MOVE) {
    if (play.destPicked && pickedCount(play.selectedUnits)) return true;
    return canEndPhase(play);
  }
  return canEndPhase(play);
}

export function confirmGold(play) {
  return confirmEnabled(play);
}

export function confirmLabel(play) {
  syncPlay(play);
  if (!isHumanTurn(play)) {
    return play.aiStatus || `${play.gameState.currentPlayer?.name || 'AI'} thinking…`;
  }
  if (play.landing) {
    if (!play.landing.dest) return 'Pick a teal land';
    if (!pickedCount(play.landing.pick)) return 'Select planes';
    return `Confirm: Land in ${play.landing.dest}`;
  }
  if (play.battle) {
    const step = play.battle.step;
    if (step === BATTLE_STEP.AA_READY) return 'Confirm: Fire AA';
    if (step === BATTLE_STEP.AA_RESULT) return 'Confirm: Continue';
    if (step === BATTLE_STEP.COMBAT_READY) return 'Confirm: Roll combat';
    if (step === BATTLE_STEP.COMBAT_RESULT) {
      return youLossesReady(play) ? 'Confirm: Take hits' : 'Assign casualties';
    }
    if (step === BATTLE_STEP.WON) {
      return play.battle.failed ? 'Confirm: Next' : `Confirm: Take ${play.battle.dest}`;
    }
  }
  const phase = play.gameState.turnPhase;
  if ((phase === TURN_PHASES.COMBAT_MOVE || phase === TURN_PHASES.NON_COMBAT_MOVE)
    && play.destPicked && pickedCount(play.selectedUnits)) {
    return phase === TURN_PHASES.COMBAT_MOVE
      ? `Confirm: Attack ${play.destPicked}`
      : `Confirm: Move to ${play.destPicked}`;
  }
  if (canEndPhase(play)) return `End Phase · ${TURN_PHASE_NAMES[phase] || phase}`;
  if (phase === TURN_PHASES.COMBAT_MOVE) return pickedCount(play.selectedUnits) ? 'Pick target' : 'Select units';
  if (phase === TURN_PHASES.NON_COMBAT_MOVE) {
    if (ncmAirRemaining(play) > 0) return `Land ${ncmAirRemaining(play)} aircraft`;
    return 'Select units';
  }
  return TURN_PHASE_NAMES[phase] || 'Confirm';
}

export function confirm(play) {
  syncPlay(play);
  if (!confirmEnabled(play)) return play;
  if (play.landing) return applyLanding(play);
  if (play.battle) {
    const step = play.battle.step;
    if (step === BATTLE_STEP.AA_READY) return rollAA(play);
    if (step === BATTLE_STEP.AA_RESULT) {
      if (failCloseIfWiped(play)) return play;
      play.battle.step = BATTLE_STEP.COMBAT_READY;
      return play;
    }
    if (step === BATTLE_STEP.COMBAT_READY) return rollCombat(play);
    if (step === BATTLE_STEP.COMBAT_RESULT) return applyHits(play);
    if (step === BATTLE_STEP.WON) return startAirLand(play);
  }
  const phase = play.gameState.turnPhase;
  if ((phase === TURN_PHASES.COMBAT_MOVE || phase === TURN_PHASES.NON_COMBAT_MOVE)
    && play.destPicked && pickedCount(play.selectedUnits)) {
    const from = combatOrigins(play).includes(play.selected)
      ? play.selected
      : combatOrigins(play)[0];
    const result = play.gameState.moveUnits(
      from,
      play.destPicked,
      unitsToMoveFromPick(play.selectedUnits),
      play.unitDefs,
    );
    if (result?.success !== false) {
      play.selectedUnits = {};
      play.destPicked = null;
    }
    return play;
  }
  if (canEndPhase(play)) {
    play.gameState.nextPhase();
    resetUi(play);
    syncPlay(play);
  }
  return play;
}

export function highlights(play) {
  syncPlay(play);
  const out = {
    origin: null,
    dest: null,
    legal: [],
    landable: [],
    selected: play.selected || null,
    pulse: [],
    teal: LAND_TEAL,
  };
  if (play.landing) {
    out.dest = play.landing.origin;
    out.landable = [...play.landing.landable];
    if (play.landing.dest) out.selected = play.landing.dest;
    return out;
  }
  if (play.battle) {
    out.dest = play.battle.dest;
    out.selected = play.battle.dest;
    return out;
  }
  const phase = play.gameState.turnPhase;
  if (phase === TURN_PHASES.COMBAT_MOVE || phase === TURN_PHASES.NON_COMBAT_MOVE) {
    const origins = combatOrigins(play);
    if (play.selected && origins.includes(play.selected)) out.origin = play.selected;
    if (!play.selected || !origins.includes(play.selected)) out.pulse.push(...origins);
    if (pickedCount(play.selectedUnits)) {
      out.legal = legalDests(play);
      if (!play.destPicked) out.pulse.push(...out.legal);
    }
    if (play.destPicked) out.dest = play.destPicked;
  }
  return out;
}

export function battleCard(play) {
  const battle = play.battle;
  if (!battle) return null;
  const dest = battle.dest;
  if (battle.step === BATTLE_STEP.AA_READY) {
    return {
      kicker: 'AA fire',
      title: dest,
      body: `${battle.aaGuns} gun vs ${battle.aaPlanes} aircraft · hit on 1`,
      dice: [],
    };
  }
  if (battle.step === BATTLE_STEP.AA_RESULT) {
    return {
      kicker: 'AA results',
      title: battle.aaHits ? `Hit ×${battle.aaHits}` : 'Missed',
      body: battle.aaHits ? 'Cheapest aircraft removed' : 'Aircraft safe · next is combat',
      dice: battle.aaDice.map((face) => ({ face, hit: face === 1 })),
    };
  }
  if (battle.step === BATTLE_STEP.COMBAT_READY) {
    return {
      kicker: battle.round ? `Round ${battle.round + 1}` : 'Combat',
      title: dest,
      body: `${play.gameState.currentPlayer?.name || 'You'} attack`,
      dice: [],
    };
  }
  if (battle.step === BATTLE_STEP.COMBAT_RESULT) {
    const stacks = play.gameState.units[dest] || [];
    const player = play.gameState.currentPlayer;
    const attMenu = lossMenu(stacks, player.id, battle.defenseHits);
    const defMenu = lossMenu(stacks, battle.defOwner, battle.attackHits);
    return {
      kicker: `Round ${battle.round} · ${dest}`,
      title: `You ${battle.attackHits} hits · they ${battle.defenseHits} hit${battle.defenseHits === 1 ? '' : 's'}`,
      body: `You take ${attMenu.need} · they take ${defMenu.need}`,
      split: true,
      lanes: [
        { side: 'atk', label: 'You attack', hits: battle.attackHits, dice: battle.attackDice },
        { side: 'def', label: 'They defend', hits: battle.defenseHits, dice: battle.defenseDice },
      ],
      pickers: [
        attMenu.need > 0 && !attMenu.forced ? {
          side: 'att',
          label: `You take ${attMenu.need}`,
          need: attMenu.need,
          taken: { ...(battle.pendingAtt || {}) },
          units: attMenu.units,
        } : null,
        defMenu.need > 0 ? {
          side: 'def',
          readOnly: true,
          label: `They take ${defMenu.need}`,
          need: defMenu.need,
          taken: { ...(battle.pendingDef || {}) },
          units: defMenu.units,
        } : null,
      ].filter(Boolean),
    };
  }
  if (battle.step === BATTLE_STEP.WON) {
    return {
      kicker: battle.failed ? 'Held' : 'Taken',
      title: battle.failed ? 'Defender holds' : dest,
      body: battle.failed ? 'No landing' : 'Land aircraft next',
      dice: [],
    };
  }
  return null;
}

export function chromeModel(play, territories = []) {
  syncPlay(play);
  const marks = highlights(play);
  const strip = phaseStrip(play);
  const landName = play.landing?.dest
    || (play.landing ? null : (play.selected || marks.dest || marks.origin));
  const land = territories.find?.((t) => t.name === landName) || (landName ? { name: landName } : null);
  const phase = play.gameState.turnPhase;
  const movePhase = phase === TURN_PHASES.COMBAT_MOVE || phase === TURN_PHASES.NON_COMBAT_MOVE;
  const origin = play.selected;
  const showSteppers = movePhase && origin && movableStacks(play, origin).length
    && (play.selected === origin || pickedCount(play.selectedUnits) || play.destPicked);
  const steppers = showSteppers
    ? movableStacks(play, origin).map((s) => ({
      type: s.type,
      have: s.quantity,
      picked: Number(play.selectedUnits?.[s.type]) || 0,
      owner: s.owner,
    }))
    : null;
  const planeSteppers = play.landing
    ? Object.entries(play.landing.airLeft || {})
      .filter(([, n]) => Number(n) > 0)
      .map(([type, have]) => ({
        type,
        have: Number(have) || 0,
        picked: Number(play.landing.pick?.[type]) || 0,
        owner: play.gameState.currentPlayer?.id,
      }))
    : null;
  let route = '';
  if (movePhase && play.destPicked) route = `${origin} → ${play.destPicked}`;
  else if (play.landing) route = play.landing.dest ? `Confirm land · ${play.landing.dest}` : 'Pick a teal land';
  return {
    land: play.landing ? (land || { name: 'Land aircraft' }) : land,
    stacks: play.landing ? [] : (landName ? (play.gameState.units[landName] || []) : []),
    steppers: play.landing ? planeSteppers : steppers,
    airLand: !!play.landing,
    label: confirmLabel(play),
    gold: confirmGold(play),
    enabled: confirmEnabled(play),
    battle: battleCard(play),
    route,
    phaseStrip: strip.steps,
    phaseStripCurrent: strip.current,
    highlights: marks,
  };
}

export function inspectPlay(play) {
  syncPlay(play);
  const gs = play.gameState;
  return {
    turnPhase: gs.turnPhase,
    turnPhaseName: TURN_PHASE_NAMES[gs.turnPhase] || gs.turnPhase,
    currentPlayer: gs.currentPlayer?.id || null,
    isAI: !!gs.currentPlayer?.isAI,
    selected: play.selected,
    dest: play.destPicked,
    selectedUnits: { ...(play.selectedUnits || {}) },
    legalDests: legalDests(play),
    confirmLabel: confirmLabel(play),
    confirmEnabled: confirmEnabled(play),
    canEndPhase: canEndPhase(play),
    battleStep: play.battle?.step || null,
    battleDest: play.battle?.dest || null,
    landingDest: play.landing?.dest || null,
    airLeft: { ...(play.landing?.airLeft || {}) },
    queue: [...(gs.combatQueue || [])],
    ncmAirRemaining: ncmAirRemaining(play),
  };
}
