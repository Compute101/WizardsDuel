# Gilden, the merchant port: a town theme that loops.
#   python3 tools/music/gilden.py           -> audio/gilden_theme.mid / .mp3 (a seamless loop)
#   python3 tools/music/gilden.py --midi    -> the MIDI only
#   python3 tools/music/gilden.py --check   -> also print ranges, loudness and the seam check
#   python3 tools/music/gilden.py --x3      -> also gilden_theme_x3.mp3 (the loop three times, for the seam)
#
# Albra's richest city (docs/gilden-design.md): counting-houses, a great quay, merchant houses at each
# other's throats, gnome airships on Beacon Hill. An original tune, not the Corvanthe theme: B flat major,
# 108 bpm, dotted fanfare rhythms over a harpsichord that never stops counting.
#
#   A  The Exchange   bars 0-7    Bb major  the Gilden tune on horns; harpsichord 16ths (the counting-houses),
#                                           plucked oom-pah bass, side-stick
#   A2 Hill Street    bars 8-15   Bb major  the tune on violins and flute; horns and trombones hold the chords,
#                                           a light march on snare and timpani
#   B  The Docks      bars 16-23  G minor   a shanty on clarinet and bassoon over a rocking swell in the low
#                                           strings; the harbour bell, gulls on the piccolo, a ship's horn (tuba)
#   C  The Houses     bars 24-27  Eb major  three houses haggle: one motif in oboe (Ashcombe), clarinet (Varenne)
#                                           and muted trumpet (Quarrender), each a beat behind the last, over a
#                                           walking pizzicato bass
#   S  The Skyport    bars 28-31  Eb -> F7  high flute and glockenspiel over harp and tremolo strings, rising;
#                                           a trumpet call and snare roll lead into
#   F  Exchange Noon  bars 32-39  Bb major  the tune tutti: trumpets and violins, brass chords, timpani, cymbals
#   E  Evening Quay   bars 40-43  Bb major  the harpsichord alone again with the oboe; F7 back to the top
import itertools, os, random, subprocess, sys, tempfile, wave
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, '..', '..', 'audio')
NAME = 'gilden_theme'
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TPB = 480
BPM = 108
TAIL_BEATS = 8
TARGET_DB = -19.5  # RMS, about the Moriquende's and a shade under the battle music
rnd = random.Random(23)

NAMES = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6,
    'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
}  # fmt: skip

# track -> (GM program, volume, pan, reverb, playable range)
PARTS = {
    'tpt': (56, 104, 50, 70, (55, 84)),
    'mute': (59, 96, 80, 70, (55, 82)),  # muted trumpet: Quarrender
    'horn': (60, 104, 44, 85, (41, 79)),
    'tbn': (57, 96, 74, 75, (34, 72)),
    'tuba': (58, 100, 66, 70, (26, 55)),
    'flute': (73, 92, 58, 85, (60, 98)),
    'picc': (72, 80, 40, 90, (74, 103)),
    'oboe': (68, 100, 72, 80, (58, 91)),  # Ashcombe
    'clar': (71, 104, 52, 80, (50, 91)),  # Varenne
    'bsn': (70, 100, 78, 75, (34, 72)),
    'vln': (48, 116, 36, 85, (55, 100)),
    'inner': (48, 96, 60, 85, (48, 84)),
    'trem': (44, 92, 56, 95, (48, 96)),  # tremolo strings
    'cello': (42, 110, 84, 75, (36, 76)),
    'bass': (43, 104, 92, 65, (24, 55)),
    'pizz': (45, 112, 70, 65, (28, 79)),
    'hpsi': (6, 84, 30, 60, (41, 84)),  # harpsichord: the counting-houses
    'harp': (46, 104, 26, 85, (24, 103)),
    'glock': (9, 100, 46, 90, (72, 108)),
    'bells': (14, 104, 40, 100, (55, 79)),  # tubular bell: the harbour bell
    'timp': (47, 110, 64, 70, (38, 57)),
}
DRUMS = 'drums'  # channel 9, orchestra kit
SNARE, STICK, KICK, CRASH, TRI, TAMB = 38, 37, 35, 49, 81, 54
ev, chans, LEVEL = {}, {}, {}


# Parts that never sound together share a MIDI channel (21 parts, 15 channels); save() puts a program
# change in wherever the channel passes from one part to the next.
GROUPS = [
    ('oboe', 'picc'),
    ('mute', 'harp'),
    ('hpsi', 'glock'),
    ('timp', 'bells'),
    ('inner', 'trem'),
    ('clar', 'flute'),
]
GROUP_OF = {p: g[0] for g in GROUPS for p in g}


def setup(tr, c, tick):
    prog, vol, pan, rev, _ = PARTS[tr]
    return [
        (tick, mido.Message('program_change', channel=c, program=prog)),
        (tick, mido.Message('control_change', channel=c, control=7, value=vol)),
        (tick, mido.Message('control_change', channel=c, control=10, value=pan)),
        (tick, mido.Message('control_change', channel=c, control=91, value=rev)),
    ]


def ch(tr):
    if tr not in chans:
        if tr == DRUMS:
            chans[tr] = 9
            ev[tr] = [
                (0, mido.Message('program_change', channel=9, program=48)),
                (0, mido.Message('control_change', channel=9, control=7, value=96)),
                (0, mido.Message('control_change', channel=9, control=91, value=70)),
            ]
            return 9
        g = GROUP_OF.get(tr, tr)
        used = {GROUP_OF.get(k, k): v for k, v in chans.items() if k != DRUMS}
        if g in used:
            c = used[g]
        else:
            c = len(set(used.values()))
            c = c + 1 if c >= 9 else c
        chans[tr] = c
        LEVEL[tr] = 100
        ev[tr] = []
    return chans[tr]


def cc(tr, beat, val, ctl=11):
    ev[tr].append(
        (
            int(beat * TPB),
            mido.Message('control_change', channel=ch(tr), control=ctl, value=max(0, min(127, int(val)))),
        )
    )


def dyn(tr, beat, val):
    ch(tr)
    LEVEL[tr] = val
    cc(tr, beat, val)


def cresc(tr, b0, b1, v0, v1):
    ch(tr)
    steps = max(2, int((b1 - b0) * 4))
    for k in range(steps + 1):
        cc(tr, b0 + (b1 - b0) * k / steps, v0 + (v1 - v0) * k / steps)
    LEVEL[tr] = v1


def note(tr, n, start, dur, vel, jitter=3, art=None):
    c = ch(tr)
    vel = max(1, min(127, int(vel + rnd.randint(-jitter, jitter))))
    s = int(start * TPB)
    e = int((start + dur * art) * TPB) if art else int((start + dur) * TPB) - 8
    e = min(e, END_BEATS * TPB - 8)  # nothing is held past the loop point
    ev[tr].append((s, mido.Message('note_on', channel=c, note=int(n), velocity=vel)))
    ev[tr].append((max(s + 10, e), mido.Message('note_off', channel=c, note=int(n), velocity=0)))


def hit(n, beat, vel, dur=0.25):
    note(DRUMS, n, beat, dur, vel, jitter=4)


def N(s):
    pc = NAMES[s[:2]] if len(s) > 1 and s[1] in '#b' else NAMES[s[0]]
    return pc + 12 * (int(s[2:] if len(s) > 1 and s[1] in '#b' else s[1:]) + 1)


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


def line(tr, start, s, vel, shift=0, art=0.92, swell=0):
    ch(tr)
    for n, st, d in seq(s, start):
        a = art if d >= 0.5 else min(art, 0.75)
        note(tr, n + shift, st, d, vel + (3 if d >= 2 else 0), art=a)
        if swell and d >= 1.5:
            L = LEVEL[tr]
            for k in range(9):
                x = k / 8
                cc(tr, st + d * x, L + swell * (x / 0.5 if x < 0.5 else 1 - (x - 0.5) * 1.2))
            cc(tr, st + d, L)


# ---- harmony ---------------------------------------------------------------
class Chord:
    QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'sus': [0, 5, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10]}

    def __init__(self, nm):
        main, _, slash = nm.partition('/')
        root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
        self.name = nm
        self.root = NAMES[root]
        self.iv = self.QUAL[main[len(root) :]]
        self.bass = NAMES[slash] if slash else self.root
        self.pcs = [(self.root + i) % 12 for i in self.iv]

    def low(self, lo=33):
        return lo + (self.bass - lo) % 12

    def tone(self, k, lo):
        return lo + (self.root - lo) % 12 + self.iv[k % 3] + 12 * (k // 3)


SECTIONS = [
    ('A', 'The Exchange', ['Bb', 'Cm|Bb/F', 'Gm|Cm', 'Bb/D|F', 'Bb', 'F/A|Cm7', 'Bb/D|F7', 'Bb']),
    ('A2', 'Hill Street', ['Bb', 'Cm|Bb/F', 'Gm|Cm', 'Bb/D|F', 'Bb', 'F/A|Cm7', 'Bb/D|F7', 'Bb|D7']),
    ('B', 'The Docks', ['Gm', 'F', 'Eb', 'D', 'Gm', 'Cm', 'Gm/D|D7', 'Gm|Bb7']),
    ('C', 'The Houses', ['Eb', 'Cm', 'Ab', 'Bb']),
    ('S', 'The Skyport', ['Eb/G', 'Ab', 'Cm|Bb', 'F|F7']),
    ('F', 'Exchange Noon', ['Bb', 'Cm|Bb/F', 'Gm|Cm', 'Bb/D|F', 'Bb', 'F/A|Cm7', 'Bb/D|F7', 'Bb|Eb']),
    ('E', 'Evening Quay', ['Bb', 'Eb/Bb', 'Cm7|Bb/D', 'Eb|F7']),
]
HARM, SEC = [], {}
for key, _, names in SECTIONS:
    SEC[key] = len(HARM)
    for nm in names:
        h = [Chord(x) for x in nm.split('|')]
        HARM.append(h if len(h) == 2 else h * 2)
NBARS = len(HARM)
END_BEATS = NBARS * 4
TEMPO = [(0, BPM), (SEC['S'] * 4 + 14, BPM - 4), (SEC['F'] * 4, BPM), (END_BEATS - 2, BPM - 4)]


def seconds(beat):
    t, last, bpm = 0.0, 0.0, TEMPO[0][1]
    for b, v in sorted(TEMPO):
        if b >= beat:
            break
        t += (b - last) * 60 / bpm
        last, bpm = b, v
    return t + (beat - last) * 60 / bpm


def at(beat):
    return HARM[int(beat // 4) % NBARS][0 if beat % 4 < 2 else 1]


def split(b):
    return HARM[b][0].name != HARM[b][1].name


def voice(prev, c, lo, hi, n):
    """n-part voicing of chord c in lo..hi that moves least from prev."""
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


def pad(tr, b0, b1, lo, hi, n, vel, prev=None, art=0.98):
    for b in range(b0, b1):
        for h in (0, 1) if split(b) else (0,):
            prev = voice(prev, HARM[b][h], lo, hi, n)
            for p in prev:
                note(tr, p, b * 4 + h * 2, 2 if split(b) else 4, vel, art=art)
    return prev


def stabs(tr, b0, b1, lo, hi, n, vel, beats=(0, 2), dur=0.9, prev=None):
    """Short brass chords on the given beats."""
    for b in range(b0, b1):
        for k in beats:
            prev = voice(prev, at(b * 4 + k), lo, hi, n)
            for p in prev:
                note(tr, p, b * 4 + k, dur, vel + (6 if k == 0 else 0), art=0.8)
    return prev


# ---- shared figures --------------------------------------------------------
COUNT = [[0, 2, 1, 2], [3, 2, 1, 2]]


def count(b, vel, lo=58):
    """The harpsichord counting coins: broken chords in 16ths."""
    for beat in range(4):
        for i, k in enumerate(COUNT[beat % 2]):
            t = b * 4 + beat + i * 0.25
            note('hpsi', at(t).tone(k, lo), t, 0.3, vel + (8 if i == 0 else 0), art=0.9)


def oompah(b, vel, pv, tr='pizz', bass_tr=None):
    """Root on 1, fifth on 3; chords on 2 and 4."""
    for h in (0, 2):
        c = at(b * 4 + h)
        n = c.low() if h == 0 or split(b) else c.low() + (7 if c.bass == c.root else 0)
        n = n - 12 if n > 45 else n
        note(tr, n, b * 4 + h, 1, vel + (8 if h == 0 else 0), art=0.85)
        if bass_tr:
            note(bass_tr, n, b * 4 + h, 1, vel - 10, art=0.75)
        pv = voice(pv, c, 58, 72, 2)
        for p in pv:
            note(tr, p, b * 4 + h + 1, 0.5, vel - 24, art=0.7)
    return pv


def walk(b, vel):
    """Walking pizzicato bass: root, third, fifth, then a step onto the next bar's bass."""
    c = at(b * 4)
    nxt = HARM[(b + 1) % NBARS][0].low()
    r = c.low()
    if split(b):
        c2 = at(b * 4 + 2)
        ns = [r, r + c.iv[2], c2.low(), nxt + (1 if nxt < c2.low() else -1)]
    else:
        ns = [r, r + c.iv[1], r + c.iv[2], nxt + (1 if nxt < r + c.iv[2] else -1)]
    for i, n in enumerate(ns):
        note('pizz', n if n >= 31 else n + 12, b * 4 + i, 1, vel + (8 if i == 0 else 0), art=0.8)


def arp8(b, vel, lo=55):
    for i, k in enumerate([0, 1, 2, 3, 4, 5, 4, 3]):
        t = b * 4 + i * 0.5
        note('harp', at(t).tone(k, lo), t, 1.4, vel + (8 if i % 4 == 0 else 0))


def march(b, vel, fill=False):
    """Light march: kick on 1, snare on 2 and 4 with a pick-up, a flam now and then."""
    t = b * 4
    hit(KICK, t, vel)
    hit(KICK, t + 2, vel - 10)
    for k in (1, 3):
        hit(SNARE, t + k, vel - 6)
    hit(SNARE, t + 3.75, vel - 22)
    hit(SNARE, t + 1.75, vel - 26)
    if fill:
        for i in range(8):
            hit(SNARE, t + 2 + i * 0.25, vel - 20 + i * 3)


def roll(tr_or_drum, n, b0, b1, v0, v1, step=0.125):
    k, steps = 0, int((b1 - b0) / step)
    while k < steps:
        v = v0 + (v1 - v0) * k / steps
        t = b0 + k * step
        if tr_or_drum == DRUMS:
            hit(n, t, v, step)
        else:
            note(tr_or_drum, n, t, step, v, jitter=2, art=1)
        k += 1


# The Gilden tune: a dotted rise to the fifth (a fanfare, a merchant's flourish), a fall by step, a
# climb in the third bar, a half cadence; then the rise again to the octave and a counting run home.
TUNE = (
    'Bb4:.75 C5:.25 D5:1 F5:1 D5:1  Eb5:.75 D5:.25 C5:1 Bb4:1 F4:1  G4:.75 A4:.25 Bb4:1 C5:1 D5:.5 Eb5:.5  '
    'D5:1 C5:.5 Bb4:.5 C5:2  Bb4:.75 C5:.25 D5:1 F5:1 Bb5:1  A5:.75 G5:.25 F5:1 Eb5:1 C5:1  '
    'D5:.5 Eb5:.5 F5:.5 D5:.5 Eb5:1 C5:1  Bb4:1 F4:1 Bb4:2'
)
TUNE7 = ' '.join(TUNE.split()[:-3])  # the first seven bars, for an ending of its own

# ============================================================================
# A  The Exchange: horns, harpsichord, oom-pah
# ============================================================================
b = SEC['A']
t = b * 4
for tr, v in (
    ('oboe', 76),
    ('horn', 100),
    ('hpsi', 92),
    ('pizz', 100),
    ('inner', 70),
    ('bsn', 80),
    ('cello', 84),
):
    dyn(tr, t, v)
line('horn', t, TUNE, 92, shift=-12, swell=10)
line('oboe', t, TUNE, 58, swell=6)  # a thread of reed on top, so the tune carries
pv = None
for lb in range(8):
    count(b + lb, 56)
    pv = oompah(b + lb, 80, pv)
    hit(STICK, (b + lb) * 4 + 1, 44)
    hit(STICK, (b + lb) * 4 + 3, 40)
pad('inner', b + 4, b + 8, 55, 70, 3, 44)
# the bassoon answers the tune where it holds
line('bsn', t + 14, 'F3:.5 G3:.5 A3:1', 70)
line('bsn', t + 30, 'F3:.5 D3:.5 Bb2:1', 70)

# ============================================================================
# A2 Hill Street: violins and flute, brass chords, a light march
# ============================================================================
b = SEC['A2']
t = b * 4
dyn('vln', t, 100)
dyn('flute', t, 88)
dyn('tbn', t, 80)
line('vln', t, TUNE7 + ' Bb4:1 F4:1 Bb4:1 A4:1', 92, swell=12)
line('flute', t + 16, 'Bb5:.75 C6:.25 D6:1 F6:1 Bb6:1  A6:.75 G6:.25 F6:1 Eb6:1 C6:1', 70)
pad('horn', b, b + 8, 50, 67, 3, 58)
stabs('tbn', b, b + 8, 41, 58, 2, 64)
pv = None
for lb in range(8):
    count(b + lb, 48)
    pv = oompah(b + lb, 82, pv, bass_tr='bass')
    march(b + lb, 62, fill=lb == 7)
for lb in (0, 4):
    note('timp', at(t + lb * 4).low(38) if at(t + lb * 4).low(38) <= 50 else 46, t + lb * 4, 1, 80)
note('timp', 41, t + 28, 1, 70)
note('timp', 45, t + 30, 1, 76)  # D7: onto the A of the dominant of G minor

# ============================================================================
# B  The Docks: a shanty over the swell
# ============================================================================
b = SEC['B']
t = b * 4
dyn('clar', t, 100)
dyn('bsn', t, 96)
SHANTY = (
    'D4:.5 G4:.5 G4:.75 A4:.25 Bb4:1 G4:1  A4:.5 F4:.5 F4:.75 G4:.25 A4:1 F4:1  '
    'G4:.5 Bb4:.5 Eb5:1 D5:.5 C5:.5 Bb4:1  A4:1.5 F#4:.5 D4:2  '
    'D4:.5 G4:.5 G4:.75 A4:.25 Bb4:1 D5:1  Eb5:.75 D5:.25 C5:1 G4:1 C5:1  '
    'Bb4:.5 A4:.5 G4:.5 Bb4:.5 A4:1 F#4:1  G4:2 F4:1 D4:1'
)
line('clar', t, SHANTY, 94, swell=8)
line('bsn', t, SHANTY, 82, shift=-12)
# the swell: cellos and basses rock root-fifth, each two bars rising and falling
for lb in range(8):
    c = HARM[b + lb][0]
    r = c.low(36)
    for k, (n, d) in enumerate(((r, 1.5), (r + 7, 1.5), (r + 12, 1))):
        note('cello', n, t + lb * 4 + [0, 1.5, 3][k], d, 70 + (10 if k == 0 else 0), art=0.95)
    note('bass', c.low(28), t + lb * 4, 4, 62, art=0.98)
    cresc('cello', t + lb * 4, t + lb * 4 + 2, 70 + (lb % 2) * 14, 84 + (lb % 2) * 14)
pad('inner', b, b + 8, 55, 72, 3, 46)
note('bells', N('G4'), t, 4, 84)
note('bells', N('D4') + 12, t + 16, 4, 74)
note('tuba', N('D2'), t + 12, 3.5, 74, art=1)  # a ship's horn out in the roads
note('tuba', N('D2'), t + 28, 1.5, 70, art=1)
# gulls
for gb, s in (
    (1, 'D6:.25 Bb5:.75'),
    (2.5, 'Eb6:.25 C6:.25 G5:.5'),
    (5, 'D6:.25 Bb5:.75'),
    (6.5, 'F6:.25 D6:.75'),
):
    dyn('picc', t + gb * 4 - 1, 76)
    line('picc', t + gb * 4 + 2, s, 64, shift=12, art=0.7)
for lb in range(8):
    hit(TAMB, t + lb * 4 + 1, 34)
    hit(TAMB, t + lb * 4 + 3, 30)

# ============================================================================
# C  The Houses: one motif, three houses, each a beat behind
# ============================================================================
b = SEC['C']
t = b * 4
MOTIF = [(0, 0.5), (None, 0.5), (2, 0.5), (1, 0.5), (0, 0.75), (1, 0.25), (2, 1)]


def motif(tr, start, lo, vel, reps):
    for r in range(reps):
        s = start + r * 4
        for k, d in MOTIF:
            if k is not None and s < SEC['S'] * 4 + 1:
                note(tr, at(s).tone(k, lo), s, d, vel + (6 if d >= 1 else 0), art=0.7 if d < 1 else 0.9)
            s += d


dyn('oboe', t, 100)
dyn('clar', t, 96)
dyn('mute', t, 98)
motif('oboe', t, 67, 86, 4)  # Ashcombe
motif('clar', t + 1, 58, 82, 4)  # Varenne, a beat behind
motif('mute', t + 2, 62, 84, 3)  # Quarrender, two beats behind
for lb in range(4):
    walk(b + lb, 84)
    hit(STICK, t + lb * 4 + 1, 40)
    hit(STICK, t + lb * 4 + 3, 36)
    hit(TRI, t + lb * 4 + 2.5, 30)
pad('bsn', b, b + 4, 46, 60, 2, 54)

# ============================================================================
# S  The Skyport: up Beacon Hill to the airships
# ============================================================================
b = SEC['S']
t = b * 4
dyn('flute', t, 96)
dyn('trem', t, 60)
dyn('glock', t, 96)
SKY = 'G5:1 Bb5:1 Eb6:2  C6:1 Eb6:1 Ab6:2  G6:1 Eb6:1 D6:1 F6:1  F6:2 Eb6:1 C6:1'
line('flute', t, SKY, 82, swell=10)
line('glock', t, SKY, 52, shift=12, art=0.5)
for lb in range(4):
    arp8(b + lb, 62 + lb * 4)
pad('trem', b, b + 4, 55, 76, 3, 60)
cresc('trem', t, t + 16, 50, 110)
note('bass', HARM[b][0].low(28), t, 8, 60, art=1)
note('bass', HARM[b + 2][0].low(28), t + 8, 4, 64, art=1)
note('bass', N('F1'), t + 12, 4, 70, art=1)
# the call to the Exchange floor
dyn('tpt', t + 12, 104)
line('tpt', t + 13, 'C5:.333 C5:.333 C5:.334 F5:1 A5:.5 C6:.5', 96, art=0.85)
roll(DRUMS, SNARE, t + 12, t + 16, 30, 92)
roll('timp', N('F2'), t + 14, t + 16, 50, 96)

# ============================================================================
# F  Exchange Noon: the tune tutti
# ============================================================================
b = SEC['F']
t = b * 4
dyn('tpt', t, 108)
dyn('vln', t, 112)
dyn('horn', t, 104)
dyn('tbn', t, 100)
dyn('tuba', t, 96)
FTUNE = TUNE7 + ' Bb4:2 G4:1 A4:1'  # the last bar turns onto Eb for the evening
line('tpt', t, FTUNE, 100, swell=6)
line('vln', t, FTUNE, 96, shift=12, swell=8)
line('flute', t, FTUNE, 78, shift=12)
line(
    'cello', t + 16, 'Bb3:2 A3:2  Bb3:1 C4:1 D4:2  Bb3:1 A3:1 G3:2  F3:4', 84
)  # a counter line under the climb
hv = pad('horn', b, b + 8, 50, 67, 3, 74)
stabs('tbn', b, b + 8, 41, 58, 3, 78)
pv = None
for lb in range(8):
    pv = oompah(b + lb, 92, pv, bass_tr='tuba')
    march(b + lb, 76)
    note('bass', at(t + lb * 4).low(28), t + lb * 4, 2, 76, art=0.9)
    note('bass', at(t + lb * 4 + 2).low(28), t + lb * 4 + 2, 2, 70, art=0.9)
for k in (0, 16):
    hit(CRASH, t + k, 92, 2)
    note('timp', N('Bb1') + 12, t + k, 1, 100)
    note('glock', N('Bb6'), t + k, 1, 70)
    note('glock', N('F7'), t + k + 0.5, 1, 62)
note('timp', N('F2'), t + 12, 1, 90)
note('timp', N('F2'), t + 26, 1, 90)
hit(CRASH, t + 28, 84, 2)
note('timp', N('Bb1') + 12, t + 28, 2, 96)
# the brass ease off into the evening
cresc('tpt', t + 28, t + 32, 108, 70)
cresc('vln', t + 28, t + 32, 112, 80)

# ============================================================================
# E  Evening Quay: the harpsichord alone again, the oboe remembers the opening; F7 back to the top
# ============================================================================
b = SEC['E']
t = b * 4
dyn('oboe', t, 92)
line(
    'oboe',
    t,
    'Bb4:.75 C5:.25 D5:1 F5:2  Eb5:.75 D5:.25 C5:1 Bb4:2  C5:1 Eb5:1 D5:1 F5:1  G5:1 F5:1 Eb5:1 C5:1',
    86,
    swell=8,
)
pv = None
for lb in range(4):
    count(b + lb, 54)
    pv = oompah(b + lb, 72, pv)
pad('inner', b, b + 4, 53, 70, 3, 40)
note('bells', N('F4'), t + 14, 2, 52)  # the harbour bell, far off
hit(STICK, t + 15, 40)

ORDER = {'program_change': 0, 'control_change': 1, 'note_off': 2, 'note_on': 3}


def save(path, tail=0):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name', name='Gilden'))
    last = 0
    for beat, bpm in sorted(TEMPO):
        a = int(beat * TPB)
        tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=a - last))
        last = a
    # who plays each shared channel when: a set-up wherever it passes to another part
    byc = {}
    for name, lst in ev.items():
        if name == DRUMS:
            continue
        for a, msg in lst:
            if msg.type == 'note_on':
                byc.setdefault(chans[name], []).append((a, name))
    extra = {k: [] for k in ev}
    for c, ons in byc.items():
        cur = None
        for a, name in sorted(ons):
            if name != cur:
                extra[name] += setup(name, c, max(0, a - 3) if cur else 0)
                cur = name
    for name, lst in ev.items():
        lst = extra[name] + lst
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=name))
        last = 0
        for a, msg in sorted(lst, key=lambda x: (max(0, x[0]), ORDER[x[1].type])):
            a = max(0, a)
            tr.append(msg.copy(time=a - last))
            last = a
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((END_BEATS + tail) * TPB) - last)))
    mid.save(path)


def write_wav(path, a, sr):
    o = wave.open(path, 'wb')
    o.setnchannels(a.shape[1])
    o.setsampwidth(2)
    o.setframerate(sr)
    o.writeframes(np.clip(a, -32767, 32767).astype(np.int16).tobytes())
    o.close()


def level(a, sr):
    """Bring the loop to TARGET_DB RMS, then a look-ahead limiter worked round the loop (so the seam is too)."""
    m = a / 32767
    m *= 10 ** (TARGET_DB / 20) / np.sqrt((m**2).mean())
    ceil = 0.93
    w = int(0.004 * sr)
    pk = np.abs(m).max(axis=1)
    pk = np.concatenate([pk[-w:], pk, pk[:w]])
    from numpy.lib.stride_tricks import sliding_window_view

    env = sliding_window_view(pk, 2 * w + 1).max(axis=1)
    g = np.minimum(1, ceil / np.maximum(env, 1e-9))
    k = int(0.05 * sr)  # release: smooth the gain (taking the minimum keeps it under the ceiling)
    g = np.concatenate([g[-k:], g])
    out = np.empty(len(g))
    cur = 1.0
    rel = 1 / k
    for i, x in enumerate(g):
        cur = x if x < cur else min(x, cur + rel)
        out[i] = cur
    g = out[k:]
    return m * g[:, None] * 32767, (g < 0.999).mean()


def render(mp3_path, x3=False):
    tmp = tempfile.mkdtemp()
    mpath, raw, loop = (os.path.join(tmp, f) for f in ('t.mid', 'raw.wav', 'loop.wav'))
    save(mpath, TAIL_BEATS)
    gain = 0.6
    while True:
        subprocess.run(
            ['fluidsynth', '-ni', '-g', str(gain), '-r', '44100', '-F', raw, SF2, mpath],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        w = wave.open(raw)
        chn, sr = w.getnchannels(), w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, chn).astype(np.float64)
        if np.abs(a).max() < 32000:
            break
        gain *= 0.75
    L = int(round(seconds(END_BEATS) * sr))
    out = a[:L].copy()
    tail = a[L:][:L]
    out[: len(tail)] += tail  # fold the reverb tail onto the start
    out, limited = level(out, sr)
    write_wav(loop, out, sr)
    ff = ['ffmpeg', '-y', '-loglevel', 'error']
    subprocess.run(ff + ['-i', loop, '-b:a', '128k', mp3_path], check=True)
    if x3:
        subprocess.run(
            ff + ['-stream_loop', '2', '-i', loop, '-b:a', '128k', mp3_path[:-4] + '_x3.mp3'], check=True
        )
    print(
        'Gilden loop %.1f s, %d bars at %d bpm; synth gain %.2f; limiter active %.1f%% of the time'
        % (L / sr, NBARS, BPM, gain, limited * 100)
    )
    return out, sr


def check(a, sr):
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    nm = lambda n: '%s%d' % (names[n % 12], n // 12 - 1)
    print('\nSections')
    for key, title, chords in SECTIONS:
        print('  %5.1f s  bar %2d  %-14s %s' % (seconds(SEC[key] * 4), SEC[key], title, ' | '.join(chords)))
    print('  %5.1f s  loop point' % seconds(END_BEATS))
    print('\nRanges (lowest - highest, allowed)')
    for tr, lst in ev.items():
        ns = [m.note for _, m in lst if m.type == 'note_on']
        if tr == DRUMS:
            print('  drums  %4d hits' % len(ns))
            continue
        lo, hi = PARTS[tr][4]
        flag = '' if lo <= min(ns) and max(ns) <= hi else '   <-- OUT OF RANGE'
        print(
            '  %-6s %-4s - %-4s (%s - %s)  %4d notes%s'
            % (tr, nm(min(ns)), nm(max(ns)), nm(lo), nm(hi), len(ns), flag)
        )
    m = a.mean(axis=1) / 32767
    rms = lambda seg: 20 * np.log10(max(1e-6, np.sqrt((seg**2).mean())))
    win = 5 * sr
    print('\nLoudness, RMS per 5 s (dBFS)')
    for i in range(0, len(m) - sr, win):
        d = rms(m[i : i + win])
        print(
            '  %3d-%3d s %6.1f dB  %s'
            % (i / sr, min(len(m), i + win) / sr, d, '#' * max(0, int((d + 48) * 1.2)))
        )
    print('  peak %.3f, overall RMS %.1f dB' % (np.abs(a).max() / 32767, rms(m)))
    print(
        '\nSeam: last 1 s %.1f dB, first 1 s %.1f dB, sample step %.4f (99th pct step %.4f)'
        % (rms(m[-sr:]), rms(m[:sr]), abs(m[0] - m[-1]), np.percentile(np.abs(np.diff(m)), 99))
    )


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    save(os.path.join(OUTDIR, NAME + '.mid'))
    if '--midi' not in sys.argv:
        a, sr = render(os.path.join(OUTDIR, NAME + '.mp3'), '--x3' in sys.argv)
        if '--check' in sys.argv:
            check(a, sr)
