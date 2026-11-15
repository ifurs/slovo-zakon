"""Draw the app icons (the game's hedgehog sprite on the board colour).

    python3 tools/make-icons.py      # writes icons/*.png

The hedgehog follows SPRITES.hedgehog in src/render.js (a 100x100 sprite box centred on 0,0).
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'icons'
SS = 4  # supersampling for smooth edges

BG = (26, 31, 41)        # --board
TILE = (255, 216, 77)    # --accent (ТИ / ПЕРЕМОГА yellow)


def quad(p0, p1, p2, n=24):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
            for t in (i / n for i in range(n + 1))]


def hedgehog(d, cx, cy, size):
    s = size / 100

    def P(x, y):
        return (cx + x * s, cy + y * s)

    def ell(x, y, rx, ry, fill):
        d.ellipse([P(x - rx, y - ry), P(x + rx, y + ry)], fill=fill)

    spikes = []
    for i in range(10):
        a = math.pi + (i / 9) * math.pi * 1.05 - 0.1
        r = 44 if i % 2 else 30
        spikes.append(P(math.cos(a) * r - 6, math.sin(a) * r * 0.85 + 10))
    spikes += [P(18, 26), P(-34, 26)]
    d.polygon(spikes, fill=(107, 66, 38))
    ell(-4, 12, 32, 20, (139, 90, 51))
    face = quad((12, -6), (30, -2), (42, 14)) + quad((42, 14), (30, 28), (10, 28)) + quad((10, 28), (2, 12), (12, -6))
    d.polygon([P(x, y) for x, y in face], fill=(240, 210, 168))
    ell(42, 13, 5, 5, (27, 27, 27))
    ell(22, 6, 3.6, 4.2, (27, 27, 27))
    ell(24, 18, 4, 4, (243, 170, 190))
    ell(-16, 32, 7, 4, (74, 46, 26))
    ell(10, 32, 7, 4, (74, 46, 26))


def icon(px, pad, rounded):
    n = px * SS
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=n * 0.22, fill=BG)
    else:
        d.rectangle([0, 0, n, n], fill=BG)
    # a soft yellow "ТИ" glow disc behind the hedgehog
    r = n * (0.5 - pad) * 0.92
    d.ellipse([n / 2 - r, n / 2 - r, n / 2 + r, n / 2 + r], fill=(40, 46, 60))
    hedgehog(d, n / 2 + n * 0.02, n / 2 - n * 0.04, n * (1 - 2 * pad) * 1.05)
    # small yellow underline, like a rule tile edge
    w = n * 0.34
    d.rounded_rectangle([n / 2 - w / 2, n * (1 - pad) - n * 0.035, n / 2 + w / 2, n * (1 - pad)], radius=n * 0.02, fill=TILE)
    return img.resize((px, px), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
icon(192, 0.1, True).save(OUT / 'icon-192.png', optimize=True)
icon(512, 0.1, True).save(OUT / 'icon-512.png', optimize=True)
icon(512, 0.2, False).save(OUT / 'maskable-512.png', optimize=True)   # safe zone for Android masks
icon(180, 0.12, False).save(OUT / 'apple-touch-icon.png', optimize=True)  # iOS rounds it itself
icon(64, 0.06, True).save(OUT / 'favicon-64.png', optimize=True)
print('icons written to', OUT)
