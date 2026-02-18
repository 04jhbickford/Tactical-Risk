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
  ['United Kingdom', 'West Europe'],  // Channel crossing
  ['South Europe', 'Anglo Sudan Egypt'],
  ['Syria Jordan', 'Anglo Sudan Egypt'],
  ['French Indo China', 'East Indies'],  // Note: "French Indo China" (no hyphen) matches territory name
  ['East Indies', 'Australia'],
  ['Australia', 'New Zealand'],
  ['Kenya-Rhodesia', 'Madagascar'],
  ['Spain', 'Algeria'],  // Strait of Gibraltar
  ['Japan', 'Manchuria'],  // Korea Strait crossing
  ['Italian East Africa', 'Saudi Arabia'],  // Red Sea crossing
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
// Note: Fighters and carriers are placed independently - no auto-assignment
export const RISK_STARTING_UNITS = {
  land: [
    { type: 'bomber', quantity: 1 },
    { type: 'fighter', quantity: 2 }, // Both fighters are in land, placed independently
    { type: 'tacticalBomber', quantity: 1 },
    { type: 'armour', quantity: 3 },
    { type: 'artillery', quantity: 3 },
    { type: 'infantry', quantity: 9 },
    { type: 'factory', quantity: 1 },
  ],
  naval: [
    { type: 'battleship', quantity: 1 },
    { type: 'carrier', quantity: 1 },
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

    // Air unit origins: { territory: { unitType: { origin: territoryName, distance: n } } }
    // Tracks where air units came from and how far they traveled for post-combat landing
    this.airUnitOrigins = {};

    // Territories friendly at turn start (for air landing - can only land in these)
    this.friendlyTerritoriesAtTurnStart = new Set();

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
    // Track if player has conquered a territory this turn (for Risk card award - one per turn)
    this.conqueredThisTurn = {};

    // Territories with amphibious assault this turn (for shore bombardment - only bombard with amphibious units)
    this.amphibiousTerritories = new Set();

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

    // Individual ship tracking (for carriers/transports with cargo)
    this._shipIdCounter = 0;
  }

  // Generate unique ID for individual ship tracking
  _generateShipId(type) {
    this._shipIdCounter++;
    return `${type}_${this._shipIdCounter}`;
  }

  // Split a grouped ship into an individual ship with unique ID
  // Used when loading cargo onto a ship - that ship becomes individually tracked
  _individualizeShip(territory, shipType, playerId) {
    const units = this.units[territory] || [];

    // Find a grouped ship (no id, quantity > 0)
    const grouped = units.find(u =>
      u.type === shipType && u.owner === playerId && !u.id && u.quantity > 0
    );

    if (!grouped) return null;

    // Split off one ship with unique ID
    grouped.quantity--;
    const individual = {
      type: shipType,
      quantity: 1,
      owner: playerId,
      id: this._generateShipId(shipType),
      aircraft: [],
      cargo: [],
      moved: grouped.moved || false,
      movementUsed: grouped.movementUsed || 0
    };
    units.push(individual);

    // Clean up empty group
    if (grouped.quantity <= 0) {
      const idx = units.indexOf(grouped);
      units.splice(idx, 1);
    }

    return individual;
  }

  // Get all individual ships (carriers/transports with cargo) in a territory
  getIndividualShips(territory, playerId, shipType = null) {
    const units = this.units[territory] || [];
    return units.filter(u => {
      if (u.owner !== playerId) return false;
      if (shipType && u.type !== shipType) return false;
      if (!u.id) return false; // Only individualized ships have IDs
      if (u.type !== 'carrier' && u.type !== 'transport') return false;
      return true;
    });
  }

  // Get all ships (including grouped) with cargo info for UI
  getShipsWithCargo(territory, playerId, shipType = null) {
    const units = this.units[territory] || [];
    const result = [];

    for (const u of units) {
      if (u.owner !== playerId) continue;
      if (shipType && u.type !== shipType) continue;
      if (u.type !== 'carrier' && u.type !== 'transport') continue;

      if (u.id) {
        // Individual ship - add directly
        result.push({
          id: u.id,
          type: u.type,
          cargo: u.cargo || [],
          aircraft: u.aircraft || [],
          moved: u.moved || false
        });
      } else {
        // Grouped ships - expand to individual entries (without IDs)
        for (let i = 0; i < u.quantity; i++) {
          result.push({
            id: null,
            type: u.type,
            cargo: i === 0 ? (u.cargo || []) : [], // Only first gets shared cargo
            aircraft: i === 0 ? (u.aircraft || []) : [], // Only first gets shared aircraft
            moved: u.moved || false,
            groupIndex: i
          });
        }
      }
    }

    return result;
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
      this._initRiskMode(selectedPlayers, options);
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

  _initRiskMode(selectedPlayers, options = {}) {
    const riskData = this.setup.risk;
    const playerCount = selectedPlayers.length;

    // Use custom starting IPCs if provided, otherwise use player count-based defaults
    const startingIPCs = options.startingIPCs || STARTING_IPCS_BY_PLAYER_COUNT[playerCount] || 18;

    // Randomize player order for initial placement
    const shuffledPlayers = this._shuffleArray([...selectedPlayers]);

    this.players = shuffledPlayers.map((p, i) => ({
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

  // Get all territories reachable by air unit within movement range
  // Air units can fly over any terrain (land or water)
  getReachableTerritoriesForAir(fromTerritory, movementRange, playerId, isCombatMove = false) {
    const reachable = new Map(); // territory -> { distance, path }
    const visited = new Set();
    const queue = [{ territory: fromTerritory, distance: 0, path: [fromTerritory] }];

    while (queue.length > 0) {
      const { territory, distance, path } = queue.shift();

      if (visited.has(territory)) continue;
      visited.add(territory);

      // Don't add starting territory to results
      if (territory !== fromTerritory) {
        reachable.set(territory, { distance, path });
      }

      // Stop if we've reached max movement
      if (distance >= movementRange) continue;

      // Get all connections (including land bridges for air traversal)
      const connections = this.getConnections(territory);

      for (const conn of connections) {
        if (visited.has(conn)) continue;

        queue.push({
          territory: conn,
          distance: distance + 1,
          path: [...path, conn]
        });
      }
    }

    return reachable;
  }

  // Check if air unit can reach destination within movement range
  canAirUnitReach(fromTerritory, toTerritory, movementRange) {
    const reachable = this.getReachableTerritoriesForAir(fromTerritory, movementRange, null, false);
    return reachable.has(toTerritory);
  }

  // Calculate distance between two territories for air units (BFS shortest path)
  // Uses getConnections() which includes land bridges
  _calculateAirDistance(fromTerritory, toTerritory) {
    if (fromTerritory === toTerritory) return 0;

    const visited = new Set([fromTerritory]);
    const queue = [{ territory: fromTerritory, distance: 0 }];

    while (queue.length > 0) {
      const { territory, distance } = queue.shift();

      // Use getConnections to include land bridges
      const connections = this.getConnections(territory);

      for (const conn of connections) {
        if (conn === toTerritory) return distance + 1;
        if (!visited.has(conn)) {
          visited.add(conn);
          queue.push({ territory: conn, distance: distance + 1 });
        }
      }
    }

    return 999; // Unreachable
  }

  // Get valid landing territories for air unit after combat
  // IMPORTANT: Air units can ONLY land in territories that were friendly at the START of the turn
  getAirLandingOptions(territory, unitType, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return [];

    const unitDef = unitDefs[unitType];
    if (!unitDef?.isAir) return [];

    // Get origin tracking info - if no origin tracked, assume unit started here
    const originInfo = this.airUnitOrigins[territory]?.[unitType];
    const distanceTraveled = originInfo?.distance || 0;
    const totalMovement = unitDef.movement || 4;
    const remainingMovement = Math.max(0, totalMovement - distanceTraveled);

    // Get all territories within remaining movement
    // If unit moved and has no remaining movement, it can only stay in current territory
    // If unit didn't move (no origin tracked), use full movement
    const searchRange = distanceTraveled > 0 ? remainingMovement : totalMovement;
    const reachable = this.getReachableTerritoriesForAir(territory, searchRange, player.id, false);
    const validLandings = [];

    // Debug logging for air landing issues
    if (reachable.size === 0) {
      console.warn(`Air landing: No reachable territories from ${territory} with range ${searchRange}`);
    }

    // Get territories that were friendly at turn start
    let friendlyAtStart = this.friendlyTerritoriesAtTurnStart || new Set();

    // Fallback: if friendlyTerritoriesAtTurnStart is empty, use current ownership
    // This can happen with older saves or if initialization failed
    if (friendlyAtStart.size === 0) {
      console.warn('Air landing: friendlyTerritoriesAtTurnStart is empty, using current ownership as fallback');
      friendlyAtStart = new Set();
      for (const [terrName, state] of Object.entries(this.territoryState)) {
        if (state.owner === player.id || this.areAllies(player.id, state.owner)) {
          friendlyAtStart.add(terrName);
        }
      }
    }

    for (const [destName, info] of reachable) {
      // CRITICAL: Only allow landing in territories that were friendly at the START of the turn
      // Newly captured territories are NOT valid landing spots (unless using fallback)
      const wasFriendlyAtStart = friendlyAtStart.has(destName);

      // Skip if not friendly at turn start (unless it's a carrier which moves with the fleet)
      const destT = this.territoryByName[destName];

      if (destT?.isWater) {
        // Carriers: check if there's a friendly carrier with capacity
        const seaUnits = this.units[destName] || [];
        const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
        const carrierDef = unitDefs.carrier;

        if (carrierDef && carriers.length > 0) {
          // Check for capacity
          let capacity = 0;
          for (const carrier of carriers) {
            const aircraft = carrier.aircraft || [];
            capacity += Math.max(0, (carrierDef.aircraftCapacity || 2) - aircraft.length);
          }
          if (capacity > 0 && carrierDef.canCarry?.includes(unitType)) {
            validLandings.push({ territory: destName, distance: info.distance, isCarrier: true });
          }
        }
      } else if (wasFriendlyAtStart) {
        // Land territory - must have been friendly at turn start
        validLandings.push({ territory: destName, distance: info.distance, isCarrier: false });
      }
    }

    // Sort by distance (closest first)
    validLandings.sort((a, b) => a.distance - b.distance);

    return validLandings;
  }

  // Clear air unit origins for a territory (after landing resolution)
  clearAirUnitOrigins(territory) {
    delete this.airUnitOrigins[territory];
  }

  // Check if an air unit can land somewhere valid after moving from->to
  // Returns { canLand: boolean, remainingMovement: number }
  checkAirUnitCanLand(fromTerritory, toTerritory, unitType, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { canLand: false, remainingMovement: 0 };

    const unitDef = unitDefs[unitType];
    if (!unitDef?.isAir) return { canLand: true, remainingMovement: 0 };

    const totalMovement = unitDef.movement || 4;

    // Get current tracking info if the unit already moved
    const existingOrigin = this.airUnitOrigins[fromTerritory]?.[unitType];
    const previousDistance = existingOrigin?.distance || 0;

    // Calculate new distance
    const newDistance = this._calculateAirDistance(fromTerritory, toTerritory);
    const totalDistanceTraveled = previousDistance + newDistance;
    const remainingMovement = Math.max(0, totalMovement - totalDistanceTraveled);

    // Check if there are valid landing spots within remaining movement
    // Get territories that were friendly at turn start
    let friendlyAtStart = this.friendlyTerritoriesAtTurnStart || new Set();
    if (friendlyAtStart.size === 0) {
      // Fallback: use current ownership
      for (const [terrName, state] of Object.entries(this.territoryState)) {
        if (state.owner === player.id || this.areAllies(player.id, state.owner)) {
          friendlyAtStart.add(terrName);
        }
      }
    }

    // Check if any landing options exist
    const reachable = this.getReachableTerritoriesForAir(toTerritory, remainingMovement, player.id, false);

    for (const [destName] of reachable) {
      const destT = this.territoryByName[destName];

      if (destT?.isWater) {
        // Check for friendly carriers
        const seaUnits = this.units[destName] || [];
        const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
        if (carriers.length > 0) {
          const carrierDef = unitDefs.carrier;
          if (carrierDef?.canCarry?.includes(unitType)) {
            return { canLand: true, remainingMovement };
          }
        }
      } else if (friendlyAtStart.has(destName)) {
        return { canLand: true, remainingMovement };
      }
    }

    return { canLand: false, remainingMovement };
  }

  // Get flight path for air unit (for validation and display)
  getAirFlightPath(fromTerritory, toTerritory, movementRange) {
    const reachable = this.getReachableTerritoriesForAir(fromTerritory, movementRange, null, false);
    const info = reachable.get(toTerritory);
    return info ? info.path : null;
  }

  // Get all territories reachable by sea unit within movement range
  // Sea units can only move through water territories
  getReachableTerritoriesForSea(fromTerritory, movementRange, playerId, isCombatMove = false) {
    const reachable = new Map(); // territory -> { distance, path }
    const visited = new Set();
    const queue = [{ territory: fromTerritory, distance: 0, path: [fromTerritory] }];

    while (queue.length > 0) {
      const { territory, distance, path } = queue.shift();

      if (visited.has(territory)) continue;
      visited.add(territory);

      const t = this.territoryByName[territory];
      if (!t) continue;

      // Can only move through water
      if (territory !== fromTerritory && !t.isWater) continue;

      // Check for enemy units blocking movement (hostile sea zone)
      const owner = this.getOwner(territory);
      const units = this.units[territory] || [];
      const hasEnemyFleet = units.some(u => {
        if (u.owner === playerId || this.areAllies(playerId, u.owner)) return false;
        const def = this.territoryByName[territory]?.isWater && u.type;
        // Enemy combat ships block passage
        return u.type !== 'transport'; // Transports don't block
      });

      // Don't add starting territory to results
      if (territory !== fromTerritory) {
        // In non-combat move, can't enter hostile sea zones
        if (!isCombatMove && hasEnemyFleet) {
          // Can't enter this zone, but don't stop search
        } else {
          reachable.set(territory, { distance, path });
        }
      }

      // Stop if we've reached max movement
      if (distance >= movementRange) continue;

      // In combat move: can move through hostile zones
      // In non-combat move: hostile zones block further movement
      if (!isCombatMove && hasEnemyFleet && territory !== fromTerritory) continue;

      // Get all connections
      const connections = this.getConnections(territory);

      for (const conn of connections) {
        if (visited.has(conn)) continue;

        const connT = this.territoryByName[conn];
        // Only move to water territories
        if (!connT?.isWater) continue;

        queue.push({
          territory: conn,
          distance: distance + 1,
          path: [...path, conn]
        });
      }
    }

    return reachable;
  }

  // Check if sea unit can reach destination within movement range
  canSeaUnitReach(fromTerritory, toTerritory, movementRange, playerId, isCombatMove) {
    const reachable = this.getReachableTerritoriesForSea(fromTerritory, movementRange, playerId, isCombatMove);
    return reachable.has(toTerritory);
  }

  // Get all territories reachable by land unit within movement range
  // Land units can only move through friendly/allied land territories (blitzing)
  // In combat move, can pass through friendly to reach enemy
  // In non-combat move, can only enter friendly/allied
  getReachableTerritoriesForLand(fromTerritory, movementRange, playerId, isCombatMove = false) {
    const reachable = new Map(); // territory -> { distance, path }
    const visited = new Set();
    const queue = [{ territory: fromTerritory, distance: 0, path: [fromTerritory] }];

    while (queue.length > 0) {
      const { territory, distance, path } = queue.shift();

      if (visited.has(territory)) continue;
      visited.add(territory);

      const t = this.territoryByName[territory];
      if (!t) continue;

      // Can't pass through water (land units)
      if (territory !== fromTerritory && t.isWater) continue;

      // Check ownership for passability
      const owner = this.getOwner(territory);
      const isFriendly = owner === playerId;
      const isAllied = owner && this.areAllies(playerId, owner);
      const isEnemy = owner && owner !== playerId && !isAllied;

      // Don't add starting territory to results
      if (territory !== fromTerritory) {
        // In combat move: can reach enemy territories as final destination
        // In non-combat move: can only reach friendly/allied
        if (isCombatMove || isFriendly || isAllied || !owner) {
          reachable.set(territory, { distance, path });
        }
      }

      // Stop if we've reached max movement
      if (distance >= movementRange) continue;

      // Can only continue through friendly/allied territories (not enemy)
      if (territory !== fromTerritory && isEnemy) continue;

      // Get all connections (including land bridges)
      const connections = this.getConnections(territory);

      for (const conn of connections) {
        if (visited.has(conn)) continue;

        const connT = this.territoryByName[conn];
        // Skip water territories
        if (connT?.isWater) continue;

        queue.push({
          territory: conn,
          distance: distance + 1,
          path: [...path, conn]
        });
      }
    }

    return reachable;
  }

  // Check if land unit can reach destination within movement range
  canLandUnitReach(fromTerritory, toTerritory, movementRange, playerId, isCombatMove) {
    const reachable = this.getReachableTerritoriesForLand(fromTerritory, movementRange, playerId, isCombatMove);
    return reachable.has(toTerritory);
  }

  // Get land unit path for validation and display
  getLandUnitPath(fromTerritory, toTerritory, movementRange, playerId, isCombatMove) {
    const reachable = this.getReachableTerritoriesForLand(fromTerritory, movementRange, playerId, isCombatMove);
    const info = reachable.get(toTerritory);
    return info ? info.path : null;
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

    // Auto-place AA gun and factory on capital
    const units = this.units[territoryName] || [];
    units.push({ type: 'aaGun', quantity: 1, owner: player.id });
    units.push({ type: 'factory', quantity: 1, owner: player.id });
    this.units[territoryName] = units;

    // Remove factory from units to place (it's been auto-placed on capital)
    const unitsToPlace = this.unitsToPlace[player.id] || [];
    const factoryEntry = unitsToPlace.find(u => u.type === 'factory');
    if (factoryEntry) {
      factoryEntry.quantity = Math.max(0, factoryEntry.quantity - 1);
    }

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

  // Check if player has any units that can actually be placed (have valid locations)
  hasPlaceableUnits(playerId, unitDefs) {
    const units = this.unitsToPlace[playerId] || [];
    if (!units.some(u => u.quantity > 0)) return false;

    // Get player's owned territories and valid sea zones
    const ownedTerritories = this.getPlayerTerritories(playerId);
    if (ownedTerritories.length === 0) return false;

    // Find valid sea zones (adjacent to owned coastal territories, not occupied by enemies)
    const validSeaZones = new Set();
    for (const tName of ownedTerritories) {
      const t = this.territoryByName[tName];
      if (!t || t.isWater) continue;
      for (const conn of t.connections) {
        const ct = this.territoryByName[conn];
        if (ct && ct.isWater) {
          // Check not occupied by enemy during setup
          const existingUnits = this.units[conn] || [];
          const enemyUnits = existingUnits.filter(u => u.owner !== playerId);
          if (enemyUnits.length === 0) {
            validSeaZones.add(conn);
          }
        }
      }
    }

    // Check each unit type
    for (const unitEntry of units) {
      if (unitEntry.quantity <= 0) continue;
      const def = unitDefs?.[unitEntry.type];
      if (!def) continue;

      // Land units: can place on owned territories
      if (def.isLand) return true;

      // Naval units: can place on valid sea zones
      if (def.isSea && validSeaZones.size > 0) return true;

      // Air units: can place on owned territories OR on carriers in valid sea zones
      if (def.isAir) {
        // Can always place on owned land
        return true;
      }
    }

    return false;
  }

  // Check if this is the final placement round (all players have ≤ 7 units remaining)
  isFinalPlacementRound() {
    if (!this.players) return false;
    return this.players.every(p => this.getTotalUnitsToPlace(p.id) <= 7);
  }

  // Get the units per round limit (7 for final round, 6 otherwise)
  getUnitsPerRoundLimit() {
    return this.isFinalPlacementRound() ? 7 : 6;
  }

  // Place an initial unit during Risk setup (6-unit rounds)
  placeInitialUnit(territoryName, unitType, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    // Enforce unit limit per turn during initial placement (7 for final round, 6 otherwise)
    const limit = this.getUnitsPerRoundLimit();
    if (this.unitsPlacedThisRound >= limit) {
      return { success: false, error: `You can only place up to ${limit} units per turn. Click "Done" to continue.` };
    }

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

      // During setup: prevent placing naval units in sea zones occupied by other players
      if (this.phase === GAME_PHASES.UNIT_PLACEMENT) {
        const existingUnits = this.units[territoryName] || [];
        const enemyUnits = existingUnits.filter(u => u.owner !== player.id);
        if (enemyUnits.length > 0) {
          return { success: false, error: 'Cannot place naval units in a sea zone occupied by another faction during setup' };
        }
      }
    } else {
      // Land/air units: check if can be placed
      const owner = this.getOwner(territoryName);
      const t = this.territoryByName[territoryName];

      // Check if placing on a sea zone with carrier (for fighters) or transport (for ground)
      if (t && t.isWater) {
        const seaUnits = this.units[territoryName] || [];

        if (unitDef.isAir) {
          // Fighters can be placed on carriers
          const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
          const carrierDef = unitDefs.carrier;
          // Find carrier with capacity
          let placed = false;
          for (const carrier of carriers) {
            const currentAircraft = carrier.aircraft || [];
            if (carrierDef && currentAircraft.length < (carrierDef.aircraftCapacity || 2)) {
              if (carrierDef.canCarry?.includes(unitType)) {
                // Place on carrier
                unitEntry.quantity--;
                carrier.aircraft = carrier.aircraft || [];
                carrier.aircraft.push({ type: unitType, owner: player.id });
                placed = true;
                break;
              }
            }
          }
          if (!placed) {
            return { success: false, error: 'No carrier with capacity to hold this aircraft' };
          }
          // Track placement for undo (special carrier placement)
          this.placementHistory.push({
            territory: territoryName,
            unitType,
            owner: player.id,
            onCarrier: true,
          });
          this.unitsPlacedThisRound++;
          this._notify();
          return { success: true, unitsPlacedThisRound: this.unitsPlacedThisRound };
        } else if (unitDef.isLand) {
          // Ground units can be placed on transports
          const transports = seaUnits.filter(u => u.type === 'transport' && u.owner === player.id);
          const transportDef = unitDefs.transport;
          // Find transport with capacity
          let placed = false;
          for (const transport of transports) {
            const currentCargo = transport.cargo || [];
            if (transportDef && this._canLoadOnTransport(currentCargo, unitType)) {
              if (transportDef.canCarry?.includes(unitType)) {
                // Place on transport
                unitEntry.quantity--;
                transport.cargo = transport.cargo || [];
                transport.cargo.push({ type: unitType, owner: player.id });
                placed = true;
                break;
              }
            }
          }
          if (!placed) {
            return { success: false, error: 'No transport with capacity to hold this unit' };
          }
          // Track placement for undo (special transport placement)
          this.placementHistory.push({
            territory: territoryName,
            unitType,
            owner: player.id,
            onTransport: true,
          });
          this.unitsPlacedThisRound++;
          this._notify();
          return { success: true, unitsPlacedThisRound: this.unitsPlacedThisRound };
        } else {
          return { success: false, error: 'Cannot place this unit type on water' };
        }
      } else if (owner !== player.id) {
        return { success: false, error: 'Must place on your own territory' };
      }
    }

    // Place the unit on land territory
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

    // Handle carrier placement undo
    if (lastPlacement.onCarrier) {
      const seaUnits = this.units[lastPlacement.territory] || [];
      const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
      for (const carrier of carriers) {
        const aircraft = carrier.aircraft || [];
        const idx = aircraft.findIndex(a => a.type === lastPlacement.unitType && a.owner === player.id);
        if (idx >= 0) {
          aircraft.splice(idx, 1);
          break;
        }
      }
    // Handle transport placement undo
    } else if (lastPlacement.onTransport) {
      const seaUnits = this.units[lastPlacement.territory] || [];
      const transports = seaUnits.filter(u => u.type === 'transport' && u.owner === player.id);
      for (const transport of transports) {
        const cargo = transport.cargo || [];
        const idx = cargo.findIndex(c => c.type === lastPlacement.unitType && c.owner === player.id);
        if (idx >= 0) {
          cargo.splice(idx, 1);
          break;
        }
      }
    } else {
      // Remove unit from territory (normal placement)
      const units = this.units[lastPlacement.territory] || [];
      const unitEntry = units.find(u => u.type === lastPlacement.unitType && u.owner === player.id);
      if (unitEntry) {
        unitEntry.quantity--;
        if (unitEntry.quantity <= 0) {
          const idx = units.indexOf(unitEntry);
          units.splice(idx, 1);
        }
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
  // unitDefs is optional but needed for accurate placeable check
  finishPlacementRound(unitDefs = null) {
    const player = this.currentPlayer;
    if (!player) return;

    this.unitsPlacedThisRound = 0;
    this.placementHistory = []; // Clear undo history for this round

    // Move to next player
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.placementRound++;
    }

    // Check if all players have finished placing - either no units left OR no placeable units
    const anyPlayerCanPlace = this.players.some(p => {
      const hasUnits = this.hasUnitsToPlace(p.id);
      if (!hasUnits) return false;
      // If unitDefs provided, check if units are actually placeable
      if (unitDefs) {
        return this.hasPlaceableUnits(p.id, unitDefs);
      }
      return hasUnits;
    });

    if (!anyPlayerCanPlace) {
      // All units placed (or unplaceable), move to playing phase
      this.phase = GAME_PHASES.PLAYING;
      this.turnPhase = TURN_PHASES.DEVELOP_TECH;
      // Initialize friendly territories for first turn
      this._initFriendlyTerritoriesAtTurnStart();
    }

    this._notify();
  }

  // Add unit to pending purchases (PURCHASE phase) - units placed during MOBILIZE
  // territory parameter specifies where the unit will be placed during mobilize
  addToPendingPurchases(unitType, unitDefs, territory = null) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const unitDef = unitDefs[unitType];
    if (!unitDef) return { success: false, error: 'Unknown unit type' };

    const cost = unitDef.cost;
    if (this.playerState[player.id].ipcs < cost) {
      return { success: false, error: 'Not enough IPCs' };
    }

    // Deduct IPCs
    this.playerState[player.id].ipcs -= cost;

    // Add to pending purchases - track territory if specified
    const existing = this.pendingPurchases.find(p =>
      p.type === unitType && p.owner === player.id && p.territory === territory
    );
    if (existing) {
      existing.quantity++;
    } else {
      this.pendingPurchases.push({ type: unitType, quantity: 1, owner: player.id, cost, territory });
    }

    this._notify();
    return { success: true };
  }

  // Remove unit from pending purchases (undo during PURCHASE phase)
  removeFromPendingPurchases(unitType, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const unitDef = unitDefs[unitType];
    if (!unitDef) return { success: false, error: 'Unknown unit type' };

    const existing = this.pendingPurchases.find(p => p.type === unitType && p.owner === player.id);
    if (!existing || existing.quantity <= 0) {
      return { success: false, error: 'No units to remove' };
    }

    // Refund IPCs
    this.playerState[player.id].ipcs += unitDef.cost;

    // Remove from pending
    existing.quantity--;
    if (existing.quantity <= 0) {
      const idx = this.pendingPurchases.indexOf(existing);
      this.pendingPurchases.splice(idx, 1);
    }

    this._notify();
    return { success: true };
  }

  // Get pending purchases for current player
  getPendingPurchases() {
    const player = this.currentPlayer;
    if (!player) return [];
    return this.pendingPurchases.filter(p => p.owner === player.id);
  }

  // Clear pending purchases (refund IPCs)
  clearPendingPurchases(unitDefs) {
    const player = this.currentPlayer;
    if (!player) return;

    for (const purchase of this.pendingPurchases) {
      if (purchase.owner === player.id) {
        const unitDef = unitDefs[purchase.type];
        if (unitDef) {
          this.playerState[player.id].ipcs += unitDef.cost * purchase.quantity;
        }
      }
    }

    this.pendingPurchases = this.pendingPurchases.filter(p => p.owner !== player.id);
    this._notify();
  }

  // Mobilize a single pending unit to a territory (MOBILIZE phase)
  mobilizeUnit(unitType, territoryName, unitDefs) {
    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const unitDef = unitDefs[unitType];
    if (!unitDef) return { success: false, error: 'Unknown unit type' };

    // Check if we have this unit pending
    const pending = this.pendingPurchases.find(p => p.type === unitType && p.owner === player.id && p.quantity > 0);
    if (!pending) {
      return { success: false, error: 'No pending units of this type' };
    }

    const capital = this.playerState[player.id].capitalTerritory;

    // Validate placement location
    if (unitDef.isSea) {
      // Naval units: placed on sea zones adjacent to territories with factories
      const validSeaZones = this._getValidNavalPlacementZones(player.id);
      if (!validSeaZones.has(territoryName)) {
        return { success: false, error: 'Naval units must be placed on sea zones adjacent to territories with factories' };
      }
    } else if (unitDef.isBuilding) {
      // Factories: placed on owned land territories without a factory
      const owner = this.getOwner(territoryName);
      if (owner !== player.id) {
        return { success: false, error: 'Factories must be placed on your own territories' };
      }
      const t = this.territoryByName[territoryName];
      if (t?.isWater) {
        return { success: false, error: 'Factories cannot be placed on water' };
      }
      // Check if territory already has a factory
      const units = this.units[territoryName] || [];
      const hasFactory = units.some(u => u.type === 'factory');
      if (hasFactory) {
        return { success: false, error: 'Territory already has a factory' };
      }
    } else {
      // Land/air units: placed on territories with factories (capital always has one)
      const factoryTerritories = this._getFactoryTerritories(player.id);
      if (!factoryTerritories.includes(territoryName)) {
        return { success: false, error: 'Units must be placed on territories with factories' };
      }
    }

    // Place the unit
    pending.quantity--;
    if (pending.quantity <= 0) {
      const idx = this.pendingPurchases.indexOf(pending);
      this.pendingPurchases.splice(idx, 1);
    }

    const units = this.units[territoryName] || [];
    const existing = units.find(u => u.type === unitType && u.owner === player.id);
    if (existing) {
      existing.quantity++;
    } else {
      units.push({ type: unitType, quantity: 1, owner: player.id });
    }
    this.units[territoryName] = units;

    this._notify();
    return { success: true };
  }

  // Get territories with factories for a player
  _getFactoryTerritories(playerId) {
    const territories = [];
    const capital = this.playerState[playerId]?.capitalTerritory;
    if (capital) territories.push(capital);

    // Check for factory buildings
    for (const [terrName, units] of Object.entries(this.units)) {
      const hasFactory = units.some(u => u.type === 'factory' && u.owner === playerId);
      if (hasFactory && !territories.includes(terrName)) {
        territories.push(terrName);
      }
    }

    return territories;
  }

  // Get valid sea zones for naval unit placement
  _getValidNavalPlacementZones(playerId) {
    const validZones = new Set();
    const factoryTerritories = this._getFactoryTerritories(playerId);

    for (const terrName of factoryTerritories) {
      const t = this.territoryByName[terrName];
      if (!t) continue;

      // Find adjacent sea zones
      for (const conn of t.connections || []) {
        const ct = this.territoryByName[conn];
        if (ct && ct.isWater) {
          validZones.add(conn);
        }
      }
    }

    return validZones;
  }

  // Legacy method - kept for initial deployment phase
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
      // Initialize friendly territories for first turn
      this._initFriendlyTerritoriesAtTurnStart();
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
    this.airUnitOrigins = {}; // Reset air unit tracking for new turn

    // Track territories that are friendly at the START of this turn (for air landing)
    this._initFriendlyTerritoriesAtTurnStart();

    // Reset conquered flag for Risk card (one card per turn)
    const player = this.currentPlayer;
    if (player) {
      this.conqueredThisTurn[player.id] = false;
    }
    this._clearMovedFlags();
    this._notify();
    this.autoSave(); // Auto-save after each turn
  }

  // Helper: populate friendly territories at turn start (for air landing validation)
  _initFriendlyTerritoriesAtTurnStart() {
    const player = this.currentPlayer;
    this.friendlyTerritoriesAtTurnStart = new Set();
    if (player) {
      for (const [terrName, state] of Object.entries(this.territoryState)) {
        if (state.owner === player.id || this.areAllies(player.id, state.owner)) {
          this.friendlyTerritoriesAtTurnStart.add(terrName);
        }
      }
    }
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
        // Check if there are any pending purchases to place
        const player = this.currentPlayer;
        const hasPurchases = this.pendingPurchases.some(p => p.owner === player.id);
        if (!hasPurchases) {
          // Skip mobilize phase if nothing to place
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
  // options.shipIds: array of specific ship IDs to move (for carriers/transports with cargo)
  // options.targetShipId: specific ship to load cargo onto
  moveUnits(fromTerritory, toTerritory, unitsToMove, unitDefs, options = {}) {
    const isCombatMove = this.turnPhase === TURN_PHASES.COMBAT_MOVE;
    const isNonCombatMove = this.turnPhase === TURN_PHASES.NON_COMBAT_MOVE;

    if (!isCombatMove && !isNonCombatMove) return { success: false, error: 'Not in movement phase' };

    const player = this.currentPlayer;
    if (!player) return { success: false, error: 'No current player' };

    const fromT = this.territoryByName[fromTerritory];
    const toT = this.territoryByName[toTerritory];
    if (!fromT || !toT) return { success: false, error: 'Invalid territory' };

    // Check for adjacent connection (includes land bridges)
    const connections = this.getConnections(fromTerritory);
    const isAdjacent = connections.includes(toTerritory);
    const isLandBridge = this.hasLandBridge(fromTerritory, toTerritory);

    // Check destination ownership
    const toOwner = this.getOwner(toTerritory);
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

    // Separate units by type for different validation
    const airUnits = unitsToMove.filter(u => unitDefs[u.type]?.isAir);
    const landUnits = unitsToMove.filter(u => unitDefs[u.type]?.isLand);
    const seaUnits = unitsToMove.filter(u => unitDefs[u.type]?.isSea);

    // For sea units, check if destination is reachable within movement range
    if (seaUnits.length > 0) {
      if (!toT?.isWater) {
        return { success: false, error: 'Naval units can only move to sea zones' };
      }
      // Get max sea movement range of units being moved
      let maxSeaMovement = 0;
      for (const seaUnit of seaUnits) {
        const def = unitDefs[seaUnit.type];
        if (def?.movement > maxSeaMovement) {
          maxSeaMovement = def.movement;
        }
      }
      // Check if destination is reachable within movement range
      if (!isAdjacent && maxSeaMovement > 1) {
        if (!this.canSeaUnitReach(fromTerritory, toTerritory, maxSeaMovement, player.id, isCombatMove)) {
          return { success: false, error: 'Sea zone not reachable within movement range' };
        }
      } else if (!isAdjacent) {
        return { success: false, error: 'Sea zones not connected for naval units' };
      }
    }

    // For land units, check if destination is reachable (multi-hop for tanks with movement > 1)
    // Also check if loading onto transport is allowed during non-combat
    let loadingOntoTransport = false;
    for (const landUnit of landUnits) {
      const unitDef = unitDefs[landUnit.type];
      if (!unitDef) continue;

      const movementRange = unitDef.movement || 1;

      // Check terrain - allow loading onto transport during movement phases
      // Combat move loading allowed for amphibious assaults (per A&A rules)
      if (toT?.isWater) {
        if ((isNonCombatMove || isCombatMove) && isAdjacent) {
          // Check if there's a transport with capacity
          const seaUnits = this.units[toTerritory] || [];
          const transports = seaUnits.filter(u => u.type === 'transport' && u.owner === player.id);
          const transportDef = unitDefs.transport;

          if (transportDef && transportDef.canCarry?.includes(landUnit.type)) {
            // Calculate total capacity available
            let availableCapacity = 0;
            for (const transport of transports) {
              const currentCargo = transport.cargo || [];
              if (this._canLoadOnTransport(currentCargo, landUnit.type)) {
                availableCapacity++;
              }
            }
            if (availableCapacity >= landUnit.quantity) {
              loadingOntoTransport = true;
            } else {
              return { success: false, error: 'Not enough transport capacity' };
            }
          } else {
            return { success: false, error: 'Land units cannot enter water without transport' };
          }
        } else {
          return { success: false, error: 'Land units cannot enter water without transport' };
        }
      } else if (movementRange > 1) {
        // Units with movement > 1 (like tanks) can blitz through friendly territory
        if (!this.canLandUnitReach(fromTerritory, toTerritory, movementRange, player.id, isCombatMove)) {
          return { success: false, error: `${landUnit.type} cannot reach ${toTerritory} (movement: ${movementRange})` };
        }
      } else {
        // Movement 1 units require adjacency
        if (!isAdjacent) {
          return { success: false, error: `${landUnit.type} can only move to adjacent territories` };
        }
      }
    }

    // For air units, check if destination is within movement range
    // Also check if landing on carrier is allowed during non-combat
    let landingOnCarrier = false;
    for (const airUnit of airUnits) {
      const unitDef = unitDefs[airUnit.type];
      if (!unitDef) continue;

      const movementRange = unitDef.movement || 4;

      // Check if destination is reachable within air unit's movement range
      if (!this.canAirUnitReach(fromTerritory, toTerritory, movementRange)) {
        return { success: false, error: `${airUnit.type} cannot reach ${toTerritory} (movement: ${movementRange})` };
      }

      // Check if landing on water (needs carrier)
      if (toT?.isWater) {
        const seaUnits = this.units[toTerritory] || [];
        const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
        const carrierDef = unitDefs.carrier;

        if (carrierDef && carrierDef.canCarry?.includes(airUnit.type)) {
          // Calculate total capacity available
          let availableCapacity = 0;
          for (const carrier of carriers) {
            const currentAircraft = carrier.aircraft || [];
            const capacity = carrierDef.aircraftCapacity || 2;
            availableCapacity += Math.max(0, capacity - currentAircraft.length);
          }
          if (availableCapacity >= airUnit.quantity) {
            landingOnCarrier = true;
          } else {
            return { success: false, error: 'Not enough carrier capacity for aircraft' };
          }
        } else {
          return { success: false, error: 'Aircraft cannot land on water without a carrier' };
        }
      }
    }

    // Track which ship IDs were moved (for move history)
    const movedShipIds = [];

    // Handle moving specific ships by ID (carriers/transports with cargo)
    // IMPORTANT: Don't return early - continue to process unitsToMove as well
    if (options.shipIds && options.shipIds.length > 0) {
      const toUnits = this.units[toTerritory] || [];

      for (const shipId of options.shipIds) {
        const shipIdx = fromUnits.findIndex(u => u.id === shipId && u.owner === player.id);
        if (shipIdx < 0) {
          return { success: false, error: `Ship ${shipId} not found` };
        }

        const ship = fromUnits[shipIdx];
        const shipDef = unitDefs[ship.type];
        const maxMove = shipDef?.movement || 2;
        const movementUsed = ship.movementUsed || 0;

        if (movementUsed >= maxMove) {
          return { success: false, error: `Ship ${shipId} has no movement remaining` };
        }

        // Remove from source
        fromUnits.splice(shipIdx, 1);

        // Add to destination with movement tracked
        ship.movementUsed = movementUsed + 1;
        ship.moved = ship.movementUsed >= maxMove; // Mark fully moved when out of movement
        toUnits.push(ship);
        movedShipIds.push(shipId);
      }

      this.units[toTerritory] = toUnits;
    }

    for (const moveUnit of unitsToMove) {
      const unitDef = unitDefs[moveUnit.type];
      if (!unitDef) continue;

      // Find the unit in source territory - prefer grouped units over individual ships
      // Individual ships (with IDs) should be moved using options.shipIds
      let sourceUnit = fromUnits.find(u =>
        u.type === moveUnit.type &&
        u.owner === player.id &&
        !u.moved &&
        !u.id // Prefer grouped units
      );

      // Fall back to individual ships if no grouped units
      if (!sourceUnit) {
        sourceUnit = fromUnits.find(u =>
          u.type === moveUnit.type &&
          u.owner === player.id &&
          !u.moved
        );
      }

      if (!sourceUnit || sourceUnit.quantity < moveUnit.quantity) {
        return { success: false, error: `Not enough ${moveUnit.type} to move` };
      }

      // Check movement rules
      // Air units can fly over any terrain (land or water) - already validated above
      if (unitDef.isAir) {
        // Air units validated above for multi-hop movement
        // They can land on water if there's a carrier (handled below)
      } else if (isLandBridge) {
        // Land bridges allow land units to cross without naval transport
        if (unitDef.isSea) {
          return { success: false, error: 'Naval units cannot use land bridges' };
        }
      } else {
        // Normal movement rules for land and sea units
        // Allow land units to water if loading onto transport (validated above)
        if (unitDef.isLand && toT?.isWater && !loadingOntoTransport) {
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

      // Handle special loading onto carriers/transports
      const toUnits = this.units[toTerritory] || [];

      if (unitDef.isAir && landingOnCarrier && toT?.isWater) {
        // Load onto carrier - individualize ship when loading aircraft
        const carrierDef = unitDefs.carrier;
        let remaining = moveUnit.quantity;

        // First try individual carriers (already have IDs)
        const individualCarriers = toUnits.filter(u =>
          u.type === 'carrier' && u.owner === player.id && u.id
        );

        for (const carrier of individualCarriers) {
          if (remaining <= 0) break;
          carrier.aircraft = carrier.aircraft || [];
          const capacity = carrierDef?.aircraftCapacity || 2;
          const available = capacity - carrier.aircraft.length;
          const toLoad = Math.min(remaining, available);

          for (let i = 0; i < toLoad; i++) {
            carrier.aircraft.push({ type: moveUnit.type, owner: player.id });
          }
          remaining -= toLoad;
        }

        // Then use grouped carriers - individualize each one used
        while (remaining > 0) {
          const newCarrier = this._individualizeShip(toTerritory, 'carrier', player.id);
          if (!newCarrier) break;

          newCarrier.aircraft = newCarrier.aircraft || [];
          const capacity = carrierDef?.aircraftCapacity || 2;
          const available = capacity - newCarrier.aircraft.length;
          const toLoad = Math.min(remaining, available);

          for (let i = 0; i < toLoad; i++) {
            newCarrier.aircraft.push({ type: moveUnit.type, owner: player.id });
          }
          remaining -= toLoad;
        }
      } else if (unitDef.isLand && loadingOntoTransport && toT?.isWater) {
        // Load onto transport - individualize ship when loading cargo
        let remaining = moveUnit.quantity;

        // First try individual transports (already have IDs)
        const individualTransports = toUnits.filter(u =>
          u.type === 'transport' && u.owner === player.id && u.id
        );

        for (const transport of individualTransports) {
          if (remaining <= 0) break;
          transport.cargo = transport.cargo || [];

          while (remaining > 0 && this._canLoadOnTransport(transport.cargo, moveUnit.type)) {
            transport.cargo.push({ type: moveUnit.type, owner: player.id });
            remaining--;
          }
        }

        // Then use grouped transports - individualize each one used
        while (remaining > 0) {
          const newTransport = this._individualizeShip(toTerritory, 'transport', player.id);
          if (!newTransport) break;

          while (remaining > 0 && this._canLoadOnTransport(newTransport.cargo, moveUnit.type)) {
            newTransport.cargo.push({ type: moveUnit.type, owner: player.id });
            remaining--;
          }
        }
      } else {
        // Normal movement - add to destination
        // IMPORTANT: Don't merge with unmoved units - keep them separate so they can still move
        const destUnit = toUnits.find(u => u.type === moveUnit.type && u.owner === player.id && u.moved);
        if (destUnit) {
          // Merge with existing moved stack
          destUnit.quantity += moveUnit.quantity;
        } else {
          // Create new moved stack (separate from any unmoved units in territory)
          toUnits.push({
            type: moveUnit.type,
            quantity: moveUnit.quantity,
            owner: player.id,
            moved: true
          });
        }
      }
      this.units[toTerritory] = toUnits;
    }

    // Check if we captured an empty enemy territory (land only, not water)
    // Per A&A rules: Only LAND units can capture territory - air units cannot hold ground
    let captured = false;
    let cardAwarded = null;

    // Check if we moved any land units (only land units can capture)
    const movedLandUnits = unitsToMove.some(u => {
      const def = unitDefs[u.type];
      return def && def.isLand;
    });

    if (!toT?.isWater && isEnemy && movedLandUnits) {
      // Check if there are any enemy units remaining
      const enemyUnits = this.units[toTerritory]?.filter(u =>
        u.owner !== player.id && !this.areAllies(player.id, u.owner)
      ) || [];
      if (enemyUnits.length === 0) {
        // Capture the territory immediately
        this.territoryState[toTerritory].owner = player.id;
        captured = true;

        // Award Risk card for conquering (one per turn per Risk rules)
        if (!this.conqueredThisTurn[player.id]) {
          this.conqueredThisTurn[player.id] = true;
          cardAwarded = this.awardRiskCard(player.id);
        }
      }
    }

    // Record move with full info for undo
    this.moveHistory.push({
      from: fromTerritory,
      to: toTerritory,
      units: unitsToMove.map(u => ({ ...u })),
      shipIds: movedShipIds.length > 0 ? movedShipIds : undefined,
      player: player.id,
      captured, // Track if territory was captured for undo
      previousOwner: isEnemy ? toOwner : null,
    });

    // Track air unit origins for post-combat landing (combat move only)
    if (isCombatMove) {
      for (const moveUnit of unitsToMove) {
        const def = unitDefs[moveUnit.type];
        if (def?.isAir) {
          // Calculate distance traveled
          const distance = this._calculateAirDistance(fromTerritory, toTerritory);

          // Store origin info for this territory
          if (!this.airUnitOrigins[toTerritory]) {
            this.airUnitOrigins[toTerritory] = {};
          }

          // Track origin - if moving again, keep original origin
          const existingOrigin = this.airUnitOrigins[fromTerritory]?.[moveUnit.type];
          if (existingOrigin) {
            // Already moved once, update destination but keep original origin
            this.airUnitOrigins[toTerritory][moveUnit.type] = {
              origin: existingOrigin.origin,
              distance: existingOrigin.distance + distance,
              movement: def.movement,
            };
            // Remove from old location tracking
            delete this.airUnitOrigins[fromTerritory][moveUnit.type];
          } else {
            // First move - record origin
            this.airUnitOrigins[toTerritory][moveUnit.type] = {
              origin: fromTerritory,
              distance: distance,
              movement: def.movement,
            };
          }
        }
      }
    }

    this._notify();
    return {
      success: true,
      from: fromTerritory,
      to: toTerritory,
      units: unitsToMove,
      shipIds: movedShipIds.length > 0 ? movedShipIds : undefined,
      captured,
      cardAwarded,
      isAttack: isCombatMove && isEnemy && !captured,
    };
  }

  // Undo the last movement (during combat or non-combat move phase)
  undoLastMove() {
    if (this.turnPhase !== TURN_PHASES.COMBAT_MOVE && this.turnPhase !== TURN_PHASES.NON_COMBAT_MOVE) {
      return { success: false, error: 'Can only undo during movement phases' };
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

    // If territory was captured by this move, restore previous owner
    if (lastMove.captured && lastMove.previousOwner) {
      this.territoryState[lastMove.to].owner = lastMove.previousOwner;
    }

    this._notify();
    return { success: true };
  }

  // Detect territories where combat should occur
  // Per A&A rules: Naval battles are resolved before land battles (amphibious assaults)
  _detectCombats() {
    this.combatQueue = [];
    this.clearedSeaZones = new Set(); // Track sea zones cleared for shore bombardment
    // Note: amphibiousTerritories is set during combat move and used during combat phase
    const player = this.currentPlayer;
    if (!player) return;

    const navalCombats = [];
    const landCombats = [];

    for (const [territory, units] of Object.entries(this.units)) {
      const hasPlayerUnits = units.some(u => u.owner === player.id);
      const hasEnemyUnits = units.some(u =>
        u.owner !== player.id && !this.areAllies(player.id, u.owner)
      );

      if (hasPlayerUnits && hasEnemyUnits) {
        const t = this.territoryByName[territory];
        if (t?.isWater) {
          navalCombats.push(territory);
        } else {
          landCombats.push(territory);
        }
      }
    }

    // Naval battles first, then land battles
    this.combatQueue = [...navalCombats, ...landCombats];
  }

  // Mark a sea zone as cleared for shore bombardment (after winning naval battle)
  markSeaZoneCleared(seaZone) {
    if (!this.clearedSeaZones) this.clearedSeaZones = new Set();
    this.clearedSeaZones.add(seaZone);
  }

  // Check if a sea zone is clear for shore bombardment
  isSeaZoneClearedForBombardment(seaZone) {
    // A sea zone is cleared if:
    // 1. It has no enemy combat units, OR
    // 2. We won the naval battle there (marked as cleared)
    const units = this.units[seaZone] || [];
    const player = this.currentPlayer;
    if (!player) return false;

    // Check for enemy combat units (anything that isn't ours or an ally's)
    const hasEnemyCombatUnits = units.some(u => {
      if (u.owner === player.id) return false;
      if (this.areAllies(player.id, u.owner)) return false;
      // Any enemy unit in sea zone blocks bombardment
      return true;
    });

    if (!hasEnemyCombatUnits) return true;
    return this.clearedSeaZones?.has(seaZone) || false;
  }

  // Check if a territory has amphibious attackers (units unloaded from transports)
  hasAmphibiousAssault(territory) {
    return this.amphibiousTerritories?.has(territory) || false;
  }

  // Resolve combat in a territory (dice combat with naval rules)
  resolveCombat(territory, unitDefs) {
    const units = this.units[territory] || [];
    const player = this.currentPlayer;
    if (!player) return null;

    const attackers = units.filter(u => u.owner === player.id);
    // All enemy units in territory (for rolling dice - AA guns still roll at aircraft)
    const allDefenders = units.filter(u => u.owner !== player.id && !this.areAllies(player.id, u.owner));
    // Combat defenders - units that can actually stop an attack (exclude factories and 0/0 units)
    const combatDefenders = allDefenders.filter(u => {
      // Factories are captured, not combat units
      if (u.type === 'factory') return false;
      // Units with 0 attack and 0 defense can't stop an attack
      const def = unitDefs[u.type];
      if (def && def.defense === 0 && def.attack === 0) return false;
      return true;
    });

    if (attackers.length === 0 || combatDefenders.length === 0) {
      // Attacker wins if there are no combat defenders (factories/AA captured)
      if (attackers.length > 0 && allDefenders.length > 0) {
        // Capture territory and transfer factory/AA gun ownership
        const t = this.territoryByName[territory];
        if (!t?.isWater) {
          this.territoryState[territory].owner = player.id;
          // Transfer factory and AA gun ownership (captured, not destroyed - A&A Anniversary rules)
          for (const unit of units) {
            if (unit.type === 'factory' || unit.type === 'aaGun') {
              unit.owner = player.id;
              // Ensure unit has quantity (safeguard)
              if (!unit.quantity || unit.quantity < 1) {
                unit.quantity = 1;
              }
            }
          }
          // Award Risk card for conquering
          if (!this.conqueredThisTurn[player.id]) {
            this.conqueredThisTurn[player.id] = true;
            this.awardRiskCard(player.id);
          }
        }
      }
      // Repair damaged ships at end of combat
      this._repairDamagedShips(units, unitDefs);
      // Remove from combat queue
      this.combatQueue = this.combatQueue.filter(t => t !== territory);
      this._notify();
      return { resolved: true, winner: attackers.length > 0 ? 'attacker' : 'defender', conquered: attackers.length > 0 };
    }

    const t = this.territoryByName[territory];
    const isNavalBattle = t?.isWater;

    // Shore bombardment: ships in adjacent sea zones can bombard land battles (first round only)
    let bombardmentHits = 0;
    let bombardmentRolls = [];
    if (!isNavalBattle && !this._combatRoundsTracker?.[territory]) {
      const bombardmentResult = this._calculateShoreBombardment(territory, player.id, unitDefs);
      bombardmentHits = bombardmentResult.hits;
      bombardmentRolls = bombardmentResult.rolls;
    }
    // Track combat rounds
    if (!this._combatRoundsTracker) this._combatRoundsTracker = {};
    this._combatRoundsTracker[territory] = (this._combatRoundsTracker[territory] || 0) + 1;

    // Roll dice for combat (allDefenders includes AA guns which can fire at aircraft)
    const { hits: attackHits, rolls: attackRolls } = this._rollCombatWithRolls(attackers, 'attack', unitDefs);
    const { hits: defenseHits, rolls: defenseRolls } = this._rollCombatWithRolls(allDefenders, 'defense', unitDefs);

    // Add bombardment hits to attack hits
    const totalAttackHits = attackHits + bombardmentHits;

    // Apply casualties (handles multi-hit ships)
    // Defenders take hits from attacks + bombardment
    const attackerCasualties = this._applyCasualtiesWithDamage(allDefenders, totalAttackHits, unitDefs, isNavalBattle);
    const defenderCasualties = this._applyCasualtiesWithDamage(attackers, defenseHits, unitDefs, isNavalBattle);

    // Clean up destroyed units (quantity <= 0)
    // IMPORTANT: Preserve factories - they are captured, never destroyed
    this.units[territory] = units.filter(u => u.quantity > 0 || u.type === 'factory');

    // Check if combat is over
    // Note: Factories are captured (not destroyed) and AA guns have 0 combat value
    // Only count units that can actually fight as "remaining"
    const remainingAttackers = this.units[territory].filter(u => u.owner === player.id);
    const remainingDefenders = this.units[territory].filter(u => {
      if (u.owner === player.id || this.areAllies(player.id, u.owner)) return false;
      // Factories are captured, not combat units - don't count them as defenders
      if (u.type === 'factory') return false;
      // AA guns with 0 defense can't stop an attack - they're captured with the territory
      const def = unitDefs[u.type];
      if (def && def.defense === 0 && def.attack === 0) return false;
      return true;
    });

    const result = {
      attackHits,
      defenseHits,
      bombardmentHits,
      bombardmentRolls,
      attackRolls,
      defenseRolls,
      attackerCasualties,
      defenderCasualties,
      attackersRemaining: remainingAttackers.reduce((sum, u) => sum + u.quantity, 0),
      defendersRemaining: remainingDefenders.reduce((sum, u) => sum + u.quantity, 0),
    };

    if (remainingDefenders.length === 0) {
      // Attacker wins
      if (isNavalBattle) {
        // Naval battle won - mark sea zone as cleared for shore bombardment
        this.markSeaZoneCleared(territory);
      } else {
        // Land battle won - capture territory
        const defender = allDefenders[0]?.owner;
        this.territoryState[territory].owner = player.id;

        // Transfer factory and AA gun ownership to the winner (captured, not destroyed - A&A Anniversary rules)
        const territoryUnits = this.units[territory] || [];
        for (const unit of territoryUnits) {
          if (unit.type === 'factory' || unit.type === 'aaGun') {
            unit.owner = player.id;
            // Ensure unit has quantity (safeguard)
            if (!unit.quantity || unit.quantity < 1) {
              unit.quantity = 1;
            }
          }
        }

        // Award Risk card for conquering (one per turn per Risk rules)
        if (!this.conqueredThisTurn[player.id]) {
          this.conqueredThisTurn[player.id] = true;
          const cardType = this.awardRiskCard(player.id);
          result.cardAwarded = cardType;
        }
      }
      // Repair surviving damaged ships
      this._repairDamagedShips(this.units[territory], unitDefs);
      this.combatQueue = this.combatQueue.filter(t => t !== territory);
      // Clean up combat rounds tracker
      if (this._combatRoundsTracker) delete this._combatRoundsTracker[territory];
      result.resolved = true;
      result.winner = 'attacker';
      result.conquered = !isNavalBattle; // Only land territories are "conquered"
    } else if (remainingAttackers.length === 0) {
      // Repair surviving damaged ships
      this._repairDamagedShips(this.units[territory], unitDefs);
      this.combatQueue = this.combatQueue.filter(t => t !== territory);
      // Clean up combat rounds tracker
      if (this._combatRoundsTracker) delete this._combatRoundsTracker[territory];
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

  // Calculate shore bombardment from ships in adjacent sea zones
  _calculateShoreBombardment(territory, attackerId, unitDefs) {
    let hits = 0;
    const rolls = [];

    // Find adjacent sea zones
    const t = this.territoryByName[territory];
    if (!t || t.isWater) return { hits: 0, rolls: [] };

    const connections = t.connections || [];
    for (const connName of connections) {
      const connT = this.territoryByName[connName];
      if (!connT?.isWater) continue;

      // Per A&A rules: Shore bombardment only allowed from sea zones where:
      // 1. There are no enemy ships, OR
      // 2. The naval battle was already won (sea zone cleared)
      if (!this.isSeaZoneClearedForBombardment(connName)) {
        continue; // Skip - naval battle not yet resolved
      }

      // Check for friendly ships that can bombard
      const seaUnits = this.units[connName] || [];
      for (const unit of seaUnits) {
        if (unit.owner !== attackerId) continue;

        const def = unitDefs[unit.type];
        if (!def?.isSea) continue;

        // Ships that can bombard: battleships (attack 4) and cruisers (attack 3)
        // In A&A, only battleships and cruisers can shore bombard
        if (unit.type === 'battleship' || unit.type === 'cruiser') {
          const bombardValue = def.attack;
          for (let i = 0; i < unit.quantity; i++) {
            const roll = Math.floor(Math.random() * 6) + 1;
            const isHit = roll <= bombardValue;
            rolls.push({ unit: unit.type, roll, hit: isHit, source: connName });
            if (isHit) hits++;
          }
        }
      }
    }

    return { hits, rolls };
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
      // Skip factories - they are captured, not destroyed
      if (u.type === 'factory') return false;
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

  // Repair all damaged battleships owned by a player at end of turn (A&A Anniversary rule)
  _repairPlayerBattleships(playerId) {
    for (const [territory, units] of Object.entries(this.units)) {
      for (const unit of units) {
        if (unit.owner === playerId && unit.type === 'battleship' && unit.damaged) {
          unit.damaged = false;
          unit.damagedCount = 0;
        }
      }
    }
  }

  // Fisher-Yates shuffle for randomizing player order
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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

  // Place purchased units at their designated territories (selected during purchase phase)
  _mobilizePurchases() {
    const player = this.currentPlayer;
    if (!player) return;

    // Get player's pending purchases
    const playerPurchases = this.pendingPurchases.filter(p => p.owner === player.id);
    if (playerPurchases.length === 0) return;

    // Place each purchase at its designated territory
    for (const purchase of playerPurchases) {
      const territory = purchase.territory;
      if (!territory) {
        console.warn('Purchase missing territory:', purchase);
        continue;
      }

      const units = this.units[territory] || [];
      const existing = units.find(u => u.type === purchase.type && u.owner === player.id);
      if (existing) {
        existing.quantity += purchase.quantity;
      } else {
        units.push({ type: purchase.type, quantity: purchase.quantity, owner: player.id });
      }
      this.units[territory] = units;
    }

    // Remove player's purchases from pending
    this.pendingPurchases = this.pendingPurchases.filter(p => p.owner !== player.id);
  }

  // Collect income from territories
  _collectIncome() {
    const player = this.currentPlayer;
    if (!player) return;

    // Repair damaged battleships at turn end (A&A Anniversary rule)
    this._repairPlayerBattleships(player.id);

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
    // Clear moved flags and consolidate duplicate stacks
    for (const territory of Object.keys(this.units)) {
      const units = this.units[territory];

      // Clear flags first
      for (const unit of units) {
        delete unit.moved;
        delete unit.movementUsed;
      }

      // Consolidate duplicate stacks (same type + owner, no special properties)
      // Skip units with IDs, cargo, or aircraft - those need to stay individual
      const consolidated = [];
      const grouped = new Map(); // key: "type_owner" -> quantity

      for (const unit of units) {
        // Keep individual ships (with IDs) and units with cargo/aircraft separate
        if (unit.id || (unit.cargo && unit.cargo.length > 0) || (unit.aircraft && unit.aircraft.length > 0)) {
          consolidated.push(unit);
        } else {
          const key = `${unit.type}_${unit.owner}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.quantity += unit.quantity;
          } else {
            grouped.set(key, { type: unit.type, owner: unit.owner, quantity: unit.quantity });
          }
        }
      }

      // Add consolidated groups
      for (const unit of grouped.values()) {
        consolidated.push(unit);
      }

      this.units[territory] = consolidated;
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

  // Find all valid card sets that can be traded
  _findAllValidCardSets(cards) {
    const counts = { infantry: 0, cavalry: 0, artillery: 0, wild: 0 };
    for (const c of cards) counts[c]++;

    const validSets = [];

    // 3 of same type
    for (const type of ['infantry', 'cavalry', 'artillery']) {
      if (counts[type] >= 3) validSets.push([type, type, type]);
    }

    // 3 wilds
    if (counts.wild >= 3) validSets.push(['wild', 'wild', 'wild']);

    // 1 of each (no wilds used)
    if (counts.infantry >= 1 && counts.cavalry >= 1 && counts.artillery >= 1) {
      validSets.push(['infantry', 'cavalry', 'artillery']);
    }

    // 2 of a kind + 1 wild
    for (const type of ['infantry', 'cavalry', 'artillery']) {
      if (counts[type] >= 2 && counts.wild >= 1) {
        validSets.push([type, type, 'wild']);
      }
    }

    // 1 of a kind + 2 wilds
    for (const type of ['infantry', 'cavalry', 'artillery']) {
      if (counts[type] >= 1 && counts.wild >= 2) {
        validSets.push([type, 'wild', 'wild']);
      }
    }

    // 2 different types + 1 wild (making "1 of each" with wild)
    const types = ['infantry', 'cavalry', 'artillery'].filter(t => counts[t] >= 1);
    if (types.length >= 2 && counts.wild >= 1) {
      // Add all combinations of 2 types + wild
      for (let i = 0; i < types.length; i++) {
        for (let j = i + 1; j < types.length; j++) {
          validSets.push([types[i], types[j], 'wild']);
        }
      }
    }

    return validSets;
  }

  _findValidCardSet(cards) {
    const sets = this._findAllValidCardSets(cards);
    return sets.length > 0 ? sets[0] : null;
  }

  // Get all valid card sets for selection UI
  getValidCardSets(playerId) {
    const cards = this.riskCards[playerId] || [];
    return this._findAllValidCardSets(cards);
  }

  // Trade RISK cards for IPCs
  tradeRiskCards(playerId) {
    // Can only trade during purchase phase
    if (this.turnPhase !== TURN_PHASES.PURCHASE) {
      return { success: false, ipcs: 0, error: 'Can only trade cards during Purchase phase' };
    }

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

  // Trade a specific set of RISK cards (for UI selection)
  tradeSpecificCards(playerId, cardSet) {
    // Can only trade during purchase phase
    if (this.turnPhase !== TURN_PHASES.PURCHASE) {
      return { success: false, ipcs: 0, error: 'Can only trade cards during Purchase phase' };
    }

    const cards = this.riskCards[playerId] || [];

    // Validate the set exists in player's hand
    const tempCards = [...cards];
    for (const cardType of cardSet) {
      const idx = tempCards.indexOf(cardType);
      if (idx < 0) {
        return { success: false, ipcs: 0, error: 'Invalid card set' };
      }
      tempCards.splice(idx, 1);
    }

    // Remove the cards from player's hand
    for (const cardType of cardSet) {
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
    // Transport capacity: 2 infantry OR 1 infantry + 1 other ground unit
    // Valid combinations: 2 inf, 1 inf + 1 tank, 1 inf + 1 artillery, or 1 tank/artillery alone
    const infantryCount = cargo.filter(c => c.type === 'infantry').length;
    const otherCount = cargo.filter(c => c.type !== 'infantry').length;
    const totalCount = cargo.length;

    // Transport is full at 2 units
    if (totalCount >= 2) {
      return false;
    }

    if (unitType === 'infantry') {
      // Infantry can always be added if transport not full
      // - Empty: start with infantry
      // - 1 infantry: makes 2 infantry (valid)
      // - 1 other: makes 1 inf + 1 other (valid)
      return true;
    } else {
      // Non-infantry (tank/artillery) can be added if:
      // - Empty: 1 tank alone
      // - 1 infantry only: makes 1 inf + 1 tank (valid)
      // Cannot add if there's already a non-infantry (no 2 tanks)
      return otherCount === 0;
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
    // IMPORTANT: Don't merge with unmoved units - keep them separate so they can still move
    const coastalUnits = this.units[coastalTerritory] || [];
    for (const cargo of transport.cargo) {
      const existing = coastalUnits.find(u => u.type === cargo.type && u.owner === cargo.owner && u.moved);
      if (existing) {
        existing.quantity++;
      } else {
        coastalUnits.push({ type: cargo.type, quantity: 1, owner: cargo.owner, moved: true });
      }
    }
    this.units[coastalTerritory] = coastalUnits;

    // Mark as amphibious assault if unloading during combat move to enemy territory
    if (this.turnPhase === TURN_PHASES.COMBAT_MOVE) {
      const owner = this.getOwner(coastalTerritory);
      if (owner && owner !== player.id && !this.areAllies(player.id, owner)) {
        this.amphibiousTerritories.add(coastalTerritory);
      }
    }

    // Clear transport cargo
    transport.cargo = [];

    this._notify();
    return { success: true };
  }

  // Unload a single unit from transport to coastal territory
  unloadSingleUnit(seaZone, transportIndex, unitType, coastalTerritory) {
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

    // Find the unit in cargo
    const cargoIdx = transport.cargo.findIndex(c => c.type === unitType && c.owner === player.id);
    if (cargoIdx < 0) {
      return { success: false, error: `No ${unitType} in transport` };
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

    // Remove from transport cargo
    transport.cargo.splice(cargoIdx, 1);

    // Add to coastal territory
    // IMPORTANT: Don't merge with unmoved units - keep them separate so they can still move
    const coastalUnits = this.units[coastalTerritory] || [];
    const existing = coastalUnits.find(u => u.type === unitType && u.owner === player.id && u.moved);
    if (existing) {
      existing.quantity++;
    } else {
      coastalUnits.push({ type: unitType, quantity: 1, owner: player.id, moved: true });
    }
    this.units[coastalTerritory] = coastalUnits;

    // Mark as amphibious assault if unloading during combat move to enemy territory
    if (this.turnPhase === TURN_PHASES.COMBAT_MOVE) {
      const owner = this.getOwner(coastalTerritory);
      if (owner && owner !== player.id && !this.areAllies(player.id, owner)) {
        this.amphibiousTerritories.add(coastalTerritory);
      }
    }

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
      version: 8,
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
      // v8: Save air unit origin tracking for proper landing calculation after load
      airUnitOrigins: this.airUnitOrigins,
      friendlyTerritoriesAtTurnStart: Array.from(this.friendlyTerritoriesAtTurnStart || []),
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

    // v8: Restore air unit tracking for proper landing calculation
    this.airUnitOrigins = data.airUnitOrigins || {};
    if (data.friendlyTerritoriesAtTurnStart) {
      this.friendlyTerritoriesAtTurnStart = new Set(data.friendlyTerritoriesAtTurnStart);
    } else {
      // Older saves (v7 and below): Re-initialize friendly territories
      // This is approximate but better than empty - includes all currently owned territories
      this._initFriendlyTerritoriesAtTurnStart();
    }

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
