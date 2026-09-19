// Shared d6 roller. Every gameplay die (combat, AA, bombard, sub strike,
// tech, rocket) must go through rollD6 / createDiceRoller. Cosmetic
// animation flicker may still use Math.random — those faces are not scored.
//
// Gameplay is UNCHANGED: still an unseeded Math.random() d6. There is no
// seeding in production. Tests may inject rng.

export const DIE_SIDES = 6;
export const DEFAULT_ROLL_LOG_CAP = 500;

export function faceFromUnit(unit) {
  const n = Number(unit);
  if (!Number.isFinite(n)) return 1;
  return Math.min(DIE_SIDES, Math.max(1, Math.floor(n * DIE_SIDES) + 1));
}

export function createDiceRoller({
  rng = null,
  maxLog = DEFAULT_ROLL_LOG_CAP,
  onRoll = null,
} = {}) {
  const log = [];

  function roll(context = 'combat', meta = {}) {
    // Resolve rng at roll time so test stubs of Math.random still work.
    // An injected rng (unit tests) wins; otherwise use the live Math.random.
    const pick = typeof rng === 'function' ? rng : Math.random;
    const unit = pick();
    const face = faceFromUnit(unit);
    const entry = {
      t: Date.now(),
      context: String(context || 'combat'),
      face,
    };
    if (meta && typeof meta === 'object') {
      if (meta.territory) entry.territory = meta.territory;
      if (meta.playerId) entry.playerId = meta.playerId;
    }
    log.push(entry);
    if (log.length > maxLog) log.splice(0, log.length - maxLog);
    if (typeof onRoll === 'function') {
      try { onRoll(entry); } catch { /* never break combat */ }
    }
    return face;
  }

  return {
    roll,
    getLog() { return log.slice(); },
    clear() { log.length = 0; },
    get size() { return log.length; },
  };
}

const listeners = [];
const shared = createDiceRoller({
  onRoll(entry) {
    for (const fn of listeners) {
      try { fn(entry); } catch { /* ignore */ }
    }
  },
});

export function rollD6(context = 'combat', meta = {}) {
  return shared.roll(context, meta);
}

export function getSharedRoller() {
  return shared;
}

export function getRollLog() {
  return shared.getLog();
}

export function onDieRolled(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
