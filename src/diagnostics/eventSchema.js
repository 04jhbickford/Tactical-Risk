// Append-only cloud game-log schema (independent of SCHEMA_VERSION).
// Event documents live at games/{gameId}/events/{eventId}.
// Additive field changes bump EVENT_SCHEMA_VERSION only when a required
// field is renamed or a kind is retired. New optional payload keys are fine.

export const EVENT_SCHEMA_VERSION = 1;

// Last ~5000 events per game. Older docs are pruned by the writing client.
export const EVENT_RETENTION_CAP = 5000;
export const EVENT_PRUNE_BATCH = 80;

export const EVENT_KINDS = Object.freeze({
  PHASE: 'phase',
  MOVE: 'move',
  AA: 'aa',
  COMBAT: 'combat',
  LOSSES: 'losses',
  IPC: 'ipc',
  QUEUE_EXIT: 'queue_exit',
  SOFTLOCK_EXIT: 'softlock_exit',
  CLIENT_ERROR: 'client_error',
  ROCKET: 'rocket',
  TECH: 'tech',
});

export const EVENT_KIND_LIST = Object.freeze(Object.values(EVENT_KINDS));

const KIND_SET = new Set(EVENT_KIND_LIST);

export function isKnownEventKind(kind) {
  return KIND_SET.has(kind);
}

function asString(value, fallback = null) {
  if (value == null || value === '') return fallback;
  return String(value);
}

function asInt(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asFaces(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 48).map((n) => {
    const face = Number(n);
    return Number.isFinite(face) ? face : 0;
  });
}

// Flatten query fields onto the document root so Arc can filter without
// composite-inequality indexes. Payload stays kind-specific and optional.
export function normalizeEvent(raw = {}, context = {}) {
  const kind = isKnownEventKind(raw.kind) ? raw.kind : asString(raw.kind, 'client_error');
  const ts = asInt(raw.ts, Date.now());
  const gameId = asString(raw.gameId ?? context.gameId);
  const joinCode = asString(raw.joinCode ?? context.joinCode);
  const lobbyName = asString(raw.lobbyName ?? context.lobbyName);
  const turn = asInt(raw.turn ?? context.turn, null);
  const turnPhase = asString(raw.turnPhase ?? context.turnPhase);
  const territory = asString(raw.territory ?? context.territory);
  const playerId = asString(raw.playerId ?? context.playerId);
  const faces = asFaces(raw.faces ?? raw.rolls);

  const event = {
    v: EVENT_SCHEMA_VERSION,
    kind,
    ts,
    gameId,
    joinCode,
    lobbyName,
    turn,
    turnPhase,
    territory,
    playerId,
  };

  if (faces.length) event.faces = faces;
  if (raw.hits != null) event.hits = raw.hits;
  if (raw.payload && typeof raw.payload === 'object') {
    event.payload = raw.payload;
  } else {
    const payload = {};
    for (const [key, value] of Object.entries(raw)) {
      if (['v', 'kind', 'ts', 'gameId', 'joinCode', 'lobbyName', 'turn',
        'turnPhase', 'territory', 'playerId', 'faces', 'rolls', 'hits',
        'payload'].includes(key)) continue;
      payload[key] = value;
    }
    if (Object.keys(payload).length) event.payload = payload;
  }

  return event;
}

export function assertAppendOnly(update) {
  if (update && Object.keys(update).length > 0) {
    throw new Error('events are append-only');
  }
}
