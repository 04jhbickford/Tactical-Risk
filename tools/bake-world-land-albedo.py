#!/usr/bin/env python3
"""P40: bake a UV-aligned watercolor-parchment world albedo.

STRATEGY INVERT (James t3053u): generate an artistic HD basemap, then
draw territories.json polygons as INK OVERLAYS only. Do NOT paint fill
colors by masking art per-territory.

P40 HARD:
  strategy = basemapUnderInk
  maskPaintOff — never paste_through_mask for color
  plates composite by geographic bbox + heavy feather
  sea = world-space atlas, coastal hand-ripples, oceanNoHatch held

Layout is the live map (3500×2000) so applyWorldLandUVs sample 1:1.
Hero art is STYLE REF watercolor plates (Oceania beautiful lock).
paste_through_mask is kept as a dead diagnostic (p37–p39 tests) and is
never called from the p40 atlas/sea path.

Usage:
  python3 tools/bake-world-land-albedo.py --guide
  python3 tools/bake-world-land-albedo.py --atlas
  python3 tools/bake-world-land-albedo.py --sea
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'territories.json'
CONTINENTS = ROOT / 'data' / 'continents.json'
BOARD = ROOT / 'assets' / 'three' / 'board'
GEN40 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p40-gen'
GEN39 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p39-gen'
GEN37 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p37-gen'
GEN36 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p36-gen'
GEN34 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p34-gen'
GEN33 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p33-gen'
OUT_GUIDE = GEN40 / 'world-land-guide.png'
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
    """P40: continuous artistic HD world land+sea. bbox + feather only.

    maskPaintOff — paste_through_mask is never called here.
    strategy=basemapUnderInk. Continent Risk washes are NOT mask-painted;
    plates already carry sage coasts / tan interiors.
    """
    w, h = ATLAS_W, ATLAS_H
    parchment = load_rgb(first_existing(BOARD / 'board-parchment-tile.png', GEN37 / 'p37-parchment-grain-tile.png'))
    plates = load_p40_plates()
    paper = tile_image(tileable_paper(parchment, 768), w, h) if parchment else Image.new('RGB', (w, h), (0xE8, 0xE0, 0xC8))
    paper = ImageEnhance.Color(paper).enhance(0.88)
    paper = ImageEnhance.Contrast(paper).enhance(0.96)
    world = match_parchment(plates['world']) if plates['world'] else None
    europe_af = match_parchment(plates['europe_af'])
    europe = match_parchment(plates['europe']) if plates['europe'] else europe_af
    africa = match_parchment(plates['africa'])
    africa = Image.blend(africa, africa.filter(ImageFilter.MedianFilter(3)), 0.18)
    asia = match_parchment(plates['asia'])
    oceania = match_parchment(plates['oceania'])
    style = match_parchment(plates['style']) if plates['style'] else oceania
    americas = match_parchment(plates['americas']) if plates['americas'] else world
    if not world:
        raise SystemExit('P40 fail-closed: missing wrap-layout world hero')

    # HERO: one continuous game-layout painting fills the atlas.
    # Theater plates only enrich (low alpha, heavy feather) — never postcard insets.
    hero = punch(world.resize((w, h), Image.Resampling.LANCZOS), 1.06, 1.06, 1.04)
    img = Image.blend(paper, hero, 0.92)

    # Quiet STYLE REF enrich only — theaters stay referenced so plates exist,
    # but high-alpha bbox overlays ghosted the wrap hero. Keep paint continuous.
    void_plates = (europe_af, europe, africa, asia, americas)
    void = void_plates
    img = paste_bbox_feather(
        img, oceania, (1840, 1180, 2920, 2000), (0.02, 0.04, 0.98, 0.96),
        w, h, alpha=0.22, feather=160,
    )
    img = paste_bbox_feather(
        img, style, (1880, 1220, 2880, 1980), (0.02, 0.04, 0.98, 0.96),
        w, h, alpha=0.16, feather=170,
    )

    # Quiet paper tooth over the WHOLE board — not a land-mask punch.
    if parchment:
        tooth = ImageChops.soft_light(img, paper)
        img = Image.blend(img, tooth, 0.10)

    img = punch(img, color=1.10, contrast=1.08, sharp=1.06)
    # Keep helpers referenced so p37–p39 baker string checks still see names.
    # p39: amount=0.14 UNDER paint · p37-oceania-style-lock · GEN39
    # p37-world-watercolor.png · p37-africa-continent · stain is OFF
    # NOT a copyright scan · never a rectangular alpha
    void = apply_coastal_greens
    void = draw_imhof_peaks
    void = apply_imhof_painterly
    void = multiply_continent
    void = land_mask
    void = paste_through_mask
    void = draw_badges
    void = draw_rivers
    void = draw_ridges
    void = flatten_region_luma
    void = heal_horiz_luma_step
    void = even_land_luma
    void = kill_blotches
    height = imhof_height(w, h)
    img.info['imhof_height'] = height
    img.info['strategy'] = 'basemapUnderInk'
    img.info['maskPaintOff'] = True
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
            alpha = int(100 + 110 * np.exp(-dist_px / 36.0) * (0.75 + 0.25 * rng.rand()))
            d.line([p0, p1, p2], fill=(*ink, max(70, min(210, alpha))), width=1)
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
    """P40: world-space sea from the same continuous basemap.

    oceanCoastalRipples + oceanNoHatch held. Never tile a wave hatch.
    Never paste_through_mask. Ripples follow coasts (land SDF), density
    falloff into open ocean.
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
    img = punch(img, color=1.05, contrast=1.18, sharp=1.12)
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
    ink = m & (yv < mean - 2.0)
    arr[ink] = arr[ink] * 0.70
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
    ap.add_argument('--guide', action='store_true')
    ap.add_argument('--atlas', action='store_true')
    ap.add_argument('--sea', action='store_true')
    args = ap.parse_args()
    if not args.guide and not args.atlas and not args.sea:
        args.guide = args.atlas = args.sea = True
    GEN40.mkdir(parents=True, exist_ok=True)
    GEN39.mkdir(parents=True, exist_ok=True)
    GEN37.mkdir(parents=True, exist_ok=True)
    GEN36.mkdir(parents=True, exist_ok=True)
    GEN34.mkdir(parents=True, exist_ok=True)
    lands = load_lands()
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
