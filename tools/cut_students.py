#!/usr/bin/env python3
"""The students at a lecture (js/explore_lecture.js): the user's eight seated students on flat green
(sprites/folk/source/student_seated_<1-8>.png: upper body to the lap, quill and notebook, a staff on the
shoulder, facing right), keyed out like the hero figures (tools/cut_hero_figures.py's key_out /
drop_specks), cropped and scaled to HEIGHT px into sprites/folk/student_seated_<n>.png. Each also gets
gown recolours (GOWNS: the purple robe, waistcoat and ribbons moved by hue; the gold trim, skin, hair,
leather and the blue gems stay put), so a theatre full of them isn't all twins:
sprites/folk/student_seated_<n>_<gown>.png. 1-4 are women, 5-8 men.

    python3 tools/cut_students.py                    # writes them all
    python3 tools/cut_students.py --preview out.png  # all of them side by side
"""

import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from cut_hero_figures import key_out, drop_specks

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/folk/source')
OUT = os.path.join(ROOT, 'sprites/folk')
HEIGHT = 420
# gown: (hue°, saturation ×, value ×) for the purple (hue 265-320°)
GOWNS = {
    'black': (260, 0.18, 0.5),
    'crimson': (352, 0.95, 0.85),
    'midnight': (225, 0.8, 0.7),
    'forest': (140, 0.7, 0.62),
}
# which recolours each student gets (the as-painted purple too); the eight × three = 24 looks
WEAR = {
    1: ['black', 'midnight'],
    2: ['crimson', 'forest'],
    3: ['black', 'forest'],
    4: ['midnight', 'crimson'],
    5: ['black', 'forest'],
    6: ['crimson', 'midnight'],
    7: ['black', 'crimson'],
    8: ['black', 'midnight'],
}


def cut(n):
    im = drop_specks(key_out(Image.open(os.path.join(SRC, 'student_seated_%d.png' % n))))
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    return im


def gown(im, to):
    a = np.array(im.convert('RGBA')).astype(np.float32) / 255
    rgb = a[..., :3]
    mx = rgb.max(2)
    mn = rgb.min(2)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    h = np.where(m & (mx == r), ((g - b) / np.where(m, d, 1)) % 6, h)
    h = np.where(m & (mx == g), (b - r) / np.where(m, d, 1) + 2, h)
    h = np.where(m & (mx == b), (r - g) / np.where(m, d, 1) + 4, h)
    h = h * 60
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    v = mx
    sel = (a[..., 3] > 0) & (h >= 265) & (h <= 325) & (s > 0.18)
    th, ts, tv = to
    nh = np.full_like(h, th / 60)
    ns = np.clip(s * ts, 0, 1)
    nv = np.clip(v * tv, 0, 1)
    i = np.floor(nh).astype(int) % 6
    f = nh - np.floor(nh)
    p = nv * (1 - ns)
    q = nv * (1 - ns * f)
    t = nv * (1 - ns * (1 - f))
    out = np.stack(
        [
            np.choose(i, [nv, q, p, p, t, nv]),
            np.choose(i, [t, nv, nv, q, p, p]),
            np.choose(i, [p, p, t, nv, nv, q]),
        ],
        -1,
    )
    rgb2 = np.where(sel[..., None], out, rgb)
    return Image.fromarray((np.dstack([rgb2, a[..., 3]]) * 255).round().astype(np.uint8), 'RGBA')


def main():
    outs = []
    for n in range(1, 9):
        im = cut(n)
        im.save(os.path.join(OUT, 'student_seated_%d.png' % n), optimize=True)
        outs.append(im)
        for gname in WEAR[n]:
            g = gown(im, GOWNS[gname])
            g.save(os.path.join(OUT, 'student_seated_%d_%s.png' % (n, gname)), optimize=True)
            outs.append(g)
        print('student_seated_%d' % n, im.size)
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        W = sum(o.width for o in outs[:12])
        sheet = Image.new('RGBA', (W, HEIGHT * 2), (60, 70, 60, 255))
        x = 0
        for k, o in enumerate(outs):
            if k == 12:
                x = 0
            sheet.paste(o, (x, HEIGHT * (k // 12)), o)
            x += o.width
        sheet.save(out)
        print('preview ->', out)


if __name__ == '__main__':
    main()
