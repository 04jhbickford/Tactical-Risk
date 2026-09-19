# SCORE — V2.81.53-ux-preview.8
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
tesla=off
scenario=max-both-sides
tryCombatMove=false
```

**Lineage:** PR76 hybrid tip (`cursor/unit-sheet-clickthrough-d314` preview.7) + max combat seed. Do not merge to main.

## Max combat seed — `?three=1&demo=max`
Russians · **Karelia S.S.R.** → **Ukraine S.S.R.** (alt **East Europe**). Roomy adjacent pair, not Japan.

| Side | Territory | Stack |
|---|---|---|
| Attacker | Karelia S.S.R. | INF×10 TNK×6 ART×6 FTR×4 BMB×3 |
| Defender | Ukraine S.S.R. | INF×8 TNK×5 ART×5 FTR×3 BMB×2 AA×2 |
| Alt dest | East Europe | INF×4 TNK×2 ART×2 FTR×1 AA×1 |
| Land | Russia / Karelia | Russia INF×2 |

Partial select: every type is `[-] n/max [+]`. Send 1 of 10 INF. Air that survives must land — peek is FTR+BMB only + Confirm land.

Default `?three=1` (no demo) stays the thin Karelia–Finland pocket.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Partial select | **PASS** | INF/TNK/ART/FTR/BMB steppers. 1 of 10 INF is legal. |
| Congo click-through | **PASS** | Sheet +/− eat touches. Canvas ignores sheet/zoom rects. |
| Air land planes-only | **PASS** | No dest stack sheet. FTR+BMB + Confirm land. |
| Manual path | **PASS** | FROM → units → TO → Confirm. No Try. |
| Casualties | **PASS** | Mixed-type picker; tap increments when need > 1. |
| Chip mouseup | **PASS** | Kept from preview.6. |
| Tesla / Viz | **OFF** | Quiet James. Arc gates Viz. |
| Mobile ~390 | **PASS** | Scrollable peek/battle. 44px stepper thumbs. 64px Confirm. |

## How-to (390)
1. Open `?three=1&demo=max`.
2. **Combat move** — Tap **Karelia** → steppers (partial OK) → tap **Ukraine** or **East Europe** → gold **Confirm: Attack …**.
3. **Battle** — Fire AA → Continue → Roll → tap casualty chips (tap again to add/remove) → Take hits → take dest (may be 2 rounds).
4. **Air land** — Planes-only card + **Confirm land**. Tap teal Russia → **Confirm: Land in Russia**.

## Stills @390
- `combat-move-steppers-390.png` — INF 0/3 FTR 0/1, no map steal (default pocket)
- `combat-move-partial-inf-390.png` — INF 1/3 after +
- `air-land-planes-390.png` — fighter only + Confirm land

**Vercel:** (preview.8 branch — see PR)
**PR:** draft on PR76 lineage · do not merge to main
