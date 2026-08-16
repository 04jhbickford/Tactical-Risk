// Top bar HUD: game title, current turn info, player legend

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_ORDER, TURN_PHASE_NAMES } from '../state/gameState.js';
import { possessivePhrase } from '../utils/possessive.js';
import { isMobileShell, formatMobilePhaseLabel, formatMobilePlayerMeta } from './mobileShell.js';

export class HUD {
  constructor() {
    this.gameState = null;
    this.onNextPhase = null;
    this.onRulesToggle = null;
    this.onExitToLobby = null;
    this.menuOpen = false;
    this.el = document.getElementById('hud');
    this._render();

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.menuOpen && !e.target.closest('.hud-menu-container')) {
        this.menuOpen = false;
        this._updateMenuState();
      }
    });
  }

  setOnRulesToggle(callback) {
    this.onRulesToggle = callback;
  }

  setOnExitToLobby(callback) {
    this.onExitToLobby = callback;
  }

  setGameState(gameState) {
    this.gameState = gameState;
    gameState.subscribe(() => this._render());
    this._render();
  }

  setNextPhaseCallback(callback) {
    this.onNextPhase = callback;
  }

  _render() {
    if (isMobileShell()) {
      this._renderMobile();
      return;
    }

    // Hamburger menu button
    let html = `
      <div class="hud-menu-container">
        <button class="hud-menu-btn" data-action="toggle-menu" title="Menu">
          <span class="hud-menu-icon">☰</span>
        </button>
        <div class="hud-menu-dropdown ${this.menuOpen ? 'open' : ''}">
          <button class="hud-menu-item" data-action="rules">
            <span class="hud-menu-item-icon">📖</span>
            <span>Game Rules</span>
          </button>
          <button class="hud-menu-item" data-action="exit-lobby">
            <span class="hud-menu-item-icon">💾</span>
            <span>Save & Exit</span>
          </button>
        </div>
      </div>
    `;

    html += `<span class="hud-title">Tactical Risk</span>`;

    if (this.gameState && this.gameState.phase !== GAME_PHASES.LOBBY) {
      const phase = this.gameState.phase;
      const player = this.gameState.currentPlayer;

      if (player) {
        // Current player indicator - prominent display
        const flagSrc = player.flag ? `assets/flags/${player.flag}` : null;
        html += `
          <div class="hud-current-turn">
            ${flagSrc ? `<img src="${flagSrc}" class="hud-flag-large" alt="${player.name}">` : ''}
            <div class="hud-turn-info">
              <span class="hud-player-name" style="color: ${player.color}">${possessivePhrase(player.name, 'Turn')}</span>
              <span class="hud-phase-name">${this._getPhaseName(phase)}</span>
            </div>
          </div>`;

        // Turn phase progress (during PLAYING)
        if (phase === GAME_PHASES.PLAYING) {
          const currentIndex = TURN_PHASE_ORDER.indexOf(this.gameState.turnPhase);
          html += `
            <div class="hud-phase-progress">
              <span class="hud-round-badge">Round ${this.gameState.round}</span>
              <div class="phase-dots">
                ${TURN_PHASE_ORDER.map((tp, i) => {
                  const isActive = i === currentIndex;
                  const isPast = i < currentIndex;
                  const cls = isActive ? 'active' : isPast ? 'past' : '';
                  return `<span class="phase-dot ${cls}" title="${TURN_PHASE_NAMES[tp]}"></span>`;
                }).join('')}
              </div>
            </div>`;
        }

        // Turn order display
        html += `<div class="hud-turn-order">`;
        const currentIdx = this.gameState.currentPlayerIndex;
        for (let i = 0; i < this.gameState.players.length; i++) {
          const p = this.gameState.players[i];
          const isCurrent = i === currentIdx;
          const isPast = i < currentIdx;
          let cls = isCurrent ? 'current' : isPast ? 'past' : '';
          if (p.surrendered) cls += ' out';
          const flagSrc = p.flag ? `assets/flags/${p.flag}` : null;

          if (i > 0) {
            html += `<span class="turn-order-arrow">→</span>`;
          }

          html += `
            <div class="turn-order-item ${cls}" ${p.surrendered ? 'title="Surrendered"' : ''}>
              ${flagSrc ? `<img src="${flagSrc}" class="turn-order-flag" alt="${p.name}">` : `<span style="color:${p.color}">●</span>`}
            </div>
          `;
        }
        html += `</div>`;
      }
    }

    // Player legend - compact, shows turn order only (detailed stats in Players tab)
    html += `<div class="hud-legend">`;
    if (this.gameState && this.gameState.players.length > 0) {
      for (const p of this.gameState.players) {
        const isActive = this.gameState.currentPlayer?.id === p.id;
        let itemClass = isActive ? ' active' : '';
        if (p.surrendered) itemClass += ' out';
        const flagSrc = p.flag ? `assets/flags/${p.flag}` : null;

        html += `
          <span class="legend-item${itemClass}" ${p.surrendered ? 'title="Surrendered"' : ''}>
            ${flagSrc ? `<img src="${flagSrc}" class="legend-flag" alt="${p.name}">` : `<span class="legend-dot" style="background:${p.color}"></span>`}
            <span class="legend-name">${p.name}</span>${p.surrendered ? '<span class="legend-out">OUT</span>' : ''}
          </span>`;
      }
    }
    html += `</div>`;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  // Phone top bar: {color} {faction} · {3/7 PHASE}. Phase identity stays
  // ≥11pt — do not copy the tablet 9px / hidden-dots path. Wordmark, full
  // player list (IPC + visible OUT), and settings sit behind ⋯.
  _renderMobile() {
    const player = this.gameState?.currentPlayer;
    const inGame = this.gameState && this.gameState.phase !== GAME_PHASES.LOBBY && player;
    const phaseName = inGame
      ? formatMobilePhaseLabel(this.gameState.phase, this.gameState.turnPhase)
      : '';
    const flagSrc = inGame && player.flag ? `assets/flags/${player.flag}` : null;

    let identity = `<span class="hud-title">Tactical Risk</span>`;
    if (inGame) {
      identity = `
        <div class="hud-mobile-identity">
          ${flagSrc
            ? `<img src="${flagSrc}" class="hud-mobile-flag" alt="">`
            : `<span class="hud-mobile-swatch" style="background:${player.color}"></span>`}
          <span class="hud-mobile-faction" style="color:${player.color}">${player.name}</span>
          <span class="hud-mobile-sep" aria-hidden="true">·</span>
          <span class="hud-mobile-phase">${phaseName}</span>
        </div>`;
    }

    let playersHtml = '';
    if (this.gameState?.players?.length) {
      playersHtml = `<div class="hud-mobile-players">`;
      for (const p of this.gameState.players) {
        const pFlag = p.flag ? `assets/flags/${p.flag}` : null;
        const current = this.gameState.currentPlayer?.id === p.id;
        const ipcs = this.gameState.getIPCs?.(p.id);
        const meta = formatMobilePlayerMeta({ ipcs, surrendered: p.surrendered });
        playersHtml += `
          <div class="hud-mobile-player${current ? ' current' : ''}${p.surrendered ? ' out' : ''}">
            ${pFlag ? `<img src="${pFlag}" alt="">` : `<span class="hud-mobile-swatch" style="background:${p.color}"></span>`}
            <span class="hud-mobile-player-name">${p.name}</span>
            ${meta ? `<span class="hud-mobile-player-meta">${meta}</span>` : ''}
          </div>`;
      }
      playersHtml += `</div>`;
    }

    this.el.innerHTML = `
      ${identity}
      <div class="hud-menu-container hud-mobile-overflow">
        <button class="hud-menu-btn" data-action="toggle-menu" title="Menu" aria-label="Menu">
          <span class="hud-menu-icon">⋯</span>
        </button>
        <div class="hud-menu-dropdown ${this.menuOpen ? 'open' : ''}">
          <div class="hud-mobile-wordmark">Tactical Risk</div>
          ${playersHtml}
          <button class="hud-menu-item" data-action="rules">
            <span class="hud-menu-item-icon">📖</span>
            <span>Game Rules</span>
          </button>
          <button class="hud-menu-item" data-action="exit-lobby">
            <span class="hud-menu-item-icon">💾</span>
            <span>Save & Exit</span>
          </button>
        </div>
      </div>
    `;
    this._bindEvents();
  }

  _updateMenuState() {
    const dropdown = this.el.querySelector('.hud-menu-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('open', this.menuOpen);
    }
  }

  _bindEvents() {
    // Menu toggle button
    const menuBtn = this.el.querySelector('[data-action="toggle-menu"]');
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.menuOpen = !this.menuOpen;
      this._updateMenuState();
    });

    // Rules menu item
    const rulesItem = this.el.querySelector('.hud-menu-item[data-action="rules"]');
    rulesItem?.addEventListener('click', () => {
      this.menuOpen = false;
      this._updateMenuState();
      if (this.onRulesToggle) {
        this.onRulesToggle();
      }
    });

    // Exit to lobby menu item
    const exitItem = this.el.querySelector('.hud-menu-item[data-action="exit-lobby"]');
    exitItem?.addEventListener('click', () => {
      this.menuOpen = false;
      this._updateMenuState();
      if (this.onExitToLobby) {
        // In multiplayer, game is auto-saved; in single player, progress is lost
        const isMultiplayer = this.gameState?.isMultiplayer;
        const message = isMultiplayer
          ? 'Exit to lobby? Your game is saved and you can resume later.'
          : 'Exit to lobby? Your game progress will be lost.';
        if (confirm(message)) {
          this.onExitToLobby();
        }
      }
    });
  }

  _getPhaseName(phase) {
    if (phase === GAME_PHASES.CAPITAL_PLACEMENT) return 'Place Capital';
    if (phase === GAME_PHASES.UNIT_PLACEMENT) return 'Initial Deployment';
    if (phase === GAME_PHASES.PLAYING) {
      return TURN_PHASE_NAMES[this.gameState.turnPhase] || 'Playing';
    }
    return 'Setup';
  }
}
