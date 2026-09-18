#!/usr/bin/env python3
"""P34: bake a UV-aligned painted world land albedo.

Layout is the live map (3500×2000) so applyWorldLandUVs sample 1:1.
Hero art is image-gen printed-board plates (parchment / continent chroma /
painted mountains / forest masses / coast tooth), composited through
territory polygon masks. Soft-light stain is OFF.
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
GEN34 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p34-gen'
GEN33 = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p33-gen'
OUT_GUIDE = GEN34 / 'world-land-guide.png'
OUT_ATLAS = BOARD / 'world-land-albedo.png'
OUT_NORMAL = BOARD / 'world-land-normal.png'
OUT_AO = BOARD / 'world-land-ao.png'

MAP_W, MAP_H = 3500, 2000
ATLAS_W = 4096
ATLAS_H = 2340

# Printed A&A / Risk chroma (AA-PALETTE) — the albedo carries this, not an 8% wash.
CONT_HEX = {
    'Europe': (0x6B, 0x7A, 0x4A),
    'Asia': (0x5F, 0x7A, 0x5A),
    'Africa': (0xB0, 0x89, 0x48),
    'Middle East': (0xA0, 0x90, 0x58),
    'North America': (0x6A, 0x8B, 0x6E),
    'South America': (0x5A, 0x8A, 0x72),
    'Oceania': (0x7A, 0x6B, 0x8A),
}
BIOME_OF = {
    'Finland Norway': 'snow', 'Sweden': 'snow', 'Evenki National Okrug': 'snow',
    'Alaska': 'snow', 'West Canada': 'snow', 'Soviet Far East': 'snow',
    'Karelia S.S.R.': 'forest', 'East Canada': 'forest', 'Brazil': 'forest',
    'Congo': 'forest', 'French Equatorial Africa': 'forest',
    'French Indo China': 'forest', 'New Guinea': 'forest', 'East Indies': 'forest',
    'Borneo Celebes': 'forest',
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
PARCHMENT = (0xC4, 0xB8, 0x96)
OCEAN = (0x3D, 0x5A, 0x66)


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


def kill_blotches(img: Image.Image, land: Image.Image, luma_floor=118) -> Image.Image:
    """Lift crushed darks and clamp stray chroma so gen stamps cannot read as blotches."""
    try:
        import numpy as np
    except ImportError:
        return img
    arr = np.asarray(img, dtype=np.float32)
    mask = np.asarray(land) > 8
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    lift = np.clip((luma_floor - yv) / max(1.0, luma_floor), 0, 1) * 0.72
    lift = np.where(mask, lift, 0.0)
    parchment = np.array(PARCHMENT, dtype=np.float32)
    arr = arr + (parchment - arr) * lift[..., None]
    yv = arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722
    chroma = arr.max(axis=2) - arr.min(axis=2)
    sat = (chroma > 78) & (yv > 40) & mask
    arr[sat] = arr[sat] * 0.72 + yv[sat, None] * 0.28
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGB')


def first_existing(*paths: Path) -> Path | None:
    for p in paths:
        if p and p.exists():
            return p
    return None


def paste_theater(img: Image.Image, plate: Image.Image, mask: Image.Image, x0, y0, x1, y1, w, h, alpha=0.38):
    rx0, ry0 = int(wx(x0, w)), int(wy(y0, h))
    rx1, ry1 = int(wx(x1, w)), int(wy(y1, h))
    box = (rx0, ry0, rx1, ry1)
    fitted = punch(plate.resize((rx1 - rx0, ry1 - ry0), Image.Resampling.LANCZOS), 1.04, 1.04, 1.02)
    region = img.crop(box)
    mixed = Image.blend(region, fitted, alpha)
    local = ImageChops.multiply(mask.crop(box), feather_box(w, h, rx0, ry0, rx1, ry1, 70).crop(box))
    img.paste(Image.composite(mixed, region, local), box)
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
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.8))
    foam = Image.new('RGB', (w, h), (0xD9, 0xD2, 0xC0))
    ink = Image.new('RGB', (w, h), (0x3A, 0x34, 0x28))
    img = Image.composite(ink, img, edge.point(lambda v: int(v * 0.42)))
    img = Image.composite(foam, img, edge.point(lambda v: int(v * 0.62)))
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
    parchment = load_rgb(BOARD / 'board-parchment-tile.png')
    mountain = load_rgb(first_existing(GEN34 / 'p34-plate-mountain.png', GEN33 / 'plate-mountain.png', BOARD / 'terrain-mountain.png'))
    forest = load_rgb(first_existing(GEN34 / 'p34-plate-forest.png', GEN33 / 'plate-forest.png', BOARD / 'terrain-forest.png'))
    arid = load_rgb(first_existing(GEN34 / 'p34-plate-arid.png', GEN33 / 'plate-arid.png', BOARD / 'terrain-arid.png'))
    snow = load_rgb(first_existing(GEN34 / 'p34-plate-snow.png', GEN33 / 'plate-snow.png', BOARD / 'terrain-snow.png'))
    world = load_rgb(first_existing(GEN34 / 'p34-world-painted.png', GEN33 / 'world-painted.png'))
    europe = load_rgb(first_existing(GEN34 / 'p34-europe-theater.png', GEN33 / 'europe-theater.png'))
    asia = load_rgb(first_existing(GEN34 / 'p34-asia-theater.png', GEN33 / 'asia-theater.png'))
    if not europe or not asia:
        raise SystemExit('P34 fail-closed: missing printed theater plates')

    paper = tile_image(parchment.resize((768, 768), Image.Resampling.LANCZOS), w, h) if parchment else Image.new('RGB', (w, h), PARCHMENT)
    paper = ImageEnhance.Contrast(paper).enhance(1.08)
    img = paper.copy()
    mask_all = land_mask(lands, w, h)

    # P35: continent wash is the readable identity. Theater plates add paint,
    # not overwrite. Soft-light stain stack stays OFF (no fillStain hero).
    for key, rgb in CONT_HEX.items():
        cm = land_mask(lands, w, h, continents={key})
        img = Image.composite(print_continent(paper, cm, rgb, strength=0.58), img, cm)

    # Painted plates stay bound — lower alpha + feathered joins kill blotch/seams.
    # Historical p34 used alpha=0.90 / 0.86 (theater-join seams).
    em = land_mask(lands, w, h, continents={'Europe', 'Africa', 'Middle East'})
    img = paste_theater(img, europe, em, 620, 80, 1680, 1580, w, h, alpha=0.36)
    am = land_mask(lands, w, h, continents={'Asia', 'Oceania'})
    img = paste_theater(img, asia, am, 1400, 140, 2750, 1650, w, h, alpha=0.34)

    if world:
        img = paste_geo_crop(
            img, world, land_mask(lands, w, h, continents={'North America'}),
            (0.04, 0.04, 0.32, 0.48), (2780, 60, 3500, 1020), w, h, alpha=0.32,
        )
        img = paste_geo_crop(
            img, world, land_mask(lands, w, h, continents={'South America'}),
            (0.10, 0.42, 0.30, 0.96), (70, 1080, 500, 1860), w, h, alpha=0.32,
        )

    # Re-seat continent identity after plates so Europe/Africa/Asia split at 390.
    for key, rgb in CONT_HEX.items():
        cm = land_mask(lands, w, h, continents={key})
        img = Image.composite(print_continent(img, cm, rgb, strength=0.28), img, cm)

    # Quiet biome tooth only — never multiply-crush to black blotches.
    if forest:
        fm = land_mask(lands, w, h, biomes={'forest', 'lush'})
        tiled = tile_image(forest.resize((720, 720), Image.Resampling.LANCZOS), w, h)
        img = Image.composite(Image.blend(img, tiled, 0.10), img, fm)
    if arid:
        dm = land_mask(lands, w, h, biomes={'arid'})
        tiled = tile_image(arid.resize((720, 720), Image.Resampling.LANCZOS), w, h)
        img = Image.composite(Image.blend(img, tiled, 0.12), img, dm)
    if snow:
        sm = land_mask(lands, w, h, biomes={'snow'})
        tiled = tile_image(snow.resize((720, 720), Image.Resampling.LANCZOS), w, h)
        img = Image.composite(Image.blend(img, tiled, 0.16), img, sm)
    if mountain:
        mm = land_mask(lands, w, h, biomes={'mountain', 'hills'})
        tiled = tile_image(mountain.resize((640, 640), Image.Resampling.LANCZOS), w, h)
        img = Image.composite(Image.blend(img, tiled, 0.10), img, mm)

    img = draw_ridges(img, mountain, mask_all, w, h)
    img = draw_coast(img, mask_all, w, h)
    img = kill_blotches(img, mask_all, 118)

    if parchment:
        img = Image.composite(ImageChops.soft_light(img, paper), img, mask_all.point(lambda v: 14))

    img = punch(img, color=1.06, contrast=1.08, sharp=1.03)
    img = Image.composite(img, paper, mask_all)
    # P35 HARD: no IPC / +N baked into the land atlas. 3D continent chips stay.
    void = draw_badges
    void = draw_rivers
    return img


def bake_normal_ao(albedo: Image.Image):
    gray = albedo.convert('L')
    ao = ImageEnhance.Contrast(gray).enhance(0.55)
    ao = ImageEnhance.Brightness(ao).enhance(1.15)
    ao = ao.filter(ImageFilter.GaussianBlur(1.2))
    hx = gray.filter(ImageFilter.Kernel((3, 3), [-1, 0, 1, -2, 0, 2, -1, 0, 1], scale=1))
    hy = gray.filter(ImageFilter.Kernel((3, 3), [-1, -2, -1, 0, 0, 0, 1, 2, 1], scale=1))
    normal = Image.merge('RGB', (
        hx.point(lambda v: min(255, 128 + (v - 128))),
        hy.point(lambda v: min(255, 128 + (v - 128))),
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
    GEN34.mkdir(parents=True, exist_ok=True)
    lands = load_lands()
    if args.guide:
        guide = build_guide(lands)
        guide.save(OUT_GUIDE, 'PNG', optimize=True)
        print(f'wrote {OUT_GUIDE} {guide.size}')
    if args.atlas:
        atlas = build_atlas(lands)
        OUT_ATLAS.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(OUT_ATLAS, 'PNG', optimize=True)
        print(f'wrote {OUT_ATLAS} {atlas.size}')
        _normal, ao = bake_normal_ao(atlas.resize((2048, 1170), Image.Resampling.LANCZOS))
        ao = ao.resize((ATLAS_W, ATLAS_H), Image.Resampling.BILINEAR)
        ao.save(OUT_AO, 'PNG', optimize=True)
        print(f'wrote {OUT_AO} {ao.size}')
        if OUT_NORMAL.exists():
            OUT_NORMAL.unlink()


if __name__ == '__main__':
    main()
