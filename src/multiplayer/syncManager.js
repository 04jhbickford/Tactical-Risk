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
import { GAME_VERSION, compareGameVersions } from '../version.js';

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
    // Serialize + coalesce pushes (V2.56): only one _doPush transaction may be
    // in flight at a time. If local state changes while a push is running, we set
    // _pushDirty and re-push exactly once on completion, instead of firing racing
    // transactions that contend and throw (the V2.55 push-failure storm).
    this._pushInFlight = null;
    this._pushDirty = false;
    this._versionOutdatedNotified = false; // fire the refresh banner at most once
  }

  // Dimension C (version-upgrade robustness): every game doc records the
  // clientVersion that last wrote it. If we ever load a doc written by a
  // strictly-newer app version, a redeploy happened while this tab stayed open —
  // surface a one-shot 'version_outdated' event so the UI can prompt a refresh.
  // Older clients simply ignore the extra doc-level field, and a missing/garbled
  // stamp never triggers the banner (compareGameVersions fails safe).
  _checkRemoteVersion(newData) {
    if (this._versionOutdatedNotified) return;
    const remote = newData?.clientVersion;
    if (remote && compareGameVersions(remote, GAME_VERSION) > 0) {
      this._versionOutdatedNotified = true;
      console.warn(`[Sync] Doc written by newer client ${remote} (we are ${GAME_VERSION}) — prompting refresh`);
      this._notifyListeners('version_outdated', { remoteVersion: remote, localVersion: GAME_VERSION });
    }
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

      this._checkRemoteVersion(newData);

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

          this._checkRemoteVersion(newData);

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

  // Serialize + coalesce entry point. Guarantees a single in-flight push; a
  // change that lands mid-push is captured by one coalesced follow-up rather
  // than a second concurrent transaction. Callers still get a boolean.
  async _doPush() {
    if (!this.db || !this.gameId) return false;

    // A push is already running — mark dirty so it re-runs once when it settles,
    // and share that push's outcome with this caller.
    if (this._pushInFlight) {
      this._pushDirty = true;
      return this._pushInFlight;
    }

    this._pushInFlight = (async () => {
      this.isPushing = true;
      try {
        return await this._runPushWithRetry();
      } finally {
        this.isPushing = false;
      }
    })();

    let result;
    try {
      result = await this._pushInFlight;
    } finally {
      this._pushInFlight = null;
    }

    // State changed while we were pushing — flush it in a single follow-up push.
    if (this._pushDirty) {
      this._pushDirty = false;
      return this._doPush();
    }
    return result;
  }

  // Retry transient transaction failures with small backoff. On exhaustion we
  // reload the authoritative doc so this client never proceeds on (or hands the
  // turn off from) un-persisted local state — the root cause of the V2.55
  // "playing ahead / playing another player's turn" bug: local state advanced
  // optimistically, the push silently failed, and the game marched on.
  async _runPushWithRetry() {
    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const outcome = await this._pushOnce();

        if (outcome.status === 'gone') return false; // doc deleted
        if (outcome.status === 'stale') {
          this._notifyListeners('push_stale', { localVersion: this.localVersion });
          // The winning update's snapshot may have been skipped while isPushing
          // was set — reload explicitly so we don't sit on stale state.
          await this._reloadRemoteState();
          return false;
        }

        // status === 'ok'
        this.localVersion = outcome.version;
        if (outcome.currentPlayerId !== this._lastCurrentPlayerId) {
          this._updateActivePlayer(outcome.currentPlayerId);
        }
        return true;
      } catch (error) {
        lastError = error;
        // Capture the attempted PAYLOAD, not just the raw error — blind
        // "push_failed: <error>" logging is what stalled the V2.55 diagnosis.
        const currentPlayer = this.gameState?.currentPlayer;
        this._notifyListeners('push_failed', {
          attemptedVersion: this.localVersion + 1,
          currentPlayerId: currentPlayer?.oderId ?? null,
          phase: this.gameState?.turnPhase ?? null,
          attempt,
          willRetry: attempt < MAX_ATTEMPTS,
          error: error?.message || String(error)
        });
        console.error(`SyncManager: Push failed (attempt ${attempt}/${MAX_ATTEMPTS})`, error);
        if (attempt < MAX_ATTEMPTS) {
          await this._delay(this._backoffMs(attempt));
        }
      }
    }

    // Retries exhausted. Snap local state back to the last confirmed truth so a
    // never-committed local advance can't diverge the game. Reload FIRST so
    // listeners see the restored doc (force=true: versions are usually equal
    // after a failed write, and the un-forced path would no-op).
    await this._reloadRemoteState({ force: true });
    this._notifyListeners('push_exhausted', {
      attemptedVersion: this.localVersion + 1,
      error: lastError?.message || String(lastError)
    });
    return false;
  }

  // A single transaction-guarded write attempt. Never clobbers a state newer
  // than the one this client is based on: two clients pushing concurrently
  // (stale tab, or a host/active-player race) would otherwise overwrite each
  // other since both stamp localVersion + 1. Returns a status object; a thrown
  // transaction error propagates to the retry loop.
  async _pushOnce() {
    const gameRef = doc(this.db, 'games', this.gameId);
    const state = this.gameState.toJSON();
    const currentPlayer = this.gameState.currentPlayer;
    const currentPlayerId = currentPlayer?.oderId || null;

    const pushedVersion = await runTransaction(this.db, async (transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (!snapshot.exists()) return null;

      const remoteVersion = snapshot.data().stateVersion || 0;
      if (remoteVersion > this.localVersion) {
        console.warn(`[Sync] Push aborted: remote v${remoteVersion} > local v${this.localVersion}`);
        return -1;
      }

      transaction.update(gameRef, {
        state,
        stateVersion: remoteVersion + 1,
        currentPlayerId,
        clientVersion: GAME_VERSION,
        schemaVersion: state.version ?? null,
        updatedAt: serverTimestamp()
      });
      return remoteVersion + 1;
    });

    if (pushedVersion === null) return { status: 'gone' };
    if (pushedVersion === -1) return { status: 'stale' };
    return { status: 'ok', version: pushedVersion, currentPlayerId };
  }

  // Exponential backoff with jitter (~150ms, ~300ms) between push retries.
  _backoffMs(attempt) {
    return 150 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Re-fetch the game doc and apply it. Default: only if remote is newer
  // (stale-push case). force=true also applies when versions are equal, which
  // is the exhausted-retry case: local gameState has uncommitted mutations
  // sitting on the same version the server still holds.
  async _reloadRemoteState({ force = false } = {}) {
    if (!this.db || !this.gameId) return;
    try {
      const snapshot = await getDoc(doc(this.db, 'games', this.gameId));
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const remoteVersion = data.stateVersion || 0;
      if (force || remoteVersion > this.localVersion) {
        console.log(`[Sync] Reloading remote state: local v${this.localVersion} -> remote v${remoteVersion}${force ? ' (force)' : ''}`);
        this.localVersion = remoteVersion;
        if (data.state) {
          this.isLoadingRemoteState = true;
          this.gameState.loadFromJSON(data.state);
          this.isLoadingRemoteState = false;
        }
        this._updateActivePlayer(data.currentPlayerId);
        if (!force) {
          this._notifyListeners('state_updated', {
            version: this.localVersion,
            currentPlayerId: data.currentPlayerId
          });
        }
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
        clientVersion: GAME_VERSION,
        schemaVersion: state.version ?? null,
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

  // Single source of truth for "is it my turn" — DERIVED FROM LIVE STATE, not
  // the cached isActivePlayer flag (which lags a push debounce + network
  // round-trip and goes stale exactly when a push fails). Guard, sidebar,
  // title, and debug panel all read this so they can never disagree about whose
  // turn it is (Bugs 1 & 3). Falls back to the cached flag only before any state
  // has loaded (currentPlayer not yet available).
  checkIsActivePlayer() {
    const cp = this.gameState?.currentPlayer;
    if (cp && cp.oderId != null) return cp.oderId === this.userId;
    return this.isActivePlayer;
  }

  // Push AUTHORIZATION — deliberately uses the cached flag, NOT live state.
  // Rationale: your own turn-ENDING action advances the live currentPlayer to
  // the next player before the notify fires, so a live check would refuse to
  // push the very transition that ends your turn (leaving it stranded locally —
  // the exact V2.55 failure). The cached flag stays true across that final push
  // because it only updates once the push confirms. AI authority may always push.
  canPushLocalChange() {
    return this.isActivePlayer || this.hasAIAuthority();
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
