#!/usr/bin/env python3
"""Townsfolk sprites for Explore (js/explore_folk.js): recolours of Eldrin's old battle sprite
(sprites/folk/source/old_eldrin.png, restored from git before his High Elf art replaced it), so the
invented dons of Wrenford have stand-in art in the house style until they get their own.

Each recolour moves the purple robe and the blue magic (staff flame, orb, potion) to new colours;
gold trim, wood, leather, skin and the grey beard are left alone.

    python3 tools/make_folk_sprites.py            # writes sprites/folk/<name>.png
    python3 tools/make_folk_sprites.py --preview out.png
"""
import colorsys, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/folk/source/old_eldrin.png')

# name: (robe (hue°, sat×, val×), magic hue° or None to keep blue)
FOLK = {
    'tutor':    ((250, 0.12, 0.42), 45),    # Dr Penhallow: a black academic gown, gold light
    'keeper':   ((24,  0.75, 0.80), 35),    # Mr Quill: russet, amber light
    'chaplain': ((355, 0.95, 0.85), 50),    # Canon Marrow: crimson, warm white-gold light
    'dealer':   ((140, 0.70, 0.62), 110),   # Widow Coyle: bottle green, green light
}

def recolour(im, robe, magic):
    px = im.load(); w, h = im.size
    rh, rs, rv = robe
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            hh, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            deg = hh * 360
            if 255 <= deg <= 320 and s > 0.22:                        # the purple robe and hat
                nh, ns, nv = rh / 360, min(1, s * rs), min(1, v * rv)
            elif magic is not None and 185 <= deg < 255 and s > 0.25:  # blue magic
                nh, ns, nv = magic / 360, s, v
            else:
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im

def main():
    src = Image.open(SRC).convert('RGBA')
    outs = {}
    for name, (robe, magic) in FOLK.items():
        out = recolour(src.copy(), robe, magic)
        out.save(os.path.join(ROOT, 'sprites/folk', name + '.png'), optimize=True)
        outs[name] = out
        print('sprites/folk/%s.png' % name)
    if '--preview' in sys.argv:
        p = sys.argv[sys.argv.index('--preview') + 1]
        sheet = Image.new('RGBA', (src.width * (len(outs) + 1), src.height), (40, 40, 50, 255))
        for i, im in enumerate([src] + list(outs.values())): sheet.alpha_composite(im, (i * src.width, 0))
        sheet.convert('RGB').resize((sheet.width // 2, sheet.height // 2)).save(p); print('preview ->', p)

if __name__ == '__main__':
    main()
