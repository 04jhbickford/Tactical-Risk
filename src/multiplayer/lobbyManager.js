// Lobby Manager for Tactical Risk multiplayer
// Handles create/join/ready/start lobby flow

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from './firebase.js';
import { getAuthManager } from './auth.js';

// Generate a random 6-character lobby code
function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class LobbyManager {
  constructor() {
    this.db = null;
    this.authManager = null;
    this.currentLobby = null;
    this.lobbyUnsubscribe = null;
    this._listeners = [];
  }

  initialize() {
    this.db = getFirebaseDb();
    this.authManager = getAuthManager();
  }

  // Subscribe to lobby changes
  subscribe(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners() {
    for (const cb of this._listeners) {
      cb(this.currentLobby);
    }
  }

  // Create a new lobby
  async createLobby(name, settings = {}) {
    if (!this.db) return { success: false, error: 'Not connected' };

    const user = this.authManager.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    // Generate unique code
    let code = generateLobbyCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await this._findLobbyByCode(code);
      if (!existing) break;
      code = generateLobbyCode();
      attempts++;
    }

    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lobbyData = {
      code,
      hostId: user.id,
      name: name || `${user.displayName}'s Game`,
      password: settings.password || null,
      status: 'waiting', // 'waiting', 'starting', 'in_progress', 'finished'
      settings: {
        maxPlayers: settings.maxPlayers || 5,
        startingIPCs: settings.startingIPCs || 80,
        teamsEnabled: settings.teamsEnabled || false
      },
      players: [{
        oderId: user.id,
        displayName: user.displayName,
        factionId: null,
        color: null,
        isReady: false,
        isHost: true,
        joinedAt: Date.now()
      }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(this.db, 'lobbies', lobbyId), lobbyData);
      this._subscribeToLobby(lobbyId);
      return { success: true, lobbyId, code };
    } catch (error) {
      console.error('Error creating lobby:', error);
      return { success: false, error: error.message };
    }
  }

  // Find lobby by code
  async _findLobbyByCode(code) {
    const q = query(
      collection(this.db, 'lobbies'),
      where('code', '==', code.toUpperCase()),
      where('status', '==', 'waiting')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  // Join a lobby by code
  async joinLobby(code, password = null) {
    if (!this.db) return { success: false, error: 'Not connected' };

    const user = this.authManager.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const lobby = await this._findLobbyByCode(code);
    if (!lobby) return { success: false, error: 'Lobby not found' };

    // Check password
    if (lobby.password && lobby.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    // Check if already in lobby
    if (lobby.players.some(p => p.oderId === user.id)) {
      this._subscribeToLobby(lobby.id);
      return { success: true, lobbyId: lobby.id };
    }

    // Check if full
    if (lobby.players.length >= lobby.settings.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }

    // Add player
    const newPlayer = {
      oderId: user.id,
      displayName: user.displayName,
      factionId: null,
      color: null,
      isReady: false,
      isHost: false,
      joinedAt: Date.now()
    };

    try {
      await updateDoc(doc(this.db, 'lobbies', lobby.id), {
        players: arrayUnion(newPlayer),
        updatedAt: serverTimestamp()
      });
      this._subscribeToLobby(lobby.id);
      return { success: true, lobbyId: lobby.id };
    } catch (error) {
      console.error('Error joining lobby:', error);
      return { success: false, error: error.message };
    }
  }

  // Leave current lobby
  async leaveLobby() {
    if (!this.currentLobby) return { success: true };

    const user = this.authManager.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const lobbyId = this.currentLobby.id;
    const lobby = this.currentLobby;

    // Unsubscribe first
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
      this.lobbyUnsubscribe = null;
    }
    this.currentLobby = null;

    // If host, delete lobby or transfer host
    if (lobby.hostId === user.id) {
      if (lobby.players.length <= 1) {
        // Delete empty lobby
        try {
          await deleteDoc(doc(this.db, 'lobbies', lobbyId));
        } catch (error) {
          console.error('Error deleting lobby:', error);
        }
      } else {
        // Transfer host to next player
        const newPlayers = lobby.players.filter(p => p.oderId !== user.id);
        newPlayers[0].isHost = true;
        try {
          await updateDoc(doc(this.db, 'lobbies', lobbyId), {
            hostId: newPlayers[0].oderId,
            players: newPlayers,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error transferring host:', error);
        }
      }
    } else {
      // Remove self from players
      const currentPlayer = lobby.players.find(p => p.oderId === user.id);
      if (currentPlayer) {
        try {
          await updateDoc(doc(this.db, 'lobbies', lobbyId), {
            players: arrayRemove(currentPlayer),
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error leaving lobby:', error);
        }
      }
    }

    this._notifyListeners();
    return { success: true };
  }

  // Update player settings (faction, color, ready status)
  async updatePlayer(updates) {
    if (!this.currentLobby) return { success: false, error: 'Not in lobby' };

    const user = this.authManager.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const players = [...this.currentLobby.players];
    const playerIndex = players.findIndex(p => p.oderId === user.id);
    if (playerIndex === -1) return { success: false, error: 'Not in lobby' };

    // Update player data
    players[playerIndex] = {
      ...players[playerIndex],
      ...updates
    };

    try {
      await updateDoc(doc(this.db, 'lobbies', this.currentLobby.id), {
        players,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating player:', error);
      return { success: false, error: error.message };
    }
  }

  // Toggle ready status
  async toggleReady() {
    if (!this.currentLobby) return { success: false, error: 'Not in lobby' };

    const user = this.authManager.getUser();
    const player = this.currentLobby.players.find(p => p.oderId === user.id);
    if (!player) return { success: false, error: 'Not in lobby' };

    return this.updatePlayer({ isReady: !player.isReady });
  }

  // Select faction
  async selectFaction(factionId, color) {
    return this.updatePlayer({ factionId, color });
  }

  // Add AI player (host only)
  async addAIPlayer(difficulty, factionId, color) {
    if (!this.currentLobby) return { success: false, error: 'Not in lobby' };

    const user = this.authManager.getUser();
    if (this.currentLobby.hostId !== user.id) {
      return { success: false, error: 'Only host can add AI' };
    }

    if (this.currentLobby.players.length >= this.currentLobby.settings.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }

    const aiId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

    const aiPlayer = {
      oderId: aiId,
      displayName: `${difficultyNames[difficulty] || 'AI'} Bot`,
      factionId,
      color,
      isReady: true, // AI is always ready
      isHost: false,
      isAI: true,
      aiDifficulty: difficulty,
      joinedAt: Date.now()
    };

    const players = [...this.currentLobby.players, aiPlayer];

    try {
      await updateDoc(doc(this.db, 'lobbies', this.currentLobby.id), {
        players,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding AI player:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove AI player (host only)
  async removeAIPlayer(index) {
    if (!this.currentLobby) return { success: false, error: 'Not in lobby' };

    const user = this.authManager.getUser();
    if (this.currentLobby.hostId !== user.id) {
      return { success: false, error: 'Only host can remove AI' };
    }

    const player = this.currentLobby.players[index];
    if (!player || !player.isAI) {
      return { success: false, error: 'Not an AI player' };
    }

    const players = this.currentLobby.players.filter((_, i) => i !== index);

    try {
      await updateDoc(doc(this.db, 'lobbies', this.currentLobby.id), {
        players,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error removing AI player:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if all players are ready
  canStart() {
    if (!this.currentLobby) return false;
    if (this.currentLobby.players.length < 2) return false;

    // All players must have selected a faction and be ready (AI players are always ready)
    return this.currentLobby.players.every(p =>
      p.factionId && (p.isReady || p.isAI)
    );
  }

  // Start the game (host only)
  async startGame() {
    if (!this.currentLobby) return { success: false, error: 'Not in lobby' };

    const user = this.authManager.getUser();
    if (this.currentLobby.hostId !== user.id) {
      return { success: false, error: 'Only host can start' };
    }

    if (!this.canStart()) {
      return { success: false, error: 'Not all players ready' };
    }

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const playerUserIds = this.currentLobby.players.map(p => p.oderId);

    try {
      // Create game document (initial state will be set by the first client)
      await setDoc(doc(this.db, 'games', gameId), {
        lobbyId: this.currentLobby.id,
        status: 'starting',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        currentPlayerId: null, // Will be set when game initializes
        stateVersion: 0,
        playerUserIds,
        state: null, // Will be populated by host
        lobbyData: {
          players: this.currentLobby.players,
          settings: this.currentLobby.settings
        }
      });

      // Update lobby status
      await updateDoc(doc(this.db, 'lobbies', this.currentLobby.id), {
        status: 'starting',
        gameId,
        updatedAt: serverTimestamp()
      });

      return { success: true, gameId };
    } catch (error) {
      console.error('Error starting game:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscribe to real-time lobby updates
  _subscribeToLobby(lobbyId) {
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
    }

    this.lobbyUnsubscribe = onSnapshot(
      doc(this.db, 'lobbies', lobbyId),
      (snapshot) => {
        if (snapshot.exists()) {
          this.currentLobby = { id: snapshot.id, ...snapshot.data() };
        } else {
          this.currentLobby = null;
        }
        this._notifyListeners();
      },
      (error) => {
        console.error('Lobby subscription error:', error);
        this.currentLobby = null;
        this._notifyListeners();
      }
    );
  }

  // Get current lobby
  getLobby() {
    return this.currentLobby;
  }

  // Check if current user is host
  isHost() {
    if (!this.currentLobby) return false;
    const user = this.authManager.getUser();
    return this.currentLobby.hostId === user?.id;
  }

  // Get current player's data
  getCurrentPlayer() {
    if (!this.currentLobby) return null;
    const user = this.authManager.getUser();
    return this.currentLobby.players.find(p => p.oderId === user?.id);
  }
}

// Singleton instance
let lobbyManagerInstance = null;

export function getLobbyManager() {
  if (!lobbyManagerInstance) {
    lobbyManagerInstance = new LobbyManager();
  }
  return lobbyManagerInstance;
}
