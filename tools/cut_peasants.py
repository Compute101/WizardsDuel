#!/usr/bin/env python3
"""Townsfolk who walk Wrenford's streets by day (`STROLLERS` in js/explore.js): the user's peasant
sprites on flat green (sprites/folk/source/peasant_man.png, peasant_woman.png), keyed out like the
hero figures (tools/cut_hero_figures.py's key_out / drop_specks), cropped, 768 px tall, facing right,
feet on the bottom edge. Each also gets a few recolours so a street of them isn't all twins
(VARIANTS: the woman's skirt, the man's breeches (a hand-fitted shape, `breeches`), both moved by
hue inside their region so skin, leather and wood stay put).

    python3 tools/cut_peasants.py                    # writes sprites/folk/peasant_<n>.png
    python3 tools/cut_peasants.py --preview out.png  # all of them side by side
"""

import colorsys, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from cut_hero_figures import key_out, drop_specks

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/folk/source')
OUT = os.path.join(ROOT, 'sprites/folk')
HEIGHT = 768


def breeches(x, y):
    """The man's breeches, in pixels of his 768-tall cut-out (352 wide): belt to boot cuffs, less the
    pouch, the tankard and its chain, the cloth, the fist and the pitchfork's shaft (which crosses his back leg).
    Fitted by hand; the hue test then keeps out the linen cloth and the patches."""
    if not (331 <= y <= 598 and 40 <= x <= 300):
        return False
    if 92 <= x <= 182 and y <= 410:
        return False  # pouch
    if ((x - 192) / 36) ** 2 + ((y - 378) / 42) ** 2 <= 1:
        return False  # tankard
    if 186 <= x <= 218 and y <= 346:
        return False  # its chain
    if x >= 257 and y <= 452:
        return False  # the linen cloth hanging at his hip
    cx = 83 + (y - 330) * 20 / 240  # the shaft's middle, leaning right as it falls
    return abs(x - cx) > 12


def skirt(x, y):
    return y >= 0.45 * 768 and y <= 0.86 * 768


# name: (source, region test (x, y) on the cut-out, hue range° to move, (hue°, sat×, val×)), or None = as painted
VARIANTS = {
    'man_1': ('peasant_man', None, None, None),
    'man_2': ('peasant_man', breeches, (5, 40), (215, 0.55, 0.75)),  # slate-blue breeches
    'man_3': ('peasant_man', breeches, (5, 40), (95, 0.45, 0.70)),  # moss-green breeches
    'man_4': ('peasant_man', breeches, (5, 40), (30, 0.35, 0.55)),  # dark homespun
    'woman_1': ('peasant_woman', None, None, None),
    'woman_2': ('peasant_woman', skirt, (280, 360), (215, 0.9, 0.95)),  # blue skirt
    'woman_3': ('peasant_woman', skirt, (280, 360), (120, 0.6, 0.85)),  # green skirt
    'woman_4': ('peasant_woman', skirt, (280, 360), (40, 0.9, 1.0)),  # ochre skirt
}


def cut(name):
    im = drop_specks(key_out(Image.open(os.path.join(SRC, name + '.png'))))
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    return im


def recolour(im, inside, hues, to):
    im = im.copy()
    px = im.load()
    W, H = im.size
    lo, hi = hues
    th, ts, tv = to
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if not a or not inside(x, y):
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hd = h * 360
            if not (lo <= hd <= hi) or s < 0.3 or v < 0.08:
                continue
            if lo < 60 and s < 0.45:
                continue  # pale skin and linen aren't cloth
            nr, ng, nb = colorsys.hsv_to_rgb(th / 360, min(1, s * ts), min(1, v * tv))
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im


def main():
    cache, outs = {}, []
    for name, (src, box, hues, to) in VARIANTS.items():
        if src not in cache:
            cache[src] = cut(src)
        im = cache[src] if not to else recolour(cache[src], box, hues, to)
        im.save(os.path.join(OUT, 'peasant_' + name + '.png'), optimize=True)
        outs.append(im)
        print('peasant_' + name, im.size)
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        W = sum(o.width for o in outs)
        sheet = Image.new('RGBA', (W, HEIGHT), (60, 70, 60, 255))
        x = 0
        for o in outs:
            sheet.alpha_composite(o, (x, 0))
            x += o.width
        sheet.convert('RGB').resize((W // 3, HEIGHT // 3)).save(out)


if __name__ == '__main__':
    main()
