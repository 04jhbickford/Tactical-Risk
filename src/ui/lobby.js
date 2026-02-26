// Modern Lobby UI for Tactical Risk
// Clean two-stage flow: Play Mode Selection → Game Setup

export const GAME_VERSION = 'V2.37';

// AI Difficulty levels
const AI_DIFFICULTIES = [
  { id: 'human', name: 'Human', desc: 'Local player' },
  { id: 'easy', name: 'Easy AI', desc: 'Basic strategy' },
  { id: 'medium', name: 'Medium AI', desc: 'Balanced play' },
  { id: 'hard', name: 'Hard AI', desc: 'Expert strategy' },
];

// Available colors for faction selection
const FACTION_COLORS = [
  { id: 'red', color: '#B22222', light: '#DC143C', name: 'Crimson' },
  { id: 'blue', color: '#1E90FF', light: '#4169E1', name: 'Blue' },
  { id: 'green', color: '#228B22', light: '#32CD32', name: 'Green' },
  { id: 'orange', color: '#FF8C00', light: '#FFA500', name: 'Orange' },
  { id: 'purple', color: '#8B008B', light: '#9932CC', name: 'Purple' },
  { id: 'gold', color: '#B8860B', light: '#DAA520', name: 'Gold' },
  { id: 'gray', color: '#4A4A4A', light: '#6A6A6A', name: 'Gray' },
  { id: 'olive', color: '#556B2F', light: '#6B8E23', name: 'Olive' },
  { id: 'teal', color: '#008B8B', light: '#20B2AA', name: 'Teal' },
  { id: 'pink', color: '#C71585', light: '#FF69B4', name: 'Pink' },
];

// Team colors
const TEAM_COLORS = {
  1: { color: '#1E90FF', name: 'Team 1 (Blue)' },
  2: { color: '#DC143C', name: 'Team 2 (Red)' },
};

export class Lobby {
  constructor(setup, onStart, onPlayOnline) {
    this.setup = setup;
    this.onStart = onStart;
    this.onPlayOnline = onPlayOnline;
    this.mode = 'main'; // 'main', 'local-setup', 'my-games'
    this.selectedPlayers = [];
    this.playerNames = {};
    this.playerColors = {};
    this.playerAI = {};
    this.playerTeams = {};
    this.teamsEnabled = false;
    this.startingIPCs = 80;
    this.el = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'lobby';
    this.el.className = 'lobby-overlay modern';
    this._render();
    document.body.appendChild(this.el);
  }

  _render() {
    let content = '';

    switch (this.mode) {
      case 'main':
        content = this._renderMainMenu();
        break;
      case 'local-setup':
        content = this._renderLocalSetup();
        break;
      case 'my-games':
        content = this._renderMyGames();
        break;
      default:
        content = this._renderMainMenu();
    }

    this.el.innerHTML = `
      <div class="lobby-container modern">
        <div class="lobby-bg-pattern"></div>
        <div class="lobby-content-wrapper">
          ${content}
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _renderMainMenu() {
    const savedGames = this._getSavedGames();
    const hasSavedGames = savedGames.length > 0;

    return `
      <div class="lobby-main-menu">
        <div class="lobby-brand">
          <h1 class="lobby-logo">Tactical Risk</h1>
          <p class="lobby-tagline">World War II Grand Strategy</p>
          <span class="lobby-version-badge">${GAME_VERSION}</span>
        </div>

        <div class="lobby-menu-grid">
          <button class="lobby-menu-card" data-action="local-play">
            <div class="menu-card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div class="menu-card-content">
              <h3>Local Play</h3>
              <p>Play on this device with friends or AI opponents</p>
            </div>
          </button>

          <button class="lobby-menu-card online" data-action="online-play">
            <div class="menu-card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            <div class="menu-card-content">
              <h3>Play Online</h3>
              <p>Create or join multiplayer games with players worldwide</p>
            </div>
            <span class="menu-card-badge">Multiplayer</span>
          </button>
        </div>

        ${hasSavedGames ? `
          <button class="lobby-saved-games-btn" data-action="my-games">
            <span class="saved-icon">📁</span>
            <span>My Games</span>
            <span class="saved-count">${savedGames.length}</span>
          </button>
        ` : ''}
      </div>
    `;
  }

  _renderLocalSetup() {
    const factions = this.setup.risk.factions;

    // Initialize colors and AI for factions
    factions.forEach((p, i) => {
      const defaultColor = FACTION_COLORS[i % FACTION_COLORS.length];
      if (!this.playerColors[p.id]) {
        this.playerColors[p.id] = { color: p.color || defaultColor.color, lightColor: p.lightColor || defaultColor.light };
      }
      if (!this.playerAI[p.id]) this.playerAI[p.id] = 'human';
    });

    const selectedCount = this.selectedPlayers.length;
    const canStart = selectedCount >= 2;

    return `
      <div class="lobby-setup">
        <div class="setup-header">
          <button class="back-btn" data-action="back">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <div class="setup-title">
            <h2>New Local Game</h2>
            <p>Select 2-5 players to begin</p>
          </div>
        </div>

        <div class="setup-body">
          <div class="players-section">
            <div class="players-header">
              <h3 class="section-label">Players</h3>
              <label class="teams-toggle-compact">
                <input type="checkbox" id="teams-enabled" ${this.teamsEnabled ? 'checked' : ''}>
                <span class="toggle-slider small"></span>
                <span class="toggle-text">Teams</span>
              </label>
            </div>
            <div class="player-grid modern">
              ${factions.map((p, i) => this._renderPlayerCard(p, i)).join('')}
            </div>
          </div>

          <div class="options-row">
            <label class="select-option inline">
              <span class="select-label">Starting IPCs</span>
              <select id="starting-ipcs" class="modern-select compact">
                <option value="40" ${this.startingIPCs === 40 ? 'selected' : ''}>40</option>
                <option value="60" ${this.startingIPCs === 60 ? 'selected' : ''}>60</option>
                <option value="80" ${this.startingIPCs === 80 ? 'selected' : ''}>80</option>
                <option value="100" ${this.startingIPCs === 100 ? 'selected' : ''}>100</option>
                <option value="120" ${this.startingIPCs === 120 ? 'selected' : ''}>120</option>
                <option value="150" ${this.startingIPCs === 150 ? 'selected' : ''}>150</option>
              </select>
            </label>
          </div>
        </div>

        <div class="setup-footer">
          <div class="game-rules-preview">
            <span>Random Territories</span>
            <span class="dot">•</span>
            <span>Capital Conquest Victory</span>
          </div>
          <button class="start-game-btn ${canStart ? '' : 'disabled'}" data-action="start" ${canStart ? '' : 'disabled'}>
            ${canStart ? `Start Game (${selectedCount} Players)` : 'Select at least 2 players'}
          </button>
        </div>
      </div>
    `;
  }

  _renderPlayerCard(faction, index) {
    const isSelected = this.selectedPlayers.includes(faction.id);
    const currentColor = this.playerColors[faction.id];
    const currentAI = this.playerAI[faction.id] || 'human';
    const currentTeam = this.playerTeams[faction.id] || null;

    return `
      <div class="player-card modern ${isSelected ? 'selected' : ''}" data-player="${faction.id}">
        <div class="player-card-top">
          <div class="player-avatar" style="border-color: ${currentColor?.color || faction.color}">
            <img src="assets/flags/${faction.flag}" alt="${faction.name}">
          </div>
          <div class="player-select-indicator">
            ${isSelected ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
          </div>
        </div>
        <div class="player-card-body">
          <input type="text" class="player-name-input modern"
                 data-player="${faction.id}"
                 placeholder="${faction.name}"
                 value="${this.playerNames[faction.id] || (isSelected ? faction.name : '')}"
                 maxlength="15"
                 ${isSelected ? '' : 'disabled'}>
          <div class="player-options">
            <div class="color-picker" data-player="${faction.id}">
              <div class="color-swatch" style="background:${currentColor?.color || faction.color}"></div>
              <div class="color-dropdown hidden">
                ${FACTION_COLORS.map(c => `
                  <div class="color-option" data-color-id="${c.id}" style="background:${c.color}" title="${c.name}"></div>
                `).join('')}
              </div>
            </div>
            <select class="ai-select modern" data-player="${faction.id}" ${isSelected ? '' : 'disabled'}>
              ${AI_DIFFICULTIES.map(d => `
                <option value="${d.id}" ${currentAI === d.id ? 'selected' : ''}>${d.name}</option>
              `).join('')}
            </select>
          </div>
          ${this.teamsEnabled && isSelected ? `
            <div class="team-selector">
              <button class="team-btn ${currentTeam === 1 ? 'active' : ''}" data-player="${faction.id}" data-team="1" style="--team-color: ${TEAM_COLORS[1].color}">1</button>
              <button class="team-btn ${currentTeam === 2 ? 'active' : ''}" data-player="${faction.id}" data-team="2" style="--team-color: ${TEAM_COLORS[2].color}">2</button>
              <button class="team-btn neutral ${!currentTeam ? 'active' : ''}" data-player="${faction.id}" data-team="0">-</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  _renderMyGames() {
    const savedGames = this._getSavedGames();

    return `
      <div class="lobby-my-games">
        <div class="setup-header">
          <button class="back-btn" data-action="back">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <div class="setup-title">
            <h2>My Games</h2>
            <p>Continue a saved game or manage your games</p>
          </div>
        </div>

        <div class="games-list">
          ${savedGames.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <h3>No Saved Games</h3>
              <p>Start a new game to see it here</p>
            </div>
          ` : savedGames.map(game => `
            <div class="game-item" data-game-id="${game.id}">
              <div class="game-item-info">
                <div class="game-item-type ${game.type}">${game.type === 'local' ? '💻 Local' : '🌐 Online'}</div>
                <div class="game-item-details">
                  <span class="game-players">${game.playerCount} players</span>
                  <span class="game-round">Round ${game.round}</span>
                </div>
                <div class="game-item-time">${this._formatTimeAgo(game.lastPlayed)}</div>
              </div>
              <div class="game-item-players">
                ${game.playerNames.map(name => `<span class="player-tag">${name}</span>`).join('')}
              </div>
              <div class="game-item-actions">
                <button class="game-action-btn primary" data-action="load-game" data-game-id="${game.id}" data-game-type="${game.type}">
                  Continue
                </button>
                <button class="game-action-btn danger" data-action="delete-game" data-game-id="${game.id}" data-game-type="${game.type}">
                  Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _getSavedGames() {
    const games = [];
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    // Check for local auto-save
    const autoSave = localStorage.getItem('tacticalRisk_autoSave');
    const autoSaveTime = localStorage.getItem('tacticalRisk_autoSave_time');

    if (autoSave && autoSaveTime) {
      const saveTime = new Date(autoSaveTime).getTime();

      // Delete if older than 30 days
      if (saveTime < thirtyDaysAgo) {
        localStorage.removeItem('tacticalRisk_autoSave');
        localStorage.removeItem('tacticalRisk_autoSave_time');
      } else {
        try {
          const data = JSON.parse(autoSave);
          games.push({
            id: 'local_autosave',
            type: 'local',
            lastPlayed: new Date(autoSaveTime),
            round: data.round || 1,
            playerCount: data.players?.length || 0,
            playerNames: data.players?.map(p => p.name) || [],
            data: data
          });
        } catch (e) {
          console.error('Failed to parse local save:', e);
        }
      }
    }

    return games;
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
    // Main menu actions
    this.el.querySelector('[data-action="local-play"]')?.addEventListener('click', () => {
      this.mode = 'local-setup';
      this._render();
    });

    this.el.querySelector('[data-action="online-play"]')?.addEventListener('click', () => {
      if (this.onPlayOnline) {
        this.hide();
        this.onPlayOnline();
      }
    });

    this.el.querySelector('[data-action="my-games"]')?.addEventListener('click', () => {
      this.mode = 'my-games';
      this._render();
    });

    // Back button
    this.el.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.mode = 'main';
      this._render();
    });

    // Player cards
    this.el.querySelectorAll('.player-card.modern').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.player-name-input')) return;
        if (e.target.closest('.ai-select')) return;
        if (e.target.closest('.color-picker')) return;
        if (e.target.closest('.team-btn')) return;
        this._togglePlayer(card.dataset.player);
      });
    });

    // Color pickers
    this.el.querySelectorAll('.color-picker').forEach(picker => {
      const playerId = picker.dataset.player;
      const swatch = picker.querySelector('.color-swatch');
      const dropdown = picker.querySelector('.color-dropdown');

      swatch?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.querySelectorAll('.color-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown?.classList.toggle('hidden');
      });

      dropdown?.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const colorId = opt.dataset.colorId;
          const colorDef = FACTION_COLORS.find(c => c.id === colorId);
          if (colorDef) {
            this.playerColors[playerId] = { color: colorDef.color, lightColor: colorDef.light };
            this._render();
          }
        });
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      this.el.querySelectorAll('.color-dropdown').forEach(d => d.classList.add('hidden'));
    });

    // Name inputs
    this.el.querySelectorAll('.player-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.playerNames[e.target.dataset.player] = e.target.value;
      });
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    // AI selects
    this.el.querySelectorAll('.ai-select').forEach(select => {
      select.addEventListener('change', (e) => {
        this.playerAI[e.target.dataset.player] = e.target.value;
      });
      select.addEventListener('click', (e) => e.stopPropagation());
    });

    // Starting IPCs
    this.el.querySelector('#starting-ipcs')?.addEventListener('change', (e) => {
      this.startingIPCs = parseInt(e.target.value, 10);
    });

    // Teams toggle
    this.el.querySelector('#teams-enabled')?.addEventListener('change', (e) => {
      this.teamsEnabled = e.target.checked;
      if (!this.teamsEnabled) {
        this.playerTeams = {};
      }
      this._render();
    });

    // Team buttons
    this.el.querySelectorAll('.team-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = btn.dataset.player;
        const team = parseInt(btn.dataset.team, 10);
        this.playerTeams[playerId] = team === 0 ? null : team;
        this._render();
      });
    });

    // Start button
    this.el.querySelector('[data-action="start"]')?.addEventListener('click', () => {
      if (this.selectedPlayers.length >= 2) {
        this._startGame();
      }
    });

    // Load game buttons
    this.el.querySelectorAll('[data-action="load-game"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.dataset.gameId;
        const gameType = btn.dataset.gameType;
        this._loadGame(gameId, gameType);
      });
    });

    // Delete game buttons
    this.el.querySelectorAll('[data-action="delete-game"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.dataset.gameId;
        const gameType = btn.dataset.gameType;
        this._deleteGame(gameId, gameType);
      });
    });
  }

  _togglePlayer(playerId) {
    const factions = this.setup.risk.factions;
    const faction = factions.find(p => p.id === playerId);
    const idx = this.selectedPlayers.indexOf(playerId);

    if (idx >= 0) {
      this.selectedPlayers.splice(idx, 1);
      delete this.playerNames[playerId];
    } else {
      this.selectedPlayers.push(playerId);
      this.playerNames[playerId] = faction?.name || '';
    }

    this._render();
  }

  _startGame() {
    const factions = this.setup.risk.factions;

    const players = this.selectedPlayers.map(id => {
      const factionDef = factions.find(p => p.id === id);
      const customColor = this.playerColors[id];
      const aiDifficulty = this.playerAI[id] || 'human';
      const teamId = this.teamsEnabled ? (this.playerTeams[id] || null) : null;
      return {
        ...factionDef,
        name: this.playerNames[id]?.trim() || factionDef.name,
        color: customColor?.color || factionDef.color,
        lightColor: customColor?.lightColor || factionDef.lightColor,
        isAI: aiDifficulty !== 'human',
        aiDifficulty: aiDifficulty,
        teamId: teamId,
      };
    });

    const options = {
      alliancesEnabled: false,
      teamsEnabled: this.teamsEnabled,
      startingIPCs: this.startingIPCs,
    };

    this.hide();
    this.onStart('risk', players, options);
  }

  _loadGame(gameId, gameType) {
    if (gameType === 'local' && gameId === 'local_autosave') {
      const data = localStorage.getItem('tacticalRisk_autoSave');
      if (data) {
        try {
          const saveData = JSON.parse(data);
          this.hide();
          this.onStart(null, null, { loadFromSave: saveData });
        } catch (err) {
          console.error('Failed to load save:', err);
          alert('Failed to load saved game.');
        }
      }
    }
  }

  _deleteGame(gameId, gameType) {
    if (!confirm('Are you sure you want to delete this game?')) return;

    if (gameType === 'local' && gameId === 'local_autosave') {
      localStorage.removeItem('tacticalRisk_autoSave');
      localStorage.removeItem('tacticalRisk_autoSave_time');
      this._render();
    }
  }

  show() {
    this.mode = 'main';
    this._render();
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  destroy() {
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
