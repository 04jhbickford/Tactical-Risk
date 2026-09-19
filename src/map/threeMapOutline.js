// Outer-union outlines for multi-polygon lands (China, archipelagos).
// Select ring + territory ink stroke the dissolved exterior only — no internal seam.
// No THREE dependency so tools/test-three-art-gap.mjs can import it.

function bboxOf(polygons) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polygons) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function fillPoly(grid, w, h, poly, minX, minY, scale) {
  const pts = poly.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale]);
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }
  const row0 = Math.max(0, Math.floor(y0));
  const row1 = Math.min(h - 1, Math.ceil(y1));
  const n = pts.length;
  for (let y = row0; y <= row1; y++) {
    const ys = y + 0.5;
    const xs = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if ((a[1] <= ys && b[1] > ys) || (b[1] <= ys && a[1] > ys)) {
        const t = (ys - a[1]) / (b[1] - a[1] || 1);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.floor(xs[i]));
      const x1 = Math.min(w - 1, Math.ceil(xs[i + 1]));
      const row = y * w;
      for (let x = x0; x <= x1; x++) grid[row + x] = 1;
    }
  }
}

function dilate(grid, w, h) {
  const next = new Uint8Array(grid);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (grid[i]) continue;
      if (grid[i - 1] || grid[i + 1] || grid[i - w] || grid[i + w]) next[i] = 1;
    }
  }
  grid.set(next);
}

function isFilled(grid, w, h, x, y) {
  return x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x] === 1;
}

// Moore-neighborhood outer contour. One ring per 4-connected component.
function traceContours(grid, w, h, minX, minY, scale) {
  const seen = new Uint8Array(w * h);
  const rings = [];
  const dirs = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!grid[i] || seen[i]) continue;
      if (isFilled(grid, w, h, x, y - 1)) continue;
      const ring = [];
      let cx = x;
      let cy = y;
      let dir = 0;
      let guard = w * h * 4;
      do {
        seen[cy * w + cx] = 1;
        ring.push([
          minX + (cx + 0.5) / scale,
          minY + (cy + 0.5) / scale,
        ]);
        let found = false;
        for (let k = 0; k < 8; k++) {
          const nd = (dir + 6 + k) % 8;
          const nx = cx + dirs[nd][0];
          const ny = cy + dirs[nd][1];
          if (isFilled(grid, w, h, nx, ny)) {
            cx = nx;
            cy = ny;
            dir = nd;
            found = true;
            break;
          }
        }
        if (!found) break;
        guard -= 1;
      } while ((cx !== x || cy !== y) && guard > 0);
      if (ring.length >= 12) rings.push(ring);
    }
  }
  return rings;
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((p[1] - a[1]) * dx - (p[0] - a[0]) * dy) / len;
}

function rdp(points, epsilon) {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDist(points[i], points[0], points[end]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function ringArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function dropSliverPolygons(polygons, minArea = 220) {
  const polys = (polygons || []).filter((p) => p && p.length >= 3);
  if (polys.length <= 1) return polys;
  const kept = polys.filter((p) => ringArea(p) >= minArea);
  if (kept.length) return kept;
  return [polys.reduce((a, b) => (ringArea(a) >= ringArea(b) ? a : b))];
}

export function rasterUnionRings(polygons, { pad = 3, target = 440, epsilon = 1.4, force = false } = {}) {
  const polys = dropSliverPolygons(polygons);
  if (!polys.length) return [];
  if (polys.length <= 1 && !force) return polys;
  const bb = bboxOf(polys);
  if (!bb) return polys;
  const minX = bb.minX - pad;
  const minY = bb.minY - pad;
  const bw = (bb.maxX + pad) - minX;
  const bh = (bb.maxY + pad) - minY;
  const scale = target / Math.max(bw, bh, 1);
  const w = Math.max(12, Math.ceil(bw * scale) + 4);
  const h = Math.max(12, Math.ceil(bh * scale) + 4);
  const grid = new Uint8Array(w * h);
  for (const poly of polys) fillPoly(grid, w, h, poly, minX, minY, scale);
  dilate(grid, w, h);
  const raw = traceContours(grid, w, h, minX, minY, scale);
  const rings = raw
    .map((r) => rdp(r, epsilon))
    .filter((r) => r.length >= 3 && ringArea(r) >= 80);
  return rings.length ? rings : polys;
}

export function territoryOutlineRings(territory) {
  const polys = dropSliverPolygons(territory?.polygons || []);
  if (!polys.length) return [];
  if (polys.length <= 1) return polys;
  return rasterUnionRings(polys);
}

const HEAL_CACHE = new WeakMap();

export function healLandRings(territory) {
  // P38 HARD: dissolve ears / slivers at multi-border joins (Australia class).
  // Always raster-union so a concave 900-pt ring cannot keep spike lobes.
  if (!territory) return [];
  const hit = HEAL_CACHE.get(territory);
  if (hit) return hit;
  const polys = dropSliverPolygons(territory.polygons || []);
  if (!polys.length) {
    HEAL_CACHE.set(territory, []);
    return [];
  }
  const rings = rasterUnionRings(polys, { pad: 4, target: 560, epsilon: 1.8, force: true });
  HEAL_CACHE.set(territory, rings);
  return rings;
}

export function outlineRingCount(territory) {
  return territoryOutlineRings(territory).length;
}

export function waterOutlineRings(territory) {
  // P37 HARD: sea-zone ink is the real water polygon closed rings.
  // Never centroid dots. Never land. Kill centroid-sized dots.
  if (!territory?.isWater) return [];
  return (territory.polygons || []).filter((poly) => {
    if (!poly || poly.length < 4) return false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of poly) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return (maxX - minX) >= 48 && (maxY - minY) >= 36;
  });
}
