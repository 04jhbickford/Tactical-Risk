# TR Three .38 board polish — PLAYBOOK (cloud-agent handoff)
as-of 2026-09-18 · Researcher → Arc · Quiet James · Preview only · Tesla off  
**Style LOCK:** `refs/james-style-antique/oceania-watercolor-parchment.jpg` (antique watercolor parchment). Do **not** regress to GIS wash / flat vector / Imhof-as-DEM.

**objective:** Concrete steal-able techniques for depth, continents, sea, borders, opaque minis.  
**URLs:** § Sources · **unverified:** exact opacity % may need Viz eye · **decision asked:** Arc hands this to cloud agent as craft law for .38

---

## PLAYBOOK (8 bullets)

1. **Bake Imhof *painterly* relief into the albedo (not a GIS hillshade pass).**  
   Steal from **Eduard Imhof** (*Cartographic Relief Presentation* / Walensee gouache): **NW oblique light**, soft multi-hue shadows (brown / India-red / cool grey by biome), **aerial perspective** (distant ridges softer), and **emphasize only large landforms** (Alps / Himalayas / Rockies / Andes / Urals). Kill mechanical DEM grey-on-grey. On the Oceania LOCK plate: inked peaks + hatch shade like the style ref — soft contact AO in valleys — so mid-zoom phone reads *volume*, not stamps.

2. **Root / Oathcraft depth = ink first, wash second.**  
   **Kyle Ferrin / Root:** hand-ink terrain structure, then soft digital color; depth comes from **ink hatch + soft shade**, not mesh height. **Oath** same family: authored landscape illustration under pieces. For .38: mountain/forest marks are **drawn into** `world-land-albedo` (A&A anniversary board language), with residual soft-light stain **tiny or off** so mid never reads “slight wash continuum.”

3. **Civ VI / Polytopia = silhouette + soft ambient shade at pull-back — borrow the *read*, not the candy.**  
   **Civ VI** (Busatti): at strategy zoom, **shape/form** beats texture noise; multi-hex mountain ranges as one silhouette. **Polytopia:** hand-painted tile relief + soft ownership wash; world is the art. Steal: mid-zoom relief must survive 390px as **big ridge silhouettes + soft NW shade**; kill Civ/Polytopia toy candy palette (James: A&A parchment + Risk washes only).

4. **Risk continent washes: multiply ≤~22%, feathered edges, parchment tooth must survive.**  
   Use house hex table in `AA-RISK-HOMAGE.md` (EU olive, USSR brown-tan, AF ochre, Asia muted green, NA sage, SA warm tan, Oceania teal-sage `#6A8B8A`). Prefer **multiply** (or very soft multiply+tiny soft-light) over soft-light-alone — soft-light lifts paper to chalk. **Feather** wash 8–20px into coasts so no hard continent polygon rim. Fail if continents indistinguishable at 390 mid.

5. **Sea = watercolor parchment wash — kill decorative stipple.**  
   Match Oceania LOCK: pale washed blue near coasts **fading into parchment**; optional **soft hand-drawn ripple lines** only. **KILL** random dotted/stipple fields that aren’t borders. **Sea-zone ink** = closed rings from `territories.json` water polys only (classic **A&A** sea-zone overlay), quiet dark ink — not scatter dots, not GIS bathymetry.

6. **Land borders = same ink family/weight as sea-zone borders.**  
   Classic **A&A** boards: land territory lines and sea-zone lines share **dark, consistent stroke weight** so phone mid-zoom reads partitions. No faint hairlines lost in parchment; no gold on idle territories (select gold only). Internal land ink slightly quieter than outer coast is OK; land↔land must still match sea-zone *clarity*.

7. **Units = solid opaque molded plastic (A&A anniversary / Risk tray craft).**  
   Near/select/tray: faction-colored **molded plastic** minis (infantry/tank/air/ship silhouettes) — **opaque albedo** (alpha 1), soft specular, **contact shadow** on parchment, ≥2px dark outline + faction rim. **Tan/UK** especially: cream body + dark rim so they don’t vanish into beige paper (Root/TTR “cream-on-sand” fail). Kill see-through parchment bleeding through minis; unify treatment (bare plastic+shadow **or** same soft disc — one rule everywhere).

8. **Composite order (fail-closed for cloud agent).**  
   Layer A: authored Oceania-style world albedo (relief + vegetation greens on coastal fringe baked in) → Layer B: Risk continent multiply washes ≤22% → Layer C: land + sea-zone ink same weight → Layer D: opaque plastic minis + shadow. Proof stills per `HECORRECT-P38.md`. Soft-ship = fail.

---

## Kill list
GIS DEM hillshade · Imhof-only leftover without parchment · Civ/Polytopia candy · decorative ocean stipple · faint land hairlines · translucent minis · ARK/flat wash continuum · copyright board scans

## Sources
- House: `HECORRECT-P38.md` · `P37.md` · `AA-RISK-HOMAGE.md` · `BAR-POLYTOPIA-ROOT-TTR.md` · Oceania style ref  
- Imhof Walensee / reliefshading.com · MapCarte 58 (ICACI) · Imhof *Cartographic Relief Presentation*  
- Root/Ferrin interviews (More Games Please; GreenHook) · Civ VI Busatti readability (Gamedeveloper) · classic A&A / Risk board material language (house refs)

Status: complete · Path: `/workspace/briefs/2026-09-18-three-p38-board-polish/PLAYBOOK.md`
