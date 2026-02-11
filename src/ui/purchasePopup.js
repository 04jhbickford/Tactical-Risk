// Purchase panel for buying units - left-side panel with map-based territory selection
// Flow: Click territory on map (factory or adjacent sea zone), then buy units for that location

import { getUnitIconPath } from '../utils/unitIcons.js';
import { GAME_PHASES, TURN_PHASES } from '../state/gameState.js';

export class PurchasePopup {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.onPurchaseComplete = null;
    this.onHighlightTerritory = null; // Callback for territory highlighting
    this.purchaseCart = {};
    this.cartCost = 0;
    this.selectedTerritory = null; // Territory to place purchased units
    this.territories = null;

    // Drag state
    this.isDragging = false;

    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'purchasePanel';
    this.el.className = 'purchase-panel hidden';
    document.body.appendChild(this.el);

    this._initDrag();
  }

  _initDrag() {
    let startX, startY, startLeft, startTop;

    const onMouseDown = (e) => {
      if (!e.target.classList.contains('pp-drag-handle')) return;

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
    this.territories = {};
    for (const t of territories) {
      this.territories[t.name] = t;
    }
  }

  setOnComplete(callback) {
    this.onPurchaseComplete = callback;
  }

  setOnHighlightTerritory(callback) {
    this.onHighlightTerritory = callback;
  }

  isPurchasePhase() {
    // Must be in PLAYING phase AND PURCHASE turn phase
    // (turnPhase defaults to PURCHASE, so we need to check phase too)
    return this.gameState &&
      this.gameState.phase === GAME_PHASES.PLAYING &&
      this.gameState.turnPhase === TURN_PHASES.PURCHASE;
  }

  show() {
    this.purchaseCart = {};
    this.cartCost = 0;
    this.selectedTerritory = null;
    this._render();
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  // Called when user clicks a territory on the map during purchase phase
  handleTerritoryClick(territory) {
    if (!this.isPurchasePhase()) return false;

    const player = this.gameState.currentPlayer;
    if (!player) return false;

    // Check valid locations:
    // 1. Factory territories (can buy land/air/buildings)
    // 2. Any owned land territory (can buy factory there)
    // 3. Adjacent sea zones to factories (can buy naval units)
    const factoryTerritories = this._getFactoryTerritories(player.id);
    const ownedTerritories = this._getOwnedTerritories(player.id);
    const adjacentSeaZones = this._getAdjacentSeaZones(factoryTerritories);

    const isValidFactory = factoryTerritories.includes(territory.name);
    const isValidOwned = ownedTerritories.includes(territory.name);
    const isValidSeaZone = adjacentSeaZones.includes(territory.name);

    if (isValidFactory || isValidOwned || isValidSeaZone) {
      this.selectedTerritory = territory.name;
      this._render();
      return true;
    }

    return false;
  }

  // Get valid territories for purchase (for map highlighting)
  getValidPurchaseTerritories() {
    if (!this.isPurchasePhase() || !this.gameState) return [];

    const player = this.gameState.currentPlayer;
    if (!player) return [];

    const factoryTerritories = this._getFactoryTerritories(player.id);
    const ownedTerritories = this._getOwnedTerritories(player.id);
    const adjacentSeaZones = this._getAdjacentSeaZones(factoryTerritories);

    // Include all owned territories (for factory purchase) and adjacent sea zones
    return [...new Set([...factoryTerritories, ...ownedTerritories, ...adjacentSeaZones])];
  }

  _render() {
    if (!this.gameState || !this.unitDefs) return;

    const player = this.gameState.currentPlayer;
    if (!player) return;

    const ipcs = this.gameState.getIPCs(player.id);
    const remaining = ipcs - this.cartCost;

    // If no territory selected, show instructions to click map
    if (!this.selectedTerritory) {
      this._renderTerritoryPrompt(player, ipcs);
      return;
    }

    // Territory selected - show unit purchase for that territory
    this._renderUnitPurchase(player, ipcs, remaining);
  }

  _renderTerritoryPrompt(player, ipcs) {
    const factoryTerritories = this._getFactoryTerritories(player.id);
    const adjacentSeaZones = this._getAdjacentSeaZones(factoryTerritories);
    const ownedTerritories = this._getOwnedTerritories(player.id);
    // Territories where you can build a factory (owned but no factory yet)
    const buildableTerritories = ownedTerritories.filter(name => !factoryTerritories.includes(name));

    let html = `
      <div class="pp-drag-handle"></div>
      <div class="pp-header">
        <div class="pp-title">Purchase Units</div>
        <div class="pp-phase">Purchase Phase</div>
      </div>

      <div class="pp-budget">
        <span class="pp-budget-label">Budget:</span>
        <span class="pp-budget-value">$${ipcs}</span>
      </div>

      <div class="pp-instructions">
        <strong>Click a territory</strong> on the map to select where to purchase units
      </div>

      <div class="pp-valid-locations">
        <div class="pp-location-group">
          <div class="pp-group-header">Factories (Land/Air Units)</div>
          <div class="pp-location-list">
            ${factoryTerritories.map(name => `
              <div class="pp-location-item"
                   data-territory="${name}"
                   title="Click to select">
                ${name}
              </div>
            `).join('')}
            ${factoryTerritories.length === 0 ? `
              <div class="pp-empty">No factories</div>
            ` : ''}
          </div>
        </div>

        <div class="pp-location-group">
          <div class="pp-group-header">Sea Zones (Naval Units)</div>
          <div class="pp-location-list">
            ${adjacentSeaZones.map(name => `
              <div class="pp-location-item sea"
                   data-territory="${name}"
                   title="Click to select">
                ${name}
              </div>
            `).join('')}
            ${adjacentSeaZones.length === 0 ? `
              <div class="pp-empty">No sea zones near factories</div>
            ` : ''}
          </div>
        </div>

        <div class="pp-location-group">
          <div class="pp-group-header">Build Factory (New)</div>
          <div class="pp-location-list">
            ${buildableTerritories.slice(0, 10).map(name => `
              <div class="pp-location-item factory-build"
                   data-territory="${name}"
                   title="Build a factory here">
                ${name}
              </div>
            `).join('')}
            ${buildableTerritories.length > 10 ? `
              <div class="pp-more">+${buildableTerritories.length - 10} more (click on map)</div>
            ` : ''}
            ${buildableTerritories.length === 0 ? `
              <div class="pp-empty">All territories have factories</div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="pp-actions">
        <button class="pp-btn skip" data-action="skip">Skip Purchase Phase</button>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindPromptEvents();
  }

  _getFactoryTerritories(playerId) {
    const factories = [];
    for (const [name, state] of Object.entries(this.gameState.territoryState)) {
      if (state.owner !== playerId) continue;
      const units = this.gameState.units[name] || [];
      if (units.some(u => u.type === 'factory' && u.owner === playerId)) {
        factories.push(name);
      }
    }
    return factories;
  }

  _getAdjacentSeaZones(factoryTerritories) {
    const seaZones = new Set();
    for (const terrName of factoryTerritories) {
      const territory = this.territories?.[terrName];
      if (!territory) continue;
      for (const conn of territory.connections || []) {
        const connT = this.territories?.[conn];
        if (connT?.isWater) {
          seaZones.add(conn);
        }
      }
    }
    return Array.from(seaZones);
  }

  _getOwnedTerritories(playerId) {
    const owned = [];
    for (const [name, state] of Object.entries(this.gameState.territoryState)) {
      if (state.owner === playerId) {
        const t = this.territories?.[name];
        // Only land territories (not sea zones)
        if (t && !t.isWater) {
          owned.push(name);
        }
      }
    }
    return owned;
  }

  _renderUnitPurchase(player, ipcs, remaining) {
    const isSeaZone = this.territories?.[this.selectedTerritory]?.isWater;

    // Check if selected territory already has a factory
    const selectedHasFactory = (this.gameState.units[this.selectedTerritory] || [])
      .some(u => u.type === 'factory' && u.owner === player.id);

    // Filter units based on territory type and factory presence
    const units = Object.entries(this.unitDefs)
      .filter(([type, u]) => {
        // Exclude AA guns from purchase
        if (type === 'aaGun') return false;

        if (isSeaZone) {
          // Sea zones: only naval units
          return u.isSea;
        } else if (selectedHasFactory) {
          // Land territories WITH factory: land, air, and buildings (factory)
          return u.isLand || u.isAir || u.isBuilding;
        } else {
          // Land territories WITHOUT factory: can only buy a factory
          return u.isBuilding;
        }
      });

    let html = `
      <div class="pp-drag-handle"></div>
      <div class="pp-header">
        <div class="pp-title">Purchase Units</div>
        <div class="pp-phase">Purchase Phase</div>
      </div>

      <div class="pp-selected">
        <span class="pp-label">Placing at:</span>
        <span class="pp-territory">${this.selectedTerritory}</span>
        <button class="pp-deselect" data-action="deselect">×</button>
      </div>

      <div class="pp-budget">
        <span class="pp-budget-label">Remaining:</span>
        <span class="pp-budget-value ${remaining < 5 ? 'low' : ''}">$${remaining}</span>
        <span class="pp-budget-total">/ $${ipcs}</span>
      </div>

      <div class="pp-units">
    `;

    for (const [unitType, def] of units) {
      const qty = this.purchaseCart[unitType] || 0;
      const canAdd = remaining >= def.cost;
      const imageSrc = getUnitIconPath(unitType, player.id);

      // Factory specific: can't add if territory already has one
      let factoryBlocked = false;
      if (unitType === 'factory') {
        factoryBlocked = selectedHasFactory || qty >= 1;
      }

      html += `
        <div class="pp-unit-row ${qty > 0 ? 'has-qty' : ''} ${factoryBlocked ? 'blocked' : ''}" data-unit="${unitType}">
          <div class="pp-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="pp-unit-icon" alt="${unitType}">` : ''}
            <span class="pp-unit-name">${unitType}</span>
            <span class="pp-unit-cost">$${def.cost}</span>
            <span class="pp-unit-stats">A${def.attack}/D${def.defense}/M${def.movement}</span>
          </div>
          ${factoryBlocked ? `
            <div class="pp-blocked-msg">Already has factory</div>
          ` : `
            <div class="pp-unit-controls">
              <button class="pp-qty-btn" data-unit="${unitType}" data-delta="-1" ${qty <= 0 ? 'disabled' : ''}>−</button>
              <span class="pp-qty">${qty}</span>
              <button class="pp-qty-btn" data-unit="${unitType}" data-delta="1" ${!canAdd ? 'disabled' : ''}>+</button>
              <button class="pp-max-btn" data-unit="${unitType}" ${!canAdd ? 'disabled' : ''}>Max</button>
            </div>
          `}
        </div>
      `;
    }

    html += `</div>`;

    // Cart summary
    if (this.cartCost > 0) {
      const cartItems = Object.entries(this.purchaseCart)
        .filter(([_, qty]) => qty > 0)
        .map(([type, qty]) => `${qty}× ${type}`)
        .join(', ');

      html += `
        <div class="pp-summary">
          <div class="pp-summary-items">${cartItems}</div>
          <div class="pp-summary-total">Total: $${this.cartCost}</div>
        </div>
      `;
    }

    // Actions
    html += `
      <div class="pp-actions">
        ${this.cartCost > 0 ? `
          <button class="pp-btn clear" data-action="clear">Clear</button>
          <button class="pp-btn confirm" data-action="confirm">Buy & Continue</button>
        ` : `
          <button class="pp-btn done" data-action="done">Done Purchasing</button>
        `}
      </div>
      <div class="pp-note">Units placed during Mobilize phase</div>
    `;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _bindPromptEvents() {
    // Location item clicks
    this.el.querySelectorAll('.pp-location-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedTerritory = item.dataset.territory;
        this._render();
      });

      // Hover highlighting
      item.addEventListener('mouseenter', () => {
        if (this.onHighlightTerritory) {
          this.onHighlightTerritory(item.dataset.territory, true);
        }
      });

      item.addEventListener('mouseleave', () => {
        if (this.onHighlightTerritory) {
          this.onHighlightTerritory(null, false);
        }
      });
    });

    // Skip button
    this.el.querySelector('[data-action="skip"]')?.addEventListener('click', () => {
      this.hide();
      if (this.onPurchaseComplete) {
        this.onPurchaseComplete();
      }
    });
  }

  _bindEvents() {
    // Quantity buttons
    this.el.querySelectorAll('.pp-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const delta = parseInt(btn.dataset.delta);
        this._updateCart(unit, delta);
      });
    });

    // Max buttons
    this.el.querySelectorAll('.pp-max-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        this._setMax(unit);
      });
    });

    // Deselect territory
    this.el.querySelector('[data-action="deselect"]')?.addEventListener('click', () => {
      this.selectedTerritory = null;
      this._render();
    });

    // Action buttons
    this.el.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
      this._clearCart();
    });

    this.el.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      this._commitPurchase();
    });

    this.el.querySelector('[data-action="done"]')?.addEventListener('click', () => {
      this.hide();
      if (this.onPurchaseComplete) {
        this.onPurchaseComplete();
      }
    });
  }

  _updateCart(unitType, delta) {
    const def = this.unitDefs?.[unitType];
    if (!def) return;

    const player = this.gameState.currentPlayer;
    const ipcs = this.gameState.getIPCs(player.id);
    const remaining = ipcs - this.cartCost;

    const currentQty = this.purchaseCart[unitType] || 0;
    let newQty = currentQty + delta;

    newQty = Math.max(0, newQty);
    if (delta > 0 && remaining < def.cost) {
      return;
    }

    // Factory limit
    if (unitType === 'factory' && delta > 0) {
      const selectedHasFactory = (this.gameState.units[this.selectedTerritory] || [])
        .some(u => u.type === 'factory');
      if (selectedHasFactory || newQty > 1) {
        return;
      }
    }

    if (newQty === 0) {
      delete this.purchaseCart[unitType];
    } else {
      this.purchaseCart[unitType] = newQty;
    }

    this._recalculateCartCost();
    this._render();
  }

  _setMax(unitType) {
    const def = this.unitDefs?.[unitType];
    if (!def) return;

    const player = this.gameState.currentPlayer;
    const ipcs = this.gameState.getIPCs(player.id);
    const remaining = ipcs - this.cartCost;
    const currentQty = this.purchaseCart[unitType] || 0;

    let additionalAffordable = Math.floor(remaining / def.cost);

    // Factory limit
    if (unitType === 'factory') {
      const selectedHasFactory = (this.gameState.units[this.selectedTerritory] || [])
        .some(u => u.type === 'factory');
      if (selectedHasFactory) {
        additionalAffordable = 0;
      } else {
        additionalAffordable = Math.min(additionalAffordable, 1 - currentQty);
      }
    }

    const newQty = currentQty + additionalAffordable;

    if (newQty > 0) {
      this.purchaseCart[unitType] = newQty;
    }

    this._recalculateCartCost();
    this._render();
  }

  _clearCart() {
    this.purchaseCart = {};
    this.cartCost = 0;
    this._render();
  }

  _recalculateCartCost() {
    this.cartCost = 0;
    for (const [unitType, qty] of Object.entries(this.purchaseCart)) {
      const def = this.unitDefs?.[unitType];
      if (def) {
        this.cartCost += def.cost * qty;
      }
    }
  }

  _commitPurchase() {
    const player = this.gameState.currentPlayer;
    if (!player) return;

    // Add all units to pending purchases with the selected territory
    for (const [unitType, qty] of Object.entries(this.purchaseCart)) {
      for (let i = 0; i < qty; i++) {
        const result = this.gameState.addToPendingPurchases(unitType, this.unitDefs, this.selectedTerritory);
        if (!result.success) {
          console.warn('Failed to add to pending purchases:', result.error);
          break;
        }
      }
    }

    this.purchaseCart = {};
    this.cartCost = 0;

    // Go back to territory selection (user might want to buy at another location)
    this.selectedTerritory = null;
    this._render();
  }

  getSelectedTerritory() {
    return this.selectedTerritory ? this.territories?.[this.selectedTerritory] : null;
  }

  clearSelection() {
    this.selectedTerritory = null;
    this._render();
  }
}
