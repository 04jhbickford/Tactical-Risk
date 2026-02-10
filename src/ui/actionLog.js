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
    this.isCollapsed = true; // Start collapsed

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
    this.el.className = 'action-log-integrated hidden collapsed'; // Start collapsed
    this.el.innerHTML = `
      <div class="action-log-header">
        <span class="action-log-title">Game Log</span>
        <button class="action-log-toggle" title="Toggle Log">▶</button>
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

    // Toggle visibility - persist collapsed state
    this.el.querySelector('.action-log-toggle').addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      this.el.classList.toggle('collapsed', this.isCollapsed);
      // Update toggle button icon
      const toggleBtn = this.el.querySelector('.action-log-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = this.isCollapsed ? '▶' : '▼';
      }
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

  logCardEarned(player, cardType) {
    this.log('card-earned', {
      message: `${player.name} earned a Risk card: ${cardType}`,
      cardType,
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

    // Build summary (max 2 lines) and full details
    const summary = this._buildSummary(entry);
    const details = this._buildDetails(entry);
    const hasDetails = details.length > 0;

    div.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-message" style="${colorStyle}">
        <span class="log-summary">${summary}</span>
        ${hasDetails ? `<span class="log-details hidden">${details}</span>` : ''}
      </span>
      ${hasDetails ? '<span class="log-expand-icon">▶</span>' : ''}
    `;

    // Toggle expand/collapse on click
    if (hasDetails) {
      div.classList.add('expandable');
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        div.classList.toggle('expanded');
        const detailsEl = div.querySelector('.log-details');
        const iconEl = div.querySelector('.log-expand-icon');
        if (detailsEl) {
          detailsEl.classList.toggle('hidden');
        }
        if (iconEl) {
          iconEl.textContent = div.classList.contains('expanded') ? '▼' : '▶';
        }
      });
    }

    // Extract territory names and movement info for hover highlighting
    const territories = this._extractTerritories(entry);
    const hasMovement = entry.data.from && entry.data.to;
    // Determine if this is a combat entry (for yellow arrow) or regular move (cyan arrow)
    const isCombat = entry.type === 'attack' || entry.type === 'combat' || entry.type === 'combat-summary';

    // All entries with territories should highlight on hover
    if (territories.length > 0 && this.onHighlightTerritory) {
      div.classList.add('has-territory');

      div.addEventListener('mouseenter', () => {
        this.onHighlightTerritory(territories, true);
        // Also trigger movement arrow if available (pass isCombat for color)
        if (hasMovement && this.onHighlightMovement) {
          this.onHighlightMovement(entry.data.from, entry.data.to, true, isCombat);
        }
        // Auto-expand on hover
        if (hasDetails && !div.classList.contains('expanded')) {
          div.classList.add('hover-expanded');
          const detailsEl = div.querySelector('.log-details');
          if (detailsEl) detailsEl.classList.remove('hidden');
        }
      });

      div.addEventListener('mouseleave', () => {
        this.onHighlightTerritory(territories, false);
        if (hasMovement && this.onHighlightMovement) {
          this.onHighlightMovement(entry.data.from, entry.data.to, false, isCombat);
        }
        // Collapse on mouse leave (unless permanently expanded)
        if (div.classList.contains('hover-expanded') && !div.classList.contains('expanded')) {
          div.classList.remove('hover-expanded');
          const detailsEl = div.querySelector('.log-details');
          if (detailsEl) detailsEl.classList.add('hidden');
        }
      });
    }

    this.contentEl.appendChild(div);
  }

  // Build short summary (max ~50 chars)
  _buildSummary(entry) {
    const data = entry.data;
    switch (entry.type) {
      case 'move':
        return `Moved to ${data.to}`;
      case 'attack':
        return `Attacking ${data.to}`;
      case 'combat-summary':
        return `⚔️ ${data.territory}: ${data.winner} wins`;
      case 'capture':
        return `Captured ${data.territory}`;
      case 'purchase':
        const total = data.units?.reduce((sum, u) => sum + u.quantity, 0) || 0;
        return `Purchased ${total} units`;
      case 'capital':
        return `Capital: ${data.territory}`;
      case 'income':
        return `+${data.amount} IPCs`;
      case 'tech':
        return data.tech ? `Tech: ${data.tech}` : 'Research failed';
      case 'turn':
        return data.message;
      case 'phase':
        return data.message;
      case 'cards':
        return `Traded cards: +${data.value} IPCs`;
      case 'card-earned':
        return `Earned Risk card: ${data.cardType}`;
      default:
        return data.message || entry.type;
    }
  }

  // Build expanded details
  _buildDetails(entry) {
    const data = entry.data;
    const parts = [];

    switch (entry.type) {
      case 'move':
        parts.push(`From: ${data.from}`);
        parts.push(`To: ${data.to}`);
        if (data.units) {
          parts.push(`Units: ${data.units.map(u => `${u.quantity} ${u.type}`).join(', ')}`);
        }
        break;
      case 'attack':
        parts.push(`From: ${data.from}`);
        parts.push(`Target: ${data.to}`);
        parts.push('Combat pending...');
        break;
      case 'combat-summary':
        parts.push(`${data.attacker} vs ${data.defender}`);
        if (data.detail) parts.push(data.detail);
        parts.push(`Result: ${data.conquered ? 'Territory conquered' : 'Attack repelled'}`);
        break;
      case 'purchase':
        if (data.units) {
          data.units.forEach(u => parts.push(`${u.quantity}x ${u.type}`));
        }
        break;
      case 'income':
        parts.push(`Round ${entry.round} income`);
        break;
      default:
        // No extra details
        break;
    }

    return parts.join('<br>');
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
    // Only scroll if not collapsed
    if (!this.isCollapsed) {
      this.contentEl.scrollTop = this.contentEl.scrollHeight;
    }
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
