# WizardsDuel main theme, a second arrangement of the Corvanthe theme (corvanthe.THEME).
#   python3 tools/music/main_theme_fable.py           -> audio/main_theme_fable.mid / .mp3
#   python3 tools/music/main_theme_fable.py --midi    -> the MIDI only
#   python3 tools/music/main_theme_fable.py --check   -> also print ranges, voice-leading and loudness checks
#
#   I  Intro      bars 0-3    D minor   the theme in fragments: solo horn, oboe answer, horns, brass on the dominant
#   V  Vamp       bars 4-5    D minor   the forge rhythm (3+3+2) in 16ths, the fanfare call
#   S  Statement  bars 6-13   D minor   theme on horns and cellos with a violin countermelody; then violins take
#                                       it up an octave and the horns answer
#   B  Bridge     bars 14-21  Bb major  a heroic major tune from the theme's two motifs (rising triad, dotted
#                                       fall), trumpets calling and horns answering, climbing Eb - F - Gb - Ab
#   Q  Quiet      bars 22-25  Bb minor  the expected Bb major never comes: oboe and solo cello, then flute, pp
#   U  Build      bars 26-29  C pedal   the rising figure in stretto from low brass to violins, getting shorter
#   G  Grand      bars 30-37  F minor   the whole theme tutti; half way it lifts a tone into G minor
#   C  Coda       bars 38-42  G major   Eb - F - G, the Phrygian fall (Ab) one last time, three hammer blows
import itertools, os, random, subprocess, sys, tempfile, wave
import numpy as np
import mido
import corvanthe as cv

TPB = cv.TPB
OUTDIR = os.path.join(cv.HERE, '..', '..', 'audio')
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
rnd = random.Random(7)

# track -> (GM program, volume, pan, reverb, playable range)
PARTS = {
    'vln':   (48, 127, 38, 90, (55, 100)),   # violins I
    'inner': (48, 108, 58, 90, (55, 88)),    # violins II / violas, sustained or tremolo (program 44)
    'ost':   (41, 127, 74, 70, (48, 84)),    # violas, the 16th-note ostinato
    'cello': (42, 127, 84, 80, (36, 76)),
    'bass':  (43, 114, 92, 70, (24, 55)),
    'horn':  (60, 112, 46, 95, (41, 77)),
    'tpt':   (56, 122, 76, 85, (55, 84)),
    'tbn':   (57, 86, 88, 85, (40, 72)),
    'tuba':  (58, 86, 80, 80, (26, 58)),
    'timp':  (47, 127, 56, 80, (38, 57)),
    'choir': (52, 106, 64, 100, (48, 79)),
    'harp':  (46, 100, 30, 80, (24, 103)),
    'flute': (73, 96, 58, 90, (60, 96)),
    'oboe':  (68, 100, 68, 90, (58, 91)),
    'bells': (14, 78, 44, 100, (60, 79)),
}
BD, SN, CRASH, CYM = 36, 38, 57, 59           # orchestra kit (program 48 on the drum channel)
ev, chans, LEVEL = {}, {}, {}
TOP, BOT = [], []                             # outer voices, for the parallels check


def ch(tr):
    if tr == 'drums':
        if tr not in ev:
            ev[tr] = [(0, mido.Message('program_change', channel=9, program=48)),
                      (0, mido.Message('control_change', channel=9, control=7, value=112)),
                      (0, mido.Message('control_change', channel=9, control=91, value=90))]
        return 9
    if tr not in chans:
        c = len(chans)
        c = c + 1 if c >= 9 else c
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
    ch(tr)
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


def play(tr, notes, vel, shift=0, art=.95, swell=0, top=False):
    """A melodic line. swell: long notes bloom by that much expression and settle back."""
    ch(tr)
    for n, s, d in notes:
        a = art if d >= .5 else min(art, .8)
        note(tr, n + shift, s, d, vel + (4 if d >= 2 else 0), art=a)
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


def roll(tr, n, start, dur, v0, v1, step=.125):
    total = int(round(dur / step))
    for k in range(total):
        note(tr, n, start + k * step, step, v0 + (v1 - v0) * k / max(1, total - 1), 2, art=.9)


def run(tr, end, names, v0, v1, step=.25):
    """A scale run in 16ths that stops at `end`."""
    ns = names.split()
    for k, nm in enumerate(ns):
        note(tr, N(nm), end - (len(ns) - k) * step, step, v0 + (v1 - v0) * k / max(1, len(ns) - 1), 2, art=.92)


def gliss(start, end, pcs, lo, hi, v0, v1):
    ns = [n for n in range(lo, hi + 1) if n % 12 in pcs]
    for k, n in enumerate(ns):
        note('harp', n, start + (end - start) * k / len(ns), .8, v0 + (v1 - v0) * k / len(ns), 2)


# ---- harmony ---------------------------------------------------------------
class Chord:
    def __init__(self, nm):
        main, _, slash = nm.partition('/')
        root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
        self.name = nm
        self.root = cv.NAMES[root]
        self.iv = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10]}[main[len(root):]]
        self.bass = cv.NAMES[slash] if slash else self.root
        self.pcs = [(self.root + i) % 12 for i in self.iv]

    def low(self, lo=29):                       # the bass note, F1 .. E2 by default
        return lo + (self.bass - lo) % 12

    def tone(self, k, lo):                      # k-th triad tone above the root placed at or over lo
        return lo + (self.root - lo) % 12 + self.iv[k % 3] + 12 * (k // 3)


SECTIONS = [
    ('I', 'Intro', ['Dm', 'Eb/D', 'Gm/D', 'A']),
    ('V', 'Vamp', ['Dm', 'Dm']),
    ('S', 'Statement', ['Dm', 'Eb', 'Dm', 'C|A', 'Bb', 'Gm', 'Eb', 'A|A7']),
    ('B', 'Bridge', ['Bb', 'F/A', 'Gm', 'F', 'Eb', 'F', 'Gb', 'Ab']),
    ('Q', 'Quiet', ['Bbm', 'B', 'Bbm/Db', 'Db|C']),
    ('U', 'Build', ['C', 'C', 'Db/C', 'C7']),
    ('G', 'Grand', ['Fm', 'Gb', 'Fm', 'Eb|C', 'Eb', 'Cm', 'Ab', 'D|D7']),
    ('C', 'Coda', ['Eb|F', 'G', 'Ab', 'G', 'G']),
]
HARM, SEC = [], {}
for key, _, names in SECTIONS:
    SEC[key] = len(HARM)
    for nm in names:
        h = [Chord(x) for x in nm.split('|')]
        HARM.append(h if len(h) == 2 else h * 2)
NBARS = len(HARM)
END_BEATS = NBARS * 4


def at(beat):
    return HARM[int(beat // 4)][0 if beat % 4 < 2 else 1]


def split(b):
    return HARM[b][0].name != HARM[b][1].name


# ---- tempo -----------------------------------------------------------------
TEMPO = []


def tempo(beat, bpm):
    TEMPO.append((beat, bpm))


def tramp(b0, b1, v0, v1):
    steps = max(1, int((b1 - b0) * 2))
    for k in range(steps):
        tempo(b0 + (b1 - b0) * k / steps, v0 + (v1 - v0) * (k + 1) / steps)


def seconds(beat):
    t, last, bpm = 0.0, 0.0, TEMPO[0][1]
    for b, v in sorted(TEMPO):
        if b >= beat:
            break
        t += (b - last) * 60 / bpm
        last, bpm = b, v
    return t + (beat - last) * 60 / bpm


bI, bV, bS, bB, bQ, bU, bG, bC = (SEC[k] * 4 for k in 'IVSBQUGC')
tempo(0, 72)
tramp(bI + 13, bV, 72, 92)                      # into the vamp
tempo(bV, 96)
tramp(bQ - 2, bQ, 96, 84); tempo(bQ, 80)        # the bridge broadens, the quiet section is slower
tramp(bU, bG - .5, 82, 94)                      # the build pushes on
tempo(bG - .5, 66)                              # a breath before the grand statement
tempo(bG, 88)
tramp(bC - 2, bC, 88, 80); tempo(bC, 86)
tramp(bC + 8, bC + 12, 86, 66)                  # the Phrygian bar broadens into the last blows
tempo(bC + 12, 72); tempo(bC + 15, 66)


# ---- shared figures --------------------------------------------------------
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


OST16 = [0, 0, 2, 0, 1, 0, 3, 0, 2, 0, 1, 0, 3, 2, 1, 2]     # accents on 0, 6, 12: 3+3+2 in 16ths
FORGE8 = [0, 0, 2, 3, 0, 0, None, 3]                          # the original cello hammer, in 8ths


def ost16(b, vel, lo=53, tr='ost'):
    for i, k in enumerate(OST16):
        beat = b * 4 + i * .25
        acc = i in (0, 6, 12)
        note(tr, at(beat).tone(k, lo), beat, .25, vel + (26 if acc else 4 if i % 2 else 12), art=.8 if acc else .62)


def gallop(b, vel, lo=53, tr='ost'):
    for q, k in enumerate([0, 3, 4, 3]):
        beat = b * 4 + q
        c = at(beat)
        note(tr, c.tone(k, lo), beat, .5, vel + 22, art=.7)
        note(tr, c.tone(2, lo), beat + .5, .25, vel + 4, art=.6)
        note(tr, c.tone(2 if q < 3 else 1, lo), beat + .75, .25, vel + 8, art=.6)


def forge8(b, vel, tr='cello', lo=41, alt=1):
    """The baseline's 8th-note hammer with its Phrygian semitone, kept as the cellos' figure."""
    for i, k in enumerate(FORGE8):
        beat = b * 4 + i * .5
        c = at(beat)
        n = c.tone(k, lo) if k is not None else c.tone(0, lo) + alt
        acc = i in (0, 3, 6)
        note(tr, n, beat, .5, vel + (14 if acc else -10), art=.8 if acc else .6)


def hits(b):
    return [0, 1.5, 2, 3] if split(b) else [0, 1.5, 3]


def forge(b, vel, trs=('bass',), timp=0, bd=0):
    """The forge heartbeat: 3+3+2 on the chord's bass note."""
    hs = hits(b)
    for i, h in enumerate(hs):
        beat = b * 4 + h
        c = at(beat)
        d = (hs[i + 1] if i + 1 < len(hs) else 4) - h
        for tr in trs:
            note(tr, c.low() + (12 if tr == 'cello' else 0), beat, d, vel + (6 if h == 0 else 0), art=.88)
        if h == 0:
            BOT.append((beat, c.low()))
        if timp:
            note('timp', c.low(41), beat, .5, timp + (8 if h == 0 else -4))
        if bd and h in (0, 3):
            note('drums', BD, beat, .4, bd + (8 if h == 0 else -6))


def march(b, vel, busy=False):
    pat = ([(0, 0), (.5, -22), (.75, -16), (1, -4), (1.5, -22), (1.75, -16), (2, 0), (2.5, -22), (2.75, -16),
            (3, -4), (3.25, -20), (3.5, -14), (3.75, -8)] if busy else
           [(1, 0), (1.75, -20), (2, -10), (3, 4), (3.5, -16), (3.75, -10)])
    for beat, dv in pat:
        note('drums', SN, b * 4 + beat, .15, vel + dv)


def crash(beat, vel, dur=3):
    note('drums', CRASH, beat, dur, vel, 0)
    note('drums', BD, beat, .5, min(127, vel + 4), 0)


def cym_swell(b0, b1, v0, v1):
    roll('drums', CYM, b0, b1 - b0, v0, v1, .25)


THEME = cv.THEME['melody']


def theme(bars, start_bar, shift=0):
    out, t = [], start_bar * 4
    for bar in bars:
        for n, d in bar:
            out.append((n + shift, t, d))
            t += d
    return out


# ============================================================================
# I  Intro: out of the dark. The theme arrives in pieces.
# ============================================================================
b = SEC['I']
prog_at('inner', 0, 44)                          # tremolo
cresc('inner', 0, 12, 62, 96); cresc('inner', 12, 16, 84, 124)
for i, v in enumerate([[62, 69], [63, 67, 70], [62, 67, 70], [64, 69, 73]]):
    for n in v:
        note('inner', n, i * 4, 4, 62 + i * 8, art=1)
cresc('bass', 0, 12, 76, 104); cresc('cello', 0, 12, 76, 104)
note('bass', 38, 0, 12, 60, art=1); note('cello', 50, 0, 8, 56, art=1)
BOT.extend([(0, 38), (12, 33)])
for bar in range(3):                              # the forge heartbeat, far away
    for h, v in ((0, 46), (1.5, 34), (3, 40)):
        note('timp', 50, bar * 4 + h, .5, v + bar * 9)
note('bells', 62, 0, 4, 58); note('bells', 67, 8, 4, 66)
dyn('horn', 0, 104)
line('horn', 0, 'D4:1 F4:1 A4:2', 62, swell=22, top=True)                 # solo horn: the question
dyn('oboe', 0, 108)
line('oboe', 4, 'Bb4:1.5 G4:.5 Eb4:2', 74, swell=14, top=True)            # oboe: the Phrygian fall
for k, n in enumerate([51, 55, 58, 63, 67, 70, 75, 79]):
    note('harp', n, 4 + k * .5, 1.5, 50 + k * 2)
note('harp', 38, 0, 4, 64); note('harp', 50, 0, 4, 58)
dyn('horn', 8, 100)
line('horn', 8, 'G4:1 Bb4:1 D5:2', 84, swell=16, top=True)                # horns: higher (bar 6 of the theme)
line('cello', 8, 'G3:1 Bb3:1 D4:2', 76)
dyn('choir', 8, 70); cresc('choir', 8, 16, 70, 118)
for n in (55, 62, 67):
    note('choir', n, 8, 4, 52, art=1)
for n in (57, 61, 64, 69):
    note('choir', n, 12, 4, 66)
# bar 3: the dominant. Brass chorale, the fanfare call, everything swells
for tr, ns, v in (('tbn', (45, 52, 57, 61), 70), ('tuba', (33,), 72), ('bass', (33,), 84), ('cello', (45, 52), 80),
                  ('horn', (57, 64), 78)):
    cresc(tr, 12, 16, 70, 122)
    for n in ns:
        note(tr, n, 12, 4, v)
cresc('tpt', 12, 16, 74, 120)
line('tpt', 12, 'A4:.75 A4:.25 A4:.5 A4:.5 C#5:.5 E5:1.5', 84, art=.86, top=True)
roll('timp', 45, 12, 4, 36, 112)
cym_swell(13, 16, 24, 92)
gliss(14, 16, {9, 1, 4, 7}, 45, 88, 54, 92)
dyn('vln', 0, 110)
run('vln', 16, 'C#5 D5 E5 F5 G5 A5 Bb5 C#6', 66, 104)

# ============================================================================
# V  Vamp: the forge starts up
# ============================================================================
b = SEC['V']
prog_at('inner', b * 4, 48)
for tr in ('inner', 'bass', 'cello', 'tbn', 'tuba', 'horn', 'tpt', 'choir'):
    dyn(tr, b * 4, 104)
dyn('ost', b * 4, 108)
crash(b * 4, 108)
note('vln', 86, b * 4, 2.5, 100); cresc('vln', b * 4, b * 4 + 2.5, 112, 60); dyn('vln', b * 4 + 3, 100)
for bar in (b, b + 1):
    ost16(bar, 84 + (bar - b) * 6)
    forge(bar, 96, ('bass', 'cello', 'tuba'), timp=98, bd=88)
    for h in (0, 1.5, 3):
        for n in (50, 57, 62):
            note('tbn', n, bar * 4 + h, .5, 88, art=.7)
line('tpt', b * 4 + 2, 'A4:.25 A4:.25 A4:.5 D5:1', 96, art=.85)
line('horn', b * 4 + 4, 'D4:.25 D4:.25 D4:.5 A4:1', 100, art=.85)
line('tpt', b * 4 + 6, 'A4:.25 A4:.25 A4:.5 D5:.5 E5:.5', 102, art=.85)
roll('drums', SN, b * 4 + 7, 1, 40, 92)

# ============================================================================
# S  Statement in D minor
# ============================================================================
b = SEC['S']
dyn('horn', b * 4, 114); dyn('cello', b * 4, 112); dyn('vln', b * 4, 104); dyn('tbn', b * 4, 100)
dyn('inner', b * 4, 98); dyn('ost', b * 4, 112); dyn('bass', b * 4, 112); dyn('tuba', b * 4, 104)
play('horn', theme(THEME[:4], b), 108, swell=12, top=True)
play('cello', theme(THEME[:4], b), 98)
# violin countermelody: it moves where the tune holds
line('vln', b * 4, 'A5:2 D5:.5 E5:.5 F5:1  G5:2 Eb5:.5 F5:.5 G5:1  A5:2 F5:2  E5:2 E5:.5 D5:.5 C#5:1', 88, swell=14)
# second half: violins, flute and oboe carry the tune; horns answer in the gaps
cresc('vln', b * 4 + 15, b * 4 + 16, 104, 116)
play('vln', theme(THEME[4:], b + 4, 12), 114, swell=10, top=True)
dyn('flute', b * 4 + 16, 108); play('flute', theme(THEME[4:], b + 4, 12), 98)
dyn('oboe', b * 4 + 16, 106); play('oboe', theme(THEME[4:], b + 4), 94)
dyn('horn', b * 4 + 16, 104)
line('horn', b * 4 + 16, 'F4:2 Bb4:.5 C5:.5 D5:1  D5:2 Bb4:1 D5:1  G4:1 Bb4:1 Eb5:2', 86, swell=16)
dyn('horn', b * 4 + 28, 108); dyn('tpt', b * 4 + 28, 104)
line('horn', b * 4 + 28, 'A4:.75 A4:.25 A4:.5 C#5:.5 E5:2', 100, art=.86)       # the call, on the dominant
line('tpt', b * 4 + 28, 'A4:.75 A4:.25 A4:.5 C#5:.5 E5:2', 98, art=.86)
p1 = p2 = p3 = None
dyn('choir', b * 4 + 16, 88); cresc('choir', b * 4 + 16, b * 4 + 32, 88, 116)
for lb in range(8):
    bar = b + lb
    late = lb >= 4
    ost16(bar, 86 + lb * 2)
    forge(bar, 94 + lb * 2, ('bass', 'tuba') if late else ('bass',), timp=84 + lb * 3, bd=74 + lb * 3)
    if late:
        forge8(bar, 92 + lb, alt=1 if lb % 2 == 0 else 8)
        march(bar, 54 + lb * 3)
    if lb in (1, 3):
        note('bells', 74, bar * 4 + 3, 1, 58)                     # the Cindergate anvil
p1 = pad('tbn', b, b + 8, 48, 65, 3, 74)
p2 = pad('inner', b, b + 8, 57, 74, 3, 76)
p3 = pad('choir', b + 4, b + 8, 55, 72, 3, 66)
crash(b * 4, 92); crash(b * 4 + 16, 98)
gliss(b * 4 + 15, b * 4 + 16, {0, 2, 4, 5, 7, 9, 10}, 62, 86, 58, 84)
roll('timp', 45, b * 4 + 30, 2, 60, 108)
cym_swell(b * 4 + 30, b * 4 + 32, 30, 86)
gliss(b * 4 + 30, b * 4 + 32, {9, 1, 4, 7}, 45, 93, 60, 96)

# ============================================================================
# B  Bridge in Bb major: the heroic answer, from the theme's own two motifs
# ============================================================================
b = SEC['B']
t = b * 4
for tr, v in (('tpt', 112), ('horn', 112), ('vln', 112), ('inner', 108), ('ost', 114), ('tbn', 106), ('tuba', 108),
              ('bass', 114), ('cello', 114), ('choir', 100), ('flute', 108)):
    dyn(tr, t, v)
BR = ('Bb4:1 D5:1 F5:2  G5:1.5 F5:.5 C5:2  Bb4:1 D5:1 G5:1 Bb5:1  A5:1.5 G5:.5 F5:2  '
      'G5:1.5 F5:.5 Eb5:2  A5:1.5 G5:.5 F5:2  Bb5:1.5 Ab5:.5 Gb5:2  Eb5:1 Ab5:1 C6:2')
line('tpt', t, BR, 106, swell=14, top=True)
# horns answer in the gaps, then join the climb
line('horn', t, 'r:2 F4:.5 Bb4:.5 D5:1  r:2 C5:.5 A4:.5 F4:1  G4:2 Bb4:2  r:2 C5:.75 C5:.25 C5:.5 F5:.5  '
     'r:2 G4:.5 Bb4:.5 Eb5:1  r:2 A4:.5 C5:.5 F5:1  r:2 Gb4:.5 Bb4:.5 Db5:1  Eb4:1 Ab4:1 C5:2', 98, swell=14)
# violins: a descant with runs into the downbeats, then the tune an octave above the trumpets
line('vln', t, 'D6:3 C6:.25 D6:.25 Eb6:.25 E6:.25  F6:3 F6:.25 E6:.25 D6:.25 C6:.25  Bb5:2 D6:2  '
     'C6:3 C6:.25 D6:.25 Eb6:.25 F6:.25', 96, swell=12)
SECOND = 'G6:1.5 F6:.5 Eb6:2  A6:1.5 G6:.5 F6:2  Bb6:1.5 Ab6:.5 Gb6:2  Eb6:1 Ab6:1 C7:2'
line('vln', t + 16, SECOND, 110, swell=12)
line('flute', t + 16, SECOND, 96, shift=-12)
line('flute', t, 'r:3 C6:.25 D6:.25 Eb6:.25 E6:.25  F6:3 r:1  r:8 r:3 C6:.25 D6:.25 Eb6:.25 F6:.25', 88)
for lb in range(8):
    bar = b + lb
    gallop(bar, 90 + lb * 2)
    for h, d in ((0, 1.5), (1.5, .5), (2, 1.5), (3.5, .5)):       # a dotted march in the basses
        c = at(bar * 4 + h)
        note('bass', c.low(), bar * 4 + h, d, 96 + lb, art=.85)
        note('cello', c.low() + 12, bar * 4 + h, d, 92 + lb, art=.85)
        if h in (0, 2):
            note('tuba', c.low(), bar * 4 + h, 2, 84 + lb * 2, art=.9)
            note('timp', c.low(41), bar * 4 + h, .5, 90 + lb * 2)
            note('drums', BD, bar * 4 + h, .4, 80 + lb * 2)
        else:
            note('timp', c.low(41), bar * 4 + h, .4, 70 + lb * 2)
    BOT.append((bar * 4, at(bar * 4).low()))
    march(bar, 62 + lb * 3, busy=True)
p1 = pad('tbn', b, b + 8, 48, 65, 3, 84, p1)
p2 = pad('inner', b, b + 8, 58, 77, 3, 80, p2)
cresc('choir', t + 16, t + 32, 100, 124)
p3 = pad('choir', b + 4, b + 8, 55, 75, 4, 84, p3)
for tr in ('tbn', 'inner', 'tpt', 'horn', 'vln', 'tuba', 'bass', 'cello'):
    cresc(tr, t + 28, t + 32, LEVEL[tr], 124)
crash(t, 104); crash(t + 16, 108); note('bells', 70, t, 3, 80); note('bells', 75, t + 16, 3, 84)
gliss(t + 15, t + 16, {3, 5, 7, 8, 10, 0, 2}, 58, 91, 60, 92)
roll('timp', 44, t + 30, 2, 70, 118)
cym_swell(t + 28, t + 32, 30, 100)
roll('drums', SN, t + 30, 2, 50, 112)

# ============================================================================
# Q  Quiet: Gb - Ab ... and Bb minor instead of the major. Oboe, solo cello, flute.
# ============================================================================
b = SEC['Q']
t = b * 4
prog_at('inner', t, 44)
for tr, v in (('inner', 70), ('bass', 82), ('cello', 108), ('oboe', 112), ('flute', 110), ('choir', 64), ('horn', 80),
              ('vln', 62)):
    dyn(tr, t, v)
note('drums', BD, t, .6, 60, 0)                                   # one soft thud, and the hall empties
note('bells', 70, t, 4, 56)
line('oboe', t, 'Bb4:1 Db5:1 F5:2  Gb5:1.5 Eb5:.5 B4:2', 80, swell=18, top=True)
line('cello', t, 'F3:2 Bb3:.5 C4:.5 Db4:1  Eb4:2 B3:1 Gb3:1  F3:2 Db4:2  Ab3:2 G3:2', 72, swell=16)
line('flute', t + 8, 'Bb5:1 Db6:1 F6:1 Bb6:1  Ab6:1.5 F6:.5 E6:2', 80, swell=16, top=True)
line('oboe', t + 8, 'r:2 F5:2  F5:2 G5:2', 66, swell=12)
line('horn', t + 12, 'Ab3:2 G3:2', 54)
pv = None
for lb in range(4):
    bar = b + lb
    for h in ((0, 1) if split(bar) else (0,)):
        c = HARM[bar][h]
        d = 2 if split(bar) else 4
        pv = voice(pv, c, 58, 75, 3)
        for n in pv:
            note('inner', n, bar * 4 + h * 2, d, 60, art=1)
        note('bass', c.low(), bar * 4 + h * 2, d, 62, art=1)
        BOT.append((bar * 4 + h * 2, c.low()))
    for i in range(8):                                            # harp: rocking arpeggios
        c = at(bar * 4 + i * .5)
        note('harp', c.tone([0, 2, 3, 4, 5, 4, 3, 2][i], 46), bar * 4 + i * .5, 1, 58 + (8 if i % 4 == 0 else 0))
cresc('inner', t + 8, t + 16, 70, 92)
cresc('choir', t + 8, t + 16, 50, 86)
p3 = pad('choir', b + 2, b + 4, 55, 72, 3, 54, None)
note('bells', 72, t + 14, 2, 50)
roll('timp', 48, t + 14, 2, 20, 44)

# ============================================================================
# U  Build over C: the rising figure, entry over entry, shorter each time
# ============================================================================
b = SEC['U']
t = b * 4
for tr, v0, v1 in (('inner', 70, 126), ('bass', 76, 124), ('cello', 76, 124), ('choir', 60, 124), ('vln', 70, 124)):
    cresc(tr, t, t + 15.5, v0, v1)
for tr, v in (('horn', 84), ('tbn', 80), ('tpt', 84), ('tuba', 80), ('flute', 96), ('ost', 80)):
    dyn(tr, t, v)
for lb, v in enumerate([[60, 64, 67], [60, 64, 67, 72], [61, 65, 68, 73], [64, 67, 70, 72, 76]]):
    for n in v:
        note('inner', n, t + lb * 4, 4 if lb < 3 else 3.5, 74 + lb * 10, art=1 if lb < 3 else .97)
note('bass', 36, t, 8, 76, art=1); note('cello', 48, t, 8, 74, art=1)
BOT.append((t, 36))
for i in range(15):                                               # then the pedal starts to pulse
    for tr, n in (('bass', 36), ('cello', 48)):
        note(tr, n, t + 8 + i * .5, .5, 84 + i * 2, art=.8)
roll('timp', 48, t, 15.5, 30, 122)
line('horn', t, 'C4:1 E4:1 G4:2', 80, swell=14, top=True)                       # stretto, two beats apart
line('tbn', t + 2, 'C3:1 E3:1 G3:2', 80)
line('tpt', t + 4, 'G4:1 C5:1 E5:2', 84, swell=14, top=True)
line('vln', t + 6, 'C5:.5 E5:.5 G5:1', 84)
note('vln', 80, t + 8, 4, 92, art=1)                                             # Ab: the Phrygian colour
for tr in ('horn', 'tbn', 'tpt', 'tuba'):
    cresc(tr, t + 8, t + 15.5, 92, 124)
line('horn', t + 8, 'Db4:.5 F4:.5 Ab4:1 r:2  C4:.5 E4:.5 G4:.5 Bb4:.5', 96, art=.88)
line('tbn', t + 8, 'Db3:.5 F3:.5 Ab3:1 r:2  C3:.5 E3:.5 G3:.5 Bb3:.5 C4:1.5', 96, art=.88)
line('tpt', t + 10, 'F4:.5 Ab4:.5 Db5:1  r:2 C5:.25 C5:.25 C5:.5 E5:.5', 100, art=.86)
line('horn', t + 14, 'C5:.25 C5:.25 C5:.5 C5:.5', 106, art=.86)
note('tuba', 36, t + 8, 7.5, 80, art=.99)
p3 = pad('choir', b + 2, b + 3, 55, 73, 4, 80, p3)
for n in (60, 64, 67, 70, 72):
    note('choir', n, t + 12, 3.5, 96, art=.98)
for i in range(30):                                               # violas: 16ths that open out from the pedal
    fig = [60, 60, 60, 60] if i < 8 else [60, 61, 60, 65] if i < 16 else [60, 64, 67, 64]
    note('ost', fig[i % 4], t + 8 + i * .25, .25, 72 + i + (10 if i % 4 == 0 else 0), art=.65)
cresc('ost', t + 8, t + 15.5, 80, 120)
roll('drums', SN, t + 8, 7.5, 28, 122)
cym_swell(t + 12, t + 15.5, 28, 108)
gliss(t + 13.5, t + 15.5, {0, 1, 4, 5, 7, 8, 10}, 48, 96, 64, 104)
run('vln', t + 15.5, 'C5 Db5 E5 F5 G5 Ab5 Bb5 C6', 90, 116)
run('flute', t + 15.5, 'C6 Db6 E6 F6 G6 Ab6 Bb6 C7', 84, 104)

# ============================================================================
# G  Grand statement: F minor, lifting to G minor half way
# ============================================================================
b = SEC['G']
t = b * 4
prog_at('inner', t, 48)
for tr, v in (('tpt', 112), ('horn', 112), ('vln', 116), ('flute', 108), ('oboe', 108), ('tbn', 108), ('cello', 112),
              ('bass', 116), ('tuba', 110), ('choir', 112), ('inner', 104), ('ost', 112)):
    dyn(tr, t, v)
GT = theme(THEME[:4], b, 3) + theme(THEME[4:], b + 4, 5)
play('tpt', GT, 114, swell=12, top=True)
play('vln', GT, 114, shift=12, swell=10)
play('flute', GT, 100, shift=12)
play('oboe', GT, 96)
play('horn', GT[:13], 108, swell=12)
# trombones and cellos: the countermelody the violins had, now in the tenor
CM = 'C4:2 F4:.5 G4:.5 Ab4:1  Bb4:2 Gb4:.5 Ab4:.5 Bb4:1  C5:2 Ab4:2  G4:2 G4:.5 F4:.5 E4:1'
line('tbn', t, CM, 104, swell=12)
line('cello', t, CM, 100, swell=12)
# the lift: horns leave the tune and sing against it
line('horn', t + 16, 'G4:2 Bb4:.5 C5:.5 Eb5:1  Eb5:1 C5:1 G4:.5 C5:.5 Eb5:1  Ab4:1 C5:1 Eb5:2  '
     'D5:.75 D5:.25 D5:.5 A4:.5 D5:2', 110, swell=12)
pt = None
for lb in range(8):
    bar = b + lb
    late = lb >= 4
    ost16(bar, 96 + lb * 2)
    forge(bar, 108, ('bass', 'tuba'), timp=108 + lb, bd=96 + lb * 2)
    march(bar, 72 + lb * 4, busy=late)
    if late:
        forge8(bar, 100, alt=1 if lb % 2 == 0 else 8)
        for h in hits(bar):                                       # trombones hammer the forge rhythm
            pt = voice(pt, at(bar * 4 + h), 48, 65, 3)
            for n in pt:
                note('tbn', n, bar * 4 + h, .75, 108, art=.8)
    if lb % 2 == 0:
        note('bells', at(bar * 4).tone(0, 65), bar * 4, 3, 92)
p2 = pad('inner', b, b + 8, 58, 79, 4, 92, None)
p3 = pad('choir', b, b + 8, 55, 77, 4, 100, None)
crash(t, 120, 4)
gliss(t + 14.5, t + 16, {3, 5, 7, 8, 10, 0, 2}, 51, 96, 70, 108)
cym_swell(t + 14, t + 16, 40, 104)
for tr in ('tpt', 'vln', 'choir', 'inner', 'horn', 'bass', 'tuba'):
    dyn(tr, t + 16, 124)
crash(t + 16, 127, 4)
note('drums', CRASH, t + 24, 3, 108, 0)
roll('timp', 50, t + 30, 2, 80, 124)
roll('drums', SN, t + 30, 2, 60, 122)
cym_swell(t + 30, t + 32, 40, 112)
gliss(t + 30, t + 32, {2, 6, 9, 0}, 50, 98, 70, 108)

# ============================================================================
# C  Coda: Eb - F - G major, the Phrygian fall once more, three hammer blows
# ============================================================================
b = SEC['C']
t = b * 4
for tr in PARTS:
    if tr in chans:
        dyn(tr, t, 122 if tr not in ('flute', 'oboe', 'bells', 'harp') else 110)
CODA = 'G4:.5 Bb4:.5 Eb5:1 A4:.5 C5:.5 F5:1  B4:1 D5:1 G5:2  Eb5:1.5 C5:.5 Ab4:2'
line('tpt', t, CODA, 118, swell=5, top=True)
line('vln', t, CODA, 116, shift=12)
line('flute', t, CODA, 102, shift=12)
line('oboe', t, CODA, 98)
line('horn', t, 'G4:.5 Bb4:.5 Eb5:1 A4:.5 C5:.5 F5:1  B4:1 D5:1 G5:2', 114, shift=-12)
line('horn', t + 10, 'Ab3:.5 C4:.5 Eb4:.5 Ab4:.5', 112, art=.9)                 # a horn rip under the held note
for h in (0, 2):
    c = at(t + h)
    for tr in ('bass', 'tuba'):
        note(tr, c.low(), t + h, 2, 112, art=.92)
    note('cello', c.low() + 12, t + h, 2, 108, art=.92)
    note('timp', c.low(41), t + h, .5, 116); note('timp', c.low(41), t + h + 1.5, .25, 92)
    note('timp', c.low(41), t + h + 1.75, .25, 100)
    crash(t + h, 118 if h == 0 else 104)
    BOT.append((t + h, c.low()))
ost16(b, 104); ost16(b + 1, 110)
forge(b + 1, 114, ('bass', 'tuba', 'cello'), timp=116, bd=108)
march(b, 90, busy=True); march(b + 1, 96, busy=True)
crash(t + 4, 124, 4); note('bells', 67, t + 4, 3, 100); note('bells', 79, t + 4, 3, 90)
pt = pad('tbn', b, b + 3, 48, 65, 3, 108, None)
p2 = pad('inner', b, b + 3, 58, 79, 4, 100, None)
p3 = pad('choir', b, b + 3, 55, 79, 4, 108, None)
# the Phrygian bar: Ab over a rolling G in the timpani
for tr in ('bass', 'tuba'):
    note(tr, 32, t + 8, 4, 112, art=.97)
note('cello', 44, t + 8, 4, 108, art=.97)
BOT.append((t + 8, 32))
roll('timp', 43, t + 8, 4, 70, 124)
roll('drums', SN, t + 10, 2, 50, 120)
cym_swell(t + 9, t + 12, 36, 112)
gliss(t + 10.5, t + 12, {8, 0, 3}, 44, 99, 70, 108)
for tr in ('tpt', 'vln', 'tbn', 'choir', 'inner', 'horn'):
    cresc(tr, t + 10, t + 12, 104, 127)
# three blows of the forge hammer on G major, the last one held
fin = t + 12
VO = (('tbn', (43, 50, 55, 59), 118), ('horn', (62, 67, 71, 74), 118), ('tpt', (67, 71, 74, 79), 122),
      ('vln', (79, 86, 91), 118), ('inner', (67, 71, 74), 108), ('choir', (55, 62, 67, 71), 112),
      ('flute', (91,), 104), ('oboe', (83,), 100), ('cello', (43, 50), 114), ('bass', (31,), 118),
      ('tuba', (31,), 114))
for i, (h, d) in enumerate(((0, 1.1), (1.5, 1.1), (3, 4))):
    for tr, ns, v in VO:
        for n in ns:
            note(tr, n, fin + h, d, v, 2, art=.96 if i == 2 else .8)
    note('timp', 43, fin + h, .5, 124, 0)
    note('drums', BD, fin + h, .5, 124, 0)
    note('drums', CRASH, fin + h, 4 if i == 2 else 1.4, 120 if i == 2 else 100, 0)
    BOT.append((fin + h, 31)); TOP.append((fin + h, 91))
roll('timp', 43, fin + 3.25, 3.5, 90, 112)
note('timp', 43, fin + 6.9, .5, 124, 0); note('drums', BD, fin + 6.9, .5, 116, 0)
for k, n in enumerate([43, 50, 55, 59, 62, 67, 71, 74, 79, 83, 86, 91]):
    note('harp', n, fin + 3 + k * .04, 3, 104, 2)
note('bells', 67, fin + 3, 4, 108, 0); note('bells', 79, fin + 3, 4, 100, 0)
for tr in ('tpt', 'vln', 'tbn', 'choir', 'inner', 'horn', 'flute', 'oboe', 'cello', 'bass', 'tuba'):
    dyn(tr, fin, 112); cresc(tr, fin + 3, fin + 5.5, 110, 122)
END_BEATS = fin + 7.5


# ---- output ----------------------------------------------------------------
ORDER = {'program_change': 0, 'control_change': 0, 'note_off': 1, 'note_on': 2}


def save(path):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name', name='WizardsDuel main theme (Fable arrangement)'))
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
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((END_BEATS + 4) * TPB) - last)))
    mid.save(path)


def synth(mid_path, gain=.4):
    tmp = tempfile.mkdtemp()
    raw = os.path.join(tmp, 'raw.wav')
    subprocess.run(['fluidsynth', '-ni', '-g', str(gain), '-r', '44100', '-F', raw, SF2, mid_path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    w = wave.open(raw); chn, sr = w.getnchannels(), w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, chn).astype(np.float32)
    return a, sr, tmp


def limit(x, sr, drive=1.5, ceil=.92):
    """Peak limiter: a few drum hits stand 4 dB over everything else, and normalising to them would leave the
    body of the piece quiet. Turn the gain down smoothly around those peaks only (no clipping, no distortion)."""
    x = x * drive
    blk = 64
    n = len(x) // blk * blk
    env = np.abs(x[:n]).max(axis=1).reshape(-1, blk).max(axis=1)
    g = np.minimum(1, ceil / np.maximum(env, 1e-9))
    w = int(.012 * sr / blk)                              # look 12 ms either side
    pad_ = np.pad(g, w, mode='edge')
    g = np.min(np.lib.stride_tricks.sliding_window_view(pad_, 2 * w + 1), axis=1)
    rel = int(.15 * sr / blk)                             # let go over 150 ms
    out = g.copy()
    for i in range(1, len(out)):
        out[i] = min(g[i], out[i - 1] + (1 - out[i - 1]) / rel)
    k = np.ones(2 * w + 1) / (2 * w + 1)
    out = np.minimum(out, np.convolve(np.pad(out, w, mode='edge'), k, 'valid'))
    gain = np.interp(np.arange(len(x)), np.arange(len(out)) * blk + blk / 2, out)
    y = x * gain[:, None]
    return y * min(1, ceil / np.abs(y).max())


def render(mid_path, mp3_path):
    gain = .4
    while True:                                           # fluidsynth writes 16 bits: back off until nothing clips
        a, sr, tmp = synth(mid_path, gain)
        raw_peak = np.abs(a).max()
        if raw_peak < 32000:
            break
        gain *= .75
    a = limit(a / raw_peak, sr) * 32767
    loud = np.nonzero(np.abs(a).max(axis=1) > 300)[0]      # trim the silence after the hall's ring
    a = a[:loud[-1] + int(.3 * sr)]
    f = int(1.5 * sr)
    a[-f:] *= np.linspace(1, 0, f)[:, None]               # fade the last of the ring
    out = os.path.join(tmp, 'out.wav')
    o = wave.open(out, 'wb'); o.setnchannels(a.shape[1]); o.setsampwidth(2); o.setframerate(sr)
    o.writeframes(a.astype(np.int16).tobytes()); o.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-b:a', '192k', mp3_path], check=True)
    print('main theme (Fable) %.1f s, %d bars; synth gain %.2f, peak %d of 32767' % (len(a) / sr, NBARS, gain, raw_peak))
    return a, sr


def check(a, sr):
    names = {i: n for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}
    nm = lambda n: '%s%d' % (names[n % 12], n // 12 - 1)
    print('\nSections')
    for key, title, chords in SECTIONS:
        b0 = SEC[key]
        print('  %5.1f s  bar %2d  %-10s %s' % (seconds(b0 * 4), b0, title, ' | '.join(chords)))
    print('  %5.1f s  end of the last bar' % seconds(END_BEATS))
    print('\nRanges (lowest - highest, allowed)')
    for tr, lst in ev.items():
        ns = [m.note for _, m in lst if m.type == 'note_on']
        if tr == 'drums' or not ns:
            continue
        lo, hi = PARTS[tr][4]
        flag = '' if lo <= min(ns) and max(ns) <= hi else '   <-- OUT OF RANGE'
        print('  %-6s %-4s - %-4s (%s - %s)  %4d notes%s' % (tr, nm(min(ns)), nm(max(ns)), nm(lo), nm(hi), len(ns), flag))
    print('  channels used: %d melodic + drums' % len(chans))
    # parallel fifths / octaves between the tune and the bass, at each bass change
    top = sorted(set(TOP)); bot = sorted(set(BOT))
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
    win = 5 * sr
    print('\nLoudness, RMS per 5 s (dBFS)')
    for i in range(0, len(m), win):
        seg = m[i:i + win]
        db = 20 * np.log10(max(1e-6, np.sqrt((seg ** 2).mean())))
        print('  %3d-%3d s %6.1f dB  %s' % (i / sr, min(len(m), i + win) / sr, db, '#' * max(0, int((db + 48) * 1.2))))
    print('  peak %.3f, overall RMS %.1f dB, samples at full scale: %d' % (
        np.abs(a).max() / 32767, 20 * np.log10(np.sqrt((m ** 2).mean())), int((np.abs(a) >= 32766).sum())))
    q = np.sqrt(np.convolve(m ** 2, np.ones(sr // 4) / (sr // 4), 'same'))
    quiet = np.nonzero(q[sr // 2:-2 * sr] < 10 ** (-60 / 20))[0]
    print('  silent stretches (below -60 dB): %s' % ('none' if not len(quiet) else '%.1f s in all, first at %.1f s' % (
        len(quiet) / sr, quiet[0] / sr + .5)))


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    mp = os.path.join(OUTDIR, 'main_theme_fable.mid')
    save(mp)
    if '--midi' not in sys.argv:
        a, sr = render(mp, os.path.join(OUTDIR, 'main_theme_fable.mp3'))
        if '--check' in sys.argv:
            check(a, sr)
