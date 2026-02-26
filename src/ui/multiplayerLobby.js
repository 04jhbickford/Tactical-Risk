// Multiplayer Lobby UI for Tactical Risk
// Shows players, ready status, faction selection, and game start

import { getLobbyManager } from '../multiplayer/lobbyManager.js';
import { getAuthManager } from '../multiplayer/auth.js';
import { GAME_VERSION } from './lobby.js';

// Available factions (should match setup data)
const FACTIONS = [
  { id: 'usa', name: 'USA', flag: 'usa.png', color: '#1E90FF' },
  { id: 'germany', name: 'Germany', flag: 'germany.png', color: '#4A4A4A' },
  { id: 'ussr', name: 'USSR', flag: 'ussr.png', color: '#B22222' },
  { id: 'uk', name: 'UK', flag: 'uk.png', color: '#DAA520' },
  { id: 'japan', name: 'Japan', flag: 'japan.png', color: '#FF8C00' },
];

const FACTION_COLORS = [
  { id: 'red', color: '#B22222', name: 'Crimson' },
  { id: 'blue', color: '#1E90FF', name: 'Blue' },
  { id: 'green', color: '#228B22', name: 'Green' },
  { id: 'orange', color: '#FF8C00', name: 'Orange' },
  { id: 'purple', color: '#8B008B', name: 'Purple' },
  { id: 'gold', color: '#B8860B', name: 'Gold' },
  { id: 'gray', color: '#4A4A4A', name: 'Gray' },
  { id: 'teal', color: '#008B8B', name: 'Teal' },
];

export class MultiplayerLobby {
  constructor(setup, onStart, onBack) {
    this.setup = setup;
    this.onStart = onStart;
    this.onBack = onBack;
    this.lobbyManager = getLobbyManager();
    this.authManager = getAuthManager();
    this.el = null;
    this.mode = 'menu'; // 'menu', 'create', 'join', 'lobby'
    this.unsubscribe = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'multiplayer-lobby';
    this.el.className = 'lobby-overlay hidden';
    document.body.appendChild(this.el);
  }

  show() {
    this.el.classList.remove('hidden');
    this._subscribeToLobby();
    this._render();
  }

  hide() {
    this.el.classList.add('hidden');
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  destroy() {
    this.hide();
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }

  _subscribeToLobby() {
    this.unsubscribe = this.lobbyManager.subscribe((lobby) => {
      // Check if game is starting
      if (lobby?.status === 'starting' && lobby.gameId) {
        this.hide();
        if (this.onStart) {
          this.onStart(lobby.gameId, lobby);
        }
        return;
      }

      // Update UI
      if (lobby) {
        this.mode = 'lobby';
      }
      this._render();
    });
  }

  _render() {
    const user = this.authManager.getUser();

    let content = '';

    if (this.mode === 'menu') {
      content = this._renderMenu(user);
    } else if (this.mode === 'create') {
      content = this._renderCreate(user);
    } else if (this.mode === 'join') {
      content = this._renderJoin(user);
    } else if (this.mode === 'lobby') {
      content = this._renderLobby(user);
    }

    this.el.innerHTML = `
      <div class="lobby-content unified mp-lobby">
        <div class="lobby-header-main">
          <h1 class="lobby-title">Tactical Risk Online</h1>
          <span class="lobby-version">${GAME_VERSION}</span>
        </div>
        ${content}
      </div>
    `;

    this._bindEvents();
  }

  _renderMenu(user) {
    return `
      <p class="lobby-subtitle">Welcome, ${user?.displayName || 'Player'}</p>

      <div class="mp-menu-buttons">
        <button class="mp-menu-btn" data-action="create">
          <span class="mp-btn-icon">+</span>
          <span class="mp-btn-text">Create Game</span>
        </button>
        <button class="mp-menu-btn" data-action="join">
          <span class="mp-btn-icon">&#8594;</span>
          <span class="mp-btn-text">Join Game</span>
        </button>
        <button class="mp-menu-btn secondary" data-action="rejoin">
          <span class="mp-btn-icon">&#8634;</span>
          <span class="mp-btn-text">Rejoin Game</span>
        </button>
      </div>

      <div class="mp-footer">
        <button class="mp-back-btn" data-action="back">Back to Main Menu</button>
        <button class="mp-signout-btn" data-action="signout">Sign Out</button>
      </div>
    `;
  }

  _renderCreate(user) {
    return `
      <p class="lobby-subtitle">Create New Game</p>

      <form class="mp-form" data-form="create">
        <div class="mp-field">
          <label>Game Name</label>
          <input type="text" id="create-name" placeholder="${user?.displayName}'s Game" maxlength="30">
        </div>
        <div class="mp-field">
          <label>Max Players</label>
          <select id="create-max-players">
            <option value="2">2 Players</option>
            <option value="3">3 Players</option>
            <option value="4">4 Players</option>
            <option value="5" selected>5 Players</option>
          </select>
        </div>
        <div class="mp-field">
          <label>Starting IPCs</label>
          <select id="create-ipcs">
            <option value="40">40 IPCs</option>
            <option value="60">60 IPCs</option>
            <option value="80" selected>80 IPCs (Default)</option>
            <option value="100">100 IPCs</option>
            <option value="120">120 IPCs</option>
          </select>
        </div>
        <div class="mp-field">
          <label>Password (optional)</label>
          <input type="password" id="create-password" placeholder="Leave empty for public">
        </div>
        <div class="mp-checkbox-field">
          <label>
            <input type="checkbox" id="create-teams">
            Enable Team Mode
          </label>
        </div>

        <div class="mp-error hidden" id="create-error"></div>

        <div class="mp-form-buttons">
          <button type="button" class="mp-cancel-btn" data-action="cancel">Cancel</button>
          <button type="submit" class="mp-submit-btn">Create Game</button>
        </div>
      </form>
    `;
  }

  _renderJoin(user) {
    return `
      <p class="lobby-subtitle">Join Game</p>

      <form class="mp-form" data-form="join">
        <div class="mp-field">
          <label>Game Code</label>
          <input type="text" id="join-code" placeholder="ABC123" maxlength="6"
                 style="text-transform: uppercase; font-size: 1.5em; text-align: center; letter-spacing: 0.2em;">
        </div>
        <div class="mp-field">
          <label>Password (if required)</label>
          <input type="password" id="join-password" placeholder="Leave empty if none">
        </div>

        <div class="mp-error hidden" id="join-error"></div>

        <div class="mp-form-buttons">
          <button type="button" class="mp-cancel-btn" data-action="cancel">Cancel</button>
          <button type="submit" class="mp-submit-btn">Join Game</button>
        </div>
      </form>
    `;
  }

  _renderLobby(user) {
    const lobby = this.lobbyManager.getLobby();
    if (!lobby) {
      this.mode = 'menu';
      return this._renderMenu(user);
    }

    const currentPlayer = this.lobbyManager.getCurrentPlayer();
    const isHost = this.lobbyManager.isHost();
    const canStart = this.lobbyManager.canStart();
    const factions = this.setup?.risk?.factions || FACTIONS;

    // Get taken factions and colors
    const takenFactions = new Set(lobby.players.map(p => p.factionId).filter(Boolean));
    const takenColors = new Set(lobby.players.map(p => p.color).filter(Boolean));

    return `
      <div class="mp-lobby-header">
        <p class="lobby-subtitle">${lobby.name}</p>
        <div class="mp-lobby-code">
          <span>Game Code:</span>
          <span class="code-value">${lobby.code}</span>
          <button class="copy-code-btn" data-action="copy-code" title="Copy code">&#128203;</button>
        </div>
      </div>

      <div class="mp-players-section">
        <h3>Players (${lobby.players.length}/${lobby.settings.maxPlayers})</h3>
        <div class="mp-players-list">
          ${lobby.players.map(player => {
            const isMe = player.oderId === user?.id;
            const faction = factions.find(f => f.id === player.factionId);
            return `
              <div class="mp-player-card ${isMe ? 'is-me' : ''} ${player.isReady ? 'ready' : ''}">
                <div class="mp-player-info">
                  ${faction ? `<img src="assets/flags/${faction.flag}" class="mp-player-flag">` : '<div class="mp-player-flag-placeholder">?</div>'}
                  <span class="mp-player-name">${player.displayName}</span>
                  ${player.isHost ? '<span class="mp-host-badge">HOST</span>' : ''}
                </div>
                <div class="mp-player-status">
                  ${player.color ? `<div class="mp-player-color" style="background: ${player.color}"></div>` : ''}
                  <span class="mp-ready-status ${player.isReady ? 'ready' : ''}">${player.isReady ? 'Ready' : 'Not Ready'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="mp-selection-section">
        <h3>Select Your Faction</h3>
        <div class="mp-faction-grid">
          ${factions.map(faction => {
            const isTaken = takenFactions.has(faction.id) && currentPlayer?.factionId !== faction.id;
            const isSelected = currentPlayer?.factionId === faction.id;
            return `
              <button class="mp-faction-btn ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
                      data-faction="${faction.id}" ${isTaken ? 'disabled' : ''}>
                <img src="assets/flags/${faction.flag}" alt="${faction.name}">
                <span>${faction.name}</span>
                ${isTaken ? '<span class="taken-label">Taken</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>

        <h3>Select Your Color</h3>
        <div class="mp-color-grid">
          ${FACTION_COLORS.map(colorDef => {
            const isTaken = takenColors.has(colorDef.color) && currentPlayer?.color !== colorDef.color;
            const isSelected = currentPlayer?.color === colorDef.color;
            return `
              <button class="mp-color-btn ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
                      data-color="${colorDef.color}" ${isTaken ? 'disabled' : ''}
                      style="background: ${colorDef.color}" title="${colorDef.name}">
                ${isSelected ? '&#10003;' : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="mp-lobby-footer">
        <button class="mp-leave-btn" data-action="leave">Leave Game</button>
        <button class="mp-ready-btn ${currentPlayer?.isReady ? 'ready' : ''}" data-action="ready"
                ${!currentPlayer?.factionId || !currentPlayer?.color ? 'disabled' : ''}>
          ${currentPlayer?.isReady ? 'Not Ready' : 'Ready'}
        </button>
        ${isHost ? `
          <button class="mp-start-btn" data-action="start" ${!canStart ? 'disabled' : ''}>
            Start Game
          </button>
        ` : `
          <span class="mp-waiting-text">Waiting for host to start...</span>
        `}
      </div>
    `;
  }

  _bindEvents() {
    // Menu buttons
    this.el.querySelector('[data-action="create"]')?.addEventListener('click', () => {
      this.mode = 'create';
      this._render();
    });

    this.el.querySelector('[data-action="join"]')?.addEventListener('click', () => {
      this.mode = 'join';
      this._render();
    });

    this.el.querySelector('[data-action="rejoin"]')?.addEventListener('click', () => {
      // Show game list for rejoining
      if (this.onBack) {
        this.onBack('rejoin');
      }
    });

    this.el.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.hide();
      if (this.onBack) {
        this.onBack();
      }
    });

    this.el.querySelector('[data-action="signout"]')?.addEventListener('click', async () => {
      await this.authManager.signOut();
      this.hide();
      if (this.onBack) {
        this.onBack();
      }
    });

    this.el.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.mode = 'menu';
      this._render();
    });

    // Create form
    this.el.querySelector('[data-form="create"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleCreate(e.target);
    });

    // Join form
    this.el.querySelector('[data-form="join"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleJoin(e.target);
    });

    // Lobby actions
    this.el.querySelector('[data-action="copy-code"]')?.addEventListener('click', () => {
      const lobby = this.lobbyManager.getLobby();
      if (lobby) {
        navigator.clipboard.writeText(lobby.code);
      }
    });

    this.el.querySelector('[data-action="leave"]')?.addEventListener('click', async () => {
      await this.lobbyManager.leaveLobby();
      this.mode = 'menu';
      this._render();
    });

    this.el.querySelector('[data-action="ready"]')?.addEventListener('click', async () => {
      await this.lobbyManager.toggleReady();
    });

    this.el.querySelector('[data-action="start"]')?.addEventListener('click', async () => {
      const result = await this.lobbyManager.startGame();
      if (!result.success) {
        alert(result.error);
      }
    });

    // Faction selection
    this.el.querySelectorAll('.mp-faction-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async () => {
        const factionId = btn.dataset.faction;
        const currentPlayer = this.lobbyManager.getCurrentPlayer();
        await this.lobbyManager.selectFaction(factionId, currentPlayer?.color);
      });
    });

    // Color selection
    this.el.querySelectorAll('.mp-color-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async () => {
        const color = btn.dataset.color;
        const currentPlayer = this.lobbyManager.getCurrentPlayer();
        await this.lobbyManager.selectFaction(currentPlayer?.factionId, color);
      });
    });
  }

  async _handleCreate(form) {
    const name = form.querySelector('#create-name').value;
    const maxPlayers = parseInt(form.querySelector('#create-max-players').value);
    const startingIPCs = parseInt(form.querySelector('#create-ipcs').value);
    const password = form.querySelector('#create-password').value;
    const teamsEnabled = form.querySelector('#create-teams').checked;

    const result = await this.lobbyManager.createLobby(name, {
      maxPlayers,
      startingIPCs,
      password: password || null,
      teamsEnabled
    });

    if (!result.success) {
      const errorEl = form.querySelector('#create-error');
      if (errorEl) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('hidden');
      }
    }
    // Lobby subscription will update mode to 'lobby'
  }

  async _handleJoin(form) {
    const code = form.querySelector('#join-code').value.toUpperCase();
    const password = form.querySelector('#join-password').value;

    const result = await this.lobbyManager.joinLobby(code, password || null);

    if (!result.success) {
      const errorEl = form.querySelector('#join-error');
      if (errorEl) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('hidden');
      }
    }
    // Lobby subscription will update mode to 'lobby'
  }
}
