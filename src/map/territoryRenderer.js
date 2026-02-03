// Renders territory overlays: ownership colors, outlines, continent borders, hover/selection, labels

// Cross-water connections that should be drawn as visual lines on the map
// These are land-to-land connections that cross water (like Alaska-Kamchatka in Risk)
const CROSS_WATER_CONNECTIONS = [
  // Pacific wrap-around connections
  ['Alaska', 'Soviet Far East'],
  // Land bridges
  ['Eire', 'United Kingdom'],
  // Other notable cross-water connections
  ['United Kingdom', 'Finland Norway'],
  ['Spain', 'Algeria'],
  ['South Europe', 'Algeria'],
  ['South Europe', 'Anglo Sudan Egypt'],  // After merge (was Libya)
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

    for (const continent of this.continents) {
      // Calculate center of continent
      const center = this._getContinentCenter(continent);
      if (!center) continue;

      const [cx, cy] = center;

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
    const MAP_WIDTH = 3600;
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
        const externalEdges = this._getExternalEdgesWithTolerance(t.polygons);
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
   * Get external edges for multi-polygon territory using tolerance-based matching.
   * Edges that approximately match or overlap between polygons are considered internal and excluded.
   */
  _getExternalEdgesWithTolerance(polygons) {
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
    if (!this.gameState || zoom < 0.3) return;

    const flagWidth = Math.max(28, Math.min(48, 38 * zoom));
    const flagHeight = flagWidth * 0.75;
    const starSize = Math.max(12, Math.min(20, 16 * zoom));

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
      const y = cy - 35;

      // Draw flag if available
      if (player && player.flag) {
        this._drawCapitalFlag(ctx, cx, y, flagWidth, flagHeight, player.flag, color);
      } else {
        // Fallback: draw star marker for capital
        this._drawCapitalStar(ctx, cx, y, starSize * 1.5, color);
      }
    }
  }

  _drawCapitalFlag(ctx, x, y, width, height, flag, color) {
    const img = this.flagImages[flag];

    ctx.save();

    // Draw colored background/border
    const padding = 3;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.roundRect(x - width / 2 - padding, y - height / 2 - padding, width + padding * 2, height + padding * 2, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw flag image
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
    }

    // Draw border around flag
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);

    // Draw small star below flag to indicate capital
    this._drawCapitalStar(ctx, x, y + height / 2 + 10, 14, '#ffd700');

    ctx.restore();
  }

  _drawCapitalStar(ctx, x, y, size, color) {
    const r = size / 2;
    const innerR = r * 0.4;
    const points = 5;

    ctx.save();
    ctx.translate(x, y);

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

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
      const externalEdges = this._getExternalEdgesWithTolerance(territory.polygons);
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
      const externalEdges = this._getExternalEdgesWithTolerance(territory.polygons);
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
        const externalEdges = this._getExternalEdgesWithTolerance(t.polygons);
        this._strokeEdges(ctx, externalEdges);
      }
      ctx.setLineDash([]);
    }
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

  /** Calculate the centroid of all polygons in a territory */
  _getTerritoryCenter(territory) {
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
    if (zoom < 0.3) return; // Don't show when too zoomed out

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);

    for (const [t1Name, t2Name] of CROSS_WATER_CONNECTIONS) {
      const t1 = this.territoryByName[t1Name];
      const t2 = this.territoryByName[t2Name];

      if (!t1 || !t2 || !t1.center || !t2.center) continue;

      const [x1, y1] = t1.center;
      const [x2, y2] = t2.center;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw small circles at endpoints
      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(x1, y1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }
}
