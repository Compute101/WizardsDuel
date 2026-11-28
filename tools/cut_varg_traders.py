#!/usr/bin/env python3
"""Hollowmere's two Varg traders from Ulfvik (FOLK.hm_furs / hm_fish in js/explore_folk.js): the user's
picture of both on flat green (sprites/folk/source/varg_traders.png), keyed out like the hero figures
(tools/cut_hero_figures.py's key_out / drop_specks), split in two along a hand-fitted seam (`SEAM`), cropped,
768 px tall, facing right, feet on the bottom edge, into sprites/folk/hm_furs.png (Gunnulf, the
furrier, left) and hm_fish.png (Hrafna, the fishwife, right), plus their dialog faces
portraits/small/hm_furs.jpg / hm_fish.jpg (256 px; the square is set by hand in FACES, in pixels of
the 768-tall cut-out).

    python3 tools/cut_varg_traders.py                    # writes the sprites and faces
    python3 tools/cut_varg_traders.py --preview out.png  # both, with their face squares
"""

import os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from cut_hero_figures import key_out, drop_specks

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/folk/source/varg_traders.png')
HEIGHT = 768
ORDER = ['hm_furs', 'hm_fish']  # left to right in the picture
FACES = {'hm_furs': (128, 4, 150), 'hm_fish': (60, 6, 150)}  # (x, y, size) on the cut-out


# The two touch (his coat's shoulder, her elbow), so they're split along a seam fitted by hand:
# (y, x) points in the source picture, joined by straight lines; left of it is Gunnulf.
SEAM = [
    (0, 560),
    (590, 527),
    (620, 533),
    (645, 542),
    (700, 585),
    (800, 590),
    (1000, 560),
    (1100, 552),
    (1200, 535),
    (1240, 535),
    (1300, 600),
    (1536, 600),
]


def seam_x(y):
    for (y0, x0), (y1, x1) in zip(SEAM, SEAM[1:]):
        if y0 <= y <= y1:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return SEAM[-1][1]


def cut():
    im = drop_specks(key_out(Image.open(SRC)))
    figs = []
    for left in (True, False):
        fig = im.copy()
        px = fig.load()
        for y in range(fig.height):
            sx = seam_x(y)
            for x in range(fig.width):
                if (x < sx) != left:
                    px[x, y] = (0, 0, 0, 0)
        fig = drop_specks(fig)
        fig = fig.crop(fig.getbbox())
        fig = fig.resize((round(fig.width * HEIGHT / fig.height), HEIGHT), Image.LANCZOS)
        fig.putalpha(fig.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
        figs.append(fig)
    return figs


def main():
    figs = cut()
    for name, fig in zip(ORDER, figs):
        fig.save(os.path.join(ROOT, 'sprites/folk', name + '.png'), optimize=True)
        x, y, n = FACES[name]
        face = Image.new('RGBA', (n, n), (24, 20, 30, 255))
        face.alpha_composite(fig.crop((x, y, x + n, y + n)))
        face.convert('RGB').resize((256, 256), Image.LANCZOS).save(
            os.path.join(ROOT, 'portraits/small', name + '.jpg'), quality=90
        )
        print(name, fig.size)
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        W = sum(f.width for f in figs) + 20
        sheet = Image.new('RGBA', (W, HEIGHT), (60, 70, 60, 255))
        d = ImageDraw.Draw(sheet)
        x = 0
        for name, f in zip(ORDER, figs):
            sheet.alpha_composite(f, (x, 0))
            fx, fy, n = FACES[name]
            d.rectangle((x + fx, fy, x + fx + n, fy + n), outline=(255, 0, 255, 255), width=3)
            x += f.width + 20
        sheet.convert('RGB').save(out)


if __name__ == '__main__':
    main()
