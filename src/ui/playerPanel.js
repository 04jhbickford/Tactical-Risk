// Player-focused panel with tabbed navigation
// Tabs: Actions, Stats, Territory, Log

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_NAMES, TECHNOLOGIES } from '../state/gameState.js';
import { getUnitIconPath } from '../utils/unitIcons.js';

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
  { id: 'stats', label: 'Players', icon: '📊' },
  { id: 'territory', label: 'Territory', icon: '🗺' },
  { id: 'log', label: 'Log', icon: '📜' },
];

export class PlayerPanel {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.continents = null;
    this.territories = null;
    this.onAction = null;
    this.actionLog = null;
    this.selectedTerritory = null;
    this.activeTab = 'actions';
    this.cardsCollapsed = false;
    this.validCardSets = [];

    // Inline purchase state
    this.purchaseCart = {};
    this.purchaseCartCost = 0;

    // Inline tech state
    this.techDiceCount = 0;

    // Inline movement state
    this.moveSelectedUnits = {};  // { unitType: quantity }
    this.movePendingDest = null;

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

  setTerritories(territories) {
    this.territories = {};
    for (const t of territories) {
      this.territories[t.name] = t;
    }
  }

  setActionLog(actionLog) {
    this.actionLog = actionLog;
  }

  setActionCallback(callback) {
    this.onAction = callback;
  }

  setSelectedTerritory(territory) {
    // Reset movement state when territory changes
    if (this.selectedTerritory?.name !== territory?.name) {
      this.moveSelectedUnits = {};
      this.movePendingDest = null;
    }
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
      // Check if we need to block advancing due to unresolved combats
      const hasUnresolvedCombats = turnPhase === TURN_PHASES.COMBAT &&
        this.gameState.combatQueue && this.gameState.combatQueue.length > 0;

      if (hasUnresolvedCombats) {
        html += `
          <div class="pp-end-phase">
            <div class="pp-combat-warning">⚠️ Resolve all battles before advancing</div>
            <button class="pp-action-btn end-phase disabled" disabled>
              End ${TURN_PHASE_NAMES[turnPhase] || 'Phase'} →
            </button>
          </div>`;
      } else {
        html += `
          <div class="pp-end-phase">
            <button class="pp-action-btn end-phase" data-action="next-phase">
              End ${TURN_PHASE_NAMES[turnPhase] || 'Phase'} →
            </button>
          </div>`;
      }
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
      html += this._renderInlinePlacement(player);
    }

    // Playing phase actions
    if (phase === GAME_PHASES.PLAYING) {
      // Tech phase - inline research
      if (turnPhase === TURN_PHASES.DEVELOP_TECH) {
        html += this._renderInlineTech(player);
      }

      // Purchase phase - inline unit purchasing
      if (turnPhase === TURN_PHASES.PURCHASE) {
        html += this._renderInlinePurchase(player);
      }

      if (turnPhase === TURN_PHASES.COMBAT_MOVE || turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
        // Check if we have a territory selected with movable units
        const hasMovableTerritory = this.selectedTerritory && this._hasMovableUnits(this.selectedTerritory, player);

        if (hasMovableTerritory) {
          html += this._renderInlineMovement(player, turnPhase);
        } else {
          html += `<div class="pp-hint">Click a territory with your units to move them</div>`;
        }

        // Show recent moves with individual undo option
        const moveHistory = this.gameState.moveHistory || [];
        if (moveHistory.length > 0) {
          html += `
            <div class="pp-move-history">
              <div class="pp-move-header">Recent Moves</div>`;
          // Show last 5 moves (most recent first)
          const recentMoves = moveHistory.slice(-5).reverse();
          for (let i = 0; i < recentMoves.length; i++) {
            const move = recentMoves[i];
            const unitStr = move.units.map(u => `${u.quantity}${u.type.charAt(0)}`).join(',');
            const isLast = i === 0;
            html += `
              <div class="pp-move-item ${isLast ? 'last' : ''}">
                <span class="pp-move-desc">${unitStr}: ${move.from} → ${move.to}</span>
                ${isLast ? `<button class="pp-undo-btn" data-action="undo-move">↩</button>` : ''}
              </div>`;
          }
          html += `</div>`;
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

  _renderStatsTab(currentPlayer) {
    let html = '<div class="pp-stats-tab">';

    // All players comparison table
    html += `<div class="pp-all-players">`;

    // Gather stats for all players
    const playerStats = this.gameState.players.map(p => {
      const territories = this.gameState.getPlayerTerritories(p.id);
      const income = this._calculateIncome(p.id);
      const units = this._countUnits(p.id);
      const totalUnits = Object.values(units).reduce((a, b) => a + b, 0);
      const techs = this.gameState.playerTechs?.[p.id]?.unlockedTechs || [];
      const ipcs = this.gameState.getIPCs(p.id);
      const capital = this.gameState.capitals?.[p.id];
      const capitalOwner = capital ? this.gameState.getOwner(capital) : null;
      const hasCapital = capitalOwner === p.id;
      const riskCards = this.gameState.riskCards?.[p.id] || [];

      return {
        player: p,
        territories: territories.length,
        income,
        totalUnits,
        units,
        techs: techs.length,
        ipcs,
        hasCapital,
        isCurrentTurn: p.id === currentPlayer.id,
        cardCount: riskCards.length,
        cards: riskCards // Full card list for current player display
      };
    });

    // Sort by territories (most to least)
    playerStats.sort((a, b) => b.territories - a.territories);

    // Player cards
    for (const stats of playerStats) {
      const p = stats.player;
      const flagSrc = p.flag ? `assets/flags/${p.flag}` : null;
      const isActive = stats.isCurrentTurn;
      const isEliminated = !stats.hasCapital && stats.territories === 0;

      html += `
        <div class="pp-player-card ${isActive ? 'active' : ''} ${isEliminated ? 'eliminated' : ''}"
             style="--player-color: ${p.color}">
          <div class="pp-player-header">
            ${flagSrc ? `<img src="${flagSrc}" class="pp-player-flag" alt="${p.name}">` : ''}
            <span class="pp-player-name" style="color: ${p.color}">${p.name}</span>
            ${isActive ? '<span class="pp-turn-indicator">◀ Turn</span>' : ''}
            ${!stats.hasCapital ? '<span class="pp-capital-lost">⚠ Capital Lost</span>' : ''}
          </div>
          <div class="pp-player-stats">
            <div class="pp-pstat">
              <span class="pp-pstat-value">${stats.ipcs}</span>
              <span class="pp-pstat-label">IPCs</span>
            </div>
            <div class="pp-pstat">
              <span class="pp-pstat-value">${stats.income}</span>
              <span class="pp-pstat-label">Income</span>
            </div>
            <div class="pp-pstat">
              <span class="pp-pstat-value">${stats.territories}</span>
              <span class="pp-pstat-label">Terr.</span>
            </div>
            <div class="pp-pstat">
              <span class="pp-pstat-value">${stats.totalUnits}</span>
              <span class="pp-pstat-label">Units</span>
            </div>
            <div class="pp-pstat">
              <span class="pp-pstat-value">${stats.cardCount}</span>
              <span class="pp-pstat-label">Cards</span>
            </div>
          </div>
        </div>`;
    }

    html += `</div>`;

    // Current player detailed breakdown
    const currentStats = playerStats.find(s => s.player.id === currentPlayer.id);
    if (currentStats) {
      html += `
        <div class="pp-stat-section pp-current-detail">
          <div class="pp-stat-header">Your Forces</div>
          <div class="pp-unit-breakdown">`;

      const unitCategories = {
        'Land': ['infantry', 'artillery', 'tank', 'aaGun'],
        'Naval': ['transport', 'submarine', 'destroyer', 'cruiser', 'battleship', 'carrier'],
        'Air': ['fighter', 'bomber']
      };

      for (const [category, types] of Object.entries(unitCategories)) {
        const categoryUnits = types.filter(t => currentStats.units[t] > 0);
        if (categoryUnits.length > 0) {
          html += `<div class="pp-unit-category">
            <span class="pp-unit-cat-label">${category}:</span>
            ${categoryUnits.map(t => `<span class="pp-unit-count">${currentStats.units[t]} ${t}</span>`).join(', ')}
          </div>`;
        }
      }

      html += `</div></div>`;

      // Risk Cards for current player
      if (currentStats.cards.length > 0) {
        const cardCounts = { infantry: 0, cavalry: 0, artillery: 0, wild: 0 };
        for (const card of currentStats.cards) {
          cardCounts[card] = (cardCounts[card] || 0) + 1;
        }

        html += `
          <div class="pp-stat-section">
            <div class="pp-stat-header">🃏 Your Risk Cards (${currentStats.cards.length})</div>
            <div class="pp-card-list">`;

        const cardTypes = ['infantry', 'cavalry', 'artillery', 'wild'];
        const cardIcons = { infantry: '🚶', cavalry: '🐎', artillery: '💣', wild: '⭐' };
        for (const type of cardTypes) {
          if (cardCounts[type] > 0) {
            html += `<span class="pp-card-item">${cardIcons[type]} ${cardCounts[type]}× ${type}</span>`;
          }
        }
        html += `</div></div>`;
      }

      // Technologies for current player
      const techs = this.gameState.playerTechs?.[currentPlayer.id]?.unlockedTechs || [];
      if (techs.length > 0) {
        html += `
          <div class="pp-stat-section">
            <div class="pp-stat-header">🔬 Your Technologies</div>
            <div class="pp-tech-list">`;
        for (const techId of techs) {
          const tech = TECHNOLOGIES[techId];
          if (tech) {
            html += `<div class="pp-tech-item"><span class="pp-tech-name">${tech.name}</span></div>`;
          }
        }
        html += `</div></div>`;
      }
    }

    html += `</div>`;
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

  // Inline Purchase UI
  _renderInlinePurchase(player) {
    const ipcs = this.gameState.getIPCs(player.id);
    const pending = this.gameState.getPendingPurchases?.() || [];
    const pendingCost = pending.reduce((sum, p) => sum + (p.cost || 0) * p.quantity, 0);
    const remaining = ipcs - pendingCost;

    // Get available units to purchase
    const factoryTerritories = this._getFactoryTerritories(player.id);
    const adjacentSeaZones = this._getAdjacentSeaZones(factoryTerritories);
    const hasFactories = factoryTerritories.length > 0;
    const hasSeaZones = adjacentSeaZones.length > 0;

    const purchasableUnits = Object.entries(this.unitDefs || {})
      .filter(([type, def]) => {
        if (type === 'aaGun') return false;
        if ((def.isLand || def.isAir) && hasFactories) return true;
        if (def.isSea && hasSeaZones) return true;
        if (def.isBuilding) return true;
        return false;
      })
      .sort((a, b) => (a[1].cost || 0) - (b[1].cost || 0));

    let html = `
      <div class="pp-inline-purchase">
        <div class="pp-budget-bar">
          <span class="pp-budget-label">Budget:</span>
          <span class="pp-budget-value ${remaining < 5 ? 'low' : ''}">${remaining}</span>
          <span class="pp-budget-sep">/</span>
          <span class="pp-budget-total">${ipcs} IPCs</span>
        </div>

        <div class="pp-unit-grid">`;

    // Group units by category
    const landUnits = purchasableUnits.filter(([_, def]) => def.isLand);
    const navalUnits = purchasableUnits.filter(([_, def]) => def.isSea);
    const airUnits = purchasableUnits.filter(([_, def]) => def.isAir);
    const buildingUnits = purchasableUnits.filter(([_, def]) => def.isBuilding);

    const renderUnitRow = ([unitType, def]) => {
      const pendingUnit = pending.find(p => p.type === unitType);
      const qty = pendingUnit?.quantity || 0;
      const canAfford = remaining >= def.cost;
      const maxQty = Math.floor(remaining / def.cost);
      const imageSrc = getUnitIconPath(unitType, player.id);

      return `
        <div class="pp-buy-row ${qty > 0 ? 'has-qty' : ''}" data-unit="${unitType}">
          <div class="pp-buy-info">
            ${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon" alt="${unitType}">` : ''}
            <span class="pp-buy-name">${unitType}</span>
            <span class="pp-buy-cost">$${def.cost}</span>
          </div>
          <div class="pp-buy-controls">
            <button class="pp-qty-btn" data-action="buy-unit" data-unit="${unitType}" data-delta="-1" ${qty <= 0 ? 'disabled' : ''}>−</button>
            <span class="pp-buy-qty">${qty}</span>
            <div class="pp-buy-plus-stack">
              <button class="pp-qty-btn max" data-action="buy-max" data-unit="${unitType}" ${!canAfford ? 'disabled' : ''} title="Buy max">^</button>
              <button class="pp-qty-btn" data-action="buy-unit" data-unit="${unitType}" data-delta="1" ${!canAfford ? 'disabled' : ''}>+</button>
            </div>
          </div>
        </div>`;
    };

    if (landUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Land</div>`;
      html += landUnits.map(renderUnitRow).join('');
    }
    if (airUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Air</div>`;
      html += airUnits.map(renderUnitRow).join('');
    }
    if (navalUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Naval</div>`;
      html += navalUnits.map(renderUnitRow).join('');
    }
    if (buildingUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Buildings</div>`;
      html += buildingUnits.map(renderUnitRow).join('');
    }

    html += `</div>`;

    // Cart summary
    if (pending.length > 0) {
      const cartItems = pending.map(p => `${p.quantity}× ${p.type}`).join(', ');
      html += `
        <div class="pp-cart-summary">
          <span class="pp-cart-items">${cartItems}</span>
          <button class="pp-action-btn secondary small" data-action="clear-purchases">Clear</button>
        </div>`;
    }

    html += `</div>`;
    return html;
  }

  // Inline Tech Research UI
  _renderInlineTech(player) {
    const ipcs = this.gameState.getIPCs(player.id);
    const maxDice = Math.floor(ipcs / 5);
    const techState = this.gameState.playerTechs?.[player.id] || { techTokens: 0, unlockedTechs: [] };
    const unlockedTechs = techState.unlockedTechs || [];
    const availableTechs = Object.entries(TECHNOLOGIES)
      .filter(([id, _]) => !unlockedTechs.includes(id));

    let html = `
      <div class="pp-inline-tech">
        <div class="pp-tech-budget">
          <span>IPCs: ${ipcs}</span>
          <span class="pp-tech-cost-note">(5 per research die)</span>
        </div>

        <div class="pp-tech-dice-select">
          <span>Research Dice:</span>
          <div class="pp-tech-dice-btns">`;

    for (let i = 0; i <= Math.min(maxDice, 5); i++) {
      html += `<button class="pp-tech-dice-btn ${this.techDiceCount === i ? 'selected' : ''}" data-action="set-tech-dice" data-count="${i}">${i}</button>`;
    }

    html += `
          </div>
          <span class="pp-tech-cost">${this.techDiceCount * 5} IPCs</span>
        </div>`;

    if (this.techDiceCount > 0) {
      html += `
        <button class="pp-action-btn primary" data-action="roll-tech">
          Roll ${this.techDiceCount} Dice (cost: ${this.techDiceCount * 5} IPCs)
        </button>`;
    }

    // Show available techs
    if (availableTechs.length > 0) {
      html += `<div class="pp-tech-available"><div class="pp-tech-avail-label">Available Technologies:</div>`;
      for (const [id, tech] of availableTechs.slice(0, 4)) {
        html += `<div class="pp-tech-item-small">${tech.name}</div>`;
      }
      if (availableTechs.length > 4) {
        html += `<div class="pp-tech-more">+${availableTechs.length - 4} more</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  // Inline Placement UI
  _renderInlinePlacement(player) {
    const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
    const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);
    const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
    const unitsToPlace = this.gameState.getUnitsToPlace?.(player.id) || [];
    const hasPlaceable = this.gameState.hasPlaceableUnits?.(player.id, this.unitDefs) ?? (totalRemaining > 0);
    const canFinish = placedThisRound >= limit || totalRemaining === 0 || !hasPlaceable;
    const canUndo = this.gameState.placementHistory && this.gameState.placementHistory.length > 0;
    const needMore = limit - placedThisRound;

    let html = `
      <div class="pp-inline-placement">
        <div class="pp-placement-progress-bar">
          <span class="pp-placement-count">${placedThisRound}/${limit}</span>
          <span class="pp-placement-label">placed this round</span>
        </div>`;

    // Check if selected territory is valid for placement
    const isValidPlacement = this.selectedTerritory && this._isValidPlacementTerritory(this.selectedTerritory, player);

    // Show selected territory if valid
    if (isValidPlacement) {
      html += `
        <div class="pp-placement-selected">
          <span class="pp-selected-label">Placing on:</span>
          <span class="pp-selected-name">${this.selectedTerritory.name}</span>
        </div>`;

      // Show unit buttons for units that can be placed
      const landUnits = unitsToPlace.filter(u => {
        const def = this.unitDefs?.[u.type];
        return def && (def.isLand || def.isAir) && u.quantity > 0;
      });
      const navalUnits = unitsToPlace.filter(u => {
        const def = this.unitDefs?.[u.type];
        return def?.isSea && u.quantity > 0;
      });

      // Show appropriate units based on territory type
      const isWater = this.selectedTerritory.isWater;
      const unitsForTerritory = isWater ? navalUnits : landUnits;

      if (unitsForTerritory.length > 0 && needMore > 0) {
        html += `<div class="pp-placement-units">`;
        for (const unit of unitsForTerritory) {
          const imageSrc = getUnitIconPath(unit.type, player.id);
          html += `
            <button class="pp-place-btn" data-action="place-unit" data-unit="${unit.type}">
              ${imageSrc ? `<img src="${imageSrc}" class="pp-place-icon" alt="${unit.type}">` : ''}
              <span class="pp-place-qty">${unit.quantity}</span>
              <span class="pp-place-name">${unit.type}</span>
            </button>`;
        }
        html += `</div>`;
      } else if (needMore <= 0) {
        html += `<div class="pp-placement-done-msg">Round limit reached</div>`;
      } else {
        html += `<div class="pp-placement-done-msg">No ${isWater ? 'naval' : 'land'} units to place</div>`;
      }
    } else if (this.selectedTerritory) {
      // Territory selected but not valid for placement
      html += `<div class="pp-hint">Select one of your territories to place units</div>`;
    } else {
      html += `<div class="pp-hint">Click a territory to place units</div>`;
    }

    // Remaining units summary
    if (totalRemaining > 0) {
      html += `<div class="pp-placement-remaining">${totalRemaining} units left to place</div>`;
    }

    // Action buttons
    html += `<div class="pp-placement-actions">`;
    if (canUndo) {
      html += `<button class="pp-action-btn secondary small" data-action="undo-placement">Undo</button>`;
    }
    if (canFinish) {
      html += `<button class="pp-action-btn primary" data-action="finish-placement">Done</button>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }

  // Check if territory is valid for initial unit placement
  _isValidPlacementTerritory(territory, player) {
    if (!territory || !player) return false;

    // Land territories: must be owned by player
    if (!territory.isWater) {
      return this.gameState.getOwner(territory.name) === player.id;
    }

    // Sea zones: must be adjacent to player-owned coastal territory
    if (!this.territories) return false;
    const seaZone = this.territories[territory.name];
    if (!seaZone) return false;

    for (const connName of seaZone.connections || []) {
      const conn = this.territories[connName];
      if (conn && !conn.isWater && this.gameState.getOwner(connName) === player.id) {
        return true;
      }
    }
    return false;
  }

  _getFactoryTerritories(playerId) {
    const factories = [];
    for (const [name, state] of Object.entries(this.gameState.territoryState || {})) {
      if (state.owner !== playerId) continue;
      const units = this.gameState.units[name] || [];
      if (units.some(u => u.type === 'factory' && u.owner === playerId)) {
        factories.push(name);
      }
    }
    return factories;
  }

  _getAdjacentSeaZones(factoryTerritories) {
    if (!this.territories) return [];
    const seaZones = new Set();
    for (const terrName of factoryTerritories) {
      const territory = this.territories[terrName];
      if (!territory) continue;
      for (const conn of territory.connections || []) {
        const connT = this.territories[conn];
        if (connT?.isWater) {
          seaZones.add(conn);
        }
      }
    }
    return Array.from(seaZones);
  }

  // Check if territory has movable units owned by player
  _hasMovableUnits(territory, player) {
    if (!territory || !player) return false;
    const units = this.gameState.getUnitsAt(territory.name);
    return units.some(u => {
      if (u.owner !== player.id) return false;
      const def = this.unitDefs?.[u.type];
      if (!def || def.movement <= 0 || def.isBuilding) return false;
      // Check if unit hasn't moved yet
      return !u.moved;
    });
  }

  // Get movable units at a territory for current player
  _getMovableUnits(territory, player) {
    if (!territory || !player) return [];
    const units = this.gameState.getUnitsAt(territory.name);
    const movable = {};

    for (const u of units) {
      if (u.owner !== player.id) continue;
      const def = this.unitDefs?.[u.type];
      if (!def || def.movement <= 0 || def.isBuilding) continue;
      if (u.moved) continue;

      // Skip individual ships (have IDs) - aggregate by type
      if (u.id) continue;

      if (!movable[u.type]) {
        movable[u.type] = { type: u.type, quantity: 0 };
      }
      movable[u.type].quantity += u.quantity;
    }

    return Object.values(movable);
  }

  // Get valid destinations for selected units
  _getValidDestinations(fromTerritory, player, isCombatMove) {
    if (!fromTerritory || !this.territories) return [];
    const from = this.territories[fromTerritory.name];
    if (!from) return [];

    const destinations = [];
    for (const connName of from.connections || []) {
      const conn = this.territories[connName];
      if (!conn) continue;

      const owner = this.gameState.getOwner(connName);
      const isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
      const isFriendly = owner === player.id || this.gameState.areAllies(player.id, owner);

      // Combat move: can attack enemies, non-combat: friendly only
      if (isCombatMove) {
        // Land units can attack enemies, all units can move to sea zones
        if (isEnemy || conn.isWater || !owner) {
          destinations.push({ name: connName, isEnemy, isWater: conn.isWater });
        }
      } else {
        // Non-combat: friendly or neutral only
        if (!isEnemy) {
          destinations.push({ name: connName, isEnemy: false, isWater: conn.isWater });
        }
      }
    }

    return destinations;
  }

  _renderInlineMovement(player, turnPhase) {
    const isCombatMove = turnPhase === TURN_PHASES.COMBAT_MOVE;
    const movableUnits = this._getMovableUnits(this.selectedTerritory, player);
    const totalSelected = Object.values(this.moveSelectedUnits).reduce((sum, q) => sum + q, 0);
    const destinations = this._getValidDestinations(this.selectedTerritory, player, isCombatMove);

    let html = `
      <div class="pp-inline-movement">
        <div class="pp-move-from">
          <span class="pp-move-label">From:</span>
          <span class="pp-move-territory">${this.selectedTerritory.name}</span>
        </div>

        <div class="pp-move-units">`;

    // Show movable units with +/- controls
    for (const unit of movableUnits) {
      const selected = this.moveSelectedUnits[unit.type] || 0;
      const imageSrc = getUnitIconPath(unit.type, player.id);

      html += `
        <div class="pp-move-unit-row">
          <div class="pp-move-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="pp-move-icon" alt="${unit.type}">` : ''}
            <span class="pp-move-name">${unit.type}</span>
            <span class="pp-move-avail">(${unit.quantity})</span>
          </div>
          <div class="pp-move-controls">
            <button class="pp-qty-btn" data-action="move-unit" data-unit="${unit.type}" data-delta="-1" ${selected <= 0 ? 'disabled' : ''}>−</button>
            <span class="pp-move-qty">${selected}</span>
            <button class="pp-qty-btn" data-action="move-unit" data-unit="${unit.type}" data-delta="1" ${selected >= unit.quantity ? 'disabled' : ''}>+</button>
            <button class="pp-move-all-btn" data-action="move-all" data-unit="${unit.type}" data-qty="${unit.quantity}" ${selected >= unit.quantity ? 'disabled' : ''}>All</button>
          </div>
        </div>`;
    }

    html += `</div>`;

    // Select All / Clear buttons
    const totalMovable = movableUnits.reduce((sum, u) => sum + u.quantity, 0);
    html += `
      <div class="pp-move-select-all">
        <button class="pp-move-btn secondary" data-action="move-select-all" ${totalSelected >= totalMovable ? 'disabled' : ''}>Select All</button>
        ${totalSelected > 0 ? `<button class="pp-move-btn secondary" data-action="move-clear">Clear</button>` : ''}
      </div>`;

    // Destination selection
    if (totalSelected > 0 && destinations.length > 0) {
      html += `
        <div class="pp-move-destinations">
          <span class="pp-move-label">Move to:</span>
          <div class="pp-dest-list">`;

      for (const dest of destinations.slice(0, 8)) {
        const isSelected = this.movePendingDest === dest.name;
        html += `
          <button class="pp-dest-btn ${isSelected ? 'selected' : ''} ${dest.isEnemy ? 'enemy' : ''}"
                  data-action="select-dest" data-dest="${dest.name}">
            ${dest.name}${dest.isEnemy ? ' ⚔' : ''}
          </button>`;
      }
      if (destinations.length > 8) {
        html += `<div class="pp-dest-more">+${destinations.length - 8} more (click map)</div>`;
      }

      html += `</div></div>`;

      // Confirm button
      if (this.movePendingDest) {
        html += `
          <button class="pp-action-btn primary" data-action="confirm-move">
            Confirm Move to ${this.movePendingDest}
          </button>`;
      }
    } else if (totalSelected > 0) {
      html += `<div class="pp-hint">Click a destination on the map</div>`;
    }

    // Cancel button
    html += `
      <button class="pp-move-btn cancel" data-action="cancel-move">Cancel</button>
    </div>`;

    return html;
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

        // Handle buy-unit action
        if (action === 'buy-unit') {
          const unitType = btn.dataset.unit;
          const delta = parseInt(btn.dataset.delta, 10);
          if (this.onAction && unitType) {
            this.onAction('buy-unit', { unitType, delta });
          }
          return;
        }

        // Handle buy-max action
        if (action === 'buy-max') {
          const unitType = btn.dataset.unit;
          if (this.onAction && unitType) {
            this.onAction('buy-max', { unitType });
          }
          return;
        }

        // Handle place-unit action
        if (action === 'place-unit') {
          const unitType = btn.dataset.unit;
          if (this.onAction && unitType && this.selectedTerritory) {
            this.onAction('place-unit', { unitType, territory: this.selectedTerritory.name });
          }
          return;
        }

        // Handle tech dice selection
        if (action === 'set-tech-dice') {
          this.techDiceCount = parseInt(btn.dataset.count, 10);
          this._render();
          return;
        }

        // Handle tech roll
        if (action === 'roll-tech') {
          if (this.onAction && this.techDiceCount > 0) {
            this.onAction('roll-tech', { diceCount: this.techDiceCount });
            this.techDiceCount = 0; // Reset after rolling
          }
          return;
        }

        // Handle movement unit selection (+/-)
        if (action === 'move-unit') {
          const unitType = btn.dataset.unit;
          const delta = parseInt(btn.dataset.delta, 10);
          const current = this.moveSelectedUnits[unitType] || 0;
          const movable = this._getMovableUnits(this.selectedTerritory, this.gameState.currentPlayer);
          const maxQty = movable.find(u => u.type === unitType)?.quantity || 0;
          const newQty = Math.max(0, Math.min(maxQty, current + delta));
          this.moveSelectedUnits[unitType] = newQty;
          this._render();
          return;
        }

        // Handle move-all for a unit type
        if (action === 'move-all') {
          const unitType = btn.dataset.unit;
          const qty = parseInt(btn.dataset.qty, 10);
          this.moveSelectedUnits[unitType] = qty;
          this._render();
          return;
        }

        // Handle select-all units for movement
        if (action === 'move-select-all') {
          const movable = this._getMovableUnits(this.selectedTerritory, this.gameState.currentPlayer);
          for (const unit of movable) {
            this.moveSelectedUnits[unit.type] = unit.quantity;
          }
          this._render();
          return;
        }

        // Handle clear movement selection
        if (action === 'move-clear') {
          this.moveSelectedUnits = {};
          this.movePendingDest = null;
          this._render();
          return;
        }

        // Handle destination selection
        if (action === 'select-dest') {
          const dest = btn.dataset.dest;
          this.movePendingDest = dest;
          this._render();
          return;
        }

        // Handle confirm move
        if (action === 'confirm-move') {
          if (this.onAction && this.movePendingDest && this.selectedTerritory) {
            const units = Object.entries(this.moveSelectedUnits)
              .filter(([_, qty]) => qty > 0)
              .map(([type, quantity]) => ({ type, quantity }));
            if (units.length > 0) {
              this.onAction('execute-move', {
                from: this.selectedTerritory.name,
                to: this.movePendingDest,
                units
              });
              // Reset movement state after confirming
              this.moveSelectedUnits = {};
              this.movePendingDest = null;
            }
          }
          return;
        }

        // Handle cancel move
        if (action === 'cancel-move') {
          this.moveSelectedUnits = {};
          this.movePendingDest = null;
          this._render();
          return;
        }

        if (this.onAction) {
          const unitType = btn.dataset.type;
          this.onAction(action, { territory, unitType });
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
