#!/usr/bin/env python3
"""Base figures for character creation (js/explore_hero.js), from the user's ChatGPT art.

Each source in sprites/hero/source/<slot>_<n>.png is a wizard on flat green: purple robe and hat,
gold trim, blue magic, silver hair (the key colours the creator recolours). This tool keys out the
green (and the green spill on edges), drops loose specks, crops, scales to 768 px tall like the
character stills, and works out the boxes the creator needs from the pixels:

  hair   the silver hair and beard (pale, unsaturated, between the staff and the magic, above the waist),
         and an exact mask of it (<id>_hair.png): the silver grown into its pinkish- and blue-grey edges
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
# dwarves: the same slots with a dwarf_ prefix (race 'dwarf' in figures.json; humans carry no race)
SLOTS.update({'dwarf_' + k: v for k, v in list(SLOTS.items())})
# elves (race 'elf'): ageless to look at, so one set (cut as young) serves every age in the creator
SLOTS.update({'elf_man': ('m', 'young'), 'elf_woman': ('f', 'young')})

# the ragged bandits: for NPCs only, kept out of the creator (an even number of each sex, so the creator stays even too)
NPC_ONLY = {'mid_man_7', 'mid_man_8', 'old_man_5', 'mid_woman_7', 'mid_woman_8', 'old_woman_5'}   # every eyepatched bandit

# boxes set by hand where the pixels mislead (wide brims whose underside reads as skin, robe patches)
FIX = {
    'old_man_4':   {'face': [0.34, 0.075, 0.30], 'head': [0.40, 0.125, 0.58, 0.26], 'neck': [0.43, 0.24, 0.53, 0.30]},
    'old_woman_4': {'face': [0.35, 0.07, 0.30],  'head': [0.43, 0.115, 0.56, 0.24], 'neck': [0.45, 0.22, 0.55, 0.29]},
    'mid_woman_8': {'lh': [0.10, 0.315, 0.195, 0.385, 0.95]},
    'mid_man_5':   {'paleHair': True},   # a white moustache, apart from the hair
    'mid_man_6':   {'noArm': (1,), 'paleHair': True},   # a leather bracer at the wrist, then the sleeve: no forearm to find
    # elves whose long hair swept back past the staff hand passed for the head and hand: the other elves' boxes (same pose)
    **{n: {'face': [0.24, 0.02, 0.43], 'head': [0.335, 0.08, 0.59, 0.24], 'neck': [0.287, 0.215, 0.634, 0.354],
           'lh': [0.104, 0.314, 0.19, 0.37, 0.95]} for n in ('elf_woman_7', 'elf_man_1', 'elf_man_7')},
}

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
    hairMask = None
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
    # the hair, exactly: silver strands grown up to 4 px into their pinkish- and blue-grey edges, in
    # clumps near the head (a beard can reach the belt; potion and buckle glints are small and apart)
    core = set()
    for (x, y) in [(x, y) for y in range(int(H * 0.62)) for x in range(int(W * 0.2), int(W * 0.76))]:
        r, g, b, a = px[x, y]
        if not a: continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
        if v > 0.36 and (s < 0.2 or (s < 0.34 and (h >= 190 or h < 12))): core.add((x, y))   # warmer and darker greys too
    grown, q = set(core), deque((p, 0) for p in core)
    while q:
        (x, y), d = q.popleft()
        if d >= 6: continue
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n in grown or not (0 <= n[0] < W and 0 <= n[1] < H * 0.62): continue
            r, g, b, a = px[n]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
            # the upper face (eyebrows): only the cool greys, a few px, so the brow doesn't spread into the skin
            # round it; elsewhere into the cream and pinkish strands (warm beards) and lilac-grey ones
            upper = hb and hb[0] * W <= n[0] <= hb[2] * W and hb[1] * H <= n[1] <= (hb[1] + 0.55 * (hb[3] - hb[1])) * H
            if upper: ok_ = d < 4 and s < 0.34 and v > 0.3 and not (255 <= h <= 320 and s > 0.15)
            else: ok_ = v > 0.4 and ((s < 0.46 and (h < 60 or h >= 180) and not (255 <= h <= 320)) or s < 0.16)
            if ok_: grown.add(n); q.append((n, d + 1))
    if hb:
        ax0, ax1, ay0, ay1 = (hb[0] - 0.16) * W, (hb[2] + 0.16) * W, (hb[1] - 0.06) * H, (hb[3] + 0.28) * H
        fx0, fy0, fx1, fy1 = hb[0] * W, hb[1] * H, hb[2] * W, hb[3] * H
        inface = lambda c: all(fx0 <= x <= fx1 and fy0 <= y <= fy1 for x, y in c)
        brow = lambda c: sum(y for _, y in c) / len(c) < fy0 + 0.5 * (fy1 - fy0)    # eyebrows sit in the face's upper part
        back = lambda c: sum(x for x, _ in c) / len(c) < fx0 + 0.4 * (fx1 - fx0)    # figures face right: the back of the head is hair
        def cool(c):                                                                 # lilac and blue greys are hair; cheek and lip highlights are warm
            n = 0
            for x, y in c:
                r, g, b, a = px[x, y]; h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                if h * 360 >= 180 and h * 360 < 335: n += 1
            return n * 2 > len(c)
        def ok(c):
            if inface(c) and len(c) < 150: return len(c) >= 5 and (brow(c) or back(c) or cool(c))   # smallish and inside the face: hair unless a warm highlight low on the front of the face (beards are bigger)
            return len(c) >= 15                                   # a ponytail behind its tie is a clump of its own
        keep = [c for c in clumps(grown, W, H) if ok(c) and any(ax0 <= x <= ax1 and ay0 <= y <= ay1 for x, y in c[::7])]
        pts = {p for c in keep for p in c}
        # eye whites aren't hair: drop what lies within 3 px of an iris (strong blue inside the face)
        iris = set()
        for y in range(int(fy0), int(fy1) + 1):
            for x in range(int(fx0), int(fx1) + 1):
                r, g, b, a = px[x, y]
                if not a: continue
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
                if 185 <= h < 255 and s > 0.45 and v > 0.3: iris.add((x, y))
        pts = [p for p in pts if not any((p[0] + dx, p[1] + dy) in iris for dx in range(-5, 6) for dy in range(-4, 1))]   # beside and below an iris; eyebrows just above it stay
        # the pinkish fringe painted round silver strands (more saturated than the strands): 2 px out from the hair
        ps = set(pts); edge = list(ps)
        for _ in range(2):
            nxt = []
            for (x, y) in edge:
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if n in ps or not (0 <= n[0] < W and 0 <= n[1] < H): continue
                    r, g, b, a = px[n]
                    if not a: continue
                    h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
                    if (h >= 325 or h < 12) and 0.12 < s_ < 0.62 and v > 0.4 and not any((n[0] + dx, n[1] + dy) in iris for dx in range(-5, 6) for dy in range(-4, 1)):
                        ps.add(n); nxt.append(n)
            edge = nxt
        pts = list(ps)
        if pts:
            hairMask = Image.new('L', (W, H), 0); mp = hairMask.load()
            for p in pts: mp[p] = 255
            hair = bbox(pts, W, H, 0.004)
    return {'hair': hair, 'face': face, 'skin': sk, 'noTrim': [], 'trimLo': 27, '_mask': hairMask}

def grow_hair(im, mask, reach=8):
    """The hair mask carried on into near-white pixels touching it (moustache and beard tips the
    silver test left out), up to `reach` px; teeth and eye whites don't touch the hair, so they stay out."""
    W, H = im.size; px = im.load(); mp = mask.load()
    pale = lambda x, y: px[x, y][3] and (lambda h, s_, v: s_ < 0.22 and v > 0.5)(*colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y][:3])))
    front = [(x, y) for y in range(H) for x in range(W) if mp[x, y]]
    for _ in range(reach):
        nxt = []
        for x, y in front:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if 0 <= n[0] < W and 0 <= n[1] < H and not mp[n] and pale(*n): mp[n] = 255; nxt.append(n)
        front = nxt

def pale_hair(im, mask, head):
    """For figures whose moustache is near-white and apart from the rest of the hair (FIX paleHair): every
    near-white clump in the lower part of the head box is hair. Not used generally: teeth look the same."""
    W, H = im.size; px = im.load(); mp = mask.load(); pts = set()
    y0 = int((head[1] + 0.45 * (head[3] - head[1])) * H)
    for y in range(y0, min(H, int((head[3] + 0.03) * H))):
        for x in range(max(0, int((head[0] - 0.03) * W)), min(W, int((head[2] + 0.03) * W))):
            r, g, b, a = px[x, y]
            if not a or mp[x, y]: continue
            h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s_ < 0.3 and v > 0.45: pts.add((x, y))
    for c in clumps(pts, W, H):
        if len(c) >= 6:
            for p in c: mp[p] = 255
    grow_hair(im, mask, 3)

def skin_region(im, skin, no_arm=()):
    """Where skin may be recoloured, as a mask: the skin boxes, a little wider (the ear at the back of the head,
    the knuckles over the staff, the wrist below the staff hand), less the staff itself inside the hand boxes.
    The staff's wood is the same hue as skin and its highlights as pale, so it's found by shape: strongly
    saturated wood, with the narrow streaks of highlight between two bits of it on a row filled in (fingers
    are wider than any streak)."""
    W, H = im.size; px = im.load(); m = Image.new('L', (W, H), 0); mp = m.load()
    grown = []
    for k, b in enumerate(skin):
        if k == 0:   b = [b[0] - 0.03, b[1] - 0.01, b[2] + 0.015, b[3]]           # the head: the ear, the brow
        elif k < 3:  b = [b[0] - 0.015, b[1] - 0.015, b[2] + 0.015, b[3] + 0.015]  # a hand: knuckles
        grown.append((k, [max(0, int(b[0] * W)), max(0, int(b[1] * H)), min(W - 1, int(b[2] * W)), min(H - 1, int(b[3] * H))]))
    for k, (x0, y0, x1, y1) in grown:
        for y in range(y0, y1 + 1):
            row = [False] * W
            if 0 < k < 3:
                wood = []
                for x in range(x0, x1 + 1):
                    r, g, bb, a = px[x, y]
                    if not a: continue
                    h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, bb / 255); h *= 360
                    if 12 <= h <= 34 and s_ > 0.88 and 0.25 < v < 0.9: wood.append(x)
                for i, x in enumerate(wood):
                    row[x] = True
                    if i + 1 < len(wood) and wood[i + 1] - x <= 6:
                        for xx in range(x, wood[i + 1]): row[xx] = True
                for x in [x for x in range(x0, x1 + 1) if row[x]]:   # and a pixel either side
                    if x > 0: row[x - 1] = True
                    if x + 1 < W: row[x + 1] = True
            for x in range(x0, x1 + 1):
                if not row[x] and px[x, y][3]: mp[x, y] = 255
    # the forearm below each hand. Its skin is as saturated as the staff's wood, so the staff is found by
    # shape: its straight shaft further down (wood runs between the robe), a line fitted through their
    # middles and carried up to the fist. Skin-hued pixels below the fist and off that line, joined to the hand, are skin.
    for k in (1, 2):
        if k >= len(skin): continue
        b = skin[k]; X0, X1 = max(0, int((b[0] - 0.035) * W)), min(W - 1, int((b[2] + 0.035) * W))
        Yh, Y1 = int(b[3] * H), min(H - 1, int((b[3] + 0.1) * H))
        if k in no_arm: continue
        wood = lambda x, y: px[x, y][3] and (lambda h, s_, v: 10 <= h * 360 <= 32 and s_ > 0.75 and v > 0.2)(*colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y][:3])))
        rows = []
        for y in range(int((b[3] + 0.1) * H), min(H - 1, int((b[3] + 0.2) * H))):
            runs, st = [], None
            for x in range(X0, X1 + 2):
                if x <= X1 and wood(x, y):
                    if st is None: st = x
                elif st is not None:
                    if 6 <= x - st <= 0.06 * W: runs.append(((st + x - 1) / 2, x - 1 - st))
                    st = None
            if runs: rows.append((y, runs))
        allc = sorted(c for _, rs in rows for c, _ in rs)
        mids = []
        if allc:
            med = allc[len(allc) // 2]
            for y, rs in rows:
                c, w = min(rs, key=lambda r: abs(r[0] - med))
                if abs(c - med) < 0.05 * W: mids.append((y, c, w))
        staff = None
        if len(mids) >= 8:
            n = len(mids); my = sum(m[0] for m in mids) / n; mx = sum(m[1] for m in mids) / n
            sl = sum((m[0] - my) * (m[1] - mx) for m in mids) / max(1e-6, sum((m[0] - my) ** 2 for m in mids))
            hw = sorted(m[2] for m in mids)[n // 2] / 2 + 2
            staff = lambda y: (mx + sl * (y - my) - hw, mx + sl * (y - my) + hw)
        def skinny(x, y):
            r, g, bb, a = px[x, y]
            if not a: return False
            if staff:
                lo, hi = staff(y)
                if lo <= x <= hi: return False
            h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, bb / 255); h *= 360
            return (h < 32 or h >= 340) and s_ > 0.2 and v > 0.12
        seen = set(); q = deque((x, Yh - 1) for x in range(int(b[0] * W), int(b[2] * W)) if mp[x, Yh - 1] and skinny(x, Yh - 1))
        seen.update(q)
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n_ = (x + dx, y + dy)
                if n_ in seen or not (X0 <= n_[0] <= X1 and Yh <= n_[1] <= Y1) or not skinny(*n_): continue
                seen.add(n_); q.append(n_)
        for (x, y) in seen: mp[x, y] = 255
    return m

def woodish(p):
    """The staff's wood: brown to orange, its pale highlights too; not its near-black outline."""
    r, g, b, a = p
    if not a: return False
    h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
    return ((h <= 40 or h >= 345) and s_ > 0.3 and v > 0.1) or (h <= 46 and s_ > 0.12 and v > 0.75)

def staff_region(im, hand, skin_mask):
    """The staff, as a mask, for recolouring its wood. Its straight shaft below the staff hand is found
    as in skin_region (wood runs between the robe, a line fitted through their middles); from there the
    staff is every wood pixel below the hand within that line's band (the sleeve, belt and boots lie beside
    it), and above it anywhere left of the hand (the twisted head round the flame), never the skin."""
    W, H = im.size; px = im.load(); sk = skin_mask.load()
    # the shaft below the hand: the straight line (from a point across the fist's bottom, at a lean)
    # that runs through the most wood over the next 40% of the height
    isw = [[False] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            r, g, b_, a_ = px[x, y]
            if a_:
                h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b_ / 255)
                isw[y][x] = 10 <= h * 360 <= 32 and s_ > 0.7 and v > 0.18
    y0 = int(hand[3] * H); y1 = min(H - 1, int((hand[3] + 0.4) * H))
    best = (0, None, None)
    for c0 in range(int(hand[0] * W), int(hand[2] * W) + 1):
        for k in range(-10, 61):
            sl = k / 100; n = 0
            for y in range(y0, y1, 2):
                x = int(c0 + sl * (y - y0))
                if 0 <= x < W and isw[y][x]: n += 1
            if n > best[0]: best = (n, c0, sl)
    n, c0, sl = best
    if not c0 or n < 0.4 * (y1 - y0) / 2: return None
    ws = []
    for y in range(y0, y1, 4):
        x = int(c0 + sl * (y - y0))
        if not isw[y][x]: continue
        l = x
        while l > 0 and isw[y][l - 1]: l -= 1
        r_ = x
        while r_ < W - 1 and isw[y][r_ + 1]: r_ += 1
        ws.append(r_ - l)
    hw = (sorted(ws)[len(ws) // 2] if ws else 12) / 2 + 3
    my, mx = y0, c0
    yh = int(hand[3] * H); xr = int((hand[2] + 0.03) * W)
    def ok(x, y):
        if sk[x, y] or not woodish(px[x, y]): return False
        if y > yh: c = mx + sl * (y - my); return c - hw <= x <= c + hw
        return x <= xr
    m_ = Image.new('L', (W, H), 0); mp = m_.load()
    m_.info['line'] = (my, mx, sl, hw)                 # for the topper anchor
    for y in range(yh + 1):
        for x in range(0, min(W, xr + 1)):
            if ok(x, y): mp[x, y] = 255
    # below the hand, row by row: the run of wood round the line (found within a band's width of it, so a
    # bend is followed), out to the shaft's own edges; its bright rim is as saturated as anything on it
    free = lambda x, y: not sk[x, y] and woodish(px[x, y])
    prev = None
    yf = min(H, yh + int(0.06 * H))                      # just under the fist: the narrow band only, so no knuckle is taken
    for y in range(yh + 1, yf):
        for x in range(W):
            if ok(x, y): mp[x, y] = 255
    for y in range(yf, H):
        c = int(round(mx + sl * (y - my))) if prev is None else prev
        c = min(W - 1, max(0, c))
        start = next((x for d in range(int(hw * 1.5) + 1) for x in (c - d, c + d) if 0 <= x < W and free(x, y)), None)
        if start is None: prev = None; continue
        l = r_ = start
        lim = hw + 5                                      # a little past the band either side of the tracked middle, never into a fist
        while l > 0 and free(l - 1, y) and c - (l - 1) <= lim: l -= 1
        while r_ < W - 1 and free(r_ + 1, y) and (r_ + 1) - c <= lim: r_ += 1
        if r_ - l > 4 * hw: prev = None; continue        # spilled onto something wide (a boot): skip the row
        line = mx + sl * (y - my)
        if abs((l + r_) / 2 - line) > 3 * hw: prev = None; continue   # strayed off the staff
        for x in range(l, r_ + 1): mp[x, y] = 255
        prev = (l + r_) // 2
    return m_

def head_region(im, hand, staff_mask):
    """What a topper replaces, as a mask: above the staff hand and left of it, the staff's head (its
    mask grown 3 px, wood and dark outline), the flame (blue), and the flame's white core and sparkles
    inside the flame's box. Also the anchor: the shaft's line carried up through the fist, the staff's
    top and the shaft's width, in fractions of the figure."""
    W, H = im.size; px = im.load(); st = staff_mask.load()
    yt = int(hand[1] * H); xr = int((hand[2] + 0.04) * W)
    grow = set()
    for y in range(yt + 1):
        for x in range(xr + 1):
            if st[x, y]:
                for dy in range(-3, 4):
                    for dx in range(-3, 4):
                        grow.add((x + dx, y + dy))
    hsv = lambda x, y: (lambda h, s_, v: (h * 360, s_, v))(*colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y][:3])))
    m = Image.new('L', (W, H), 0); mp = m.load(); blue = []
    xb = max(xr, int(0.36 * W))                         # the flame's sparkles drift further right (the raised hand's magic is past 0.5)
    for y in range(yt + 1):
        for x in range(min(W, xb + 1)):
            if not px[x, y][3]: continue
            h, s_, v = hsv(x, y)
            if 165 <= h < 255 and s_ > 0.25: mp[x, y] = 255; blue.append((x, y))
            elif x > xr: continue
            elif (x, y) in grow and (woodish(px[x, y]) or v < 0.42): mp[x, y] = 255
    if blue:
        bx0 = min(p[0] for p in blue) - 6; bx1 = max(p[0] for p in blue) + 6
        by0 = min(p[1] for p in blue) - 6; by1 = max(p[1] for p in blue) + 6
        for y in range(max(0, by0), min(yt + 1, by1 + 1)):
            for x in range(max(0, bx0), min(xb + 1, bx1 + 1)):
                if px[x, y][3] and hsv(x, y)[1] < 0.3 and hsv(x, y)[2] > 0.6 and not mp[x, y]:
                    if any(0 <= x + dx < W and 0 <= y + dy < H and mp[x + dx, y + dy] for dx in (-2, 0, 2) for dy in (-2, 0, 2)): mp[x, y] = 255
    # what's left of the head: small pieces cut off from the rest of the figure
    left = {(x, y) for y in range(yt) for x in range(min(W, xb + 1)) if px[x, y][3] and not mp[x, y]}
    for c in clumps(left, W, H):
        if len(c) < 400 and all(p[1] < yt - 2 for p in c):
            for p in c: mp[p] = 255
    top = min((y for y in range(H) for x in range(min(W, xr + 1)) if st[x, y]), default=0)
    my, mx, sl, hw = staff_mask.info['line']
    anchor = {'line': [round(mx / W, 4), round(my / H, 4), round(sl * H / W, 4)], 'top': round(top / H, 4),
              'width': round(2 * hw / W, 4), 'grip': round(hand[1] / H if hand[1] > 1 else hand[1], 4)}
    return m, anchor

def main():
    figs = []
    for f in sorted(os.listdir(SRC)):
        name, ext = os.path.splitext(f)
        slot = name.rsplit('_', 1)[0]
        if ext != '.png' or slot not in SLOTS: continue
        im = cut(os.path.join(SRC, f))
        im.save(os.path.join(OUT, name + '.png'), optimize=True)
        sex, age = SLOTS[slot]
        bx = boxes(im); mask = bx.pop('_mask')
        if name in FIX:   # a hat brim's gold-orange underside joined the head's skin clump: face and neck by hand
            f = FIX[name]
            if 'face' in f: bx['face'] = f['face']; bx['skin'] = [f['head']] + bx['skin'][1:3] + [f['neck']]
            if 'lh' in f: bx['skin'][1] = f['lh']   # the staff hand (a robe patch can pass for skin)
        fig = dict(id=name, sex=sex, age=age, src='sprites/hero/' + name + '.png', **bx)
        if name in NPC_ONLY: fig['npc'] = True
        if slot.startswith('dwarf_'): fig['race'] = 'dwarf'
        if slot.startswith('elf_'): fig['race'] = 'elf'
        if mask: grow_hair(im, mask)
        if mask and FIX.get(name, {}).get('paleHair'): pale_hair(im, mask, bx['skin'][0])
        if mask:
            mask.save(os.path.join(OUT, name + '_hair.png'), optimize=True); fig['hairMask'] = 'sprites/hero/' + name + '_hair.png'
        sm = skin_region(im, bx['skin'], FIX.get(name, {}).get('noArm', ()))
        sm.save(os.path.join(OUT, name + '_skin.png'), optimize=True); fig['skinMask'] = 'sprites/hero/' + name + '_skin.png'
        stm = staff_region(im, bx['skin'][1], sm)
        if stm:
            stm.save(os.path.join(OUT, name + '_staff.png'), optimize=True); fig['staffMask'] = 'sprites/hero/' + name + '_staff.png'
            hm, anc = head_region(im, bx['skin'][1], stm)
            hm.save(os.path.join(OUT, name + '_head.png'), optimize=True); fig['headMask'] = 'sprites/hero/' + name + '_head.png'; fig['topper'] = anc
        figs.append(fig)
        print(name, im.size)
    # the old witch (hand-boxed in js/explore_hero.js BASES): her staff mask only
    witch = Image.open(os.path.join(ROOT, 'sprites/folk/source/old_witch.png')).convert('RGBA')
    wskin = [[0.44, 0.20, 0.62, 0.345], [0.10, 0.33, 0.22, 0.41], [0.70, 0.30, 0.87, 0.42]]
    stm = staff_region(witch, wskin[1], skin_region(witch, wskin, (1, 2)))
    if stm:
        stm.save(os.path.join(OUT, 'f_old_1_staff.png'), optimize=True)
        hm, anc = head_region(witch, wskin[1], stm)
        hm.save(os.path.join(OUT, 'f_old_1_head.png'), optimize=True)
        json.dump(anc, open(os.path.join(OUT, 'f_old_1_topper.json'), 'w'))   # read by BASES' witch entry in js/explore_hero.js
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
