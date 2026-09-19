#!/usr/bin/env python3
"""P41: silhouette-first Imagine WORLD hero albedo.

.40 free-painted a real-world basemap then overlaid territories.json
rings → coast registration miss (James t3058u).

P41 HARD — silhouetteFirst (fail-closed):
  1. Coast/silhouette guide from live territories.json at atlas res
  2. Grok Imagine WORLD hero plate (topographic parchment, raised relief,
     hand-ripple seas) is the continuous hero. wrap_standard_world_to_game
     + register_plate_to_silhouette warp/register it into wrap UV.
     Oceania beautiful is secondary coastal language only.
  3. Bind continuous hero (basemapUnderInk). Ink rings from the SAME
     territories.json — coasts register to painted coasts.
  4. Sea: coastal hand-ripples following guide coasts; oceanNoHatch
  5. maskPaintOff — never paste_through_mask for per-territory color
  6. Select outline-only held from .40b
  7. No political borders from the plate — territories.json ink only.

Kill: free world paint without silhouette; per-territory color masks;
select interior wash; ocean tile hatch.

P40 strings kept (GEN40, basemapUnderInk, maskPaintOff, paste_bbox_feather,
build_basemap, NEVER a territory mask, never paste_through_mask for color,
p40-oceania) so historical tests still see the invert path.

Usage:
  python3 tools/bake-world-land-albedo.py --silhouette
  python3 tools/bake-world-land-albedo.py --guide
  python3 tools/bake-world-land-albedo.py --atlas
  python3 tools/bake-world-land-albedo.py --sea
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'territories.json'
CONTINENTS = ROOT / 'data' / 'continents.json'
BOARD = ROOT / 'assets' / 'three' / 'board'
GEN41 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p41-gen'
QA41 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'qa-loop' / 'p41'
GEN40 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p40-gen'
GEN39 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p39-gen'
GEN37 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p37-gen'
GEN36 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p36-gen'
GEN34 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p34-gen'
GEN33 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p33-gen'
OUT_GUIDE = GEN40 / 'world-land-guide.png'
OUT_SILHOUETTE = GEN41 / 'silhouette-guide.png'
OUT_SILHOUETTE_16X9 = GEN41 / 'silhouette-guide-16x9.png'
OUT_SIL_AUS = GEN41 / 'silhouette-aus.png'
OUT_SIL_MED = GEN41 / 'silhouette-med.png'
OUT_SIL_UK = GEN41 / 'silhouette-uk.png'
OUT_ATLAS = BOARD / 'world-land-albedo.png'
OUT_NORMAL = BOARD / 'world-land-normal.png'
OUT_AO = BOARD / 'world-land-ao.png'
OUT_HEIGHT = GEN37 / 'world-land-height.png'
OUT_OCEAN = BOARD / 'board-ocean-tile.png'
OUT_SEA = BOARD / 'world-sea-albedo.png'

MAP_W, MAP_H = 3500, 2000
ATLAS_W = 4096
ATLAS_H = 2340

# Printed A&A / Risk chroma (AA-PALETTE + AA-RISK-HOMAGE).
# P39: washes stay ≤15% multiply UNDER paint so plate art dominates.
CONT_HEX = {
    'Europe': (0x6B, 0x7A, 0x4A),
    'Asia': (0x5F, 0x7A, 0x5A),
    'Africa': (0xB0, 0x89, 0x48),
    'Middle East': (0xA0, 0x90, 0x58),
    'North America': (0x6A, 0x8B, 0x6E),
    'South America': (0x9B, 0x7E, 0x5A),
    'Oceania': (0x6A, 0x8B, 0x8A),
}
USSR_HEX = (0x8A, 0x73, 0x55)
USSR_LANDS = {
    'Russia', 'Karelia S.S.R.', 'Ukraine S.S.R.', 'Novosibirsk',
    'Evenki National Okrug', 'Soviet Far East', 'Mongolia',
}
COAST_GREEN = (0x5A, 0x86, 0x52)
LOWLAND_GREEN = (0x6E, 0x8A, 0x54)
BIOME_OF = {
    'Finland Norway': 'snow', 'Sweden': 'snow', 'Evenki National Okrug': 'snow',
    'Alaska': 'snow', 'West Canada': 'snow', 'Soviet Far East': 'snow',
    'Karelia S.S.R.': 'forest', 'East Canada': 'forest', 'Brazil': 'jungle',
    'Congo': 'jungle', 'French Equatorial Africa': 'jungle',
    'French Indo China': 'jungle', 'New Guinea': 'jungle', 'East Indies': 'jungle',
    'Borneo Celebes': 'jungle',
    'West Europe': 'lush', 'United Kingdom': 'lush', 'Eire': 'lush',
    'East US': 'lush', 'Mexico': 'lush', 'Panama': 'lush', 'Cuba': 'lush',
    'South Africa': 'lush', 'Madagascar': 'lush', 'Germany': 'lush',
    'East Europe': 'lush',
    'Japan': 'hills', 'Manchuria': 'hills', 'Mongolia': 'hills', 'Kwangtung': 'hills',
    'Spain': 'arid', 'Algeria': 'arid', 'Anglo Sudan Egypt': 'arid',
    'French West Africa': 'arid', 'Saudi Arabia': 'arid', 'Persia': 'arid',
    'Syria Jordan': 'arid', 'Kazakh S.S.R.': 'arid', 'Australia': 'arid',
    'Italian East Africa': 'arid', 'Kenya-Rhodesia': 'arid',
    'Switzerland': 'mountain', 'South Europe': 'mountain', 'China': 'mountain',
    'India': 'mountain', 'Argentina-Chile': 'mountain', 'Peru': 'mountain',
    'West US': 'mountain', 'Novosibirsk': 'mountain',
    'Turkey': 'steppe', 'Ukraine S.S.R.': 'steppe', 'Russia': 'steppe',
    'Columbia': 'lush',
}
RIDGES = [
    [(960, 590), (992, 604), (1040, 630), (1096, 680), (1160, 700), (1200, 690)],
    [(1700, 820), (1791, 860), (1900, 760), (2034, 733), (2140, 700)],
    [(3180, 220), (3258, 400), (3260, 620), (3258, 795)],
    [(220, 1230), (240, 1411), (285, 1635)],
    [(1550, 700), (1679, 600), (1905, 490)],
    [(1086, 160), (1070, 230), (1086, 280)],
    # Great Dividing Range — Australia east (STYLE REF hatch family)
    [(2580, 1480), (2640, 1560), (2688, 1660), (2660, 1740)],
]
# Forest authorship lives in the theater plates + biome tiles.
# Do NOT stamp oval blobs — Viz called .33 a wash+stamp family.
RIVERS = [
    [(1195, 900), (1189, 1064), (1208, 1280), (1200, 1460)],
    [(912, 560), (960, 500), (1000, 400), (980, 260)],
    [(1000, 630), (1100, 560), (1211, 492), (1360, 500)],
    [(1550, 420), (1693, 289), (1820, 210)],
    [(1905, 490), (1989, 240), (1989, 120)],
    [(2024, 740), (2140, 800), (2260, 860)],
    [(1798, 947), (1880, 1000), (1960, 1040)],
    [(125, 700), (140, 860), (180, 1080)],
    [(420, 1360), (300, 1365), (180, 1320)],
    [(1126, 1453), (1080, 1320), (1013, 1188)],
    [(3263, 279), (3100, 200), (3000, 160)],
    [(1399, 471), (1480, 520), (1558, 700)],
]
BADGES = [
    {'name': 'Europe', 'bonus': 30, 'x': 900, 'y': 640},
    {'name': 'Asia', 'bonus': 33, 'x': 1420, 'y': 500},
    {'name': 'Africa', 'bonus': 27, 'x': 1088, 'y': 1264},
    {'name': 'Middle East', 'bonus': 18, 'x': 1516, 'y': 872},
    {'name': 'North America', 'bonus': 24, 'x': 3184, 'y': 628},
    {'name': 'South America', 'bonus': 12, 'x': 292, 'y': 1476},
    {'name': 'Oceania', 'bonus': 39, 'x': 2472, 'y': 1284},
]
PARCHMENT = (0xC8, 0xB8, 0x96)
OCEAN = (0xB8, 0xC4, 0xBE)
STYLE_TARGET = (198, 180, 148)
LAND_LUMA_TARGET = 172.0


def load_lands():
    territories = json.loads(DATA.read_text())
    continents = json.loads(CONTINENTS.read_text())
    of = {}
    for c in continents:
        for n in c.get('territories') or []:
            of[n] = c['name']
    lands = []
    for t in territories:
        if t.get('isWater'):
            continue
        t = dict(t)
        t['continent'] = of.get(t['name'], t.get('continent') or 'Europe')
        t['biome'] = BIOME_OF.get(t['name']) or (
            'arid' if t['continent'] in ('Africa', 'Middle East') else
            'steppe' if t['continent'] == 'Asia' else
            'lush' if t['continent'] == 'Europe' else 'lush'
        )
        lands.append(t)
    return lands


def wx(x, w):
    return x * w / MAP_W


def wy(y, h):
    return y * h / MAP_H


def poly_xy(poly, w, h):
    return [(wx(x, w), wy(y, h)) for x, y in poly]


def tile_image(tile: Image.Image, w: int, h: int) -> Image.Image:
    tw, th = tile.size
    out = Image.new('RGB', (w, h))
    for y in range(0, h, th):
        for x in range(0, w, tw):
            out.paste(tile, (x, y))
    return out


def load_rgb(path: Path, fallback: Image.Image | None = None) -> Image.Image | None:
    if path and path.exists():
        return Image.open(path).convert('RGB')
    return fallback


def land_mask(lands, w, h, names=None, biomes=None, continents=None) -> Image.Image:
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    for land in lands:
        if names and land['name'] not in names:
            continue
        if biomes and land['biome'] not in biomes:
            continue
        if continents and land['continent'] not in continents:
            continue
        for poly in land.get('polygons') or []:
            pts = poly_xy(poly, w, h)
            if len(pts) >= 3:
                d.polygon(pts, fill=255)
    return mask


def punch(img: Image.Image, color=1.08, contrast=1.06, sharp=1.04) -> Image.Image:
    out = ImageEnhance.Color(img).enhance(color)
    out = ImageEnhance.Contrast(out).enhance(contrast)
    out = ImageEnhance.Sharpness(out).enhance(sharp)
    return out


def feather_box(w, h, x0, y0, x1, y1, pad=90) -> Image.Image:
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rectangle((x0, y0, x1, y1), fill=255)
    return m.filter(ImageFilter.GaussianBlur(pad))


def kill_blotches(img: Image.Image, land: Image.Image, luma_floor=86) -> Image.Image:
    """Lift only crushed voids. Do not flatten painted chroma into a wash."""
    try:
        import numpy as np
    except ImportError:
        return img
    arr = np.asarray(img, dtype=np.float32)
    mask = np.asarray(land) > 8
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    lift = np.clip((luma_floor - yv) / max(1.0, luma_floor), 0, 1) * 0.55
    lift = np.where(mask, lift, 0.0)
    parchment = np.array(PARCHMENT, dtype=np.float32)
    arr = arr + (parchment - arr) * lift[..., None]
    chroma = arr.max(axis=2) - arr.min(axis=2)
    sat = (chroma > 118) & (yv > 28) & mask
    arr[sat] = arr[sat] * 0.88 + yv[sat, None] * 0.12
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def grade_chroma(img: Image.Image, mask: Image.Image, rgb, amount=0.18) -> Image.Image:
    """Shift hue toward continent print hex while keeping painted luma/relief."""
    try:
        import numpy as np
    except ImportError:
        return print_continent(img, mask, rgb, strength=amount)
    arr = np.asarray(img, dtype=np.float32)
    m = (np.asarray(mask) > 8).astype(np.float32)[..., None]
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    tgt = np.array(rgb, dtype=np.float32)
    ty = max(1.0, float(tgt[0] * 0.2126 + tgt[1] * 0.7152 + tgt[2] * 0.0722))
    graded = tgt * (yv / ty)[..., None]
    out = arr * (1.0 - amount * m) + graded * (amount * m)
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


def multiply_continent(img: Image.Image, mask: Image.Image, rgb, amount=0.20, feather=12) -> Image.Image:
    """PLAYBOOK B: Risk multiply ≤~22%, feathered 8–20px so parchment tooth survives."""
    try:
        import numpy as np
    except ImportError:
        return print_continent(img, mask, rgb, strength=amount)
    m = mask.filter(ImageFilter.GaussianBlur(max(8, min(20, feather))))
    arr = np.asarray(img, dtype=np.float32)
    a = (np.asarray(m, dtype=np.float32) / 255.0) * amount
    wash = np.array(rgb, dtype=np.float32)
    mult = arr * (wash / 255.0)
    out = arr * (1.0 - a[..., None]) + mult * a[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


def imhof_height(w: int, h: int) -> Image.Image:
    """Dominant ranges only — Alps / Himalayas / Rockies / Andes / Urals."""
    try:
        import numpy as np
    except ImportError:
        height = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(height)
        for ridge in RIDGES:
            pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
            d.line(pts, fill=210, width=max(10, w // 220), joint='curve')
        return height.filter(ImageFilter.GaussianBlur(7))
    import numpy as np
    z = np.zeros((h, w), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]

    def blob(cx, cy, sx, sy, amp):
        px, py = wx(cx, w), wy(cy, h)
        rx, ry = max(8.0, sx * w / MAP_W), max(8.0, sy * h / MAP_H)
        z[()] += amp * np.exp(-(((xx - px) ** 2) / (2 * rx * rx) + ((yy - py) ** 2) / (2 * ry * ry)))

    # Alps
    blob(1040, 630, 70, 28, 1.00)
    blob(992, 604, 40, 18, 0.72)
    blob(1096, 680, 36, 16, 0.55)
    # Himalayas
    blob(1900, 760, 110, 36, 1.15)
    blob(1791, 860, 55, 22, 0.70)
    blob(2034, 733, 70, 24, 0.85)
    # Rockies (NA wrap)
    blob(3258, 400, 36, 140, 0.92)
    blob(3260, 620, 30, 80, 0.70)
    # Andes
    blob(240, 1411, 22, 150, 0.95)
    blob(285, 1635, 18, 70, 0.60)
    # Urals
    blob(1679, 600, 28, 90, 0.62)
    blob(1550, 700, 24, 50, 0.40)
    # Quiet extras: Atlas, Caucasus, Scandinavia
    blob(820, 980, 50, 18, 0.28)
    blob(1400, 620, 40, 16, 0.32)
    blob(1086, 200, 22, 50, 0.22)
    # Great Dividing Range — STYLE REF east-Aus hatch
    blob(2620, 1540, 26, 80, 0.58)
    blob(2680, 1680, 20, 48, 0.42)
    blob(2560, 1480, 22, 36, 0.32)

    for ridge in RIDGES:
        pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
        layer = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(layer)
        d.line(pts, fill=255, width=max(8, w // 280), joint='curve')
        z += np.asarray(layer.filter(ImageFilter.GaussianBlur(5)), dtype=np.float32) / 255.0 * 0.35

    z = z / max(0.08, float(z.max()))
    return Image.fromarray(np.clip(z * 255.0, 0, 255).astype('uint8'), 'L')


def imhof_hillshade(height: Image.Image, azimuth=315.0, altitude=42.0) -> Image.Image:
    try:
        import numpy as np
    except ImportError:
        return height
    import numpy as np
    z = np.asarray(height, dtype=np.float32) / 255.0
    dy, dx = np.gradient(z)
    az = np.radians(azimuth)
    alt = np.radians(altitude)
    slope = np.pi / 2.0 - np.arctan(np.hypot(dx, dy) * 6.2)
    aspect = np.arctan2(-dx, dy)
    shade = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    shade = np.clip(shade, 0, 1)
    return Image.fromarray((shade * 255.0).astype('uint8'), 'L')


def apply_imhof(img: Image.Image, land: Image.Image, height: Image.Image, strength=0.38) -> Image.Image:
    shade = imhof_hillshade(height)
    shade_rgb = Image.merge('RGB', (shade, shade, shade))
    lit = ImageChops.overlay(img, shade_rgb)
    a = land.point(lambda v: int(v * strength * 0.55 + (v > 8) * 20))
    return Image.composite(lit, img, a)


def apply_imhof_painterly(
    img: Image.Image,
    land: Image.Image,
    height: Image.Image,
    strength=0.34,
    cool_map: Image.Image | None = None,
) -> Image.Image:
    """PLAYBOOK A: painterly Imhof. NW light, multi-hue shadows, large forms only.

    Warm ochre on lit slopes. Shadows: brown / India-red / cool grey by biome.
    Aerial perspective: distant (low) ridges softer. Valley contact AO.
    Not grey GIS hillshade.
    """
    try:
        import numpy as np
    except ImportError:
        return apply_imhof(img, land, height, strength)
    large = height.filter(ImageFilter.GaussianBlur(6))
    shade = imhof_hillshade(large, azimuth=315.0, altitude=38.0)
    # Aerial perspective — peaks stay crisp; low/distant forms go soft.
    soft = shade.filter(ImageFilter.GaussianBlur(14))
    z = np.asarray(height, dtype=np.float32) / 255.0
    mix = np.clip(z * z * 1.15, 0, 1)
    s_sharp = np.asarray(shade, dtype=np.float32) / 255.0
    s_soft = np.asarray(soft, dtype=np.float32) / 255.0
    s = s_sharp * mix + s_soft * (1.0 - mix)
    arr = np.asarray(img, dtype=np.float32)
    m = (np.asarray(land) > 8).astype(np.float32)
    hi = np.clip((s - 0.56) / 0.44, 0, 1) * m
    lo = np.clip((0.46 - s) / 0.46, 0, 1) * m
    warm = np.array([252.0, 226.0, 168.0], dtype=np.float32)
    if cool_map is not None:
        cool = np.asarray(cool_map, dtype=np.float32)
    else:
        cool = np.array([86.0, 72.0, 78.0], dtype=np.float32)
    arr = arr * (1.0 - hi[..., None] * strength * 0.42) + warm * (hi[..., None] * strength * 0.42)
    arr = arr * (1.0 - lo[..., None] * strength * 0.50) + cool * (lo[..., None] * strength * 0.50)
    # Soft contact AO in valleys (blurred height sits above the floor).
    blur_z = np.asarray(height.filter(ImageFilter.GaussianBlur(16)), dtype=np.float32) / 255.0
    valley = np.clip((blur_z - z) * 3.2, 0, 1) * m
    ao = np.array([72.0, 58.0, 46.0], dtype=np.float32)
    arr = arr * (1.0 - valley[..., None] * 0.14) + ao * (valley[..., None] * 0.14)
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def biome_cool_map(lands, w: int, h: int) -> Image.Image:
    """Imhof shadow hues by biome — brown / India-red / cool grey. Not one grey."""
    cool = Image.new('RGB', (w, h), (86, 72, 78))
    snow = land_mask(lands, w, h, biomes={'snow'})
    arid = land_mask(lands, w, h, biomes={'arid'})
    forest = land_mask(lands, w, h, biomes={'forest', 'jungle', 'lush'})
    cool.paste((78, 82, 88), (0, 0), snow)       # cool grey
    cool.paste((118, 62, 48), (0, 0), arid)      # India-red
    cool.paste((78, 62, 46), (0, 0), forest)     # brown
    return cool.filter(ImageFilter.GaussianBlur(6))


def draw_imhof_peaks(img: Image.Image, land: Image.Image, height: Image.Image, w: int, h: int, lands=None) -> Image.Image:
    """Board-game Imhof: inked ridge crests + slope hachures + soft AO.

    Not GIS DEM. Not flat brown stamps. NW oblique light; steeper = darker.
    """
    cool = biome_cool_map(lands, w, h) if lands is not None else None
    # P39: quiet Imhof only — plates already carry STYLE REF hatching.
    img = apply_imhof_painterly(img, land, height, strength=0.12, cool_map=cool)
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    try:
        import numpy as np
        z = np.asarray(height, dtype=np.float32) / 255.0
        gy, gx = np.gradient(z)
    except ImportError:
        gy = gx = None
    for ridge in RIDGES:
        pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
        # Quiet crest only — never a continent-spanning ink slash.
        d.line(pts, fill=(88, 70, 48, 64), width=max(1, w // 1400), joint='curve')
        if len(pts) < 2:
            continue
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            dx, dy = x1 - x0, y1 - y0
            seg = (dx * dx + dy * dy) ** 0.5 or 1.0
            steps = max(2, int(seg / max(7.0, w / 380.0)))
            nx, ny = -dy / seg, dx / seg
            for s in range(steps):
                t = (s + 0.5) / steps
                px, py = x0 + dx * t, y0 + dy * t
                if gx is not None:
                    ix = int(max(0, min(w - 1, px)))
                    iy = int(max(0, min(h - 1, py)))
                    downhill = gx[iy, ix] * nx + gy[iy, ix] * ny
                    if downhill < 0:
                        nx, ny = -nx, -ny
                    steep = min(1.0, (gx[iy, ix] ** 2 + gy[iy, ix] ** 2) ** 0.5 * 14.0)
                else:
                    steep = 0.55
                ln = max(3.0, (w / 340.0) * (0.55 + steep * 0.7))
                ink = int(48 + steep * 78)
                d.line(
                    [(px, py), (px + nx * ln, py + ny * ln)],
                    fill=(70, 56, 38, ink),
                    width=1,
                )
    mass = layer.filter(ImageFilter.GaussianBlur(0.6))
    img.paste(mass.convert('RGB'), (0, 0), ImageChops.multiply(mass.split()[-1], land))
    return img


def apply_coastal_greens(img: Image.Image, lands, w: int, h: int) -> Image.Image:
    """STYLE REF fringe: richer coastal / lowland greens under parchment.

    Not a khaki-only planet. Arid interiors stay tan; coasts pick up sage.
    """
    land = land_mask(lands, w, h)
    edge = land.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(10))
    fringe = ImageChops.multiply(edge.filter(ImageFilter.MaxFilter(15)), land)
    fringe = fringe.filter(ImageFilter.GaussianBlur(8))
    low = land_mask(lands, w, h, biomes={'lush', 'forest', 'jungle'})
    img = grade_chroma(img, fringe, COAST_GREEN, amount=0.12)
    img = grade_chroma(img, low, LOWLAND_GREEN, amount=0.08)
    return img


def first_existing(*paths: Path) -> Path | None:
    for p in paths:
        if p and p.exists():
            return p
    return None


def paste_theater(img: Image.Image, plate: Image.Image, mask: Image.Image, x0, y0, x1, y1, w, h, alpha=0.38):
    # Kept for --guide diagnostics. P37 atlas never uses rectangular feather boxes.
    rx0, ry0 = int(wx(x0, w)), int(wy(y0, h))
    rx1, ry1 = int(wx(x1, w)), int(wy(y1, h))
    box = (rx0, ry0, rx1, ry1)
    fitted = punch(plate.resize((rx1 - rx0, ry1 - ry0), Image.Resampling.LANCZOS), 1.04, 1.04, 1.02)
    region = img.crop(box)
    mixed = Image.blend(region, fitted, alpha)
    local = ImageChops.multiply(mask.crop(box), feather_box(w, h, rx0, ry0, rx1, ry1, 70).crop(box))
    img.paste(Image.composite(mixed, region, local), box)
    return img


def match_parchment(img: Image.Image, target=STYLE_TARGET, amount=0.04) -> Image.Image:
    """Quiet mean shift so theater joins share a family. Keep watercolor chroma."""
    try:
        import numpy as np
    except ImportError:
        return img
    arr = np.asarray(img, dtype=np.float32)
    mean = arr.reshape(-1, 3).mean(axis=0)
    tgt = np.array(target, dtype=np.float32)
    shifted = arr + (tgt - mean) * amount
    return Image.fromarray(np.clip(shifted, 0, 255).astype('uint8'), 'RGB')


def even_land_luma(img: Image.Image, land: Image.Image, target=LAND_LUMA_TARGET, amount=0.14) -> Image.Image:
    """Even lighting. Scale luma only — never mix sage/tan toward parchment."""
    try:
        import numpy as np
    except ImportError:
        return img
    arr = np.asarray(img, dtype=np.float32)
    m = (np.asarray(land) > 8)
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    # Only crushed voids (Africa blotch class). Leave watercolor midtones.
    need = m & (yv < 118)
    scale = np.where(need, 1.0 + ((target - yv) / max(1.0, target)) * amount, 1.0)
    arr = arr * scale[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def flatten_region_luma(img: Image.Image, land: Image.Image, amount=0.62) -> Image.Image:
    """Kill low-frequency brightness steps (plate / L-band joins) inside a land mask.

    Subtract a heavily blurred luma residual toward the land median.
    Watercolor grain and peak hatching stay; a hard Cape rectangle cannot.
    """
    try:
        import numpy as np
    except ImportError:
        return img
    arr = np.asarray(img, dtype=np.float32)
    m = np.asarray(land) > 8
    if int(m.sum()) < 80:
        return img
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    yimg = Image.fromarray(np.clip(yv, 0, 255).astype('uint8'), 'L')
    low = np.asarray(yimg.filter(ImageFilter.GaussianBlur(120)), dtype=np.float32)
    target = float(np.median(yv[m]))
    residual = (low - target) * amount
    new_y = yv - residual
    scale = np.ones_like(yv)
    scale[m] = np.clip(new_y[m] / np.maximum(yv[m], 1.0), 0.88, 1.14)
    arr = arr * scale[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def heal_horiz_luma_step(img: Image.Image, land: Image.Image, w: int, h: int,
                         min_map_y=1480, max_map_y=1920) -> Image.Image:
    """Erase a remaining hard horizontal brightness step inside a land mask.

    Walks land-row mean luma, finds the worst south-of-Sahel jump, and
    crossfades a wide window through the mask only — never a rectangle.
    """
    try:
        import numpy as np
    except ImportError:
        return img
    arr = np.asarray(img, dtype=np.float32)
    m = np.asarray(land) > 8
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    y0 = max(0, int(wy(min_map_y, h)))
    y1 = min(h - 1, int(wy(max_map_y, h)))
    means = []
    for y in range(y0, y1):
        row = m[y]
        means.append(float(yv[y, row].mean()) if row.any() else np.nan)
    means = np.array(means, dtype=np.float32)
    valid = ~np.isnan(means)
    if int(valid.sum()) < 12:
        return img
    sm = means.copy()
    # 6px running mean, skip NaN
    for i in range(len(sm)):
        lo, hi = max(0, i - 3), min(len(sm), i + 4)
        sl = means[lo:hi]
        sl = sl[~np.isnan(sl)]
        if sl.size:
            sm[i] = sl.mean()
    d = np.diff(sm)
    d[np.isnan(d)] = 0
    k = int(np.argmax(np.abs(d)))
    if abs(float(d[k])) < 2.4:
        return img
    seam = y0 + k
    # Crossfade ±70 atlas px through the land mask.
    half = 70
    yy = np.arange(h)[:, None]
    t = np.clip((yy - (seam - half)) / (2 * half), 0, 1)
    # Sample a north and south land mean color
    def mean_rgb(ya, yb):
        band = m[ya:yb]
        if not band.any():
            return None
        return arr[ya:yb][band].mean(axis=0)
    north = mean_rgb(max(0, seam - 90), seam - 8)
    south = mean_rgb(seam + 8, min(h, seam + 90))
    if north is None or south is None:
        return img
    # Lift the darker side toward the lighter so the step dies, keep chroma.
    target = (north + south) * 0.5
    lift = np.zeros_like(arr)
    lift[:] = target
    # Blend amount peaks at the seam, only on land
    amt = (1.0 - np.abs(t * 2 - 1.0)) * 0.55
    amt = amt * m[..., None]
    arr = arr * (1.0 - amt) + lift * amt
    print(f'heal_horiz_luma_step: map y≈{seam * MAP_H / h:.0f} delta={d[k]:.2f}')
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def tileable_paper(src: Image.Image, size=768) -> Image.Image:
    """Crop vignette edges, then blend seams. A worn-edge tile becomes a plate grid."""
    w, h = src.size
    inset = int(min(w, h) * 0.12)
    cropped = src.crop((inset, inset, w - inset, h - inset)).resize((size, size), Image.Resampling.LANCZOS)
    try:
        import numpy as np
        arr = np.array(cropped, dtype=np.float32)
        blend = 72
        out = arr.copy()
        for i in range(blend):
            t = (i + 1) / (blend + 1)
            out[i] = out[i] * t + out[size - blend + i] * (1 - t)
            out[size - blend + i] = out[i]
            out[:, i] = out[:, i] * t + out[:, size - blend + i] * (1 - t)
            out[:, size - blend + i] = out[:, i]
        return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')
    except ImportError:
        return cropped


def match_to_region(plate: Image.Image, dest: Image.Image, mask: Image.Image) -> Image.Image:
    """Shift plate mean to the destination land mean so a box cannot flash."""
    try:
        import numpy as np
    except ImportError:
        return plate
    parr = np.asarray(plate, dtype=np.float32)
    darr = np.asarray(dest, dtype=np.float32)
    m = np.asarray(mask) > 12
    if int(m.sum()) < 80:
        return plate
    src_mean = parr.reshape(-1, 3).mean(axis=0)
    dst_mean = darr[m].mean(axis=0)
    dst_chroma = float(dst_mean.max() - dst_mean.min())
    if dst_chroma < 14:
        return plate
    # P39: quiet join only. A 40% mean-shift toward khaki underpaint
    # was the GIS flatten that killed plate beauty in .38.
    return Image.fromarray(np.clip(parr + (dst_mean - src_mean) * 0.08, 0, 255).astype('uint8'), 'RGB')


def paste_through_mask(img, plate, mask, dest_uv, src_frac, w, h, alpha=0.78, blur=56):
    """Place a plate into game UV. Alpha is the live land/continent mask only.

    dest_uv is positioning ONLY. It is never a rectangular alpha and it is
    never grown to the mask bbox — .38 grow-dest stretched plates and made
    polygon overlaps worse. If mask extends past dest, those texels stay
    on the previous layer (world plate / paper). Australia last.
    """
    if plate is None or mask is None:
        return img
    pw, ph = plate.size
    crop = plate.crop((
        int(src_frac[0] * pw), int(src_frac[1] * ph),
        int(src_frac[2] * pw), int(src_frac[3] * ph),
    ))
    rx0, ry0 = int(wx(dest_uv[0], w)), int(wy(dest_uv[1], h))
    rx1, ry1 = int(wx(dest_uv[2], w)), int(wy(dest_uv[3], h))
    if rx1 <= rx0 or ry1 <= ry0:
        return img
    # P39 HARD: dest UV = position only. Do NOT grow dest to mask bbox.
    fitted = crop.resize((rx1 - rx0, ry1 - ry0), Image.Resampling.LANCZOS)
    local = mask
    fitted = match_to_region(fitted, img.crop((rx0, ry0, rx1, ry1)), local.crop((rx0, ry0, rx1, ry1)))
    layer = img.copy()
    layer.paste(fitted, (rx0, ry0))
    feather = local.filter(ImageFilter.GaussianBlur(blur))
    mixed = Image.blend(img, layer, alpha)
    return Image.composite(mixed, img, feather)


def paste_bbox_feather(img, plate, dest_uv, src_frac, w, h, alpha=0.92, feather=140):
    """P40 HARD: geographic bbox + heavy feather. NEVER a territory mask.

    Continuous paint — land and sea stay one unbroken plate. Rectangle
    edge only is feathered so theater joins dissolve. maskPaintOff.
    """
    if plate is None:
        return img
    pw, ph = plate.size
    crop = plate.crop((
        int(src_frac[0] * pw), int(src_frac[1] * ph),
        int(src_frac[2] * pw), int(src_frac[3] * ph),
    ))
    rx0, ry0 = int(wx(dest_uv[0], w)), int(wy(dest_uv[1], h))
    rx1, ry1 = int(wx(dest_uv[2], w)), int(wy(dest_uv[3], h))
    if rx1 <= rx0 or ry1 <= ry0:
        return img
    fitted = punch(crop.resize((rx1 - rx0, ry1 - ry0), Image.Resampling.LANCZOS), 1.05, 1.05, 1.03)
    box = (rx0, ry0, rx1, ry1)
    region = img.crop(box)
    mixed = Image.blend(region, fitted, alpha)
    mw, mh = rx1 - rx0, ry1 - ry0
    mask = Image.new('L', (mw, mh), 0)
    d = ImageDraw.Draw(mask)
    inset = max(28, int(feather * 0.55))
    if mw > inset * 2 and mh > inset * 2:
        d.rectangle((inset, inset, mw - inset, mh - inset), fill=255)
    else:
        d.rectangle((0, 0, mw, mh), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    img.paste(Image.composite(mixed, region, mask), box)
    return img


def paste_geo_crop(img, plate, mask, geo, uv, w, h, alpha=0.80):
    pw, ph = plate.size
    crop = plate.crop((
        int(geo[0] * pw), int(geo[1] * ph),
        int(geo[2] * pw), int(geo[3] * ph),
    ))
    return paste_theater(img, crop, mask, uv[0], uv[1], uv[2], uv[3], w, h, alpha)


def print_continent(paper: Image.Image, mask: Image.Image, rgb, strength=0.62) -> Image.Image:
    wash = Image.new('RGB', paper.size, rgb)
    stained = Image.blend(paper, ImageChops.multiply(paper, wash), strength)
    return Image.composite(stained, paper, mask)


def draw_ridges(img: Image.Image, mountain: Image.Image | None, land: Image.Image, w, h):
    # P35: quiet painted ranges only — no oval chroma stamps / blotch ellipses.
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for ridge in RIDGES:
        pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
        d.line(pts, fill=(150, 132, 96, 48), width=max(6, w // 360), joint='curve')
    mass = layer.filter(ImageFilter.GaussianBlur(5.5))
    if mountain:
        mt = tile_image(mountain.resize((560, 560), Image.Resampling.LANCZOS), w, h)
        ridge_a = ImageChops.multiply(mass.split()[-1], land)
        img.paste(ImageChops.multiply(img, mt), (0, 0), ridge_a.point(lambda v: int(v * 0.14)))
    img.paste(mass.convert('RGB'), (0, 0), ImageChops.multiply(mass.split()[-1], land))
    return img


def draw_rivers(img: Image.Image, w, h):
    d = ImageDraw.Draw(img, 'RGBA')
    for river in RIVERS:
        pts = [(wx(x, w), wy(y, h)) for x, y in river]
        d.line([(p[0] + 1.2, p[1] + 1.6) for p in pts], fill=(36, 40, 32, 80), width=max(3, w // 700))
        d.line(pts, fill=(52, 64, 60, 140), width=max(2, w // 900))
        d.line(pts, fill=(120, 128, 116, 70), width=1)
    return img


def draw_coast(img: Image.Image, mask: Image.Image, w, h):
    # STYLE REF: thin sepia hand-ink + quiet cream foam. Never neon cyan.
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.7))
    foam = Image.new('RGB', (w, h), (0xE4, 0xD8, 0xC0))
    ink = Image.new('RGB', (w, h), (0x5A, 0x48, 0x34))
    img = Image.composite(ink, img, edge.point(lambda v: int(v * 0.72)))
    img = Image.composite(foam, img, edge.point(lambda v: int(v * 0.28)))
    return img


def draw_badges(img: Image.Image, w, h):
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', max(18, w // 160))
    except OSError:
        font = ImageFont.load_default()
    for badge in BADGES:
        px, py = wx(badge['x'], w), wy(badge['y'], h)
        wash = CONT_HEX[badge['name']]
        box = (px - 36, py - 16, px + 36, py + 16)
        d.rounded_rectangle(box, radius=8, fill=(237, 228, 204, 230), outline=wash, width=3)
        d.rounded_rectangle(box, radius=8, outline=(42, 36, 24), width=1)
        d.text((px, py), f"+{badge['bonus']}", fill=(42, 36, 24), font=font, anchor='mm')
    return img


# --- P41 silhouette-first ---------------------------------------------------
# Exact game land geometry. Not real-world Earth. Not per-territory color.

SIL_SEA = (0xE6, 0xDF, 0xCC)
SIL_LAND = (0xC4, 0xA8, 0x7A)
SIL_INK = (0x3A, 0x2C, 0x1C)
STYLE_COAST = (0x6A, 0x8A, 0x58)
STYLE_INLAND = (0xC6, 0xAE, 0x7E)
STYLE_SEA = (0xD8, 0xD4, 0xC4)
STYLE_FOAM = (0xE8, 0xE0, 0xD0)

# 16:9 letterbox around the atlas so GenerateImage does not stretch coasts.
SIL_PAD_X = 32
CROP_AUS = (1840, 1180, 2920, 2000)
CROP_MED = (780, 520, 1520, 1120)
CROP_UK = (620, 160, 1080, 620)
CROP_EUAF = (620, 80, 1620, 1960)


def land_distance_in_out(land: Image.Image, max_r=140):
    """Inside-land and outside-land distance to the coast. Chebyshev-ish."""
    import numpy as np
    w, h = land.size
    sw, sh = max(256, w // 4), max(146, h // 4)
    small = np.asarray(land.resize((sw, sh), Image.Resampling.NEAREST)) > 8
    inv = ~small
    def sdf(seed_true, limit):
        d = np.where(seed_true, 0.0, float(limit)).astype(np.float32)
        steps = max(8, limit // 4)
        for _ in range(steps):
            up = np.pad(d, ((1, 0), (0, 0)), constant_values=limit)[:-1]
            down = np.pad(d, ((0, 1), (0, 0)), constant_values=limit)[1:]
            left = np.pad(d, ((0, 0), (1, 0)), constant_values=limit)[:, :-1]
            right = np.pad(d, ((0, 0), (0, 1)), constant_values=limit)[:, 1:]
            d = np.minimum(d, np.minimum(np.minimum(up, down), np.minimum(left, right)) + 1.0)
        d = np.clip(d * 4.0, 0, limit)
        full = Image.fromarray(d.astype('uint8'), 'L').resize((w, h), Image.Resampling.BILINEAR)
        return np.asarray(full, dtype=np.float32)
    # dist_in: 0 on sea, grows inland (seed = sea). dist_out: 0 on land, grows seaward.
    return sdf(inv, max_r), sdf(small, max_r)


def watercolor_noise(w, h, seed=41):
    """Soft multi-scale blotches — watercolor, not GIS noise."""
    import numpy as np
    rng = np.random.RandomState(seed)
    acc = np.zeros((h, w), dtype=np.float32)
    for scale, amp in ((18, 0.55), (48, 0.32), (110, 0.22)):
        nw, nh = max(8, w // scale), max(8, h // scale)
        n = rng.randn(nh, nw).astype(np.float32)
        layer = Image.fromarray(((n - n.min()) / max(1e-5, float(n.max() - n.min())) * 255).astype('uint8'), 'L')
        layer = layer.resize((w, h), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(scale * 0.35))
        acc += (np.asarray(layer, dtype=np.float32) / 255.0 - 0.5) * amp
    return acc


def sample_style_palette(style: Image.Image | None):
    """Pull coastal green / inland tan / sea cream from the Oceania STYLE REF."""
    if style is None:
        return STYLE_COAST, STYLE_INLAND, STYLE_SEA
    try:
        import numpy as np
    except ImportError:
        return STYLE_COAST, STYLE_INLAND, STYLE_SEA
    arr = np.asarray(style.convert('RGB'), dtype=np.float32)
    h, w = arr.shape[:2]
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    g = arr[:, :, 1] - arr[:, :, 0]
    # Sea = pale high-luma low-chroma (corners + bottom)
    sea_band = arr[int(h * 0.72):, :]
    sea = tuple(int(x) for x in sea_band.reshape(-1, 3).mean(axis=0))
    # Inland tan = Australia body (center of the plate)
    body = arr[int(h * 0.38):int(h * 0.68), int(w * 0.28):int(w * 0.62)]
    inland = tuple(int(x) for x in body.reshape(-1, 3).mean(axis=0))
    # Coastal green = greener-than-red mid luma
    greenish = (g > 8) & (yv > 70) & (yv < 170)
    if int(greenish.sum()) > 80:
        coast = tuple(int(x) for x in arr[greenish].mean(axis=0))
    else:
        coast = STYLE_COAST
    return coast, inland, sea


def build_silhouette_guide(lands, w=ATLAS_W, h=ATLAS_H) -> Image.Image:
    """Exact game land geometry at atlas res. No text. No UI. No fake Earth."""
    parchment = load_rgb(first_existing(
        BOARD / 'board-parchment-tile.png',
        GEN37 / 'p37-parchment-grain-tile.png',
    ))
    if parchment:
        paper = tile_image(tileable_paper(parchment, 768), w, h)
        paper = ImageEnhance.Color(paper).enhance(0.78)
        paper = ImageEnhance.Brightness(paper).enhance(1.04)
        img = Image.new('RGB', (w, h), SIL_SEA)
        img = Image.blend(img, paper, 0.55)
    else:
        img = Image.new('RGB', (w, h), SIL_SEA)
    land = land_mask(lands, w, h)
    fill = Image.new('RGB', (w, h), SIL_LAND)
    if parchment:
        fill = Image.blend(fill, paper, 0.28)
    img = Image.composite(fill, img, land)
    # Exact coast ink — the generator must hug this line.
    edge = land.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.55))
    ink = Image.new('RGB', (w, h), SIL_INK)
    img = Image.composite(ink, img, edge.point(lambda v: int(min(255, v * 1.15))))
    img.info['land'] = land
    return img


def letterbox_16x9(img: Image.Image, pad_x=SIL_PAD_X) -> Image.Image:
    """Pad atlas (4096×2340) to true 16:9 without stretching coasts."""
    w, h = img.size
    out = Image.new('RGB', (w + pad_x * 2, h), SIL_SEA)
    out.paste(img, (pad_x, 0))
    return out


def crop_map_window(img: Image.Image, dest_uv, w=None, h=None) -> Image.Image:
    w = w or img.size[0]
    h = h or img.size[1]
    box = (
        int(wx(dest_uv[0], w)), int(wy(dest_uv[1], h)),
        int(wx(dest_uv[2], w)), int(wy(dest_uv[3], h)),
    )
    return img.crop(box)


def write_silhouette_set(lands) -> Image.Image:
    """Atlas silhouette + 16:9 gen ref + Aus/Med/UK crops. Refs + QA still."""
    GEN41.mkdir(parents=True, exist_ok=True)
    QA41.mkdir(parents=True, exist_ok=True)
    guide = build_silhouette_guide(lands, ATLAS_W, ATLAS_H)
    guide.save(OUT_SILHOUETTE, 'PNG', optimize=True)
    print(f'wrote {OUT_SILHOUETTE} {guide.size}')
    qa_dest = QA41 / 'silhouette-guide.png'
    shutil.copy2(OUT_SILHOUETTE, qa_dest)
    print(f'wrote {qa_dest}')
    letterbox_16x9(guide).save(OUT_SILHOUETTE_16X9, 'PNG', optimize=True)
    print(f'wrote {OUT_SILHOUETTE_16X9}')
    for dest, uv in (
        (OUT_SIL_AUS, CROP_AUS),
        (OUT_SIL_MED, CROP_MED),
        (OUT_SIL_UK, CROP_UK),
    ):
        crop = crop_map_window(guide, uv, ATLAS_W, ATLAS_H)
        crop.save(dest, 'PNG', optimize=True)
        print(f'wrote {dest} {crop.size}')
    style_src = first_existing(
        GEN41 / 'style-ref-oceania-beautiful.png',
        GEN40 / 'style-ref-oceania-beautiful.png',
        GEN39 / 'style-ref-oceania-beautiful.png',
    )
    if style_src and not (GEN41 / 'style-ref-oceania-beautiful.png').exists():
        shutil.copy2(style_src, GEN41 / 'style-ref-oceania-beautiful.png')
    imagine_src = first_existing(
        GEN41 / 'style-ref-imagine-world.png',
        ROOT / 'uploads' / 'p41-kick' / '02-grok-imagine-world-hero.jpg',
        Path('/opt/cursor/artifacts/assets/style-ref-imagine-world.png'),
    )
    if imagine_src and not (GEN41 / 'style-ref-imagine-world.png').exists():
        shutil.copy2(imagine_src, GEN41 / 'style-ref-imagine-world.png')
    return guide


def style_inland_crop(style: Image.Image) -> Image.Image:
    """Crop the tan Australia interior from the Oceania STYLE REF — no coastline."""
    w, h = style.size
    return style.crop((int(w * 0.30), int(h * 0.42), int(w * 0.62), int(h * 0.68)))


def style_coast_crop(style: Image.Image) -> Image.Image:
    """Crop a coastal-green strip from the STYLE REF south/east Australia fringe."""
    w, h = style.size
    return style.crop((int(w * 0.58), int(h * 0.48), int(w * 0.78), int(h * 0.72)))


def highpass_grain(img: Image.Image, radius=10) -> Image.Image:
    blur = img.filter(ImageFilter.GaussianBlur(radius))
    return ImageChops.subtract(ImageChops.add(img, Image.new('RGB', img.size, (128, 128, 128))), blur)


def watercolor_into_silhouette(lands, style=None, w=ATLAS_W, h=ATLAS_H) -> Image.Image:
    """Paint antique watercolor INTO the exact union land silhouette.

    Not per-territory color. Not real-world Earth. Coasts = land mask.
    STYLE REF supplies coastal green / inland tan / parchment sea / grain.
    """
    import numpy as np
    parchment = load_rgb(first_existing(
        BOARD / 'board-parchment-tile.png',
        GEN37 / 'p37-parchment-grain-tile.png',
    ))
    paper = tile_image(tileable_paper(parchment, 768), w, h) if parchment else Image.new('RGB', (w, h), (0xE8, 0xE0, 0xC8))
    paper = ImageEnhance.Color(paper).enhance(0.80)
    land = land_mask(lands, w, h)
    dist_in, dist_out = land_distance_in_out(land, max_r=160)
    coast_rgb, inland_rgb, sea_rgb = sample_style_palette(style)
    m = (np.asarray(land) > 8).astype(np.float32)
    blotch = watercolor_noise(w, h, seed=41)
    # Wide soft fringe — watercolor wash, not a GIS outline ring.
    t_in = np.clip((dist_in - 1.5) / 88.0, 0, 1)
    t_in = t_in * t_in * (3.0 - 2.0 * t_in)
    coast = np.array(coast_rgb, dtype=np.float32) * 0.40 + np.array([0x68, 0x8C, 0x58], dtype=np.float32) * 0.60
    inland = np.array(inland_rgb, dtype=np.float32) * 0.35 + np.array([0xD4, 0xB8, 0x82], dtype=np.float32) * 0.65
    sea = np.array(sea_rgb, dtype=np.float32) * 0.40 + np.array([0xDC, 0xD6, 0xC4], dtype=np.float32) * 0.60
    arid = np.asarray(land_mask(lands, w, h, biomes={'arid'})) > 8
    snow = np.asarray(land_mask(lands, w, h, biomes={'snow'})) > 8
    lush = np.asarray(land_mask(lands, w, h, biomes={'lush', 'forest', 'jungle'})) > 8
    land_col = coast * (1.0 - t_in[..., None]) + inland * t_in[..., None]
    land_col[arid] = land_col[arid] * 0.78 + np.array([220, 190, 128], dtype=np.float32) * 0.22
    land_col[snow] = land_col[snow] * 0.62 + np.array([234, 228, 216], dtype=np.float32) * 0.38
    land_col[lush] = land_col[lush] * 0.88 + coast * 0.12
    land_col = land_col + blotch[..., None] * 14.0
    parr = np.asarray(paper, dtype=np.float32)
    # STYLE REF inland watercolor as the land pigment (tiled interior only).
    if style is not None:
        inland_tile = tile_image(tileable_paper(style_inland_crop(style), 640), w, h)
        coast_tile = tile_image(tileable_paper(style_coast_crop(style), 640), w, h)
        iarr = np.asarray(inland_tile, dtype=np.float32)
        carr = np.asarray(coast_tile, dtype=np.float32)
        pigment = carr * (1.0 - t_in[..., None]) + iarr * t_in[..., None]
        land_col = land_col * 0.38 + pigment * 0.44 + parr * 0.18
        grain_src = highpass_grain(style_inland_crop(style).resize((960, 640), Image.Resampling.BICUBIC), 8)
        grain = np.asarray(tile_image(tileable_paper(grain_src, 640), w, h), dtype=np.float32)
        land_col = np.clip(land_col + (grain - 128.0) * 0.28 * m[..., None], 0, 255)
    else:
        land_col = land_col * 0.74 + parr * 0.26
    prox = np.clip(np.exp(-np.maximum(dist_out - 2.0, 0.0) / 52.0), 0, 1)
    cool = np.array([0xC8, 0xD0, 0xCC], dtype=np.float32)
    sea_col = parr * 0.50 + sea * 0.50
    sea_col = sea_col * (1.0 - 0.22 * prox[..., None]) + cool * (0.22 * prox[..., None])
    sea_col = sea_col + blotch[..., None] * 4.0
    out = land_col * m[..., None] + sea_col * (1.0 - m[..., None])
    img = Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')
    # Soft painted coast on the EXACT silhouette — foam + quiet sepia, not GIS ink.
    edge = land.filter(ImageFilter.FIND_EDGES)
    soft = edge.filter(ImageFilter.GaussianBlur(2.4))
    img = Image.composite(Image.new('RGB', (w, h), (0x58, 0x7A, 0x48)), img, soft.point(lambda v: int(v * 0.38)))
    img = Image.composite(Image.new('RGB', (w, h), STYLE_FOAM), img, edge.filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: int(v * 0.24)))
    img = Image.composite(Image.new('RGB', (w, h), (0x5A, 0x48, 0x34)), img, edge.filter(ImageFilter.GaussianBlur(0.5)).point(lambda v: int(v * 0.38)))
    height = imhof_height(w, h)
    # Painterly Imhof only — peak stamps read as diamond GIS marks at 390.
    img = apply_imhof_painterly(img, land, height, strength=0.38, cool_map=biome_cool_map(lands, w, h))
    mountains = land_mask(lands, w, h, biomes={'mountain', 'hills'})
    img = draw_imhof_peaks(img, mountains, height, w, h, lands)
    img = punch(img, color=1.14, contrast=1.10, sharp=1.06)
    img.info['imhof_height'] = height
    img.info['land'] = land
    img.info['strategy'] = 'silhouetteFirst'
    img.info['coastRegistered'] = True
    img.info['maskPaintOff'] = True
    return img


def gen_alignment_iou(paint: Image.Image, land: Image.Image) -> float:
    """How well a generated plate's land-like pixels match the silhouette."""
    try:
        import numpy as np
    except ImportError:
        return 0.0
    arr = np.asarray(paint.convert('RGB'), dtype=np.float32)
    if paint.size != land.size:
        paint = paint.resize(land.size, Image.Resampling.LANCZOS)
        arr = np.asarray(paint, dtype=np.float32)
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    chroma = arr.max(axis=2) - arr.min(axis=2)
    # Sea in the STYLE REF family is pale + low chroma. Land is warmer / greener.
    gen_land = (yv < 196) & ((arr[:, :, 0] - arr[:, :, 2] > 6) | (arr[:, :, 1] - arr[:, :, 0] > 4) | (chroma > 22))
    sil = np.asarray(land) > 8
    inter = int((gen_land & sil).sum())
    union = int((gen_land | sil).sum())
    return inter / max(1, union)


def pour_paint_into_silhouette(paint: Image.Image, base: Image.Image, land: Image.Image, amount=0.88) -> Image.Image:
    """Keep gen beauty only where it sits inside the silhouette. Holes keep base.

    Union land only — NEVER a territory mask. Coasts stay the guide.
    """
    import numpy as np
    if paint.size != base.size:
        paint = paint.resize(base.size, Image.Resampling.LANCZOS)
    parr = np.asarray(paint.convert('RGB'), dtype=np.float32)
    barr = np.asarray(base.convert('RGB'), dtype=np.float32)
    m = (np.asarray(land) > 8).astype(np.float32)
    yv = parr[:, :, 0] * 0.2126 + parr[:, :, 1] * 0.7152 + parr[:, :, 2] * 0.0722
    chroma = parr.max(axis=2) - parr.min(axis=2)
    gen_land = ((yv < 200) & ((parr[:, :, 0] - parr[:, :, 2] > 4) | (parr[:, :, 1] - parr[:, :, 0] > 3) | (chroma > 18))).astype(np.float32)
    # Inside silhouette: prefer gen land; if gen painted sea in a land hole, keep base.
    land_keep = m * (0.18 + 0.82 * gen_land) * amount
    # Outside silhouette: keep construction sea. Gens often invent isoline
    # hatch or real-world extra land — do not pour those coasts.
    gen_sea = 1.0 - gen_land
    sea_keep = (1.0 - m) * gen_sea * (amount * 0.18)
    mix = np.clip(land_keep + sea_keep, 0, 1)[..., None]
    # Feather the silhouette so the join is a painted coast, not a clip.
    feather = np.asarray(land.filter(ImageFilter.GaussianBlur(1.8)), dtype=np.float32) / 255.0
    mix = mix * (0.55 + 0.45 * feather[..., None])
    out = barr * (1.0 - mix) + parr * mix
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


# Dest UV (game wrap) → src UV (Americas-left Imagine plate).
# Applied through feathered LAND MASKS only — never a rectangular sea box.
EAST_NA_NAMES = {'East Canada', 'East US', 'Cuba', 'Panama'}
WEST_NA_NAMES = {'Alaska', 'West Canada', 'West US', 'Mexico'}
JAPAN_NAMES = {'Japan', 'Okinawa'}
OCEANIA_SOUTH = {
    'Australia', 'New Guinea', 'East Indies',
    'Borneo Celebes', 'Philippines', 'Solomon Islands', 'Caroline Islands',
}
WRAP_WINDOWS = [
    ('asia',    {'continent': 'Asia'},                      (0.530, 0.100, 0.905, 0.520)),
    ('me',      {'continent': 'Middle East'},               (0.525, 0.360, 0.645, 0.560)),
    ('europe',  {'continent': 'Europe'},                    (0.425, 0.155, 0.565, 0.425)),
    ('africa',  {'continent': 'Africa'},                    (0.450, 0.395, 0.595, 0.785)),
    ('east_na', {'names': EAST_NA_NAMES},                   (0.165, 0.040, 0.330, 0.510)),
    ('west_na', {'names': WEST_NA_NAMES},                   (0.025, 0.075, 0.185, 0.505)),
    ('sa',      {'continent': 'South America'},             (0.145, 0.495, 0.292, 0.905)),
    ('oceania', {'names': OCEANIA_SOUTH},                   (0.755, 0.545, 0.940, 0.820)),
    ('japan',   {'names': JAPAN_NAMES},                     (0.830, 0.295, 0.895, 0.425)),
    ('nz',      {'names': {'New Zealand'}},                 (0.905, 0.720, 0.955, 0.820)),
]


def bilinear_sample(src, gx, gy):
    """src (sh,sw,3) float; gx/gy dest-shaped source UVs in 0–1."""
    import numpy as np
    sh, sw = src.shape[:2]
    x = np.clip(gx * sw - 0.5, 0, sw - 1.001)
    y = np.clip(gy * sh - 0.5, 0, sh - 1.001)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    x1 = np.minimum(x0 + 1, sw - 1)
    y1 = np.minimum(y0 + 1, sh - 1)
    fx = (x - x0).astype(np.float32)[..., None]
    fy = (y - y0).astype(np.float32)[..., None]
    c00 = src[y0, x0]
    c10 = src[y0, x1]
    c01 = src[y1, x0]
    c11 = src[y1, x1]
    return (c00 * (1.0 - fx) + c10 * fx) * (1.0 - fy) + (c01 * (1.0 - fx) + c11 * fx) * fy


def plate_land_mask_arr(img: Image.Image):
    """Land-like pixels on the Imagine plate. Pale low-chroma = sea."""
    import numpy as np
    arr = np.asarray(img.convert('RGB'), dtype=np.float32)
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    chroma = arr.max(axis=2) - arr.min(axis=2)
    return (yv < 200) & (
        (arr[:, :, 0] - arr[:, :, 2] > 4)
        | (arr[:, :, 1] - arr[:, :, 0] > 3)
        | (chroma > 18)
    )


def kill_isoline_hatch(img: Image.Image) -> Image.Image:
    """Lift closed contour rings in pale sea. oceanNoHatch — keep land relief."""
    import numpy as np
    arr = np.asarray(img.convert('RGB'), dtype=np.float32)
    land = plate_land_mask_arr(img)
    sea = ~land
    out = arr
    for radius, delta in ((7, 3.5), (14, 4.5), (22, 6.0)):
        blur = np.asarray(
            Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB').filter(
                ImageFilter.GaussianBlur(radius)
            ),
            dtype=np.float32,
        )
        yv = out[:, :, 0] * 0.2126 + out[:, :, 1] * 0.7152 + out[:, :, 2] * 0.0722
        by = blur[:, :, 0] * 0.2126 + blur[:, :, 1] * 0.7152 + blur[:, :, 2] * 0.0722
        chroma = out.max(axis=2) - out.min(axis=2)
        ink = sea & (yv > 128) & ((by - yv) > delta) & (chroma < 36)
        mix = ink.astype(np.float32)[..., None]
        out = out * (1.0 - mix) + blur * mix
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


def wrap_standard_world_to_game(plate: Image.Image, w: int, h: int, lands=None) -> Image.Image:
    """Circular-shift + land-mask windows: Americas-left plate → game wrap UV.

    Plate: NA left, Old World center, Aus right (standard Imagine hero).
    Game: East NA+SA left, EU/AF/Asia/Aus center, West NA right.
    Fade Antarctica (no game land). No political borders copied.
    Windows weight by feathered game land — never a rectangular sea box.
    """
    import numpy as np
    src = np.asarray(plate.convert('RGB'), dtype=np.float32)
    xx = (np.arange(w, dtype=np.float32) + 0.5) / w
    yy = (np.arange(h, dtype=np.float32) + 0.5) / h
    XX, YY = np.meshgrid(xx, yy)
    # Base: circular shift at Mississippi + crop polar parchment / Antarctica.
    split = 0.178
    y0, y1 = 0.035, 0.855
    gx = (XX + split) % 1.0
    gy = y0 + YY * (y1 - y0)
    # Right-south sea must stay open ocean, not wrapped Andes or plate-edge vignette.
    right_south = np.clip((XX - 0.78) / 0.10, 0, 1) * np.clip((YY - 0.52) / 0.10, 0, 1)
    gx = gx * (1.0 - right_south) + 0.40 * right_south
    gy = gy * (1.0 - right_south) + 0.58 * right_south
    if lands:
        for _name, sel, src_uv in WRAP_WINDOWS:
            sx0, sy0, sx1, sy1 = src_uv
            names = sel.get('names')
            continents = {sel['continent']} if sel.get('continent') else None
            mimg = land_mask(lands, w, h, names=names, continents=continents)
            m = np.asarray(mimg.filter(ImageFilter.GaussianBlur(28)), dtype=np.float32) / 255.0
            if float(m.max()) < 0.05:
                continue
            ys, xs = np.where(np.asarray(mimg) > 8)
            if xs.size < 8:
                continue
            dx0, dx1 = float(xs.min()) / w, float(xs.max()) / w
            dy0, dy1 = float(ys.min()) / h, float(ys.max()) / h
            pad = 0.012
            dx0, dy0, dx1, dy1 = dx0 - pad, dy0 - pad, dx1 + pad, dy1 + pad
            u = (XX - dx0) / max(1e-6, dx1 - dx0)
            v = (YY - dy0) / max(1e-6, dy1 - dy0)
            nsx = sx0 + np.clip(u, 0, 1) * (sx1 - sx0)
            nsy = sy0 + np.clip(v, 0, 1) * (sy1 - sy0)
            gx = gx * (1.0 - m) + nsx * m
            gy = gy * (1.0 - m) + nsy * m
    sampled = bilinear_sample(src, gx, gy)
    img = Image.fromarray(np.clip(sampled, 0, 255).astype('uint8'), 'RGB')
    img.info['strategy'] = 'silhouetteFirst'
    img.info['wrapRemap'] = True
    return img


def _nearest_indices(feature: 'object'):
    """iy, ix of nearest True pixel. scipy EDT, else chamfer on a 4× downsample."""
    import numpy as np
    try:
        from scipy.ndimage import distance_transform_edt
        _d, (iy, ix) = distance_transform_edt(~feature, return_indices=True)
        return iy, ix
    except ImportError:
        step = 4
        small = feature[::step, ::step]
        sh, sw = small.shape
        inf = 10**6
        dist = np.where(small, 0, inf).astype(np.int32)
        iy = np.zeros((sh, sw), np.int32)
        ix = np.zeros((sh, sw), np.int32)
        ys, xs = np.where(small)
        iy[ys, xs] = ys
        ix[ys, xs] = xs
        for _ in range(max(sh, sw)):
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                src = np.pad(dist, ((1, 1), (1, 1)), constant_values=inf)
                shifted = src[1 + dy:1 + dy + sh, 1 + dx:1 + dx + sw] + 1
                better = shifted < dist
                dist = np.where(better, shifted, dist)
                iy_p = np.pad(iy, ((1, 1), (1, 1)))
                ix_p = np.pad(ix, ((1, 1), (1, 1)))
                iy = np.where(better, iy_p[1 + dy:1 + dy + sh, 1 + dx:1 + dx + sw], iy)
                ix = np.where(better, ix_p[1 + dy:1 + dy + sh, 1 + dx:1 + dx + sw], ix)
        h, w = feature.shape
        iy_f = np.clip(iy * step, 0, h - 1)
        ix_f = np.clip(ix * step, 0, w - 1)
        iy_full = np.repeat(np.repeat(iy_f, step, axis=0), step, axis=1)[:h, :w]
        ix_full = np.repeat(np.repeat(ix_f, step, axis=0), step, axis=1)[:h, :w]
        return iy_full, ix_full


def register_plate_to_silhouette(
    wrapped: Image.Image,
    land: Image.Image,
    under: Image.Image | None = None,
) -> Image.Image:
    """Warp wrapped-plate coasts onto the live territories.json silhouette.

    Dest land ← nearest plate-land color. Dest sea ← nearest plate-sea.
    Far holes keep silhouette-conditioned underpainting. Union land only —
    NEVER a territory mask. Ink rings sit on painted coasts.
    """
    import numpy as np
    arr = np.asarray(wrapped.convert('RGB'), dtype=np.float32)
    sil = np.asarray(land) > 8
    plate_land = plate_land_mask_arr(wrapped)
    out = arr.copy()
    if plate_land.any() and (~plate_land).any():
        liy, lix = _nearest_indices(plate_land)
        siy, six = _nearest_indices(~plate_land)
        need_land = sil & ~plate_land
        need_sea = (~sil) & plate_land
        out[need_land] = arr[liy[need_land], lix[need_land]]
        out[need_sea] = arr[siy[need_sea], six[need_sea]]
        # Far silhouette holes: keep construction watercolor (still the guide).
        if under is not None:
            uarr = np.asarray(under.convert('RGB').resize(wrapped.size, Image.Resampling.LANCZOS), dtype=np.float32)
            yy = np.arange(arr.shape[0], dtype=np.int32)[:, None]
            xx = np.arange(arr.shape[1], dtype=np.int32)[None, :]
            dland = np.hypot((liy - yy).astype(np.float32), (lix - xx).astype(np.float32))
            far = need_land & (dland > 90.0)
            t = np.clip((dland - 90.0) / 70.0, 0, 1)[..., None]
            out = np.where(far[..., None], out * (1.0 - t) + uarr * t, out)
    img = Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')
    # Soft painted coast on the EXACT silhouette — foam, not a second ink ring.
    # Territory overlays own the political ink.
    edge = land.filter(ImageFilter.FIND_EDGES)
    img = Image.composite(
        Image.new('RGB', land.size, STYLE_FOAM),
        img,
        edge.filter(ImageFilter.GaussianBlur(1.1)).point(lambda v: int(v * 0.22)),
    )
    img = Image.composite(
        Image.new('RGB', land.size, (0x5A, 0x48, 0x34)),
        img,
        edge.filter(ImageFilter.GaussianBlur(0.45)).point(lambda v: int(v * 0.16)),
    )
    img.info['coastRegistered'] = True
    img.info['silhouetteFirst'] = True
    return img


def load_p41_plates():
    """Fail-closed: Imagine WORLD hero + Oceania secondary must exist."""
    imagine = load_rgb(first_existing(
        GEN41 / 'style-ref-imagine-world.png',
        ROOT / 'uploads' / 'p41-kick' / '02-grok-imagine-world-hero.jpg',
        Path('/opt/cursor/artifacts/assets/style-ref-imagine-world.png'),
    ))
    style = load_rgb(first_existing(
        GEN41 / 'style-ref-oceania-beautiful.png',
        GEN40 / 'style-ref-oceania-beautiful.png',
        GEN39 / 'style-ref-oceania-beautiful.png',
    ))
    world = load_rgb(first_existing(
        GEN41 / 'style-ref-imagine-world.png',
        GEN41 / 'p41-world-into-silhouette-b.png',
        GEN41 / 'p41-world-into-silhouette.png',
        GEN41 / 'p41-world-hero.png',
        GEN41 / 'p41-world-board.png',
    ))
    oceania = load_rgb(first_existing(
        GEN41 / 'p41-oceania-into-silhouette.png',
        GEN41 / 'p41-oceania.png',
        GEN40 / 'p40-oceania.png',
    ))
    europe = load_rgb(first_existing(
        GEN41 / 'p41-europe-into-silhouette.png',
        GEN41 / 'p41-med-into-silhouette.png',
        GEN40 / 'p40-europe.png',
    ))
    uk = load_rgb(first_existing(
        GEN41 / 'p41-uk-into-silhouette.png',
        GEN41 / 'p41-uk.png',
    ))
    if not imagine:
        raise SystemExit('P41 fail-closed: missing Grok Imagine WORLD hero plate')
    if not style:
        raise SystemExit('P41 fail-closed: missing Oceania STYLE REF')
    return {
        'imagine': imagine,
        'style': style,
        'world': world,
        'oceania': oceania,
        'europe': europe,
        'uk': uk,
    }


def build_guide(lands, w=2048, h=1170) -> Image.Image:
    img = Image.new('RGB', (w, h), OCEAN)
    parchment = load_rgb(BOARD / 'board-parchment-tile.png')
    if parchment:
        paper = tile_image(parchment, w, h)
        paper = ImageEnhance.Color(paper).enhance(0.85)
        mask = land_mask(lands, w, h)
        img = Image.composite(paper, img, mask)
    d = ImageDraw.Draw(img)
    for land in lands:
        rgb = CONT_HEX.get(land['continent'], PARCHMENT)
        biome = land['biome']
        if biome == 'snow':
            rgb = tuple(min(255, int(c * 0.35 + 232 * 0.65)) for c in rgb)
        elif biome == 'arid':
            rgb = tuple(min(255, int(c * 0.55 + x * 0.45)) for c, x in zip(rgb, (196, 163, 90)))
        elif biome == 'forest':
            rgb = tuple(int(c * 0.72) for c in rgb)
        elif biome == 'mountain':
            rgb = tuple(min(255, int(c * 0.7 + x * 0.3)) for c, x in zip(rgb, (140, 120, 88)))
        for poly in land.get('polygons') or []:
            pts = poly_xy(poly, w, h)
            if len(pts) >= 3:
                d.polygon(pts, fill=rgb)
    for ridge in RIDGES:
        pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
        d.line(pts, fill=(96, 80, 56), width=6)
    return img


def load_p40_plates():
    """Fail-closed: p40 hero plates must exist. STYLE REF on every pass."""
    world = load_rgb(first_existing(
        GEN40 / 'p40-world-board-c.png',
        GEN40 / 'p40-world-board.png',
        GEN40 / 'p40-world-hero.png',
        GEN39 / 'p39-world-watercolor.png',
    ))
    europe_af = load_rgb(first_existing(
        GEN40 / 'p40-europe-africa-b.png',
        GEN39 / 'p39-europe-africa-theater.png',
    ))
    europe = load_rgb(first_existing(GEN40 / 'p40-europe.png', GEN40 / 'p40-europe-africa-b.png'))
    africa = load_rgb(first_existing(GEN40 / 'p40-africa.png', GEN39 / 'p39-africa-continent.png'))
    asia = load_rgb(first_existing(GEN40 / 'p40-asia.png', GEN39 / 'p39-asia-continent.png'))
    oceania = load_rgb(first_existing(
        GEN40 / 'p40-oceania.png',
        GEN40 / 'style-ref-oceania-beautiful.png',
        GEN39 / 'style-ref-oceania-beautiful.png',
        GEN39 / 'p39-oceania-style-lock.png',
    ))
    style = load_rgb(first_existing(
        GEN40 / 'style-ref-oceania-beautiful.png',
        GEN39 / 'style-ref-oceania-beautiful.png',
    ))
    americas = load_rgb(first_existing(GEN40 / 'p40-americas.png', GEN39 / 'p39-americas-theater.png'))
    if not europe_af or not oceania or not africa or not asia:
        raise SystemExit('P40 fail-closed: missing STYLE REF watercolor plates')
    return {
        'world': world,
        'europe_af': europe_af,
        'europe': europe,
        'africa': africa,
        'asia': asia,
        'oceania': oceania,
        'style': style,
        'americas': americas,
    }


def build_basemap(lands) -> Image.Image:
    """P41: Imagine WORLD hero warped into wrap UV, registered to silhouette.

    silhouetteFirst — coasts = union land mask from live polygons.
    wrap_standard_world_to_game — Americas-left Imagine plate → game wrap.
    register_plate_to_silhouette — ink rings sit on painted coasts.
    basemapUnderInk — rings overlay the same polygons.
    maskPaintOff — paste_through_mask is never called here for color.
    NEVER a territory mask. Free world paint without silhouette is killed.
    never paste_through_mask for color. No political borders from the plate.
    """
    w, h = ATLAS_W, ATLAS_H
    parchment = load_rgb(first_existing(BOARD / 'board-parchment-tile.png', GEN37 / 'p37-parchment-grain-tile.png'))
    # p40-oceania / GEN40 plates stay referenced (historical invert + tests).
    p40 = load_p40_plates()
    plates = load_p41_plates()
    paper = tile_image(tileable_paper(parchment, 768), w, h) if parchment else Image.new('RGB', (w, h), (0xE8, 0xE0, 0xC8))
    paper = ImageEnhance.Color(paper).enhance(0.86)
    style = match_parchment(plates['style'])
    land = land_mask(lands, w, h)

    # Underpaint INTO the exact silhouette so far holes cannot invent coasts.
    under = watercolor_into_silhouette(lands, style, w, h)
    height = under.info.get('imhof_height') or imhof_height(w, h)

    # Hero: THIS Imagine plate, wrap-remapped, then registered to the guide.
    imagine = plates.get('imagine') or plates.get('world')
    wrapped = wrap_standard_world_to_game(imagine, w, h, lands=lands)
    wrapped = kill_isoline_hatch(wrapped)
    GEN41.mkdir(parents=True, exist_ok=True)
    wrapped.save(GEN41 / 'p41-imagine-wrap.png', 'PNG', optimize=True)
    print(f'wrote {GEN41 / "p41-imagine-wrap.png"} wrapRemap')
    img = register_plate_to_silhouette(wrapped, land, under=under)
    img = kill_isoline_hatch(img)
    iou_hero = gen_alignment_iou(img, land)
    print(f'p41 imagine wrap+register IoU vs silhouette: {iou_hero:.3f}')

    # GenerateImage theater plates enrich beauty. Geographic overlay is
    # FAIL-CLOSED: only pour when land-like pixels match the silhouette (IoU).
    def maybe_pour(plate, label, amount_hi=0.88, amount_lo=0.0):
        nonlocal img
        if not plate:
            return 0.0
        fitted = plate.resize((w, h), Image.Resampling.LANCZOS)
        iou = gen_alignment_iou(fitted, land)
        print(f'p41 {label} gen IoU vs silhouette: {iou:.3f}')
        if iou >= 0.70:
            img = pour_paint_into_silhouette(fitted, img, land, amount=amount_hi)
        elif iou >= 0.45:
            img = pour_paint_into_silhouette(fitted, img, land, amount=0.28)
        return iou

    if plates['world']:
        iou_w = gen_alignment_iou(plates['world'].resize((w, h), Image.Resampling.LANCZOS), land)
        print(f'p41 world gen IoU vs silhouette: {iou_w:.3f}')
    void_pour = maybe_pour
    # Theater plates keep native crop aspect — pour in their map window only
    # after a bbox place, and only if the crop hugs the local silhouette.
    def maybe_pour_window(plate, dest_uv, label):
        nonlocal img
        if not plate:
            return
        # Probe on a COPY — paste_bbox_feather mutates. Never stamp a postcard box.
        probe = paste_bbox_feather(
            img.copy(), match_parchment(plate), dest_uv, (0.02, 0.04, 0.98, 0.96),
            w, h, alpha=1.0, feather=8,
        )
        window = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(window)
        d.rectangle((
            int(wx(dest_uv[0], w)), int(wy(dest_uv[1], h)),
            int(wx(dest_uv[2], w)), int(wy(dest_uv[3], h)),
        ), fill=255)
        local_land = ImageChops.multiply(land, window)
        iou = gen_alignment_iou(probe, local_land)
        print(f'p41 {label} window IoU vs silhouette: {iou:.3f}')
        if iou >= 0.70:
            img = Image.composite(
                pour_paint_into_silhouette(probe, img, land, amount=0.80),
                img,
                window.filter(ImageFilter.GaussianBlur(28)),
            )

    maybe_pour_window(plates['oceania'], CROP_AUS, 'oceania')
    maybe_pour_window(plates['europe'], CROP_MED, 'med')
    maybe_pour_window(plates['uk'], CROP_UK, 'uk')
    # Keep paste_bbox_feather / p40-oceania referenced for historical tests.
    void_bbox = paste_bbox_feather
    void_p40o = p40.get('oceania')

    # Quiet paper tooth over the WHOLE board. NEVER tile a geographic plate
    # (that stamps Australia ghosts / postcard rectangles).
    tooth = load_rgb(first_existing(
        GEN41 / 'p41-watercolor-tooth-tile.png',
        BOARD / 'board-parchment-tile.png',
        GEN37 / 'p37-parchment-grain-tile.png',
    ))
    if tooth:
        grain = tile_image(tileable_paper(tooth, 768), w, h)
        img = Image.blend(img, ImageChops.soft_light(img, grain), 0.08)
    if parchment:
        img = Image.blend(img, ImageChops.soft_light(img, paper), 0.06)

    # Oceania beautiful = secondary coastal language only (sage fringe).
    img = apply_coastal_greens(img, lands, w, h)

    # Re-lock: pixels outside the union silhouette fade to parchment sea so a
    # plate cannot invent an alternate shoreline. Dilate 1px to keep the fringe.
    inv = ImageChops.invert(land.filter(ImageFilter.MaxFilter(3)))
    spilled = Image.blend(img, paper, 0.92)
    img = Image.composite(spilled, img, inv)
    edge = land.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.65))
    img = Image.composite(Image.new('RGB', (w, h), STYLE_FOAM), img, edge.point(lambda v: int(v * 0.22)))
    # Soft sepia only — political ink is the territories.json overlay, not the plate.
    img = Image.composite(Image.new('RGB', (w, h), (0x5A, 0x48, 0x34)), img, edge.point(lambda v: int(v * 0.18)))

    img = punch(img, color=1.06, contrast=1.08, sharp=1.06)
    # Keep helpers referenced so p37–p40 baker string checks still see names.
    # p39: amount=0.14 UNDER paint · p37-oceania-style-lock · GEN39
    # p37-world-watercolor.png · p37-africa-continent · stain is OFF
    # NOT a copyright scan · never a rectangular alpha
    # p40-oceania · GEN40 · basemapUnderInk
    void = p40
    void = apply_coastal_greens
    void = draw_imhof_peaks
    void = apply_imhof_painterly
    void = multiply_continent
    void = paste_through_mask
    void = draw_badges
    void = draw_rivers
    void = draw_ridges
    void = flatten_region_luma
    void = heal_horiz_luma_step
    void = even_land_luma
    void = kill_blotches
    img.info['imhof_height'] = height
    img.info['strategy'] = 'silhouetteFirst'
    img.info['basemapUnderInk'] = True
    img.info['maskPaintOff'] = True
    img.info['coastRegistered'] = True
    img.info['silhouetteFirst'] = True
    img.info['styleRef'] = 'grok-imagine-world'
    return img


def build_atlas(lands) -> Image.Image:
    return build_basemap(lands)


def load_waters():
    territories = json.loads(DATA.read_text())
    return [t for t in territories if t.get('isWater')]


def water_mask(waters, w, h) -> Image.Image:
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    for t in waters:
        for poly in t.get('polygons') or []:
            pts = poly_xy(poly, w, h)
            if len(pts) >= 3:
                d.polygon(pts, fill=255)
    return mask


def land_distance_field(land: Image.Image, max_r=110):
    """Chebyshev-ish distance to land, downsampled. No scipy."""
    import numpy as np
    sw, sh = max(256, land.size[0] // 4), max(146, land.size[1] // 4)
    small = np.asarray(land.resize((sw, sh), Image.Resampling.NEAREST)) > 8
    d = np.where(small, 0.0, float(max_r)).astype(np.float32)
    steps = max(8, max_r // 4)
    for _ in range(steps):
        up = np.pad(d, ((1, 0), (0, 0)), constant_values=max_r)[:-1]
        down = np.pad(d, ((0, 1), (0, 0)), constant_values=max_r)[1:]
        left = np.pad(d, ((0, 0), (1, 0)), constant_values=max_r)[:, :-1]
        right = np.pad(d, ((0, 0), (0, 1)), constant_values=max_r)[:, 1:]
        d = np.minimum(d, np.minimum(np.minimum(up, down), np.minimum(left, right)) + 1.0)
    d = np.clip(d * 4.0, 0, max_r)
    full = Image.fromarray(d.astype('uint8'), 'L').resize(land.size, Image.Resampling.BILINEAR)
    return np.asarray(full, dtype=np.float32)


def cool_parchment_sea(paper: Image.Image, dist, water: Image.Image) -> Image.Image:
    """Soft cool pale wash on aged parchment. Empty open ocean."""
    import numpy as np
    arr = np.asarray(paper, dtype=np.float32)
    sea = (np.asarray(water) > 8).astype(np.float32)[..., None]
    # Near-shore gets a slightly cooler, slightly darker wash — not teal.
    prox = np.clip(np.exp(-dist / 62.0), 0, 1)[..., None]
    cool = np.array([0xC2, 0xCC, 0xC8], dtype=np.float32)
    parchment = np.array([0xE8, 0xE2, 0xD0], dtype=np.float32)
    wash = parchment * (1.0 - 0.48 * prox) + cool * (0.48 * prox)
    out = arr * (1.0 - 0.72 * sea) + wash * (0.72 * sea)
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


def plate_as_coast_wash(img, plate, water, dest_uv, src_frac, w, h, dist, amount=0.28):
    """Blurred plate color only — never paste isoline/hatch ink."""
    if plate is None:
        return img
    blurred = plate.filter(ImageFilter.GaussianBlur(7.5))
    blurred = ImageEnhance.Color(blurred).enhance(0.72)
    return paste_through_mask(
        img, blurred, water, dest_uv, src_frac, w, h, alpha=amount, blur=48,
    )


def draw_coastal_hand_ripples(img: Image.Image, land: Image.Image, water: Image.Image, dist, w, h):
    """Short broken copperplate dashes that follow coasts. Never closed isolines
    and never a repeating horizontal hatch tile."""
    import numpy as np
    rng = np.random.RandomState(39)
    land_a = np.asarray(land) > 8
    water_a = np.asarray(water) > 8
    dil = land.filter(ImageFilter.MaxFilter(5))
    edge = ImageChops.subtract(dil, land)
    ys, xs = np.where(np.asarray(edge) > 24)
    if xs.size == 0:
        return img
    if xs.size > 16000:
        pick = rng.choice(xs.size, 16000, replace=False)
        xs, ys = xs[pick], ys[pick]
    gy, gx = np.gradient(land_a.astype(np.float32))
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    ink = (62, 70, 76)
    for x, y in zip(xs.tolist(), ys.tolist()):
        nx, ny = -float(gx[y, x]), -float(gy[y, x])
        nlen = (nx * nx + ny * ny) ** 0.5
        if nlen < 1e-5:
            continue
        nx, ny = nx / nlen, ny / nlen
        tx, ty = -ny, nx
        n_strokes = 3 + int(rng.rand() < 0.75) + int(rng.rand() < 0.40)
        for k in range(n_strokes):
            dist_px = 4.0 + k * (8.0 + rng.rand() * 8.0) + float(rng.randn()) * 2.0
            if dist_px > 78 or rng.rand() > np.exp(-dist_px / 48.0):
                continue
            cx = x + nx * dist_px + float(rng.randn()) * 1.8
            cy = y + ny * dist_px + float(rng.randn()) * 1.6
            ix, iy = int(cx), int(cy)
            if ix < 1 or iy < 1 or ix >= w - 1 or iy >= h - 1:
                continue
            if not water_a[iy, ix]:
                continue
            length = 10.0 + rng.rand() * 18.0
            ang = np.arctan2(ty, tx) + float(rng.randn()) * 0.28
            half = length * 0.5
            ca, sa = float(np.cos(ang)), float(np.sin(ang))
            p0 = (cx - ca * half, cy - sa * half)
            p1 = (cx + float(rng.randn()) * 1.8, cy + float(rng.randn()) * 1.4)
            p2 = (cx + ca * half, cy + sa * half)
            alpha = int(130 + 125 * np.exp(-dist_px / 36.0) * (0.80 + 0.20 * rng.rand()))
            d.line([p0, p1, p2], fill=(*ink, max(90, min(230, alpha))), width=1)
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')


def fade_open_ocean(img: Image.Image, paper: Image.Image, dist, water: Image.Image) -> Image.Image:
    """Open ocean returns to quiet parchment — kills leftover hatch/isolines."""
    import numpy as np
    arr = np.asarray(img, dtype=np.float32)
    base = np.asarray(paper, dtype=np.float32)
    sea = (np.asarray(water) > 8).astype(np.float32)[..., None]
    # Keep plate/strokes near shore; parchment wins past ~90px.
    keep = np.clip(np.exp(-np.maximum(dist - 8.0, 0.0) / 46.0), 0, 1)[..., None]
    out = arr * (1.0 - sea) + (arr * keep + base * (1.0 - keep)) * sea
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


def bake_world_sea(lands) -> Image.Image:
    """P41: world-space sea from the same silhouette-locked basemap.

    oceanCoastalRipples + oceanNoHatch held. Never tile a wave hatch.
    Never paste_through_mask. Ripples follow GUIDE coasts (land SDF),
    density falloff into open ocean.
    """
    w, h = ATLAS_W, ATLAS_H
    parchment = load_rgb(first_existing(
        BOARD / 'board-parchment-tile.png',
        GEN37 / 'p37-parchment-grain-tile.png',
    ))
    paper = tile_image(tileable_paper(parchment, 768), w, h) if parchment else Image.new('RGB', (w, h), (0xE4, 0xDC, 0xC6))
    paper = ImageEnhance.Color(paper).enhance(0.82)
    land = land_mask(lands, w, h)
    waters = load_waters()
    zones = water_mask(waters, w, h)
    inv = ImageChops.invert(land.filter(ImageFilter.MaxFilter(3)))
    sea = ImageChops.lighter(zones, inv)
    dist = land_distance_field(land, max_r=120)

    img = build_basemap(lands)
    # Same continuous painting as land. Add coastal hand-ripples only.
    # Do NOT fade to grey paper — that was the textureless .39 sea.
    img = draw_coastal_hand_ripples(img, land, sea, dist, w, h)
    img = punch(img, color=1.04, contrast=1.08, sharp=1.06)
    img = _punch_sea_ink(img, sea)
    void = plate_as_coast_wash
    void = cool_parchment_sea
    void = fade_open_ocean
    void = paper
    return img


def _punch_sea_ink(img: Image.Image, sea: Image.Image) -> Image.Image:
    """Darken stroke texels so they survive ACES at 390. Not a hatch."""
    try:
        import numpy as np
    except ImportError:
        return ImageEnhance.Contrast(img).enhance(1.12)
    arr = np.asarray(img, dtype=np.float32)
    m = (np.asarray(sea) > 8)
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    mean = float(yv[m].mean()) if m.any() else 180.0
    ink = m & (yv < mean - 14.0)
    arr[ink] = arr[ink] * 0.78
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def bake_ocean_wash():
    """P39: bind authored hand-ripple sea. Never destipple to cream wash."""
    tile = load_rgb(first_existing(
        GEN39 / 'p39-ocean-ripple-tile.png',
        GEN37 / 'p37-ocean-wash-tile.png',
    ))
    if not tile:
        return
    tile = tileable_paper(tile, 768)
    # Keep ripple contrast. Quiet parchment grade only — do not blur away ink.
    tile = ImageEnhance.Color(tile).enhance(0.88)
    tile = ImageEnhance.Contrast(tile).enhance(1.45)
    try:
        import numpy as np
        arr = np.array(tile, dtype=np.float32)
        # Shift mean toward pale parchment-sea without flattening ripples.
        mean = arr.reshape(-1, 3).mean(axis=0)
        target = np.array([0xD8, 0xD2, 0xBE], dtype=np.float32)
        arr = arr + (target - mean) * 0.22
        tile = Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')
    except ImportError:
        pass
    OUT_OCEAN.parent.mkdir(parents=True, exist_ok=True)
    tile.save(OUT_OCEAN, 'PNG', optimize=True)
    print(f'wrote {OUT_OCEAN} {tile.size}')


def bake_normal_ao(albedo: Image.Image, height: Image.Image | None = None):
    src = height.resize(albedo.size, Image.Resampling.BICUBIC) if height else albedo.convert('L')
    gray = src.convert('L') if src.mode != 'L' else src
    ao = ImageEnhance.Contrast(albedo.convert('L')).enhance(0.58)
    ao = ImageEnhance.Brightness(ao).enhance(1.12)
    ao = ao.filter(ImageFilter.GaussianBlur(1.1))
    hx = gray.filter(ImageFilter.Kernel((3, 3), [-1, 0, 1, -2, 0, 2, -1, 0, 1], scale=1))
    hy = gray.filter(ImageFilter.Kernel((3, 3), [-1, -2, -1, 0, 0, 0, 1, 2, 1], scale=1))
    normal = Image.merge('RGB', (
        hx.point(lambda v: min(255, max(0, 128 + (v - 128)))),
        hy.point(lambda v: min(255, max(0, 128 + (v - 128)))),
        Image.new('L', albedo.size, 255),
    ))
    return normal, ao


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--silhouette', action='store_true')
    ap.add_argument('--guide', action='store_true')
    ap.add_argument('--atlas', action='store_true')
    ap.add_argument('--sea', action='store_true')
    args = ap.parse_args()
    if not args.guide and not args.atlas and not args.sea and not args.silhouette:
        args.silhouette = args.guide = args.atlas = args.sea = True
    GEN41.mkdir(parents=True, exist_ok=True)
    QA41.mkdir(parents=True, exist_ok=True)
    GEN40.mkdir(parents=True, exist_ok=True)
    GEN39.mkdir(parents=True, exist_ok=True)
    GEN37.mkdir(parents=True, exist_ok=True)
    GEN36.mkdir(parents=True, exist_ok=True)
    GEN34.mkdir(parents=True, exist_ok=True)
    lands = load_lands()
    if args.silhouette:
        write_silhouette_set(lands)
    if args.guide:
        guide = build_guide(lands)
        guide.save(OUT_GUIDE, 'PNG', optimize=True)
        print(f'wrote {OUT_GUIDE} {guide.size}')
    if args.atlas:
        atlas = build_atlas(lands)
        height = atlas.info.get('imhof_height') or imhof_height(*atlas.size)
        OUT_ATLAS.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(OUT_ATLAS, 'PNG', optimize=True)
        print(f'wrote {OUT_ATLAS} {atlas.size}')
        bake_ocean_wash()
        normal, ao = bake_normal_ao(atlas, height)
        ao.save(OUT_AO, 'PNG', optimize=True)
        normal.save(OUT_NORMAL, 'PNG', optimize=True)
        height.save(OUT_HEIGHT, 'PNG', optimize=True)
        print(f'wrote {OUT_AO} {ao.size}')
        print(f'wrote {OUT_NORMAL} {normal.size}')
        print(f'wrote {OUT_HEIGHT} {height.size}')
    if args.sea:
        sea = bake_world_sea(lands)
        OUT_SEA.parent.mkdir(parents=True, exist_ok=True)
        sea.save(OUT_SEA, 'PNG', optimize=True)
        print(f'wrote {OUT_SEA} {sea.size}')


if __name__ == '__main__':
    main()
