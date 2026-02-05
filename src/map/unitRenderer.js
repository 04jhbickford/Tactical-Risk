// Renders unit icons at territory centers using sprite images

import { getUnitIconPath } from '../utils/unitIcons.js';

export class UnitRenderer {
  constructor(gameState, territories, unitDefs) {
    this.gameState = gameState;
    this.unitDefs = unitDefs;

    this.territoryByName = {};
    for (const t of territories) {
      this.territoryByName[t.name] = t;
    }

    // Load unit images per faction
    this.factionUnitImages = {}; // factionId -> { unitType -> Image }
    this.imagesLoaded = false;
    this._loadImages();
  }

  async _loadImages() {
    const imagePromises = [];
    const factions = this.gameState.players?.map(p => p.id) || ['Americans', 'Germans', 'British', 'Japanese', 'Russians'];
    const unitTypes = Object.keys(this.unitDefs);

    for (const factionId of factions) {
      this.factionUnitImages[factionId] = {};

      for (const unitType of unitTypes) {
        const iconPath = getUnitIconPath(unitType, factionId);
        if (iconPath) {
          const img = new Image();
          const promise = new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Continue even if image fails
          });
          img.src = iconPath;
          this.factionUnitImages[factionId][unitType] = img;
          imagePromises.push(promise);
        }
      }
    }

    await Promise.all(imagePromises);
    this.imagesLoaded = true;
  }

  _getUnitImage(unitType, factionId) {
    return this.factionUnitImages[factionId]?.[unitType] || null;
  }

  render(ctx, zoom) {
    if (zoom < 0.35) return;

    const iconSize = Math.max(14, Math.min(24, 20 * zoom));
    const spacingX = iconSize + 4;
    const spacingY = iconSize + 8;
    const maxPerRow = 5;

    for (const [territory, placements] of Object.entries(this.gameState.units)) {
      const t = this.territoryByName[territory];
      if (!t) continue;

      // For sea zones with islands, offset the center to be over water
      let [cx, cy] = this._getTerritoryCenter(t);
      if (cx === null) continue;

      // If this is a sea zone, adjust center to avoid land overlap
      if (t.isWater) {
        const adjusted = this._adjustSeaZoneCenter(t, cx, cy);
        cx = adjusted.x;
        cy = adjusted.y;
      }

      // Group by type - show ALL types including cargo
      const grouped = this._groupUnits(placements, true);
      const types = Object.keys(grouped);
      if (types.length === 0) continue;

      // Calculate rows needed
      const numRows = Math.ceil(types.length / maxPerRow);
      const baseY = cy + 25;

      let typeIndex = 0;
      for (let row = 0; row < numRows; row++) {
        const typesInRow = Math.min(maxPerRow, types.length - row * maxPerRow);
        const rowY = baseY + row * spacingY;
        const startX = cx - ((typesInRow - 1) * spacingX) / 2;

        for (let col = 0; col < typesInRow && typeIndex < types.length; col++) {
          const key = types[typeIndex];
          const { total, owner, type: unitType, isOnCarrier, isOnTransport } = grouped[key];
          const x = startX + col * spacingX;
          const color = this.gameState.getPlayerColor(owner);

          this._drawUnitIcon(ctx, x, rowY, iconSize, unitType, color, owner, isOnCarrier, isOnTransport);

          if (total > 1) {
            this._drawBadge(ctx, x + iconSize / 2 - 2, rowY - iconSize / 2 + 2, total, zoom);
          }
          typeIndex++;
        }
      }
    }
  }

  // Adjust sea zone center to avoid island overlap
  _adjustSeaZoneCenter(territory, cx, cy) {
    // For now, just offset slightly - could be improved with actual island detection
    // Check if there are any adjacent land territories that might overlap
    const connections = territory.connections || [];
    let hasAdjacentLand = false;

    for (const conn of connections) {
      const neighbor = this.territoryByName[conn];
      if (neighbor && !neighbor.isWater) {
        hasAdjacentLand = true;
        break;
      }
    }

    // If there's adjacent land, offset the center slightly
    if (hasAdjacentLand) {
      // Offset towards the center of the sea zone away from land
      return { x: cx, y: cy + 30 };
    }

    return { x: cx, y: cy };
  }

  _groupUnits(placements, includeCargo = false) {
    // Group by BOTH type AND owner to show units from different players separately
    const grouped = {};
    for (const p of placements) {
      const key = `${p.type}_${p.owner}`;
      if (!grouped[key]) {
        grouped[key] = { total: 0, owner: p.owner, type: p.type };
      }
      grouped[key].total += p.quantity;

      // Include cargo from carriers (aircraft)
      if (includeCargo && p.type === 'carrier' && p.aircraft) {
        for (const aircraft of p.aircraft) {
          const cargoKey = `${aircraft.type}_${aircraft.owner}_carrier`;
          if (!grouped[cargoKey]) {
            grouped[cargoKey] = { total: 0, owner: aircraft.owner, type: aircraft.type, isOnCarrier: true };
          }
          grouped[cargoKey].total += 1;
        }
      }

      // Include cargo from transports
      if (includeCargo && p.type === 'transport' && p.cargo) {
        for (const cargo of p.cargo) {
          const cargoKey = `${cargo.type}_${cargo.owner}_transport`;
          if (!grouped[cargoKey]) {
            grouped[cargoKey] = { total: 0, owner: cargo.owner, type: cargo.type, isOnTransport: true };
          }
          grouped[cargoKey].total += 1;
        }
      }
    }
    return grouped;
  }

  _drawUnitIcon(ctx, x, y, size, unitType, color, factionId, isOnCarrier = false, isOnTransport = false) {
    const img = this._getUnitImage(unitType, factionId);

    ctx.save();

    // Draw colored background circle/square
    const bgSize = size + 4;
    ctx.fillStyle = color;

    // Add indicator for units on carriers/transports
    if (isOnCarrier || isOnTransport) {
      // Draw a small boat/carrier symbol underneath
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Draw a small underline to indicate "on board"
      ctx.moveTo(x - bgSize / 2, y + bgSize / 2 + 2);
      ctx.lineTo(x + bgSize / 2, y + bgSize / 2 + 2);
      ctx.stroke();

      // Slightly different border color for cargo units
      ctx.strokeStyle = isOnCarrier ? 'rgba(100,150,255,0.8)' : 'rgba(150,100,50,0.8)';
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    }
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(x - bgSize / 2, y - bgSize / 2, bgSize, bgSize, 4);
    ctx.fill();
    ctx.stroke();

    // Draw unit image
    if (img && img.complete && img.naturalWidth > 0) {
      // Tint the image with the player color slightly
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      // Fallback: draw simple shape
      this._drawFallbackIcon(ctx, x, y, size * 0.4, unitType);
    }

    ctx.restore();
  }

  _drawFallbackIcon(ctx, x, y, r, unitType) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    switch (unitType) {
      case 'infantry':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        break;
      case 'armour':
        ctx.rect(x - r, y - r * 0.6, r * 2, r * 1.2);
        break;
      case 'artillery':
        ctx.moveTo(x - r, y + r);
        ctx.lineTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.closePath();
        break;
      case 'fighter':
      case 'bomber':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.closePath();
        break;
      default:
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  _drawBadge(ctx, x, y, count, zoom) {
    const fontSize = Math.max(9, Math.min(12, 11 * zoom));
    const text = count.toString();

    ctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const width = Math.max(metrics.width + 6, fontSize + 2);
    const height = fontSize + 4;

    // Badge background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 4);
    ctx.fill();

    // Badge border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
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
}
