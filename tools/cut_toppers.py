#!/usr/bin/env python3
"""Staff toppers for the hero creator (js/explore_hero.js), from the user's ChatGPT sheets.

Each sheet in sprites/hero/toppers/source/<sheet>.png holds four toppers in a row on flat green: glow in
blue, metal in gold, a wooden neck at the bottom (docs/world-design.md, "Staff toppers"). This tool keys
out the green, splits the sheet at its empty columns, crops each topper and finds its neck (the centre and
width of the wood at its bottom row), writing sprites/hero/toppers/<id>.png and toppers.json.

    python3 tools/cut_toppers.py [--preview out.png]
"""
import colorsys, json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/hero/toppers/source')
OUT = os.path.join(ROOT, 'sprites/hero/toppers')
# per sheet, left to right: id, name, and where wood takes the Staff colour ('neck' only, or 'all')
SHEETS = {
    'classic': [('crystal', 'Gripped Crystal', 'neck'), ('hoop', 'Orb in a Hoop', 'neck'), ('crescent', 'Crescent Moon', 'neck'), ('crook', "Shepherd's Crook", 'all')],
    'world':   [('shard', 'Quintessence Shard', 'all'), ('orrery', 'Orrery', 'neck'), ('cage', 'Caged Wisp', 'neck'), ('lantern', "Finder's Lantern", 'neck')],
    'glyphs':  [('omega', 'Omega', 'neck'), ('psi', 'Psi', 'neck'), ('cross', 'Circled Cross', 'neck'), ('star', 'Octagram', 'neck')],
    'bandit':  [('skull', 'Skull', 'neck'), ('blade', 'Broken Blade', 'neck'), ('antlers', 'Antlers', 'neck'), ('feathers', 'Feathers and Bones', 'neck')],
    'scholar': [('hourglass', 'Hourglass', 'neck'), ('hand', 'Golden Hand', 'neck'), ('wren', 'Wren', 'neck'), ('key', 'Key', 'neck')],
}

def key_out(im):
    im = im.convert('RGBA'); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if g > 120 and g > r + 40 and g > b + 40: px[x, y] = (0, 0, 0, 0)
            elif g > max(r, b) + 8: px[x, y] = (r, max(r, b), b, a)     # green spill on edges
    return im

def wood(p):
    r, g, b, a = p
    if not a: return False
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return h * 360 < 30 and s > 0.35 and v > 0.2

def main():
    out, prev = [], []
    for sheet, items in SHEETS.items():
        im = key_out(Image.open(os.path.join(SRC, sheet + '.png')))
        W, H = im.size; px = im.load()
        cols = [sum(1 for y in range(H) if px[x, y][3]) for x in range(W)]
        runs, st = [], None
        for x in range(W + 1):
            on = x < W and cols[x] > 2
            if on and st is None: st = x
            if not on and st is not None:
                if x - st > 40: runs.append((st, x))
                st = None
        while len(runs) > len(items):                       # merge the closest pair (a topper split by a gap)
            i = min(range(len(runs) - 1), key=lambda i: runs[i + 1][0] - runs[i][1])
            runs[i:i + 2] = [(runs[i][0], runs[i + 1][1])]
        assert len(runs) == len(items), (sheet, runs)
        for (x0, x1), (tid, name, woodpart) in zip(runs, items):
            c = im.crop((x0, 0, x1, H)); c = c.crop(c.getbbox())
            cw, ch = c.size; cp = c.load()
            ys = [y for y in range(ch - 1, ch - 40, -1)]       # the neck: the wood run across the bottom rows
            xs = [x for y in ys[2:8] for x in range(cw) if wood(cp[x, y])]
            nx0, nx1 = min(xs), max(xs)
            c.save(os.path.join(OUT, tid + '.png'), optimize=True)
            out.append(dict(id=tid, name=name, src='sprites/hero/toppers/' + tid + '.png', w=cw, h=ch,
                            neck=[round((nx0 + nx1) / 2 / cw, 4), round((nx1 - nx0 + 1) / cw, 4)], wood=woodpart))
            prev.append(c); print(tid, c.size, 'neck', nx0, nx1)
    json.dump(out, open(os.path.join(OUT, 'toppers.json'), 'w'), indent=1)
    print('sprites/hero/toppers/toppers.json:', len(out))
    if '--preview' in sys.argv:
        p = sys.argv[sys.argv.index('--preview') + 1]
        hh = 300; ims = [i.resize((max(1, i.width * hh // i.height), hh)) for i in prev]
        sheet = Image.new('RGBA', (sum(i.width + 10 for i in ims), hh), (40, 40, 50, 255)); x = 0
        for i in ims: sheet.alpha_composite(i, (x, 0)); x += i.width + 10
        sheet.convert('RGB').save(p)

if __name__ == '__main__':
    main()
