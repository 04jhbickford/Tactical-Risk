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

    // Inline air landing state
    this.airLandingData = null;  // { airUnitsToLand, combatTerritory, isRetreating }
    this.airLandingIndex = 0;
    this.airLandingSelections = {};
    this.onAirLandingComplete = null;

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
      this.moveUnitTab = 'land'; // Reset to default tab
      this.placementQueue = {}; // Reset placement queue
    }
    this.selectedTerritory = territory;
    this._render();
  }

  // Air landing methods
  setAirLanding(airUnitsToLand, combatTerritory, isRetreating, onComplete) {
    this.airLandingData = { airUnitsToLand, combatTerritory, isRetreating };
    this.airLandingIndex = 0;
    this.airLandingSelections = {};
    this.onAirLandingComplete = onComplete;
    this.activeTab = 'actions'; // Switch to actions tab
    this._render();
  }

  clearAirLanding() {
    this.airLandingData = null;
    this.airLandingIndex = 0;
    this.airLandingSelections = {};
    this.onAirLandingComplete = null;
    this._render();
  }

  isAirLandingActive() {
    return this.airLandingData && this.airLandingData.airUnitsToLand?.length > 0;
  }

  getAirLandingDestinations() {
    if (!this.isAirLandingActive()) return [];
    const allDests = new Set();
    for (const unit of this.airLandingData.airUnitsToLand) {
      for (const opt of unit.landingOptions || []) {
        allDests.add(opt.territory);
      }
    }
    return Array.from(allDests);
  }

  handleAirLandingTerritoryClick(territory) {
    if (!this.isAirLandingActive()) return false;

    const currentUnit = this.airLandingData.airUnitsToLand[this.airLandingIndex];
    if (!currentUnit) return false;

    const validDest = currentUnit.landingOptions?.find(opt => opt.territory === territory.name);
    if (validDest) {
      const unitKey = currentUnit.id || `${currentUnit.type}_${this.airLandingIndex}`;
      this.airLandingSelections[unitKey] = territory.name;

      // Move to next unit if available
      if (this.airLandingIndex < this.airLandingData.airUnitsToLand.length - 1) {
        this.airLandingIndex++;
      }

      this._render();
      return true;
    }
    return false;
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

    // Air landing takes priority when active
    if (this.isAirLandingActive()) {
      html += this._renderInlineAirLanding(player);
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

      // Check if we need to block advancing due to unplaced units in mobilize phase
      const pendingPurchases = this.gameState.getPendingPurchases?.() || [];
      const unplacedUnits = pendingPurchases.reduce((sum, p) => sum + p.quantity, 0);
      const hasUnplacedUnits = turnPhase === TURN_PHASES.MOBILIZE && unplacedUnits > 0;

      if (hasUnresolvedCombats) {
        html += `
          <div class="pp-end-phase">
            <div class="pp-combat-warning">⚠️ Resolve all battles before advancing</div>
            <button class="pp-action-btn end-phase disabled" disabled>
              End ${TURN_PHASE_NAMES[turnPhase] || 'Phase'} →
            </button>
          </div>`;
      } else if (hasUnplacedUnits) {
        html += `
          <div class="pp-end-phase">
            <div class="pp-mobilize-warning">⚠️ Place all ${unplacedUnits} unit${unplacedUnits > 1 ? 's' : ''} before advancing</div>
            <button class="pp-action-btn end-phase disabled" disabled>
              End ${TURN_PHASE_NAMES[turnPhase] || 'Phase'} →
            </button>
          </div>`;
      } else {
        html += `
          <div class="pp-end-phase">
            <button class="pp-action-btn complete end-phase" data-action="next-phase">
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
            <button class="pp-action-btn complete" data-action="place-capital" data-territory="${this.selectedTerritory.name}">
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

        // Show rockets option during combat move phase (if player has tech)
        if (turnPhase === TURN_PHASES.COMBAT_MOVE) {
          html += this._renderRocketsUI(player);
        }

        // Show recent moves with individual undo option (only during combat move phase)
        const moveHistory = this.gameState.moveHistory || [];
        if (turnPhase === TURN_PHASES.COMBAT_MOVE && moveHistory.length > 0) {
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
        html += this._renderInlineMobilize(player);
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
      // Capital is stored in playerState, not a separate capitals object
      const capital = this.gameState.playerState?.[p.id]?.capitalTerritory;
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

    // Continent control - show all players' progress
    html += `
      <div class="pp-stat-section">
        <div class="pp-stat-header">🌍 Continent Control</div>
        <div class="pp-continent-table-all">`;

    if (this.continents && this.continents.length > 0) {
      const players = this.gameState.getPlayers?.() || [];

      for (const continent of this.continents) {
        const total = continent.territories.length;

        // Get ownership breakdown for all players
        const ownership = {};
        for (const terrName of continent.territories) {
          const owner = this.gameState.getOwner(terrName);
          if (owner) {
            ownership[owner] = (ownership[owner] || 0) + 1;
          }
        }

        // Sort players by count (highest first)
        const sortedPlayers = Object.entries(ownership)
          .map(([playerId, count]) => ({
            player: this.gameState.getPlayer(playerId),
            count,
            hasBonus: count === total
          }))
          .sort((a, b) => b.count - a.count);

        // Find who has the bonus
        const bonusHolder = sortedPlayers.find(p => p.hasBonus);

        html += `
          <div class="pp-continent-block">
            <div class="pp-continent-header">
              <span class="pp-continent-name">${continent.name}</span>
              <span class="pp-continent-bonus ${bonusHolder ? 'active' : ''}">+${continent.bonus} IPCs</span>
            </div>
            <div class="pp-continent-players">`;

        for (const { player: p, count, hasBonus } of sortedPlayers) {
          if (!p) continue;
          const pct = Math.round((count / total) * 100);
          html += `
              <div class="pp-continent-player-row ${hasBonus ? 'has-bonus' : ''}">
                <div class="pp-continent-player-info">
                  ${p.flag ? `<img src="assets/flags/${p.flag}" class="pp-continent-flag" alt="">` : ''}
                  <span class="pp-continent-player-name" style="color: ${p.color}">${p.name}</span>
                </div>
                <div class="pp-continent-player-progress">
                  <div class="pp-continent-player-bar">
                    <div class="pp-continent-player-fill" style="width: ${pct}%; background: ${p.color}"></div>
                  </div>
                  <span class="pp-continent-player-count">${count}/${total}</span>
                </div>
              </div>`;
        }

        html += `
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

      // Collapse consecutive placement entries into summaries
      const collapsedEntries = this._collapseLogEntries(entries);

      if (collapsedEntries.length === 0) {
        html += `<div class="pp-log-empty">No actions yet</div>`;
      } else {
        html += `<div class="pp-log-entries">`;
        for (const entry of collapsedEntries) {
          const time = entry.timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const colorStyle = entry.data.color ? `border-left-color: ${entry.data.color}` : '';

          // Extract territory and movement data for hover highlighting
          const territoryData = this._getLogTerritoryData(entry);
          const dataAttrs = this._buildLogDataAttrs(territoryData);

          html += `
            <div class="pp-log-entry" style="${colorStyle}" ${dataAttrs}>
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

  // Collapse consecutive placement entries into summaries
  _collapseLogEntries(entries) {
    const result = [];
    let placementGroup = null;

    for (const entry of entries) {
      if (entry.type === 'placement' || entry.type === 'mobilize') {
        const territory = entry.data.territory;

        // Get units to add - mobilize has units array, placement has single unitType
        let unitsToAdd = [];
        if (entry.data.units && Array.isArray(entry.data.units)) {
          unitsToAdd = entry.data.units.map(u => ({
            type: u.type,
            quantity: u.quantity || 1
          }));
        } else if (entry.data.unitType) {
          unitsToAdd = [{ type: entry.data.unitType, quantity: 1 }];
        }

        // Start new group or add to existing
        if (placementGroup && placementGroup.territory === territory &&
            placementGroup.data.color === entry.data.color) {
          // Add to existing group
          for (const unit of unitsToAdd) {
            const existing = placementGroup.units.find(u => u.type === unit.type);
            if (existing) {
              existing.quantity += unit.quantity;
            } else {
              placementGroup.units.push({ type: unit.type, quantity: unit.quantity });
            }
          }
          placementGroup.timestamp = entry.timestamp; // Update to latest timestamp
        } else {
          // Flush previous group if exists
          if (placementGroup) {
            result.push(this._createPlacementSummary(placementGroup));
          }
          // Start new group
          placementGroup = {
            territory,
            units: unitsToAdd,
            timestamp: entry.timestamp,
            data: { color: entry.data.color },
            type: entry.type
          };
        }
      } else {
        // Flush placement group if exists
        if (placementGroup) {
          result.push(this._createPlacementSummary(placementGroup));
          placementGroup = null;
        }
        result.push(entry);
      }
    }

    // Flush final placement group
    if (placementGroup) {
      result.push(this._createPlacementSummary(placementGroup));
    }

    return result;
  }

  // Create a summary entry from a placement group
  _createPlacementSummary(group) {
    const unitStr = group.units.map(u => `${u.quantity} ${u.type}`).join(', ');
    const action = group.type === 'mobilize' ? 'deployed' : 'placed';
    return {
      type: 'placement-summary',
      timestamp: group.timestamp,
      data: {
        message: `${unitStr} ${action} on ${group.territory}`,
        territory: group.territory,
        units: group.units,
        color: group.data.color
      }
    };
  }

  // Extract territory/movement data from log entry for hover highlighting
  _getLogTerritoryData(entry) {
    const data = entry.data;
    const result = { territories: [], from: null, to: null, isCombat: false };

    switch (entry.type) {
      case 'move':
      case 'ncm':
        result.from = data.from;
        result.to = data.to;
        result.territories = [data.from, data.to].filter(Boolean);
        break;
      case 'attack':
        result.from = data.from;
        result.to = data.to;
        result.territories = [data.from, data.to].filter(Boolean);
        result.isCombat = true;
        break;
      case 'combat-summary':
      case 'combat':
      case 'capture':
        result.territories = [data.territory].filter(Boolean);
        result.isCombat = true;
        break;
      case 'placement':
      case 'placement-summary':
      case 'mobilize':
      case 'capital':
        result.territories = [data.territory].filter(Boolean);
        break;
      default:
        break;
    }

    return result;
  }

  // Build data attributes string for log entry hover
  _buildLogDataAttrs(territoryData) {
    const attrs = [];
    if (territoryData.territories.length > 0) {
      attrs.push(`data-territories="${territoryData.territories.join(',')}"`);
    }
    if (territoryData.from && territoryData.to) {
      attrs.push(`data-from="${territoryData.from}"`);
      attrs.push(`data-to="${territoryData.to}"`);
      attrs.push(`data-combat="${territoryData.isCombat}"`);
    }
    return attrs.join(' ');
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
      case 'placement-summary': return data.message;
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
    // getIPCs returns remaining IPCs (already has pending costs subtracted)
    const remaining = this.gameState.getIPCs(player.id);
    const pending = this.gameState.getPendingPurchases?.() || [];
    const pendingCost = pending.reduce((sum, p) => sum + (p.cost || 0) * p.quantity, 0);
    // Calculate original budget by adding back pending costs
    const totalBudget = remaining + pendingCost;

    // Get available units to purchase
    const factoryTerritories = this._getFactoryTerritories(player.id);
    const adjacentSeaZones = this._getAdjacentSeaZones(factoryTerritories);
    const hasFactories = factoryTerritories.length > 0;
    const hasSeaZones = adjacentSeaZones.length > 0;

    const purchasableUnits = Object.entries(this.unitDefs || {})
      .filter(([type, def]) => {
        // AA guns can now be purchased
        if ((def.isLand || def.isAir || def.isBuilding) && hasFactories) return true;
        if (def.isSea && hasSeaZones) return true;
        return false;
      })
      .sort((a, b) => (a[1].cost || 0) - (b[1].cost || 0));

    // Risk cards section
    const riskCards = this.gameState.riskCards?.[player.id] || [];
    const canTradeCards = this.gameState.canTradeRiskCards?.(player.id);
    const nextCardValue = this.gameState.getNextRiskCardValue?.(player.id) || 12;

    let html = `
      <div class="pp-inline-purchase">
        <div class="pp-budget-bar">
          <span class="pp-budget-label">Budget:</span>
          <span class="pp-budget-value ${remaining < 5 ? 'low' : ''}">${remaining}</span>
          <span class="pp-budget-sep">/</span>
          <span class="pp-budget-total">${totalBudget} IPCs</span>
        </div>`;

    // Show Risk cards trade option if available
    if (riskCards.length > 0) {
      const cardIcons = { infantry: '🚶', cavalry: '🐎', artillery: '💣', wild: '⭐' };
      const cardCounts = {};
      riskCards.forEach(c => cardCounts[c] = (cardCounts[c] || 0) + 1);

      html += `
        <div class="pp-risk-cards-section">
          <div class="pp-risk-cards-header">
            <span class="pp-risk-cards-label">🃏 Risk Cards (${riskCards.length})</span>
            <span class="pp-risk-cards-summary">
              ${Object.entries(cardCounts).map(([type, count]) => `${cardIcons[type]}${count}`).join(' ')}
            </span>
          </div>`;

      if (canTradeCards) {
        html += `
          <div class="pp-risk-cards-trade">
            <span class="pp-trade-value">Trade for +${nextCardValue} IPCs</span>
            <button class="pp-action-btn trade-cards" data-action="trade-risk-cards">Cash In</button>
          </div>`;
      } else if (riskCards.length >= 5) {
        html += `<div class="pp-risk-cards-warning">⚠️ You must trade cards (5+ cards)</div>`;
      }

      html += `</div>`;
    }

    html += `<div class="pp-unit-list">`;

    // Group units by category (factory goes in Land)
    const landUnits = purchasableUnits.filter(([_, def]) => def.isLand || def.isBuilding);
    const airUnits = purchasableUnits.filter(([_, def]) => def.isAir);
    const navalUnits = purchasableUnits.filter(([_, def]) => def.isSea);

    // Check for industrial tech discount
    const hasIndustrialTech = this.gameState.hasTech?.(player.id, 'industrialTech') || false;

    const renderUnitRow = ([unitType, def]) => {
      const pendingUnit = pending.find(p => p.type === unitType);
      const qty = pendingUnit?.quantity || 0;
      // Apply industrial tech discount (-1 IPC, min 1)
      const actualCost = hasIndustrialTech ? Math.max(1, def.cost - 1) : def.cost;
      const canAfford = remaining >= actualCost;
      const imageSrc = getUnitIconPath(unitType, player.id);
      const costDisplay = hasIndustrialTech && def.cost > 1
        ? `<span class="pp-cost-discounted">$${actualCost}</span> <span class="pp-cost-original">$${def.cost}</span>`
        : `$${actualCost}`;

      return `
        <div class="pp-buy-row ${qty > 0 ? 'has-qty' : ''}">
          <div class="pp-buy-info">
            ${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon" alt="${unitType}">` : ''}
            <span class="pp-buy-name">${unitType}</span>
            <span class="pp-buy-cost">${costDisplay}</span>
          </div>
          <div class="pp-buy-controls">
            <button class="pp-qty-btn" data-action="buy-unit" data-unit="${unitType}" data-delta="-1" ${qty <= 0 ? 'disabled' : ''}>−</button>
            <span class="pp-buy-qty">${qty}</span>
            <button class="pp-qty-btn" data-action="buy-unit" data-unit="${unitType}" data-delta="1" ${!canAfford ? 'disabled' : ''}>+</button>
            <button class="pp-qty-btn max-btn" data-action="buy-max" data-unit="${unitType}" ${!canAfford ? 'disabled' : ''}>Max</button>
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

    html += `</div>`;

    // Cart summary and Buy button
    const totalUnits = pending.reduce((sum, p) => sum + p.quantity, 0);
    if (totalUnits > 0) {
      const cartItems = pending.map(p => `${p.quantity}× ${p.type}`).join(', ');
      html += `
        <div class="pp-cart-summary">
          <div class="pp-cart-items">${cartItems}</div>
          <div class="pp-cart-total">Total: ${pendingCost} IPCs</div>
        </div>
        <div class="pp-purchase-actions">
          <button class="pp-action-btn secondary" data-action="clear-purchases">Clear All</button>
          <button class="pp-action-btn primary" data-action="confirm-purchase">Buy ${totalUnits} Unit${totalUnits > 1 ? 's' : ''}</button>
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
          <span class="pp-tech-cost-note">(5 per die, roll 6 = breakthrough)</span>
        </div>

        <div class="pp-tech-dice-row">
          <span class="pp-tech-dice-label">Research Dice:</span>
          <div class="pp-tech-dice-controls">
            <button class="pp-qty-btn" data-action="tech-dice-delta" data-delta="-1" ${this.techDiceCount <= 0 ? 'disabled' : ''}>−</button>
            <span class="pp-tech-dice-count">${this.techDiceCount}</span>
            <button class="pp-qty-btn" data-action="tech-dice-delta" data-delta="1" ${this.techDiceCount >= maxDice ? 'disabled' : ''}>+</button>
            <button class="pp-qty-btn max-btn" data-action="tech-dice-max" ${maxDice <= 0 ? 'disabled' : ''}>Max</button>
          </div>
          <span class="pp-tech-cost">Cost: ${this.techDiceCount * 5} IPCs</span>
        </div>`;

    if (this.techDiceCount > 0) {
      html += `
        <button class="pp-action-btn primary" data-action="roll-tech">
          Roll ${this.techDiceCount} Research Dice
        </button>`;
    }

    // Show all technologies with descriptions and owned status
    html += `<div class="pp-tech-list">`;
    html += `<div class="pp-tech-list-header">Technologies</div>`;

    for (const [id, tech] of Object.entries(TECHNOLOGIES)) {
      const isOwned = unlockedTechs.includes(id);
      html += `
        <div class="pp-tech-item ${isOwned ? 'owned' : ''}">
          <div class="pp-tech-item-name">${isOwned ? '✓ ' : ''}${tech.name}</div>
          <div class="pp-tech-item-desc">${tech.description}</div>
        </div>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }

  // Rockets UI for launching rocket attacks during combat move
  _renderRocketsUI(player) {
    // Check if player has rockets tech
    if (!this.gameState.hasTech(player.id, 'rockets')) return '';

    const availableAA = this.gameState.getAvailableRocketAAguns(player.id);
    if (availableAA.length === 0) return '';

    // Check if any AA guns have valid targets
    const aaWithTargets = [];
    for (const aa of availableAA) {
      const targets = this.gameState.getRocketTargets(aa.territory);
      if (targets.length > 0) {
        aaWithTargets.push({ ...aa, targets });
      }
    }

    if (aaWithTargets.length === 0) return '';

    let html = `
      <div class="pp-rockets-section">
        <div class="pp-rockets-header">
          <span class="pp-rockets-icon">🚀</span>
          <span>Rocket Attacks</span>
        </div>
        <div class="pp-rockets-hint">AA guns can bombard enemy factories</div>
        <div class="pp-rockets-list">`;

    for (const aa of aaWithTargets) {
      html += `
        <div class="pp-rocket-aa">
          <div class="pp-rocket-source">${aa.territory} (${aa.availableCount} AA available)</div>
          <div class="pp-rocket-targets">`;

      for (const target of aa.targets) {
        html += `
          <button class="pp-rocket-btn" data-action="launch-rocket" data-from="${aa.territory}" data-target="${target.territory}">
            🎯 ${target.territory} (${target.ownerName}: ${target.ownerIPCs} IPCs)
          </button>`;
      }
      html += `</div></div>`;
    }

    html += `</div></div>`;
    return html;
  }

  // Inline Placement UI - mimics buy phase style
  _renderInlinePlacement(player) {
    const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
    const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);
    const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
    const unitsToPlace = this.gameState.getUnitsToPlace?.(player.id) || [];
    const hasPlaceable = this.gameState.hasPlaceableUnits?.(player.id, this.unitDefs) ?? (totalRemaining > 0);
    const canFinish = placedThisRound >= limit || totalRemaining === 0 || !hasPlaceable;
    const canUndo = this.gameState.placementHistory && this.gameState.placementHistory.length > 0;
    const slotsRemaining = limit - placedThisRound;

    // Calculate actual total remaining from unit quantities
    const actualRemaining = unitsToPlace.reduce((sum, u) => sum + u.quantity, 0);

    // Separate units by category
    const landUnits = unitsToPlace.filter(u => {
      const def = this.unitDefs?.[u.type];
      return def && def.isLand && u.quantity > 0;
    });
    const airUnits = unitsToPlace.filter(u => {
      const def = this.unitDefs?.[u.type];
      return def && def.isAir && u.quantity > 0;
    });
    const navalUnits = unitsToPlace.filter(u => {
      const def = this.unitDefs?.[u.type];
      return def?.isSea && u.quantity > 0;
    });

    // Initialize placement queue if not exists
    if (!this.placementQueue) this.placementQueue = {};

    // Check if selected territory is valid for placement
    const isValidPlacement = this.selectedTerritory && this._isValidPlacementTerritory(this.selectedTerritory, player);
    const isWater = this.selectedTerritory?.isWater;

    // Calculate total queued early so we can show Done button
    const totalQueued = Object.values(this.placementQueue || {}).reduce((sum, q) => sum + q, 0);
    const showDoneButton = canFinish && totalQueued === 0;

    // Calculate current + queued for display
    const effectiveDeployed = placedThisRound + totalQueued;

    let html = `
      <div class="pp-inline-placement">
        <div class="pp-budget-bar">
          <span class="pp-budget-label">Deployed:</span>
          <span class="pp-budget-value ${effectiveDeployed >= limit ? 'full' : ''}">${placedThisRound}${totalQueued > 0 ? `+${totalQueued}` : ''}</span>
          <span class="pp-budget-sep">/</span>
          <span class="pp-budget-total">${limit} this round</span>
        </div>
        <div class="pp-placement-remaining">
          <span class="pp-remaining-label">Remaining to deploy:</span>
          <span class="pp-remaining-value">${actualRemaining} units</span>
        </div>`;

    // Show selected territory (only if still placing)
    if (!showDoneButton) {
      if (isValidPlacement) {
        html += `
          <div class="pp-placement-selected">
            <span class="pp-selected-icon">${isWater ? '🌊' : '🏔'}</span>
            <span class="pp-selected-name">${this.selectedTerritory.name}</span>
          </div>`;
      } else {
        html += `<div class="pp-hint">Click a territory you own to place units</div>`;
      }
    }

    // Unit list with +/- controls (like buy phase)
    html += `<div class="pp-unit-list">`;

    const renderPlacementRow = (unit) => {
      const def = this.unitDefs?.[unit.type];
      const imageSrc = getUnitIconPath(unit.type, player.id);
      const queued = this.placementQueue[unit.type] || 0;
      const available = unit.quantity;
      const canAdd = available > 0 && slotsRemaining > queued && isValidPlacement;
      const canRemove = queued > 0;

      // Build tooltip
      let tooltip = `${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}`;
      if (def) {
        tooltip += `\nAttack: ${def.attack || 0} | Defense: ${def.defense || 0}`;
        tooltip += `\nMovement: ${def.movement || 0}`;
      }

      return `
        <div class="pp-buy-row ${queued > 0 ? 'has-qty' : ''}" title="${tooltip}">
          <div class="pp-buy-info">
            ${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon" alt="${unit.type}">` : ''}
            <span class="pp-buy-name">${unit.type}</span>
            <span class="pp-buy-cost">${available} left</span>
          </div>
          <div class="pp-buy-controls">
            <button class="pp-qty-btn" data-action="place-queue" data-unit="${unit.type}" data-delta="-1" ${!canRemove ? 'disabled' : ''}>−</button>
            <span class="pp-buy-qty">${queued}</span>
            <button class="pp-qty-btn" data-action="place-queue" data-unit="${unit.type}" data-delta="1" ${!canAdd ? 'disabled' : ''}>+</button>
            <button class="pp-qty-btn max-btn" data-action="place-queue-max" data-unit="${unit.type}" ${!canAdd ? 'disabled' : ''}>Max</button>
          </div>
        </div>`;
    };

    // Show units appropriate for selected territory type
    if (isValidPlacement) {
      if (!isWater) {
        // Land territory - show land and air units
        if (landUnits.length > 0) {
          html += `<div class="pp-unit-category-label">Land</div>`;
          html += landUnits.map(renderPlacementRow).join('');
        }
        if (airUnits.length > 0) {
          html += `<div class="pp-unit-category-label">Air</div>`;
          html += airUnits.map(renderPlacementRow).join('');
        }
        if (landUnits.length === 0 && airUnits.length === 0) {
          html += `<div class="pp-placement-done-msg">No land/air units to place</div>`;
        }
      } else {
        // Sea zone - show naval units
        if (navalUnits.length > 0) {
          html += `<div class="pp-unit-category-label">Naval</div>`;
          html += navalUnits.map(renderPlacementRow).join('');
        } else {
          html += `<div class="pp-placement-done-msg">No naval units to place</div>`;
        }
      }
    } else {
      // Show summary of all remaining units when no territory selected
      html += `<div class="pp-unit-category-label">Land (${landUnits.reduce((s, u) => s + u.quantity, 0)})</div>`;
      for (const unit of landUnits) {
        const imageSrc = getUnitIconPath(unit.type, player.id);
        html += `<div class="pp-buy-row disabled"><div class="pp-buy-info">${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon">` : ''}<span class="pp-buy-name">${unit.type}</span><span class="pp-buy-cost">×${unit.quantity}</span></div></div>`;
      }
      if (airUnits.length > 0) {
        html += `<div class="pp-unit-category-label">Air (${airUnits.reduce((s, u) => s + u.quantity, 0)})</div>`;
        for (const unit of airUnits) {
          const imageSrc = getUnitIconPath(unit.type, player.id);
          html += `<div class="pp-buy-row disabled"><div class="pp-buy-info">${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon">` : ''}<span class="pp-buy-name">${unit.type}</span><span class="pp-buy-cost">×${unit.quantity}</span></div></div>`;
        }
      }
      if (navalUnits.length > 0) {
        html += `<div class="pp-unit-category-label">Naval (${navalUnits.reduce((s, u) => s + u.quantity, 0)})</div>`;
        for (const unit of navalUnits) {
          const imageSrc = getUnitIconPath(unit.type, player.id);
          html += `<div class="pp-buy-row disabled"><div class="pp-buy-info">${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon">` : ''}<span class="pp-buy-name">${unit.type}</span><span class="pp-buy-cost">×${unit.quantity}</span></div></div>`;
        }
      }
    }

    html += `</div>`;

    // Action buttons - always at the bottom
    html += `<div class="pp-placement-actions">`;
    if (canUndo) {
      html += `<button class="pp-action-btn secondary small" data-action="undo-placement">↩ Undo</button>`;
    }
    if (totalQueued > 0 && isValidPlacement) {
      html += `<button class="pp-action-btn primary" data-action="confirm-placement">Deploy ${totalQueued} Unit${totalQueued > 1 ? 's' : ''}</button>`;
    }
    // Show prominent "Done - Next Player" at BOTTOM when all units deployed
    if (showDoneButton) {
      html += `
        <div class="pp-placement-complete">
          <div class="pp-complete-message">✓ All ${limit} units deployed!</div>
          <button class="pp-action-btn complete large" data-action="finish-placement">Done - Next Player</button>
        </div>`;
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
    const individualShips = []; // Track transports/carriers with cargo separately
    const cargoUnits = []; // Track cargo units for amphibious assault
    const carrierAircraft = []; // Track aircraft on carriers

    for (const u of units) {
      if (u.owner !== player.id) continue;
      const def = this.unitDefs?.[u.type];
      if (!def || def.movement <= 0 || def.isBuilding) continue;

      // Aircraft on carriers can move independently - check them even if carrier has moved
      // This allows aircraft to fly off during non-combat even if carrier moved during combat
      if (u.id && u.type === 'carrier') {
        const aircraft = u.aircraft || [];
        // Always add carrier aircraft as selectable (they have their own movement)
        if (territory.isWater && aircraft.length > 0) {
          for (const airUnit of aircraft) {
            // Aircraft can move if they haven't moved yet (tracked per aircraft, not per carrier)
            if (airUnit.moved) continue;
            const airKey = `aircraft:${u.id}:${airUnit.type}`;
            const existing = carrierAircraft.find(c => c.cargoKey === airKey);
            if (existing) {
              existing.quantity += airUnit.quantity || 1;
            } else {
              carrierAircraft.push({
                type: airUnit.type,
                quantity: airUnit.quantity || 1,
                carrierId: u.id,
                isCarrierAircraft: true,
                cargoKey: airKey,
                displayName: `${airUnit.type} (on carrier)`
              });
            }
          }
        }
      }

      // Skip units that have already moved (for non-aircraft handling)
      if (u.moved) continue;

      // Individual ships (transports/carriers with cargo) are tracked separately
      if (u.id) {
        const cargo = u.cargo || [];
        const aircraft = u.aircraft || [];
        const allCargo = [...cargo, ...aircraft];
        const cargoDesc = allCargo.length > 0
          ? ` (${allCargo.map(c => c.type).join(', ')})`
          : ' (empty)';
        individualShips.push({
          type: u.type,
          id: u.id,
          quantity: 1,
          cargo: cargo,
          aircraft: aircraft,
          displayName: `${u.type}${cargoDesc}`,
          isIndividual: true
        });

        // Add cargo units as separately selectable for amphibious assault
        if (territory.isWater && u.type === 'transport' && cargo.length > 0) {
          for (const cargoUnit of cargo) {
            const cargoKey = `cargo:${u.id}:${cargoUnit.type}`;
            const existing = cargoUnits.find(c => c.cargoKey === cargoKey);
            if (existing) {
              existing.quantity += cargoUnit.quantity || 1;
            } else {
              cargoUnits.push({
                type: cargoUnit.type,
                quantity: cargoUnit.quantity || 1,
                transportId: u.id,
                isCargo: true,
                cargoKey: cargoKey,
                displayName: `${cargoUnit.type} (on transport)`
              });
            }
          }
        }

        // Skip the duplicate aircraft handling below since we already handled it above
        if (u.type === 'carrier') continue;

        // Add aircraft on carriers as separately selectable (for non-carriers with aircraft, if any)
        if (territory.isWater && aircraft.length > 0) {
          for (const airUnit of aircraft) {
            const airKey = `aircraft:${u.id}:${airUnit.type}`;
            const existing = carrierAircraft.find(c => c.cargoKey === airKey);
            if (existing) {
              existing.quantity += airUnit.quantity || 1;
            } else {
              carrierAircraft.push({
                type: airUnit.type,
                quantity: airUnit.quantity || 1,
                carrierId: u.id,
                isCarrierAircraft: true,
                cargoKey: airKey,
                displayName: `${airUnit.type} (on carrier)`
              });
            }
          }
        }
        continue;
      }

      if (!movable[u.type]) {
        movable[u.type] = { type: u.type, quantity: 0 };
      }
      movable[u.type].quantity += u.quantity || 1;
    }

    // Combine: aggregated units first, then individual ships, then cargo/aircraft
    return [...Object.values(movable), ...individualShips, ...cargoUnits, ...carrierAircraft];
  }

  // Get valid destinations for selected units based on their movement range
  _getValidDestinations(fromTerritory, player, isCombatMove) {
    if (!fromTerritory || !this.territories || !this.gameState) return [];
    const from = this.territories[fromTerritory.name];
    if (!from) return [];

    const destinations = new Map(); // name -> { name, isEnemy, isWater, distance }

    // Get selected units and their movement ranges
    // Handle both regular unit types and individual ships (ship:ID format)
    const selectedUnits = [];
    const selectedShipIds = [];
    const selectedCargoUnits = []; // Track cargo units selected for amphibious assault

    for (const [key, qty] of Object.entries(this.moveSelectedUnits)) {
      if (qty <= 0) continue;
      if (key.startsWith('ship:')) {
        selectedShipIds.push(key.replace('ship:', ''));
      } else if (key.startsWith('cargo:')) {
        // Format: cargo:transportId:unitType
        const parts = key.split(':');
        if (parts.length >= 3) {
          selectedCargoUnits.push({
            transportId: parts[1],
            unitType: parts[2],
            quantity: qty
          });
        }
      } else {
        const def = this.unitDefs?.[key];
        if (def) {
          selectedUnits.push({ type: key, quantity: qty, def });
        }
      }
    }

    // Check if we have transports with cargo selected (for amphibious assault)
    const selectedShipsWithCargo = [];
    if (selectedShipIds.length > 0 && from.isWater) {
      const seaUnits = this.gameState.getUnitsAt(fromTerritory.name) || [];
      for (const shipId of selectedShipIds) {
        const ship = seaUnits.find(u => u.id === shipId);
        if (ship && ship.cargo && ship.cargo.length > 0) {
          selectedShipsWithCargo.push(ship);
        }
      }
    }

    // If no units selected, show adjacent territories as preview
    if (selectedUnits.length === 0 && selectedShipIds.length === 0 && selectedCargoUnits.length === 0) {
      for (const connName of from.connections || []) {
        const conn = this.territories[connName];
        if (!conn) continue;
        // For sea zones, check for enemy units; for land, check ownership
        let isEnemy = false;
        if (conn.isWater) {
          const seaUnits = this.gameState.getUnitsAt(connName) || [];
          isEnemy = seaUnits.some(u => u.owner !== player.id && !this.gameState.areAllies(player.id, u.owner));
        } else {
          const owner = this.gameState.getOwner(connName);
          isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
        }
        if (isCombatMove || !isEnemy) {
          destinations.set(connName, { name: connName, isEnemy, isWater: conn.isWater, distance: 1 });
        }
      }
      return Array.from(destinations.values());
    }

    // Calculate reachable destinations based on unit types
    const landUnits = selectedUnits.filter(u => u.def.isLand);
    const airUnits = selectedUnits.filter(u => u.def.isAir);
    const seaUnits = selectedUnits.filter(u => u.def.isSea);

    // Land units - use land reachability + adjacent sea zones with transports
    if (landUnits.length > 0 && !from.isWater) {
      // Use minimum movement of all land units (they move together)
      const minMovement = Math.min(...landUnits.map(u => u.def.movement || 1));
      const reachable = this.gameState.getReachableTerritoriesForLand(
        fromTerritory.name, minMovement, player.id, isCombatMove
      );
      for (const [terrName, info] of reachable) {
        const conn = this.territories[terrName];
        if (!conn) continue;
        const owner = this.gameState.getOwner(terrName);
        const isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
        destinations.set(terrName, { name: terrName, isEnemy, isWater: false, distance: info.distance });
      }

      // Also add adjacent sea zones with friendly transports (for loading)
      for (const connName of from.connections || []) {
        const conn = this.territories[connName];
        if (!conn?.isWater) continue;
        // Check if there's a friendly transport in this sea zone
        const seaUnits = this.gameState.getUnitsAt(connName) || [];
        const hasTransport = seaUnits.some(u => u.type === 'transport' && u.owner === player.id);
        if (hasTransport) {
          destinations.set(connName, { name: connName, isEnemy: false, isWater: true, distance: 1, isTransportLoad: true });
        }
      }
    }

    // Air units - use air reachability
    if (airUnits.length > 0) {
      // Use minimum movement of all air units
      // Long Range Aircraft tech: +2 movement for fighters and bombers
      const hasLongRange = this.gameState.hasTech(player.id, 'longRangeAircraft');
      const minMovement = Math.min(...airUnits.map(u => {
        const baseMove = u.def.movement || 4;
        return hasLongRange ? baseMove + 2 : baseMove;
      }));
      const reachable = this.gameState.getReachableTerritoriesForAir(
        fromTerritory.name, minMovement, player.id, isCombatMove
      );
      for (const [terrName, info] of reachable) {
        const conn = this.territories[terrName];
        if (!conn) continue;
        // For sea zones, check for enemy units; for land, check ownership
        let isEnemy = false;
        if (conn.isWater) {
          // Sea zone: check for enemy naval units
          const seaUnits = this.gameState.getUnitsAt(terrName) || [];
          isEnemy = seaUnits.some(u => u.owner !== player.id && !this.gameState.areAllies(player.id, u.owner));
        } else {
          const owner = this.gameState.getOwner(terrName);
          isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
        }
        if (!destinations.has(terrName)) {
          destinations.set(terrName, { name: terrName, isEnemy, isWater: conn.isWater, distance: info.distance });
        }
      }
    }

    // Sea units - use sea reachability
    if (seaUnits.length > 0 && from.isWater) {
      // Use minimum movement of all sea units
      const minMovement = Math.min(...seaUnits.map(u => u.def.movement || 2));
      const reachable = this.gameState.getReachableTerritoriesForSea(
        fromTerritory.name, minMovement, player.id, isCombatMove
      );
      for (const [terrName, info] of reachable) {
        const conn = this.territories[terrName];
        if (!conn) continue;
        // Sea zones: check for enemy naval units (sea zones don't have ownership)
        const seaUnits = this.gameState.getUnitsAt(terrName) || [];
        const isEnemy = seaUnits.some(u => u.owner !== player.id && !this.gameState.areAllies(player.id, u.owner));
        if (!destinations.has(terrName)) {
          destinations.set(terrName, { name: terrName, isEnemy, isWater: true, distance: info.distance });
        }
      }
    }

    // Transports with cargo - add adjacent coastal territories for amphibious assault/unloading
    if (selectedShipsWithCargo.length > 0 && from.isWater) {
      for (const connName of from.connections || []) {
        const conn = this.territories[connName];
        if (!conn || conn.isWater) continue; // Only coastal (land) territories
        const owner = this.gameState.getOwner(connName);
        const isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
        // During combat move, can unload to attack enemy; during non-combat, only friendly
        if (isCombatMove || !isEnemy) {
          destinations.set(connName, {
            name: connName,
            isEnemy,
            isWater: false,
            distance: 1,
            isAmphibious: true
          });
        }
      }
    }

    // Cargo units selected directly for amphibious assault - add adjacent coastal territories
    if (selectedCargoUnits.length > 0 && from.isWater) {
      for (const connName of from.connections || []) {
        const conn = this.territories[connName];
        if (!conn || conn.isWater) continue; // Only coastal (land) territories
        const owner = this.gameState.getOwner(connName);
        const isEnemy = owner && owner !== player.id && !this.gameState.areAllies(player.id, owner);
        // During combat move, can unload to attack enemy; during non-combat, only friendly
        if (isCombatMove || !isEnemy) {
          destinations.set(connName, {
            name: connName,
            isEnemy,
            isWater: false,
            distance: 1,
            isAmphibious: true
          });
        }
      }
    }

    // Sort by distance, then by name
    return Array.from(destinations.values())
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
  }

  _renderInlineMovement(player, turnPhase) {
    const isCombatMove = turnPhase === TURN_PHASES.COMBAT_MOVE;
    const movableUnits = this._getMovableUnits(this.selectedTerritory, player);
    const totalSelected = Object.values(this.moveSelectedUnits).reduce((sum, q) => sum + q, 0);
    const destinations = this._getValidDestinations(this.selectedTerritory, player, isCombatMove);

    // Separate units into categories
    const regularUnits = movableUnits.filter(u => !u.isCargo && !u.isCarrierAircraft);
    const cargoUnitsForAssault = movableUnits.filter(u => u.isCargo);
    const carrierAircraftUnits = movableUnits.filter(u => u.isCarrierAircraft);

    // Categorize regular units
    const landUnits = regularUnits.filter(u => {
      const def = this.unitDefs?.[u.type];
      return def?.isLand;
    });
    const navalUnits = regularUnits.filter(u => {
      const def = this.unitDefs?.[u.type];
      return def?.isSea || u.isIndividual; // Individual ships (transports/carriers with cargo)
    });
    // Air units include both standalone air units AND aircraft on carriers
    const airUnits = [
      ...regularUnits.filter(u => {
        const def = this.unitDefs?.[u.type];
        return def?.isAir;
      }),
      ...carrierAircraftUnits
    ];

    // Initialize move tab if not set
    if (!this.moveUnitTab) this.moveUnitTab = 'land';

    // Determine which tabs have units
    const hasLand = landUnits.length > 0;
    const hasNaval = navalUnits.length > 0;
    const hasAir = airUnits.length > 0;
    const hasCargo = cargoUnitsForAssault.length > 0;

    // Auto-select first available tab if current is empty
    if (this.moveUnitTab === 'land' && !hasLand) {
      this.moveUnitTab = hasNaval ? 'naval' : (hasAir ? 'air' : 'cargo');
    }

    let html = `
      <div class="pp-inline-movement">
        <div class="pp-move-from">
          <span class="pp-move-label">From:</span>
          <span class="pp-move-territory">${this.selectedTerritory.name}</span>
        </div>

        <div class="pp-move-category-tabs">
          ${hasLand ? `<button class="pp-move-cat-tab ${this.moveUnitTab === 'land' ? 'active' : ''}" data-action="move-tab" data-tab="land">🏃 Land (${landUnits.length})</button>` : ''}
          ${hasNaval ? `<button class="pp-move-cat-tab ${this.moveUnitTab === 'naval' ? 'active' : ''}" data-action="move-tab" data-tab="naval">⚓ Naval (${navalUnits.length})</button>` : ''}
          ${hasAir ? `<button class="pp-move-cat-tab ${this.moveUnitTab === 'air' ? 'active' : ''}" data-action="move-tab" data-tab="air">✈ Air (${airUnits.length})</button>` : ''}
          ${hasCargo ? `<button class="pp-move-cat-tab ${this.moveUnitTab === 'cargo' ? 'active' : ''}" data-action="move-tab" data-tab="cargo">🚶 Land (${cargoUnitsForAssault.length})</button>` : ''}
        </div>

        <div class="pp-move-units">`;

    // Get units for current tab
    let currentUnits = [];
    if (this.moveUnitTab === 'land') currentUnits = landUnits;
    else if (this.moveUnitTab === 'naval') currentUnits = navalUnits;
    else if (this.moveUnitTab === 'air') currentUnits = airUnits;
    else if (this.moveUnitTab === 'cargo') currentUnits = cargoUnitsForAssault;

    // Show units for selected category
    for (const unit of currentUnits) {
      const unitKey = unit.isCargo ? unit.cargoKey : (unit.isIndividual ? `ship:${unit.id}` : unit.type);
      const selected = this.moveSelectedUnits[unitKey] || 0;
      const imageSrc = getUnitIconPath(unit.type, player.id);
      const displayName = unit.displayName || unit.type;

      // Get unit stats for hover tooltip (not inline display)
      const unitDef = this.unitDefs?.[unit.type];
      let statsTooltip = '';
      if (unitDef) {
        const hasLongRange = unitDef.isAir && this.gameState?.hasTech(player.id, 'longRangeAircraft');
        const hasJets = unit.type === 'fighter' && this.gameState?.hasTech(player.id, 'jets');
        const hasSuperSubs = unit.type === 'submarine' && this.gameState?.hasTech(player.id, 'superSubs');
        const attack = (unitDef.attack || 0) + (hasJets ? 1 : 0) + (hasSuperSubs ? 1 : 0);
        const defense = (unitDef.defense || 0) + (hasJets ? 1 : 0);
        const movement = (unitDef.movement || 1) + (hasLongRange ? 2 : 0);
        const cost = unitDef.cost || 0;
        statsTooltip = `${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}\nAttack: ${attack} | Defense: ${defense}\nMovement: ${movement} | Cost: ${cost} IPCs`;
      }

      const rowClass = unit.isCargo ? 'cargo-unit' : (unit.isIndividual ? 'individual-ship' : '');

      html += `
        <div class="pp-move-unit-row ${rowClass}" title="${statsTooltip}">
          <div class="pp-move-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="pp-move-icon" alt="${unit.type}">` : ''}
            <span class="pp-move-name">${displayName}</span>
            ${!unit.isIndividual ? `<span class="pp-move-avail">(${unit.quantity})</span>` : ''}
          </div>
          <div class="pp-move-controls">
            <button class="pp-qty-btn" data-action="move-unit" data-unit="${unitKey}" data-delta="-1" ${selected <= 0 ? 'disabled' : ''}>−</button>
            <span class="pp-move-qty">${selected}</span>
            <button class="pp-qty-btn" data-action="move-unit" data-unit="${unitKey}" data-delta="1" ${selected >= unit.quantity ? 'disabled' : ''}>+</button>
            <button class="pp-qty-btn max-btn" data-action="move-all" data-unit="${unitKey}" data-qty="${unit.quantity}" ${selected >= unit.quantity ? 'disabled' : ''}>All</button>
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

    // Destination selection - use dropdown
    if (totalSelected > 0) {
      html += `
        <div class="pp-move-destinations">
          <span class="pp-move-label">Move to:</span>
          <select class="pp-dest-dropdown" data-action="select-dest-dropdown">
            <option value="">-- Select destination or click map --</option>`;

      for (const dest of destinations) {
        const isSelected = this.movePendingDest === dest.name;
        const distLabel = dest.distance > 1 ? ` (${dest.distance} spaces)` : '';
        html += `<option value="${dest.name}" ${isSelected ? 'selected' : ''}>${dest.name}${dest.isEnemy ? ' ⚔ Attack' : ''}${distLabel}</option>`;
      }

      html += `</select>
        </div>`;

      // Show selected destination and confirm button
      if (this.movePendingDest) {
        const destInfo = destinations.find(d => d.name === this.movePendingDest);
        const isAttack = destInfo?.isEnemy;

        // Check for air unit landing warning during combat move
        let airLandingWarning = '';
        if (isCombatMove && isAttack) {
          // Check if any selected air units would have no landing options
          const selectedAirUnits = [];
          for (const [unitKey, qty] of Object.entries(this.moveSelectedUnits)) {
            if (qty <= 0) continue;
            const unit = regularUnits.find(u => (u.isIndividual ? `ship:${u.id}` : u.type) === unitKey);
            if (unit && this.unitDefs[unit.type]?.isAir) {
              selectedAirUnits.push(unit);
            }
          }

          if (selectedAirUnits.length > 0 && this.gameState) {
            // Calculate distance to destination
            const distanceToTarget = destInfo?.distance || 1;
            const hasLongRange = this.gameState.hasTech(player.id, 'longRangeAircraft');

            for (const airUnit of selectedAirUnits) {
              const unitDef = this.unitDefs[airUnit.type];
              if (!unitDef) continue;

              // Calculate remaining movement after reaching destination
              const baseMovement = unitDef.movement || 4;
              const totalMovement = hasLongRange ? baseMovement + 2 : baseMovement;
              const remainingMovement = totalMovement - distanceToTarget;

              if (remainingMovement <= 0) {
                // No movement left - can only stay if destination was friendly at turn start
                const friendlyAtStart = this.gameState.friendlyTerritoriesAtTurnStart || new Set();
                if (!friendlyAtStart.has(this.movePendingDest)) {
                  airLandingWarning = `⚠️ Warning: ${airUnit.type} at max range - no valid landing, will crash!`;
                  break;
                }
              } else {
                // Check if there are any friendly territories within remaining movement
                const reachable = this.gameState.getReachableTerritoriesForAir(
                  this.movePendingDest, remainingMovement, player.id, false
                );
                const friendlyAtStart = this.gameState.friendlyTerritoriesAtTurnStart || new Set();
                let hasValidLanding = false;

                for (const [terrName] of reachable) {
                  if (friendlyAtStart.has(terrName)) {
                    hasValidLanding = true;
                    break;
                  }
                }

                if (!hasValidLanding) {
                  airLandingWarning = `⚠️ Warning: ${airUnit.type} may not have valid landing options!`;
                  break;
                }
              }
            }
          }
        }

        html += `
          <div class="pp-move-confirm-area">
            <div class="pp-move-dest-info ${isAttack ? 'attack' : ''}">
              ${isAttack ? '⚔ Attack: ' : 'Moving to: '}${this.movePendingDest}
            </div>
            ${airLandingWarning ? `<div class="pp-air-warning">${airLandingWarning}</div>` : ''}
            <button class="pp-action-btn primary" data-action="confirm-move">
              ${isAttack ? 'Confirm Attack' : 'Confirm Move'}
            </button>
          </div>`;
      } else {
        html += `<div class="pp-hint">Select destination above or click on the map</div>`;
      }
    }

    // Cancel button
    html += `
      <button class="pp-move-btn cancel" data-action="cancel-move">Cancel</button>
    </div>`;

    return html;
  }

  // Inline Air Landing UI - styled like buy/movement UI
  _renderInlineAirLanding(player) {
    const { airUnitsToLand, combatTerritory, isRetreating } = this.airLandingData;
    const currentUnit = airUnitsToLand[this.airLandingIndex];

    // Check if all units have landing selections
    const allSelected = airUnitsToLand.every((u, idx) => {
      const unitKey = u.id || `${u.type}_${idx}`;
      return u.landingOptions?.length === 0 || this.airLandingSelections[unitKey];
    });

    // Count selected vs total
    const totalUnits = airUnitsToLand.length;
    const selectedCount = Object.keys(this.airLandingSelections).length;
    const crashedCount = airUnitsToLand.filter(u => !u.landingOptions || u.landingOptions.length === 0).length;

    let html = `
      <div class="pp-inline-air-landing">
        <div class="pp-air-landing-header" style="border-left: 4px solid ${player.color}">
          <span class="pp-air-landing-icon">✈️</span>
          <span class="pp-air-landing-title">${isRetreating ? 'Retreat - ' : ''}Air Unit Landing</span>
          <span class="pp-air-landing-counter">${selectedCount}/${totalUnits - crashedCount}</span>
        </div>
        <div class="pp-air-landing-from">From: <strong>${combatTerritory}</strong></div>
        <div class="pp-air-landing-hint">Click unit to select, then click map to assign landing</div>

        <div class="pp-air-landing-grid">`;

    // Show all air units as cards (similar to buy UI)
    for (let i = 0; i < airUnitsToLand.length; i++) {
      const unit = airUnitsToLand[i];
      const unitKey = unit.id || `${unit.type}_${i}`;
      const selectedLanding = this.airLandingSelections[unitKey];
      const isCurrent = i === this.airLandingIndex && !selectedLanding;
      const hasNoOptions = !unit.landingOptions || unit.landingOptions.length === 0;
      const imageSrc = getUnitIconPath(unit.type, player.id);
      const def = this.unitDefs?.[unit.type];

      html += `
        <div class="pp-air-landing-card ${isCurrent ? 'current' : ''} ${selectedLanding ? 'landed' : ''} ${hasNoOptions ? 'crashed' : ''}"
             data-action="select-air-unit" data-index="${i}">
          <div class="pp-air-card-icon">
            ${imageSrc ? `<img src="${imageSrc}" alt="${unit.type}">` : ''}
          </div>
          <div class="pp-air-card-name">${unit.type}</div>
          <div class="pp-air-card-stats">M${def?.movement || 0}</div>
          <div class="pp-air-card-status">
            ${hasNoOptions
              ? '<span class="status-crashed">CRASH</span>'
              : selectedLanding
                ? `<span class="status-landed">${selectedLanding}</span>`
                : isCurrent
                  ? '<span class="status-selecting">SELECT</span>'
                  : '<span class="status-pending">...</span>'}
          </div>
        </div>`;
    }

    html += `</div>`;

    // Current unit landing options (dropdown as backup)
    if (currentUnit && currentUnit.landingOptions?.length > 0 && !this.airLandingSelections[currentUnit.id || `${currentUnit.type}_${this.airLandingIndex}`]) {
      html += `
        <div class="pp-air-landing-dest">
          <span class="pp-air-landing-label">Land at:</span>
          <select class="pp-air-landing-dropdown" data-action="select-air-landing">
            <option value="">-- Click map or select --</option>
            ${currentUnit.landingOptions.map(opt => `
              <option value="${opt.territory}">${opt.territory} (${opt.distance} moves)</option>
            `).join('')}
          </select>
        </div>`;
    }

    // Check if any selections have been made (for undo button)
    const hasSelections = Object.keys(this.airLandingSelections).length > 0;

    // Action buttons
    html += `
      <div class="pp-air-landing-actions">
        ${hasSelections ? `
          <button class="pp-action-btn secondary" data-action="undo-air-landing">
            ↩ Undo Selections
          </button>
        ` : ''}
        <button class="pp-action-btn primary ${allSelected ? '' : 'disabled'}"
                data-action="confirm-air-landing" ${allSelected ? '' : 'disabled'}>
          Confirm All Landings
        </button>
      </div>
    </div>`;

    return html;
  }

  // Inline Mobilize UI - place purchased units (like buy phase with +/- controls)
  _renderInlineMobilize(player) {
    const pending = this.gameState.getPendingPurchases?.() || [];
    const totalPending = pending.reduce((sum, p) => sum + p.quantity, 0);

    // Get valid placement locations
    const factoriesAtStart = this.gameState.factoriesAtTurnStart || new Set();
    const currentFactories = this._getFactoryTerritories(player.id);
    const validFactories = factoriesAtStart.size > 0
      ? Array.from(factoriesAtStart)
      : currentFactories;
    const validSeaZones = this._getValidNavalPlacementZones(player.id);

    // Categorize pending units
    const landUnits = pending.filter(p => {
      const def = this.unitDefs?.[p.type];
      return def && (def.isLand || def.isAir) && p.quantity > 0;
    });
    const navalUnits = pending.filter(p => {
      const def = this.unitDefs?.[p.type];
      return def?.isSea && p.quantity > 0;
    });
    const buildingUnits = pending.filter(p => {
      const def = this.unitDefs?.[p.type];
      return def?.isBuilding && p.quantity > 0;
    });

    let html = `<div class="pp-inline-mobilize">`;

    if (totalPending === 0) {
      html += `
        <div class="pp-mobilize-done">
          <div class="pp-mobilize-msg">✓ All units deployed!</div>
        </div>
      </div>`;
      return html;
    }

    // Check if a valid territory is selected
    const isValidPlacement = this._isValidMobilizeLocation(this.selectedTerritory, player);
    const isWater = this.selectedTerritory?.isWater;
    const isFactoryTerritory = !isWater && this.selectedTerritory && validFactories.includes(this.selectedTerritory.name);
    const isOwnedLand = !isWater && this.selectedTerritory && this.gameState.getOwner(this.selectedTerritory.name) === player.id;

    // Show selected territory or hint to select
    if (isValidPlacement && this.selectedTerritory) {
      html += `
        <div class="pp-mobilize-selected">
          <span class="pp-mob-sel-label">Deploying to:</span>
          <span class="pp-mob-sel-name">${this.selectedTerritory.name}</span>
        </div>`;
    } else {
      html += `<div class="pp-hint">Click a factory territory on the map to deploy units</div>`;
    }

    // Get units that can be placed at the current location
    let placeableUnits = [];
    if (isValidPlacement && this.selectedTerritory) {
      if (isWater) {
        placeableUnits = navalUnits;
      } else if (isOwnedLand && !isFactoryTerritory) {
        placeableUnits = buildingUnits;
      } else if (isFactoryTerritory) {
        placeableUnits = landUnits;
      }
    }

    // Show unit list with +/- controls (like buy phase)
    html += `<div class="pp-unit-list">`;

    // Land units section
    if (landUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Land/Air</div>`;
      for (const unit of landUnits) {
        const imageSrc = getUnitIconPath(unit.type, player.id);
        const canPlace = isFactoryTerritory && isValidPlacement;
        html += `
          <div class="pp-buy-row ${canPlace ? 'can-place' : ''}">
            <div class="pp-buy-info">
              ${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon" alt="${unit.type}">` : ''}
              <span class="pp-buy-name">${unit.type}</span>
              <span class="pp-buy-qty-label">×${unit.quantity}</span>
            </div>
            <div class="pp-buy-controls">
              <button class="pp-qty-btn" data-action="mobilize-unit" data-unit="${unit.type}" ${!canPlace ? 'disabled' : ''}>+</button>
              <button class="pp-qty-btn max-btn" data-action="mobilize-all" data-unit="${unit.type}" ${!canPlace ? 'disabled' : ''}>All</button>
            </div>
          </div>`;
      }
    }

    // Naval units section
    if (navalUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Naval</div>`;
      for (const unit of navalUnits) {
        const imageSrc = getUnitIconPath(unit.type, player.id);
        const canPlace = isWater && isValidPlacement;
        html += `
          <div class="pp-buy-row ${canPlace ? 'can-place' : ''}">
            <div class="pp-buy-info">
              ${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon" alt="${unit.type}">` : ''}
              <span class="pp-buy-name">${unit.type}</span>
              <span class="pp-buy-qty-label">×${unit.quantity}</span>
            </div>
            <div class="pp-buy-controls">
              <button class="pp-qty-btn" data-action="mobilize-unit" data-unit="${unit.type}" ${!canPlace ? 'disabled' : ''}>+</button>
              <button class="pp-qty-btn max-btn" data-action="mobilize-all" data-unit="${unit.type}" ${!canPlace ? 'disabled' : ''}>All</button>
            </div>
          </div>`;
      }
    }

    // Building units section
    if (buildingUnits.length > 0) {
      html += `<div class="pp-unit-category-label">Buildings</div>`;
      for (const unit of buildingUnits) {
        const imageSrc = getUnitIconPath(unit.type, player.id);
        const canPlace = isOwnedLand && !isFactoryTerritory && isValidPlacement;
        html += `
          <div class="pp-buy-row ${canPlace ? 'can-place' : ''}">
            <div class="pp-buy-info">
              ${imageSrc ? `<img src="${imageSrc}" class="pp-buy-icon" alt="${unit.type}">` : ''}
              <span class="pp-buy-name">${unit.type}</span>
              <span class="pp-buy-qty-label">×${unit.quantity}</span>
            </div>
            <div class="pp-buy-controls">
              <button class="pp-qty-btn" data-action="mobilize-unit" data-unit="${unit.type}" ${!canPlace ? 'disabled' : ''}>+</button>
              <button class="pp-qty-btn max-btn" data-action="mobilize-all" data-unit="${unit.type}" ${!canPlace ? 'disabled' : ''}>All</button>
            </div>
          </div>`;
      }
    }

    html += `</div>`;

    // Remaining units indicator
    html += `<div class="pp-mobilize-remaining">${totalPending} unit${totalPending !== 1 ? 's' : ''} remaining</div>`;

    // Undo button (if there are any placements to undo)
    const canUndo = this.gameState.mobilizationHistory && this.gameState.mobilizationHistory.length > 0;
    if (canUndo) {
      html += `
        <div class="pp-mobilize-undo">
          <button class="pp-undo-btn" data-action="undo-mobilize">
            <span class="undo-icon">↩</span>
            <span class="undo-text">Undo Last</span>
          </button>
        </div>`;
    }

    // Territory type hint
    if (this.selectedTerritory && !isValidPlacement) {
      html += `<div class="pp-hint">Click a territory above or on the map to place units</div>`;
    }

    html += `</div>`;
    return html;
  }

  // Get valid sea zones for naval placement (adjacent to factory territories)
  _getValidNavalPlacementZones(playerId) {
    const validZones = [];
    const factoryTerritories = this._getFactoryTerritories(playerId);

    for (const terrName of factoryTerritories) {
      const t = this.territories?.[terrName];
      if (!t) continue;

      for (const conn of t.connections || []) {
        const ct = this.territories?.[conn];
        if (ct?.isWater && !validZones.includes(conn)) {
          validZones.push(conn);
        }
      }
    }

    return validZones;
  }

  // Check if territory is valid for mobilization placement
  _isValidMobilizeLocation(territory, player) {
    if (!territory || !player) return false;

    const pending = this.gameState.getPendingPurchases?.() || [];
    if (pending.length === 0) return false;

    // Sea zones: valid if adjacent to factory and we have naval units
    if (territory.isWater) {
      const navalUnits = pending.filter(p => {
        const def = this.unitDefs?.[p.type];
        return def?.isSea && p.quantity > 0;
      });
      if (navalUnits.length === 0) return false;

      const validSeaZones = this._getValidNavalPlacementZones(player.id);
      return validSeaZones.includes(territory.name);
    }

    // Land territories: check if owned by player
    const owner = this.gameState.getOwner(territory.name);
    if (owner !== player.id) return false;

    // Check if it's a factory territory (for land/air units)
    const factoriesAtStart = this.gameState.factoriesAtTurnStart || new Set();
    const currentFactories = this._getFactoryTerritories(player.id);
    const validFactories = factoriesAtStart.size > 0
      ? Array.from(factoriesAtStart)
      : currentFactories;

    if (validFactories.includes(territory.name)) {
      return true; // Can place land/air units
    }

    // Non-factory territory: can only place factories (buildings)
    const buildingUnits = pending.filter(p => {
      const def = this.unitDefs?.[p.type];
      return def?.isBuilding && p.quantity > 0;
    });
    if (buildingUnits.length > 0) {
      // Check if territory doesn't already have a factory
      const units = this.gameState.getUnitsAt(territory.name);
      const hasFactory = units.some(u => u.type === 'factory');
      return !hasFactory;
    }

    return false;
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

        // Handle trade-risk-cards action (trade cards for IPCs during purchase phase)
        if (action === 'trade-risk-cards') {
          if (this.onAction) {
            this.onAction('trade-risk-cards', {});
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

        // Handle place-unit action (legacy - single unit placement)
        if (action === 'place-unit') {
          const unitType = btn.dataset.unit;
          if (this.onAction && unitType && this.selectedTerritory) {
            this.onAction('place-unit', { unitType, territory: this.selectedTerritory.name });
          }
          return;
        }

        // Handle placement queue +/- delta
        if (action === 'place-queue') {
          const unitType = btn.dataset.unit;
          const delta = parseInt(btn.dataset.delta, 10);
          if (!this.placementQueue) this.placementQueue = {};
          const current = this.placementQueue[unitType] || 0;
          const unitsToPlace = this.gameState.getUnitsToPlace?.(this.gameState.currentPlayer?.id) || [];
          const available = unitsToPlace.find(u => u.type === unitType)?.quantity || 0;
          const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
          const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
          const slotsRemaining = limit - placedThisRound;
          const totalQueued = Object.values(this.placementQueue).reduce((sum, q) => sum + q, 0);
          const maxCanQueue = Math.min(available, slotsRemaining - totalQueued + current);
          const newQty = Math.max(0, Math.min(maxCanQueue, current + delta));
          this.placementQueue[unitType] = newQty;
          this._render();
          return;
        }

        // Handle placement queue max
        if (action === 'place-queue-max') {
          const unitType = btn.dataset.unit;
          if (!this.placementQueue) this.placementQueue = {};
          const unitsToPlace = this.gameState.getUnitsToPlace?.(this.gameState.currentPlayer?.id) || [];
          const available = unitsToPlace.find(u => u.type === unitType)?.quantity || 0;
          const limit = this.gameState.getUnitsPerRoundLimit?.() || 6;
          const placedThisRound = this.gameState.unitsPlacedThisRound || 0;
          const slotsRemaining = limit - placedThisRound;
          const totalQueued = Object.values(this.placementQueue).reduce((sum, q) => sum + q, 0);
          const currentQueued = this.placementQueue[unitType] || 0;
          const maxCanQueue = Math.min(available, slotsRemaining - totalQueued + currentQueued);
          this.placementQueue[unitType] = maxCanQueue;
          this._render();
          return;
        }

        // Handle confirm placement (deploy all queued units)
        if (action === 'confirm-placement') {
          if (this.onAction && this.selectedTerritory && this.placementQueue) {
            const territory = this.selectedTerritory.name;
            for (const [unitType, qty] of Object.entries(this.placementQueue)) {
              if (qty > 0) {
                for (let i = 0; i < qty; i++) {
                  this.onAction('place-unit', { unitType, territory });
                }
              }
            }
            this.placementQueue = {}; // Clear queue after placement
            // Force re-render to show Done button immediately
            this._render();
          }
          return;
        }

        // Handle tech dice +/- delta
        if (action === 'tech-dice-delta') {
          const delta = parseInt(btn.dataset.delta, 10);
          const ipcs = this.gameState.getIPCs(this.gameState.currentPlayer.id);
          const maxDice = Math.floor(ipcs / 5);
          this.techDiceCount = Math.max(0, Math.min(maxDice, this.techDiceCount + delta));
          this._render();
          return;
        }

        // Handle tech dice max
        if (action === 'tech-dice-max') {
          const ipcs = this.gameState.getIPCs(this.gameState.currentPlayer.id);
          this.techDiceCount = Math.floor(ipcs / 5);
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

        // Handle rocket launch
        if (action === 'launch-rocket') {
          const from = btn.dataset.from;
          const target = btn.dataset.target;
          if (this.onAction && from && target) {
            this.onAction('launch-rocket', { from, target });
          }
          return;
        }

        // Handle confirm purchase
        if (action === 'confirm-purchase') {
          if (this.onAction) {
            this.onAction('next-phase', {});
          }
          return;
        }

        // Handle movement unit selection (+/-)
        if (action === 'move-unit') {
          const unitKey = btn.dataset.unit; // Can be "infantry", "ship:12345", or "cargo:12345:infantry"
          const delta = parseInt(btn.dataset.delta, 10);
          const current = this.moveSelectedUnits[unitKey] || 0;
          const movable = this._getMovableUnits(this.selectedTerritory, this.gameState.currentPlayer);
          // Find max qty - match by key (type for regular, "ship:id" for individual, "cargoKey" for cargo)
          const unitEntry = movable.find(u => {
            if (u.isCargo) {
              return u.cargoKey === unitKey;
            } else if (u.isIndividual) {
              return `ship:${u.id}` === unitKey;
            } else {
              return u.type === unitKey;
            }
          });
          const maxQty = unitEntry?.quantity || 0;
          const newQty = Math.max(0, Math.min(maxQty, current + delta));
          this.moveSelectedUnits[unitKey] = newQty;
          this._render();
          return;
        }

        // Handle move-all for a unit type
        if (action === 'move-all') {
          const unitKey = btn.dataset.unit;
          const qty = parseInt(btn.dataset.qty, 10);
          this.moveSelectedUnits[unitKey] = qty;
          this._render();
          return;
        }

        // Handle move category tab switch
        if (action === 'move-tab') {
          const tab = btn.dataset.tab;
          if (tab) {
            this.moveUnitTab = tab;
            this._render();
          }
          return;
        }

        // Handle select-all units for movement (only for current tab)
        if (action === 'move-select-all') {
          const movable = this._getMovableUnits(this.selectedTerritory, this.gameState.currentPlayer);
          const regularUnits = movable.filter(u => !u.isCargo);
          const cargoUnits = movable.filter(u => u.isCargo);

          // Filter to only current tab's units
          let unitsToSelect = [];
          if (this.moveUnitTab === 'land') {
            unitsToSelect = regularUnits.filter(u => this.unitDefs?.[u.type]?.isLand);
          } else if (this.moveUnitTab === 'naval') {
            unitsToSelect = regularUnits.filter(u => this.unitDefs?.[u.type]?.isSea || u.isIndividual);
          } else if (this.moveUnitTab === 'air') {
            unitsToSelect = regularUnits.filter(u => this.unitDefs?.[u.type]?.isAir);
          } else if (this.moveUnitTab === 'cargo') {
            unitsToSelect = cargoUnits;
          }

          for (const unit of unitsToSelect) {
            let unitKey;
            if (unit.isCargo) {
              unitKey = unit.cargoKey;
            } else if (unit.isIndividual) {
              unitKey = `ship:${unit.id}`;
            } else {
              unitKey = unit.type;
            }
            this.moveSelectedUnits[unitKey] = unit.quantity;
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
            const units = [];
            const shipIds = [];
            const cargoUnloads = []; // Track cargo units to unload for amphibious assault

            // Separate regular units from individual ships and cargo units
            for (const [key, qty] of Object.entries(this.moveSelectedUnits)) {
              if (qty <= 0) continue;

              if (key.startsWith('ship:')) {
                // Individual ship with cargo - extract ID
                const shipId = key.replace('ship:', '');
                shipIds.push(shipId);
              } else if (key.startsWith('cargo:')) {
                // Cargo unit for amphibious assault - format: cargo:transportId:unitType
                const parts = key.split(':');
                if (parts.length >= 3) {
                  cargoUnloads.push({
                    transportId: parts[1],
                    unitType: parts[2],
                    quantity: qty
                  });
                }
              } else {
                // Regular unit type
                units.push({ type: key, quantity: qty });
              }
            }

            if (units.length > 0 || shipIds.length > 0 || cargoUnloads.length > 0) {
              // Check if this is an amphibious unload (from sea zone to land)
              const fromTerritory = this.territories?.[this.selectedTerritory.name];
              const toTerritory = this.territories?.[this.movePendingDest];
              const isAmphibiousUnload = fromTerritory?.isWater && !toTerritory?.isWater &&
                (shipIds.length > 0 || cargoUnloads.length > 0);

              this.onAction('execute-move', {
                from: this.selectedTerritory.name,
                to: this.movePendingDest,
                units,
                shipIds,
                cargoUnloads,
                isAmphibiousUnload
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

        // Handle mobilize location selection
        if (action === 'select-mob-location') {
          const terrName = btn.dataset.territory;
          if (terrName && this.territories) {
            const terr = this.territories[terrName];
            if (terr) {
              this.selectedTerritory = terr;
              this._render();
            }
          }
          return;
        }

        // Handle air landing unit selection
        if (action === 'select-air-unit') {
          const index = parseInt(btn.dataset.index, 10);
          if (!isNaN(index) && this.isAirLandingActive()) {
            this.airLandingIndex = index;
            this._render();
          }
          return;
        }

        // Handle confirm air landing
        if (action === 'confirm-air-landing') {
          if (this.isAirLandingActive() && this.onAirLandingComplete) {
            // Build the landings map
            const landings = {};
            const crashes = [];
            this.airLandingData.airUnitsToLand.forEach((unit, idx) => {
              const unitKey = unit.id || `${unit.type}_${idx}`;
              const dest = this.airLandingSelections[unitKey];
              if (dest) {
                landings[unitKey] = dest;
              } else if (!unit.landingOptions || unit.landingOptions.length === 0) {
                // Unit will crash
                crashes.push({ id: unit.id, type: unit.type, quantity: unit.quantity });
              }
            });
            // Pass result in expected format for combatUI.handleAirLandingComplete
            this.onAirLandingComplete({
              landings,
              crashes,
              isRetreating: this.airLandingData.isRetreating,
              airUnitsToLand: this.airLandingData.airUnitsToLand,
            });
            this.clearAirLanding();
          }
          return;
        }

        // Handle undo air landing selections
        if (action === 'undo-air-landing') {
          if (this.isAirLandingActive()) {
            this.airLandingSelections = {};
            this.airLandingIndex = 0;
            this._render();
          }
          return;
        }

        // Handle mobilize unit
        if (action === 'mobilize-unit') {
          const unitType = btn.dataset.unit;
          if (this.onAction && unitType && this.selectedTerritory) {
            this.onAction('mobilize-unit', { unitType, territory: this.selectedTerritory.name });
          }
          return;
        }

        // Handle mobilize all of a unit type
        if (action === 'mobilize-all') {
          const unitType = btn.dataset.unit;
          if (this.onAction && unitType && this.selectedTerritory) {
            this.onAction('mobilize-all', { unitType, territory: this.selectedTerritory.name });
          }
          return;
        }

        // Handle undo mobilize
        if (action === 'undo-mobilize') {
          if (this.onAction) {
            this.onAction('undo-mobilize', {});
          }
          return;
        }

        if (this.onAction) {
          const unitType = btn.dataset.type;
          this.onAction(action, { territory, unitType });
        }
      });
    });

    // Dropdown for destination selection
    const destDropdown = this.contentEl.querySelector('.pp-dest-dropdown');
    if (destDropdown) {
      destDropdown.addEventListener('change', (e) => {
        this.movePendingDest = e.target.value || null;
        this._render();
      });
    }

    // Air landing dropdown
    const airLandingDropdown = this.contentEl.querySelector('.pp-air-landing-dropdown');
    if (airLandingDropdown) {
      airLandingDropdown.addEventListener('change', (e) => {
        if (e.target.value && this.isAirLandingActive()) {
          const currentUnit = this.airLandingData.airUnitsToLand[this.airLandingIndex];
          if (currentUnit) {
            const unitKey = currentUnit.id || `${currentUnit.type}_${this.airLandingIndex}`;
            this.airLandingSelections[unitKey] = e.target.value;
            // Move to next unit
            if (this.airLandingIndex < this.airLandingData.airUnitsToLand.length - 1) {
              this.airLandingIndex++;
            }
            this._render();
          }
        }
      });
    }

    // Scroll log to bottom
    const logTab = this.contentEl.querySelector('.pp-log-entries');
    if (logTab) {
      logTab.scrollTop = logTab.scrollHeight;
    }

    // Log entry hover handlers for territory/movement highlighting
    this.contentEl.querySelectorAll('.pp-log-entry').forEach(entry => {
      const territories = entry.dataset.territories?.split(',').filter(Boolean) || [];
      const from = entry.dataset.from;
      const to = entry.dataset.to;
      const isCombat = entry.dataset.combat === 'true';

      if (territories.length > 0 || (from && to)) {
        entry.classList.add('hoverable');

        entry.addEventListener('mouseenter', () => {
          // Highlight territories
          if (territories.length > 0 && this.actionLog?.onHighlightTerritory) {
            this.actionLog.onHighlightTerritory(territories, true);
          }
          // Show movement arrow if we have from/to
          if (from && to && this.actionLog?.onHighlightMovement) {
            this.actionLog.onHighlightMovement(from, to, true, isCombat);
          }
        });

        entry.addEventListener('mouseleave', () => {
          // Clear highlights
          if (this.actionLog?.onHighlightTerritory) {
            this.actionLog.onHighlightTerritory(null, false);
          }
          if (this.actionLog?.onHighlightMovement) {
            this.actionLog.onHighlightMovement(null, null, false, false);
          }
        });
      }
    });
  }

  // Called when map is clicked during movement - allows selecting destination from map
  handleMapDestinationClick(territory) {
    if (!this.selectedTerritory || !this.gameState) return false;

    const player = this.gameState.currentPlayer;
    const turnPhase = this.gameState.turnPhase;
    const isCombatMove = turnPhase === TURN_PHASES.COMBAT_MOVE;
    const isNonCombatMove = turnPhase === TURN_PHASES.NON_COMBAT_MOVE;

    if (!isCombatMove && !isNonCombatMove) return false;

    // Check if we have units selected
    const totalSelected = Object.values(this.moveSelectedUnits).reduce((sum, q) => sum + q, 0);
    if (totalSelected === 0) return false;

    // Check if clicked territory is a valid destination
    const destinations = this._getValidDestinations(this.selectedTerritory, player, isCombatMove);
    const isValidDest = destinations.some(d => d.name === territory.name);

    if (isValidDest) {
      this.movePendingDest = territory.name;
      this._render();
      return true;
    }

    return false;
  }
}
