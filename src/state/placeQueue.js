// Initial-deploy / mobilize queue math. One tap = one row, ±1.
// Commit happens only on Deploy — the queue is not game state.

export function queuedCount(queue = {}) {
  return Object.values(queue).reduce((sum, q) => sum + (Number(q) || 0), 0);
}

export function applyPlaceQueueDelta({
  queue = {},
  unitType,
  delta = 0,
  available = 0,
  slotsRemaining = 0,
} = {}) {
  const nextQueue = { ...queue };
  if (!unitType) return nextQueue;
  const current = Number(queue[unitType]) || 0;
  const others = queuedCount(queue) - current;
  const maxForRow = Math.min(
    Math.max(0, Number(available) || 0),
    Math.max(0, (Number(slotsRemaining) || 0) - others),
  );
  const next = Math.max(0, Math.min(maxForRow, current + Number(delta)));
  nextQueue[unitType] = next;
  return nextQueue;
}

// + at the round cap must no-op. It must not decrement another staged type.
export function canAddToPlaceQueue({
  queue = {},
  unitType,
  available = 0,
  slotsRemaining = 0,
} = {}) {
  const current = Number(queue[unitType]) || 0;
  const next = applyPlaceQueueDelta({
    queue, unitType, delta: 1, available, slotsRemaining,
  });
  return (Number(next[unitType]) || 0) > current;
}

export function expandPlaceQueue(queue = {}) {
  const out = [];
  for (const [type, qty] of Object.entries(queue || {})) {
    const n = Number(qty) || 0;
    for (let i = 0; i < n; i++) out.push(type);
  }
  return out;
}

// Max fills THIS row only, up to remaining slots this round (not other types).
export function applyPlaceQueueMax({
  queue = {},
  unitType,
  available = 0,
  slotsRemaining = 0,
} = {}) {
  return applyPlaceQueueDelta({
    queue,
    unitType,
    delta: Number.POSITIVE_INFINITY,
    available,
    slotsRemaining,
  });
}

export function shouldResetDeployedThisRound({
  prevPlayerId,
  nextPlayerId,
  remotePlacedThisRound,
} = {}) {
  if (prevPlayerId && nextPlayerId && prevPlayerId !== nextPlayerId) return true;
  if (remotePlacedThisRound === 0) return true;
  return false;
}
