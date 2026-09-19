// Local-only solo autosave. Dedicated keys so Three vs-AI never clobbers
// the lobby / hotseat `tacticalRisk_autoSave` slot. No Firebase.

export const SOLO_SAVE_KEY = 'tacticalRisk_soloAutoSave';
export const SOLO_SAVE_TIME_KEY = 'tacticalRisk_soloAutoSave_time';
export const SOLO_SAVE_KIND = 'solo-classic';

function storage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function hasSoloSave() {
  const ls = storage();
  return !!(ls && ls.getItem(SOLO_SAVE_KEY));
}

export function readSoloSave() {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(SOLO_SAVE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw);
    if (!envelope || envelope.kind !== SOLO_SAVE_KIND || !envelope.state) return null;
    if (envelope.state.gameMode && envelope.state.gameMode !== 'classic') return null;
    return envelope;
  } catch (err) {
    console.warn('Solo autosave read failed:', err);
    return null;
  }
}

export function writeSoloSave({ gameState, seatId, aiLevel } = {}) {
  const ls = storage();
  if (!ls || !gameState?.toJSON) return false;
  try {
    const envelope = {
      kind: SOLO_SAVE_KIND,
      seatId: seatId || null,
      aiLevel: aiLevel || 'medium',
      savedAt: new Date().toISOString(),
      state: gameState.toJSON(),
    };
    ls.setItem(SOLO_SAVE_KEY, JSON.stringify(envelope));
    ls.setItem(SOLO_SAVE_TIME_KEY, envelope.savedAt);
    return true;
  } catch (err) {
    console.warn('Solo autosave write failed:', err);
    return false;
  }
}

export function clearSoloSave() {
  const ls = storage();
  if (!ls) return;
  ls.removeItem(SOLO_SAVE_KEY);
  ls.removeItem(SOLO_SAVE_TIME_KEY);
}

export function soloNewGameHref(href = typeof location !== 'undefined' ? location.href : 'http://localhost/?three=1&solo=1') {
  const url = new URL(href, 'http://localhost/');
  url.searchParams.set('three', '1');
  url.searchParams.set('solo', '1');
  url.searchParams.delete('max');
  url.searchParams.delete('stress');
  url.searchParams.delete('demo');
  return `${url.pathname}${url.search}${url.hash}`;
}
