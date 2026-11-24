#!/usr/bin/env python3
"""Placeholder battle sprites and HUD faces for the Moriquende's creatures (fighters.json, js/forest.js).

Recolours of existing art until the real figures arrive (docs/art-prompts.md, "The Moriquende"):
  goblin       Gretch, small, yellow-green          orc        Gretch, olive
  orc_bigun    Gretch, darker                       orc_warboss Gretch, blood-red war paint
  varg         Gnash (a hyena-man), wolf grey        varg_alpha Gnash, near black
  elf_talon    the Archer, a green ranger's cloak

  python3 tools/make_forest_placeholders.py
writes sprites/forest/<key>.png and portraits/small/<key>.jpg, except where the real art has arrived
(sprites/fighters/source/<key>.png, cut by tools/cut_fighters.py).
"""
import colorsys, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'sprites', 'forest')

# key: (source, hue shift in degrees, saturation ×, value ×, optional tint (r,g,b,amount))
LOOKS = {
    'goblin':      ('gretch', 35, 1.05, 1.08, None),
    'orc':         ('gretch', -18, 0.85, 0.92, None),
    'orc_bigun':   ('gretch', -25, 0.8, 0.72, None),
    'orc_warboss': ('gretch', -25, 0.85, 0.78, (150, 20, 20, 0.28)),
    'varg':        ('gnash', 180, 0.18, 0.95, (120, 135, 160, 0.12)),
    'varg_alpha':  ('gnash', 180, 0.12, 0.6, (60, 70, 90, 0.2)),
    'elf_talon':   ('archer', 35, 1.1, 1.0, None),
}

def recolour(im, dh, ds, dv, tint):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hh = (hh + dh / 360) % 1
            ss = min(1, ss * ds)
            vv = min(1, vv * dv)
            r2, g2, b2 = colorsys.hsv_to_rgb(hh, ss, vv)
            r2, g2, b2 = r2 * 255, g2 * 255, b2 * 255
            if tint:
                tr, tg, tb, k = tint
                r2, g2, b2 = r2 * (1 - k) + tr * k, g2 * (1 - k) + tg * k, b2 * (1 - k) + tb * k
            px[x, y] = (int(r2), int(g2), int(b2), a)
    return im

def main():
    os.makedirs(OUT, exist_ok=True)
    for key, (src, dh, ds, dv, tint) in LOOKS.items():
        if os.path.exists(os.path.join(ROOT, 'sprites', 'fighters', 'source', key + '.png')):
            print('real art for', key, '(tools/cut_fighters.py): left alone'); continue
        spr = recolour(Image.open(os.path.join(ROOT, 'sprites', src + '.png')), dh, ds, dv, tint)
        spr.save(os.path.join(OUT, key + '.png'), optimize=True)
        face = recolour(Image.open(os.path.join(ROOT, 'portraits', 'small', src + '.jpg')), dh, ds, dv, tint)
        face.convert('RGB').save(os.path.join(ROOT, 'portraits', 'small', key + '.jpg'), quality=88)
        print('wrote', key)

if __name__ == '__main__':
    main()
