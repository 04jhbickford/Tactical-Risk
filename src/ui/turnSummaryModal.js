// Turn Summary Modal - shown at the start of a player's turn in multiplayer
// to recap what other players did during their turns

export class TurnSummaryModal {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'turnSummaryModal';
    this.el.className = 'turn-summary-overlay hidden';
    this.el.innerHTML = `
      <div class="turn-summary-content">
        <div class="turn-summary-header">
          <span class="turn-summary-title">Turn Summary</span>
          <button class="turn-summary-close" id="turnSummaryClose">✕</button>
        </div>
        <div class="turn-summary-body" id="turnSummaryBody"></div>
        <div class="turn-summary-footer">
          <button class="turn-summary-ok" id="turnSummaryOk">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    const close = () => this.hide();
    this.el.querySelector('#turnSummaryClose').addEventListener('click', close);
    this.el.querySelector('#turnSummaryOk').addEventListener('click', close);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) close();
    });
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
  }

  setGameState(gameState) {
    this.gameState = gameState;
  }

  show(events) {
    if (!events || events.length === 0) return;

    const body = this.el.querySelector('#turnSummaryBody');
    body.innerHTML = this._renderEvents(events);

    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  _renderEvents(events) {
    // Group events by player
    const byPlayer = {};
    for (const ev of events) {
      const pid = ev.playerId || 'Unknown';
      if (!byPlayer[pid]) byPlayer[pid] = [];
      byPlayer[pid].push(ev);
    }

    let html = '';
    for (const [playerId, playerEvents] of Object.entries(byPlayer)) {
      const playerName = this._getPlayerName(playerId);
      html += `<div class="tsm-player-section">`;
      html += `<div class="tsm-player-name">${this._escapeHtml(playerName)}</div>`;
      html += `<ul class="tsm-event-list">`;
      for (const ev of playerEvents) {
        html += `<li class="tsm-event">${this._renderEvent(ev)}</li>`;
      }
      html += `</ul></div>`;
    }
    return html || '<p class="tsm-empty">No events to display.</p>';
  }

  _renderEvent(ev) {
    if (ev.type === 'combat') {
      const won = ev.outcome === 'attacker';
      const result = won ? 'won' : 'lost';
      const atLoss = ev.attackerLosses || 0;
      const defLoss = ev.defenderLosses || 0;
      return `Combat at <strong>${this._escapeHtml(ev.territory)}</strong>: `
        + `${this._escapeHtml(ev.attacker)} attacked ${this._escapeHtml(ev.defender)} and <strong>${result}</strong> `
        + `(attacker lost ${atLoss}, defender lost ${defLoss})`;
    }
    if (ev.type === 'territory_captured') {
      return `Captured <strong>${this._escapeHtml(ev.territory)}</strong> from ${this._escapeHtml(ev.fromPlayer)}`;
    }
    return this._escapeHtml(ev.type || 'Unknown event');
  }

  _getPlayerName(playerId) {
    if (!this.gameState) return playerId;
    const player = this.gameState.players?.find(p => p.id === playerId);
    return player?.name || playerId;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
