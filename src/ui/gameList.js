// Game List UI for Tactical Risk multiplayer
// Shows active games for rejoining

import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from '../multiplayer/firebase.js';
import { getAuthManager } from '../multiplayer/auth.js';

export class GameList {
  constructor(onSelectGame, onBack) {
    this.onSelectGame = onSelectGame;
    this.onBack = onBack;
    this.db = getFirebaseDb();
    this.authManager = getAuthManager();
    this.el = null;
    this.games = [];
    this.isLoading = false;
  }

  async show() {
    if (!this.el) {
      this._create();
    }
    this.el.classList.remove('hidden');
    await this._loadGames();
    this._render();
  }

  hide() {
    if (this.el) {
      this.el.classList.add('hidden');
    }
  }

  destroy() {
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'game-list';
    this.el.className = 'game-list-overlay';
    document.body.appendChild(this.el);
  }

  async _loadGames() {
    this.isLoading = true;
    this._render();

    const userId = this.authManager.getUserId();
    if (!userId || !this.db) {
      this.games = [];
      this.isLoading = false;
      return;
    }

    try {
      // Query games where user is a player and game is active
      const q = query(
        collection(this.db, 'games'),
        where('playerUserIds', 'array-contains', userId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      this.games = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by last updated
      this.games.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error loading games:', error);
      this.games = [];
    }

    this.isLoading = false;
  }

  _render() {
    const user = this.authManager.getUser();

    let content = '';

    if (this.isLoading) {
      content = `
        <div class="game-list-loading">
          <div class="loading-spinner"></div>
          <p>Loading your games...</p>
        </div>
      `;
    } else if (this.games.length === 0) {
      content = `
        <div class="game-list-empty">
          <p>No active games found.</p>
          <p class="game-list-hint">Games you join or create will appear here.</p>
        </div>
      `;
    } else {
      content = `
        <div class="game-list-items">
          ${this.games.map(game => this._renderGameItem(game, user)).join('')}
        </div>
      `;
    }

    this.el.innerHTML = `
      <div class="game-list-content">
        <div class="game-list-header">
          <h2>Your Active Games</h2>
          <button class="game-list-refresh-btn" data-action="refresh" title="Refresh">&#8635;</button>
        </div>

        ${content}

        <div class="game-list-footer">
          <button class="game-list-back-btn" data-action="back">Back</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _renderGameItem(game, user) {
    const lobbyData = game.lobbyData || {};
    const players = lobbyData.players || [];
    const settings = lobbyData.settings || {};

    // Format last updated time
    let lastUpdated = 'Unknown';
    if (game.updatedAt) {
      const date = game.updatedAt.toDate?.() || new Date(game.updatedAt);
      lastUpdated = this._formatTimeAgo(date);
    }

    // Check if it's user's turn
    const isMyTurn = game.currentPlayerId === user?.id;

    // Get current player name
    const currentPlayer = players.find(p => p.oderId === game.currentPlayerId);
    const currentPlayerName = currentPlayer?.displayName || 'Unknown';

    // Get round info from state
    const round = game.state?.round || 1;

    return `
      <div class="game-list-item ${isMyTurn ? 'my-turn' : ''}" data-game-id="${game.id}">
        <div class="game-item-main">
          <div class="game-item-info">
            <span class="game-item-players">${players.length} players</span>
            <span class="game-item-round">Round ${round}</span>
            <span class="game-item-time">${lastUpdated}</span>
          </div>
          <div class="game-item-turn">
            ${isMyTurn
              ? '<span class="your-turn-badge">Your Turn!</span>'
              : `<span class="waiting-for">Waiting for ${currentPlayerName}</span>`
            }
          </div>
        </div>
        <div class="game-item-players-list">
          ${players.map(p => `
            <span class="game-player-tag" style="border-color: ${p.color || '#666'}">
              ${p.displayName}
              ${p.oderId === game.currentPlayerId ? ' (active)' : ''}
            </span>
          `).join('')}
        </div>
        <button class="game-item-join-btn" data-game-id="${game.id}">
          ${isMyTurn ? 'Play Now' : 'View Game'}
        </button>
      </div>
    `;
  }

  _formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  _bindEvents() {
    // Back button
    this.el.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.hide();
      if (this.onBack) {
        this.onBack();
      }
    });

    // Refresh button
    this.el.querySelector('[data-action="refresh"]')?.addEventListener('click', async () => {
      await this._loadGames();
      this._render();
    });

    // Game items
    this.el.querySelectorAll('.game-item-join-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.dataset.gameId;
        const game = this.games.find(g => g.id === gameId);
        if (game && this.onSelectGame) {
          this.hide();
          this.onSelectGame(gameId, game);
        }
      });
    });
  }
}
