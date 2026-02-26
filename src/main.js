// Entry point: loads data, initializes all systems, runs the render loop.

// Polyfill for roundRect (not supported in older Chrome versions)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    const r = typeof radii === 'number' ? radii : (radii?.[0] ?? 0);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

import { Camera, MAP_WIDTH } from './map/camera.js';
import { MapRenderer } from './map/mapRenderer.js';
import { TerritoryRenderer } from './map/territoryRenderer.js';
import { TerritoryMap } from './map/territoryMap.js';
import { UnitRenderer } from './map/unitRenderer.js';
import { PlayerPanel } from './ui/playerPanel.js';
import { TerritoryTooltip } from './ui/territoryTooltip.js';
import { PurchasePopup } from './ui/purchasePopup.js';
import { MovementUI } from './ui/movementUI.js';
import { CombatUI } from './ui/combatUI.js';
import { TechUI } from './ui/techUI.js';
import { PlacementUI } from './ui/placementUI.js';
import { MobilizeUI } from './ui/mobilizeUI.js';
import { RulesPanel } from './ui/rulesPanel.js';
import { HUD } from './ui/hud.js';
import { Minimap } from './ui/minimap.js';
import { Lobby } from './ui/lobby.js';
import { ContinentPanel } from './ui/continentPanel.js';
import { GameState, GAME_PHASES, TURN_PHASES } from './state/gameState.js';
import { VictoryScreen } from './ui/victoryScreen.js';
import { AIController } from './ai/aiController.js';
import { ActionLog } from './ui/actionLog.js';
import { BugTracker } from './ui/bugTracker.js';
import { AirLandingUI } from './ui/airLandingUI.js';
import { RocketUI } from './ui/rocketUI.js';
import { UnitTooltip } from './ui/unitTooltip.js';

// Multiplayer imports
import { initializeFirebase, isFirebaseConfigured } from './multiplayer/firebase.js';
import { getAuthManager } from './multiplayer/auth.js';
import { getLobbyManager } from './multiplayer/lobbyManager.js';
import { createSyncManager } from './multiplayer/syncManager.js';
import { createMultiplayerGuard } from './multiplayer/multiplayerGuard.js';
import { AuthScreen } from './ui/authScreen.js';
import { MultiplayerLobby } from './ui/multiplayerLobby.js';
import { GameList } from './ui/gameList.js';

// DEBUG: Set to true to log sea zone click coordinates for positioning
const DEBUG_SEA_ZONE_CLICKS = false;
const DEBUG_SEA_ZONE_OFFSETS = []; // Accumulates all clicked offsets

function wrapX(x) {
  return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}

// Simple notification display for game events
function showNotification(message, duration = 3000) {
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:1000;pointer-events:none;';
    document.body.appendChild(container);
  }

  const notif = document.createElement('div');
  notif.className = 'game-notification';
  notif.textContent = message;
  notif.style.cssText = 'background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:8px;margin-bottom:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:notifFadeIn 0.3s ease;';
  container.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, duration);
}

async function init() {
  // Load data
  const [territoriesRes, continentsRes, setupRes, unitsRes] = await Promise.all([
    fetch('data/territories.json'),
    fetch('data/continents.json'),
    fetch('data/setup.json'),
    fetch('data/units.json'),
  ]);
  const territories = await territoriesRes.json();
  const continents = await continentsRes.json();
  const setup = await setupRes.json();
  const unitDefs = await unitsRes.json();

  // Canvas setup
  const canvas = document.getElementById('mapCanvas');
  const ctx = canvas.getContext('2d');

  // Initialize systems
  const camera = new Camera(canvas);
  const mapRenderer = new MapRenderer();
  const territoryRenderer = new TerritoryRenderer(territories, continents);
  const territoryMap = new TerritoryMap(territories);

  function resizeCanvas() {
    const dpr = devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    camera.onResize();
  }

  // UI
  const hud = new HUD();
  const minimap = new Minimap(camera);

  // State
  let hoverTerritory = null;
  let selectedTerritory = null;
  let gameState = null;
  let unitRenderer = null;

  // Hover tooltip delay state
  let hoverTooltipTimeout = null;
  let lastHoverPos = { x: 0, y: 0 };
  const TOOLTIP_DELAY = 400; // ms before showing tooltip

  // Drag-and-drop state for unit movement
  let isDraggingUnits = false;
  let dragSourceTerritory = null;
  let dragStartPos = { x: 0, y: 0 };
  let dragCurrentPos = { x: 0, y: 0 };
  let dragValidDestinations = [];
  const DRAG_THRESHOLD = 5; // pixels before drag starts

  // Territory tooltip (shows on hover)
  const tooltip = new TerritoryTooltip(continents);
  tooltip.setUnitDefs(unitDefs);

  // Unit tooltip (shows on hover over unit icons)
  const unitTooltip = new UnitTooltip();
  unitTooltip.setUnitDefs(unitDefs);

  // Player panel (replaces territory-focused sidebar)
  const playerPanel = new PlayerPanel();
  playerPanel.setUnitDefs(unitDefs);

  // Purchase popup overlay
  const purchasePopup = new PurchasePopup();
  purchasePopup.setUnitDefs(unitDefs);
  purchasePopup.setTerritories(territories);

  // Movement UI
  const movementUI = new MovementUI();
  movementUI.setUnitDefs(unitDefs);
  movementUI.setTerritories(territories);

  // Combat UI
  const combatUI = new CombatUI();
  combatUI.setUnitDefs(unitDefs);

  // Tech UI
  const techUI = new TechUI();

  // Placement UI (for Risk initial setup)
  const placementUI = new PlacementUI();
  placementUI.setUnitDefs(unitDefs);
  placementUI.setTerritories(territories);

  // Mobilize UI (for placing purchased units)
  const mobilizeUI = new MobilizeUI();
  mobilizeUI.setUnitDefs(unitDefs);
  mobilizeUI.setTerritories(territories);

  // Victory Screen
  const victoryScreen = new VictoryScreen();

  // Action Log (game event log)
  const actionLog = new ActionLog();

  // Rules Panel
  const rulesPanel = new RulesPanel();

  // Bug Tracker
  const bugTracker = new BugTracker();

  // Air Landing UI (for placing air units after combat)
  const airLandingUI = new AirLandingUI();
  airLandingUI.setUnitDefs(unitDefs);
  airLandingUI.setTerritories(territories);

  // Rocket Attack UI (for rockets technology)
  const rocketUI = new RocketUI();
  rocketUI.setUnitDefs(unitDefs);

  // Rules button is now in the HUD (top bar)

  // Action handler for player panel buttons
  playerPanel.setActionCallback((action, data) => {
    if (!gameState) return;

    switch (action) {
      case 'place-capital':
        // Capture player BEFORE placeCapital (which advances the turn)
        const placingPlayer = gameState.currentPlayer;
        if (gameState.placeCapital(data.territory)) {
          actionLog.logCapitalPlacement(data.territory, placingPlayer);
          camera.dirty = true;
          selectedTerritory = null;
          playerPanel.setSelectedTerritory(null);

          // Don't auto-pan during initial deployment - let player explore the map
        }
        break;

      case 'open-purchase':
        // Close other modals first
        techUI.hide();
        combatUI.hide();
        purchasePopup.show();
        break;

      case 'open-tech':
        // Close other modals first
        purchasePopup.hide();
        combatUI.hide();
        techUI.show();
        break;

      case 'trade-cards':
        // Risk cards can only be traded during the PURCHASE phase
        if (gameState.turnPhase !== TURN_PHASES.PURCHASE) {
          console.log('Risk cards can only be traded during the Purchase phase');
          break;
        }
        if (gameState.canTradeRiskCards(gameState.currentPlayer.id)) {
          const result = gameState.tradeRiskCards(gameState.currentPlayer.id);
          if (result.success) {
            actionLog.logCardTrade(gameState.currentPlayer, result.ipcs);
            camera.dirty = true;
          }
        }
        break;

      case 'trade-set':
        // Trade a specific card set (when multiple options exist)
        if (gameState.turnPhase !== TURN_PHASES.PURCHASE) {
          console.log('Risk cards can only be traded during the Purchase phase');
          break;
        }
        if (data.cardSet) {
          const result = gameState.tradeSpecificCards(gameState.currentPlayer.id, data.cardSet);
          if (result.success) {
            actionLog.logCardTrade(gameState.currentPlayer, result.ipcs);
            camera.dirty = true;
          }
        }
        break;

      case 'undo-move':
        const undoResult = gameState.undoLastMove();
        if (undoResult.success) {
          camera.dirty = true;
        }
        break;

      case 'undo-purchase':
        if (data.unitType) {
          const undoPurchaseResult = gameState.removeFromPendingPurchases(data.unitType, unitDefs);
          if (undoPurchaseResult.success) {
            camera.dirty = true;
          }
        }
        break;

      case 'clear-purchases':
        gameState.clearPendingPurchases(unitDefs);
        camera.dirty = true;
        break;

      case 'trade-risk-cards':
        // Trade Risk cards for IPCs during purchase phase
        if (gameState.turnPhase === TURN_PHASES.PURCHASE) {
          const result = gameState.tradeRiskCards(gameState.currentPlayer.id);
          if (result.success) {
            actionLog.logCardTrade(gameState.currentPlayer, result.ipcs);
            camera.dirty = true;
          }
        }
        break;

      case 'buy-unit':
        // Inline purchase - add or remove unit from pending purchases
        if (data.unitType && data.delta) {
          const def = unitDefs[data.unitType];
          if (!def) break;

          if (data.delta > 0) {
            // Add unit - function signature is addToPendingPurchases(unitType, unitDefs, territory)
            gameState.addToPendingPurchases(data.unitType, unitDefs, null);
          } else {
            // Remove unit
            gameState.removeFromPendingPurchases(data.unitType, unitDefs);
          }
          camera.dirty = true;
        }
        break;

      case 'buy-max':
        // Buy maximum affordable units of this type
        if (data.unitType) {
          const def = unitDefs[data.unitType];
          if (!def) break;

          // Apply industrial tech discount for max calculation
          let unitCost = def.cost;
          if (gameState.hasTech(gameState.currentPlayer.id, 'industrialTech')) {
            unitCost = Math.max(1, unitCost - 1);
          }

          const ipcs = gameState.getIPCs(gameState.currentPlayer.id);
          const maxQty = Math.floor(ipcs / unitCost);
          for (let i = 0; i < maxQty; i++) {
            const result = gameState.addToPendingPurchases(data.unitType, unitDefs, null);
            if (!result.success) break;
          }
          camera.dirty = true;
        }
        break;

      case 'roll-tech':
        // Inline tech roll - show centered dice result instead of modal
        if (data.diceCount > 0) {
          techUI.performInlineRoll(data.diceCount);
          camera.dirty = true;
        }
        break;

      case 'launch-rocket':
        // Rocket attack using rockets technology - show modal
        if (data.from && data.target) {
          rocketUI.launchRocket(data.from, data.target);
        } else {
          // Show selection modal
          rocketUI.show();
        }
        camera.dirty = true;
        break;

      case 'place-unit':
        // Inline placement - place a unit on the selected territory
        if (data.unitType && data.territory) {
          const result = gameState.placeInitialUnit(data.territory, data.unitType, unitDefs);
          if (result.success) {
            actionLog.logInitialPlacement(gameState.currentPlayer, data.unitType, data.territory);
            camera.dirty = true;
          }
        }
        break;

      case 'undo-placement':
        if (gameState.undoPlacement()) {
          camera.dirty = true;
        }
        break;

      case 'open-combat':
        if (combatUI.hasCombats()) {
          // Close other modals first
          purchasePopup.hide();
          techUI.hide();
          combatUI.showNextCombat();
        }
        break;

      case 'finish-placement':
        gameState.finishPlacementRound(unitDefs);
        camera.dirty = true;
        // Don't recenter camera during initial deployment - let player explore freely
        break;

      case 'execute-move':
        // Execute a move from inline movement UI
        if (data.from && data.to && (data.units?.length > 0 || data.shipIds?.length > 0 || data.cargoUnloads?.length > 0)) {
          // Handle amphibious unload (from sea zone to coastal territory)
          if (data.isAmphibiousUnload && (data.shipIds?.length > 0 || data.cargoUnloads?.length > 0)) {
            const seaUnits = gameState.getUnitsAt(data.from) || [];
            const transports = seaUnits.filter(u => u.type === 'transport' && u.owner === gameState.currentPlayer.id);
            let anySuccess = false;
            const unloadedUnits = [];

            // Handle cargo unloads (specific units selected for amphibious assault)
            if (data.cargoUnloads?.length > 0) {
              // Check if destination is enemy territory (for amphibious assault marking)
              const destOwner = gameState.getOwner(data.to);
              const isEnemyTerritory = destOwner && destOwner !== gameState.currentPlayer.id &&
                !gameState.areAllies(gameState.currentPlayer.id, destOwner);

              for (const cargoUnload of data.cargoUnloads) {
                const transport = transports.find(t => t.id === cargoUnload.transportId);
                if (transport && transport.cargo) {
                  // Find and unload the specific units from this transport
                  // IMPORTANT: Cargo items are stored individually (no quantity field)
                  // So we need to remove multiple items if unloading multiple units
                  let remaining = cargoUnload.quantity;
                  let unloadedCount = 0;

                  while (remaining > 0) {
                    const cargoIdx = transport.cargo.findIndex(c => c.type === cargoUnload.unitType);
                    if (cargoIdx < 0) break; // No more of this unit type

                    const cargoItem = transport.cargo[cargoIdx];
                    const itemQty = cargoItem.quantity || 1;
                    const toUnload = Math.min(remaining, itemQty);

                    // Remove from transport
                    if (toUnload >= itemQty) {
                      transport.cargo.splice(cargoIdx, 1);
                    } else {
                      cargoItem.quantity = itemQty - toUnload;
                    }

                    remaining -= toUnload;
                    unloadedCount += toUnload;
                  }

                  if (unloadedCount > 0) {
                    // Mark transport as moved (can't move again this turn)
                    transport.moved = true;

                    // Add to destination (mark units as moved)
                    const destUnits = gameState.units[data.to] || [];
                    const existingUnit = destUnits.find(u => u.type === cargoUnload.unitType && u.owner === gameState.currentPlayer.id && u.moved);
                    if (existingUnit) {
                      existingUnit.quantity = (existingUnit.quantity || 1) + unloadedCount;
                    } else {
                      destUnits.push({
                        type: cargoUnload.unitType,
                        owner: gameState.currentPlayer.id,
                        quantity: unloadedCount,
                        moved: true
                      });
                    }
                    gameState.units[data.to] = destUnits;

                    // Mark as amphibious assault if unloading to enemy territory during combat move
                    if (isEnemyTerritory && gameState.turnPhase === TURN_PHASES.COMBAT_MOVE) {
                      if (!gameState.amphibiousTerritories) gameState.amphibiousTerritories = new Set();
                      gameState.amphibiousTerritories.add(data.to);
                    }

                    // Track for move history (for undo)
                    if (!gameState.moveHistory) gameState.moveHistory = [];
                    gameState.moveHistory.push({
                      from: data.from,
                      to: data.to,
                      units: [{ type: cargoUnload.unitType, quantity: unloadedCount }],
                      transportId: cargoUnload.transportId,
                      isAmphibious: true
                    });

                    unloadedUnits.push({ type: cargoUnload.unitType, quantity: unloadedCount });
                    anySuccess = true;
                  }
                }
              }
            }

            // Handle ship-based unloads (whole transport cargo)
            for (const shipId of data.shipIds || []) {
              // Find transport index by ID
              const transportIdx = transports.findIndex(t => t.id === shipId);
              if (transportIdx >= 0) {
                const result = gameState.unloadTransport(data.from, transportIdx, data.to);
                if (result.success) {
                  anySuccess = true;
                }
              }
            }

            if (anySuccess) {
              const logUnits = unloadedUnits.length > 0 ? unloadedUnits : [{ type: 'amphibious', quantity: 1 }];
              actionLog.logMove(data.from, data.to, logUnits, gameState.currentPlayer);
              camera.dirty = true;
              selectedTerritory = null;
              playerPanel.setSelectedTerritory(null);
            }
          } else {
            // Regular move
            const moveOptions = {};
            if (data.shipIds && data.shipIds.length > 0) {
              moveOptions.shipIds = data.shipIds;
            }
            const unitsToMove = data.units || [];
            const result = gameState.moveUnits(data.from, data.to, unitsToMove, unitDefs, moveOptions);
            if (result.success) {
              actionLog.logMove(data.from, data.to, unitsToMove, gameState.currentPlayer);
              camera.dirty = true;
              // Clear selection after successful move
              selectedTerritory = null;
              playerPanel.setSelectedTerritory(null);
            } else {
              console.warn('Move failed:', result.error);
            }
          }
        }
        break;

      case 'mobilize-unit':
        // Mobilize a purchased unit to a territory
        if (data.unitType && data.territory) {
          const result = gameState.mobilizeUnit(data.unitType, data.territory, unitDefs);
          if (result.success) {
            actionLog.logMobilize(gameState.currentPlayer, [{ type: data.unitType, quantity: 1 }], data.territory);
            camera.dirty = true;
          }
        }
        break;

      case 'mobilize-all':
        // Mobilize all units of a type to a territory
        if (data.unitType && data.territory) {
          const pending = gameState.getPendingPurchases?.() || [];
          const unit = pending.find(p => p.type === data.unitType);
          if (unit) {
            let placed = 0;
            const toPlace = unit.quantity;
            for (let i = 0; i < toPlace; i++) {
              const result = gameState.mobilizeUnit(data.unitType, data.territory, unitDefs);
              if (!result.success) break;
              placed++;
            }
            if (placed > 0) {
              actionLog.logMobilize(gameState.currentPlayer, [{ type: data.unitType, quantity: placed }], data.territory);
              camera.dirty = true;
            }
          }
        }
        break;

      case 'undo-mobilize':
        // Undo the last mobilization placement
        {
          const result = gameState.undoMobilization(unitDefs);
          if (result.success) {
            camera.dirty = true;
          }
        }
        break;

      case 'next-phase':
        const prevPlayer = gameState.currentPlayer;
        const prevRound = gameState.round;
        gameState.nextPhase();
        camera.dirty = true;

        // Log phase change or turn start
        if (gameState.round !== prevRound || gameState.currentPlayer !== prevPlayer) {
          actionLog.logTurnStart(gameState.currentPlayer, gameState.round);
        } else {
          actionLog.logPhaseChange(gameState.getTurnPhaseName(), gameState.currentPlayer);
        }

        // Close all modals on phase change
        purchasePopup.hide();
        techUI.hide();

        // If entering combat phase, show combat UI
        if (gameState.turnPhase === TURN_PHASES.COMBAT && combatUI.hasCombats()) {
          combatUI.showNextCombat();
        }
        // Cancel any movement selection when phase changes
        movementUI.cancel();
        break;
    }
  });

  // Continent panel
  const continentPanel = new ContinentPanel(continents);

  // AI Controller
  let aiController = null;

  // Function to check and process AI turns - now just triggers the controller
  const checkAI = () => {
    if (aiController && gameState) {
      aiController.checkAndProcessAI().then(wasAI => {
        if (wasAI) {
          camera.dirty = true;
        }
      });
    }
  };

  // Multiplayer state
  let syncManager = null;
  let multiplayerGuard = null;
  let authScreen = null;
  let multiplayerLobby = null;
  let gameListUI = null;

  // Initialize Firebase (if configured)
  initializeFirebase();
  const authManager = getAuthManager();
  const lobbyManager = getLobbyManager();

  if (isFirebaseConfigured()) {
    authManager.initialize();
    lobbyManager.initialize();
  }

  // Function to start a multiplayer game
  const startMultiplayerGame = async (gameId, lobbyData) => {
    // Initialize game state
    gameState = new GameState(setup, territories, continents);
    gameState.isMultiplayer = true;

    // Create sync manager
    syncManager = createSyncManager(gameId, gameState);

    const user = authManager.getUser();

    // Get players and settings - handle both lobby document and game document structures
    // Lobby document: { hostId, players: [...], settings: {...} }
    // Game document: { lobbyData: { players: [...], settings: {...} }, stateVersion, state, startedBy }
    const playersData = lobbyData?.lobbyData?.players || lobbyData?.players;
    const settingsData = lobbyData?.lobbyData?.settings || lobbyData?.settings;

    // Determine if we're the host (for AI control purposes):
    // - For lobby: check lobbyData.hostId
    // - For game: check if any player has isHost: true and matches our userId
    let isHost = lobbyData?.hostId === user?.id;
    if (!isHost && playersData) {
      const hostPlayer = playersData.find(p => p.isHost);
      isHost = hostPlayer?.oderId === user?.id;
    }

    // Determine if we should initialize the game:
    // - If startedBy exists (game doc), check if we're the starter
    // - Otherwise fall back to isHost check (lobby doc)
    const shouldInitialize = lobbyData?.startedBy
      ? lobbyData.startedBy === user?.id
      : isHost;

    // Check if game already has state (rejoining an active game)
    const hasExistingState = lobbyData?.stateVersion > 0 && lobbyData?.state;

    // Set host flag on syncManager (for AI control - original host controls AI)
    syncManager.setIsHost(isHost);

    console.log('[MP] Starting game:', {
      gameId,
      hasExistingState,
      shouldInitialize,
      isHost,
      startedBy: lobbyData?.startedBy,
      userId: user?.id
    });

    // Log initial game start to debug panel
    playerPanel.logSyncEvent('game_start', {
      gameId: gameId.slice(-6),
      isHost,
      shouldInitialize
    });

    if (hasExistingState) {
      // Rejoining a game that already has state - just load it
      console.log('[MP] Rejoining existing game...');
      const stateLoaded = await syncManager.startSync();
      if (!stateLoaded) {
        console.error('[MP] Failed to load existing game state');
        alert('Error 1: Failed to rejoin game. Could not load game state.');
        return;
      }
    } else if (shouldInitialize && playersData) {
      // Initialize the game (person who clicked Start)
      const players = playersData.map(p => {
        const factionDef = setup.risk.factions.find(f => f.id === p.factionId);
        return {
          ...factionDef,
          id: p.factionId,
          name: p.displayName,
          color: p.color || factionDef?.color,
          lightColor: p.color || factionDef?.lightColor,
          isAI: p.isAI || false,
          aiDifficulty: p.aiDifficulty || null,
          oderId: p.oderId // Link to Firebase user ID
        };
      });

      const options = {
        alliancesEnabled: false,
        teamsEnabled: settingsData?.teamsEnabled || false,
        startingIPCs: settingsData?.startingIPCs || 80,
        isMultiplayer: true
      };

      gameState.initGame('risk', players, options);

      // Log player mapping for debugging
      console.log('[MP] Player mapping:');
      players.forEach((p, i) => {
        console.log(`  [${i}] ${p.name} (oderId: ${p.oderId}, isAI: ${p.isAI})`);
      });
      console.log(`[MP] First player (index 0): ${gameState.currentPlayer?.name} (oderId: ${gameState.currentPlayer?.oderId})`);
      console.log(`[MP] My userId: ${user?.id}`);

      // Push initial state to Firestore
      console.log('[MP] Initializing game and pushing state...');
      const pushSuccess = await syncManager.forcePush(true);
      if (!pushSuccess) {
        console.error('[MP] Failed to push initial game state');
        alert('Error 2: Failed to initialize game. Could not save game state.');
        return;
      }

      // Start listening for updates
      await syncManager.startSync();
      console.log('[MP] Game initialized successfully. isActivePlayer:', syncManager.checkIsActivePlayer());
    } else if (!playersData) {
      // No player data available
      console.error('[MP] No player data available');
      alert('Error 3: Failed to start game. No player data found.');
      return;
    } else {
      // Waiting for another client to initialize
      console.log('[MP] Waiting for game state from initializer...');
      console.log(`[MP] My userId: ${user?.id}`);
      const stateLoaded = await syncManager.startSyncAndWaitForState();
      if (!stateLoaded) {
        console.error('[MP] Timeout waiting for game state');
        alert('Error 4: Failed to join game. Timed out waiting for game to initialize. The host may have disconnected.');
        return;
      }
      console.log('[MP] Game state received');
    }

    // Create multiplayer guard after state is ready
    multiplayerGuard = createMultiplayerGuard(syncManager);
    multiplayerGuard.wrapGameState(gameState);

    // Set up sync manager reference in gameState
    gameState.syncManager = syncManager;

    // Subscribe to sync events
    syncManager.subscribe((event, data) => {
      // Log all sync events to debug tab
      playerPanel.logSyncEvent(event, {
        version: data?.version,
        currentPlayerId: data?.currentPlayerId,
        isActivePlayer: data?.isActivePlayer
      });

      if (event === 'state_updated' || event === 'turn_changed') {
        camera.dirty = true;
        // Update player panel to reflect turn change
        playerPanel._render();

        if (event === 'turn_changed' && data.isActivePlayer) {
          showNotification("It's your turn!");
        }
      }
    });

    // Set up gameState observer to push changes
    // Host pushes all state changes (including AI turns), others only push their own turns
    gameState.subscribe(() => {
      if (syncManager && (syncManager.checkIsActivePlayer() || syncManager.isHost)) {
        playerPanel.logSyncEvent('state_push', {
          version: syncManager.localVersion + 1,
          currentPlayer: gameState.currentPlayer?.name,
          phase: gameState.turnPhase
        });
        syncManager.pushState();
      }
    });

    // Wire up all the UI components (same as local game)
    wireUpGameComponents();

    // Start with map overview
    camera.dirty = true;
  };

  // Function to wire up all game components (shared between local and multiplayer)
  const wireUpGameComponents = () => {
    // Check if there are AI players
    const hasAIPlayers = gameState.players?.some(p => p.isAI);

    // Initialize AI controller for local games OR multiplayer games with AI (host only runs AI)
    // In multiplayer, only the host should run AI actions to avoid conflicts
    const shouldInitAI = !gameState.isMultiplayer || (hasAIPlayers && syncManager?.isHost);

    if (shouldInitAI || hasAIPlayers) {
      aiController = new AIController();
      aiController.setUnitDefs(unitDefs);
      aiController.setActionLog(actionLog);
      aiController.setGameState(gameState);
      aiController.setOnAction((action, data) => {
        camera.dirty = true;
      });
      aiController.setOnStatusUpdate((message) => {
        console.log('[AI Status]', message);
      });
    }

    // Wire up components
    hud.setGameState(gameState);
    hud.setNextPhaseCallback(() => {
      const prevPlayer = gameState.currentPlayer;
      const prevRound = gameState.round;
      gameState.nextPhase();
      camera.dirty = true;

      // Log phase change or turn start
      if (gameState.round !== prevRound || gameState.currentPlayer !== prevPlayer) {
        actionLog.logTurnStart(gameState.currentPlayer, gameState.round);
      } else {
        actionLog.logPhaseChange(gameState.getTurnPhaseName(), gameState.currentPlayer);
      }

      // Close all modals on phase change
      purchasePopup.hide();
      techUI.hide();

      // If entering combat phase, show combat UI
      if (gameState.turnPhase === TURN_PHASES.COMBAT && combatUI.hasCombats()) {
        combatUI.showNextCombat();
      }
      // Cancel any movement selection when phase changes
      movementUI.cancel();
    });
    hud.setOnRulesToggle(() => {
      rulesPanel.toggle();
    });

    hud.setOnExitToLobby(() => {
      // Stop sync manager if multiplayer
      if (syncManager) {
        syncManager.stopSync();
        syncManager = null;
      }

      // Hide any open multiplayer UI
      if (multiplayerLobby) {
        multiplayerLobby.hide();
      }
      if (gameListUI) {
        gameListUI.hide();
      }

      // Reset game state
      gameState = null;

      // Always go back to main home screen
      lobby.show();
    });

    // Bug tracker
    bugTracker.setGameState(gameState);
    bugTracker.setActionLog(actionLog);
    playerPanel.setGameState(gameState);
    playerPanel.setContinents(continents);
    playerPanel.setTerritories(territories);
    playerPanel.setActionLog(actionLog);

    // Set multiplayer state for player panel
    if (gameState.isMultiplayer) {
      const localUserId = authManager.getUserId();
      const localPlayer = gameState.players?.find(p => p.oderId === localUserId);
      const firstPlayer = gameState.players?.[0];

      console.log('[MP] Identity check:');
      console.log(`  Local user ID: ${localUserId}`);
      console.log(`  Local player: ${localPlayer?.name || 'NOT FOUND'} (oderId: ${localPlayer?.oderId})`);
      console.log(`  First turn player: ${firstPlayer?.name} (oderId: ${firstPlayer?.oderId})`);
      console.log(`  Current player: ${gameState.currentPlayer?.name} (oderId: ${gameState.currentPlayer?.oderId})`);
      console.log(`  Is active player: ${syncManager.checkIsActivePlayer()}`);

      // Log a sync event for debugging
      playerPanel.logSyncEvent('identity_check', {
        localUserId: localUserId?.slice(-6) || 'none',
        localPlayer: localPlayer?.name || 'NOT_FOUND',
        currentPlayer: gameState.currentPlayer?.name,
        isActive: syncManager.checkIsActivePlayer()
      });

      playerPanel.setMultiplayerState(syncManager, localUserId);
    }

    tooltip.setGameState(gameState);
    unitTooltip.setGameState(gameState);
    territoryRenderer.setGameState(gameState);
    continentPanel.setGameState(gameState);
    unitRenderer = new UnitRenderer(gameState, territories, unitDefs);

    // Purchase popup
    purchasePopup.setGameState(gameState);
    purchasePopup.setOnComplete(() => {
      camera.dirty = true;
    });
    purchasePopup.setOnHighlightTerritory((territory, highlight) => {
      territoryRenderer.setHoverHighlight(territory, highlight);
      camera.dirty = true;
    });

    // Movement UI
    movementUI.setGameState(gameState);
    movementUI.setOnHighlightTerritory((territory, highlight) => {
      territoryRenderer.setHoverHighlight(territory, highlight);
      camera.dirty = true;
    });
    movementUI.setOnMoveComplete((moveInfo) => {
      camera.dirty = true;
      // Log the movement/attack
      if (moveInfo) {
        const player = gameState.currentPlayer;
        if (moveInfo.isAttack) {
          actionLog.logAttack(moveInfo.from, moveInfo.to, player, null);
        } else if (moveInfo.captured) {
          actionLog.logCapture(moveInfo.to, player);
          // Log Risk card earned (one per turn for conquering)
          if (moveInfo.cardAwarded) {
            actionLog.logCardEarned(player, moveInfo.cardAwarded);
          }
        } else if (gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE) {
          actionLog.logNonCombatMove(moveInfo.from, moveInfo.to, moveInfo.units, player);
        } else {
          actionLog.logMove(moveInfo.from, moveInfo.to, moveInfo.units, player);
        }
      }
    });
    movementUI.onCancel = () => {
      selectedTerritory = null;
      playerPanel.setSelectedTerritory(null);
      camera.dirty = true;
    };

    // Air Landing UI - consolidated landing after ALL combats
    airLandingUI.setGameState(gameState);
    airLandingUI.setOnTerritoryComplete((result) => {
      // Apply landings for this territory immediately
      combatUI.handleAirLandingComplete(result);
      camera.dirty = true;
    });
    airLandingUI.setOnComplete((result) => {
      // All territories done - clear destinations and proceed
      territoryRenderer.clearAirLandingDestinations();
      camera.dirty = true;
    });
    airLandingUI.setOnHighlightTerritory((territory, highlight) => {
      territoryRenderer.setHoverHighlight(territory, highlight);
      camera.dirty = true;
    });
    airLandingUI.setOnCenterCamera((territory) => {
      // Center camera on the territory
      if (territory && territory.center) {
        camera.panTo(territory.center[0], territory.center[1]);
      }
    });

    // Rocket Attack UI
    rocketUI.setGameState(gameState);
    rocketUI.setOnComplete(() => {
      camera.dirty = true;
    });

    // Combat UI
    combatUI.setGameState(gameState);
    combatUI.setActionLog(actionLog);
    combatUI.setOnComplete(() => {
      camera.dirty = true;
    });
    combatUI.setOnCombatStart((territory) => {
      // Center camera on the combat territory
      const t = territoryRenderer.territoryByName[territory];
      if (t && t.center) {
        camera.panTo(t.center[0], t.center[1]);
      }
    });
    // Air landing happens after each combat via player panel inline UI
    combatUI.setOnAirLandingRequired((data) => {
      // Use inline air landing UI in player panel
      playerPanel.setAirLanding(
        data.airUnitsToLand,
        data.combatTerritory,
        data.isRetreating,
        (result) => {
          // Air landing complete - pass result back to combat UI
          combatUI.handleAirLandingComplete(result);
          territoryRenderer.clearAirLandingDestinations();
          camera.dirty = true;
        }
      );
      // Highlight valid destinations on map
      territoryRenderer.setAirLandingDestinations(playerPanel.getAirLandingDestinations());
      camera.dirty = true;
    });

    // Tech UI
    techUI.setGameState(gameState);
    techUI.setOnComplete(() => {
      camera.dirty = true;
      // Auto-advance from tech phase when done
      if (gameState.turnPhase === TURN_PHASES.DEVELOP_TECH) {
        gameState.nextPhase();
      }
    });

    // Placement UI
    placementUI.setGameState(gameState);
    placementUI.setOnComplete(() => {
      camera.dirty = true;
    });
    placementUI.setOnUnitPlaced((unitType, territory, player) => {
      actionLog.logInitialPlacement(player, unitType, territory);
    });

    // Mobilize UI
    mobilizeUI.setGameState(gameState);
    mobilizeUI.setOnComplete(() => {
      camera.dirty = true;
    });
    mobilizeUI.setOnUnitsMobilized((player, units, territory) => {
      actionLog.logMobilize(player, units, territory);
    });

    // Victory Screen
    victoryScreen.setGameState(gameState);

    // Action Log
    actionLog.setGameState(gameState);
    actionLog.setHighlightCallback((territories, highlight) => {
      if (highlight) {
        territoryRenderer.setHighlightedTerritories(territories);
      } else {
        territoryRenderer.clearHighlightedTerritories();
      }
      camera.dirty = true;
    });
    actionLog.setMovementHighlightCallback((from, to, highlight, isCombat) => {
      if (highlight) {
        territoryRenderer.setMovementArrow(from, to, isCombat);
      } else {
        territoryRenderer.clearMovementArrow();
      }
      camera.dirty = true;
    });
    actionLog.show();
    actionLog.logTurnStart(gameState.currentPlayer, gameState.round);

    // Continent Panel (includes Risk cards)
    continentPanel.setUnitDefs(unitDefs);
    continentPanel.setOnTradeCards(() => {
      if (gameState.turnPhase === TURN_PHASES.PURCHASE) {
        const result = gameState.tradeRiskCards(gameState.currentPlayer.id);
        if (result.success) {
          actionLog.logCardTrade(gameState.currentPlayer, result.ipcs);
          camera.dirty = true;
        }
      }
    });

    // Show panels (continentPanel hidden - info now in Players/Territory tabs)
    continentPanel.hide();
    playerPanel.show();
  };

  // Handle Play Online button click
  const handlePlayOnline = () => {
    if (!isFirebaseConfigured()) {
      alert('Multiplayer is not configured. Please set up Firebase in src/multiplayer/firebase.js');
      lobby.show();
      return;
    }

    // Check if user is logged in
    if (authManager.isLoggedIn()) {
      // Show multiplayer lobby
      if (!multiplayerLobby) {
        multiplayerLobby = new MultiplayerLobby(
          setup,
          // onStart - when game starts
          (gameId, lobbyData) => {
            startMultiplayerGame(gameId, lobbyData);
          },
          // onBack
          (action) => {
            if (action === 'rejoin') {
              // Show game list
              if (!gameListUI) {
                gameListUI = new GameList(
                  // onSelectGame
                  (gameId, game) => {
                    startMultiplayerGame(gameId, game);
                  },
                  // onBack
                  () => {
                    multiplayerLobby.show();
                  }
                );
              }
              gameListUI.show();
            } else {
              // Back to main lobby
              lobby.show();
            }
          }
        );
      }
      multiplayerLobby.show();
    } else {
      // Show auth screen
      if (!authScreen) {
        authScreen = new AuthScreen((user) => {
          if (user) {
            // User logged in, show multiplayer lobby
            handlePlayOnline();
          } else {
            // User cancelled, back to main lobby
            lobby.show();
          }
        });
      }
      authScreen.show();
    }
  };

  // Lobby (local games)
  const lobby = new Lobby(setup, (gameMode, selectedPlayers, options = {}) => {
    // Initialize game state for local game
    gameState = new GameState(setup, territories, continents);
    gameState.isMultiplayer = false;

    // Check if loading from save
    if (options.loadFromSave) {
      gameState.loadFromJSON(options.loadFromSave);
    } else {
      gameState.initGame(gameMode, selectedPlayers, options);
    }

    // Wire up all game components
    wireUpGameComponents();

    // Start with map overview - no auto-pan
    camera.dirty = true;
  }, handlePlayOnline);

  // Load map tiles
  await mapRenderer.load();

  // Canvas sizing
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    tooltip.hide(); // Hide tooltip when starting interaction
    unitTooltip.hide();

    // Check if we should start a unit drag (during movement phases)
    if (gameState && e.button === 0) {
      const turnPhase = gameState.turnPhase;
      const isMovementPhase =
        turnPhase === TURN_PHASES.COMBAT_MOVE ||
        turnPhase === TURN_PHASES.NON_COMBAT_MOVE ||
        turnPhase === TURN_PHASES.CONDUCT_COMBAT; // For retreat

      if (isMovementPhase && !gameState.currentPlayer?.isAI) {
        const world = camera.screenToWorld(e.clientX, e.clientY);
        const wrappedX = wrapX(world.x);
        const hit = territoryMap.hitTest(wrappedX, world.y);

        if (hit) {
          const units = gameState.getUnitsAt(hit.name);
          const playerUnits = units?.filter(u => u.owner === gameState.currentPlayer.id) || [];

          if (playerUnits.length > 0) {
            // Store potential drag start
            dragStartPos = { x: e.clientX, y: e.clientY };
            dragSourceTerritory = hit;
            dragCurrentPos = { x: e.clientX, y: e.clientY };
          }
        }
      }
    }

    camera.onMouseDown(e);
    canvas.classList.add('panning');
  });

  canvas.addEventListener('mousemove', (e) => {
    // Check for unit drag-and-drop
    if (dragSourceTerritory && !isDraggingUnits) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > DRAG_THRESHOLD) {
        // Start dragging
        isDraggingUnits = true;
        canvas.classList.add('dragging-units');

        // Calculate valid destinations for all units in source territory
        const isCombatMove = gameState.turnPhase === TURN_PHASES.COMBAT_MOVE;
        dragValidDestinations = playerPanel._getValidDestinations(dragSourceTerritory, gameState.currentPlayer, isCombatMove);

        // Select all player's units in the source territory for movement
        const units = gameState.getUnitsAt(dragSourceTerritory.name) || [];
        const playerUnits = units.filter(u => u.owner === gameState.currentPlayer.id);
        playerPanel.setSelectedTerritory(dragSourceTerritory);

        // Select all movable units
        playerPanel.moveSelectedUnits = {};
        for (const unit of playerUnits) {
          const def = unitDefs[unit.type];
          if (def && (def.movement || 0) > 0) {
            playerPanel.moveSelectedUnits[unit.type] = unit.quantity || 1;
          }
        }

        camera.dirty = true;
      }
    }

    if (isDraggingUnits) {
      // Update drag position
      dragCurrentPos = { x: e.clientX, y: e.clientY };

      // Get territory under cursor
      const world = camera.screenToWorld(e.clientX, e.clientY);
      const wrappedX = wrapX(world.x);
      const hit = territoryMap.hitTest(wrappedX, world.y);

      hoverTerritory = hit;
      camera.dirty = true;

      // Update highlighting based on valid destinations
      if (hit) {
        const isValid = dragValidDestinations.some(d => d.name === hit.name);
        const isEnemy = dragValidDestinations.find(d => d.name === hit.name)?.isEnemy;
        territoryRenderer.setDragDestination(hit.name, isValid, isEnemy);
      } else {
        territoryRenderer.setDragDestination(null, false, false);
      }

      return;
    }

    // Handle camera panning (only when mouse button is held down and dragging)
    const moved = camera.onMouseMove(e);
    if (moved) {
      // Camera is being panned - cancel drag and hide tooltips
      dragSourceTerritory = null;
      isDraggingUnits = false;
      canvas.classList.remove('dragging-units');
      canvas.classList.add('panning');
      canvas.classList.remove('hovering');
      hoverTerritory = null;
      tooltip.hide();
      unitTooltip.hide();
      if (hoverTooltipTimeout) {
        clearTimeout(hoverTooltipTimeout);
        hoverTooltipTimeout = null;
      }
      camera.dirty = true;
      return;
    }

    // Remove panning class when not panning
    canvas.classList.remove('panning');

    // HOVER DETECTION - Always runs when not panning
    // This should work in ALL phases including initial deployment
    const world = camera.screenToWorld(e.clientX, e.clientY);
    const wrappedX = wrapX(world.x);

    // Debug: log to console to verify hover detection is running
    // console.log('Hover check at:', wrappedX, world.y);

    // First check for unit icon hover (higher priority than territory)
    let unitHit = null;
    if (unitRenderer && gameState) {
      unitHit = unitRenderer.hitTestUnit(wrappedX, world.y, camera.zoom);
    }

    if (unitHit) {
      // Hovering over a unit icon - show unit tooltip
      unitTooltip.show(unitHit, e.clientX, e.clientY);
      tooltip.hide();
      if (hoverTooltipTimeout) {
        clearTimeout(hoverTooltipTimeout);
        hoverTooltipTimeout = null;
      }
      canvas.classList.add('hovering');
      if (hoverTerritory !== null) {
        hoverTerritory = null;
        camera.dirty = true;
      }
    } else {
      // Not over a unit - check for territory hover
      unitTooltip.hide();
      const hit = territoryMap.hitTest(wrappedX, world.y);

      // Update hover territory if changed
      if (hit !== hoverTerritory) {
        const previousTerritory = hoverTerritory;
        hoverTerritory = hit;
        camera.dirty = true;

        // Territory changed - reset tooltip timer
        if (hoverTooltipTimeout) {
          clearTimeout(hoverTooltipTimeout);
          hoverTooltipTimeout = null;
        }
        tooltip.hide();

        // Start new tooltip timer if hovering over a territory
        if (hit && gameState) {
          lastHoverPos = { x: e.clientX, y: e.clientY };
          hoverTooltipTimeout = setTimeout(() => {
            // Only show if still hovering over the same territory
            if (hoverTerritory === hit) {
              tooltip.show(hit, lastHoverPos.x, lastHoverPos.y);
            }
            hoverTooltipTimeout = null;
          }, TOOLTIP_DELAY);
        }
      } else if (hit && gameState) {
        // Same territory - update mouse position for tooltip
        lastHoverPos = { x: e.clientX, y: e.clientY };
        if (tooltip.isVisible) {
          tooltip.show(hit, e.clientX, e.clientY);
        }
      }

      canvas.classList.toggle('hovering', !!hit);
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    const wasDrag = camera.onMouseUp();
    canvas.classList.remove('panning');
    canvas.classList.remove('dragging-units');

    // Handle drag-and-drop unit movement completion
    if (isDraggingUnits && dragSourceTerritory) {
      const world = camera.screenToWorld(e.clientX, e.clientY);
      const hit = territoryMap.hitTest(wrapX(world.x), world.y);

      // Check if dropped on a valid destination
      const validDest = hit && dragValidDestinations.find(d => d.name === hit.name);

      if (validDest) {
        // Execute the move
        playerPanel.movePendingDest = hit.name;

        // Confirm the move
        const isCombatMove = gameState.turnPhase === TURN_PHASES.COMBAT_MOVE;
        const result = gameState.moveUnits(
          dragSourceTerritory.name,
          hit.name,
          playerPanel.moveSelectedUnits,
          isCombatMove
        );

        if (result.success) {
          actionLog.logMove(
            gameState.currentPlayer,
            dragSourceTerritory.name,
            hit.name,
            Object.entries(playerPanel.moveSelectedUnits)
              .filter(([_, qty]) => qty > 0)
              .map(([type, qty]) => ({ type, quantity: qty })),
            result.isAttack
          );
        }

        // Reset movement state
        playerPanel.moveSelectedUnits = {};
        playerPanel.movePendingDest = null;
      }

      // Clear drag state
      isDraggingUnits = false;
      dragSourceTerritory = null;
      dragValidDestinations = [];
      territoryRenderer.setDragDestination(null, false, false);
      camera.dirty = true;
      return;
    }

    // Clear potential drag state
    dragSourceTerritory = null;

    console.log('[MouseUp] wasDrag:', wasDrag, 'Phase:', gameState?.phase);

    if (!wasDrag) {
      const world = camera.screenToWorld(e.clientX, e.clientY);
      const wrappedWorldX = wrapX(world.x);
      const hit = territoryMap.hitTest(wrappedWorldX, world.y);
      console.log('[MouseUp] Hit test result:', hit?.name || 'null');

      // DEBUG: Log sea zone click coordinates for positioning naval units
      if (DEBUG_SEA_ZONE_CLICKS && hit && hit.isWater) {
        // Store absolute coordinates where user clicked
        const clickX = Math.round(wrappedWorldX);
        const clickY = Math.round(world.y);

        // Add to accumulated list (replace if same zone clicked again)
        const existingIdx = DEBUG_SEA_ZONE_OFFSETS.findIndex(o => o.name === hit.name);
        if (existingIdx >= 0) {
          DEBUG_SEA_ZONE_OFFSETS[existingIdx] = { name: hit.name, x: clickX, y: clickY };
        } else {
          DEBUG_SEA_ZONE_OFFSETS.push({ name: hit.name, x: clickX, y: clickY });
        }

        // Build complete output string
        const allCoords = DEBUG_SEA_ZONE_OFFSETS
          .map(o => `    '${o.name}': { x: ${o.x}, y: ${o.y} },`)
          .join('\n');

        // Create or update a copyable text box on screen
        let debugBox = document.getElementById('debug-sea-zone-box');
        if (!debugBox) {
          debugBox = document.createElement('div');
          debugBox.id = 'debug-sea-zone-box';
          debugBox.style.cssText = 'position:fixed;top:10px;right:10px;width:400px;max-height:80vh;background:#222;border:2px solid #4CAF50;border-radius:8px;z-index:9999;font-family:monospace;font-size:12px;';
          debugBox.innerHTML = `
            <div style="background:#4CAF50;color:white;padding:8px;font-weight:bold;">
              Sea Zone Centers - Zoom: <span id="debug-zoom">1.0</span>
              <button id="debug-copy-btn" style="float:right;background:#fff;color:#222;border:none;padding:4px 12px;cursor:pointer;border-radius:4px;">Copy All</button>
            </div>
            <textarea id="debug-offsets-text" style="width:100%;height:300px;background:#111;color:#0f0;border:none;padding:10px;box-sizing:border-box;resize:vertical;" readonly></textarea>
            <div style="padding:8px;color:#aaa;">Total: <span id="debug-count">0</span> zones</div>
          `;
          document.body.appendChild(debugBox);

          document.getElementById('debug-copy-btn').addEventListener('click', () => {
            const textarea = document.getElementById('debug-offsets-text');
            textarea.select();
            document.execCommand('copy');
            showNotification('Copied to clipboard!', 2000);
          });
        }

        document.getElementById('debug-offsets-text').value = allCoords;
        document.getElementById('debug-count').textContent = DEBUG_SEA_ZONE_OFFSETS.length;
        document.getElementById('debug-zoom').textContent = camera.zoom.toFixed(2);

        // Show on screen
        showNotification(`${hit.name}: [${clickX}, ${clickY}]`, 2000);
      }

      // Initial placement now uses inline UI in player panel - don't intercept clicks
      // Just let the territory selection flow through to setSelectedTerritory

      // Check if we're in mobilize phase
      if (hit && gameState && mobilizeUI.isActive()) {
        const handled = mobilizeUI.handleTerritoryClick(hit);
        if (handled) {
          camera.dirty = true;
          return;
        }
      }

      // Check if we're in purchase phase
      if (hit && gameState && purchasePopup.isPurchasePhase()) {
        const handled = purchasePopup.handleTerritoryClick(hit);
        if (handled) {
          camera.dirty = true;
          return;
        }
      }

      // Check if consolidated air landing UI is active (after all combats)
      if (hit && gameState && airLandingUI.isActive()) {
        const handled = airLandingUI.handleTerritoryClick(hit);
        if (handled) {
          // Update map highlighting for valid destinations
          territoryRenderer.setAirLandingDestinations(airLandingUI.getAllValidDestinations());
          camera.dirty = true;
          return;
        }
      }

      // Check if we're in air landing phase (inline UI in player panel - legacy)
      if (hit && gameState && playerPanel.isAirLandingActive()) {
        const handled = playerPanel.handleAirLandingTerritoryClick(hit);
        if (handled) {
          // Update map highlighting for valid destinations
          territoryRenderer.setAirLandingDestinations(playerPanel.getAirLandingDestinations());
          camera.dirty = true;
          return;
        }
      }

      // Check if clicking a destination during movement (inline UI)
      if (hit && gameState && (gameState.turnPhase === TURN_PHASES.COMBAT_MOVE || gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE)) {
        // Try to set as destination first (if units are selected)
        const handled = playerPanel.handleMapDestinationClick(hit);
        if (handled) {
          camera.dirty = true;
          return;
        }
      }

      // Check if clicking during mobilize phase - set selected territory for inline mobilize UI
      if (hit && gameState && gameState.turnPhase === TURN_PHASES.MOBILIZE) {
        // Always update selected territory during mobilize, playerPanel will validate
        selectedTerritory = hit;
        playerPanel.setSelectedTerritory(hit);
        camera.dirty = true;
        return;
      }

      if (hit) {
        console.log('[Click] Territory selected:', hit.name, 'Phase:', gameState?.phase);
        selectedTerritory = hit;
        playerPanel.setSelectedTerritory(hit);
      } else {
        selectedTerritory = null;
        playerPanel.setSelectedTerritory(null);
        movementUI.cancel();
      }
      camera.dirty = true;
    }
  });

  canvas.addEventListener('wheel', (e) => camera.onWheel(e), { passive: false });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hide();
    unitTooltip.hide();
    hoverTerritory = null;
    camera.dirty = true;
    // Clear hover tooltip timeout
    if (hoverTooltipTimeout) {
      clearTimeout(hoverTooltipTimeout);
      hoverTooltipTimeout = null;
    }
  });

  window.addEventListener('mouseup', () => {
    if (camera.isDragging) {
      camera.onMouseUp();
      canvas.classList.remove('panning');
    }
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      selectedTerritory = null;
      playerPanel.setSelectedTerritory(null);
      camera.dirty = true;
    }

    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (gameState) gameState.saveToFile();
    }

    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      if (gameState) {
        gameState.loadFromFile().then(() => {
          camera.dirty = true;
        }).catch(console.error);
      }
    }
  });

  // Render loop
  function render() {
    camera.update();

    if (camera.dirty) {
      camera.dirty = false;

      const dpr = devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3CC0BF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      camera.applyTransform(ctx);

      const viewport = camera.getViewport();
      const startCopy = Math.floor(viewport.x / MAP_WIDTH);
      const endCopy = Math.floor((viewport.x + viewport.width) / MAP_WIDTH);

      for (let copy = startCopy; copy <= endCopy; copy++) {
        const offsetX = copy * MAP_WIDTH;

        ctx.save();
        ctx.translate(offsetX, 0);

        const localViewport = {
          x: viewport.x - offsetX,
          y: viewport.y,
          width: viewport.width,
          height: viewport.height,
        };

        // Render layers
        mapRenderer.render(ctx, localViewport);

        // Continent indicators FIRST (underneath ownership)
        territoryRenderer.renderContinentIndicators(ctx);

        // Territory overlays (colored by continent - Risk style)
        territoryRenderer.renderOwnershipOverlays(ctx);

        // Subtle terrain texture (rivers, mountains)
        territoryRenderer.renderTerrainTexture(ctx, camera.zoom);

        // Continent labels (when zoomed out)
        territoryRenderer.renderContinentLabels(ctx, camera.zoom);

        // Territory outlines
        territoryRenderer.renderTerritoryOutlines(ctx);

        // Cross-water connection lines
        territoryRenderer.renderCrossWaterConnections(ctx, camera.zoom);

        // Valid move destinations (highlight during movement phase or drag-and-drop)
        if (isDraggingUnits && dragValidDestinations.length > 0) {
          // During drag-and-drop, show valid destinations
          const destinations = dragValidDestinations.map(d => d.name);
          const isEnemy = dragValidDestinations.reduce((acc, d) => {
            acc[d.name] = d.isEnemy;
            return acc;
          }, {});
          territoryRenderer.renderValidMoveDestinations(ctx, destinations, isEnemy);

          // Also highlight source territory
          if (dragSourceTerritory) {
            territoryRenderer.renderSelected(ctx, dragSourceTerritory);
          }
        } else if (movementUI.isMovementPhase() && movementUI.hasUnitsSelected()) {
          const { destinations, isEnemy } = movementUI.getDestinationsWithEnemyFlags();
          territoryRenderer.renderValidMoveDestinations(ctx, destinations, isEnemy);

          // Air movement visualization (flight paths and reachable territories)
          const airViz = movementUI.getAirMovementVisualization();
          if (airViz) {
            territoryRenderer.setAirMovementVisualization(airViz.source, airViz.reachable);
          } else {
            territoryRenderer.clearAirMovementVisualization();
          }
        } else {
          territoryRenderer.clearAirMovementVisualization();
        }

        // Hover + selection
        if (hoverTerritory && hoverTerritory !== selectedTerritory) {
          territoryRenderer.renderHover(ctx, hoverTerritory);
        }
        if (selectedTerritory) {
          territoryRenderer.renderSelected(ctx, selectedTerritory);
        }

        // Highlight source territory during movement
        if (movementUI.getSelectedSource()) {
          territoryRenderer.renderSelected(ctx, movementUI.getSelectedSource());
        }

        // Action log hover highlights
        territoryRenderer.renderActionLogHighlights(ctx);

        // Movement arrow for action log
        territoryRenderer.renderMovementArrow(ctx);

        // Air movement visualization (flight paths)
        territoryRenderer.renderAirMovementVisualization(ctx);

        // Air landing destination highlights
        territoryRenderer.renderAirLandingDestinations(ctx);

        // Programmatic hover highlight (from dropdown)
        territoryRenderer.renderHoverHighlight(ctx);

        // Drag-and-drop destination highlight
        if (isDraggingUnits) {
          territoryRenderer.renderDragDestination(ctx);
        }

        // Labels
        territoryRenderer.renderLabels(ctx, camera.zoom);

        // Ownership flags (small flags on each territory)
        territoryRenderer.renderOwnershipFlags(ctx, camera.zoom);

        // Capital markers (big flags)
        territoryRenderer.renderCapitals(ctx, camera.zoom);

        // Units
        if (unitRenderer) {
          unitRenderer.render(ctx, camera.zoom);
        }

        ctx.restore();
      }

      minimap.render();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

init().catch(err => console.error('Failed to initialize:', err));
