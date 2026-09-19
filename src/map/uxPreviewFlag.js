// Preview-only gate. Live Canvas at / stays untouched.
// Accepts ?three=1 (legacy Three preview) or ?ux=1 (this hybrid).
// ?demo=max seeds the maxed both-sides combat stress pocket.

const ON = new Set(['1', 'true', 'yes']);
const MAX_DEMO = new Set(['max', 'maxed', 'max-both-sides', 'stress-combat']);

export const DEFAULT_DEMO_ID = 'karelia-finland-air';
export const MAX_DEMO_ID = 'max-both-sides';

export function isUxPreviewRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  const three = String(params.get('three') || '').toLowerCase();
  const ux = String(params.get('ux') || '').toLowerCase();
  return ON.has(three) || ON.has(ux);
}

export function parseUxDemo(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  const raw = String(params.get('demo') || '').toLowerCase().trim();
  if (MAX_DEMO.has(raw)) return MAX_DEMO_ID;
  return DEFAULT_DEMO_ID;
}

export function stripPreviewParams(href = typeof location !== 'undefined' ? location.href : 'http://localhost/') {
  const url = new URL(href, 'http://localhost/');
  url.searchParams.delete('three');
  url.searchParams.delete('ux');
  url.searchParams.delete('demo');
  return url.toString();
}
