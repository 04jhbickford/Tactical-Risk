#!/usr/bin/env python3
"""Bake Arc TARGET LOOK tiles into Three preview materials.

SoT (this drop):
  briefs/2026-09-17-three-art-gap/refs/arc-units-molded-atlas.png
  briefs/2026-09-17-three-art-gap/refs/arc-ocean-print-tile.png
  briefs/2026-09-17-three-art-gap/refs/arc-parchment-grain-tile.png
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


def bake_board():
    BOARD.mkdir(parents=True, exist_ok=True)
    parchment = square_tile(REFS / 'arc-parchment-grain-tile.png')
    parchment = ImageEnhance.Contrast(parchment).enhance(1.55)
    parchment = make_tileable(parchment, 32)
    parchment.save(BOARD / 'board-parchment-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-parchment-tile.png')

    ocean = square_tile(REFS / 'arc-ocean-print-tile.png')
    ocean = ImageEnhance.Contrast(ocean).enhance(1.08)
    # AA-PALETTE slate-teal + quiet print tooth. Not a mottled grey slab.
    ocean = colorize_keep_grain(ocean, (0x3D, 0x5A, 0x66), 0.78)
    ocean = colorize_keep_grain(ocean, (0x4F, 0x6E, 0x78), 0.18)
    ocean = make_tileable(ocean, 28)
    ocean.save(BOARD / 'board-ocean-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-ocean-tile.png')

    for slug, rgb in WASH_HEX.items():
        wash = colorize_keep_grain(parchment, rgb, 0.80)
        wash = Image.blend(wash, parchment, 0.16)
        wash = ImageEnhance.Contrast(wash).enhance(1.18)
        wash.save(BOARD / f'wash-{slug}.png', 'PNG', optimize=True)
        print('wrote', BOARD / f'wash-{slug}.png')


def rembg_cut(im: Image.Image) -> Image.Image:
    from rembg import remove
    cut = remove(im.convert('RGB')).convert('RGBA')
    arr = np.array(cut)
    ys, xs = np.where(arr[:, :, 3] > 24)
    if len(xs) < 80:
        return Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    pad = 16
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad)
    crop = Image.fromarray(arr[y0:y1, x0:x1], 'RGBA')
    alpha = crop.split()[3]
    outline = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(0.4))
    canvas = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ink = Image.new('RGBA', (CELL, CELL), (26, 22, 16, 0))
    fitted = ImageOps.contain(crop, (CELL - 36, CELL - 36))
    out_a = ImageOps.contain(outline, (CELL - 22, CELL - 22))
    ink_a = Image.new('L', (CELL, CELL), 0)
    ink_a.paste(out_a, ((CELL - out_a.width) // 2, (CELL - out_a.height) // 2 + 6))
    ink.putalpha(ink_a)
    canvas.paste(ink, (0, 0), ink)
    ox = (CELL - fitted.width) // 2
    oy = (CELL - fitted.height) // 2
    canvas.paste(fitted, (ox, oy + 4), fitted)
    return canvas


def take_existing(atlas_path: Path, cols, rows, col, row) -> Image.Image:
    im = Image.open(atlas_path).convert('RGBA')
    cw, ch = im.width // cols, im.height // rows
    cell = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    return cell.resize((CELL, CELL), Image.Resampling.LANCZOS)


def bake_units():
    UNITS.mkdir(parents=True, exist_ok=True)
    im = Image.open(REFS / 'arc-units-molded-atlas.png').convert('RGB')
    w, h = im.size
    cw, ch = w // 3, h // 2
    # 3×2: INF-grey / TNK-green / FTR-tan
    #        INF-green / TNK-red / FTR-red
    mapping = {
        'infantry': (0, 0),
        'armour': (1, 0),
        'fighter': (2, 0),
        'bomber': (2, 1),
    }
    pieces = {}
    inset = 18
    for name, (col, row) in mapping.items():
        crop = im.crop((
            col * cw + inset, row * ch + inset,
            (col + 1) * cw - inset, (row + 1) * ch - inset,
        ))
        print('cut', name)
        pieces[name] = rembg_cut(crop)

    land_old = UNITS / 'units-land-plastic.png'
    if land_old.exists():
        pieces.setdefault('artillery', take_existing(land_old, 4, 2, 2, 0))
        pieces.setdefault('aaGun', take_existing(land_old, 4, 2, 1, 1))
        pieces.setdefault('factory', take_existing(land_old, 4, 2, 2, 1))

    land = Image.new('RGBA', (4 * CELL, 2 * CELL), (0, 0, 0, 0))
    order = ['infantry', 'armour', 'artillery', 'fighter', 'bomber', 'aaGun', 'factory']
    for i, name in enumerate(order):
        piece = pieces.get(name) or Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        land.paste(piece, ((i % 4) * CELL, (i // 4) * CELL), piece)
    land.save(UNITS / 'units-land-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-land-plastic.png')


if __name__ == '__main__':
    bake_board()
    bake_units()
