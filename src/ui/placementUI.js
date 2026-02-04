// Placement UI for initial Risk setup - 6-unit clockwise placement rounds
// Flow: Click territory first, then click units to place on that territory

import { GAME_PHASES } from '../state/gameState.js';

export class PlacementUI {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.territoryByName = null;
    this.selectedTerritory = null;  // Selected territory to place units on
    this.onPlacementComplete = null;

    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'placementPanel';
    this.el.className = 'placement-panel hidden';
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
    this.onPlacementComplete = callback;
  }

  isActive() {
    return this.gameState &&
      this.gameState.phase === GAME_PHASES.UNIT_PLACEMENT &&
      this.gameState.hasUnitsToPlace(this.gameState.currentPlayer?.id);
  }

  show() {
    this.selectedTerritory = null;
    this._render();
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  // Called when user clicks a territory during placement - selects it for unit placement
  handleTerritoryClick(territory) {
    if (!this.isActive()) return false;

    const player = this.gameState.currentPlayer;
    if (!player) return false;

    // Check if this is a valid territory to place on
    const isValidLand = this.gameState.getOwner(territory.name) === player.id;
    const isValidSea = territory.isWater && this._isAdjacentToOwnedCoastal(territory.name, player.id);

    if (isValidLand || isValidSea) {
      this.selectedTerritory = territory;
      this._render();
      return true;
    }

    return false;
  }

  _isAdjacentToOwnedCoastal(seaZoneName, playerId) {
    const seaZone = this.territoryByName[seaZoneName];
    if (!seaZone || !seaZone.isWater) return false;

    // Check if any adjacent territory is owned by player and is coastal
    for (const conn of seaZone.connections) {
      const t = this.territoryByName[conn];
      if (t && !t.isWater && this.gameState.getOwner(conn) === playerId) {
        return true;
      }
    }
    return false;
  }

  // Place a unit on the selected territory (called when clicking a unit button)
  _placeUnit(unitType) {
    if (!this.selectedTerritory || !this.isActive()) return;

    const player = this.gameState.currentPlayer;
    if (!player) return;

    const result = this.gameState.placeInitialUnit(
      this.selectedTerritory.name,
      unitType,
      this.unitDefs
    );

    if (result.success) {
      // Don't auto-advance - let user review and undo if needed
      // The "Done - Next Player" button will appear when 6 units placed

      if (this.onPlacementComplete) {
        this.onPlacementComplete();
      }

      this._render();
    }
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

    const unitsToPlace = this.gameState.getUnitsToPlace(player.id);
    const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);
    const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
    const maxThisRound = Math.min(6, totalRemaining + placedThisRound);

    let html = `
      <div class="pl-header">
        <div class="pl-title">Initial Deployment</div>
        <div class="pl-player" style="color: ${player.color}">${player.name}</div>
      </div>

      <div class="pl-progress">
        <div class="pl-round">Round ${this.gameState.placementRound || 1}</div>
        <div class="pl-placed">${placedThisRound} of ${maxThisRound} placed this round</div>
        <div class="pl-progress-bar">
          <div class="pl-progress-fill" style="width: ${(placedThisRound / maxThisRound) * 100}%"></div>
        </div>
      </div>
    `;

    // Show selected territory or instruction
    if (this.selectedTerritory) {
      const isSeaZone = this.selectedTerritory.isWater;
      html += `
        <div class="pl-selected-territory">
          <span class="pl-selected-label">Placing on:</span>
          <span class="pl-selected-name">${this.selectedTerritory.name}</span>
          <button class="pl-deselect-btn" data-action="deselect">×</button>
        </div>
        <div class="pl-instructions">Click a unit below to place it here</div>
      `;

      // Filter units based on territory type
      const availableUnits = unitsToPlace.filter(u => {
        if (u.quantity <= 0) return false;
        const def = this.unitDefs[u.type];
        if (!def) return false;
        // Sea zones only accept naval units
        if (isSeaZone) return def.isSea;
        // Land territories accept land, air, and buildings
        return def.isLand || def.isAir || def.isBuilding;
      });

      if (availableUnits.length > 0) {
        html += `<div class="pl-units">`;
        for (const unit of availableUnits) {
          html += this._renderUnitButton(unit);
        }
        html += `</div>`;
      } else {
        html += `<div class="pl-no-units">No ${isSeaZone ? 'naval' : 'land'} units available to place</div>`;
      }
    } else {
      html += `
        <div class="pl-instructions">
          <strong>Click a territory</strong> on the map to select where to place units
        </div>
      `;

      // Show summary of remaining units
      html += `<div class="pl-remaining-summary">`;
      html += `<div class="pl-remaining-label">Units to place:</div>`;

      const landUnits = unitsToPlace.filter(u => {
        const def = this.unitDefs[u.type];
        return def && (def.isLand || def.isAir || def.isBuilding) && u.quantity > 0;
      });
      const navalUnits = unitsToPlace.filter(u => {
        const def = this.unitDefs[u.type];
        return def && def.isSea && u.quantity > 0;
      });

      if (landUnits.length > 0) {
        html += `<div class="pl-summary-group">`;
        html += `<span class="pl-summary-label">Land:</span>`;
        html += landUnits.map(u => `${u.quantity}× ${u.type}`).join(', ');
        html += `</div>`;
      }
      if (navalUnits.length > 0) {
        html += `<div class="pl-summary-group">`;
        html += `<span class="pl-summary-label">Naval:</span>`;
        html += navalUnits.map(u => `${u.quantity}× ${u.type}`).join(', ');
        html += `</div>`;
      }
      html += `</div>`;
    }

    // Actions
    const canUndo = this.gameState.placementHistory && this.gameState.placementHistory.length > 0;
    const roundComplete = placedThisRound >= 6 || totalRemaining === 0;

    html += `
      <div class="pl-actions">
        ${canUndo ? `
          <button class="pl-btn undo" data-action="undo">Undo Last</button>
        ` : ''}
        ${placedThisRound > 0 ? `
          <button class="pl-btn done ${roundComplete ? 'primary' : ''}" data-action="finish">
            ${roundComplete ? '✓ Done - Next Player' : 'End Round Early'}
          </button>
        ` : ''}
      </div>
    `;

    this.el.innerHTML = html;
    this.el.classList.remove('hidden');
    this._bindEvents();
  }

  _renderUnitButton(unit) {
    const def = this.unitDefs[unit.type];
    const imageSrc = def?.image ? `assets/units/${def.image}` : null;

    return `
      <button class="pl-unit-btn" data-unit="${unit.type}">
        <div class="pl-unit-icon-wrapper">
          ${imageSrc ? `<img src="${imageSrc}" class="pl-unit-icon" alt="${unit.type}">` : ''}
        </div>
        <div class="pl-unit-info">
          <span class="pl-unit-name">${unit.type}</span>
          <span class="pl-unit-qty">x${unit.quantity}</span>
        </div>
      </button>
    `;
  }

  _bindEvents() {
    // Unit buttons - clicking places the unit immediately
    this.el.querySelectorAll('.pl-unit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const unitType = btn.dataset.unit;
        this._placeUnit(unitType);
      });
    });

    // Deselect territory
    this.el.querySelector('[data-action="deselect"]')?.addEventListener('click', () => {
      this.selectedTerritory = null;
      this._render();
    });

    // Action buttons
    this.el.querySelector('[data-action="undo"]')?.addEventListener('click', () => {
      this.gameState.undoPlacement();
      if (this.onPlacementComplete) this.onPlacementComplete();
    });

    this.el.querySelector('[data-action="finish"]')?.addEventListener('click', () => {
      this.gameState.finishPlacementRound();
      this.selectedTerritory = null;
      if (this.onPlacementComplete) this.onPlacementComplete();
    });
  }

  getSelectedTerritory() {
    return this.selectedTerritory;
  }

  clearSelection() {
    this.selectedTerritory = null;
    this._render();
  }
}
