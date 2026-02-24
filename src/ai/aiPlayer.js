// AI Player logic for Tactical Risk
// Strategic AI that balances offense, defense, economics, and victory conditions

// Difficulty configuration - affects all decision-making
const DIFFICULTY_CONFIG = {
  easy: {
    // Easy AI makes more mistakes and is less strategic
    analysisDepth: 1,           // How many moves ahead to consider
    economicWeight: 0.3,        // How much to value economic gains
    defenseWeight: 0.5,         // How much to value defense
    offenseWeight: 0.2,         // How much to value offense
    victoryFocus: 0.1,          // How much to focus on victory conditions
    mistakeChance: 0.25,        // Chance to make suboptimal decision
    minAttackRatio: 2.0,        // Won't attack unless 2:1 advantage
    reserveDefense: 0.6,        // Keep 60% of forces for defense
    expandAggression: 0.3,      // Low desire to expand
  },
  medium: {
    analysisDepth: 2,
    economicWeight: 0.5,
    defenseWeight: 0.4,
    offenseWeight: 0.5,
    victoryFocus: 0.4,
    mistakeChance: 0.1,
    minAttackRatio: 1.4,
    reserveDefense: 0.4,
    expandAggression: 0.6,
  },
  hard: {
    // Hard AI plays optimally and aggressively pursues victory
    analysisDepth: 3,
    economicWeight: 0.8,
    defenseWeight: 0.6,
    offenseWeight: 0.7,
    victoryFocus: 0.9,
    mistakeChance: 0.0,
    minAttackRatio: 1.2,
    reserveDefense: 0.25,
    expandAggression: 0.9,
  }
};

export class AIPlayer {
  constructor(gameState, playerId, difficulty = 'medium') {
    this.gameState = gameState;
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
    this.thinkDelay = difficulty === 'easy' ? 600 : difficulty === 'hard' ? 200 : 400;

    // Cache for expensive calculations
    this._cache = {};
  }

  // Main entry point
  async takeTurn(phase, callbacks = {}) {
    await this._delay(this.thinkDelay);
    this._cache = {}; // Clear cache each phase

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

  // ==================== STRATEGIC ANALYSIS ====================

  // Analyze the overall game state for strategic decision making
  _analyzeGameState() {
    if (this._cache.gameAnalysis) return this._cache.gameAnalysis;

    const analysis = {
      // Our position
      myTerritories: this._getOwnedTerritories(),
      myIncome: this._calculateIncome(this.playerId),
      myMilitaryStrength: this._calculateTotalMilitary(this.playerId),
      myCapital: this.gameState.getCapital(this.playerId),
      capitalSafe: true,

      // Opponents
      opponents: [],
      strongestOpponent: null,
      weakestOpponent: null,

      // Strategic situation
      totalTerritories: 0,
      territoryShare: 0,
      incomeShare: 0,
      continentProgress: [],
      threatenedTerritories: [],
      opportunities: [],

      // Victory tracking
      capitalsControlled: 0,
      capitalsNeededForVictory: 0,
      closeToVictory: false,
      opponentCloseToVictory: null,
    };

    // Count all land territories
    const allTerritories = this.gameState.territories?.filter(t => !t.isWater) || [];
    analysis.totalTerritories = allTerritories.length;
    analysis.territoryShare = analysis.myTerritories.length / analysis.totalTerritories;

    // Analyze opponents
    const players = this.gameState.players || [];
    let totalIncome = analysis.myIncome;

    for (const p of players) {
      if (p.id === this.playerId) continue;

      const oppIncome = this._calculateIncome(p.id);
      const oppStrength = this._calculateTotalMilitary(p.id);
      const oppCapital = this.gameState.getCapital(p.id);

      totalIncome += oppIncome;

      analysis.opponents.push({
        id: p.id,
        income: oppIncome,
        strength: oppStrength,
        capital: oppCapital,
        capitalCaptured: oppCapital ? this.gameState.getOwner(oppCapital) !== p.id : false,
      });
    }

    analysis.incomeShare = analysis.myIncome / (totalIncome || 1);

    // Find strongest and weakest opponents
    analysis.opponents.sort((a, b) => b.strength - a.strength);
    if (analysis.opponents.length > 0) {
      analysis.strongestOpponent = analysis.opponents[0];
      analysis.weakestOpponent = analysis.opponents[analysis.opponents.length - 1];
    }

    // Check capital safety
    if (analysis.myCapital) {
      const capitalOwner = this.gameState.getOwner(analysis.myCapital);
      analysis.capitalSafe = capitalOwner === this.playerId;
    }

    // Analyze continent progress
    for (const continent of this.gameState.continents || []) {
      const owned = continent.territories.filter(t =>
        this.gameState.getOwner(t) === this.playerId
      ).length;
      const total = continent.territories.length;
      const progress = owned / total;

      if (progress > 0 && progress < 1) {
        analysis.continentProgress.push({
          name: continent.name,
          bonus: continent.bonus,
          owned,
          total,
          progress,
          remaining: total - owned,
          value: continent.bonus / (total - owned), // Value per territory needed
        });
      }
    }
    analysis.continentProgress.sort((a, b) => b.value - a.value);

    // Find threatened territories
    for (const territory of analysis.myTerritories) {
      const threat = this._calculateThreatLevel(territory);
      if (threat > 0.3) {
        analysis.threatenedTerritories.push({ territory, threat });
      }
    }
    analysis.threatenedTerritories.sort((a, b) => b.threat - a.threat);

    // Victory conditions analysis
    let capitalsControlled = 0;
    let totalCapitals = 0;
    for (const p of players) {
      const capital = this.gameState.getCapital(p.id);
      if (capital) {
        totalCapitals++;
        if (this.gameState.getOwner(capital) === this.playerId) {
          capitalsControlled++;
        }
      }
    }
    analysis.capitalsControlled = capitalsControlled;
    analysis.capitalsNeededForVictory = Math.ceil(totalCapitals * 0.5) + 1;
    analysis.closeToVictory = capitalsControlled >= analysis.capitalsNeededForVictory - 1;

    // Check if any opponent is close to victory
    for (const opp of analysis.opponents) {
      let oppCapitals = 0;
      for (const p of players) {
        const capital = this.gameState.getCapital(p.id);
        if (capital && this.gameState.getOwner(capital) === opp.id) {
          oppCapitals++;
        }
      }
      if (oppCapitals >= analysis.capitalsNeededForVictory - 1) {
        analysis.opponentCloseToVictory = opp;
        break;
      }
    }

    this._cache.gameAnalysis = analysis;
    return analysis;
  }

  // Calculate total income for a player
  _calculateIncome(playerId) {
    let income = 0;
    const capital = this.gameState.getCapital(playerId);

    for (const [territory, state] of Object.entries(this.gameState.territoryState || {})) {
      if (state.owner === playerId) {
        if (territory === capital) {
          income += 10; // Capitals produce 10
        } else {
          const t = this.gameState.territoryByName[territory];
          income += t?.production || 0;
        }
      }
    }

    // Add continent bonuses
    for (const continent of this.gameState.continents || []) {
      if (this.gameState.controlsContinent(playerId, continent.name)) {
        income += continent.bonus;
      }
    }

    return income;
  }

  // Calculate total military power for a player
  _calculateTotalMilitary(playerId) {
    let power = 0;
    const unitDefs = this.gameState.unitDefs || {};

    for (const [territory, units] of Object.entries(this.gameState.units || {})) {
      for (const unit of units) {
        if (unit.owner !== playerId) continue;
        const def = unitDefs[unit.type];
        if (def) {
          // Value based on attack + defense + special abilities
          const value = (def.attack || 0) + (def.defense || 0) + (def.hp || 1) - 1;
          power += value * (unit.quantity || 1);
        }
      }
    }

    return power;
  }

  // ==================== CAPITAL PLACEMENT ====================

  _placeCapital(callbacks) {
    const territories = this._getOwnedTerritories();
    if (territories.length === 0) return { done: true };

    // Score each territory for capital placement
    const scored = territories.map(t => ({
      territory: t,
      score: this._scoreCapitalLocation(t),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Easy AI might pick suboptimally
    let choice;
    if (this.difficulty === 'easy' && Math.random() < this.config.mistakeChance) {
      choice = territories[Math.floor(Math.random() * territories.length)];
    } else {
      choice = scored[0].territory;
    }

    return { action: 'placeCapital', territory: choice };
  }

  _scoreCapitalLocation(territory) {
    let score = 0;
    const connections = this.gameState.getConnections(territory);

    // Get all existing capitals
    const existingCapitals = new Set();
    for (const player of this.gameState.players) {
      if (player.id !== this.playerId) {
        const playerCapital = this.gameState.playerState[player.id]?.capitalTerritory;
        if (playerCapital) {
          existingCapitals.add(playerCapital);
        }
      }
    }

    // CRITICAL: Enforce minimum 2-territory separation between any two capitals
    // Check distance 1 (direct neighbors)
    for (const conn of connections) {
      if (existingCapitals.has(conn)) {
        // Adjacent to another capital (distance 1) - massive penalty, effectively disqualifies
        score -= 500;
      }
    }

    // Check distance 2 (neighbors of neighbors)
    for (const conn of connections) {
      const conn2 = this.gameState.getConnections(conn);
      for (const neighbor2 of conn2) {
        if (existingCapitals.has(neighbor2)) {
          // Within 2 territories of another capital - large penalty, effectively disqualifies
          score -= 300;
        }
      }
    }

    // Also check if this territory IS another player's capital (shouldn't happen but safety check)
    if (existingCapitals.has(territory)) {
      score -= 1000;
    }

    // Prefer territories with more friendly neighbors (defensible)
    const friendlyNeighbors = connections.filter(c =>
      this.gameState.getOwner(c) === this.playerId
    ).length;
    score += friendlyNeighbors * 10;

    // Avoid territories with many enemy neighbors
    const enemyNeighbors = connections.filter(c => {
      const owner = this.gameState.getOwner(c);
      return owner && owner !== this.playerId;
    }).length;
    score -= enemyNeighbors * 8;

    // Prefer high-production territories
    const t = this.gameState.territoryByName[territory];
    score += (t?.production || 0) * 3;

    // Prefer territories with many total connections (strategic hub)
    score += connections.length * 2;

    // Hard AI considers continent completion
    if (this.difficulty === 'hard') {
      const continent = this.gameState.continentByTerritory?.[territory];
      if (continent) {
        const owned = continent.territories.filter(ct =>
          this.gameState.getOwner(ct) === this.playerId
        ).length;
        const progress = owned / continent.territories.length;
        score += progress * continent.bonus * 2;
      }
    }

    return score;
  }

  // ==================== UNIT PLACEMENT (SETUP) ====================

  _placeUnits(callbacks) {
    const placementState = this.gameState.getPlacementState?.();
    if (!placementState) return { done: true };

    const { unitsToPlace, maxPerRound } = placementState;
    if (!unitsToPlace || Object.keys(unitsToPlace).length === 0) {
      return { action: 'finishPlacement' };
    }

    const placements = [];
    let placed = 0;

    for (const [unitType, count] of Object.entries(unitsToPlace)) {
      if (count <= 0) continue;

      const toPlace = Math.min(count, maxPerRound - placed);
      for (let i = 0; i < toPlace; i++) {
        const territory = this._findBestPlacementLocation(unitType);
        if (territory) {
          placements.push({ unitType, territory });
          placed++;
          if (placed >= maxPerRound) break;
        }
      }
      if (placed >= maxPerRound) break;
    }

    return { action: 'placeUnits', placements };
  }

  _findBestPlacementLocation(unitType) {
    const territories = this._getOwnedTerritories();
    const unitDef = this.gameState.unitDefs?.[unitType];

    // Naval units go to sea zones
    if (unitDef?.isSea) {
      const seaZones = this._getAdjacentSeaZones();
      if (seaZones.length > 0) {
        return seaZones[Math.floor(Math.random() * seaZones.length)];
      }
    }

    // Land and air units
    const analysis = this._analyzeGameState();

    // Prioritize frontline territories
    const frontline = territories.filter(t => this._isFrontline(t));

    if (this.difficulty === 'hard') {
      // Hard AI places strategically
      if (unitDef?.attack > unitDef?.defense) {
        // Offensive units go to frontline near weak enemies
        return frontline.length > 0 ? frontline[0] : territories[0];
      } else {
        // Defensive units go to capital or threatened territories
        if (!analysis.capitalSafe && analysis.myCapital) {
          return analysis.myCapital;
        }
        if (analysis.threatenedTerritories.length > 0) {
          return analysis.threatenedTerritories[0].territory;
        }
      }
    }

    // Default: spread units across frontline or random
    if (frontline.length > 0) {
      return frontline[Math.floor(Math.random() * frontline.length)];
    }
    return territories[Math.floor(Math.random() * territories.length)];
  }

  _getAdjacentSeaZones() {
    const seaZones = new Set();
    for (const territory of this._getOwnedTerritories()) {
      const t = this.gameState.territoryByName[territory];
      if (!t) continue;
      for (const conn of t.connections || []) {
        const ct = this.gameState.territoryByName[conn];
        if (ct?.isWater) seaZones.add(conn);
      }
    }
    return Array.from(seaZones);
  }

  // ==================== PURCHASE PHASE ====================

  _purchaseUnits(callbacks) {
    const ipcs = this.gameState.getIPCs(this.playerId);
    if (ipcs <= 0) return { action: 'skipPurchase' };

    const unitDefs = this.gameState.unitDefs;
    if (!unitDefs) return { action: 'skipPurchase' };

    const analysis = this._analyzeGameState();
    const purchases = [];
    let remaining = ipcs;

    // Determine purchase strategy based on situation
    const strategy = this._determinePurchaseStrategy(analysis);

    // Build purchase list based on strategy
    for (const { unitType, ratio } of strategy) {
      const def = unitDefs[unitType];
      if (!def || def.cost > remaining) continue;

      const maxAfford = Math.floor(remaining / def.cost);
      let count = Math.ceil(maxAfford * ratio);

      // Easy AI buys less optimally
      if (this.difficulty === 'easy') {
        count = Math.max(1, Math.floor(count * (0.5 + Math.random() * 0.5)));
      }

      if (count > 0) {
        purchases.push({ unitType, count });
        remaining -= def.cost * count;
      }

      if (remaining < 3) break;
    }

    return { action: 'purchase', purchases };
  }

  _determinePurchaseStrategy(analysis) {
    const strategy = [];

    // CRITICAL: Capital under threat - buy defensive units
    if (!analysis.capitalSafe || analysis.threatenedTerritories.length > 2) {
      strategy.push({ unitType: 'infantry', ratio: 0.6 });
      strategy.push({ unitType: 'artillery', ratio: 0.25 });
      strategy.push({ unitType: 'fighter', ratio: 0.15 });
      return strategy;
    }

    // Close to victory - buy mobile offensive units
    if (analysis.closeToVictory && this.difficulty !== 'easy') {
      strategy.push({ unitType: 'armour', ratio: 0.4 });
      strategy.push({ unitType: 'infantry', ratio: 0.3 });
      strategy.push({ unitType: 'artillery', ratio: 0.2 });
      strategy.push({ unitType: 'fighter', ratio: 0.1 });
      return strategy;
    }

    // Opponent close to victory - aggressive counter
    if (analysis.opponentCloseToVictory && this.difficulty === 'hard') {
      strategy.push({ unitType: 'armour', ratio: 0.35 });
      strategy.push({ unitType: 'infantry', ratio: 0.35 });
      strategy.push({ unitType: 'fighter', ratio: 0.2 });
      strategy.push({ unitType: 'bomber', ratio: 0.1 });
      return strategy;
    }

    // Weaker than opponents - defensive build
    if (analysis.myMilitaryStrength < (analysis.strongestOpponent?.strength || 0) * 0.7) {
      strategy.push({ unitType: 'infantry', ratio: 0.5 });
      strategy.push({ unitType: 'artillery', ratio: 0.3 });
      strategy.push({ unitType: 'armour', ratio: 0.2 });
      return strategy;
    }

    // Stronger than opponents - offensive build
    if (analysis.myMilitaryStrength > (analysis.strongestOpponent?.strength || 0) * 1.3) {
      strategy.push({ unitType: 'armour', ratio: 0.35 });
      strategy.push({ unitType: 'infantry', ratio: 0.3 });
      strategy.push({ unitType: 'artillery', ratio: 0.2 });
      strategy.push({ unitType: 'fighter', ratio: 0.15 });
      return strategy;
    }

    // Default balanced build
    strategy.push({ unitType: 'infantry', ratio: 0.4 });
    strategy.push({ unitType: 'artillery', ratio: 0.25 });
    strategy.push({ unitType: 'armour', ratio: 0.25 });
    strategy.push({ unitType: 'fighter', ratio: 0.1 });
    return strategy;
  }

  // ==================== COMBAT MOVEMENT ====================

  _combatMove(callbacks) {
    const analysis = this._analyzeGameState();
    const moves = [];
    const committedUnits = new Set(); // Track units already committed to attacks

    // PRIORITY 1: Retake own capital if captured
    if (!analysis.capitalSafe && analysis.myCapital) {
      const capitalAttack = this._planCapitalRetake(analysis, committedUnits);
      if (capitalAttack) {
        moves.push(...capitalAttack);
      }
    }

    // PRIORITY 2: Defend against opponent about to win
    if (analysis.opponentCloseToVictory && this.difficulty !== 'easy') {
      const counterAttack = this._planCounterAttack(analysis, committedUnits);
      if (counterAttack) {
        moves.push(...counterAttack);
      }
    }

    // PRIORITY 3: Capture enemy capitals if close to victory
    if (analysis.closeToVictory || this.config.victoryFocus > 0.5) {
      const capitalAssaults = this._planCapitalAssaults(analysis, committedUnits);
      moves.push(...capitalAssaults);
    }

    // PRIORITY 4: Economic expansion - complete continents
    if (analysis.continentProgress.length > 0) {
      const continentAttacks = this._planContinentCompletion(analysis, committedUnits);
      moves.push(...continentAttacks);
    }

    // PRIORITY 5: Opportunistic attacks on weak targets
    const opportunisticAttacks = this._planOpportunisticAttacks(analysis, committedUnits);
    moves.push(...opportunisticAttacks);

    return { action: 'combatMoves', moves };
  }

  _planCapitalRetake(analysis, committedUnits) {
    const moves = [];
    const capital = analysis.myCapital;
    if (!capital) return moves;

    // Gather ALL available forces to retake capital
    const attackForce = this._gatherAttackForce(capital, committedUnits, true);

    if (attackForce.length > 0) {
      for (const { from, units } of attackForce) {
        moves.push({ from, to: capital, units });
        units.forEach(u => committedUnits.add(`${from}_${u.type}`));
      }
    }

    return moves;
  }

  _planCounterAttack(analysis, committedUnits) {
    const moves = [];
    const opponent = analysis.opponentCloseToVictory;
    if (!opponent) return moves;

    // Attack the opponent's capital or their newest conquest
    const target = opponent.capital;
    if (!target) return moves;

    const owner = this.gameState.getOwner(target);
    if (owner === opponent.id) {
      const attack = this._evaluateAndPlanAttack(target, committedUnits, 0.5); // Lower threshold
      if (attack) moves.push(attack);
    }

    return moves;
  }

  _planCapitalAssaults(analysis, committedUnits) {
    const moves = [];

    for (const opponent of analysis.opponents) {
      if (opponent.capitalCaptured) continue; // Already captured
      const capital = opponent.capital;
      if (!capital) continue;

      const owner = this.gameState.getOwner(capital);
      if (owner === this.playerId) continue; // We already own it

      const attack = this._evaluateAndPlanAttack(capital, committedUnits, 0.6);
      if (attack) moves.push(attack);
    }

    return moves;
  }

  _planContinentCompletion(analysis, committedUnits) {
    const moves = [];
    const maxAttacks = this.difficulty === 'hard' ? 3 : this.difficulty === 'medium' ? 2 : 1;

    for (const continentInfo of analysis.continentProgress.slice(0, maxAttacks)) {
      const continent = this.gameState.continents.find(c => c.name === continentInfo.name);
      if (!continent) continue;

      // Find enemy territories in this continent
      for (const territory of continent.territories) {
        const owner = this.gameState.getOwner(territory);
        if (owner === this.playerId) continue;

        const attack = this._evaluateAndPlanAttack(territory, committedUnits);
        if (attack) {
          moves.push(attack);
          break; // One attack per continent per turn
        }
      }
    }

    return moves;
  }

  _planOpportunisticAttacks(analysis, committedUnits) {
    const moves = [];
    const ownedTerritories = this._getOwnedTerritories();

    // Find all possible attacks and score them
    const attackOptions = [];

    for (const territory of ownedTerritories) {
      const connections = this.gameState.getConnections(territory);

      for (const target of connections) {
        const owner = this.gameState.getOwner(target);
        const t = this.gameState.territoryByName[target];

        if (!owner || owner === this.playerId || t?.isWater) continue;

        const evaluation = this._evaluateAttack(territory, target, committedUnits);
        if (evaluation.viable) {
          attackOptions.push({
            from: territory,
            to: target,
            units: evaluation.attackers,
            score: evaluation.score,
            winProbability: evaluation.winProbability,
          });
        }
      }
    }

    // Sort by score and execute best attacks
    attackOptions.sort((a, b) => b.score - a.score);

    const maxAttacks = this.difficulty === 'hard' ? 4 : this.difficulty === 'medium' ? 2 : 1;

    for (let i = 0; i < Math.min(attackOptions.length, maxAttacks); i++) {
      const attack = attackOptions[i];

      // Check if units are still available
      const stillAvailable = attack.units.every(u =>
        !committedUnits.has(`${attack.from}_${u.type}`)
      );

      if (stillAvailable) {
        moves.push({
          from: attack.from,
          to: attack.to,
          units: attack.units,
        });
        attack.units.forEach(u => committedUnits.add(`${attack.from}_${u.type}`));
      }
    }

    return moves;
  }

  _evaluateAndPlanAttack(target, committedUnits, minWinProb = null) {
    const minProb = minWinProb || (1 - this.config.minAttackRatio * 0.3);
    const attackForce = this._gatherAttackForce(target, committedUnits);

    if (attackForce.length === 0) return null;

    // Combine all attack forces
    const combinedUnits = [];
    let totalPower = 0;

    for (const { from, units } of attackForce) {
      for (const unit of units) {
        const def = this.gameState.unitDefs?.[unit.type];
        totalPower += (def?.attack || 0) * unit.quantity;
        combinedUnits.push({ from, ...unit });
      }
    }

    const defenderPower = this._calculateDefensePower(target);
    const winProb = this._estimateWinProbability(totalPower, defenderPower);

    if (winProb >= minProb) {
      // Return the first source with the combined attack
      const primary = attackForce[0];
      return {
        from: primary.from,
        to: target,
        units: primary.units,
      };
    }

    return null;
  }

  _evaluateAttack(fromTerritory, toTerritory, committedUnits) {
    const units = this.gameState.getUnits(fromTerritory, this.playerId) || [];

    // Filter out committed and immobile units
    const available = units.filter(u => {
      if (committedUnits.has(`${fromTerritory}_${u.type}`)) return false;
      const def = this.gameState.unitDefs?.[u.type];
      return def && def.attack > 0 && !u.moved;
    });

    if (available.length === 0) {
      return { viable: false };
    }

    const attackPower = this._calculateAttackPower(available);
    const defensePower = this._calculateDefensePower(toTerritory);
    const winProbability = this._estimateWinProbability(attackPower, defensePower);

    // Calculate strategic value
    let score = winProbability * 10;
    score += this._evaluateTargetValue(toTerritory);

    // Easy AI requires higher odds
    const minWinProb = 1 - this.config.minAttackRatio * 0.35;
    const viable = winProbability >= minWinProb;

    // Don't attack if it would leave territory defenseless (except hard AI)
    if (this.difficulty !== 'hard') {
      const remainingDefense = this._calculateDefenseAfterAttack(fromTerritory, available);
      if (remainingDefense < defensePower * 0.5) {
        return { viable: false };
      }
    }

    return {
      viable,
      attackers: available.map(u => ({ type: u.type, quantity: u.quantity })),
      score,
      winProbability,
    };
  }

  _gatherAttackForce(target, committedUnits, allIn = false) {
    const forces = [];
    const connections = this.gameState.getConnections(target);

    for (const territory of connections) {
      if (this.gameState.getOwner(territory) !== this.playerId) continue;

      const units = this.gameState.getUnits(territory, this.playerId) || [];
      const available = units.filter(u => {
        if (committedUnits.has(`${territory}_${u.type}`)) return false;
        const def = this.gameState.unitDefs?.[u.type];
        return def && def.attack > 0 && !u.moved;
      });

      if (available.length === 0) continue;

      // Decide how many to send
      let attackers;
      if (allIn) {
        // Send everything for capital retake
        attackers = available.map(u => ({ type: u.type, quantity: u.quantity }));
      } else {
        // Keep some for defense based on difficulty
        const keepRatio = this.config.reserveDefense;
        attackers = available.map(u => ({
          type: u.type,
          quantity: Math.max(1, Math.floor(u.quantity * (1 - keepRatio))),
        })).filter(u => u.quantity > 0);
      }

      if (attackers.length > 0) {
        forces.push({ from: territory, units: attackers });
      }
    }

    return forces;
  }

  _evaluateTargetValue(territory) {
    let value = 0;
    const t = this.gameState.territoryByName[territory];

    // Production value
    value += (t?.production || 1) * 2;

    // Capital value
    if (this.gameState.isCapital?.(territory)) {
      const isMyCapital = territory === this.gameState.getCapital(this.playerId);
      value += isMyCapital ? 100 : 30; // Huge bonus for own capital
    }

    // Continent completion value
    const continent = this.gameState.continentByTerritory?.[territory];
    if (continent) {
      const owned = continent.territories.filter(ct =>
        this.gameState.getOwner(ct) === this.playerId
      ).length;
      const wouldComplete = owned === continent.territories.length - 1;
      if (wouldComplete) {
        value += continent.bonus * 3;
      }
    }

    // Strategic position
    const connections = this.gameState.getConnections(territory);
    value += connections.length;

    return value * this.config.economicWeight;
  }

  // ==================== COMBAT RESOLUTION ====================

  _resolveCombat(callbacks) {
    return { action: 'autoCombat' };
  }

  // ==================== NON-COMBAT MOVEMENT ====================

  _nonCombatMove(callbacks) {
    const moves = [];
    const analysis = this._analyzeGameState();

    // Reinforce threatened territories
    for (const { territory, threat } of analysis.threatenedTerritories) {
      const reinforcements = this._findReinforcements(territory);
      if (reinforcements.length > 0) {
        moves.push(...reinforcements);
      }
    }

    // Reinforce capital
    if (analysis.myCapital) {
      const capitalReinforcements = this._findReinforcements(analysis.myCapital, true);
      moves.push(...capitalReinforcements);
    }

    // Move units towards frontline
    const interiorUnits = this._findInteriorUnits();
    for (const { territory, units } of interiorUnits) {
      const frontline = this._findNearestFrontline(territory);
      if (frontline) {
        moves.push({
          from: territory,
          to: frontline,
          count: Math.floor(units * 0.7),
        });
      }
    }

    return { action: 'nonCombatMoves', moves };
  }

  _findReinforcements(target, isCapital = false) {
    const moves = [];
    const connections = this.gameState.getConnections(target);

    for (const territory of connections) {
      if (this.gameState.getOwner(territory) !== this.playerId) continue;
      if (this._isFrontline(territory) && !isCapital) continue; // Don't weaken frontline

      const units = this.gameState.getUnits(territory, this.playerId) || [];
      const totalUnits = units.reduce((sum, u) => sum + u.quantity, 0);

      if (totalUnits > 1) {
        moves.push({
          from: territory,
          to: target,
          count: Math.floor(totalUnits * 0.5),
        });
      }
    }

    return moves;
  }

  _findInteriorUnits() {
    const interior = [];

    for (const territory of this._getOwnedTerritories()) {
      if (this._isFrontline(territory)) continue;

      const units = this.gameState.getUnits(territory, this.playerId) || [];
      const totalUnits = units.reduce((sum, u) => sum + u.quantity, 0);

      if (totalUnits > 1) {
        interior.push({ territory, units: totalUnits });
      }
    }

    return interior;
  }

  _findNearestFrontline(territory) {
    const visited = new Set([territory]);
    const queue = [territory];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current !== territory && this._isFrontline(current)) {
        return current;
      }

      for (const conn of this.gameState.getConnections(current)) {
        if (visited.has(conn)) continue;
        if (this.gameState.getOwner(conn) !== this.playerId) continue;
        visited.add(conn);
        queue.push(conn);
      }
    }

    return null;
  }

  // ==================== MOBILIZE ====================

  _mobilize(callbacks) {
    const pending = this.gameState.getPendingPurchases?.(this.playerId);
    if (!pending || pending.length === 0) return { action: 'skipMobilize' };

    const capital = this.gameState.getCapital(this.playerId);
    if (!capital) return { action: 'skipMobilize' };

    // Hard AI distributes to multiple factories
    if (this.difficulty === 'hard') {
      const factories = this._getFactoryLocations();
      if (factories.length > 1) {
        // Place at frontline factory if available
        const frontlineFactory = factories.find(f => this._isFrontline(f));
        if (frontlineFactory) {
          return { action: 'mobilize', territory: frontlineFactory };
        }
      }
    }

    return { action: 'mobilize', territory: capital };
  }

  _getFactoryLocations() {
    const factories = [];

    for (const [territory, units] of Object.entries(this.gameState.units || {})) {
      if (this.gameState.getOwner(territory) !== this.playerId) continue;
      if (units.some(u => u.type === 'factory')) {
        factories.push(territory);
      }
    }

    return factories;
  }

  // ==================== UTILITY METHODS ====================

  _getOwnedTerritories() {
    if (this._cache.ownedTerritories) return this._cache.ownedTerritories;

    const owned = (this.gameState.territories || [])
      .filter(t => !t.isWater && this.gameState.getOwner(t.name) === this.playerId)
      .map(t => t.name);

    this._cache.ownedTerritories = owned;
    return owned;
  }

  _isFrontline(territory) {
    const connections = this.gameState.getConnections(territory);
    return connections.some(c => {
      const owner = this.gameState.getOwner(c);
      const t = this.gameState.territoryByName[c];
      return owner && owner !== this.playerId && !t?.isWater;
    });
  }

  _calculateThreatLevel(territory) {
    const myUnits = this.gameState.getUnits(territory, this.playerId) || [];
    const myPower = this._calculateDefensePower(territory);

    let maxEnemyPower = 0;
    for (const conn of this.gameState.getConnections(territory)) {
      const owner = this.gameState.getOwner(conn);
      if (owner && owner !== this.playerId) {
        const enemyUnits = this.gameState.getUnits(conn, owner) || [];
        const power = this._calculateAttackPower(enemyUnits);
        maxEnemyPower = Math.max(maxEnemyPower, power);
      }
    }

    if (maxEnemyPower === 0) return 0;
    if (myPower === 0) return 1;
    return Math.min(1, maxEnemyPower / (myPower * 1.5));
  }

  _calculateAttackPower(units) {
    let power = 0;
    for (const unit of units) {
      const def = this.gameState.unitDefs?.[unit.type];
      if (def) {
        power += (def.attack || 0) * (unit.quantity || 1);
      }
    }
    return power;
  }

  _calculateDefensePower(territory) {
    const units = this.gameState.getUnits(territory) || [];
    let power = 0;
    for (const unit of units) {
      if (unit.owner === this.playerId) continue;
      const def = this.gameState.unitDefs?.[unit.type];
      if (def) {
        power += (def.defense || 0) * (unit.quantity || 1);
      }
    }
    return power;
  }

  _calculateDefenseAfterAttack(territory, attackers) {
    const units = this.gameState.getUnits(territory, this.playerId) || [];
    let power = 0;

    for (const unit of units) {
      const attacker = attackers.find(a => a.type === unit.type);
      const remaining = attacker ? unit.quantity - attacker.quantity : unit.quantity;
      if (remaining > 0) {
        const def = this.gameState.unitDefs?.[unit.type];
        if (def) {
          power += (def.defense || 0) * remaining;
        }
      }
    }

    return power;
  }

  _estimateWinProbability(attackPower, defensePower) {
    if (defensePower === 0) return 1.0;
    if (attackPower === 0) return 0.0;

    const ratio = attackPower / defensePower;
    if (ratio >= 3) return 0.95;
    if (ratio >= 2.5) return 0.90;
    if (ratio >= 2) return 0.80;
    if (ratio >= 1.5) return 0.65;
    if (ratio >= 1.2) return 0.55;
    if (ratio >= 1) return 0.45;
    if (ratio >= 0.8) return 0.30;
    return 0.15;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
