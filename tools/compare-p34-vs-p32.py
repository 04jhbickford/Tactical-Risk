#!/usr/bin/env python3
"""Build p34 vs p32 mid still side-by-sides + absdiff. Fail closed if wash-family."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
P32 = ROOT / 'briefs/2026-09-17-three-art-gap/qa-loop/p32'
P34 = ROOT / 'briefs/2026-09-17-three-art-gap/qa-loop/p34'


def label(im: Image.Image, text: str) -> Image.Image:
    out = im.copy()
    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    d.rectangle((8, 8, 118, 38), fill=(30, 36, 32, 220))
    d.text((16, 12), text, fill=(232, 226, 212), font=font)
    return out


def pair(a: Path, b: Path, dest: Path):
    left = Image.open(a).convert('RGB')
    right = Image.open(b).convert('RGB')
    if left.size != right.size:
        right = right.resize(left.size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (left.width * 2 + 8, left.height), (20, 22, 20))
    canvas.paste(label(left, 'p32'), (0, 0))
    canvas.paste(label(right, 'p34'), (left.width + 8, 0))
    canvas.save(dest, 'PNG', optimize=True)
    diff = ImageChops.difference(left, right)
    mag = [(p[0] + p[1] + p[2]) / 3 for p in diff.getdata()]
    mean = sum(mag) / len(mag)
    p95 = sorted(mag)[int(len(mag) * 0.95)]
    diff.save(dest.with_name(dest.stem + '-absdiff.png'), 'PNG', optimize=True)
    return mean, p95


def main():
    P34.mkdir(parents=True, exist_ok=True)
    eu_mean, eu_p95 = pair(P32 / 'europe-mid-390.png', P34 / 'europe-mid-390.png', P34 / 'mid-vs-p32.png')
    as_mean, as_p95 = pair(P32 / 'japan-mid-390.png', P34 / 'japan-mid-390.png', P34 / 'asia-mid-vs-p32.png')
    report = {
        'europeAbsdiffMean': round(eu_mean, 2),
        'europeAbsdiffP95': round(eu_p95, 2),
        'asiaAbsdiffMean': round(as_mean, 2),
        'asiaAbsdiffP95': round(as_p95, 2),
    }
    print(report)
    # Fail closed if the mid still is still the same slight wash.
    if eu_mean < 12:
        raise SystemExit(f'P34 fail-closed: Europe absdiff mean {eu_mean:.1f} is wash-family vs p32')
    if as_mean < 8:
        raise SystemExit(f'P34 fail-closed: Asia absdiff mean {as_mean:.1f} is wash-family vs p32')


if __name__ == '__main__':
    main()
