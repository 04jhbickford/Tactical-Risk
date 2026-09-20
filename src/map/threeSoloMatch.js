// Three hybrid re-export. Shared engine lives in src/state/soloMatch.js
// so Canvas main can cherry-pick the same boot.

export {
  DEFAULT_HUMAN_SEAT,
  DEFAULT_AI_DIFFICULTY,
  buildSoloPlayers,
  buildSoloPlayers as buildClassicSoloPlayers,
  startClassicSolo,
  startRiskSolo,
  placementsFromState,
  inspectSolo,
  ownedLandNames,
  firstOwnedLand,
  adjacentOpenSeas,
  autoPlaceCurrentCapital,
  autoPlaceCurrentDeployRound,
  completeSoloSetup,
  CLASSIC_CAPITALS,
} from '../state/soloMatch.js';
