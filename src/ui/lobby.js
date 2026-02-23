// Lobby UI for player selection - Risk Style only

export const GAME_VERSION = 'V1.63';

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
  constructor(setup, onStart) {
    this.setup = setup;
    this.onStart = onStart;
    this.selectedPlayers = [];
    this.playerNames = {};
    this.playerColors = {};
    this.playerAI = {};
    this.playerTeams = {}; // Track team assignments: playerId -> 1, 2, or null (no team)
    this.teamsEnabled = false;
    this.startingIPCs = 80;
    this.el = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'lobby';
    this.el.className = 'lobby-overlay';
    this._render();
    document.body.appendChild(this.el);
  }

  _render() {
    const factions = this.setup.risk.factions;

    // Check for auto-save
    const hasAutoSave = localStorage.getItem('tacticalRisk_autoSave') !== null;
    const autoSaveTime = localStorage.getItem('tacticalRisk_autoSave_time');
    const autoSaveDisplay = autoSaveTime ? new Date(autoSaveTime).toLocaleString() : '';

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

    let html = `
      <div class="lobby-content unified">
        <div class="lobby-header-main">
          <h1 class="lobby-title">Tactical Risk</h1>
          <span class="lobby-version">${GAME_VERSION}</span>
        </div>
        <p class="lobby-subtitle">World War II Strategy Game</p>

        ${hasAutoSave ? `
          <button class="continue-game-btn" data-action="continue">
            <span class="continue-icon">&#9654;</span>
            <span class="continue-text">
              <span class="continue-title">Continue Game</span>
              <span class="continue-time">${autoSaveDisplay}</span>
            </span>
          </button>
        ` : ''}

        <div class="lobby-section">
          <h2 class="section-title">Select Players</h2>
          <p class="lobby-hint">Click to add or remove players (2-5)</p>

          <div class="player-grid">
            ${factions.map((p, i) => {
              const isSelected = this.selectedPlayers.includes(p.id);
              const currentColor = this.playerColors[p.id];
              const currentAI = this.playerAI[p.id] || 'human';
              const currentTeam = this.playerTeams[p.id] || null;
              const teamBorderStyle = this.teamsEnabled && currentTeam
                ? `border-color: ${TEAM_COLORS[currentTeam].color}; border-width: 3px;`
                : '';
              return `
              <div class="player-card ${isSelected ? 'selected' : ''} ${currentTeam ? `team-${currentTeam}` : ''}" data-player="${p.id}" style="${teamBorderStyle}">
                <div class="player-card-header">
                  <img src="assets/flags/${p.flag}" alt="${p.name}" class="player-flag">
                  <div class="player-check-indicator">${isSelected ? '&#10003;' : ''}</div>
                </div>
                <input type="text" class="player-name-input"
                       data-player="${p.id}"
                       placeholder="${p.name}"
                       value="${this.playerNames[p.id] || (isSelected ? p.name : '')}"
                       maxlength="15"
                       ${isSelected ? '' : 'disabled'}>
                <div class="player-controls-row">
                  <div class="player-color-select" data-player="${p.id}">
                    <div class="color-current" style="background:${currentColor?.color || p.color}" data-color="${FACTION_COLORS[i % FACTION_COLORS.length].id}"></div>
                    <div class="color-dropdown hidden">
                      ${FACTION_COLORS.map(c => `
                        <div class="color-option" data-color-id="${c.id}" style="background:${c.color}" title="${c.name}"></div>
                      `).join('')}
                    </div>
                  </div>
                  <select class="player-ai-select" data-player="${p.id}" ${isSelected ? '' : 'disabled'}>
                    ${AI_DIFFICULTIES.map(d => `
                      <option value="${d.id}" ${currentAI === d.id ? 'selected' : ''}>${d.name}</option>
                    `).join('')}
                  </select>
                </div>
                ${this.teamsEnabled && isSelected ? `
                  <div class="player-team-row">
                    <button class="team-btn ${currentTeam === 1 ? 'active' : ''}" data-player="${p.id}" data-team="1" style="background: ${TEAM_COLORS[1].color}">Team 1</button>
                    <button class="team-btn ${currentTeam === 2 ? 'active' : ''}" data-player="${p.id}" data-team="2" style="background: ${TEAM_COLORS[2].color}">Team 2</button>
                    <button class="team-btn no-team ${!currentTeam ? 'active' : ''}" data-player="${p.id}" data-team="0">No Team</button>
                  </div>
                ` : ''}
              </div>
            `}).join('')}
          </div>
        </div>

        <div class="lobby-options">
          <div class="option-item">
            <label class="option-checkbox">
              <input type="checkbox" id="teams-enabled" ${this.teamsEnabled ? 'checked' : ''}>
              <span class="option-label">Team Mode</span>
            </label>
            <span class="option-hint">Allied players share victory</span>
          </div>
          <div class="option-item">
            <span class="option-label">Starting IPCs:</span>
            <select id="starting-ipcs" class="starting-ipcs-select">
              <option value="40" ${this.startingIPCs === 40 ? 'selected' : ''}>40 IPCs</option>
              <option value="60" ${this.startingIPCs === 60 ? 'selected' : ''}>60 IPCs</option>
              <option value="80" ${this.startingIPCs === 80 ? 'selected' : ''}>80 IPCs (Default)</option>
              <option value="100" ${this.startingIPCs === 100 ? 'selected' : ''}>100 IPCs</option>
              <option value="120" ${this.startingIPCs === 120 ? 'selected' : ''}>120 IPCs</option>
              <option value="150" ${this.startingIPCs === 150 ? 'selected' : ''}>150 IPCs</option>
            </select>
          </div>
        </div>

        <div class="lobby-footer">
          <div class="lobby-info">
            <span class="info-item">Random Territories</span>
            <span class="info-divider">|</span>
            <span class="info-item">Capital Conquest Victory</span>
          </div>
          <button class="lobby-start-btn ${canStart ? '' : 'disabled'}" ${canStart ? '' : 'disabled'}>
            ${canStart ? `Start Game with ${selectedCount} Players` : 'Select at least 2 players'}
          </button>
        </div>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindEvents(factions);
  }

  _bindEvents(factions) {
    // Player cards - click to toggle
    this.el.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('player-name-input')) return;
        if (e.target.classList.contains('player-ai-select')) return;
        if (e.target.closest('.player-color-select')) return;
        this._togglePlayer(card.dataset.player);
      });
    });

    // Color selectors
    this.el.querySelectorAll('.player-color-select').forEach(colorSelect => {
      const playerId = colorSelect.dataset.player;
      const currentEl = colorSelect.querySelector('.color-current');
      const dropdown = colorSelect.querySelector('.color-dropdown');

      currentEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.querySelectorAll('.color-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });

      dropdown.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const colorId = opt.dataset.colorId;
          const colorDef = FACTION_COLORS.find(c => c.id === colorId);
          if (colorDef) {
            this.playerColors[playerId] = { color: colorDef.color, lightColor: colorDef.light };
            currentEl.style.background = colorDef.color;
            dropdown.classList.add('hidden');
          }
        });
      });
    });

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

    // AI select
    this.el.querySelectorAll('.player-ai-select').forEach(select => {
      select.addEventListener('change', (e) => {
        this.playerAI[e.target.dataset.player] = e.target.value;
      });
      select.addEventListener('click', (e) => e.stopPropagation());
    });

    // Starting IPCs selector
    this.el.querySelector('.starting-ipcs-select')?.addEventListener('change', (e) => {
      this.startingIPCs = parseInt(e.target.value, 10);
    });

    // Teams enabled toggle
    this.el.querySelector('#teams-enabled')?.addEventListener('change', (e) => {
      this.teamsEnabled = e.target.checked;
      // Clear team assignments when toggling off
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

    // Continue game button
    this.el.querySelector('.continue-game-btn')?.addEventListener('click', () => {
      this._continueGame();
    });

    // Start button
    this.el.querySelector('.lobby-start-btn').addEventListener('click', () => {
      if (this.selectedPlayers.length >= 2) {
        this._startGame();
      }
    });
  }

  _continueGame() {
    const data = localStorage.getItem('tacticalRisk_autoSave');
    if (!data) return;

    try {
      const saveData = JSON.parse(data);
      this.hide();
      this.onStart(null, null, { loadFromSave: saveData });
    } catch (err) {
      console.error('Failed to load auto-save:', err);
      alert('Failed to load saved game.');
    }
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

  show() {
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
