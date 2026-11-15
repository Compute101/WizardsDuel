#!/usr/bin/env python3
"""Cut the ruined-town tilesets into the packed atlases the Explore map uses:
sprites/ruins/tileset_source.png  → ruins.png  + ruins.json  (town, houses,
                                    plus recoloured houses: STYLES / RECOLOUR)
sprites/ruins/tileset2_source.png → ruins2.png + ruins2.json (river, bridges,
docks, cranes, carts).
sprites/ruins/tileset3_source.png → ruins3.png + ruins3.json (ground transitions:
grass/cobble, grass/dirt, grass shore, stone quay).
sprites/ruins/tileset4_source.png → ruins4 (house backs and sides, tavern, chapel, tower).
sprites/ruins/tileset5_source.png → ruins5 (bridges seen from above).

The source is a loose sheet on a flat dark background, not a grid, so each
piece has a hand-checked rect (RECTS below). The background is removed by a
flood fill from the sheet's edges (dark pixels inside a piece are kept), each
prop is trimmed to its alpha box, everything is shelf-packed into a 1024-wide
atlas and quantised to 256 colours.

    python3 tools/cut_ruins_tileset.py            # writes the atlas + json
    python3 tools/cut_ruins_tileset.py --preview out.png   # labelled sheet
    python3 tools/cut_ruins_tileset.py --sheet 2 --preview out.png

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


# ── sheet 2: river, bridges, docks ──
GX2 = [(14, 121), (127, 231), (239, 348), (350, 461)]
GY2 = [(15, 126), (131, 239), (244, 348)]
GROUND2 = [['cobbleB1', 'cobbleB2', 'cobbleB3', 'cobbleB4'],
           ['planksV', 'planksH', 'planksBroken', 'planksHole'],
           ['grate1', 'cobbleB5', 'grate2', 'cobbleB6']]
RECTS2 = {}
for r, row in enumerate(GROUND2):
    for c, name in enumerate(row):
        x0, x1 = GX2[c]; y0, y1 = GY2[r]
        RECTS2[name] = (x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4)
RECTS2.update({
    'bridgeStone': (814, 17, 351, 158), 'bridgeStoneBroken': (1189, 16, 332, 159),
    'bridgeWood': (817, 186, 345, 131), 'bridgeWoodBroken': (1190, 186, 331, 131),
    'bridgeBanner': (817, 327, 349, 153), 'bridgeBannerBroken': (1192, 327, 330, 153),
    'stoneArch': (16, 360, 153, 127), 'woodArch': (194, 360, 80, 127), 'brokenArch': (319, 360, 147, 100),
    'canal': (17, 614, 85, 80), 'canal2': (17, 707, 87, 78),
    'crate3': (433, 624, 67, 66), 'crate4': (511, 637, 39, 48), 'crate5': (561, 619, 61, 69),
    'crateBroken': (634, 625, 62, 62), 'crate6': (761, 626, 45, 55), 'crateStand': (830, 619, 75, 78),
    'planks1': (705, 631, 50, 51), 'barrel2': (431, 708, 48, 53), 'barrel3': (489, 701, 51, 61),
    'barrelsBroken': (557, 704, 104, 57), 'sacks': (685, 699, 105, 57), 'planksPile': (812, 707, 85, 49),
    'wagon': (358, 767, 140, 115), 'cart': (505, 784, 123, 83), 'brokenCart': (635, 779, 129, 97),
    'gravel': (759, 770, 54, 30), 'rocks3': (810, 767, 93, 51), 'wheel2': (773, 847, 44, 29), 'barrelBroken': (821, 829, 49, 48),
    'fence2': (19, 909, 97, 38), 'fence3': (18, 961, 118, 44), 'fence4': (152, 906, 86, 40),
    'chainFence1': (275, 897, 120, 50), 'chainFence2': (171, 959, 99, 48),
    'postTall': (416, 898, 31, 107), 'post2': (305, 951, 31, 54), 'postRing': (362, 966, 28, 40),
    'bannerP': (465, 889, 58, 117), 'bannerTorn': (535, 891, 55, 115),
    'lamp2': (613, 892, 55, 115), 'lamp3': (680, 889, 40, 118), 'lamp4': (734, 892, 61, 115),
    'rubble7': (812, 904, 149, 47), 'rubble8': (817, 965, 96, 41), 'rubble9': (930, 939, 88, 64),
    'rubble10': (1027, 959, 61, 46), 'wheel3': (1106, 964, 45, 42), 'planks2': (1168, 947, 99, 58),
    'blocks1': (1284, 938, 92, 67), 'blocks2': (1395, 941, 125, 65),
    'crane': (1005, 773, 177, 164), 'craneBroken1': (1270, 623, 121, 142), 'craneBroken2': (1405, 623, 114, 154),
    'gallowsHook': (1219, 779, 151, 156), 'gallows': (1384, 797, 135, 136),
})
GROUND2_NAMES = {n for row in GROUND2 for n in row}

# ── sheet 3: ground transitions (3x3 edge/corner blocks, each cell scaled to TR px) ──
# Cells are named tr_<set>_<row><col> (row/col 0-2, 1 = centre); the four small
# tiles beside each block are extra outer corners, tr_<set>_alt<row><col>.
TR = 120
def _cells(name, cols, rows, scols, srows):
    out = {}
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            out['tr_%s_%d%d' % (name, r, c)] = (x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2)
    for r, (y0, y1) in enumerate(srows):
        for c, (x0, x1) in enumerate(scols):
            out['tr_%s_alt%d%d' % (name, r * 2, c * 2)] = (x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2)
    return out
RECTS3 = {}
RECTS3.update(_cells('cobble', [(54, 169), (174, 298), (303, 420)], [(88, 210), (216, 339), (345, 460)],
                     [(469, 587), (610, 726)], [(113, 236), (277, 405)]))
RECTS3.update(_cells('dirt', [(797, 912), (917, 1041), (1047, 1164)], [(87, 209), (216, 338), (344, 459)],
                     [(1213, 1329), (1356, 1474)], [(112, 236), (277, 405)]))
RECTS3.update(_cells('shore', [(55, 169), (176, 298), (304, 421)], [(555, 679), (686, 808), (815, 933)],
                     [(470, 587), (613, 728)], [(581, 708), (746, 875)]))
RECTS3.update(_cells('quay', [(798, 913), (920, 1042), (1049, 1166)], [(559, 680), (687, 809), (815, 931)],
                     [(1216, 1332), (1360, 1477)], [(582, 709), (749, 877)]))

# ── sheet 4: building backs and sides, big buildings ──
RECTS4 = {
    'backTerra1': (31, 16, 234, 234), 'backTerra2': (289, 16, 225, 233), 'backSlate': (542, 16, 219, 235),
    'backSlateRuin': (784, 16, 228, 237), 'backPurple': (1042, 16, 225, 234), 'backPurpleRuin': (1288, 27, 226, 228),
    'sideTerra': (240, 284, 179, 206), 'sideSlate': (536, 283, 172, 207), 'sidePurple': (840, 285, 175, 205),
    'sidePurpleRuin': (1113, 289, 195, 201),
    'tavern': (91, 522, 456, 402), 'chapel': (604, 508, 395, 413), 'tower': (1097, 502, 292, 420),
}
# ── sheet 5: bridges seen from above ──
RECTS5 = {
    'bridgeTopStone': (56, 96, 671, 251), 'bridgeTopWood': (816, 101, 664, 244),
    'bridgeTopStoneBroken': (56, 408, 671, 251), 'bridgeTopWoodBroken': (818, 412, 661, 245),
}

SHEETS = {
    '1': dict(src='tileset_source.png', bg=(16, 18, 23), rects=RECTS, ground=GROUND_NAMES, out='ruins', key='1'),
    '2': dict(src='tileset2_source.png', bg=(9, 12, 18), rects=RECTS2, ground=GROUND2_NAMES, out='ruins2', key='2'),
    '4': dict(src='tileset4_source.png', bg=(14, 17, 22), rects=RECTS4, ground=set(), out='ruins4', key='4'),
    '5': dict(src='tileset5_source.png', bg=(14, 16, 22), rects=RECTS5, ground=set(), out='ruins5', key='5'),
    '3': dict(src='tileset3_source.png', bg=(13, 16, 21), rects=RECTS3, ground=set(RECTS3), out='ruins3', key='3', square=TR),
}


# ── recolours: extra variants made from the cut pieces ──
# A style recolours the roof tiles (hue in degrees, saturation and value
# multipliers) and/or tints the grey stone (RGB multipliers, brightness).
# Each listed piece gets a copy named '<piece>_<style>' in the same atlas.
STYLES = {
    'slate': dict(roof=(215, 0.35, 0.85)),                       # blue-grey slate
    'moss':  dict(roof=(95, 0.55, 0.75)),                        # green-glazed tiles
    'sand':  dict(stone=((1.16, 0.98, 0.72), 1.0)),               # terracotta on sandstone
    'dusk':  dict(roof=(275, 0.55, 0.75), stone=((0.85, 0.85, 1.0), 0.72)),   # college purple, dark stone
    'char':  dict(roof=(20, 0.12, 0.55), stone=((0.95, 0.95, 1.0), 0.85)),    # burnt, weathered
    'ash':   dict(whole=(0.32, 0.9, (1.06, 0.98, 0.92), 0.5)),                # burnt ground: grass goes dark ash, stone stays light
    'burnt': dict(roof=(20, 0.12, 0.6), whole=(0.45, 0.74, (1.08, 0.95, 0.86))),  # Cindergate: soot-dark, dead ivy
}
HOUSE_STYLES = ['slate', 'moss', 'sand', 'dusk', 'char']
_TR = ['%d%d' % (r, c) for r in range(3) for c in range(3)] + ['alt00', 'alt02', 'alt20', 'alt22']
RECOLOUR = {
    '1': dict({h: HOUSE_STYLES + ['burnt'] for h in ['house1', 'house2', 'house3', 'house4', 'house5', 'house6']},
              **{g: ['ash'] for g in ['grass', 'grass2', 'dirtGrass', 'flagCracked', 'flagMoss']}),
    '3': {'tr_%s_%s' % (st, c): ['ash'] for st in ['cobble', 'dirt'] for c in _TR},     # Cindergate's streets
    '4': {k: ['burnt'] for k in ['backTerra1', 'backTerra2', 'backSlate', 'backPurple', 'backSlateRuin',
                                'backPurpleRuin', 'sideTerra', 'sideSlate', 'sidePurple', 'sidePurpleRuin',
                                'tavern', 'chapel']},
}


def recolour(c, roof=None, stone=None, whole=None):
    """Roof = saturated red-orange in the top 62% (the brown timbers, doors and
    lit windows are yellower and stay put); stone = the near-grey pixels;
    whole = (saturation, brightness, RGB tint[, brightness for green pixels]) over every pixel, for ground."""
    a = np.array(c).astype(float)
    hsv = np.array(c.convert('RGB').convert('HSV')).astype(float) / 255
    H, S, V = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    yy = np.arange(a.shape[0])[:, None] / a.shape[0]
    out = a.copy()
    if roof:
        hue, sat, val = roof
        m = (a[..., 3] > 0) & ((H < 23) | (H > 340)) & (S > 0.5) & (V > 0.3) & (yy < 0.62)
        hs = hsv.copy()
        hs[..., 0][m] = hue / 360
        hs[..., 1][m] = np.clip(hs[..., 1][m] * sat, 0, 1)
        hs[..., 2][m] = np.clip(hs[..., 2][m] * val, 0, 1)
        rgb = np.array(Image.fromarray((hs * 255).astype(np.uint8), 'HSV').convert('RGB')).astype(float)
        out[..., :3][m] = rgb[m]
    if stone:
        tint, k = stone
        m = (a[..., 3] > 0) & (S < 0.2) & (V > 0.18)
        out[..., :3][m] = np.clip(a[..., :3][m] * np.array(tint) * k, 0, 255)
    if whole:
        sat, val, tint = whole[:3]
        rgb = out[..., :3]
        grey = rgb.mean(2, keepdims=True)
        v = np.full(rgb.shape[:2] + (1,), float(val))
        if len(whole) > 3:                     # grass and moss burn darker than stone
            green = (H > 50) & (H < 160) & (S > 0.25)
            v[green] = whole[3]
        out[..., :3] = np.clip((grey + (rgb - grey) * sat) * v * np.array(tint), 0, 255)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def transparent_sheet(path, bg):
    src = Image.open(path).convert('RGB')
    a = np.array(src).astype(int)
    bgish = np.abs(a - bg).sum(2) < 34
    lab, _ = ndimage.label(bgish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    alpha = np.where(np.isin(lab, list(edge)), 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(src), alpha]), 'RGBA')


def main():
    which = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    for key, sh in SHEETS.items():
        if which and which != key: continue
        cut(sh)


def cut(sh):
    sheet = transparent_sheet(os.path.join(DIR, sh['src']), sh['bg'])
    crops = {}
    for k, (x, y, w, h) in sh['rects'].items():
        c = sheet.crop((x, y, x + w, y + h))
        if k not in sh['ground']:
            c = c.crop(c.getbbox())
        elif sh.get('square'):             # transition cells: every cell the same square size
            c = c.convert('RGB').resize((sh['square'], sh['square']), Image.LANCZOS).convert('RGBA')
        crops[k] = c
    for base, styles in RECOLOUR.get(sh['key'], {}).items():
        for st in styles:
            crops[base + '_' + st] = recolour(crops[base], **STYLES[st])
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        W = 1800; img = Image.new('RGB', (W, 2600), (200, 60, 200)); d = ImageDraw.Draw(img)
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
    atlas.save(os.path.join(DIR, sh['out'] + '.png'), optimize=True)
    with open(os.path.join(DIR, sh['out'] + '.json'), 'w') as f:
        json.dump(pos, f, separators=(',', ':'))
    print(sh['out'], W, 'x', y + rh, '-', len(pos), 'pieces')


if __name__ == '__main__':
    main()
