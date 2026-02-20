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

    // Owner info
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

      // Capital indicator
      if (this.gameState.isCapital(t.name)) {
        html += `<div class="tt-capital">★ Capital</div>`;
      }

      // Factory indicator
      const units = this.gameState.getUnitsAt(t.name);
      const hasFactory = units.some(u => u.type === 'factory');
      if (hasFactory) {
        html += `<div class="tt-factory">🏭 Factory</div>`;
      }
    }

    // Production & Continent
    if (isLand) {
      html += `<div class="tt-stats">`;
      html += `<span class="tt-ipc">${t.production || 0} IPC</span>`;
      if (continent) {
        html += `<span class="tt-continent" style="border-color:${continent.color}">${continent.name}</span>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="tt-type">Sea Zone</div>`;
    }

    // Units with icons and power totals
    if (this.gameState) {
      const units = this.gameState.getUnitsAt(t.name);
      if (units && units.length > 0) {
        // Calculate total attack and defense power
        let totalAttack = 0;
        let totalDefense = 0;

        html += `<div class="tt-units-section">`;
        html += `<div class="tt-units-grid">`;

        for (const u of units) {
          const player = this.gameState.getPlayer(u.owner);
          const color = player?.color || '#888';
          const def = this.unitDefs?.[u.type];
          const iconPath = getUnitIconPath(u.type, u.owner);

          // Accumulate power totals
          if (def) {
            totalAttack += (def.attack || 0) * u.quantity;
            totalDefense += (def.defense || 0) * u.quantity;
          }

          html += `<div class="tt-unit-icon-row">`;
          if (iconPath) {
            html += `<img src="${iconPath}" class="tt-unit-icon" style="border-color:${color}" alt="${u.type}">`;
          } else {
            html += `<span class="tt-unit-badge" style="background:${color}"></span>`;
          }
          html += `<span class="tt-unit-qty">${u.quantity}</span>`;
          html += `<span class="tt-unit-name">${u.type}</span>`;
          if (def) {
            html += `<span class="tt-unit-stats-mini">A${def.attack}/D${def.defense}</span>`;
          }
          html += `</div>`;
        }

        html += `</div>`;

        // Power totals row
        if (totalAttack > 0 || totalDefense > 0) {
          html += `<div class="tt-power-totals">`;
          html += `<span class="tt-power-attack">⚔ ${totalAttack}</span>`;
          html += `<span class="tt-power-defense">🛡 ${totalDefense}</span>`;
          html += `</div>`;
        }

        html += `</div>`;
      }
    }

    // Continent progress for owner
    if (this.gameState && continent && isLand) {
      const owner = this.gameState.getOwner(t.name);
      if (owner) {
        const owned = continent.territories.filter(tName =>
          this.gameState.getOwner(tName) === owner
        ).length;
        const total = continent.territories.length;
        const pct = Math.round((owned / total) * 100);
        const player = this.gameState.getPlayer(owner);
        const hasBonus = owned === total;

        html += `<div class="tt-continent-progress ${hasBonus ? 'has-bonus' : ''}">`;
        html += `<div class="tt-continent-header">`;
        html += `<span class="tt-continent-name" style="color:${continent.color}">${continent.name}</span>`;
        html += `<span class="tt-continent-bonus">+${continent.bonus}</span>`;
        html += `</div>`;
        html += `<div class="tt-progress-bar">`;
        html += `<div class="tt-progress-fill" style="width:${pct}%;background:${player?.color || continent.color}"></div>`;
        html += `</div>`;
        html += `<span class="tt-progress-text">${owned}/${total} territories</span>`;
        html += `</div>`;
      }
    }

    this.el.innerHTML = html;
    this.el.classList.remove('hidden');

    // Position tooltip near cursor but within viewport
    this._position(screenX, screenY);
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
