// AI Controller - manages AI players and triggers their turns

import { AIPlayer } from './aiPlayer.js';

export class AIController {
  constructor() {
    this.gameState = null;
    this.aiPlayers = {}; // playerId -> AIPlayer instance
    this.isProcessing = false;
    this.onAction = null; // Callback when AI takes action
    this.unitDefs = null;
  }

  setGameState(gameState) {
    this.gameState = gameState;
    this._initAIPlayers();
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
    if (this.gameState) {
      this.gameState.unitDefs = unitDefs;
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
        this.aiPlayers[player.id] = new AIPlayer(
          this.gameState,
          player.id,
          player.aiDifficulty || 'medium'
        );
      }
    }
  }

  // Check if current player is AI and process their turn
  async checkAndProcessAI() {
    if (this.isProcessing) return false;
    if (!this.gameState) return false;

    const currentPlayer = this.gameState.currentPlayer;
    if (!currentPlayer?.isAI) return false;

    const aiPlayer = this.aiPlayers[currentPlayer.id];
    if (!aiPlayer) return false;

    this.isProcessing = true;

    try {
      await this._processAITurn(aiPlayer, currentPlayer);
    } catch (err) {
      console.error('AI error:', err);
    }

    this.isProcessing = false;
    return true;
  }

  async _processAITurn(aiPlayer, player) {
    const phase = this.gameState.phase;
    const turnPhase = this.gameState.turnPhase;

    // Handle different game phases
    if (phase === 'CAPITAL_PLACEMENT') {
      await this._handleCapitalPlacement(aiPlayer, player);
    } else if (phase === 'UNIT_PLACEMENT') {
      await this._handleUnitPlacement(aiPlayer, player);
    } else if (phase === 'PLAYING') {
      await this._handlePlayingPhase(aiPlayer, player, turnPhase);
    }
  }

  async _handleCapitalPlacement(aiPlayer, player) {
    const result = await aiPlayer.takeTurn('CAPITAL_PLACEMENT');

    if (result.action === 'placeCapital' && result.territory) {
      this.gameState.placeCapital(result.territory);
      this._notifyAction('placeCapital', result);
    }
  }

  async _handleUnitPlacement(aiPlayer, player) {
    // AI places units during initial placement
    const placementState = this.gameState.placementState?.[player.id];
    if (!placementState) {
      this.gameState.finishPlacement();
      this._notifyAction('finishPlacement', {});
      return;
    }

    const { unitsToPlace, placedThisRound, maxPerRound } = placementState;

    // Count remaining units
    let totalRemaining = 0;
    for (const count of Object.values(unitsToPlace)) {
      totalRemaining += count;
    }

    if (totalRemaining === 0) {
      this.gameState.finishPlacement();
      this._notifyAction('finishPlacement', {});
      return;
    }

    // Place units
    const territories = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === player.id)
      .map(t => t.name);

    if (territories.length === 0) {
      this.gameState.finishPlacement();
      return;
    }

    let placed = placedThisRound || 0;
    const toPlaceThisRound = Math.min(totalRemaining, maxPerRound - placed);

    for (let i = 0; i < toPlaceThisRound; i++) {
      // Find a unit type to place
      let unitType = null;
      for (const [type, count] of Object.entries(unitsToPlace)) {
        if (count > 0) {
          unitType = type;
          break;
        }
      }
      if (!unitType) break;

      // Pick territory (simple: random or strategic)
      const territory = this._pickPlacementTerritory(territories, player.id, aiPlayer.difficulty);

      // Place the unit
      const success = this.gameState.placeInitialUnit(unitType, territory);
      if (success) {
        await this._delay(200); // Small delay between placements for visual feedback
        this._notifyAction('placeUnit', { unitType, territory });
      }
    }

    // Check if round is complete
    const newState = this.gameState.placementState?.[player.id];
    if (newState && newState.placedThisRound >= maxPerRound) {
      this.gameState.finishPlacement();
      this._notifyAction('finishPlacement', {});
    }
  }

  _pickPlacementTerritory(territories, playerId, difficulty) {
    if (difficulty === 'hard') {
      // Place on frontline territories
      const frontline = territories.filter(t => this._isFrontline(t, playerId));
      if (frontline.length > 0) {
        return frontline[Math.floor(Math.random() * frontline.length)];
      }
    }
    // Default: random
    return territories[Math.floor(Math.random() * territories.length)];
  }

  _isFrontline(territory, playerId) {
    const connections = this.gameState.getConnections(territory);
    return connections.some(c => {
      const owner = this.gameState.getOwner(c);
      const isWater = this.gameState.isWater(c);
      return owner && owner !== playerId && !isWater;
    });
  }

  async _handlePlayingPhase(aiPlayer, player, turnPhase) {
    switch (turnPhase) {
      case 'PURCHASE':
        await this._handlePurchase(aiPlayer, player);
        break;
      case 'COMBAT_MOVE':
        await this._handleCombatMove(aiPlayer, player);
        break;
      case 'COMBAT':
        await this._handleCombat(aiPlayer, player);
        break;
      case 'NON_COMBAT_MOVE':
        await this._handleNonCombatMove(aiPlayer, player);
        break;
      case 'MOBILIZE':
        await this._handleMobilize(aiPlayer, player);
        break;
      case 'COLLECT_INCOME':
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

  async _handlePurchase(aiPlayer, player) {
    await this._delay(500);

    const ipcs = this.gameState.getIPCs(player.id);
    if (ipcs <= 0 || !this.unitDefs) {
      this.gameState.nextPhase();
      this._notifyAction('nextPhase', {});
      return;
    }

    // Simple purchase logic
    const priorities = aiPlayer.difficulty === 'hard'
      ? ['armour', 'artillery', 'infantry']
      : ['infantry', 'armour'];

    let remaining = ipcs;
    for (const unitType of priorities) {
      const def = this.unitDefs[unitType];
      if (!def) continue;

      while (remaining >= def.cost) {
        const capital = this.gameState.playerState[player.id]?.capitalTerritory;
        if (capital) {
          this.gameState.purchaseUnit(unitType, capital, this.unitDefs);
          remaining -= def.cost;
        } else {
          break;
        }
      }
    }

    this._notifyAction('purchase', {});
    await this._delay(300);
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  async _handleCombatMove(aiPlayer, player) {
    await this._delay(500);

    // Get owned territories with units
    const owned = this.gameState.territories
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === player.id);

    for (const territory of owned) {
      const units = this.gameState.units[territory.name];
      if (!units || units.length === 0) continue;

      const myUnits = units.filter(u => u.owner === player.id);
      if (myUnits.length === 0) continue;

      // Find adjacent enemies
      const connections = this.gameState.getConnections(territory.name);
      for (const target of connections) {
        const targetOwner = this.gameState.getOwner(target);
        const targetTerritory = this.gameState.territories.find(t => t.name === target);

        if (targetTerritory?.isWater) continue;
        if (!targetOwner || targetOwner === player.id) continue;

        // Evaluate attack
        const myPower = this._calculatePower(myUnits, true);
        const enemyUnits = this.gameState.units[target] || [];
        const enemyPower = this._calculatePower(enemyUnits, false);

        const ratio = myPower / (enemyPower || 0.5);
        const threshold = aiPlayer.difficulty === 'hard' ? 1.2 :
                         aiPlayer.difficulty === 'easy' ? 2.5 : 1.5;

        if (ratio >= threshold) {
          // Attack!
          for (const unit of myUnits) {
            const def = this.unitDefs?.[unit.type];
            if (def && def.attack > 0) {
              this.gameState.moveUnits(territory.name, target, unit.type, unit.quantity);
            }
          }
          await this._delay(300);
        }
      }
    }

    this._notifyAction('combatMove', {});
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  async _handleCombat(aiPlayer, player) {
    // Auto-resolve all combats
    while (this.gameState.combatQueue && this.gameState.combatQueue.length > 0) {
      const combat = this.gameState.combatQueue[0];

      // Auto-battle until resolved
      let safety = 100;
      while (safety-- > 0) {
        const result = this.gameState.resolveCombatRound(combat.territory);
        if (!result || result.resolved) break;
        await this._delay(100);
      }

      // Remove from queue if still there
      if (this.gameState.combatQueue[0]?.territory === combat.territory) {
        this.gameState.combatQueue.shift();
      }
    }

    this._notifyAction('combat', {});
    await this._delay(300);
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  async _handleNonCombatMove(aiPlayer, player) {
    await this._delay(400);
    // Simple: just skip for now, can be enhanced later
    this._notifyAction('nonCombatMove', {});
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

  async _handleMobilize(aiPlayer, player) {
    await this._delay(300);
    // Units are placed during purchase, just advance
    this._notifyAction('mobilize', {});
    this.gameState.nextPhase();
    this._notifyAction('nextPhase', {});
  }

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

  _notifyAction(action, data) {
    if (this.onAction) {
      this.onAction(action, data);
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
