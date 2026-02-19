// Player-focused panel with tabbed navigation
// Tabs: Actions, Stats, Territory, Log

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_NAMES, TECHNOLOGIES } from '../state/gameState.js';

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

const TABS = [
  { id: 'actions', label: 'Actions', icon: '⚔' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'territory', label: 'Territory', icon: '🗺' },
  { id: 'log', label: 'Log', icon: '📜' },
];

export class PlayerPanel {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.continents = null;
    this.onAction = null;
    this.actionLog = null;
    this.selectedTerritory = null;
    this.activeTab = 'actions';
    this.cardsCollapsed = false;
    this.validCardSets = [];

    // Create panel element
    this.el = document.getElementById('sidebar');
    this.el.innerHTML = '';
    this.el.className = 'player-panel';

    // Create content wrapper
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

  setContinents(continents) {
    this.continents = continents;
  }

  setActionLog(actionLog) {
    this.actionLog = actionLog;
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

    let html = '';

    // Player header (compact, always visible)
    html += this._renderHeader(player);

    // Phase indicator
    html += this._renderPhaseIndicator(phase, turnPhase);

    // Tab navigation
    html += this._renderTabs();

    // Tab content
    html += `<div class="pp-tab-content">`;
    html += this._renderTabContent(phase, turnPhase, player);
    html += `</div>`;

    this.contentEl.innerHTML = html;
    this._bindEvents();
  }

  _renderHeader(player) {
    const ipcs = this.gameState.getIPCs(player.id);
    const territories = this.gameState.getPlayerTerritories(player.id).length;
    const aiLabel = player.isAI ? `<span class="pp-ai-badge">${player.aiDifficulty?.toUpperCase() || 'AI'}</span>` : '';
    const textColor = this._getContrastColor(player.color);

    return `
      <div class="pp-header compact" style="background: ${player.color};">
        ${player.flag ? `<img src="assets/flags/${player.flag}" class="pp-flag" alt="${player.name}">` : ''}
        <span class="pp-player-name" style="color: ${textColor};">${player.name}</span>
        ${aiLabel}
        <span class="pp-resources-inline" style="color: ${textColor};">${ipcs}$ · ${territories}T</span>
      </div>`;
  }

  _renderPhaseIndicator(phase, turnPhase) {
    const phaseName = this._getPhaseName(phase, turnPhase);
    const phaseHint = this._getPhaseHint(phase, turnPhase);

    return `
      <div class="pp-phase compact">
        <span class="pp-phase-name">${phaseName}</span>
        ${phaseHint ? `<span class="pp-phase-hint">${phaseHint}</span>` : ''}
      </div>`;
  }

  _renderTabs() {
    return `
      <div class="pp-tabs">
        ${TABS.map(tab => `
          <button class="pp-tab ${this.activeTab === tab.id ? 'active' : ''}"
                  data-tab="${tab.id}" title="${tab.label}">
            <span class="pp-tab-icon">${tab.icon}</span>
            <span class="pp-tab-label">${tab.label}</span>
          </button>
        `).join('')}
      </div>`;
  }

  _renderTabContent(phase, turnPhase, player) {
    switch (this.activeTab) {
      case 'actions':
        return this._renderActionsTab(phase, turnPhase, player);
      case 'stats':
        return this._renderStatsTab(player);
      case 'territory':
        return this._renderTerritoryTab(player);
      case 'log':
        return this._renderLogTab();
      default:
        return '';
    }
  }

  _renderActionsTab(phase, turnPhase, player) {
    let html = '<div class="pp-actions-tab">';

    // AI status
    if (player.isAI) {
      html += `<div class="pp-ai-thinking"><span class="pp-ai-spinner"></span> AI is thinking...</div>`;
      html += '</div>';
      return html;
    }

    // Phase-specific actions
    html += this._renderPhaseActions(phase, turnPhase, player);

    // End Phase button (always visible during PLAYING phase)
    if (phase === GAME_PHASES.PLAYING) {
      html += `
        <div class="pp-end-phase">
          <button class="pp-action-btn end-phase" data-action="next-phase">
            End ${TURN_PHASE_NAMES[turnPhase] || 'Phase'} →
          </button>
        </div>`;
    }

    html += '</div>';
    return html;
  }

  _renderPhaseActions(phase, turnPhase, player) {
    let html = '';

    // Capital placement
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) {
      if (this.selectedTerritory && !this.selectedTerritory.isWater) {
        const owner = this.gameState.getOwner(this.selectedTerritory.name);
        if (owner === player.id) {
          html += `
            <button class="pp-action-btn primary" data-action="place-capital" data-territory="${this.selectedTerritory.name}">
              Place Capital: ${this.selectedTerritory.name}
            </button>`;
        }
      } else {
        html += `<div class="pp-hint">Click one of your territories to place your capital</div>`;
      }
    }

    // Unit placement
    if (phase === GAME_PHASES.UNIT_PLACEMENT) {
      const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
      const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);
      const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
      const hasPlaceable = this.gameState.hasPlaceableUnits?.(player.id, this.unitDefs) ?? (totalRemaining > 0);
      const canFinish = placedThisRound >= limit || totalRemaining === 0 || !hasPlaceable;
      const canUndo = this.gameState.placementHistory && this.gameState.placementHistory.length > 0;

      html += `
        <div class="pp-placement-info">
          <div class="pp-placement-progress">
            <span class="pp-placement-count">${placedThisRound}/${limit}</span>
            <span class="pp-placement-label">placed this round</span>
          </div>
          <div class="pp-placement-remaining">${totalRemaining} units remaining</div>
        </div>`;

      if (canUndo) {
        html += `<button class="pp-action-btn secondary" data-action="undo-placement">Undo Last</button>`;
      }
      if (canFinish) {
        html += `<button class="pp-action-btn primary" data-action="finish-placement">Done</button>`;
      }
    }

    // Playing phase actions
    if (phase === GAME_PHASES.PLAYING) {
      if (turnPhase === TURN_PHASES.DEVELOP_TECH) {
        html += `<button class="pp-action-btn primary" data-action="open-tech">🔬 Research Technology</button>`;
      }

      if (turnPhase === TURN_PHASES.PURCHASE) {
        html += `<button class="pp-action-btn primary" data-action="open-purchase">🛒 Purchase Units</button>`;
      }

      if (turnPhase === TURN_PHASES.COMBAT_MOVE || turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
        html += `<div class="pp-hint">Click a territory with your units to move them</div>`;
        const canUndo = this.gameState.moveHistory && this.gameState.moveHistory.length > 0;
        if (canUndo) {
          html += `<button class="pp-action-btn secondary" data-action="undo-move">Undo Last Move</button>`;
        }
      }

      if (turnPhase === TURN_PHASES.COMBAT) {
        const combatCount = this.gameState.combatQueue?.length || 0;
        if (combatCount > 0) {
          html += `
            <button class="pp-action-btn combat" data-action="open-combat">
              ⚔️ Resolve ${combatCount} Battle${combatCount > 1 ? 's' : ''}
            </button>`;
        } else {
          html += `<div class="pp-hint">No battles to resolve</div>`;
        }
      }

      if (turnPhase === TURN_PHASES.MOBILIZE) {
        const pending = this.gameState.getPendingPurchases?.() || [];
        const totalPending = pending.reduce((sum, u) => sum + u.quantity, 0);
        if (totalPending > 0) {
          html += `<div class="pp-hint">Click a factory territory to place ${totalPending} unit${totalPending !== 1 ? 's' : ''}</div>`;
        } else {
          html += `<div class="pp-hint">No units to mobilize</div>`;
        }
      }

      if (turnPhase === TURN_PHASES.COLLECT_INCOME) {
        html += `<div class="pp-hint">Income will be collected automatically</div>`;
      }
    }

    return html;
  }

  _renderStatsTab(player) {
    const ipcs = this.gameState.getIPCs(player.id);
    const territories = this.gameState.getPlayerTerritories(player.id);
    const income = this._calculateIncome(player.id);
    const units = this._countUnits(player.id);
    const techs = this.gameState.playerTechs?.[player.id]?.unlockedTechs || [];

    let html = '<div class="pp-stats-tab">';

    // Resources
    html += `
      <div class="pp-stat-section">
        <div class="pp-stat-header">💰 Resources</div>
        <div class="pp-stat-grid">
          <div class="pp-stat-item">
            <span class="pp-stat-value">${ipcs}</span>
            <span class="pp-stat-label">IPCs</span>
          </div>
          <div class="pp-stat-item">
            <span class="pp-stat-value">${income}</span>
            <span class="pp-stat-label">Income/Turn</span>
          </div>
        </div>
      </div>`;

    // Unit counts
    html += `
      <div class="pp-stat-section">
        <div class="pp-stat-header">🎖️ Military Forces</div>
        <div class="pp-unit-counts">`;

    const unitCategories = {
      'Land': ['infantry', 'artillery', 'tank', 'aaGun'],
      'Naval': ['transport', 'submarine', 'destroyer', 'cruiser', 'battleship', 'carrier'],
      'Air': ['fighter', 'bomber']
    };

    for (const [category, types] of Object.entries(unitCategories)) {
      const categoryUnits = types.filter(t => units[t] > 0);
      if (categoryUnits.length > 0) {
        html += `<div class="pp-unit-category">
          <span class="pp-unit-cat-label">${category}:</span>
          ${categoryUnits.map(t => `<span class="pp-unit-count">${units[t]} ${t}</span>`).join(', ')}
        </div>`;
      }
    }

    const totalUnits = Object.values(units).reduce((a, b) => a + b, 0);
    html += `<div class="pp-unit-total">Total: ${totalUnits} units</div>`;
    html += `</div></div>`;

    // Technologies
    html += `
      <div class="pp-stat-section">
        <div class="pp-stat-header">🔬 Technologies</div>`;

    if (techs.length > 0) {
      html += `<div class="pp-tech-list">`;
      for (const techId of techs) {
        const tech = TECHNOLOGIES[techId];
        if (tech) {
          html += `
            <div class="pp-tech-item">
              <span class="pp-tech-name">${tech.name}</span>
              <span class="pp-tech-desc">${tech.description}</span>
            </div>`;
        }
      }
      html += `</div>`;
    } else {
      html += `<div class="pp-no-tech">No technologies researched</div>`;
    }

    html += `</div></div>`;
    return html;
  }

  _renderTerritoryTab(player) {
    const territories = this.gameState.getPlayerTerritories(player.id);
    let html = '<div class="pp-territory-tab">';

    // Territory count
    html += `
      <div class="pp-stat-section">
        <div class="pp-stat-header">🏴 Territories</div>
        <div class="pp-territory-count">${territories.length} territories controlled</div>
      </div>`;

    // Continent control
    html += `
      <div class="pp-stat-section">
        <div class="pp-stat-header">🌍 Continent Bonuses</div>
        <div class="pp-continent-table">`;

    if (this.continents && this.continents.length > 0) {
      for (const continent of this.continents) {
        const controlled = continent.territories.filter(t =>
          this.gameState.getOwner(t) === player.id
        ).length;
        const total = continent.territories.length;
        const hasBonus = controlled === total;
        const progress = Math.round((controlled / total) * 100);

        html += `
          <div class="pp-continent-row ${hasBonus ? 'has-bonus' : ''}">
            <div class="pp-continent-info">
              <span class="pp-continent-name">${continent.name}</span>
              <span class="pp-continent-bonus">+${continent.bonus} IPCs</span>
            </div>
            <div class="pp-continent-progress">
              <div class="pp-continent-bar">
                <div class="pp-continent-fill" style="width: ${progress}%"></div>
              </div>
              <span class="pp-continent-count">${controlled}/${total}</span>
            </div>
          </div>`;
      }
    } else {
      html += `<div class="pp-no-continents">No continent data</div>`;
    }

    html += `</div></div></div>`;
    return html;
  }

  _renderLogTab() {
    let html = '<div class="pp-log-tab">';

    if (this.actionLog && this.actionLog.entries) {
      const entries = this.actionLog.entries.slice(-50); // Last 50 entries

      if (entries.length === 0) {
        html += `<div class="pp-log-empty">No actions yet</div>`;
      } else {
        html += `<div class="pp-log-entries">`;
        for (const entry of entries) {
          const time = entry.timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const colorStyle = entry.data.color ? `border-left-color: ${entry.data.color}` : '';

          html += `
            <div class="pp-log-entry" style="${colorStyle}">
              <span class="pp-log-time">${time}</span>
              <span class="pp-log-msg">${this._getLogSummary(entry)}</span>
            </div>`;
        }
        html += `</div>`;
      }
    } else {
      html += `<div class="pp-log-empty">Game log not available</div>`;
    }

    html += '</div>';
    return html;
  }

  _getLogSummary(entry) {
    const data = entry.data;
    switch (entry.type) {
      case 'move': return `Moved to ${data.to}`;
      case 'attack': return `⚔️ Attacking ${data.to}`;
      case 'combat-summary': return `⚔️ ${data.territory}: ${data.winner} wins`;
      case 'capture': return `🏴 Captured ${data.territory}`;
      case 'purchase': return `🛒 Purchased units`;
      case 'capital': return `🏛️ Capital: ${data.territory}`;
      case 'income': return `💰 +${data.amount} IPCs`;
      case 'tech': return data.tech ? `🔬 ${data.tech}` : 'Research failed';
      case 'turn': return `📍 ${data.message}`;
      case 'phase': return data.message;
      case 'cards': return `🃏 +${data.value} IPCs`;
      case 'placement': return `Placed ${data.unitType}`;
      case 'ncm': return `Moved to ${data.to}`;
      case 'mobilize': return `Deployed to ${data.territory}`;
      default: return data.message || entry.type;
    }
  }

  _calculateIncome(playerId) {
    let income = 0;
    const territories = this.gameState.getPlayerTerritories(playerId);

    for (const tName of territories) {
      const t = this.gameState.territoryByName[tName];
      if (t && !t.isWater) {
        income += t.ipc || 0;
      }
    }

    // Add continent bonuses
    if (this.continents) {
      for (const continent of this.continents) {
        const controlsAll = continent.territories.every(t =>
          this.gameState.getOwner(t) === playerId
        );
        if (controlsAll) {
          income += continent.bonus || 0;
        }
      }
    }

    return income;
  }

  _countUnits(playerId) {
    const counts = {};

    for (const [territory, units] of Object.entries(this.gameState.units || {})) {
      for (const unit of units) {
        if (unit.owner === playerId) {
          counts[unit.type] = (counts[unit.type] || 0) + (unit.quantity || 1);
        }
      }
    }

    return counts;
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

  _getContrastColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  _bindEvents() {
    // Tab switching
    this.contentEl.querySelectorAll('.pp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this._render();
      });
    });

    // Action buttons
    this.contentEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const territory = btn.dataset.territory;
        const setIndex = btn.dataset.set;

        if (action === 'toggle-cards') {
          this.cardsCollapsed = !this.cardsCollapsed;
          this._render();
          return;
        }

        if (action === 'trade-set' && setIndex !== undefined) {
          const cardSet = this.validCardSets[parseInt(setIndex)];
          if (this.onAction && cardSet) {
            this.onAction('trade-set', { cardSet });
          }
          return;
        }

        if (this.onAction) {
          this.onAction(action, { territory });
        }
      });
    });

    // Scroll log to bottom
    const logTab = this.contentEl.querySelector('.pp-log-entries');
    if (logTab) {
      logTab.scrollTop = logTab.scrollHeight;
    }
  }
}
