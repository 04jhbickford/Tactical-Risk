// Movement UI for selecting and moving units between territories

import { TURN_PHASES } from '../state/gameState.js';
import { getUnitIconPath } from '../utils/unitIcons.js';

export class MovementUI {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.territoryByName = null;
    this.onMoveComplete = null;

    // Movement state
    this.selectedFrom = null;
    this.selectedUnits = {}; // { unitType: quantity }

    // Drag state
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    this._create();
  }

  _create() {
    // Movement panel (shows when territory selected in movement phase)
    this.el = document.createElement('div');
    this.el.id = 'movementPanel';
    this.el.className = 'movement-panel hidden';
    document.body.appendChild(this.el);

    // Initialize drag functionality
    this._initDrag();
  }

  _initDrag() {
    let startX, startY, startLeft, startTop;

    const onMouseDown = (e) => {
      if (!e.target.classList.contains('mp-drag-handle')) return;

      this.isDragging = true;
      this.el.classList.add('dragging');

      const rect = this.el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      this.el.style.left = `${startLeft + dx}px`;
      this.el.style.top = `${startTop + dy}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.el.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.el.addEventListener('mousedown', onMouseDown);
  }

  setGameState(gameState) {
    this.gameState = gameState;
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

  setOnMoveComplete(callback) {
    this.onMoveComplete = callback;
  }

  isMovementPhase() {
    return this.gameState &&
      (this.gameState.turnPhase === TURN_PHASES.COMBAT_MOVE ||
       this.gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE);
  }

  // Called when user clicks a territory during movement phase
  selectTerritory(territory) {
    if (!this.isMovementPhase()) return false;

    const player = this.gameState.currentPlayer;
    if (!player) return false;

    // If we have a source selected, this might be a destination
    if (this.selectedFrom) {
      // Check if clicking same territory - deselect
      if (territory.name === this.selectedFrom.name) {
        this.cancel();
        return true;
      }

      // Check if valid destination
      if (this.canMoveTo(territory)) {
        this._showMoveConfirm(territory);
        return true;
      } else {
        // Try selecting this territory as new source
        if (this._hasMovableUnits(territory)) {
          this.selectSource(territory);
          return true;
        }
      }
    } else {
      // Select as source if we have units there
      if (this._hasMovableUnits(territory)) {
        this.selectSource(territory);
        return true;
      }
    }

    return false;
  }

  _hasMovableUnits(territory) {
    const player = this.gameState.currentPlayer;
    const units = this.gameState.getUnitsAt(territory.name);
    return units.some(u => u.owner === player.id && !u.moved && this._canUnitMove(u.type));
  }

  _canUnitMove(unitType) {
    const def = this.unitDefs?.[unitType];
    return def && def.movement > 0 && !def.isBuilding;
  }

  selectSource(territory) {
    this.selectedFrom = territory;
    this.selectedUnits = {};
    this._render();
    this.el.classList.remove('hidden');
  }

  canMoveTo(territory) {
    if (!this.selectedFrom) return false;

    // Check adjacency - use getConnections() to include land bridges
    const connections = this.gameState.getConnections(this.selectedFrom.name);
    if (!connections.includes(territory.name)) {
      return false;
    }

    const player = this.gameState.currentPlayer;
    const toOwner = this.gameState.getOwner(territory.name);
    const isEnemy = toOwner && toOwner !== player.id &&
      !this.gameState.areAllies(player.id, toOwner);

    // Non-combat move cannot enter enemy territory
    if (this.gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE && isEnemy) {
      return false;
    }

    // Check terrain compatibility
    const hasLandSelected = Object.keys(this.selectedUnits).some(type => {
      const def = this.unitDefs[type];
      return def && def.isLand && this.selectedUnits[type] > 0;
    });

    const hasSeaSelected = Object.keys(this.selectedUnits).some(type => {
      const def = this.unitDefs[type];
      return def && def.isSea && this.selectedUnits[type] > 0;
    });

    const hasAirSelected = Object.keys(this.selectedUnits).some(type => {
      const def = this.unitDefs[type];
      return def && def.isAir && this.selectedUnits[type] > 0;
    });

    // Check for land bridge connection
    const isLandBridge = this.gameState.hasLandBridge?.(this.selectedFrom.name, territory.name);

    // Air units can fly anywhere (over land or water)
    if (hasAirSelected && !hasLandSelected && !hasSeaSelected) {
      return true; // Pure air movement is always allowed
    }

    // Land bridges allow land units to cross
    if (isLandBridge && hasLandSelected && !territory.isWater) {
      return true;
    }

    // Normal terrain checks
    if (hasLandSelected && territory.isWater) return false;
    if (hasSeaSelected && !territory.isWater) return false;

    return true;
  }

  getValidDestinations() {
    if (!this.selectedFrom || !this.gameState) return [];

    // Use gameState.getConnections() to include land bridge connections
    const connections = this.gameState.getConnections(this.selectedFrom.name);

    return connections.filter(connName => {
      const t = this.territoryByName[connName];
      return t && this.canMoveTo(t);
    });
  }

  // Get destinations with enemy flags for highlighting
  getDestinationsWithEnemyFlags() {
    if (!this.selectedFrom || !this.gameState) return { destinations: [], isEnemy: {} };

    const destinations = this.getValidDestinations();
    const player = this.gameState.currentPlayer;
    const isEnemy = {};

    for (const dest of destinations) {
      const owner = this.gameState.getOwner(dest);
      isEnemy[dest] = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
    }

    return { destinations, isEnemy };
  }

  hasUnitsSelected() {
    return Object.values(this.selectedUnits).some(q => q > 0);
  }

  getSelectedSource() {
    return this.selectedFrom;
  }

  _showMoveConfirm(destination) {
    // Execute the move
    const unitsToMove = Object.entries(this.selectedUnits)
      .filter(([_, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    if (unitsToMove.length === 0) {
      return;
    }

    const result = this.gameState.moveUnits(
      this.selectedFrom.name,
      destination.name,
      unitsToMove,
      this.unitDefs
    );

    if (result.success) {
      const moveInfo = {
        from: this.selectedFrom.name,
        to: destination.name,
        units: unitsToMove,
        captured: result.captured,
        isAttack: result.isAttack,
      };
      this.cancel();
      if (this.onMoveComplete) {
        this.onMoveComplete(moveInfo);
      }
    } else {
      // Show error
      console.warn('Move failed:', result.error);
    }
  }

  cancel() {
    this.selectedFrom = null;
    this.selectedUnits = {};
    this.el.classList.add('hidden');
  }

  _render() {
    if (!this.selectedFrom || !this.gameState) {
      this.el.classList.add('hidden');
      return;
    }

    const player = this.gameState.currentPlayer;
    const units = this.gameState.getUnitsAt(this.selectedFrom.name);
    const movableUnits = units.filter(u =>
      u.owner === player.id &&
      !u.moved &&
      this._canUnitMove(u.type)
    );

    const isCombatMove = this.gameState.turnPhase === TURN_PHASES.COMBAT_MOVE;
    const phaseLabel = isCombatMove ? 'Combat Movement' : 'Non-Combat Movement';
    const canUndo = isCombatMove && this.gameState.moveHistory && this.gameState.moveHistory.length > 0;

    let html = `
      <div class="mp-drag-handle"></div>
      <div class="mp-header">
        <div class="mp-title">Move Units</div>
        <div class="mp-phase">${phaseLabel}</div>
      </div>

      <div class="mp-from">
        <span class="mp-label">From:</span>
        <span class="mp-territory">${this.selectedFrom.name}</span>
      </div>

      <div class="mp-units">
    `;

    for (const unit of movableUnits) {
      const def = this.unitDefs[unit.type];
      const selected = this.selectedUnits[unit.type] || 0;
      // Use faction-specific icon
      const imageSrc = unit.owner ? getUnitIconPath(unit.type, unit.owner) : (def?.image ? `assets/units/${def.image}` : null);

      html += `
        <div class="mp-unit-row">
          <div class="mp-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="mp-unit-icon" alt="${unit.type}">` : ''}
            <span class="mp-unit-name">${unit.type}</span>
            <span class="mp-unit-avail">(${unit.quantity} avail)</span>
          </div>
          <div class="mp-unit-select">
            <button class="mp-qty-btn" data-unit="${unit.type}" data-delta="-1">−</button>
            <span class="mp-qty">${selected}</span>
            <button class="mp-qty-btn" data-unit="${unit.type}" data-delta="1">+</button>
            <button class="mp-all-btn" data-unit="${unit.type}" data-qty="${unit.quantity}">All</button>
          </div>
        </div>
      `;
    }

    html += `</div>`;

    // Move All button
    const totalMovable = movableUnits.reduce((sum, u) => sum + u.quantity, 0);
    const totalSelected = Object.values(this.selectedUnits).reduce((sum, q) => sum + q, 0);

    html += `
      <div class="mp-select-all">
        <button class="mp-all-units-btn" data-action="select-all" ${totalSelected === totalMovable ? 'disabled' : ''}>
          Select All Units
        </button>
        ${totalSelected > 0 ? `
          <button class="mp-clear-btn" data-action="clear-all">Clear Selection</button>
        ` : ''}
      </div>
    `;

    // Show valid destinations
    const validDests = this.getValidDestinations();
    const hasUnitsSelected = Object.values(this.selectedUnits).some(q => q > 0);

    if (hasUnitsSelected && validDests.length > 0) {
      html += `
        <div class="mp-destinations">
          <span class="mp-label">Move to:</span>
          <div class="mp-dest-list">
            ${validDests.map(dest => {
              const owner = this.gameState.getOwner(dest);
              const isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
              const cls = isEnemy ? 'enemy' : '';
              return `<button class="mp-dest-btn ${cls}" data-dest="${dest}">${dest}${isEnemy ? ' ⚔️' : ''}</button>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    html += `
      <div class="mp-actions">
        ${canUndo ? `<button class="mp-undo-btn">Undo Last Move</button>` : ''}
        <button class="mp-cancel-btn">Cancel</button>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _bindEvents() {
    // Quantity buttons
    this.el.querySelectorAll('.mp-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const delta = parseInt(btn.dataset.delta);
        this._updateSelection(unit, delta);
      });
    });

    // All button (per unit type)
    this.el.querySelectorAll('.mp-all-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const qty = parseInt(btn.dataset.qty);
        this.selectedUnits[unit] = qty;
        this._render();
      });
    });

    // Select All Units button
    this.el.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
      const player = this.gameState.currentPlayer;
      const units = this.gameState.getUnitsAt(this.selectedFrom.name);
      const movableUnits = units.filter(u =>
        u.owner === player.id && !u.moved && this._canUnitMove(u.type)
      );
      for (const unit of movableUnits) {
        this.selectedUnits[unit.type] = unit.quantity;
      }
      this._render();
    });

    // Clear Selection button
    this.el.querySelector('[data-action="clear-all"]')?.addEventListener('click', () => {
      this.selectedUnits = {};
      this._render();
    });

    // Destination buttons
    this.el.querySelectorAll('.mp-dest-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const destName = btn.dataset.dest;
        const dest = this.territoryByName[destName];
        if (dest) {
          this._showMoveConfirm(dest);
        }
      });
    });

    // Cancel
    this.el.querySelector('.mp-cancel-btn')?.addEventListener('click', () => {
      this.cancel();
    });

    // Undo
    this.el.querySelector('.mp-undo-btn')?.addEventListener('click', () => {
      const result = this.gameState.undoLastMove();
      if (result.success && this.onMoveComplete) {
        this.onMoveComplete();
      }
      this._render();
    });
  }

  _updateSelection(unitType, delta) {
    const player = this.gameState.currentPlayer;
    const units = this.gameState.getUnitsAt(this.selectedFrom.name);
    const unit = units.find(u => u.type === unitType && u.owner === player.id);
    if (!unit) return;

    const current = this.selectedUnits[unitType] || 0;
    const newValue = Math.max(0, Math.min(unit.quantity, current + delta));
    this.selectedUnits[unitType] = newValue;

    this._render();
  }
}
