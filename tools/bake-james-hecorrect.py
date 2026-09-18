#!/usr/bin/env python3
"""Bake James he-correct macros into Three preview materials.

Standing SoT: briefs/2026-09-17-three-art-gap/PRODUCTION-PATH.md
ART-PIPELINE + AA-RISK-HOMAGE + AA-PALETTE continent washes.

Refs (this drop):
  briefs/2026-09-17-three-art-gap/refs/board-parchment-macro-tile.png
  briefs/2026-09-17-three-art-gap/refs/board-ocean-print-macro-tile.png
  briefs/2026-09-17-three-art-gap/refs/units-molded-plastic-atlas-hi.png

Land/ocean tiles become the albedo. Units are sliced, rembg'd, and packed
with cut-unit fallbacks for ART/AA/FAC/CV/TR (not on the James sheet).
"""
from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / 'briefs/2026-09-17-three-art-gap/refs'
BOARD = ROOT / 'assets/three/board'
UNITS = ROOT / 'assets/three/units'
CELL = 512

# Viz AA-PALETTE continent washes LOCKED — exact hex @ 18–28% over parchment.
# Soft print (luma-matched ink, then 28% over grain). Not a solid fill.
# Not a literal mix(parchment, hex, 0.28) — that reads as one khaki planet.
WASH_HEX = {
    'europe': (0x6B, 0x7A, 0x4A),
    'ussr': (0x8A, 0x73, 0x55),
    'africa': (0xB0, 0x89, 0x48),
    'middle-east': (0xA0, 0x90, 0x58),
    'asia': (0x5F, 0x7A, 0x5A),
    'north-america': (0x6A, 0x8B, 0x6E),
    'south-america': (0x5A, 0x8A, 0x72),
    'oceania': (0x7A, 0x6B, 0x8A),
}
WASH_STRENGTH = 0.28
LAND_BASE = (0xC4, 0xB8, 0x96)

# James 4×2 hi-detail sheet (grey/olive plastics on parchment).
#   INF-grey  TNK-grey  INF-olive  TNK-olive
#   FTR-tan   BMB-olive BB-red     SS-red
JAMES_LAND = {
    'infantry': (0, 0),
    'armour': (1, 0),
    'fighter': (0, 1),
    'bomber': (1, 1),
}
JAMES_NAVAL = {
    'battleship': (2, 1),
    'submarine': (3, 1),
}

CUT_FALLBACK = {
    'artillery': UNITS / 'cut-unit-artillery.png',
    'aaGun': UNITS / 'cut-unit-aa.png',
    'factory': UNITS / 'cut-unit-factory.png',
    'carrier': UNITS / 'cut-unit-carrier.png',
    'transport': UNITS / 'cut-unit-transport.png',
    'infantry': UNITS / 'cut-unit-infantry.png',
    'armour': UNITS / 'cut-unit-tank.png',
    'fighter': UNITS / 'cut-unit-fighter.png',
    'bomber': UNITS / 'cut-unit-bomber.png',
    'battleship': UNITS / 'cut-unit-battleship.png',
    'submarine': UNITS / 'cut-unit-submarine.png',
}


def square_tile(path: Path, size=512) -> Image.Image:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    side = min(w, h)
    x = (w - side) // 2
    y = (h - side) // 2
    return im.crop((x, y, x + side, y + side)).resize((size, size), Image.Resampling.LANCZOS)


def make_tileable(im: Image.Image, blend=40) -> Image.Image:
    arr = np.array(im, dtype=np.float32)
    h, w = arr.shape[:2]
    out = arr.copy()
    for i in range(blend):
        t = (i + 1) / (blend + 1)
        out[i] = out[i] * t + out[h - blend + i] * (1 - t)
        out[h - blend + i] = out[i]
        out[:, i] = out[:, i] * t + out[:, w - blend + i] * (1 - t)
        out[:, w - blend + i] = out[:, i]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')


def colorize_keep_grain(im: Image.Image, rgb, strength=0.78) -> Image.Image:
    arr = np.array(im, dtype=np.float32)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    lum = np.clip((lum - 0.10) / 0.72, 0.28, 1.22)
    tint = np.array(rgb, dtype=np.float32) * lum[..., None]
    out = arr * (1 - strength) + tint * strength
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')


def flatten_blotch(im: Image.Image, keep=0.22) -> Image.Image:
    """Kill wallpaper blotches; keep high-frequency paper tooth."""
    arr = np.array(im, dtype=np.float32)
    large = np.array(im.filter(ImageFilter.GaussianBlur(20)), dtype=np.float32)
    detail = arr - large
    median = np.median(arr.reshape(-1, 3), axis=0)
    compressed = large * keep + median * (1.0 - keep)
    out = np.clip(compressed + detail * 0.90, 0, 255)
    return Image.fromarray(out.astype(np.uint8), 'RGB')


def wash_over_parchment(parchment: Image.Image, rgb, strength=WASH_STRENGTH) -> Image.Image:
    """Viz lock: exact hex @ 18–28% over parchment. Soft print, not a solid fill.

    Ink is luma-matched to the parchment grain (keeps tooth), then composited
    at WASH_STRENGTH. Candy primaries and 70% solid colorize are out.
    Chroma of the ink is punched so Europe/USSR/Africa still split at 390
    after the 28% composite (literal mix read as one khaki planet).
    """
    t = float(np.clip(strength if strength is not None else WASH_STRENGTH, 0.18, 0.28))
    arr = np.array(parchment, dtype=np.float32)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    target = np.array(rgb, dtype=np.float32)
    t_lum = (0.30 * target[0] + 0.59 * target[1] + 0.11 * target[2]) / 255.0
    t_lum = max(float(t_lum), 0.08)
    grey = t_lum * 255.0
    boosted = np.clip(grey + (target - grey) * 1.70, 0, 255)
    ink = np.clip(boosted * (lum / t_lum)[..., None], 0, 255)
    out = arr * (1.0 - t) + ink * t
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')


def height_to_normal(im: Image.Image, strength=2.4) -> Image.Image:
    gray = np.array(im.convert('L'), dtype=np.float32) / 255.0
    dx = np.zeros_like(gray)
    dy = np.zeros_like(gray)
    dx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    dy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(gray)
    n = np.stack([nx, ny, nz], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-6
    rgb = np.clip(n * 0.5 + 0.5, 0, 1) * 255
    return Image.fromarray(rgb.astype(np.uint8), 'RGB')


def height_to_ao(im: Image.Image, amount=0.38) -> Image.Image:
    gray = np.array(im.convert('L'), dtype=np.float32) / 255.0
    ao = np.clip(1.0 - (1.0 - gray) * amount, 0.55, 1.0)
    pix = (ao * 255).astype(np.uint8)
    return Image.fromarray(np.stack([pix, pix, pix], axis=-1), 'RGB')


def bake_board():
    BOARD.mkdir(parents=True, exist_ok=True)
    parchment = square_tile(REFS / 'board-parchment-macro-tile.png')
    parchment = flatten_blotch(parchment, 0.20)
    parchment = ImageEnhance.Contrast(parchment).enhance(1.12)
    parchment = colorize_keep_grain(parchment, LAND_BASE, 0.22)
    parchment = make_tileable(parchment, 96)
    parchment.save(BOARD / 'board-parchment-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-parchment-tile.png')
    nrm = height_to_normal(parchment, 2.6)
    nrm.save(BOARD / 'board-parchment-normal.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-parchment-normal.png')
    ao = height_to_ao(parchment, 0.40)
    ao.save(BOARD / 'board-parchment-ao.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-parchment-ao.png')

    ocean = square_tile(REFS / 'board-ocean-print-macro-tile.png')
    ocean = ImageEnhance.Contrast(ocean).enhance(1.22)
    ocean = ImageEnhance.Brightness(ocean).enhance(1.12)
    # Printed slate-teal paper — keep tooth, do not crush to charcoal.
    arr = np.array(ocean, dtype=np.float32)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    lum = np.clip((lum - 0.08) / 0.70, 0.38, 1.28)
    target = np.array([0x4A, 0x68, 0x72], dtype=np.float32)
    ocean = Image.fromarray(np.clip(arr * 0.38 + (target * lum[..., None]) * 0.62, 0, 255).astype(np.uint8), 'RGB')
    ocean = make_tileable(ocean, 32)
    ocean.save(BOARD / 'board-ocean-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-ocean-tile.png')
    ocean_n = height_to_normal(ocean, 1.6)
    ocean_n.save(BOARD / 'board-ocean-normal.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-ocean-normal.png')

    for slug, rgb in WASH_HEX.items():
        wash = wash_over_parchment(parchment, rgb, WASH_STRENGTH)
        wash.save(BOARD / f'wash-{slug}.png', 'PNG', optimize=True)
        print('wrote', BOARD / f'wash-{slug}.png')


CREAM = (0xF0, 0xE6, 0xD2)


def strip_black_halo(cut: Image.Image, lum_cut=0.20) -> Image.Image:
    """Drop baked sticker outlines so mid-size sprites don't collapse to stamps."""
    arr = np.array(cut)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    dark = (lum < lum_cut) & (arr[:, :, 3] > 0)
    arr[dark, 3] = 0
    return Image.fromarray(arr, 'RGBA')


def cream_lift(cut: Image.Image) -> Image.Image:
    """Map sculpt lighting onto cream #F0E6D2.

    Percentile-stretch the piece luma so moulded recesses stay cream-brown
    and highlights stay ivory. Never collapse to a black stamp or a ghost.
    """
    arr = np.array(cut)
    rgb = arr[:, :, :3].astype(np.float32)
    a = arr[:, :, 3]
    lum = (0.30 * rgb[:, :, 0] + 0.59 * rgb[:, :, 1] + 0.11 * rgb[:, :, 2]) / 255.0
    op = a > 16
    if int(op.sum()) < 80:
        return cut
    lo, hi = np.percentile(lum[op], [8, 94])
    t = np.clip((lum - lo) / max(float(hi - lo), 0.08), 0.0, 1.0)
    # Contrast on cream: shade 0.56 (warm recess) .. 1.10 (ivory highlight).
    shade = 0.56 + (t ** 0.90) * 0.54
    cream = np.array(CREAM, dtype=np.float32)
    out = arr.copy()
    out[:, :, 0] = np.clip(cream[0] * shade, 0, 255).astype(np.uint8)
    out[:, :, 1] = np.clip(cream[1] * shade, 0, 255).astype(np.uint8)
    out[:, :, 2] = np.clip(cream[2] * shade, 0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def fit_on_cell(cut: Image.Image, fill=0.86) -> Image.Image:
    """Tight crop, NO baked black outline. Outline + shadow are runtime."""
    cut = strip_black_halo(cut)
    arr = np.array(cut)
    ys, xs = np.where(arr[:, :, 3] > 24)
    if len(xs) < 80:
        return Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    pad = 6
    x0, x1 = max(0, int(xs.min()) - pad), min(arr.shape[1], int(xs.max()) + pad)
    y0, y1 = max(0, int(ys.min()) - pad), min(arr.shape[0], int(ys.max()) + pad)
    crop = Image.fromarray(arr[y0:y1, x0:x1], 'RGBA')
    crop = cream_lift(crop)
    canvas = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    box = int(CELL * fill)
    fitted = ImageOps.contain(crop, (box, box))
    ox = (CELL - fitted.width) // 2
    oy = (CELL - fitted.height) // 2
    canvas.paste(fitted, (ox, oy), fitted)
    return canvas


def flood_key(rgb: Image.Image, tol=38) -> Image.Image:
    """Parchment / white flood from the border. No rembg required."""
    arr = np.array(rgb.convert('RGB'), dtype=np.float32)
    h, w = arr.shape[:2]
    border = np.concatenate([
        arr[0], arr[-1], arr[:, 0], arr[:, -1],
        arr[1], arr[-2], arr[:, 1], arr[:, -2],
    ], axis=0)
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(arr - bg, axis=2)
    sat = (arr.max(axis=2) - arr.min(axis=2)) / 255.0
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    piece = (dist > tol) | ((sat > 0.12) & (lum < 0.82))
    alpha = (np.clip(piece.astype(np.float32), 0, 1) * 255).astype(np.uint8)
    alpha = Image.fromarray(alpha, 'L')
    alpha = alpha.filter(ImageFilter.MedianFilter(3))
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    rgba = rgb.convert('RGBA')
    rgba.putalpha(alpha)
    return rgba


def rembg_cut(im: Image.Image) -> Image.Image | None:
    # Flood-key on the James parchment sheet eats the paper and reads as a
    # ghost stamp. Only accept rembg (or a later cut-unit PNG).
    try:
        from rembg import remove
    except Exception as exc:
        print('  rembg unavailable', exc)
        return None
    rgb = im.convert('RGB')
    cut = remove(rgb)
    if not isinstance(cut, Image.Image):
        cut = Image.fromarray(cut)
    cut = cut.convert('RGBA')
    if cut.size != rgb.size:
        cut = cut.resize(rgb.size, Image.Resampling.LANCZOS)
    return fit_on_cell(cut)


def load_cut(path: Path) -> Image.Image:
    im = Image.open(path).convert('RGBA')
    return fit_on_cell(im)


def slice_sheet(im: Image.Image, col: int, row: int, cols=4, rows=2, inset=18) -> Image.Image | None:
    w, h = im.size
    cw, ch = w // cols, h // rows
    crop = im.crop((
        col * cw + inset,
        row * ch + inset,
        (col + 1) * cw - inset,
        (row + 1) * ch - inset,
    ))
    return rembg_cut(crop)


def slice_existing_atlas(path: Path, col: int, row: int, cols: int, rows: int) -> Image.Image:
    if not path.exists():
        return None
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    cw, ch = w // cols, h // rows
    crop = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    return fit_on_cell(crop)


def cell_ok(im: Image.Image | None) -> bool:
    if im is None:
        return False
    arr = np.array(im)
    a = arr[:, :, 3] > 16
    if int(a.sum()) < 80:
        return False
    cover = float(a.mean())
    # Parchment leftovers fill the cell; a real mini sits in 8–62%.
    if cover < 0.06 or cover > 0.62:
        return False
    return True


def bake_units():
    UNITS.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(REFS / 'units-molded-plastic-atlas-hi.png').convert('RGB')
    pieces = {}
    for name, cell in {**JAMES_LAND, **JAMES_NAVAL}.items():
        print('cut james', name, cell)
        try:
            cut = slice_sheet(sheet, *cell)
            if cell_ok(cut):
                pieces[name] = cut
            else:
                print('  reject james cut', name)
        except Exception as exc:
            print('  cut failed', name, exc)

    existing_land = UNITS / 'units-land-plastic.png'
    existing_naval = UNITS / 'units-naval-plastic.png'
    existing_cells = {
        'infantry': (existing_land, 0, 0, 4, 2),
        'armour': (existing_land, 1, 0, 4, 2),
        'artillery': (existing_land, 2, 0, 4, 2),
        'fighter': (existing_land, 3, 0, 4, 2),
        'bomber': (existing_land, 0, 1, 4, 2),
        'aaGun': (existing_land, 1, 1, 4, 2),
        'factory': (existing_land, 2, 1, 4, 2),
        'battleship': (existing_naval, 0, 0, 2, 2),
        'carrier': (existing_naval, 1, 0, 2, 2),
        'submarine': (existing_naval, 0, 1, 2, 2),
        'transport': (existing_naval, 1, 1, 2, 2),
    }

    for name, spec in existing_cells.items():
        if cell_ok(pieces.get(name)):
            continue
        print('cut existing atlas', name)
        pieces[name] = slice_existing_atlas(*spec)

    for name, path in CUT_FALLBACK.items():
        if cell_ok(pieces.get(name)):
            continue
        if path.exists():
            print('cut fallback', name)
            pieces[name] = load_cut(path)

    land = Image.new('RGBA', (4 * CELL, 2 * CELL), (0, 0, 0, 0))
    land_order = ['infantry', 'armour', 'artillery', 'fighter', 'bomber', 'aaGun', 'factory']
    for i, name in enumerate(land_order):
        piece = pieces.get(name) or Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        land.paste(piece, ((i % 4) * CELL, (i // 4) * CELL), piece)
    land.save(UNITS / 'units-land-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-land-plastic.png')

    naval = Image.new('RGBA', (2 * CELL, 2 * CELL), (0, 0, 0, 0))
    naval_order = ['battleship', 'carrier', 'submarine', 'transport']
    for i, name in enumerate(naval_order):
        piece = pieces.get(name) or Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        naval.paste(piece, ((i % 2) * CELL, (i // 2) * CELL), piece)
    naval.save(UNITS / 'units-naval-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-naval-plastic.png')


def score_mid_pips():
    """Fail-closed: 64px mid pip must be cream, not a black stamp."""
    from PIL import ImageDraw
    land = Image.open(UNITS / 'units-land-plastic.png').convert('RGBA')
    cw, ch = land.size[0] // 4, land.size[1] // 2
    inf = land.crop((0, 0, cw, ch)).resize((64, 64), Image.Resampling.LANCZOS)
    arr = np.array(inf)
    a = arr[:, :, 3] > 16
    if a.sum() < 80:
        print('SCORE FAIL empty infantry cell')
        return False
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    mean_lum = float(lum[a].mean())
    black_frac = float((lum[a] < 0.28).mean())
    cream_frac = float((lum[a] > 0.50).mean())
    print(f'SCORE mid-64 inf lum={mean_lum:.3f} cream={cream_frac:.3f} black={black_frac:.3f}')
    contrast = float(lum[a].max() - lum[a].min())
    print(f'SCORE mid-64 inf contrast={contrast:.3f}')
    ok = mean_lum > 0.55 and cream_frac > 0.62 and black_frac < 0.10 and contrast > 0.12
    preview = Image.new('RGBA', (280, 80), (196, 184, 150, 255))
    d = ImageDraw.Draw(preview)
    d.ellipse((12, 58, 76, 76), fill=(20, 16, 12, 60))
    preview.paste(inf, (8, 8), inf)
    preview.save(UNITS / 'score-mid-64-inf.png', 'PNG')
    if not ok:
        print('SCORE FAIL black-stamp gate')
    return ok


def score_washes():
    names = ('europe', 'ussr', 'africa')
    means = {}
    for name in names:
        im = Image.open(BOARD / f'wash-{name}.png').convert('RGB')
        arr = np.array(im, dtype=np.float32)
        means[name] = arr.reshape(-1, 3).mean(axis=0)
        print(f'SCORE wash-{name} mean={tuple(int(v) for v in means[name])}')
    d_eu = float(np.linalg.norm(means['europe'] - means['ussr']))
    d_ea = float(np.linalg.norm(means['europe'] - means['africa']))
    print(f'SCORE wash delta EU-USSR={d_eu:.1f} EU-AF={d_ea:.1f}')
    return d_eu > 18 and d_ea > 18


if __name__ == '__main__':
    import sys
    bake_board()
    if '--board-only' not in sys.argv:
        bake_units()
        ok = score_mid_pips() and score_washes()
        if not ok:
            sys.exit(1)
