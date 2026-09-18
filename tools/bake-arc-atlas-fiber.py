#!/usr/bin/env python3
"""Punch A&A atlas fiber + printed blue-grey ocean for Three preview.

SoT: briefs/2026-09-17-three-art-gap/refs/aa-board-continents-texture.png
Land fiber stays the scanned paper tooth (already on disk). Do NOT high-pass
the political map — that baked country outlines into the wash.
Ocean is color-masked sea from the atlas (muted blue-grey, not charcoal).
"""
from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / 'briefs/2026-09-17-three-art-gap/refs'
BOARD = ROOT / 'assets/three/board'
SIZE = 512

OCEAN_PRINT = (0x7B, 0x92, 0x9E)
OCEAN_DEEP = (0x6A, 0x84, 0x90)

WASHES = [
    'wash-europe.png', 'wash-ussr.png', 'wash-africa.png',
    'wash-middle-east.png', 'wash-asia.png', 'wash-north-america.png',
    'wash-south-america.png', 'wash-oceania.png',
]


def atlas_path() -> Path:
    for name in ('aa-board-continents-texture.png', 'aa-board-continents.png'):
        p = REFS / name
        if p.exists():
            return p
    raise FileNotFoundError('missing A&A board texture ref')


def make_tileable(im: Image.Image, blend=48) -> Image.Image:
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


def punch_fiber(path: Path, amount=1.42):
    if not path.exists():
        return
    im = Image.open(path).convert('RGB')
    im = ImageEnhance.Contrast(im).enhance(amount)
    im = ImageEnhance.Sharpness(im).enhance(1.35)
    im.save(path, 'PNG', optimize=True)
    print('punched', path)


def ocean_from_atlas(atlas: Image.Image) -> Image.Image:
    arr = np.array(atlas.convert('RGB'), dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Sea: blue-grey (B >= G >= R-ish), not yellow land / green continents.
    sea = (b > 118) & (b > r + 8) & (g > r - 6) & (b - r > 12) & ((r + g + b) / 3 < 190)
    if sea.sum() < 800:
        raise RuntimeError('atlas sea mask too small')
    pix = arr[sea]
    # Build a tile by tiling a shuffled patch of sea pixels + local noise.
    ys, xs = np.where(sea)
    # Use a large rectangular sea region if possible (Pacific left).
    h, w = arr.shape[:2]
    pac = arr[int(h * 0.05):int(h * 0.45), 0:int(w * 0.14)]
    pr, pg, pb = pac[:, :, 0], pac[:, :, 1], pac[:, :, 2]
    psea = (pb > 118) & (pb > pr + 8) & (pb - pr > 12)
    if psea.mean() > 0.72:
        crop = Image.fromarray(pac.astype(np.uint8), 'RGB')
    else:
        # Scatter sea pixels into a square.
        raw = pix[np.random.default_rng(7).choice(len(pix), SIZE * SIZE)].reshape(SIZE, SIZE, 3)
        crop = Image.fromarray(raw.astype(np.uint8), 'RGB')
    crop = crop.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    crop = ImageEnhance.Contrast(crop).enhance(1.55)
    arr = np.array(crop, dtype=np.float32)
    lum = (0.30 * arr[:, :, 0] + 0.59 * arr[:, :, 1] + 0.11 * arr[:, :, 2]) / 255.0
    lum = np.clip((lum - 0.20) / 0.55, 0.50, 1.22)
    tint = np.array(OCEAN_PRINT, dtype=np.float32) * lum[..., None]
    deep = np.array(OCEAN_DEEP, dtype=np.float32) * lum[..., None]
    out = arr * 0.34 + tint * 0.48 + deep * 0.18
    # Paper tooth from luminance jitter already in the scan.
    return make_tileable(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB'), 36)


def bake():
    BOARD.mkdir(parents=True, exist_ok=True)
    atlas = Image.open(atlas_path()).convert('RGB')
    ocean = ocean_from_atlas(atlas)
    ocean.save(BOARD / 'board-ocean-tile.png', 'PNG', optimize=True)
    print('wrote', BOARD / 'board-ocean-tile.png')
    punch_fiber(BOARD / 'board-parchment-tile.png', 1.40)
    for name in WASHES:
        punch_fiber(BOARD / name, 1.38)


if __name__ == '__main__':
    bake()
