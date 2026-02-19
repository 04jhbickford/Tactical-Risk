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
import { UnitTooltip } from './ui/unitTooltip.js';

function wrapX(x) {
  return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
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

          // If we just entered unit placement phase, pan to current player's capital
          if (gameState.phase === GAME_PHASES.UNIT_PLACEMENT) {
            const player = gameState.currentPlayer;
            const capital = gameState.playerState[player.id]?.capitalTerritory;
            if (capital) {
              const t = territoryRenderer.territoryByName[capital];
              if (t && t.center) {
                camera.panTo(t.center[0], t.center[1]);
              }
            }
          }
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

          const ipcs = gameState.getIPCs(gameState.currentPlayer.id);
          const maxQty = Math.floor(ipcs / def.cost);
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
        // Move to next player's capital if in placement phase
        const nextPlayer = gameState.currentPlayer;
        if (nextPlayer && gameState.phase === GAME_PHASES.UNIT_PLACEMENT) {
          const capital = gameState.playerState[nextPlayer.id]?.capitalTerritory;
          if (capital) {
            const t = territoryRenderer.territoryByName[capital];
            if (t && t.center) {
              camera.panTo(t.center[0], t.center[1]);
            }
          }
        }
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
              for (const cargoUnload of data.cargoUnloads) {
                const transport = transports.find(t => t.id === cargoUnload.transportId);
                if (transport && transport.cargo) {
                  // Find and unload the specific units from this transport
                  const cargoIdx = transport.cargo.findIndex(c => c.type === cargoUnload.unitType);
                  if (cargoIdx >= 0) {
                    const cargoItem = transport.cargo[cargoIdx];
                    const unloadQty = Math.min(cargoUnload.quantity, cargoItem.quantity || 1);

                    // Remove from transport
                    if (unloadQty >= (cargoItem.quantity || 1)) {
                      transport.cargo.splice(cargoIdx, 1);
                    } else {
                      cargoItem.quantity -= unloadQty;
                    }

                    // Mark transport as moved (can't move again this turn)
                    transport.moved = true;

                    // Add to destination
                    const destUnits = gameState.units[data.to] || [];
                    const existingUnit = destUnits.find(u => u.type === cargoUnload.unitType && u.owner === gameState.currentPlayer.id);
                    if (existingUnit) {
                      existingUnit.quantity = (existingUnit.quantity || 1) + unloadQty;
                    } else {
                      destUnits.push({
                        type: cargoUnload.unitType,
                        owner: gameState.currentPlayer.id,
                        quantity: unloadQty
                      });
                    }
                    gameState.units[data.to] = destUnits;

                    // Track for move history (for undo)
                    if (!gameState.moveHistory) gameState.moveHistory = [];
                    gameState.moveHistory.push({
                      from: data.from,
                      to: data.to,
                      units: [{ type: cargoUnload.unitType, quantity: unloadQty }],
                      transportId: cargoUnload.transportId,
                      isAmphibious: true
                    });

                    unloadedUnits.push({ type: cargoUnload.unitType, quantity: unloadQty });
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

  // Lobby
  const lobby = new Lobby(setup, (gameMode, selectedPlayers, options = {}) => {
    // Initialize game state
    gameState = new GameState(setup, territories, continents);

    // Check if loading from save
    if (options.loadFromSave) {
      gameState.loadFromJSON(options.loadFromSave);
    } else {
      gameState.initGame(gameMode, selectedPlayers, options);
    }

    // Initialize AI controller
    aiController = new AIController();
    aiController.setUnitDefs(unitDefs);
    aiController.setActionLog(actionLog);
    aiController.setGameState(gameState); // Must be after setUnitDefs
    aiController.setOnAction((action, data) => {
      camera.dirty = true;
    });
    aiController.setOnStatusUpdate((message) => {
      console.log('[AI Status]', message);
    });

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

    // Bug tracker
    bugTracker.setGameState(gameState);
    bugTracker.setActionLog(actionLog);
    playerPanel.setGameState(gameState);
    playerPanel.setContinents(continents);
    playerPanel.setTerritories(territories);
    playerPanel.setActionLog(actionLog);
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

    // Air Landing UI
    airLandingUI.setGameState(gameState);
    airLandingUI.setOnComplete((result) => {
      // Pass result back to combatUI
      combatUI.handleAirLandingComplete(result);
      camera.dirty = true;
    });
    airLandingUI.setOnHighlightTerritory((territory, highlight) => {
      territoryRenderer.setHoverHighlight(territory, highlight);
      camera.dirty = true;
    });

    // Combat UI
    combatUI.setGameState(gameState);
    combatUI.setActionLog(actionLog);
    combatUI.setOnComplete(() => {
      camera.dirty = true;
    });
    combatUI.setOnAirLandingRequired((data) => {
      // Show the external air landing UI
      airLandingUI.setAirUnits(data.airUnitsToLand, data.combatTerritory, data.isRetreating);
      // Highlight valid destinations on map
      territoryRenderer.setAirLandingDestinations(airLandingUI.getAllValidDestinations());
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

    // Start with map overview - no auto-pan
    camera.dirty = true;
  });

  // Load map tiles
  await mapRenderer.load();

  // Canvas sizing
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    camera.onMouseDown(e);
    canvas.classList.add('panning');
    tooltip.hide(); // Hide tooltip when starting to drag
  });

  canvas.addEventListener('mousemove', (e) => {
    const moved = camera.onMouseMove(e);
    if (moved) {
      canvas.classList.add('panning');
      canvas.classList.remove('hovering');
      tooltip.hide();
      unitTooltip.hide();
      return;
    }

    if (!camera.isDragging) {
      const world = camera.screenToWorld(e.clientX, e.clientY);
      const wrappedX = wrapX(world.x);

      // First check for unit icon hover (higher priority)
      let unitHit = null;
      if (unitRenderer && gameState) {
        unitHit = unitRenderer.hitTestUnit(wrappedX, world.y, camera.getZoom());
      }

      if (unitHit) {
        // Show unit tooltip, hide territory tooltip
        unitTooltip.show(unitHit, e.clientX, e.clientY);
        tooltip.hide();
        canvas.classList.add('hovering');
      } else {
        // Check for territory hover
        unitTooltip.hide();
        const hit = territoryMap.hitTest(wrappedX, world.y);
        if (hit !== hoverTerritory) {
          hoverTerritory = hit;
          camera.dirty = true;
          canvas.classList.toggle('hovering', !!hit);

          // Clear any pending tooltip show
          if (hoverTooltipTimeout) {
            clearTimeout(hoverTooltipTimeout);
            hoverTooltipTimeout = null;
          }
          tooltip.hide();

          // Start delayed tooltip show for new territory
          if (hit && gameState) {
            lastHoverPos = { x: e.clientX, y: e.clientY };
            hoverTooltipTimeout = setTimeout(() => {
              tooltip.show(hit, lastHoverPos.x, lastHoverPos.y);
            }, TOOLTIP_DELAY);
          }
        } else if (hit && gameState) {
          // Same territory - update position for pending tooltip
          lastHoverPos = { x: e.clientX, y: e.clientY };
          // If tooltip is already visible, update position
          if (tooltip.isVisible) {
            tooltip.show(hit, e.clientX, e.clientY);
          }
        }
      }
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    const wasDrag = camera.onMouseUp();
    canvas.classList.remove('panning');
    console.log('[MouseUp] wasDrag:', wasDrag, 'Phase:', gameState?.phase);

    if (!wasDrag) {
      const world = camera.screenToWorld(e.clientX, e.clientY);
      const hit = territoryMap.hitTest(wrapX(world.x), world.y);
      console.log('[MouseUp] Hit test result:', hit?.name || 'null');

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

      // Check if we're in air landing phase
      if (hit && gameState && airLandingUI.isActive()) {
        const handled = airLandingUI.handleTerritoryClick(hit);
        if (handled) {
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

        // Valid move destinations (highlight during movement phase)
        if (movementUI.isMovementPhase() && movementUI.hasUnitsSelected()) {
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
