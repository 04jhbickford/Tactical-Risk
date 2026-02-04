// Action Log - tracks and displays all player actions during the game

export class ActionLog {
  constructor() {
    this.gameState = null;
    this.entries = [];
    this.maxEntries = 200; // Keep last 200 entries
    this._unsubscribe = null;

    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'actionLog';
    this.el.className = 'action-log hidden';
    this.el.innerHTML = `
      <div class="action-log-header">
        <span class="action-log-title">Game Log</span>
        <button class="action-log-toggle" title="Toggle Log">▼</button>
      </div>
      <div class="action-log-content"></div>
    `;
    document.body.appendChild(this.el);

    // Toggle visibility
    this.el.querySelector('.action-log-toggle').addEventListener('click', () => {
      this.el.classList.toggle('collapsed');
    });

    this.contentEl = this.el.querySelector('.action-log-content');
  }

  setGameState(gameState) {
    if (this._unsubscribe) {
      this._unsubscribe();
    }

    this.gameState = gameState;
    this.entries = [];
    this._render();

    // Don't subscribe to changes - log is updated via explicit calls
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  // Log a game action
  log(type, data) {
    const entry = {
      id: Date.now() + Math.random(),
      type,
      data,
      timestamp: new Date(),
      round: this.gameState?.round || 1,
      player: this.gameState?.currentPlayer || null,
    };

    this.entries.push(entry);

    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    this._appendEntry(entry);
    this._scrollToBottom();
  }

  // Convenience methods for common actions
  logMove(from, to, units, player) {
    const unitStr = units.map(u => `${u.quantity} ${u.type}`).join(', ');
    this.log('move', {
      message: `${player.name} moved ${unitStr} from ${from} to ${to}`,
      from, to, units,
      color: player.color
    });
  }

  logAttack(from, to, attacker, defender) {
    this.log('attack', {
      message: `${attacker.name} attacks ${to} from ${from}`,
      from, to,
      color: attacker.color
    });
  }

  logCombatResult(territory, result, attacker, defender) {
    const winner = result.winner === 'attacker' ? attacker.name : defender?.name || 'Defender';
    this.log('combat', {
      message: `Battle at ${territory}: ${winner} wins! (${result.attackHits} vs ${result.defenseHits} hits)`,
      territory, result,
      color: result.winner === 'attacker' ? attacker.color : defender?.color || '#888'
    });
  }

  logCapture(territory, player) {
    this.log('capture', {
      message: `${player.name} captures ${territory}!`,
      territory,
      color: player.color
    });
  }

  logPurchase(units, player) {
    const unitStr = units.map(u => `${u.quantity} ${u.type}`).join(', ');
    this.log('purchase', {
      message: `${player.name} purchased ${unitStr}`,
      units,
      color: player.color
    });
  }

  logCapitalPlacement(territory, player) {
    this.log('capital', {
      message: `${player.name} placed capital at ${territory}`,
      territory,
      color: player.color
    });
  }

  logPhaseChange(phase, player) {
    this.log('phase', {
      message: `${player.name}: ${phase}`,
      phase,
      color: player.color
    });
  }

  logTurnStart(player, round) {
    this.log('turn', {
      message: `Round ${round} - ${player.name}'s turn begins`,
      round,
      color: player.color
    });
  }

  logTechResearch(player, techName, success) {
    if (success) {
      this.log('tech', {
        message: `${player.name} unlocked ${techName}!`,
        tech: techName,
        color: player.color
      });
    } else {
      this.log('tech', {
        message: `${player.name} failed to research technology`,
        color: player.color
      });
    }
  }

  logCardTrade(player, value) {
    this.log('cards', {
      message: `${player.name} traded RISK cards for ${value} IPCs`,
      value,
      color: player.color
    });
  }

  logIncome(player, amount) {
    this.log('income', {
      message: `${player.name} collected ${amount} IPCs`,
      amount,
      color: player.color
    });
  }

  _appendEntry(entry) {
    const div = document.createElement('div');
    div.className = `log-entry log-${entry.type}`;

    const time = entry.timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const colorStyle = entry.data.color ? `border-left: 3px solid ${entry.data.color}` : '';

    div.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-message" style="${colorStyle}">${entry.data.message}</span>
    `;

    this.contentEl.appendChild(div);
  }

  _render() {
    this.contentEl.innerHTML = '';
    for (const entry of this.entries) {
      this._appendEntry(entry);
    }
    this._scrollToBottom();
  }

  _scrollToBottom() {
    this.contentEl.scrollTop = this.contentEl.scrollHeight;
  }

  // Get entries for save/load
  toJSON() {
    return this.entries.map(e => ({
      type: e.type,
      data: e.data,
      timestamp: e.timestamp.toISOString(),
      round: e.round,
    }));
  }

  loadFromJSON(data) {
    this.entries = data.map(e => ({
      ...e,
      id: Date.now() + Math.random(),
      timestamp: new Date(e.timestamp),
    }));
    this._render();
  }
}
