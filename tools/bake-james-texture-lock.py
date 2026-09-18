#!/usr/bin/env python3
"""Bake James texture-lock refs into Three preview materials.

SoT:
  briefs/2026-09-17-three-art-gap/refs/board-parchment-macro-tile.png
  briefs/2026-09-17-three-art-gap/refs/board-ocean-print-macro-tile.png
  briefs/2026-09-17-three-art-gap/refs/units-molded-plastic-atlas-hi.png
"""
from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / 'briefs/2026-09-17-three-art-gap/refs'
BOARD = ROOT / 'assets/three/board'
UNITS = ROOT / 'assets/three/units'
CELL = 512

WASH_HEX = {
    'europe': (0x8C, 0x9A, 0x52),
    'ussr': (0xC4, 0xA0, 0x6A),
    'africa': (0xD6, 0xB8, 0x5C),
    'middle-east': (0xD4, 0xBC, 0x68),
    'asia': (0x8E, 0xAE, 0x6A),
    'north-america': (0x86, 0xA8, 0x5E),
    'south-america': (0x6F, 0x98, 0x48),
    'oceania': (0xA3, 0xB0, 0x6A),
}

OCEAN_DEEP = (0x3D, 0x5A, 0x66)
OCEAN_SHELF = (0x4F, 0x6E, 0x78)

HI_CELLS = {
    'infantry': (0, 0),
    'armour': (1, 0),
    'fighter': (3, 0),  # top-right tank is green; fighter is bottom-left
    'bomber': (1, 1),
    'battleship': (2, 1),
    'submarine': (3, 1),
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


def contrast_punch(im: Image.Image, amount=1.55) -> Image.Image:
    return ImageEnhance.Contrast(im).enhance(amount)


def colorize_keep_grain(im: Image.Image, rgb, strength=0.78) -> Image.Image:
    arr = np.array(im, dtype=np.float32)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    lum = np.clip((lum - 0.12) / 0.70, 0.22, 1.20)
    tint = np.array(rgb, dtype=np.float32) * lum[..., None]
    out = arr * (1 - strength) + tint * strength
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')


def bake_board():
    BOARD.mkdir(parents=True, exist_ok=True)
    parchment = contrast_punch(square_tile(REFS / 'board-parchment-macro-tile.png'), 1.65)
    parchment = make_tileable(parchment, 36)
    parchment.save(BOARD / 'board-parchment-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-parchment-tile.png')

    ocean = square_tile(REFS / 'board-ocean-print-macro-tile.png')
    ocean = contrast_punch(ocean, 1.28)
    # Lock hue to printed slate-teal without killing the scan tooth.
    ocean = colorize_keep_grain(ocean, OCEAN_DEEP, 0.42)
    ocean = colorize_keep_grain(ocean, OCEAN_SHELF, 0.22)
    ocean = make_tileable(ocean, 32)
    ocean.save(BOARD / 'board-ocean-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-ocean-tile.png')

    for slug, rgb in WASH_HEX.items():
        wash = colorize_keep_grain(parchment, rgb, 0.82)
        wash = Image.blend(wash, parchment, 0.18)
        wash = contrast_punch(wash, 1.22)
        wash.save(BOARD / f'wash-{slug}.png', 'PNG', optimize=True)
        print('wrote', BOARD / f'wash-{slug}.png')


def slice_hi_atlas():
    im = Image.open(REFS / 'units-molded-plastic-atlas-hi.png').convert('RGB')
    w, h = im.size
    cw, ch = w // 4, h // 2
    cells = {}
    # 4×2 product sheet: INF / TNK / INF-green / TNK-green
    #                    FTR / BMB / BB / SUB
    mapping = {
        'infantry': (0, 0),
        'armour': (1, 0),
        'fighter': (0, 1),
        'bomber': (1, 1),
        'battleship': (2, 1),
        'submarine': (3, 1),
    }
    for name, (col, row) in mapping.items():
        cells[name] = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    return cells


def rembg_cut(im: Image.Image) -> Image.Image:
    from rembg import remove
    cut = remove(im.convert('RGB')).convert('RGBA')
    arr = np.array(cut)
    ys, xs = np.where(arr[:, :, 3] > 24)
    if len(xs) < 80:
        return Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    pad = 18
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad)
    crop = Image.fromarray(arr[y0:y1, x0:x1], 'RGBA')
    alpha = crop.split()[3]
    outline = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(0.5))
    canvas = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ink = Image.new('RGBA', (CELL, CELL), (26, 22, 16, 0))
    fitted = ImageOps.contain(crop, (CELL - 28, CELL - 28))
    out_a = ImageOps.contain(outline, (CELL - 16, CELL - 16))
    ink_a = Image.new('L', (CELL, CELL), 0)
    ink_a.paste(out_a, ((CELL - out_a.width) // 2, (CELL - out_a.height) // 2 + 4))
    ink.putalpha(ink_a)
    canvas.paste(ink, (0, 0), ink)
    ox = (CELL - fitted.width) // 2
    oy = (CELL - fitted.height) // 2
    canvas.paste(fitted, (ox, oy + 2), fitted)
    return canvas


def take_existing(atlas_path: Path, cols, rows, col, row) -> Image.Image:
    im = Image.open(atlas_path).convert('RGBA')
    cw, ch = im.width // cols, im.height // rows
    cell = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    return cell.resize((CELL, CELL), Image.Resampling.LANCZOS)


def bake_units():
    UNITS.mkdir(parents=True, exist_ok=True)
    hi = slice_hi_atlas()
    land_old = UNITS / 'units-land-plastic.png'
    naval_old = UNITS / 'units-naval-plastic.png'
    pieces = {}
    for name, crop in hi.items():
        print('cut', name)
        pieces[name] = rembg_cut(crop)
    # Keep prior molded cuts for types the hi sheet does not include.
    if land_old.exists():
        pieces.setdefault('artillery', take_existing(land_old, 4, 2, 2, 0))
        pieces.setdefault('aaGun', take_existing(land_old, 4, 2, 1, 1))
        pieces.setdefault('factory', take_existing(land_old, 4, 2, 2, 1))
    if naval_old.exists():
        pieces.setdefault('carrier', take_existing(naval_old, 2, 2, 1, 0))
        pieces.setdefault('transport', take_existing(naval_old, 2, 2, 1, 1))

    land = Image.new('RGBA', (4 * CELL, 2 * CELL), (0, 0, 0, 0))
    order = ['infantry', 'armour', 'artillery', 'fighter', 'bomber', 'aaGun', 'factory']
    for i, name in enumerate(order):
        piece = pieces.get(name) or Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        land.paste(piece, ((i % 4) * CELL, (i // 4) * CELL), piece)
    land.save(UNITS / 'units-land-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-land-plastic.png')

    naval = Image.new('RGBA', (2 * CELL, 2 * CELL), (0, 0, 0, 0))
    for i, name in enumerate(['battleship', 'carrier', 'submarine', 'transport']):
        piece = pieces.get(name) or Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        naval.paste(piece, ((i % 2) * CELL, (i // 2) * CELL), piece)
    naval.save(UNITS / 'units-naval-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-naval-plastic.png')


if __name__ == '__main__':
    bake_board()
    bake_units()
