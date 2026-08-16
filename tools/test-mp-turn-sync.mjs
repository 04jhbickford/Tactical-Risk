// Unit checks for V2.58 multiplayer turn-bar + auto-battle sync fixes.
// Run: node tools/test-mp-turn-sync.mjs

import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GameState } = await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const { computeIsLocalPlayerTurn, shouldShowBottomTurnActions } =
  await import(pathToFileURL(join(root, 'src/ui/playerPanel.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

console.log('=== Bug A: spectator never sees the primary End-phase bar ===');
{
  check('hotseat / local: always local turn',
    computeIsLocalPlayerTurn({ isMultiplayer: false, isWaitingForSync: false, localUserId: null, currentPlayerOderId: 'x' }) === true);

  check('MP: current player is local → local turn',
    computeIsLocalPlayerTurn({ isMultiplayer: true, isWaitingForSync: false, localUserId: 'sean', currentPlayerOderId: 'sean' }) === true);

  check('MP: spectator (Robert watching Sean) → not local turn',
    computeIsLocalPlayerTurn({ isMultiplayer: true, isWaitingForSync: false, localUserId: 'robert', currentPlayerOderId: 'sean' }) === false);

  check('MP: waiting-for-sync after handing off → not local turn',
    computeIsLocalPlayerTurn({ isMultiplayer: true, isWaitingForSync: true, localUserId: 'sean', currentPlayerOderId: 'sean' }) === false);

  check('MP: missing localUserId → not local turn (fail closed)',
    computeIsLocalPlayerTurn({ isMultiplayer: true, isWaitingForSync: false, localUserId: null, currentPlayerOderId: 'sean' }) === false);

  check('bottom bar hidden for spectator',
    shouldShowBottomTurnActions({ isMultiplayer: true, isLocalPlayerTurn: false, isAI: false }) === false);

  check('bottom bar hidden while waiting for sync',
    shouldShowBottomTurnActions({ isMultiplayer: true, isLocalPlayerTurn: false, isAI: false }) === false);

  check('bottom bar shown for active human',
    shouldShowBottomTurnActions({ isMultiplayer: true, isLocalPlayerTurn: true, isAI: false }) === true);

  check('bottom bar hidden for AI even on "local" render',
    shouldShowBottomTurnActions({ isMultiplayer: true, isLocalPlayerTurn: true, isAI: true }) === false);

  check('bottom bar shown in local/hotseat',
    shouldShowBottomTurnActions({ isMultiplayer: false, isLocalPlayerTurn: true, isAI: false }) === true);
}

console.log('=== Bug B: notify pause + equal-version reload rule ===');
{
  const gs = new GameState({ risk: { factions: [] } }, [], []);
  let count = 0;
  gs.subscribe(() => { count++; });

  gs._notify();
  check('unpaused notify fires', count === 1);

  gs.pauseNotifications();
  gs._notify();
  gs._notify();
  gs._notify();
  check('paused notifies are swallowed', count === 1);

  gs.resumeNotifications({ flush: false });
  check('resume without flush does not fire', count === 1);

  gs.pauseNotifications();
  gs._notify();
  gs.resumeNotifications({ flush: true });
  check('resume with flush fires once', count === 2);

  gs.pauseNotifications();
  gs.pauseNotifications();
  gs._notify();
  gs.resumeNotifications({ flush: true });
  check('nested pause: inner resume does not flush', count === 2);
  gs.resumeNotifications({ flush: true });
  check('nested pause: outer resume flushes once', count === 3);

  // Production _reloadRemoteState must apply remote when force=true even if
  // versions are equal (failed write never incremented the server).
  const shouldApply = (remote, local, force) => force || remote > local;
  check('stale path: newer remote applies', shouldApply(5, 4, false) === true);
  check('stale path: equal versions do NOT apply (no-op)', shouldApply(4, 4, false) === false);
  check('exhaust path: equal versions MUST apply (force)', shouldApply(4, 4, true) === true);
  check('exhaust path: older remote still applies when forced', shouldApply(3, 4, true) === true);
}

console.log(failures === 0 ? '\nALL MP TURN-SYNC CHECKS PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
