# p38 SCORE — V2.81.52-three-polish.38
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR63 stacked on PR62 `.37b`. Tesla off. Quiet James.
**STYLE LOCK:** Oceania watercolor parchment (James attached).
**Albedo rev:** `p38`.
**Craft law:** A painterly Imhof · B Risk ≤22% · C ink+parchment-sea · D opaque plastic.

Local 390 stills in this folder. Fail-closed: mid is STYLE REF family
(watercolor on aged parchment — sage coasts, tan interiors, peak hatching,
pale washed seas). No rectangular tiles. No Australia slivers. No Africa
blotches. Sea ink = closed water rings. No decorative ocean stipple.
Peek/HUD shows one troop number. Near units opaque plastic.

## How style was matched
1. **Hold plates** — `.37b` STYLE REF watercolor plates stay the hero.
2. **Bake** — `tools/bake-world-land-albedo.py` adds coastal/lowland sage
   under parchment, Imhof painterly relief (NW light, multi-hue soft
   shadows, large forms + quiet hatch; Great Dividing Range), Risk
   continent washes ≤22% multiply (AA-PALETTE / AA-RISK-HOMAGE), destippled
   parchment-sea tile + faint hand ripples. Mask-only joins held. Cape L-band held.
3. **War overlay** — sea-lane dashes killed. Land ink 2.6/0.86 matches sea
   rings 2.8/0.88. `healLandRings` + outward-normal offset (no centroid
   inflate slivers). Peek icons bake no leading `1`. Sculpt holes sealed;
   tan `#8E6A38` + ≥2px dark rim vs parchment. Ocean vertex colors are
   cream parchment, not grey-teal.
4. **Bind** — `world-land-albedo.png?v=p38` MeshStandard hero. Stain OFF.

## P0 HARD — eight gates
| Gate | Verdict | Note |
|---|---|---|
| 1 Vegetation | **PASS** | `vegetation-coast.png`: sage coastal fringe on Australia, not khaki-only. |
| 2 Ocean | **PASS** | `ocean-clean.png`: washed parchment-sea, no dotted stipple. `seaLanes: false` · `oceanNoStipple: true`. Sea ink = closed rings. |
| 3 Land borders | **PASS** | `land-borders.png`: land ink same weight family as sea-zone rings. Readable mid-zoom. |
| 4 Mountains | **PASS** | `mountains-relief.png`: Alps Imhof (NW light, inked peaks + hatch/soft AO). Not flat stamps, not DEM. `imhofRelief: true`. |
| 5 Continent washes | **PASS** | `continents-wash.png` / `africa-even.png`: Europe olive vs Africa ochre; Asia muted green, USSR brown-tan, Oceania teal-sage. ≤22% (`continentPunch: 0.20`). |
| 6 Unit count | **PASS** | `unit-count-one.png` / `east-us-peek-one.png`: peek `<b>` is the only number. No baked leading `1`. `unitCountOne: true`. |
| 7 Polygon slivers | **PASS** | `aus-no-slivers.png` / `aus-select-clean.png`: clean Australia ring. `landSliversHealed: true`. |
| 8 Units | **PASS** | `near-opaque-plastic.png` / `tan-units-contrast.png`: solid molded plastic, contact shadow, ≥2px outline. Tan punches off paper. `opaquePlastic: true`. |

## Held .37b
| Gate | Verdict | Note |
|---|---|---|
| Mid = STYLE REF family | **PASS** | `mid-vs-style-ref.png` / `australia-vs-style-ref.png` |
| Cape Africa even | **PASS** | `africa-even.png` — no L-band |
| Sea closed rings | **PASS** | `sea-zones-ink.png` · `seaInkClosedRings` |
| Med ships unclipped | **PASS** | `med-no-clip.png` / `east-med-select-no-clip.png` |
| China outer-union | **PASS** | `china-hold.png` |
| No labels / IPC | **PASS** | `noMapLabels` · `noBakedIpc` |
| Confirm gold | **PASS** | Confirm `#C4A35A`. Idle quiet-dark. |
| Stack toggle | **PASS** | `stack-expand.png` → `stack-collapse.png` |

## Computed proof (390, local)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
albedoBound:  true  4096×2340  albedoRev=p38  stainFallback=false
styleRef:     oceania-watercolor  watercolorParchment  featheredJoins
imhofRelief:  true   continentPunch=0.20   seaLanes=false
oceanNoStipple unitCountOne landSliversHealed opaquePlastic
coastalGreens landSeaBorderFamily stackToggle seaInkClosedRings
china:        rings=1
eastMed:      shipsAboveItaly=true
stack:        expand minis=true → collapse pip=true
```

## Stills
- `mid-vs-style-ref.png` / `australia-vs-style-ref.png`
- `vegetation-coast.png` / `ocean-clean.png` / `land-borders.png`
- `mountains-relief.png` / `continents-wash.png`
- `unit-count-one.png` / `east-us-peek-one.png`
- `aus-no-slivers.png` / `tan-units-contrast.png` / `near-opaque-plastic.png`
- `africa-even.png` / `stack-expand.png` / `stack-collapse.png`
- `computed.json` / `vercel-live-mid-390.png` / `vercel-live-inspect.json`

**Vercel:** https://tactical-risk20-o4v7vvzcn-james-projects-20d8de40.vercel.app/?three=1  

**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/63 (stacked on PR62 / `.37b`)
