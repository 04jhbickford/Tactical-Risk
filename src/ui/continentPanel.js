// Sidebar panel showing continent bonuses and player stats

export class ContinentPanel {
  constructor(continents) {
    this.continents = continents;
    this.gameState = null;
    this.el = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'continent-panel';
    this.el.className = 'sidebar-info-panel hidden';

    // Append to sidebar instead of body
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.appendChild(this.el);
    } else {
      document.body.appendChild(this.el);
    }
  }

  setGameState(gameState) {
    this.gameState = gameState;
    gameState.subscribe(() => this._render());
    this._render();
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  _render() {
    if (!this.gameState) {
      this.el.innerHTML = '';
      return;
    }

    let html = '';

    // Player Stats Section
    html += this._renderPlayerStats();

    // Continent Bonuses Section
    html += this._renderContinentBonuses();

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _renderPlayerStats() {
    const players = this.gameState.players || [];

    let html = `
      <div class="info-section player-stats-section">
        <div class="info-section-header" data-toggle="player-stats">
          <span class="info-section-title">Player Stats</span>
          <span class="info-section-toggle">▼</span>
        </div>
        <div class="info-section-content" id="player-stats-content">
          <div class="player-stats-grid">
    `;

    for (const player of players) {
      const ipcs = this.gameState.getIPCs(player.id);
      const territories = this.gameState.getPlayerTerritories(player.id).length;
      const units = this._countPlayerUnits(player.id);
      const continentsControlled = this._getControlledContinents(player.id);
      const riskCards = this.gameState.riskCards?.[player.id]?.length || 0;
      const techs = this.gameState.playerTechs?.[player.id] || [];
      const isCurrentPlayer = this.gameState.currentPlayer?.id === player.id;
      const isEliminated = territories === 0;

      html += `
        <div class="player-stat-row ${isCurrentPlayer ? 'current' : ''} ${isEliminated ? 'eliminated' : ''}"
             style="border-left: 4px solid ${player.color}">
          <div class="ps-name">
            ${player.flag ? `<img src="assets/flags/${player.flag}" class="ps-flag" alt="">` : ''}
            <span>${player.name}</span>
            ${isEliminated ? '<span class="ps-eliminated">OUT</span>' : ''}
          </div>
          <div class="ps-stats">
            <span class="ps-stat" title="IPCs"><span class="ps-icon">💰</span>${ipcs}</span>
            <span class="ps-stat" title="Territories"><span class="ps-icon">🗺️</span>${territories}</span>
            <span class="ps-stat" title="Units"><span class="ps-icon">⚔️</span>${units}</span>
            ${this.gameState.gameMode === 'risk' ? `<span class="ps-stat" title="Risk Cards"><span class="ps-icon">🃏</span>${riskCards}</span>` : ''}
          </div>
          ${continentsControlled.length > 0 ? `
            <div class="ps-continents" title="Controlled Continents">
              ${continentsControlled.map(c => `<span class="ps-continent" style="background:${c.color}">${c.name.substring(0, 2)}</span>`).join('')}
            </div>
          ` : ''}
          ${techs.length > 0 ? `
            <div class="ps-techs" title="Technologies">
              ${techs.map(t => `<span class="ps-tech">${this._getTechIcon(t)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  _renderContinentBonuses() {
    let html = `
      <div class="info-section continent-bonuses-section">
        <div class="info-section-header" data-toggle="continent-bonuses">
          <span class="info-section-title">Continent Bonuses</span>
          <span class="info-section-toggle">▼</span>
        </div>
        <div class="info-section-content" id="continent-bonuses-content">
          <div class="continent-list">
    `;

    for (const continent of this.continents) {
      const controller = this._getController(continent);
      const controllerName = controller ? controller.name : 'Contested';
      const controllerColor = controller ? controller.color : '#555';
      const territoryCount = continent.territories.length;

      html += `
        <div class="continent-row">
          <div class="cr-name">
            <span class="cr-color" style="background:${continent.color}"></span>
            <span>${continent.name}</span>
          </div>
          <div class="cr-bonus">+${continent.bonus}</div>
          <div class="cr-controller" style="color:${controllerColor}">
            ${controller ? controllerName : '<span class="contested">—</span>'}
          </div>
        </div>
      `;
    }

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  _bindEvents() {
    // Toggle sections
    this.el.querySelectorAll('.info-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.info-section');
        section.classList.toggle('collapsed');
        const toggle = header.querySelector('.info-section-toggle');
        if (toggle) {
          toggle.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
        }
      });
    });
  }

  _countPlayerUnits(playerId) {
    let count = 0;
    const territories = this.gameState.territories || {};
    for (const name in territories) {
      const terr = territories[name];
      if (terr.owner === playerId && terr.units) {
        for (const unitType in terr.units) {
          count += terr.units[unitType] || 0;
        }
      }
    }
    return count;
  }

  _getControlledContinents(playerId) {
    const controlled = [];
    for (const continent of this.continents) {
      const controller = this._getController(continent);
      if (controller && controller.id === playerId) {
        controlled.push(continent);
      }
    }
    return controlled;
  }

  _getController(continent) {
    if (!this.gameState) return null;

    // Check if any single player controls all territories
    let controller = null;
    for (const territoryName of continent.territories) {
      const owner = this.gameState.getOwner(territoryName);
      if (!owner) return null; // Unowned territory
      if (!controller) {
        controller = owner;
      } else if (controller !== owner) {
        return null; // Different owners
      }
    }

    if (controller) {
      const player = this.gameState.players.find(p => p.id === controller);
      return player || null;
    }
    return null;
  }

  _getTechIcon(tech) {
    const icons = {
      jets: '✈️',
      rockets: '🚀',
      superSubs: '🐋',
      longRangeAir: '🦅',
      heavyBombers: '💣',
      industrialTech: '🏭',
    };
    return icons[tech] || '🔬';
  }
}
