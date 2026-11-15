#!/usr/bin/env python3
"""Cut the ruined-town tileset (sprites/ruins/tileset_source.png) into the
packed atlas the Explore map uses (sprites/ruins/ruins.png + ruins.json).

The source is a loose sheet on a flat dark background, not a grid, so each
piece has a hand-checked rect (RECTS below). The background is removed by a
flood fill from the sheet's edges (dark pixels inside a piece are kept), each
prop is trimmed to its alpha box, everything is shelf-packed into a 1024-wide
atlas and quantised to 256 colours.

    python3 tools/cut_ruins_tileset.py            # writes the atlas + json
    python3 tools/cut_ruins_tileset.py --preview out.png   # labelled sheet

js/explore.js loads ruins.json at runtime; window and lantern light spots
(LIGHTS there) are in each piece's trimmed-crop pixels. Needs Pillow, numpy
and scipy.
"""
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, '..', 'sprites', 'ruins')
SRC = os.path.join(DIR, 'tileset_source.png')
BG = (16, 18, 23)

# Ground tiles: a 4 x 5 grid in the sheet's top-left corner.
GX = [(20, 123), (130, 234), (241, 345), (352, 455)]
GY = [(18, 127), (133, 241), (248, 354), (360, 466), (473, 584)]
GROUND = [['cobble', 'cobbleMoss1', 'cobbleMoss2', 'cobbleMoss3'],
          ['cobbleMoss4', 'cobbleMoss5', 'grass', 'grassCobble'],
          ['grass2', 'dirt', 'dirtGrass', 'cobbleMoss6'],
          ['cobble2', 'cobble3', 'cobbleRound', 'cobble4'],
          ['cobble5', 'cobbleMoss7', 'flagMoss', 'flagCracked']]

RECTS = {}
for r, row in enumerate(GROUND):
    for c, name in enumerate(row):
        x0, x1 = GX[c]; y0, y1 = GY[r]
        RECTS[name] = (x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4)
PROPS = {
    'house1': (811, 13, 220, 267), 'house2': (1053, 17, 219, 265), 'house3': (1295, 14, 221, 265),
    'house4': (801, 299, 229, 263), 'house5': (1038, 306, 238, 258), 'house6': (1300, 312, 222, 254),
    'door': (24, 606, 93, 111), 'window1': (141, 606, 53, 73), 'window2': (220, 606, 55, 73),
    'pillar1': (301, 606, 50, 122), 'arch': (374, 604, 160, 125), 'pillar2': (556, 606, 50, 122),
    'pillar3': (633, 605, 50, 122), 'rubble1': (704, 611, 119, 90), 'rubble2': (847, 597, 158, 105),
    'rubble3': (1029, 596, 178, 107), 'rubble4': (1228, 599, 131, 103), 'banner': (1398, 589, 106, 215),
    'lowwall': (45, 739, 97, 61), 'crate1': (180, 730, 91, 79), 'crate2': (293, 747, 66, 64),
    'barrel': (380, 749, 61, 71), 'rocks1': (468, 761, 93, 64), 'rocks2': (576, 760, 136, 58),
    'fence': (737, 729, 87, 74), 'rubble5': (849, 739, 116, 63), 'brokenFence': (992, 724, 86, 70),
    'rubble6': (1101, 733, 96, 67), 'logs': (1219, 722, 81, 85), 'wheel': (1320, 723, 65, 65),
    'tree': (11, 824, 152, 177), 'deadtree': (184, 830, 130, 167), 'stone': (360, 883, 83, 42),
    'stump': (313, 930, 90, 54), 'flowerbush': (455, 911, 110, 85), 'bush': (574, 866, 100, 88),
    'lamppost': (693, 831, 104, 166), 'post': (825, 827, 75, 150), 'brokenStatue': (900, 869, 86, 111),
    'statue': (1026, 812, 83, 172), 'shrine': (1134, 859, 88, 125), 'ruinWall1': (1252, 839, 131, 148),
    'ruinWall2': (1410, 839, 111, 144), 'wallLow1': (492, 523, 155, 64), 'wallLow2': (674, 527, 104, 60),
}
RECTS.update(PROPS)
GROUND_NAMES = {n for row in GROUND for n in row}


def transparent_sheet():
    src = Image.open(SRC).convert('RGB')
    a = np.array(src).astype(int)
    bgish = np.abs(a - BG).sum(2) < 34
    lab, _ = ndimage.label(bgish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    alpha = np.where(np.isin(lab, list(edge)), 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(src), alpha]), 'RGBA')


def main():
    sheet = transparent_sheet()
    crops = {}
    for k, (x, y, w, h) in RECTS.items():
        c = sheet.crop((x, y, x + w, y + h))
        if k not in GROUND_NAMES:
            c = c.crop(c.getbbox())
        crops[k] = c
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        W = 1800; img = Image.new('RGB', (W, 1400), (200, 60, 200)); d = ImageDraw.Draw(img)
        x = y = 10; rh = 0
        for k, c in crops.items():
            w, h = c.size
            if x + w + 10 > W: x = 10; y += rh + 24; rh = 0
            img.paste(c, (x, y), c); d.text((x, y + h + 2), k, fill=(0, 0, 0)); x += w + 10; rh = max(rh, h)
        img.crop((0, 0, W, y + rh + 30)).save(out); print('preview ->', out); return
    order = sorted(crops, key=lambda k: -crops[k].size[1])
    W = 1024; x = y = rh = 0; pos = {}
    for k in order:
        w, h = crops[k].size
        if x + w > W: x = 0; y += rh + 2; rh = 0
        pos[k] = [x, y, w, h]; x += w + 2; rh = max(rh, h)
    atlas = Image.new('RGBA', (W, y + rh), (0, 0, 0, 0))
    for k, (x, y, w, h) in pos.items():
        atlas.paste(crops[k], (x, y))
    atlas = atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    atlas.save(os.path.join(DIR, 'ruins.png'), optimize=True)
    with open(os.path.join(DIR, 'ruins.json'), 'w') as f:
        json.dump(pos, f, separators=(',', ':'))
    print('atlas', W, 'x', y + rh, '-', len(pos), 'pieces')


if __name__ == '__main__':
    main()
