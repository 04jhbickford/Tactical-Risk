// STACK-LOD SoT — preview only. No Three import.
// Far/mid = ONE pip+N. Near = ≤3–4 silhouettes + +K. Never dual systems.

export const LOD_FAR = 215;
export const LOD_NEAR = 92;
export const NEAR_MAX = 4;
export const NEAR_TYPED = 3;
export const GAP_PX = 5;
export const PIP_PX = 64;
export const PIECE_PX = 68;
export const PIP_MIN_PX = 58;
export const PIP_MAX_PX = 72;
export const PIECE_MIN_PX = 58;
export const PIECE_MAX_PX = 78;

const TYPE_PRIORITY = [
  'infantry', 'armour', 'fighter', 'bomber', 'artillery',
  'battleship', 'carrier', 'destroyer', 'cruiser',
  'submarine', 'transport', 'aaGun', 'factory', 'tacticalBomber',
];

export function lodBand(dist) {
  if (dist > LOD_FAR) return 'far';
  if (dist > LOD_NEAR) return 'mid';
  return 'near';
}

export function isSupportType(type) {
  return type === 'factory' || type === 'aaGun';
}

export function isDenseBand(band) {
  return band === 'far' || band === 'mid';
}

export function worldSizeFromScreen(px, dist, fovDeg, viewH, {
  minPx = 30,
  maxPx = 48,
  maxWorld = 10,
  minWorld = 2.4,
} = {}) {
  const p = Math.max(minPx, Math.min(maxPx, px));
  const h = Math.max(1, viewH);
  const fov = (fovDeg * Math.PI) / 180;
  const world = (p / h) * 2 * dist * Math.tan(fov / 2);
  return Math.min(maxWorld, Math.max(minWorld, world));
}

export function tokenSizeFor(band, selected) {
  if (band === 'near' || selected) return PIECE_PX;
  return PIP_PX;
}

export function sortStacks(stacks) {
  return [...(stacks || [])].sort((a, b) => {
    const pa = TYPE_PRIORITY.indexOf(a.type);
    const pb = TYPE_PRIORITY.indexOf(b.type);
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  });
}

/** Near roster only. Mid/far must never use this to pick a soldier/ship pip. */
export function primaryType(stacks) {
  const sorted = sortStacks(stacks);
  return sorted[0]?.type || 'infantry';
}

// Near: ≤3 typed + overflow when more types exist; else up to 4 typed.
// Never a type parade at mid. Never pip+types together.
export function nearLayout(stacks) {
  const sorted = sortStacks(stacks);
  if (sorted.length <= NEAR_MAX) {
    return { shown: sorted, overflowQty: 0, collapse: false };
  }
  const shown = sorted.slice(0, NEAR_TYPED);
  const hidden = sorted.slice(NEAR_TYPED);
  const overflowQty = hidden.reduce((n, s) => n + (s.quantity || 0), 0);
  return { shown, overflowQty, collapse: false };
}

export function shouldCollapse(tokenCount, pitch, maxDrift) {
  if (tokenCount <= 1) return false;
  const outer = pitch * Math.sqrt(Math.max(0, tokenCount - 1));
  return outer > maxDrift;
}

export function spiralPack(n, pitch) {
  if (n <= 0) return [];
  const out = [{ x: 0, z: 0 }];
  if (n === 1) return out;
  let angle = 0;
  for (let i = 1; i < n; i++) {
    const radius = pitch * Math.sqrt(i);
    angle += 2.399963;
    out.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    });
  }
  return out;
}

export function hexPack(n, pitch) {
  return spiralPack(n, pitch);
}

export function separatePoints(items, minDist, iterations = 22) {
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        let dx = items[j].x - items[i].x;
        let dz = items[j].z - items[i].z;
        let d = Math.hypot(dx, dz);
        if (d < 1e-4) {
          dx = 0.18;
          dz = 0.11;
          d = Math.hypot(dx, dz);
        }
        if (d >= minDist) continue;
        const push = (minDist - d) * 0.62;
        const nx = dx / d;
        const nz = dz / d;
        items[i].x -= nx * push;
        items[i].z -= nz * push;
        items[j].x += nx * push;
        items[j].z += nz * push;
      }
    }
    for (const it of items) {
      const dx = it.x - it.homeX;
      const dz = it.z - it.homeZ;
      const drift = Math.hypot(dx, dz);
      const maxD = it.maxDrift ?? 9;
      if (iter >= iterations - 6) continue;
      if (drift > maxD && drift > 0) {
        it.x = it.homeX + (dx / drift) * maxD;
        it.z = it.homeZ + (dz / drift) * maxD;
      } else {
        it.x += (it.homeX - it.x) * 0.01;
        it.z += (it.homeZ - it.z) * 0.01;
      }
    }
  }
  return items;
}
