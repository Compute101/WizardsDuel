#!/usr/bin/env python3
"""Townsfolk sprites for Explore (js/explore_folk.js): recolours of two base figures in the house
style, so the invented dons of Wrenford have stand-in art until they get their own.

  old_eldrin  Eldrin's old battle sprite (sprites/folk/source/old_eldrin.png, restored from git
              before his High Elf art replaced it), already transparent.
  old_witch   a female wizard in the same pose and colours from the user
              (sprites/folk/source/old_witch_raw.png), painted on a dark backdrop; cut out here
              (cut_backdrop) and cached as sprites/folk/source/old_witch.png.

Each recolour moves the purple robe and the blue magic (staff flame, orb, potion) to new colours;
gold trim, wood, leather, skin and grey hair are left alone. Output: sprites/folk/<role>.png,
768 px tall, facing right, feet on the bottom edge (like the character stills), and each one's
dialog face, portraits/small/<role>.jpg (FACES).

    python3 tools/make_folk_sprites.py            # writes sprites/folk/<role>.png
    python3 tools/make_folk_sprites.py --preview out.png
    python3 tools/make_folk_sprites.py --faces    # only the dialog faces (FACES), from the sprites
"""
import colorsys, os, sys
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/folk/source')

# role: (base figure, robe (hue°, sat×, val×), magic hue° or None to keep blue)
FOLK = {
    'tutor':    ('old_witch',  (250, 0.12, 0.42), 45),    # Dr Penhallow: a black academic gown, gold light
    'keeper':   ('old_eldrin', (24,  0.75, 0.80), 35),    # Mr Quill: russet, amber light
    'chaplain': ('old_eldrin', (355, 0.95, 0.85), 50),    # Canon Marrow: crimson, warm white-gold light
    'dealer':   ('old_witch',  (140, 0.70, 0.62), 110),   # Widow Coyle: bottle green, green light
}

def cut_backdrop(im):
    """Cut a pixel-art figure out of a soft painted backdrop: grow the background in from the image
    edges across small colour steps only (the backdrop is a smooth gradient, the figure has hard
    edges); purple pixels (the robe, and the backdrop's purple glow) only across tiny steps, so the
    glow goes but the robe's dark folds don't. Then close thin slits, fill small enclosed holes,
    crop and scale to 768 px tall."""
    im = im.convert('RGB'); W, H = im.size; px = im.load()
    bg = bytearray(W * H); q = deque()
    for x in range(W):
        for y in (0, H - 1): q.append((x, y)); bg[y * W + x] = 1
    for y in range(H):
        for x in (0, W - 1): q.append((x, y)); bg[y * W + x] = 1
    while q:
        x, y = q.popleft(); a = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not bg[ny * W + nx]:
                b = px[nx, ny]
                purple = b[2] - b[1] > 22 and b[0] > b[1] + 4
                d = max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))
                if d <= (2 if purple else 6) and max(b) < 200:
                    bg[ny * W + nx] = 1; q.append((nx, ny))
    alpha = Image.frombytes('L', (W, H), bytes(0 if v else 255 for v in bg))
    alpha = alpha.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.MinFilter(17))   # close slits
    A = alpha.load(); seen = bytearray(W * H)
    for sy in range(H):                                   # fill enclosed holes under 3000 px
        for sx in range(W):
            if A[sx, sy] or seen[sy * W + sx]: continue
            comp, edge, q = [], False, deque([(sx, sy)]); seen[sy * W + sx] = 1
            while q:
                x, y = q.popleft(); comp.append((x, y))
                if x in (0, W - 1) or y in (0, H - 1): edge = True
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and not A[nx, ny]:
                        seen[ny * W + nx] = 1; q.append((nx, ny))
            if not edge and len(comp) < 3000:
                for p in comp: A[p] = 255
    out = im.convert('RGBA'); out.putalpha(alpha)
    out = out.crop(out.getbbox())
    out = out.resize((round(out.width * 768 / out.height), 768), Image.LANCZOS)
    out.putalpha(out.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    return out

# where a base figure's magic is, as fractions of its cut-out (x0, y0, x1, y1): the painted glow
# round it is stripped there (deglow), leaving the flame and swirl strokes crisp, like old_eldrin
MAGIC = {'old_witch': [(0, 0, 0.29, 0.27), (0.69, 0.19, 1, 0.47)]}

def deglow(im, boxes, keep_g=110):
    """Strip the soft blue glow inside the boxes: deep, dark-to-mid blue pixels (blue over green,
    green at least red, green under keep_g) go transparent; the lighter cyan and white strokes stay.
    Then drop specks of under 6 px left floating."""
    px = im.load(); W, H = im.size
    for (fx0, fy0, fx1, fy1) in boxes:
        for y in range(int(fy0 * H), int(fy1 * H)):
            for x in range(int(fx0 * W), min(W, int(fx1 * W) + 1)):
                r, g, b, a = px[x, y]
                if a and b > g and g >= r - 6 and r < 80 and g < keep_g: px[x, y] = (r, g, b, 0)
    seen = bytearray(W * H)
    for sy in range(H):
        for sx in range(W):
            if not px[sx, sy][3] or seen[sy * W + sx]: continue
            comp, q = [], deque([(sx, sy)]); seen[sy * W + sx] = 1
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny][3]:
                        seen[ny * W + nx] = 1; q.append((nx, ny))
            if len(comp) < 6:
                for p in comp: px[p] = px[p][:3] + (0,)
    return im

def base(name):
    path = os.path.join(SRC, name + '.png')
    if name == 'old_witch' and not os.path.exists(path):
        cut = cut_backdrop(Image.open(os.path.join(SRC, 'old_witch_raw.png')))
        deglow(cut, MAGIC['old_witch']).save(path, optimize=True)
        print('cut', os.path.relpath(path, ROOT))
    return Image.open(path).convert('RGBA')

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

# the dialog face (portraits/small/<role>.jpg, shown when you talk to them): x, y, size in the
# 768-tall sprite, by base figure (every recolour of a base has its face in the same place)
FACES = {'old_witch': (178, 138, 140), 'old_eldrin': (192, 140, 145)}

def write_face(role, im):
    x, y, n = FACES[FOLK[role][0]]
    face = Image.new('RGBA', (n, n), (24, 20, 30, 255))
    face.alpha_composite(im.crop((x, y, x + n, y + n)))
    face.convert('RGB').resize((256, 256), Image.LANCZOS).save(
        os.path.join(ROOT, 'portraits', 'small', role + '.jpg'), quality=90)
    print('portraits/small/%s.jpg' % role)

def main():
    if '--faces' in sys.argv:          # faces only, from the sprites already made
        for role in FOLK: write_face(role, Image.open(os.path.join(ROOT, 'sprites/folk', role + '.png')).convert('RGBA'))
        return
    bases = {}
    outs = {}
    for role, (b, robe, magic) in FOLK.items():
        if b not in bases: bases[b] = base(b)
        out = recolour(bases[b].copy(), robe, magic)
        out.save(os.path.join(ROOT, 'sprites/folk', role + '.png'), optimize=True)
        outs[role] = out
        print('sprites/folk/%s.png' % role)
        write_face(role, out)
    if '--preview' in sys.argv:
        p = sys.argv[sys.argv.index('--preview') + 1]
        ims = list(bases.values()) + list(outs.values())
        sheet = Image.new('RGBA', (sum(i.width for i in ims), 768), (40, 40, 50, 255)); x = 0
        for im in ims: sheet.alpha_composite(im, (x, 0)); x += im.width
        sheet.convert('RGB').resize((sheet.width // 2, 384)).save(p); print('preview ->', p)

if __name__ == '__main__':
    main()
