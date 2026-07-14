# Phase 4 — Commercial Polish Roadmap (PLAN ONLY — nothing here is implemented)

Scoped 7.14.26 after the V2.52 mode audit. Parallel to `MOBILE_PLAN.md`.
Each area: priority, effort (S/M/L), dependencies, and why it matters
commercially. Ordering within a tier is the suggested build order.

---

## P0 — directly protects play sessions

### 1. Turn timers / stall recovery for online games
The V2.52 audit's biggest documented gap: an async game hangs forever if a
player never returns, and a LIVE game blocks if the current human disconnects
mid-turn (host-failover only covers AI turns). Design: per-game optional turn
timer (host sets: off / 24h / 72h); on expiry the game offers remaining
players a "skip their turn" or "convert to AI" vote. Needs a `turnStartedAt`
timestamp on the game doc and a client-side check (no server code needed —
any client that observes expiry can enact it via the existing transaction
guard).
- Effort: **M** · Depends on: nothing · Commercial: abandoned games are the
  #1 killer of async multiplayer retention.

### 2. Turn notifications (push/email)
Tab-title flag shipped in V2.52; real re-engagement needs Web Push
(Firebase Cloud Messaging) with an opt-in prompt, and/or email via a Cloud
Function on `currentPlayerId` change. Start with Web Push only.
- Effort: **M** (FCM service worker + opt-in UX + a Cloud Function) ·
  Depends on: adopting Cloud Functions (first server-side code in the
  project) · Commercial: async games die without a "your turn" ping.

### 3. AI stalemate detection + endgame heuristics
AIs with no favorable attacks hold position forever; two passive AIs can
loop indefinitely. Add: round-count-based aggression ramp, stalemate
detector (N rounds with no territory change → force best-available attack),
and endgame push toward capitals when income leader.
- Effort: **M** · Depends on: nothing · Commercial: "the game never ended"
  is a refund-review magnet.

## P1 — first-session experience

### 4. Tutorial / onboarding
Recommendation: light contextual overlay, not a separate mode — a
first-launch "coach" layer (dismissible banners per phase: what this phase
is, what to click) driven by a `seenHints` localStorage set, plus a
"Learn the basics" replay of those hints from the menu. A full scripted
mini-game walkthrough is a **L** follow-on; the coach layer is **S/M** and
captures most of the value. The existing per-phase sidebar hints are a
strong base.
- Effort: **S/M** (coach layer) / **L** (scripted tutorial game) ·
  Depends on: nothing · Commercial: first 10 minutes decide whether a
  stranger stays; this is the single highest-leverage new-player item.

### 5. Sound design
SFX for: dice roll, combat resolved, territory captured, unit placed,
phase change, your-turn chime (huge for async/hotseat), victory sting.
Options: (a) none; (b) free/CC0 library (Kenney audio packs) — **S/M**,
ship-quality is achievable; (c) commissioned — **L**, defer. Implementation:
tiny `sound.js` (Web Audio, preloaded, mute toggle persisted in
localStorage, default ON with first-visit hint). Haptics: `navigator.vibrate`
on capture/your-turn for coarse-pointer devices, **S** add-on.
- Effort: **M** overall · Depends on: nothing · Commercial: silence reads
  as "unfinished demo"; a your-turn chime also functions as a notification.

### 6. Animation & juice
Tiers: (a) **S** — CSS/canvas easing for territory-capture flash, phase-
banner transition, dice-roll shake in combat popup (diceAnimation.js exists
— audit and extend); (b) **M** — unit-movement tweening on the canvas
instead of snap (needs a small render-interpolation layer keyed off
moveUnits events); (c) **L** — full combat cinematics. Ship (a), then (b).
- Effort: **S→M** · Depends on: none for (a); render-loop refactor for (b) ·
  Commercial: perceived quality; juice is what screenshots/videos sell.

## P2 — depth and fairness

### 7. AI difficulty & personalities
Easy/medium/hard currently differ mostly in thresholds/randomness. Make the
difference legible: easy never attacks capitals early, hard plans 2-turn
capital pushes; add personality tags (Aggressive / Defensive / Opportunist)
selectable when adding an AI, mapped to the existing priority weights.
- Effort: **M** · Depends on: #3 (shares heuristics) · Commercial:
  replayability for solo players — the largest silent audience.

### 8. Local-hotseat surrender
Design: in a hotseat game, the CURRENT player may surrender via the menu
(confirm dialog naming them). Reuses `player.surrendered` + the existing
skip/victory logic from V2.49 — the state machinery already handles it;
this is UI only (menu item + confirm + handoff to next player).
- Effort: **S** · Depends on: nothing · Commercial: minor, but its absence
  is a visible inconsistency with online play.

### 9. Mixed-mode play (hotseat pair + remote players)
Currently unsupported by design (one account = one player). Honest scope:
lobby "add local guest" player type whose turns any signed-in device-owner
plays; guard changes (oderId match OR local-guest-on-my-device), handoff
overlay in multiplayer for consecutive local guests, and rules/security
review. Real work, easy to get subtly wrong with the turn guard.
- Effort: **L** · Depends on: rock-solid #1/#2 first · Commercial: niche
  but beloved in board-game groups ("two of us are on the couch").

## P3 — instrumentation and reach

### 10. Analytics & telemetry
Firebase Analytics (already in the Firebase stack, zero extra vendors):
game_started (mode, players, AI count), phase_duration, game_ended (victory
type, rounds, duration), surrender/abandon events, tutorial funnel. No PII
beyond Firebase defaults; add a privacy note to the README/site footer.
GA4-style dashboards answer: where do players quit?
- Effort: **S/M** · Depends on: nothing · Commercial: every later balance
  and retention decision is guesswork without it.

### 11. Accessibility
Priority slice first: (a) color contrast audit of HUD/sidebar text on dark
panels; (b) colorblind-safe player palette option (the red/green faction
colors are a real problem) + patterned territory overlays; (c) complete
keyboard navigation (tab order through sidebar controls; arrows to pan,
+/- to zoom); (d) ARIA landmarks/labels on HUD, sidebar tabs, modals.
Full WCAG 2.1 AA sweep as a later **L** pass.
- Effort: **M** (priority slice) / **L** (full AA) · Depends on: nothing ·
  Commercial: storefront requirements increasingly expect it; colorblind
  support in a map-painting game is table stakes.

### 12. Deferred from earlier phases
- Physical-device tablet verification pass (MOBILE_PLAN.md remainder).
- Live 2-account multiplayer regression script for playtest rounds.
- Replace `confirm()`/`alert()` dialogs with in-app modals (consistency).
- `nul`/`Tactical Risk` junk files and repo hygiene sweep.

---

## Suggested sequencing

1. **V2.53**: #3 AI stalemate + #8 hotseat surrender + #5 sound (library tier)
2. **V2.54**: #1 turn timers + #4 coach-layer onboarding
3. **V2.55**: #2 push notifications + #10 analytics
4. **V2.56**: #6 animation tier (b) + #7 AI personalities
5. **V2.57+**: #11 accessibility slice, then #9 mixed-mode if demand exists
