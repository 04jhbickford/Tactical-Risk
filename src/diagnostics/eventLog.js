// In-memory ring + optional cloud sink. Gameplay never waits on Firestore.
// bindEventLogContext() is called from main.js once a multiplayer game id
// is known. Solo / tests still record locally so unit checks can inspect.

import { EVENT_RETENTION_CAP, normalizeEvent } from './eventSchema.js';

const LOCAL_CAP = 400;

function resolveContextValue(value) {
  if (typeof value === 'function') {
    try { return value(); } catch { return null; }
  }
  return value ?? null;
}

export function createEventLog({ maxLocal = LOCAL_CAP } = {}) {
  const local = [];
  let context = {};
  let sink = null;
  let seq = 0;

  function currentContext() {
    return {
      gameId: resolveContextValue(context.gameId),
      joinCode: resolveContextValue(context.joinCode),
      lobbyName: resolveContextValue(context.lobbyName),
      turn: resolveContextValue(context.turn),
      turnPhase: resolveContextValue(context.turnPhase),
      playerId: resolveContextValue(context.playerId),
      territory: resolveContextValue(context.territory),
    };
  }

  function append(raw = {}) {
    seq += 1;
    const event = normalizeEvent({ ...raw, ts: raw.ts || Date.now() }, currentContext());
    event.seq = seq;
    local.push(event);
    if (local.length > maxLocal) local.splice(0, local.length - maxLocal);
    if (typeof sink === 'function') {
      try {
        const result = sink(event);
        if (result && typeof result.then === 'function') {
          result.catch(() => {});
        }
      } catch {
        // fail-soft: never throw into combat / phase advance
      }
    }
    return event;
  }

  return {
    append,
    getLocal() { return local.slice(); },
    getLocalCap() { return maxLocal; },
    bindContext(next = {}) { context = { ...context, ...next }; },
    getContext: currentContext,
    attachSink(fn) { sink = fn; },
    detachSink() { sink = null; },
    reset() {
      local.length = 0;
      seq = 0;
      context = {};
      sink = null;
    },
  };
}

export const eventLog = createEventLog();

export function emitGameEvent(raw) {
  return eventLog.append(raw);
}

export function bindEventLogContext(next) {
  eventLog.bindContext(next);
}

export function attachCloudEventSink(fn) {
  eventLog.attachSink(fn);
}

export function detachCloudEventSink() {
  eventLog.detachSink();
}

export function getLocalEventLog() {
  return eventLog.getLocal();
}

export { EVENT_RETENTION_CAP };
