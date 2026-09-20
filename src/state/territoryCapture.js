// Shared land-capture rules. Air cannot hold ground. Factories / AA do
// not block a win — they transfer with the hex. Used by GameState and
// combat dequeue so a won fight cannot skip the owner flip.

export const LAND_CAPTURE_TYPES = new Set(['infantry', 'armour', 'artillery']);

export function unitCanCaptureLand(unit, unitDefs = {}) {
  if (!unit || !(Number(unit.quantity) > 0)) return false;
  if (unit.type === 'aaGun' || unit.type === 'factory') return false;
  const def = unitDefs?.[unit.type];
  if (def) return !!def.isLand && !def.isAir && !def.isSea;
  return LAND_CAPTURE_TYPES.has(unit.type);
}

export function isBlockingEnemyCombatUnit(unit, playerId, areAllies = () => false, unitDefs = {}) {
  if (!unit || !(Number(unit.quantity) > 0)) return false;
  if (!unit.owner || unit.owner === playerId) return false;
  if (typeof areAllies === 'function' && areAllies(playerId, unit.owner)) return false;
  if (unit.type === 'factory' || unit.type === 'aaGun') return false;
  const def = unitDefs?.[unit.type];
  if (def && def.attack === 0 && def.defense === 0) return false;
  return true;
}

export function shouldCaptureOccupiedTerritory({
  territoryName,
  isWater = false,
  currentOwner = null,
  playerId,
  units = [],
  unitDefs = {},
  areAllies = () => false,
  force = false,
} = {}) {
  if (!territoryName || !playerId || isWater) return false;
  if (currentOwner === playerId) return false;
  if (currentOwner && typeof areAllies === 'function' && areAllies(playerId, currentOwner)) {
    return false;
  }
  const list = Array.isArray(units) ? units : [];
  if (list.some((unit) => isBlockingEnemyCombatUnit(unit, playerId, areAllies, unitDefs))) {
    return false;
  }
  // Tank blitz: capture an empty enemy hex the stack passed through.
  if (force) return true;
  if (!list.some((unit) => unit?.owner === playerId && unitCanCaptureLand(unit, unitDefs))) {
    return false;
  }
  return true;
}
