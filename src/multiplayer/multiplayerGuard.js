// Multiplayer Guard for Tactical Risk
// Blocks non-active players from making game actions

export class MultiplayerGuard {
  constructor(syncManager) {
    this.syncManager = syncManager;
    this.wrappedMethods = [];
  }

  // Wrap GameState methods to block non-active players
  wrapGameState(gameState) {
    // Methods that modify game state and should be blocked for non-active players
    const methodsToWrap = [
      'moveUnits',
      'nextPhase',
      'nextTurn',
      'mobilizeUnit',
      'mobilizeUnits',
      'purchaseUnit',
      'cancelPurchase',
      'confirmPurchases',
      'setTerritoryOwner',
      'addUnit',
      'removeUnit',
      'addIPCs',
      'removeIPCs',
      'setCapital',
      'developTech',
      'resolveCombat',
      'retreatUnits',
      'finishCombat',
      'finishAllCombats',
      'tradeRiskCards',
      'placeUnit',
      'placeInitialUnits',
      'fireRocket',
      'selectUnitToPlace',
      'confirmPlacement',
      'cancelPlacement',
      'applyAirLandings'
    ];

    for (const methodName of methodsToWrap) {
      if (typeof gameState[methodName] === 'function') {
        const original = gameState[methodName].bind(gameState);

        gameState[methodName] = (...args) => {
          // Check if multiplayer and not active player
          if (gameState.isMultiplayer && this.syncManager && !this.syncManager.checkIsActivePlayer()) {
            console.warn(`MultiplayerGuard: Blocked ${methodName} - not your turn`);
            return { success: false, error: 'Not your turn' };
          }
          return original(...args);
        };

        this.wrappedMethods.push({ gameState, methodName, original });
      }
    }
  }

  // Restore original methods (useful for cleanup)
  unwrap() {
    for (const { gameState, methodName, original } of this.wrappedMethods) {
      gameState[methodName] = original;
    }
    this.wrappedMethods = [];
  }

  // Check if an action is allowed
  isActionAllowed(gameState) {
    if (!gameState.isMultiplayer) return true;
    if (!this.syncManager) return true;
    return this.syncManager.checkIsActivePlayer();
  }

  // Get a user-friendly message for blocked actions
  getBlockedMessage() {
    return "It's not your turn. Please wait for the current player to finish.";
  }
}

// Factory function
export function createMultiplayerGuard(syncManager) {
  return new MultiplayerGuard(syncManager);
}
