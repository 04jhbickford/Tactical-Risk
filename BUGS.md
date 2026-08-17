# Tactical Risk — Bug & Debug Log

---

## 8.17.26 — V2.78 ship (CEVX6F B38–B40)

CoS-approved squash to main. SCHEMA 11. No map/rule change. No Vercel billing from this ship.

B38: panel paints at default zoom; signed-in reload resumes the match (or Rejoin), not home / Create Game.
B39: first-wave land kit is real (not “Russians have no land IPC”); + / Max / Undo / Deploy; place 6 and Done.
B40: 2/2 host CTA is Start Game; an already-started lobby reopens that gameId.

---

## 8.17.26 — V2.77 host background killed ZUJMNP; deploy/undo looked broken

Live V2.76 two-human (Bastion host Russians, James guest Americans), game ZUJMNP. Host tab backgrounded ~3 min → host signed out → lobby gone → guest join “ZUJMNP not found” → guest WAITING on a ghost. Client also self-ejected to title / MY ACTIVE GAMES with no click. Same table: Undo passed the turn; own-capital tap ended the turn / opened surrender; game-row click opened “Leave this game?”; Infantry + jumped 1→4 or also added Armour; next YOUR TURN arrived 6/6; Deploy N clipped at y≈733; unit list truncated to tacticalBomber; selection jumped after deploy.

Cause:
- `presenceManager` deleted the presence doc on `beforeunload` (mobile fires that on background). Missing doc + 2 min stale = host offline. `auth_error` + `needsReauth` immediately `stopSync`, deleted presence again, nulled `gameState`, and `lobby.show()`. `leaveLobby` deleted a started lobby when the host seat looked empty. Join-by-code only returned `waiting` lobbies, so a live `starting` match was “not found”.
- Background timers freeze, so even a kept doc went “offline” at 2 min and failover / UI treated the host as gone.
- Guest `startSyncAndWaitForState` flipped the active-player flag on seat change without `loadFromJSON`, so James inherited host `unitsPlacedThisRound=6` and a stale 25 pool. Constructor leftover `turnPhase=purchase` was advertised on every setup push.
- `querySelectorAll('[data-action]')` rebound every render; `+` / Undo `_render()` mid-click retargeted onto Done or another row. Phone one-tap capital / place committed on map tap. Leave sat on the game-row hit target. DEPLOYED counted queued units. Deploy lived in the clipped tray body.

Fix (SCHEMA 11, no map/rules/combat math change):
- Presence doc is deleted only on explicit leave. `visibilitychange` / `pageshow` / `pagehide` write idle/online and heartbeat. Existing idle doc stays idle for 15 min (3 min background ≠ offline). Auth hiccup stays in the match unless the session is actually gone. Started lobbies are never deleted on host leave. Join-by-code finds the live game.
- Persist `turnPhase=setup` during capital/unit placement (never leftover `purchase`). Deep-clone `unitsToPlace`. Guest applies remote state when the version is newer **or** the seat changes. `nextTurn` / Done reset `unitsPlacedThisRound` to 0.
- One delegated panel click + rAF render. `+`/`−`/`Max` are pure one-row queue math; Deploy commits; panel count is units actually placed. Undo never passes. Own land/capital tap selects (Confirm / Deploy are the verbs). Leave is a separate control, not the row. Deploy N sits on the phone peek CTA. `tacticalrisk:your-turn` + `window.__tacticalRiskTurn` for WhatsApp. Tab title uses the same “is it my turn?” predicate as the banner.

Follow-up (same ZUJMNP V2.76 James client, still V2.77 / SCHEMA 11):
- B13 Deploy N placed N−1 (remaining −5 on Deploy 6): each `placeInitialUnit` `_notify()` re-rendered mid-batch and put Undo under the Deploy tap.
- B14 `+` at the 6-cap stole from another staged type: `canAdd` used this-row queued only, so + stayed live at cap; a mid-render retarget hit another row’s −.
- B15 Undo vs DEPLOYED desync / + vanished the restored unit: undo did not always decrement `unitsPlacedThisRound`; `setSelectedTerritory` wiped the queue.
- B16/B17 selection jump + fighter auto-commit: `_scheduleRender` called itself and never painted (shipped V2.77). Stale panel vs live selection. `+` is queue-only; Deploy is the commit.
- B18/B8/B10: Undo and Deploy now have separate peek slots; unit-list scroll is restored; Deploy batch notifies once (no 0-flash, B12).
- B19: ships-only remainder on inland land showed a sea hint, no unit rows, and hid Done until 6/6. Place leftover ships in a legal sea, or Done/skip (does not bounce the seat back).
- B19-James (ZUJMNP V2.76): 1/6, remaining 6 naval-only, only Undo. Same leftover-ship deadlock on a legal sea — Done was sea-gated and lived only on the clipped bottom bar. Done/skip is now on any tile (including valid sea) and in the inline placement actions next to Undo.
- B20: Deploy 1 placed 3 armour (remaining 13→10, round 1→3). Mid-gesture re-render retargeted Deploy onto other + rows. Pointerdown locks the action; Deploy commits that lock only.
- B21: Artillery + auto-committed and ended the turn at 3/6 (no Done click). Same retarget onto Done after leftover-ship Done appeared. + lock cannot become finish-placement; a ghost Done within 400ms of + is ignored.
- B22: Artillery + switched the panel to Log and jumped East US → East Canada. + lock cannot become a tab; a panel gesture blocks the map hit now under the finger.
- B23 P0: Game tab self-navigated to the lobby (auth eject — already on main). Clicking the game *row title* opened surrender. Leave is a compact sibling; title/join never opens the confirm. Do not enlarge Leave.
- B24: Max bumped DEPLOYED before deploy; Deploy 1 placed 0 twice, then a bomber. DEPLOYED is placed-this-round only. Failed Deploy restores the queue.
- Undo lock: place / deploy / purchase / move are undoable by default. Undo is hidden after combat resolve and after Done / next-player pass. Combat math and retreat history are unchanged.
- Turn notice hook: when currentPlayer changes, POST `{ gameCode, currentPlayerName, phase }` to `TACTICAL_RISK_TURN_NOTICE_URL` (window / env / localStorage). Unused if unset. No WhatsApp from the client. No phone numbers.
- E1 presence resume: `visibilitychange` (visible) and `pageshow` (including bfcache) heartbeat now and re-attach Firestore snapshots only if the listener died. Idle/background does not start the 90s host failover. `deleteDoc` stays on explicit leave / real close (`stop()`), not on background. No RTDB `onDisconnect`.
- B25 (E1 FAIL, game vanished): Host tab backgrounded ~3 min → Firebase Sign In (session lost). Rejoin ZUJMNP = "Lobby not found". My Games = "No active games found". Bastion still signed in on other tabs. No surrender. Auth eject called `presenceManager.stop()` which deleted the presence doc (`explicit-leave`). Join-by-code treated empty `playerUserIds` `[]` as not seated. My Games used `array-contains` + `status in` (needs a composite index; `firestore.indexes.json` is empty) and wiped the list on a token hiccup. Session-lost stop keeps the presence doc. Empty `playerUserIds` still seats via `startedBy` / lobby players. Join fetches `games/{lobby.gameId}` when the `lobbyCode` query misses. My Games is two single-field queries (seat + `startedBy`) with client-side status filter.
- James lock (if it can look broken, it is broken): Tab title followed the waiting lock / a stale sync callback while the panel badge followed the loaded seat — "● Your turn" over WAITING. Title, badge, phone seat chip, and the your-turn ping now share `resolveTurnChrome` (seat only). 6/6 this round + 1 still in the pool no longer says "Remaining to deploy: 1"; it is "Still in your pool: 1 next round". Leftover ships keep Done on the peek CTA, inline actions, and the phone tray. My Games row title is Resume; only Leave opens surrender. Join-by-code never says only "Lobby not found" when the match may already be in My Games.
- B25 CONFIRMED (guest still in ZUJMNP): James stayed in Bastion's Turn / INITIAL DEPLOYMENT / WAITING. Host Sign In after E1 background → My Games empty, Join ZUJMNP = lobby not found. Other Bastion tabs still signed in, same miss. No surrender. The game doc was alive (guest snapshot). V2.76 join searched waiting lobbies only; My Games used a compound query; session-lost deleted presence and the started lobby. Product fix: remember `{ gameId, lobbyCode }` locally; join-by-code / My Games `getDoc` that id; a started game with that code is never "not found"; guest sees "Host is reconnecting — stay in ZUJMNP. Do not leave." Idle host is away, not gone. Failover still does not run on idle. SCHEMA 11.
- James lock HUD clarity: the bar under the HUD always answers whose turn (YOUR TURN vs WAITING · name — never stale Your turn over WAITING), the real phase (Initial Deployment, never leftover purchase), 6/6 + leftover as next-round pool copy, last action from the log, and whether the map click landed. After host away: “Still in ZUJMNP — you were away” / “You were away — still in ZUJMNP. The other player is still there. Rejoin.” Silent empty My Games is a fail.
- B26 (ZUJMNP V2.76 James): Join by Code opened My Games, not a 6-char field. Cards were `join` / `rejoin` on a tight 2×2; a phone tap hit the wrong card and `onBack('rejoin')`. Exclusive `join-by-code` vs `my-games`, one delegated switch, Join by Code full-width on phone. Join by Code never opens My Games.
- B27: Game view dumped to home with no click. V2.76 `auth_error` called `lobby.show()`; V2.77 called `handlePlayOnline()` (full menu + Create Game). Session-lost does not leave the game view. If there is no canvas, reconnect-only (last match + code field) — not home, not Create Game.
- B28: After Deploy 1/6, selecting another territory showed 0/6. `loadFromJSON` used `unitsPlacedThisRound || 0`, and `shouldResetDeployedThisRound` treated remote 0 as a reset. Reset only on seat / wave change; same seat keeps max(local, remote). Select never zeros DEPLOYED.
- B29: Max did nothing on TacticalBomber. + / Max required a legal tile (`isValidPlacement`) and exact-type pool lookup. Staging does not need a tile; Deploy still does. `quantityAvailableForType` accepts `TacticalBomber` / `tacticalBomber`.
- B30: Destroyer + also incremented Transport (4→6). Same family as B14 row-offset / steal. Pointerdown locks `data-unit`; a retarget onto another type within 400ms is ignored. One gesture changes one unitType.
- B31: Max hover still selected East US and opened LOG (B22 family). Canvas under the panel and the LOG tab won the hit stack. Queue controls win `elementsFromPoint`; a click whose coordinates sit in the panel never selects a territory; Max lock cannot become a tab. If the canvas ate mouseup, the locked Max still commits.
- B32: + incremented by 2 (Armour 1→3, then every later + added 2). B31 canvas mouseup committed the lock, then the real click applied again. One pointerdown = one ±1; `shouldApplyQueueGesture` is one-shot until the next pointerdown.
- B33: Undo ended the turn (banner → Bastion WAITING). Undo lock was retargeted onto Done. Undo cannot become finish-placement; overlay commit never Done.
- B34: Clicking own capital (East US) to select it ended the turn at 0 deployed. Map / overlay click must not Done. Own-land tap still only selects.
- B35: Next YOUR TURN arrived DEPLOYED 6/6. Spectated host 6 was kept by the B28 max() after the seat flag flipped. Reset when `unitsPlacedThisRoundOwnerId` is not the new seat. Same-actor stale 0 still keeps local 1 (B28).
- B36: One Infantry + jumped 1→4 and added Armour. Compatibility mouse after the pointer click reset the one-shot and stole a row. Do not begin a new queue gesture within 400ms of an apply. Overlay commit is + / Max only.
- E1 / B25 P0 (ZUJMNP died): Host backgrounded → Sign In on that tab → Join ZUJMNP = “Lobby not found”, My Games empty, while the guest was still in the match. Then the game died. `auth_error` treated `!getUser()` as `confirmedSignOut` and self-ejected. A null user after background is not Sign Out. Heartbeat on every `visibilitychange` (hidden → idle) and `pageshow` (including `persisted`). No self-eject. No sign-out on background. Last-match stub keeps My Games listed when seat/`startedBy` queries miss. Remembered `gameId` alone is a join — never “Lobby not found” for the live match. Guest stays; host reconnects to the same game. SCHEMA 11.
- E1 / B25 (V2.77 live reload): Signed-in Bastion tab reloaded to pick up V2.77 → Sign In form. `setPersistence(browserLocalPersistence)` on every init raced IndexedDB restore and dropped the session. `onAuthStateChanged` also awaited a Firestore lastLogin write before setting `currentUser`, so Play Online saw a null user. Removed `setPersistence` (`getAuth` already persists). Apply the Firebase user immediately; lastLogin is best-effort. Play Online / AuthScreen wait for `authStateReady` and show “Restoring your session…” — not the password form — until restore finishes. Reload is not a sign-out. SCHEMA 11. GAME_VERSION stays V2.77.
- B37: Join Game GAME CODE autofilled leftover text (BICKFO); optional password autofilled a leftover value. Browser autocomplete treated the 6-char code as a name and the lobby password as a saved login. `autocomplete="off"` + unique names (`tr-join-lobby-code` / `tr-join-lobby-secret`). Join does not prefill last-match into the code field (Rejoin button still exists). Do not log or store the lobby password. SCHEMA 11. GAME_VERSION stays V2.77.
- B38 (CEVX6F): Host player panel `innerText` empty at default zoom; Ctrl+minus painted it; reload dumped a signed-in host to home. `#sidebar` z-index 20 lost to `#zoom-controls` (50). Phone peek hid `.phone-tray-body` (the + / Max / Undo / Deploy sheet). First paint with no `currentPlayer` wiped the DOM and waited for resize. Boot never auto-resumed `lastMatch`. Sidebar is z-index 60. Initial deployment does not peek. `show()` paints immediately; empty state says “Loading match…”. Signed-in reload with a remembered `gameId` reopens that match.
- B39 (CEVX6F): Russians initial deploy showed DEPLOYED 0/6, Remaining 1, LAND (0), only NAVAL Transport ×1 — no Infantry, no +, no Max, no Undo, no Deploy/Done. Not “Russians have no land IPC.” `RISK_STARTING_UNITS` still has 9 infantry. Verified causes: peek hid the sheet; Firestore/JSON can coerce the pool to `{transport:1}` / numeric maps; a missed player-id key reads as empty. Coerce + key alias + restore the starting kit on wave-1 / 0-deployed / no-land-or-air. Undo and Deploy always paint. First seat can place 6 and Done.
- B40 (CEVX6F): 2/2 host button still said “Create Game” (`isPublished === false` is the publish CTA, and publish kicked the host to Browse). Host primary is always **Start Game**. Start publishes if needed and stays in the lobby. “List in Open Games” is optional and does not leave the room.
- CEVX6F hold (same PR, do not start a new game): Start on a lobby that already has `gameId` / status `starting` reopens that doc — it does not `setDoc` a second match. Failed signed-in resume of the last code is reconnect-only (Rejoin CEVX6F), never the Create Game menu. A healed first-wave pool is pushed on the same game doc. SCHEMA 11. GAME_VERSION stays V2.77.

Harness: `node tools/test-presence-and-deploy.mjs`, `node tools/test-setup-phase-guard.mjs`, `node tools/test-placement-ux.mjs`, `node tools/test-tablet-chrome.mjs`, `node tools/test-mp-turn-sync.mjs`, `node tools/test-undo-and-turn-notice.mjs`.

---

## 8.16.26 — V2.76 AA fire silent; phone rotate swaps chrome; empty rematch after push_exhausted

Live V2.75 playtest. Unit placement PASSED. Guest Robert007 dump 2026-08-16T23:49:45Z: playing / combat, local v89, isActivePlayer true, not host. Sync: v85 purchase; v86–87 combat_move; v88–89 combat; v90 combat ×3; push_failed ×3 (version undefined); push_exhausted. James + Robert: AA unclear; phone rotate horizontal→vertical weirdly changes UI; yellow toast then the same Anglo-Sudan Egypt combat again with no enemy units.

This game may still be playable — new build is V2.76; do not abandon the table.

Cause:
- `_rollAAFire()` applied casualties and `_proceedAfterAAFire()` immediately. The readable block (dice + “AA Fire Results: N hit(s)”) only rendered on `selectAACasualties`, which the manual path never stayed on. Auto-battle blipped through AA in 150ms.
- `shouldUseMobileShell` / `initMobileShell` were width-only (`≤480` / `max-width: 480px`). iPhone landscape is 667–932 × ~390, so rotate dropped `html.mobile-shell` into the 481–900 tablet tree; rotate back restored phone chrome.
- `push_exhausted` → `syncFromAuthoritativeState` → `showNextCombat` rebuilt attackers/defenders from current units on `combatQueue[0]`. If the commit landed (defenders gone) but the territory stayed in the queue, it reopened a 0-enemy rematch. Exact toast: “Could not save — game re-synced to the last confirmed state. Please retry your move.”

Fix (UI / chrome / queue skip — SCHEMA 11, no rule/map/odds change):
- After AA rolls, stay on `aaResults`: who shot (defending AA), dice, hits, which aircraft died (cheapest first, no attacker choice). Continue proceeds. Auto-battle paints then pauses 600ms. One-line action-log entry.
- Phone if width ≤480 (height omitted), or min(width,height) ≤480 AND max <1024 (below iPad). Plus / Pro Max landscape (926–956 × 428–440) stay phone. `initMobileShell` uses innerWidth + innerHeight and re-applies on resize / orientationchange. Desktop windows (1280×400 / 1280×800) and iPad 768×1024 / 1024×768 stay frozen; 481/772/900 with no height stay tablet.
- Never show a combat against zero enemy combat units (factory excluded; AA-only still a fight). Empty queue heads dequeue as already resolved. If both sides remain, reopen the real fight. `_reloadRemoteState({force:true})` still restores pre-combat armies when the commit did not land.

Harness: `node tools/test-combat-ui.mjs`, `node tools/test-tablet-chrome.mjs`, `node tools/test-mp-turn-sync.mjs`.

---

## 8.16.26 — V2.75 host stuck on own unit_placement seat; AI paused until a guest is online

Live V2.74 playtest. Guest Robert007 dump 2026-08-16T23:22:14Z: phase=`unit_placement`, leftover constructor `turnPhase=purchase`, round 1, local v40. Current = James (host). Guest `isActivePlayer=false` (correct). Sync: Robert v23, then Hard Bots v24–33 in ~2s, then James current v34–40 for ~80s. Two table reports: (1) stuck on James's turn; (2) AIs only run after another human joins. This game is dead — new game after Vercel is V2.75.

Cause:
- V2.72/V2.73 waiting lock: human `finish-placement` sets `isWaitingForSync`. Host AI `finishPlacementRound` then `pushStateNow()`; while `isPushing`, `onSnapshot` updates `_updateActivePlayer` but does not fire `state_updated` / `turn_changed`, so the V2.73 clearer never runs when AI hands the seat back to the host.
- `mayRunAI` required presence-doc `anyHumanPresent`. iPhone host often looks `offline` (background/lock/heartbeat), so AI paused until a guest came online.

Fix (UI/sync safety — SCHEMA 11, no rule/map change, leftover purchase still not healed):
- After a local or remote state apply, `isWaitingForSync` drops when `currentPlayer.oderId === localUserId`. Done's optimistic lock still covers the next seat (double-tap skip stays illegal). Spectator overlay stays seat-based.
- A seated local human client counts as present even if the presence doc is stale. Unattended (no local seated human, no online humans) still pauses. `DEFAULT_AI_RUNS_WHEN_UNATTENDED` stays false. Host-only AI writer unchanged.
- Purchase / trade / buy actions require `phase === PLAYING` (leftover setup `purchase` stays inert).

Harness: `node tools/test-mp-turn-sync.mjs` (host lock after local AI handoff; local-human present), `node tools/test-setup-phase-guard.mjs`, `node tools/test-placement-ux.mjs`, robustness B2.

---

## 8.16.26 — V2.74 guest stuck on 2nd initial deployment (illegal phase combo)

Live V2.73 playtest. Guest Robert007 (not host), dump 2026-08-16T22:33:53Z: phase=`unit_placement`, turnPhase=`develop_tech`, round 1, local v24, isActivePlayer true. Players: Robert007, Easy Bot, James, Hard Bot. Sync log: Robert `state_push` with `phase: develop_tech` (`gameState.turnPhase` in main.js); Easy Bot also pushed develop_tech. He had not left. Game is dead.

Cause:
- `loadFromJSON` self-heal treated `develop_tech` as the only valid setup turnPhase, so leftover constructor `unit_placement + purchase` was rewritten to the dump combo, and the dump was then considered already valid (no heal).
- `nextTurn()` was not PLAYING-guarded (unlike `nextPhase()`). A call during unit_placement leaves phase as unit_placement and sets turnPhase to develop_tech — exact dump.
- V2.73 waiting-overlay fix does not cover this: guest was already isActivePlayer.

Fix (UI/sync safety — SCHEMA 11, no rule/map change):
- `nextTurn()` refuses unless `phase === PLAYING`. Setup stays on `finishPlacementRound` / `placeCapital`.
- Load/apply no longer rewrite leftover `purchase` into `develop_tech`. Setup ignores turnPhase; playing UI / techUI / AI `_handlePlayingPhase` / `nextPhase` / `nextTurn` require PLAYING.
- Guest on own 2nd deployment seat sees place-units + Done. Spectator overlay stays off when `oderId === localUserId`.
- Happy path: everyone done → PLAYING + DEVELOP_TECH.

Harness: `node tools/test-setup-phase-guard.mjs` plus existing `test-mp-turn-sync`, `test-placement-ux`, `robustness-harness`.

---

## 8.16.26 — V2.73 waiting overlay stuck on the active player's own seat

Live V2.72 playtest. James (iPhone, host) created a 4-seat game: Robert007 (desktop Chrome, not host), Easy Bot, James, Hard Bot. Capitals placed (Robert → James; host ran the AI seats). Robert's client then showed HIS unit_placement turn — tab title "Your turn", "Robert007's Turn", INITIAL DEPLOYMENT / CLICK TO PLACE UNITS — but a yellow WAITING badge and the spectator overlay "Robert007 is playing" / "You can view the map while waiting." He could not place.

Debug dump (2026-08-16T22:33:53Z): isActivePlayer true, not host, phase unit_placement, current = Robert007. Every `state_updated` line had `isActivePlayer=undefined`. State had actually advanced (v24 current=Robert after the AI seats).

Cause: V2.72 set `isWaitingForSync` on finish-placement (and next-phase handoff). `computeIsLocalPlayerTurn` treats that lock as "not your turn," which paints the spectator overlay even when the loaded seat is you. `state_updated` omitted `isActivePlayer`, so `if (data.isActivePlayer) setWaitingForSync(false)` never ran when a later remote snapshot made this client current.

Fix (shared turn/waiting state — desktop/tablet CSS frozen):
- Remote snapshot that makes you current clears waiting-for-sync (live `checkIsActivePlayer()`, and `state_updated` now carries the flag).
- Spectator overlay / WAITING badge are seat-based: never "You are playing" / "view the map while waiting" on your own seat. Own seat shows place-units UI.
- Done/End still uses the waiting lock so a double-tap cannot skip the next seat.

Harness: `node tools/test-mp-turn-sync.mjs` (active human + overlay illegal; isActivePlayer ⇒ place UI; host vs non-host after AI seats).

---

## 8.16.26 — V2.72 multiplayer Done/pass must persist; leftover bomber cannot lock Done

James on live V2.71: third deployment wave, placed, tapped Done / next player, exited the app. The game did not advance. Rejoin could not finish or pass — stuck between turns. An extra tactical bomber sat in the place tray and could not be placed.

Verified in-repo (not a chrome/CSS bug):
- `RISK_STARTING_UNITS` included `tacticalBomber`, but `data/units.json` had no def. `placeInitialUnit` / `hasPlaceableUnits` skip unknown types; the tray still listed quantity > 0. V2.71 sticky default-selected that leftover, so land taps failed while other real units remained and Done stayed hidden.
- `finish-placement` mutated local state then fired `pushStateNow()` without awaiting. If a place write was in flight, the Done waiter received the pre-Done result; the follow-up write died with the tab. `unitsPlacedThisRound` was not in `toJSON`, so rejoin reset the 6-cap and hid Done.

Fix (shared turn/pass state — desktop/tablet CSS frozen):
- `tacticalBomber` is a real air unit (owned land). Unknown leftovers are stripped from tray/sticky/counts and cannot block Done.
- `unitsPlacedThisRound` serializes (SCHEMA 11, additive). Mid-place rejoin restores the cap; uncommitted Done can be tapped again; committed Done already belongs to the next seat.
- Push queue: a Done waiter waits for the coalesced post-Done write, not the in-flight place write. `pagehide` / hidden flushes a pending debounce. Double-tap Done is `not-ready`.

Harness: `node tools/test-mp-turn-sync.mjs` (pass/rejoin/async/AI/double-tap/remote-wins/coalesce) and `node tools/test-placement-ux.mjs` (ghost leftover + real bomber).

---

## 8.16.26 — V2.71 phone tap-tap-tap place; one-tap capital; undo

James on live V2.70 (390): placement still felt like tray → map → tray → map. The commute is the bug (peek tray at the bottom, land in the middle). Confirm on Place Capital was an extra tap. Drag-from-chip was rejected (more travel; tiny DnD already failed).

Verified in-repo:
- `selectedUnitType` starts null (no default-first). After a place it stays unless the type is exhausted (`_renderPhonePlacementTray` cleared it to null). V2.69 then ignores land taps with no unit — first tap and post-exhaust taps require a tray trip.
- Place Capital still pushed a Confirm CTA on phone. Undo lived only in the expanded placement body, hidden by the peek tray.

Fix (phone setup only — same `place-unit` / `place-capital` / `undo-placement` handlers; no drag):
- Default-peek the first remaining placeable unit on Initial Deployment, and again when the selected type is exhausted. First land tap places.
- Sticky type after a place. He only opens the tray to change type.
- Place Capital: tap owned land commits. No Confirm. Miss / water / unowned still do not apply.
- Peek CTA exposes existing Undo for the current place, and in-memory undo for the last capital (not serialized; SCHEMA 11).
- V2.69 inspect split stays (place-tap does not open the card; long-press edge chip). V2.67 peek / V2.68 ink / V2.70 Fit stay.

Desktop ≥901 and tablet 481–900 frozen. No minimap-hide, combat toast, or tech/purchase work.

Harness: `node tools/test-tablet-chrome.mjs` (sticky / default-first / one-tap capital / undo predicates; existing peek + gold + Fit + inspect).

---

## 8.16.26 — V2.70 phone Fit is a regional window (never one chip, never poster)

V2.68 fillFrame killed the teal letterbox, but Fit still framed a single selected tile (Place Capital / first deploy tap) or, for worldwide empires, a world-span set that collapsed to a poster/centroid.

Fix (phone Fit only — same `applyPhoneCameraFit` / `fillFrame` path):
- Window is **owned land + neighbors / legal dests**. Adjacent sea is included so a coastal region still shows coastline.
- Never a single tile: owned ≤ 1 expands to neighbors; a tiny bbox is padded to a min region.
- Never the whole poster: worldwide owned uses the capital cluster (or the selected stack’s cluster), then neighbors.
- fillFrame still fills the map pane height (no teal letterbox).

V2.67 peek tray and V2.68 ink-edge stay. Desktop ≥901 and tablet 481–900 frozen. V2.69 peek-place / inspect predicates stay. SCHEMA_VERSION stays 11.

Harness: `node tools/test-tablet-chrome.mjs` (region vs chip vs poster, coastline neighbor, fillFrame, existing peek + gold + V2.69 tap/inspect).

---

## 8.16.26 — V2.69 phone setup tap places; inspect is a long-press edge card

James on live V2.68 (390, Place Capital / Initial Deployment): tap land opened the half-screen territory card. Then he had to tap a unit in the tray and tap the same land again to place. The inspect sheet covered the tile (inspect-blocking-commit).

Verified in-repo: `setSelectedTerritory` already places when a peek chip is selected. `mouseup` then always called `tooltip.show()` on phone, and the 400ms hover timer could also pop the full card.

Fix (phone setup only — same `place-unit` / Place Capital handlers):
- Noun first: peek a unit chip, then one tap on legal land places it. No second tap. No tooltip.
- No unit peeked: tap does not inspect and does not select. Peek hint is “Tap a unit, then the map.”
- Place Capital: tap owned land selects it; one Confirm CTA is the verb (no second hint line). Miss / water / unowned taps do not clear a pending confirm. No tooltip on that tap.
- Long-press (≥500ms, <12px move) opens a small edge chip (name / owner / IPC) under the HUD. Inspect does not place. V2.66 dismiss rules stay when a card is shown.

V2.67 peek tray and V2.68 ink-edge gold stay. Desktop ≥901 and tablet 481–900 frozen. SCHEMA_VERSION stays 11.

Harness: `node tools/test-tablet-chrome.mjs` (noun-first tap, capital confirm kept, peek hint vs Confirm, edge clamp, existing peek + gold + tooltip dismiss).

---

## 8.16.26 — V2.68 phone Fit fills the frame; gold is an owned edge

James on live V2.66 (390): (1) teal/blue bands above and below the map wasted the frame; (2) the gold owned-land wash shouted.

Verified in-repo:
- Canvas clear is `#3CC0BF`. `fitBounds` uses contain (`min(cssW/bw, cssH/bh)`). Fitting the 3500×2000 world (or a wide bbox) on 390×844 yields zoom ~0.11, viewport taller than `MAP_HEIGHT`, `_clamp` centers Y, and the extra vertical is empty teal — a world poster, not Fit-to-problem. `boundsFromPoints` also returns null for worldwide span and falls through to `fitWorld`.
- V2.66 gold was `rgba(255,214,32,0.55)` fill + `8/zoom` stroke + matching `shadowBlur` (the 20% / 2.5 world-px pass was invisible at Fit). Same `renderPhoneLegalHighlights` path.

Fix (phone-only; same highlight + Fit helpers):
- Owned land is a 2 CSS px **ink edge** (dark `#2a1f08` + muted gold `#c9a227`), no fill flood, no glow. Faction fill is never the only owned cue. Still screen-space so it reads at Fit.
- Fit frames **owned / selected stack / dests** with `fillFrame`: contain the problem, but never zoom out past `canvasH / MAP_HEIGHT`. No all-capitals world poster. Worldwide span uses a regional centroid window instead of letterboxed teal.

Desktop ≥901 and tablet 481–900 stay frozen. V2.66 tooltip show/dismiss unchanged. SCHEMA_VERSION stays 11. V2.67 peek tray stays. No legal-marks, inspect-gesture, combat-preview, minimap/zoom hide, CSS-zoom, or Firebase.

Harness: `node tools/test-tablet-chrome.mjs` (edge-only gold, 390 Fit does not letterbox, V2.67 peek predicates + tooltip predicates still pass).

---

## 8.16.26 — V2.67 phone peek tray (map-first; no persistent 42/50dvh sheet)

On `html.mobile-shell` / max-width 480, Purchase / Mobilize / Initial Deployment / movement rendered the full Actions or placement list. CSS capped `#sidebar` at 42dvh and `.player-panel--place-tray` at 50dvh, so the unit sheet covered about half the 390×844 frame and the map was a sliver.

Fix (phone-only — same DOM, same Actions / End Phase / `phone-select-unit` / `buy-unit` / `mobilize-unit` handlers):
- Default is a peek detent: phase hint on its own row, one horizontal row of 44px unit/action chips, one primary CTA (≥44×44) above the home indicator, plus a 44px expand handle.
- Expand is one detent (36dvh) for Units / Players / Territory / Log — not a 280px column and not a persistent 42/50dvh cover.
- Purchase / Mobilize / Deploy stay completable from the peek chips; expand still has +/− / Max / the full list.

V2.66 tooltip-visible + gold owned-land are untouched. Desktop ≥901 and tablet 481–900 stay frozen. SCHEMA_VERSION stays 11. No CSS-zoom, second JS client, Firebase, legal-mark, Fit, inspect-gesture, or combat-preview work.

Harness: `node tools/test-tablet-chrome.mjs` (peek default, 36dvh expand, 44px chips, hint stacked above CTA, desktop/tablet CSS unchanged). Existing harnesses still pass.

---

## 8.16.26 — V2.66 phone tooltip actually shows + gold reads at Fit (V2.65 390 playtest)

Live V2.65 at 390×720 (DevTools device mode, `html.mobile-shell` on) failed both V2.65 fixes.

1. **Tooltip never appeared.** `#territoryTooltip` got the right innerHTML (e.g. Baltic Sea Zone) and the V2.65 phone CSS, then stayed `territory-tooltip hidden` / opacity 0. Cause: `_position` → `clampTooltipToMapArea`. On phone `#sidebar` is a full-width bottom tray (or a leftover 280px rail rect from the 900px tree). `mapRight` shrinks, the ~280px card cannot fit, clamp returns null, `hidden` is put back. DevTools clicks also have no `fromTouch`, so the show path was skipped and mousedown hid the card.
2. **Owned-land gold invisible** in Place Capital and Initial Deployment. `phoneLegalNames` was the current player's land, but `renderPhoneLegalHighlights` used a 20% gold wash on opaque continent fill and a 2.5 **world-px** stroke. At Fit (~0.11) that stroke is ~0.3 CSS px.

Fix (phone-only):
- Phone ignores the sidebar rect when resolving map-right. Viewport clamp never returns null — do not re-hide after `show()`. Phone clicks show/toggle the card even without `fromTouch` (DevTools). V2.65 dismiss rules stay (tap-away, second tap, 2s, menu, Fit, phase/turn, leave-phone). Desktop hover + clamp-to-sidebar unchanged.
- Gold fill 55% and a screen-space outline (~8 CSS px = `8 / zoom` world units) so owned land is obvious at Fit on a 390-wide phone.

Desktop ≥901 and tablet 481–900 stay frozen. SCHEMA_VERSION stays 11.

Harness: leftover 280px rail must not hide the phone card; legal names still current-player land only; outline width at 0.11 is >40 world units. Existing harnesses still pass.

---

## 8.16.26 — V2.65 phone tooltip + owned-land highlight (V2.64 390 playtest)

Live V2.64 at 390×844 passed as a separate phone UX (landing cards, setup cards, Fit shows the world, full-screen menu, unit tray + gold halo). Desktop 1280 unchanged.

Blockers / nits on phone:
1. Territory info card stayed pinned mid-screen after a tap. It survived turn changes, sat on top of the ⋯ menu and Territory panel (tooltip is `position:fixed` on `body` at z-index 100; the menu sheet lives inside `#hud` at z-index 70), and persisted after resize to desktop. Cause: every canvas tap re-showed the card; chrome taps never hid it.
2. Place Capital / Initial Deployment: owned land was invisible until he probed — continent fill only, no legal-territory cue.
3. Tooltip text read dark-on-dark through the 75% glass card.

Fix (phone-only — `html.mobile-shell` / `@media (max-width: 480px)`):
- Tap-to-toggle + 2s auto-dismiss. Hide on tap-away (HUD / tray / Fit), menu open, phase/turn change, Fit, and leaving the phone shell. z-index 40 so the card sits under the menu sheet. Desktop hover tooltip unchanged (z-index 100).
- Soft gold fill + outline on the current player's owned land during Place Capital and Initial Deployment. Fit-to-owned uses that player's land in both setup phases.
- Opaque card + `#f8fafc` text; faction names use `readableFactionTextColor`.

Desktop ≥901 and tablet 481–900 stay frozen. SCHEMA_VERSION stays 11. Rules / combat / Firebase / turn email / CSS-zoom / second JS client unchanged.

Harness: `node tools/test-tablet-chrome.mjs` (tooltip hide-on-menu / z-index 40 / legal-land names). Existing `test-possessive.mjs`, `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.64 separate phone chrome tree (James V2.63 playtest)

James on V2.63 (phone): better than the desktop squeeze, but still hard. Menu lived in a cramped ⋯ dropdown over the HUD. Default zoom could not show the board (min zoom 0.4 ≈ a couple of territories). Setup pieces were 8px tokens on a zoomed-in map — he could not see remaining units.

Fix (phone-only — `html.mobile-shell` / `@media (max-width: 480px)`). Same game code, different chrome templates. Desktop ≥901 and tablet 481–900 stay on their existing trees.

- **Setup:** full-screen Local / Online cards; faction pick as tappable cards; START GAME sticky. Initial placement is a bottom tray of remaining units (name + count + icon, ≥44px rows). Tap a unit type, then tap the map. Desktop keeps the queue / +/− / confirm sheet.
- **Map / zoom:** phone min-zoom can fit the world (~0.11 at 390px). Enter + visible **Fit** (≥44px) frame all capitals / owned land / world. Pinch still works. Desktop min-zoom stays 0.4; Fit is `display: none` outside the phone block.
- **Menu:** full-screen sheet (Players, Territory, Log, Rules, Save & Exit) with 44pt rows. Not a ⋯ dropdown overlapping the HUD.
- **In-game chrome:** map-first. Idle peek is one hint + one CTA. No permanent 4-tab bar. Phase identity stays on the top bar. Purchase / tech / movement still open a tray body when those phases need it.
- **Pieces:** phone unit markers stay visible at world-fit zoom (≥20px) and get a gold halo for the selected tray type.

Also keeps the V2.63/early-V2.64 phone fixes: one Place Capital hint, readable faction text color, 44px targets.

SCHEMA_VERSION stays 11. Rules / combat math / Firebase / turn email / WhatsApp / territory-label collision / CSS-zoom of the desktop HUD / second JS client unchanged.

Harness: `node tools/test-tablet-chrome.mjs` (phone tray / Fit / menu-sheet / unit-size predicates + existing 480/tablet/desktop split). Existing `test-possessive.mjs`, `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.63 desktop-safe iPhone chrome (James V2.62 playtest)

Live V2.62 on iPhone (~390×844) was the desktop HUD stuffed into a phone: map was a ~110px postage stamp beside a 280px sidebar; title + five player chips overlapped; End Turn and Done could stack; Max sat next to zoom +/−; touch targets were 18px; “Pass the device” painted over live chrome; nothing used the Dynamic Island or home-indicator safe areas.

Fix (chrome only — iPhone shell via `html.mobile-shell` + `@media (max-width: 480px)` so the V2.61 tablet band 481–900 and desktop ≥901 stay on their existing trees):
- `viewport-fit=cover` (already on) + `100dvh` + `env(safe-area-inset-*)` on the top bar and bottom CTA
- Compact 44–52pt top bar: `{color} {faction} · {3/7 Combat Movement}` at ≥11pt. Do not copy the tablet hide-dots / 9px phase-name path. Wordmark / player list / settings behind ⋯
- Hide the persistent 280px right rail. Actions + `End ${phase}` move to a bottom tray (`max-height: 42dvh`). Map is full-bleed and the majority of the screen at idle
- Tray peek: PHASE_HINTS one-liner next to the one primary `End ${phase}` CTA (min-height 48px) above the home indicator. End Turn and Done never coexist; illegal/disabled actions stay hidden
- Max stays on the unit-count row; zoom +/− parks top-left (≥44px, away from the CTA; pinch is primary)
- Handoff is an opaque full-screen modal that hides HUD / panel / zoom / chips (one dismiss control)
- Combat / auto-battle hides End Turn, Done, and Max
- Every phone control ≥44 CSS px with ≥8px gap
- Hover-only facts get a tap equivalent: Surrendered is a visible OUT; IPC is visible on the ⋯ player list (not `title=` only)
- 390px Place Capital: hide the 280px rail (map-first); phase chip stays visible; one bottom CTA
- 390px setup: START GAME is sticky above the fold (no scroll to reach it)
- Phone tap targets: ☰ / ⋯, Turn Summary ✕, and menu rows are ≥44 CSS px
- Players tab is a 2-column stat grid, not a 5-column desktop table crammed into ~250px

QA: 390×844 (iPhone shell) and 1280×800 (desktop). 772×635 stays on the V2.61 tablet chrome path. SCHEMA_VERSION stays 11. Rules / map / combat math / economy / victory / multiplayerGuard / Firebase / touchInput zoom math / territory-label collision / bottom-sheet detents / turn emails unchanged.

Harness: `node tools/test-tablet-chrome.mjs` (480px shell predicates, 3/7 phase label, PHASE_HINTS peek, existing 772px tooltip checks). Existing `test-possessive.mjs`, `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.62 turn-badge possessive (V2.61 playtest)

Live V2.61 HUD turn badge read **"Germans's Turn"** (double possessive). Cause: HUD / player-panel / action-log copy concatenated `name + "'s Turn"`.

Fix (UI/copy only): shared `possessiveName` / `possessivePhrase` in `src/utils/possessive.js`.
- Plural / sibilant names (Germans, Russians, Americans, James, Max): `Germans' Turn`
- Adjectival demonyms (British, Japanese): `British Turn` (no `'s`)
- Other names: `Alice's Turn`

Same helper on the sidebar turn header, action-log "turn begins" line, and lobby default "… Game" name. Combat headers already used the bare faction name.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup-rules / map / multiplayerGuard / touchInput.js / zoom math unchanged.

Harness: `node tools/test-possessive.mjs`. Existing `test-tablet-chrome.mjs`, `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.61 tablet chrome (V2.59 narrow-window playtest, ~772×635)

Playtest on a ~770px window (sidebar ~280px, map ~490px):

### 1 — Territory tooltip covered the Actions panel

A ~280px hover/click card (`z-index: 100`) painted over the phase header, tabs, and +/Max. `_position` only flipped at the viewport edge.

Fix (display-only): `clampTooltipToMapArea` / `resolveMapRightEdge` keep the card in the map gutter (left of `#sidebar`). If it cannot fit, the tooltip is dismissed. CSS `max-width: min(280px, 100vw − sidebar − pad)` as a backup.

### 2 — Minimap ate the lower-left map

233×133 (coarse-pointer 300×171) covered Southern Africa / South Atlantic on a ~490px map.

Fix: shrink `#minimap` to 140×80 on narrow/short viewports (156×89 when coarse). Do not remove it. `_panFromEvent` now uses the displayed CSS box so clicks stay mapped after the shrink.

### 3 — Header wrap / flag-strip clip

“TACTICAL RISK” wrapped onto two lines; the turn-order flags were cut by the turn badge. Cause: default flex-shrink on the title plus the duplicate `.hud-legend` name strip.

Fix: nowrap + smaller title, compact turn badge, hide `.hud-legend` / phase-dots below 900px. Title, turn badge, and flag strip stay on the 48px row.

### 4 — Local setup dead space + unreadable faction names

`.lobby-overlay.modern::before` is more specific than the tablet hide, so the splash half still reserved space. `.lobby-container.modern` max-width 600px left ~180px empty. Unselected names are a disabled placeholder at opacity 0.4 / `#475569`.

Fix: hide the modern splash at ≤900px, let the setup column use the width, raise disabled/placeholder name color to `#cbd5e1`.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup-rules / map / multiplayerGuard / touchInput.js / zoom math unchanged.

Harness: `node tools/test-tablet-chrome.mjs`. Existing `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.60 zoom-vs-Max overlap + empty Recent Moves (V2.59 playtest)

Playtest on live V2.59 (tablet-relevant):

### Bug 1 — map zoom +/− sat on INITIAL DEPLOYMENT Max buttons

`#zoom-controls` is `position: absolute; right: 12px; z-index: 50` on `document.body`. The player panel is 320px at the right edge with z-index 20, so the circular +/− landed on the unit-row Max column. Clicking Max zoomed the map.

Fix (CSS only — `touchInput.js` / zoom math unchanged):
- Park zoom in the visible map gutter: `right: calc(320px + 12px)`.
- Raise `.player-panel` to z-index 55 so Max/steppers keep the hit target if they ever overlap.

### Bug 2 — RECENT MOVES row after Confirm Attack was icon-only

A later global `.pp-undo-btn { width: 100% }` (mobilize-era) overrode the compact history-row undo. In the flex row, the full-width button ate `.pp-move-desc` (`overflow: hidden`), so a real Novosibirsk → Evenki National Okrug attack rendered as an empty bar with only ↩.

Fix (display-only):
- Scope a compact `.pp-move-item .pp-undo-btn` so the description stays visible.
- Exported `formatRecentMove` — skip rows with no unit/from/to string; do not change undo or `moveHistory` writes.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup / map / multiplayerGuard / touchInput.js unchanged.

Harness: `node tools/test-recent-move-display.mjs`. Existing `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.59 initial-deploy naval remainder near-lock (V2.58 playtest)

After 18 land/air units, Remaining = 6 (all naval). Selecting a land tile (e.g. Novosibirsk) showed “No land/air units to place”, DEPLOYED 0/6, and **no Done / Next Player button**. A random sea zone greys the naval list and still hides Done. Only a sea zone adjacent to the player’s own coast unlocks +/Max; Done appears after the 6 ships are placed.

Root cause (UI gating, not a placement-rule bug): `hasPlaceableUnits` stays true while leftover ships have a legal coastal sea zone, so `showDone` is false. The selected land tile offers no +/Max, and the panel had no hint pointing at a legal sea zone. Landlocked / enemy-occupied-only coasts already make `hasPlaceableUnits` false (Done was allowed) but that path had no copy.

Fix (UI only — `src/ui/playerPanel.js`):
- Exported `computeInitialPlacementUX`. When only naval remain and a legal drop exists, show a sticky hint to click a sea zone adjacent to an owned coast; **do not** offer Done (ships still cannot skip onto land).
- When only naval remain and there is **no** legal sea zone, show Done plus a “no legal sea zone” message so the player is not hard-locked. `finishPlacementRound` already skips unplaceable leftovers via `hasPlaceableUnits`.
- `_isValidPlacementTerritory` now treats enemy-occupied seas as invalid for the +/Max controls, matching `hasPlaceableUnits` / `placeInitialUnit`.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup / map / multiplayerGuard / touchInput.js unchanged.

Left for later (V2.57 nits, not a clean small fix here): confirm-bar click deselect / one dump to main menu mid-placement; post-Deploy selection jump (Russia→Kwangtung); remaining-count once staying 24 after a 6-unit deploy.

Harness: `node tools/test-placement-ux.mjs` (Done/hint predicates + `hasPlaceableUnits` landlocked / coastal / enemy-sea). Existing `test-mp-turn-sync.mjs` + `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.58 multiplayer turn-bar + auto-battle soft-lock (Robert Watts playtest)

Playtest on live V2.57: Robert (non-active) saw Sean's green **End Combat Movement →** button. After naval deployment, Sean auto-battled Eire, got "connecting error" toasts, ended the turn, then stuck on a greyscale **End Mobilize Units →**.

### Bug A — spectator saw the active player's End-phase bar (display-only)

`_render()` already computed `isLocalPlayerTurn` (live `oderId === localUserId`, including `isWaitingForSync`) and `_renderActionsTab` hid on waiting. `_renderBottomActions` never used that flag: it skipped AI, then always drew the green `End ${TURN_PHASE_NAMES[turnPhase]} →` during PLAYING. `multiplayerGuard` still blocked `nextPhase` on live oderId, so Robert could see the button but not advance Sean's turn.

Fix (`src/ui/playerPanel.js`): pass `isLocalPlayerTurn` into `_renderBottomActions` and return empty when multiplayer && !local turn (same predicate as the Actions tab). Exported `computeIsLocalPlayerTurn` / `shouldShowBottomTurnActions` for the harness. Did **not** change multiplayerGuard oderId logic, hasAIAuthority, schema 11, or touchInput.js.

### Bug B — auto-battle push storm + failed reload left a grey mobilize button

No literal "connecting error" string. Closest: `push_failed` / `push_exhausted` toasts in `main.js`. `_autoBattle` called `_syncCombatStateToGame()` → `_notify()` → `syncManager.pushState()` (100ms debounce) every combat round, so one Eire auto-battle hammered Firestore. Each retry cycle toasted "Connection hiccup"; exhaustion toasted "re-synced to the last confirmed state."

Two follow-on bugs made that a soft-lock:

1. **`_reloadRemoteState` no-op'd on equal versions.** After a failed write, remote version === local version, but local `gameState` still held uncommitted combat/mobilize mutations. The exhaust path claimed to snap back and never did. Combat UI local state could stay ahead of the doc.
2. **Exhaust handler only re-rendered the player panel.** It did not reset combat UI or put the Actions/place UI in front. The bottom bar's grey **End Mobilize Units →** is `disabled` when `getPendingPurchases()` qty > 0 — correct rule — but after a fake re-sync the place UI and the combat overlay could disagree with that bar.

Fixes:
- `GameState.pauseNotifications()` / `resumeNotifications({ flush })` — auto-battle suppresses per-round notify, then one flush + `pushStateNow()`.
- `_reloadRemoteState({ force: true })` on exhaust applies the remote doc even when versions are equal; emit `push_exhausted` *after* the reload.
- Exhaust handler calls `combatUI.syncFromAuthoritativeState()` and `playerPanel.revealActionsAfterResync()` so the player can retry the move (or place purchased units) instead of staring at a dead bar.
- `push_failed` toasts only on attempt 1 (not every retry). Disabled mobilize bar now says *why* (place purchased units on a factory / sea zone via the Actions tab).

No turn timers. SCHEMA_VERSION stays 11. Combat math / unit stats / economy / victory / setup / map unchanged.

Harness: P6 added (notify pause + equal-version exhaust reload). `node tools/test-mp-turn-sync.mjs` covers the bottom-bar predicate and pause/resume.

---

## 7.27.26 — V2.56 push-persistence fix (Robert's V2.55 playtest, 4 bugs)

Harness now at **59 checks, all green** (`tools/robustness-harness.mjs`).

### Bug 1 (GAME-BREAKING) — push-persistence failure, not turn-authority

Root cause: Robert's client advanced its *local* state through
combat → mobilize → the next player's turn, but **none of it committed to
Firestore** — the doc stayed frozen at v132, phase=combat. Every downstream
symptom (lost combat, "playing ahead," being able to act on the next player's
turn after refresh) fell out of that one fact: after refresh, Firestore
authoritatively said it was still Robert's turn, so he legitimately re-controlled
his own un-ended turn.

Decisive evidence: Robert and Bastion both reported Local Version 132 — they
*agreed*, so the doc genuinely never moved. The `state_push: version=133` log
lines were NOT commit confirmations; they were logged in `gameState.subscribe`
(main.js) as `localVersion + 1` on every notify, *before* the debounced push ran.
15 notifies at v132 → 15 "133" lines, zero commits. `push_failed` events were
real transaction throws that `_doPush` swallowed with no retry and no rollback.

Fixes (all in `src/multiplayer/syncManager.js`):
1. **Serialize + coalesce `_doPush`** — one in-flight transaction; a change
   during flight sets `_pushDirty` and re-pushes once on completion. Kills the
   contention storm from racing debounced/`pushStateNow` transactions.
2. **Retry transient failures** (3× exp backoff + jitter). On exhaustion,
   **reload the authoritative doc** so a client can never proceed on (or hand
   the turn off from) un-persisted state. New `push_exhausted` event → user sees
   "re-synced to last confirmed state."
3. **`checkIsActivePlayer()` now derives from live `gameState.currentPlayer`** —
   single source of truth for title/guard/debug. New `canPushLocalChange()`
   keeps the cached-flag *push authorization* (so a turn-ending push, which has
   already advanced the live currentPlayer, still fires).
4. **`push_failed` now logs the payload** `{attemptedVersion, currentPlayerId,
   phase, attempt, error}` instead of the bare error — no more blind debugging.

Harness reproduces the exact Robert/Bastion sequence with old semantics (local
diverges, doc frozen), then proves the fix (client reloads to truth, the waiting
human never sees a phantom handoff, recovery commits cleanly).

### Bug 2 — AI ran even when no human was present (see PHASE_4_PLAN.md)

Default is now **wait-for-human-present**: AI pauses when no non-AI,
non-surrendered player is connected, resumes on reconnect. Configurable via
doc-level `aiRunsWhenUnattended` (additive field, no schema bump). Policy logic
in `src/multiplayer/aiPolicy.js`; three options + trade-offs documented in
PHASE_4_PLAN.md.

### Bug 3 — turn indicator flipped back and forth — RESOLVED by Bug 1 fix #3

The cached-flag divergence was the cause; live-derived `checkIsActivePlayer()`
means guard, sidebar, title, and debug panel now share one source. Verified in
the harness (B3): a stale cached flag can no longer make a client think it's
still their turn.

### Bug 4 — "dice rolls seem predetermined" — INVESTIGATION ONLY, no gameplay change

Rolls are unseeded `Math.floor(Math.random()*6)+1` — there is no seeding
anywhere in the code. The "predetermined" impression was almost certainly a
byproduct of Bug 1: Robert re-resolved the *identical* combat repeatedly across
refreshes (same un-persisted state each time → similar outcomes). Added a central
`gameState._rollDie(context)` that all three d6 sites route through, logging each
roll (value + context + timestamp) to a bounded in-memory ring buffer
(`getRollLog()`, 500 entries, never serialized to Firestore) so future fairness
claims can be checked empirically. Distribution is unchanged.

---

## 7.21.26 — V2.55 robustness audit (compositions × play modes × version upgrades)

Systematic audit against `ROBUSTNESS_MATRIX.md`, backed by an executable
N-client harness (`tools/robustness-harness.mjs`, 33 checks, all green).

### Dimension C (version upgrade) — NEW capability, not a bug fix

Mid-game redeploys previously had no signal: a tab left open across a deploy
kept running old code with no prompt to refresh. Added:

- `src/version.js` — dependency-free `GAME_VERSION` / `SCHEMA_VERSION` /
  `compareGameVersions` (fail-safe: a missing or malformed stamp never prompts).
- Every game-doc push now stamps `clientVersion` + `schemaVersion`. Old clients
  ignore the extra doc-level fields; state schema (v11) is unchanged.
- On loading a doc written by a strictly-newer client, syncManager fires a
  one-shot `version_outdated` event → main.js shows a persistent, dismissible
  "refresh to update" banner. Non-blocking on purpose: an async player mid-turn
  must still be able to finish.

### Bug (surfaced during the audit) — lobby init crash

Extracting the version constant into `src/version.js` and re-exporting it from
`lobby.js` via a bare `export { GAME_VERSION } from '../version.js'` left the
name undefined *inside* lobby.js, so `_renderMainMenu` threw
`GAME_VERSION is not defined` and init aborted. Fixed by importing locally and
re-exporting. Caught by in-browser verification (would have broken every load).

### Refactor

Pure surrender transform extracted to `src/multiplayer/surrenderCore.js` (no
Firebase imports) so the harness exercises the exact live-session logic.

---

## 7.20.26 — V2.53 playtest (2 humans + 2 easy AI) → fixed in V2.54

### Bug 2 (deployment turn-stuck) — ROOT CAUSE

Robert (host) refreshed his tab mid-game. `presenceManager` DELETES the
presence doc on unload, and `getPlayerPresence` treats a missing doc as
instantly OFFLINE — so Bastion's client saw "host offline" for the few
seconds of the refresh, seized AI authority via the V2.52 host-failover,
and BOTH clients ran the AI deployment turns concurrently. The V2.49
transactions prevented same-version clobber but the two runners
interleaved semantically divergent states: the turn rewound
(doc currentPlayerId=British-AI vs state currentPlayerIndex=0/Bastion in
the debug dump), and a racing client that transiently computed
phase=PLAYING ran tech→purchase AI logic, pushing the impossible
`phase=unit_placement + turnPhase=purchase` combination that wedged the
game. (Presence rules only started working in V2.51's deploy — this
failover path had never fired in a real game before this playtest.)

Fixes (V2.54):
1. Failover requires the host to be CONTINUOUSLY offline for 90s before
   takeover (refresh windows no longer trigger it), with clear toasts on
   takeover and on returning control.
2. AIController re-checks authority BETWEEN actions and aborts a
   mid-run AI turn the moment authority is lost.
3. `nextPhase()` refuses to run outside the PLAYING phase (turnPhase
   corruption structurally impossible).
4. `loadFromJSON` normalizes invalid phase/turnPhase combinations —
   the currently wedged live game self-heals on next load+push.
5. Same-version snapshots with a different currentPlayerId now load the
   doc state (doc is authoritative) instead of only flipping the cached
   flag.
- Verified by a 2-client race harness (real GameState+AIController vs a
  mock transactional doc, 11/11 assertions): host-refresh no longer
  hands over authority; under forced instant-takeover contention the
  second writer lands ZERO writes (7 transaction aborts); corrupted docs
  normalize on load.

### Bug 1 — game missing from My Games before start

A pre-start game exists only as a `waiting` LOBBY doc; My Games queried
only the `games` collection. Fixed: My Games now shows a "Waiting to
start" section with lobbies you're a member of; tapping one returns you
to that lobby.

### Bug 3 — sidebar said one player, state said another

Two contributors: (a) the sidebar trusted the cached `isActivePlayer`
flag OR'd with the state check, so it could disagree with what the guard
actually allowed; now both use the identical live state check.
(b) The same-version/different-player snapshot case updated the flag
without loading state (see fix 5 above). ("Sean" vs "Bastion" is the
same person — account display name vs table name; the debug dump's
state was authoritative and consistent with the HUD.)

---

---

## 7.14.26 — V2.52 pass-and-play / save-state / multiplayer-mode audit

Systematic audit of all play modes and their combinations. Findings:

### Mode support matrix (verified against code)

| Mode | Supported? | Notes |
|---|---|---|
| Pure pass-and-play (1 device, 2+ humans, optional AI) | ✅ | Handoff overlay on every human→human transition (V2.51); localStorage autosave + lobby "My Games → Continue" resume |
| Pure online, live | ✅ | Firestore sync, presence indicators, host runs AI, host-failover if host offline |
| Pure online, async | ✅ | State persists in Firestore indefinitely; rejoin via My Games / Open Games; NEW: tab title flags "● Your turn" for backgrounded tabs |
| Mixed (hotseat pair + remote players) | ❌ by design | One signed-in account = one player; the multiplayer lobby has no "add local player" option, so the scenario cannot be constructed — it fails safely by being unofferable, not silently. Roadmapped in PHASE_4_PLAN.md |
| Reconnect / resume online | ✅ | Rejoin loads latest Firestore state; presence shows the player again; NEW: "X is back online / went offline" toasts |

### Real gaps found and FIXED in V2.52

1. **Online games clobbered the hotseat autosave.** `gameState.autoSave()`
   had no multiplayer guard, so every online turn overwrote the local
   autosave slot — and "My Games → Continue" would then load a broken
   half-multiplayer state with no sync manager. Fixed: autosave is now
   local-games-only (online persistence is Firestore's job).
2. **Setup phases never autosaved.** Autosave only ran on nextTurn/nextPhase
   (playing phase), so a hotseat game closed during capital placement or
   deployment was silently lost despite the resume UI existing. Fixed:
   `placeCapital` and `finishPlacementRound` now autosave.
3. **No async-turn awareness.** A backgrounded/async player had no signal
   it was their turn without switching to the tab. Fixed: browser tab title
   becomes "● Your turn — Tactical Risk" while it's your turn (reset on
   turn end / exit / auth error). Push/email notifications roadmapped.
4. **No connect/disconnect visibility.** Presence dots existed (and only
   work as of the V2.51 rules deploy) but transitions were silent. Fixed:
   "X is back online" / "X went offline" toasts for other players.

### Audit answers with no code change needed

- **Handoff overlay context**: fires only when `!isMultiplayer` and ≥2
  human players — verified in V2.51 (fires per human→human transition in
  hotseat incl. setup phases; never in online or vs-AI games). The
  mixed-device ordering question is moot while mixed mode is unsupported.
- **Mid-turn refresh (online)**: phase/turn transitions push immediately
  (`pushStateNow`); fine-grained actions debounce 100ms, so at most the
  final click before a hard-close is lost. Rejoin restores the latest
  pushed state and correct turn.
- **Write races**: `_doPush` runs in a Firestore transaction — a stale
  client's push aborts and triggers a state reload (V2.49, re-verified).
  Two clients cannot both win the same version number.
- **Stall behavior — documented, not changed**: async games have no turn
  timer (hang forever by design until someone acts; Leave/surrender and
  admin delete are the escape hatches). Live human disconnect mid-turn
  blocks the game until they return (host-failover only covers AI turns).
  Turn timers / skip-votes are roadmapped in PHASE_4_PLAN.md. Hotseat
  idle: no timeout, intentionally.

---

Running list of playtest debug rounds. Newest first. Status values:
**OPEN** / **FIXED (pending live verification)** / **VERIFIED**.

---

## 7.11.26 — V2.46 playtest (2x human, 2x easy AI)

Short round — did not get past deployment.

### Bugs

1. **Open Games is not showing the current game** (though it shows under
   'Your Games'). — reported by Robert
   - Status: **FIXED (pending live verification)**
   - Root cause: the Open Games browser only queries lobbies with
     `status == 'waiting'`. Once a game starts, the lobby flips to
     `'starting'` and disappears from the list entirely. Games in progress
     were only reachable via the separate "My Games" screen.
   - Fix: Open Games now shows a "Your games in progress" section listing
     the player's own active/starting games with a Resume action
     (`multiplayerLobby.js` + `lobbyManager.getMyActiveGames()`).

2. **Unable to get past deployment: game state keeps reverting to a single
   player's turn repeating.** Sequence: Sean capital → Robert capital →
   Sean deployment 1 → Robert deployment 1 → Benson (AI) skipped, back to
   Robert. — reported by Robert/Sean
   - Status: **FIXED (pending live verification)**
   - Root causes (several compounding):
     a. `main.js` created an **AIController on every client**, not just the
        host (`shouldInitAI || hasAIPlayers`). Both human clients tried to
        play Benson's turn.
     b. `multiplayerGuard` used a **cached** `isActivePlayer` flag that lags
        the real turn by the push debounce + network round-trip, so the
        non-host client's AI run was NOT blocked during that window. Two
        clients pushed conflicting states, each stamped `localVersion + 1`,
        clobbering each other → turn reverts/loops.
     c. `syncManager._doPush` blind-wrote with `updateDoc`, so a stale
        client could overwrite a newer remote state.
     d. The prior V2.46 worktree fixes (live-oderId guard, deployment
        skip-loop, `pushStateNow`) were **never merged to main**, so the
        deployed build still had the old bugs.
     e. Committed `main.js` called `playerPanel.setWaitingForSync()`, which
        only existed in an uncommitted diff → TypeError when ending the
        income phase in multiplayer on the deployed build.
   - Fixes: host-only AIController; live oderId turn check in the guard;
     transaction-guarded pushes that refuse to clobber newer state;
     immediate (non-debounced) push on phase/turn transitions; deployment
     round skip-loop; `setWaitingForSync` + missing auth methods
     implemented and committed together.

### Additional defects found during the V2.49 end-to-end audit

4. **Presence (online indicators) never worked.** Presence docs are written
   to the `games/{id}/presence/{userId}` subcollection but firestore.rules
   only covered a top-level `/presence` collection — every write was
   silently denied. Fixed with a subcollection rule. Also: game-doc delete
   rule referenced a nonexistent `hostId` field (admin delete always
   failed) — now admin-email based.
   - Status: **FIXED (pending live verification)**

5. **AI turns crawl/stall when the host's tab is hidden.** Browsers clamp
   chained timers in hidden tabs to ≥1s (eventually 1/minute), so an AI
   turn could take minutes if the host alt-tabbed — reads as "the AI's
   turn is stuck". Fixed: AI skips cosmetic delays and uses microtask
   scheduling while `document.hidden`; a `visibilitychange` listener kicks
   the AI when the tab returns. Verified in-browser: hidden-tab AI turns
   now complete in under a second.
   - Status: **FIXED (verified locally)**

6. **Game stalls forever if the host disconnects during an AI turn.**
   No other client was allowed to run AI. Fixed: host-failover — when
   presence marks the host offline, the first online non-surrendered human
   in turn order takes over AI duty (safe under the new transaction-guarded
   pushes). Eliminated players (no territories, no units) are also now
   skipped by turn advance so an absent wiped-out player can't block the
   game, and last-player-standing ends the game.
   - Status: **FIXED (needs live 2-client verification)**

### V2.49 end-to-end verification (local, 1 human + 1 easy AI)

Full game loop driven in-browser with zero console errors: lobby setup →
random turn order → AI capital auto-placement → human capital → 5
interleaved deployment rounds (AI ↔ human, skip-loop verified) →
transition to playing phase → human full turn → AI full turn (all 7
phases) → round wrap → Round 2. Multiplayer-specific paths (Firestore
sync, surrender, Open Games) still need a live 2-account session.

### Notes / feature requests

3. **'Your Games' needs a way to exit (or surrender) a game in progress.**
   — requested by Robert
   - Status: **IMPLEMENTED (pending live verification)**
   - Each game row in "My Games" now has a Leave button: confirms, marks
     the player surrendered, neutralizes their territories/units, advances
     the turn if it was theirs, removes the game from their list, and ends
     the game if fewer than 2 players (or no humans) remain.

---

## Earlier rounds

Screenshots from earlier rounds are in `Bugs V2.45/` and
`Naval Placement bugs/`. (Pre-dates this log; not itemized.)
