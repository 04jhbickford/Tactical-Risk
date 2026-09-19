#!/usr/bin/env python3
"""P37: bake a UV-aligned watercolor-parchment world land albedo.

Layout is the live map (3500×2000) so applyWorldLandUVs sample 1:1.
Hero art is STYLE REF watercolor plates (Oceania parchment lock),
composited through live territory masks with feathered joins.
NO rectangular paste boxes. Soft-light stain is OFF.
NOT a copyright scan. NOT a runtime fillStain wash.

Usage:
  python3 tools/bake-world-land-albedo.py --guide
  python3 tools/bake-world-land-albedo.py --atlas
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
GEN37 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p37-gen'
GEN36 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p36-gen'
GEN34 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p34-gen'
GEN33 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p33-gen'
OUT_GUIDE = GEN37 / 'world-land-guide.png'
OUT_ATLAS = BOARD / 'world-land-albedo.png'
OUT_NORMAL = BOARD / 'world-land-normal.png'
OUT_AO = BOARD / 'world-land-ao.png'
OUT_HEIGHT = GEN37 / 'world-land-height.png'
OUT_OCEAN = BOARD / 'board-ocean-tile.png'

MAP_W, MAP_H = 3500, 2000
ATLAS_W = 4096
ATLAS_H = 2340

# Printed A&A / Risk chroma (AA-PALETTE) — the albedo carries this, not an 8% wash.
CONT_HEX = {
    'Europe': (0x6B, 0x7A, 0x4A),
    'Asia': (0x8A, 0x73, 0x55),
    'Africa': (0xB0, 0x89, 0x48),
    'Middle East': (0xA0, 0x90, 0x58),
    'North America': (0x6A, 0x8B, 0x6E),
    'South America': (0x5A, 0x8A, 0x72),
    'Oceania': (0x7A, 0x6B, 0x8A),
}
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
    return Image.fromarray(np.clip(parr + (dst_mean - src_mean) * 0.40, 0, 255).astype('uint8'), 'RGB')


def paste_through_mask(img, plate, mask, dest_uv, src_frac, w, h, alpha=0.78, blur=56):
    """Place a plate into game UV. Alpha is the live land/continent mask only.

    dest_uv is positioning. It is never a rectangular alpha — that was the
    Australia / Africa plate-seam fail in .33–.36.
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
    fitted = crop.resize((rx1 - rx0, ry1 - ry0), Image.Resampling.LANCZOS)
    box_mask = Image.new('L', (w, h), 0)
    box_mask.paste(Image.new('L', (rx1 - rx0, ry1 - ry0), 255), (rx0, ry0))
    local = ImageChops.multiply(mask, box_mask)
    fitted = match_to_region(fitted, img.crop((rx0, ry0, rx1, ry1)), local.crop((rx0, ry0, rx1, ry1)))
    layer = img.copy()
    layer.paste(fitted, (rx0, ry0))
    feather = local.filter(ImageFilter.GaussianBlur(blur))
    mixed = Image.blend(img, layer, alpha)
    return Image.composite(mixed, img, feather)


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


def build_atlas(lands) -> Image.Image:
    w, h = ATLAS_W, ATLAS_H
    parchment = load_rgb(first_existing(BOARD / 'board-parchment-tile.png', GEN37 / 'p37-parchment-grain-tile.png'))
    world = load_rgb(first_existing(GEN37 / 'p37-world-watercolor.png'))
    europe = load_rgb(first_existing(GEN37 / 'p37-europe-africa-theater.png'))
    asia = load_rgb(first_existing(GEN37 / 'p37-asia-continent.png', GEN37 / 'p37-world-watercolor.png'))
    oceania = load_rgb(first_existing(GEN37 / 'p37-oceania-style-lock.png'))
    if not world or not europe or not oceania:
        raise SystemExit('P37 fail-closed: missing STYLE REF watercolor plates')

    paper = tile_image(tileable_paper(parchment, 768), w, h) if parchment else Image.new('RGB', (w, h), PARCHMENT)
    paper = ImageEnhance.Color(paper).enhance(0.94)
    img = paper.copy()
    mask_all = land_mask(lands, w, h)

    # P37 HARD: no Risk-candy continent underpaint. STYLE REF is one wash family.
    img = Image.composite(paper, img, mask_all)

    world = match_parchment(world)
    europe = match_parchment(europe)
    asia = match_parchment(asia) if asia else world
    oceania = match_parchment(oceania)

    # Unifying watercolor base through ALL live land — never a rectangular box.
    img = paste_through_mask(
        img, world, mask_all,
        (80, 40, 3420, 1960), (0.02, 0.04, 0.98, 0.94),
        w, h, alpha=0.70, blur=36,
    )

    # Theater detail through continent masks only (feathered). Australia last.
    em = land_mask(lands, w, h, continents={'Europe', 'Africa', 'Middle East'})
    img = paste_through_mask(
        img, europe, em,
        (560, 40, 1860, 1680), (0.02, 0.02, 0.98, 0.98),
        w, h, alpha=0.88, blur=52,
    )
    am = land_mask(lands, w, h, continents={'Asia'})
    img = paste_through_mask(
        img, asia, am,
        (1280, 20, 2680, 1320), (0.02, 0.02, 0.98, 0.98),
        w, h, alpha=0.80, blur=72,
    )
    # Australia from STYLE REF — tight land crop, never a sea-filled Oceania box.
    aus = land_mask(lands, w, h, names={'Australia'})
    img = paste_through_mask(
        img, oceania, aus,
        (2094, 1460, 2619, 1933), (0.24, 0.30, 0.74, 0.76),
        w, h, alpha=0.96, blur=28,
    )
    nz = land_mask(lands, w, h, names={'New Zealand'})
    img = paste_through_mask(
        img, oceania, nz,
        (2676, 1659, 2861, 1932), (0.80, 0.42, 0.96, 0.78),
        w, h, alpha=0.92, blur=18,
    )
    ng = land_mask(lands, w, h, names={'New Guinea', 'East Indies', 'Borneo Celebes'})
    img = paste_through_mask(
        img, oceania, ng,
        (1972, 1217, 2629, 1454), (0.08, 0.02, 0.70, 0.30),
        w, h, alpha=0.90, blur=22,
    )
    nam = land_mask(lands, w, h, continents={'North America'})
    img = paste_through_mask(
        img, world, nam,
        (2760, 40, 3500, 1120), (0.02, 0.06, 0.30, 0.50),
        w, h, alpha=0.84, blur=48,
    )
    sam = land_mask(lands, w, h, continents={'South America'})
    img = paste_through_mask(
        img, world, sam,
        (40, 1040, 560, 1900), (0.10, 0.46, 0.32, 0.94),
        w, h, alpha=0.84, blur=48,
    )

    # Quiet continent hint only — STYLE REF family, not hard tiles.
    for key, rgb in CONT_HEX.items():
        cm = land_mask(lands, w, h, continents={key})
        img = grade_chroma(img, cm, rgb, amount=0.06)

    height = imhof_height(w, h)
    # STYLE REF uses peak hatching, not Imhof volume blobs.
    img = draw_coast(img, mask_all, w, h)
    img = even_land_luma(img, mask_all, LAND_LUMA_TARGET, 0.14)
    img = kill_blotches(img, mask_all, 72)
    img = draw_ridges(img, None, mask_all, w, h)

    if parchment:
        tooth = ImageChops.soft_light(img, paper)
        img = Image.composite(tooth, img, mask_all.point(lambda v: 28))

    img = punch(img, color=1.18, contrast=1.12, sharp=1.10)
    img = Image.composite(img, paper, mask_all)
    void = draw_badges
    void = draw_rivers
    void = draw_ridges
    void = height
    img.info['imhof_height'] = height
    return img


def bake_ocean_wash():
    tile = load_rgb(GEN37 / 'p37-ocean-wash-tile.png')
    if not tile:
        return
    tile = tile.resize((768, 768), Image.Resampling.LANCZOS)
    tile = ImageEnhance.Color(tile).enhance(0.78)
    tile = ImageEnhance.Contrast(tile).enhance(0.92)
    try:
        import numpy as np
        arr = np.array(tile, dtype=np.float32)
        lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
        lum = np.clip((lum - 0.08) / 0.70, 0.42, 1.20)
        target = np.array([0xC8, 0xC4, 0xB4], dtype=np.float32)
        tile = Image.fromarray(np.clip(arr * 0.52 + (target * lum[..., None]) * 0.48, 0, 255).astype('uint8'), 'RGB')
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
    args = ap.parse_args()
    if not args.guide and not args.atlas:
        args.guide = args.atlas = True
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


if __name__ == '__main__':
    main()
