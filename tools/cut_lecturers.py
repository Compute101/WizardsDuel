#!/usr/bin/env python3
"""The lecturers and Professor Thorley (js/explore_lecture.js, js/explore_year.js): the user's sprites on flat
green (sprites/folk/source/lect_<element>.png, examiner.png), keyed out like the hero figures
(tools/cut_hero_figures.py's key_out / drop_specks), cropped, HEIGHT px tall into sprites/folk/<id>.png, with
a face crop for the dialog box (sprites/folk/<id>_face.png) and sprites/folk/lecturers.json: where each one's
magic is (HAND, the flame, swirl, crystal, book or lantern the spells leave from) as a fraction of the cut sprite.

    python3 tools/cut_lecturers.py                    # writes them all
    python3 tools/cut_lecturers.py --preview out.png  # side by side, hand marked
"""

import json, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from cut_hero_figures import key_out, drop_specks

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/folk/source')
OUT = os.path.join(ROOT, 'sprites/folk')
HEIGHT = 768
# id: (the hand's magic, the face's centre and size), in the source's pixels (1024 x 1536)
FIG = {
    'lect_fire': ((905, 175), (450, 250, 250)),
    'lect_air': ((890, 270), (600, 270, 210)),
    'lect_water': ((815, 330), (520, 215, 180)),
    'lect_earth': ((825, 330), (500, 270, 200)),
    'lect_ice': ((185, 160), (505, 200, 190)),
    'lect_lightning': ((790, 170), (530, 185, 180)),
    'lect_arcane': ((760, 250), (490, 130, 190)),
    'lect_dark': ((340, 960), (530, 140, 180)),
    'examiner': ((715, 345), (560, 150, 200)),
}


def main():
    info, outs = {}, []
    for k, (hand, (fx, fy, fs)) in FIG.items():
        src = Image.open(os.path.join(SRC, k + '.png'))
        im = drop_specks(key_out(src))
        x0, y0, x1, y1 = im.getbbox()
        im = im.crop((x0, y0, x1, y1))
        sc = HEIGHT / im.height
        im = im.resize((round(im.width * sc), HEIGHT), Image.LANCZOS)
        im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
        im.save(os.path.join(OUT, k + '.png'), optimize=True)
        face = (
            key_out(src)
            .crop((fx - fs // 2, fy - fs // 2, fx + fs // 2, fy + fs // 2))
            .resize((128, 128), Image.LANCZOS)
        )
        bg = Image.new('RGBA', face.size, (24, 20, 30, 255))
        bg.alpha_composite(face)
        bg.convert('RGB').save(os.path.join(OUT, k + '_face.png'))
        info[k] = {
            'hand': [round((hand[0] - x0) / (x1 - x0), 3), round((hand[1] - y0) / (y1 - y0), 3)],
            'w': im.width,
            'h': im.height,
        }
        outs.append((k, im))
        print(k, im.size, info[k]['hand'])
    with open(os.path.join(OUT, 'lecturers.json'), 'w') as f:
        json.dump(info, f, indent=1)
    if '--preview' in sys.argv:
        W = sum(o.width for _, o in outs)
        sheet = Image.new('RGB', (W, HEIGHT), (50, 55, 60))
        d = ImageDraw.Draw(sheet)
        x = 0
        for k, o in outs:
            sheet.paste(o, (x, 0), o)
            hx, hy = info[k]['hand']
            cx, cy = x + hx * o.width, hy * o.height
            d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), outline=(255, 0, 255), width=3)
            x += o.width
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])
        print('preview')


if __name__ == '__main__':
    main()
