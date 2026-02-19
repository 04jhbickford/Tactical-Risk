// Player-focused panel showing current player info, turn phase, and actions

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_NAMES } from '../state/gameState.js';

// Compact phase hints
const PHASE_HINTS = {
  [GAME_PHASES.CAPITAL_PLACEMENT]: 'Click your territory',
  [GAME_PHASES.UNIT_PLACEMENT]: 'Click to place units',
  [TURN_PHASES.DEVELOP_TECH]: '',
  [TURN_PHASES.PURCHASE]: '',
  [TURN_PHASES.COMBAT_MOVE]: 'Click units → enemy territory',
  [TURN_PHASES.COMBAT]: '',
  [TURN_PHASES.NON_COMBAT_MOVE]: 'Click units → friendly territory',
  [TURN_PHASES.MOBILIZE]: '',
  [TURN_PHASES.COLLECT_INCOME]: '',
};

export class PlayerPanel {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.onAction = null;
    this.selectedTerritory = null;
    this.cardsCollapsed = false; // Track collapsed state for RISK cards section
    this.validCardSets = []; // Cache valid card sets for trade selection

    // Create panel element (replaces sidebar)
    this.el = document.getElementById('sidebar');
    this.el.innerHTML = '';
    this.el.className = 'player-panel';

    // Create content wrapper so action log can be appended separately
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'pp-content';
    this.el.appendChild(this.contentEl);
  }

  setGameState(gameState) {
    this.gameState = gameState;
    gameState.subscribe(() => this._render());
    this._render();
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
  }

  setActionCallback(callback) {
    this.onAction = callback;
  }

  setSelectedTerritory(territory) {
    this.selectedTerritory = territory;
    this._render();
  }

  show() {
    this.el.classList.remove('hidden');
    this._render();
  }

  hide() {
    this.el.classList.add('hidden');
  }

  _render() {
    if (!this.gameState) {
      this.contentEl.innerHTML = '';
      return;
    }

    const player = this.gameState.currentPlayer;
    if (!player) {
      this.contentEl.innerHTML = '';
      return;
    }

    const phase = this.gameState.phase;
    const turnPhase = this.gameState.turnPhase;
    const ipcs = this.gameState.getIPCs(player.id);
    const territories = this.gameState.getPlayerTerritories(player.id).length;

    let html = '';

    // Compact player header
    const aiLabel = player.isAI ? `<span class="pp-ai-badge">${player.aiDifficulty?.toUpperCase() || 'AI'}</span>` : '';
    const textColor = this._getContrastColor(player.color);
    html += `
      <div class="pp-header compact" style="background: ${player.color};">
        ${player.flag ? `<img src="assets/flags/${player.flag}" class="pp-flag" alt="${player.name}">` : ''}
        <span class="pp-player-name" style="color: ${textColor};">${player.name}</span>
        ${aiLabel}
        <span class="pp-resources-inline" style="color: ${textColor};">${ipcs}$ · ${territories}T</span>
      </div>`;

    // Compact phase indicator with hint
    const phaseName = this._getPhaseName(phase, turnPhase);
    const phaseHint = this._getPhaseHint(phase, turnPhase);

    html += `
      <div class="pp-phase compact">
        <span class="pp-phase-name">${phaseName}</span>
        ${phaseHint ? `<span class="pp-phase-hint">${phaseHint}</span>` : ''}
      </div>`;
    // Actions
    html += `<div class="pp-actions">`;
    html += this._renderActions(phase, turnPhase, player);
    html += `</div>`;

    this.contentEl.innerHTML = html;
    this._bindEvents();
  }

  _getPhaseName(phase, turnPhase) {
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) return 'Place Capital';
    if (phase === GAME_PHASES.UNIT_PLACEMENT) return 'Initial Deployment';
    if (phase === GAME_PHASES.PLAYING) return TURN_PHASE_NAMES[turnPhase] || turnPhase;
    return 'Setup';
  }

  _getPhaseHint(phase, turnPhase) {
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) return PHASE_HINTS[GAME_PHASES.CAPITAL_PLACEMENT];
    if (phase === GAME_PHASES.UNIT_PLACEMENT) return PHASE_HINTS[GAME_PHASES.UNIT_PLACEMENT];
    if (phase === GAME_PHASES.PLAYING) return PHASE_HINTS[turnPhase] || '';
    return '';
  }

  // Calculate contrasting text color (white or black) based on background color
  _getContrastColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  _renderActions(phase, turnPhase, player) {
    let html = '';

    // If current player is AI, show compact AI status
    if (player.isAI) {
      html += `<div class="pp-ai-thinking"><span class="pp-ai-spinner"></span> Thinking...</div>`;
      return html;
    }

    // Capital placement phase
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) {
      if (this.selectedTerritory && !this.selectedTerritory.isWater) {
        const owner = this.gameState.getOwner(this.selectedTerritory.name);
        if (owner === player.id) {
          html += `<button class="pp-action-btn" data-action="place-capital" data-territory="${this.selectedTerritory.name}">
            Place Capital: ${this.selectedTerritory.name}
          </button>`;
        }
      }
    }

    // Unit placement phase
    if (phase === GAME_PHASES.UNIT_PLACEMENT) {
      const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
      const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);
      const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
      const hasPlaceable = this.gameState.hasPlaceableUnits?.(player.id, this.unitDefs) ?? (totalRemaining > 0);
      const canFinish = placedThisRound >= limit || totalRemaining === 0 || !hasPlaceable;
      const canUndo = this.gameState.placementHistory && this.gameState.placementHistory.length > 0;

      html += `<div class="pp-placement-status">${placedThisRound}/${limit} placed · ${totalRemaining} left</div>`;
      if (canUndo) {
        html += `<button class="pp-action-btn small secondary" data-action="undo-placement">Undo</button>`;
      }
      if (canFinish) {
        html += `<button class="pp-action-btn" data-action="finish-placement">Done</button>`;
      }
    }

    // Playing phase - compact buttons
    if (phase === GAME_PHASES.PLAYING) {
      if (turnPhase === TURN_PHASES.DEVELOP_TECH) {
        html += `<button class="pp-action-btn" data-action="open-tech">Research Tech</button>`;
      }

      if (turnPhase === TURN_PHASES.PURCHASE) {
        html += `<button class="pp-action-btn" data-action="open-purchase">Buy Units</button>`;
      }

      if (turnPhase === TURN_PHASES.COMBAT_MOVE || turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
        const canUndo = turnPhase === TURN_PHASES.COMBAT_MOVE &&
          this.gameState.moveHistory && this.gameState.moveHistory.length > 0;
        if (canUndo) {
          html += `<button class="pp-action-btn small secondary" data-action="undo-move">Undo Move</button>`;
        }
      }

      if (turnPhase === TURN_PHASES.COMBAT) {
        const combatCount = this.gameState.combatQueue?.length || 0;
        if (combatCount > 0) {
          html += `<button class="pp-action-btn combat" data-action="open-combat">
            Resolve ${combatCount} Battle${combatCount > 1 ? 's' : ''}
          </button>`;
        }
      }

      // Note: End Phase button moved to HUD top bar
    }

    return html;
  }

  _renderUnitPurchase(player) {
    const capital = this.gameState.playerState[player.id]?.capitalTerritory;
    if (!capital) return '<p class="pp-hint">Place your capital first</p>';

    const ipcs = this.gameState.getIPCs(player.id);

    let html = `<div class="pp-purchase">`;

    // Show current budget
    html += `
      <div class="pp-budget-display">
        <span class="pp-budget-label">Available Budget</span>
        <span class="pp-budget-value">${ipcs} IPCs</span>
      </div>`;

    // Buy units button - triggers popup
    html += `
      <button class="pp-action-btn" data-action="open-purchase">
        Buy Units
      </button>`;

    html += `
      <button class="pp-action-btn secondary" data-action="finish-placement">
        Done - Next Player
      </button>`;
    html += `</div>`;

    return html;
  }

  _bindEvents() {
    this.contentEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const territory = btn.dataset.territory;
        const setIndex = btn.dataset.set;

        // Handle internal actions
        if (action === 'toggle-cards') {
          this.cardsCollapsed = !this.cardsCollapsed;
          this._render();
          return;
        }

        // Handle card set selection
        if (action === 'trade-set' && setIndex !== undefined) {
          const cardSet = this.validCardSets[parseInt(setIndex)];
          if (this.onAction && cardSet) {
            this.onAction('trade-set', { cardSet });
          }
          return;
        }

        // Pass all other actions to callback
        if (this.onAction) {
          this.onAction(action, { territory });
        }
      });
    });
  }
}
