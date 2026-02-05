// Mobilize UI for placing purchased units during MOBILIZE phase

import { TURN_PHASES } from '../state/gameState.js';
import { getUnitIconPath } from '../utils/unitIcons.js';

export class MobilizeUI {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.territoryByName = null;
    this.selectedTerritory = null;
    this.onMobilizeComplete = null;

    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'mobilizePanel';
    this.el.className = 'mobilize-panel hidden';
    document.body.appendChild(this.el);
  }

  setGameState(gameState) {
    this.gameState = gameState;
    if (gameState) {
      gameState.subscribe(() => this._render());
    }
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
  }

  setTerritories(territories) {
    this.territoryByName = {};
    for (const t of territories) {
      this.territoryByName[t.name] = t;
    }
  }

  setOnComplete(callback) {
    this.onMobilizeComplete = callback;
  }

  isActive() {
    if (!this.gameState) return false;
    return this.gameState.turnPhase === TURN_PHASES.MOBILIZE;
  }

  show() {
    this.selectedTerritory = null;
    this._render();
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  // Called when user clicks a territory during mobilize phase
  handleTerritoryClick(territory) {
    if (!this.isActive()) return false;

    const player = this.gameState.currentPlayer;
    if (!player) return false;

    // Check if valid placement location
    const factoryTerritories = this.gameState._getFactoryTerritories(player.id);
    const validNavalZones = this.gameState._getValidNavalPlacementZones(player.id);

    const isValidLand = factoryTerritories.includes(territory.name);
    const isValidSea = validNavalZones.has(territory.name);

    if (isValidLand || isValidSea) {
      this.selectedTerritory = territory;
      this._render();
      return true;
    }

    return false;
  }

  _render() {
    if (!this.gameState || !this.unitDefs) {
      this.el.innerHTML = '';
      return;
    }

    if (!this.isActive()) {
      this.hide();
      return;
    }

    const player = this.gameState.currentPlayer;
    if (!player) return;

    const pendingUnits = this.gameState.getPendingPurchases();
    const totalPending = pendingUnits.reduce((sum, u) => sum + u.quantity, 0);

    let html = `
      <div class="mob-header" style="border-left: 5px solid ${player.color}">
        <div class="mob-title">Mobilize Units</div>
        <div class="mob-player" style="color: ${player.color}">${player.name}</div>
      </div>
    `;

    if (totalPending === 0) {
      html += `
        <div class="mob-empty">
          <p>No units to place.</p>
          <button class="mob-btn primary" data-action="done">Continue</button>
        </div>
      `;
    } else if (this.selectedTerritory) {
      const isSeaZone = this.selectedTerritory.isWater;

      html += `
        <div class="mob-selected">
          <span class="mob-label">Placing at:</span>
          <span class="mob-territory">${this.selectedTerritory.name}</span>
          <button class="mob-deselect" data-action="deselect">×</button>
        </div>
        <div class="mob-instructions">Click a unit to place it here</div>
      `;

      // Filter units based on territory type
      const availableUnits = pendingUnits.filter(u => {
        const def = this.unitDefs[u.type];
        if (!def) return false;
        if (isSeaZone) return def.isSea;
        return def.isLand || def.isAir;
      });

      if (availableUnits.length > 0) {
        html += `<div class="mob-units">`;
        for (const unit of availableUnits) {
          html += this._renderUnitButton(unit);
        }
        html += `</div>`;
      } else {
        html += `<div class="mob-no-units">No ${isSeaZone ? 'naval' : 'land/air'} units to place here</div>`;
      }
    } else {
      html += `
        <div class="mob-instructions">
          <strong>Click a territory</strong> with a factory to place units
        </div>
        <div class="mob-pending">
          <div class="mob-pending-label">Units to place:</div>
      `;

      const landUnits = pendingUnits.filter(u => {
        const def = this.unitDefs[u.type];
        return def && (def.isLand || def.isAir);
      });
      const navalUnits = pendingUnits.filter(u => {
        const def = this.unitDefs[u.type];
        return def && def.isSea;
      });

      if (landUnits.length > 0) {
        html += `<div class="mob-group"><span class="mob-group-label">Land/Air:</span> ${landUnits.map(u => `${u.quantity}× ${u.type}`).join(', ')}</div>`;
      }
      if (navalUnits.length > 0) {
        html += `<div class="mob-group"><span class="mob-group-label">Naval:</span> ${navalUnits.map(u => `${u.quantity}× ${u.type}`).join(', ')}</div>`;
      }

      html += `</div>`;
    }

    // Actions
    if (totalPending > 0) {
      html += `
        <div class="mob-actions">
          <span class="mob-remaining">${totalPending} unit${totalPending !== 1 ? 's' : ''} remaining</span>
        </div>
      `;
    }

    this.el.innerHTML = html;
    this.el.classList.remove('hidden');
    this._bindEvents();
  }

  _renderUnitButton(unit) {
    const def = this.unitDefs[unit.type];
    const player = this.gameState.currentPlayer;
    const imageSrc = player ? getUnitIconPath(unit.type, player.id) : (def?.image ? `assets/units/${def.image}` : null);

    return `
      <button class="mob-unit-btn" data-unit="${unit.type}">
        <div class="mob-unit-icon-wrapper">
          ${imageSrc ? `<img src="${imageSrc}" class="mob-unit-icon" alt="${unit.type}">` : ''}
        </div>
        <div class="mob-unit-info">
          <span class="mob-unit-name">${unit.type}</span>
          <span class="mob-unit-qty">×${unit.quantity}</span>
        </div>
      </button>
    `;
  }

  _bindEvents() {
    // Unit buttons
    this.el.querySelectorAll('.mob-unit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const unitType = btn.dataset.unit;
        this._placeUnit(unitType);
      });
    });

    // Deselect
    this.el.querySelector('[data-action="deselect"]')?.addEventListener('click', () => {
      this.selectedTerritory = null;
      this._render();
    });

    // Done button
    this.el.querySelector('[data-action="done"]')?.addEventListener('click', () => {
      this.hide();
      if (this.onMobilizeComplete) {
        this.onMobilizeComplete();
      }
    });
  }

  _placeUnit(unitType) {
    if (!this.selectedTerritory || !this.isActive()) return;

    const result = this.gameState.mobilizeUnit(
      unitType,
      this.selectedTerritory.name,
      this.unitDefs
    );

    if (result.success) {
      // Check if all units placed
      const remaining = this.gameState.getPendingPurchases();
      if (remaining.length === 0) {
        this.selectedTerritory = null;
        if (this.onMobilizeComplete) {
          this.onMobilizeComplete();
        }
      }
      this._render();
    } else {
      console.warn('Mobilize failed:', result.error);
    }
  }

  getSelectedTerritory() {
    return this.selectedTerritory;
  }

  clearSelection() {
    this.selectedTerritory = null;
    this._render();
  }
}
