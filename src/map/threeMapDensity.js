// Preview-only stack LOD + collision. No Three import.
// Dense mid/far = pip+N. Near/select = typed cream chits spaced.

export const LOD_FAR = 215;
export const LOD_NEAR = 92;

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

export function tokenSizeFor(band, selected) {
  if (band === 'near' || selected) return 7.2;
  return 6.2;
}

export function hexPack(n, pitch) {
  const out = [{ x: 0, z: 0 }];
  if (n <= 1) return out.slice(0, n);
  const dirs = [
    [1, 0],
    [0.5, 0.866025],
    [-0.5, 0.866025],
    [-1, 0],
    [-0.5, -0.866025],
    [0.5, -0.866025],
  ];
  let ring = 1;
  while (out.length < n) {
    let x = dirs[4][0] * ring;
    let z = dirs[4][1] * ring;
    for (let d = 0; d < 6 && out.length < n; d++) {
      for (let s = 0; s < ring && out.length < n; s++) {
        out.push({ x: x * pitch, z: z * pitch });
        x += dirs[d][0];
        z += dirs[d][1];
      }
    }
    ring += 1;
  }
  return out;
}

export function separatePoints(items, minDist, iterations = 28) {
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
      if (iter >= iterations - 8) continue;
      if (drift > maxD && drift > 0) {
        it.x = it.homeX + (dx / drift) * maxD;
        it.z = it.homeZ + (dz / drift) * maxD;
      } else {
        it.x += (it.homeX - it.x) * 0.008;
        it.z += (it.homeZ - it.z) * 0.008;
      }
    }
  }
  return items;
}
