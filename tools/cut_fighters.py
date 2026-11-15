#!/usr/bin/env python3
"""Cut the Survival fighters' battle stills from the artist's sheets.

Sources in sprites/fighters/source/ (flat black background, facing right, a black
outline round the figure and a loose dashed halo outside it). The figure's
silhouette is its coloured pixels, minus specks (the halo), closed by CLOSE px so
the black outline and inner lines stay part of it; background is what's left
joined to the border, plus any hole wide enough to be daylight (between bow and
string, between the legs). Cropped with the feet on the bottom edge and scaled to
768 px tall, like the character stills, and writes the HUD faces (`FACES`).

    python3 tools/cut_fighters.py
"""
import os
from collections import deque
from PIL import Image, ImageFilter, ImageDraw, ImageChops

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites', 'fighters', 'source')
OUT = os.path.join(ROOT, 'sprites')
CUTS = {                       # source -> output still
    'soldier.png': 'soldier.png',        # sword and shield (Shield Wall)
    'archer.png': 'archer.png',
    'halberdier.png': 'halberdier.png',  # Thessaly's hired bodyguards
}
DARK = 22        # max channel at or below this is black (background or outline)
SPECK = 600      # coloured bits smaller than this are the halo, not the figure
CLOSE = 9        # closing size: black lines up to about this wide stay in the figure
HOLE = 25        # an enclosed black patch that survives a min-filter this wide is daylight
HEIGHT = 768
FACES = {        # HUD face (portraits/small/<key>.jpg): x, y, size in the 768-tall still
    'soldier': (248, 50, 135),
    'archer': (205, 82, 135),
    'halberdier': (200, 72, 140),
}
PAD = 6

def drop_specks(m, w, h):
    mp, seen = m.load(), bytearray(w * h)
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or not mp[x0, y0]:
                continue
            seen[y0 * w + x0] = 1
            comp, q = [], deque([(x0, y0)])
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and mp[nx, ny]:
                        seen[ny * w + nx] = 1; q.append((nx, ny))
            if len(comp) < SPECK:
                for p in comp:
                    mp[p] = 0

def cut(src, dst):
    im = Image.open(os.path.join(SRC, src)).convert('RGBA')
    w, h = im.size
    r, g, b, a = im.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    fg = ImageChops.multiply(mx.point(lambda v: 255 if v > DARK else 0),
                             a.point(lambda v: 255 if v >= 40 else 0))
    drop_specks(fg, w, h)
    fg = fg.filter(ImageFilter.MaxFilter(CLOSE)).filter(ImageFilter.MinFilter(CLOSE))
    bg = ImageChops.invert(fg)                    # 255 = black, not yet decided
    seeds = bg.filter(ImageFilter.MinFilter(HOLE)).load()
    bp = bg.load()
    starts = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + \
             [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    starts += [(x, y) for y in range(0, h, 4) for x in range(0, w, 4) if seeds[x, y] == 255]
    for s in starts:
        if bp[s] == 255:
            ImageDraw.floodfill(bg, s, 128)
    alpha = bg.point(lambda v: 0 if v == 128 else 255)
    im.putalpha(ImageChops.multiply(alpha, a))
    l, t, rr, bb = alpha.getbbox()
    im = im.crop((max(0, l - PAD), max(0, t - PAD), min(w, rr + PAD), bb))   # feet on the bottom edge
    s = HEIGHT / im.height
    im = im.resize((round(im.width * s), HEIGHT), Image.LANCZOS)
    im.save(os.path.join(OUT, dst), optimize=True)
    print(dst, im.size)
    key = os.path.splitext(dst)[0]
    if key in FACES:
        x, y, n = FACES[key]
        face = Image.new('RGBA', (n, n), (24, 20, 30, 255))
        face.alpha_composite(im.crop((x, y, x + n, y + n)))
        face.convert('RGB').resize((256, 256), Image.LANCZOS).save(
            os.path.join(ROOT, 'portraits', 'small', key + '.jpg'), quality=90)

if __name__ == '__main__':
    for s, d in CUTS.items():
        cut(s, d)
