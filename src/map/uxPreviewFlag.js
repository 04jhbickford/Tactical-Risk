// Preview-only gate. Live Canvas at / stays untouched.
// Accepts ?three=1 (legacy Three preview) or ?ux=1 (this hybrid).

const ON = new Set(['1', 'true', 'yes']);

export function isUxPreviewRequested(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  const three = String(params.get('three') || '').toLowerCase();
  const ux = String(params.get('ux') || '').toLowerCase();
  return ON.has(three) || ON.has(ux);
}

export function stripPreviewParams(href = typeof location !== 'undefined' ? location.href : 'http://localhost/') {
  const url = new URL(href, 'http://localhost/');
  url.searchParams.delete('three');
  url.searchParams.delete('ux');
  return url.toString();
}
