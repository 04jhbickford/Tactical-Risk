// Local-only Three lobby. No Firebase. Preview / hybrid only.

export const LOBBY_DIFFICULTIES = ['easy', 'medium', 'hard'];
export const LOBBY_MODES = ['classic', 'risk'];

const ON = new Set(['1', 'true', 'yes']);

export function factionsOf(setup) {
  return setup?.classic?.factions || setup?.factions || [];
}

export function parseSoloLobbySearch(search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const mode = params.get('mode') === 'risk' ? 'risk' : 'classic';
  const difficulty = LOBBY_DIFFICULTIES.includes(params.get('diff'))
    ? params.get('diff')
    : 'medium';
  const seat = params.get('seat') || params.get('faction') || 'Russians';
  const ai = Number(params.get('ai'));
  return {
    mode,
    humanSeat: seat,
    aiCount: Number.isFinite(ai) && ai > 0 ? ai : (mode === 'risk' ? 3 : 4),
    difficulty,
    skip: ON.has(String(params.get('go') || '').toLowerCase())
      || ON.has(String(params.get('autostart') || '').toLowerCase()),
  };
}

export function createSoloLobby(setup, search = '') {
  const factions = factionsOf(setup);
  const parsed = parseSoloLobbySearch(search);
  const humanSeat = factions.some((f) => f.id === parsed.humanSeat)
    ? parsed.humanSeat
    : (factions[0]?.id || 'Russians');
  const maxAi = Math.max(1, factions.length - 1);
  const aiCount = Math.max(1, Math.min(maxAi, parsed.aiCount));
  return {
    open: !parsed.skip,
    mode: parsed.mode,
    humanSeat,
    aiCount: parsed.mode === 'classic' ? maxAi : aiCount,
    difficulty: parsed.difficulty,
    factions,
  };
}

export function setLobbyMode(lobby, mode) {
  if (!LOBBY_MODES.includes(mode)) return lobby;
  lobby.mode = mode;
  const maxAi = Math.max(1, (lobby.factions || []).length - 1);
  if (mode === 'classic') lobby.aiCount = maxAi;
  else lobby.aiCount = Math.max(1, Math.min(maxAi, lobby.aiCount || 3));
  return lobby;
}

export function setLobbySeat(lobby, seat) {
  if ((lobby.factions || []).some((f) => f.id === seat)) lobby.humanSeat = seat;
  return lobby;
}

export function setLobbyAiCount(lobby, delta) {
  if (lobby.mode === 'classic') return lobby;
  const maxAi = Math.max(1, (lobby.factions || []).length - 1);
  const next = (Number(lobby.aiCount) || 1) + Number(delta || 0);
  lobby.aiCount = Math.max(1, Math.min(maxAi, next));
  return lobby;
}

export function setLobbyDifficulty(lobby, difficulty) {
  if (LOBBY_DIFFICULTIES.includes(difficulty)) lobby.difficulty = difficulty;
  return lobby;
}

export function lobbyCanStart(lobby) {
  return !!(lobby?.humanSeat && Number(lobby.aiCount) >= 1);
}

export function lobbyStartOptions(lobby) {
  return {
    mode: lobby.mode === 'risk' ? 'risk' : 'classic',
    humanSeat: lobby.humanSeat,
    aiCount: Number(lobby.aiCount) || 4,
    aiDifficulty: lobby.difficulty || 'medium',
  };
}

export function lobbyInspect(lobby) {
  return {
    open: !!lobby?.open,
    mode: lobby?.mode || 'classic',
    humanSeat: lobby?.humanSeat || null,
    aiCount: Number(lobby?.aiCount) || 0,
    difficulty: lobby?.difficulty || 'medium',
    canStart: lobbyCanStart(lobby),
  };
}
