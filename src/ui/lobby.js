// Lobby UI for game mode and player selection

export const GAME_VERSION = 'V0.85';

// AI Difficulty levels
const AI_DIFFICULTIES = [
  { id: 'human', name: 'Human', desc: 'Local player' },
  { id: 'easy', name: 'Easy AI', desc: 'Defensive, makes mistakes' },
  { id: 'medium', name: 'Medium AI', desc: 'Balanced strategy' },
  { id: 'hard', name: 'Hard AI', desc: 'Aggressive, optimized' },
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

export class Lobby {
  constructor(setup, onStart) {
    this.setup = setup;
    this.onStart = onStart;
    this.selectedMode = null;
    this.selectedPlayers = [];
    this.playerNames = {};
    this.playerColors = {}; // Track selected colors per player
    this.playerAI = {}; // Track AI difficulty per player ('human', 'easy', 'medium', 'hard')
    this.alliancesEnabled = false;
    this.startingIPCs = 80; // Default starting IPCs for Risk mode
    this.el = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'lobby';
    this.el.className = 'lobby-overlay';
    this._renderModeSelect();
    document.body.appendChild(this.el);
  }

  _renderModeSelect() {
    const modes = this.setup.gameModes;

    // Check for auto-save
    const hasAutoSave = localStorage.getItem('tacticalRisk_autoSave') !== null;
    const autoSaveTime = localStorage.getItem('tacticalRisk_autoSave_time');
    const autoSaveDisplay = autoSaveTime ? new Date(autoSaveTime).toLocaleString() : '';

    // Default to risk mode, get factions
    if (!this.selectedMode) this.selectedMode = 'risk';
    const isClassic = this.selectedMode === 'classic';
    const factions = isClassic ? this.setup.classic.factions : this.setup.risk.factions;
    const alliances = this.setup.alliances;

    // Initialize colors and AI for factions if not already
    factions.forEach((p, i) => {
      const defaultColor = FACTION_COLORS[i % FACTION_COLORS.length];
      if (!this.playerColors[p.id]) {
        this.playerColors[p.id] = { color: p.color || defaultColor.color, lightColor: p.lightColor || defaultColor.light };
      }
      if (!this.playerAI[p.id]) this.playerAI[p.id] = 'human';
    });

    let html = `
      <div class="lobby-content unified">
        <div class="lobby-header-main">
          <h1 class="lobby-title">Tactical Risk</h1>
          <span class="lobby-version">${GAME_VERSION}</span>
        </div>
        <p class="lobby-subtitle">World War II Strategy</p>

        ${hasAutoSave ? `
          <div class="lobby-section continue-section">
            <button class="continue-game-btn" data-action="continue">
              <span class="continue-icon">▶</span>
              <span class="continue-text">
                <span class="continue-title">Continue Game</span>
                <span class="continue-time">Saved: ${autoSaveDisplay}</span>
              </span>
            </button>
          </div>
        ` : ''}

        <div class="lobby-section">
          <h2>New Game</h2>

          <div class="mode-select-row">
            <label class="mode-label">Game Mode:</label>
            <div class="mode-tabs">
              ${modes.map(mode => `
                <button class="mode-tab ${mode.id === this.selectedMode ? 'selected' : ''} ${mode.enabled ? '' : 'disabled'}"
                        data-mode="${mode.id}" ${mode.enabled ? '' : 'disabled'}>
                  ${mode.name}
                  ${!mode.enabled ? '<span class="mode-soon">Soon</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="faction-section">
            <h3>${isClassic ? 'Factions' : 'Select Factions (2-5 players)'}</h3>
            ${!isClassic ? '<p class="lobby-hint">Click factions to add/remove players</p>' : ''}

            <div class="player-grid ${isClassic ? 'classic' : ''}">
              ${factions.map((p, i) => {
                const isSelected = isClassic || this.selectedPlayers.includes(p.id);
                const currentColor = this.playerColors[p.id];
                const currentAI = this.playerAI[p.id] || 'human';
                return `
                <div class="player-card ${isSelected ? 'selected' : ''}" data-player="${p.id}" data-alliance="${p.alliance}">
                  <div class="alliance-badge ${p.alliance.toLowerCase()}">${p.alliance}</div>
                  <img src="assets/flags/${p.flag}" alt="${p.name}" class="player-flag">
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
                  ${!isClassic ? '<div class="player-check"></div>' : ''}
                  ${isClassic && p.startingPUs ? `<div class="player-pus">${p.startingPUs} PUs</div>` : ''}
                </div>
              `}).join('')}
            </div>
          </div>

          ${!isClassic ? `
            <div class="lobby-options">
              <div class="option-item">
                <label class="option-label">Starting IPCs</label>
                <select id="startingIPCsSelect" class="starting-ipcs-select">
                  <option value="30" ${this.startingIPCs === 30 ? 'selected' : ''}>30 IPCs</option>
                  <option value="50" ${this.startingIPCs === 50 ? 'selected' : ''}>50 IPCs</option>
                  <option value="80" ${this.startingIPCs === 80 || !this.startingIPCs ? 'selected' : ''}>80 IPCs</option>
                  <option value="100" ${this.startingIPCs === 100 ? 'selected' : ''}>100 IPCs</option>
                  <option value="150" ${this.startingIPCs === 150 ? 'selected' : ''}>150 IPCs</option>
                </select>
              </div>
              <div class="option-info">
                <span>Random territories</span>
                <span>|</span>
                <span>1 infantry per territory</span>
              </div>
            </div>
          ` : `
            <div class="lobby-alliances-info">
              <div class="alliance-info axis">
                <span class="alliance-label">Axis:</span>
                <span class="alliance-members">${alliances.Axis.members.join(', ')}</span>
              </div>
              <div class="alliance-info allies">
                <span class="alliance-label">Allies:</span>
                <span class="alliance-members">${alliances.Allies.members.join(', ')}</span>
              </div>
            </div>
          `}
        </div>

        <button class="lobby-start-btn" ${this._canStart(isClassic) ? '' : 'disabled'}>
          ${this._getStartButtonText(isClassic)}
        </button>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindUnifiedEvents(isClassic, factions);
  }

  _canStart(isClassic) {
    return isClassic || this.selectedPlayers.length >= 2;
  }

  _getStartButtonText(isClassic) {
    if (isClassic) return 'Start Game';
    const count = this.selectedPlayers.length;
    if (count < 2) return 'Select at least 2 factions';
    return `Start Game (${count} factions)`;
  }

  _bindUnifiedEvents(isClassic, factions) {
    // Mode tabs
    this.el.querySelectorAll('.mode-tab:not(.disabled)').forEach(tab => {
      tab.addEventListener('click', () => {
        const newMode = tab.dataset.mode;
        if (newMode !== this.selectedMode) {
          this.selectedMode = newMode;
          this.selectedPlayers = [];
          // For classic mode, auto-select all factions
          if (newMode === 'classic') {
            const classicFactions = this.setup.classic.factions;
            this.selectedPlayers = classicFactions.map(p => p.id);
            classicFactions.forEach(p => {
              this.playerNames[p.id] = p.name;
              this.playerColors[p.id] = { color: p.color, lightColor: p.lightColor };
            });
          }
          this._renderModeSelect();
        }
      });
    });

    // Player cards (for Risk mode selection)
    if (!isClassic) {
      this.el.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.classList.contains('player-name-input')) return;
          if (e.target.classList.contains('player-ai-select')) return;
          if (e.target.closest('.player-color-select')) return;
          this._togglePlayer(card.dataset.player);
        });
      });

      // Starting IPCs selector
      this.el.querySelector('#startingIPCsSelect')?.addEventListener('change', (e) => {
        this.startingIPCs = parseInt(e.target.value, 10);
      });

      this.alliancesEnabled = false;
    } else {
      // Classic mode: all factions are selected
      this.selectedPlayers = factions.map(p => p.id);
      factions.forEach(p => {
        if (!this.playerNames[p.id]) this.playerNames[p.id] = p.name;
      });
      this.alliancesEnabled = true;
    }

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

    // Continue game button
    this.el.querySelector('.continue-game-btn')?.addEventListener('click', () => {
      this._continueGame();
    });

    // Start button
    this.el.querySelector('.lobby-start-btn').addEventListener('click', () => {
      if (this._canStart(isClassic)) {
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
      // Pass null for mode/players to signal loading from save
      this.onStart(null, null, { loadFromSave: saveData });
    } catch (err) {
      console.error('Failed to load auto-save:', err);
      alert('Failed to load saved game. Starting new game.');
    }
  }

  _togglePlayer(playerId) {
    const card = this.el.querySelector(`.player-card[data-player="${playerId}"]`);
    const input = card.querySelector('.player-name-input');
    const aiSelect = card.querySelector('.player-ai-select');
    const factions = this.setup.risk.factions;
    const faction = factions.find(p => p.id === playerId);
    const idx = this.selectedPlayers.indexOf(playerId);

    if (idx >= 0) {
      this.selectedPlayers.splice(idx, 1);
      card.classList.remove('selected');
      input.disabled = true;
      input.value = '';
      if (aiSelect) aiSelect.disabled = true;
    } else {
      this.selectedPlayers.push(playerId);
      card.classList.add('selected');
      input.disabled = false;
      input.value = faction?.name || '';
      this.playerNames[playerId] = faction?.name || '';
      if (aiSelect) aiSelect.disabled = false;
      input.focus();
    }

    this._updateStartButton();
  }

  _updateStartButton() {
    const btn = this.el.querySelector('.lobby-start-btn');
    const isClassic = this.selectedMode === 'classic';
    const count = this.selectedPlayers.length;

    btn.disabled = !this._canStart(isClassic);
    btn.textContent = this._getStartButtonText(isClassic);
  }

  _startGame() {
    const isClassic = this.selectedMode === 'classic';
    const factionSource = isClassic ? this.setup.classic.factions : this.setup.risk.factions;

    const players = this.selectedPlayers.map(id => {
      const factionDef = factionSource.find(p => p.id === id);
      const customColor = this.playerColors[id];
      const aiDifficulty = this.playerAI[id] || 'human';
      return {
        ...factionDef,
        name: this.playerNames[id]?.trim() || factionDef.name,
        // Use custom color if selected, otherwise use faction default
        color: customColor?.color || factionDef.color,
        lightColor: customColor?.lightColor || factionDef.lightColor,
        // AI settings
        isAI: aiDifficulty !== 'human',
        aiDifficulty: aiDifficulty,
      };
    });

    // Pass game options
    const options = {
      // Classic mode: always alliances, Risk mode: always free-for-all
      alliancesEnabled: isClassic,
      // Starting IPCs for Risk mode
      startingIPCs: !isClassic ? this.startingIPCs : undefined,
    };

    this.hide();
    this.onStart(this.selectedMode, players, options);
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
