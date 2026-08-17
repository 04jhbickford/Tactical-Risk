// Pure placement-pass helpers. No Firebase. Used by GameState and harnesses
// so Done / rejoin / leftover-unit rules stay one source of truth.

export function knownUnitsToPlace(unitsToPlace, unitDefs) {
  return (Array.isArray(unitsToPlace) ? unitsToPlace : []).filter(u => {
    if (!u || !(u.quantity > 0)) return false;
    if (!unitDefs) return true;
    return !!unitDefs[u.type];
  });
}

export function countKnownUnitsToPlace(unitsToPlace, unitDefs) {
  return knownUnitsToPlace(unitsToPlace, unitDefs)
    .reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
}

// Done is legal when the round cap is hit, nothing known remains, or
// nothing remaining can legally be placed (ghost / landlocked leftover).
export function canFinishPlacementRound({
  placedThisRound = 0,
  limit = 6,
  remainingKnown = 0,
  hasPlaceable = false,
} = {}) {
  return Number(placedThisRound) >= Number(limit)
    || Number(remainingKnown) <= 0
    || !hasPlaceable;
}

// After a committed Done, the next actor is the next non-skipped player
// who still has a known placeable unit. If nobody does, play begins.
export function resolveNextPlacementSeat({
  currentPlayerIndex = 0,
  playerCount = 0,
  placementRound = 0,
  canPlaceAt,
} = {}) {
  const n = Number(playerCount) || 0;
  if (n <= 0) {
    return { currentPlayerIndex: 0, placementRound, phase: 'playing' };
  }
  let index = Number(currentPlayerIndex) || 0;
  let round = Number(placementRound) || 0;
  let found = false;
  for (let i = 0; i < n; i++) {
    index += 1;
    if (index >= n) {
      index = 0;
      round += 1;
    }
    if (typeof canPlaceAt === 'function' ? canPlaceAt(index) : true) {
      found = true;
      break;
    }
  }
  if (!found) {
    return { currentPlayerIndex: index, placementRound: round, phase: 'playing' };
  }
  return { currentPlayerIndex: index, placementRound: round, phase: 'unit_placement' };
}

// Rejoin: remote JSON is authority. A local-only pass that never wrote
// must not win. A committed pass (newer remote seat) must win.
export function pickAuthoritativePlacementSnapshot({
  remote,
  local,
  remoteVersion = 0,
  localVersion = 0,
} = {}) {
  if (!remote) return local || null;
  if (!local) return remote;
  if (Number(remoteVersion) !== Number(localVersion)) {
    return Number(remoteVersion) > Number(localVersion) ? remote : local;
  }
  return remote;
}

// Point-in-time copy so a Done/place write cannot share a live
// unitsToPlace reference that another client never sees decrement.
export function cloneUnitsToPlace(unitsToPlace) {
  const src = unitsToPlace && typeof unitsToPlace === 'object' ? unitsToPlace : {};
  const out = {};
  for (const [playerId, rows] of Object.entries(src)) {
    out[playerId] = (Array.isArray(rows) ? rows : []).map((u) => ({
      type: u?.type,
      quantity: Number(u?.quantity) || 0,
    }));
  }
  return out;
}

export function remainingDeployByPlayer(unitsToPlace, playerIds, unitDefs) {
  const ids = Array.isArray(playerIds) ? playerIds : Object.keys(unitsToPlace || {});
  const out = {};
  for (const id of ids) {
    out[id] = countKnownUnitsToPlace(unitsToPlace?.[id], unitDefs);
  }
  return out;
}

// Guest must apply the remote doc when the seat changes even if
// stateVersion did not bump — otherwise currentPlayer flips and
// unitsToPlace stays at the starting 25.
export function shouldApplyRemoteGameState({
  remoteVersion = 0,
  localVersion = 0,
  remoteCurrentPlayerId = null,
  localCurrentPlayerId = null,
  force = false,
} = {}) {
  if (force) return true;
  if (Number(remoteVersion) > Number(localVersion)) return true;
  if (remoteCurrentPlayerId && remoteCurrentPlayerId !== localCurrentPlayerId) {
    return true;
  }
  return false;
}

// Sync debug / push labels must advertise game phase, never leftover turnPhase.
export function syncPushPhaseLabel(phase, _turnPhase) {
  void _turnPhase;
  return phase || null;
}
