#!/usr/bin/env python3
"""Cut the Echo sheets (sprites/echoes/source/<element>.png: a weak Echo on the left, a strong
one on the right, on a flat dark background) into battle sprites:
sprites/echoes/<element>_weak.png and <element>_strong.png, trimmed, feet on the bottom edge,
at most 768 px tall like the character stills.

The background is flood-filled out from the sheet's edges; its rim gets a soft alpha from how
far each pixel is from the background colour, so glows and sparks fade out instead of keeping
a dark halo. The two figures are split at the emptiest column between them.

    python3 tools/cut_echoes.py                 # every sheet
    python3 tools/cut_echoes.py --preview out.png
Needs Pillow, numpy and scipy.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, '..', 'sprites', 'echoes')
ELEMENTS = ['fire', 'water', 'earth', 'lightning', 'ice', 'air', 'arcane', 'dark']


def matte(rgb):
    a = rgb.astype(int)
    h, w, _ = a.shape
    corners = np.array([a[2, 2], a[2, w - 3], a[h - 3, 2], a[h - 3, w - 3]])
    bg = np.median(corners, axis=0)
    d = np.abs(a - bg).sum(2)
    lab, _ = ndimage.label(d < 42)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(edge))
    alpha = np.where(outside, np.clip((d - 8) / 34.0, 0, 1), 1.0)
    alpha[d < 10] = 0
    return (alpha * 255).astype(np.uint8), d


def cut(el):
    src = Image.open(os.path.join(DIR, 'source', el + '.png')).convert('RGB')
    rgb = np.array(src)
    alpha, d = matte(rgb)
    w = rgb.shape[1]
    # split between the figures: the emptiest column in the middle band
    solid = (alpha > 128).sum(0).astype(float)
    smooth = np.convolve(solid, np.ones(25) / 25, mode='same')
    lo, hi = int(w * 0.33), int(w * 0.58)
    split = lo + int(np.argmin(smooth[lo:hi]))
    out = {}
    for name, (x0, x1) in (('weak', (0, split)), ('strong', (split, w))):
        a = alpha[:, x0:x1]
        ys, xs = np.nonzero(a > 40)
        if not len(xs): raise SystemExit(el + ': nothing found in ' + name)
        # trim to the figure, ignoring lone specks far below the feet
        y0, y1 = ys.min(), ys.max() + 1
        bx0, bx1 = xs.min(), xs.max() + 1
        img = np.dstack([rgb[y0:y1, x0 + bx0:x0 + bx1], a[y0:y1, bx0:bx1]])
        im = Image.fromarray(img, 'RGBA')
        # battle stills are 768 px tall (the character sprites); the weak Echo is drawn smaller in game
        if im.height > 768:
            im = im.resize((round(im.width * 768 / im.height), 768), Image.LANCZOS)
        im.save(os.path.join(DIR, '%s_%s.png' % (el, name)), optimize=True)
        out[name] = im
    return out, split


def main():
    which = [a for a in sys.argv[1:] if a in ELEMENTS] or ELEMENTS
    res = {}
    for el in which:
        res[el], split = cut(el)
        print('%-10s split at %4d  weak %s  strong %s' % (el, split, res[el]['weak'].size, res[el]['strong'].size))
    if '--preview' in sys.argv:
        H = 300
        tiles = [im.resize((max(1, im.width * H // im.height), H)) for el in which for im in res[el].values()]
        sheet = Image.new('RGBA', (sum(t.width + 8 for t in tiles), H), (60, 70, 60, 255))
        x = 0
        for t in tiles: sheet.alpha_composite(t, (x, 0)); x += t.width + 8
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])


if __name__ == '__main__':
    main()
