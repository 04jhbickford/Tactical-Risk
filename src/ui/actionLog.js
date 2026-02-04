// Action Log - tracks and displays all player actions during the game
// Now integrated into the sidebar/player panel

export class ActionLog {
  constructor() {
    this.gameState = null;
    this.entries = [];
    this.maxEntries = 200; // Keep last 200 entries
    this._unsubscribe = null;
    this.onHighlightTerritory = null; // Callback for territory highlighting
    this.onHighlightMovement = null; // Callback for movement arrow highlighting

    this._create();
  }

  // Set callback for highlighting territories on hover
  setHighlightCallback(callback) {
    this.onHighlightTerritory = callback;
  }

  // Set callback for highlighting movement arrows
  setMovementHighlightCallback(callback) {
    this.onHighlightMovement = callback;
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'actionLog';
    this.el.className = 'action-log-integrated hidden';
    this.el.innerHTML = `
      <div class="action-log-header">
        <span class="action-log-title">Game Log</span>
        <button class="action-log-toggle" title="Toggle Log">▼</button>
      </div>
      <div class="action-log-content"></div>
    `;

    // Append to sidebar instead of body
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.appendChild(this.el);
    } else {
      document.body.appendChild(this.el);
    }

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

  // Log a complete combat summary with attacker, defender, losses, and winner
  logCombatSummary(territory, attacker, defender, attackerLosses, defenderLosses, winner, conquered) {
    const attackerLossStr = attackerLosses.length > 0
      ? attackerLosses.map(u => `${u.quantity} ${u.type}`).join(', ')
      : 'none';
    const defenderLossStr = defenderLosses.length > 0
      ? defenderLosses.map(u => `${u.quantity} ${u.type}`).join(', ')
      : 'none';

    const winnerName = winner === 'attacker' ? attacker.name : defender?.name || 'Defender';
    const outcome = conquered ? 'CONQUERED' : 'DEFENDED';

    this.log('combat-summary', {
      message: `⚔️ ${territory}: ${attacker.name} vs ${defender?.name || 'Defender'} → ${winnerName} ${outcome}`,
      detail: `Losses: ${attacker.name} lost ${attackerLossStr}, ${defender?.name || 'Defender'} lost ${defenderLossStr}`,
      territory,
      attacker: attacker.name,
      defender: defender?.name || 'Defender',
      winner: winnerName,
      conquered,
      color: winner === 'attacker' ? attacker.color : defender?.color || '#888'
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

    // Check if entry has detail line (for combat summaries)
    const detailHtml = entry.data.detail
      ? `<div class="log-detail">${entry.data.detail}</div>`
      : '';

    div.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-message" style="${colorStyle}">${entry.data.message}${detailHtml}</span>
    `;

    // Extract territory names and movement info for hover highlighting
    const territories = this._extractTerritories(entry);
    const hasMovement = entry.data.from && entry.data.to;

    if ((territories.length > 0 || hasMovement) && this.onHighlightTerritory) {
      div.classList.add('has-territory');

      div.addEventListener('mouseenter', () => {
        this.onHighlightTerritory(territories, true);
        // Also trigger movement arrow if available
        if (hasMovement && this.onHighlightMovement) {
          this.onHighlightMovement(entry.data.from, entry.data.to, true);
        }
      });

      div.addEventListener('mouseleave', () => {
        this.onHighlightTerritory(territories, false);
        if (hasMovement && this.onHighlightMovement) {
          this.onHighlightMovement(entry.data.from, entry.data.to, false);
        }
      });
    }

    this.contentEl.appendChild(div);
  }

  // Extract territory names from entry data
  _extractTerritories(entry) {
    const territories = [];
    const data = entry.data;

    // Direct territory references
    if (data.territory) territories.push(data.territory);
    if (data.from) territories.push(data.from);
    if (data.to) territories.push(data.to);

    return territories.filter(t => t && typeof t === 'string');
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
