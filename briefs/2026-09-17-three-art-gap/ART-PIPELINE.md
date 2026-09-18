# ART-PIPELINE lock — Three preview (bake, don’t vector)
**Indexed by:** `PRODUCTION-PATH.md` (standing production SoT — preview now; Canvas later only with James yes)  
**As-of:** 17 Sep 2026 ~8:15pm PT · James: still flat vector vs rich online sims · ~25% love on p11  
**Audience:** TR / cloud · **QC:** Viz → Arc · Quiet James · Tesla off  
**Extends:** `AA-RISK-HOMAGE.md` · `AA-PALETTE.md` (exact continent washes) · `THREE-IPHONE-UI.md` · `BAR-POLYTOPIA-ROOT-TTR.md` · `JAMES-HECORRECT-TEXTURE.md` · `ux/STACK-LOD.md`  
**Fail line:** App Store glance still reads SVG/GIS/Three debug → director ladder again, do not wait for James.

---

## 1) What Poly / Root / TTR actually do (patterns)

| Layer | They ship | We fail (p10–p11) |
|---|---|---|
| **Atlas** | Painted/printed tile or card atlas; albedo carries art | Flat hex fills + CSS noise; code-drawn coasts |
| **Lighting** | Soft key + hemisphere; pieces catch light | Unlit / ambient-only; land = dead matte slab |
| **AO / contact** | Soft contact shadow under cities/pieces; edge AO in cracks | Tokens float; no ground contact |
| **Materials** | Paper/wood/plastic readable at 390 | Olive GIS fill + grey mottled “ocean” |
| **Units** | Molded silhouette or illustrated chit from atlas | Number coins (mid) or grey stamp silhouettes (near) |
| **Motion** | Tiny settle / lift on select (≤200ms); map inertia | Static stamps; optional later — **don’t block bake** |
| **Chrome** | Frost edge HUD; board is the art | Muddy opaque pills OK-ish; frost weak |

**Rule:** richness = **baked maps + lights + AO**, not more UI widgets or Lucide icons.

---

## 2) Pipeline (order for next Three pass)

```
Image-gen / paint atlas  →  trim & tile  →  Three materials
        ↓                       ↓              ↓
  land / ocean / units     power-of-two     MeshStandard + AO
        ↓                       ↓              ↓
   refs/ on disk            no seams         soft key + hemi
```

1. **Generate or refine atlases** (in-repo; no paid stock; no real A&A scan).  
2. **Bake** into `MeshStandardMaterial` / canvas textures — **kill** `MeshBasic` flat color land/ocean.  
3. **Light:** hemisphere + one warm key; ACES tone map; no emissive cyan.  
4. **AO:** contact shadow blob under each chit; optional SSAO only if cheap on phone.  
5. **LOD:** far/mid use atlas pip; near swaps to typed plastic frames from unit atlas.  
6. **Motion (P1):** select lift 2–4px + 120ms ease; piece settle — after bake passes V8.

---

## 3) Concrete bake list (next pass)

### Land
- [x] **P36 painted world albedo** (`assets/three/board/world-land-albedo.png`, 4096×2340) — Imhof relief + landcover masses + canvas tooth. Theater plates hero (alpha 0.84). Runtime fillStain OFF; bind is fail-closed.
- [x] Tileable **parchment/paper grain** albedo (`refs/board-parchment-macro-tile.png` or regen) @ 8–14% multiply on `--land-base` `#C4B896`
- [x] **Continent washes** (Risk-readable, A&A print) from `AA-PALETTE.md`: Europe olive `#6B7A4A`, USSR brown-tan `#8A7355`, Asia sage `#5F7A5A`, Africa ochre `#B08948`, NA soft green `#6A8B6E`, SA teal-green `#5A8A72`, Pacific mauve-grey `#7A6B8A` @ 18–28% — not candy Risk primaries, not one olive planet
- [x] Soft faction ownership wash on top (15–22%), not solid fills
- [x] Extrusion walls `--land-shadow`; slight bevel normal optional
- [x] Internal borders = ink hairline texture or thin decal — not gold everywhere

### Ocean
- [x] Tileable **print-ink water** (`refs/board-ocean-print-macro-tile.png`) — slate-teal `#3D5A66` / shelf `#4F6E78`
- [x] Quiet depth: UV scale + slight deep darken toward open sea
- [x] Coast = 1px foam/ink rim `#D9D2C0` — **kill** grey noise slab + cyan bloom

### Units
- [x] **Molded plastic atlas** (`refs/units-molded-plastic-atlas-hi.png`) — cream `#F0E6D2`, embossed glyph, faction rim
- [x] Mid: one pip + **N** badge from atlas (not bare digit coin)
- [x] Near: ≤3–4 typed chits + `+K`; peek holds full roster
- [x] ≥2px dark outline + contact shadow; kill grey matte stamps + Lucide

### FX / select (cheap)
- [x] Continuous `--select-gold` `#C4A35A` land ring (2–3px screen)
- [x] Soft radial AO under selected stack
- [x] Confirm amber only when staged (chrome; already THREE-IPHONE-UI)

### Out of bake scope (don’t block)
Pinch-zoom (required UX, separate), legal-move ink port, full SSAO, cinematic FOG, hire.

---

## 4) Done when (single glance)
390 mid + near: parchment readable, ocean not grey noise, cream plastic armies with rims, pip+N at mid, frosted L0, named Confirm — sits next to Poly/Root/TTR without “vector prototype.”

**Hand to TR:** this file + `refs/*` + palette hex. Viz scores next stills vs `BAR-POLYTOPIA-ROOT-TTR.md`.
