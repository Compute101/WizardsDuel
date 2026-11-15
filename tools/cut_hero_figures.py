#!/usr/bin/env python3
"""Base figures for character creation (js/explore_hero.js), from the user's ChatGPT art.

Each source in sprites/hero/source/<slot>_<n>.png is a wizard on flat green: purple robe and hat,
gold trim, blue magic, silver hair (the key colours the creator recolours). This tool keys out the
green (and the green spill on edges), drops loose specks, crops, scales to 768 px tall like the
character stills, and works out the boxes the creator needs from the pixels:

  hair   the silver hair and beard (pale, unsaturated, between the staff and the magic, above the waist)
  face   a square round the face, for the HUD portrait
  skin   the face (and neck) and both hands, where skin tones change
  trimLo the trim's lowest hue: these figures' gold trim sits above the wood and leather in hue, so
         no staff or belt boxes are needed (noTrim stays empty)

Output: sprites/hero/<slot>_<n>.png and sprites/hero/figures.json (read by the creator).

    python3 tools/cut_hero_figures.py                 # all of them
    python3 tools/cut_hero_figures.py --preview out.png   # a contact sheet with the boxes drawn
"""
import colorsys, json, os, sys
from collections import deque
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'sprites/hero/source')
OUT = os.path.join(ROOT, 'sprites/hero')
HEIGHT = 768
SLOTS = {'young_man': ('m', 'young'), 'young_woman': ('f', 'young'), 'mid_man': ('m', 'middle'),
         'mid_woman': ('f', 'middle'), 'old_man': ('m', 'old'), 'old_woman': ('f', 'old')}

def key_out(im):
    """Green to transparent; green spill on the figure's edge pulled back to its other channels."""
    im = im.convert('RGBA'); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if g > 120 and g > r + 50 and g > b + 50:
                px[x, y] = (0, 0, 0, 0)
            elif g > max(r, b) + 8:
                px[x, y] = (r, max(r, b), b, a)
    return im

def drop_specks(im, keep=6):
    px = im.load(); W, H = im.size; seen = bytearray(W * H)
    for sy in range(H):
        for sx in range(W):
            if not px[sx, sy][3] or seen[sy * W + sx]: continue
            comp, q = [], deque([(sx, sy)]); seen[sy * W + sx] = 1
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny][3]:
                        seen[ny * W + nx] = 1; q.append((nx, ny))
            if len(comp) < keep:
                for p in comp: px[p] = (0, 0, 0, 0)
    return im

def cut(path):
    im = drop_specks(key_out(Image.open(path)))
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    return im

def bbox(pts, W, H, pad):
    if not pts: return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return [round(max(0, min(xs) / W - pad), 3), round(max(0, min(ys) / H - pad), 3),
            round(min(1, max(xs) / W + pad), 3), round(min(1, max(ys) / H + pad), 3)]

def clumps(mask, W, H):
    """Connected clumps of a pixel mask (a set of (x, y)), biggest first."""
    seen, out = set(), []
    for p0 in mask:
        if p0 in seen: continue
        comp, q = [], deque([p0]); seen.add(p0)
        while q:
            x, y = q.popleft(); comp.append((x, y))
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)):
                if n in mask and n not in seen: seen.add(n); q.append(n)
        out.append(comp)
    return sorted(out, key=len, reverse=True)

def boxes(im):
    """The creator's boxes from the pixels: hair (the big silver clumps), face, and skin (the biggest
    skin clump at the head and at each hand). Skin here is strict (orange-brown of middling saturation),
    so the gold trim and the wood, both more saturated, stay out."""
    px = im.load(); W, H = im.size
    silver, skin, loose = set(), set(), set()
    for y in range(int(H * 0.62)):
        for x in range(W):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
            fx = x / W
            if v > 0.42 and (s < 0.16 or (s < 0.34 and (h >= 190 or h < 12))) and 0.2 < fx < 0.74: silver.add((x, y))
            if 4 <= h <= 34 and 0.22 < s < 0.74 and v > 0.4: skin.add((x, y))
            if 4 <= h <= 28 and 0.22 < s and v > 0.18: loose.add((x, y))   # darker skin and deep shadow are as saturated as wood
    hairc = [c for c in clumps(silver, W, H) if len(c) >= 120]
    hair = bbox([p for c in hairc for p in c], W, H, 0.008)
    def pick(zone, least=40, src=None):
        cs = [c for c in clumps({p for p in (src or skin) if zone(p[0] / W, p[1] / H)}, W, H) if len(c) >= least]
        return cs[0] if cs else []
    # strict skin first; darker skin needs the loose class (no wood near the head or the free hand,
    # and the trim's gold is above its hue range; the staff hand keeps to its usual spot)
    head = pick(lambda fx, fy: 0.3 < fx < 0.72 and fy < 0.42, 150) or pick(lambda fx, fy: 0.3 < fx < 0.72 and fy < 0.42, 150, loose)
    hb = bbox(head, W, H, 0.01)
    if hb:   # grow it over the face's shadowed side (more saturated than the strict class) next to it
        x0, y0, x1, y1 = hb[0] - 0.04, hb[1] - 0.035, hb[2] + 0.04, hb[3] + 0.01   # the forehead under a hood too
        near = [p for c in clumps({p for p in loose if x0 < p[0] / W < x1 and y0 < p[1] / H < y1}, W, H) if len(c) >= 12 for p in c]
        hb = bbox(head + near, W, H, 0.008)
    face = None
    if hb:
        cx, cy = (hb[0] + hb[2]) / 2 * W, (hb[1] + hb[3]) / 2 * H
        n = max((hb[2] - hb[0]) * W, (hb[3] - hb[1]) * H * 0.8) * 1.75
        face = [round((cx - n / 2) / W, 3), round((cy - n * 0.5) / H, 3), round(n / W, 3)]
    lc = pick(lambda fx, fy: fx <= 0.34 and 0.18 < fy < 0.6); dark = not lc
    lh = bbox(lc or pick(lambda fx, fy: 0.08 < fx <= 0.3 and 0.28 < fy < 0.45, 40, loose), W, H, 0.012)
    rh = bbox(pick(lambda fx, fy: fx >= 0.64 and 0.18 < fy < 0.6) or pick(lambda fx, fy: fx >= 0.64 and 0.18 < fy < 0.6, 40, loose), W, H, 0.012)
    # the neck: often its own clump under the jaw's dark line; the skin in a band just below the head
    # box and a little wider (loose skin, which stops short of the trim's gold in hue)
    nb = None
    if hb:
        x0, x1, y0, y1 = hb[0] - 0.04, hb[2] + 0.04, hb[3] - 0.01, hb[3] + 0.11
        neck = [p for c in clumps({p for p in loose if x0 < p[0] / W < x1 and y0 < p[1] / H < y1}, W, H) if len(c) >= 12 for p in c]
        nb = bbox(neck, W, H, 0.01)
    sk = [b for b in (hb, lh, rh) if b]
    for b in sk[1:]: b.append(0.92 if dark else 0.95)   # hands: leave the most saturated wood out
    if nb: sk.append(nb)                                 # neck, no cap: no wood near it (after the hands: skin[0] is the face)
    return {'hair': hair, 'face': face, 'skin': sk, 'noTrim': [], 'trimLo': 27}

def main():
    figs = []
    for f in sorted(os.listdir(SRC)):
        name, ext = os.path.splitext(f)
        slot = name.rsplit('_', 1)[0]
        if ext != '.png' or slot not in SLOTS: continue
        im = cut(os.path.join(SRC, f))
        im.save(os.path.join(OUT, name + '.png'), optimize=True)
        sex, age = SLOTS[slot]
        figs.append(dict(id=name, sex=sex, age=age, src='sprites/hero/' + name + '.png', **boxes(im)))
        print(name, im.size)
    with open(os.path.join(OUT, 'figures.json'), 'w') as fh:
        json.dump(figs, fh, indent=1)
    print('sprites/hero/figures.json:', len(figs), 'figures')
    if '--preview' in sys.argv:
        p = sys.argv[sys.argv.index('--preview') + 1]
        ims = []
        for fg in figs:
            im = Image.open(os.path.join(ROOT, fg['src'])).convert('RGBA'); W, H = im.size
            bg = Image.new('RGBA', im.size, (40, 40, 50, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg)
            box = lambda b: [b[0] * W, b[1] * H, b[2] * W, b[3] * H]
            if fg['hair']: d.rectangle(box(fg['hair']), outline=(255, 255, 255, 255), width=2)
            for b in fg['skin']: d.rectangle(box(b[:4]), outline=(255, 80, 200, 255), width=2)
            if fg['face']: x, y, n = fg['face']; d.rectangle([x * W, y * H, (x + n) * W, y * H + n * W], outline=(0, 255, 255, 255), width=2)
            ims.append(bg)
        sheet = Image.new('RGBA', (sum(i.width for i in ims), HEIGHT), (20, 20, 26, 255)); x = 0
        for i in ims: sheet.alpha_composite(i, (x, 0)); x += i.width
        sheet.convert('RGB').resize((sheet.width // 2, HEIGHT // 2)).save(p); print('preview ->', p)

if __name__ == '__main__':
    main()
