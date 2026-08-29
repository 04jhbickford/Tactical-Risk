// Top bar HUD: game title, current turn info, player legend

import { GAME_PHASES, TURN_PHASES, TURN_PHASE_ORDER, TURN_PHASE_NAMES } from '../state/gameState.js';
import { possessivePhrase } from '../utils/possessive.js';
import { isMobileShell, formatMobilePhaseLabel, formatMobilePlayerMeta, readableFactionTextColor } from './mobileShell.js';
import { resolveHudClarity } from './hudClarity.js';
import { isBoardSkin, isNarrowBoardChrome } from './boardSkin.js';
import { setBoardAudioMuted, isBoardAudioMuted, unlockBoardAudio } from '../audio/boardAudio.js';

export class HUD {
  constructor() {
    this.gameState = null;
    this.onNextPhase = null;
    this.onRulesToggle = null;
    this.onExitToLobby = null;
    this.menuOpen = false;
    this.menuTab = null;
    this.menuTabProvider = null;
    this.onMenuOpen = null;
    this.el = document.getElementById('hud');
    this.clarityEl = document.getElementById('hud-clarity');
    if (isBoardSkin()) {
      if (this.clarityEl) {
        this.clarityEl.hidden = true;
        this.clarityEl.innerHTML = '';
        this.clarityEl.setAttribute('hidden', '');
        this.clarityEl.style.display = 'none';
      }
    } else if (!this.clarityEl && this.el?.parentNode) {
      this.clarityEl = document.createElement('div');
      this.clarityEl.id = 'hud-clarity';
      this.el.after(this.clarityEl);
    }
    this.actionLog = null;
    this.lastClick = null;
    this.tableEvent = '';
    this.clarityCtx = {
      localUserId: null,
      gameCode: null,
      hostPresence: null,
      hostName: null,
      isHost: false,
      justResumed: false,
    };
    this._render();

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.menuOpen && !e.target.closest('.hud-menu-container') && !e.target.closest('.phone-menu-sheet')) {
        this.menuOpen = false;
        this.menuTab = null;
        this._updateMenuState();
      }
    });
  }

  setMenuTabProvider(fn) {
    this.menuTabProvider = fn;
  }

  setOnMenuOpen(fn) {
    this.onMenuOpen = fn;
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

  setActionLog(actionLog) {
    this.actionLog = actionLog;
  }

  setLastClick(lastClick) {
    this.lastClick = lastClick || null;
    this._renderClarity();
  }

  setTableEvent(message) {
    this.tableEvent = String(message || '').trim();
    this._render();
  }

  setClarityContext(partial = {}) {
    this.clarityCtx = { ...this.clarityCtx, ...partial };
    this._renderClarity();
  }

  _render() {
    if (isBoardSkin()) {
      this._renderTableRail();
      return;
    }
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
    this._renderClarity();
  }

  _renderTableRail() {
    this.el.classList.add('table-rail');
    const player = this.gameState?.currentPlayer;
    const inGame = this.gameState && this.gameState.phase !== GAME_PHASES.LOBBY && player;
    const phaseName = inGame ? this._getPhaseName(this.gameState.phase) : '';
    const ipcs = inGame ? (this.gameState.getIPCs?.(player.id) ?? 0) : 0;
    const chips = inGame ? this._ipcChipRow(ipcs) : '';

    if (this.clarityEl) {
      this.clarityEl.hidden = true;
      this.clarityEl.innerHTML = '';
      this.clarityEl.setAttribute('hidden', '');
    }
    const c = inGame ? this._clarityModel() : null;
    const placed = inGame && this.gameState.phase === GAME_PHASES.UNIT_PLACEMENT
      ? (this.gameState.unitsPlacedThisRound || 0)
      : null;
    const limit = inGame && placed != null
      ? (this.gameState.getUnitsPerRoundLimit?.() || 6)
      : null;
    const budget = (placed != null)
      ? '<span class="rail-budget" title="Placed this wave">' + placed + '/' + limit + '</span>'
      : '';
    const phone = isMobileShell();
    const narrow = phone || isNarrowBoardChrome();
    const slip = (!narrow && c)
      ? '<span class="rail-slip">' + (c.lastAction || '') + (c.click ? ' · ' + c.click : '') + '</span>'
      : '';
    const soundLabel = isBoardAudioMuted() ? 'Sound off' : 'Sound on';
    const eventLine = this.tableEvent
      ? `<div class="rail-event" aria-live="polite">${this.tableEvent}</div>`
      : '';

    const seat = inGame
      ? (
        '<div class="rail-seat" style="--nation:' + player.color + '">'
        + (player.flag ? '<img src="assets/flags/' + player.flag + '" alt="">' : '')
        + '<span class="rail-seat-name">' + player.name + '</span>'
        + (narrow ? '' : '<span class="rail-phase">' + phaseName + '</span>')
        + budget
        + '</div>'
        + slip
        + '<div class="rail-bank" title="IPCs">'
        + (phone ? '' : chips)
        + '<span class="rail-bank-count">' + ipcs + '</span></div>'
      )
      : '<span class="rail-idle">Tactical Risk</span>';

    this.el.innerHTML = `
      <div class="hud-menu-container">
        <button class="hud-menu-btn rail-stamp" data-action="toggle-menu" title="Menu">☰</button>
        <div class="hud-menu-dropdown ${this.menuOpen ? 'open' : ''}">
          <button class="hud-menu-item" data-action="rules">Rules</button>
          <button class="hud-menu-item" data-action="toggle-sound">${soundLabel}</button>
          <button class="hud-menu-item" data-action="exit-lobby">Box the game</button>
        </div>
      </div>
      ${seat}
      ${eventLine}
    `;
    this._bindEvents();
    this._renderClarity();
  }

  _ipcChipRow(amount) {
    const n = Math.min(8, Math.max(1, Math.ceil(Number(amount) / 20) || 1));
    return Array.from({ length: n }, (_, i) => `<span class="ipc-chip" style="--i:${i}"></span>`).join('');
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
          <span class="hud-mobile-faction" style="color:${readableFactionTextColor(player.color)}">${player.name}</span>
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

    const tabHTML = (this.menuOpen && this.menuTab && this.menuTabProvider)
      ? this.menuTabProvider(this.menuTab)
      : '';
    const tabLabel = this.menuTab === 'stats' ? 'Players'
      : this.menuTab === 'territory' ? 'Territory'
      : this.menuTab === 'log' ? 'Log'
      : '';

    this.el.innerHTML = `
      ${identity}
      <div class="hud-menu-container hud-mobile-overflow">
        <button class="hud-menu-btn" data-action="toggle-menu" title="Menu" aria-label="Menu">
          <span class="hud-menu-icon">⋯</span>
        </button>
      </div>
      <div class="phone-menu-sheet ${this.menuOpen ? 'open' : ''}" id="phone-menu-sheet">
        <div class="phone-menu-head">
          <button class="phone-menu-back" data-action="${this.menuTab ? 'menu-home' : 'toggle-menu'}" aria-label="${this.menuTab ? 'Back' : 'Close'}">${this.menuTab ? '←' : '✕'}</button>
          <span class="phone-menu-title">${tabLabel || 'Menu'}</span>
          <span class="phone-menu-wordmark">Tactical Risk</span>
        </div>
        ${this.menuTab ? `
          <div class="phone-menu-panel">${tabHTML}</div>
        ` : `
          <div class="phone-menu-list">
            <button class="phone-menu-row" data-action="menu-tab" data-tab="stats">
              <span class="hud-menu-item-icon">📊</span>
              <span>Players</span>
            </button>
            <button class="phone-menu-row" data-action="menu-tab" data-tab="territory">
              <span class="hud-menu-item-icon">🗺</span>
              <span>Territory</span>
            </button>
            <button class="phone-menu-row" data-action="menu-tab" data-tab="log">
              <span class="hud-menu-item-icon">📜</span>
              <span>Log</span>
            </button>
            <button class="phone-menu-row" data-action="rules">
              <span class="hud-menu-item-icon">📖</span>
              <span>Game Rules</span>
            </button>
            <button class="phone-menu-row" data-action="exit-lobby">
              <span class="hud-menu-item-icon">💾</span>
              <span>Save & Exit</span>
            </button>
          </div>
          ${playersHtml}
        `}
      </div>
    `;
    this._bindEvents();
    this._renderClarity();
  }

  _clarityModel() {
    const gs = this.gameState;
    const player = gs?.currentPlayer;
    const last = this.actionLog?.entries?.length
      ? this.actionLog.entries[this.actionLog.entries.length - 1]
      : null;
    return resolveHudClarity({
      isMultiplayer: !!gs?.isMultiplayer,
      localUserId: this.clarityCtx.localUserId,
      currentPlayerOderId: player?.oderId,
      currentPlayerName: player?.name,
      phase: gs?.phase,
      turnPhase: gs?.turnPhase,
      lastActionEntry: last,
      lastClick: this.lastClick,
      deployedThisRound: gs?.unitsPlacedThisRound || 0,
      limit: gs?.getUnitsPerRoundLimit?.() || 6,
      poolRemaining: player ? (gs.getTotalUnitsToPlace?.(player.id) || 0) : 0,
      gameCode: this.clarityCtx.gameCode,
      justResumed: this.clarityCtx.justResumed,
      hostPresence: this.clarityCtx.hostPresence,
      hostName: this.clarityCtx.hostName,
      isHost: this.clarityCtx.isHost,
    });
  }

  _renderClarity() {
    if (isBoardSkin()) {
      if (this.clarityEl) {
        this.clarityEl.hidden = true;
        this.clarityEl.innerHTML = '';
        this.clarityEl.setAttribute('hidden', '');
        this.clarityEl.style.display = 'none';
      }
      return;
    }
    if (!this.clarityEl) return;
    const inGame = this.gameState && this.gameState.phase !== GAME_PHASES.LOBBY;
    if (!inGame) {
      this.clarityEl.hidden = true;
      this.clarityEl.innerHTML = '';
      return;
    }
    const c = this._clarityModel();
    this.clarityEl.hidden = false;
    this.clarityEl.className = `hud-clarity${c.ownSeat ? ' your-turn' : ' waiting'}`;
    this.clarityEl.innerHTML = `
      <span class="hud-clarity-turn" data-clarity="turn">${c.whoseTurn}</span>
      <span class="hud-clarity-phase" data-clarity="phase">${c.phase}</span>
      ${c.budget ? `<span class="hud-clarity-budget" data-clarity="budget">${c.budget}</span>` : ''}
      <span class="hud-clarity-last" data-clarity="last">${c.lastAction}</span>
      <span class="hud-clarity-click" data-clarity="click">${c.click}</span>
      ${c.match ? `<span class="hud-clarity-match" data-clarity="match">${c.match}</span>` : ''}
    `;
  }

  _updateMenuState() {
    const sheet = this.el.querySelector('.phone-menu-sheet');
    if (sheet) {
      sheet.classList.toggle('open', this.menuOpen);
      return;
    }
    const dropdown = this.el.querySelector('.hud-menu-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('open', this.menuOpen);
    }
  }

  _bindEvents() {
    // Menu toggle button
    this.el.querySelectorAll('[data-action="toggle-menu"]').forEach((menuBtn) => {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.menuOpen = !this.menuOpen;
        if (!this.menuOpen) this.menuTab = null;
        if (this.menuOpen && typeof this.onMenuOpen === 'function') this.onMenuOpen();
        if (isMobileShell()) this._render();
        else this._updateMenuState();
      });
    });

    this.el.querySelector('[data-action="menu-home"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.menuTab = null;
      this._render();
    });

    this.el.querySelectorAll('[data-action="menu-tab"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.menuOpen = true;
        this.menuTab = btn.dataset.tab;
        this._render();
      });
    });

    this.el.querySelector('[data-action="toggle-sound"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      unlockBoardAudio();
      setBoardAudioMuted(!isBoardAudioMuted());
      this.menuOpen = false;
      this._render();
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
