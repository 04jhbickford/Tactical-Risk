// Sync Manager for Tactical Risk multiplayer
// Handles real-time game state synchronization via Firestore

import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from './firebase.js';
import { getAuthManager } from './auth.js';

export class SyncManager {
  constructor(gameId, gameState) {
    this.db = getFirebaseDb();
    this.authManager = getAuthManager();
    this.gameId = gameId;
    this.gameState = gameState;
    this.localVersion = 0;
    this.isActivePlayer = false;
    this.isHost = false; // Whether this client is the game host
    this.isPushing = false;
    this.isLoadingRemoteState = false; // Flag to prevent push during remote state load
    this.unsubscribe = null;
    this._listeners = [];
    this._pendingPush = null;
  }

  // Set whether this client is the host (controls AI players)
  setIsHost(isHost) {
    this.isHost = isHost;
  }

  // Optional extra authority check (host-failover: when the host is offline,
  // one designated fallback client may run AI turns and push their state)
  setAuthorityCheck(fn) {
    this.authorityCheck = fn;
  }

  // True if this client may act for AI players (host, or failover authority)
  hasAIAuthority() {
    if (this.isHost) return true;
    try {
      return this.authorityCheck ? this.authorityCheck() === true : false;
    } catch {
      return false;
    }
  }

  // Get current user ID
  get userId() {
    return this.authManager.getUserId();
  }

  // Check if currently loading remote state (to prevent push during load)
  isLoading() {
    return this.isLoadingRemoteState;
  }

  // Subscribe to state changes
  subscribe(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners(event, data) {
    for (const cb of this._listeners) {
      cb(event, data);
    }
  }

  // Start listening to game updates
  async startSync() {
    if (!this.db || !this.gameId) {
      console.error('SyncManager: Missing db or gameId');
      return false;
    }

    const gameRef = doc(this.db, 'games', this.gameId);

    // Get initial state
    const snapshot = await getDoc(gameRef);
    if (!snapshot.exists()) {
      console.error('SyncManager: Game not found');
      return false;
    }

    const data = snapshot.data();
    this.localVersion = data.stateVersion || 0;

    // If state exists, load it
    if (data.state) {
      this.gameState.loadFromJSON(data.state);
    }

    // Determine if we're the active player
    this._updateActivePlayer(data.currentPlayerId);

    // Subscribe to real-time updates
    this.unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (!snapshot.exists()) {
        this._notifyListeners('game_deleted', null);
        return;
      }

      const newData = snapshot.data();

      console.log(`[Sync] onSnapshot (init): version=${newData.stateVersion}, localVersion=${this.localVersion}, isPushing=${this.isPushing}, currentPlayerId=${newData.currentPlayerId}`);

      // Skip if this is our own update (but still check turn changes)
      if (this.isPushing) {
        // Even when pushing, update active player if it changed
        if (newData.currentPlayerId !== this._lastCurrentPlayerId) {
          this._updateActivePlayer(newData.currentPlayerId);
        }
        return;
      }

      // Only update if version is newer
      if (newData.stateVersion > this.localVersion) {
        console.log(`[Sync] Loading newer state (init): ${this.localVersion} -> ${newData.stateVersion}`);
        this.localVersion = newData.stateVersion;

        // Load new state - set flag to prevent subscription from pushing back
        if (newData.state) {
          this.isLoadingRemoteState = true;
          this.gameState.loadFromJSON(newData.state);
          this.isLoadingRemoteState = false;
        }

        // Update active player status
        this._updateActivePlayer(newData.currentPlayerId);

        this._notifyListeners('state_updated', {
          version: this.localVersion,
          currentPlayerId: newData.currentPlayerId
        });
      } else if (newData.currentPlayerId !== this._lastCurrentPlayerId) {
        // Doc-level current player differs from ours at the same version —
        // our local state has DIVERGED from the doc (seen in the V2.53
        // playtest when two AI runners raced). The doc is authoritative:
        // load its state instead of just flipping the cached flag, or the
        // sidebar and the actual game state disagree about whose turn it is.
        if (newData.state) {
          this.isLoadingRemoteState = true;
          this.gameState.loadFromJSON(newData.state);
          this.isLoadingRemoteState = false;
          this.localVersion = newData.stateVersion || this.localVersion;
        }
        console.log(`[Sync] Turn changed without version bump (init): ${this._lastCurrentPlayerId} -> ${newData.currentPlayerId}`);
        this._updateActivePlayer(newData.currentPlayerId);
        this._notifyListeners('turn_changed', {
          currentPlayerId: newData.currentPlayerId,
          isActivePlayer: this.isActivePlayer
        });
      }
    }, async (error) => {
      console.error('SyncManager: Subscription error', error);

      // Check if this is an auth error that needs re-login
      const authResult = await this.authManager.handleFirebaseError(error);
      if (authResult.needsReauth) {
        console.warn('[Sync] Auth error - user needs to re-login');
        this._notifyListeners('auth_error', { needsReauth: true });
        return;
      }

      this._notifyListeners('error', error);
    });

    return true;
  }

  // Start sync and wait for state to be available (for non-host clients)
  async startSyncAndWaitForState(maxWaitMs = 10000) {
    if (!this.db || !this.gameId) {
      console.error('SyncManager: Missing db or gameId');
      return false;
    }

    const gameRef = doc(this.db, 'games', this.gameId);
    const startTime = Date.now();

    // Poll for state to be available
    while (Date.now() - startTime < maxWaitMs) {
      const snapshot = await getDoc(gameRef);
      if (!snapshot.exists()) {
        console.error('SyncManager: Game not found');
        return false;
      }

      const data = snapshot.data();
      if (data.state && data.stateVersion > 0) {
        // State is available, load it
        console.log('[Sync] State received from Firebase:');
        console.log(`  stateVersion: ${data.stateVersion}`);
        console.log(`  currentPlayerId: ${data.currentPlayerId}`);
        console.log(`  currentPlayerIndex in state: ${data.state.currentPlayerIndex}`);
        console.log(`  players in state:`, data.state.players?.map((p, i) => `[${i}] ${p.name} (oderId: ${p.oderId})`));

        this.localVersion = data.stateVersion;
        this.isLoadingRemoteState = true;
        this.gameState.loadFromJSON(data.state);
        this.isLoadingRemoteState = false;
        this._updateActivePlayer(data.currentPlayerId);

        console.log(`[Sync] After load - currentPlayer: ${this.gameState.currentPlayer?.name} (oderId: ${this.gameState.currentPlayer?.oderId})`);

        // Now subscribe to real-time updates
        this.unsubscribe = onSnapshot(gameRef, (snapshot) => {
          if (!snapshot.exists()) {
            this._notifyListeners('game_deleted', null);
            return;
          }

          const newData = snapshot.data();

          console.log(`[Sync] onSnapshot: version=${newData.stateVersion}, localVersion=${this.localVersion}, isPushing=${this.isPushing}, currentPlayerId=${newData.currentPlayerId}`);

          // Skip if this is our own update (but still check turn changes)
          if (this.isPushing) {
            // Even when pushing, update active player if it changed
            if (newData.currentPlayerId !== this._lastCurrentPlayerId) {
              this._updateActivePlayer(newData.currentPlayerId);
            }
            return;
          }

          // Only update if version is newer
          if (newData.stateVersion > this.localVersion) {
            console.log(`[Sync] Loading newer state: ${this.localVersion} -> ${newData.stateVersion}`);
            this.localVersion = newData.stateVersion;

            // Load new state - set flag to prevent subscription from pushing back
            if (newData.state) {
              this.isLoadingRemoteState = true;
              this.gameState.loadFromJSON(newData.state);
              this.isLoadingRemoteState = false;
            }

            // Update active player status
            this._updateActivePlayer(newData.currentPlayerId);

            this._notifyListeners('state_updated', {
              version: this.localVersion,
              currentPlayerId: newData.currentPlayerId
            });
          } else if (newData.currentPlayerId !== this._lastCurrentPlayerId) {
            // Turn changed without version bump (shouldn't happen, but handle it)
            console.log(`[Sync] Turn changed without version bump: ${this._lastCurrentPlayerId} -> ${newData.currentPlayerId}`);
            this._updateActivePlayer(newData.currentPlayerId);
            this._notifyListeners('turn_changed', {
              currentPlayerId: newData.currentPlayerId,
              isActivePlayer: this.isActivePlayer
            });
          }
        }, async (error) => {
          console.error('SyncManager: Subscription error', error);

          // Check if this is an auth error that needs re-login
          const authResult = await this.authManager.handleFirebaseError(error);
          if (authResult.needsReauth) {
            console.warn('[Sync] Auth error - user needs to re-login');
            this._notifyListeners('auth_error', { needsReauth: true });
            return;
          }

          this._notifyListeners('error', error);
        });

        return true;
      }

      // Wait a bit before polling again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.error('SyncManager: Timeout waiting for game state');
    return false;
  }

  // Stop listening
  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Update active player status
  _updateActivePlayer(currentPlayerId) {
    const wasActive = this.isActivePlayer;
    this._lastCurrentPlayerId = currentPlayerId;
    this.isActivePlayer = currentPlayerId === this.userId;

    console.log(`[Sync] Active player update: currentPlayerId=${currentPlayerId}, myUserId=${this.userId}, isActive=${this.isActivePlayer}`);

    if (wasActive !== this.isActivePlayer) {
      console.log(`[Sync] Turn changed: ${wasActive ? 'was my turn' : 'was waiting'} -> ${this.isActivePlayer ? 'now my turn' : 'now waiting'}`);
    }
  }

  // Push state to Firestore (called after local state changes)
  async pushState() {
    // Allow push if: 1) We're the active player, OR 2) We may act for AI
    // (host, or failover authority when the host is offline)
    const canPush = this.isActivePlayer || this.hasAIAuthority();
    if (!canPush) {
      console.warn('SyncManager: Non-active non-host player attempted to push state');
      return false;
    }

    // Debounce rapid updates (fine-grained actions like unit placement/movement)
    if (this._pendingPush) {
      clearTimeout(this._pendingPush);
    }

    return new Promise((resolve) => {
      this._pendingPush = setTimeout(async () => {
        this._pendingPush = null;
        const result = await this._doPush();
        resolve(result);
      }, 100); // 100ms debounce
    });
  }

  // Push immediately without debounce — used for phase and turn transitions so that
  // a hard refresh mid-turn restores the correct phase rather than a stale earlier one.
  async pushStateNow() {
    const canPush = this.isActivePlayer || this.hasAIAuthority();
    if (!canPush) return false;

    // Cancel any pending debounced push — this one supersedes it
    if (this._pendingPush) {
      clearTimeout(this._pendingPush);
      this._pendingPush = null;
    }

    return this._doPush();
  }

  async _doPush() {
    if (!this.db || !this.gameId) return false;

    this.isPushing = true;

    try {
      const gameRef = doc(this.db, 'games', this.gameId);
      const state = this.gameState.toJSON();

      // Get current player's userId for turn tracking
      const currentPlayer = this.gameState.currentPlayer;
      const currentPlayerId = currentPlayer?.oderId || null;

      // Transaction-guarded write: never clobber a state that is newer than the
      // one this client is based on. Two clients pushing concurrently (e.g. a
      // stale tab, or a host/active-player race) would otherwise overwrite each
      // other since both stamp localVersion + 1.
      const pushedVersion = await runTransaction(this.db, async (transaction) => {
        const snapshot = await transaction.get(gameRef);
        if (!snapshot.exists()) return null;

        const remoteVersion = snapshot.data().stateVersion || 0;
        if (remoteVersion > this.localVersion) {
          // Remote is ahead of us — abort, the subscription will deliver it
          console.warn(`[Sync] Push aborted: remote v${remoteVersion} > local v${this.localVersion}`);
          return -1;
        }

        transaction.update(gameRef, {
          state,
          stateVersion: remoteVersion + 1,
          currentPlayerId,
          updatedAt: serverTimestamp()
        });
        return remoteVersion + 1;
      });

      if (pushedVersion === null) return false;
      if (pushedVersion === -1) {
        this._notifyListeners('push_stale', { localVersion: this.localVersion });
        // The winning update's snapshot may have been skipped while isPushing was
        // set — reload explicitly so this client doesn't sit on stale state
        this._reloadRemoteState();
        return false;
      }

      this.localVersion = pushedVersion;

      // Update active player if turn changed
      if (currentPlayerId !== this._lastCurrentPlayerId) {
        this._updateActivePlayer(currentPlayerId);
      }

      return true;
    } catch (error) {
      console.error('SyncManager: Push failed', error);
      this._notifyListeners('push_failed', error);
      return false;
    } finally {
      this.isPushing = false;
    }
  }

  // Re-fetch the game doc and load it if newer than local (used after a stale
  // push, when the winning snapshot may have arrived during our isPushing window)
  async _reloadRemoteState() {
    if (!this.db || !this.gameId) return;
    try {
      const snapshot = await getDoc(doc(this.db, 'games', this.gameId));
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      if (data.stateVersion > this.localVersion) {
        console.log(`[Sync] Reloading after stale push: ${this.localVersion} -> ${data.stateVersion}`);
        this.localVersion = data.stateVersion;
        if (data.state) {
          this.isLoadingRemoteState = true;
          this.gameState.loadFromJSON(data.state);
          this.isLoadingRemoteState = false;
        }
        this._updateActivePlayer(data.currentPlayerId);
        this._notifyListeners('state_updated', {
          version: this.localVersion,
          currentPlayerId: data.currentPlayerId
        });
      }
    } catch (error) {
      console.error('[Sync] Reload after stale push failed', error);
    }
  }

  // Force push (for game initialization by host)
  async forcePush(isHost = false) {
    if (!this.db || !this.gameId) return false;

    this.isPushing = true;

    try {
      const gameRef = doc(this.db, 'games', this.gameId);
      const state = this.gameState.toJSON();

      // Get current player's userId for turn tracking
      const currentPlayer = this.gameState.currentPlayer;
      const currentPlayerId = currentPlayer?.oderId || null;

      await updateDoc(gameRef, {
        state,
        stateVersion: 1,
        currentPlayerId,
        status: 'active',
        updatedAt: serverTimestamp()
      });

      this.localVersion = 1;
      this._updateActivePlayer(currentPlayerId);

      return true;
    } catch (error) {
      console.error('SyncManager: Force push failed', error);
      return false;
    } finally {
      this.isPushing = false;
    }
  }

  // Check if we're the active player
  checkIsActivePlayer() {
    return this.isActivePlayer;
  }

  // Get the current player ID from Firestore
  async getCurrentPlayerId() {
    if (!this.db || !this.gameId) return null;

    const gameRef = doc(this.db, 'games', this.gameId);
    const snapshot = await getDoc(gameRef);
    if (!snapshot.exists()) return null;

    return snapshot.data().currentPlayerId;
  }
}

// Factory function
export function createSyncManager(gameId, gameState) {
  return new SyncManager(gameId, gameState);
}
