// AI Player logic for Tactical Risk
// Handles automated decision making for computer opponents

export class AIPlayer {
  constructor(gameState, playerId, difficulty = 'medium') {
    this.gameState = gameState;
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.thinkDelay = difficulty === 'easy' ? 800 : difficulty === 'hard' ? 300 : 500;
  }

  // Main entry point - called when it's this AI's turn
  async takeTurn(phase, callbacks = {}) {
    await this._delay(this.thinkDelay);

    switch (phase) {
      case 'CAPITAL_PLACEMENT':
        return this._placeCapital(callbacks);
      case 'UNIT_PLACEMENT':
        return this._placeUnits(callbacks);
      case 'PURCHASE':
        return this._purchaseUnits(callbacks);
      case 'COMBAT_MOVE':
        return this._combatMove(callbacks);
      case 'COMBAT':
        return this._resolveCombat(callbacks);
      case 'NON_COMBAT_MOVE':
        return this._nonCombatMove(callbacks);
      case 'MOBILIZE':
        return this._mobilize(callbacks);
      default:
        return { done: true };
    }
  }

  // Capital placement phase
  _placeCapital(callbacks) {
    const territories = this._getOwnedTerritories();
    if (territories.length === 0) return { done: true };

    // Pick a territory based on difficulty
    let choice;
    if (this.difficulty === 'hard') {
      // Pick territory with most connections (strategic)
      choice = territories.reduce((best, t) => {
        const connections = this.gameState.getConnections(t).length;
        const bestConnections = this.gameState.getConnections(best).length;
        return connections > bestConnections ? t : best;
      });
    } else if (this.difficulty === 'easy') {
      // Random choice
      choice = territories[Math.floor(Math.random() * territories.length)];
    } else {
      // Medium: pick centrally located territory
      choice = this._findCentralTerritory(territories);
    }

    return { action: 'placeCapital', territory: choice };
  }

  // Initial unit placement phase
  _placeUnits(callbacks) {
    const placementState = this.gameState.getPlacementState?.();
    if (!placementState) return { done: true };

    const { unitsToPlace, maxPerRound } = placementState;
    if (!unitsToPlace || Object.keys(unitsToPlace).length === 0) {
      return { action: 'finishPlacement' };
    }

    const territories = this._getOwnedTerritories();
    if (territories.length === 0) return { done: true };

    // Decide where to place units
    const placements = [];
    let placed = 0;

    for (const [unitType, count] of Object.entries(unitsToPlace)) {
      if (count <= 0) continue;

      const toPlace = Math.min(count, maxPerRound - placed);
      for (let i = 0; i < toPlace; i++) {
        // Pick territory based on difficulty
        let territory;
        if (this.difficulty === 'hard') {
          // Place on border territories (frontline)
          territory = this._findFrontlineTerritory(territories);
        } else if (this.difficulty === 'easy') {
          // Random
          territory = territories[Math.floor(Math.random() * territories.length)];
        } else {
          // Medium: balanced
          territory = this._findStrategicTerritory(territories);
        }

        placements.push({ unitType, territory });
        placed++;
        if (placed >= maxPerRound) break;
      }
      if (placed >= maxPerRound) break;
    }

    return { action: 'placeUnits', placements };
  }

  // Purchase phase
  _purchaseUnits(callbacks) {
    const ipcs = this.gameState.getIPCs(this.playerId);
    if (ipcs <= 0) return { action: 'skipPurchase' };

    const unitDefs = this.gameState.unitDefs;
    if (!unitDefs) return { action: 'skipPurchase' };

    const purchases = [];
    let remaining = ipcs;

    // Strategy based on difficulty
    const priorities = this._getPurchasePriorities();

    for (const unitType of priorities) {
      const def = unitDefs[unitType];
      if (!def || def.cost > remaining) continue;

      // Buy as many as we can afford (with some randomness for easy mode)
      let count = Math.floor(remaining / def.cost);
      if (this.difficulty === 'easy') {
        count = Math.max(1, Math.floor(count * (0.5 + Math.random() * 0.5)));
      }
      if (this.difficulty === 'medium') {
        count = Math.min(count, 3); // Don't go all-in on one unit type
      }

      if (count > 0) {
        purchases.push({ unitType, count });
        remaining -= def.cost * count;
      }

      if (remaining < 3) break; // Can't afford much more
    }

    return { action: 'purchase', purchases };
  }

  // Combat movement phase
  _combatMove(callbacks) {
    const moves = [];
    const ownedTerritories = this._getOwnedTerritories();

    for (const territory of ownedTerritories) {
      const units = this.gameState.getUnits(territory, this.playerId);
      if (!units || units.length === 0) continue;

      // Find adjacent enemy territories
      const connections = this.gameState.getConnections(territory);
      const enemyTargets = connections.filter(t => {
        const owner = this.gameState.getOwner(t);
        const isWater = this.gameState.isWater ? this.gameState.isWater(t) : false;
        return owner && owner !== this.playerId && !isWater;
      });

      if (enemyTargets.length === 0) continue;

      // Evaluate attack opportunities
      for (const target of enemyTargets) {
        const shouldAttack = this._evaluateAttack(territory, target, units);
        if (shouldAttack) {
          // Move attacking units
          const attackers = this._selectAttackers(units, target);
          if (attackers.length > 0) {
            moves.push({
              from: territory,
              to: target,
              units: attackers
            });
          }
        }
      }
    }

    return { action: 'combatMoves', moves };
  }

  // Combat resolution
  _resolveCombat(callbacks) {
    // AI just auto-resolves combats
    return { action: 'autoCombat' };
  }

  // Non-combat movement phase
  _nonCombatMove(callbacks) {
    const moves = [];
    const ownedTerritories = this._getOwnedTerritories();

    // Reinforce weak territories
    for (const territory of ownedTerritories) {
      const units = this.gameState.getUnits(territory, this.playerId);
      if (!units || units.length <= 1) continue;

      // Find friendly territories that need reinforcement
      const connections = this.gameState.getConnections(territory);
      const friendlyTargets = connections.filter(t => {
        const owner = this.gameState.getOwner(t);
        return owner === this.playerId;
      });

      for (const target of friendlyTargets) {
        const targetUnits = this.gameState.getUnits(target, this.playerId);
        const targetCount = targetUnits?.reduce((sum, u) => sum + u.quantity, 0) || 0;
        const sourceCount = units.reduce((sum, u) => sum + u.quantity, 0);

        // Move units to weak frontline territories
        if (this._isFrontline(target) && targetCount < sourceCount - 1) {
          const toMove = Math.floor((sourceCount - targetCount) / 2);
          if (toMove > 0) {
            moves.push({
              from: territory,
              to: target,
              count: toMove
            });
          }
        }
      }
    }

    return { action: 'nonCombatMoves', moves };
  }

  // Mobilize (place purchased units)
  _mobilize(callbacks) {
    const pending = this.gameState.getPendingPurchases?.(this.playerId);
    if (!pending || pending.length === 0) return { action: 'skipMobilize' };

    const capital = this.gameState.getCapital(this.playerId);
    if (!capital) return { action: 'skipMobilize' };

    // Place all units at capital (simple strategy)
    return { action: 'mobilize', territory: capital };
  }

  // Helper methods
  _getOwnedTerritories() {
    return this.gameState.territories
      ?.filter(t => !t.isWater && this.gameState.getOwner(t.name) === this.playerId)
      .map(t => t.name) || [];
  }

  _findCentralTerritory(territories) {
    // Find territory with most friendly neighbors
    let best = territories[0];
    let bestScore = 0;

    for (const t of territories) {
      const connections = this.gameState.getConnections(t);
      const friendlyNeighbors = connections.filter(c =>
        this.gameState.getOwner(c) === this.playerId
      ).length;
      if (friendlyNeighbors > bestScore) {
        bestScore = friendlyNeighbors;
        best = t;
      }
    }
    return best;
  }

  _findFrontlineTerritory(territories) {
    // Find territory adjacent to enemy
    for (const t of territories) {
      if (this._isFrontline(t)) return t;
    }
    return territories[0];
  }

  _findStrategicTerritory(territories) {
    // Balance between frontline and central
    const frontline = territories.filter(t => this._isFrontline(t));
    if (frontline.length > 0 && Math.random() > 0.3) {
      return frontline[Math.floor(Math.random() * frontline.length)];
    }
    return this._findCentralTerritory(territories);
  }

  _isFrontline(territory) {
    const connections = this.gameState.getConnections(territory);
    return connections.some(c => {
      const owner = this.gameState.getOwner(c);
      const isWater = this.gameState.isWater ? this.gameState.isWater(c) : false;
      return owner && owner !== this.playerId && !isWater;
    });
  }

  _getPurchasePriorities() {
    if (this.difficulty === 'hard') {
      return ['armour', 'artillery', 'infantry', 'fighter'];
    } else if (this.difficulty === 'easy') {
      return ['infantry', 'infantry', 'armour'];
    } else {
      return ['infantry', 'armour', 'artillery'];
    }
  }

  _evaluateAttack(from, to, units) {
    const attackPower = this._calculatePower(units, true);
    const defenderUnits = this.gameState.getUnits(to);
    const defensePower = this._calculatePower(defenderUnits || [], false);

    // Attack if we have advantage
    const ratio = attackPower / (defensePower || 1);

    if (this.difficulty === 'hard') {
      return ratio >= 1.2; // Attack with 20% advantage
    } else if (this.difficulty === 'easy') {
      return ratio >= 2.0 || Math.random() > 0.7; // Need big advantage or random
    } else {
      return ratio >= 1.5; // Medium: need 50% advantage
    }
  }

  _calculatePower(units, isAttack) {
    if (!units || !Array.isArray(units)) return 0;

    const unitDefs = this.gameState.unitDefs || {};
    let power = 0;

    for (const unit of units) {
      const def = unitDefs[unit.type];
      if (!def) continue;
      const value = isAttack ? def.attack : def.defense;
      power += value * (unit.quantity || 1);
    }

    return power;
  }

  _selectAttackers(units, target) {
    // Select units to attack with
    return units.filter(u => {
      const def = this.gameState.unitDefs?.[u.type];
      return def && def.attack > 0;
    }).map(u => ({
      type: u.type,
      quantity: this.difficulty === 'easy'
        ? Math.ceil(u.quantity / 2)
        : u.quantity
    }));
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
