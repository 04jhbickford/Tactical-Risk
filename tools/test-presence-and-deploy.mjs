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
  deployedThisRoundDisplay,
  placementBudgetCopy,
  queueAfterDeployAttempt,
} = await import(pathToFileURL(join(root, 'src/state/placeQueue.js')));
const {
  shouldDeletePresenceDoc,
  presenceStateForVisibility,
  shouldHeartbeatNow,
  shouldEjectFromMatch,
  resolveJoinByCode,
  shouldDeleteLobbyOnHostLeave,
  presenceStopReason,
  isSeatedInStartedGame,
  shouldAbortMyGamesOnTokenHiccup,
  mergeMyActiveGames,
  isMyGamesActiveStatus,
  resolvePresenceState,
  shouldOpenLeaveConfirm,
  shouldJoinGameFromRowClick,
  isLeaveControlTarget,
  shouldReplaceSnapshotListener,
  shouldResumeSnapshots,
  shouldAccumulateHostOfflineMs,
  shouldStartHostFailover,
  PRESENCE_GONE_MS,
} = await import(pathToFileURL(join(root, 'src/multiplayer/presencePolicy.js')));
const {
  rememberLastMatch,
  readLastMatch,
  forgetLastMatch,
  lastMatchForJoinCode,
  mergeLastMatchIntoMyGames,
  resolveLobbyCodeFromGameDoc,
  resolveHostReconnectCopy,
  shouldShowHostReconnect,
} = await import(pathToFileURL(join(root, 'src/multiplayer/lastMatch.js')));
const {
  capturePanelPointerLock,
  resolveLockedPanelClick,
  shouldBlockMapSelectAfterPanel,
} = await import(pathToFileURL(join(root, 'src/ui/panelClickLock.js')));
const {
  computeIsLocalPlayerTurn,
  resolveTabTitle,
  resolveTurnChrome,
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
check('E1: resume on visible and pageshow (incl. bfcache)',
  shouldResumeSnapshots({ event: 'visibility-visible' })
  && shouldResumeSnapshots({ event: 'pageshow' })
  && shouldResumeSnapshots({ event: 'interval' }) === false);
check('E1: live snapshot is not replaced (no double-subscribe)',
  shouldReplaceSnapshotListener({ hasUnsubscribe: true, listenerErrored: false }) === false);
check('E1: dead / missing / bfcache snapshot is replaced',
  shouldReplaceSnapshotListener({ hasUnsubscribe: false }) === true
  && shouldReplaceSnapshotListener({ hasUnsubscribe: true, persistedPageShow: true }) === true
  && shouldReplaceSnapshotListener({ hasUnsubscribe: false, listenerErrored: true }) === true);
check('E1: idle/background host does not start 90s failover',
  shouldAccumulateHostOfflineMs({ hostPresence: 'idle' }) === false
  && shouldStartHostFailover({
    hostPresence: 'idle', offlineForMs: 3 * 60 * 1000, graceMs: 90000,
  }) === false);
check('E1: missing host still failovers after grace',
  shouldStartHostFailover({
    hostPresence: 'offline', offlineForMs: 90000, graceMs: 90000,
  }) === true
  && shouldStartHostFailover({
    hostPresence: 'offline', offlineForMs: 1000, graceMs: 90000,
  }) === false);
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

console.log('=== B25: session-lost host can still find ZUJMNP ===');
{
  const emptyIds = { id: 'g-zuj', lobbyCode: 'ZUJMNP', status: 'active', playerUserIds: [], startedBy: 'host' };
  const missingIds = { id: 'g-zuj', lobbyCode: 'ZUJMNP', status: 'active', startedBy: 'host' };
  const lobbySeat = {
    id: 'l-zuj', status: 'starting', code: 'ZUJMNP', hostId: 'host',
    players: [{ oderId: 'host' }, { oderId: 'guest' }],
    gameId: 'g-zuj',
  };
  check('session-lost does not delete the presence doc',
    shouldDeletePresenceDoc({ reason: presenceStopReason({ explicitLeave: false }) }) === false
    && presenceStopReason({ explicitLeave: false }) === 'session-lost');
  check('Exit still deletes the presence doc',
    shouldDeletePresenceDoc({ reason: presenceStopReason({ explicitLeave: true }) }) === true);
  check('empty playerUserIds is still seated via startedBy',
    isSeatedInStartedGame({ game: emptyIds, userId: 'host' }) === true);
  check('empty playerUserIds is still seated via lobby players',
    isSeatedInStartedGame({ game: emptyIds, lobby: lobbySeat, userId: 'guest' }) === true);
  check('populated playerUserIds still excludes a stranger',
    isSeatedInStartedGame({
      game: { ...emptyIds, playerUserIds: ['host', 'guest'] },
      userId: 'stranger',
    }) === false);
  check('join-by-code finds started game with empty playerUserIds',
    resolveJoinByCode({ startedGame: emptyIds, anyLobby: lobbySeat, userId: 'host' }).kind === 'game'
    && resolveJoinByCode({ startedGame: missingIds, userId: 'host' }).kind === 'game');
  check('join-by-code does not say not-found when the game exists',
    resolveJoinByCode({ startedGame: emptyIds, userId: 'host' }).kind !== 'not-found');
  check('B25 confirmed: started ZUJMNP is never lobby-not-found',
    resolveJoinByCode({
      startedGame: { id: 'g-zuj', lobbyCode: 'ZUJMNP', status: 'active', playerUserIds: ['guest'] },
      userId: 'host',
    }).kind === 'game');
  check('token hiccup with a signed-in user still loads My Games',
    shouldAbortMyGamesOnTokenHiccup({ authUserPresent: true, tokenValid: false }) === false
    && shouldAbortMyGamesOnTokenHiccup({ authUserPresent: false, tokenValid: false }) === true);
  check('My Games merges seat + startedBy and drops finished',
    mergeMyActiveGames({
      bySeat: [{ id: 'a', status: 'active' }, { id: 'done', status: 'finished' }],
      byStarter: [{ id: 'a', status: 'active' }, { id: 'b', status: 'starting' }],
    }).map((g) => g.id).sort().join(',') === 'a,b');
  check('My Games status filter is client-side (no compound in)',
    isMyGamesActiveStatus('active') && isMyGamesActiveStatus('starting')
    && isMyGamesActiveStatus('finished') === false);
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
    waiting === true && !title.includes('Your turn'));
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

console.log('=== James lock: if it can look broken, it is broken ===');
{
  const other = resolveTurnChrome({
    isMultiplayer: true,
    localUserId: 'james',
    currentPlayerOderId: 'host',
    currentPlayerName: 'Bastion',
  });
  check('other seat: tab title is Waiting, never Your turn',
    other.tabTitle === 'Waiting: Bastion — Tactical Risk'
    && other.badge === 'WAITING'
    && other.ownSeat === false
    && !other.tabTitle.includes('Your turn'));
  check('waiting lock cannot force Your turn on the other seat',
    resolveTabTitle({
      isMultiplayer: true,
      isLocalPlayerTurn: true,
      localUserId: 'james',
      currentPlayerOderId: 'host',
      currentPlayerName: 'Bastion',
    }) === 'Waiting: Bastion — Tactical Risk');
  const mine = resolveTurnChrome({
    isMultiplayer: true,
    localUserId: 'james',
    currentPlayerOderId: 'james',
    currentPlayerName: 'James',
  });
  check('own seat: title and badge are both YOUR TURN',
    mine.tabTitle === '● Your turn — Tactical Risk' && mine.badge === 'YOUR TURN');
  const cap = placementBudgetCopy({
    deployedThisRound: 6, limit: 6, poolRemaining: 1,
  });
  check('6/6 + 1 in pool is next-round copy, not Remaining to deploy: 1',
    cap.deployedText === '6/6'
    && cap.remainingLabel === 'Still in your pool'
    && cap.remainingText === '1 next round'
    && cap.leftoverAfterCap === true
    && !`${cap.remainingLabel} ${cap.remainingText}`.includes('Remaining to deploy'));
  check('open pool still says remaining in your pool',
    placementBudgetCopy({ deployedThisRound: 2, limit: 6, poolRemaining: 19 })
      .remainingLabel === 'Remaining in your pool');
  const titleEl = { closest: (sel) => sel === '[data-role="join-game"]' ? titleEl : null };
  const leaveEl = { closest: (sel) => sel === '[data-leave-game]' ? leaveEl : null };
  check('row title resumes; it does not open surrender',
    shouldJoinGameFromRowClick({ eventTarget: titleEl }) === true
    && shouldOpenLeaveConfirm({ clickOnLeaveControl: true, eventTarget: titleEl }) === false);
  check('only Leave opens surrender',
    shouldJoinGameFromRowClick({ eventTarget: leaveEl }) === false
    && shouldOpenLeaveConfirm({ clickOnLeaveControl: true, eventTarget: leaveEl }) === true);
}

console.log('=== B25 confirmed: last match + host reconnect copy ===');
{
  const mem = {
    data: {},
    getItem(k) { return this.data[k] ?? null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; },
  };
  check('game doc lobbyCode is the 6-char join code, not gameId',
    resolveLobbyCodeFromGameDoc({ lobbyCode: 'ZUJMNP', id: 'game_123' }) === 'ZUJMNP'
    && resolveLobbyCodeFromGameDoc({ code: 'game_123' }) === null);
  const saved = rememberLastMatch({
    gameId: 'game_zuj', lobbyCode: 'ZUJMNP', hostName: 'Bastion',
  }, mem);
  check('remember last match writes gameId + code',
    saved.gameId === 'game_zuj' && readLastMatch(mem).lobbyCode === 'ZUJMNP');
  check('join ZUJMNP uses the remembered gameId',
    lastMatchForJoinCode({ lastMatch: readLastMatch(mem), code: 'zujmnp' })?.gameId === 'game_zuj');
  check('My Games lists the remembered live game even if seat query missed it',
    mergeLastMatchIntoMyGames({
      games: [],
      lastMatchGame: { id: 'game_zuj', status: 'active', lobbyCode: 'ZUJMNP' },
    }).map((g) => g.id).join(',') === 'game_zuj');
  forgetLastMatch(mem);
  check('explicit leave forgets the last match', readLastMatch(mem) === null);
  check('idle host is away, not game-over',
    /away|rejoin|still here/i.test(resolveHostReconnectCopy({
      hostPresence: 'idle', hostName: 'Bastion', gameCode: 'ZUJMNP',
    }))
    && shouldShowHostReconnect({ hostPresence: 'idle' }) === true);
  check('missing host is reconnecting — guest must stay',
    /reconnect/i.test(resolveHostReconnectCopy({
      hostPresence: 'offline', hostName: 'Bastion', gameCode: 'ZUJMNP',
    }))
    && /Do not leave/i.test(resolveHostReconnectCopy({
      hostPresence: 'offline', hostName: 'Bastion', gameCode: 'ZUJMNP',
    })));
  check('online host has no reconnect banner',
    resolveHostReconnectCopy({ hostPresence: 'online' }) === null);
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
{
  const title = { closest: (sel) => sel === '.mp-game-name' ? title : null };
  const leaveBtn = { closest: (sel) => sel === '[data-leave-game]' ? leaveBtn : null };
  check('B23: row title is not a leave control',
    isLeaveControlTarget(title) === false
    && shouldOpenLeaveConfirm({ clickOnLeaveControl: true, eventTarget: title }) === false);
  check('B23: only the Leave button opens surrender',
    isLeaveControlTarget(leaveBtn) === true
    && shouldOpenLeaveConfirm({ clickOnLeaveControl: true, eventTarget: leaveBtn }) === true);
}

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

console.log('=== B20–B24 pointer lock / Max / failed Deploy / Leave ===');
{
  const plusLock = capturePanelPointerLock({
    action: 'place-queue',
    dataset: { action: 'place-queue', unit: 'artillery', delta: '1' },
  });
  const plusThenDone = resolveLockedPanelClick({
    lock: plusLock,
    clickAction: 'finish-placement',
    now: 100,
    lastQueueGestureAt: 0,
  });
  check('B21: + lock does not become Done / end the turn',
    plusThenDone?.action === 'place-queue');
  const plusThenLog = resolveLockedPanelClick({
    lock: plusLock,
    clickTabId: 'log',
    clickAction: 'phone-detent-tab',
    now: 100,
    lastQueueGestureAt: 0,
  });
  check('B22: + lock does not switch to Log',
    plusThenLog?.kind === 'action' && plusThenLog.action === 'place-queue');
  const deployLock = capturePanelPointerLock({
    action: 'confirm-placement',
    dataset: { action: 'confirm-placement' },
  });
  const deployThenPlus = resolveLockedPanelClick({
    lock: deployLock,
    clickAction: 'place-queue',
    clickDataset: { unit: 'armour', delta: '1' },
    now: 100,
  });
  check('B20: Deploy lock does not retarget onto another +',
    deployThenPlus?.action === 'confirm-placement');
  const ghostDone = resolveLockedPanelClick({
    lock: null,
    clickAction: 'finish-placement',
    now: 250,
    lastQueueGestureAt: 100,
  });
  check('B21: ghost Done after + is ignored', ghostDone === null);
  check('B22: panel gesture blocks the map select under the finger',
    shouldBlockMapSelectAfterPanel({ panelPointerAt: 100, now: 200 }) === true
    && shouldBlockMapSelectAfterPanel({ panelPointerAt: 100, now: 700 }) === false);

  const q = { armour: 1 };
  const maxed = applyPlaceQueueMax({
    queue: q, unitType: 'armour', available: 3, slotsRemaining: 5,
  });
  check('B24: Max fills the queue only',
    maxed.armour === 3 && queuedCount(maxed) === 3);
  check('B24: Max does not bump DEPLOYED',
    deployedThisRoundDisplay(1) === 1
    && deployedThisRoundDisplay(1) !== queuedCount(maxed));
  check('B24: Deploy 0 restores the staged queue',
    queueAfterDeployAttempt({ queueBefore: { bomber: 1 }, placed: 0 }).bomber === 1);
  check('B24: Deploy 1 clears the queue',
    Object.keys(queueAfterDeployAttempt({ queueBefore: { bomber: 1 }, placed: 1 })).length === 0);

  const src = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  check('B19-James: inline placement actions include Done',
    /pp-placement-actions[\s\S]*finish-placement/.test(src));
  check('B20–B22: panel uses pointerdown lock',
    src.includes('_onPanelPointerDown') && src.includes('resolveLockedPanelClick'));
}

{
  const syncSrc = readFileSync(join(root, 'src/multiplayer/syncManager.js'), 'utf8');
  const presenceSrc = readFileSync(join(root, 'src/multiplayer/presenceManager.js'), 'utf8');
  check('E1: sync re-attaches via ensure, not a second startSync',
    syncSrc.includes('_ensureGameSnapshot')
    && (syncSrc.match(/onSnapshot\(/g) || []).length === 1);
  check('E1: presence re-attaches via ensure, one collection listener',
    presenceSrc.includes('_ensurePresenceSnapshot')
    && (presenceSrc.match(/onSnapshot\(/g) || []).length === 1);
  check('E1: no RTDB onDisconnect',
    !syncSrc.includes('onDisconnect') && !presenceSrc.includes('onDisconnect'));
}

console.log(failures === 0 ? '\nALL PRESENCE-AND-DEPLOY CHECKS PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
