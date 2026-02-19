// Air Landing UI - Map-based view for selecting where air units land after combat

import { getUnitIconPath } from '../utils/unitIcons.js';

export class AirLandingUI {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.territoryByName = null;
    this.airUnitsToLand = [];
    this.selectedLandings = {};
    this.currentUnitIndex = 0;
    this.combatTerritory = null;
    this.isRetreating = false;
    this.onComplete = null;
    this.onHighlightTerritory = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'airLandingPanel';
    this.el.className = 'air-landing-panel hidden';
    document.body.appendChild(this.el);
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

  setOnComplete(callback) {
    this.onComplete = callback;
  }

  setOnHighlightTerritory(callback) {
    this.onHighlightTerritory = callback;
  }

  isActive() {
    return !this.el.classList.contains('hidden') && this.airUnitsToLand.length > 0;
  }

  // Initialize with air units needing landing after combat
  setAirUnits(airUnitsToLand, combatTerritory, isRetreating = false) {
    this.airUnitsToLand = airUnitsToLand;
    this.combatTerritory = combatTerritory;
    this.isRetreating = isRetreating;
    this.selectedLandings = {};
    this.currentUnitIndex = 0;
    this._render();
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
    this.airUnitsToLand = [];
    this.selectedLandings = {};
    this.currentUnitIndex = 0;
    // Clear any highlights
    if (this.onHighlightTerritory) {
      this.onHighlightTerritory(null, false);
    }
  }

  // Called when user clicks a territory on the map
  handleTerritoryClick(territory) {
    if (!this.isActive()) return false;

    const currentUnit = this.airUnitsToLand[this.currentUnitIndex];
    if (!currentUnit) return false;

    // Check if this is a valid landing destination
    const validDest = currentUnit.landingOptions.find(opt => opt.territory === territory.name);
    if (validDest) {
      // Use unit ID for individual tracking (allows same type to land at different locations)
      const unitKey = currentUnit.id || currentUnit.type;
      this.selectedLandings[unitKey] = territory.name;

      // Move to next unit if available
      if (this.currentUnitIndex < this.airUnitsToLand.length - 1) {
        this.currentUnitIndex++;
      }

      this._render();
      return true;
    }

    return false;
  }

  // Get valid destinations for current unit (for map highlighting)
  getValidDestinations() {
    if (!this.isActive()) return [];

    const currentUnit = this.airUnitsToLand[this.currentUnitIndex];
    if (!currentUnit) return [];

    return currentUnit.landingOptions.map(opt => opt.territory);
  }

  // Get all valid destinations for all units (for persistent highlighting)
  getAllValidDestinations() {
    if (!this.isActive()) return [];

    const allDests = new Set();
    for (const unit of this.airUnitsToLand) {
      for (const opt of unit.landingOptions) {
        allDests.add(opt.territory);
      }
    }
    return Array.from(allDests);
  }

  _render() {
    if (!this.gameState || !this.unitDefs) return;

    const player = this.gameState.currentPlayer;
    if (!player) return;

    const totalUnits = this.airUnitsToLand.length;
    const currentUnit = this.airUnitsToLand[this.currentUnitIndex];

    // Check if all units have landing selections (or will crash)
    // Use unit ID for individual tracking (allows same type to land at different locations)
    const allSelected = this.airUnitsToLand.every(u => {
      const unitKey = u.id || u.type;
      return u.landingOptions.length === 0 || this.selectedLandings[unitKey];
    });

    let html = `
      <div class="alp-header" style="border-left: 5px solid ${player.color}">
        <div class="alp-title">
          <span class="alp-icon">✈️</span>
          ${this.isRetreating ? 'Retreat - ' : ''}Air Unit Landing
        </div>
        <div class="alp-subtitle">From: ${this.combatTerritory}</div>
      </div>

      <div class="alp-instructions">
        Select landing locations for your air units. They can only land in territories
        that were <strong>friendly at the start of your turn</strong>.
      </div>

      <div class="alp-progress">
        Unit ${this.currentUnitIndex + 1} of ${totalUnits}
      </div>
    `;

    // Render each air unit
    for (let i = 0; i < this.airUnitsToLand.length; i++) {
      const airUnit = this.airUnitsToLand[i];
      const def = this.unitDefs[airUnit.type];
      const imageSrc = getUnitIconPath(airUnit.type, player.id);
      // Use unit ID for individual tracking (allows same type to land at different locations)
      const unitKey = airUnit.id || airUnit.type;
      const selectedDest = this.selectedLandings[unitKey];
      const hasOptions = airUnit.landingOptions.length > 0;
      const isCurrentUnit = i === this.currentUnitIndex;

      // Get movement info
      const originInfo = this.gameState.airUnitOrigins[this.combatTerritory]?.[airUnit.type];
      const totalMovement = def?.movement || 4;
      const distanceTraveled = originInfo?.distance || 0;
      const remainingMovement = Math.max(0, totalMovement - distanceTraveled);

      // Display unit number if there are multiple of same type (e.g., "Fighter #1", "Fighter #2")
      const sameTypeUnits = this.airUnitsToLand.filter(u => u.type === airUnit.type);
      const unitIndex = sameTypeUnits.indexOf(airUnit) + 1;
      const displayName = sameTypeUnits.length > 1
        ? `${airUnit.type} #${unitIndex}`
        : `${airUnit.quantity}× ${airUnit.type}`;

      html += `
        <div class="alp-unit ${isCurrentUnit ? 'current' : ''} ${!hasOptions ? 'no-options' : ''} ${selectedDest ? 'selected' : ''}">
          <div class="alp-unit-header" data-index="${i}">
            <div class="alp-unit-info">
              ${imageSrc ? `<img src="${imageSrc}" class="alp-unit-icon" alt="${airUnit.type}">` : ''}
              <div class="alp-unit-details">
                <span class="alp-unit-name">${displayName}</span>
                <span class="alp-unit-movement">${remainingMovement}/${totalMovement} movement left</span>
              </div>
            </div>
            ${selectedDest ? `<span class="alp-unit-check">✓</span>` : ''}
          </div>

          ${isCurrentUnit || selectedDest ? `
            <div class="alp-unit-content">
              ${hasOptions ? `
                <select class="alp-dest-select" data-unit="${unitKey}">
                  <option value="">-- Click map or select --</option>
                  ${airUnit.landingOptions.map(opt =>
                    `<option value="${opt.territory}" ${selectedDest === opt.territory ? 'selected' : ''}>
                      ${opt.territory} ${opt.isCarrier ? '(Carrier)' : ''} - ${opt.distance} tile${opt.distance !== 1 ? 's' : ''} away
                    </option>`
                  ).join('')}
                </select>
              ` : `
                <div class="alp-crash-warning">
                  <span class="alp-crash-icon">💥</span>
                  <span>No valid landing - Unit will CRASH!</span>
                </div>
              `}
            </div>
          ` : ''}
        </div>
      `;
    }

    // Actions
    html += `
      <div class="alp-actions">
        <button class="alp-btn primary" data-action="confirm" ${!allSelected ? 'disabled' : ''}>
          Confirm Landings
        </button>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _bindEvents() {
    // Unit headers - click to focus
    this.el.querySelectorAll('.alp-unit-header').forEach(header => {
      header.addEventListener('click', () => {
        const index = parseInt(header.dataset.index, 10);
        if (!isNaN(index) && index !== this.currentUnitIndex) {
          this.currentUnitIndex = index;
          this._render();
        }
      });
    });

    // Destination dropdowns
    this.el.querySelectorAll('.alp-dest-select').forEach(select => {
      // Hover events on options
      select.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'OPTION' && e.target.value) {
          if (this.onHighlightTerritory) {
            this.onHighlightTerritory(e.target.value, true);
          }
        }
      });

      select.addEventListener('mouseout', () => {
        if (this.onHighlightTerritory) {
          this.onHighlightTerritory(null, false);
        }
      });

      // Change event
      select.addEventListener('change', () => {
        const unitKey = select.dataset.unit; // Now uses unit ID, not just type
        const destination = select.value;
        if (destination) {
          this.selectedLandings[unitKey] = destination;
        } else {
          delete this.selectedLandings[unitKey];
        }
        this._render();
      });

      // Focus/blur for dropdown highlighting
      select.addEventListener('focus', () => {
        // When dropdown opens, highlight all options
        const unitKey = select.dataset.unit;
        const unit = this.airUnitsToLand.find(u => (u.id || u.type) === unitKey);
        if (unit && this.onHighlightTerritory) {
          // Could highlight all options - for now just clear
        }
      });
    });

    // Confirm button
    this.el.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      this._confirmLandings();
    });
  }

  _confirmLandings() {
    if (!this.onComplete) return;

    // Build result with selected landings (keyed by unit ID for individual tracking)
    const result = {
      landings: { ...this.selectedLandings },
      crashes: [],
      isRetreating: this.isRetreating,
      // Include original air units for ID-based processing
      airUnitsToLand: this.airUnitsToLand,
    };

    // Track units that will crash
    for (const unit of this.airUnitsToLand) {
      if (unit.landingOptions.length === 0) {
        result.crashes.push({
          id: unit.id,
          type: unit.type,
          quantity: unit.quantity,
        });
      }
    }

    this.hide();
    this.onComplete(result);
  }
}
