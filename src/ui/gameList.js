// Game List UI for Tactical Risk multiplayer
// Shows active games for rejoining

import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from '../multiplayer/firebase.js';
import { getAuthManager } from '../multiplayer/auth.js';
import { getLobbyManager } from '../multiplayer/lobbyManager.js';

export class GameList {
  constructor(onSelectGame, onBack) {
    this.onSelectGame = onSelectGame;
    this.onBack = onBack;
    this.db = getFirebaseDb();
    this.authManager = getAuthManager();
    this.lobbyManager = getLobbyManager();
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
    this.el.className = 'lobby-overlay modern';
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
      // Query games where user is a player
      // Include both 'active' and 'starting' (in case host hasn't initialized yet)
      const q = query(
        collection(this.db, 'games'),
        where('playerUserIds', 'array-contains', userId),
        where('status', 'in', ['active', 'starting'])
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
    const isAdmin = this.lobbyManager.isAdmin();

    let content = '';

    if (this.isLoading) {
      content = `
        <div class="mp-games-loading">Loading your games...</div>
      `;
    } else if (this.games.length === 0) {
      content = `
        <p class="mp-no-games">No active games found.</p>
        <p class="mp-no-games-hint">Games you create or join will appear here.</p>
      `;
    } else {
      content = `
        <div class="mp-games-list">
          ${this.games.map(game => this._renderGameItem(game, user, isAdmin)).join('')}
        </div>
      `;
    }

    this.el.innerHTML = `
      <div class="lobby-container modern">
        <div class="lobby-bg-pattern"></div>
        <div class="lobby-content-wrapper">
          <div class="mp-lobby-container">
            <div class="lobby-brand mp-brand">
              <h1 class="lobby-logo">Tactical Risk</h1>
              <p class="lobby-tagline">My Active Games</p>
            </div>

            <div class="mp-active-games-section">
              <div class="mp-section-header">
                <h3 class="mp-section-title">Your Games</h3>
                <button class="mp-refresh-btn" data-action="refresh" title="Refresh">↻</button>
              </div>
              ${content}
            </div>

            <div class="mp-footer-actions">
              <button class="mp-secondary-btn" data-action="back">← Back</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _renderGameItem(game, user, isAdmin) {
    const lobbyData = game.lobbyData || {};
    const players = lobbyData.players || [];

    // Format last updated time
    let lastUpdated = 'Unknown';
    if (game.updatedAt) {
      const date = game.updatedAt.toDate?.() || new Date(game.updatedAt);
      lastUpdated = this._formatTimeAgo(date);
    }

    // Check game status
    const isStarting = game.status === 'starting';

    // Check if it's user's turn (only relevant for active games)
    const isMyTurn = !isStarting && game.currentPlayerId === user?.id;

    // Get current player name
    const currentPlayer = players.find(p => p.oderId === game.currentPlayerId);
    const currentPlayerName = currentPlayer?.displayName || 'Unknown';

    // Get round info from state
    const round = game.state?.round || 1;

    // Player names list
    const playerNames = players.map(p => p.displayName).join(', ');

    // Status display
    let statusHtml;
    if (isStarting) {
      statusHtml = '<span class="mp-waiting">Starting...</span>';
    } else if (isMyTurn) {
      statusHtml = '<span class="mp-your-turn">Your Turn!</span>';
    } else {
      statusHtml = `<span class="mp-waiting">Waiting: ${currentPlayerName}</span>`;
    }

    return `
      <div class="mp-game-row">
        <button class="mp-game-item ${isMyTurn ? 'my-turn' : ''}" data-game-id="${game.id}">
          <div class="mp-game-info">
            <span class="mp-game-name">${playerNames}</span>
            <span class="mp-game-details">
              ${isStarting ? 'Starting' : `Round ${round}`} · ${players.length} players · ${lastUpdated}
            </span>
          </div>
          <div class="mp-game-status">
            ${statusHtml}
          </div>
        </button>
        ${isAdmin ? `<button class="mp-admin-delete" data-delete-game="${game.id}" title="Delete (Admin)">🗑</button>` : ''}
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

    // Game items - click to join
    this.el.querySelectorAll('.mp-game-item').forEach(item => {
      item.addEventListener('click', () => {
        const gameId = item.dataset.gameId;
        const game = this.games.find(g => g.id === gameId);
        if (game && this.onSelectGame) {
          this.hide();
          this.onSelectGame(gameId, game);
        }
      });
    });

    // Admin delete buttons
    this.el.querySelectorAll('.mp-admin-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const gameId = btn.dataset.deleteGame;
        if (confirm('Delete this game? This cannot be undone.')) {
          const result = await this.lobbyManager.adminDeleteGame(gameId);
          if (result.success) {
            await this._loadGames();
            this._render();
          } else {
            alert('Failed to delete: ' + result.error);
          }
        }
      });
    });
  }
}
