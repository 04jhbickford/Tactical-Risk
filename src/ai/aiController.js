// AI Controller - manages AI players and triggers their turns
// Handles ALL game phases autonomously for AI players

import { AIPlayer } from './aiPlayer.js';
import { GAME_PHASES, TURN_PHASES } from '../state/gameState.js';

export class AIController {
  constructor() {
    this.gameState = null;
    this.aiPlayers = {}; // playerId -> AIPlayer instance
    this.isProcessing = false;
    this.onAction = null; // Callback when AI takes action
    this.unitDefs = null;
    this.skipMode = false; // Fast-forward AI moves
    this.onStatusUpdate = null; // Callback for AI status messages
    this._checkTimeout = null; // For debouncing AI checks
    this._unsubscribe = null; // Game state subscription
    this.actionLog = null; // Action log for logging AI moves
  }

  // Allow user to skip/fast-forward AI moves
  setSkipMode(skip) {
    this.skipMode = skip;
  }

  toggleSkipMode() {
    this.skipMode = !this.skipMode;
    return this.skipMode;
  }

  setOnStatusUpdate(callback) {
    this.onStatusUpdate = callback;
  }

  setActionLog(actionLog) {
    this.actionLog = actionLog;
  }

  _updateStatus(message) {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(message);
    }
    console.log('[AI]', message);
  }

  _logAction(type, data, player) {
    if (this.actionLog && player) {
      this.actionLog.log(type, { ...data, color: player.color });
    }
  }

  setGameState(gameState) {
    // Unsubscribe from old game state
    if (this._unsubscribe) {
      this._unsubscribe();
    }

    this.gameState = gameState;
    this._initAIPlayers();

    // Subscribe to game state changes to auto-trigger AI
    if (gameState) {
      this._unsubscribe = gameState.subscribe(() => {
        this._scheduleAICheck();
      });
    }
  }

  // Schedule an AI check with debouncing
  _scheduleAICheck() {
    if (this._checkTimeout) {
      clearTimeout(this._checkTimeout);
    }
    this._checkTimeout = setTimeout(() => {
      this._checkTimeout = null;
      this.checkAndProcessAI();
    }, 100);
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
    // Also pass to game state for AI calculations
    if (this.gameState) {
      this.gameState.unitDefs = unitDefs;
    }
    // Update AI players
    for (const aiPlayer of Object.values(this.aiPlayers)) {
      aiPlayer.unitDefs = unitDefs;
    }
  }

  setOnAction(callback) {
    this.onAction = callback;
  }

  _initAIPlayers() {
    this.aiPlayers = {};
    if (!this.gameState?.players) return;

    for (const player of this.gameState.players) {
      if (player.isAI) {
        console.log('[AI] Initializing AI player:', player.id, 'difficulty:', player.aiDifficulty);
        const aiPlayer = new AIPlayer(
          this.gameState,
          player.id,
          player.aiDifficulty || 'medium'
        );
        aiPlayer.unitDefs = this.unitDefs;
        this.aiPlayers[player.id] = aiPlayer;
      }
    }

    // Trigger initial check after a short delay
    setTimeout(() => this._scheduleAICheck(), 500);
  }

  // Check if current player is AI and process their turn
  async checkAndProcessAI() {
    if (this.isProcessing) return false;
    if (!this.gameState) return false;

    // Don't process during lobby phase
    if (this.gameState.phase === GAME_PHASES.LOBBY) return false;

    const currentPlayer = this.gameState.currentPlayer;
    if (!currentPlayer?.isAI) return false;

    const aiPlayer = this.aiPlayers[currentPlayer.id];
    if (!aiPlayer) {
      // AI player not initialized, try to create it
      console.log('[AI] Creating AIPlayer for', currentPlayer.id);
      const newAI = new AIPlayer(
        this.gameState,
        currentPlayer.id,
        currentPlayer.aiDifficulty || 'medium'
      );
      newAI.unitDefs = this.unitDefs;
      this.aiPlayers[currentPlayer.id] = newAI;
    }

    this.isProcessing = true;
    this._updateStatus(`${currentPlayer.name} is thinking...`);

    try {
      await this._processAITurn(this.aiPlayers[currentPlayer.id], currentPlayer);
    } catch (err) {
      console.error('[AI] Error during AI turn:', err);
    }

    this.isProcessing = false;

    // Schedule another check in case we need to continue
    this._scheduleAICheck();

    return true;
  }

  async _processAITurn(aiPlayer, player) {
    const phase = this.gameState.phase;
    const turnPhase = this.gameState.turnPhase;

    // Handle different game phases
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) {
      await this._handleCapitalPlacement(aiPlayer, player);
    } else if (phase === GAME_PHASES.UNIT_PLACEMENT) {
      await this._handleInitialPlacement(aiPlayer, player);
    } else if (phase === GAME_PHASES.PLAYING) {
      await this._handlePlayingPhase(aiPlayer, player, turnPhase);
    }
  }

  // ============================================
  // CAPITAL PLACEMENT
  // ============================================
  async _handleCapitalPlacement(aiPlayer, player) {
    this._updateStatus(`${player.name} is choosing capital location...`);
    await this._delay(this._getActionDelay());

    // Get owned territories
    const owned = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === player.id)
      .map(t => t.name);

    if (owned.length === 0) return;

    // Choose based on difficulty
    let choice;
    if (aiPlayer.difficulty === 'hard') {
      // Pick territory with most connections (strategic)
      choice = owned.reduce((best, t) => {
        const connections = this.gameState.getConnections(t).length;
        const bestConnections = this.gameState.getConnections(best).length;
        return connections > bestConnections ? t : best;
      });
    } else if (aiPlayer.difficulty === 'easy') {
      // Random choice
      choice = owned[Math.floor(Math.random() * owned.length)];
    } else {
      // Medium: pick territory with most friendly neighbors
      choice = this._findCentralTerritory(owned, player.id);
    }

    this._updateStatus(`${player.name} places capital in ${choice}`);
    this.gameState.placeCapital(choice);
    this._logAction('capital', { message: `${player.name} placed capital at ${choice}`, territory: choice }, player);
    this._notifyAction('placeCapital', { territory: choice });
  }

  // ============================================
  // INITIAL UNIT PLACEMENT (6 units per round)
  // ============================================
  async _handleInitialPlacement(aiPlayer, player) {
    this._updateStatus(`${player.name} is placing units...`);
    await this._delay(this._getActionDelay() / 2);

    const unitsToPlace = this.gameState.getUnitsToPlace(player.id);
    const totalRemaining = this.gameState.getTotalUnitsToPlace(player.id);

    if (totalRemaining === 0) {
      // No units left, finish placement round
      this.gameState.finishPlacementRound();
      this._notifyAction('finishPlacement', {});
      return;
    }

    // Get owned territories for land units
    const ownedLand = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === player.id)
      .map(t => t.name);

    // Get adjacent sea zones for naval units
    const ownedSeas = this._getAdjacentSeaZones(player.id);

    // Place up to 6 units this round
    let placedThisRound = 0;
    const maxThisRound = Math.min(6, totalRemaining);

    while (placedThisRound < maxThisRound) {
      // Find a unit type to place
      let unitType = null;
      let isNaval = false;

      for (const unit of unitsToPlace) {
        if (unit.quantity > 0) {
          const def = this.unitDefs?.[unit.type];
          if (def) {
            unitType = unit.type;
            isNaval = def.isSea;
            break;
          }
        }
      }

      if (!unitType) break;

      // Pick territory based on unit type and difficulty
      let territory;
      if (isNaval && ownedSeas.length > 0) {
        territory = ownedSeas[Math.floor(Math.random() * ownedSeas.length)];
      } else if (ownedLand.length > 0) {
        territory = this._pickPlacementTerritory(ownedLand, player.id, aiPlayer.difficulty);
      } else {
        break;
      }

      // Place the unit
      const result = this.gameState.placeInitialUnit(territory, unitType, this.unitDefs);
      if (result.success) {
        placedThisRound++;
        await this._delay(150); // Small delay for visual feedback
        this._notifyAction('placeUnit', { unitType, territory });
      } else {
        break;
      }
    }

    // Finish placement round after placing 6 units
    await this._delay(300);
    this.gameState.finishPlacementRound();
    this._notifyAction('finishPlacement', {});
  }

  // ============================================
  // PLAYING PHASE (all turn phases)
  // ============================================
  async _handlePlayingPhase(aiPlayer, player, turnPhase) {
    switch (turnPhase) {
      case TURN_PHASES.DEVELOP_TECH:
        await this._handleTechResearch(aiPlayer, player);
        break;
      case TURN_PHASES.PURCHASE:
        await this._handlePurchase(aiPlayer, player);
        break;
      case TURN_PHASES.COMBAT_MOVE:
        await this._handleCombatMove(aiPlayer, player);
        break;
      case TURN_PHASES.COMBAT:
        await this._handleCombat(aiPlayer, player);
        break;
      case TURN_PHASES.NON_COMBAT_MOVE:
        await this._handleNonCombatMove(aiPlayer, player);
        break;
      case TURN_PHASES.MOBILIZE:
        await this._handleMobilize(aiPlayer, player);
        break;
      case TURN_PHASES.COLLECT_INCOME:
        // Auto-handled by game state
        this.gameState.nextPhase();
        this._notifyAction('nextPhase', {});
        break;
      default:
        // Skip unknown phases
        this.gameState.nextPhase();
        this._notifyAction('nextPhase', {});
    }
  }

  // ============================================
  // TECH RESEARCH
  // ============================================
  async _handleTechResearch(aiPlayer, player) {
    this._updateStatus(`${player.name} considering technology research...`);
    await this._delay(this._getActionDelay() / 2);

    const ipcs = this.gameState.getIPCs(player.id);
    const availableTechs = this.gameState.getAvailableTechs?.(player.id) || [];

    // Decide whether to research based on difficulty and resources
    let diceCount = 0;
    if (availableTechs.length > 0 && ipcs >= 5) {
      if (aiPlayer.difficulty === 'hard' && ipcs >= 15) {
        diceCount = Math.min(3, Math.floor(ipcs / 5));
      } else if (aiPlayer.difficulty === 'medium' && ipcs >= 20) {
        diceCount = Math.min(2, Math.floor(ipcs / 5));
      } else if (aiPlayer.difficulty === 'easy' && ipcs >= 30 && Math.random() > 0.5) {
        diceCount = 1;
      }
    }

    if (diceCount > 0) {
      this._updateStatus(`${player.name} researching technology (${diceCount} dice)...`);
      this.gameState.purchaseTechDice(player.id, diceCount);
      await this._delay(500);

      const result = this.gameState.rollTechDice(player.id);
      if (result.success && availableTechs.length > 0) {
        // Pick a tech to unlock
        const techId = availableTechs[0];
        this.gameState.unlockTech(player.id, techId);
        this._updateStatus(`${player.name} unlocked ${techId}!`);
      }
      await this._delay(300);
    }

    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  // ============================================
  // PURCHASE PHASE
  // ============================================
  async _handlePurchase(aiPlayer, player) {
    this._updateStatus(`${player.name} purchasing units...`);
    await this._delay(this._getActionDelay());

    const ipcs = this.gameState.getIPCs(player.id);
    if (ipcs <= 0 || !this.unitDefs) {
      this.gameState.nextPhase();
      this._notifyAction('nextPhase', {});
      return;
    }

    const capital = this.gameState.playerState[player.id]?.capitalTerritory;
    if (!capital) {
      this.gameState.nextPhase();
      this._notifyAction('nextPhase', {});
      return;
    }

    // Purchase strategy based on difficulty
    const priorities = this._getPurchasePriorities(aiPlayer.difficulty);
    let remaining = ipcs;

    for (const unitType of priorities) {
      const def = this.unitDefs[unitType];
      if (!def || def.cost > remaining) continue;

      // Buy units
      let count = Math.floor(remaining / def.cost);

      // Limit purchases based on difficulty
      if (aiPlayer.difficulty === 'easy') {
        count = Math.min(count, 2);
      } else if (aiPlayer.difficulty === 'medium') {
        count = Math.min(count, 4);
      }

      for (let i = 0; i < count && remaining >= def.cost; i++) {
        this.gameState.purchaseUnit(unitType, capital, this.unitDefs);
        remaining -= def.cost;
      }
    }

    this._notifyAction('purchase', {});
    await this._delay(300);
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  // ============================================
  // COMBAT MOVE
  // ============================================
  async _handleCombatMove(aiPlayer, player) {
    this._updateStatus(`${player.name} planning attacks...`);
    await this._delay(this._getActionDelay());

    const owned = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === player.id);

    for (const territory of owned) {
      const units = this.gameState.units[territory.name];
      if (!units || units.length === 0) continue;

      const myUnits = units.filter(u => u.owner === player.id && !u.moved);
      if (myUnits.length === 0) continue;

      // Find adjacent enemies
      const connections = this.gameState.getConnections(territory.name);
      for (const target of connections) {
        const targetOwner = this.gameState.getOwner(target);
        const targetTerritory = this.gameState.territories.find(t => t.name === target);

        if (targetTerritory?.isWater) continue;
        if (!targetOwner || targetOwner === player.id) continue;
        if (this.gameState.areAllies?.(player.id, targetOwner)) continue;

        // Evaluate attack
        const myPower = this._calculatePower(myUnits, true);
        const enemyUnits = this.gameState.units[target] || [];
        const enemyPower = this._calculatePower(enemyUnits, false);

        const ratio = myPower / (enemyPower || 0.5);
        const threshold = aiPlayer.difficulty === 'hard' ? 1.2 :
                         aiPlayer.difficulty === 'easy' ? 2.5 : 1.5;

        if (ratio >= threshold) {
          // Attack!
          this._updateStatus(`${player.name} attacking ${target}...`);
          const attackingUnits = [];
          for (const unit of myUnits) {
            const def = this.unitDefs?.[unit.type];
            if (def && def.attack > 0) {
              this.gameState.moveUnits(territory.name, target, [{ type: unit.type, quantity: unit.quantity }], this.unitDefs);
              attackingUnits.push({ type: unit.type, quantity: unit.quantity });
            }
          }
          if (attackingUnits.length > 0) {
            const unitStr = attackingUnits.map(u => `${u.quantity} ${u.type}`).join(', ');
            this._logAction('attack', { message: `${player.name} attacks ${target} with ${unitStr}` }, player);
          }
          await this._delay(200);
        }
      }
    }

    this._notifyAction('combatMove', {});
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  // ============================================
  // COMBAT RESOLUTION
  // ============================================
  async _handleCombat(aiPlayer, player) {
    this._updateStatus(`${player.name} resolving combat...`);

    // Auto-resolve all combats
    while (this.gameState.combatQueue && this.gameState.combatQueue.length > 0) {
      const combat = this.gameState.combatQueue[0];
      this._updateStatus(`Battle for ${combat}...`);

      // Auto-battle until resolved
      let safety = 100;
      while (safety-- > 0) {
        const result = this.gameState.resolveCombat(combat, this.unitDefs);
        if (!result || result.resolved) break;
        await this._delay(this.skipMode ? 20 : 200);
      }

      await this._delay(this.skipMode ? 50 : 300);
    }

    this._notifyAction('combat', {});
    await this._delay(200);
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  // ============================================
  // NON-COMBAT MOVE
  // ============================================
  async _handleNonCombatMove(aiPlayer, player) {
    this._updateStatus(`${player.name} repositioning units...`);
    await this._delay(this._getActionDelay() / 2);

    // Reinforce frontline territories
    const owned = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === player.id);

    for (const territory of owned) {
      const units = this.gameState.units[territory.name];
      if (!units || units.length === 0) continue;

      const myUnits = units.filter(u => u.owner === player.id && !u.moved);
      if (myUnits.length <= 1) continue;

      // Find friendly territories that need reinforcement
      const connections = this.gameState.getConnections(territory.name);
      for (const target of connections) {
        if (this.gameState.getOwner(target) !== player.id) continue;

        const isFrontline = this._isFrontline(target, player.id);
        if (!isFrontline) continue;

        const targetUnits = this.gameState.units[target] || [];
        const targetCount = targetUnits.filter(u => u.owner === player.id)
          .reduce((sum, u) => sum + u.quantity, 0);
        const sourceCount = myUnits.reduce((sum, u) => sum + u.quantity, 0);

        // Move half of excess units to frontline
        if (sourceCount > targetCount + 2) {
          for (const unit of myUnits) {
            if (unit.quantity > 1 && !unit.moved) {
              const toMove = Math.floor(unit.quantity / 2);
              if (toMove > 0) {
                this.gameState.moveUnits(territory.name, target, unit.type, toMove);
              }
            }
          }
          await this._delay(100);
        }
      }
    }

    this._notifyAction('nonCombatMove', {});
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  // ============================================
  // MOBILIZE (place purchased units)
  // ============================================
  async _handleMobilize(aiPlayer, player) {
    this._updateStatus(`${player.name} mobilizing units...`);
    await this._delay(this._getActionDelay() / 2);

    // Units are placed during purchase at capital, just advance
    this._notifyAction('mobilize', {});
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  _calculatePower(units, isAttack) {
    if (!units || !this.unitDefs) return 0;
    let power = 0;
    for (const unit of units) {
      const def = this.unitDefs[unit.type];
      if (!def) continue;
      power += (isAttack ? def.attack : def.defense) * (unit.quantity || 1);
    }
    return power;
  }

  _getPurchasePriorities(difficulty) {
    if (difficulty === 'hard') {
      return ['armour', 'artillery', 'fighter', 'infantry'];
    } else if (difficulty === 'easy') {
      return ['infantry', 'armour'];
    }
    return ['infantry', 'armour', 'artillery'];
  }

  _pickPlacementTerritory(territories, playerId, difficulty) {
    if (difficulty === 'hard') {
      // Place on frontline territories
      const frontline = territories.filter(t => this._isFrontline(t, playerId));
      if (frontline.length > 0) {
        return frontline[Math.floor(Math.random() * frontline.length)];
      }
    } else if (difficulty === 'medium') {
      // Mix of frontline and central
      const frontline = territories.filter(t => this._isFrontline(t, playerId));
      if (frontline.length > 0 && Math.random() > 0.4) {
        return frontline[Math.floor(Math.random() * frontline.length)];
      }
    }
    // Default: random
    return territories[Math.floor(Math.random() * territories.length)];
  }

  _findCentralTerritory(territories, playerId) {
    let best = territories[0];
    let bestScore = 0;

    for (const t of territories) {
      const connections = this.gameState.getConnections(t);
      const friendlyNeighbors = connections.filter(c =>
        this.gameState.getOwner(c) === playerId
      ).length;
      if (friendlyNeighbors > bestScore) {
        bestScore = friendlyNeighbors;
        best = t;
      }
    }
    return best;
  }

  _isFrontline(territory, playerId) {
    const connections = this.gameState.getConnections(territory);
    return connections.some(c => {
      const owner = this.gameState.getOwner(c);
      const isWater = this.gameState.territories.find(t => t.name === c)?.isWater;
      return owner && owner !== playerId && !isWater;
    });
  }

  _getAdjacentSeaZones(playerId) {
    const seaZones = new Set();
    const owned = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === playerId);

    for (const territory of owned) {
      const t = this.gameState.territories.find(x => x.name === territory.name);
      if (!t?.connections) continue;

      for (const conn of t.connections) {
        const connT = this.gameState.territories.find(x => x.name === conn);
        if (connT?.isWater) {
          seaZones.add(conn);
        }
      }
    }
    return [...seaZones];
  }

  _notifyAction(action, data) {
    if (this.onAction) {
      this.onAction(action, data);
    }
  }

  _delay(ms) {
    // In skip mode, use minimal delays
    const actualDelay = this.skipMode ? Math.min(ms, 50) : ms;
    return new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  // Get appropriate delay based on skip mode
  _getActionDelay() {
    if (this.skipMode) return 100;
    return 800; // Default visible delay so players can see moves
  }
}
