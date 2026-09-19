// Preview-only gate. Live Canvas at / stays untouched.
// Accepts ?three=1 (legacy Three preview) or ?ux=1 (this hybrid).

const ON = new Set(['1', 'true', 'yes']);
const MAX_DEMO = new Set(['max', 'fat', 'big']);

export function isUxPreviewRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  const three = String(params.get('three') || '').toLowerCase();
  const ux = String(params.get('ux') || '').toLowerCase();
  return ON.has(three) || ON.has(ux);
}

// Fat Karelia → Ukraine battle. ?max=1, ?stress=1, or ?demo=max
export function isMaxBattleRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  const max = String(params.get('max') || '').toLowerCase();
  const stress = String(params.get('stress') || '').toLowerCase();
  const demo = String(params.get('demo') || '').toLowerCase();
  return ON.has(max) || ON.has(stress) || MAX_DEMO.has(demo);
}

// Full local vs-AI game on the Three shell. No lobby / Firebase.
// ?three=1&solo=1  (solo wins if max=1 is also set)
export function isSoloRequested(search = typeof location !== 'undefined' ? location.search : '') {
  if (!isUxPreviewRequested(search)) return false;
  const params = new URLSearchParams(search);
  return ON.has(String(params.get('solo') || '').toLowerCase());
}

export function soloSeatRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  return String(params.get('seat') || '').trim();
}

export function soloAiRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const raw = String(new URLSearchParams(search).get('ai') || '').toLowerCase();
  if (raw === 'easy' || raw === 'medium' || raw === 'hard') return raw;
  return 'medium';
}

export function stripPreviewParams(href = typeof location !== 'undefined' ? location.href : 'http://localhost/') {
  const url = new URL(href, 'http://localhost/');
  url.searchParams.delete('three');
  url.searchParams.delete('ux');
  return url.toString();
}
