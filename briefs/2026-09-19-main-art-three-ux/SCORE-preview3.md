# SCORE — V2.81.53-ux-preview.3
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
flow=combatMove→battle→airLanding
```

**Lineage:** stacked on PR68 preview.2 (icon no-overlap + coach-off). James next: Combat Move / Battle / airplane landing on ~390.

## Layer B — movement / battle / air (preview HUD)
| Gate | Verdict | Note |
|---|---|---|
| Combat Move mid-flow | **PASS** | Ukraine peek, staged INF×2 TNK×1 FTR×1, dest Karelia, CTA **Attack Karelia S.S.R.** gold. |
| Battle sheet | **PASS** | Odds / Select / Resolve. AA → Continue → Roll → assign hits → **Confirm Casualties**. Retreat available on Odds. |
| Airplane landing | **PASS** | **Confirm All Landings** disabled at 1 remaining. Tap Germany → **Done →**. |
| Coach Got it | **OFF** | Kept from preview.2. |
| Icon pack | **PASS** | noOverlap kept. |
| 390 + safe areas | **PASS** | Confirm thumb zone. Flow sheet ≤38dvh. Zoom hides while sheet is up. |

## What changed vs preview.2
- Default boot: Germans · COMBAT MOVE (Ukraine → Karelia / Caucasus). `?inspect=1` = PLACE inspect.
- Live Confirm/Done copy and `remainingAirLandingsToAssign` Done gating.
- Progressive battle sheet; air overlay per AF.
- No rule-engine changes.

## Stills @390
- `combat-move-390.png` — Attack Karelia named Confirm
- `battle-sheet-390.png` — Select casualties + Confirm Casualties
- `air-landing-390.png` — 1 remaining, Confirm All Landings disabled

## Proof
`node tools/test-ux-preview-flows.mjs` — Attack CTA, cas lock, Done at 0 remaining, fighter lands on Germany.

**Vercel:** https://tactical-risk20-kvjuvavy7-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/68 (draft · do not merge)
