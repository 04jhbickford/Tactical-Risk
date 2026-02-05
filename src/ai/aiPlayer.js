// AI Player logic for Tactical Risk
// Handles automated decision making for computer opponents

// Strategy weights by difficulty - determines AI focus areas
const DIFFICULTY_WEIGHTS = {
  easy: {
    offense: 0.2,      // Low aggression
    defense: 0.5,      // Prioritize defense
    economics: 0.3,    // Some economic focus
    expansion: 0.2,    // Low expansion
    riskTolerance: 0.3 // Conservative
  },
  medium: {
    offense: 0.4,
    defense: 0.4,
    economics: 0.4,
    expansion: 0.5,
    riskTolerance: 0.5
  },
  hard: {
    offense: 0.7,      // Aggressive
    defense: 0.6,      // Still defends well
    economics: 0.8,    // Strong economic focus
    expansion: 0.8,    // Seeks to expand
    riskTolerance: 0.7 // Willing to take calculated risks
  }
};

export class AIPlayer {
  constructor(gameState, playerId, difficulty = 'medium') {
    this.gameState = gameState;
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.weights = DIFFICULTY_WEIGHTS[difficulty] || DIFFICULTY_WEIGHTS.medium;
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

  // Capital placement phase - strategically choose capital location
  _placeCapital(callbacks) {
    const territories = this._getOwnedTerritories();
    if (territories.length === 0) return { done: true };

    let choice;
    if (this.difficulty === 'hard') {
      // Hard AI: Consider multiple factors
      choice = this._evaluateBestCapitalLocation(territories);
    } else if (this.difficulty === 'easy') {
      // Easy AI: Random choice
      choice = territories[Math.floor(Math.random() * territories.length)];
    } else {
      // Medium AI: Pick centrally located territory
      choice = this._findCentralTerritory(territories);
    }

    return { action: 'placeCapital', territory: choice };
  }

  // Evaluate best capital location based on multiple factors
  _evaluateBestCapitalLocation(territories) {
    let bestTerritory = territories[0];
    let bestScore = -Infinity;

    for (const t of territories) {
      let score = 0;

      // Connections (defensibility)
      const connections = this.gameState.getConnections(t);
      score += connections.length * 2;

      // Friendly neighbors (security)
      const friendlyNeighbors = connections.filter(c =>
        this.gameState.getOwner(c) === this.playerId
      ).length;
      score += friendlyNeighbors * 5;

      // Distance from enemies (safety)
      const enemyNeighbors = connections.filter(c => {
        const owner = this.gameState.getOwner(c);
        return owner && owner !== this.playerId;
      }).length;
      score -= enemyNeighbors * 3;

      // Territory production value
      const production = this.gameState.getProductionValue?.(t) || 1;
      score += production * 2;

      if (score > bestScore) {
        bestScore = score;
        bestTerritory = t;
      }
    }

    return bestTerritory;
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

    const placements = [];
    let placed = 0;

    for (const [unitType, count] of Object.entries(unitsToPlace)) {
      if (count <= 0) continue;

      const toPlace = Math.min(count, maxPerRound - placed);
      for (let i = 0; i < toPlace; i++) {
        let territory;
        if (this.difficulty === 'hard') {
          territory = this._findOptimalPlacementTerritory(territories, unitType);
        } else if (this.difficulty === 'easy') {
          territory = territories[Math.floor(Math.random() * territories.length)];
        } else {
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

  // Find optimal territory for placing a specific unit type
  _findOptimalPlacementTerritory(territories, unitType) {
    const unitDef = this.gameState.unitDefs?.[unitType];

    // Naval units go to sea zones adjacent to capital
    if (unitDef?.isSea) {
      const seaZones = this._getAdjacentSeaZones();
      if (seaZones.length > 0) {
        return seaZones[Math.floor(Math.random() * seaZones.length)];
      }
    }

    // Offensive units go to frontline
    if (unitDef?.attack > unitDef?.defense) {
      return this._findFrontlineTerritory(territories);
    }

    // Defensive units go to capital or weak territories
    return this._findWeakestTerritory(territories);
  }

  _getAdjacentSeaZones() {
    const capital = this.gameState.getCapital?.(this.playerId);
    if (!capital) return [];
    return this.gameState.getAdjacentSeaZones?.(capital) || [];
  }

  _findWeakestTerritory(territories) {
    let weakest = territories[0];
    let weakestStrength = Infinity;

    for (const t of territories) {
      const units = this.gameState.getUnits(t, this.playerId);
      const strength = this._calculatePower(units || [], false);
      if (strength < weakestStrength) {
        weakestStrength = strength;
        weakest = t;
      }
    }
    return weakest;
  }

  // Purchase phase - build army based on strategic needs
  _purchaseUnits(callbacks) {
    const ipcs = this.gameState.getIPCs(this.playerId);
    if (ipcs <= 0) return { action: 'skipPurchase' };

    const unitDefs = this.gameState.unitDefs;
    if (!unitDefs) return { action: 'skipPurchase' };

    const purchases = [];
    let remaining = ipcs;

    // Analyze current situation
    const situation = this._analyzeStrategicSituation();

    // Get purchase priorities based on situation and difficulty
    const priorities = this._getSmartPurchasePriorities(situation);

    for (const { unitType, weight } of priorities) {
      const def = unitDefs[unitType];
      if (!def || def.cost > remaining) continue;

      // Calculate how many to buy based on weight and available funds
      let maxCount = Math.floor(remaining / def.cost);
      let count = Math.ceil(maxCount * weight);

      // Easy AI makes suboptimal purchases
      if (this.difficulty === 'easy') {
        count = Math.max(1, Math.floor(count * (0.3 + Math.random() * 0.5)));
      }

      // Medium AI doesn't over-concentrate
      if (this.difficulty === 'medium') {
        count = Math.min(count, 4);
      }

      if (count > 0) {
        purchases.push({ unitType, count });
        remaining -= def.cost * count;
      }

      if (remaining < 3) break;
    }

    return { action: 'purchase', purchases };
  }

  // Analyze the current strategic situation
  _analyzeStrategicSituation() {
    const ownedTerritories = this._getOwnedTerritories();
    const totalTerritories = this.gameState.territories?.filter(t => !t.isWater).length || 100;

    // Calculate relative strength vs opponents
    const myStrength = this._calculateTotalStrength(this.playerId);
    let enemyStrength = 0;
    let strongestEnemy = null;
    let strongestEnemyStrength = 0;

    const players = this.gameState.players || [];
    for (const p of players) {
      if (p.id === this.playerId) continue;
      const strength = this._calculateTotalStrength(p.id);
      enemyStrength += strength;
      if (strength > strongestEnemyStrength) {
        strongestEnemyStrength = strength;
        strongestEnemy = p.id;
      }
    }

    const frontlineCount = ownedTerritories.filter(t => this._isFrontline(t)).length;

    return {
      territoryShare: ownedTerritories.length / totalTerritories,
      strengthRatio: myStrength / (enemyStrength || 1),
      frontlineRatio: frontlineCount / (ownedTerritories.length || 1),
      underThreat: frontlineCount > ownedTerritories.length * 0.5,
      dominant: myStrength > enemyStrength * 1.5,
      strongestEnemy,
      myStrength,
      enemyStrength
    };
  }

  _calculateTotalStrength(playerId) {
    const territories = this.gameState.territories || [];
    let total = 0;
    for (const t of territories) {
      if (this.gameState.getOwner(t.name) !== playerId) continue;
      const units = this.gameState.getUnits(t.name, playerId);
      total += this._calculatePower(units || [], true);
    }
    return total;
  }

  // Get smart purchase priorities based on situation
  _getSmartPurchasePriorities(situation) {
    const priorities = [];

    if (this.difficulty === 'hard') {
      // Hard AI adapts to situation
      if (situation.underThreat) {
        // Need defense
        priorities.push({ unitType: 'infantry', weight: 0.5 });
        priorities.push({ unitType: 'artillery', weight: 0.3 });
        priorities.push({ unitType: 'fighter', weight: 0.2 });
      } else if (situation.dominant) {
        // Press advantage with mobile units
        priorities.push({ unitType: 'armour', weight: 0.4 });
        priorities.push({ unitType: 'artillery', weight: 0.3 });
        priorities.push({ unitType: 'bomber', weight: 0.2 });
        priorities.push({ unitType: 'infantry', weight: 0.1 });
      } else {
        // Balanced build
        priorities.push({ unitType: 'infantry', weight: 0.35 });
        priorities.push({ unitType: 'armour', weight: 0.25 });
        priorities.push({ unitType: 'artillery', weight: 0.2 });
        priorities.push({ unitType: 'fighter', weight: 0.2 });
      }
    } else if (this.difficulty === 'easy') {
      // Easy AI builds mostly infantry with occasional tanks
      priorities.push({ unitType: 'infantry', weight: 0.7 });
      priorities.push({ unitType: 'armour', weight: 0.3 });
    } else {
      // Medium AI has balanced but simpler priorities
      priorities.push({ unitType: 'infantry', weight: 0.4 });
      priorities.push({ unitType: 'armour', weight: 0.3 });
      priorities.push({ unitType: 'artillery', weight: 0.3 });
    }

    return priorities;
  }

  // Combat movement phase - decide which attacks to make
  _combatMove(callbacks) {
    const moves = [];
    const ownedTerritories = this._getOwnedTerritories();

    // Analyze all potential attacks
    const attackOptions = [];

    for (const territory of ownedTerritories) {
      const units = this.gameState.getUnits(territory, this.playerId);
      if (!units || units.length === 0) continue;

      const connections = this.gameState.getConnections(territory);
      const enemyTargets = connections.filter(t => {
        const owner = this.gameState.getOwner(t);
        const isWater = this.gameState.isWater ? this.gameState.isWater(t) : false;
        return owner && owner !== this.playerId && !isWater;
      });

      for (const target of enemyTargets) {
        const evaluation = this._evaluateAttackOpportunity(territory, target, units);
        if (evaluation.shouldAttack) {
          attackOptions.push({
            from: territory,
            to: target,
            units: evaluation.attackers,
            score: evaluation.score,
            winProbability: evaluation.winProbability
          });
        }
      }
    }

    // Sort by score and execute best attacks
    attackOptions.sort((a, b) => b.score - a.score);

    // Hard AI coordinates attacks, others just attack greedily
    const maxAttacks = this.difficulty === 'hard' ? 5 : this.difficulty === 'medium' ? 3 : 2;

    for (let i = 0; i < Math.min(attackOptions.length, maxAttacks); i++) {
      const attack = attackOptions[i];
      moves.push({
        from: attack.from,
        to: attack.to,
        units: attack.units
      });
    }

    return { action: 'combatMoves', moves };
  }

  // Evaluate an attack opportunity with detailed scoring
  _evaluateAttackOpportunity(from, to, units) {
    const attackPower = this._calculatePower(units, true);
    const defenderUnits = this.gameState.getUnits(to) || [];
    const defensePower = this._calculatePower(defenderUnits, false);

    const ratio = attackPower / (defensePower || 1);
    const winProbability = this._estimateWinProbability(attackPower, defensePower);

    // Calculate strategic value of target
    const targetValue = this._evaluateTargetValue(to);

    // Score combines win probability, strategic value, and difficulty weights
    let score = winProbability * targetValue;
    score *= this.weights.offense;

    // Adjust for risk tolerance
    if (winProbability < 0.5) {
      score *= this.weights.riskTolerance;
    }

    // Minimum threshold based on difficulty
    const minRatio = this.difficulty === 'hard' ? 1.2 :
                     this.difficulty === 'medium' ? 1.5 : 2.0;

    const shouldAttack = ratio >= minRatio || (
      this.difficulty === 'hard' && winProbability > 0.6 && targetValue > 5
    );

    return {
      shouldAttack,
      score,
      winProbability,
      attackers: shouldAttack ? this._selectAttackers(units, to) : []
    };
  }

  // Estimate probability of winning the battle
  _estimateWinProbability(attackPower, defensePower) {
    if (defensePower === 0) return 1.0;
    if (attackPower === 0) return 0.0;

    // Simplified probability based on power ratio
    const ratio = attackPower / defensePower;
    if (ratio >= 3) return 0.95;
    if (ratio >= 2) return 0.85;
    if (ratio >= 1.5) return 0.7;
    if (ratio >= 1) return 0.55;
    if (ratio >= 0.7) return 0.35;
    return 0.2;
  }

  // Evaluate strategic value of a target territory
  _evaluateTargetValue(territory) {
    let value = 0;

    // Production value
    value += (this.gameState.getProductionValue?.(territory) || 1) * 2;

    // Is it a capital? Very valuable
    if (this.gameState.isCapital?.(territory)) {
      value += 20;
    }

    // Continent bonus consideration
    const continentBonus = this._getContinentBonusValue(territory);
    value += continentBonus * this.weights.economics;

    // Strategic position (connections)
    const connections = this.gameState.getConnections(territory);
    value += connections.length;

    return value;
  }

  _getContinentBonusValue(territory) {
    // Check if capturing this territory completes a continent
    const continents = this.gameState.continents || [];
    for (const continent of continents) {
      if (!continent.territories?.includes(territory)) continue;

      // Count how many territories we'd control after capture
      const wouldControl = continent.territories.filter(t =>
        t === territory || this.gameState.getOwner(t) === this.playerId
      ).length;

      if (wouldControl === continent.territories.length) {
        return continent.bonus || 0;
      }
    }
    return 0;
  }

  // Combat resolution
  _resolveCombat(callbacks) {
    return { action: 'autoCombat' };
  }

  // Non-combat movement phase - reinforce and reposition
  _nonCombatMove(callbacks) {
    const moves = [];
    const ownedTerritories = this._getOwnedTerritories();

    // Calculate threat levels for all territories
    const threatLevels = {};
    for (const t of ownedTerritories) {
      threatLevels[t] = this._calculateThreatLevel(t);
    }

    // Move units from safe territories to threatened ones
    for (const territory of ownedTerritories) {
      const units = this.gameState.getUnits(territory, this.playerId);
      if (!units || units.length <= 1) continue;

      // Only move from safe territories
      if (threatLevels[territory] > 0.3) continue;

      const connections = this.gameState.getConnections(territory);
      const friendlyTargets = connections.filter(t =>
        this.gameState.getOwner(t) === this.playerId
      );

      // Find most threatened neighbor
      let mostThreatened = null;
      let highestThreat = 0;

      for (const target of friendlyTargets) {
        if (threatLevels[target] > highestThreat) {
          highestThreat = threatLevels[target];
          mostThreatened = target;
        }
      }

      if (mostThreatened && highestThreat > 0.4) {
        const sourceCount = units.reduce((sum, u) => sum + u.quantity, 0);
        const toMove = Math.floor(sourceCount * 0.5);

        if (toMove > 0) {
          moves.push({
            from: territory,
            to: mostThreatened,
            count: toMove
          });
        }
      }
    }

    return { action: 'nonCombatMoves', moves };
  }

  // Calculate threat level for a territory (0-1 scale)
  _calculateThreatLevel(territory) {
    const myUnits = this.gameState.getUnits(territory, this.playerId);
    const myPower = this._calculatePower(myUnits || [], false);

    let maxEnemyPower = 0;
    const connections = this.gameState.getConnections(territory);

    for (const conn of connections) {
      const owner = this.gameState.getOwner(conn);
      if (owner && owner !== this.playerId) {
        const enemyUnits = this.gameState.getUnits(conn, owner);
        const enemyPower = this._calculatePower(enemyUnits || [], true);
        maxEnemyPower = Math.max(maxEnemyPower, enemyPower);
      }
    }

    if (maxEnemyPower === 0) return 0;
    if (myPower === 0) return 1;

    return Math.min(1, maxEnemyPower / (myPower * 2));
  }

  // Mobilize (place purchased units)
  _mobilize(callbacks) {
    const pending = this.gameState.getPendingPurchases?.(this.playerId);
    if (!pending || pending.length === 0) return { action: 'skipMobilize' };

    const capital = this.gameState.getCapital(this.playerId);
    if (!capital) return { action: 'skipMobilize' };

    // Hard AI distributes units across factories
    if (this.difficulty === 'hard') {
      const factories = this._getFactoryLocations();
      if (factories.length > 1) {
        return { action: 'mobilize', territory: this._findBestMobilizationTerritory(factories) };
      }
    }

    return { action: 'mobilize', territory: capital };
  }

  _getFactoryLocations() {
    const factories = [];
    const territories = this.gameState.territories || [];

    for (const t of territories) {
      if (this.gameState.getOwner(t.name) !== this.playerId) continue;
      const units = this.gameState.getUnits(t.name, this.playerId);
      if (units?.some(u => u.type === 'factory')) {
        factories.push(t.name);
      }
    }
    return factories;
  }

  _findBestMobilizationTerritory(factories) {
    // Prefer frontline factories for offensive units
    for (const f of factories) {
      if (this._isFrontline(f)) return f;
    }
    return factories[0];
  }

  // Helper methods
  _getOwnedTerritories() {
    return this.gameState.territories
      ?.filter(t => !t.isWater && this.gameState.getOwner(t.name) === this.playerId)
      .map(t => t.name) || [];
  }

  _findCentralTerritory(territories) {
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
    for (const t of territories) {
      if (this._isFrontline(t)) return t;
    }
    return territories[0];
  }

  _findStrategicTerritory(territories) {
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
