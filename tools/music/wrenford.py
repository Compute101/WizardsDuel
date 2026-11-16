# Wrenford, the University town: a town theme that loops (Fable's version, an alternative to
# audio/wrenford_college_theme.mp3, which this never touches).
#   python3 tools/music/wrenford.py           -> audio/wrenford_theme.mid / .mp3 (a seamless loop)
#   python3 tools/music/wrenford.py --midi    -> the MIDI only
#   python3 tools/music/wrenford.py --check   -> also print ranges, voice-leading, loudness and the seam check
#   python3 tools/music/wrenford.py --x3      -> also wrenford_theme_x3.mp3 (the loop three times, for the seam)
#
# The exiles' new home: the Corvanthe theme (corvanthe.THEME, D minor with a Phrygian Eb) turned to
# D major. Its rising triad (D F A) opens the tune as D F# A in quavers, its dotted fall (Bb. G Eb)
# becomes a stepwise dotted fall, and its Phrygian step (Eb -> D) comes back as a borrowed Bb falling
# to A: G minor inside D major, and Bb -> A7 as the last cadence, which leads back to the top.
#
#   A  Stroll     bars 0-7    D major   the Wrenford tune on clarinet over harp and plucked strings; celesta echoes
#   B  Memory     bars 8-15   B minor   the lost city, remembered: cor anglais plays Corvanthe's own first two bars
#                                       (rising triad, Phrygian fall onto C) under a tolling bell; the violins
#                                       answer and turn it toward the major
#   A2 Quads      bars 16-23  D major   the tune on violins and flute, a cello countermelody, horns
#   C  Evensong   bars 24-31  G major   a chorale from Corvanthe's rhythm (crotchet, crotchet, minim; dotted fall) in
#                                       the major: clarinet, horns and bassoon, then strings; celesta like distant
#                                       change-ringing; C - Bb - A7 in the bass (the Phrygian step) back to bar 0
import itertools, os, random, subprocess, sys, tempfile, wave
import numpy as np
import mido
import corvanthe as cv

TPB = cv.TPB
OUTDIR = os.path.join(cv.HERE, '..', '..', 'audio')
NAME = 'wrenford_theme'
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
BPM = 84
TAIL_BEATS = 8
rnd = random.Random(11)

# track -> (GM program, volume, pan, reverb, playable range)
PARTS = {
    'clar':  (71, 112, 54, 85, (50, 91)),
    'oboe':  (68, 100, 72, 85, (52, 91)),    # cor anglais (program 69) in the Memory section
    'flute': (73, 96, 58, 90, (60, 96)),
    'bsn':   (70, 100, 78, 80, (34, 72)),
    'horn':  (60, 100, 44, 95, (41, 77)),
    'vln':   (48, 120, 38, 90, (55, 100)),
    'inner': (48, 100, 60, 90, (48, 84)),    # violins II / violas
    'cello': (42, 114, 84, 80, (36, 76)),
    'bass':  (43, 104, 92, 70, (24, 55)),
    'pizz':  (45, 116, 70, 70, (28, 79)),    # plucked strings: the walking bass and off-beat chords
    'harp':  (46, 108, 30, 80, (24, 103)),
    'cel':   (8, 100, 82, 95, (60, 108)),    # celesta
    'glock': (9, 110, 48, 95, (72, 103)),
    'bells': (14, 110, 44, 100, (60, 77)),    # tubular bell: the bell rung for the dead
}
ev, chans, LEVEL = {}, {}, {}
TOP, BOT = [], []                             # outer voices, for the parallels check


def ch(tr):
    if tr not in chans:
        c = len(chans)
        c = c + 1 if c >= 9 else c            # skip the drum channel
        chans[tr] = c
        prog, vol, pan, rev, _ = PARTS[tr]
        LEVEL[tr] = 100
        ev[tr] = [(0, mido.Message('program_change', channel=c, program=prog)),
                  (0, mido.Message('control_change', channel=c, control=7, value=vol)),
                  (0, mido.Message('control_change', channel=c, control=10, value=pan)),
                  (0, mido.Message('control_change', channel=c, control=11, value=100)),
                  (0, mido.Message('control_change', channel=c, control=91, value=rev))]
    return chans[tr]


def cc(tr, beat, val, ctl=11):
    ev[tr].append((int(beat * TPB), mido.Message('control_change', channel=ch(tr), control=ctl,
                                                 value=max(0, min(127, int(val))))))


def dyn(tr, beat, val):
    """Set a part's expression level from here on."""
    ch(tr); LEVEL[tr] = val; cc(tr, beat, val)


def cresc(tr, b0, b1, v0, v1):
    ch(tr)
    steps = max(2, int((b1 - b0) * 4))
    for k in range(steps + 1):
        cc(tr, b0 + (b1 - b0) * k / steps, v0 + (v1 - v0) * k / steps)
    LEVEL[tr] = v1


def prog_at(tr, beat, program):
    ch(tr)
    ev[tr].append((int(beat * TPB) - 2, mido.Message('program_change', channel=ch(tr), program=program)))


def note(tr, n, start, dur, vel, jitter=3, art=None):
    c = ch(tr)
    vel = max(1, min(127, int(vel + rnd.randint(-jitter, jitter))))
    s = int(start * TPB)
    e = int((start + dur * art) * TPB) if art else int((start + dur) * TPB) - 8
    e = min(e, END_BEATS * TPB - 8)                 # nothing is held past the loop point
    ev[tr].append((s, mido.Message('note_on', channel=c, note=int(n), velocity=vel)))
    ev[tr].append((max(s + 10, e), mido.Message('note_off', channel=c, note=int(n), velocity=0)))


def N(s):
    pc = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[s[0]]
    i = 1
    while s[i] in '#b':
        pc += 1 if s[i] == '#' else -1
        i += 1
    return pc + 12 * (int(s[i:]) + 1)


def seq(s, start):
    """'D4:1 F4:1 r:2' -> [(note, start, dur)], rests dropped."""
    out, t = [], start
    for tok in s.split():
        nm, d = tok.split(':')
        d = float(d)
        if nm != 'r':
            out.append((N(nm), t, d))
        t += d
    return out


def play(tr, notes, vel, shift=0, art=.96, swell=0, top=False):
    """A melodic line. swell: long notes bloom by that much expression and settle back."""
    ch(tr)
    for n, s, d in notes:
        a = art if d >= .5 else min(art, .8)
        note(tr, n + shift, s, d, vel + (3 if d >= 2 else 0), art=a)
        if swell and d >= 1.5:
            L = LEVEL[tr]
            for k in range(9):
                x = k / 8
                cc(tr, s + d * x, L + swell * (x / .5 if x < .5 else 1 - (x - .5) * 1.2))
            cc(tr, s + d, L)
        if top:
            TOP.append((s, n + shift))


def line(tr, start, s, vel, **kw):
    play(tr, seq(s, start), vel, **kw)


# ---- harmony ---------------------------------------------------------------
class Chord:
    QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'sus': [0, 5, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10]}

    def __init__(self, nm):
        main, _, slash = nm.partition('/')
        root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
        self.name = nm
        self.root = cv.NAMES[root]
        self.iv = self.QUAL[main[len(root):]]
        self.bass = cv.NAMES[slash] if slash else self.root
        self.pcs = [(self.root + i) % 12 for i in self.iv]

    def low(self, lo=33):                       # the bass note, A1 .. G#2 by default
        return lo + (self.bass - lo) % 12

    def tone(self, k, lo):                      # k-th triad tone above the root placed at or over lo
        return lo + (self.root - lo) % 12 + self.iv[k % 3] + 12 * (k // 3)


SECTIONS = [
    ('A', 'Stroll', ['D', 'Bm/D', 'G', 'A7', 'D/F#', 'G', 'G|Gm', 'D']),
    ('B', 'Memory', ['Bm', 'C/E', 'G', 'A|F#/A#', 'Bm', 'Em', 'G', 'Asus|A7']),
    ('Q', 'Quads', ['D', 'F#m|Bm', 'G', 'A7', 'D/F#', 'G', 'G|Gm', 'D']),
    ('C', 'Evensong', ['G', 'D', 'Em', 'Bm', 'Am7', 'G/B', 'C|Bb', 'Asus|A7']),
]
HARM, SEC = [], {}
for key, _, names in SECTIONS:
    SEC[key] = len(HARM)
    for nm in names:
        h = [Chord(x) for x in nm.split('|')]
        HARM.append(h if len(h) == 2 else h * 2)
NBARS = len(HARM)
END_BEATS = NBARS * 4

TEMPO = [(0, BPM), (END_BEATS - 2, BPM - 3), (END_BEATS - 1, BPM - 6)]   # the last bar eases a little


def seconds(beat):
    t, last, bpm = 0.0, 0.0, TEMPO[0][1]
    for b, v in sorted(TEMPO):
        if b >= beat:
            break
        t += (b - last) * 60 / bpm
        last, bpm = b, v
    return t + (beat - last) * 60 / bpm


def at(beat):
    return HARM[int(beat // 4)][0 if beat % 4 < 2 else 1]


def split(b):
    return HARM[b][0].name != HARM[b][1].name


def voice(prev, c, lo, hi, n):
    """n-part voicing of chord c in lo..hi that moves least from prev (smooth voice leading)."""
    cand = [p for p in range(lo, hi + 1) if p % 12 in c.pcs]
    third = (c.root + c.iv[1]) % 12
    seventh = (c.root + c.iv[3]) % 12 if len(c.iv) > 3 else None
    best, bc = None, 1e9
    for combo in itertools.combinations(cand, n):
        if any(b - a < 3 for a, b in zip(combo, combo[1:])) or combo[-1] - combo[0] > 17:
            continue
        have = {p % 12 for p in combo}
        cost = (0 if third in have else 9) + (0 if seventh is None or seventh in have else 7)
        cost += 4 * (min(n, 3) - len(have)) if len(have) < min(n, 3) else 0
        cost += sum(abs(a - b) for a, b in zip(combo, prev)) if prev else abs(combo[n // 2] - (lo + hi) / 2)
        if cost < bc:
            best, bc = combo, cost
    return list(best)


def pad(tr, b0, b1, lo, hi, n, vel, prev=None, art=.99):
    """Sustained chords, a bar at a time (or a half where the harmony changes mid-bar)."""
    for b in range(b0, b1):
        for h in ((0, 1) if split(b) else (0,)):
            prev = voice(prev, HARM[b][h], lo, hi, n)
            for p in prev:
                note(tr, p, b * 4 + h * 2, 2 if split(b) else 4, vel, art=art)
    return prev


# ---- shared figures --------------------------------------------------------
ARP = [0, 2, 3, 4, 5, 4, 3, 2]


def harp8(b, vel, lo=50, pat=ARP):
    """Rocking quaver arpeggios."""
    for i, k in enumerate(pat):
        beat = b * 4 + i * .5
        note('harp', at(beat).tone(k, lo), beat, 1.2, vel + (9 if i % 4 == 0 else 3 if i % 2 == 0 else 0))


def harp4(b, vel, lo=50):
    for i, k in enumerate([0, 2, 3, 2]):
        note('harp', at(b * 4 + i).tone(k, lo), b * 4 + i, 2, vel + (8 if i == 0 else 0))


def stroll(b, vel, pv, chords=True):
    """The walk: plucked bass on 1 and 3 (root, then the fifth), plucked chords on 2 and 4."""
    for h in (0, 2):
        c = at(b * 4 + h)
        n = c.low() if h == 0 or split(b) else c.tone(2, 33 + (c.root - 33) % 12 - 12 + 12) - 12
        if n < 31:
            n += 12
        note('pizz', n, b * 4 + h, 1, vel + (8 if h == 0 else 0), art=.9)
        if h == 0:
            BOT.append((b * 4, c.low()))
        if chords:
            pv = voice(pv, c, 57, 72, 2)
            for p in pv:
                note('pizz', p, b * 4 + h + 1, .5, vel - 22, art=.8)
    return pv


def sustain_bass(b, vel, trs=('cello', 'bass')):
    for h in ((0, 1) if split(b) else (0,)):
        c = HARM[b][h]
        d = 2 if split(b) else 4
        for tr in trs:
            n = c.low() + (12 if tr in ('cello', 'bsn') else 0)
            note(tr, n, b * 4 + h * 2, d, vel, art=.98)
        BOT.append((b * 4 + h * 2, c.low()))


def gliss(start, end, pcs, lo, hi, v0, v1):
    ns = [n for n in range(lo, hi + 1) if n % 12 in pcs]
    for k, n in enumerate(ns):
        note('harp', n, start + (end - start) * k / len(ns), .8, v0 + (v1 - v0) * k / len(ns), 2)


# The Wrenford tune. Bars 1 and 3 open with Corvanthe's rising triad (in quavers, in the major), bars
# 2 and 4 answer with its dotted fall (by step, not by thirds); bar 7's Bb is the Phrygian shadow.
TUNE = ('D4:.5 F#4:.5 A4:1 B4:1.5 A4:.5  F#4:1.5 E4:.5 D4:2  D4:.5 G4:.5 B4:1 D5:1.5 B4:.5  A4:1.5 G4:.5 E4:2  '
        'D4:.5 F#4:.5 A4:1 D5:1.5 E5:.5  F#5:1.5 E5:.5 D5:1 B4:1  E5:1 D5:.5 B4:.5 Bb4:1.5 G4:.5  A4:1 F#4:1 D4:2')
D_MAJOR = {2, 4, 6, 7, 9, 11, 1}

# ============================================================================
# A  Stroll: the tune on clarinet, harp and plucked strings
# ============================================================================
b = SEC['A']
t = b * 4
dyn('clar', t, 108); dyn('harp', t, 104); dyn('pizz', t, 104); dyn('cel', t, 100)
dyn('inner', t, 76); dyn('flute', t, 92); dyn('horn', t, 80); dyn('cello', t, 86); dyn('bass', t, 84)
line('clar', t, TUNE, 92, swell=10, top=True)
line('flute', t + 16, ' '.join(TUNE.split()[18:31]), 66, shift=12, swell=8)       # the second phrase, an octave above
pv = None
for lb in range(8):
    harp8(b + lb, 66 + (4 if lb >= 4 else 0))
    pv = stroll(b + lb, 84, pv)
p_in = pad('inner', b, b + 8, 55, 72, 3, 50)
p_hn = pad('horn', b + 4, b + 8, 53, 67, 2, 46)
note('cello', 50, t, 8, 52, art=1); note('cello', 43, t + 8, 4, 52, art=1); note('cello', 45, t + 12, 4, 52, art=1)
# celesta: the rising triad again, an echo up in the rafters, where the tune holds
line('cel', t + 6, 'B5:.5 D6:.5 F#6:1.5', 86)
line('cel', t + 14, 'A5:.5 C#6:.5 E6:1.5', 86)
line('cel', t + 30, 'F#5:.5 A5:.5 D6:1.5', 84)
note('glock', 86, t + 16, 2, 74)

# ============================================================================
# B  Memory: Corvanthe, remembered. Cor anglais, a tolling bell, then the violins turn it to the major
# ============================================================================
b = SEC['B']
t = b * 4
prog_at('oboe', t, 69)
dyn('oboe', t, 120); dyn('vln', t, 104); dyn('inner', t, 96); dyn('cello', t, 104); dyn('bass', t, 96)
dyn('horn', t, 84); dyn('flute', t, 92); dyn('clar', t, 88)
note('bells', 66, t, 6, 92); note('bells', 66, t + 16, 6, 84)
line('oboe', t, 'B4:1 D5:1 F#5:2  G5:1.5 E5:.5 C5:2', 104, swell=14, top=True)     # the theme's first two bars
line('clar', t + 4, 'r:2 E4:1 G4:1', 60)
line('vln', t + 8, 'B4:.5 D5:.5 G5:1 F#5:1.5 E5:.5  E5:1.5 D5:.5 C#5:2', 90, swell=12, top=True)
line('flute', t + 8, 'B4:.5 D5:.5 G5:1 F#5:1.5 E5:.5  E5:1.5 D5:.5 C#5:2', 62, shift=12)
cresc('vln', t + 15, t + 16, 104, 108)
line('vln', t + 16, 'D5:1 F#5:1 B5:2  A5:1.5 G5:.5 E5:2  B4:.5 D5:.5 G5:1 B5:1.5 A5:.5  A5:2 G5:1 E5:1', 86,
     swell=12, top=True)
line('oboe', t + 16, 'B4:2 F#4:2  G4:2 B4:2  D5:3 B4:1  D5:2 C#5:2', 76, swell=10)   # cor anglais, a third voice
line('flute', t + 24, 'B4:.5 D5:.5 G5:1 B5:1.5 A5:.5  A5:2 G5:1 E5:1', 70, shift=12)
p_in = pad('inner', b, b + 8, 55, 74, 3, 72, p_in)
p_hn = pad('horn', b + 4, b + 8, 53, 67, 2, 52, p_hn)
for lb in range(8):
    sustain_bass(b + lb, 74 if lb < 4 else 72, ('cello', 'bass') if lb >= 2 else ('cello',))
    if lb < 4:
        harp4(b + lb, 78)
    else:
        harp8(b + lb, 62 + lb)
for tr in ('vln', 'inner', 'cello', 'bass', 'horn'):
    cresc(tr, t + 24, t + 32, LEVEL[tr], min(127, LEVEL[tr] + 10))
gliss(t + 31, t + 32, D_MAJOR, 57, 86, 50, 78)

# ============================================================================
# Q  Quads: the tune on the violins, a cello countermelody
# ============================================================================
b = SEC['Q']
t = b * 4
prog_at('oboe', t, 68)
for tr, v in (('vln', 108), ('flute', 100), ('oboe', 96), ('cello', 106), ('bass', 96), ('inner', 92), ('horn', 92),
              ('clar', 90), ('harp', 108), ('pizz', 104)):
    dyn(tr, t, v)
line('vln', t, TUNE, 96, shift=12, swell=10, top=True)
line('flute', t + 16, ' '.join(TUNE.split()[18:]), 78, shift=12, swell=8)
line('oboe', t + 16, ' '.join(TUNE.split()[18:]), 72, swell=8)
line('cello', t, 'F#3:2 A3:1 D4:1  C#4:2 B3:1 D4:1  B3:2 D4:1 G4:1  E4:2 C#4:1 A3:1  '
     'A3:2 D4:1 F#4:1  B3:2 D4:1 G4:1  B3:2 Bb3:2  A3:2 F#3:2', 74, swell=12)
line('clar', t, 'A4:4  A4:2 F#4:2  G4:4  G4:2 E4:2', 62)                          # a held inner voice in the first phrase
p_in = pad('inner', b, b + 8, 57, 76, 3, 68, p_in)
p_hn = pad('horn', b, b + 8, 53, 67, 2, 60, p_hn)
pv = None
for lb in range(8):
    harp8(b + lb, 72)
    sustain_bass(b + lb, 72, ('bass',))
    pv = stroll(b + lb, 80, pv, chords=False)
    note('bsn', at((b + lb) * 4).low() + 12, (b + lb) * 4, 4 if not split(b + lb) else 2, 60, art=.97)
    if split(b + lb):
        note('bsn', at((b + lb) * 4 + 2).low() + 12, (b + lb) * 4 + 2, 2, 60, art=.97)
note('glock', 86, t, 2, 82); note('glock', 81, t + 16, 2, 80); note('glock', 90, t + 20, 2, 78)
line('cel', t + 6, 'F#5:.5 B5:.5 D6:1.5', 88)
line('cel', t + 14, 'A5:.5 C#6:.5 E6:1.5', 88)

# ============================================================================
# C  Evensong: a chorale in G on the lost city's rhythm; winds, then strings; bells over the roofs
# ============================================================================
b = SEC['C']
t = b * 4
for tr, v in (('clar', 110), ('horn', 100), ('bsn', 104), ('vln', 104), ('inner', 88), ('cello', 100), ('bass', 94),
              ('flute', 96), ('oboe', 92), ('cel', 104), ('harp', 104)):
    dyn(tr, t, v)
line('clar', t, 'B4:1 D5:1 G5:2  F#5:1.5 E5:.5 D5:2  G4:1 B4:1 E5:2  D5:1.5 C#5:.5 B4:2', 94, swell=12, top=True)
line('oboe', t + 8, 'r:2 B4:2  B4:2 F#4:2', 66, swell=8)
line('vln', t + 16, 'C5:1 E5:1 G5:2  G5:1.5 F#5:.5 D5:2  G5:1 E5:1 D5:2  E5:3.5', 98, swell=12, top=True)
line('flute', t + 16, 'C5:1 E5:1 G5:2  G5:1.5 F#5:.5 D5:2  G5:1 E5:1 D5:2', 74, shift=12, swell=8)
line('clar', t + 16, 'E4:4  D4:4  E4:2 F4:2  G4:2 G4:1.5', 66)
p_hn = pad('horn', b, b + 8, 53, 67, 2, 64, p_hn)
p_in = pad('inner', b, b + 4, 55, 72, 3, 48, p_in)
p_in = pad('inner', b + 4, b + 8, 57, 76, 3, 70, p_in)
for lb in range(8):
    bar = b + lb
    sustain_bass(bar, 70, ('bsn',) if lb < 4 else ('cello', 'bass'))
    if lb < 4:
        note('pizz', at(bar * 4).low(), bar * 4, 1, 80, art=.9)
    else:
        note('bsn', at(bar * 4).low() + 12, bar * 4, 2 if split(bar) else 4, 56, art=.97)
        if split(bar):
            note('bsn', at(bar * 4 + 2).low() + 12, bar * 4 + 2, 2, 56, art=.97)
    harp4(bar, 62)
    # celesta: falling broken chords, like change-ringing heard across the meadow
    for i, k in enumerate([6, 5, 4, 3, 5, 4, 3, 2]):
        beat = bar * 4 + i * .5
        if lb == 7 and i >= 4:
            break
        note('cel', at(beat).tone(k, 67), beat, 1, 68 + (8 if i % 4 == 0 else 0) + (4 if lb >= 4 else 0))
note('bells', 62, t, 6, 84); note('bells', 62, t + 16, 6, 84); note('bells', 69, t + 28, 4, 78)
# the way home: a harp arpeggio up the dominant seventh into bar 0
for k, n in enumerate([45, 52, 57, 61, 64, 67, 69, 73]):
    note('harp', n, t + 30 + k * .25, 1.2, 60 + k * 3)
for tr in ('vln', 'inner', 'cello', 'bass', 'horn', 'bsn', 'clar'):
    cresc(tr, t + 28, t + 31.9, LEVEL[tr], LEVEL[tr] - 10)


# ---- output ----------------------------------------------------------------
ORDER = {'program_change': 0, 'control_change': 0, 'note_off': 1, 'note_on': 2}


def save(path, tail=0):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name', name='Wrenford (Fable)'))
    last = 0
    for beat, bpm in sorted(TEMPO):
        at_ = int(beat * TPB)
        tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=at_ - last)); last = at_
    for name, lst in ev.items():
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=name))
        last = 0
        for at_, msg in sorted(lst, key=lambda x: (max(0, x[0]), ORDER[x[1].type])):
            at_ = max(0, at_)
            tr.append(msg.copy(time=at_ - last)); last = at_
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((END_BEATS + tail) * TPB) - last)))
    mid.save(path)


def write_wav(path, a, sr):
    o = wave.open(path, 'wb'); o.setnchannels(a.shape[1]); o.setsampwidth(2); o.setframerate(sr)
    o.writeframes(a.astype(np.int16).tobytes()); o.close()


def render(mp3_path, x3=False):
    """A seamless loop: the reverb tail past the loop's end is folded back onto its start (as render.py does)."""
    tmp = tempfile.mkdtemp()
    mpath, raw, loop = (os.path.join(tmp, f) for f in ('t.mid', 'raw.wav', 'loop.wav'))
    save(mpath, TAIL_BEATS)
    gain = .6
    while True:                                           # fluidsynth writes 16 bits: back off until nothing clips
        subprocess.run(['fluidsynth', '-ni', '-g', str(gain), '-r', '44100', '-F', raw, SF2, mpath],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        w = wave.open(raw); chn, sr = w.getnchannels(), w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, chn).astype(np.float32)
        if np.abs(a).max() < 32000:
            break
        gain *= .75
    L = int(round(seconds(END_BEATS) * sr))
    out = a[:L].copy()
    tail = a[L:][:L]
    out[:len(tail)] += tail
    tail_db = 20 * np.log10(max(1e-6, np.sqrt((tail[:sr] ** 2).mean()) / 32767))
    out *= .89 * 32767 / np.abs(out).max()
    write_wav(loop, out, sr)
    ff = ['ffmpeg', '-y', '-loglevel', 'error']
    subprocess.run(ff + ['-i', loop, '-b:a', '128k', mp3_path], check=True)
    if x3:
        subprocess.run(ff + ['-stream_loop', '2', '-i', loop, '-b:a', '128k', mp3_path[:-4] + '_x3.mp3'], check=True)
    print('Wrenford (Fable) loop %.1f s, %d bars at %d bpm; synth gain %.2f; folded tail (first second) %.1f dB' % (
        L / sr, NBARS, BPM, gain, tail_db))
    return out, sr


def check(a, sr):
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    nm = lambda n: '%s%d' % (names[n % 12], n // 12 - 1)
    print('\nSections')
    for key, title, chords in SECTIONS:
        b0 = SEC[key]
        print('  %5.1f s  bar %2d  %-9s %s' % (seconds(b0 * 4), b0, title, ' | '.join(chords)))
    print('  %5.1f s  loop point' % seconds(END_BEATS))
    print('\nRanges (lowest - highest, allowed)')
    for tr, lst in ev.items():
        ns = [m.note for _, m in lst if m.type == 'note_on']
        lo, hi = PARTS[tr][4]
        flag = '' if lo <= min(ns) and max(ns) <= hi else '   <-- OUT OF RANGE'
        late = max(s for s, m in lst if m.type == 'note_off')
        if late > END_BEATS * TPB:
            flag += '   <-- HELD PAST THE LOOP POINT'
        print('  %-6s %-4s - %-4s (%s - %s)  %4d notes%s' % (tr, nm(min(ns)), nm(max(ns)), nm(lo), nm(hi), len(ns), flag))
    print('  channels used: %d melodic, no drums' % len(chans))
    # parallel fifths / octaves between the tune and the bass, at each bass change (the loop's seam included)
    top = sorted(set(TOP)); bot = sorted(set(BOT))
    top += [(s + END_BEATS, n) for s, n in top[:1]]; bot += [(s + END_BEATS, n) for s, n in bot[:1]]
    def top_at(beat):
        c = [n for s, n in top if s <= beat + 1e-6]
        return c[-1] if c else None
    found = []
    for (s0, b0), (s1, b1) in zip(bot, bot[1:]):
        t0, t1 = top_at(s1 - .01), top_at(s1)
        if t0 is None or t1 is None or b0 == b1 or t0 == t1:
            continue
        i0, i1 = (t0 - b0) % 12, (t1 - b1) % 12
        if i0 == i1 and i0 in (0, 7) and (t1 - t0) * (b1 - b0) > 0:
            found.append('bar %d (%s/%s -> %s/%s, %s)' % (s1 // 4, nm(t0), nm(b0), nm(t1), nm(b1),
                                                         'octaves' if i0 == 0 else 'fifths'))
    print('\nParallel fifths/octaves, tune against bass: %s' % ('; '.join(found) if found else 'none'))
    m = a.mean(axis=1) / 32767
    rms = lambda seg: 20 * np.log10(max(1e-6, np.sqrt((seg ** 2).mean())))
    win = 5 * sr
    print('\nLoudness, RMS per 5 s (dBFS)')
    dbs = []
    for i in range(0, len(m), win):
        seg = m[i:i + win]
        if len(seg) < sr:
            break
        dbs.append(rms(seg))
        print('  %3d-%3d s %6.1f dB  %s' % (i / sr, min(len(m), i + win) / sr, dbs[-1], '#' * max(0, int((dbs[-1] + 48) * 1.2))))
    print('  peak %.3f, overall RMS %.1f dB, range %.1f dB, samples at full scale: %d' % (
        np.abs(a).max() / 32767, rms(m), max(dbs) - min(dbs), int((np.abs(a) >= 32766).sum())))
    q = np.sqrt(np.convolve(m ** 2, np.ones(sr // 4) / (sr // 4), 'same'))
    quiet = np.nonzero(q < 10 ** (-50 / 20))[0]
    print('  quiet stretches (below -50 dB): %s' % ('none' if not len(quiet) else '%.1f s in all, first at %.1f s' % (
        len(quiet) / sr, quiet[0] / sr)))
    print('\nSeam (the end joined to the start)')
    print('  last 5 s %.1f dB, first 5 s %.1f dB; last 1 s %.1f dB, first 1 s %.1f dB' % (
        rms(m[-win:]), rms(m[:win]), rms(m[-sr:]), rms(m[:sr])))
    d = np.abs(np.diff(m))
    print('  sample step across the seam %.4f (largest step anywhere %.4f, typical %.4f)' % (
        abs(m[0] - m[-1]), d.max(), np.percentile(d, 99)))
    j = np.concatenate([m[-sr:], m[:sr]])
    e = np.sqrt(np.convolve(j ** 2, np.ones(sr // 10) / (sr // 10), 'valid')[::sr // 10])
    print('  100 ms levels across the seam (1 s before | 1 s after): %s' % ' '.join(
        ('| ' if k == 10 else '') + '%.0f' % (20 * np.log10(max(1e-6, x))) for k, x in enumerate(e[:20])))


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    save(os.path.join(OUTDIR, NAME + '.mid'))
    if '--midi' not in sys.argv:
        a, sr = render(os.path.join(OUTDIR, NAME + '.mp3'), '--x3' in sys.argv)
        if '--check' in sys.argv:
            check(a, sr)
