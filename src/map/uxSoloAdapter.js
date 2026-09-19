// Solo vs-AI phase adapter. Preview only.
// Main GameState + AI behind Three .11 tiles / casualty / split air land.

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_NAMES } from '../state/gameState.js';
import {
  BATTLE_STEP,
  airLeftAt,
  battleCard,
  combatConfirmEnabled,
  combatConfirmLabel,
  confirmCombat,
  createCombatSession,
  dequeueResolvedHeads,
  landableNames,
  adjustYouLoss,
  syncCombatStep,
} from './uxSoloCombat.js';

const BUY_TYPES = [
  'infantry', 'artillery', 'armour', 'fighter', 'bomber', 'tacticalBomber',
  'aaGun', 'factory', 'transport', 'submarine', 'destroyer', 'cruiser',
  'battleship', 'carrier',
];

const MOVE_SKIP = new Set(['factory', 'aaGun']);

function pickedCount(picked) {
  return Object.values(picked || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

function stacksFor(gameState, name, owner = null) {
  return (gameState.getUnitsAt(name) || [])
    .filter((s) => (Number(s.quantity) || 0) > 0 && (!owner || s.owner === owner))
    .map((s) => ({ ...s }));
}

function factoryNames(gameState, playerId) {
  const out = [];
  for (const [name, state] of Object.entries(gameState.territoryState || {})) {
    if (state.owner !== playerId) continue;
    if ((gameState.units[name] || []).some((u) => u.type === 'factory' && u.owner === playerId)) {
      out.push(name);
    }
  }
  return out;
}

function navalPlaceNames(gameState, playerId) {
  const set = gameState._getValidNavalPlacementZones?.(playerId);
  return set ? [...set] : [];
}

function estimateIncome(gameState, playerId) {
  if (!gameState.canCollectIncome?.(playerId)) return 0;
  let income = 0;
  const capitalTerritory = gameState.playerState[playerId]?.capitalTerritory;
  for (const [territory, state] of Object.entries(gameState.territoryState || {})) {
    if (state.owner !== playerId) continue;
    if (territory === capitalTerritory) income += 10;
    else {
      const t = gameState.territoryByName[territory];
      if (t?.production) income += t.production;
    }
  }
  for (const continent of gameState.continents || []) {
    if (gameState.controlsContinent?.(playerId, continent.name)) income += continent.bonus || 0;
  }
  return income;
}

function legalMoveDests(gameState, from) {
  const player = gameState.currentPlayer;
  if (!player || !from) return [];
  const names = gameState.getConnections?.(from) || [];
  const ncm = gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE;
  return names.filter((name) => {
    const owner = gameState.getOwner(name);
    const enemy = owner && owner !== player.id && !gameState.areAllies(player.id, owner);
    if (ncm && enemy) return false;
    return true;
  });
}

function phaseWord(gameState, ui) {
  if (gameState.gameOver) return 'VICTORY';
  if (!ui.started) return 'SOLO';
  if (ui.mode === 'collect' || ui.holdCollect) return 'COLLECT';
  if (ui.mode === 'airLand') return 'AIR LAND';
  if (ui.combat) return 'BATTLE';
  if (!isHumanTurn(gameState, ui.seatId)) return 'AI';
  if (gameState.phase !== GAME_PHASES.PLAYING) return String(gameState.phase || '').toUpperCase();
  const map = {
    [TURN_PHASES.DEVELOP_TECH]: 'TECH',
    [TURN_PHASES.PURCHASE]: 'PURCHASE',
    [TURN_PHASES.COMBAT_MOVE]: 'COMBAT MOVE',
    [TURN_PHASES.COMBAT]: 'BATTLE',
    [TURN_PHASES.NON_COMBAT_MOVE]: 'NCM',
    [TURN_PHASES.MOBILIZE]: 'PLACE',
    [TURN_PHASES.COLLECT_INCOME]: 'COLLECT',
  };
  return map[gameState.turnPhase] || TURN_PHASE_NAMES[gameState.turnPhase] || 'PLAY';
}

export function isHumanTurn(gameState, seatId) {
  const p = gameState.currentPlayer;
  return !!p && p.id === seatId && !p.isAI;
}

export function createSoloSession({ gameState, unitDefs, seatId, hasSave = false }) {
  const ui = {
    started: false,
    hasSave: !!hasSave,
    seatId,
    selected: null,
    picked: {},
    dest: null,
    landingDest: null,
    landingPick: {},
    airLeft: {},
    combat: null,
    mode: 'splash',
    notice: '',
  };

  function human() {
    return isHumanTurn(gameState, seatId);
  }

  function resetPicks() {
    ui.picked = {};
    ui.dest = null;
    ui.landingDest = null;
    ui.landingPick = {};
    ui.originName = null;
  }

  function syncMode() {
    if (!ui.started) {
      ui.mode = 'splash';
      return;
    }
    if (gameState.gameOver) {
      ui.mode = 'over';
      return;
    }
    if (!human()) {
      ui.mode = 'ai';
      ui.combat = null;
      return;
    }
    if (ui.mode === 'airLand' && pickedCount(ui.airLeft) > 0) return;
    if (ui.holdCollect && human() && !gameState.gameOver) {
      ui.mode = 'collect';
      return;
    }
    const phase = gameState.turnPhase;
    if (phase === TURN_PHASES.COMBAT) {
      if (ui.combat) {
        ui.mode = 'combat';
        return;
      }
      dequeueResolvedHeads(gameState, unitDefs);
      if (gameState.combatQueue?.length) {
        const name = gameState.combatQueue[0];
        if (!ui.combat || ui.combat.territory !== name) {
          ui.combat = createCombatSession(name);
          syncCombatStep(ui.combat, gameState, unitDefs);
        }
        ui.mode = 'combat';
        ui.selected = name;
        return;
      }
      ui.combat = null;
      ui.mode = 'combatIdle';
      return;
    }
    ui.combat = null;
    if (phase === TURN_PHASES.DEVELOP_TECH) ui.mode = 'tech';
    else if (phase === TURN_PHASES.PURCHASE) ui.mode = 'purchase';
    else if (phase === TURN_PHASES.COMBAT_MOVE) ui.mode = 'combatMove';
    else if (phase === TURN_PHASES.NON_COMBAT_MOVE) ui.mode = 'ncm';
    else if (phase === TURN_PHASES.MOBILIZE) ui.mode = 'place';
    else if (phase === TURN_PHASES.COLLECT_INCOME) ui.mode = 'collect';
    else ui.mode = 'play';
  }

  function beginAirLand(territory) {
    const left = airLeftAt(gameState, territory, seatId, unitDefs);
    if (pickedCount(left) <= 0) {
      ui.mode = 'combat';
      ui.airLeft = {};
      return false;
    }
    ui.mode = 'airLand';
    ui.combat = null;
    ui.airLeft = left;
    ui.landingPick = {};
    ui.landingDest = null;
    ui.selected = territory;
    ui.airOrigin = territory;
    return true;
  }

  function start() {
    ui.started = true;
    ui.notice = '';
    resetPicks();
    syncMode();
  }

  function tap(name) {
    if (!name || !ui.started || gameState.gameOver) return;
    if (!human() && ui.mode !== 'ai') return;
    if (ui.mode === 'combat') {
      ui.selected = ui.combat?.territory || name;
      return;
    }
    if (ui.mode === 'airLand') {
      const legal = landableNames(gameState, ui.airOrigin, ui.airLeft, unitDefs);
      if (legal.includes(name)) {
        ui.landingDest = name;
        ui.selected = name;
      }
      return;
    }
    if (ui.mode === 'combatMove' || ui.mode === 'ncm') {
      const mine = stacksFor(gameState, name, seatId)
        .filter((s) => !MOVE_SKIP.has(s.type));
      const from = ui.originName;
      if (pickedCount(ui.picked) && from && legalMoveDests(gameState, from).includes(name)) {
        ui.dest = name;
        ui.selected = name;
        return;
      }
      if (mine.length) {
        ui.selected = name;
        ui.originName = name;
        ui.picked = {};
        ui.dest = null;
        return;
      }
      ui.selected = name;
      return;
    }
    ui.selected = name;
  }

  function adjustUnit(type, delta = 1) {
    if (!human() || !type) return;
    const step = Number(delta);
    if (!Number.isFinite(step) || step === 0) return;
    if (ui.mode === 'airLand') {
      const have = Number(ui.airLeft[type]) || 0;
      if (have <= 0) return;
      const cur = Number(ui.landingPick[type]) || 0;
      const next = Math.max(0, Math.min(have, cur + step));
      if (next <= 0) delete ui.landingPick[type];
      else ui.landingPick[type] = next;
      return;
    }
    if (ui.mode === 'combatMove' || ui.mode === 'ncm') {
      const origin = ui.dest ? findOrigin() : ui.selected;
      const have = stacksFor(gameState, origin, seatId)
        .filter((s) => s.type === type)
        .reduce((n, s) => n + (Number(s.quantity) || 0), 0);
      if (have <= 0) return;
      const cur = Number(ui.picked[type]) || 0;
      const next = Math.max(0, Math.min(have, cur + step));
      if (next <= 0) delete ui.picked[type];
      else ui.picked[type] = next;
      if (!pickedCount(ui.picked)) ui.dest = null;
      return;
    }
    if (ui.mode === 'purchase') {
      if (step > 0) gameState.addToPendingPurchases(type, unitDefs, ui.selected);
      else gameState.removeFromPendingPurchases(type, unitDefs);
      return;
    }
    if (ui.mode === 'place' && ui.selected && step > 0) {
      gameState.mobilizeUnit(type, ui.selected, unitDefs);
    }
  }

  function findOrigin() {
    if (ui.dest && pickedCount(ui.picked)) {
      // Origin is the last owned land we staged from; keep selected as dest.
      return ui.origin || ui.selected;
    }
    return ui.selected;
  }

  function adjustLoss(side, type, delta) {
    if (side === 'def' || !ui.combat) return;
    adjustYouLoss(ui.combat, gameState, type, delta);
  }

  function confirm() {
    if (gameState.gameOver) {
      return { replay: true };
    }
    if (!ui.started) {
      start();
      return;
    }
    if (!human() && ui.mode !== 'over') return;

    if (ui.mode === 'tech') {
      gameState.nextPhase();
      resetPicks();
      syncMode();
      return;
    }
    if (ui.mode === 'purchase') {
      gameState.nextPhase();
      resetPicks();
      syncMode();
      return;
    }
    if (ui.mode === 'combatMove' || ui.mode === 'ncm') {
      if (ui.dest && pickedCount(ui.picked)) {
        const from = ui.originName || findStagedOrigin();
        const unitsToMove = Object.entries(ui.picked)
          .filter(([, n]) => (Number(n) || 0) > 0)
          .map(([type, quantity]) => ({ type, quantity: Number(quantity) }));
        const result = gameState.moveUnits(from, ui.dest, unitsToMove, unitDefs);
        ui.notice = result?.success ? '' : (result?.error || 'Move failed');
        if (result?.success) {
          ui.originName = from;
          resetPicks();
          ui.selected = ui.dest;
        }
        return;
      }
      const pending = gameState.getPendingPurchases?.()?.reduce((s, p) => s + (p.quantity || 0), 0) || 0;
      if (ui.mode === 'ncm' && pending <= 0) {
        ui.holdCollect = true;
        resetPicks();
        ui.mode = 'collect';
        return;
      }
      gameState.nextPhase();
      resetPicks();
      syncMode();
      return;
    }
    if (ui.mode === 'combatIdle') {
      dequeueResolvedHeads(gameState, unitDefs);
      if (!gameState.combatQueue?.length) gameState.nextPhase();
      resetPicks();
      syncMode();
      return;
    }
    if (ui.mode === 'combat' && ui.combat) {
      const before = ui.combat.step;
      confirmCombat(ui.combat, gameState, unitDefs);
      if (!ui.combat) {
        syncMode();
        return;
      }
      if (ui.combat.step === BATTLE_STEP.WON && before !== BATTLE_STEP.WON) {
        return;
      }
      if (ui.combat.step === BATTLE_STEP.WON) {
        const dest = ui.combat.territory;
        const failed = !!ui.combat.failed;
        ui.combat = null;
        if (!failed && beginAirLand(dest)) return;
        dequeueResolvedHeads(gameState, unitDefs);
        if (!gameState.combatQueue?.length) {
          gameState.nextPhase();
        }
        resetPicks();
        syncMode();
      }
      return;
    }
    if (ui.mode === 'airLand') {
      if (!ui.landingDest || !pickedCount(ui.landingPick)) return;
      const origin = ui.airOrigin;
      for (const [type, qty] of Object.entries(ui.landingPick)) {
        const n = Number(qty) || 0;
        if (n <= 0) continue;
        gameState.recordAirLandingSelection({
          originTerritory: origin,
          type,
          quantity: n,
          destination: ui.landingDest,
        });
        const units = [];
        for (let i = 0; i < n; i++) units.push({ type, quantity: 1, destination: ui.landingDest });
        gameState.applyAirLandings(origin, {
          airUnitsToLand: units,
          landings: { [type]: ui.landingDest },
          unitDefs,
        });
        ui.airLeft[type] = Math.max(0, (Number(ui.airLeft[type]) || 0) - n);
        if (ui.airLeft[type] <= 0) delete ui.airLeft[type];
      }
      ui.landingPick = {};
      if (pickedCount(ui.airLeft) <= 0) {
        dequeueResolvedHeads(gameState, unitDefs);
        if (!gameState.combatQueue?.length) gameState.nextPhase();
        resetPicks();
        ui.mode = '';
        syncMode();
      }
      return;
    }
    if (ui.mode === 'place') {
      const left = gameState.getPendingPurchases?.()?.reduce((s, p) => s + (p.quantity || 0), 0) || 0;
      if (left > 0) return;
      ui.holdCollect = true;
      resetPicks();
      ui.mode = 'collect';
      return;
    }
    if (ui.mode === 'collect') {
      ui.holdCollect = false;
      gameState.nextPhase();
      resetPicks();
      syncMode();
    }
  }

  function highlights() {
    const out = {
      origin: null,
      dest: null,
      legal: [],
      landable: [],
      selected: ui.selected,
      pulse: [],
      labels: [],
    };
    if (ui.mode === 'airLand') {
      out.landable = landableNames(gameState, ui.airOrigin, ui.airLeft, unitDefs);
      out.dest = ui.airOrigin || null;
      if (ui.landingDest) out.selected = ui.landingDest;
      return out;
    }
    if (ui.mode === 'combat' && ui.combat) {
      out.dest = ui.combat.territory;
      out.selected = ui.combat.territory;
      return out;
    }
    if (ui.mode === 'combatMove' || ui.mode === 'ncm') {
      const origin = ui.originName || (pickedCount(ui.picked) ? ui.originName : null);
      const from = ui.originName || (ui.dest ? ui.originName : (pickedCount(ui.picked) ? findStagedOrigin() : ui.selected));
      if (from && stacksFor(gameState, from, seatId).length) {
        out.origin = from;
        if (pickedCount(ui.picked)) {
          out.legal = legalMoveDests(gameState, from);
          if (!ui.dest) out.pulse.push(...out.legal);
        } else {
          out.pulse.push(from);
        }
      }
      if (ui.dest) out.dest = ui.dest;
      return out;
    }
    if (ui.mode === 'place') {
      out.legal = [...factoryNames(gameState, seatId), ...navalPlaceNames(gameState, seatId)];
      if (ui.selected) out.dest = ui.selected;
      return out;
    }
    if (ui.mode === 'purchase' && ui.selected) out.selected = ui.selected;
    return out;
  }

  function findStagedOrigin() {
    if (ui.originName) return ui.originName;
    for (const [name, units] of Object.entries(gameState.units || {})) {
      if ((units || []).some((u) => u.owner === seatId && (ui.picked[u.type] || 0) > 0)) {
        return name;
      }
    }
    return ui.selected;
  }

  function confirmModel() {
    if (!ui.started) {
      return {
        label: ui.hasSave ? 'Continue' : 'New Game vs AI',
        gold: true,
        enabled: true,
      };
    }
    if (gameState.gameOver) {
      return { label: 'New Game vs AI', gold: true, enabled: true, replay: true };
    }
    if (!human()) {
      return { label: ui.notice || 'AI playing…', gold: false, enabled: false };
    }
    if (ui.mode === 'tech') {
      return { label: 'Confirm: Skip tech', gold: true, enabled: true };
    }
    if (ui.mode === 'purchase') {
      const n = gameState.getPendingPurchases?.()?.reduce((s, p) => s + (p.quantity || 0), 0) || 0;
      return { label: n ? `Confirm: End purchase · ${n} bought` : 'Confirm: Skip purchase', gold: true, enabled: true };
    }
    if (ui.mode === 'combatMove' || ui.mode === 'ncm') {
      if (ui.dest && pickedCount(ui.picked)) {
        return {
          label: ui.mode === 'ncm' ? `Confirm: Move ${ui.dest}` : `Confirm: Attack ${ui.dest}`,
          gold: true,
          enabled: true,
        };
      }
      if (pickedCount(ui.picked)) return { label: 'Pick target', gold: false, enabled: false };
      return { label: ui.mode === 'ncm' ? 'Confirm: End NCM' : 'Confirm: End combat move', gold: true, enabled: true };
    }
    if (ui.mode === 'combat' && ui.combat) {
      return {
        label: combatConfirmLabel(ui.combat, gameState),
        gold: combatConfirmEnabled(ui.combat, gameState),
        enabled: combatConfirmEnabled(ui.combat, gameState),
      };
    }
    if (ui.mode === 'combatIdle') {
      return { label: 'Confirm: End battles', gold: true, enabled: true };
    }
    if (ui.mode === 'airLand') {
      const ready = !!ui.landingDest && pickedCount(ui.landingPick) > 0;
      return {
        label: ready ? `Confirm land · ${ui.landingDest}` : 'Pick planes · teal dest',
        gold: ready,
        enabled: ready,
      };
    }
    if (ui.mode === 'place') {
      const left = gameState.getPendingPurchases?.()?.reduce((s, p) => s + (p.quantity || 0), 0) || 0;
      if (left > 0) return { label: `Place ${left} · tap factory`, gold: false, enabled: false };
      return { label: 'Confirm: Done placing', gold: true, enabled: true };
    }
    if (ui.mode === 'collect') {
      const n = estimateIncome(gameState, seatId);
      return { label: `Confirm: Collect ${n} IPC`, gold: true, enabled: true };
    }
    return { label: 'Select units', gold: false, enabled: false };
  }

  function steppers() {
    if (ui.mode === 'airLand') {
      return Object.entries(ui.airLeft || {})
        .filter(([, n]) => Number(n) > 0)
        .map(([type, have]) => ({
          type,
          have: Number(have) || 0,
          picked: Number(ui.landingPick?.[type]) || 0,
          owner: seatId,
        }));
    }
    if (ui.mode === 'combatMove' || ui.mode === 'ncm') {
      const from = findStagedOrigin();
      if (!from) return null;
      const show = ui.selected === from || pickedCount(ui.picked) || ui.dest;
      if (!show) return null;
      return stacksFor(gameState, from, seatId)
        .filter((s) => !MOVE_SKIP.has(s.type))
        .map((s) => ({
          type: s.type,
          have: s.quantity,
          picked: Number(ui.picked[s.type]) || 0,
          owner: s.owner,
        }));
    }
    if (ui.mode === 'purchase') {
      const ipcs = gameState.getIPCs(seatId);
      const pending = {};
      for (const p of gameState.getPendingPurchases?.() || []) {
        pending[p.type] = (pending[p.type] || 0) + (p.quantity || 0);
      }
      return BUY_TYPES
        .filter((type) => unitDefs[type])
        .map((type) => {
          const cost = unitDefs[type].cost || 1;
          const have = (pending[type] || 0) + Math.floor(ipcs / cost);
          if (have <= 0 && !(pending[type] > 0)) return null;
          return {
            type,
            have: Math.max(have, pending[type] || 0),
            picked: pending[type] || 0,
            owner: seatId,
          };
        })
        .filter(Boolean);
    }
    if (ui.mode === 'place') {
      const pending = gameState.getPendingPurchases?.() || [];
      return pending
        .filter((p) => (p.quantity || 0) > 0)
        .map((p) => ({
          type: p.type,
          have: p.quantity,
          picked: 0,
          owner: seatId,
        }));
    }
    return null;
  }

  function chromeModel(territories) {
    syncMode();
    const land = (ui.selected && territories)
      ? territories.find((t) => t.name === ui.selected)
      : null;
    const confirm = confirmModel();
    const airLand = ui.mode === 'airLand';
    const moveFrom = (ui.mode === 'combatMove' || ui.mode === 'ncm') ? findStagedOrigin() : null;
    let route = ui.notice || '';
    if (ui.mode === 'splash') {
      route = ui.hasSave
        ? 'Continue saved game · or New Game vs AI in the sheet'
        : 'New Game vs AI · classic 1942 · 1 human + 4 medium AI';
    }
    if ((ui.mode === 'combatMove' || ui.mode === 'ncm') && ui.dest) {
      route = `${moveFrom || ''} → ${ui.dest}`;
    }
    if (airLand) route = ui.landingDest ? `Confirm land · ${ui.landingDest}` : 'Pick a teal land';
    if (ui.mode === 'ai') route = ui.notice || `${gameState.currentPlayer?.name || 'AI'} thinking…`;
    if (gameState.gameOver) route = gameState.winCondition || 'Game over';
    const focusName = airLand
      ? (ui.landingDest || 'Land aircraft')
      : ((ui.mode === 'combatMove' || ui.mode === 'ncm') && (pickedCount(ui.picked) || ui.dest)
        ? (moveFrom || ui.selected)
        : ui.selected);
    const focusLand = focusName && territories
      ? (territories.find((t) => t.name === focusName) || { name: focusName })
      : land;
    const sheetLand = airLand
      ? (focusLand || { name: 'Land aircraft' })
      : (focusLand || ((ui.mode === 'purchase' || ui.mode === 'place' || ui.mode === 'collect' || ui.mode === 'tech')
        ? { name: ui.mode === 'purchase' ? 'Purchase units' : ui.mode === 'place' ? 'Place units' : ui.mode === 'collect' ? 'Collect income' : 'Develop tech' }
        : null));
    return {
      land: sheetLand,
      stacks: airLand ? [] : (focusName ? stacksFor(gameState, focusName) : []),
      steppers: steppers(),
      airLand,
      label: confirm.label,
      gold: confirm.gold,
      enabled: confirm.enabled,
      replay: !!confirm.replay,
      battle: ui.mode === 'combat' ? battleCard(ui.combat, gameState, unitDefs) : null,
      route,
      phase: phaseWord(gameState, ui),
      ipc: gameState.getIPCs(seatId),
      seat: gameState.getPlayer?.(seatId)?.name || seatId,
    };
  }

  function inspect() {
    return {
      started: ui.started,
      hasSave: !!ui.hasSave,
      mode: ui.mode,
      phase: gameState.phase,
      turnPhase: gameState.turnPhase,
      seat: seatId,
      current: gameState.currentPlayer?.id || null,
      human: human(),
      selected: ui.selected,
      dest: ui.dest,
      picked: { ...ui.picked },
      combat: ui.combat ? { territory: ui.combat.territory, step: ui.combat.step } : null,
      gameOver: !!gameState.gameOver,
      winner: gameState.winner || null,
      queue: [...(gameState.combatQueue || [])],
    };
  }

  // Remember origin when first picking units on a land.
  const wrappedTap = (name) => {
    const before = ui.selected;
    tap(name);
    if ((ui.mode === 'combatMove' || ui.mode === 'ncm') && ui.selected && !pickedCount(ui.picked) && !ui.dest) {
      if (stacksFor(gameState, ui.selected, seatId).some((s) => !MOVE_SKIP.has(s.type))) {
        ui.originName = ui.selected;
      }
    }
    if (before && ui.dest) ui.originName = ui.originName || before;
  };

  const wrappedAdjust = (type, delta) => {
    if ((ui.mode === 'combatMove' || ui.mode === 'ncm') && ui.selected && !ui.originName) {
      ui.originName = ui.selected;
    }
    adjustUnit(type, delta);
  };

  return {
    ui,
    start,
    tap: wrappedTap,
    adjustUnit: wrappedAdjust,
    adjustLoss,
    confirm,
    highlights,
    chromeModel,
    inspect,
    syncMode,
    setNotice(text) {
      ui.notice = text || '';
    },
  };
}
