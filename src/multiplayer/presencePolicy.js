// Presence / auth / lobby rules for backgrounded tabs.
// No Firebase here — PresenceManager and harnesses share one policy.

export const PRESENCE_HEARTBEAT_MS = 30000;
export const PRESENCE_STALE_MS = 120000;
// A backgrounded tab's interval is frozen. The doc still exists — that is
// not "host gone". Only a missing doc or 15+ min of silence is offline.
export const PRESENCE_GONE_MS = 15 * 60 * 1000;

export function resolvePresenceState({
  hasDoc = false,
  lastSeen = 0,
  state = null,
  now = Date.now(),
} = {}) {
  if (!hasDoc) return 'offline';
  const age = now - (Number(lastSeen) || 0);
  if (age > PRESENCE_GONE_MS) return 'offline';
  if (state === 'idle') return 'idle';
  if (age > PRESENCE_STALE_MS) return 'idle';
  return state || 'online';
}

// Backgrounding (hidden / pagehide / pageshow from bfcache) must never
// delete the presence doc or the lobby. A missing doc is what made ZUJMNP
// look host-less and then "not found".
export function shouldDeletePresenceDoc({ reason } = {}) {
  return reason === 'explicit-leave';
}

// Auth eject / Sign In after a backgrounded tab is not Exit. Keep the
// presence doc so failover does not treat the host as gone (B25).
export function presenceStopReason({ explicitLeave = false } = {}) {
  return explicitLeave ? 'explicit-leave' : 'session-lost';
}

export function presenceStateForVisibility(visibilityState) {
  return visibilityState === 'visible' ? 'online' : 'idle';
}

export function shouldHeartbeatNow({ event } = {}) {
  return event === 'visibility-visible'
    || event === 'pageshow'
    || event === 'interval';
}

// Resume (visible / pageshow, including bfcache) must heartbeat now.
export function shouldResumeSnapshots({ event } = {}) {
  return event === 'visibility-visible' || event === 'pageshow';
}

// Re-attach only when the listener is dead. A live unsubscribe must not
// get a second onSnapshot (dual writer / duplicate apply).
export function shouldReplaceSnapshotListener({
  hasUnsubscribe = false,
  listenerErrored = false,
  persistedPageShow = false,
} = {}) {
  if (persistedPageShow) return true;
  if (listenerErrored) return true;
  if (!hasUnsubscribe) return true;
  return false;
}

// A backgrounded host is idle, not gone. Idle must not start the 90s
// host-failover clock by itself.
export function shouldAccumulateHostOfflineMs({ hostPresence } = {}) {
  return hostPresence === 'offline';
}

export function shouldStartHostFailover({
  hostPresence = 'offline',
  offlineForMs = 0,
  graceMs = 90000,
} = {}) {
  if (!shouldAccumulateHostOfflineMs({ hostPresence })) return false;
  return Number(offlineForMs) >= Number(graceMs);
}

// A single permission-denied / network blip is not a sign-out.
// Eject only when the session is actually gone.
export function shouldEjectFromMatch({
  authUserPresent = false,
  tokenValid = false,
  confirmedSignOut = false,
} = {}) {
  if (confirmedSignOut) return true;
  if (authUserPresent && tokenValid) return false;
  if (authUserPresent) return false;
  return !tokenValid;
}

export const MY_GAMES_ACTIVE_STATUSES = ['active', 'starting'];

export function isMyGamesActiveStatus(status) {
  return MY_GAMES_ACTIVE_STATUSES.includes(status);
}

// Token hiccup after Sign In must still list games. Wiping the list here
// is how B25 showed "No active games found" while Bastion stayed signed in.
export function shouldAbortMyGamesOnTokenHiccup({
  authUserPresent = false,
  tokenValid = false,
} = {}) {
  if (authUserPresent) return false;
  return !tokenValid;
}

export function mergeMyActiveGames({ bySeat = [], byStarter = [] } = {}) {
  const byId = new Map();
  for (const game of [...bySeat, ...byStarter]) {
    if (!game?.id) continue;
    if (!isMyGamesActiveStatus(game.status)) continue;
    byId.set(game.id, game);
  }
  return [...byId.values()];
}

// Empty [] is truthy — do not treat it as "not seated". B25: host Sign In
// then join ZUJMNP must land in the live game.
export function isSeatedInStartedGame({ game, lobby, userId } = {}) {
  if (!userId) return false;
  if (!game && !lobby) return false;

  const ids = game?.playerUserIds;
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.includes(userId);
  }

  const lobbyPlayers = lobby?.players || game?.lobbyData?.players || [];
  if (lobbyPlayers.some((p) => p && p.oderId === userId)) return true;
  if (game?.startedBy === userId) return true;
  if (lobby?.hostId === userId) return true;
  return !!game;
}

// Join-by-code: a started match is still the same code. Waiting lobby
// first; otherwise any lobby/game with that code.
export function resolveJoinByCode({ waitingLobby, anyLobby, startedGame, userId } = {}) {
  if (waitingLobby) return { kind: 'lobby', lobby: waitingLobby };
  if (startedGame && isSeatedInStartedGame({
    game: startedGame,
    lobby: anyLobby,
    userId,
  })) {
    return { kind: 'game', game: startedGame };
  }
  if (anyLobby && anyLobby.status && anyLobby.status !== 'waiting') {
    return { kind: 'started-lobby', lobby: anyLobby };
  }
  return { kind: 'not-found' };
}

export function shouldDeleteLobbyOnHostLeave({ lobbyStatus, remainingHumans = 0 } = {}) {
  if (lobbyStatus && lobbyStatus !== 'waiting') return false;
  return remainingHumans <= 0;
}

// Surrender is an explicit Leave control. A game-row / join tap / title
// tap must never open the leave confirm (B23).
export function isLeaveControlTarget(eventTarget) {
  if (!eventTarget || typeof eventTarget.closest !== 'function') return false;
  return !!eventTarget.closest('[data-leave-game]');
}

export function shouldOpenLeaveConfirm({
  clickOnLeaveControl = false,
  eventTarget = null,
} = {}) {
  if (!clickOnLeaveControl) return false;
  if (eventTarget) return isLeaveControlTarget(eventTarget);
  return true;
}

// Row title / join hit target must resume the match. Leave is a sibling.
export function shouldJoinGameFromRowClick({ eventTarget = null } = {}) {
  if (!eventTarget || typeof eventTarget.closest !== 'function') return false;
  if (isLeaveControlTarget(eventTarget)) return false;
  return !!eventTarget.closest('[data-role="join-game"]');
}
