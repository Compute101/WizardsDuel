#!/usr/bin/env python3
"""Cut the user's ship pictures (sprites/ships/source/<ship>_<view>.png, each on a flat near-black
background) into sprites/ships/<ship>_<view>.png and sprites/ships/ships.json.

Each ship has five views; mirroring the side and three-quarter views gives the eight headings
(js/sailing.js, HEADINGS):
    side           bow to the right            east  (mirrored: west)
    bow            bow toward the viewer       south
    stern          stern toward the viewer     north
    quarter_near   bow to the left, near       south-west (mirrored: south-east)
    quarter_away   stern near, bow away        varg: north-west, merchant: north-east (FLIP_AWAY)

The background is grown in from the edges through near-black pixels; enclosed patches of background
(the holes torn in the Varg sails, the gaps in the rigging) go too when they're big enough and close to
the background's colour. WL is where the water meets the hull, as a fraction of the cut picture's
height (set by eye: python3 tools/cut_ships.py --preview out.png draws it as a blue line).

    python3 tools/cut_ships.py [--preview out.png]
"""

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'sprites/ships/source'
OUT = ROOT / 'sprites/ships'
HEIGHT = 520  # cut pictures are scaled to this height

SHIPS = ['merchant', 'varg']
VIEWS = ['side', 'bow', 'stern', 'quarter_near', 'quarter_away']
# the merchant's stern-near picture has its bow to the right (heading north-east), the Varg's to the left
FLIP_AWAY = {'merchant': 'ne', 'varg': 'nw'}
# where the water meets the hull (fraction of the cut height from the top), by eye
WL = {
    'merchant': {'side': 0.86, 'bow': 0.84, 'stern': 0.85, 'quarter_near': 0.86, 'quarter_away': 0.86},
    'varg': {'side': 0.87, 'bow': 0.85, 'stern': 0.86, 'quarter_near': 0.87, 'quarter_away': 0.87},
}

BG_TOL = 24  # how far from the background colour a pixel may be and still count as background
HOLE_TOL = 16  # an enclosed patch must be this close to the background colour...
HOLE_MIN = 60  # ...and at least this many pixels


def cut(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    d = np.abs(a - bg).max(axis=2)
    cand = d <= BG_TOL
    seen = np.zeros((h, w), bool)
    out = np.zeros((h, w), bool)

    def grow(sy, sx):
        q = deque([(sy, sx)])
        seen[sy, sx] = True
        pix = []
        edge = False
        while q:
            y, x = q.popleft()
            pix.append((y, x))
            if y in (0, h - 1) or x in (0, w - 1):
                edge = True
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        return pix, edge

    ys, xs = np.nonzero(cand)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        pix, edge = grow(y, x)
        if edge:
            for p in pix:
                out[p] = True
        elif len(pix) >= HOLE_MIN:
            py, px = zip(*pix)
            if d[py, px].mean() <= HOLE_TOL:
                for p in pix:
                    out[p] = True
    alpha = np.where(out, 0, 255).astype(np.uint8)
    rgba = np.dstack([np.asarray(im), alpha])
    oy, ox = np.nonzero(alpha)
    rgba = rgba[oy.min() : oy.max() + 1, ox.min() : ox.max() + 1]
    img = Image.fromarray(rgba, 'RGBA')
    s = HEIGHT / img.height
    return img.resize((max(1, round(img.width * s)), HEIGHT), Image.LANCZOS)


def main():
    meta = {}
    cuts = []
    for ship in SHIPS:
        meta[ship] = {'away': FLIP_AWAY[ship], 'views': {}}
        for v in VIEWS:
            img = cut(SRC / f'{ship}_{v}.png')
            name = f'{ship}_{v}'
            # 256 colours like the tilesets' atlases (a full-colour cut was 300-600 KB a view)
            img.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE).save(
                OUT / f'{name}.png', optimize=True
            )
            meta[ship]['views'][v] = {
                'src': f'sprites/ships/{name}.png',
                'w': img.width,
                'h': img.height,
                'wl': WL[ship][v],
            }
            cuts.append((name, img, WL[ship][v]))
            print(name, img.size)
    (OUT / 'ships.json').write_text(json.dumps(meta, indent=1) + '\n')
    if '--preview' in sys.argv:
        dst = sys.argv[sys.argv.index('--preview') + 1]
        sc = 0.5
        W = int(sum(i.width * sc + 20 for _, i, _ in cuts[:5])) + 20
        sheet = Image.new('RGB', (W, int(2 * (HEIGHT * sc + 40))), (40, 90, 120))
        dr = ImageDraw.Draw(sheet)
        for row in range(2):
            x = 10
            for name, img, wl in cuts[row * 5 : row * 5 + 5]:
                t = img.resize((int(img.width * sc), int(img.height * sc)))
                y = 20 + row * int(HEIGHT * sc + 40)
                sheet.paste(t, (x, y), t)
                dr.line(
                    [(x, y + wl * t.height), (x + t.width, y + wl * t.height)], fill=(80, 200, 255), width=2
                )
                dr.text((x, y - 16), name, fill=(255, 255, 255))
                x += t.width + 20
        sheet.save(dst)


if __name__ == '__main__':
    main()
