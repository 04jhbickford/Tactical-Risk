// Presence Manager for Tactical Risk multiplayer
// Tracks online/active status of players in a game

import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  collection
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from './firebase.js';
import { getAuthManager } from './auth.js';

// Presence states
export const PRESENCE_STATES = {
  ONLINE: 'online',    // Active in past 60 seconds (green)
  IDLE: 'idle',        // Logged in but no activity in 60+ seconds (yellow)
  OFFLINE: 'offline'   // Not connected (red)
};

const ACTIVITY_TIMEOUT = 60000; // 60 seconds
const HEARTBEAT_INTERVAL = 30000; // Update every 30 seconds

export class PresenceManager {
  constructor() {
    // Lazy load db and authManager to avoid initialization order issues
    this._db = null;
    this._authManager = null;
    this.gameId = null;
    this.presenceRef = null;
    this.unsubscribe = null;
    this.heartbeatInterval = null;
    this.lastActivity = Date.now();
    this.playerPresence = {}; // { oderId: { state, lastSeen, displayName } }
    this._listeners = [];
    this._boundActivityHandler = this._onActivity.bind(this);
  }

  get db() {
    if (!this._db) {
      this._db = getFirebaseDb();
    }
    return this._db;
  }

  get authManager() {
    if (!this._authManager) {
      this._authManager = getAuthManager();
    }
    return this._authManager;
  }

  // Start tracking presence for a game
  async start(gameId) {
    if (!this.db || !gameId) return false;

    this.gameId = gameId;
    const user = this.authManager.getUser();
    if (!user) return false;

    // Set up presence document
    this.presenceRef = doc(this.db, 'games', gameId, 'presence', user.id);

    // Update presence immediately
    await this._updatePresence(PRESENCE_STATES.ONLINE);

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      const state = this._isActive() ? PRESENCE_STATES.ONLINE : PRESENCE_STATES.IDLE;
      this._updatePresence(state);
    }, HEARTBEAT_INTERVAL);

    // Listen for activity
    document.addEventListener('mousemove', this._boundActivityHandler);
    document.addEventListener('keydown', this._boundActivityHandler);
    document.addEventListener('click', this._boundActivityHandler);
    document.addEventListener('touchstart', this._boundActivityHandler);

    // Subscribe to all presence documents
    this._subscribeToPresence();

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this._goOffline();
    });

    console.log(`[Presence] Started tracking for user ${user.id} in game ${gameId}`);
    return true;
  }

  // Stop tracking presence
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    document.removeEventListener('mousemove', this._boundActivityHandler);
    document.removeEventListener('keydown', this._boundActivityHandler);
    document.removeEventListener('click', this._boundActivityHandler);
    document.removeEventListener('touchstart', this._boundActivityHandler);

    this._goOffline();
    this.gameId = null;
    this.playerPresence = {};
  }

  // Subscribe to presence changes
  subscribe(callback) {
    this._listeners.push(callback);
    // Immediately send current state
    callback(this.playerPresence);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  // Get presence state for a player
  getPlayerPresence(oderId) {
    const presence = this.playerPresence[oderId];
    if (!presence) return PRESENCE_STATES.OFFLINE;

    // Check if presence is stale (> 2 minutes = offline)
    const age = Date.now() - (presence.lastSeen || 0);
    if (age > 120000) return PRESENCE_STATES.OFFLINE;

    return presence.state || PRESENCE_STATES.OFFLINE;
  }

  // Get all player presence
  getAllPresence() {
    return this.playerPresence;
  }

  _onActivity() {
    this.lastActivity = Date.now();
  }

  _isActive() {
    return (Date.now() - this.lastActivity) < ACTIVITY_TIMEOUT;
  }

  async _updatePresence(state) {
    if (!this.presenceRef) return;

    const user = this.authManager.getUser();
    if (!user) return;

    try {
      await setDoc(this.presenceRef, {
        oderId: user.id,
        displayName: user.displayName,
        state,
        lastSeen: Date.now(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('[Presence] Error updating presence:', error);
    }
  }

  async _goOffline() {
    if (this.presenceRef) {
      try {
        // Delete presence document when going offline
        await deleteDoc(this.presenceRef);
      } catch (error) {
        console.error('[Presence] Error going offline:', error);
      }
    }
  }

  _subscribeToPresence() {
    if (!this.gameId || !this.db) return;

    const presenceCollection = collection(this.db, 'games', this.gameId, 'presence');

    this.unsubscribe = onSnapshot(presenceCollection, (snapshot) => {
      const presence = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const age = Date.now() - (data.lastSeen || 0);

        // Determine state based on lastSeen time
        let state = data.state;
        if (age > 120000) {
          state = PRESENCE_STATES.OFFLINE;
        } else if (age > ACTIVITY_TIMEOUT && state === PRESENCE_STATES.ONLINE) {
          state = PRESENCE_STATES.IDLE;
        }

        presence[data.oderId] = {
          ...data,
          state
        };
      });

      this.playerPresence = presence;
      this._notifyListeners();
    });
  }

  _notifyListeners() {
    for (const cb of this._listeners) {
      cb(this.playerPresence);
    }
  }
}

// Singleton instance
let presenceManagerInstance = null;

export function getPresenceManager() {
  if (!presenceManagerInstance) {
    presenceManagerInstance = new PresenceManager();
  }
  return presenceManagerInstance;
}
