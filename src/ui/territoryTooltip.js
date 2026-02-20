// Territory tooltip that appears on hover over the map

import { getUnitIconPath } from '../utils/unitIcons.js';

export class TerritoryTooltip {
  constructor(continents) {
    this.continents = continents;
    this.gameState = null;
    this.unitDefs = null;

    // Build continent lookup
    this.continentByTerritory = {};
    for (const c of continents) {
      for (const t of c.territories) {
        this.continentByTerritory[t] = c;
      }
    }

    // Create tooltip element
    this.el = document.createElement('div');
    this.el.id = 'territoryTooltip';
    this.el.className = 'territory-tooltip hidden';
    document.body.appendChild(this.el);

    this.currentTerritory = null;
  }

  setGameState(gameState) {
    this.gameState = gameState;
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
  }

  show(territory, screenX, screenY) {
    if (!territory) {
      this.hide();
      return;
    }

    this.currentTerritory = territory;
    const t = territory;
    const isLand = !t.isWater;
    const continent = isLand ? this.continentByTerritory[t.name] : null;

    let html = `<div class="tt-header">${t.name}</div>`;

    // Owner info for land territories
    if (this.gameState && isLand) {
      const owner = this.gameState.getOwner(t.name);
      if (owner) {
        const player = this.gameState.getPlayer(owner);
        const flag = player?.flag;
        html += `<div class="tt-owner">`;
        if (flag) {
          html += `<img src="assets/flags/${flag}" class="tt-flag" alt="">`;
        }
        html += `<span style="color:${player?.color || '#888'}">${player?.name || owner}</span>`;
        html += `</div>`;
      }

      // Special indicators row
      const indicators = [];
      if (this.gameState.isCapital(t.name)) {
        indicators.push(`<span class="tt-indicator capital">★ Capital</span>`);
      }
      const units = this.gameState.getUnitsAt(t.name);
      const hasFactory = units.some(u => u.type === 'factory');
      if (hasFactory) {
        indicators.push(`<span class="tt-indicator factory">🏭 Factory</span>`);
      }
      const hasAA = units.some(u => u.type === 'aaGun');
      if (hasAA) {
        indicators.push(`<span class="tt-indicator aa">⚙ AA Gun</span>`);
      }
      if (indicators.length > 0) {
        html += `<div class="tt-indicators">${indicators.join('')}</div>`;
      }
    }

    // Production & Continent for land, "Sea Zone" label for water
    if (isLand) {
      html += `<div class="tt-stats">`;
      html += `<span class="tt-ipc">💰 ${t.production || 0} IPC</span>`;
      if (continent) {
        html += `<span class="tt-continent" style="border-color:${continent.color}">${continent.name} (+${continent.bonus})</span>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="tt-type">🌊 Sea Zone</div>`;
    }

    // Units section - grouped by owner
    if (this.gameState) {
      const units = this.gameState.getUnitsAt(t.name);
      if (units && units.length > 0) {
        // Group units by owner
        const unitsByOwner = {};
        for (const u of units) {
          if (!unitsByOwner[u.owner]) unitsByOwner[u.owner] = [];
          unitsByOwner[u.owner].push(u);
        }

        html += `<div class="tt-units-section">`;

        for (const [ownerId, ownerUnits] of Object.entries(unitsByOwner)) {
          const player = this.gameState.getPlayer(ownerId);
          const color = player?.color || '#888';
          const playerName = player?.name || ownerId;

          // Calculate power totals for this player
          let totalAttack = 0;
          let totalDefense = 0;

          html += `<div class="tt-player-units">`;
          html += `<div class="tt-player-header" style="border-color:${color}">`;
          if (player?.flag) {
            html += `<img src="assets/flags/${player.flag}" class="tt-player-flag" alt="">`;
          }
          html += `<span class="tt-player-name" style="color:${color}">${playerName}</span>`;
          html += `</div>`;

          html += `<div class="tt-units-grid">`;
          for (const u of ownerUnits) {
            const def = this.unitDefs?.[u.type];
            const iconPath = getUnitIconPath(u.type, u.owner);

            // Accumulate power totals
            if (def) {
              totalAttack += (def.attack || 0) * u.quantity;
              totalDefense += (def.defense || 0) * u.quantity;
            }

            // Build hover tooltip for this unit
            let unitTooltip = `${u.type.charAt(0).toUpperCase() + u.type.slice(1)}`;
            if (def) {
              unitTooltip += `\nAttack: ${def.attack || 0}`;
              unitTooltip += `\nDefense: ${def.defense || 0}`;
              unitTooltip += `\nMovement: ${def.movement || 0}`;
              if (def.cost) unitTooltip += `\nCost: ${def.cost} IPCs`;
            }

            html += `<div class="tt-unit-icon-row" title="${unitTooltip}">`;
            if (iconPath) {
              html += `<img src="${iconPath}" class="tt-unit-icon" style="border-color:${color}" alt="${u.type}">`;
            } else {
              html += `<span class="tt-unit-badge" style="background:${color}"></span>`;
            }
            html += `<span class="tt-unit-qty">×${u.quantity}</span>`;
            html += `</div>`;
          }
          html += `</div>`;

          // Power totals row for this player
          if (totalAttack > 0 || totalDefense > 0) {
            html += `<div class="tt-power-totals">`;
            html += `<span class="tt-power-attack">⚔ ${totalAttack}</span>`;
            html += `<span class="tt-power-defense">🛡 ${totalDefense}</span>`;
            html += `</div>`;
          }

          html += `</div>`;
        }

        html += `</div>`;
      }
    }

    // Continent progress - show all players with presence
    if (this.gameState && continent && isLand) {
      const ownership = this._getContinentOwnership(continent);
      if (ownership.length > 0) {
        html += `<div class="tt-continent-section">`;
        html += `<div class="tt-continent-title" style="color:${continent.color}">${continent.name} Control</div>`;

        for (const { player, count, total, hasBonus } of ownership) {
          const pct = Math.round((count / total) * 100);
          html += `<div class="tt-continent-row ${hasBonus ? 'has-bonus' : ''}">`;
          html += `<div class="tt-continent-player">`;
          if (player.flag) {
            html += `<img src="assets/flags/${player.flag}" class="tt-micro-flag" alt="">`;
          }
          html += `<span style="color:${player.color}">${player.name}</span>`;
          html += `<span class="tt-continent-count">${count}/${total}</span>`;
          if (hasBonus) html += `<span class="tt-continent-bonus-badge">+${continent.bonus}</span>`;
          html += `</div>`;
          html += `<div class="tt-progress-bar"><div class="tt-progress-fill" style="width:${pct}%;background:${player.color}"></div></div>`;
          html += `</div>`;
        }

        html += `</div>`;
      }
    }

    // Adjacent territories hint
    if (t.connections && t.connections.length > 0) {
      const landConns = t.connections.filter(c => {
        const ct = this.gameState?.territoryByName?.[c];
        return ct && !ct.isWater;
      });
      const seaConns = t.connections.filter(c => {
        const ct = this.gameState?.territoryByName?.[c];
        return ct && ct.isWater;
      });

      if (landConns.length > 0 || seaConns.length > 0) {
        html += `<div class="tt-adjacent">`;
        html += `<span class="tt-adjacent-label">Adjacent:</span>`;
        if (landConns.length > 0) {
          html += `<span class="tt-adjacent-count">🏔 ${landConns.length} land</span>`;
        }
        if (seaConns.length > 0) {
          html += `<span class="tt-adjacent-count">🌊 ${seaConns.length} sea</span>`;
        }
        html += `</div>`;
      }
    }

    this.el.innerHTML = html;
    this.el.classList.remove('hidden');

    // Position tooltip near cursor but within viewport
    this._position(screenX, screenY);
  }

  _getContinentOwnership(continent) {
    const ownership = {};
    const total = continent.territories.length;

    for (const terrName of continent.territories) {
      const owner = this.gameState.getOwner(terrName);
      if (owner) {
        ownership[owner] = (ownership[owner] || 0) + 1;
      }
    }

    return Object.entries(ownership)
      .map(([playerId, count]) => {
        const player = this.gameState.getPlayer(playerId);
        return {
          player: player || { id: playerId, name: playerId, color: '#888' },
          count,
          total,
          hasBonus: count === total
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  _position(x, y) {
    const padding = 15;
    const rect = this.el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: show to right and below cursor
    let left = x + padding;
    let top = y + padding;

    // Flip if would go off-screen
    if (left + rect.width > vw - padding) {
      left = x - rect.width - padding;
    }
    if (top + rect.height > vh - padding) {
      top = y - rect.height - padding;
    }

    // Ensure minimum position
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  hide() {
    this.el.classList.add('hidden');
    this.currentTerritory = null;
  }

  get isVisible() {
    return !this.el.classList.contains('hidden');
  }
}
