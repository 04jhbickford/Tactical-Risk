// Last-played match — local, no Firebase.
// A backgrounded host can lose the session while the guest stays in the
// live game (B25 confirmed: James still in ZUJMNP). My Games / join-by-code
// must still find that game. The 6-char code + gameId live here so every
// tab on this browser can Rejoin without a composite index.

export const LAST_MATCH_KEY = 'tacticalRisk_lastMatch';

export function resolveLobbyCodeFromGameDoc(doc = {}) {
  const raw = doc?.lobbyCode || doc?.lobbyData?.code || doc?.code || null;
  if (!raw) return null;
  const code = String(raw).toUpperCase();
  return /^[A-Z2-9]{6}$/.test(code) ? code : null;
}

export function readLastMatch(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(LAST_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lobbyCode = resolveLobbyCodeFromGameDoc(parsed);
    if (!parsed?.gameId && !lobbyCode) return null;
    return {
      gameId: parsed.gameId || null,
      lobbyCode,
      hostName: parsed.hostName || null,
    };
  } catch {
    return null;
  }
}

export function rememberLastMatch({
  gameId = null,
  lobbyCode = null,
  hostName = null,
} = {}, storage = globalThis.localStorage) {
  if (!storage?.setItem) return null;
  const code = resolveLobbyCodeFromGameDoc({ lobbyCode, code: lobbyCode });
  if (!gameId && !code) return null;
  const next = {
    gameId: gameId || null,
    lobbyCode: code,
    hostName: hostName || null,
    at: Date.now(),
  };
  storage.setItem(LAST_MATCH_KEY, JSON.stringify(next));
  return next;
}

export function forgetLastMatch(storage = globalThis.localStorage) {
  try {
    storage?.removeItem?.(LAST_MATCH_KEY);
  } catch {
    // ignore
  }
}

export function lastMatchForJoinCode({ lastMatch = null, code = null } = {}) {
  if (!lastMatch || !code) return null;
  const want = String(code).toUpperCase();
  if (lastMatch.lobbyCode && lastMatch.lobbyCode === want) return lastMatch;
  return null;
}

export function mergeLastMatchIntoMyGames({ games = [], lastMatchGame = null } = {}) {
  if (!lastMatchGame?.id) return games;
  if (games.some((g) => g.id === lastMatchGame.id)) return games;
  const status = lastMatchGame.status;
  if (status && status !== 'active' && status !== 'starting') return games;
  return [lastMatchGame, ...games];
}

// Query miss / token hiccup must still list the live match. A stub from
// lastMatch is enough for Resume — startMultiplayerGame loads the doc.
export function stubGameFromLastMatch(lastMatch = null) {
  if (!lastMatch?.gameId) return null;
  return {
    id: lastMatch.gameId,
    status: 'active',
    lobbyCode: lastMatch.lobbyCode || null,
    lobbyData: { code: lastMatch.lobbyCode || null, players: [] },
  };
}

export function recoverMyGamesOnLoad({
  games = [],
  lastMatchGame = null,
  lastMatch = null,
} = {}) {
  let next = mergeLastMatchIntoMyGames({ games, lastMatchGame });
  if (next.some((g) => g.id === lastMatch?.gameId)) return next;
  const stub = stubGameFromLastMatch(lastMatch);
  if (stub) return mergeLastMatchIntoMyGames({ games: next, lastMatchGame: stub });
  return next;
}

export function shouldWipeMyGamesOnError({ lastMatch = null } = {}) {
  return !(lastMatch?.gameId || lastMatch?.lobbyCode);
}

export function shouldForgetLastMatchOnBackground() {
  return false;
}

// Never the string "Lobby not found" — that is how ZUJMNP died after Sign In.
export function resolveJoinNotFoundError({ lastMatch = null, code = null } = {}) {
  const remembered = lastMatchForJoinCode({ lastMatch, code });
  const upper = code ? String(code).toUpperCase() : null;
  if (remembered || (lastMatch?.lobbyCode && lastMatch.lobbyCode === upper)) {
    return `Still in ${upper} — the match is live. Open My Games or tap Rejoin.`;
  }
  return 'No waiting lobby with that code. If the match already started, open My Games — it stays listed there.';
}

// Guest-facing copy. Idle / missing host is "reconnecting", not "game over".
export function resolveHostReconnectCopy({
  hostPresence = 'online',
  hostName = 'Host',
  gameCode = null,
} = {}) {
  if (!hostPresence || hostPresence === 'online') return null;
  const who = hostName || 'Host';
  const code = gameCode || 'this match';
  if (hostPresence === 'idle') {
    return `${who} is away — stay in ${code}. They can rejoin; the game is still here.`;
  }
  return `${who} is reconnecting — you are still in ${code}. Do not leave.`;
}

export function shouldShowHostReconnect({ hostPresence } = {}) {
  return hostPresence === 'idle' || hostPresence === 'offline';
}

// Session-lost must not dump the game view to home / Create Game (B27).
// Only Exit or confirmed Leave leave the table.
export function shouldLeaveGameView({
  explicitExit = false,
  confirmedLeave = false,
  sessionLost = false,
} = {}) {
  if (explicitExit || confirmedLeave) return true;
  if (sessionLost) return false;
  return false;
}

// Exclusive MP menu cards. Join by Code must never open My Games (B26).
export function resolveMenuCardAction(action) {
  if (action === 'join-by-code' || action === 'join') return 'join-by-code';
  if (action === 'my-games' || action === 'rejoin') return 'my-games';
  if (action === 'create') return 'create';
  if (action === 'browse') return 'browse';
  return null;
}

export function shouldOpenJoinByCode(action) {
  return resolveMenuCardAction(action) === 'join-by-code';
}

export function shouldOpenMyGames(action) {
  return resolveMenuCardAction(action) === 'my-games';
}

// B37: browser autocomplete treated Game Code as a name (BICKFO) and
// the lobby password as a saved login. Off + unique names; never prefill.
// Reload of a signed-in tab must open the live match, not home (B38).
export function shouldAutoResumeLastMatch({
  signedIn = false,
  lastMatch = null,
  explicitExit = false,
} = {}) {
  if (explicitExit) return false;
  if (!signedIn) return false;
  return !!(lastMatch?.gameId || lastMatch?.lobbyCode);
}

// Failed resume of a live code must not dump to Create Game (B38/B40).
export function resolveResumeFailureView({
  resumed = false,
  lastMatch = null,
} = {}) {
  if (resumed) return 'game';
  if (lastMatch?.gameId || lastMatch?.lobbyCode) return 'reconnect';
  return 'home';
}

export function shouldPrefillJoinCodeFromLastMatch() {
  return false;
}

export function joinFormFieldAttrs(kind) {
  if (kind === 'password') {
    return {
      autocomplete: 'off',
      name: 'tr-join-lobby-secret',
    };
  }
  return {
    autocomplete: 'off',
    name: 'tr-join-lobby-code',
    autocorrect: 'off',
    spellcheck: 'false',
  };
}

export function joinFormFieldAttrString(kind) {
  const attrs = joinFormFieldAttrs(kind);
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
}
