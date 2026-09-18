#!/usr/bin/env python3
"""P33: bake a UV-aligned painted world land albedo.

Layout is the live map (3500×2000) so applyWorldLandUVs sample 1:1.
Hero art is image-gen plates (parchment / continent chroma / mountains /
forests / coasts), composited through territory polygon masks.
NOT a copyright scan. NOT a runtime fillStain wash.

Usage:
  python3 tools/bake-world-land-albedo.py --guide
  python3 tools/bake-world-land-albedo.py --atlas
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'territories.json'
CONTINENTS = ROOT / 'data' / 'continents.json'
BOARD = ROOT / 'assets' / 'three' / 'board'
GEN = ROOT / 'briefs' / '2026-09-17-three-art-gap' / 'refs' / 'p33-gen'
OUT_GUIDE = GEN / 'world-land-guide.png'
OUT_ATLAS = BOARD / 'world-land-albedo.png'
OUT_NORMAL = BOARD / 'world-land-normal.png'
OUT_AO = BOARD / 'world-land-ao.png'

MAP_W, MAP_H = 3500, 2000
# 4096+ wide, same aspect as map so existing UVs stay honest.
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


def multiply_rgb(base: Image.Image, overlay: Image.Image, mask: Image.Image, strength=1.0):
    b = base.copy()
    o = overlay.resize(base.size, Image.Resampling.LANCZOS)
    m = mask.resize(base.size, Image.Resampling.NEAREST)
    if strength < 1:
        m = m.point(lambda v: int(v * strength))
    blended = Image.blend(b, ImageChops_multiply(b, o), 1.0)
    return Image.composite(blended, b, m)


def ImageChops_multiply(a: Image.Image, b: Image.Image) -> Image.Image:
    from PIL import ImageChops
    return ImageChops.multiply(a, b)


def overlay_rgb(base: Image.Image, overlay: Image.Image, mask: Image.Image, alpha=0.55):
    o = overlay.resize(base.size, Image.Resampling.LANCZOS)
    m = mask.point(lambda v: int(v * alpha))
    return Image.composite(o, base, m)


def stain_hex(img: Image.Image, mask: Image.Image, rgb, alpha=0.42):
    wash = Image.new('RGB', img.size, rgb)
    m = mask.point(lambda v: int(v * alpha))
    return Image.composite(wash, img, m)


def draw_ridges(img: Image.Image, mountain: Image.Image | None, w, h):
    from PIL import ImageChops
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for ridge in RIDGES:
        pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
        d.line(pts, fill=(110, 96, 72, 210), width=max(18, w // 140), joint='curve')
        d.line(pts, fill=(176, 160, 124, 160), width=max(8, w // 260), joint='curve')
        for x, y in pts:
            d.ellipse((x - 28, y - 18, x + 28, y + 18), fill=(120, 104, 78, 90))
    if mountain:
        mt = tile_image(mountain.resize((512, 512), Image.Resampling.LANCZOS), w, h).convert('RGBA')
        mt.putalpha(Image.new('L', (w, h), 150))
        ridge_mask = layer.split()[-1].filter(ImageFilter.GaussianBlur(10))
        mt.putalpha(ridge_mask)
        img.paste(ImageChops.multiply(img, mt.convert('RGB')), (0, 0), ridge_mask)
    highlight = layer.filter(ImageFilter.GaussianBlur(2))
    img.paste(highlight.convert('RGB'), (0, 0), highlight.split()[-1])
    return img


def draw_rivers(img: Image.Image, w, h):
    d = ImageDraw.Draw(img, 'RGBA')
    for river in RIVERS:
        pts = [(wx(x, w), wy(y, h)) for x, y in river]
        d.line([(p[0] + 1.2, p[1] + 1.6) for p in pts], fill=(36, 40, 32, 70), width=max(3, w // 700))
        d.line(pts, fill=(52, 64, 60, 120), width=max(2, w // 900))
        d.line(pts, fill=(120, 128, 116, 70), width=1)
    return img


def draw_coast(img: Image.Image, mask: Image.Image, w, h):
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.2))
    foam = Image.new('RGB', (w, h), (0xD9, 0xD2, 0xC0))
    shelf = Image.new('RGB', (w, h), (0x6A, 0x84, 0x88))
    img = Image.composite(shelf, img, edge.point(lambda v: int(v * 0.35)))
    img = Image.composite(foam, img, edge.point(lambda v: int(v * 0.55)))
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
        text = f"+{badge['bonus']}"
        d.text((px, py), text, fill=(42, 36, 24), font=font, anchor='mm')
    return img


def first_existing(*paths: Path) -> Path | None:
    for p in paths:
        if p and p.exists():
            return p
    return None


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
    # ridge hints for the painter — not labels
    for ridge in RIDGES:
        pts = [(wx(x, w), wy(y, h)) for x, y in ridge]
        d.line(pts, fill=(96, 80, 56), width=6)
    return img


def paste_theater(img: Image.Image, plate: Image.Image, mask: Image.Image, x0, y0, x1, y1, w, h, alpha=0.55):
    # Theater plates are crops of map space — paste into the matching UV rect.
    rx0, ry0 = int(wx(x0, w)), int(wy(y0, h))
    rx1, ry1 = int(wx(x1, w)), int(wy(y1, h))
    box = (rx0, ry0, rx1, ry1)
    fitted = plate.resize((rx1 - rx0, ry1 - ry0), Image.Resampling.LANCZOS)
    region = img.crop(box)
    mixed = Image.blend(region, fitted, alpha)
    local = mask.crop(box)
    img.paste(Image.composite(mixed, region, local), box)
    return img


def build_atlas(lands) -> Image.Image:
    from PIL import ImageChops
    w, h = ATLAS_W, ATLAS_H
    parchment = load_rgb(BOARD / 'board-parchment-tile.png')
    mountain = load_rgb(first_existing(GEN / 'plate-mountain.png', BOARD / 'terrain-mountain.png'))
    forest = load_rgb(first_existing(GEN / 'plate-forest.png', BOARD / 'terrain-forest.png'))
    arid = load_rgb(first_existing(GEN / 'plate-arid.png', BOARD / 'terrain-arid.png'))
    snow = load_rgb(first_existing(GEN / 'plate-snow.png', BOARD / 'terrain-snow.png'))
    world = load_rgb(first_existing(GEN / 'world-painted.png', GEN / 'world-painted-16x9.png'))
    europe = load_rgb(GEN / 'europe-theater.png')
    asia = load_rgb(GEN / 'asia-theater.png')

    paper = tile_image(parchment.resize((768, 768), Image.Resampling.LANCZOS), w, h) if parchment else Image.new('RGB', (w, h), PARCHMENT)
    paper = ImageEnhance.Contrast(paper).enhance(1.08)
    img = paper.copy()

    # Painted world (image-gen) is the hero — clipped to live land polygons.
    mask_all = land_mask(lands, w, h)
    if not world:
        raise SystemExit('P33 fail-closed: missing image-gen world-painted.png')
    fitted = world.resize((w, h), Image.Resampling.LANCZOS)
    fitted = ImageEnhance.Color(fitted).enhance(0.94)
    fitted = ImageEnhance.Contrast(fitted).enhance(1.08)
    img = Image.composite(fitted, img, mask_all)
    img = Image.composite(ImageChops.soft_light(img, paper), img, mask_all.point(lambda v: 64))

    # Regional theater paintings — UV-aligned crops, not full-bleed stretch.
    if europe:
        em = land_mask(lands, w, h, continents={'Europe', 'Africa', 'Middle East'})
        img = paste_theater(img, europe, em, 620, 80, 1680, 1580, w, h, alpha=0.52)
    if asia:
        am = land_mask(lands, w, h, continents={'Asia', 'Oceania'})
        img = paste_theater(img, asia, am, 1500, 200, 2700, 1100, w, h, alpha=0.42)

    # Quiet printed chroma so Risk groups still split — painting stays hero.
    for key, rgb in CONT_HEX.items():
        cm = land_mask(lands, w, h, continents={key})
        img = stain_hex(img, cm, rgb, alpha=0.14)

    if forest:
        fm = land_mask(lands, w, h, biomes={'forest'})
        tiled = tile_image(forest.resize((720, 720), Image.Resampling.LANCZOS), w, h)
        img = multiply_rgb(img, tiled, fm, strength=0.38)
    if arid:
        dm = land_mask(lands, w, h, biomes={'arid'})
        tiled = tile_image(arid.resize((720, 720), Image.Resampling.LANCZOS), w, h)
        img = overlay_rgb(img, tiled, dm, alpha=0.16)
    if snow:
        sm = land_mask(lands, w, h, biomes={'snow'})
        tiled = tile_image(snow.resize((720, 720), Image.Resampling.LANCZOS), w, h)
        img = overlay_rgb(img, tiled, sm, alpha=0.22)

    # Ridge art lives in the image-gen world plate. Do not stroke brown bars
    # on top — that read as sticks, not painted ranges.
    img = draw_rivers(img, w, h)
    img = draw_coast(img, mask_all, w, h)
    img = Image.composite(img, paper, mask_all)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    img = Image.composite(img, paper, mask_all)
    img = draw_badges(img, w, h)
    return img


def bake_normal_ao(albedo: Image.Image):
    gray = albedo.convert('L')
    edges = gray.filter(ImageFilter.FIND_EDGES)
    ao = ImageEnhance.Contrast(gray).enhance(0.55)
    ao = ImageEnhance.Brightness(ao).enhance(1.15)
    ao = ao.filter(ImageFilter.GaussianBlur(1.2))
    # Cheap normal from Sobel-ish emboss.
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
    GEN.mkdir(parents=True, exist_ok=True)
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
        # Optional AO at half-res — skip the 7MB fake normal (print board is matte).
        _normal, ao = bake_normal_ao(atlas.resize((2048, 1170), Image.Resampling.LANCZOS))
        ao = ao.resize((ATLAS_W, ATLAS_H), Image.Resampling.BILINEAR)
        ao.save(OUT_AO, 'PNG', optimize=True)
        print(f'wrote {OUT_AO} {ao.size}')
        if OUT_NORMAL.exists():
            OUT_NORMAL.unlink()


if __name__ == '__main__':
    main()
