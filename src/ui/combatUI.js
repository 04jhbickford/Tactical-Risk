// Enhanced combat resolution UI with dice animation, probability, and casualty selection

import { getUnitIconPath } from '../utils/unitIcons.js';

export class CombatUI {
  constructor() {
    this.gameState = null;
    this.unitDefs = null;
    this.actionLog = null;
    this.onCombatComplete = null;
    this.onCombatStart = null; // Callback when a combat starts (for camera centering)
    this.onAirLandingRequired = null; // Callback when air landing phase starts

    this.currentTerritory = null;
    this.combatState = null; // { attackers, defenders, phase, pendingCasualties }
    this.diceAnimation = null;
    this.lastRolls = null;
    this.cardAwarded = null;
    this.isMinimized = false;

    this._create();
  }

  setOnAirLandingRequired(callback) {
    this.onAirLandingRequired = callback;
  }

  setOnCombatStart(callback) {
    this.onCombatStart = callback;
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

  setOnAllCombatsResolved(callback) {
    this.onAllCombatsResolved = callback;
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

    // Notify main.js to center camera on combat territory
    if (this.onCombatStart) {
      this.onCombatStart(this.currentTerritory);
    }
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

    // Exclude factories from combat - they are captured, not destroyed
    const defenders = units
      .filter(u => u.owner !== player.id && !this.gameState.areAllies(player.id, u.owner) && u.type !== 'factory')
      .map(u => ({ ...u }));

    // Check for AA guns and attacking aircraft
    const aaGuns = defenders.filter(u => u.type === 'aaGun');
    const attackingAir = attackers.filter(u => {
      const def = this.unitDefs[u.type];
      return def && def.isAir;
    });

    // A&A Submarine Rules: Check for submarines and destroyers
    const attackerSubs = attackers.filter(u => u.type === 'submarine');
    const defenderSubs = defenders.filter(u => u.type === 'submarine');
    const attackerHasDestroyer = attackers.some(u => u.type === 'destroyer');
    const defenderHasDestroyer = defenders.some(u => u.type === 'destroyer');
    // Submarines have first strike if opposing side has no destroyer
    const attackerSubsHaveFirstStrike = attackerSubs.length > 0 && !defenderHasDestroyer;
    const defenderSubsHaveFirstStrike = defenderSubs.length > 0 && !attackerHasDestroyer;
    const hasSubmarineFirstStrike = attackerSubsHaveFirstStrike || defenderSubsHaveFirstStrike;

    // Calculate shore bombardment for amphibious assaults
    const bombardmentResult = this._calculateBombardment();

    // Determine initial phase - check bombardment, AA fire, submarine first strike, then ready
    let initialPhase = 'ready';
    if (bombardmentResult.rolls.length > 0) {
      initialPhase = 'bombardment';
    } else if (aaGuns.length > 0 && attackingAir.length > 0) {
      initialPhase = 'aaFire';
    } else if (hasSubmarineFirstStrike) {
      initialPhase = 'submarineFirstStrike';
    }

    // Check if submarines should auto-submerge (facing only air units)
    const attackerHasOnlyAir = attackers.length > 0 && attackers.every(u => this.unitDefs[u.type]?.isAir);
    const defenderHasOnlyAir = defenders.filter(u => u.type !== 'aaGun').length > 0 &&
      defenders.filter(u => u.type !== 'aaGun').every(u => this.unitDefs[u.type]?.isAir);

    // Track submerged submarines (they exit combat but stay in the zone)
    const attackerSubsCanSubmerge = attackerSubs.length > 0 && !defenderHasDestroyer;
    const defenderSubsCanSubmerge = defenderSubs.length > 0 && !attackerHasDestroyer;

    this.combatState = {
      attackers,
      defenders,
      phase: initialPhase,
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
      // A&A Submarine rules tracking
      attackerSubsHaveFirstStrike,
      defenderSubsHaveFirstStrike,
      hasSubmarineFirstStrike,
      submarineFirstStrikeFired: false,
      // Submarine submerge tracking
      attackerSubsCanSubmerge,
      defenderSubsCanSubmerge,
      attackerSubmergedSubs: 0, // Count of submerged attacking subs
      defenderSubmergedSubs: 0, // Count of submerged defending subs
      attackerHasOnlyAir,
      defenderHasOnlyAir,
      // Track submarine hits in regular combat (can't hit air)
      attackerSubHits: 0,
      defenderSubHits: 0,
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
    // A&A Rule: Shore bombardment ONLY occurs during amphibious assaults (units from transports)
    const player = this.gameState.currentPlayer;
    const territory = this.currentTerritory;
    const hits = [];
    const rolls = [];

    // Check if this is a land territory
    const t = this.gameState.territoryByName[territory];
    if (!t || t.isWater) return { hits: 0, rolls: [] };

    // Shore bombardment only allowed when units are amphibiously assaulting (came from transports)
    if (!this.gameState.hasAmphibiousAssault(territory)) {
      return { hits: 0, rolls: [] };
    }

    // Find adjacent sea zones with friendly ships that can bombard
    const connections = t.connections || [];
    for (const connName of connections) {
      const connT = this.gameState.territoryByName[connName];
      if (!connT?.isWater) continue;

      // A&A Anniversary Rule: Check if sea zone is cleared (no enemy naval units)
      // Shore bombardment only allowed from sea zones where naval battle was already won
      // or there were no enemy naval units to begin with
      if (!this.gameState.isSeaZoneClearedForBombardment(connName)) {
        continue; // Cannot bombard from contested sea zones
      }

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
    const { selectedBombardmentCasualties, totalDefenderLosses } = this.combatState;

    // A&A Anniversary Rule: Bombardment casualties fire back in the first combat round
    // Store the selected casualties but don't remove them yet - they will be removed
    // after the first round of combat along with regular combat casualties
    this.combatState.pendingBombardmentLosses = { ...selectedBombardmentCasualties };

    // Track total losses for battle summary (they will definitely die)
    for (const [type, count] of Object.entries(selectedBombardmentCasualties)) {
      totalDefenderLosses[type] = (totalDefenderLosses[type] || 0) + count;
    }

    this.combatState.bombardmentApplied = true;
    // Units are NOT removed here - they will fire back in combat and be removed after first round

    this._proceedAfterBombardment();
    this._render();
  }

  _proceedAfterBombardment() {
    // Move to next phase (AA fire, submarine first strike, or ready)
    if (this.combatState.hasAA) {
      this.combatState.phase = 'aaFire';
    } else if (this.combatState.hasSubmarineFirstStrike && !this.combatState.submarineFirstStrikeFired) {
      this.combatState.phase = 'submarineFirstStrike';
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
      // A&A Submarine Rules: Check for submarine first strike before regular combat
      if (this.combatState.hasSubmarineFirstStrike && !this.combatState.submarineFirstStrikeFired) {
        this.combatState.phase = 'submarineFirstStrike';
      } else {
        this.combatState.phase = 'ready';
      }
    } else if (this._getTotalUnits(this.combatState.attackers) === 0) {
      this.combatState.phase = 'resolved';
      this.combatState.winner = 'defender';
    } else {
      // Only AA guns left defending - attacker wins
      this.combatState.phase = 'resolved';
      this.combatState.winner = 'attacker';
    }
  }

  // A&A Submarine Rules: Submerge submarines (they exit combat but stay in zone)
  _submergeSub(side, count) {
    const { attackers, defenders, attackerSubmergedSubs, defenderSubmergedSubs, phase } = this.combatState;

    let subsToSubmerge = 0;

    if (side === 'attacker') {
      const attackerSubCount = attackers.filter(u => u.type === 'submarine').reduce((s, u) => s + u.quantity, 0);

      if (count === 'all') {
        subsToSubmerge = attackerSubCount;
        this.combatState.attackerSubmergedSubs = attackerSubCount;
      } else {
        subsToSubmerge = Math.min(count, attackerSubCount - attackerSubmergedSubs);
        this.combatState.attackerSubmergedSubs = Math.min(attackerSubmergedSubs + count, attackerSubCount);
      }
    } else if (side === 'defender') {
      const defenderSubCount = defenders.filter(u => u.type === 'submarine').reduce((s, u) => s + u.quantity, 0);

      if (count === 'all') {
        subsToSubmerge = defenderSubCount;
        this.combatState.defenderSubmergedSubs = defenderSubCount;
      } else {
        subsToSubmerge = Math.min(count, defenderSubCount - defenderSubmergedSubs);
        this.combatState.defenderSubmergedSubs = Math.min(defenderSubmergedSubs + count, defenderSubCount);
      }
    }

    // If in ready phase (regular combat), immediately remove submerged subs
    if (phase === 'ready' && subsToSubmerge > 0) {
      this._removeSubmergedSubs(side, subsToSubmerge);
      // Reset the counter since we've already removed them
      if (side === 'attacker') {
        this.combatState.attackerSubmergedSubs = 0;
      } else {
        this.combatState.defenderSubmergedSubs = 0;
      }
    }

    this._render();
  }

  // A&A Submarine Rules: Roll submarine first strike
  _rollSubmarineFirstStrike() {
    const { attackers, defenders, attackerSubsHaveFirstStrike, defenderSubsHaveFirstStrike,
            attackerSubmergedSubs, defenderSubmergedSubs,
            totalAttackerLosses, totalDefenderLosses } = this.combatState;

    const subFirstStrikeRolls = [];
    let attackerSubHits = 0;
    let defenderSubHits = 0;

    // Attacking submarines roll first strike (if defender has no destroyer)
    // Only non-submerged subs fire
    if (attackerSubsHaveFirstStrike) {
      const attackerSubs = attackers.filter(u => u.type === 'submarine');
      const totalAttackerSubs = attackerSubs.reduce((s, u) => s + u.quantity, 0);
      const activeSubs = totalAttackerSubs - (attackerSubmergedSubs || 0);

      // Roll for active (non-submerged) subs only
      for (let i = 0; i < activeSubs; i++) {
        const def = this.unitDefs['submarine'];
        const roll = Math.floor(Math.random() * 6) + 1;
        const hit = roll <= def.attack;
        subFirstStrikeRolls.push({ roll, hit, unitType: 'submarine', side: 'attacker' });
        if (hit) attackerSubHits++;
      }

      // Remove submerged subs from combat (they stay in the zone but exit battle)
      if (attackerSubmergedSubs > 0) {
        this._removeSubmergedSubs('attacker', attackerSubmergedSubs);
      }
    }

    // Defending submarines roll first strike (if attacker has no destroyer)
    // Only non-submerged subs fire
    if (defenderSubsHaveFirstStrike) {
      const defenderSubs = defenders.filter(u => u.type === 'submarine');
      const totalDefenderSubs = defenderSubs.reduce((s, u) => s + u.quantity, 0);
      const activeSubs = totalDefenderSubs - (defenderSubmergedSubs || 0);

      // Roll for active (non-submerged) subs only
      for (let i = 0; i < activeSubs; i++) {
        const def = this.unitDefs['submarine'];
        const roll = Math.floor(Math.random() * 6) + 1;
        const hit = roll <= def.defense;
        subFirstStrikeRolls.push({ roll, hit, unitType: 'submarine', side: 'defender' });
        if (hit) defenderSubHits++;
      }

      // Remove submerged subs from combat (they stay in the zone but exit battle)
      if (defenderSubmergedSubs > 0) {
        this._removeSubmergedSubs('defender', defenderSubmergedSubs);
      }
    }

    this.combatState.subFirstStrikeRolls = subFirstStrikeRolls;
    this.combatState.pendingSubFirstStrikeAttackerCasualties = defenderSubHits; // Attacker takes hits from defender subs
    this.combatState.pendingSubFirstStrikeDefenderCasualties = attackerSubHits; // Defender takes hits from attacker subs
    this.combatState.submarineFirstStrikeFired = true;

    // If there are casualties to select, go to casualty selection
    if (attackerSubHits > 0 || defenderSubHits > 0) {
      // First strike casualties don't fire back - apply immediately with auto-selection
      this._applySubmarineFirstStrikeCasualties();
    } else {
      this.combatState.phase = 'ready';
    }

    this._render();
  }

  // Apply submarine first strike casualties (they don't fire back)
  // Remove submerged submarines from combat (they stay in the sea zone)
  _removeSubmergedSubs(side, count) {
    const units = side === 'attacker' ? this.combatState.attackers : this.combatState.defenders;
    const subUnit = units.find(u => u.type === 'submarine');
    if (subUnit && count > 0) {
      // Store submerged subs to be restored to the zone after combat
      if (!this.combatState.submergedSubsToRestore) {
        this.combatState.submergedSubsToRestore = { attacker: 0, defender: 0 };
      }
      this.combatState.submergedSubsToRestore[side] += count;

      // Remove from combat (reduce quantity)
      subUnit.quantity = Math.max(0, subUnit.quantity - count);
      if (subUnit.quantity === 0) {
        if (side === 'attacker') {
          this.combatState.attackers = this.combatState.attackers.filter(u => u.type !== 'submarine');
        } else {
          this.combatState.defenders = this.combatState.defenders.filter(u => u.type !== 'submarine');
        }
      }
    }
  }

  _applySubmarineFirstStrikeCasualties() {
    const { attackers, defenders, pendingSubFirstStrikeAttackerCasualties,
            pendingSubFirstStrikeDefenderCasualties, totalAttackerLosses, totalDefenderLosses } = this.combatState;

    // Apply attacker casualties from defender submarines (non-sub, non-air units only)
    if (pendingSubFirstStrikeAttackerCasualties > 0) {
      const nonSubAttackers = attackers.filter(u => u.type !== 'submarine' && !this.unitDefs[u.type]?.isAir);
      const selected = this._selectCheapestCasualties(nonSubAttackers, pendingSubFirstStrikeAttackerCasualties);
      for (const [type, count] of Object.entries(selected)) {
        // Handle battleship damage specially
        if (type === 'battleship_damage') {
          const battleship = attackers.find(u => u.type === 'battleship');
          if (battleship) {
            battleship.damaged = true;
            battleship.damagedCount = (battleship.damagedCount || 0) + count;
          }
          continue;
        }
        const unit = attackers.find(u => u.type === type);
        if (unit) {
          unit.quantity -= count;
          totalAttackerLosses[type] = (totalAttackerLosses[type] || 0) + count;
        }
      }
    }

    // Apply defender casualties from attacker submarines (non-sub, non-air units only)
    if (pendingSubFirstStrikeDefenderCasualties > 0) {
      const nonSubDefenders = defenders.filter(u => u.type !== 'submarine' && !this.unitDefs[u.type]?.isAir);
      const selected = this._selectCheapestCasualties(nonSubDefenders, pendingSubFirstStrikeDefenderCasualties);
      for (const [type, count] of Object.entries(selected)) {
        // Handle battleship damage specially
        if (type === 'battleship_damage') {
          const battleship = defenders.find(u => u.type === 'battleship');
          if (battleship) {
            battleship.damaged = true;
            battleship.damagedCount = (battleship.damagedCount || 0) + count;
          }
          continue;
        }
        const unit = defenders.find(u => u.type === type);
        if (unit) {
          unit.quantity -= count;
          totalDefenderLosses[type] = (totalDefenderLosses[type] || 0) + count;
        }
      }
    }

    // Remove dead units
    this.combatState.attackers = attackers.filter(u => u.quantity > 0);
    this.combatState.defenders = defenders.filter(u => u.quantity > 0);

    // Check if combat should continue
    if (this._getTotalUnits(this.combatState.attackers) === 0) {
      this.combatState.phase = 'resolved';
      this.combatState.winner = 'defender';
    } else if (this._getTotalUnits(this.combatState.defenders.filter(u => u.type !== 'aaGun')) === 0) {
      this.combatState.phase = 'resolved';
      this.combatState.winner = 'attacker';
    } else {
      this.combatState.phase = 'ready';
    }

    this._render();
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
    const attackerId = this.gameState.currentPlayer?.id;
    const defenderId = defenders[0]?.owner;

    // Roll for attackers
    const attackRolls = [];
    let attackHits = 0;

    // Artillery support: Count artillery for infantry bonus (1:1 ratio)
    const artilleryCount = attackers.filter(u => u.type === 'artillery')
      .reduce((sum, u) => sum + u.quantity, 0);
    let supportedInfantry = artilleryCount; // Number of infantry that get +1 attack

    // Check attacker technologies
    const hasJets = attackerId && this.gameState.hasTech(attackerId, 'jets');
    const hasSuperSubs = attackerId && this.gameState.hasTech(attackerId, 'superSubs');
    const hasHeavyBombers = attackerId && this.gameState.hasTech(attackerId, 'heavyBombers');

    for (const unit of attackers) {
      const def = this.unitDefs[unit.type];
      if (!def) continue;

      // Heavy Bombers: Bombers roll 2 dice each
      const dicePerUnit = (unit.type === 'bomber' && hasHeavyBombers) ? 2 : 1;

      for (let i = 0; i < unit.quantity; i++) {
        for (let d = 0; d < dicePerUnit; d++) {
          let attackValue = def.attack;

          // Artillery support: Infantry gets +1 attack when paired with artillery (1:1 ratio)
          if (unit.type === 'infantry' && supportedInfantry > 0 && d === 0) {
            attackValue += 1; // Infantry attack 1 -> 2
            supportedInfantry--;
          }

          // Jets technology: Fighters +1 attack
          if (unit.type === 'fighter' && hasJets) {
            attackValue += 1;
          }

          // Super Submarines: Submarines +1 attack
          if (unit.type === 'submarine' && hasSuperSubs) {
            attackValue += 1;
          }

          const roll = Math.floor(Math.random() * 6) + 1;
          const hit = roll <= attackValue;
          attackRolls.push({ roll, hit, unitType: unit.type, attackValue });
          if (hit) attackHits++;
        }
      }
    }

    // Roll for defenders
    const defenseRolls = [];
    let defenseHits = 0;

    // Check defender technologies
    const defenderHasJets = defenderId && this.gameState.hasTech(defenderId, 'jets');

    for (const unit of defenders) {
      const def = this.unitDefs[unit.type];
      if (!def) continue;
      for (let i = 0; i < unit.quantity; i++) {
        let defenseValue = def.defense;

        // Jets technology: Fighters +1 defense
        if (unit.type === 'fighter' && defenderHasJets) {
          defenseValue += 1;
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        const hit = roll <= defenseValue;
        defenseRolls.push({ roll, hit, unitType: unit.type, defenseValue });
        if (hit) defenseHits++;
      }
    }

    // Track submarine hits separately (subs can only hit sea units, not air)
    const attackerSubHits = attackRolls.filter(r => r.unitType === 'submarine' && r.hit).length;
    const defenderSubHits = defenseRolls.filter(r => r.unitType === 'submarine' && r.hit).length;

    // Store sub hits for casualty selection (defender takes attacker sub hits, etc.)
    this.combatState.attackerSubHits = attackerSubHits;
    this.combatState.defenderSubHits = defenderSubHits;

    this.lastRolls = { attackRolls, defenseRolls, attackHits, defenseHits, attackerSubHits, defenderSubHits };
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
    // A&A Rule: Submarine hits can only be assigned to sea units, not air units
    const { attackers, defenders, pendingAttackerCasualties, pendingDefenderCasualties,
            attackerSubHits, defenderSubHits } = this.combatState;

    // Attacker casualties: defenderSubHits must go to non-air units
    this.combatState.selectedAttackerCasualties = this._selectCasualtiesWithSubHits(
      attackers, pendingAttackerCasualties, defenderSubHits || 0
    );

    // Defender casualties: attackerSubHits must go to non-air units
    this.combatState.selectedDefenderCasualties = this._selectCasualtiesWithSubHits(
      defenders, pendingDefenderCasualties, attackerSubHits || 0
    );
  }

  // Select casualties accounting for submarine hits (which can't hit air)
  _selectCasualtiesWithSubHits(units, totalHits, subHits) {
    if (subHits === 0 || totalHits === 0) {
      return this._selectCheapestCasualties(units, totalHits);
    }

    // First, assign submarine hits to non-air sea units only
    const seaUnits = units.filter(u => {
      const def = this.unitDefs[u.type];
      return def && def.isSea && !def.isAir && u.quantity > 0;
    });

    const subCasualties = this._selectCheapestCasualties(seaUnits, subHits);

    // Calculate remaining non-sub hits
    const nonSubHits = totalHits - subHits;
    if (nonSubHits <= 0) {
      return subCasualties;
    }

    // For remaining hits, select from all units (including air)
    // But account for units already selected as sub casualties
    const remainingUnits = units.map(u => {
      const alreadyTaken = subCasualties[u.type] || 0;
      return { ...u, quantity: u.quantity - alreadyTaken };
    }).filter(u => u.quantity > 0);

    const nonSubCasualties = this._selectCheapestCasualties(remainingUnits, nonSubHits);

    // Merge the two selections
    const merged = { ...subCasualties };
    for (const [type, count] of Object.entries(nonSubCasualties)) {
      merged[type] = (merged[type] || 0) + count;
    }

    return merged;
  }

  _selectCheapestCasualties(units, count) {
    // A&A Anniversary Rule: Transports are defenseless and cannot be taken as casualties
    // They are automatically destroyed when all other combat units are eliminated
    // Factories are captured, not destroyed - exclude from casualties
    // Default casualty priority: cheapest units first, then battleship damage (which is free)
    const selected = {};
    let remaining = count;

    // Get battleships for later
    const battleships = units.filter(u => u.type === 'battleship' && u.quantity > 0);

    // First, destroy cheapest units by IPC cost (excluding battleships, transports, factories)
    const sorted = [...units]
      .filter(u => u.quantity > 0 && u.type !== 'transport' && u.type !== 'factory' && u.type !== 'battleship')
      .sort((a, b) => {
        const costA = this.unitDefs[a.type]?.cost || 999;
        const costB = this.unitDefs[b.type]?.cost || 999;
        return costA - costB;
      });

    for (const unit of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(unit.quantity, remaining);
      selected[unit.type] = take;
      remaining -= take;
    }

    // Then, damage undamaged battleships (2-hit system - this absorbs hits for free)
    for (const battleship of battleships) {
      if (remaining <= 0) break;
      const def = this.unitDefs[battleship.type];
      if (def?.hp > 1) {
        // Count undamaged battleships
        const undamaged = battleship.quantity - (battleship.damagedCount || 0);
        if (undamaged > 0) {
          const toDamage = Math.min(undamaged, remaining);
          selected['battleship_damage'] = (selected['battleship_damage'] || 0) + toDamage;
          remaining -= toDamage;
        }
      }
    }

    // Then, destroy damaged battleships
    for (const battleship of battleships) {
      if (remaining <= 0) break;
      const damagedCount = battleship.damagedCount || 0;
      if (damagedCount > 0) {
        const toDestroy = Math.min(damagedCount, remaining);
        selected['battleship'] = (selected['battleship'] || 0) + toDestroy;
        remaining -= toDestroy;
      }
    }

    // Finally, destroy remaining undamaged battleships if still hits left
    if (remaining > 0) {
      for (const battleship of battleships) {
        if (remaining <= 0) break;
        const undamaged = battleship.quantity - (battleship.damagedCount || 0) - (selected['battleship_damage'] || 0);
        if (undamaged > 0) {
          const toDestroy = Math.min(undamaged, remaining);
          selected['battleship'] = (selected['battleship'] || 0) + toDestroy;
          remaining -= toDestroy;
        }
      }
    }

    return selected;
  }

  _getTotalSelectedCasualties(selected) {
    return Object.values(selected).reduce((sum, n) => sum + n, 0);
  }

  _confirmAirLandings() {
    const player = this.gameState.currentPlayer;
    const { airUnitsToLand, selectedLandings, attackers } = this.combatState;

    // Group landings by destination to batch moves of same unit type
    const landingsByDest = {}; // { destination: { unitType: quantity } }
    const crashes = {}; // { unitType: quantity }

    // Check if current territory was friendly at turn start (valid to stay)
    const friendlyAtStart = this.gameState.friendlyTerritoriesAtTurnStart || new Set();
    const canStayInCurrent = friendlyAtStart.has(this.currentTerritory);

    // Process each air unit landing (now individually tracked by ID)
    for (const airUnit of airUnitsToLand) {
      // Use unit ID for individual tracking (allows same type to land at different locations)
      const unitKey = airUnit.id || airUnit.type;
      const destination = selectedLandings[unitKey];

      if (airUnit.landingOptions.length === 0) {
        // No valid landing - unit crashes
        crashes[airUnit.type] = (crashes[airUnit.type] || 0) + airUnit.quantity;
        console.log(`${airUnit.type} crashed - no valid landing location`);
      } else if (destination && destination !== this.currentTerritory) {
        // Track this landing to another territory
        if (!landingsByDest[destination]) {
          landingsByDest[destination] = {};
        }
        landingsByDest[destination][airUnit.type] =
          (landingsByDest[destination][airUnit.type] || 0) + airUnit.quantity;
      } else if (destination === this.currentTerritory && canStayInCurrent) {
        // Explicitly selected current territory and it's valid - unit stays
        // (do nothing, unit remains in attackers)
      } else if (!destination && canStayInCurrent) {
        // No selection made but current territory is valid - unit stays
        // (do nothing, unit remains in attackers)
      } else {
        // No valid destination selected and cannot stay in current territory - crash!
        crashes[airUnit.type] = (crashes[airUnit.type] || 0) + airUnit.quantity;
        console.log(`${airUnit.type} crashed - no landing selected and cannot stay in captured territory`);
      }
    }

    // Apply crashes - reduce attacker quantities
    for (const [unitType, crashCount] of Object.entries(crashes)) {
      const attackerUnit = attackers.find(u => u.type === unitType);
      if (attackerUnit) {
        attackerUnit.quantity = Math.max(0, attackerUnit.quantity - crashCount);
      }
    }

    // Apply landings - move units from attackers to destinations
    for (const [destination, unitTypes] of Object.entries(landingsByDest)) {
      for (const [unitType, quantity] of Object.entries(unitTypes)) {
        // Remove from attackers
        const attackerUnit = attackers.find(u => u.type === unitType);
        if (attackerUnit) {
          attackerUnit.quantity = Math.max(0, attackerUnit.quantity - quantity);
        }

        // Check if landing on carrier (sea zone destination)
        const destT = this.gameState.territoryByName[destination];
        if (destT?.isWater) {
          // Land on carrier - add to carrier's aircraft array ONLY (not as standalone unit)
          const seaUnits = this.gameState.units[destination] || [];
          const carriers = seaUnits.filter(u => u.type === 'carrier' && u.owner === player.id);
          const carrierDef = this.unitDefs.carrier;

          let remainingToAdd = quantity;
          for (const carrier of carriers) {
            if (remainingToAdd <= 0) break;
            carrier.aircraft = carrier.aircraft || [];
            const capacity = (carrierDef?.aircraftCapacity || 2) - carrier.aircraft.length;
            const toAdd = Math.min(remainingToAdd, capacity);
            for (let i = 0; i < toAdd; i++) {
              carrier.aircraft.push({ type: unitType, owner: player.id });
            }
            remainingToAdd -= toAdd;
          }
        } else {
          // Land on land territory - add as standalone unit
          const destUnits = this.gameState.units[destination] || [];
          const existing = destUnits.find(u => u.type === unitType && u.owner === player.id);
          if (existing) {
            existing.quantity += quantity;
            existing.moved = true;
          } else {
            destUnits.push({
              type: unitType,
              quantity: quantity,
              owner: player.id,
              moved: true
            });
          }
          this.gameState.units[destination] = destUnits;
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

    let unitIdCounter = 0;
    for (const unit of attackers) {
      const def = this.unitDefs[unit.type];
      if (!def?.isAir || unit.quantity <= 0) continue;

      // Get valid landing options (only territories friendly at turn start)
      const landingOptions = this.gameState.getAirLandingOptions(territory, unit.type, this.unitDefs);

      // Expand each unit into individual entries for separate landing selection
      // This allows 2x fighters to be sent to different territories
      for (let i = 0; i < unit.quantity; i++) {
        airUnitsToLand.push({
          id: `${unit.type}_${unitIdCounter++}`,
          type: unit.type,
          quantity: 1, // Each entry is now a single unit
          landingOptions: landingOptions,
        });
      }
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

  _applyAirLandings_unused(landings, crashes, originTerritory) {
    // This method is no longer used - keeping for reference
    const player = this.gameState.currentPlayer;
    const units = this.gameState.getUnitsAt(originTerritory) || [];

    // Process landings
    for (const [unitKey, destTerritory] of Object.entries(landings)) {
      // unitKey format: "fighter_0", "bomber_1", etc.
      const unitType = unitKey.split('_')[0];

      // Find and remove unit from origin
      const unitIdx = units.findIndex(u => u.type === unitType && u.owner === player.id && (u.quantity || 1) > 0);
      if (unitIdx >= 0) {
        const unit = units[unitIdx];
        if ((unit.quantity || 1) <= 1) {
          units.splice(unitIdx, 1);
        } else {
          unit.quantity--;
        }

        // Add to destination
        this.gameState.addUnit(destTerritory, unitType, player.id, 1);
      }
    }

    // Process crashes
    for (const unitKey of crashes) {
      const unitType = unitKey.split('_')[0];
      const unitIdx = units.findIndex(u => u.type === unitType && u.owner === player.id && (u.quantity || 1) > 0);
      if (unitIdx >= 0) {
        const unit = units[unitIdx];
        if ((unit.quantity || 1) <= 1) {
          units.splice(unitIdx, 1);
        } else {
          unit.quantity--;
        }
      }
    }

    this.gameState.units[originTerritory] = units.filter(u => (u.quantity || 1) > 0);
  }

  _applyCasualties() {
    const { attackers, defenders, selectedAttackerCasualties, selectedDefenderCasualties,
            totalAttackerLosses, totalDefenderLosses, pendingBombardmentLosses } = this.combatState;

    // Apply attacker casualties and track total losses
    for (const [type, count] of Object.entries(selectedAttackerCasualties)) {
      // Handle battleship damage specially
      if (type === 'battleship_damage') {
        const battleship = attackers.find(u => u.type === 'battleship');
        if (battleship) {
          battleship.damaged = true;
          battleship.damagedCount = (battleship.damagedCount || 0) + count;
        }
        continue;
      }
      const unit = attackers.find(u => u.type === type);
      if (unit) {
        unit.quantity -= count;
        // Track total losses for battle summary
        totalAttackerLosses[type] = (totalAttackerLosses[type] || 0) + count;
      }
    }

    // Apply defender casualties and track total losses
    for (const [type, count] of Object.entries(selectedDefenderCasualties)) {
      // Handle battleship damage specially
      if (type === 'battleship_damage') {
        const battleship = defenders.find(u => u.type === 'battleship');
        if (battleship) {
          battleship.damaged = true;
          battleship.damagedCount = (battleship.damagedCount || 0) + count;
        }
        continue;
      }
      const unit = defenders.find(u => u.type === type);
      if (unit) {
        unit.quantity -= count;
        // Track total losses for battle summary
        totalDefenderLosses[type] = (totalDefenderLosses[type] || 0) + count;
      }
    }

    // A&A Anniversary Rule: Apply pending bombardment casualties after first round
    // Bombardment casualties fired back in combat, now they die (losses already tracked)
    if (pendingBombardmentLosses) {
      for (const [type, count] of Object.entries(pendingBombardmentLosses)) {
        const unit = defenders.find(u => u.type === type);
        if (unit) {
          unit.quantity -= count;
          // Losses were already tracked when bombardment was applied
        }
      }
      // Clear pending bombardment losses - only applied once (first round)
      this.combatState.pendingBombardmentLosses = null;
    }

    // Remove dead units
    this.combatState.attackers = attackers.filter(u => u.quantity > 0);
    this.combatState.defenders = defenders.filter(u => u.quantity > 0);

    // A&A Anniversary Rule: Transports are defenseless
    // Check if all non-transport units are destroyed - transports are then auto-destroyed
    const attackerCombatUnits = this.combatState.attackers.filter(u => u.type !== 'transport');
    const defenderCombatUnits = this.combatState.defenders.filter(u => u.type !== 'transport');

    // Auto-destroy transports if no combat units remain
    if (attackerCombatUnits.length === 0 && this.combatState.attackers.length > 0) {
      // Attacker only has transports left - they are destroyed
      for (const transport of this.combatState.attackers.filter(u => u.type === 'transport')) {
        totalAttackerLosses['transport'] = (totalAttackerLosses['transport'] || 0) + transport.quantity;
      }
      this.combatState.attackers = [];
    }
    if (defenderCombatUnits.length === 0 && this.combatState.defenders.length > 0) {
      // Defender only has transports left - they are destroyed
      for (const transport of this.combatState.defenders.filter(u => u.type === 'transport')) {
        totalDefenderLosses['transport'] = (totalDefenderLosses['transport'] || 0) + transport.quantity;
      }
      this.combatState.defenders = [];
    }

    // IMMEDIATE UPDATE: Sync casualties to gameState so map updates in real-time
    this._syncCombatStateToGame();

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

  // Sync current combat state to gameState.units for real-time map updates
  _syncCombatStateToGame() {
    if (!this.currentTerritory) return;

    // Build units array from current combat state
    const units = [];

    // Add surviving attackers
    for (const unit of this.combatState.attackers) {
      if (unit.quantity > 0) {
        units.push({ ...unit });
      }
    }

    // Add surviving defenders
    for (const unit of this.combatState.defenders) {
      if (unit.quantity > 0) {
        units.push({ ...unit });
      }
    }

    // IMPORTANT: Preserve factories - they are NOT part of combat (excluded from defenders)
    // They will be captured/transferred during _finalizeCombat()
    const existingUnits = this.gameState.units[this.currentTerritory] || [];
    const factory = existingUnits.find(u => u.type === 'factory');
    if (factory) {
      units.push({ ...factory });
    }

    // Update gameState and trigger re-render
    this.gameState.units[this.currentTerritory] = units;
    this.gameState._notify();
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

    // Only add surviving defenders if defender won
    // If attacker won, ALL defender units are destroyed (including AA guns)
    if (this.combatState.winner !== 'attacker') {
      for (const unit of this.combatState.defenders) {
        if (unit.quantity > 0) {
          units.push({ ...unit });
        }
      }
    }

    // Handle factory and AA gun capture - transfer ownership to attacker (A&A Anniversary rules)
    if (this.combatState.winner === 'attacker') {
      const existingUnits = this.gameState.units[this.currentTerritory] || [];
      // Capture factories
      const factory = existingUnits.find(u => u.type === 'factory');
      if (factory) {
        units.push({ ...factory, owner: player.id });
      }
      // Capture AA guns (they have 0 combat value, so they're captured not destroyed)
      const aaGuns = existingUnits.filter(u => u.type === 'aaGun' && u.owner !== player.id);
      for (const aa of aaGuns) {
        units.push({ ...aa, owner: player.id });
      }
    }

    // Restore submerged submarines to the zone (they exited combat but stay in the zone)
    const submergedSubs = this.combatState.submergedSubsToRestore;
    if (submergedSubs) {
      if (submergedSubs.attacker > 0) {
        // Find existing attacker sub unit or create one
        const existingSub = units.find(u => u.type === 'submarine' && u.owner === player.id);
        if (existingSub) {
          existingSub.quantity += submergedSubs.attacker;
        } else {
          units.push({ type: 'submarine', owner: player.id, quantity: submergedSubs.attacker, moved: true });
        }
      }
      if (submergedSubs.defender > 0) {
        // Find existing defender sub unit or create one
        const existingSub = units.find(u => u.type === 'submarine' && u.owner === previousOwner);
        if (existingSub) {
          existingSub.quantity += submergedSubs.defender;
        } else {
          units.push({ type: 'submarine', owner: previousOwner, quantity: submergedSubs.defender });
        }
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

    // A&A Rule: If this was a naval battle and the attacker LOST, cancel dependent amphibious assaults
    // Units that unloaded from transports are destroyed (go down with the transport)
    const t = this.gameState.territoryByName[this.currentTerritory];
    if (t?.isWater) {
      // This was a naval battle - mark the sea zone
      this.gameState.markSeaZoneCleared(this.currentTerritory);

      if (this.combatState.winner === 'defender') {
        // Attacker lost the naval battle - cancel all dependent amphibious assaults
        const dependentAssaults = this.gameState.getAmphibiousAssaultsFromSeaZone(this.currentTerritory);
        for (const landTerritory of dependentAssaults) {
          const result = this.gameState.cancelAmphibiousAssault(landTerritory);
          if (result.cancelled) {
            console.log(`Amphibious assault to ${landTerritory} cancelled - naval battle lost`);
            // Log the cancellation
            if (this.actionLog) {
              const player = this.gameState.currentPlayer;
              this.actionLog.add({
                type: 'combat-cancelled',
                data: {
                  territory: landTerritory,
                  reason: 'Naval battle lost',
                  unitsDestroyed: result.destroyedUnits,
                  color: player?.color
                }
              });
            }
          }
        }
      }
    }

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
      // A&A Submarine Rules: Handle submarine first strike phase
      if (this.combatState.phase === 'submarineFirstStrike') {
        this._rollSubmarineFirstStrike();
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
            // Select the closest landing option (use unit ID for individual tracking)
            const unitKey = airUnit.id || airUnit.type;
            this.combatState.selectedLandings[unitKey] = airUnit.landingOptions[0].territory;
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
          <div class="combat-title">⚔ ${this.currentTerritory}</div>
          <button class="left-modal-minimize-btn" data-action="toggle-minimize" title="${this.isMinimized ? 'Expand' : 'Minimize'}">${this.isMinimized ? '□' : '—'}</button>
        </div>

        <!-- Phase Progress Indicator -->
        ${this._renderPhaseIndicator(phase)}

        <!-- Compact Probability Bar -->
        <div class="probability-bar-compact">
          <span class="prob-name" style="color: ${player.color}">${player.name}</span>
          <div class="probability-bar">
            <div class="prob-fill attacker" style="width: ${probability}%; background: ${player.color}"></div>
            <div class="prob-fill defender" style="width: ${100 - probability}%; background: ${defenderPlayer?.color || '#888'}"></div>
          </div>
          <span class="prob-name" style="color: ${defenderPlayer?.color || '#888'}">${defenderPlayer?.name || 'Defender'}</span>
        </div>

        <!-- Forces - Compact Header -->
        <div class="combat-forces-header compact">
          <div class="force-header-col attacker" style="border-color: ${player.color}">
            <span class="force-count" style="color: ${player.color}">${this._getTotalUnits(attackers)} units</span>
          </div>
          <div class="force-header-col vs">VS</div>
          <div class="force-header-col defender" style="border-color: ${defenderPlayer?.color || '#888'}">
            <span class="force-count" style="color: ${defenderPlayer?.color || '#888'}">${this._getTotalUnits(defenders)} units</span>
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
      } else if (this.combatState.bombardmentFired && phase === 'selectBombardmentCasualties') {
        // Show bombardment results only during casualty selection phase
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

    // AA Results - only show during casualty selection phase (like bombardment)
    if (this.combatState.aaFired && this.combatState.aaResults && phase === 'selectAACasualties') {
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
      const { pendingBombardmentCasualties, selectedBombardmentCasualties, defenders } = this.combatState;
      const selectedTotal = this._getTotalSelectedCasualties(selectedBombardmentCasualties);
      const maxAvailable = this._getTotalUnits(defenders);
      const effectiveCasualties = Math.min(pendingBombardmentCasualties, maxAvailable);
      const isComplete = selectedTotal === pendingBombardmentCasualties || selectedTotal === maxAvailable;
      html += `
        <div class="bombardment-casualty-selection">
          <div class="casualty-group defender">
            <div class="casualty-header">
              <span class="casualty-title">Select ${effectiveCasualties} Defender Casualties (Shore Bombardment)</span>
              <span class="casualty-count ${isComplete ? 'complete' : 'incomplete'}">
                ${selectedTotal}/${effectiveCasualties}
              </span>
              ${pendingBombardmentCasualties > maxAvailable ? `<span class="casualty-overflow">(${pendingBombardmentCasualties - maxAvailable} wasted)</span>` : ''}
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

    // Casualty selection (hits-to-assign counter is shown in each side's header)
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

      for (let i = 0; i < airUnitsToLand.length; i++) {
        const airUnit = airUnitsToLand[i];
        const def = this.unitDefs[airUnit.type];
        const imageSrc = player ? getUnitIconPath(airUnit.type, player.id) : null;
        // Use unit ID for individual tracking (allows same type to land at different locations)
        const unitKey = airUnit.id || airUnit.type;
        const selectedDest = selectedLandings[unitKey];
        const hasOptions = airUnit.landingOptions.length > 0;

        // Get movement info for this unit
        const originInfo = this.gameState.airUnitOrigins[this.currentTerritory]?.[airUnit.type];
        const totalMovement = def?.movement || 4;
        const distanceTraveled = originInfo?.distance || 0;
        const remainingMovement = Math.max(0, totalMovement - distanceTraveled);

        // Display unit number if there are multiple of same type (e.g., "Fighter #1", "Fighter #2")
        const sameTypeUnits = airUnitsToLand.filter(u => u.type === airUnit.type);
        const unitIndex = sameTypeUnits.indexOf(airUnit) + 1;
        const displayName = sameTypeUnits.length > 1
          ? `${airUnit.type} #${unitIndex}`
          : `${airUnit.quantity}× ${airUnit.type}`;

        html += `
          <div class="air-landing-unit ${!hasOptions ? 'no-options' : ''}">
            <div class="air-landing-unit-info">
              ${imageSrc ? `<img src="${imageSrc}" class="air-landing-icon" alt="${airUnit.type}">` : ''}
              <div class="air-landing-unit-details">
                <span class="air-landing-name">${displayName}</span>
                <span class="air-landing-movement">Movement: ${remainingMovement}/${totalMovement} remaining</span>
              </div>
            </div>
            ${hasOptions ? `
              <select class="air-landing-select" data-unit="${unitKey}">
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
      const { pendingBombardmentCasualties, selectedBombardmentCasualties, defenders } = this.combatState;
      const selectedTotal = this._getTotalSelectedCasualties(selectedBombardmentCasualties);
      const maxAvailable = this._getTotalUnits(defenders);
      // Can confirm if all casualties selected OR if all defenders are selected (when hits > defenders)
      const canConfirm = selectedTotal === pendingBombardmentCasualties || selectedTotal === maxAvailable;
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
    } else if (phase === 'submarineFirstStrike') {
      // A&A Submarine Rules: Submarine First Strike with Submerge Option
      const { attackerSubsHaveFirstStrike, defenderSubsHaveFirstStrike,
              attackerSubsCanSubmerge, defenderSubsCanSubmerge,
              attackerSubmergedSubs, defenderSubmergedSubs, attackers, defenders } = this.combatState;

      const attackerSubCount = attackers.filter(u => u.type === 'submarine').reduce((s, u) => s + u.quantity, 0);
      const defenderSubCount = defenders.filter(u => u.type === 'submarine').reduce((s, u) => s + u.quantity, 0);

      const subDesc = [];
      if (attackerSubsHaveFirstStrike) subDesc.push('Attacking subs');
      if (defenderSubsHaveFirstStrike) subDesc.push('Defending subs');

      html += `
        <div class="submarine-strike-section">
          <div class="submarine-info" style="margin-bottom: 10px; color: #aaa; font-size: 12px; text-align: center;">
            🚢 ${subDesc.join(' and ')} have first strike (enemy has no destroyer)
          </div>

          <div class="submarine-options" style="display: flex; flex-direction: column; gap: 10px;">`;

      // Attacker submarine options
      if (attackerSubsHaveFirstStrike && attackerSubCount > 0) {
        const activeSubs = attackerSubCount - attackerSubmergedSubs;
        html += `
          <div class="sub-option-group" style="background: rgba(76,175,80,0.1); padding: 8px; border-radius: 4px; border-left: 3px solid #4caf50;">
            <div style="font-weight: bold; color: #4caf50; margin-bottom: 6px;">Attacking Submarines (${activeSubs} active${attackerSubmergedSubs > 0 ? `, ${attackerSubmergedSubs} submerged` : ''})</div>
            ${attackerSubsCanSubmerge && activeSubs > 0 ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="combat-btn submerge" data-action="submerge-sub" data-side="attacker" style="flex: 1;">
                  🌊 Submerge 1 Sub
                </button>
                ${activeSubs > 1 ? `
                  <button class="combat-btn submerge" data-action="submerge-all-subs" data-side="attacker" style="flex: 1;">
                    🌊 Submerge All (${activeSubs})
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>`;
      }

      // Defender submarine options
      if (defenderSubsHaveFirstStrike && defenderSubCount > 0) {
        const activeSubs = defenderSubCount - defenderSubmergedSubs;
        html += `
          <div class="sub-option-group" style="background: rgba(244,67,54,0.1); padding: 8px; border-radius: 4px; border-left: 3px solid #f44336;">
            <div style="font-weight: bold; color: #f44336; margin-bottom: 6px;">Defending Submarines (${activeSubs} active${defenderSubmergedSubs > 0 ? `, ${defenderSubmergedSubs} submerged` : ''})</div>
            ${defenderSubsCanSubmerge && activeSubs > 0 ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="combat-btn submerge" data-action="submerge-sub" data-side="defender" style="flex: 1;">
                  🌊 Submerge 1 Sub
                </button>
                ${activeSubs > 1 ? `
                  <button class="combat-btn submerge" data-action="submerge-all-subs" data-side="defender" style="flex: 1;">
                    🌊 Submerge All (${activeSubs})
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>`;
      }

      html += `
          </div>

          <div style="text-align: center; margin-top: 12px;">
            <button class="combat-btn roll" data-action="submarine-first-strike">
              🔱 Fire First Strike (Remaining Subs)
            </button>
          </div>
        </div>
      `;
    } else if (phase === 'ready') {
      // Check if submarines can submerge during this round
      const { attackerSubsCanSubmerge, defenderSubsCanSubmerge, attackers, defenders } = this.combatState;
      const attackerSubs = attackers.filter(u => u.type === 'submarine').reduce((s, u) => s + u.quantity, 0);
      const defenderSubs = defenders.filter(u => u.type === 'submarine').reduce((s, u) => s + u.quantity, 0);

      // Show submerge option if subs can submerge (no enemy destroyer)
      if ((attackerSubsCanSubmerge && attackerSubs > 0) || (defenderSubsCanSubmerge && defenderSubs > 0)) {
        html += `<div class="submarine-submerge-options" style="margin-bottom: 10px; padding: 8px; background: rgba(100,149,237,0.1); border-radius: 4px;">`;
        html += `<div style="font-size: 11px; color: #6495ED; margin-bottom: 6px;">🚢 Submarines can submerge instead of fighting:</div>`;
        html += `<div style="display: flex; gap: 8px; flex-wrap: wrap;">`;

        if (attackerSubsCanSubmerge && attackerSubs > 0) {
          html += `<button class="combat-btn submerge small" data-action="submerge-all-subs" data-side="attacker">
            🌊 Submerge Attacking (${attackerSubs})
          </button>`;
        }
        if (defenderSubsCanSubmerge && defenderSubs > 0) {
          html += `<button class="combat-btn submerge small" data-action="submerge-all-subs" data-side="defender">
            🌊 Submerge Defending (${defenderSubs})
          </button>`;
        }

        html += `</div></div>`;
      }

      html += `
        <button class="combat-btn roll" data-action="roll">
          <span class="btn-icon">🎲</span> Roll Dice
        </button>
        <button class="combat-btn auto" data-action="auto-battle">
          <span class="btn-icon">⚡</span> Auto Battle
        </button>
        <button class="combat-btn retreat" data-action="retreat">Retreat</button>
      `;
    } else if (phase === 'selectRetreat') {
      // Select retreat destination (A&A rule: all units go to one territory)
      const { retreatOptions } = this.combatState;
      html += `
        <div class="retreat-selection">
          <div class="retreat-header">Select Retreat Destination</div>
          <div class="retreat-options">
            ${retreatOptions.map(dest => `
              <button class="combat-btn retreat-dest-btn" data-action="confirm-retreat" data-destination="${dest}">
                ${dest}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (phase === 'selectCasualties') {
      // Validate casualty selection is complete
      const { attackers, defenders, pendingAttackerCasualties, pendingDefenderCasualties,
              selectedAttackerCasualties, selectedDefenderCasualties } = this.combatState;
      const attackerTotal = this._getTotalSelectedCasualties(selectedAttackerCasualties);
      const defenderTotal = this._getTotalSelectedCasualties(selectedDefenderCasualties);
      const attackerMax = this._getMaxAbsorbableCasualties(attackers);
      const defenderMax = this._getMaxAbsorbableCasualties(defenders);
      const effectiveAttacker = Math.min(pendingAttackerCasualties, attackerMax);
      const effectiveDefender = Math.min(pendingDefenderCasualties, defenderMax);
      const canConfirm = attackerTotal >= effectiveAttacker && defenderTotal >= effectiveDefender;
      html += `
        <button class="combat-btn confirm" data-action="confirm-casualties" ${!canConfirm ? 'disabled' : ''}>
          Confirm Casualties
        </button>
      `;
    } else if (phase === 'airLanding') {
      const { airUnitsToLand, selectedLandings } = this.combatState;
      // Use unit ID for individual tracking (allows same type to land at different locations)
      const allSelected = airUnitsToLand.every(u => {
        const unitKey = u.id || u.type;
        return u.landingOptions.length === 0 || selectedLandings[unitKey];
      });
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
    // Get dice rolls if available (for inline display)
    const diceRolls = this.lastRolls;
    const showDice = diceRolls && this.combatState.phase === 'selectCasualties';

    // Group dice rolls by unit type if available
    const attackDiceByType = {};
    const defenseDiceByType = {};
    if (showDice) {
      for (const r of diceRolls.attackRolls || []) {
        if (!attackDiceByType[r.unitType]) attackDiceByType[r.unitType] = [];
        attackDiceByType[r.unitType].push(r);
      }
      for (const r of diceRolls.defenseRolls || []) {
        if (!defenseDiceByType[r.unitType]) defenseDiceByType[r.unitType] = [];
        defenseDiceByType[r.unitType].push(r);
      }
    }

    // Helper to render inline dice
    const renderInlineDice = (rolls) => {
      if (!rolls || rolls.length === 0) return '';
      const hits = rolls.filter(r => r.hit).length;
      return `
        <div class="inline-dice-group">
          <div class="inline-dice">
            ${rolls.slice(0, 8).map(r => `<span class="die-mini ${r.hit ? 'hit' : 'miss'}">${r.roll}</span>`).join('')}
            ${rolls.length > 8 ? `<span class="dice-overflow">+${rolls.length - 8}</span>` : ''}
          </div>
          <span class="inline-dice-hits ${hits > 0 ? 'has-hits' : ''}">${hits} hit${hits !== 1 ? 's' : ''}</span>
        </div>
      `;
    };

    // Get all unit types present in either army
    const allUnitTypes = new Set();
    attackers.forEach(u => { if (u.quantity > 0) allUnitTypes.add(u.type); });
    defenders.forEach(u => { if (u.quantity > 0) allUnitTypes.add(u.type); });

    if (allUnitTypes.size === 0) {
      return '<div class="no-units">No units remaining</div>';
    }

    // Calculate artillery support pairing for attackers
    const attackerArtillery = attackers.find(u => u.type === 'artillery')?.quantity || 0;
    const attackerInfantry = attackers.find(u => u.type === 'infantry')?.quantity || 0;
    const pairedCount = Math.min(attackerArtillery, attackerInfantry);
    const extraInfantry = attackerInfantry - pairedCount;
    const extraArtillery = attackerArtillery - pairedCount;

    // Build custom sorted list: paired units first, then other units
    let html = '';

    // Render paired Infantry + Artillery first (if any)
    if (pairedCount > 0) {
      const infantryIcon = attackerPlayer ? getUnitIconPath('infantry', attackerPlayer.id) : null;
      const artilleryIcon = attackerPlayer ? getUnitIconPath('artillery', attackerPlayer.id) : null;
      const infantryDef = this.unitDefs['infantry'];
      const artilleryDef = this.unitDefs['artillery'];

      // Get dice for supported infantry (attack value 2) and artillery
      const supportedInfDice = showDice ? (diceRolls.attackRolls || []).filter(r => r.unitType === 'infantry' && r.attackValue === 2) : [];
      const artilleryDice = showDice ? attackDiceByType['artillery'] || [] : [];
      const pairedDice = [...supportedInfDice, ...artilleryDice];

      html += `
        <div class="combat-unit-row ${showDice ? 'with-dice' : ''}">
          <div class="combat-unit-side attacker ${showDice ? 'with-dice' : ''}">
            ${showDice ? renderInlineDice(pairedDice) : ''}
            <div class="combat-unit-icons paired-icons" style="--player-color: ${attackerPlayer.color}">
              <span class="combat-unit-qty">${pairedCount}</span>
              ${infantryIcon ? `<img src="${infantryIcon}" class="combat-unit-icon" alt="infantry" title="Infantry (supported): Attack 2">` : ''}
              ${artilleryIcon ? `<img src="${artilleryIcon}" class="combat-unit-icon" alt="artillery" title="Artillery: Attack 2">` : ''}
            </div>
            <span class="combat-unit-stat supported">A2</span>
          </div>
          <div class="combat-unit-type">
            <span class="combat-type-name">Inf + Art</span>
          </div>
          <div class="combat-unit-side defender empty"></div>
        </div>`;
    }

    // Sort remaining unit types by attack strength (highest probability on top)
    const sortedTypes = [...allUnitTypes].sort((a, b) => {
      const attackA = this.unitDefs[a]?.attack || 0;
      const attackB = this.unitDefs[b]?.attack || 0;
      // Use attack value as primary sort, cost as secondary (for equal attack)
      if (attackA !== attackB) return attackB - attackA;
      const costA = this.unitDefs[a]?.cost || 0;
      const costB = this.unitDefs[b]?.cost || 0;
      return costB - costA;
    });

    for (const unitType of sortedTypes) {
      // Skip infantry and artillery if they're fully paired
      if (unitType === 'infantry' && extraInfantry <= 0 && pairedCount > 0) continue;
      if (unitType === 'artillery' && extraArtillery <= 0 && pairedCount > 0) continue;

      const attackerUnit = attackers.find(u => u.type === unitType);
      const defenderUnit = defenders.find(u => u.type === unitType);
      const def = this.unitDefs[unitType];

      // Get faction-specific icons
      const attackerIcon = attackerPlayer ? getUnitIconPath(unitType, attackerPlayer.id) : null;
      const defenderIcon = defenderPlayer ? getUnitIconPath(unitType, defenderPlayer.id) : null;

      let attackQty = attackerUnit?.quantity || 0;
      const defendQty = defenderUnit?.quantity || 0;

      // Adjust for unpaired infantry/artillery
      if (unitType === 'infantry' && pairedCount > 0) {
        attackQty = extraInfantry;
      }
      if (unitType === 'artillery' && pairedCount > 0) {
        attackQty = extraArtillery;
      }

      // Get dice for this unit type (excluding paired infantry which was handled above)
      let attackerDice = [];
      let defenderDice = [];
      if (showDice) {
        if (unitType === 'infantry' && pairedCount > 0) {
          // Only unsupported infantry dice (attack value 1)
          attackerDice = (diceRolls.attackRolls || []).filter(r => r.unitType === 'infantry' && r.attackValue === 1);
        } else if (unitType === 'artillery' && pairedCount > 0) {
          // Artillery dice already shown in paired row
          attackerDice = [];
        } else {
          attackerDice = attackDiceByType[unitType] || [];
        }
        defenderDice = defenseDiceByType[unitType] || [];
      }

      // Build attacker HTML
      let attackerHtml = '';
      if (attackQty > 0) {
        const attackValue = def?.attack || 0;

        attackerHtml = `
          <div class="combat-unit-side attacker ${showDice ? 'with-dice' : ''}">
            ${showDice ? renderInlineDice(attackerDice) : ''}
            <div class="combat-unit-icons" style="--player-color: ${attackerPlayer.color}">
              <span class="combat-unit-qty">${attackQty}</span>
              ${attackerIcon ? `<img src="${attackerIcon}" class="combat-unit-icon" alt="${unitType}">` : ''}
            </div>
            <span class="combat-unit-stat">A${attackValue}</span>
          </div>`;
      } else {
        attackerHtml = `<div class="combat-unit-side attacker empty"></div>`;
      }

      // Only show row if there are units on either side
      if (attackQty > 0 || defendQty > 0) {
        const rowLabel = unitType === 'infantry' && pairedCount > 0 && extraInfantry > 0 ? ' (unpaired)' : '';
        const artilleryLabel = unitType === 'artillery' && pairedCount > 0 && extraArtillery > 0 ? ' (unpaired)' : '';

        html += `
          <div class="combat-unit-row ${showDice ? 'with-dice' : ''}">
            ${attackerHtml}
            <div class="combat-unit-type">
              <span class="combat-type-name">${unitType}${rowLabel}${artilleryLabel}</span>
            </div>
            <div class="combat-unit-side defender ${defendQty > 0 ? '' : 'empty'} ${showDice ? 'with-dice' : ''}">
              ${defendQty > 0 ? `
                <span class="combat-unit-stat">D${def?.defense || 0}</span>
                <div class="combat-unit-icons" style="--player-color: ${defenderPlayer?.color || '#888'}">
                  ${defenderIcon ? `<img src="${defenderIcon}" class="combat-unit-icon" alt="${unitType}">` : ''}
                  <span class="combat-unit-qty">${defendQty}</span>
                </div>
                ${showDice ? renderInlineDice(defenderDice) : ''}
              ` : ''}
            </div>
          </div>
        `;
      }
    }

    return html || '<div class="no-units">No units remaining</div>';
  }

  // Render compact hits summary below forces (dice are inline above)
  _renderHitsSummary() {
    if (!this.lastRolls) return '';

    const { attackHits, defenseHits } = this.lastRolls;
    const player = this.gameState.currentPlayer;
    const defenderOwner = this.combatState.defenders[0]?.owner;
    const defenderPlayer = this.gameState.getPlayer(defenderOwner);

    return `
      <div class="hits-summary">
        <div class="hits-side attacker" style="--side-color: ${player.color}">
          <span class="hits-label">${player.name}</span>
          <span class="hits-count ${attackHits > 0 ? 'has-hits' : ''}">${attackHits} hit${attackHits !== 1 ? 's' : ''}</span>
        </div>
        <div class="hits-divider">vs</div>
        <div class="hits-side defender" style="--side-color: ${defenderPlayer?.color || '#888'}">
          <span class="hits-count ${defenseHits > 0 ? 'has-hits' : ''}">${defenseHits} hit${defenseHits !== 1 ? 's' : ''}</span>
          <span class="hits-label">${defenderPlayer?.name || 'Defender'}</span>
        </div>
      </div>
    `;
  }

  // Render phase progress indicator
  _renderPhaseIndicator(currentPhase) {
    // Check if this is an amphibious assault
    const isAmphibious = this.gameState.hasAmphibiousAssault(this.currentTerritory);

    // Define the possible phases in order
    const phases = [
      { id: 'amphibious', label: 'Amphibious', icon: '🚢' },
      { id: 'bombardment', label: 'Bombardment', icon: '⚓' },
      { id: 'aaFire', label: 'AA Fire', icon: '🎯' },
      { id: 'submarineFirstStrike', label: 'Sub Strike', icon: '🔱' },
      { id: 'ready', label: 'Combat', icon: '⚔️' },
      { id: 'selectCasualties', label: 'Casualties', icon: '💀' },
      { id: 'resolved', label: 'Result', icon: '🏆' },
    ];

    // Find which phases are active in this battle
    const { bombardmentRolls, hasAA, hasSubmarineFirstStrike } = this.combatState;
    const activePhases = phases.filter(p => {
      if (p.id === 'amphibious') return isAmphibious;
      if (p.id === 'bombardment') return bombardmentRolls?.length > 0;
      if (p.id === 'aaFire' || p.id === 'selectAACasualties') return hasAA;
      if (p.id === 'submarineFirstStrike') return hasSubmarineFirstStrike;
      return true;
    });

    // Map current phase to display phase
    let displayPhase = currentPhase;
    if (currentPhase === 'selectBombardmentCasualties') displayPhase = 'bombardment';
    if (currentPhase === 'selectAACasualties') displayPhase = 'aaFire';

    const currentIdx = activePhases.findIndex(p => p.id === displayPhase);

    return `
      <div class="combat-phase-indicator">
        ${activePhases.map((p, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = i === currentIdx;
          return `
            <div class="phase-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}">
              <span class="phase-icon">${p.icon}</span>
              <span class="phase-label">${p.label}</span>
            </div>
          `;
        }).join('<span class="phase-connector">›</span>')}
      </div>
    `;
  }

  _renderLossSummary(losses, initialForces, playerId) {
    const lossEntries = Object.entries(losses || {});

    if (lossEntries.length === 0) {
      return '<div class="summary-no-losses">✓ No losses</div>';
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

    // Visual icon-based display with crossed-out icons
    let html = '<div class="summary-losses-visual">';
    for (const [type, count] of lossEntries) {
      const imageSrc = playerId ? getUnitIconPath(type, playerId) : null;

      html += `
        <div class="summary-loss-unit">
          <div class="loss-icon-wrapper">
            ${imageSrc ? `<img src="${imageSrc}" class="summary-loss-icon crossed" alt="${type}">` : ''}
            <span class="loss-x">✕</span>
          </div>
          <span class="loss-count">×${count}</span>
        </div>
      `;
    }
    html += '</div>';
    html += `<div class="summary-ipc-badge">-${totalIpcLost} IPCs</div>`;

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
      const hitRange = stat > 0 ? (stat === 1 ? '1' : `1-${stat}`) : '-';

      return `
        <div class="combat-unit">
          ${imageSrc ? `<img src="${imageSrc}" class="combat-unit-icon" alt="${u.type}" title="${u.type}: Attack ${def?.attack || 0}, Defense ${def?.defense || 0}, Cost ${def?.cost || 0}">` : ''}
          <span class="combat-unit-qty">×${u.quantity}</span>
          <span class="combat-unit-name">${u.type}</span>
          <span class="combat-unit-stat" title="Hits on ${hitRange}">
            ${side === 'attacker' ? '⚔' : '🛡'}${stat || 0}
          </span>
        </div>
      `;
    }).join('');
  }

  _renderDiceResults() {
    const { attackRolls, defenseRolls, attackHits, defenseHits } = this.lastRolls;
    const player = this.gameState.currentPlayer;
    const defenderOwner = this.combatState.defenders[0]?.owner;
    const defenderPlayer = this.gameState.getPlayer(defenderOwner);

    // Group rolls by unit type
    const groupRolls = (rolls) => {
      const groups = {};
      for (const r of rolls) {
        const key = r.unitType;
        if (!groups[key]) {
          groups[key] = { rolls: [], hits: 0, unitType: r.unitType };
        }
        groups[key].rolls.push(r);
        if (r.hit) groups[key].hits++;
      }
      return groups;
    };

    const attackGroups = groupRolls(attackRolls);
    const defenseGroups = groupRolls(defenseRolls);

    // Render dice for a side
    const renderSideDice = (groups, playerId, totalHits, isAttacker) => {
      const entries = Object.entries(groups);
      if (entries.length === 0) return '<div class="dice-side-empty">No dice</div>';

      return entries.map(([unitType, data]) => {
        const imageSrc = playerId ? getUnitIconPath(unitType, playerId) : null;
        return `
          <div class="dice-unit-row">
            <div class="dice-unit-info">
              ${imageSrc ? `<img src="${imageSrc}" class="dice-unit-icon" alt="${unitType}">` : ''}
              <span class="dice-unit-name">${unitType}</span>
            </div>
            <div class="dice-unit-dice">
              ${data.rolls.slice(0, 6).map(r => `<span class="die-inline ${r.hit ? 'hit' : 'miss'}">${r.roll}</span>`).join('')}
              ${data.rolls.length > 6 ? `<span class="dice-more-inline">+${data.rolls.length - 6}</span>` : ''}
            </div>
            <div class="dice-unit-result ${data.hits > 0 ? 'has-hits' : ''}">
              ${data.hits}/${data.rolls.length}
            </div>
          </div>
        `;
      }).join('');
    };

    return `
      <div class="dice-results-split">
        <div class="dice-side attacker">
          <div class="dice-side-header" style="color: ${player.color}">
            <span class="dice-side-label">⚔ ${player.name} (Attacker)</span>
            <span class="dice-side-total">${attackHits} hits</span>
          </div>
          <div class="dice-side-content">
            ${renderSideDice(attackGroups, player.id, attackHits, true)}
          </div>
        </div>
        <div class="dice-side defender">
          <div class="dice-side-header" style="color: ${defenderPlayer?.color || '#888'}">
            <span class="dice-side-label">🛡 ${defenderPlayer?.name || 'Defender'}</span>
            <span class="dice-side-total">${defenseHits} hits</span>
          </div>
          <div class="dice-side-content">
            ${renderSideDice(defenseGroups, defenderPlayer?.id, defenseHits, false)}
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

    const player = this.gameState.currentPlayer;
    const defenderOwner = defenders[0]?.owner;
    const defenderPlayer = this.gameState.getPlayer(defenderOwner);

    const attackerTotal = this._getTotalSelectedCasualties(selectedAttackerCasualties);
    const defenderTotal = this._getTotalSelectedCasualties(selectedDefenderCasualties);

    // Calculate max absorbable casualties (accounting for battleship 2-hit system)
    const attackerMaxCasualties = this._getMaxAbsorbableCasualties(attackers);
    const defenderMaxCasualties = this._getMaxAbsorbableCasualties(defenders);

    // Effective casualties is min of pending and max absorbable
    const effectiveAttackerCasualties = Math.min(pendingAttackerCasualties, attackerMaxCasualties);
    const effectiveDefenderCasualties = Math.min(pendingDefenderCasualties, defenderMaxCasualties);

    // Calculate wasted hits
    const attackerWasted = Math.max(0, pendingDefenderCasualties - defenderMaxCasualties);
    const defenderWasted = Math.max(0, pendingAttackerCasualties - attackerMaxCasualties);

    const attackerComplete = attackerTotal >= effectiveAttackerCasualties;
    const defenderComplete = defenderTotal >= effectiveDefenderCasualties;

    let html = `<div class="casualty-selection-split">`;

    // Attacker side (left)
    html += `
      <div class="casualty-side attacker">
        <div class="casualty-side-header" style="border-color: ${player.color}">
          <span class="casualty-side-label" style="color: ${player.color}">⚔ ${player.name}</span>
          <span class="casualty-side-role">(Attacker)</span>
        </div>
        ${pendingAttackerCasualties > 0 ? `
          <div class="casualty-hit-counter ${attackerComplete ? 'complete' : 'incomplete'}">
            <span class="hit-counter-label">Hits to assign:</span>
            <span class="hit-counter-value">${attackerTotal}</span>
            <span class="hit-counter-sep">of</span>
            <span class="hit-counter-total">${effectiveAttackerCasualties}</span>
            ${defenderWasted > 0 ? `<span class="hit-counter-wasted">(${defenderWasted} overkill)</span>` : ''}
          </div>
          <div class="casualty-units-compact">
            ${this._renderCasualtyUnits(attackers, selectedAttackerCasualties, 'attacker')}
          </div>
        ` : `
          <div class="casualty-none">
            <span class="casualty-none-icon">✓</span>
            <span class="casualty-none-text">No casualties</span>
          </div>
        `}
      </div>
    `;

    // Defender side (right)
    html += `
      <div class="casualty-side defender">
        <div class="casualty-side-header" style="border-color: ${defenderPlayer?.color || '#888'}">
          <span class="casualty-side-label" style="color: ${defenderPlayer?.color || '#888'}">🛡 ${defenderPlayer?.name || 'Defender'}</span>
          <span class="casualty-side-role">(Defender)</span>
        </div>
        ${pendingDefenderCasualties > 0 ? `
          <div class="casualty-hit-counter ${defenderComplete ? 'complete' : 'incomplete'}">
            <span class="hit-counter-label">Hits to assign:</span>
            <span class="hit-counter-value">${defenderTotal}</span>
            <span class="hit-counter-sep">of</span>
            <span class="hit-counter-total">${effectiveDefenderCasualties}</span>
            ${attackerWasted > 0 ? `<span class="hit-counter-wasted">(${attackerWasted} overkill)</span>` : ''}
          </div>
          <div class="casualty-units-compact">
            ${this._renderCasualtyUnits(defenders, selectedDefenderCasualties, 'defender')}
          </div>
        ` : `
          <div class="casualty-none">
            <span class="casualty-none-icon">✓</span>
            <span class="casualty-none-text">No casualties</span>
          </div>
        `}
      </div>
    `;

    html += `</div>`;
    return html;
  }

  // Calculate max casualties a unit list can absorb (accounting for battleship 2-hit system)
  _getMaxAbsorbableCasualties(units) {
    let max = 0;
    for (const unit of units) {
      if (unit.quantity <= 0) continue;
      // Skip transports and factories (can't be casualties)
      if (unit.type === 'transport' || unit.type === 'factory') continue;

      if (unit.type === 'battleship') {
        // Battleships can take 2 hits each (1 damage + 1 destroy)
        const undamaged = unit.quantity - (unit.damagedCount || 0);
        const damaged = unit.damagedCount || 0;
        // Undamaged can absorb 2 hits each, damaged can absorb 1 hit each
        max += (undamaged * 2) + damaged;
      } else {
        // Other units absorb 1 hit each
        max += unit.quantity;
      }
    }
    return max;
  }

  _renderCasualtyUnits(units, selected, side, readonly = false) {
    // A&A Anniversary: Transports are defenseless and cannot be selected as casualties
    // Factories are captured, not destroyed - exclude from casualties
    let html = '';

    for (const u of units.filter(u => u.quantity > 0 && u.type !== 'transport' && u.type !== 'factory')) {
      const def = this.unitDefs[u.type];
      const imageSrc = u.owner ? getUnitIconPath(u.type, u.owner) : (def?.image ? `assets/units/${def.image}` : null);

      // Special handling for battleships (2-hit system)
      if (u.type === 'battleship') {
        const damagedCount = u.damagedCount || 0;
        const undamagedCount = u.quantity - damagedCount;

        // Show damage option for undamaged battleships
        if (undamagedCount > 0) {
          const damageSelected = selected['battleship_damage'] || 0;
          html += `
            <div class="casualty-unit ${damageSelected > 0 ? 'has-casualties' : ''}">
              <div class="casualty-unit-info">
                ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="battleship" title="Battleship (Damage): Absorb hit without destroying">` : ''}
                <span class="casualty-name">Battleship</span>
                <span class="casualty-avail damage">(${undamagedCount} undamaged)</span>
              </div>
              ${!readonly ? `
                <div class="casualty-controls">
                  <button class="casualty-btn minus" data-side="${side}" data-unit="battleship_damage" ${damageSelected <= 0 ? 'disabled' : ''}>−</button>
                  <span class="casualty-selected">${damageSelected}</span>
                  <button class="casualty-btn plus" data-side="${side}" data-unit="battleship_damage" ${damageSelected >= undamagedCount ? 'disabled' : ''}>+</button>
                </div>
              ` : `
                <div class="casualty-controls readonly">
                  <span class="casualty-selected">${damageSelected}</span>
                </div>
              `}
            </div>
          `;
        }

        // Show destroy option for damaged battleships (or all if no undamaged)
        if (damagedCount > 0 || undamagedCount > 0) {
          const destroySelected = selected['battleship'] || 0;
          // Can destroy: damaged battleships + any undamaged that weren't selected for damage
          const pendingDamage = selected['battleship_damage'] || 0;
          const maxDestroyable = damagedCount + Math.max(0, undamagedCount - pendingDamage);
          const statusText = damagedCount > 0 ? `(${damagedCount} damaged)` : '(destroy)';
          html += `
            <div class="casualty-unit ${destroySelected > 0 ? 'has-casualties' : ''}">
              <div class="casualty-unit-info">
                ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon damaged" alt="battleship" title="Battleship (Destroy): Remove from battle">` : ''}
                <span class="casualty-name">Battleship</span>
                <span class="casualty-avail destroy">${statusText}</span>
              </div>
              ${!readonly ? `
                <div class="casualty-controls">
                  <button class="casualty-btn minus" data-side="${side}" data-unit="battleship" ${destroySelected <= 0 ? 'disabled' : ''}>−</button>
                  <span class="casualty-selected">${destroySelected}</span>
                  <button class="casualty-btn plus" data-side="${side}" data-unit="battleship" ${destroySelected >= maxDestroyable ? 'disabled' : ''}>+</button>
                </div>
              ` : `
                <div class="casualty-controls readonly">
                  <span class="casualty-selected">${destroySelected}</span>
                </div>
              `}
            </div>
          `;
        }
      } else {
        // Standard units
        const selectedCount = selected[u.type] || 0;
        html += `
          <div class="casualty-unit ${selectedCount > 0 ? 'has-casualties' : ''}">
            <div class="casualty-unit-info">
              ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="${u.type}" title="${u.type}: Attack ${def?.attack || 0}, Defense ${def?.defense || 0}, Cost ${def?.cost || 0}">` : ''}
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
      }
    }

    return html;
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
            ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="${u.type}" title="${u.type}: Attack ${def?.attack || 0}, Defense ${def?.defense || 0}, Cost ${def?.cost || 0}">` : ''}
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

    // A&A Anniversary: Transports are defenseless and cannot be selected as casualties
    // Factories are captured, not destroyed - exclude from casualties
    return defenders.filter(u => u.quantity > 0 && u.type !== 'transport' && u.type !== 'factory').map(u => {
      const def = this.unitDefs[u.type];
      const imageSrc = u.owner ? getUnitIconPath(u.type, u.owner) : (def?.image ? `assets/units/${def.image}` : null);
      const selectedCount = selectedBombardmentCasualties[u.type] || 0;

      return `
        <div class="casualty-unit ${selectedCount > 0 ? 'has-casualties' : ''}">
          <div class="casualty-unit-info">
            ${imageSrc ? `<img src="${imageSrc}" class="casualty-icon" alt="${u.type}" title="${u.type}: Attack ${def?.attack || 0}, Defense ${def?.defense || 0}, Cost ${def?.cost || 0}">` : ''}
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
    // Minimize toggle
    this.el.querySelector('[data-action="toggle-minimize"]')?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.el.classList.toggle('minimized', this.isMinimized);
      this._render();
    });

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
          case 'submarine-first-strike':
            this._rollSubmarineFirstStrike();
            break;
          case 'submerge-sub':
            this._submergeSub(btn.dataset.side, 1);
            break;
          case 'submerge-all-subs':
            this._submergeSub(btn.dataset.side, 'all');
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
          case 'confirm-retreat':
            const destination = btn.dataset.destination;
            if (destination) {
              this._executeRetreat(destination);
            }
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

    // Special handling for battleship_damage (refers to undamaged battleships taking damage)
    if (unitType === 'battleship_damage') {
      const battleship = units.find(u => u.type === 'battleship');
      if (!battleship) return;

      const undamagedCount = battleship.quantity - (battleship.damagedCount || 0);
      const current = selectedCasualties['battleship_damage'] || 0;
      const newValue = Math.max(0, Math.min(undamagedCount, current + delta));

      // Check we don't exceed required casualties (using max absorbable)
      const maxCasualties = this._getMaxAbsorbableCasualties(units);
      const effectivePending = Math.min(pendingCasualties, maxCasualties);
      const currentTotal = this._getTotalSelectedCasualties(selectedCasualties);
      const newTotal = currentTotal - current + newValue;

      if (newTotal <= effectivePending) {
        selectedCasualties['battleship_damage'] = newValue;
        this._render();
      }
      return;
    }

    const unit = units.find(u => u.type === unitType);
    if (!unit) return;

    // For battleship destruction, account for damage selections
    let maxSelectable = unit.quantity;
    if (unitType === 'battleship') {
      const damagedCount = unit.damagedCount || 0;
      const undamagedCount = unit.quantity - damagedCount;
      const pendingDamage = selectedCasualties['battleship_damage'] || 0;
      // Can destroy: damaged + (undamaged - pendingDamage)
      maxSelectable = damagedCount + Math.max(0, undamagedCount - pendingDamage);
    }

    const current = selectedCasualties[unitType] || 0;
    const newValue = Math.max(0, Math.min(maxSelectable, current + delta));

    // Check we don't exceed required casualties (using max absorbable)
    const maxCasualties = this._getMaxAbsorbableCasualties(units);
    const effectivePending = Math.min(pendingCasualties, maxCasualties);
    const currentTotal = this._getTotalSelectedCasualties(selectedCasualties);
    const newTotal = currentTotal - current + newValue;

    if (newTotal <= effectivePending) {
      selectedCasualties[unitType] = newValue;
      this._render();
    }
  }

  _retreat() {
    // Per A&A rules: Player selects ONE retreat destination for all units
    // Get valid retreat destinations (territories units came from)
    const retreatOptions = this.gameState.getRetreatDestinations(this.currentTerritory);

    if (retreatOptions.length === 0) {
      // No valid retreat - shouldn't happen but handle gracefully
      console.warn('No retreat destinations available');
      return;
    }

    if (retreatOptions.length === 1) {
      // Only one option - retreat there directly
      this._executeRetreat(retreatOptions[0]);
    } else {
      // Multiple options - show selection phase
      this.combatState.phase = 'selectRetreat';
      this.combatState.retreatOptions = retreatOptions;
      this._render();
    }
  }

  _executeRetreat(destination) {
    this.combatState.isRetreating = true;

    // Move all units to the selected retreat destination
    const retreatResult = this.gameState.retreatToTerritory(this.currentTerritory, destination);
    if (!retreatResult.success) {
      console.warn('Retreat failed:', retreatResult.error);
    }

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

      // Notify main.js to center camera on combat territory
      if (this.onCombatStart) {
        this.onCombatStart(this.currentTerritory);
      }
    } else {
      this.hide();

      // All combats are done - check for pending air landings
      if (this.onAllCombatsResolved) {
        this.onAllCombatsResolved();
      }

      if (this.onCombatComplete) {
        this.onCombatComplete();
      }
    }
  }
}
