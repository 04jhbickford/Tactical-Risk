// Central game state for all game modes

export const GAME_PHASES = {
  LOBBY: 'lobby',
  CAPITAL_PLACEMENT: 'capital_placement',
  UNIT_PLACEMENT: 'unit_placement',
  PLAYING: 'playing',
};

// Turn phases within PLAYING
export const TURN_PHASES = {
  DEVELOP_TECH: 'develop_tech',
  PURCHASE: 'purchase',
  COMBAT_MOVE: 'combat_move',
  COMBAT: 'combat',
  NON_COMBAT_MOVE: 'non_combat_move',
  MOBILIZE: 'mobilize',
  COLLECT_INCOME: 'collect_income',
};

export const TURN_PHASE_ORDER = [
  TURN_PHASES.DEVELOP_TECH,
  TURN_PHASES.PURCHASE,
  TURN_PHASES.COMBAT_MOVE,
  TURN_PHASES.COMBAT,
  TURN_PHASES.NON_COMBAT_MOVE,
  TURN_PHASES.MOBILIZE,
  TURN_PHASES.COLLECT_INCOME,
];

export const TURN_PHASE_NAMES = {
  [TURN_PHASES.DEVELOP_TECH]: 'Develop Tech',
  [TURN_PHASES.PURCHASE]: 'Purchase Units',
  [TURN_PHASES.COMBAT_MOVE]: 'Combat Movement',
  [TURN_PHASES.COMBAT]: 'Conduct Combat',
  [TURN_PHASES.NON_COMBAT_MOVE]: 'Non-Combat Movement',
  [TURN_PHASES.MOBILIZE]: 'Mobilize Units',
  [TURN_PHASES.COLLECT_INCOME]: 'Collect Income',
};

// Available technologies (A&A style)
export const TECHNOLOGIES = {
  jets: { name: 'Jets', description: 'Fighters +1 attack/defense' },
  rockets: { name: 'Rockets', description: 'AA guns can bombard adjacent territories' },
  superSubs: { name: 'Super Submarines', description: 'Submarines +1 attack' },
  longRangeAircraft: { name: 'Long Range Aircraft', description: 'Aircraft +2 movement' },
  heavyBombers: { name: 'Heavy Bombers', description: 'Bombers roll 2 dice in combat' },
  industrialTech: { name: 'Industrial Technology', description: 'Units cost -1 IPC (min 1)' },
};

// RISK card trade values (escalating)
export const RISK_CARD_VALUES = [12, 18, 24, 30, 36, 45, 60, 75];

// Land bridges - allow land movement between these territories without naval transport
export const LAND_BRIDGES = [
  ['Alaska', 'Soviet Far East'],
  ['East Canada', 'Eire'],
  ['Brazil', 'French West Africa'],
  ['East US', 'Cuba'],
  ['Eire', 'United Kingdom'],
  ['United Kingdom', 'Finland Norway'],
  ['Spain', 'Algeria'],
  ['South Europe', 'Algeria'],
  ['South Europe', 'Anglo Sudan Egypt'],
  ['Kwangtung', 'East Indies'],
  ['East Indies', 'Australia'],
  ['Australia', 'New Zealand'],
  ['Kenya-Rhodesia', 'Madagascar'],
];

// Starting IPCs by player count for Risk mode
export const STARTING_IPCS_BY_PLAYER_COUNT = {
  2: 35,
  3: 30,
  4: 21,
  5: 18,
  6: 15,
  7: 12,
};

// Starting units for Risk mode (per player)
export const RISK_STARTING_UNITS = {
  land: [
    { type: 'bomber', quantity: 1 },
    { type: 'fighter', quantity: 1 },
    { type: 'tacticalBomber', quantity: 1 },
    { type: 'armour', quantity: 3 },
    { type: 'artillery', quantity: 3 },
    { type: 'infantry', quantity: 9 },
    { type: 'factory', quantity: 1 },
  ],
  naval: [
    { type: 'battleship', quantity: 1 },
    { type: 'carrier', quantity: 1 },
    { type: 'fighter', quantity: 1 }, // On carrier
    { type: 'cruiser', quantity: 1 },
    { type: 'destroyer', quantity: 1 },
    { type: 'submarine', quantity: 1 },
    { type: 'transport', quantity: 1 },
  ],
};

export class GameState {
  constructor(setup, territories, continents) {
    this.setup = setup;
    this.territories = territories;
    this.continents = continents;
    this.gameMode = null;
    this.alliancesEnabled = false;

    this.players = [];
    this.currentPlayerIndex = 0;
    this.round = 1;
    this.phase = GAME_PHASES.LOBBY;
    this.turnPhase = TURN_PHASES.PURCHASE;

    // Territory state: { territoryName: { owner: playerId, isCapital: bool } }
    this.territoryState = {};

    // Units: { territoryName: [{ type, quantity, owner, moved?: bool }] }
    this.units = {};

    // Player resources: { playerId: { ipcs, hasPlacedCapital, capitalTerritory } }
    this.playerState = {};

    // Pending purchases for current turn: [{ type, quantity, territory }]
    this.pendingPurchases = [];

    // Territories with pending combat
    this.combatQueue = [];

    // Movement history for current turn: [{ from, to, units }]
    this.moveHistory = [];

    // Victory state
    this.gameOver = false;
    this.winner = null; // 'Allies', 'Axis', or player name
    this.winCondition = null;

    // Combat log for current round
    this.combatLog = [];

    // Tech research state: { playerId: { techTokens: n, unlockedTechs: [] } }
    this.playerTechs = {};

    // RISK cards: { playerId: [ 'infantry', 'cavalry', 'artillery', 'wild' ] }
    this.riskCards = {};
    // Track how many times each player has traded cards (for escalating values)
    this.cardTradeCount = {};

    // Placement history for undo: [{ territory, unitType, owner }]
    this.placementHistory = [];

    // Initial setup state for Risk mode
    this.unitsToPlace = {}; // { playerId: [{ type, quantity }] }
    this.unitsPlacedThisRound = 0;
    this.placementRound = 0;

    // Build lookups
    this.territoryByName = {};
    this.landTerritories = [];
    for (const t of territories) {
      this.territoryByName[t.name] = t;
      if (!t.isWater) {
        this.landTerritories.push(t);
      }
    }

    this.continentByTerritory = {};
    for (const c of continents) {
      for (const tName of c.territories) {
        this.continentByTerritory[tName] = c;
      }
    }

    this._listeners = [];
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getPlayerColor(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.color : '#888888';
  }

  getPlayerLightColor(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.lightColor : '#aaaaaa';
  }

  getPlayerFlag(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player?.flag || null;
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  // Initialize game based on mode
  initGame(mode, selectedPlayers, options = {}) {
    this.gameMode = mode;
    this.alliancesEnabled = options.alliancesEnabled || (mode === 'classic');

    if (mode === 'classic') {
      this._initClassicMode(selectedPlayers);
    } else if (mode === 'risk') {
      this._initRiskMode(selectedPlayers);
    }

    this._notify();
  }

  // Check if two players are allies
  areAllies(playerId1, playerId2) {
    if (!this.alliancesEnabled) return false;
    const p1 = this.players.find(p => p.id === playerId1);
    const p2 = this.players.find(p => p.id === playerId2);
    if (!p1 || !p2) return false;
    return p1.alliance && p1.alliance === p2.alliance;
  }

  // Get alliance for a player
  getAlliance(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player?.alliance || null;
  }

  _initClassicMode(selectedPlayers) {
    const classicData = this.setup.classic;

    this.players = selectedPlayers.map((p, i) => ({
      ...p,
      turnOrder: i,
    }));

    // Set territory ownership from classic data
    for (const [territory, owner] of Object.entries(classicData.territoryOwners)) {
      this.territoryState[territory] = {
        owner: owner,
        isCapital: false,
      };
    }

    // Set unit placements from classic data
    for (const [territory, placements] of Object.entries(classicData.unitPlacements)) {
      this.units[territory] = placements.map(p => ({ ...p }));
    }

    // Initialize player state with starting PUs
    for (const p of this.players) {
      const factionData = classicData.factions.find(f => f.id === p.id);
      this.playerState[p.id] = {
        ipcs: factionData?.startingPUs || 0,
        hasPlacedCapital: true,
        capitalTerritory: null,
      };
    }

    this.phase = GAME_PHASES.PLAYING;
    this.currentPlayerIndex = 0;
  }

  _initRiskMode(selectedPlayers) {
    const riskData = this.setup.risk;
    const playerCount = selectedPlayers.length;

    // Dynamic starting IPCs based on player count
    const startingIPCs = STARTING_IPCS_BY_PLAYER_COUNT[playerCount] || 18;

    this.players = selectedPlayers.map((p, i) => ({
      ...p,
      turnOrder: i,
    }));

    // Initialize player state
    for (const p of this.players) {
      this.playerState[p.id] = {
        ipcs: startingIPCs,
        hasPlacedCapital: false,
        capitalTerritory: null,
      };

      // Initialize tech state
      this.playerTechs[p.id] = {
        techTokens: 0,
        unlockedTechs: [],
      };

      // Initialize RISK cards
      this.riskCards[p.id] = [];
      this.cardTradeCount[p.id] = 0;

      // Initialize units to place (deep copy)
      this.unitsToPlace[p.id] = [
        ...RISK_STARTING_UNITS.land.map(u => ({ ...u })),
        ...RISK_STARTING_UNITS.naval.map(u => ({ ...u })),
      ];
    }

    // Randomly assign territories
    this._assignTerritories();

    // Place 1 infantry on each territory
    this._placeStartingInfantry();

    this.phase = GAME_PHASES.CAPITAL_PLACEMENT;
    this.currentPlayerIndex = 0;
    this.placementRound = 1;
  }

  _assignTerritories() {
    const shuffled = [...this.landTerritories].sort(() => Math.random() - 0.5);

    let playerIndex = 0;
    for (const t of shuffled) {
      const player = this.players[playerIndex];
      this.territoryState[t.name] = {
        owner: player.id,
        isCapital: false,
      };
      playerIndex = (playerIndex + 1) % this.players.length;
    }
  }

  _placeStartingInfantry() {
    for (const [territoryName, state] of Object.entries(this.territoryState)) {
      this.units[territoryName] = [{
        type: 'infantry',
        quantity: 1,
        owner: state.owner,
      }];
    }
  }

  getOwner(territoryName) {
    return this.territoryState[territoryName]?.owner || null;
  }

  isCapital(territoryName) {
    return this.territoryState[territoryName]?.isCapital || false;
  }

  getCapital(playerId) {
    return this.playerState[playerId]?.capitalTerritory || null;
  }

  getConnections(territoryName) {
    const territory = this.territoryByName[territoryName];
    const baseConnections = territory?.connections || [];

    // Add land bridge connections
    const landBridgeConnections = [];
    for (const [t1, t2] of LAND_BRIDGES) {
      if (t1 === territoryName && !baseConnections.includes(t2)) {
        landBridgeConnections.push(t2);
      } else if (t2 === territoryName && !baseConnections.includes(t1)) {
        landBridgeConnections.push(t1);
      }
    }

    return [...baseConnections, ...landBridgeConnections];
  }

  // Check if two territories are connected by land bridge
  hasLandBridge(t1Name, t2Name) {
    for (const [a, b] of LAND_BRIDGES) {
      if ((a === t1Name && b === t2Name) || (a === t2Name && b === t1Name)) {
        return true;
      }
    }
    return false;
  }

  isWater(territoryName) {
    const territory = this.territoryByName[territoryName];
    return territory?.isWater || false;
  }

  getUnitsAt(territoryName) {
    return this.units[territoryName] || [];
  }

  getUnits(territoryName, playerId = null) {
    const units = this.units[territoryName] || [];
    if (playerId) {
      return units.filter(u => u.owner === playerId);
    }
    return units;
  }

  getIPCs(playerId) {
    return this.playerState[playerId]?.ipcs || 0;
  }

  getPlayerTerritories(playerId) {
    return Object.entries(this.territoryState)
      .filter(([_, state]) => state.owner === playerId)
      .map(([name, _]) => name);
  }

  controlsContinent(playerId, continentName) {
    const continent = this.continents.find(c => c.name === continentName);
    if (!continent) return false;
    return continent.territories.every(t => this.getOwner(t) === playerId);
  }

  getContinentBonuses(playerId) {
    const bonuses = [];
    for (const c of this.continents) {
      if (this.controlsContinent(playerId, c.name)) {
        bonuses.push({ name: c.name, bonus: c.bonus });
      }
    }
    return bonuses;
  }

  getAdjacentSeaZones(territoryName) {
    const territory = this.territoryByName[territoryName];
    if (!territory) return [];
    return territory.connections.filter(conn => {
      const t = this.territoryByName[conn];
      return t && t.isWater;
    });
  }

  // Place capital for current player (Risk mode)
  placeCapital(territoryName) {
    const player = this.currentPlayer;
    if (!player) return false;

    const state = this.territoryState[territoryName];
    if (!state || state.owner !== player.id) return false;

    state.isCapital = true;
    this.playerState[player.id].hasPlacedCapital = true;
    this.playerState[player.id].capitalTerritory = territoryName;

    // Factory is now part of starting units, but add AA gun for capital defense
    const units = this.units[territoryName] || [];
    units.push({ type: 'aaGun', quantity: 1, owner: player.id });
    this.units[territoryName] = units;

    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.phase = GAME_PHASES.UNIT_PLACEMENT;
      this.unitsPlacedThisRound = 0;
    }

    this._notify();
    return true;
  }

  // Get units that current player still needs to place (Risk mode)
  getUnitsToPlace(playerId) {
    return this.unitsToPlace[playerId] || [];
  }

  // Check if player has units left to place
  hasUnitsToPlace(playerId) {
    const units = this.unitsToPlace[playerId] || [];
    return units.some(u => u.quantity > 0);
  }

  // Get total unit count left to place
  getTotalUnitsToPlace(playerId) {
    const units = this.unitsToPlace[playerId] || [];
    return units.reduce((sum, u) => sum + u.quantity, 0);
  }

  // Place an initial unit during Risk setup (6-unit rounds)
  placeInitialUnit(territoryName, unitType, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    // Check if player has this unit to place
    const unitsToPlace = this.unitsToPlace[player.id] || [];
    const unitEntry = unitsToPlace.find(u => u.type === unitType && u.quantity > 0);
    if (!unitEntry) {
      return { success: false, error: `No ${unitType} available to place` };
    }

    const unitDef = unitDefs[unitType];
    if (!unitDef) return { success: false, error: 'Unknown unit type' };

    // Validate placement location
    const capital = this.playerState[player.id]?.capitalTerritory;
    const territory = this.territoryByName[territoryName];
    if (!territory) return { success: false, error: 'Unknown territory' };

    // Naval units: can be placed on any sea zone adjacent to ANY owned coastal territory
    if (unitDef.isSea) {
      const ownedCoastal = this.getPlayerTerritories(player.id).filter(tName => {
        const t = this.territoryByName[tName];
        return t && !t.isWater && t.connections.some(conn => {
          const ct = this.territoryByName[conn];
          return ct && ct.isWater;
        });
      });
      const validSeaZones = new Set();
      for (const coastal of ownedCoastal) {
        const t = this.territoryByName[coastal];
        for (const conn of t.connections) {
          const ct = this.territoryByName[conn];
          if (ct && ct.isWater) validSeaZones.add(conn);
        }
      }
      if (!validSeaZones.has(territoryName)) {
        return { success: false, error: 'Naval units must be placed on sea zones adjacent to your coastal territories' };
      }
    } else {
      // Land/air units: must be placed on owned territory
      const owner = this.getOwner(territoryName);
      if (owner !== player.id) {
        return { success: false, error: 'Must place on your own territory' };
      }
    }

    // Place the unit
    unitEntry.quantity--;
    const units = this.units[territoryName] || [];
    const existing = units.find(u => u.type === unitType && u.owner === player.id);
    if (existing) {
      existing.quantity++;
    } else {
      units.push({ type: unitType, quantity: 1, owner: player.id });
    }
    this.units[territoryName] = units;

    // Track placement for undo
    this.placementHistory.push({
      territory: territoryName,
      unitType,
      owner: player.id,
    });

    this.unitsPlacedThisRound++;

    this._notify();
    return { success: true, unitsPlacedThisRound: this.unitsPlacedThisRound };
  }

  // Undo last unit placement
  undoPlacement() {
    if (this.placementHistory.length === 0) return false;

    const player = this.currentPlayer;
    if (!player) return false;

    const lastPlacement = this.placementHistory.pop();
    if (lastPlacement.owner !== player.id) {
      // Shouldn't happen, but restore and return
      this.placementHistory.push(lastPlacement);
      return false;
    }

    // Remove unit from territory
    const units = this.units[lastPlacement.territory] || [];
    const unitEntry = units.find(u => u.type === lastPlacement.unitType && u.owner === player.id);
    if (unitEntry) {
      unitEntry.quantity--;
      if (unitEntry.quantity <= 0) {
        const idx = units.indexOf(unitEntry);
        units.splice(idx, 1);
      }
    }

    // If it was a purchased unit, refund IPCs
    if (lastPlacement.purchased && lastPlacement.cost) {
      this.playerState[player.id].ipcs += lastPlacement.cost;
    } else {
      // If it was from starting units, restore to pool
      const unitsToPlace = this.unitsToPlace[player.id] || [];
      const poolEntry = unitsToPlace.find(u => u.type === lastPlacement.unitType);
      if (poolEntry) {
        poolEntry.quantity++;
      } else {
        unitsToPlace.push({ type: lastPlacement.unitType, quantity: 1 });
      }
      this.unitsPlacedThisRound = Math.max(0, this.unitsPlacedThisRound - 1);
    }

    this._notify();
    return true;
  }

  // Finish current player's placement round (6 units max, or all remaining)
  finishPlacementRound() {
    const player = this.currentPlayer;
    if (!player) return;

    this.unitsPlacedThisRound = 0;
    this.placementHistory = []; // Clear undo history for this round

    // Move to next player
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.placementRound++;

      // Check if all players have finished placing all units
      const anyPlayerHasUnits = this.players.some(p => this.hasUnitsToPlace(p.id));
      if (!anyPlayerHasUnits) {
        // All units placed, move to playing phase
        this.phase = GAME_PHASES.PLAYING;
        this.turnPhase = TURN_PHASES.DEVELOP_TECH;
      }
    }

    this._notify();
  }

  // Purchase and place a unit (Risk mode - used during initial deployment for buying extra units)
  purchaseUnit(unitType, territoryName, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return false;

    const unitDef = unitDefs[unitType];
    if (!unitDef) return false;

    const cost = unitDef.cost;
    if (this.playerState[player.id].ipcs < cost) return false;

    const capital = this.playerState[player.id].capitalTerritory;

    if (unitDef.isSea) {
      // During unit placement, allow placement on any sea adjacent to ANY owned coastal territory
      const ownedCoastal = this.getPlayerTerritories(player.id).filter(tName => {
        const t = this.territoryByName[tName];
        return t && !t.isWater && t.connections.some(conn => {
          const ct = this.territoryByName[conn];
          return ct && ct.isWater;
        });
      });
      const validSeaZones = new Set();
      for (const coastal of ownedCoastal) {
        const t = this.territoryByName[coastal];
        for (const conn of t.connections) {
          const ct = this.territoryByName[conn];
          if (ct && ct.isWater) validSeaZones.add(conn);
        }
      }
      if (!validSeaZones.has(territoryName)) return false;
    } else {
      // Land/air units can only be placed at capital during purchase
      if (territoryName !== capital) return false;
    }

    this.playerState[player.id].ipcs -= cost;

    const units = this.units[territoryName] || [];
    const existing = units.find(u => u.type === unitType && u.owner === player.id);
    if (existing) {
      existing.quantity++;
    } else {
      units.push({ type: unitType, quantity: 1, owner: player.id });
    }
    this.units[territoryName] = units;

    // Track for undo
    this.placementHistory.push({
      territory: territoryName,
      unitType,
      owner: player.id,
      purchased: true,
      cost,
    });

    this._notify();
    return true;
  }

  finishPlacement() {
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.phase = GAME_PHASES.PLAYING;
    }
    this._notify();
  }

  nextTurn() {
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.round++;
      // Clear combat log at start of new round
      this.clearCombatLog();
    }
    // Reset turn state - start with tech development phase
    this.turnPhase = TURN_PHASES.DEVELOP_TECH;
    this.pendingPurchases = [];
    this.combatQueue = [];
    this.moveHistory = [];
    this.placementHistory = [];
    this._clearMovedFlags();
    this._notify();
    this.autoSave(); // Auto-save after each turn
  }

  // Check if a phase should be skipped (nothing to do)
  _shouldSkipPhase(phase) {
    const player = this.currentPlayer;
    if (!player) return false;

    switch (phase) {
      case TURN_PHASES.COMBAT:
        // Skip if no combats pending
        this._detectCombats();
        return this.combatQueue.length === 0;

      case TURN_PHASES.MOBILIZE:
        // Skip if nothing was purchased
        return this.pendingPurchases.length === 0;

      default:
        return false;
    }
  }

  // Advance to the next turn phase
  nextPhase() {
    let currentIndex = TURN_PHASE_ORDER.indexOf(this.turnPhase);

    while (currentIndex < TURN_PHASE_ORDER.length - 1) {
      currentIndex++;
      const nextPhase = TURN_PHASE_ORDER[currentIndex];

      // Handle special phase transitions
      if (nextPhase === TURN_PHASES.COMBAT) {
        this._detectCombats();
        // Skip if no combats
        if (this.combatQueue.length === 0) {
          continue;
        }
      } else if (nextPhase === TURN_PHASES.MOBILIZE) {
        this._mobilizePurchases();
        // Skip if nothing was purchased (mobilize already done)
        if (this.pendingPurchases.length === 0) {
          continue;
        }
      } else if (nextPhase === TURN_PHASES.COLLECT_INCOME) {
        this._collectIncome();
        // Auto-advance to next player
        this.nextTurn();
        return;
      }

      // Set the phase and break
      this.turnPhase = nextPhase;
      break;
    }

    this._notify();
    this.autoSave(); // Auto-save after each phase change
  }

  // Get current turn phase name
  getTurnPhaseName() {
    return TURN_PHASE_NAMES[this.turnPhase] || this.turnPhase;
  }

  // Purchase units (during PURCHASE phase)
  purchaseForMobilization(unitType, quantity, unitDefs) {
    if (this.turnPhase !== TURN_PHASES.PURCHASE) return false;

    const player = this.currentPlayer;
    if (!player) return false;

    const unitDef = unitDefs[unitType];
    if (!unitDef) return false;

    const totalCost = unitDef.cost * quantity;
    if (this.playerState[player.id].ipcs < totalCost) return false;

    this.playerState[player.id].ipcs -= totalCost;

    // Add to pending purchases
    const existing = this.pendingPurchases.find(p => p.type === unitType);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.pendingPurchases.push({ type: unitType, quantity });
    }

    this._notify();
    return true;
  }

  // Move units (during COMBAT_MOVE or NON_COMBAT_MOVE phase)
  moveUnits(fromTerritory, toTerritory, unitsToMove, unitDefs) {
    const isCombatMove = this.turnPhase === TURN_PHASES.COMBAT_MOVE;
    const isNonCombatMove = this.turnPhase === TURN_PHASES.NON_COMBAT_MOVE;

    if (!isCombatMove && !isNonCombatMove) return { success: false, error: 'Not in movement phase' };

    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    // Validate territories are connected (includes land bridges)
    const fromT = this.territoryByName[fromTerritory];
    const connections = this.getConnections(fromTerritory);
    const isLandBridge = this.hasLandBridge(fromTerritory, toTerritory);

    if (!fromT || !connections.includes(toTerritory)) {
      return { success: false, error: 'Territories not connected' };
    }

    // Check destination
    const toOwner = this.getOwner(toTerritory);
    const toT = this.territoryByName[toTerritory];
    const isEnemy = toOwner && toOwner !== player.id && !this.areAllies(player.id, toOwner);
    const isAllied = toOwner && toOwner !== player.id && this.areAllies(player.id, toOwner);

    // Non-combat move rules
    if (isNonCombatMove) {
      // Cannot enter enemy territory
      if (isEnemy) {
        return { success: false, error: 'Cannot enter enemy territory in non-combat move' };
      }
      // Can freely pass through allied territories
    }

    // Combat move rules - can move through friendly and allied territories to reach enemy
    // (Allied territories are passable during combat move)

    // Validate and move each unit
    const fromUnits = this.units[fromTerritory] || [];

    for (const moveUnit of unitsToMove) {
      const unitDef = unitDefs[moveUnit.type];
      if (!unitDef) continue;

      // Find the unit in source territory
      const sourceUnit = fromUnits.find(u =>
        u.type === moveUnit.type &&
        u.owner === player.id &&
        !u.moved
      );

      if (!sourceUnit || sourceUnit.quantity < moveUnit.quantity) {
        return { success: false, error: `Not enough ${moveUnit.type} to move` };
      }

      // Check movement rules
      // Land bridges allow land units to cross without naval transport
      if (isLandBridge) {
        // Land bridges only allow land/air units, not naval
        if (unitDef.isSea) {
          return { success: false, error: 'Naval units cannot use land bridges' };
        }
      } else {
        // Normal movement rules
        if (unitDef.isLand && toT?.isWater) {
          return { success: false, error: 'Land units cannot enter water' };
        }
        if (unitDef.isSea && !toT?.isWater) {
          return { success: false, error: 'Sea units cannot enter land' };
        }
      }

      // Perform the move
      sourceUnit.quantity -= moveUnit.quantity;
      if (sourceUnit.quantity <= 0) {
        const idx = fromUnits.indexOf(sourceUnit);
        fromUnits.splice(idx, 1);
      }

      // Add to destination
      const toUnits = this.units[toTerritory] || [];
      const destUnit = toUnits.find(u => u.type === moveUnit.type && u.owner === player.id);
      if (destUnit) {
        destUnit.quantity += moveUnit.quantity;
        destUnit.moved = true;
      } else {
        toUnits.push({
          type: moveUnit.type,
          quantity: moveUnit.quantity,
          owner: player.id,
          moved: true
        });
      }
      this.units[toTerritory] = toUnits;
    }

    // Record move with full info for undo
    this.moveHistory.push({
      from: fromTerritory,
      to: toTerritory,
      units: unitsToMove.map(u => ({ ...u })),
      player: player.id,
    });

    this._notify();
    return { success: true };
  }

  // Undo the last movement (only during combat move phase)
  undoLastMove() {
    if (this.turnPhase !== TURN_PHASES.COMBAT_MOVE) {
      return { success: false, error: 'Can only undo during combat movement' };
    }

    if (this.moveHistory.length === 0) {
      return { success: false, error: 'No moves to undo' };
    }

    const lastMove = this.moveHistory.pop();
    const player = this.currentPlayer;

    if (lastMove.player !== player.id) {
      // Shouldn't happen, but restore and return
      this.moveHistory.push(lastMove);
      return { success: false, error: 'Cannot undo other player moves' };
    }

    // Move units back from destination to source
    const toUnits = this.units[lastMove.to] || [];
    const fromUnits = this.units[lastMove.from] || [];

    for (const moveUnit of lastMove.units) {
      // Remove from destination
      const destUnit = toUnits.find(u => u.type === moveUnit.type && u.owner === player.id);
      if (destUnit) {
        destUnit.quantity -= moveUnit.quantity;
        if (destUnit.quantity <= 0) {
          const idx = toUnits.indexOf(destUnit);
          toUnits.splice(idx, 1);
        }
      }

      // Add back to source (without moved flag)
      const sourceUnit = fromUnits.find(u => u.type === moveUnit.type && u.owner === player.id);
      if (sourceUnit) {
        sourceUnit.quantity += moveUnit.quantity;
        delete sourceUnit.moved;
      } else {
        fromUnits.push({
          type: moveUnit.type,
          quantity: moveUnit.quantity,
          owner: player.id,
        });
      }
    }

    this.units[lastMove.from] = fromUnits;
    this.units[lastMove.to] = toUnits;

    this._notify();
    return { success: true };
  }

  // Detect territories where combat should occur
  _detectCombats() {
    this.combatQueue = [];
    const player = this.currentPlayer;
    if (!player) return;

    for (const [territory, units] of Object.entries(this.units)) {
      const hasPlayerUnits = units.some(u => u.owner === player.id);
      const hasEnemyUnits = units.some(u =>
        u.owner !== player.id && !this.areAllies(player.id, u.owner)
      );

      if (hasPlayerUnits && hasEnemyUnits) {
        this.combatQueue.push(territory);
      }
    }
  }

  // Resolve combat in a territory (dice combat with naval rules)
  resolveCombat(territory, unitDefs) {
    const units = this.units[territory] || [];
    const player = this.currentPlayer;
    if (!player) return null;

    const attackers = units.filter(u => u.owner === player.id);
    const defenders = units.filter(u => u.owner !== player.id && !this.areAllies(player.id, u.owner));

    if (attackers.length === 0 || defenders.length === 0) {
      // Repair damaged ships at end of combat
      this._repairDamagedShips(units, unitDefs);
      // Remove from combat queue
      this.combatQueue = this.combatQueue.filter(t => t !== territory);
      return { resolved: true, winner: attackers.length > 0 ? 'attacker' : 'defender' };
    }

    const t = this.territoryByName[territory];
    const isNavalBattle = t?.isWater;

    // Roll dice for combat
    const { hits: attackHits, rolls: attackRolls } = this._rollCombatWithRolls(attackers, 'attack', unitDefs);
    const { hits: defenseHits, rolls: defenseRolls } = this._rollCombatWithRolls(defenders, 'defense', unitDefs);

    // Apply casualties (handles multi-hit ships)
    const attackerCasualties = this._applyCasualtiesWithDamage(defenders, attackHits, unitDefs, isNavalBattle);
    const defenderCasualties = this._applyCasualtiesWithDamage(attackers, defenseHits, unitDefs, isNavalBattle);

    // Clean up destroyed units (quantity <= 0)
    this.units[territory] = units.filter(u => u.quantity > 0);

    // Check if combat is over
    const remainingAttackers = this.units[territory].filter(u => u.owner === player.id);
    const remainingDefenders = this.units[territory].filter(u =>
      u.owner !== player.id && !this.areAllies(player.id, u.owner)
    );

    const result = {
      attackHits,
      defenseHits,
      attackRolls,
      defenseRolls,
      attackerCasualties,
      defenderCasualties,
      attackersRemaining: remainingAttackers.reduce((sum, u) => sum + u.quantity, 0),
      defendersRemaining: remainingDefenders.reduce((sum, u) => sum + u.quantity, 0),
    };

    if (remainingDefenders.length === 0) {
      // Attacker wins - capture territory (if land)
      if (!isNavalBattle) {
        const defender = defenders[0]?.owner;
        this.territoryState[territory].owner = player.id;
      }
      // Repair surviving damaged ships
      this._repairDamagedShips(this.units[territory], unitDefs);
      this.combatQueue = this.combatQueue.filter(t => t !== territory);
      result.resolved = true;
      result.winner = 'attacker';
    } else if (remainingAttackers.length === 0) {
      // Repair surviving damaged ships
      this._repairDamagedShips(this.units[territory], unitDefs);
      this.combatQueue = this.combatQueue.filter(t => t !== territory);
      result.resolved = true;
      result.winner = 'defender';
    } else {
      result.resolved = false;
    }

    this._notify();
    return result;
  }

  _rollCombatWithRolls(units, type, unitDefs) {
    let hits = 0;
    const rolls = [];

    for (const unit of units) {
      const def = unitDefs[unit.type];
      if (!def) continue;
      const hitValue = type === 'attack' ? def.attack : def.defense;

      for (let i = 0; i < unit.quantity; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        rolls.push({ unit: unit.type, roll, hit: roll <= hitValue });
        if (roll <= hitValue) hits++;
      }
    }
    return { hits, rolls };
  }

  _rollCombat(units, type, unitDefs) {
    return this._rollCombatWithRolls(units, type, unitDefs).hits;
  }

  _applyCasualtiesWithDamage(units, hits, unitDefs, isNavalBattle) {
    const casualties = [];
    let remaining = hits;

    // For naval battles, first try to damage multi-hit ships before destroying units
    if (isNavalBattle) {
      // Prioritize damaging already-damaged ships to destroy them
      const multiHitShips = units.filter(u => {
        const def = unitDefs[u.type];
        return def?.hp > 1;
      });

      // First, finish off damaged ships
      for (const unit of multiHitShips) {
        if (remaining <= 0) break;
        if (unit.damaged && unit.quantity > 0) {
          // Destroy damaged ship
          unit.quantity--;
          remaining--;
          casualties.push({ type: unit.type, destroyed: true, wasDamaged: true });
        }
      }

      // Then, damage undamaged multi-hit ships
      for (const unit of multiHitShips) {
        if (remaining <= 0) break;
        const undamaged = unit.quantity - (unit.damagedCount || 0);
        if (undamaged > 0) {
          // Damage the ship instead of destroying
          unit.damagedCount = (unit.damagedCount || 0) + 1;
          unit.damaged = true;
          remaining--;
          casualties.push({ type: unit.type, damaged: true });
        }
      }
    }

    // Apply remaining hits to cheapest units first
    const sorted = [...units].filter(u => {
      const def = unitDefs[u.type];
      // Skip multi-hit ships that are only damaged (not destroyed)
      return !(def?.hp > 1 && u.damaged && !u.destroyed);
    }).sort((a, b) => {
      const costA = unitDefs[a.type]?.cost || 0;
      const costB = unitDefs[b.type]?.cost || 0;
      return costA - costB;
    });

    for (const unit of sorted) {
      if (remaining <= 0) break;
      const remove = Math.min(unit.quantity, remaining);
      unit.quantity -= remove;
      remaining -= remove;
      for (let i = 0; i < remove; i++) {
        casualties.push({ type: unit.type, destroyed: true });
      }
    }

    return casualties;
  }

  _applyCasualties(units, hits, unitDefs) {
    this._applyCasualtiesWithDamage(units, hits, unitDefs, false);
  }

  // Repair damaged ships at end of combat
  _repairDamagedShips(units, unitDefs) {
    for (const unit of units) {
      const def = unitDefs?.[unit.type];
      if (def?.hp > 1 && unit.damaged) {
        // Ship survived combat - repair it
        unit.damaged = false;
        unit.damagedCount = 0;
      }
    }
  }

  // Apply specific casualties (for player selection)
  applyCasualtiesManual(territory, casualties, isAttacker, unitDefs) {
    const units = this.units[territory] || [];
    const player = this.currentPlayer;
    if (!player) return { success: false };

    const targetUnits = isAttacker
      ? units.filter(u => u.owner === player.id)
      : units.filter(u => u.owner !== player.id);

    for (const casualty of casualties) {
      const unit = targetUnits.find(u => u.type === casualty.type && u.quantity > 0);
      if (unit) {
        if (casualty.damage) {
          // Damage a multi-hit ship
          unit.damaged = true;
          unit.damagedCount = (unit.damagedCount || 0) + 1;
        } else {
          // Destroy unit
          unit.quantity--;
        }
      }
    }

    // Clean up destroyed units
    this.units[territory] = units.filter(u => u.quantity > 0);
    this._notify();
    return { success: true };
  }

  // Place purchased units at factories
  _mobilizePurchases() {
    const player = this.currentPlayer;
    if (!player) return;

    // Find territories with factories
    const factoryTerritories = [];
    for (const [territory, units] of Object.entries(this.units)) {
      const hasFactory = units.some(u => u.type === 'factory' && u.owner === player.id);
      const isOwned = this.getOwner(territory) === player.id;
      if (hasFactory && isOwned) {
        factoryTerritories.push(territory);
      }
    }

    if (factoryTerritories.length === 0) return;

    // Place all purchases at first factory (simplified)
    const mainFactory = factoryTerritories[0];
    for (const purchase of this.pendingPurchases) {
      const units = this.units[mainFactory] || [];
      const existing = units.find(u => u.type === purchase.type && u.owner === player.id);
      if (existing) {
        existing.quantity += purchase.quantity;
      } else {
        units.push({ type: purchase.type, quantity: purchase.quantity, owner: player.id });
      }
      this.units[mainFactory] = units;
    }
    this.pendingPurchases = [];
  }

  // Collect income from territories
  _collectIncome() {
    const player = this.currentPlayer;
    if (!player) return;

    // Cannot collect income if capital is captured
    if (!this.canCollectIncome(player.id)) {
      return;
    }

    let income = 0;
    const capitalTerritory = this.playerState[player.id]?.capitalTerritory;

    for (const [territory, state] of Object.entries(this.territoryState)) {
      if (state.owner === player.id) {
        // Capitals always produce 10 IPCs
        if (territory === capitalTerritory) {
          income += 10;
        } else {
          const t = this.territoryByName[territory];
          if (t && t.production) {
            income += t.production;
          }
        }
      }
    }

    // Add continent bonuses
    for (const continent of this.continents) {
      if (this.controlsContinent(player.id, continent.name)) {
        income += continent.bonus;
      }
    }

    this.playerState[player.id].ipcs += income;
  }

  _clearMovedFlags() {
    for (const units of Object.values(this.units)) {
      for (const unit of units) {
        delete unit.moved;
      }
    }
  }

  // Handle capital capture - called when territory ownership changes
  handleCapitalCapture(territory, newOwner, previousOwner) {
    // Check if this territory is a capital
    const state = this.territoryState[territory];
    if (!state || !state.isCapital) return;

    // Find the player who lost their capital
    const loser = this.players.find(p =>
      this.playerState[p.id]?.capitalTerritory === territory
    );

    if (!loser) return;

    // Transfer IPCs from loser to captor
    const captorState = this.playerState[newOwner];
    const loserState = this.playerState[loser.id];

    if (captorState && loserState) {
      captorState.ipcs += loserState.ipcs;
      loserState.ipcs = 0;
      loserState.capitalCaptured = true;
    }

    // Check victory conditions
    this._checkVictoryConditions();
  }

  // Check if victory conditions are met
  _checkVictoryConditions() {
    if (this.gameOver) return;

    if (this.gameMode === 'classic' || this.alliancesEnabled) {
      this._checkAllianceVictory();
    } else {
      this._checkCapitalVictory();
    }
  }

  _checkAllianceVictory() {
    // Get capitals by alliance
    const alliedCapitals = ['Russia', 'United Kingdom', 'East US'];
    const axisCapitals = ['Germany', 'Japan'];

    const alliedControlled = alliedCapitals.filter(t => {
      const owner = this.getOwner(t);
      return owner && this.getAlliance(owner) === 'Allies';
    });

    const axisControlled = axisCapitals.filter(t => {
      const owner = this.getOwner(t);
      return owner && this.getAlliance(owner) === 'Axis';
    });

    // Axis wins: Control 2/3 Allied capitals while holding both Axis capitals
    if (axisControlled.length === 2) {
      const axisCapturedAllied = alliedCapitals.filter(t => {
        const owner = this.getOwner(t);
        return owner && this.getAlliance(owner) === 'Axis';
      });

      if (axisCapturedAllied.length >= 2) {
        this.gameOver = true;
        this.winner = 'Axis';
        this.winCondition = 'Capital Victory - Axis controls 2 Allied capitals';
        this._notify();
        return;
      }
    }

    // Allies win: Control both Axis capitals while holding all 3 Allied capitals
    if (alliedControlled.length === 3) {
      const alliedCapturedAxis = axisCapitals.filter(t => {
        const owner = this.getOwner(t);
        return owner && this.getAlliance(owner) === 'Allies';
      });

      if (alliedCapturedAxis.length === 2) {
        this.gameOver = true;
        this.winner = 'Allies';
        this.winCondition = 'Capital Victory - Allies controls both Axis capitals';
        this._notify();
        return;
      }
    }
  }

  _checkCapitalVictory() {
    // Count total capitals and who controls what
    const capitalControl = {};
    let totalCapitals = 0;

    for (const [territory, state] of Object.entries(this.territoryState)) {
      if (state.isCapital) {
        totalCapitals++;
        const owner = state.owner;
        capitalControl[owner] = (capitalControl[owner] || 0) + 1;
      }
    }

    // Determine victory threshold based on player count
    const playerCount = this.players.length;
    let requiredCapitals;

    if (playerCount <= 3) {
      // 2-3 players: must control ALL capitals
      requiredCapitals = totalCapitals;
    } else {
      // 4+ players: must control majority (more than half)
      requiredCapitals = Math.floor(totalCapitals / 2) + 1;
    }

    for (const [playerId, count] of Object.entries(capitalControl)) {
      if (count >= requiredCapitals) {
        const player = this.getPlayer(playerId);
        this.gameOver = true;
        this.winner = player?.name || playerId;
        const condition = playerCount <= 3 ? 'all capitals' : `${count}/${totalCapitals} capitals (majority)`;
        this.winCondition = `Capital Victory - Controls ${condition}`;
        this._notify();
        return;
      }
    }
  }

  // Check if a player can collect income (capital not captured)
  canCollectIncome(playerId) {
    const pState = this.playerState[playerId];
    if (!pState) return false;

    const capitalTerritory = pState.capitalTerritory;
    if (!capitalTerritory) return true;

    // Check if capital is still owned by this player
    return this.getOwner(capitalTerritory) === playerId;
  }

  // Check if a player is eliminated (no units and no capital)
  isPlayerEliminated(playerId) {
    // Check if they own any territories
    const ownedTerritories = Object.entries(this.territoryState)
      .filter(([_, state]) => state.owner === playerId);

    if (ownedTerritories.length === 0) return true;

    // Check if they have any units
    let hasUnits = false;
    for (const units of Object.values(this.units)) {
      if (units.some(u => u.owner === playerId && u.quantity > 0)) {
        hasUnits = true;
        break;
      }
    }

    return !hasUnits && ownedTerritories.length === 0;
  }

  // Add a combat result to the log
  logCombat(result) {
    this.combatLog.push({
      round: this.round,
      timestamp: Date.now(),
      ...result
    });
  }

  // Get combat log for display
  getCombatLog() {
    return this.combatLog;
  }

  // Clear combat log (called at start of new round)
  clearCombatLog() {
    this.combatLog = [];
  }

  // --- Tech Research System ---

  // Purchase tech research dice (5 IPCs each)
  purchaseTechDice(playerId, count) {
    const pState = this.playerState[playerId];
    if (!pState) return false;

    const cost = count * 5;
    if (pState.ipcs < cost) return false;

    pState.ipcs -= cost;

    if (!this.playerTechs[playerId]) {
      this.playerTechs[playerId] = { techTokens: 0, unlockedTechs: [] };
    }
    this.playerTechs[playerId].techTokens += count;

    this._notify();
    return true;
  }

  // Roll tech dice - returns { success: bool, rolls: [], tech?: string }
  rollTechDice(playerId) {
    const techState = this.playerTechs[playerId];
    if (!techState || techState.techTokens <= 0) {
      return { success: false, rolls: [] };
    }

    const rolls = [];
    let breakthrough = false;

    for (let i = 0; i < techState.techTokens; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      rolls.push(roll);
      if (roll === 6) breakthrough = true;
    }

    // Reset tokens after rolling (they're consumed)
    techState.techTokens = 0;

    this._notify();
    return { success: breakthrough, rolls };
  }

  // Unlock a specific tech (called after breakthrough)
  unlockTech(playerId, techId) {
    const techState = this.playerTechs[playerId];
    if (!techState) return false;

    if (!TECHNOLOGIES[techId]) return false;
    if (techState.unlockedTechs.includes(techId)) return false;

    techState.unlockedTechs.push(techId);
    this._notify();
    return true;
  }

  // Check if player has a tech
  hasTech(playerId, techId) {
    return this.playerTechs[playerId]?.unlockedTechs.includes(techId) || false;
  }

  // Get available techs for player (ones they don't have yet)
  getAvailableTechs(playerId) {
    const unlocked = this.playerTechs[playerId]?.unlockedTechs || [];
    return Object.keys(TECHNOLOGIES).filter(t => !unlocked.includes(t));
  }

  // --- RISK Cards System ---

  // Award a RISK card to player (called on successful territory capture)
  awardRiskCard(playerId) {
    if (!this.riskCards[playerId]) {
      this.riskCards[playerId] = [];
    }

    // RISK card types: infantry, cavalry, artillery, wild
    const cardTypes = ['infantry', 'cavalry', 'artillery', 'wild'];
    // Wild is rarer
    const weights = [30, 30, 30, 10];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;

    let cardType = cardTypes[0];
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        cardType = cardTypes[i];
        break;
      }
    }

    this.riskCards[playerId].push(cardType);
    this._notify();
    return cardType;
  }

  // Check if player can trade cards (needs 3+ cards with a valid set)
  canTradeRiskCards(playerId) {
    const cards = this.riskCards[playerId] || [];
    if (cards.length < 3) return false;

    // Check for valid sets: 3 of a kind, or 1 of each, or 2 + wild, or 3 wilds
    return this._findValidCardSet(cards) !== null;
  }

  _findValidCardSet(cards) {
    const counts = { infantry: 0, cavalry: 0, artillery: 0, wild: 0 };
    for (const c of cards) counts[c]++;

    // 3 of same type
    for (const type of ['infantry', 'cavalry', 'artillery']) {
      if (counts[type] >= 3) return [type, type, type];
    }

    // 3 wilds
    if (counts.wild >= 3) return ['wild', 'wild', 'wild'];

    // 1 of each
    if (counts.infantry >= 1 && counts.cavalry >= 1 && counts.artillery >= 1) {
      return ['infantry', 'cavalry', 'artillery'];
    }

    // 2 of a kind + wild
    for (const type of ['infantry', 'cavalry', 'artillery']) {
      if (counts[type] >= 2 && counts.wild >= 1) {
        return [type, type, 'wild'];
      }
    }

    // 1 + 1 + wild
    const types = ['infantry', 'cavalry', 'artillery'].filter(t => counts[t] >= 1);
    if (types.length >= 2 && counts.wild >= 1) {
      return [types[0], types[1], 'wild'];
    }

    return null;
  }

  // Trade RISK cards for IPCs
  tradeRiskCards(playerId) {
    const cards = this.riskCards[playerId] || [];
    const set = this._findValidCardSet(cards);
    if (!set) return { success: false, ipcs: 0 };

    // Remove the cards used
    for (const cardType of set) {
      const idx = cards.indexOf(cardType);
      if (idx >= 0) cards.splice(idx, 1);
    }

    // Get trade value based on how many times player has traded
    const tradeNum = this.cardTradeCount[playerId] || 0;
    const value = RISK_CARD_VALUES[Math.min(tradeNum, RISK_CARD_VALUES.length - 1)];

    // Increment trade count and award IPCs
    this.cardTradeCount[playerId] = tradeNum + 1;
    this.playerState[playerId].ipcs += value;

    this._notify();
    return { success: true, ipcs: value };
  }

  // Get current RISK card trade value for player
  getNextRiskCardValue(playerId) {
    const tradeNum = this.cardTradeCount[playerId] || 0;
    return RISK_CARD_VALUES[Math.min(tradeNum, RISK_CARD_VALUES.length - 1)];
  }

  // --- Transport & Carrier System ---

  // Load a unit onto a transport in the same sea zone
  loadTransport(seaZone, transportIndex, unitType, landTerritory, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const seaUnits = this.units[seaZone] || [];
    const transports = seaUnits.filter(u => u.type === 'transport' && u.owner === player.id);
    if (transportIndex >= transports.length) {
      return { success: false, error: 'Invalid transport' };
    }

    const transport = transports[transportIndex];
    const transportDef = unitDefs.transport;

    // Check if transport can carry this unit type
    if (!transportDef.canCarry?.includes(unitType)) {
      return { success: false, error: `Transports cannot carry ${unitType}` };
    }

    // Check cargo capacity
    const currentCargo = transport.cargo || [];
    const canLoad = this._canLoadOnTransport(currentCargo, unitType);
    if (!canLoad) {
      return { success: false, error: 'Transport is full' };
    }

    // Check if unit exists in adjacent land territory
    const landUnits = this.units[landTerritory] || [];
    const sourceUnit = landUnits.find(u => u.type === unitType && u.owner === player.id && !u.moved);
    if (!sourceUnit || sourceUnit.quantity < 1) {
      return { success: false, error: `No ${unitType} available to load` };
    }

    // Move unit to transport
    sourceUnit.quantity--;
    if (sourceUnit.quantity <= 0) {
      const idx = landUnits.indexOf(sourceUnit);
      landUnits.splice(idx, 1);
    }

    transport.cargo = transport.cargo || [];
    transport.cargo.push({ type: unitType, owner: player.id });

    this._notify();
    return { success: true };
  }

  // Check if a unit can be loaded onto a transport given current cargo
  _canLoadOnTransport(cargo, unitType) {
    // Transport capacity: 2 infantry OR 1 infantry + 1 other OR 1 non-infantry
    const infantryCount = cargo.filter(c => c.type === 'infantry').length;
    const otherCount = cargo.filter(c => c.type !== 'infantry').length;

    if (unitType === 'infantry') {
      // Can load infantry if: empty, or 1 infantry already, or no other units
      return cargo.length < 2 && otherCount === 0;
    } else {
      // Can load other unit if: empty, or 1 infantry only
      return cargo.length === 0 || (infantryCount === 1 && otherCount === 0);
    }
  }

  // Unload units from transport to coastal territory
  unloadTransport(seaZone, transportIndex, coastalTerritory) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const seaUnits = this.units[seaZone] || [];
    const transports = seaUnits.filter(u => u.type === 'transport' && u.owner === player.id);
    if (transportIndex >= transports.length) {
      return { success: false, error: 'Invalid transport' };
    }

    const transport = transports[transportIndex];
    if (!transport.cargo || transport.cargo.length === 0) {
      return { success: false, error: 'Transport has no cargo' };
    }

    // Check adjacency
    const seaT = this.territoryByName[seaZone];
    if (!seaT || !seaT.connections.includes(coastalTerritory)) {
      return { success: false, error: 'Territory not adjacent to sea zone' };
    }

    const coastalT = this.territoryByName[coastalTerritory];
    if (coastalT?.isWater) {
      return { success: false, error: 'Cannot unload to water' };
    }

    // Unload all cargo to coastal territory
    const coastalUnits = this.units[coastalTerritory] || [];
    for (const cargo of transport.cargo) {
      const existing = coastalUnits.find(u => u.type === cargo.type && u.owner === cargo.owner);
      if (existing) {
        existing.quantity++;
        existing.moved = true;
      } else {
        coastalUnits.push({ type: cargo.type, quantity: 1, owner: cargo.owner, moved: true });
      }
    }
    this.units[coastalTerritory] = coastalUnits;

    // Clear transport cargo
    transport.cargo = [];

    this._notify();
    return { success: true };
  }

  // Land a fighter on a carrier
  landOnCarrier(seaZone, carrierIndex, fighterType, fromTerritory, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const seaUnits = this.units[seaZone] || [];
    const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
    if (carrierIndex >= carriers.length) {
      return { success: false, error: 'Invalid carrier' };
    }

    const carrier = carriers[carrierIndex];
    const carrierDef = unitDefs.carrier;

    // Check if carrier can carry this aircraft type
    if (!carrierDef.canCarry?.includes(fighterType)) {
      return { success: false, error: `Carriers cannot carry ${fighterType}` };
    }

    // Check capacity
    const currentAircraft = carrier.aircraft || [];
    if (currentAircraft.length >= carrierDef.aircraftCapacity) {
      return { success: false, error: 'Carrier is full' };
    }

    // Find the fighter in source territory
    const sourceUnits = this.units[fromTerritory] || [];
    const sourceUnit = sourceUnits.find(u => u.type === fighterType && u.owner === player.id);
    if (!sourceUnit || sourceUnit.quantity < 1) {
      return { success: false, error: `No ${fighterType} available` };
    }

    // Move fighter to carrier
    sourceUnit.quantity--;
    if (sourceUnit.quantity <= 0) {
      const idx = sourceUnits.indexOf(sourceUnit);
      sourceUnits.splice(idx, 1);
    }

    carrier.aircraft = carrier.aircraft || [];
    carrier.aircraft.push({ type: fighterType, owner: player.id });

    this._notify();
    return { success: true };
  }

  // Launch aircraft from carrier (they can then move independently)
  launchFromCarrier(seaZone, carrierIndex, aircraftIndex) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const seaUnits = this.units[seaZone] || [];
    const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
    if (carrierIndex >= carriers.length) {
      return { success: false, error: 'Invalid carrier' };
    }

    const carrier = carriers[carrierIndex];
    if (!carrier.aircraft || aircraftIndex >= carrier.aircraft.length) {
      return { success: false, error: 'Invalid aircraft' };
    }

    const aircraft = carrier.aircraft[aircraftIndex];

    // Add aircraft to the sea zone as a unit (it will need to land somewhere at end of turn)
    const existing = seaUnits.find(u => u.type === aircraft.type && u.owner === aircraft.owner);
    if (existing) {
      existing.quantity++;
    } else {
      seaUnits.push({ type: aircraft.type, quantity: 1, owner: aircraft.owner });
    }

    // Remove from carrier
    carrier.aircraft.splice(aircraftIndex, 1);

    this._notify();
    return { success: true };
  }

  // Get transport cargo summary for UI
  getTransportCargo(seaZone, playerId) {
    const units = this.units[seaZone] || [];
    const transports = units.filter(u => u.type === 'transport' && u.owner === playerId);
    return transports.map((t, i) => ({
      index: i,
      cargo: t.cargo || [],
      capacity: 2
    }));
  }

  // Get carrier aircraft summary for UI
  getCarrierAircraft(seaZone, playerId) {
    const units = this.units[seaZone] || [];
    const carriers = units.filter(u => u.type === 'carrier' && u.owner === playerId);
    return carriers.map((c, i) => ({
      index: i,
      aircraft: c.aircraft || [],
      capacity: 2,
      damaged: c.damaged || false
    }));
  }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  _notify() {
    for (const cb of this._listeners) {
      cb(this);
    }
  }

  toJSON() {
    return {
      version: 7,
      gameMode: this.gameMode,
      alliancesEnabled: this.alliancesEnabled,
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      round: this.round,
      phase: this.phase,
      turnPhase: this.turnPhase,
      territoryState: this.territoryState,
      units: this.units,
      playerState: this.playerState,
      pendingPurchases: this.pendingPurchases,
      combatQueue: this.combatQueue,
      gameOver: this.gameOver,
      winner: this.winner,
      winCondition: this.winCondition,
      playerTechs: this.playerTechs,
      riskCards: this.riskCards,
      cardTradeCount: this.cardTradeCount,
      unitsToPlace: this.unitsToPlace,
      placementRound: this.placementRound,
    };
  }

  loadFromJSON(data) {
    if (data.version < 3) throw new Error('Incompatible save version');
    this.gameMode = data.gameMode;
    this.alliancesEnabled = data.alliancesEnabled ?? (data.gameMode === 'classic');
    this.players = data.players;
    this.currentPlayerIndex = data.currentPlayerIndex;
    this.round = data.round;
    this.phase = data.phase;
    this.turnPhase = data.turnPhase || TURN_PHASES.DEVELOP_TECH;
    this.territoryState = data.territoryState;
    this.units = data.units;
    this.playerState = data.playerState;
    this.pendingPurchases = data.pendingPurchases || [];
    this.combatQueue = data.combatQueue || [];
    this.gameOver = data.gameOver || false;
    this.winner = data.winner || null;
    this.winCondition = data.winCondition || null;
    this.playerTechs = data.playerTechs || {};
    this.riskCards = data.riskCards || {};
    this.cardTradeCount = data.cardTradeCount || {};
    this.unitsToPlace = data.unitsToPlace || {};
    this.placementRound = data.placementRound || 0;
    this._notify();
  }

  saveToFile() {
    const data = JSON.stringify(this.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tactical-risk-save.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadFromFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return reject(new Error('No file'));
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            this.loadFromJSON(JSON.parse(ev.target.result));
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // Auto-save to localStorage for pass-and-play
  autoSave() {
    try {
      const data = JSON.stringify(this.toJSON());
      localStorage.setItem('tacticalRisk_autoSave', data);
      localStorage.setItem('tacticalRisk_autoSave_time', new Date().toISOString());
      return true;
    } catch (err) {
      console.warn('Auto-save failed:', err);
      return false;
    }
  }

  // Load from auto-save
  static loadAutoSave() {
    try {
      const data = localStorage.getItem('tacticalRisk_autoSave');
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.warn('Load auto-save failed:', err);
      return null;
    }
  }

  // Check if auto-save exists
  static hasAutoSave() {
    return localStorage.getItem('tacticalRisk_autoSave') !== null;
  }

  // Get auto-save timestamp
  static getAutoSaveTime() {
    return localStorage.getItem('tacticalRisk_autoSave_time');
  }

  // Clear auto-save
  static clearAutoSave() {
    localStorage.removeItem('tacticalRisk_autoSave');
    localStorage.removeItem('tacticalRisk_autoSave_time');
  }
}
