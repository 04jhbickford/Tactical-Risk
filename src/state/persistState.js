// Firestore rejects `undefined` anywhere in a document. JSON.stringify
// drops those keys, so a local save can look fine while the live push
// throws — the "Connection hiccup" toast after combat (James / Robert
// 20 Sep). Strip before toJSON / transaction.update.

export function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : stripUndefinedDeep(item)));
  }
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    const next = stripUndefinedDeep(item);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

export function hasUndefinedDeep(value) {
  if (value === undefined) return true;
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasUndefinedDeep(item));
  return Object.values(value).some((item) => hasUndefinedDeep(item));
}
