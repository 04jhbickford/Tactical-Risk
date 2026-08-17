// V2.77: presence / join-by-code / deploy queue / title-banner / undo≠pass.
// Run: node tools/test-presence-and-deploy.mjs

import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const {
  GameState,
  GAME_PHASES,
  SETUP_TURN_PHASE,
  resolvePersistedTurnPhase,
} = await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const {
  cloneUnitsToPlace,
  remainingDeployByPlayer,
  shouldApplyRemoteGameState,
  syncPushPhaseLabel,
} = await import(pathToFileURL(join(root, 'src/state/placementPass.js')));
const {
  applyPlaceQueueDelta,
  applyPlaceQueueMax,
  canAddToPlaceQueue,
  expandPlaceQueue,
  queuedCount,
  shouldResetDeployedThisRound,
} = await import(pathToFileURL(join(root, 'src/state/placeQueue.js')));
const {
  shouldDeletePresenceDoc,
  presenceStateForVisibility,
  shouldHeartbeatNow,
  shouldEjectFromMatch,
  resolveJoinByCode,
  shouldDeleteLobbyOnHostLeave,
  resolvePresenceState,
  shouldOpenLeaveConfirm,
  PRESENCE_GONE_MS,
} = await import(pathToFileURL(join(root, 'src/multiplayer/presencePolicy.js')));
const {
  computeIsLocalPlayerTurn,
  resolveTabTitle,
  emitYourTurnEvent,
  shouldAutoCommitPhoneCapital,
} = await import(pathToFileURL(join(root, 'src/ui/playerPanel.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

const unitDefs = {
  infantry: { isLand: true },
  armour: { isLand: true },
  tacticalBomber: { isAir: true },
};

console.log('=== Version stamps ===');
check('GAME_VERSION is V2.77', GAME_VERSION === 'V2.77');
check('SCHEMA_VERSION stays 11', SCHEMA_VERSION === 11);

console.log('=== Presence: background must not delete or go offline ===');
check('beforeunload / hide is not a delete',
  shouldDeletePresenceDoc({ reason: 'beforeunload' }) === false
  && shouldDeletePresenceDoc({ reason: 'pagehide' }) === false
  && shouldDeletePresenceDoc({ reason: 'visibility-hidden' }) === false);
check('only explicit leave deletes the presence doc',
  shouldDeletePresenceDoc({ reason: 'explicit-leave' }) === true);
check('hidden tab is idle, not gone',
  presenceStateForVisibility('hidden') === 'idle'
  && presenceStateForVisibility('visible') === 'online');
check('heartbeat on visible + pageshow + interval',
  shouldHeartbeatNow({ event: 'visibility-visible' })
  && shouldHeartbeatNow({ event: 'pageshow' })
  && shouldHeartbeatNow({ event: 'interval' })
  && shouldHeartbeatNow({ event: 'beforeunload' }) === false);
{
  const now = 1_000_000;
  check('missing doc is offline',
    resolvePresenceState({ hasDoc: false, now }) === 'offline');
  check('3 min backgrounded idle doc is still idle',
    resolvePresenceState({
      hasDoc: true, lastSeen: now - 3 * 60 * 1000, state: 'idle', now,
    }) === 'idle');
  check('15+ min silence is offline',
    resolvePresenceState({
      hasDoc: true, lastSeen: now - PRESENCE_GONE_MS - 1, state: 'idle', now,
    }) === 'offline');
}
check('auth hiccup with a live user does not eject',
  shouldEjectFromMatch({ authUserPresent: true, tokenValid: true }) === false
  && shouldEjectFromMatch({ authUserPresent: true, tokenValid: false }) === false);
check('confirmed sign-out ejects',
  shouldEjectFromMatch({
    authUserPresent: false, tokenValid: false, confirmedSignOut: true,
  }) === true);

console.log('=== Join-by-code finds a started match ===');
{
  const started = { id: 'g1', playerUserIds: ['host', 'guest'], status: 'active' };
  const lobby = { id: 'l1', status: 'starting', code: 'ZUJMNP' };
  check('waiting lobby wins',
    resolveJoinByCode({ waitingLobby: { id: 'w' }, userId: 'guest' }).kind === 'lobby');
  check('started game is joinable by a seated player',
    resolveJoinByCode({ startedGame: started, userId: 'guest' }).kind === 'game');
  check('started lobby without a game doc is started-lobby',
    resolveJoinByCode({ anyLobby: lobby, userId: 'guest' }).kind === 'started-lobby');
  check('unknown code is not-found',
    resolveJoinByCode({ userId: 'guest' }).kind === 'not-found');
  check('started lobby is never deleted when the host backgrounds',
    shouldDeleteLobbyOnHostLeave({ lobbyStatus: 'starting', remainingHumans: 0 }) === false
    && shouldDeleteLobbyOnHostLeave({ lobbyStatus: 'waiting', remainingHumans: 0 }) === true);
}

console.log('=== Deploy queue: + is exactly one row by 1 ===');
{
  let q = {};
  q = applyPlaceQueueDelta({
    queue: q, unitType: 'infantry', delta: 1, available: 10, slotsRemaining: 6,
  });
  check('one Infantry + is 1, not 4', q.infantry === 1 && queuedCount(q) === 1);
  q = applyPlaceQueueDelta({
    queue: q, unitType: 'infantry', delta: 1, available: 10, slotsRemaining: 6,
  });
  check('second + is 2', q.infantry === 2 && !q.armour);
  q = applyPlaceQueueDelta({
    queue: q, unitType: 'armour', delta: 1, available: 3, slotsRemaining: 6,
  });
  check('+ on Armour does not steal from Infantry',
    q.infantry === 2 && q.armour === 1 && queuedCount(q) === 3);
  const maxed = applyPlaceQueueMax({
    queue: q, unitType: 'infantry', available: 10, slotsRemaining: 6,
  });
  check('Max fills that row to remaining slots (not other types)',
    maxed.infantry === 5 && maxed.armour === 1 && queuedCount(maxed) === 6);
}

console.log('=== New turn is 0/N; guest applies remote on seat change ===');
check('seat change resets deployed this round',
  shouldResetDeployedThisRound({
    prevPlayerId: 'host', nextPlayerId: 'guest', remotePlacedThisRound: 6,
  }) === true);
check('remote 0/N also resets',
  shouldResetDeployedThisRound({
    prevPlayerId: 'guest', nextPlayerId: 'guest', remotePlacedThisRound: 0,
  }) === true);
check('guest must load when the seat changes at the same version',
  shouldApplyRemoteGameState({
    remoteVersion: 12,
    localVersion: 12,
    remoteCurrentPlayerId: 'james',
    localCurrentPlayerId: 'host',
  }) === true);
check('equal version + same seat does not reload',
  shouldApplyRemoteGameState({
    remoteVersion: 12,
    localVersion: 12,
    remoteCurrentPlayerId: 'host',
    localCurrentPlayerId: 'host',
  }) === false);
check('newer version always loads',
  shouldApplyRemoteGameState({ remoteVersion: 13, localVersion: 12 }) === true);

console.log('=== Setup persist: leftover purchase becomes setup ===');
{
  check('non-playing persists setup',
    resolvePersistedTurnPhase(GAME_PHASES.UNIT_PLACEMENT, 'purchase') === SETUP_TURN_PHASE);
  check('sync label is game phase, not leftover turnPhase',
    syncPushPhaseLabel(GAME_PHASES.UNIT_PLACEMENT, 'purchase') === GAME_PHASES.UNIT_PLACEMENT);
  const cloned = cloneUnitsToPlace({
    p1: [{ type: 'infantry', quantity: 19 }],
    p2: [{ type: 'infantry', quantity: 25 }],
  });
  cloned.p1[0].quantity = 0;
  check('toJSON clone is a point-in-time copy',
    remainingDeployByPlayer({
      p1: [{ type: 'infantry', quantity: 19 }],
      p2: [{ type: 'infantry', quantity: 25 }],
    }, ['p1', 'p2'], unitDefs).p1 === 19);
}

console.log('=== Host places N then Done: remaining is 25-N / next is 0 placed ===');
{
  const territories = [
    { name: 'HostLand', isWater: false, connections: [] },
    { name: 'GuestLand', isWater: false, connections: [] },
  ];
  const gs = new GameState({ risk: { factions: [] } }, territories, []);
  gs.players = [
    { id: 'p1', name: 'Host', oderId: 'host', isAI: false },
    { id: 'p2', name: 'James', oderId: 'james', isAI: false },
  ];
  gs.currentPlayerIndex = 0;
  gs.phase = GAME_PHASES.UNIT_PLACEMENT;
  gs.turnPhase = 'purchase';
  gs.unitsToPlace = {
    p1: [{ type: 'infantry', quantity: 25 }],
    p2: [{ type: 'infantry', quantity: 25 }],
  };
  gs.territoryState = {
    HostLand: { owner: 'p1' },
    GuestLand: { owner: 'p2' },
  };
  gs.units = { HostLand: [], GuestLand: [] };
  gs.unitsPlacedThisRound = 0;
  for (let i = 0; i < 6; i++) {
    const r = gs.placeInitialUnit('HostLand', 'infantry', unitDefs);
    check(`place ${i + 1} ok`, r.success === true);
  }
  const snap = gs.toJSON();
  check('persisted turnPhase is setup, not purchase', snap.turnPhase === SETUP_TURN_PHASE);
  const pass = gs.finishPlacementRound(unitDefs);
  check('Done hands the seat to James',
    pass.ok === true && gs.currentPlayer?.id === 'p2');
  check('next seat starts 0 placed', gs.unitsPlacedThisRound === 0);
  const remaining = remainingDeployByPlayer(gs.unitsToPlace, ['p1', 'p2'], unitDefs);
  check('host remaining is 25-6', remaining.p1 === 19);
  check('guest remaining is still 25', remaining.p2 === 25);
  const guest = new GameState({ risk: { factions: [] } }, territories, []);
  guest.loadFromJSON(gs.toJSON());
  check('guest load sees James current and 0/N',
    guest.currentPlayer?.id === 'p2' && guest.unitsPlacedThisRound === 0);
  check('guest load sees host remaining 19',
    remainingDeployByPlayer(guest.unitsToPlace, ['p1'], unitDefs).p1 === 19);
  check('guest load turnPhase is setup', guest.turnPhase === SETUP_TURN_PHASE);
}

console.log('=== Title and banner agree; your-turn event ===');
{
  const waiting = !computeIsLocalPlayerTurn({
    isMultiplayer: true,
    isWaitingForSync: true,
    localUserId: 'james',
    currentPlayerOderId: 'host',
  });
  const title = resolveTabTitle({
    isLocalPlayerTurn: computeIsLocalPlayerTurn({
      isMultiplayer: true,
      isWaitingForSync: true,
      localUserId: 'james',
      currentPlayerOderId: 'host',
    }),
  });
  check('WAITING guest is not ● Your turn',
    waiting === true && title === 'Tactical Risk');
  const yourTurn = computeIsLocalPlayerTurn({
    isMultiplayer: true,
    isWaitingForSync: false,
    localUserId: 'james',
    currentPlayerOderId: 'james',
  });
  check('active seat is ● Your turn',
    yourTurn === true
    && resolveTabTitle({ isLocalPlayerTurn: yourTurn }) === '● Your turn — Tactical Risk');
  const ev = emitYourTurnEvent({ yourTurn: true, playerName: 'James', gameId: 'ZUJMNP' });
  check('your-turn event payload is pingable',
    ev.yourTurn === true && ev.playerName === 'James' && ev.gameId === 'ZUJMNP');
}

console.log('=== Undo / capital / leave row ===');
check('phone capital tap never auto-commits',
  shouldAutoCommitPhoneCapital({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, tappedIsOwnedLand: true,
  }) === false);
check('game-row click is not Leave',
  shouldOpenLeaveConfirm({ clickOnLeaveControl: false }) === false);
check('Leave control still opens confirm',
  shouldOpenLeaveConfirm({ clickOnLeaveControl: true }) === true);

console.log('=== B13–B17 deploy batch / cap / undo / paint ===');
{
  const q = { infantry: 4, armour: 2 };
  const atCap = applyPlaceQueueDelta({
    queue: q, unitType: 'fighter', delta: 1, available: 3, slotsRemaining: 6,
  });
  check('B14: + at cap does not steal from staged types',
    atCap.infantry === 4 && atCap.armour === 2 && (atCap.fighter || 0) === 0);
  check('B14: + at cap is rejected',
    canAddToPlaceQueue({
      queue: q, unitType: 'fighter', available: 3, slotsRemaining: 6,
    }) === false);
  const plusInf = applyPlaceQueueDelta({
    queue: q, unitType: 'infantry', delta: 1, available: 10, slotsRemaining: 6,
  });
  check('B14: + on a full row is a no-op, other row untouched',
    plusInf.infantry === 4 && plusInf.armour === 2);

  const territories = [
    { name: 'East United States', isWater: false, connections: ['Eastern Canada'] },
    { name: 'Eastern Canada', isWater: false, connections: ['East United States'] },
  ];
  const gs = new GameState({ risk: { factions: [] } }, territories, []);
  gs.players = [{ id: 'p1', name: 'James', oderId: 'james', isAI: false }];
  gs.currentPlayerIndex = 0;
  gs.phase = GAME_PHASES.UNIT_PLACEMENT;
  gs.unitsToPlace = { p1: [
    { type: 'infantry', quantity: 20 },
    { type: 'fighter', quantity: 2 },
  ] };
  gs.territoryState = {
    'East United States': { owner: 'p1' },
    'Eastern Canada': { owner: 'p1' },
  };
  gs.units = { 'East United States': [], 'Eastern Canada': [] };
  gs.unitsPlacedThisRound = 0;
  let notifies = 0;
  gs.subscribe(() => { notifies++; });

  const types = expandPlaceQueue({ infantry: 5, fighter: 1 });
  check('queue of 6 expands to 6 commits', types.length === 6);
  const batch = gs.placeInitialUnitsBatch('East United States', types, {
    infantry: { isLand: true },
    fighter: { isAir: true },
  });
  check('B13: Deploy 6 places 6, not 5',
    batch.placed === 6 && batch.requested === 6 && batch.failed.length === 0);
  check('B13: remaining drops by 6, not 5',
    remainingDeployByPlayer(gs.unitsToPlace, ['p1'], {
      infantry: { isLand: true }, fighter: { isAir: true },
    }).p1 === 16);
  check('B13: all 6 landed on the selected territory',
    (gs.units['East United States'] || []).reduce((s, u) => s + (u.quantity || 0), 0) === 6
    && (gs.units['Eastern Canada'] || []).length === 0);
  check('B13: batch notifies once (no mid-loop Undo retarget / 0-flash)',
    notifies === 1);
  check('DEPLOYED is 6 after commit', gs.unitsPlacedThisRound === 6);

  const beforePool = gs.unitsToPlace.p1.find(u => u.type === 'fighter').quantity;
  check('B15: undo last (fighter) restores pool and drops DEPLOYED',
    gs.undoPlacement() === true
    && gs.unitsPlacedThisRound === 5
    && gs.unitsToPlace.p1.find(u => u.type === 'fighter').quantity === beforePool + 1);

  const src = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  check('B16/B17: _scheduleRender paints via _render, not itself',
    src.includes('this._renderRaf = 0;\n      this._render();')
    && !src.includes('this._renderRaf = 0;\n      this._scheduleRender();'));
  check('B17: + is place-queue, never place-unit',
    /action === 'place-queue'/.test(src)
    && /place-units-batch/.test(src));
}

console.log(failures === 0 ? '\nALL PRESENCE-AND-DEPLOY CHECKS PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
