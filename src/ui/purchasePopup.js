// Purchase popup overlay for buying units
// Flow: First select territory (factory or adjacent sea zone), then buy units for that location

import { getUnitIconPath } from '../utils/unitIcons.js';

export class PurchasePopup {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.onPurchaseComplete = null;
    this.purchaseCart = {};
    this.cartCost = 0;
    this.selectedTerritory = null; // Territory to place purchased units
    this.territories = null;

    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'purchasePopup';
    this.el.className = 'purchase-popup hidden';
    document.body.appendChild(this.el);
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

  _render() {
    if (!this.gameState || !this.unitDefs) return;

    const player = this.gameState.currentPlayer;
    if (!player) return;

    const ipcs = this.gameState.getIPCs(player.id);
    const remaining = ipcs - this.cartCost;

    // If no territory selected, show territory selection
    if (!this.selectedTerritory) {
      this._renderTerritorySelection(player, ipcs);
      return;
    }

    // Territory selected - show unit purchase for that territory
    this._renderUnitPurchase(player, ipcs, remaining);
  }

  _renderTerritorySelection(player, ipcs) {
    // Get factories and adjacent sea zones
    const factoryTerritories = this._getFactoryTerritories(player.id);
    const adjacentSeaZones = this._getAdjacentSeaZones(factoryTerritories);

    let html = `
      <div class="purchase-popup-content territory-select">
        <div class="purchase-header">
          <div class="purchase-title">Select Location</div>
          <div class="purchase-budget">
            <span class="budget-value">$${ipcs}</span>
          </div>
          <button class="purchase-close" data-action="close">✕</button>
        </div>

        <div class="purchase-instructions">
          Choose where to place your purchased units
        </div>

        <div class="territory-groups">
          <div class="territory-group">
            <div class="territory-group-header">🏭 Factories (Land/Air Units)</div>
            <div class="territory-list">
              ${factoryTerritories.map(name => `
                <button class="territory-option" data-territory="${name}" data-type="land">
                  <span class="territory-name">${name}</span>
                  <span class="territory-type">Land, Air, Buildings</span>
                </button>
              `).join('')}
              ${factoryTerritories.length === 0 ? `
                <div class="territory-empty">No factories available</div>
              ` : ''}
            </div>
          </div>

          <div class="territory-group">
            <div class="territory-group-header">⚓ Sea Zones (Naval Units)</div>
            <div class="territory-list">
              ${adjacentSeaZones.map(name => `
                <button class="territory-option" data-territory="${name}" data-type="sea">
                  <span class="territory-name">${name}</span>
                  <span class="territory-type">Naval Units</span>
                </button>
              `).join('')}
              ${adjacentSeaZones.length === 0 ? `
                <div class="territory-empty">No sea zones adjacent to factories</div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="purchase-actions">
          <button class="purchase-btn skip" data-action="skip">Skip Purchase Phase</button>
        </div>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindTerritoryEvents();
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

  _renderUnitPurchase(player, ipcs, remaining) {
    const isSeaZone = this.territories?.[this.selectedTerritory]?.isWater;

    // Filter units based on territory type
    const units = Object.entries(this.unitDefs)
      .filter(([type, u]) => {
        // Exclude AA guns from purchase
        if (type === 'aaGun') return false;

        if (isSeaZone) {
          // Sea zones: only naval units
          return u.isSea;
        } else {
          // Land territories: land, air, and buildings (factory)
          return u.isLand || u.isAir || u.isBuilding;
        }
      });

    // Factory limit check
    const ownedTerritories = this.gameState.getPlayerTerritories(player.id);
    const territoriesWithFactory = ownedTerritories.filter(tName => {
      const units = this.gameState.units[tName] || [];
      return units.some(u => u.type === 'factory');
    });
    const maxFactories = ownedTerritories.length - territoriesWithFactory.length;
    const factoriesInCart = this.purchaseCart['factory'] || 0;

    // Check if selected territory already has a factory
    const selectedHasFactory = (this.gameState.units[this.selectedTerritory] || [])
      .some(u => u.type === 'factory');

    let html = `
      <div class="purchase-popup-content">
        <div class="purchase-header">
          <div class="purchase-title">Purchase Units</div>
          <div class="purchase-budget">
            <span class="budget-value">$${remaining}</span>
            <span class="budget-total">/ $${ipcs}</span>
          </div>
          <button class="purchase-close" data-action="close">✕</button>
        </div>

        <div class="purchase-location">
          <span class="location-label">Placing at:</span>
          <span class="location-name">${this.selectedTerritory}</span>
          <button class="location-change" data-action="change-location">Change</button>
        </div>

        <div class="purchase-grid">
          ${units.map(([unitType, def]) => {
            const qty = this.purchaseCart[unitType] || 0;
            const canAdd = remaining >= def.cost;

            // Factory specific: can't add if territory already has one
            let factoryBlocked = false;
            if (unitType === 'factory') {
              factoryBlocked = selectedHasFactory || (factoriesInCart > 0 && qty > 0);
            }

            const imageSrc = player ? getUnitIconPath(unitType, player.id) : (def.image ? `assets/units/${def.image}` : null);
            const maxAffordable = Math.floor(remaining / def.cost) + qty;

            return `
              <div class="purchase-item ${qty > 0 ? 'has-qty' : ''} ${factoryBlocked ? 'blocked' : ''}" data-unit="${unitType}">
                <div class="item-row">
                  <div class="item-visual">
                    ${imageSrc ? `<img src="${imageSrc}" class="item-icon" alt="${unitType}">` : `<div class="item-placeholder">${unitType[0].toUpperCase()}</div>`}
                  </div>
                  <div class="item-info">
                    <div class="item-name">${unitType}</div>
                    <div class="item-stats">A${def.attack}/D${def.defense}/M${def.movement}</div>
                  </div>
                  <div class="item-cost">$${def.cost}</div>
                </div>
                ${factoryBlocked ? `
                  <div class="item-blocked-msg">Territory already has factory</div>
                ` : `
                  <div class="item-controls">
                    <button class="qty-btn minus" data-action="remove" data-unit="${unitType}">−</button>
                    <span class="qty-display">${qty}</span>
                    <button class="qty-btn plus" data-action="add" data-unit="${unitType}">+</button>
                    <button class="qty-btn max" data-action="max" data-unit="${unitType}" data-max="${maxAffordable}">Max</button>
                  </div>
                `}
              </div>`;
          }).join('')}
        </div>

        ${this.cartCost > 0 ? `
          <div class="purchase-summary">
            <span class="summary-items">
              ${Object.entries(this.purchaseCart).map(([type, qty]) => {
                const def = this.unitDefs[type];
                return `${qty}× ${type} ($${qty * def.cost})`;
              }).join(', ')}
            </span>
            <span class="summary-total">Total: $${this.cartCost}</span>
          </div>
        ` : ''}

        <div class="purchase-actions">
          ${this.cartCost > 0 ? `
            <button class="purchase-btn clear" data-action="clear">Clear</button>
            <button class="purchase-btn confirm" data-action="confirm">Confirm Purchase</button>
          ` : `
            <button class="purchase-btn back" data-action="change-location">← Back</button>
            <button class="purchase-btn skip" data-action="skip">Done</button>
          `}
        </div>
        <div class="purchase-note">Units will be placed during Mobilize phase</div>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _bindTerritoryEvents() {
    // Territory selection
    this.el.querySelectorAll('.territory-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTerritory = btn.dataset.territory;
        this._render();
      });
    });

    // Close button
    this.el.querySelector('.purchase-close')?.addEventListener('click', () => {
      this.hide();
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
    this.el.querySelector('.purchase-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.qty-btn');
      if (!btn) return;

      e.stopPropagation();
      const action = btn.dataset.action;
      const unitType = btn.dataset.unit;

      if (action === 'add') {
        this._updateCart(unitType, 1);
      } else if (action === 'remove') {
        this._updateCart(unitType, -1);
      } else if (action === 'max') {
        this._setMax(unitType);
      }
    });

    // Close button
    this.el.querySelector('.purchase-close')?.addEventListener('click', () => {
      this.hide();
    });

    // Change location
    this.el.querySelectorAll('[data-action="change-location"]')?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTerritory = null;
        this._render();
      });
    });

    // Action buttons
    this.el.querySelectorAll('.purchase-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;

        if (action === 'clear') {
          this._clearCart();
        } else if (action === 'confirm') {
          this._commitPurchase();
        } else if (action === 'skip') {
          this.hide();
          if (this.onPurchaseComplete) {
            this.onPurchaseComplete();
          }
        } else if (action === 'change-location') {
          this.selectedTerritory = null;
          this._render();
        }
      });
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
    this._updateDisplay();
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
    this._updateDisplay();
  }

  _updateDisplay() {
    const player = this.gameState.currentPlayer;
    const ipcs = this.gameState.getIPCs(player.id);
    const remaining = ipcs - this.cartCost;

    const budgetValue = this.el.querySelector('.budget-value');
    if (budgetValue) {
      budgetValue.textContent = `$${remaining}`;
      budgetValue.classList.toggle('low', remaining < 5);
    }

    this.el.querySelectorAll('.purchase-item').forEach(item => {
      const unitType = item.dataset.unit;
      if (!unitType) return;

      const def = this.unitDefs[unitType];
      if (!def) return;

      const qty = this.purchaseCart[unitType] || 0;
      const qtyDisplay = item.querySelector('.qty-display');
      const addBtn = item.querySelector('[data-action="add"]');
      const removeBtn = item.querySelector('[data-action="remove"]');
      const maxBtn = item.querySelector('[data-action="max"]');

      if (qtyDisplay) qtyDisplay.textContent = qty;

      const canAdd = remaining >= def.cost;
      const canRemove = qty > 0;
      const maxAffordable = Math.floor(remaining / def.cost) + qty;

      if (addBtn) addBtn.classList.toggle('disabled', !canAdd);
      if (removeBtn) removeBtn.classList.toggle('disabled', !canRemove);
      if (maxBtn) {
        maxBtn.dataset.max = maxAffordable;
        maxBtn.classList.toggle('disabled', remaining < def.cost);
      }
      item.classList.toggle('has-qty', qty > 0);
    });

    this._updateSummary();
  }

  _updateSummary() {
    const existingSummary = this.el.querySelector('.purchase-summary');
    const actionsContainer = this.el.querySelector('.purchase-actions');

    let summaryHtml = '';
    if (this.cartCost > 0) {
      summaryHtml = `
        <div class="purchase-summary">
          <span class="summary-items">
            ${Object.entries(this.purchaseCart).map(([type, qty]) => {
              const def = this.unitDefs[type];
              return `${qty}× ${type} ($${qty * def.cost})`;
            }).join(', ')}
          </span>
          <span class="summary-total">Total: $${this.cartCost}</span>
        </div>
      `;
    }

    if (existingSummary) {
      if (this.cartCost > 0) {
        existingSummary.outerHTML = summaryHtml;
      } else {
        existingSummary.remove();
      }
    } else if (this.cartCost > 0 && actionsContainer) {
      actionsContainer.insertAdjacentHTML('beforebegin', summaryHtml);
    }

    if (actionsContainer) {
      if (this.cartCost > 0) {
        actionsContainer.innerHTML = `
          <button class="purchase-btn clear" data-action="clear">Clear</button>
          <button class="purchase-btn confirm" data-action="confirm">Confirm Purchase</button>
        `;
      } else {
        actionsContainer.innerHTML = `
          <button class="purchase-btn back" data-action="change-location">← Back</button>
          <button class="purchase-btn skip" data-action="skip">Done</button>
        `;
      }
      this._bindActionButtons();
    }
  }

  _bindActionButtons() {
    this.el.querySelectorAll('.purchase-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;

        if (action === 'clear') {
          this._clearCart();
        } else if (action === 'confirm') {
          this._commitPurchase();
        } else if (action === 'skip') {
          this.hide();
          if (this.onPurchaseComplete) {
            this.onPurchaseComplete();
          }
        } else if (action === 'change-location') {
          this.selectedTerritory = null;
          this._render();
        }
      });
    });
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

    // Ask if they want to buy more at another location
    this.selectedTerritory = null;
    this._render();
  }
}
