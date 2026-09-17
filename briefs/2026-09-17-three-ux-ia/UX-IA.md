# Three.js preview — UX / information density lock
**As-of:** 17 Sep 2026 · James ask: polished professional game-app UI; think density; X/bar refs OK  
**Scope:** `?three=1` preview only. Live Canvas unchanged until separate yes. Tesla off.  
**Bar:** Polytopia · Clash Royale (shallow UI) · Root / TTR edge chrome · Settlecoast mobile craft (patterns only) · TR Confirm grammar already locked.

## Product read
The board is the product. Chrome frames it; it never competes with it. Phone-first one-thumb. Professional = clear hierarchy + calm density, not more widgets.

## Information layers (progressive disclosure)

| Layer | Always? | What | Where |
|---|---|---|---|
| **L0 — match pulse** | Yes | Phase chip (one word) · whose turn / seat color · IPC or income pill · primary CTA state | Top safe-area strip (thin) + bottom thumb CTA |
| **L1 — selection** | On tap | Territory name · owner crest · stack summary (type icons × counts) · legal marks | Gold/select ring on land + **one** peek card above CTA (not a second sheet stack) |
| **L2 — detail** | On demand | Full roster / Rules / Log / Settings | Single sheet from ☰ — map still peeks; never fullscreen wipe mid-action |
| **L3 — debug** | Never in James build | Tickers, `Click landed`, multi-line status | Banned |

**Rule:** at most **one** bottom surface (peek **or** tray **or** sheet). Opening L2 dismisses L1 peek into a chip, or stacks under a single sheet policy — never peek+tray+guide+CTA fighting.

## Confirm grammar (unchanged SILO)
1. Tap land → peek names it (inspect ≠ commit)  
2. Tap unit type / count → land stays named  
3. Named **Confirm** in thumb zone commits  
4. Confirm tap must not map-click-through  
Either land→unit or unit→land. Max may fill count; Confirm still required.

## Board density (troops + labels)
- **Sparse:** show type chits (INF / TNK / FTR / ship) + qty, faction rim, cream face — readable at phone zoom.  
- **Dense (Europe mid-zoom):** collapse to **faction pip + total N**; expand to type breakdown only on select / zoom-in. Never overlapping label-under-stack.  
- Territory labels: offset from stack anchor; hide label while selected stack is the read, or nudge.  
- Legal moves: edge ink / glow **before** first tap of the step (Polytopia-class).  
- Geography carries ownership tint; do not flat-fill so hard that coasts disappear.

## Chrome layout (390–430 portrait primary)
```
┌ safe-area ─────────────────────────┐
│ ☰   PHASE · Seat   IPC   ···       │  ← L0 top, ≤48pt row
│                                    │
│            WORLD MAP               │  ← 70%+ viewport; pan/pinch
│         (wrap · geography)         │
│                                    │
│     [peek: Ukraine · INF×4 TNK×1]  │  ← L1 only when selected
│     [ Confirm: Deploy 2 INF → … ]  │  ← one primary ≥44pt
└ safe-area ─────────────────────────┘
```
Landscape: same jobs; CTA stays thumb-side; do not resurrect a 280px desktop rail on ≤500.

## Steal / kill
**Steal:** Settlecoast paint-first + safe-area + held/unavailable/queued control states; Poly city pill mark→name→meta; CR shallow depth (≤1 sheet); TTR/Root chrome on edges; TR named Confirm.  
**Kill:** Catan/Settlecoast theme or mechanics; hover-only docks on touch; multi-popup session start; debug tickers; stacked bottom menus; type-count Deploy without named land; Africa/wrap bugs; placeholder troop mess.

## Done when (Three preview)
1. Screenshot at 390: L0 only, board dominant, no chrome pile.  
2. Select land → one peek + named Confirm path.  
3. Dense Europe: collapsed stack readable; expand on select.  
4. Africa correct + horizontal wrap feels continuous.  
5. Units look finished game art, not text scraps.
