// Solo vs-AI combat bridge. Preview only.
// GameState rolls + applyCasualtiesManual. Three .11 battle sheet IA.
// Do not mount #combatPopup. Copy AA-wipe fail-close (main V2.81.54).

export const BATTLE_STEP = {
  AA_READY: 'aaReady',
  AA_RESULT: 'aaResult',
  COMBAT_READY: 'combatReady',
  COMBAT_RESULT: 'combatResult',
  WON: 'won',
};

const COMBAT_ORDER = [
  'infantry', 'artillery', 'armour', 'fighter', 'tacticalBomber', 'bomber',
  'transport', 'submarine', 'destroyer', 'cruiser', 'battleship', 'carrier',
];

const LOSS_SHORT = {
  infantry: 'INF',
  artillery: 'ART',
  armour: 'TNK',
  fighter: 'FTR',
  bomber: 'BMB',
  tacticalBomber: 'TAC',
};

function assignedCount(taken) {
  return Object.values(taken || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

function formatLoss(taken) {
  const parts = Object.entries(taken || {})
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${LOSS_SHORT[type] || String(type).slice(0, 3).toUpperCase()}×${n}`);
  return parts.join(' ') || 'none';
}

function qtyOf(units, type) {
  return (units || [])
    .filter((u) => u.type === type)
    .reduce((n, u) => n + (Number(u.quantity) || 0), 0);
}

function livingQty(units) {
  return (units || []).reduce((n, u) => n + (Number(u.quantity) || 0), 0);
}

function isCombatUnit(unit, unitDefs) {
  if (!unit || (Number(unit.quantity) || 0) <= 0) return false;
  if (unit.type === 'factory') return false;
  const def = unitDefs?.[unit.type];
  if (def && def.defense === 0 && def.attack === 0) return false;
  return true;
}

export function enemyCombatUnits(units, playerId, gameState, unitDefs) {
  return (units || []).filter((u) => (
    isCombatUnit(u, unitDefs)
    && u.owner !== playerId
    && !gameState.areAllies?.(playerId, u.owner)
  ));
}

export function friendlyCombatUnits(units, playerId, unitDefs) {
  return (units || []).filter((u) => u.owner === playerId && isCombatUnit(u, unitDefs));
}

export function territoryCombatAlreadyResolved(units, playerId, gameState, unitDefs) {
  return enemyCombatUnits(units, playerId, gameState, unitDefs).length === 0
    || friendlyCombatUnits(units, playerId, unitDefs).length === 0;
}

function combatStacks(units, ownerId) {
  const byType = new Map();
  for (const u of units || []) {
    if (u.owner !== ownerId || u.type === 'factory') continue;
    const n = Number(u.quantity) || 0;
    if (n <= 0) continue;
    byType.set(u.type, (byType.get(u.type) || 0) + n);
  }
  return [...byType.entries()].map(([type, quantity]) => ({ type, quantity, owner: ownerId }));
}

function cheapestLosses(stacks, hits) {
  const taken = {};
  let left = Math.max(0, Number(hits) || 0);
  for (const type of COMBAT_ORDER) {
    if (left <= 0) break;
    const have = qtyOf(stacks, type);
    const n = Math.min(have, left);
    if (n > 0) {
      taken[type] = n;
      left -= n;
    }
  }
  return taken;
}

function cheapestAircraft(stacks, hits) {
  const airOrder = ['fighter', 'tacticalBomber', 'bomber'];
  const taken = {};
  let left = Math.max(0, Number(hits) || 0);
  for (const type of airOrder) {
    if (left <= 0) break;
    const have = qtyOf(stacks, type);
    const n = Math.min(have, left);
    if (n > 0) {
      taken[type] = n;
      left -= n;
    }
  }
  return taken;
}

function lossMenu(stacks, hits) {
  const units = (stacks || []).filter((u) => (u.quantity || 0) > 0);
  const total = livingQty(units);
  const need = Math.min(Math.max(0, Number(hits) || 0), total);
  return {
    need,
    forced: need <= 0 || units.length <= 1 || total <= need,
    units: units.map((u) => ({ type: u.type, quantity: u.quantity })),
  };
}

function casualtyList(taken) {
  const list = [];
  for (const [type, n] of Object.entries(taken || {})) {
    for (let i = 0; i < (Number(n) || 0); i++) list.push({ type });
  }
  return list;
}

function rollDie(gameState, context) {
  if (typeof gameState._rollDie === 'function') return gameState._rollDie(context);
  return Math.floor(Math.random() * 6) + 1;
}

export function createCombatSession(territory) {
  return {
    territory,
    step: BATTLE_STEP.COMBAT_READY,
    round: 0,
    aaGuns: 0,
    aaPlanes: 0,
    aaHits: 0,
    aaDice: [],
    attackDice: [],
    defenseDice: [],
    attackHits: 0,
    defenseHits: 0,
    pendingYou: {},
    pendingThey: {},
    failed: false,
  };
}

export function syncCombatStep(session, gameState, unitDefs) {
  const playerId = gameState.currentPlayer?.id;
  const units = gameState.getUnitsAt(session.territory);
  const attackers = friendlyCombatUnits(units, playerId, unitDefs);
  const defenders = enemyCombatUnits(units, playerId, gameState, unitDefs);
  const aaGuns = (units || []).filter((u) => u.type === 'aaGun' && u.owner !== playerId);
  const attackingAir = attackers.filter((u) => unitDefs[u.type]?.isAir);
  session.aaGuns = livingQty(aaGuns);
  session.aaPlanes = livingQty(attackingAir);
  if (territoryCombatAlreadyResolved(units, playerId, gameState, unitDefs)) {
    session.step = BATTLE_STEP.WON;
    session.failed = attackers.length === 0;
    return session;
  }
  if (session.aaGuns > 0 && session.aaPlanes > 0 && !session.aaFired) {
    session.step = BATTLE_STEP.AA_READY;
  } else if (!session.round && session.step !== BATTLE_STEP.COMBAT_RESULT) {
    session.step = BATTLE_STEP.COMBAT_READY;
  }
  return session;
}

function applyTaken(gameState, territory, taken, isAttacker, unitDefs) {
  const list = casualtyList(taken);
  if (!list.length) return;
  gameState.applyCasualtiesManual(territory, list, isAttacker, unitDefs);
}

function finishIfOver(session, gameState, unitDefs) {
  const playerId = gameState.currentPlayer?.id;
  const units = gameState.getUnitsAt(session.territory);
  if (!territoryCombatAlreadyResolved(units, playerId, gameState, unitDefs)) return false;
  const result = gameState.resolveCombat(session.territory, unitDefs);
  session.step = BATTLE_STEP.WON;
  session.failed = result?.winner === 'defender' || friendlyCombatUnits(
    gameState.getUnitsAt(session.territory),
    playerId,
    unitDefs,
  ).length === 0;
  return true;
}

export function dequeueResolvedHeads(gameState, unitDefs) {
  const skipped = [];
  const playerId = gameState.currentPlayer?.id;
  while (gameState.combatQueue?.length > 0) {
    const name = gameState.combatQueue[0];
    const units = gameState.getUnitsAt(name);
    if (!territoryCombatAlreadyResolved(units, playerId, gameState, unitDefs)) break;
    gameState.resolveCombat(name, unitDefs);
    skipped.push(name);
  }
  return skipped;
}

export function confirmCombat(session, gameState, unitDefs) {
  if (!session) return session;
  const playerId = gameState.currentPlayer?.id;
  const step = session.step;

  if (step === BATTLE_STEP.AA_READY) {
    const dice = [];
    let hits = 0;
    for (let i = 0; i < session.aaPlanes; i++) {
      const face = rollDie(gameState, 'aa');
      const hit = face === 1;
      dice.push({ face, hit });
      if (hit) hits += 1;
    }
    session.aaDice = dice;
    session.aaHits = hits;
    session.aaFired = true;
    if (hits > 0) {
      const you = combatStacks(gameState.getUnitsAt(session.territory), playerId)
        .filter((s) => unitDefs[s.type]?.isAir);
      applyTaken(gameState, session.territory, cheapestAircraft(you, hits), true, unitDefs);
    }
    session.step = BATTLE_STEP.AA_RESULT;
    if (finishIfOver(session, gameState, unitDefs)) return session;
    return session;
  }

  if (step === BATTLE_STEP.AA_RESULT) {
    if (finishIfOver(session, gameState, unitDefs)) return session;
    session.step = BATTLE_STEP.COMBAT_READY;
    return session;
  }

  if (step === BATTLE_STEP.COMBAT_READY) {
    const units = gameState.getUnitsAt(session.territory);
    const attackers = friendlyCombatUnits(units, playerId, unitDefs);
    const defenders = enemyCombatUnits(units, playerId, gameState, unitDefs);
    const atk = gameState._rollCombatWithRolls(attackers, 'attack', unitDefs);
    const def = gameState._rollCombatWithRolls(defenders, 'defense', unitDefs);
    session.round += 1;
    session.attackDice = (atk.rolls || []).map((r) => ({
      type: r.unit, face: r.roll, hit: r.hit, side: 'atk',
    }));
    session.defenseDice = (def.rolls || []).map((r) => ({
      type: r.unit, face: r.roll, hit: r.hit, side: 'def',
    }));
    session.attackHits = atk.hits;
    session.defenseHits = def.hits;
    const youStacks = combatStacks(units, playerId);
    const theyOwner = defenders[0]?.owner;
    const theyStacks = combatStacks(units, theyOwner);
    const youMenu = lossMenu(youStacks, session.defenseHits);
    session.pendingYou = youMenu.forced ? cheapestLosses(youStacks, youMenu.need) : {};
    session.pendingThey = cheapestLosses(theyStacks, session.attackHits);
    session.step = BATTLE_STEP.COMBAT_RESULT;
    return session;
  }

  if (step === BATTLE_STEP.COMBAT_RESULT) {
    if (!youLossesReady(session, gameState)) return session;
    const units = gameState.getUnitsAt(session.territory);
    const playerId2 = gameState.currentPlayer?.id;
    const youStacks = combatStacks(units, playerId2);
    const theyOwner = enemyCombatUnits(units, playerId2, gameState, unitDefs)[0]?.owner;
    const theyStacks = combatStacks(units, theyOwner);
    const youMenu = lossMenu(youStacks, session.defenseHits);
    if (assignedCount(session.pendingYou) !== youMenu.need) {
      session.pendingYou = cheapestLosses(youStacks, youMenu.need);
    }
    session.pendingThey = cheapestLosses(theyStacks, session.attackHits);
    applyTaken(gameState, session.territory, session.pendingYou, true, unitDefs);
    applyTaken(gameState, session.territory, session.pendingThey, false, unitDefs);
    session.pendingYou = {};
    session.pendingThey = {};
    if (finishIfOver(session, gameState, unitDefs)) return session;
    session.step = BATTLE_STEP.COMBAT_READY;
    return session;
  }

  return session;
}

export function youLossesReady(session, gameState) {
  if (!session || session.step !== BATTLE_STEP.COMBAT_RESULT) return false;
  const playerId = gameState.currentPlayer?.id;
  const youStacks = combatStacks(gameState.getUnitsAt(session.territory), playerId);
  const menu = lossMenu(youStacks, session.defenseHits);
  return assignedCount(session.pendingYou) === menu.need;
}

export function adjustYouLoss(session, gameState, type, delta = 1) {
  if (!session || session.step !== BATTLE_STEP.COMBAT_RESULT) return session;
  const playerId = gameState.currentPlayer?.id;
  const youStacks = combatStacks(gameState.getUnitsAt(session.territory), playerId);
  const menu = lossMenu(youStacks, session.defenseHits);
  if (menu.forced || menu.need <= 0) return session;
  const have = qtyOf(youStacks, type);
  if (have <= 0) return session;
  const step = Number(delta);
  if (!Number.isFinite(step) || step === 0) return session;
  const cur = { ...(session.pendingYou || {}) };
  const thisN = Number(cur[type]) || 0;
  if (menu.need === 1) {
    if (step > 0) session.pendingYou = { [type]: 1 };
    else if (thisN > 0) session.pendingYou = {};
    return session;
  }
  const used = assignedCount(cur);
  if (step > 0 && thisN < have && used < menu.need) cur[type] = thisN + 1;
  else if (step < 0 && thisN > 0) {
    cur[type] = thisN - 1;
    if (cur[type] <= 0) delete cur[type];
  }
  session.pendingYou = cur;
  return session;
}

export function airLeftAt(gameState, territory, playerId, unitDefs) {
  const out = {};
  for (const u of gameState.getUnitsAt(territory) || []) {
    if (u.owner !== playerId || !unitDefs[u.type]?.isAir) continue;
    out[u.type] = (out[u.type] || 0) + (Number(u.quantity) || 0);
  }
  return out;
}

export function landableNames(gameState, territory, airLeft, unitDefs) {
  const names = new Set();
  for (const type of Object.keys(airLeft || {})) {
    if ((Number(airLeft[type]) || 0) <= 0) continue;
    for (const opt of gameState.getAirLandingOptions(territory, type, unitDefs) || []) {
      if (opt?.territory) names.add(opt.territory);
    }
  }
  return [...names];
}

export function battleCard(session, gameState, unitDefs) {
  if (!session) return null;
  const dest = session.territory;
  const player = gameState.currentPlayer;
  const playerId = player?.id;
  const units = gameState.getUnitsAt(dest);
  const they = enemyCombatUnits(units, playerId, gameState, unitDefs)[0]?.owner;
  const step = session.step;

  if (step === BATTLE_STEP.AA_READY) {
    return {
      kicker: 'AA fire',
      title: dest,
      body: `${session.aaGuns} gun vs ${session.aaPlanes} aircraft · hit on 1`,
      dice: [],
    };
  }
  if (step === BATTLE_STEP.AA_RESULT) {
    return {
      kicker: 'AA results',
      title: session.aaHits ? `Hit ×${session.aaHits}` : 'Missed',
      body: session.aaHits ? 'Cheapest aircraft removed' : 'Aircraft safe · next is combat',
      dice: session.aaDice,
    };
  }
  if (step === BATTLE_STEP.COMBAT_READY) {
    return {
      kicker: session.round ? `Round ${session.round + 1}` : 'Combat',
      title: dest,
      body: `${player?.name || 'You'} attack · defend`,
      dice: [],
    };
  }
  if (step === BATTLE_STEP.COMBAT_RESULT) {
    const youStacks = combatStacks(units, playerId);
    const theyStacks = combatStacks(units, they);
    const youMenu = lossMenu(youStacks, session.defenseHits);
    const theyMenu = lossMenu(theyStacks, session.attackHits);
    return {
      kicker: `Round ${session.round} · ${dest}`,
      title: `You ${session.attackHits} hits · they ${session.defenseHits} hit${session.defenseHits === 1 ? '' : 's'}`,
      body: `You take ${youMenu.need} DEF hit${youMenu.need === 1 ? '' : 's'} · they take ${theyMenu.need} ATK hit${theyMenu.need === 1 ? '' : 's'}`,
      split: true,
      lanes: [
        { side: 'atk', label: 'You attack', hits: session.attackHits, dice: session.attackDice },
        { side: 'def', label: 'They defend', hits: session.defenseHits, dice: session.defenseDice },
      ],
      dice: [...session.attackDice, ...session.defenseDice],
      pickers: [
        youMenu.need > 0 && !youMenu.forced ? {
          side: 'att',
          label: `You take ${youMenu.need} · their DEF hits`,
          need: youMenu.need,
          taken: { ...(session.pendingYou || {}) },
          units: youMenu.units,
        } : null,
        theyMenu.need > 0 ? {
          side: 'def',
          readOnly: true,
          label: `They take ${theyMenu.need} · ${formatLoss(session.pendingThey)} · your ATK`,
          need: theyMenu.need,
          taken: { ...(session.pendingThey || {}) },
          units: theyMenu.units,
        } : null,
      ].filter(Boolean),
    };
  }
  if (step === BATTLE_STEP.WON) {
    return {
      kicker: session.failed ? 'Held' : 'Taken',
      title: session.failed ? 'Defender holds' : dest,
      body: session.failed ? 'Attack failed' : 'Land aircraft next if any remain',
      dice: [],
    };
  }
  return null;
}

export function combatConfirmEnabled(session, gameState) {
  if (!session) return false;
  if (session.step === BATTLE_STEP.COMBAT_RESULT) return youLossesReady(session, gameState);
  return true;
}

export function combatConfirmLabel(session, gameState) {
  if (!session) return 'Battle';
  const step = session.step;
  if (step === BATTLE_STEP.AA_READY) return 'Confirm: Fire AA';
  if (step === BATTLE_STEP.AA_RESULT) return 'Confirm: Continue';
  if (step === BATTLE_STEP.COMBAT_READY) return 'Confirm: Roll combat';
  if (step === BATTLE_STEP.COMBAT_RESULT) {
    return youLossesReady(session, gameState) ? 'Confirm: Take hits' : 'Assign casualties';
  }
  if (step === BATTLE_STEP.WON) {
    return session.failed ? 'Confirm: Next' : `Confirm: Take ${session.territory}`;
  }
  return 'Battle';
}
