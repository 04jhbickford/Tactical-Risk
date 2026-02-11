// Player-focused panel showing current player info, turn phase, and actions

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_NAMES } from '../state/gameState.js';

const PHASE_DESCRIPTIONS = {
  [GAME_PHASES.CAPITAL_PLACEMENT]: 'Click on one of your territories to place your capital city.',
  [GAME_PHASES.UNIT_PLACEMENT]: 'Place your starting units on territories you own or adjacent sea zones.',
  [TURN_PHASES.DEVELOP_TECH]: 'Spend IPCs on research dice to unlock new technologies.',
  [TURN_PHASES.PURCHASE]: 'Purchase new units. They will be placed during the Mobilize phase.',
  [TURN_PHASES.COMBAT_MOVE]: 'Move units into enemy territories to initiate combat.',
  [TURN_PHASES.COMBAT]: 'Resolve combat in contested territories.',
  [TURN_PHASES.NON_COMBAT_MOVE]: 'Move units that did not engage in combat.',
  [TURN_PHASES.MOBILIZE]: 'Place your purchased units at factories.',
  [TURN_PHASES.COLLECT_INCOME]: 'Collect IPCs from your territories.',
};

export class PlayerPanel {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.onAction = null;
    this.selectedTerritory = null;
    this.cardsCollapsed = false; // Track collapsed state for RISK cards section

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

    // Player header - prominent color fill to clearly show whose turn it is
    const aiLabel = player.isAI ? `<span class="pp-ai-badge">${player.aiDifficulty?.toUpperCase() || 'AI'}</span>` : '';
    // Calculate contrasting text color (white or black based on color brightness)
    const textColor = this._getContrastColor(player.color);
    html += `
      <div class="pp-header" style="background: ${player.color};">
        ${player.flag ? `<img src="assets/flags/${player.flag}" class="pp-flag" alt="${player.name}">` : ''}
        <div class="pp-player-info">
          <div class="pp-player-name" style="color: ${textColor};">${player.name} ${aiLabel}</div>
          ${player.alliance ? `<span class="pp-alliance ${player.alliance.toLowerCase()}" style="color: ${textColor};">${player.alliance}</span>` : ''}
        </div>
      </div>`;

    // Current phase
    const phaseName = this._getPhaseName(phase, turnPhase);
    const phaseDesc = this._getPhaseDescription(phase, turnPhase);

    html += `
      <div class="pp-phase">
        <div class="pp-phase-label">${phase === GAME_PHASES.PLAYING ? `Round ${this.gameState.round}` : 'Setup'}</div>
        <div class="pp-phase-name">${phaseName}</div>
        <div class="pp-phase-desc">${phaseDesc}</div>
      </div>`;

    // Resources
    html += `
      <div class="pp-resources">
        <div class="pp-resource">
          <div class="pp-resource-value">${ipcs}</div>
          <div class="pp-resource-label">IPCs</div>
        </div>
        <div class="pp-resource">
          <div class="pp-resource-value">${territories}</div>
          <div class="pp-resource-label">Territories</div>
        </div>
      </div>`;

    // RISK Cards (only in Risk mode)
    if (this.gameState.gameMode === 'risk') {
      const cards = this.gameState.riskCards?.[player.id] || [];
      const canTrade = this.gameState.canTradeRiskCards?.(player.id);
      const nextValue = this.gameState.getNextRiskCardValue?.(player.id) || 12;

      if (cards.length > 0 || canTrade) {
        const cardIcons = {
          infantry: '🚶',
          cavalry: '🐎',
          artillery: '💣',
          wild: '⭐'
        };

        const collapsedClass = this.cardsCollapsed ? ' collapsed' : '';
        const toggleIcon = this.cardsCollapsed ? '▶' : '▼';
        html += `
          <div class="pp-risk-cards${collapsedClass}">
            <div class="pp-cards-header" data-action="toggle-cards">
              <span class="pp-cards-toggle">${toggleIcon}</span>
              <span class="pp-cards-label">RISK Cards</span>
              <span class="pp-cards-count">${cards.length}/5</span>
            </div>
            ${!this.cardsCollapsed ? `
            <div class="pp-cards-list">
              ${cards.map(c => `
                <div class="pp-card ${c}">
                  <span class="pp-card-icon">${cardIcons[c] || '?'}</span>
                  <span class="pp-card-label">${c}</span>
                </div>
              `).join('')}
            </div>
            ${canTrade ? `
              <div class="pp-trade-section">
                <div class="pp-trade-info">
                  <span>Trade value:</span>
                  <span class="pp-trade-value">${nextValue} IPCs</span>
                </div>
                ${turnPhase === TURN_PHASES.PURCHASE ? `
                  <button class="pp-trade-btn" data-action="trade-cards">
                    Cash In Cards
                  </button>
                ` : `
                  <button class="pp-trade-btn disabled" disabled title="Trade only during Purchase phase">
                    Cash In Cards
                  </button>
                  <div class="pp-cards-note">Trade during Purchase phase</div>
                `}
              </div>
            ` : cards.length >= 5 ? `
              <div class="pp-cards-note">Must trade when you have 5+ cards</div>
            ` : ''}
            ` : ''}
          </div>
        `;
      }
    }

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

  _getPhaseDescription(phase, turnPhase) {
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) return PHASE_DESCRIPTIONS[GAME_PHASES.CAPITAL_PLACEMENT];
    if (phase === GAME_PHASES.UNIT_PLACEMENT) return PHASE_DESCRIPTIONS[GAME_PHASES.UNIT_PLACEMENT];
    if (phase === GAME_PHASES.PLAYING) return PHASE_DESCRIPTIONS[turnPhase] || '';
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

    // If current player is AI, show AI status instead of action buttons
    if (player.isAI) {
      html += `
        <div class="pp-ai-status">
          <div class="pp-ai-thinking">
            <span class="pp-ai-spinner"></span>
            <span>${player.name} is thinking...</span>
          </div>
        </div>`;
      return html;
    }

    // Capital placement phase
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) {
      if (this.selectedTerritory && !this.selectedTerritory.isWater) {
        const owner = this.gameState.getOwner(this.selectedTerritory.name);
        console.log('[Capital Placement] Selected:', this.selectedTerritory.name, 'Owner:', owner, 'Current player:', player.id);
        if (owner === player.id) {
          html += `
            <button class="pp-action-btn" data-action="place-capital" data-territory="${this.selectedTerritory.name}">
              Place Capital in ${this.selectedTerritory.name}
            </button>`;
        } else {
          html += `<p class="pp-hint">Select one of your own territories (${this.selectedTerritory.name} is owned by ${owner})</p>`;
        }
      } else {
        html += `<p class="pp-hint">Click on your territory to select capital location</p>`;
      }
    }

    // Unit placement phase - PlacementUI handles the unit selection, just show done button
    if (phase === GAME_PHASES.UNIT_PLACEMENT) {
      const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
      const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);
      const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
      const isFinalRound = this.gameState.isFinalPlacementRound?.() || false;
      // Can finish when placed the limit OR no units left
      const canFinish = placedThisRound >= limit || totalRemaining === 0;
      const canUndo = this.gameState.placementHistory && this.gameState.placementHistory.length > 0;

      html += `<div class="pp-placement">`;
      html += `<p class="pp-hint">Place ${limit} units this round${isFinalRound ? ' (final round)' : ''}. (${placedThisRound}/${limit} placed, ${totalRemaining} remaining)</p>`;
      if (canUndo) {
        html += `<button class="pp-action-btn secondary" data-action="undo-placement">Undo Last</button>`;
      }
      if (canFinish) {
        html += `<button class="pp-action-btn" data-action="finish-placement">Done - Next Player</button>`;
      }
      html += `</div>`;
    }

    // Playing phase
    if (phase === GAME_PHASES.PLAYING) {
      // Phase-specific content
      if (turnPhase === TURN_PHASES.DEVELOP_TECH) {
        html += `
          <button class="pp-action-btn" data-action="open-tech">
            Research Technology
          </button>`;
      }

      if (turnPhase === TURN_PHASES.PURCHASE) {
        html += `
          <button class="pp-action-btn" data-action="open-purchase">
            Purchase Units
          </button>`;
      }

      if (turnPhase === TURN_PHASES.COMBAT_MOVE || turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
        const canUndo = turnPhase === TURN_PHASES.COMBAT_MOVE &&
          this.gameState.moveHistory && this.gameState.moveHistory.length > 0;

        html += `
          <div class="pp-movement-hint">
            <p>Click a territory with your units to select them, then click a destination.</p>
            ${canUndo ? `<button class="pp-undo-btn" data-action="undo-move">Undo Last Move</button>` : ''}
          </div>`;
      }

      if (turnPhase === TURN_PHASES.COMBAT) {
        const combatCount = this.gameState.combatQueue?.length || 0;
        if (combatCount > 0) {
          html += `
            <div class="pp-combat-info">
              <span class="combat-count">${combatCount}</span> battle(s) pending
            </div>
            <button class="pp-action-btn combat" data-action="open-combat">
              Resolve Combat
            </button>`;
        } else {
          html += `<p class="pp-hint">No battles to resolve</p>`;
        }
      }

      // End phase button
      html += `
        <button class="pp-action-btn secondary" data-action="next-phase">
          End ${this._getPhaseName(phase, turnPhase)}
        </button>`;
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

        // Handle internal actions
        if (action === 'toggle-cards') {
          this.cardsCollapsed = !this.cardsCollapsed;
          this._render();
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
