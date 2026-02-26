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

const AI_DIFFICULTIES = [
  { id: 'easy', name: 'Easy AI' },
  { id: 'medium', name: 'Medium AI' },
  { id: 'hard', name: 'Hard AI' },
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
    this.el.className = 'lobby-overlay modern hidden';
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
      <div class="lobby-container modern">
        <div class="lobby-bg-pattern"></div>
        <div class="lobby-content-wrapper">
          <div class="mp-lobby-container">
            <div class="lobby-brand mp-brand">
              <h1 class="lobby-logo">Tactical Risk</h1>
              <p class="lobby-tagline">Online Multiplayer</p>
              <span class="lobby-version-badge">${GAME_VERSION}</span>
            </div>
            ${content}
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _renderMenu(user) {
    return `
      <p class="mp-welcome">Welcome, <strong>${user?.displayName || 'Player'}</strong></p>

      <div class="mp-menu-grid">
        <button class="mp-menu-card" data-action="create">
          <div class="mp-card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          <div class="mp-card-content">
            <h3>Create Game</h3>
            <p>Host a new multiplayer game</p>
          </div>
        </button>
        <button class="mp-menu-card" data-action="join">
          <div class="mp-card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="mp-card-content">
            <h3>Join Game</h3>
            <p>Enter a game code to join</p>
          </div>
        </button>
      </div>

      <button class="mp-rejoin-btn" data-action="rejoin">
        <span class="mp-rejoin-icon">↻</span>
        <span>Rejoin Active Games</span>
      </button>

      <div class="mp-footer-actions">
        <button class="mp-secondary-btn" data-action="back">← Back</button>
        <button class="mp-secondary-btn danger" data-action="signout">Sign Out</button>
      </div>
    `;
  }

  _renderCreate(user) {
    return `
      <div class="mp-form-header">
        <button class="back-btn" data-action="cancel">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h2>Create New Game</h2>
      </div>

      <form class="mp-form modern" data-form="create">
        <div class="mp-field">
          <label>Game Name</label>
          <input type="text" id="create-name" placeholder="${user?.displayName}'s Game" maxlength="30" class="modern-input">
        </div>
        <div class="mp-field-row">
          <div class="mp-field">
            <label>Max Players</label>
            <select id="create-max-players" class="modern-select">
              <option value="2">2 Players</option>
              <option value="3">3 Players</option>
              <option value="4">4 Players</option>
              <option value="5" selected>5 Players</option>
            </select>
          </div>
          <div class="mp-field">
            <label>Starting IPCs</label>
            <select id="create-ipcs" class="modern-select">
              <option value="40">40 IPCs</option>
              <option value="60">60 IPCs</option>
              <option value="80" selected>80 IPCs</option>
              <option value="100">100 IPCs</option>
              <option value="120">120 IPCs</option>
            </select>
          </div>
        </div>
        <div class="mp-field">
          <label>Password (optional)</label>
          <input type="password" id="create-password" placeholder="Leave empty for public game" class="modern-input">
        </div>
        <label class="mp-toggle-option">
          <input type="checkbox" id="create-teams">
          <span class="toggle-slider"></span>
          <div class="toggle-label">
            <span class="toggle-title">Team Mode</span>
            <span class="toggle-desc">Players on same team share victory</span>
          </div>
        </label>

        <div class="mp-error hidden" id="create-error"></div>

        <button type="submit" class="mp-primary-btn">Create Game</button>
      </form>
    `;
  }

  _renderJoin(user) {
    return `
      <div class="mp-form-header">
        <button class="back-btn" data-action="cancel">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h2>Join Game</h2>
      </div>

      <form class="mp-form modern" data-form="join">
        <div class="mp-field">
          <label>Game Code</label>
          <input type="text" id="join-code" placeholder="ABC123" maxlength="6" class="modern-input code-input">
        </div>
        <div class="mp-field">
          <label>Password (if required)</label>
          <input type="password" id="join-password" placeholder="Leave empty if none" class="modern-input">
        </div>

        <div class="mp-error hidden" id="join-error"></div>

        <button type="submit" class="mp-primary-btn">Join Game</button>
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
      <div class="mp-lobby-active">
        <div class="mp-lobby-header-bar">
          <div class="mp-lobby-title-group">
            <h2>${lobby.name}</h2>
            <div class="mp-code-badge">
              <span class="code-label">CODE</span>
              <span class="code-value">${lobby.code}</span>
              <button class="copy-btn" data-action="copy-code" title="Copy code">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="mp-players-section modern">
          <div class="mp-section-header">
            <h3>Players <span class="player-count">${lobby.players.length}/${lobby.settings.maxPlayers}</span></h3>
            ${isHost && lobby.players.length < lobby.settings.maxPlayers ? `
              <button class="mp-add-ai-btn" data-action="add-ai">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add AI
              </button>
            ` : ''}
          </div>
          <div class="mp-players-grid">
            ${lobby.players.map((player, index) => {
              const isMe = player.oderId === user?.id;
              const isAI = player.isAI;
              const faction = factions.find(f => f.id === player.factionId);
              return `
                <div class="mp-player-item ${isMe ? 'is-me' : ''} ${player.isReady || isAI ? 'ready' : ''}">
                  <div class="mp-player-avatar" style="border-color: ${player.color || '#64748b'}">
                    ${faction ? `<img src="assets/flags/${faction.flag}" alt="${faction.name}">` : '<span class="no-faction">?</span>'}
                  </div>
                  <div class="mp-player-details">
                    <span class="mp-player-name">${player.displayName}</span>
                    <div class="mp-player-badges">
                      ${player.isHost ? '<span class="badge host">HOST</span>' : ''}
                      ${isAI ? `<span class="badge ai">${player.aiDifficulty?.toUpperCase() || 'AI'}</span>` : ''}
                      ${!isAI ? `<span class="badge ${player.isReady ? 'ready' : 'waiting'}">${player.isReady ? 'READY' : 'WAITING'}</span>` : ''}
                    </div>
                  </div>
                  ${isAI && isHost ? `
                    <button class="mp-remove-btn" data-action="remove-ai" data-index="${index}" title="Remove AI">×</button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="mp-selection-section modern">
          <div class="mp-selection-group">
            <h4>Your Faction</h4>
            <div class="mp-faction-grid modern">
              ${factions.map(faction => {
                const isTaken = takenFactions.has(faction.id) && currentPlayer?.factionId !== faction.id;
                const isSelected = currentPlayer?.factionId === faction.id;
                return `
                  <button class="mp-faction-btn ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
                          data-faction="${faction.id}" ${isTaken ? 'disabled' : ''}>
                    <img src="assets/flags/${faction.flag}" alt="${faction.name}">
                    <span>${faction.name}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="mp-selection-group">
            <h4>Your Color</h4>
            <div class="mp-color-grid modern">
              ${FACTION_COLORS.map(colorDef => {
                const isTaken = takenColors.has(colorDef.color) && currentPlayer?.color !== colorDef.color;
                const isSelected = currentPlayer?.color === colorDef.color;
                return `
                  <button class="mp-color-btn ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
                          data-color="${colorDef.color}" ${isTaken ? 'disabled' : ''}
                          style="background: ${colorDef.color}" title="${colorDef.name}">
                    ${isSelected ? '<svg viewBox="0 0 24 24" fill="white" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="mp-lobby-actions">
          <button class="mp-action-btn secondary" data-action="leave">Leave</button>
          <button class="mp-action-btn ${currentPlayer?.isReady ? 'ready' : 'primary'}" data-action="ready"
                  ${!currentPlayer?.factionId || !currentPlayer?.color ? 'disabled' : ''}>
            ${currentPlayer?.isReady ? 'Cancel Ready' : 'Ready Up'}
          </button>
          ${isHost ? `
            <button class="mp-action-btn start" data-action="start" ${!canStart ? 'disabled' : ''}>
              Start Game
            </button>
          ` : `
            <div class="mp-waiting-indicator">
              <div class="waiting-dot"></div>
              <span>Waiting for host...</span>
            </div>
          `}
        </div>
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

    // Add AI button
    this.el.querySelector('[data-action="add-ai"]')?.addEventListener('click', () => {
      this._showAddAIDialog();
    });

    // Remove AI buttons
    this.el.querySelectorAll('[data-action="remove-ai"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        await this.lobbyManager.removeAIPlayer(index);
      });
    });
  }

  _showAddAIDialog() {
    const factions = this.setup?.risk?.factions || FACTIONS;
    const lobby = this.lobbyManager.getLobby();
    const takenFactions = new Set(lobby.players.map(p => p.factionId).filter(Boolean));
    const takenColors = new Set(lobby.players.map(p => p.color).filter(Boolean));

    // Find available faction and color
    const availableFaction = factions.find(f => !takenFactions.has(f.id));
    const availableColor = FACTION_COLORS.find(c => !takenColors.has(c.color));

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'mp-ai-dialog-overlay';
    dialog.innerHTML = `
      <div class="mp-ai-dialog">
        <h3>Add AI Player</h3>
        <div class="mp-field">
          <label>Difficulty</label>
          <select id="ai-difficulty">
            ${AI_DIFFICULTIES.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="mp-field">
          <label>Faction</label>
          <select id="ai-faction">
            ${factions.map(f => `
              <option value="${f.id}" ${takenFactions.has(f.id) ? 'disabled' : ''} ${f.id === availableFaction?.id ? 'selected' : ''}>
                ${f.name} ${takenFactions.has(f.id) ? '(Taken)' : ''}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="mp-field">
          <label>Color</label>
          <select id="ai-color">
            ${FACTION_COLORS.map(c => `
              <option value="${c.color}" ${takenColors.has(c.color) ? 'disabled' : ''} ${c.color === availableColor?.color ? 'selected' : ''}>
                ${c.name} ${takenColors.has(c.color) ? '(Taken)' : ''}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="mp-form-buttons">
          <button type="button" class="mp-cancel-btn" data-action="cancel-ai">Cancel</button>
          <button type="button" class="mp-submit-btn" data-action="confirm-ai">Add AI</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Bind dialog events
    dialog.querySelector('[data-action="cancel-ai"]').addEventListener('click', () => {
      dialog.remove();
    });

    dialog.querySelector('[data-action="confirm-ai"]').addEventListener('click', async () => {
      const difficulty = dialog.querySelector('#ai-difficulty').value;
      const factionId = dialog.querySelector('#ai-faction').value;
      const color = dialog.querySelector('#ai-color').value;

      await this.lobbyManager.addAIPlayer(difficulty, factionId, color);
      dialog.remove();
    });

    // Close on overlay click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
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
