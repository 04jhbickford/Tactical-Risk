#!/usr/bin/env python3
"""P27: pack molded-plastic mini cells + keep terrain tiles. Preview only."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/three/units'
CELL = 256


def white_to_alpha(im, thresh=0.10, soft=0.18):
    arr = np.array(im.convert('RGB'), dtype=np.float32) / 255.0
    # Near-white background → transparent. Keep soft contact shadow.
    mn = arr.min(axis=2)
    dist = 1.0 - mn
    alpha = np.clip((dist - thresh) / max(soft, 1e-6), 0, 1)
    rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.float32)
    rgba[:, :, :3] = arr
    rgba[:, :, 3] = alpha
    return rgba


def trim_alpha(rgba, pad=8):
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 0.04)
    if len(xs) == 0:
        return rgba
    x0, x1 = max(0, xs.min() - pad), min(rgba.shape[1], xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(rgba.shape[0], ys.max() + pad + 1)
    return rgba[y0:y1, x0:x1]


def fit_cell(rgba):
    rgba = trim_alpha(rgba)
    h, w = rgba.shape[:2]
    side = int(max(w, h) * 1.08)
    canvas = np.zeros((side, side, 4), dtype=np.float32)
    x = (side - w) // 2
    y = (side - h) // 2
    canvas[y:y + h, x:x + w] = rgba
    im = Image.fromarray(np.clip(canvas * 255, 0, 255).astype(np.uint8), 'RGBA')
    return im.resize((CELL, CELL), Image.Resampling.LANCZOS)


def split_objects(path, n=4):
    im = Image.open(path)
    arr = np.array(im.convert('L'), dtype=np.float32) / 255.0
    occ = (arr < 0.96).mean(axis=0)
    spans = []
    inside = False
    start = 0
    for x, v in enumerate(occ):
        if v > 0.004 and not inside:
            inside = True
            start = x
        elif v <= 0.004 and inside:
            inside = False
            if x - start > 12:
                spans.append((start, x))
    if inside and im.size[0] - start > 12:
        spans.append((start, im.size[0]))
    # Merge tiny noise; keep the n widest objects left-to-right.
    spans.sort(key=lambda s: s[1] - s[0], reverse=True)
    spans = sorted(spans[:n], key=lambda s: s[0])
    while len(spans) < n:
        spans.append(spans[-1] if spans else (0, im.size[0]))
    cells = []
    pad = 10
    for x0, x1 in spans:
        crop = im.crop((max(0, x0 - pad), 0, min(im.size[0], x1 + pad), im.size[1]))
        cells.append(fit_cell(white_to_alpha(crop)))
    return cells


def cell_from_atlas(im, col, row, cols, rows):
    w, h = im.size
    cw, ch = w // cols, h // rows
    crop = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    return fit_cell(white_to_alpha(crop, thresh=0.04, soft=0.12))


def pack(cells, cols, rows, dest):
    sheet = Image.new('RGBA', (cols * CELL, rows * CELL), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        if cell is None:
            continue
        c, r = i % cols, i // cols
        sheet.paste(cell, (c * CELL, r * CELL), cell)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, 'PNG')
    print('wrote', dest, sheet.size)


def main():
    land_src = OUT / 'src-minis-land.png'
    naval_src = OUT / 'src-minis-naval.png'
    old_land = OUT / 'units-land-plastic.png'
    # Generated row: INF, TNK, BMB, FTR
    inf, tnk, bmb, ftr = split_objects(land_src, 4)
    old = Image.open(old_land)
    art = cell_from_atlas(old, 2, 0, 4, 2)
    aa = cell_from_atlas(old, 1, 1, 4, 2)
    fac = cell_from_atlas(old, 2, 1, 4, 2)
    # 4×2: INF TNK ART FTR / BMB AA FAC —
    pack([inf, tnk, art, ftr, bmb, aa, fac, None], 4, 2, OUT / 'units-land-minis.png')
    # Generated naval row is uneven (carrier is wide). Manual crops in 1280 space.
    naval_im = Image.open(naval_src)
    nw, nh = naval_im.size
    sx = nw / 1280
    boxes = [(0, 310), (300, 690), (660, 980), (960, 1280)]
    bb, cv, ss, tr = [
        fit_cell(white_to_alpha(naval_im.crop((int(a * sx), 0, int(b * sx), nh))))
        for a, b in boxes
    ]
    pack([bb, cv, ss, tr], 2, 2, OUT / 'units-naval-minis.png')


if __name__ == '__main__':
    main()
