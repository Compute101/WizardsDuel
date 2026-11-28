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
sprites/ruins/tileset6..9_source.png → ruins6..9 (each sector's own pieces, two sectors a sheet).
sprites/ruins/tileset10..13_source.png → ruins10..13 (interiors: floors and walls, furniture, special rooms, loot).
sprites/ruins/tileset14..23_source.png → ruins14..23 (inner districts: town props, the Wound, then one sheet a district).

The source is a loose sheet on a flat dark background, not a grid, so each
piece has a hand-checked rect (RECTS below). The background is removed by a
flood fill from the sheet's edges (dark pixels inside a piece are kept), each
prop is trimmed to its alpha box, everything is shelf-packed into a 1024-wide
atlas and quantised to 256 colours.

    python3 tools/cut_ruins_tileset.py            # writes the atlas + json
    python3 tools/cut_ruins_tileset.py --preview out.png   # labelled sheet
    python3 tools/cut_ruins_tileset.py --sheet 2 --preview out.png
    python3 tools/cut_ruins_tileset.py --sheet sectors   # just the sector palettes (PALETTES)

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
GROUND = [
    ['cobble', 'cobbleMoss1', 'cobbleMoss2', 'cobbleMoss3'],
    ['cobbleMoss4', 'cobbleMoss5', 'grass', 'grassCobble'],
    ['grass2', 'dirt', 'dirtGrass', 'cobbleMoss6'],
    ['cobble2', 'cobble3', 'cobbleRound', 'cobble4'],
    ['cobble5', 'cobbleMoss7', 'flagMoss', 'flagCracked'],
]

RECTS = {}
for r, row in enumerate(GROUND):
    for c, name in enumerate(row):
        x0, x1 = GX[c]
        y0, y1 = GY[r]
        RECTS[name] = (x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4)
PROPS = {
    'house1': (811, 13, 220, 267),
    'house2': (1053, 17, 219, 265),
    'house3': (1295, 14, 221, 265),
    'house4': (801, 299, 229, 263),
    'house5': (1038, 306, 238, 258),
    'house6': (1300, 312, 222, 254),
    'door': (24, 606, 93, 111),
    'window1': (141, 606, 53, 73),
    'window2': (220, 606, 55, 73),
    'pillar1': (301, 606, 50, 122),
    'arch': (374, 604, 160, 125),
    'pillar2': (556, 606, 50, 122),
    'pillar3': (633, 605, 50, 122),
    'rubble1': (704, 611, 119, 90),
    'rubble2': (847, 597, 158, 105),
    'rubble3': (1029, 596, 178, 107),
    'rubble4': (1228, 599, 131, 103),
    'banner': (1398, 589, 106, 215),
    'lowwall': (45, 739, 97, 61),
    'crate1': (180, 730, 91, 79),
    'crate2': (293, 747, 66, 64),
    'barrel': (380, 749, 61, 71),
    'rocks1': (468, 761, 93, 64),
    'rocks2': (576, 760, 136, 58),
    'fence': (737, 729, 87, 74),
    'rubble5': (849, 739, 116, 63),
    'brokenFence': (992, 724, 86, 70),
    'rubble6': (1101, 733, 96, 67),
    'logs': (1219, 722, 81, 85),
    'wheel': (1320, 723, 65, 65),
    'tree': (11, 824, 152, 177),
    'deadtree': (184, 830, 130, 167),
    'stone': (360, 883, 83, 42),
    'stump': (313, 930, 90, 54),
    'flowerbush': (455, 911, 110, 85),
    'bush': (574, 866, 100, 88),
    'lamppost': (693, 831, 104, 166),
    'post': (825, 827, 75, 150),
    'brokenStatue': (900, 869, 86, 111),
    'statue': (1026, 812, 83, 172),
    'shrine': (1134, 859, 88, 125),
    'ruinWall1': (1252, 839, 131, 148),
    'ruinWall2': (1410, 839, 111, 144),
    'wallLow1': (492, 523, 155, 64),
    'wallLow2': (674, 527, 104, 60),
}
RECTS.update(PROPS)
GROUND_NAMES = {n for row in GROUND for n in row}


# ── sheet 2: river, bridges, docks ──
GX2 = [(14, 121), (127, 231), (239, 348), (350, 461)]
GY2 = [(15, 126), (131, 239), (244, 348)]
GROUND2 = [
    ['cobbleB1', 'cobbleB2', 'cobbleB3', 'cobbleB4'],
    ['planksV', 'planksH', 'planksBroken', 'planksHole'],
    ['grate1', 'cobbleB5', 'grate2', 'cobbleB6'],
]
RECTS2 = {}
for r, row in enumerate(GROUND2):
    for c, name in enumerate(row):
        x0, x1 = GX2[c]
        y0, y1 = GY2[r]
        RECTS2[name] = (x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4)
RECTS2.update(
    {
        'bridgeStone': (814, 17, 351, 158),
        'bridgeStoneBroken': (1189, 16, 332, 159),
        'bridgeWood': (817, 186, 345, 131),
        'bridgeWoodBroken': (1190, 186, 331, 131),
        'bridgeBanner': (817, 327, 349, 153),
        'bridgeBannerBroken': (1192, 327, 330, 153),
        'stoneArch': (16, 360, 153, 127),
        'woodArch': (194, 360, 80, 127),
        'brokenArch': (319, 360, 147, 100),
        'canal': (17, 614, 85, 80),
        'canal2': (17, 707, 87, 78),
        'crate3': (433, 624, 67, 66),
        'crate4': (511, 637, 39, 48),
        'crate5': (561, 619, 61, 69),
        'crateBroken': (634, 625, 62, 62),
        'crate6': (761, 626, 45, 55),
        'crateStand': (830, 619, 75, 78),
        'planks1': (705, 631, 50, 51),
        'barrel2': (431, 708, 48, 53),
        'barrel3': (489, 701, 51, 61),
        'barrelsBroken': (557, 704, 104, 57),
        'sacks': (685, 699, 105, 57),
        'planksPile': (812, 707, 85, 49),
        'wagon': (358, 767, 140, 115),
        'cart': (505, 784, 123, 83),
        'brokenCart': (635, 779, 129, 97),
        'gravel': (759, 770, 54, 30),
        'rocks3': (810, 767, 93, 51),
        'wheel2': (773, 847, 44, 29),
        'barrelBroken': (821, 829, 49, 48),
        'fence2': (19, 909, 97, 38),
        'fence3': (18, 961, 118, 44),
        'fence4': (152, 906, 86, 40),
        'chainFence1': (275, 897, 120, 50),
        'chainFence2': (171, 959, 99, 48),
        'postTall': (416, 898, 31, 107),
        'post2': (305, 951, 31, 54),
        'postRing': (362, 966, 28, 40),
        'bannerP': (465, 889, 58, 117),
        'bannerTorn': (535, 891, 55, 115),
        'lamp2': (613, 892, 55, 115),
        'lamp3': (680, 889, 40, 118),
        'lamp4': (734, 892, 61, 115),
        'rubble7': (812, 904, 149, 47),
        'rubble8': (817, 965, 96, 41),
        'rubble9': (930, 939, 88, 64),
        'rubble10': (1027, 959, 61, 46),
        'wheel3': (1106, 964, 45, 42),
        'planks2': (1168, 947, 99, 58),
        'blocks1': (1284, 938, 92, 67),
        'blocks2': (1395, 941, 125, 65),
        'crane': (1005, 773, 177, 164),
        'craneBroken1': (1270, 623, 121, 142),
        'craneBroken2': (1405, 623, 114, 154),
        'gallowsHook': (1219, 779, 151, 156),
        'gallows': (1384, 797, 135, 136),
    }
)
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
RECTS3.update(
    _cells(
        'cobble',
        [(54, 169), (174, 298), (303, 420)],
        [(88, 210), (216, 339), (345, 460)],
        [(469, 587), (610, 726)],
        [(113, 236), (277, 405)],
    )
)
RECTS3.update(
    _cells(
        'dirt',
        [(797, 912), (917, 1041), (1047, 1164)],
        [(87, 209), (216, 338), (344, 459)],
        [(1213, 1329), (1356, 1474)],
        [(112, 236), (277, 405)],
    )
)
RECTS3.update(
    _cells(
        'shore',
        [(55, 169), (176, 298), (304, 421)],
        [(555, 679), (686, 808), (815, 933)],
        [(470, 587), (613, 728)],
        [(581, 708), (746, 875)],
    )
)
RECTS3.update(
    _cells(
        'quay',
        [(798, 913), (920, 1042), (1049, 1166)],
        [(559, 680), (687, 809), (815, 931)],
        [(1216, 1332), (1360, 1477)],
        [(582, 709), (749, 877)],
    )
)

# ── sheet 4: building backs and sides, big buildings ──
RECTS4 = {
    'backTerra1': (31, 16, 234, 234),
    'backTerra2': (289, 16, 225, 233),
    'backSlate': (542, 16, 219, 235),
    'backSlateRuin': (784, 16, 228, 237),
    'backPurple': (1042, 16, 225, 234),
    'backPurpleRuin': (1288, 27, 226, 228),
    'sideTerra': (240, 284, 179, 206),
    'sideSlate': (536, 283, 172, 207),
    'sidePurple': (840, 285, 175, 205),
    'sidePurpleRuin': (1113, 289, 195, 201),
    'tavern': (91, 522, 456, 402),
    'chapel': (604, 508, 395, 413),
    'tower': (1097, 502, 292, 420),
}
# ── sheet 5: bridges seen from above ──
RECTS5 = {
    'bridgeTopStone': (56, 96, 671, 251),
    'bridgeTopWood': (816, 101, 664, 244),
    'bridgeTopStoneBroken': (56, 408, 671, 251),
    'bridgeTopWoodBroken': (818, 412, 661, 245),
}


# ── sheets 6–9: each sector's own pieces (rects from the sheets' blobs, padded; a floating ruin
#    keeps its shadow, so its base is the shadow and it hangs above the ground) ──
def _pad(r, p=6):
    x, y, w, h = r
    return (max(0, x - p), max(0, y - p), w + 2 * p, h + 2 * p)


RECTS6 = {
    k: _pad(v)
    for k, v in {  # Frostmarket, the Drowned Quarter
        'iceSpire1': (337, 160, 131, 100),
        'iceSpire2': (574, 105, 203, 156),
        'iceSpire3': (876, 16, 293, 252),
        'frostStall': (16, 306, 307, 253),
        'frozenFountain': (345, 288, 274, 271),
        'iceCart': (641, 333, 273, 225),
        'iceWall': (938, 418, 282, 131),
        'snowdrift': (1245, 355, 275, 202),
        'sunkHouse': (16, 655, 294, 277),
        'boat': (328, 731, 214, 182),
        'jetty': (563, 645, 209, 325),
        'nets': (793, 693, 221, 222),
        'figurehead': (1037, 671, 165, 254),
        'moorings': (1243, 761, 278, 138),
    }.items()
}
RECTS7 = {
    k: _pad(v)
    for k, v in {  # the Heights, the Quarry Ward
        'floatRoom': (28, 14, 310, 314),
        'floatStairs': (367, 108, 177, 216),
        'floatRoof': (570, 80, 229, 244),
        'townhouse': (831, 14, 384, 314),
        'gazebo': (1258, 12, 247, 305),
        'weathervane': (137, 344, 105, 173),
        'urn': (348, 368, 114, 137),
        'urnDead': (581, 352, 138, 143),
        'bench': (809, 385, 198, 117),
        'urnBroken': (1095, 376, 175, 137),
        'rockSpire1': (47, 635, 140, 111),
        'rockSpire2': (218, 586, 175, 161),
        'rockSpire3': (420, 511, 254, 238),
        'quarryCrane': (716, 536, 284, 207),
        'stoneYard': (1037, 537, 441, 206),
        'chasm': (40, 792, 563, 193),
        'tiltedHouse': (636, 733, 395, 252),
        'mineCart': (1063, 801, 424, 181),
    }.items()
}
RECTS8 = {
    k: _pad(v)
    for k, v in {  # Spirewatch, the Collegium
        'bellTower': (60, 16, 162, 463),
        'fallenBell': (248, 295, 259, 187),
        'lightningRod': (526, 107, 188, 380),
        'watchTower': (740, 48, 196, 431),
        'glassPatch': (980, 280, 211, 199),
        'bellFrames': (1223, 262, 294, 217),
        'hall': (17, 533, 346, 386),
        'orrery': (377, 609, 215, 308),
        'bookshelves': (609, 633, 241, 287),
        'runeCircle': (865, 649, 217, 274),
        'scholarStatue': (1096, 601, 150, 315),
        'portal': (1264, 559, 261, 358),
    }.items()
}
RECTS9 = {
    k: _pad(v)
    for k, v in {  # Gloamside, Cindergate
        'temple': (18, 21, 348, 445),
        'catacomb': (390, 211, 206, 254),
        'graves': (618, 234, 249, 233),
        'mausoleum': (885, 190, 191, 273),
        'candles': (1095, 280, 195, 183),
        'hoodedShrine': (1309, 154, 211, 312),
        'forge': (17, 483, 346, 426),
        'anvil': (388, 728, 197, 181),
        'slag': (592, 727, 200, 182),
        'bellows': (799, 668, 253, 239),
        'lavaCrack': (1068, 681, 211, 224),
        'swordRack': (1298, 661, 225, 246),
    }.items()
}

# ── sheets 10–13: interiors (floors and walls, furniture, special rooms, loot and lore) ──
_F10 = [
    (133, 44),
    (273, 43),
    (466, 42),
    (606, 43),
    (797, 42),
    (936, 42),
    (1131, 43),
    (1271, 42),
    (132, 185),
    (272, 186),
    (466, 186),
    (606, 186),
    (797, 185),
    (936, 185),
    (1131, 186),
    (1271, 186),
]
_FN = [
    'floorWood1',
    'floorWood2',
    'floorFlag1',
    'floorFlag2',
    'floorTerra1',
    'floorTerra2',
    'floorBroken1',
    'floorBroken2',
    'floorWood3',
    'floorWood4',
    'floorFlag3',
    'floorFlag4',
    'floorTerra3',
    'floorTerra4',
    'floorBroken3',
    'floorBroken4',
]
RECTS10 = {n: (x + 4, y + 4, 124, 124) for n, (x, y) in zip(_FN, _F10)}
RECTS10.update(
    {
        k: _pad(v)
        for k, v in {
            'wallPlaster': (47, 383, 151, 215),
            'wallPlasterWin': (226, 383, 153, 215),
            'wallStone': (406, 383, 151, 215),
            'wallStoneWin': (584, 383, 153, 215),
            'wallPanel': (766, 383, 151, 215),
            'wallCracked': (945, 383, 150, 215),
            'wallHearth': (1125, 383, 358, 233),
            'sidePlaster': (84, 679, 39, 136),
            'sideStone': (183, 678, 44, 137),
            'cornerPlasterL': (296, 679, 75, 136),
            'cornerPlasterR': (424, 680, 73, 135),
            'cornerStoneL': (589, 677, 81, 134),
            'cornerStoneR': (720, 678, 82, 133),
            'wallRubble': (942, 675, 489, 268),
            'frontPlaster': (61, 875, 157, 93),
            'frontStone': (278, 875, 161, 93),
            'frontPlaster2': (491, 875, 127, 93),
            'frontPlaster3': (729, 875, 127, 93),
        }.items()
    }
)
RECTS11 = {
    k: _pad(v)
    for k, v in {
        'bed': (27, 33, 246, 262),
        'cot': (307, 96, 159, 187),
        'diningTable': (494, 54, 306, 231),
        'roundTable': (821, 93, 221, 188),
        'wardrobe': (1077, 23, 186, 258),
        'cupboard': (1300, 18, 206, 269),
        'hearthPot': (26, 325, 352, 234),
        'workbench': (417, 354, 272, 186),
        'spinningWheel': (759, 347, 225, 201),
        'cradle': (1036, 371, 220, 165),
        'rockingChair': (1303, 337, 187, 205),
        'rug': (26, 584, 405, 189),
        'pantry': (469, 578, 285, 206),
        'washtub': (786, 619, 186, 136),
        'brokenTable': (1018, 579, 256, 199),
        'brokenChair': (1324, 592, 153, 171),
        'brokenBed': (242, 788, 425, 212),
        'crockery': (763, 842, 181, 99),
    }.items()
}
RECTS12 = {
    k: _pad(v)
    for k, v in {
        'bookcase': (47, 10, 163, 223),
        'bookcase2': (253, 5, 311, 228),
        'lectern': (598, 48, 161, 179),
        'bookPile': (778, 81, 158, 150),
        'bookLadder': (960, 10, 207, 219),
        'readingDesk': (1205, 7, 265, 246),
        'counter': (52, 244, 444, 181),
        'jarShelf': (544, 240, 304, 186),
        'crystalDisplay': (904, 247, 266, 170),
        'strongbox': (1252, 274, 191, 140),
        'safeHearth': (43, 432, 246, 185),
        'bedrolls': (321, 483, 240, 138),
        'safeTable': (592, 438, 343, 179),
        'weaponRack': (983, 434, 250, 187),
        'barricade': (1268, 425, 208, 197),
        'alembic': (48, 630, 314, 198),
        'cauldron': (394, 628, 148, 188),
        'herbs': (570, 651, 199, 162),
        'wineRack': (806, 630, 314, 185),
        'altar': (1166, 646, 332, 344),
        'stairs': (309, 830, 210, 169),
        'trapdoor': (55, 862, 211, 119),
        'pew': (600, 848, 210, 148),
        'pew2': (837, 852, 227, 150),
    }.items()
}
RECTS13 = {
    k: _pad(v)
    for k, v in {
        'chest': (38, 75, 202, 161),
        'chestOpen': (264, 43, 203, 192),
        'ironBox': (506, 102, 166, 128),
        'coinsS': (710, 152, 122, 61),
        'coinsM': (865, 117, 172, 106),
        'coinsL': (1066, 67, 241, 161),
        'coinSack': (1335, 64, 171, 167),
        'q_fire': (52, 311, 137, 149),
        'q_water': (243, 306, 133, 152),
        'q_ice': (426, 308, 130, 151),
        'q_lightning': (597, 307, 154, 151),
        'q_earth': (786, 309, 143, 151),
        'q_air': (974, 307, 131, 154),
        'q_arcane': (1143, 305, 155, 156),
        'q_dark': (1334, 294, 157, 167),
        'bookOpen': (40, 548, 264, 162),
        'bookClosed': (344, 542, 194, 171),
        'scroll': (582, 554, 175, 142),
        'scrollPinned': (818, 515, 167, 203),
        'letter': (1054, 568, 180, 114),
        'journal': (1293, 537, 174, 196),
        'potionRed': (133, 775, 140, 188),
        'potionBlue': (374, 779, 139, 184),
        'potionGreen': (610, 780, 136, 183),
        'pouch': (866, 789, 177, 174),
        'key': (1141, 798, 218, 141),
    }.items()
}


# ── sheets 14–23: Corvanthe's inner districts (14 town props for every district, 15 the Wound,
#    then one sheet per district). Rects from the sheets' blobs, padded; where pieces crowd each
#    other the sheet is cut 'strict' (every scrap touching the crop's edge goes, bar the piece itself),
#    and ERASE blanks a neighbour sitting inside a crop. Each 3x3 ground set (snow, flooded street,
#    the Wound) is cut like sheet 3's: tr_<set>_<row><col>, scaled to TR.
def _grid(name, xs, ys, inset=5):
    return {
        'tr_%s_%d%d' % (name, r, c): (x0 + inset, y0 + inset, x1 - x0 - 2 * inset, y1 - y0 - 2 * inset)
        for r, (y0, y1) in enumerate(ys)
        for c, (x0, x1) in enumerate(xs)
    }


RECTS14 = {
    k: _pad(v)
    for k, v in {  # town props: signs, carts, washing, wells, cats and crows
        'signTavern': (29, 13, 206, 239),
        'signApothecary': (287, 13, 205, 235),
        'signSmith': (547, 13, 203, 237),
        'signBaker': (794, 13, 208, 239),
        'signBooks': (1054, 13, 203, 253),
        'signTemple': (1307, 13, 207, 247),
        'cratesProduce': (16, 269, 324, 164),
        'sacksGrain': (360, 290, 186, 142),
        'sacksPurple': (566, 291, 176, 125),
        'barrelsTrio': (760, 282, 191, 136),
        'cartLoaded': (971, 278, 274, 155),
        'wagonCovered': (1259, 271, 257, 166),
        'washLine1': (16, 455, 302, 200),
        'washLine2': (334, 461, 318, 198),
        'well': (676, 428, 239, 265),
        'benchBack': (956, 461, 224, 119),
        'noticeBoard': (1239, 446, 278, 231),
        'benchPlain': (964, 597, 211, 78),
        'lanternPost': (23, 668, 129, 171),
        'lanternPostBroken': (190, 673, 110, 164),
        'lanternSmashed': (320, 757, 140, 65),
        'catGinger': (494, 723, 75, 89),
        'catTabby': (610, 713, 103, 95),
        'catBlack': (751, 727, 80, 84),
        'catSleeping': (874, 750, 95, 53),
        'crow1': (1016, 736, 89, 71),
        'crow2': (1130, 728, 93, 77),
        'crowFlying': (1259, 707, 123, 108),
        'crowPerch': (1401, 703, 115, 132),
        'handcartSacks': (14, 846, 236, 162),
        'handcartGreens': (267, 850, 258, 155),
        'barrowStone': (531, 865, 223, 130),
        'cartPotions': (755, 851, 153, 150),
        'crateBooks': (931, 854, 115, 134),
        'tableBooks': (1062, 859, 151, 132),
        'chestOld': (1233, 887, 135, 101),
        'basketApples': (1392, 874, 116, 118),
    }.items()
}
RECTS15 = _grid('wound', [(27, 168), (180, 321), (333, 473)], [(20, 165), (177, 321), (333, 476)], 6)
RECTS15.update(
    {
        k: _pad(v)
        for k, v in {  # the Wound: its ground, drifting rock and houses, a crystal per element
            'floatIsle1': (503, 28, 250, 240),
            'floatIsle2': (770, 88, 180, 185),
            'floatIsle3': (958, 95, 118, 195),
            'floatIsle4': (705, 212, 90, 85),
            'floatHouse1': (500, 325, 320, 388),
            'floatHouse2': (832, 333, 255, 372),
            'floatHouse3': (1088, 450, 212, 276),
            'floatStairway': (1110, 15, 415, 680),
            'crystalFire': (24, 731, 163, 234),
            'crystalWater': (212, 744, 163, 216),
            'crystalIce': (396, 735, 160, 232),
            'crystalLightning': (580, 735, 167, 223),
            'crystalEarth': (771, 745, 164, 214),
            'crystalAir': (964, 745, 165, 215),
            'crystalArcane': (1154, 743, 161, 221),
            'crystalDark': (1347, 724, 171, 236),
        }.items()
    }
)
RECTS16 = {
    k: _pad(v)
    for k, v in {  # Gloamside's inner district: the necropolis
        'cemeteryGate': (23, 15, 414, 265),
        'cemeteryFence': (458, 87, 179, 186),
        'cemeteryWicket': (666, 58, 155, 215),
        'tomb': (880, 13, 287, 279),
        'tombGrand': (1203, 9, 310, 297),
        'grave1': (29, 358, 109, 118),
        'graveCross': (158, 315, 93, 163),
        'grave2': (272, 342, 115, 135),
        'grave3': (409, 342, 101, 137),
        'graveAngel': (525, 318, 114, 161),
        'graveObelisk': (655, 312, 84, 167),
        'graveCross2': (758, 331, 81, 148),
        'graveArch': (852, 324, 133, 159),
        'brazier': (1040, 299, 81, 251),
        'gloomLamp1': (1155, 333, 86, 221),
        'gloomLamp2': (1272, 351, 90, 203),
        'gloomLamp3': (1374, 309, 144, 247),
        'gloomTree1': (12, 490, 345, 268),
        'gloomTree2': (363, 524, 199, 207),
        'gloomStump': (563, 547, 198, 199),
        'crowPost': (792, 524, 154, 234),
        'crowArch': (977, 579, 188, 177),
        'crowRubble': (1192, 617, 182, 139),
        'cryptGate': (12, 733, 580, 282),
        'shadowPool1': (592, 826, 161, 114),
        'shadowPool2': (767, 824, 205, 134),
        'shadowPool3': (962, 800, 265, 180),
        'shadowPool4': (1240, 800, 282, 180),
    }.items()
}
RECTS17 = _grid('snow', [(432, 560), (575, 704), (718, 846)], [(326, 456), (471, 602), (617, 750)])
RECTS17.update(
    {
        k: _pad(v)
        for k, v in {  # Frostmarket's inner district: the winter fair
            'stallStripe': (33, 10, 332, 279),
            'stallFish': (379, 9, 311, 287),
            'stallMeat': (706, 10, 315, 290),
            'frostLamp1': (1041, 10, 121, 292),
            'frostLamp2': (1173, 10, 164, 294),
            'frostLamp3': (1343, 56, 165, 247),
            'iceFountain': (12, 307, 405, 493),
            'iceCrystal1': (883, 309, 221, 184),
            'iceCrystal2': (1120, 352, 137, 129),
            'iceCrystal3': (1283, 386, 107, 91),
            'iceCrystal4': (1414, 417, 75, 59),
            'sledFurs': (893, 497, 289, 151),
            'sled': (1215, 525, 226, 93),
            'iceBarrel1': (47, 810, 226, 188),
            'iceBarrel2': (291, 851, 130, 139),
            'iceBarrel3': (464, 848, 112, 138),
            'furTent': (650, 618, 880, 392),
        }.items()
    }
)
RECTS18 = {
    k: _pad(v)
    for k, v in {  # the Quarry Ward's inner district: the deep cut
        'boulder1': (14, 11, 274, 174),
        'boulder2': (308, 49, 190, 128),
        'boulder3': (520, 80, 161, 93),
        'boulder4': (705, 102, 92, 71),
        'boulder5': (818, 132, 62, 38),
        'railH': (920, 60, 184, 99),
        'railCurve': (1129, 14, 174, 158),
        'railCross': (1337, 13, 184, 177),
        'mineHead': (12, 195, 523, 391),
        'masonBench': (519, 210, 313, 197),
        'grindstone': (873, 219, 336, 185),
        'stonePallet': (1217, 223, 308, 183),
        'crackSmall': (566, 447, 193, 163),
        'crackWide': (777, 425, 295, 210),
        'rift': (1070, 420, 455, 216),
        'scaffold1': (17, 604, 399, 379),
        'scaffold2': (452, 670, 362, 300),
        'giantHead': (846, 654, 677, 339),
    }.items()
}
RECTS19 = _grid('flood', [(1104, 1225), (1243, 1366), (1384, 1508)], [(202, 327), (344, 468), (485, 610)], 4)
RECTS19.update(
    {
        k: _pad(v)
        for k, v in {  # the Drowned Quarter's inner district: the sunken harbour
            'rowboat': (22, 19, 314, 186),
            'rowboatSunk': (346, 14, 281, 190),
            'rowboatWreck': (633, 12, 325, 170),
            'pile1': (998, 10, 142, 177),
            'pilesRope': (1161, 16, 224, 165),
            'pile2': (1406, 44, 111, 137),
            'netFrame1': (20, 228, 322, 262),
            'netFrame2': (352, 235, 229, 260),
            'seaGod': (584, 197, 250, 354),
            'seaMaiden': (847, 210, 230, 345),
            'lobsterPots1': (462, 554, 216, 153),
            'lobsterPots2': (698, 576, 209, 133),
            'lobsterPot': (928, 577, 141, 115),
            'drownedShrine': (12, 478, 622, 522),
            'wreckMarket': (651, 663, 862, 340),
        }.items()
    }
)
RECTS20 = {
    k: _pad(v)
    for k, v in {  # the Collegium's inner district: the old schools
        'flyingBooks': (28, 12, 342, 318),
        'armillary': (180, 35, 612, 435),
        'runeCircleL': (798, 20, 332, 268),
        'runeCircleM': (1144, 68, 204, 173),
        'runeCircleS': (1366, 100, 133, 117),
        'lectureBenches': (820, 298, 573, 278),
        'portalRuin': (11, 482, 493, 496),
        'scholarHeadless': (515, 486, 269, 485),
        'scrollRack': (813, 575, 318, 215),
        'scrollBin': (1208, 577, 214, 203),
        'arcCrystal1': (830, 790, 240, 200),
        'arcCrystal2': (1105, 828, 146, 150),
        'arcCrystal3': (1296, 876, 106, 96),
    }.items()
}
RECTS21 = {
    k: _pad(v)
    for k, v in {  # the Heights' inner district: the drift
        'windmillSails': (15, 10, 372, 392),
        'sail1': (341, 60, 178, 173),
        'sail2': (364, 242, 146, 141),
        'ropeBridge': (541, 33, 570, 173),
        'ropeBridgeBroken': (564, 234, 431, 164),
        'kite1': (1027, 224, 125, 207),
        'kite2': (1152, 162, 146, 272),
        'kite3': (1165, 10, 350, 425),
        'vaneGriffin': (48, 374, 227, 309),
        'vaneBird': (314, 445, 153, 238),
        'vaneSmall': (508, 527, 103, 156),
        'skyRock1': (672, 430, 290, 268),
        'skyRock2': (1010, 477, 162, 205),
        'skyRock3': (1216, 510, 122, 170),
        'skyRock4': (1391, 534, 90, 143),
        'fallenDome': (18, 723, 556, 264),
        'awningPurple': (591, 727, 294, 236),
        'awningCream': (921, 745, 217, 206),
        'awningRed': (1174, 746, 179, 199),
        'bannerFrame': (1385, 732, 123, 207),
    }.items()
}
RECTS22 = {
    k: _pad(v)
    for k, v in {  # Spirewatch's inner district: the conductory
        'rodTall': (77, 21, 124, 289),
        'rodSpire': (257, 50, 102, 262),
        'rodFork': (400, 78, 87, 220),
        'glaze1': (542, 81, 187, 177),
        'glaze2': (775, 80, 187, 177),
        'glaze3': (1006, 79, 187, 178),
        'glaze4': (1238, 78, 186, 178),
        'spireTower': (1172, 255, 300, 445),
        'fallenSpire': (48, 340, 465, 258),
        'coil1': (554, 351, 147, 251),
        'coilBig': (724, 296, 224, 322),
        'coil2': (963, 354, 152, 246),
        'stormLamp1': (62, 622, 89, 336),
        'stormLamp2': (208, 633, 99, 324),
        'stormLamp3': (346, 698, 166, 261),
        'rainBarrel': (587, 669, 202, 284),
        'barrelPlain': (819, 803, 108, 137),
        'cartWrecked': (974, 719, 506, 249),
    }.items()
}
RECTS23 = {
    k: _pad(v)
    for k, v in {  # Cindergate's inner district: the crucible
        'slagHeap1': (30, 19, 329, 174),
        'slagHeap2': (392, 60, 214, 116),
        'slagHeap3': (643, 104, 127, 64),
        'lavaRun': (811, 54, 239, 123),
        'lavaBend': (1094, 30, 179, 167),
        'lavaEnd': (1315, 48, 173, 131),
        'foundry': (18, 191, 555, 320),
        'anvilBlock': (601, 289, 210, 196),
        'bellowsGreat': (830, 234, 308, 245),
        'chainHoist': (1212, 234, 302, 248),
        'oreCart': (24, 572, 219, 195),
        'oreCartHot': (266, 578, 199, 189),
        'crucibleHoist': (506, 523, 275, 251),
        'stallBurnt': (822, 520, 360, 255),
        'lavaWell': (1216, 518, 277, 286),
        'lavaSpring': (31, 828, 266, 156),
        'bannerAnvil': (378, 799, 154, 204),
        'bannerHammers': (586, 799, 138, 204),
        'bannerFlame': (780, 799, 137, 204),
        'bannerAshen': (971, 799, 137, 204),
    }.items()
}
# ── sheet 24: the Undercroft (sewers and culverts under Wrenford). Drawn bigger than sheets 10–13,
#    so every piece is shrunk to their scale (`shrink`: a back wall about 215 px tall, like wallStone);
#    the floors and the channel are ground tiles, squared to sheet 10's 124 px floor tile.
_S24G = {
    'floorSewer': (35, 340, 249, 221),
    'floorSewerWet': (342, 340, 249, 221),
    'sewerChannel': (645, 339, 267, 222),
    'sewerChannelBend': (1240, 339, 250, 222),
}
RECTS24 = {k: (x + 3, y + 3, w - 6, h - 6) for k, (x, y, w, h) in _S24G.items()}
RECTS24.update(
    {
        k: _pad(v, 4)
        for k, v in {
            'sewerWall': (17, 26, 345, 283),
            'sewerWallCrack': (393, 25, 338, 284),
            'sewerWallPipe': (765, 25, 330, 292),
            'sewerWallGrille': (1129, 26, 292, 283),
            'sewerSide': (1450, 23, 66, 289),
            'sewerEdgeL': (978, 338, 75, 223),
            'sewerEdgeR': (1102, 339, 74, 222),
            'sewerLadder': (18, 586, 166, 236),
            'drainGrate': (217, 622, 161, 165),
            'sewerPlank': (419, 592, 196, 227),
            'sewerCrates': (635, 593, 309, 222),
            'crystalChest': (978, 595, 213, 215),
            'ritualCircle': (1228, 592, 289, 225),
            'sewerCandles': (297, 835, 244, 163),
            'ratRun': (646, 899, 148, 67),
            'ratSit': (897, 865, 116, 102),
        }.items()
    }
)

# pieces painted with a dark halo round them (the candles' glow): near-black pixels below this go clear
KNOCK_DARK = {'sewerCandles': 72}
# chalk drawn on the floor: only the pale lines are kept (soft edge), so it lies on any floor
CHALK = {'ritualCircle': (120, 175)}
RECTS25 = {
    k: _pad(v)
    for k, v in {  # the lecture theatre (Wrenford's Examination Schools; js/explore_lecture.js)
        'lt_bench2': (59, 15, 207, 164),
        'lt_bench4': (334, 15, 412, 164),
        'lt_bench6': (809, 14, 675, 165),
        'lt_benchEnd': (41, 222, 98, 177),
        'lt_tier': (185, 299, 417, 62),
        'lt_steps': (634, 212, 207, 196),
        'lt_dais': (898, 215, 588, 191),
        'lt_lectern': (45, 438, 173, 213),
        'lt_demo': (279, 399, 565, 249),
        'lt_board': (920, 425, 272, 236),
        'lt_boardBlank': (1232, 425, 273, 237),
        'lt_dummy': (27, 696, 167, 278),
        'lt_dummyBurnt': (216, 658, 161, 316),
        'lt_dummyFrost': (400, 690, 164, 284),
        'lt_notice': (635, 672, 291, 301),
        'lt_candelabra': (994, 672, 127, 261),
        'lt_chandelier': (1191, 672, 314, 281),
    }.items()
}
RECTS26 = {
    k: _pad(v)
    for k, v in {  # the lecture theatre's back wall
        'lt_wallWindow': (48, 43, 484, 634),
        'lt_wallPlain': (573, 43, 489, 634),
        'lt_wallCrest': (1106, 43, 495, 634),
        'lt_wallPortrait': (1642, 43, 489, 634),
    }.items()
}
# ── sheets 27 and 28: Elfhome, the elves' town in the Moriquende (tools/mapgen/elfhome.js), drawn at the
#    town sheets' scale. 27 is the buildings; 28 the props, three ground tiles (forest floor, grass,
#    mossy flagstones) and the flagstone path's 3x3 edge set (tr_elfpath_<row><col>, squared to TR) ──
RECTS27 = {
    k: _pad(v, 4)
    for k, v in {
        'efHeartTree': (13, 4, 639, 480),
        'efTalan': (665, 10, 325, 448),
        'efHealing': (1020, 62, 469, 301),
        'efWorkshop': (818, 407, 595, 300),
        'efLodge': (90, 487, 629, 221),
        'efBeastLodge': (46, 726, 343, 269),
        'efElders': (414, 736, 430, 265),
        'efCottage1': (876, 720, 296, 271),
        'efCottage2': (1209, 738, 273, 254),
    }.items()
}
RECTS28 = {
    k: _pad(v, 4)
    for k, v in {
        'efWatchTable': (23, 22, 288, 242),
        'efLantern': (341, 15, 108, 222),
        'efLanternCrook': (466, 26, 106, 211),
        'efLanternBlue': (591, 62, 87, 175),
        'efTarget': (715, 58, 138, 169),
        'efBowRack': (877, 32, 178, 193),
        'efHerbRack': (1091, 17, 310, 201),
        'efBeehive': (1406, 92, 116, 123),
        'efRope': (26, 320, 151, 124),
        'efLadders': (192, 275, 287, 158),
        'efSpring': (514, 259, 337, 190),
        'efLog': (878, 288, 349, 141),
        'efFernBig': (1242, 268, 270, 160),
        'efFern1': (13, 475, 197, 135),
        'efFern2': (223, 469, 184, 141),
        'efToadstools1': (421, 501, 142, 109),
        'efToadstools2': (587, 515, 114, 94),
        'efBlossom': (720, 470, 186, 140),
        'efFoxgloves': (920, 442, 155, 167),
        'efStump': (1096, 474, 207, 133),
        'efStone': (1322, 437, 182, 177),
    }.items()
}
_E28G = {'elfFloor': (100, 722, 182, 180), 'elfGrass': (328, 722, 180, 180), 'elfPath': (554, 722, 181, 180)}
RECTS28.update(_E28G)
for _r, (_y0, _y1) in enumerate([(631, 748), (757, 872), (880, 999)]):
    for _c, (_x0, _x1) in enumerate([(866, 982), (991, 1106), (1115, 1231)]):
        RECTS28['tr_elfpath_%d%d' % (_r, _c)] = (_x0 + 1, _y0 + 1, _x1 - _x0 - 2, _y1 - _y0 - 2)

# ── sheets 29 and 30, from the user: Gilden's great buildings (29: the gnome airship at its mooring mast,
#    a merchant palace, a dockside warehouse with its hoist, a galleon moored at a stone stage) and five
#    market stalls (30: cloth, lamps and rope, pies and bread, tools, charms) for Hollowmere's and Gilden's
#    markets. Drawn at about twice the first sheets' scale (KIND_SCALE in js/explore_pieces.js) ──
RECTS29 = {
    k: _pad(v, 4)
    for k, v in {
        'airship': (66, 8, 631, 504),
        'palace': (763, 7, 759, 507),
        'warehouse': (20, 534, 746, 463),
        'galleon': (796, 534, 719, 464),
    }.items()
}
RECTS30 = {
    k: _pad(v, 4)
    for k, v in {
        'stallCloth': (33, 22, 461, 432),
        'stallLamps': (529, 22, 453, 436),
        'stallBakery': (1025, 22, 483, 432),
        'stallTools': (146, 502, 521, 460),
        'stallCharms': (786, 501, 589, 450),
    }.items()
}

# ── sheet 31, from the user: one ship at rest from five sides, each drawn on its own picture
#    (sprites/ruins/ships_source/<piece>.png), laid out on one sheet by `python3 tools/cut_ruins_tileset.py
#    --ships` (SHIP_LAYOUT). shipBow: three-quarter bow, facing left; shipFront: bow-on; shipBack: stern-on;
#    shipStern: three-quarter stern, the stern to the left; shipSide: side-on, the stern to the left. Each hull
#    is cut off at its waterline (WATERLINE, sheet y) so the ship floats on the map's water. ──
SHIP_LAYOUT = [
    ('shipBow', 0, 0, (194, 17, 1118, 1155), 960),
    ('shipFront', 1312, 0, (332, 17, 979, 1151), 1000),
    ('shipBack', 2624, 0, (292, 17, 1019, 1149), 1010),
    ('shipStern', 0, 1199, (318, 18, 1276, 968), 880),
    ('shipSide', 1536, 1199, (160, 17, 1419, 949), 860),
]
# above each deck (sheet y) the ratlines hold specks of the dark background; those are bluish-black, the ship's
# own outlines are brown, so dark pixels with no warmth are knocked out there (`unspeck`)
DECK = {'shipBow': 560, 'shipFront': 560, 'shipBack': 470, 'shipStern': 1199 + 400, 'shipSide': 1199 + 590}
RECTS31 = {n: _pad((x + a, y + b, c - a + 1, d - b + 1), 4) for n, x, y, (a, b, c, d), _ in SHIP_LAYOUT}
WATERLINE = {n: y + w for n, x, y, _, w in SHIP_LAYOUT}


def compose_ships():
    sheet = Image.new('RGB', (3936, 2223), (14, 16, 22))
    for n, x, y, _, _ in SHIP_LAYOUT:
        sheet.paste(Image.open(os.path.join(DIR, 'ships_source', n + '.png')).convert('RGB'), (x, y))
    sheet.save(os.path.join(DIR, 'tileset31_source.png'))
    print('tileset31_source.png composed')


def unspeck(c, deck, top):
    a = np.array(c).astype(int)
    rows = max(0, min(a.shape[0], deck - top))
    r, g, b = a[:rows, :, 0], a[:rows, :, 1], a[:rows, :, 2]
    dark = (np.maximum(np.maximum(r, g), b) < 70) & (r <= b + 6)
    a[:rows, :, 3] = np.where(dark, 0, a[:rows, :, 3])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def sink(c, y, top):
    """cut a hull off at its waterline (sheet y; the crop's top is at sheet y `top`) and darken the last
    rows above it, wet where it meets the water"""
    a = np.array(c).astype(float)
    cut = max(0, min(a.shape[0], y - top))
    a[cut:, :, 3] = 0
    wet = 18
    for i in range(max(0, cut - wet), cut):
        k = 1 - 0.45 * (i - (cut - wet)) / wet
        a[i, :, :3] *= k
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


# a neighbour inside a crop, blanked before the crop is cleaned (sheet coords)
ERASE = {'armillary': [(150, 0, 372, 325)]}

SHEETS = {
    '1': dict(
        src='tileset_source.png', bg=(16, 18, 23), rects=RECTS, ground=GROUND_NAMES, out='ruins', key='1'
    ),
    '2': dict(
        src='tileset2_source.png', bg=(9, 12, 18), rects=RECTS2, ground=GROUND2_NAMES, out='ruins2', key='2'
    ),
    '4': dict(src='tileset4_source.png', bg=(14, 17, 22), rects=RECTS4, ground=set(), out='ruins4', key='4'),
    '5': dict(src='tileset5_source.png', bg=(14, 16, 22), rects=RECTS5, ground=set(), out='ruins5', key='5'),
    '6': dict(
        src='tileset6_source.png',
        bg=(13, 15, 21),
        rects=RECTS6,
        ground=set(),
        out='ruins6',
        key='6',
        clean=True,
    ),
    '7': dict(
        src='tileset7_source.png',
        bg=(14, 16, 22),
        rects=RECTS7,
        ground=set(),
        out='ruins7',
        key='7',
        clean=True,
    ),
    '8': dict(
        src='tileset8_source.png',
        bg=(15, 17, 22),
        rects=RECTS8,
        ground=set(),
        out='ruins8',
        key='8',
        clean=True,
    ),
    '9': dict(
        src='tileset9_source.png',
        bg=(11, 13, 21),
        rects=RECTS9,
        ground=set(),
        out='ruins9',
        key='9',
        clean=True,
    ),
    '10': dict(
        src='tileset10_source.png',
        bg=(14, 16, 24),
        rects=RECTS10,
        ground=set(_FN),
        out='ruins10',
        key='10',
        clean=True,
    ),
    '11': dict(
        src='tileset11_source.png',
        bg=(13, 15, 21),
        rects=RECTS11,
        ground=set(),
        out='ruins11',
        key='11',
        clean=True,
    ),
    '12': dict(
        src='tileset12_source.png',
        bg=(12, 15, 22),
        rects=RECTS12,
        ground=set(),
        out='ruins12',
        key='12',
        clean=True,
    ),
    '13': dict(
        src='tileset13_source.png',
        bg=(13, 15, 21),
        rects=RECTS13,
        ground=set(),
        out='ruins13',
        key='13',
        clean=True,
    ),
    **{
        str(n): dict(
            src='tileset%d_source.png' % n,
            bg=(13, 15, 22),
            rects=R,
            ground={k for k in R if k.startswith('tr_')},
            out='ruins%d' % n,
            key=str(n),
            clean='strict',
            square=TR,
        )
        for n, R in [
            (14, RECTS14),
            (15, RECTS15),
            (16, RECTS16),
            (17, RECTS17),
            (18, RECTS18),
            (19, RECTS19),
            (20, RECTS20),
            (21, RECTS21),
            (22, RECTS22),
            (23, RECTS23),
        ]
    },
    '24': dict(
        src='tileset24_source.png',
        bg=(12, 15, 20),
        rects=RECTS24,
        ground=set(_S24G),
        out='ruins24',
        key='24',
        clean=True,
        square=124,
        shrink=0.757,
    ),
    '25': dict(
        src='tileset25_source.png',
        bg=(11, 14, 21),
        rects=RECTS25,
        ground=set(),
        out='ruins25',
        key='25',
        clean=True,
    ),
    '26': dict(
        src='tileset26_source.png',
        bg=(13, 17, 24),
        rects=RECTS26,
        ground=set(),
        out='ruins26',
        key='26',
        clean=True,
    ),
    '27': dict(
        src='tileset27_source.png',
        bg=(12, 16, 23),
        rects=RECTS27,
        ground=set(),
        out='ruins27',
        key='27',
        clean=True,
        holes=40,
    ),
    '28': dict(
        src='tileset28_source.png',
        bg=(13, 15, 21),
        rects=RECTS28,
        ground=set(_E28G) | {k for k in RECTS28 if k.startswith('tr_')},
        out='ruins28',
        key='28',
        clean=True,
        square=TR,
        holes=40,
    ),
    '29': dict(
        src='tileset29_source.png',
        bg=(16, 17, 22),
        rects=RECTS29,
        ground=set(),
        out='ruins29',
        key='29',
        clean=True,
        holes=40,
    ),
    '30': dict(
        src='tileset30_source.png',
        bg=(14, 15, 20),
        rects=RECTS30,
        ground=set(),
        out='ruins30',
        key='30',
        clean=True,
        holes=40,
    ),
    '31': dict(
        src='tileset31_source.png',
        bg=(14, 16, 22),
        rects=RECTS31,
        ground=set(),
        out='ruins31',
        key='31',
        clean=True,
        holes=3,
        shrink=0.5,
    ),
    '3': dict(
        src='tileset3_source.png',
        bg=(13, 16, 21),
        rects=RECTS3,
        ground=set(RECTS3),
        out='ruins3',
        key='3',
        square=TR,
    ),
}


# ── recolours: extra variants made from the cut pieces ──
# A style recolours the roof tiles (hue in degrees, saturation and value
# multipliers) and/or tints the grey stone (RGB multipliers, brightness).
# Each listed piece gets a copy named '<piece>_<style>' in the same atlas.
STYLES = {
    'slate': dict(roof=(215, 0.35, 0.85)),  # blue-grey slate
    'moss': dict(roof=(95, 0.55, 0.75)),  # green-glazed tiles
    'sand': dict(stone=((1.16, 0.98, 0.72), 1.0)),  # terracotta on sandstone
    'rose': dict(stone=((1.1, 0.9, 0.92), 1.0)),  # rose-pink stone (Gilden's Quarrender House)
    'dusk': dict(roof=(275, 0.55, 0.75), stone=((0.85, 0.85, 1.0), 0.72)),  # college purple, dark stone
    'char': dict(roof=(20, 0.12, 0.55), stone=((0.95, 0.95, 1.0), 0.85)),  # burnt, weathered
    'ash': dict(
        whole=(0.32, 0.9, (1.06, 0.98, 0.92), 0.5)
    ),  # burnt ground: grass goes dark ash, stone stays light
    'burnt': dict(
        roof=(20, 0.12, 0.6), whole=(0.45, 0.74, (1.08, 0.95, 0.86))
    ),  # Cindergate: soot-dark, dead ivy
}
HOUSE_STYLES = ['slate', 'moss', 'sand', 'dusk', 'char']
_TR = ['%d%d' % (r, c) for r in range(3) for c in range(3)] + ['alt00', 'alt02', 'alt20', 'alt22']
RECOLOUR = {
    '29': {
        'palace': ['sand', 'rose']
    },  # Gilden's palaces: Ashcombe sandstone, Quarrender rose, Varenne marble
    '1': dict(
        {h: HOUSE_STYLES + ['burnt'] for h in ['house1', 'house2', 'house3', 'house4', 'house5', 'house6']},
        **{g: ['ash'] for g in ['grass', 'grass2', 'dirtGrass', 'flagCracked', 'flagMoss']}
    ),
    '3': {'tr_%s_%s' % (st, c): ['ash'] for st in ['cobble', 'dirt'] for c in _TR},  # Cindergate's streets
    '4': {
        k: ['burnt']
        for k in [
            'backTerra1',
            'backTerra2',
            'backSlate',
            'backPurple',
            'backSlateRuin',
            'backPurpleRuin',
            'sideTerra',
            'sideSlate',
            'sidePurple',
            'sidePurpleRuin',
            'tavern',
            'chapel',
        ]
    },
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
        if len(whole) > 3:  # grass and moss burn darker than stone
            green = (H > 50) & (H < 160) & (S > 0.25)
            v[green] = whole[3]
        out[..., :3] = np.clip((grey + (rgb - grey) * sat) * v * np.array(tint), 0, 255)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


# ── sector palettes: Corvanthe's other seven sectors, one atlas each (sector_<palette>.png/json).
# Every piece keeps its name plus _<palette>. ground = whole-image tint for the ground pieces
# (saturation, brightness, RGB tint, brightness for grass); house = recolour() args for buildings.
SECTOR_GROUND = ['grass', 'grass2', 'dirtGrass', 'flagCracked', 'flagMoss'] + [
    'tr_%s_%s' % (st, c) for st in ['cobble', 'dirt', 'shore', 'quay'] for c in _TR
]
SECTOR_HOUSES = [
    'house1',
    'house2',
    'house3',
    'house4',
    'house5',
    'house6',
    'backTerra1',
    'backTerra2',
    'backSlate',
    'backPurple',
    'backSlateRuin',
    'backPurpleRuin',
    'sideTerra',
    'sideSlate',
    'sidePurple',
    'sidePurpleRuin',
    'tavern',
    'chapel',
    'tower',
]
# props in the streets and yards: the house tint without the roof shift
SECTOR_PROPS = [
    'barrel',
    'crate1',
    'crate2',
    'logs',
    'fence',
    'flowerbush',
    'lowwall',
    'crate3',
    'barrel3',
    'brokenFence',
    'planks1',
    'rubble6',
    'sacks',
    'rubble1',
    'rubble2',
    'rubble3',
    'rubble4',
    'rubble5',
    'rubble7',
    'rubble9',
    'blocks1',
    'blocks2',
    'crateBroken',
    'barrelsBroken',
    'rocks1',
    'rocks2',
    'ruinWall1',
    'ruinWall2',
    'wallLow1',
    'wallLow2',
    'gravel',
    'lamppost',
    'statue',
    'brokenArch',
    'bush',
    'stump',
    'stone',
]
PALETTES = {
    'frost': dict(
        ground=(0.06, 1.2, (0.92, 1.0, 1.12), 1.75),
        house=dict(roof=(205, 0.25, 1.1), whole=(0.55, 1.05, (0.92, 1.0, 1.15))),
    ),
    'drowned': dict(
        ground=(0.4, 0.6, (0.72, 0.92, 1.18), 0.5),
        house=dict(roof=(170, 0.3, 0.7), whole=(0.6, 0.72, (0.8, 0.95, 1.05))),
    ),
    'storm': dict(
        ground=(0.4, 0.6, (0.85, 0.88, 1.15), 0.55),
        house=dict(roof=(230, 0.3, 0.7), whole=(0.5, 0.72, (0.85, 0.9, 1.15))),
    ),
    'quarry': dict(
        ground=(0.5, 0.92, (1.15, 1.0, 0.78), 0.75), house=dict(whole=(0.6, 0.9, (1.12, 1.0, 0.82)))
    ),
    'gale': dict(
        ground=(0.22, 1.05, (1.04, 1.02, 0.94), 1.15),
        house=dict(roof=(250, 0.3, 0.95), whole=(0.6, 1.05, (0.98, 0.98, 1.08))),
    ),
    'aether': dict(
        ground=(0.55, 0.7, (0.95, 0.82, 1.25), 0.6),
        house=dict(roof=(280, 0.6, 0.85), whole=(0.7, 0.78, (0.95, 0.85, 1.2))),
    ),
    'gloom': dict(
        ground=(0.3, 0.45, (0.95, 0.85, 1.15), 0.4),
        house=dict(roof=(285, 0.35, 0.55), whole=(0.45, 0.55, (0.92, 0.85, 1.12))),
    ),
}


def sector_atlases(base):
    for pal, P in PALETTES.items():
        crops = {}
        for k in SECTOR_GROUND:
            crops[k + '_' + pal] = recolour(base[k], whole=P['ground'])
        for k in SECTOR_HOUSES:
            crops[k + '_' + pal] = recolour(base[k], **P['house'])
        for k in SECTOR_PROPS:
            crops[k + '_' + pal] = recolour(base[k], whole=P['house']['whole'])
        pack(crops, 'sector_' + pal)


def drop_edge_scraps(c, share=0.15):
    """Clear small blobs that touch the crop's edge: scraps of the neighbouring pieces. A piece's
    own loose bits (floating stones, its shadow) sit inside the padding and are kept. share=1
    ('strict' sheets) clears every blob touching the edge but the piece's own, the biggest."""
    a = np.array(c)
    solid = a[..., 3] > 0
    lab, n = ndimage.label(solid)
    if n < 2:
        return c
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    for i in edge:
        if sizes[i - 1] < share * sizes.max() and sizes[i - 1] != sizes.max():
            a[lab == i, 3] = 0
    return Image.fromarray(a, 'RGBA')


def transparent_sheet(path, bg, holes=0):
    src = Image.open(path).convert('RGB')
    a = np.array(src).astype(int)
    bgish = np.abs(a - bg).sum(2) < 34
    lab, n = ndimage.label(bgish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    clear = np.isin(lab, list(edge))
    # holes: background showing through a piece (between branches, behind a rack, inside an arch) is
    # cleared too when the enclosed patch is at least this many pixels and very close to the background
    if holes:
        tight = np.abs(a - bg).sum(2) < 14
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        for i, sz in enumerate(sizes, 1):
            if i not in edge and sz >= holes:
                clear |= (lab == i) & tight
    alpha = np.where(clear, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(src), alpha]), 'RGBA')


def main():
    if '--ships' in sys.argv:
        return compose_ships()
    which = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    base = {}
    for key, sh in SHEETS.items():
        if which and which not in (key, 'sectors'):
            continue
        base.update(cut(sh, write=which != 'sectors'))
    if not which or which == 'sectors':
        sector_atlases(base)


def cut(sh, write=True):
    sheet = transparent_sheet(os.path.join(DIR, sh['src']), sh['bg'], sh.get('holes', 0))
    crops = {}
    for k, (x, y, w, h) in sh['rects'].items():
        c = sheet.crop((x, y, x + w, y + h))
        for ex0, ey0, ex1, ey1 in ERASE.get(k, []):
            a = np.array(c)
            a[max(0, ey0 - y) : max(0, ey1 - y), max(0, ex0 - x) : max(0, ex1 - x), 3] = 0
            c = Image.fromarray(a, 'RGBA')
        if k in KNOCK_DARK:
            a = np.array(c)
            a[..., 3] = np.where(a[..., :3].max(2) < KNOCK_DARK[k], 0, a[..., 3])
            c = Image.fromarray(a, 'RGBA')
        if k in CHALK:
            lo, hi = CHALK[k]
            a = np.array(c).astype(float)
            lum = a[..., :3].mean(2)
            a[..., 3] = np.clip((lum - lo) / (hi - lo), 0, 1) * a[..., 3]
            c = Image.fromarray(a.astype(np.uint8), 'RGBA')
        if k in WATERLINE:
            c = sink(c, WATERLINE[k], y)
        if k in DECK:
            c = unspeck(c, DECK[k], y)
        if sh.get('clean'):
            c = drop_edge_scraps(c, 1.0 if sh['clean'] == 'strict' else 0.15)
        if k not in sh['ground']:
            c = c.crop(c.getbbox())
            if sh.get('shrink'):
                c = c.resize(
                    (round(c.size[0] * sh['shrink']), round(c.size[1] * sh['shrink'])), Image.LANCZOS
                )
        elif sh.get('square'):  # transition cells: every cell the same square size
            c = c.convert('RGB').resize((sh['square'], sh['square']), Image.LANCZOS).convert('RGBA')
        crops[k] = c
    plain = dict(crops)
    if not write:
        return plain
    for base, styles in RECOLOUR.get(sh['key'], {}).items():
        for st in styles:
            crops[base + '_' + st] = recolour(crops[base], **STYLES[st])
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        W = 1800
        img = Image.new('RGB', (W, 2600), (200, 60, 200))
        d = ImageDraw.Draw(img)
        x = y = 10
        rh = 0
        for k, c in crops.items():
            w, h = c.size
            if x + w + 10 > W:
                x = 10
                y += rh + 24
                rh = 0
            img.paste(c, (x, y), c)
            d.text((x, y + h + 2), k, fill=(0, 0, 0))
            x += w + 10
            rh = max(rh, h)
        img.crop((0, 0, W, y + rh + 30)).save(out)
        print('preview ->', out)
        return plain
    pack(crops, sh['out'])
    return plain


def pack(crops, name):
    order = sorted(crops, key=lambda k: -crops[k].size[1])
    W = 1024
    x = y = rh = 0
    pos = {}
    for k in order:
        w, h = crops[k].size
        if x + w > W:
            x = 0
            y += rh + 2
            rh = 0
        pos[k] = [x, y, w, h]
        x += w + 2
        rh = max(rh, h)
    atlas = Image.new('RGBA', (W, y + rh), (0, 0, 0, 0))
    for k, (x, y, w, h) in pos.items():
        atlas.paste(crops[k], (x, y))
    atlas = atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    atlas.save(os.path.join(DIR, name + '.png'), optimize=True)
    with open(os.path.join(DIR, name + '.json'), 'w') as f:
        json.dump(pos, f, separators=(',', ':'))
    print(name, W, 'x', y + rh, '-', len(pos), 'pieces')


if __name__ == '__main__':
    main()
