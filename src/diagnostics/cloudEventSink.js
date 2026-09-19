// Firestore append-only writer for games/{gameId}/events.
// Browser main.js injects the Firebase CDN functions. This module stays
// Node-importable so tools/test-diagnostics.mjs can mock the sink.
// Uses addDoc (never update). Periodic prune keeps the last EVENT_RETENTION_CAP
// events. Fail-closed: missing db/gameId → no-op.

import { EVENT_PRUNE_BATCH, EVENT_RETENTION_CAP } from './eventSchema.js';

export const EVENTS_SUBCOLLECTION = 'events';

export function eventsCollectionPath(gameId) {
  return ['games', gameId, EVENTS_SUBCOLLECTION];
}

export function shouldPruneAfterAppend(appendCount, cap = EVENT_RETENTION_CAP) {
  if (!Number.isFinite(appendCount) || appendCount <= 0) return false;
  if (appendCount % 40 === 0) return true;
  return appendCount > cap;
}

export function createCloudEventSink({
  db,
  gameId,
  addDoc,
  collection,
  getCountFromServer,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  retentionCap = EVENT_RETENTION_CAP,
} = {}) {
  let appendCount = 0;
  let pruning = false;

  async function prune() {
    if (pruning || !db || !gameId) return;
    if (typeof collection !== 'function' || typeof getDocs !== 'function') return;
    pruning = true;
    try {
      const col = collection(db, 'games', gameId, EVENTS_SUBCOLLECTION);
      let count = null;
      if (typeof getCountFromServer === 'function') {
        try {
          const snap = await getCountFromServer(col);
          count = typeof snap?.data === 'function' ? snap.data().count : snap?.count;
        } catch {
          count = null;
        }
      }
      if (count != null && count <= retentionCap) return;
      const extra = count == null
        ? EVENT_PRUNE_BATCH
        : Math.min(EVENT_PRUNE_BATCH, Math.max(0, count - retentionCap));
      if (extra <= 0) return;
      const oldest = await getDocs(query(col, orderBy('ts', 'asc'), limit(extra)));
      if (oldest.empty) return;
      if (typeof writeBatch !== 'function') return;
      const batch = writeBatch(db);
      oldest.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    } catch {
      // fail-soft
    } finally {
      pruning = false;
    }
  }

  return async function sink(event) {
    if (!db || !gameId || !event) return { written: false, reason: 'missing-db' };
    if (typeof addDoc !== 'function' || typeof collection !== 'function') {
      return { written: false, reason: 'missing-fns' };
    }
    appendCount += 1;
    try {
      const col = collection(db, 'games', gameId, EVENTS_SUBCOLLECTION);
      await addDoc(col, event);
    } catch {
      return { written: false, reason: 'write-denied' };
    }
    if (shouldPruneAfterAppend(appendCount, retentionCap)) {
      prune();
    }
    return { written: true };
  };
}
