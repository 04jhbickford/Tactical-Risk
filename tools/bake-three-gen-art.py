#!/usr/bin/env python3
"""Bake image-gen board tiles + molded-plastic unit atlases for ?three=1.

Sources live in /opt/cursor/artifacts/assets (and are copied into assets/three/gen).
Do not code-draw the look — this only extracts, color-locks, and packs.
"""
from __future__ import annotations

from pathlib import Path
import shutil
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/opt/cursor/artifacts/assets')
GEN = ROOT / 'assets/three/gen'
BOARD = ROOT / 'assets/three/board'
UNITS = ROOT / 'assets/three/units'
CELL = 512

WASH_HEX = {
    'Europe': (0x8C, 0x9A, 0x52),
    'USSR': (0xC4, 0xA0, 0x6A),
    'Africa': (0xD6, 0xB8, 0x5C),
    'Middle East': (0xD4, 0xBC, 0x68),
    'Asia': (0x8E, 0xAE, 0x6A),
    'North America': (0x86, 0xA8, 0x5E),
    'South America': (0x6F, 0x98, 0x48),
    'Oceania': (0xA3, 0xB0, 0x6A),
}

OCEAN_DEEP = (0x3D, 0x5A, 0x66)
OCEAN_SHELF = (0x4F, 0x6E, 0x78)


def copy_gen():
    GEN.mkdir(parents=True, exist_ok=True)
    for p in SRC.glob('*.png'):
        dest = GEN / p.name
        shutil.copy2(p, dest)
        print('copied', dest)


def load_rgb(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert('RGB'), dtype=np.float32)


def save_rgb(arr: np.ndarray, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')
    if max(im.size) > 512:
        im = im.resize((512, 512), Image.Resampling.LANCZOS)
    im.save(dest, 'PNG', optimize=True)
    print('wrote', dest, im.size)


def make_tileable(arr: np.ndarray, blend=48) -> np.ndarray:
    h, w = arr.shape[:2]
    out = arr.copy()
    # Wrap-blend seams so the scan can repeat on land plates.
    for i in range(blend):
        t = (i + 1) / (blend + 1)
        out[i] = out[i] * t + out[h - blend + i] * (1 - t)
        out[h - blend + i] = out[i]
        out[:, i] = out[:, i] * t + out[:, w - blend + i] * (1 - t)
        out[:, w - blend + i] = out[:, i]
    return out


def contrast_punch(arr: np.ndarray, amount=1.55) -> np.ndarray:
    lum = arr.mean(axis=2, keepdims=True)
    mid = float(np.median(lum))
    out = mid + (arr - mid) * amount
    return np.clip(out, 0, 255)


def colorize_keep_grain(grain: np.ndarray, rgb, strength=0.92) -> np.ndarray:
    lum = (0.30 * grain[:, :, 0] + 0.59 * grain[:, :, 1] + 0.11 * grain[:, :, 2]) / 255.0
    lum = np.clip((lum - 0.22) / 0.62, 0.18, 1.15)
    tint = np.array(rgb, dtype=np.float32) * lum[..., None]
    return grain * (1 - strength) + tint * strength


def bake_board():
    parchment = contrast_punch(load_rgb(GEN / 'board-parchment-scan.png'), 1.72)
    parchment = make_tileable(parchment, 56)
    save_rgb(parchment, BOARD / 'board-parchment-tile.png')

    ocean_src = load_rgb(GEN / 'board-ocean-print.png')
    lum = (0.30 * ocean_src[:, :, 0] + 0.59 * ocean_src[:, :, 1] + 0.11 * ocean_src[:, :, 2]) / 255.0
    lum = np.clip((lum - lum.min()) / max(1e-6, lum.max() - lum.min()), 0, 1)
    # Quiet printed variation — deep ↔ shelf, keep paper tooth.
    ocean = np.empty_like(ocean_src)
    for i in range(3):
        ocean[:, :, i] = OCEAN_DEEP[i] + (OCEAN_SHELF[i] - OCEAN_DEEP[i]) * lum
    # Re-apply source paper grain as a punchy overlay, then lock hue to slate-teal.
    grain = contrast_punch(ocean_src, 1.35)
    ocean = ocean * 0.72 + grain * 0.28
    ocean = colorize_keep_grain(ocean, OCEAN_DEEP, 0.62)
    ocean = make_tileable(contrast_punch(ocean, 1.18), 48)
    save_rgb(ocean, BOARD / 'board-ocean-tile.png')

    wash_src = {
        'Europe': None,  # map image — colorize parchment instead
        'USSR': GEN / 'wash-ussr-tan.png',
        'Africa': GEN / 'wash-africa-ochre.png',
        'Middle East': GEN / 'wash-africa-ochre.png',
        'Asia': GEN / 'wash-asia-green.png',
        'North America': GEN / 'wash-asia-green.png',
        'South America': GEN / 'wash-asia-green.png',
        'Oceania': GEN / 'wash-asia-green.png',
    }
    for name, hexrgb in WASH_HEX.items():
        src_path = wash_src.get(name)
        if src_path and src_path.exists():
            paper = contrast_punch(load_rgb(src_path), 1.45)
            paper = colorize_keep_grain(paper, hexrgb, 0.48)
        else:
            paper = colorize_keep_grain(parchment, hexrgb, 0.88)
        # Always multiply the scanned cardboard so grain punches at 390.
        paper = paper * 0.55 + parchment * 0.45
        paper = colorize_keep_grain(paper, hexrgb, 0.42)
        paper = make_tileable(contrast_punch(paper, 1.28), 40)
        slug = name.lower().replace(' ', '-')
        save_rgb(paper, BOARD / f'wash-{slug}.png')


def border_flood_mask(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    # Background = colors similar to a sampled border frame.
    border = np.concatenate([
        rgb[:8].reshape(-1, 3),
        rgb[-8:].reshape(-1, 3),
        rgb[:, :8].reshape(-1, 3),
        rgb[:, -8:].reshape(-1, 3),
    ], axis=0)
    mean = border.mean(axis=0)
    std = np.maximum(border.std(axis=0), 8.0)
    dist = np.sqrt((((rgb - mean) / std) ** 2).sum(axis=2))
    # Plastic minis are smoother than cracked map paper.
    grey = rgb.mean(axis=2)
    pad = np.pad(grey, 2, mode='edge')
    var = np.zeros((h, w), dtype=np.float32)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            var += (pad[2 + dy:2 + dy + h, 2 + dx:2 + dx + w] - grey) ** 2
    var /= 25.0
    yy, xx = np.mgrid[0:h, 0:w]
    cy, cx = h / 2, w / 2
    rad = np.hypot((xx - cx) / (w * 0.42), (yy - cy) / (h * 0.42))
    bg = (dist < 2.15) & (var > 18) & (rad > 0.55)
    bg |= dist < 1.05
    fg = ~bg
    # Prefer the centered mass.
    fg &= rad < 1.35
    return fg


def largest_component(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=np.uint8)
    best = None
    best_n = 0
    best_score = -1
    yy, xx = np.mgrid[0:h, 0:w]
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if not row[x] or seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = 1
            cells = []
            while stack:
                cy, cx = stack.pop()
                cells.append((cy, cx))
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = 1
                        stack.append((ny, nx))
            n = len(cells)
            if n < 800:
                continue
            ys = np.array([c[0] for c in cells])
            xs = np.array([c[1] for c in cells])
            score = n - ((ys.mean() - h / 2) ** 2 + (xs.mean() - w / 2) ** 2) * 0.15
            if score > best_score:
                best_score = score
                best_n = n
                best = (ys, xs)
    out = np.zeros((h, w), dtype=bool)
    if best is None:
        return mask
    out[best[0], best[1]] = True
    return out


def extract_unit(path: Path) -> Image.Image:
    im = Image.open(path).convert('RGB')
    try:
        from rembg import remove
        cut = remove(im)
        arr = np.array(cut.convert('RGBA'))
    except Exception:
        small = im.resize((512, 512), Image.Resampling.BILINEAR)
        rgb = np.array(small, dtype=np.float32)
        mask = largest_component(border_flood_mask(rgb))
        mimg = Image.fromarray((mask.astype(np.uint8) * 255), 'L')
        mimg = mimg.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.1))
        mask_full = mimg.resize(im.size, Image.Resampling.BILINEAR)
        arr = np.array(im.convert('RGBA'))
        arr[:, :, 3] = np.array(mask_full)
    # Crop to subject + pad, then fit into CELL.
    ys, xs = np.where(arr[:, :, 3] > 24)
    if len(xs) < 200:
        raise SystemExit(f'extract failed: {path}')
    pad = 28
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad)
    crop = Image.fromarray(arr[y0:y1, x0:x1], 'RGBA')
    # Thick dark outline from dilated alpha.
    alpha = crop.split()[3]
    outline = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(0.6))
    canvas = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ink = Image.new('RGBA', (CELL, CELL), (26, 22, 16, 0))
    fitted = ImageOps.contain(crop, (CELL - 28, CELL - 28))
    ox = (CELL - fitted.width) // 2
    oy = (CELL - fitted.height) // 2
    out_a = ImageOps.contain(outline, (CELL - 16, CELL - 16))
    ink_a = Image.new('L', (CELL, CELL), 0)
    ink_a.paste(out_a, ((CELL - out_a.width) // 2, (CELL - out_a.height) // 2 + 4))
    ink.putalpha(ink_a)
    canvas.paste(ink, (0, 0), ink)
    canvas.paste(fitted, (ox, oy + 2), fitted)
    return canvas


def bake_atlases():
    land_names = [
        'unit-infantry.png', 'unit-tank.png', 'unit-artillery.png', 'unit-fighter.png',
        'unit-bomber.png', 'unit-aa.png', 'unit-factory.png',
    ]
    naval_names = [
        'unit-battleship.png', 'unit-carrier.png', 'unit-submarine.png', 'unit-transport.png',
    ]
    land = Image.new('RGBA', (4 * CELL, 2 * CELL), (0, 0, 0, 0))
    for i, name in enumerate(land_names):
        piece = extract_unit(GEN / name)
        land.paste(piece, ((i % 4) * CELL, (i // 4) * CELL), piece)
        piece.save(UNITS / f'cut-{name}', 'PNG')
    land.save(UNITS / 'units-land-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-land-plastic.png', land.size)

    naval = Image.new('RGBA', (2 * CELL, 2 * CELL), (0, 0, 0, 0))
    for i, name in enumerate(naval_names):
        piece = extract_unit(GEN / name)
        naval.paste(piece, ((i % 2) * CELL, (i // 2) * CELL), piece)
        piece.save(UNITS / f'cut-{name}', 'PNG')
    naval.save(UNITS / 'units-naval-plastic.png', 'PNG')
    print('wrote', UNITS / 'units-naval-plastic.png', naval.size)


if __name__ == '__main__':
    copy_gen()
    bake_board()
    bake_atlases()
