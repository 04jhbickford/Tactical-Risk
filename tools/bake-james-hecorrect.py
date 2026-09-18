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

# Viz AA-PALETTE continent washes. Hex tokens stay locked.
# 18–28% literal RGB mix reads as one khaki planet after ACES.
# Homage / Risk glance: parchment luminosity + stronger print ink.
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
# Colorize amount so Europe olive / USSR tan / Africa ochre survive 390.
WASH_COLORIZE = 0.70
WASH_CHROMA = 1.22
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


def wash_over_parchment(parchment: Image.Image, rgb, strength=WASH_STRENGTH) -> Image.Image:
    """Parchment grain + continent print ink. Soft, not a flat fill; Risk-readable at 390."""
    arr = np.array(parchment, dtype=np.float32)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    lum = np.clip((lum - 0.12) / 0.68, 0.40, 1.20)
    target = np.array(rgb, dtype=np.float32)
    printed = target * lum[..., None]
    t = WASH_COLORIZE
    out = arr * (1.0 - t) + printed * t
    # Push hue apart (Europe green vs USSR brown vs Africa ochre) without flattening grain.
    grey = out.mean(axis=2, keepdims=True)
    out = grey + (out - grey) * WASH_CHROMA
    # Tiny parchment return so it stays printed paper, not candy plastic.
    paper = min(0.10, max(0.0, 0.28 - float(strength)))
    out = out * (1.0 - paper) + arr * paper
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
    parchment = ImageEnhance.Contrast(parchment).enhance(1.42)
    parchment = colorize_keep_grain(parchment, LAND_BASE, 0.16)
    parchment = make_tileable(parchment, 36)
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
        wash = ImageEnhance.Contrast(wash).enhance(1.14)
        wash.save(BOARD / f'wash-{slug}.png', 'PNG', optimize=True)
        print('wrote', BOARD / f'wash-{slug}.png')


def fit_on_cell(cut: Image.Image) -> Image.Image:
    arr = np.array(cut)
    ys, xs = np.where(arr[:, :, 3] > 24)
    if len(xs) < 80:
        return Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    pad = 12
    x0, x1 = max(0, int(xs.min()) - pad), min(arr.shape[1], int(xs.max()) + pad)
    y0, y1 = max(0, int(ys.min()) - pad), min(arr.shape[0], int(ys.max()) + pad)
    crop = Image.fromarray(arr[y0:y1, x0:x1], 'RGBA')
    alpha = crop.split()[3]
    outline = alpha.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(0.5))
    canvas = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ink = Image.new('RGBA', (CELL, CELL), (26, 22, 16, 0))
    fitted = ImageOps.contain(crop, (CELL - 40, CELL - 40))
    out_a = ImageOps.contain(outline, (CELL - 24, CELL - 24))
    ink_a = Image.new('L', (CELL, CELL), 0)
    ink_a.paste(out_a, ((CELL - out_a.width) // 2, (CELL - out_a.height) // 2 + 8))
    ink.putalpha(ink_a)
    canvas.paste(ink, (0, 0), ink)
    ox = (CELL - fitted.width) // 2
    oy = (CELL - fitted.height) // 2
    canvas.paste(fitted, (ox, oy + 6), fitted)
    return canvas


def rembg_cut(im: Image.Image) -> Image.Image:
    from rembg import remove
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


def slice_james(im: Image.Image, col: int, row: int, cols=4, rows=2, inset=22) -> Image.Image:
    w, h = im.size
    cw, ch = w // cols, h // rows
    crop = im.crop((
        col * cw + inset,
        row * ch + inset,
        (col + 1) * cw - inset,
        (row + 1) * ch - inset,
    ))
    return rembg_cut(crop)


def bake_units():
    UNITS.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(REFS / 'units-molded-plastic-atlas-hi.png').convert('RGB')
    pieces = {}
    for name, cell in JAMES_LAND.items():
        print('cut james', name, cell)
        try:
            pieces[name] = slice_james(sheet, *cell)
        except Exception as exc:
            print('  rembg failed', name, exc)
    for name, cell in JAMES_NAVAL.items():
        print('cut james', name, cell)
        try:
            pieces[name] = slice_james(sheet, *cell)
        except Exception as exc:
            print('  rembg failed', name, exc)

    for name, path in CUT_FALLBACK.items():
        if name in pieces and pieces[name] is not None:
            arr = np.array(pieces[name])
            if arr[:, :, 3].sum() > 80 * 255:
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


if __name__ == '__main__':
    import sys
    bake_board()
    if '--board-only' not in sys.argv:
        bake_units()
