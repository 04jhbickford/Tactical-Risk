#!/usr/bin/env python3
# In-repo molded-plastic unit atlases for ?three=1.
# Grayscale molds (lighting + alpha). Runtime tints faction color.
# Match briefs/2026-09-17-three-art-gap/refs/aa-plastic-units.png — no cream discs.

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/three/units'
CELL = 256
SS = 2  # supersample


def blank(n):
    return Image.new('L', (n, n), 0)


def to_rgba_mold(mask, light):
    a = np.array(mask, dtype=np.float32) / 255.0
    l = np.array(light, dtype=np.float32) / 255.0
    rgba = np.zeros((mask.size[1], mask.size[0], 4), dtype=np.uint8)
    grey = np.clip(l, 0, 1)
    rgba[:, :, 0] = (grey * 255).astype(np.uint8)
    rgba[:, :, 1] = (grey * 255).astype(np.uint8)
    rgba[:, :, 2] = (grey * 255).astype(np.uint8)
    rgba[:, :, 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def light_from_mask(mask):
    arr = np.array(mask, dtype=np.float32) / 255.0
    # Bevel: brighter toward top-left, darker bottom-right.
    h, w = arr.shape
    yy, xx = np.mgrid[0:h, 0:w]
    nx = (xx / max(w - 1, 1)) * 2 - 1
    ny = (yy / max(h - 1, 1)) * 2 - 1
    shade = 0.58 - 0.22 * nx - 0.28 * ny
    # Soft inner highlight
    hx = (xx - w * 0.38) / w
    hy = (yy - h * 0.32) / h
    highlight = np.exp(-(hx * hx + hy * hy) * 7.5) * 0.28
    # Edge darkening from mask gradient
    gx = np.zeros_like(arr)
    gy = np.zeros_like(arr)
    gx[:, 1:-1] = arr[:, 2:] - arr[:, :-2]
    gy[1:-1, :] = arr[2:, :] - arr[:-2, :]
    edge = np.clip(np.hypot(gx, gy) * 1.8, 0, 1)
    lit = np.clip(arr * (shade + highlight) * (1.0 - edge * 0.35) + 0.08 * arr, 0, 1)
    return Image.fromarray((lit * 255).astype(np.uint8), 'L')


def finish(mask):
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))
    light = light_from_mask(mask)
    mold = to_rgba_mold(mask, light)
    return mold.resize((CELL, CELL), Image.Resampling.LANCZOS)


def soldier(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    # round base
    d.ellipse([c - s * 0.42, c + s * 0.72, c + s * 0.42, c + s * 0.96], fill=255)
    # boots / legs
    d.polygon([
        (c - s * 0.20, c + s * 0.78), (c - s * 0.04, c + s * 0.78),
        (c - s * 0.02, c + s * 0.18), (c - s * 0.22, c + s * 0.18),
    ], fill=255)
    d.polygon([
        (c + s * 0.04, c + s * 0.78), (c + s * 0.22, c + s * 0.78),
        (c + s * 0.20, c + s * 0.18), (c + s * 0.02, c + s * 0.18),
    ], fill=255)
    # torso
    d.rounded_rectangle([c - s * 0.22, c - s * 0.22, c + s * 0.22, c + s * 0.28], radius=s * 0.08, fill=255)
    # arms + rifle
    d.polygon([
        (c + s * 0.18, c - s * 0.12), (c + s * 0.34, c - s * 0.02),
        (c + s * 0.30, c + s * 0.12), (c + s * 0.16, c + s * 0.06),
    ], fill=255)
    d.polygon([
        (c - s * 0.18, c - s * 0.08), (c - s * 0.36, c + s * 0.06),
        (c - s * 0.30, c + s * 0.16), (c - s * 0.14, c + s * 0.04),
    ], fill=255)
    d.line([(c + s * 0.10, c + s * 0.02), (c + s * 0.62, c - s * 0.42)], fill=255, width=int(s * 0.10))
    d.ellipse([c + s * 0.56, c - s * 0.50, c + s * 0.70, c - s * 0.36], fill=255)
    # helmeted head
    d.ellipse([c - s * 0.16, c - s * 0.62, c + s * 0.16, c - s * 0.22], fill=255)
    d.ellipse([c - s * 0.20, c - s * 0.70, c + s * 0.20, c - s * 0.40], fill=255)
    return finish(im)


def tank(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.rounded_rectangle([c - s * 0.86, c + s * 0.08, c + s * 0.86, c + s * 0.52], radius=s * 0.16, fill=255)
    for i in range(-3, 4):
        d.ellipse([c + i * s * 0.22 - s * 0.12, c + s * 0.28, c + i * s * 0.22 + s * 0.12, c + s * 0.52], fill=255)
    d.rounded_rectangle([c - s * 0.62, c - s * 0.12, c + s * 0.50, c + s * 0.22], radius=s * 0.10, fill=255)
    d.rounded_rectangle([c - s * 0.22, c - s * 0.38, c + s * 0.22, c + s * 0.02], radius=s * 0.08, fill=255)
    d.rectangle([c + s * 0.16, c - s * 0.30, c + s * 0.92, c - s * 0.16], fill=255)
    d.ellipse([c + s * 0.86, c - s * 0.34, c + s * 0.98, c - s * 0.12], fill=255)
    return finish(im)


def artillery(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.ellipse([c - s * 0.62, c + s * 0.18, c - s * 0.18, c + s * 0.62], fill=255)
    d.ellipse([c + s * 0.10, c + s * 0.18, c + s * 0.54, c + s * 0.62], fill=255)
    d.rounded_rectangle([c - s * 0.28, c - s * 0.02, c + s * 0.22, c + s * 0.28], radius=s * 0.06, fill=255)
    d.polygon([
        (c - s * 0.04, c + s * 0.04), (c + s * 0.72, c - s * 0.62),
        (c + s * 0.82, c - s * 0.48), (c + s * 0.10, c + s * 0.16),
    ], fill=255)
    d.polygon([
        (c - s * 0.10, c - s * 0.18), (c + s * 0.16, c - s * 0.28),
        (c + s * 0.16, c + s * 0.08), (c - s * 0.10, c + s * 0.12),
    ], fill=255)
    return finish(im)


def fighter(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.46
    d.polygon([
        (c, c - s * 0.92), (c + s * 0.12, c - s * 0.10),
        (c + s * 0.10, c + s * 0.62), (c, c + s * 0.78),
        (c - s * 0.10, c + s * 0.62), (c - s * 0.12, c - s * 0.10),
    ], fill=255)
    d.polygon([
        (c - s * 0.96, c + s * 0.02), (c, c - s * 0.16),
        (c + s * 0.96, c + s * 0.02), (c + s * 0.88, c + s * 0.16),
        (c, c + s * 0.04), (c - s * 0.88, c + s * 0.16),
    ], fill=255)
    d.polygon([
        (c - s * 0.38, c + s * 0.58), (c, c + s * 0.42),
        (c + s * 0.38, c + s * 0.58), (c + s * 0.28, c + s * 0.70),
        (c, c + s * 0.56), (c - s * 0.28, c + s * 0.70),
    ], fill=255)
    d.ellipse([c - s * 0.10, c - s * 0.98, c + s * 0.10, c - s * 0.72], fill=255)
    return finish(im)


def bomber(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.44
    d.polygon([
        (c, c - s * 0.90), (c + s * 0.14, c - s * 0.20),
        (c + s * 0.12, c + s * 0.70), (c, c + s * 0.86),
        (c - s * 0.12, c + s * 0.70), (c - s * 0.14, c - s * 0.20),
    ], fill=255)
    d.polygon([
        (c - s * 1.00, c - s * 0.02), (c, c - s * 0.22),
        (c + s * 1.00, c - s * 0.02), (c + s * 0.92, c + s * 0.16),
        (c, c + s * 0.04), (c - s * 0.92, c + s * 0.16),
    ], fill=255)
    d.ellipse([c - s * 0.52, c - s * 0.16, c - s * 0.22, c + s * 0.18], fill=255)
    d.ellipse([c + s * 0.22, c - s * 0.16, c + s * 0.52, c + s * 0.18], fill=255)
    d.polygon([
        (c - s * 0.28, c + s * 0.62), (c - s * 0.08, c + s * 0.50),
        (c - s * 0.02, c + s * 0.78), (c - s * 0.22, c + s * 0.86),
    ], fill=255)
    d.polygon([
        (c + s * 0.28, c + s * 0.62), (c + s * 0.08, c + s * 0.50),
        (c + s * 0.02, c + s * 0.78), (c + s * 0.22, c + s * 0.86),
    ], fill=255)
    return finish(im)


def aa_gun(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.ellipse([c - s * 0.46, c + s * 0.22, c + s * 0.46, c + s * 0.62], fill=255)
    d.rounded_rectangle([c - s * 0.20, c - s * 0.08, c + s * 0.20, c + s * 0.34], radius=s * 0.06, fill=255)
    d.polygon([
        (c - s * 0.08, c + s * 0.04), (c - s * 0.02, c - s * 0.86),
        (c + s * 0.14, c - s * 0.86), (c + s * 0.10, c + s * 0.04),
    ], fill=255)
    d.ellipse([c - s * 0.08, c - s * 0.96, c + s * 0.20, c - s * 0.74], fill=255)
    return finish(im)


def factory(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.rectangle([c - s * 0.70, c - s * 0.04, c + s * 0.70, c + s * 0.62], fill=255)
    d.polygon([
        (c - s * 0.70, c - s * 0.04), (c - s * 0.48, c - s * 0.42),
        (c - s * 0.26, c - s * 0.04), (c - s * 0.04, c - s * 0.42),
        (c + s * 0.18, c - s * 0.04), (c + s * 0.40, c - s * 0.42),
        (c + s * 0.62, c - s * 0.04),
    ], fill=255)
    d.rectangle([c + s * 0.28, c - s * 0.78, c + s * 0.48, c - s * 0.04], fill=255)
    d.ellipse([c + s * 0.24, c - s * 0.92, c + s * 0.52, c - s * 0.70], fill=255)
    return finish(im)


def battleship(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.polygon([
        (c - s * 0.98, c + s * 0.06), (c - s * 0.70, c - s * 0.10),
        (c + s * 0.62, c - s * 0.10), (c + s * 0.98, c + s * 0.04),
        (c + s * 0.70, c + s * 0.22), (c - s * 0.70, c + s * 0.22),
    ], fill=255)
    d.rounded_rectangle([c - s * 0.22, c - s * 0.36, c + s * 0.34, c + s * 0.02], radius=s * 0.05, fill=255)
    d.rectangle([c - s * 0.70, c - s * 0.20, c - s * 0.28, c - s * 0.08], fill=255)
    d.rectangle([c + s * 0.36, c - s * 0.20, c + s * 0.78, c - s * 0.08], fill=255)
    d.rectangle([c + s * 0.02, c - s * 0.58, c + s * 0.12, c - s * 0.34], fill=255)
    return finish(im)


def carrier(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.polygon([
        (c - s * 0.96, c + s * 0.04), (c - s * 0.62, c - s * 0.18),
        (c + s * 0.70, c - s * 0.18), (c + s * 0.96, c + s * 0.02),
        (c + s * 0.70, c + s * 0.20), (c - s * 0.70, c + s * 0.20),
    ], fill=255)
    d.rectangle([c - s * 0.58, c - s * 0.14, c + s * 0.62, c + s * 0.14], fill=255)
    d.rounded_rectangle([c + s * 0.28, c - s * 0.08, c + s * 0.58, c + s * 0.22], radius=s * 0.04, fill=255)
    return finish(im)


def submarine(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.ellipse([c - s * 0.96, c - s * 0.16, c + s * 0.96, c + s * 0.28], fill=255)
    d.polygon([(c + s * 0.70, c - s * 0.02), (c + s * 1.02, c - s * 0.22), (c + s * 1.02, c + s * 0.16)], fill=255)
    d.rounded_rectangle([c - s * 0.12, c - s * 0.38, c + s * 0.18, c - s * 0.08], radius=s * 0.04, fill=255)
    d.rectangle([c - s * 0.02, c - s * 0.52, c + s * 0.06, c - s * 0.36], fill=255)
    return finish(im)


def transport(n):
    im = blank(n)
    d = ImageDraw.Draw(im)
    c, s = n / 2, n * 0.42
    d.polygon([
        (c - s * 0.90, c + s * 0.08), (c - s * 0.62, c - s * 0.06),
        (c + s * 0.70, c - s * 0.06), (c + s * 0.92, c + s * 0.10),
        (c + s * 0.62, c + s * 0.28), (c - s * 0.62, c + s * 0.28),
    ], fill=255)
    d.rounded_rectangle([c - s * 0.28, c - s * 0.34, c + s * 0.36, c + s * 0.04], radius=s * 0.05, fill=255)
    d.rectangle([c - s * 0.08, c - s * 0.52, c + s * 0.08, c - s * 0.32], fill=255)
    return finish(im)


def atlas(cells, dest, cols, rows):
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new('RGBA', (cols * CELL, rows * CELL), (0, 0, 0, 0))
    n = CELL * SS
    drawers = {
        'infantry': soldier, 'armour': tank, 'artillery': artillery,
        'fighter': fighter, 'bomber': bomber, 'aaGun': aa_gun, 'factory': factory,
        'battleship': battleship, 'carrier': carrier, 'submarine': submarine,
        'transport': transport,
    }
    for i, name in enumerate(cells):
        col, row = i % cols, i // cols
        piece = drawers[name](n)
        img.paste(piece, (col * CELL, row * CELL), piece)
    img.save(dest, 'PNG')
    print('wrote', dest, img.size)


if __name__ == '__main__':
    atlas(
        ['infantry', 'armour', 'artillery', 'fighter', 'bomber', 'aaGun', 'factory'],
        OUT / 'units-land-plastic.png', 4, 2,
    )
    atlas(
        ['battleship', 'carrier', 'submarine', 'transport'],
        OUT / 'units-naval-plastic.png', 2, 2,
    )
