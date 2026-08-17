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
