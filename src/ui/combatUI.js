// Enhanced combat resolution UI with dice animation, probability, and casualty selection

import { getUnitIconPath } from '../utils/unitIcons.js';

export class CombatUI {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.actionLog = null;
    this.onCombatComplete = null;
    this.onAirLandingRequired = null; // Callback when air landing phase starts

    this.currentTerritory = null;
    this.combatState = null; // { attackers, defenders, phase, pendingCasualties }
    this.diceAnimation = null;
    this.lastRolls = null;
    this.cardAwarded = null;

    this._create();
  }

  setOnAirLandingRequired(callback) {
    this.onAirLandingRequired = callback;
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'combatPopup';
    this.el.className = 'combat-popup hidden';
    document.body.appendChild(this.el);
  }

  setGameState(gameState) {
    this.gameState = gameState;
  }

  setUnitDefs(unitDefs) {
    this.unitDefs = unitDefs;
  }

  setOnComplete(callback) {
    this.onCombatComplete = callback;
  }

  setActionLog(actionLog) {
    this.actionLog = actionLog;
  }

  hasCombats() {
    return this.gameState && this.gameState.combatQueue.length > 0;
  }

  showNextCombat() {
    if (!this.hasCombats()) {
      this.hide();
      return;
    }

    this.currentTerritory = this.gameState.combatQueue[0];
    this._initCombatState();
    this._render();
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
    this.currentTerritory = null;
    this.combatState = null;
    this.diceAnimation = null;
    this.lastRolls = null;
  }

  _initCombatState() {
    const player = this.gameState.currentPlayer;
    const units = this.gameState.getUnitsAt(this.currentTerritory);

    const attackers = units
      .filter(u => u.owner === player.id)
      .map(u => ({ ...u }));

    const defenders = units
      .filter(u => u.owner !== player.id && !this.gameState.areAllies(player.id, u.owner))
      .map(u => ({ ...u }));

    // Check for AA guns and attacking aircraft
    const aaGuns = defenders.filter(u => u.type === 'aaGun');
    const attackingAir = attackers.filter(u => {
      const def = this.unitDefs[u.type];
      return def && def.isAir;
    });

    // Calculate shore bombardment for amphibious assaults
    const bombardmentResult = this._calculateBombardment();

    this.combatState = {
      attackers,
      defenders,
      phase: bombardmentResult.rolls.length > 0 ? 'bombardment' :
             (aaGuns.length > 0 && attackingAir.length > 0 ? 'aaFire' : 'ready'),
      pendingAttackerCasualties: 0,
      pendingDefenderCasualties: 0,
      selectedAttackerCasualties: {},
      selectedDefenderCasualties: {},
      winner: null,
      aaFired: false,
      aaResults: null,
      bombardmentRolls: bombardmentResult.rolls,
      bombardmentHits: bombardmentResult.hits,
      bombardmentFired: false,
      hasAA: aaGuns.length > 0 && attackingAir.length > 0,
      // Air landing tracking
      airUnitsToLand: [], // { type, quantity, landingOptions }
      selectedLandings: {}, // { unitType: territoryName }
      // Battle summary tracking - accumulate losses throughout battle
      totalAttackerLosses: {}, // { unitType: count }
      totalDefenderLosses: {}, // { unitType: count }
      // Store initial forces for summary
      initialAttackers: attackers.map(u => ({ type: u.type, quantity: u.quantity })),
      initialDefenders: defenders.map(u => ({ type: u.type, quantity: u.quantity })),
    };

    this.lastRolls = null;
  }

  _calculateBombardment() {
    // Calculate shore bombardment from ships in adjacent sea zones
    const player = this.gameState.currentPlayer;
    const territory = this.currentTerritory;
    const hits = [];
    const rolls = [];

    // Check if this is a land territory
    const t = this.gameState.territoryByName[territory];
    if (!t || t.isWater) return { hits: 0, rolls: [] };

    // Find adjacent sea zones with friendly ships
    const connections = t.connections || [];
    for (const connName of connections) {
      const connT = this.gameState.territoryByName[connName];
      if (!connT?.isWater) continue;

      // Check for friendly ships that can bombard
      const seaUnits = this.gameState.units[connName] || [];
      for (const unit of seaUnits) {
        if (unit.owner !== player.id) continue;

        const def = this.unitDefs[unit.type];
        if (!def?.isSea) continue;

        // Ships that can bombard: battleships (attack 4) and cruisers (attack 3)
        if (unit.type === 'battleship' || unit.type === 'cruiser') {
          for (let i = 0; i < unit.quantity; i++) {
            rolls.push({
              unit: unit.type,
              source: connName,
              attackValue: def.attack,
              roll: null,  // Will be set when fired
              hit: null
            });
          }
        }
      }
    }

    return { hits: 0, rolls };
  }

  _fireBombardment() {
    const { bombardmentRolls } = this.combatState;
    let hits = 0;

    // Roll for each bombarding ship
    for (const roll of bombardmentRolls) {
      roll.roll = Math.floor(Math.random() * 6) + 1;
      roll.hit = roll.roll <= roll.attackValue;
      if (roll.hit) hits++;
    }

    this.combatState.bombardmentHits = hits;
    this.combatState.bombardmentFired = true;

    // If there are hits, let the defender choose casualties before combat
    if (hits > 0) {
      this.combatState.pendingBombardmentCasualties = hits;
      this.combatState.selectedBombardmentCasualties = {};
      // Pre-select cheapest as default suggestion
      this.combatState.selectedBombardmentCasualties = this._selectCheapestCasualties(
        this.combatState.defenders, hits
      );
      this.combatState.phase = 'selectBombardmentCasualties';
    } else {
      // No hits - move to next phase
      this._proceedAfterBombardment();
    }

    this._render();
  }

  _applyBombardmentCasualties() {
    const { defenders, selectedBombardmentCasualties, totalDefenderLosses } = this.combatState;

    // Apply selected bombardment casualties and track for summary
    for (const [type, count] of Object.entries(selectedBombardmentCasualties)) {
      const unit = defenders.find(u => u.type === type);
      if (unit) {
        unit.quantity -= count;
        // Track total losses for battle summary
        totalDefenderLosses[type] = (totalDefenderLosses[type] || 0) + count;
      }
    }

    // Remove dead units
    this.combatState.defenders = defenders.filter(u => u.quantity > 0);
    this.combatState.bombardmentApplied = true;

    this._proceedAfterBombardment();
    this._render();
  }

  _proceedAfterBombardment() {
    // Move to next phase (AA fire or ready)
    if (this.combatState.hasAA) {
      this.combatState.phase = 'aaFire';
    } else {
      this.combatState.phase = 'ready';
    }
  }

  _rollAAFire() {
    const { attackers } = this.combatState;

    // Count attacking aircraft
    const attackingAir = attackers.filter(u => {
      const def = this.unitDefs[u.type];
      return def && def.isAir;
    });

    const totalAircraft = attackingAir.reduce((sum, u) => sum + u.quantity, 0);

    // Roll 1 die per aircraft, hits on 1
    const rolls = [];
    let hits = 0;
    for (let i = 0; i < totalAircraft; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      const hit = roll === 1;
      rolls.push({ roll, hit });
      if (hit) hits++;
    }

    this.combatState.aaResults = { rolls, hits };
    this.combatState.aaFired = true;

    // If there are hits, let the attacker choose which aircraft to lose
    if (hits > 0) {
      this.combatState.pendingAACasualties = hits;
      this.combatState.selectedAACasualties = {};
      // Pre-select cheapest as default suggestion
      this.combatState.selectedAACasualties = this._selectCheapestAircraftCasualties(attackers, hits);
      this.combatState.phase = 'selectAACasualties';
    } else {
      // No hits - move to combat
      this._proceedAfterAAFire();
    }

    this._render();
  }

  _applyAACasualties() {
    const { attackers, selectedAACasualties, totalAttackerLosses } = this.combatState;

    // Apply selected AA casualties and track for summary
    for (const [type, count] of Object.entries(selectedAACasualties)) {
      const unit = attackers.find(u => u.type === type);
      if (unit) {
        unit.quantity -= count;
        // Track total losses for battle summary
        totalAttackerLosses[type] = (totalAttackerLosses[type] || 0) + count;
      }
    }

    // Remove dead units
    this.combatState.attackers = attackers.filter(u => u.quantity > 0);

    this._proceedAfterAAFire();
    this._render();
  }

  _proceedAfterAAFire() {
    // Move to ready phase if there are still attackers
    if (this._getTotalUnits(this.combatState.attackers) > 0 &&
        this._getTotalUnits(this.combatState.defenders.filter(u => u.type !== 'aaGun')) > 0) {
      this.combatState.phase = 'ready';
    } else if (this._getTotalUnits(this.combatState.attackers) === 0) {
      this.combatState.phase = 'resolved';
      this.combatState.winner = 'defender';
    } else {
      // Only AA guns left defending - attacker wins
      this.combatState.phase = 'resolved';
      this.combatState.winner = 'attacker';
    }
  }

  _selectCheapestAircraftCasualties(units, count) {
    const airUnits = units.filter(u => {
      const def = this.unitDefs[u.type];
      return def && def.isAir && u.quantity > 0;
    }).sort((a, b) => {
      const costA = this.unitDefs[a.type]?.cost || 999;
      const costB = this.unitDefs[b.type]?.cost || 999;
      return costA - costB;
    });

    const selected = {};
    let remaining = count;

    for (const unit of airUnits) {
      if (remaining <= 0) break;
      const take = Math.min(unit.quantity, remaining);
      selected[unit.type] = take;
      remaining -= take;
    }

    return selected;
  }

  _calculateProbability() {
    // Simplified probability calculation based on expected hits
    const { attackers, defenders } = this.combatState;

    let attackPower = 0;
    let attackUnits = 0;
    for (const unit of attackers) {
      const def = this.unitDefs[unit.type];
      if (def && def.attack > 0) {
        attackPower += (def.attack / 6) * unit.quantity;
        attackUnits += unit.quantity;
      }
    }

    let defensePower = 0;
    let defenseUnits = 0;
    for (const unit of defenders) {
      const def = this.unitDefs[unit.type];
      if (def && def.defense > 0) {
        defensePower += (def.defense / 6) * unit.quantity;
        defenseUnits += unit.quantity;
      }
    }

    if (attackUnits === 0 || defenseUnits === 0) {
      return attackUnits > 0 ? 100 : 0;
    }

    // Simplified: compare expected hits per round vs units
    const attackerAdvantage = (attackPower / defenseUnits) - (defensePower / attackUnits);
    // Convert to percentage (sigmoid-like)
    const probability = 50 + (attackerAdvantage * 30);
    return Math.max(5, Math.min(95, probability));
  }

  _getTotalUnits(units) {
    return units.reduce((sum, u) => sum + u.quantity, 0);
  }

  _rollDice() {
    const { attackers, defenders } = this.combatState;

    // Roll for attackers
    const attackRolls = [];
    let attackHits = 0;
    for (const unit of attackers) {
      const def = this.unitDefs[unit.type];
      if (!def) continue;
      for (let i = 0; i < unit.quantity; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        const hit = roll <= def.attack;
        attackRolls.push({ roll, hit, unitType: unit.type });
        if (hit) attackHits++;
      }
    }

    // Roll for defenders
    const defenseRolls = [];
    let defenseHits = 0;
    for (const unit of defenders) {
      const def = this.unitDefs[unit.type];
      if (!def) continue;
      for (let i = 0; i < unit.quantity; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        const hit = roll <= def.defense;
        defenseRolls.push({ roll, hit, unitType: unit.type });
        if (hit) defenseHits++;
      }
    }

    this.lastRolls = { attackRolls, defenseRolls, attackHits, defenseHits };
    return { attackHits, defenseHits };
  }

  async _animateDiceRoll() {
    this.combatState.phase = 'rolling';
    this._render();

    // Animate dice for 0.5 seconds (faster animation)
    const duration = 500;
    const startTime = Date.now();

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
          // Update with random dice values - 3D rolling effect
          this._renderDiceAnimation();
          requestAnimationFrame(animate);
        } else {
          // Final roll
          const result = this._rollDice();

          // Bombardment casualties are now applied separately before combat
          this.combatState.pendingDefenderCasualties = result.attackHits;
          this.combatState.pendingAttackerCasualties = result.defenseHits;
          this.combatState.phase = 'selectCasualties';
          this._autoSelectCasualties();
          this._render();
          resolve(result);
        }
      };
      animate();
    });
  }

  _renderDiceAnimation() {
    // Update dice display with random values - 3D rolling effect
    const diceContainer = this.el.querySelector('.dice-animation');
    if (!diceContainer) return;

    const { attackers, defenders } = this.combatState;
    const attackCount = this._getTotalUnits(attackers);
    const defenseCount = this._getTotalUnits(defenders);

    let html = '<div class="dice-row attacking">';
    html += '<span class="dice-row-label">Attack:</span>';
    for (let i = 0; i < Math.min(attackCount, 10); i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      const delay = i * 30;
      html += `<div class="die die-3d rolling" style="animation-delay: ${delay}ms">${roll}</div>`;
    }
    if (attackCount > 10) html += `<span class="dice-more">+${attackCount - 10}</span>`;
    html += '</div>';

    html += '<div class="dice-row defending">';
    html += '<span class="dice-row-label">Defense:</span>';
    for (let i = 0; i < Math.min(defenseCount, 10); i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      const delay = i * 30;
      html += `<div class="die die-3d rolling" style="animation-delay: ${delay}ms">${roll}</div>`;
    }
    if (defenseCount > 10) html += `<span class="dice-more">+${defenseCount - 10}</span>`;
    html += '</div>';

    diceContainer.innerHTML = html;
  }

  _autoSelectCasualties() {
    // Auto-select cheapest units as casualties
    const { attackers, defenders, pendingAttackerCasualties, pendingDefenderCasualties } = this.combatState;

    this.combatState.selectedAttackerCasualties = this._selectCheapestCasualties(attackers, pendingAttackerCasualties);
    this.combatState.selectedDefenderCasualties = this._selectCheapestCasualties(defenders, pendingDefenderCasualties);
  }

  _selectCheapestCasualties(units, count) {
    const sorted = [...units]
      .filter(u => u.quantity > 0)
      .sort((a, b) => {
        const costA = this.unitDefs[a.type]?.cost || 999;
        const costB = this.unitDefs[b.type]?.cost || 999;
        return costA - costB;
      });

    const selected = {};
    let remaining = count;

    for (const unit of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(unit.quantity, remaining);
      selected[unit.type] = take;
      remaining -= take;
    }

    return selected;
  }

  _getTotalSelectedCasualties(selected) {
    return Object.values(selected).reduce((sum, n) => sum + n, 0);
  }

  _confirmAirLandings() {
    const player = this.gameState.currentPlayer;
    const { airUnitsToLand, selectedLandings, attackers } = this.combatState;

    // Process each air unit landing
    for (const airUnit of airUnitsToLand) {
      const destination = selectedLandings[airUnit.type];

      if (!destination && airUnit.landingOptions.length > 0) {
        // No selection made but has options - shouldn't happen due to button disabled
        continue;
      }

      // Find the unit in attackers
      const attackerUnit = attackers.find(u => u.type === airUnit.type);
      if (!attackerUnit || attackerUnit.quantity <= 0) continue;

      if (airUnit.landingOptions.length === 0) {
        // No valid landing - unit crashes (remove from attackers)
        attackerUnit.quantity = 0;
        console.log(`${airUnit.type} crashed - no valid landing location`);
      } else if (destination && destination !== this.currentTerritory) {
        // Move air units to destination
        // First remove from attackers (will be added to destination)
        const quantityToMove = attackerUnit.quantity;
        attackerUnit.quantity = 0;

        // Add to destination territory
        const destUnits = this.gameState.units[destination] || [];
        const existing = destUnits.find(u => u.type === airUnit.type && u.owner === player.id);
        if (existing) {
          existing.quantity += quantityToMove;
          existing.moved = true;
        } else {
          destUnits.push({
            type: airUnit.type,
            quantity: quantityToMove,
            owner: player.id,
            moved: true
          });
        }
        this.gameState.units[destination] = destUnits;

        // Check if landing on carrier
        const destT = this.gameState.territoryByName[destination];
        if (destT?.isWater) {
          // Land on carrier
          const seaUnits = this.gameState.units[destination] || [];
          const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
          const carrierDef = this.unitDefs.carrier;

          // Add to carrier's aircraft array
          for (const carrier of carriers) {
            carrier.aircraft = carrier.aircraft || [];
            const capacity = (carrierDef?.aircraftCapacity || 2) - carrier.aircraft.length;
            const toAdd = Math.min(quantityToMove, capacity);
            for (let i = 0; i < toAdd; i++) {
              carrier.aircraft.push({ type: airUnit.type, owner: player.id });
            }
            if (carrier.aircraft.length >= (carrierDef?.aircraftCapacity || 2)) break;
          }
        }
      }
    }

    // Clean up attackers list
    this.combatState.attackers = attackers.filter(u => u.quantity > 0);

    // Clear air unit origins for this territory
    this.gameState.clearAirUnitOrigins(this.currentTerritory);

    // Check if this was a retreat - if so, skip to next combat
    if (this.combatState.isRetreating) {
      // Remove from combat queue and proceed to next combat
      this.gameState.combatQueue = this.gameState.combatQueue.filter(t => t !== this.currentTerritory);
      this.gameState._notify();
      this._nextCombat();
    } else {
      // Finalize combat (apply territory capture, etc.) then move to next
      this._finalizeCombat();
      this.gameState.combatQueue = this.gameState.combatQueue.filter(t => t !== this.currentTerritory);
      this.gameState._notify();
      this._nextCombat();
    }
  }

  _checkAirLanding() {
    const player = this.gameState.currentPlayer;
    const { attackers } = this.combatState;

    // Find ALL surviving air units - they MUST select a landing location
    // Air units can ONLY land in territories that were friendly at the START of the turn
    const airUnitsToLand = [];
    const territory = this.currentTerritory;

    for (const unit of attackers) {
      const def = this.unitDefs[unit.type];
      if (!def?.isAir || unit.quantity <= 0) continue;

      // Get valid landing options (only territories friendly at turn start)
      const landingOptions = this.gameState.getAirLandingOptions(territory, unit.type, this.unitDefs);

      // ALL air units must choose a landing location after combat
      airUnitsToLand.push({
        type: unit.type,
        quantity: unit.quantity,
        landingOptions: landingOptions,
      });
    }

    if (airUnitsToLand.length > 0) {
      this.combatState.airUnitsToLand = airUnitsToLand;
      this.combatState.selectedLandings = {};
      this.combatState.phase = 'airLanding';

      // If external air landing UI is connected, delegate to it and hide combat popup
      if (this.onAirLandingRequired) {
        // Hide combat popup - only show the air landing panel
        this.el.classList.add('hidden');

        this.onAirLandingRequired({
          airUnitsToLand,
          combatTerritory: this.currentTerritory,
          isRetreating: this.combatState.isRetreating || false,
        });
      }
    } else {
      this.combatState.phase = 'resolved';
    }
  }

  // Called from external AirLandingUI when landing selection is complete
  handleAirLandingComplete(result) {
    if (!this.combatState) return;

    // Apply landings from the external UI
    this.combatState.selectedLandings = result.landings || {};
    this._confirmAirLandings();
  }

  _applyCasualties() {
    const { attackers, defenders, selectedAttackerCasualties, selectedDefenderCasualties,
            totalAttackerLosses, totalDefenderLosses } = this.combatState;

    // Apply attacker casualties and track total losses
    for (const [type, count] of Object.entries(selectedAttackerCasualties)) {
      const unit = attackers.find(u => u.type === type);
      if (unit) {
        unit.quantity -= count;
        // Track total losses for battle summary
        totalAttackerLosses[type] = (totalAttackerLosses[type] || 0) + count;
      }
    }

    // Apply defender casualties and track total losses
    for (const [type, count] of Object.entries(selectedDefenderCasualties)) {
      const unit = defenders.find(u => u.type === type);
      if (unit) {
        unit.quantity -= count;
        // Track total losses for battle summary
        totalDefenderLosses[type] = (totalDefenderLosses[type] || 0) + count;
      }
    }

    // Remove dead units
    this.combatState.attackers = attackers.filter(u => u.quantity > 0);
    this.combatState.defenders = defenders.filter(u => u.quantity > 0);

    // Check for resolution
    if (this.combatState.defenders.length === 0) {
      this.combatState.winner = 'attacker';
      this._checkAirLanding();
    } else if (this.combatState.attackers.length === 0) {
      this.combatState.winner = 'defender';
      this._checkAirLanding();
    } else {
      // Continue combat
      this.combatState.phase = 'ready';
      this.combatState.pendingAttackerCasualties = 0;
      this.combatState.pendingDefenderCasualties = 0;
      this.combatState.selectedAttackerCasualties = {};
      this.combatState.selectedDefenderCasualties = {};
      this.lastRolls = null;
    }

    this._render();
  }

  _finalizeCombat() {
    // Apply final state to game
    const player = this.gameState.currentPlayer;
    const units = [];
    const previousOwner = this.gameState.getOwner(this.currentTerritory);
    const defenderPlayer = this.gameState.getPlayer(previousOwner);

    // Add surviving attackers
    for (const unit of this.combatState.attackers) {
      if (unit.quantity > 0) {
        units.push({ ...unit, moved: true });
      }
    }

    // Add surviving defenders
    for (const unit of this.combatState.defenders) {
      if (unit.quantity > 0) {
        units.push({ ...unit });
      }
    }

    this.gameState.units[this.currentTerritory] = units;

    // Log combat result
    this.gameState.logCombat({
      territory: this.currentTerritory,
      attacker: player.name,
      defender: defenderPlayer?.name || 'Unknown',
      winner: this.combatState.winner,
      attackerSurvivors: this._getTotalUnits(this.combatState.attackers),
      defenderSurvivors: this._getTotalUnits(this.combatState.defenders),
    });

    // Update territory ownership if attacker won AND has land units
    // Air units cannot capture territory - only land units can
    if (this.combatState.winner === 'attacker') {
      const hasLandUnit = this.combatState.attackers.some(u => {
        const def = this.unitDefs[u.type];
        return def && def.isLand && u.quantity > 0;
      });

      if (hasLandUnit) {
        this.gameState.territoryState[this.currentTerritory].owner = player.id;

        // Award Risk card for conquering (one per turn per Risk rules)
        if (!this.gameState.conqueredThisTurn[player.id]) {
          this.gameState.conqueredThisTurn[player.id] = true;
          const cardType = this.gameState.awardRiskCard(player.id);
          this.cardAwarded = cardType;
          // Log the card earned
          if (this.actionLog && cardType) {
            this.actionLog.logCardEarned(player, cardType);
          }
        }

        // Handle capital capture (IPC transfer, victory check)
        this.gameState.handleCapitalCapture(this.currentTerritory, player.id, previousOwner);
      } else {
        // Air units killed defenders but cannot capture - territory remains with original owner
        // Air units will need to land elsewhere
        console.log('Air units cannot capture territory - territory remains contested');
      }
    }

    // Remove from combat queue
    this.gameState.combatQueue = this.gameState.combatQueue.filter(t => t !== this.currentTerritory);
    this.gameState._notify();
  }

  async _autoBattle() {
    // Run combat to completion automatically
    while (this.combatState.phase !== 'resolved' && this.combatState.phase !== 'airLanding') {
      if (this.combatState.phase === 'bombardment') {
        this._fireBombardment();
        await new Promise(r => setTimeout(r, 150));
      }
      if (this.combatState.phase === 'selectBombardmentCasualties') {
        this._applyBombardmentCasualties();
        await new Promise(r => setTimeout(r, 150));
      }
      if (this.combatState.phase === 'aaFire') {
        this._rollAAFire();
        await new Promise(r => setTimeout(r, 150));
      }
      if (this.combatState.phase === 'selectAACasualties') {
        this._applyAACasualties();
        await new Promise(r => setTimeout(r, 150));
      }
      if (this.combatState.phase === 'ready') {
        await this._animateDiceRoll();
        await new Promise(r => setTimeout(r, 100));
      }
      if (this.combatState.phase === 'selectCasualties') {
        this._applyCasualties();
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Handle air landing phase
    // If external UI is connected, let the user select landings manually
    // Otherwise auto-select closest valid landing for each air unit
    if (this.combatState.phase === 'airLanding') {
      if (this.onAirLandingRequired) {
        // External UI will handle this - don't auto-select
        // The callback was already called in _checkAirLanding
        return; // Exit auto-battle, let user interact with landing UI
      } else {
        // No external UI - auto-select landings
        const { airUnitsToLand } = this.combatState;
        for (const airUnit of airUnitsToLand) {
          if (airUnit.landingOptions.length > 0) {
            // Select the closest landing option
            this.combatState.selectedLandings[airUnit.type] = airUnit.landingOptions[0].territory;
          }
        }
        this._confirmAirLandings();
      }
    }
  }

  _render() {
    if (!this.currentTerritory || !this.gameState || !this.combatState) return;

    const player = this.gameState.currentPlayer;
    const { attackers, defenders, phase, winner } = this.combatState;

    const defenderOwner = defenders[0]?.owner;
    const defenderPlayer = this.gameState.getPlayer(defenderOwner);

    const probability = this._calculateProbability();

    let html = `
      <div class="combat-content">
        <div class="combat-header">
          <div class="combat-title">Battle for ${this.currentTerritory}</div>
          <div class="combat-remaining">${this.gameState.combatQueue.length} battle(s) remaining</div>
        </div>

        <!-- Probability Bar -->
        <div class="probability-bar-container">
          <div class="prob-label attacker">${player.name} (${Math.round(probability)}%)</div>
          <div class="probability-bar">
            <div class="prob-fill attacker" style="width: ${probability}%; background: ${player.color}"></div>
            <div class="prob-fill defender" style="width: ${100 - probability}%; background: ${defenderPlayer?.color || '#888'}"></div>
            <div class="prob-marker" style="left: ${probability}%"></div>
          </div>
          <div class="prob-label defender">${defenderPlayer?.name || 'Defender'} (${Math.round(100 - probability)}%)</div>
        </div>

        <!-- Forces - Expanded View with Matching Unit Types -->
        <div class="combat-forces-header">
          <div class="force-header-col attacker" style="border-color: ${player.color}">
            <span class="force-name" style="color: ${player.color}">${player.name}</span>
            <span class="force-count">${this._getTotalUnits(attackers)} units</span>
          </div>
          <div class="force-header-col vs">VS</div>
          <div class="force-header-col defender" style="border-color: ${defenderPlayer?.color || '#888'}">
            <span class="force-name" style="color: ${defenderPlayer?.color || '#888'}">${defenderPlayer?.name || 'Unknown'}</span>
            <span class="force-count">${this._getTotalUnits(defenders)} units</span>
          </div>
        </div>

        <div class="combat-forces-expanded">
          ${this._renderExpandedForces(attackers, defenders, player, defenderPlayer)}
        </div>
    `;

    // Shore Bombardment section
    if (this.combatState.bombardmentRolls.length > 0) {
      if (phase === 'bombardment') {
        // Show bombardment ready to fire
        const shipCounts = {};
        for (const roll of this.combatState.bombardmentRolls) {
          shipCounts[roll.unit] = (shipCounts[roll.unit] || 0) + 1;
        }
        html += `
          <div class="bombardment-section">
            <div class="bombardment-title">⚓ Shore Bombardment</div>
            <div class="bombardment-desc">Naval support from adjacent sea zones</div>
            <div class="bombardment-ships">
              ${Object.entries(shipCounts).map(([unit, count]) =>
                `<span class="bombardment-ship">${count}× ${unit}</span>`
              ).join(', ')}
            </div>
          </div>
        `;
      } else if (this.combatState.bombardmentFired) {
        // Show bombardment results
        const { bombardmentRolls, bombardmentHits } = this.combatState;
        html += `
          <div class="bombardment-results">
            <div class="bombardment-result-header">⚓ Shore Bombardment: ${bombardmentHits} hit(s)</div>
            <div class="dice-display">
              ${bombardmentRolls.slice(0, 12).map(r =>
                `<div class="die ${r.hit ? 'hit' : 'miss'}" title="${r.unit} from ${r.source}">${r.roll}</div>`
              ).join('')}
              ${bombardmentRolls.length > 12 ? `<span class="dice-more">+${bombardmentRolls.length - 12}</span>` : ''}
            </div>
          </div>
        `;
      }
    }

    // AA Fire phase
    if (phase === 'aaFire') {
      html += `
        <div class="aa-fire-section">
          <div class="aa-title">Anti-Aircraft Fire</div>
          <div class="aa-desc">AA guns fire at attacking aircraft (hits on 1)</div>
        </div>
      `;
    }

    // AA Results
    if (this.combatState.aaFired && this.combatState.aaResults) {
      const { rolls, hits } = this.combatState.aaResults;
      html += `
        <div class="aa-results">
          <div class="aa-result-header">AA Fire Results: ${hits} hit(s)</div>
          <div class="dice-display">
            ${rolls.slice(0, 12).map(r => `<div class="die ${r.hit ? 'hit' : 'miss'}">${r.roll}</div>`).join('')}
            ${rolls.length > 12 ? `<span class="dice-more">+${rolls.length - 12}</span>` : ''}
          </div>
        </div>
      `;
    }

    // Select AA Casualties phase
    if (phase === 'selectAACasualties') {
      const { pendingAACasualties, selectedAACasualties } = this.combatState;
      const selectedTotal = this._getTotalSelectedCasualties(selectedAACasualties);
      html += `
        <div class="aa-casualty-selection">
          <div class="casualty-group attacker">
            <div class="casualty-header">
              <span class="casualty-title">Select ${pendingAACasualties} Aircraft to Lose (AA Fire)</span>
              <span class="casualty-count ${selectedTotal === pendingAACasualties ? 'complete' : 'incomplete'}">
                ${selectedTotal}/${pendingAACasualties}
              </span>
            </div>
            <div class="casualty-units">
              ${this._renderAACasualtyUnits()}
            </div>
          </div>
        </div>
      `;
    }

    // Select Bombardment Casualties phase
    if (phase === 'selectBombardmentCasualties') {
      const { pendingBombardmentCasualties, selectedBombardmentCasualties } = this.combatState;
      const selectedTotal = this._getTotalSelectedCasualties(selectedBombardmentCasualties);
      html += `
        <div class="bombardment-casualty-selection">
          <div class="casualty-group defender">
            <div class="casualty-header">
              <span class="casualty-title">Select ${pendingBombardmentCasualties} Defender Casualties (Shore Bombardment)</span>
              <span class="casualty-count ${selectedTotal === pendingBombardmentCasualties ? 'complete' : 'incomplete'}">
                ${selectedTotal}/${pendingBombardmentCasualties}
              </span>
            </div>
            <div class="casualty-units">
              ${this._renderBombardmentCasualtyUnits()}
            </div>
          </div>
        </div>
      `;
    }

    // Dice animation area
    if (phase === 'rolling') {
      html += `
        <div class="dice-section">
          <div class="dice-title">Rolling dice...</div>
          <div class="dice-animation"></div>
        </div>
      `;
    }

    // Show dice results
    if (this.lastRolls && phase === 'selectCasualties') {
      html += this._renderDiceResults();
    }

    // Casualty selection
    if (phase === 'selectCasualties') {
      html += this._renderCasualtySelection();
    }

    // Victory/defeat message with battle summary
    if (phase === 'resolved') {
      const { totalAttackerLosses, totalDefenderLosses,
              initialAttackers, initialDefenders } = this.combatState;

      html += `
        <div class="combat-result ${winner}">
          <div class="result-message">
            ${winner === 'attacker'
              ? `<span style="color: ${player.color}">${player.name}</span> captures ${this.currentTerritory}!`
              : `<span style="color: ${defenderPlayer?.color || '#888'}">${defenderPlayer?.name || 'Defender'}</span> holds ${this.currentTerritory}!`
            }
          </div>
        </div>

        <div class="battle-summary">
          <div class="battle-summary-header">Battle Summary</div>
          <div class="battle-summary-content">
            <div class="battle-summary-side attacker">
              <div class="summary-side-header" style="color: ${player.color}">
                ${player.name} Losses
              </div>
              ${this._renderLossSummary(totalAttackerLosses, initialAttackers, player.id)}
            </div>
            <div class="battle-summary-side defender">
              <div class="summary-side-header" style="color: ${defenderPlayer?.color || '#888'}">
                ${defenderPlayer?.name || 'Defender'} Losses
              </div>
              ${this._renderLossSummary(totalDefenderLosses, initialDefenders, defenderPlayer?.id)}
            </div>
          </div>
        </div>
      `;
    }

    // Air Landing phase - select where air units will land
    if (phase === 'airLanding') {
      const { airUnitsToLand, selectedLandings, isRetreating } = this.combatState;
      html += `
        <div class="air-landing-section">
          <div class="air-landing-header">
            <span class="air-landing-icon">✈️</span>
            <span class="air-landing-title">${isRetreating ? 'Retreat - ' : ''}Air Unit Landing Required</span>
          </div>
          <div class="air-landing-desc">
            ${isRetreating ? 'Your forces are retreating. ' : ''}Air units must land in a territory that was <strong>friendly at the start of your turn</strong>.
            Newly captured territories are NOT valid landing locations.
          </div>
      `;

      for (const airUnit of airUnitsToLand) {
        const def = this.unitDefs[airUnit.type];
        const imageSrc = player ? getUnitIconPath(airUnit.type, player.id) : null;
        const selectedDest = selectedLandings[airUnit.type];
        const hasOptions = airUnit.landingOptions.length > 0;

        // Get movement info for this unit
        const originInfo = this.gameState.airUnitOrigins[this.currentTerritory]?.[airUnit.type];
        const totalMovement = def?.movement || 4;
        const distanceTraveled = originInfo?.distance || 0;
        const remainingMovement = Math.max(0, totalMovement - distanceTraveled);

        html += `
          <div class="air-landing-unit ${!hasOptions ? 'no-options' : ''}">
            <div class="air-landing-unit-info">
              ${imageSrc ? `<img src="${imageSrc}" class="air-landing-icon" alt="${airUnit.type}">` : ''}
              <div class="air-landing-unit-details">
                <span class="air-landing-name">${airUnit.quantity}× ${airUnit.type}</span>
                <span class="air-landing-movement">Movement: ${remainingMovement}/${totalMovement} remaining</span>
              </div>
            </div>
            ${hasOptions ? `
              <select class="air-landing-select" data-unit="${airUnit.type}">
                <option value="">-- Select Landing --</option>
                ${airUnit.landingOptions.map(opt =>
                  `<option value="${opt.territory}" ${selectedDest === opt.territory ? 'selected' : ''}>
                    ${opt.territory} ${opt.isCarrier ? '🚢' : ''} (${opt.distance} away)
                  </option>`
                ).join('')}
              </select>
            ` : `
              <div class="air-landing-crash">
                <span class="crash-icon">💥</span>
                <span class="crash-text">No valid landing - Unit will CRASH!</span>
              </div>
            `}
          </div>
        `;
      }

      html += `</div>`;
    }

    // Actions
    html += `<div class="combat-actions">`;

    if (phase === 'bombardment') {
      html += `
        <button class="combat-btn roll" data-action="fire-bombardment">
          <span class="btn-icon">⚓</span> Fire Shore Bombardment
        </button>
      `;
    } else if (phase === 'selectBombardmentCasualties') {
      const { pendingBombardmentCasualties, selectedBombardmentCasualties } = this.combatState;
      const selectedTotal = this._getTotalSelectedCasualties(selectedBombardmentCasualties);
      const canConfirm = selectedTotal === pendingBombardmentCasualties;
      html += `
        <button class="combat-btn confirm" data-action="confirm-bombardment-casualties" ${!canConfirm ? 'disabled' : ''}>
          Confirm Bombardment Casualties
        </button>
      `;
    } else if (phase === 'aaFire') {
      html += `
        <button class="combat-btn roll" data-action="aa-fire">
          <span class="btn-icon">🎯</span> Fire AA Guns
        </button>
      `;
    } else if (phase === 'selectAACasualties') {
      const { pendingAACasualties, selectedAACasualties } = this.combatState;
      const selectedTotal = this._getTotalSelectedCasualties(selectedAACasualties);
      const canConfirm = selectedTotal === pendingAACasualties;
      html += `
        <button class="combat-btn confirm" data-action="confirm-aa-casualties" ${!canConfirm ? 'disabled' : ''}>
          Confirm AA Casualties
        </button>
      `;
    } else if (phase === 'ready') {
      html += `
        <button class="combat-btn roll" data-action="roll">
          <span class="btn-icon">🎲</span> Roll Dice
        </button>
        <button class="combat-btn auto" data-action="auto-battle">
          <span class="btn-icon">⚡</span> Auto Battle
        </button>
        <button class="combat-btn retreat" data-action="retreat">Retreat</button>
      `;
    } else if (phase === 'selectCasualties') {
      html += `
        <button class="combat-btn confirm" data-action="confirm-casualties">
          Confirm Casualties
        </button>
      `;
    } else if (phase === 'airLanding') {
      const { airUnitsToLand, selectedLandings } = this.combatState;
      const allSelected = airUnitsToLand.every(u =>
        u.landingOptions.length === 0 || selectedLandings[u.type]
      );
      html += `
        <button class="combat-btn confirm" data-action="confirm-landing" ${!allSelected ? 'disabled' : ''}>
          Confirm Landings
        </button>
      `;
    } else if (phase === 'resolved') {
      html += `
        <button class="combat-btn next" data-action="next">
          ${this.gameState.combatQueue.length > 1 ? 'Next Battle' : 'End Combat Phase'}
        </button>
      `;
    }

    html += `</div></div>`;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _renderExpandedForces(attackers, defenders, attackerPlayer, defenderPlayer) {
    // Get all unit types present in either army
    const allUnitTypes = new Set();
    attackers.forEach(u => { if (u.quantity > 0) allUnitTypes.add(u.type); });
    defenders.forEach(u => { if (u.quantity > 0) allUnitTypes.add(u.type); });

    if (allUnitTypes.size === 0) {
      return '<div class="no-units">No units remaining</div>';
    }

    // Sort unit types by cost (most expensive first for visual prominence)
    const sortedTypes = [...allUnitTypes].sort((a, b) => {
      const costA = this.unitDefs[a]?.cost || 0;
      const costB = this.unitDefs[b]?.cost || 0;
      return costB - costA;
    });

    return sortedTypes.map(unitType => {
      const attackerUnit = attackers.find(u => u.type === unitType);
      const defenderUnit = defenders.find(u => u.type === unitType);
      const def = this.unitDefs[unitType];

      // Get faction-specific icons
      const attackerIcon = attackerPlayer ? getUnitIconPath(unitType, attackerPlayer.id) : null;
      const defenderIcon = defenderPlayer ? getUnitIconPath(unitType, defenderPlayer.id) : null;

      const attackQty = attackerUnit?.quantity || 0;
      const defendQty = defenderUnit?.quantity || 0;

      return `
        <div class="combat-unit-row">
          <div class="combat-unit-side attacker ${attackQty > 0 ? '' : 'empty'}">
            ${attackQty > 0 ? `
              <div class="combat-unit-icons" style="--player-color: ${attackerPlayer.color}">
                ${attackerIcon ? `<img src="${attackerIcon}" class="combat-unit-icon" alt="${unitType}">` : ''}
                <span class="combat-unit-qty">${attackQty}</span>
              </div>
              <span class="combat-unit-stat">A${def?.attack || 0}</span>
            ` : ''}
          </div>
          <div class="combat-unit-type">
            <span class="combat-type-name">${unitType}</span>
          </div>
          <div class="combat-unit-side defender ${defendQty > 0 ? '' : 'empty'}">
            ${defendQty > 0 ? `
              <span class="combat-unit-stat">D${def?.defense || 0}</span>
              <div class="combat-unit-icons" style="--player-color: ${defenderPlayer?.color || '#888'}">
                <span class="combat-unit-qty">${defendQty}</span>
                ${defenderIcon ? `<img src="${defenderIcon}" class="combat-unit-icon" alt="${unitType}">` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Render loss summary for battle end display
  _renderLossSummary(losses, initialForces, playerId) {
    const lossEntries = Object.entries(losses || {});

    if (lossEntries.length === 0) {
      return '<div class="summary-no-losses">No losses</div>';
    }

    // Sort by unit cost (most expensive first)
    lossEntries.sort((a, b) => {
      const costA = this.unitDefs[a[0]]?.cost || 0;
      const costB = this.unitDefs[b[0]]?.cost || 0;
      return costB - costA;
    });

    // Calculate total IPC value lost
    const totalIpcLost = lossEntries.reduce((sum, [type, count]) => {
      const cost = this.unitDefs[type]?.cost || 0;
      return sum + (cost * count);
    }, 0);

    let html = '<div class="summary-losses">';
    for (const [type, count] of lossEntries) {
      const imageSrc = playerId ? getUnitIconPath(type, playerId) : null;
      const initial = initialForces?.find(u => u.type === type)?.quantity || 0;

      html += `
        <div class="summary-loss-item">
          ${imageSrc ? `<img src="${imageSrc}" class="summary-loss-icon" alt="${type}">` : ''}
          <span class="summary-loss-count">-${count}</span>
          <span class="summary-loss-type">${type}</span>
        </div>
      `;
    }
    html += '</div>';
    html += `<div class="summary-total-ipc">Total IPC lost: ${totalIpcLost}</div>`;

    return html;
  }

  _renderForceUnits(units, side) {
    if (units.length === 0 || this._getTotalUnits(units) === 0) {
      return '<div class="no-units">No units remaining</div>';
    }

    return units.filter(u => u.quantity > 0).map(u => {
      const def = this.unitDefs[u.type];
      const imageSrc = def?.image ? `assets/units/${def.image}` : null;
      const stat = side === 'attacker' ? def?.attack : def?.defense;

      return `
        <div class="combat-unit">
          ${imageSrc ? `<img src="${imageSrc}" class="combat-unit-icon" alt="${u.type}">` : ''}
          <span class="combat-unit-qty">×${u.quantity}</span>
          <span class="combat-unit-name">${u.type}</span>
          <span class="combat-unit-stat">${side === 'attacker' ? 'A' : 'D'}${stat || 0}</span>
        </div>
      `;
    }).join('');
  }

  _renderDiceResults() {
    const { attackRolls, defenseRolls, attackHits, defenseHits } = this.lastRolls;

    return `
      <div class="dice-results">
        <div class="dice-result-row">
          <span class="dice-result-label">Attack Hits:</span>
          <span class="dice-result-value hits">${attackHits}</span>
          <div class="dice-display">
            ${attackRolls.slice(0, 12).map(r => `<div class="die ${r.hit ? 'hit' : 'miss'}">${r.roll}</div>`).join('')}
            ${attackRolls.length > 12 ? `<span class="dice-more">+${attackRolls.length - 12}</span>` : ''}
          </div>
        </div>
        <div class="dice-result-row">
          <span class="dice-result-label">Defense Hits:</span>
          <span class="dice-result-value hits">${defenseHits}</span>
          <div class="dice-display">
            ${defenseRolls.slice(0, 12).map(r => `<div class="die ${r.hit ? 'hit' : 'miss'}">${r.roll}</div>`).join('')}
            ${defenseRolls.length > 12 ? `<span class="dice-more">+${defenseRolls.length - 12}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  _renderCasualtySelection() {
    const {
      attackers, defenders,
      pendingAttackerCasualties, pendingDefenderCasualties,
      selectedAttackerCasualties, selectedDefenderCasualties
    } = this.combatState;

    const attackerTotal = this._getTotalSelectedCasualties(selectedAttackerCasualties);
    const defenderTotal = this._getTotalSelectedCasualties(selectedDefenderCasualties);

    let html = `<div class="casualty-selection">`;

    // Attacker casualties (controlled by current player)
    if (pendingAttackerCasualties > 0) {
      html += `
        <div class="casualty-group attacker">
          <div class="casualty-header">
            <span class="casualty-title">Select ${pendingAttackerCasualties} Attacker Casualties</span>
            <span class="casualty-count ${attackerTotal === pendingAttackerCasualties ? 'complete' : 'incomplete'}">
              ${attackerTotal}/${pendingAttackerCasualties}
            </span>
          </div>
          <div class="casualty-units">
            ${this._renderCasualtyUnits(attackers, selectedAttackerCasualties, 'attacker')}
          </div>
        </div>
      `;
    }

    // Defender casualties (now also selectable)
    if (pendingDefenderCasualties > 0) {
      html += `
        <div class="casualty-group defender">
          <div class="casualty-header">
            <span class="casualty-title">Select ${pendingDefenderCasualties} Defender Casualties</span>
            <span class="casualty-count ${defenderTotal === pendingDefenderCasualties ? 'complete' : 'incomplete'}">
              ${defenderTotal}/${pendingDefenderCasualties}
            </span>
          </div>
          <div class="casualty-units">
            ${this._renderCasualtyUnits(defenders, selectedDefenderCasualties, 'defender')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  _renderCasualtyUnits(units, selected, side, readonly = false) {
    return units.filter(u => u.quantity > 0).map(u => {
      const def = this.unitDefs[u.type];
      // Use faction-specific icon
      const imageSrc = u.owner ? getUnitIconPath(u.type, u.owner) : (def?.image ? `assets/units/${def.image}` : null);
      const selectedCount = selected[u.type] || 0;

      return `
        <div class="casualty-unit ${selectedCount > 0 ? 'has-casualties' : ''}">
          <div class="casualty-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="${u.type}">` : ''}
            <span class="casualty-name">${u.type}</span>
            <span class="casualty-avail">(${u.quantity})</span>
          </div>
          ${!readonly ? `
            <div class="casualty-controls">
              <button class="casualty-btn minus" data-side="${side}" data-unit="${u.type}" ${selectedCount <= 0 ? 'disabled' : ''}>−</button>
              <span class="casualty-selected">${selectedCount}</span>
              <button class="casualty-btn plus" data-side="${side}" data-unit="${u.type}" ${selectedCount >= u.quantity ? 'disabled' : ''}>+</button>
            </div>
          ` : `
            <div class="casualty-controls readonly">
              <span class="casualty-selected">${selectedCount}</span>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  _renderAACasualtyUnits() {
    const { attackers, selectedAACasualties } = this.combatState;
    // Only show aircraft for AA casualties
    const airUnits = attackers.filter(u => {
      const def = this.unitDefs[u.type];
      return def && def.isAir && u.quantity > 0;
    });

    return airUnits.map(u => {
      const def = this.unitDefs[u.type];
      const imageSrc = u.owner ? getUnitIconPath(u.type, u.owner) : (def?.image ? `assets/units/${def.image}` : null);
      const selectedCount = selectedAACasualties[u.type] || 0;

      return `
        <div class="casualty-unit ${selectedCount > 0 ? 'has-casualties' : ''}">
          <div class="casualty-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="${u.type}">` : ''}
            <span class="casualty-name">${u.type}</span>
            <span class="casualty-avail">(${u.quantity})</span>
          </div>
          <div class="casualty-controls">
            <button class="casualty-btn minus" data-casualty-type="aa" data-unit="${u.type}" ${selectedCount <= 0 ? 'disabled' : ''}>−</button>
            <span class="casualty-selected">${selectedCount}</span>
            <button class="casualty-btn plus" data-casualty-type="aa" data-unit="${u.type}" ${selectedCount >= u.quantity ? 'disabled' : ''}>+</button>
          </div>
        </div>
      `;
    }).join('');
  }

  _renderBombardmentCasualtyUnits() {
    const { defenders, selectedBombardmentCasualties } = this.combatState;

    return defenders.filter(u => u.quantity > 0).map(u => {
      const def = this.unitDefs[u.type];
      const imageSrc = u.owner ? getUnitIconPath(u.type, u.owner) : (def?.image ? `assets/units/${def.image}` : null);
      const selectedCount = selectedBombardmentCasualties[u.type] || 0;

      return `
        <div class="casualty-unit ${selectedCount > 0 ? 'has-casualties' : ''}">
          <div class="casualty-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="${u.type}">` : ''}
            <span class="casualty-name">${u.type}</span>
            <span class="casualty-avail">(${u.quantity})</span>
          </div>
          <div class="casualty-controls">
            <button class="casualty-btn minus" data-casualty-type="bombardment" data-unit="${u.type}" ${selectedCount <= 0 ? 'disabled' : ''}>−</button>
            <span class="casualty-selected">${selectedCount}</span>
            <button class="casualty-btn plus" data-casualty-type="bombardment" data-unit="${u.type}" ${selectedCount >= u.quantity ? 'disabled' : ''}>+</button>
          </div>
        </div>
      `;
    }).join('');
  }

  _bindEvents() {
    // Action buttons
    this.el.querySelectorAll('.combat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;

        switch (action) {
          case 'fire-bombardment':
            this._fireBombardment();
            break;
          case 'confirm-bombardment-casualties':
            this._applyBombardmentCasualties();
            break;
          case 'aa-fire':
            this._rollAAFire();
            break;
          case 'confirm-aa-casualties':
            this._applyAACasualties();
            break;
          case 'roll':
            await this._animateDiceRoll();
            break;
          case 'auto-battle':
            await this._autoBattle();
            break;
          case 'retreat':
            this._retreat();
            break;
          case 'confirm-casualties':
            this._applyCasualties();
            break;
          case 'confirm-landing':
            this._confirmAirLandings();
            break;
          case 'next':
            this._finalizeCombat();
            this._nextCombat();
            break;
        }
      });
    });

    // Air landing select dropdowns
    this.el.querySelectorAll('.air-landing-select').forEach(select => {
      select.addEventListener('change', () => {
        const unitType = select.dataset.unit;
        const destination = select.value;
        this.combatState.selectedLandings[unitType] = destination;
        this._render();
      });
    });

    // Casualty selection buttons
    this.el.querySelectorAll('.casualty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.dataset.side;
        const casualtyType = btn.dataset.casualtyType;
        const unitType = btn.dataset.unit;
        const delta = btn.classList.contains('plus') ? 1 : -1;

        if (casualtyType === 'aa') {
          this._adjustAACasualty(unitType, delta);
        } else if (casualtyType === 'bombardment') {
          this._adjustBombardmentCasualty(unitType, delta);
        } else {
          this._adjustCasualty(side, unitType, delta);
        }
      });
    });
  }

  _adjustAACasualty(unitType, delta) {
    const { attackers, pendingAACasualties, selectedAACasualties } = this.combatState;

    // Only aircraft can be AA casualties
    const unit = attackers.find(u => u.type === unitType);
    if (!unit) return;

    const current = selectedAACasualties[unitType] || 0;
    const newValue = Math.max(0, Math.min(unit.quantity, current + delta));

    // Check we don't exceed required casualties
    const currentTotal = this._getTotalSelectedCasualties(selectedAACasualties);
    const newTotal = currentTotal - current + newValue;

    if (newTotal <= pendingAACasualties) {
      selectedAACasualties[unitType] = newValue;
      this._render();
    }
  }

  _adjustBombardmentCasualty(unitType, delta) {
    const { defenders, pendingBombardmentCasualties, selectedBombardmentCasualties } = this.combatState;

    const unit = defenders.find(u => u.type === unitType);
    if (!unit) return;

    const current = selectedBombardmentCasualties[unitType] || 0;
    const newValue = Math.max(0, Math.min(unit.quantity, current + delta));

    // Check we don't exceed required casualties
    const currentTotal = this._getTotalSelectedCasualties(selectedBombardmentCasualties);
    const newTotal = currentTotal - current + newValue;

    if (newTotal <= pendingBombardmentCasualties) {
      selectedBombardmentCasualties[unitType] = newValue;
      this._render();
    }
  }

  _adjustCasualty(side, unitType, delta) {
    const {
      attackers, defenders,
      pendingAttackerCasualties, pendingDefenderCasualties,
      selectedAttackerCasualties, selectedDefenderCasualties
    } = this.combatState;

    // Determine which side we're adjusting
    const units = side === 'attacker' ? attackers : defenders;
    const pendingCasualties = side === 'attacker' ? pendingAttackerCasualties : pendingDefenderCasualties;
    const selectedCasualties = side === 'attacker' ? selectedAttackerCasualties : selectedDefenderCasualties;

    const unit = units.find(u => u.type === unitType);
    if (!unit) return;

    const current = selectedCasualties[unitType] || 0;
    const newValue = Math.max(0, Math.min(unit.quantity, current + delta));

    // Check we don't exceed required casualties
    const currentTotal = this._getTotalSelectedCasualties(selectedCasualties);
    const newTotal = currentTotal - current + newValue;

    if (newTotal <= pendingCasualties) {
      selectedCasualties[unitType] = newValue;
      this._render();
    }
  }

  _retreat() {
    // Retreating attacker - air units still need to select landing locations
    // Set retreat flag so air landing knows not to finalize combat
    this.combatState.isRetreating = true;

    // Check for air landing BEFORE removing from queue
    this._checkAirLanding();

    // If air landing is required, render and wait for confirmation
    if (this.combatState.phase === 'airLanding') {
      // Don't remove from queue yet - will be done after air landing confirmed
      this._render();
    } else {
      // No air units to land - remove from combat queue and proceed
      this.gameState.combatQueue = this.gameState.combatQueue.filter(t => t !== this.currentTerritory);
      this.gameState._notify();
      this._nextCombat();
    }
  }

  _nextCombat() {
    if (this.gameState.combatQueue.length > 0) {
      this.currentTerritory = this.gameState.combatQueue[0];
      this._initCombatState();
      this._render();
      // Make sure popup is visible for next combat
      this.el.classList.remove('hidden');
    } else {
      this.hide();
      if (this.onCombatComplete) {
        this.onCombatComplete();
      }
    }
  }
}
