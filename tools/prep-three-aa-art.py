#!/usr/bin/env python3
# One-shot: turn James's cream-chit JPEGs (baked checkerboard) into
# real transparent 2×2 atlases, plus square board tiles.
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/home/ubuntu/.cursor/projects/workspace/uploads')
OUT_UNITS = ROOT / 'assets/three/units'
OUT_BOARD = ROOT / 'assets/three/board'
CELL = 512
ATLAS = CELL * 2


def load_rgb(name):
    return np.array(Image.open(SRC / name).convert('RGB'))


def keep_mask(rgb):
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    warm = (r + g) // 2 - b
    return (chroma > 14) | (warm > 10)


def extract_disc(rgb, y0, y1, x0, x1, out=CELL):
    cell = rgb[y0:y1, x0:x1]
    keep = keep_mask(cell)
    ys, xs = np.where(keep)
    if len(xs) < 200:
        raise SystemExit(f'no disc in cell {x0},{y0}')
    cx = float(xs.mean())
    cy = float(ys.mean())
    rad = float(np.percentile(np.hypot(xs - cx, ys - cy), 99.2)) + 4
    h, w = cell.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    dist = np.hypot(xx - cx, yy - cy)
    alpha = np.clip((rad + 3 - dist) / 5.0, 0, 1)
    # Drop leftover checkerboard gray that leaked inside the circle.
    gray = keep_mask(cell) == False
    alpha = np.where(gray & (dist > rad * 0.92), 0, alpha)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = cell
    rgba[:, :, 3] = (alpha * 255).astype(np.uint8)

    pad = int(rad + 10)
    x1c = min(w, int(round(cx + pad)))
    x0c = max(0, int(round(cx - pad)))
    y1c = min(h, int(round(cy + pad)))
    y0c = max(0, int(round(cy - pad)))
    crop = Image.fromarray(rgba[y0c:y1c, x0c:x1c], 'RGBA')
    canvas = Image.new('RGBA', (out, out), (0, 0, 0, 0))
    fitted = crop.resize((out, out), Image.Resampling.LANCZOS)
    canvas.paste(fitted, (0, 0))
    return canvas


def make_atlas(src_name, dest):
    rgb = load_rgb(src_name)
    h, w = rgb.shape[:2]
    atlas = Image.new('RGBA', (ATLAS, ATLAS), (0, 0, 0, 0))
    for row in range(2):
        for col in range(2):
            disc = extract_disc(
                rgb,
                row * (h // 2), (row + 1) * (h // 2),
                col * (w // 2), (col + 1) * (w // 2),
            )
            atlas.paste(disc, (col * CELL, row * CELL), disc)
    dest.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(dest, 'PNG')
    print('wrote', dest, atlas.size)


def make_tile(src_name, dest, size=512):
    im = Image.open(SRC / src_name).convert('RGB')
    w, h = im.size
    side = min(w, h)
    x = (w - side) // 2
    y = (h - side) // 2
    tile = im.crop((x, y, x + side, y + side)).resize((size, size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tile.save(dest, 'PNG')
    print('wrote', dest, tile.size)


if __name__ == '__main__':
    make_atlas('units-land-air-cream_c368.png', OUT_UNITS / 'units-land-air-cream.png')
    make_atlas('units-naval-cream_fe1e.png', OUT_UNITS / 'units-naval-cream.png')
    make_tile('board-parchment-tile_c296.png', OUT_BOARD / 'board-parchment-tile.png')
    make_tile('board-ocean-tile_861a.png', OUT_BOARD / 'board-ocean-tile.png')
