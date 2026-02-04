// Renders territory overlays: ownership colors, outlines, continent borders, hover/selection, labels

// Cross-water connections that should be drawn as visual lines on the map
// These are land-to-land connections that cross water (like Alaska-Kamchatka in Risk)
// Land bridges - allow land movement between these territories (no naval required)
const LAND_BRIDGES = [
  // Pacific wrap-around
  ['Alaska', 'Soviet Far East'],
  // Atlantic crossings
  ['East Canada', 'Eire'],
  ['Brazil', 'French West Africa'],
  ['East US', 'Cuba'],
  // UK connections
  ['Eire', 'United Kingdom'],
  ['United Kingdom', 'Finland Norway'],
  // Mediterranean
  ['Spain', 'Algeria'],
  ['South Europe', 'Algeria'],
  ['South Europe', 'Anglo Sudan Egypt'],
  // Pacific / Asian connections
  ['Kwangtung', 'East Indies'],
  ['East Indies', 'Australia'],
  ['Australia', 'New Zealand'],
  // African
  ['Kenya-Rhodesia', 'Madagascar'],
];

export class TerritoryRenderer {
  constructor(territories, continents) {
    this.territories = territories;
    this.continents = continents;
    this.gameState = null;

    // Build lookups
    this.territoryByName = {};
    for (const t of territories) {
      this.territoryByName[t.name] = t;
    }

    this.continentByName = {};
    this.continentByTerritory = {};
    for (const c of continents) {
      this.continentByName[c.name] = c;
      for (const tName of c.territories) {
        this.continentByTerritory[tName] = c;
      }
    }

    // Flag images cache
    this.flagImages = {};

    // Territories highlighted from action log
    this.highlightedTerritories = [];

    // Movement arrow for action log hover
    this.movementArrowFrom = null;
    this.movementArrowTo = null;

    // Cache for external edges (computed once since polygons never change)
    this._externalEdgesCache = {};
    this._territoryCenterCache = {};
    this._precomputeCaches();
  }

  /** Set territories to highlight from action log hover */
  setHighlightedTerritories(territories) {
    this.highlightedTerritories = territories || [];
  }

  /** Clear highlighted territories */
  clearHighlightedTerritories() {
    this.highlightedTerritories = [];
  }

  /** Set movement arrow to display (from -> to) */
  setMovementArrow(from, to) {
    this.movementArrowFrom = from;
    this.movementArrowTo = to;
  }

  /** Clear movement arrow */
  clearMovementArrow() {
    this.movementArrowFrom = null;
    this.movementArrowTo = null;
  }

  /** Pre-compute expensive calculations that don't change during gameplay */
  _precomputeCaches() {
    for (const t of this.territories) {
      // Cache territory centers
      this._territoryCenterCache[t.name] = this._computeTerritoryCenter(t);

      // Cache external edges for multi-polygon territories
      if (t.polygons && t.polygons.length > 1) {
        this._externalEdgesCache[t.name] = this._computeExternalEdges(t.polygons);
      }
    }
  }

  setGameState(gameState) {
    this.gameState = gameState;
    // Load flag images for all players
    if (gameState && gameState.players) {
      this._loadFlagImages(gameState.players);
    }
  }

  _loadFlagImages(players) {
    for (const player of players) {
      if (player.flag && !this.flagImages[player.flag]) {
        const img = new Image();
        img.src = `assets/flags/${player.flag}`;
        this.flagImages[player.flag] = img;
      }
    }
  }

  /** Fill land territory polygons with continent color (Risk style) */
  renderOwnershipOverlays(ctx) {
    for (const t of this.territories) {
      if (t.isWater) continue;

      const continent = this.continentByTerritory[t.name];
      const color = continent?.color || '#888888';

      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 1.0;

      // Fill each polygon directly
      for (const polygon of t.polygons) {
        if (!polygon || polygon.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(polygon[0][0], polygon[0][1]);
        for (let i = 1; i < polygon.length; i++) {
          ctx.lineTo(polygon[i][0], polygon[i][1]);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 1;
  }

  /** Add subtle terrain texture (rivers, mountains) to territories */
  renderTerrainTexture(ctx, zoom) {
    if (zoom < 0.5) return; // Only show when zoomed in enough

    ctx.save();
    ctx.globalAlpha = 0.15;

    for (const t of this.territories) {
      if (t.isWater) continue;

      const center = this._getTerritoryCenter(t);
      if (center[0] === null) continue;

      const [cx, cy] = center;
      // Use territory name hash for consistent random placement
      const hash = this._hashString(t.name);

      // Draw mountains for territories with certain hash values
      if (hash % 3 === 0) {
        this._drawMountains(ctx, cx, cy, hash);
      }

      // Draw rivers for other territories
      if (hash % 3 === 1) {
        this._drawRiver(ctx, cx, cy, hash);
      }
    }

    ctx.restore();
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  _drawMountains(ctx, cx, cy, seed) {
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.5)';
    ctx.fillStyle = 'rgba(80, 60, 40, 0.3)';
    ctx.lineWidth = 1;

    const count = 2 + (seed % 3);
    for (let i = 0; i < count; i++) {
      const x = cx + ((seed * (i + 1)) % 60) - 30;
      const y = cy + ((seed * (i + 2)) % 40) - 20;
      const size = 8 + (seed % 6);

      ctx.beginPath();
      ctx.moveTo(x - size, y + size / 2);
      ctx.lineTo(x, y - size / 2);
      ctx.lineTo(x + size, y + size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  _drawRiver(ctx, cx, cy, seed) {
    ctx.strokeStyle = 'rgba(70, 130, 180, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    const startX = cx - 25 + (seed % 20);
    const startY = cy - 20 + (seed % 15);

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Wavy river line
    let x = startX, y = startY;
    for (let i = 0; i < 4; i++) {
      const dx = 10 + (seed % 8);
      const dy = 8 + ((seed * i) % 10);
      const cpx = x + dx / 2 + ((seed * i) % 6) - 3;
      const cpy = y + dy / 2;
      x += dx;
      y += dy;
      ctx.quadraticCurveTo(cpx, cpy, x, y);
    }
    ctx.stroke();
  }

  /** Draw small flag markers on each territory to show ownership */
  renderOwnershipFlags(ctx, zoom) {
    if (!this.gameState || zoom < 0.35) return;

    const flagWidth = Math.max(16, Math.min(28, 22 * zoom));
    const flagHeight = flagWidth * 0.67;

    for (const t of this.territories) {
      if (t.isWater) continue;

      const owner = this.gameState.getOwner(t.name);
      if (!owner) continue;

      const player = this.gameState.getPlayer(owner);
      if (!player || !player.flag) continue;

      // Skip capitals - they get the big flag treatment
      if (this.gameState.isCapital(t.name)) continue;

      // Calculate center from all polygons for proper placement on merged territories
      const [cx, cy] = this._getTerritoryCenter(t);
      if (cx === null) continue;

      // Position to upper-right of center
      const x = cx + 15;
      const y = cy - 20;

      this._drawOwnershipFlag(ctx, x, y, flagWidth, flagHeight, player.flag, player.color);
    }
  }

  _drawOwnershipFlag(ctx, x, y, width, height, flag, color) {
    const img = this.flagImages[flag];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.save();

    // Draw small colored border/background
    const padding = 2;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;

    // Draw rounded rect background
    ctx.beginPath();
    this._roundRect(ctx, x - width / 2 - padding, y - height / 2 - padding, width + padding * 2, height + padding * 2, 3);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw flag image
    ctx.drawImage(img, x - width / 2, y - height / 2, width, height);

    // Subtle border around flag
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** Draw continent bonus indicators - now just a subtle background tint */
  renderContinentIndicators(ctx) {
    // Removed confusing per-territory borders
    // Continent groupings are now shown via:
    // 1. Continent labels when zoomed out (renderContinentLabels)
    // 2. Continent bonus table in UI
    // No additional rendering needed here
  }

  /** Draw continent name labels when zoomed out enough */
  renderContinentLabels(ctx, zoom) {
    if (zoom > 0.6) return; // Only show when zoomed out

    const fontSize = Math.max(18, Math.min(28, 24 / zoom * 0.4));
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Manual position overrides for continents that span map edges or need adjustment
    const LABEL_OVERRIDES = {
      'North America': { x: 550, y: 450 },  // Centered on US, away from Alaska
    };

    for (const continent of this.continents) {
      // Use override if available, otherwise calculate center
      let cx, cy;
      if (LABEL_OVERRIDES[continent.name]) {
        cx = LABEL_OVERRIDES[continent.name].x;
        cy = LABEL_OVERRIDES[continent.name].y;
      } else {
        const center = this._getContinentCenter(continent);
        if (!center) continue;
        [cx, cy] = center;
      }

      // Draw label with continent color
      ctx.save();
      ctx.globalAlpha = 0.7;

      // Text shadow for readability
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(continent.name, cx, cy);

      ctx.fillStyle = continent.color;
      ctx.fillText(continent.name, cx, cy);

      // Bonus indicator below name
      const smallSize = fontSize * 0.6;
      ctx.font = `${smallSize}px 'Segoe UI', sans-serif`;
      ctx.strokeText(`+${continent.bonus}`, cx, cy + fontSize * 0.8);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`+${continent.bonus}`, cx, cy + fontSize * 0.8);

      ctx.restore();
    }
  }

  _getContinentCenter(continent) {
    const MAP_WIDTH = 3500; // Must match camera.js MAP_WIDTH
    const centers = [];

    for (const tName of continent.territories) {
      const t = this.territoryByName[tName];
      if (!t || t.isWater) continue;
      const center = this._getTerritoryCenter(t);
      if (center[0] !== null) {
        centers.push(center);
      }
    }

    if (centers.length === 0) return null;

    // Check if continent spans the map wrap (some territories on left, some on right)
    const leftSide = centers.filter(c => c[0] < MAP_WIDTH / 3);
    const rightSide = centers.filter(c => c[0] > MAP_WIDTH * 2 / 3);

    let sumX = 0, sumY = 0;

    if (leftSide.length > 0 && rightSide.length > 0) {
      // Continent spans the wrap - shift right-side territories to negative x for averaging
      for (const [x, y] of centers) {
        const adjustedX = x > MAP_WIDTH / 2 ? x - MAP_WIDTH : x;
        sumX += adjustedX;
        sumY += y;
      }
      let avgX = sumX / centers.length;
      // Wrap back to positive if needed
      if (avgX < 0) avgX += MAP_WIDTH;
      return [avgX, sumY / centers.length];
    } else {
      // Normal averaging
      for (const [x, y] of centers) {
        sumX += x;
        sumY += y;
      }
      return [sumX / centers.length, sumY / centers.length];
    }
  }

  /** Draw territory outlines */
  renderTerritoryOutlines(ctx) {
    // Land territory borders
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1;

    for (const t of this.territories) {
      if (t.isWater) continue;

      if (t.polygons.length === 1) {
        // Single polygon - draw normally
        this._strokePoly(ctx, t.polygons[0]);
      } else {
        // Multiple polygons - draw only external edges (hide internal shared borders)
        const externalEdges = this._getExternalEdgesWithTolerance(t.polygons, t.name);
        this._strokeEdges(ctx, externalEdges);
      }
    }

    // Sea zone borders - lighter, dashed
    ctx.strokeStyle = 'rgba(80, 140, 200, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);

    for (const t of this.territories) {
      if (!t.isWater) continue;
      for (const poly of t.polygons) {
        this._strokePoly(ctx, poly);
      }
    }

    ctx.setLineDash([]);
  }

  /**
   * Get external edges for a multi-polygon territory (edges not shared between polygons).
   * Returns null if polygons don't share any edges (disconnected) - caller should skip drawing.
   */
  _getExternalEdgesForTerritory(polygons) {
    const edgeCount = new Map();
    const allEdges = [];

    // Count how many times each edge appears across all polygons
    for (const poly of polygons) {
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        // Skip zero-length edges
        if (p1[0] === p2[0] && p1[1] === p2[1]) continue;
        const key = this._edgeKey(p1, p2);
        edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        allEdges.push({ p1, p2, key });
      }
    }

    // Check if any edges are shared (appear more than once)
    let hasSharedEdges = false;
    for (const count of edgeCount.values()) {
      if (count > 1) {
        hasSharedEdges = true;
        break;
      }
    }

    // If no shared edges, polygons are disconnected - return null to skip drawing
    if (!hasSharedEdges) {
      return null;
    }

    // External edges appear only once (not shared between polygons)
    const externalEdges = [];
    for (const edge of allEdges) {
      if (edgeCount.get(edge.key) === 1) {
        externalEdges.push([edge.p1, edge.p2]);
      }
    }

    return externalEdges;
  }

  /**
   * Get unified polygons for a territory, handling both connected and disconnected pieces.
   * For connected polygons (sharing edges), merges them into a single boundary.
   * For disconnected polygons (islands, separate land masses), keeps them separate.
   * Returns an array of polygons to render.
   */
  _getUnifiedPolygons(polygons) {
    if (polygons.length === 1) return polygons;

    const vertexKey = (p) => `${p[0]},${p[1]}`;

    // First, group polygons by connectivity using shared edges
    const edgeToPolygons = new Map();
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      for (let j = 0; j < poly.length; j++) {
        const p1 = poly[j];
        const p2 = poly[(j + 1) % poly.length];
        // Skip zero-length edges
        if (p1[0] === p2[0] && p1[1] === p2[1]) continue;
        const key = this._edgeKey(p1, p2);
        if (!edgeToPolygons.has(key)) edgeToPolygons.set(key, []);
        edgeToPolygons.get(key).push(i);
      }
    }

    // Build connectivity graph between polygons
    const polyGroups = new Array(polygons.length).fill(-1);
    let groupId = 0;

    for (let i = 0; i < polygons.length; i++) {
      if (polyGroups[i] !== -1) continue;

      // BFS to find all connected polygons
      const queue = [i];
      polyGroups[i] = groupId;

      while (queue.length > 0) {
        const current = queue.shift();
        const poly = polygons[current];

        for (let j = 0; j < poly.length; j++) {
          const p1 = poly[j];
          const p2 = poly[(j + 1) % poly.length];
          // Skip zero-length edges
          if (p1[0] === p2[0] && p1[1] === p2[1]) continue;
          const key = this._edgeKey(p1, p2);
          const connected = edgeToPolygons.get(key) || [];
          for (const other of connected) {
            if (polyGroups[other] === -1) {
              polyGroups[other] = groupId;
              queue.push(other);
            }
          }
        }
      }
      groupId++;
    }

    // Group polygons by their group ID
    const groups = [];
    for (let g = 0; g < groupId; g++) {
      const group = polygons.filter((_, i) => polyGroups[i] === g);
      groups.push(group);
    }

    // For each group, either return as-is (single polygon) or compute unified boundary
    const result = [];
    for (const group of groups) {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Compute unified polygon for this connected group
        const unified = this._traceUnifiedBoundary(group);
        if (unified && unified.length >= 3) {
          result.push(unified);
        } else {
          // Fallback: include all polygons in the group individually
          for (const poly of group) {
            if (poly && poly.length >= 3) {
              result.push(poly);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Trace the external boundary of connected polygons into a single unified polygon.
   */
  _traceUnifiedBoundary(polygons) {
    const vertexKey = (p) => `${p[0]},${p[1]}`;
    const edgeCount = new Map();
    const edges = [];

    // Count edge occurrences, filtering out zero-length edges
    for (const poly of polygons) {
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        // Skip zero-length edges (degenerate edges where p1 equals p2)
        if (p1[0] === p2[0] && p1[1] === p2[1]) continue;
        const key = this._edgeKey(p1, p2);
        edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        edges.push({ p1, p2, key });
      }
    }

    // Get only external edges (appear once)
    const externalEdges = edges.filter(e => edgeCount.get(e.key) === 1);
    if (externalEdges.length === 0) return null;

    // Build adjacency map
    const adjacency = new Map();
    for (const edge of externalEdges) {
      const k1 = vertexKey(edge.p1);
      const k2 = vertexKey(edge.p2);

      if (!adjacency.has(k1)) adjacency.set(k1, []);
      if (!adjacency.has(k2)) adjacency.set(k2, []);

      adjacency.get(k1).push({ edge, next: edge.p2 });
      adjacency.get(k2).push({ edge, next: edge.p1 });
    }

    // Trace the boundary
    const usedEdges = new Set();
    const unified = [];
    let current = externalEdges[0].p1;
    const startKey = vertexKey(current);

    unified.push(current);

    let safety = externalEdges.length + 10;
    while (safety-- > 0) {
      const currentKey = vertexKey(current);
      const connections = adjacency.get(currentKey) || [];

      let foundNext = null;
      for (const conn of connections) {
        if (!usedEdges.has(conn.edge.key)) {
          usedEdges.add(conn.edge.key);
          foundNext = conn.next;
          break;
        }
      }

      if (!foundNext) break;

      current = foundNext;
      if (vertexKey(current) === startKey) break;

      unified.push(current);
    }

    return unified.length >= 3 ? unified : null;
  }

  /** Create a canonical key for an edge that's the same regardless of direction */
  _edgeKey(p1, p2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return `${x1},${y1}-${x2},${y2}`;
    } else {
      return `${x2},${y2}-${x1},${y1}`;
    }
  }

  /** Draw a list of edges */
  _strokeEdges(ctx, edges) {
    ctx.beginPath();
    for (const [p1, p2] of edges) {
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
    }
    ctx.stroke();
  }

  /**
   * Get external edges for multi-polygon territory (uses cache for performance).
   */
  _getExternalEdgesWithTolerance(polygons, territoryName) {
    // Use cached result if available
    if (territoryName && this._externalEdgesCache[territoryName]) {
      return this._externalEdgesCache[territoryName];
    }
    // Fallback to computation (shouldn't happen often)
    return this._computeExternalEdges(polygons);
  }

  /**
   * Compute external edges for multi-polygon territory using tolerance-based matching.
   * Edges that approximately match or overlap between polygons are considered internal and excluded.
   */
  _computeExternalEdges(polygons) {
    const TOLERANCE = 12; // pixels

    // Check if a point is close to a line segment, returns distance
    const pointToEdgeDist = (point, e) => {
      const [px, py] = point;
      const [x1, y1] = e.p1;
      const [x2, y2] = e.p2;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;

      if (lenSq === 0) {
        return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      }

      // Project point onto line, clamped to segment
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    };

    // Check if an edge is "covered" by any edge from another polygon
    // Sample points along the edge and check if most are close to edges from other polygon
    const isEdgeCovered = (edge, otherEdges) => {
      const samples = 5;
      let closeCount = 0;

      for (let s = 0; s <= samples; s++) {
        const t = s / samples;
        const px = edge.p1[0] + t * (edge.p2[0] - edge.p1[0]);
        const py = edge.p1[1] + t * (edge.p2[1] - edge.p1[1]);
        const point = [px, py];

        // Check if this point is close to any edge from other polygon
        for (const other of otherEdges) {
          if (pointToEdgeDist(point, other) <= TOLERANCE) {
            closeCount++;
            break;
          }
        }
      }

      // If most sample points are close to other edges, this edge is internal
      return closeCount >= samples * 0.7;
    };

    // Collect edges grouped by polygon
    const edgesByPoly = [];
    for (let polyIdx = 0; polyIdx < polygons.length; polyIdx++) {
      const poly = polygons[polyIdx];
      const edges = [];
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        // Skip zero-length edges
        if (p1[0] === p2[0] && p1[1] === p2[1]) continue;
        edges.push({ p1, p2, polyIdx, internal: false });
      }
      edgesByPoly.push(edges);
    }

    // For each edge, check if it's covered by edges from other polygons
    const allEdges = [];
    for (let polyIdx = 0; polyIdx < edgesByPoly.length; polyIdx++) {
      // Collect edges from all OTHER polygons
      const otherEdges = [];
      for (let otherIdx = 0; otherIdx < edgesByPoly.length; otherIdx++) {
        if (otherIdx !== polyIdx) {
          otherEdges.push(...edgesByPoly[otherIdx]);
        }
      }

      // Check each edge in this polygon
      for (const edge of edgesByPoly[polyIdx]) {
        edge.internal = isEdgeCovered(edge, otherEdges);
        allEdges.push(edge);
      }
    }

    // Return only external edges
    return allEdges
      .filter(e => !e.internal)
      .map(e => [e.p1, e.p2]);
  }

  /** Draw capital markers with faction flags */
  renderCapitals(ctx, zoom) {
    if (!this.gameState) return;

    // Scale parameters based on zoom - capitals should ALWAYS be very visible
    const isZoomedOut = zoom < 0.5;

    // Much larger markers when zoomed out
    const baseSize = isZoomedOut ? 60 / Math.max(zoom, 0.15) : 48;
    const flagWidth = Math.max(40, baseSize);
    const flagHeight = flagWidth * 0.75;
    const starSize = Math.max(20, baseSize * 0.5);

    for (const t of this.territories) {
      if (t.isWater) continue;
      if (!this.gameState.isCapital(t.name)) continue;

      // Calculate center from all polygons for proper placement on merged territories
      const [cx, cy] = this._getTerritoryCenter(t);
      if (cx === null) continue;

      const owner = this.gameState.getOwner(t.name);
      const player = this.gameState.getPlayer(owner);
      const color = this.gameState.getPlayerColor(owner);

      // Position above the territory center/label
      const y = cy - (isZoomedOut ? 20 : 35);

      // ALWAYS draw glow for visibility - larger when zoomed out
      this._drawCapitalGlow(ctx, cx, y, color, zoom);

      // Draw "CAPITAL" label when zoomed out for extra visibility
      if (isZoomedOut && zoom < 0.3) {
        this._drawCapitalLabel(ctx, cx, y + flagHeight / 2 + 20, color);
      }

      // Draw flag if available
      if (player && player.flag && zoom >= 0.15) {
        this._drawCapitalFlag(ctx, cx, y, flagWidth, flagHeight, player.flag, color, isZoomedOut);
      } else {
        // Fallback: draw star marker for capital - always visible
        this._drawCapitalStar(ctx, cx, y, starSize * 1.5, color, isZoomedOut);
      }
    }
  }

  _drawCapitalGlow(ctx, x, y, color, zoom) {
    ctx.save();

    // Subtle glow effect for capital visibility
    const glowSize = Math.max(30, 40 / Math.max(zoom, 0.2));

    // Draw two layers for subtle glow
    for (let i = 1; i >= 0; i--) {
      const size = glowSize * (1 + i * 0.2);
      const alpha = Math.floor(120 - i * 40).toString(16).padStart(2, '0');

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, color + alpha);
      gradient.addColorStop(0.6, color + Math.floor(parseInt(alpha, 16) / 3).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawCapitalLabel(ctx, x, y, color) {
    ctx.save();
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // White outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText('★ CAPITAL ★', x, y);

    // Colored fill
    ctx.fillStyle = color;
    ctx.fillText('★ CAPITAL ★', x, y);

    ctx.restore();
  }

  _drawCapitalFlag(ctx, x, y, width, height, flag, color, isZoomedOut = false) {
    const img = this.flagImages[flag];

    ctx.save();

    // Draw colored background/border - more prominent when zoomed out
    const padding = isZoomedOut ? 5 : 3;
    ctx.fillStyle = color;
    ctx.strokeStyle = isZoomedOut ? '#fff' : '#000';
    ctx.lineWidth = isZoomedOut ? 4 : 2;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = isZoomedOut ? 12 : 6;
    ctx.shadowOffsetY = isZoomedOut ? 4 : 2;

    ctx.beginPath();
    ctx.roundRect(x - width / 2 - padding, y - height / 2 - padding, width + padding * 2, height + padding * 2, isZoomedOut ? 6 : 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw flag image
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
    }

    // Draw border around flag - white for visibility when zoomed out
    ctx.strokeStyle = isZoomedOut ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isZoomedOut ? 2 : 1;
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);

    // Draw star below flag - larger when zoomed out
    const starSize = isZoomedOut ? 20 : 14;
    this._drawCapitalStar(ctx, x, y + height / 2 + 10, starSize, '#ffd700', isZoomedOut);

    ctx.restore();
  }

  _drawCapitalStar(ctx, x, y, size, color, isZoomedOut = false) {
    const r = size / 2;
    const innerR = r * 0.4;
    const points = 5;

    ctx.save();
    ctx.translate(x, y);

    // Larger glow effect when zoomed out
    ctx.shadowColor = color;
    ctx.shadowBlur = isZoomedOut ? 15 : 6;

    // Add white outline for visibility when zoomed out
    if (isZoomedOut) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? r : innerR;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = isZoomedOut ? 2 : 1;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? r : innerR;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /** Draw hover highlight */
  renderHover(ctx, territory) {
    if (!territory) return;

    // Fill with highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (const poly of territory.polygons) {
      if (!poly || poly.length < 3) continue;
      this._fillPoly(ctx, poly);
    }

    // Stroke outline - use external edges only to hide internal borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    if (territory.polygons.length === 1) {
      this._strokePoly(ctx, territory.polygons[0]);
    } else {
      const externalEdges = this._getExternalEdgesWithTolerance(territory.polygons, territory.name);
      this._strokeEdges(ctx, externalEdges);
    }
  }

  /** Draw selection highlight */
  renderSelected(ctx, territory) {
    if (!territory) return;

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;

    // Fill with subtle highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (const poly of territory.polygons) {
      if (!poly || poly.length < 3) continue;
      this._fillPoly(ctx, poly);
    }

    // Stroke outline - use external edges only to hide internal borders
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    if (territory.polygons.length === 1) {
      this._strokePoly(ctx, territory.polygons[0]);
    } else {
      const externalEdges = this._getExternalEdgesWithTolerance(territory.polygons, territory.name);
      this._strokeEdges(ctx, externalEdges);
    }

    ctx.shadowBlur = 0;
  }

  /** Highlight valid move destinations */
  renderValidMoveDestinations(ctx, destinations, isEnemy) {
    if (!destinations || destinations.length === 0) return;

    for (const destName of destinations) {
      const t = this.territoryByName[destName];
      if (!t) continue;

      // Green for friendly, red for enemy
      const color = isEnemy?.[destName] ? 'rgba(244, 67, 54, 0.3)' : 'rgba(76, 175, 80, 0.3)';
      const borderColor = isEnemy?.[destName] ? 'rgba(244, 67, 54, 0.8)' : 'rgba(76, 175, 80, 0.8)';

      // Fill
      ctx.fillStyle = color;
      for (const poly of t.polygons) {
        if (!poly || poly.length < 3) continue;
        this._fillPoly(ctx, poly);
      }

      // Stroke outline - use external edges only to hide internal borders
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      if (t.polygons.length === 1) {
        this._strokePoly(ctx, t.polygons[0]);
      } else {
        const externalEdges = this._getExternalEdgesWithTolerance(t.polygons, t.name);
        this._strokeEdges(ctx, externalEdges);
      }
      ctx.setLineDash([]);
    }
  }

  /** Highlight territories from action log hover */
  renderActionLogHighlights(ctx) {
    if (!this.highlightedTerritories || this.highlightedTerritories.length === 0) return;

    for (const territoryName of this.highlightedTerritories) {
      const t = this.territoryByName[territoryName];
      if (!t) continue;

      // Bright cyan highlight for action log
      ctx.save();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;

      // Fill
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      for (const poly of t.polygons) {
        if (!poly || poly.length < 3) continue;
        this._fillPoly(ctx, poly);
      }

      // Stroke outline with glow
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      if (t.polygons.length === 1) {
        this._strokePoly(ctx, t.polygons[0]);
      } else {
        const externalEdges = this._getExternalEdgesWithTolerance(t.polygons, t.name);
        this._strokeEdges(ctx, externalEdges);
      }

      ctx.restore();
    }
  }

  /** Render movement arrow between two territories */
  renderMovementArrow(ctx) {
    if (!this.movementArrowFrom || !this.movementArrowTo) return;

    const t1 = this.territoryByName[this.movementArrowFrom];
    const t2 = this.territoryByName[this.movementArrowTo];
    if (!t1 || !t2) return;

    const [x1, y1] = this._getTerritoryCenter(t1);
    const [x2, y2] = this._getTerritoryCenter(t2);
    if (x1 === null || x2 === null) return;

    ctx.save();

    // Calculate arrow properties
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Shorten the arrow to not overlap territory centers
    const shortenBy = 30;
    const startX = x1 + Math.cos(angle) * shortenBy;
    const startY = y1 + Math.sin(angle) * shortenBy;
    const endX = x2 - Math.cos(angle) * shortenBy;
    const endY = y2 - Math.sin(angle) * shortenBy;

    // Draw glow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;

    // Draw arrow line
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const headLength = 15;
    const headAngle = Math.PI / 6;

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - headAngle),
      endY - headLength * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
      endX - headLength * Math.cos(angle + headAngle),
      endY - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /** Draw territory labels */
  renderLabels(ctx, zoom) {
    if (zoom < 0.4) return;

    const fontSize = Math.max(8, Math.min(13, 11 / zoom * 0.7));
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const t of this.territories) {
      if (t.isWater) continue;

      // Calculate center from all polygons for proper centering of merged territories
      const [cx, cy] = this._getTerritoryCenter(t);
      if (cx === null) continue;

      // Background for readability
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(t.name, cx, cy);

      ctx.fillStyle = '#fff';
      ctx.fillText(t.name, cx, cy);

      // Show IPC value below name when zoomed in
      if (zoom > 0.6 && t.production > 0) {
        const smallSize = fontSize * 0.75;
        ctx.font = `${smallSize}px 'Segoe UI', sans-serif`;
        ctx.strokeText(`${t.production} IPC`, cx, cy + fontSize + 2);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${t.production} IPC`, cx, cy + fontSize + 2);
        ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
      }
    }
  }

  /** Get the centroid of all polygons in a territory (uses cache for performance) */
  _getTerritoryCenter(territory) {
    // Use cached result if available
    if (this._territoryCenterCache[territory.name]) {
      return this._territoryCenterCache[territory.name];
    }
    // Fallback to computation
    return this._computeTerritoryCenter(territory);
  }

  /** Calculate the centroid of all polygons in a territory */
  _computeTerritoryCenter(territory) {
    if (!territory.polygons || territory.polygons.length === 0) {
      return territory.center || [null, null];
    }

    // Calculate weighted centroid based on polygon areas
    let totalArea = 0;
    let sumX = 0;
    let sumY = 0;

    for (const poly of territory.polygons) {
      if (poly.length < 3) continue;

      // Calculate polygon centroid and area
      const { cx, cy, area } = this._getPolygonCentroid(poly);
      if (area > 0) {
        sumX += cx * area;
        sumY += cy * area;
        totalArea += area;
      }
    }

    if (totalArea === 0) {
      return territory.center || [null, null];
    }

    return [sumX / totalArea, sumY / totalArea];
  }

  /** Calculate the centroid and area of a single polygon */
  _getPolygonCentroid(poly) {
    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }

    area = Math.abs(area) / 2;
    if (area === 0) return { cx: 0, cy: 0, area: 0 };

    const factor = 1 / (6 * (area > 0 ? area : 1));
    return {
      cx: Math.abs(cx * factor),
      cy: Math.abs(cy * factor),
      area
    };
  }

  _fillPoly(ctx, points) {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  _strokePoly(ctx, points) {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
  }

  /** Draw lines showing cross-water connections between territories */
  renderCrossWaterConnections(ctx, zoom) {
    // Show land bridges - smaller, less intrusive
    const lineWidth = Math.max(2, 3 / Math.max(zoom, 0.3));
    const circleSize = Math.max(3, 4 / Math.max(zoom, 0.3));

    ctx.save();

    for (const [t1Name, t2Name] of LAND_BRIDGES) {
      const t1 = this.territoryByName[t1Name];
      const t2 = this.territoryByName[t2Name];

      if (!t1 || !t2) continue;

      // Find closest edge points between territories
      const [x1, y1, x2, y2] = this._findClosestEdgePoints(t1, t2);
      if (x1 === null) continue;

      // Draw subtle glow effect
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.lineWidth = lineWidth + 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw main line
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw small anchor circles at endpoints
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(x1, y1, circleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x2, y2, circleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  // Find the closest points between two territories' edges
  _findClosestEdgePoints(t1, t2) {
    const points1 = this._getEdgePoints(t1);
    const points2 = this._getEdgePoints(t2);

    if (points1.length === 0 || points2.length === 0) {
      // Fallback to centers
      const c1 = this._getTerritoryCenter(t1);
      const c2 = this._getTerritoryCenter(t2);
      return [...c1, ...c2];
    }

    let minDist = Infinity;
    let closest = [null, null, null, null];

    // Sample points to find closest pair
    for (const p1 of points1) {
      for (const p2 of points2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closest = [p1[0], p1[1], p2[0], p2[1]];
        }
      }
    }

    return closest;
  }

  // Get sampled edge points from territory polygons
  _getEdgePoints(territory) {
    const points = [];
    if (!territory.polygons) return points;

    for (const poly of territory.polygons) {
      if (!poly || poly.length < 3) continue;

      // Sample every few points along the polygon
      const step = Math.max(1, Math.floor(poly.length / 20));
      for (let i = 0; i < poly.length; i += step) {
        points.push(poly[i]);
      }
    }
    return points;
  }

  // Get land bridges for movement validation
  static getLandBridges() {
    return LAND_BRIDGES;
  }
}
