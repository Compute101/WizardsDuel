#!/usr/bin/env python3
"""Cut the Moriquende's map art (js/forest.js) from the user's two sheets.

  sprites/forest/source/hexes_source.png   13 pointy-top hex tiles on a flat dark background
  sprites/forest/source/tokens_source.png  10 map figures on black

Each hex is cropped to its bounding box, masked to an exact pointy-top hexagon (a couple of pixels in,
so no background fringe shows) and saved at a regular hexagon's proportions, HEX_W x HEX_H, as
sprites/forest/hex_<kind>.png. Each figure is keyed off black (the background joined to the edge, plus
any large near-black hole, e.g. between legs), trimmed, and saved TOK_H tall as
sprites/forest/tok_<kind>.png.

    python3 tools/cut_forest_art.py [--preview out.png]
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites', 'forest', 'source')
OUT = os.path.join(ROOT, 'sprites', 'forest')
# in reading order on each sheet
HEXES = ['old', 'wood', 'glade', 'hill', 'marsh', 'crag', 'lake', 'felled', 'burnt', 'home', 'hamlet', 'talan', 'ancient']
TOKENS = ['goblin', 'shaman', 'varg', 'orc', 'totem', 'deer', 'seer', 'talon', 'charm', 'guild']
HEX_W, HEX_H = 240, 277          # a regular pointy-top hexagon: w = h * sqrt(3)/2
INSET = 2                        # px (in the source) the mask sits inside the tile's own edge
TOK_H = 256
BG_DARK = 26                     # a token's background: max channel at or below this, joined to the edge
HOLE_DARK = 14                   # an enclosed patch this dark and HOLE px or more is background too
HOLE = 120

# 256 colours (like the Explore atlases): a fraction of the size, no visible loss at map scale
def small(img): return img.quantize(256, method=Image.Quantize.FASTOCTREE)

def pieces(im, thresh, min_px):
    fg = im.max(axis=2) > thresh
    lab, _ = ndimage.label(ndimage.binary_closing(fg, iterations=3))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < min_px: continue
        out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    return out

def reading_order(boxes, rows):
    boxes = sorted(boxes, key=lambda b: b[1])
    # split into rows by the biggest gaps in y
    ys = [b[1] for b in boxes]
    cuts = sorted(range(1, len(ys)), key=lambda i: ys[i] - ys[i - 1], reverse=True)[:rows - 1]
    out, start = [], 0
    for c in sorted(cuts) + [len(boxes)]:
        out += sorted(boxes[start:c], key=lambda b: b[0]); start = c
    return out

def cut_hexes():
    im = Image.open(os.path.join(SRC, 'hexes_source.png')).convert('RGB')
    a = np.array(im).astype(int)
    boxes = reading_order(pieces(a, 40, 3000), 3)
    assert len(boxes) == len(HEXES), len(boxes)
    for kind, (x0, y0, x1, y1) in zip(HEXES, boxes):
        tile = im.crop((x0, y0, x1, y1)).convert('RGBA').resize((HEX_W, HEX_H), Image.LANCZOS)
        w, h, i = HEX_W, HEX_H, INSET
        mask = Image.new('L', (w, h), 0)
        ImageDraw.Draw(mask).polygon([(w / 2, i), (w - i, h / 4), (w - i, 3 * h / 4), (w / 2, h - i), (i, 3 * h / 4), (i, h / 4)], fill=255)
        tile.putalpha(mask)
        small(tile).save(os.path.join(OUT, 'hex_' + kind + '.png'), optimize=True)
        print('hex_' + kind, (x1 - x0, y1 - y0))

def cut_tokens():
    im = Image.open(os.path.join(SRC, 'tokens_source.png')).convert('RGB')
    a = np.array(im).astype(int)
    boxes = reading_order(pieces(a, 40, 3000), 2)
    assert len(boxes) == len(TOKENS), len(boxes)
    for kind, (x0, y0, x1, y1) in zip(TOKENS, boxes):
        P = 6
        x0, y0, x1, y1 = max(0, x0 - P), max(0, y0 - P), min(a.shape[1], x1 + P), min(a.shape[0], y1 + P)
        c = a[y0:y1, x0:x1]
        dark = c.max(axis=2) <= BG_DARK
        lab, _ = ndimage.label(dark)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(edge))
        holes, n = ndimage.label((c.max(axis=2) <= HOLE_DARK) & ~bg)
        for j in range(1, n + 1):
            if (holes == j).sum() >= HOLE: bg |= holes == j
        rgba = np.dstack([c, np.where(bg, 0, 255)]).astype(np.uint8)
        tok = Image.fromarray(rgba, 'RGBA')
        tok = tok.crop(tok.getchannel('A').getbbox())
        s = TOK_H / tok.height
        tok = tok.resize((round(tok.width * s), TOK_H), Image.LANCZOS)
        small(tok).save(os.path.join(OUT, 'tok_' + kind + '.png'), optimize=True)
        print('tok_' + kind, tok.size)

def preview(path):
    tiles = [Image.open(os.path.join(OUT, 'hex_' + k + '.png')).convert('RGBA') for k in HEXES]
    toks = [Image.open(os.path.join(OUT, 'tok_' + k + '.png')).convert('RGBA') for k in TOKENS]
    W = 130 * 7
    sheet = Image.new('RGBA', (W, 150 * 2 + 140 * 2), (40, 60, 40, 255))
    for i, t in enumerate(tiles):
        t = t.resize((120, 139)); sheet.alpha_composite(t, ((i % 7) * 130, (i // 7) * 150))
    for i, t in enumerate(toks):
        t = t.copy(); t.thumbnail((120, 130)); sheet.alpha_composite(t, ((i % 7) * 130, 300 + (i // 7) * 140))
    sheet.save(path); print('preview', path)

if __name__ == '__main__':
    cut_hexes(); cut_tokens()
    if '--preview' in sys.argv: preview(sys.argv[sys.argv.index('--preview') + 1])
