# Corvanthe's district themes: one theme, eight variations.
#
# The theme (THEME: an 8-bar melody over an 8-bar chord loop in D minor with a
# Phrygian Eb) is written once. Each sector in SECTORS is a variation: tempo,
# mode (pitch-class swaps applied to melody and chords), its own chords,
# instruments, accompaniment pattern, percussion and "sparkle". The last chord
# (A) leads back into the first (D), so every variation loops.
#
#   python3 tools/music/corvanthe.py [sector ...]     -> audio/corvanthe/<sector>.mid
#   python3 tools/music/render.py [sector ...]        -> .mp3 seamless loops (needs fluidsynth)
#
# Requires: pip install mido
import os, random, sys
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'audio', 'corvanthe')
TPB = 480
BARS = 8

# ---- The theme -----------------------------------------------------------
# Melody: (midi note, beats) per bar, in D. Chords: per bar, 'X' or 'X|Y' (two halves).
THEME = {
    'melody': [
        [(62, 1), (65, 1), (69, 2)],  # D F A        rising, a question
        [(70, 1.5), (67, 0.5), (63, 2)],  # Bb G Eb      the Phrygian fall
        [(62, 1), (65, 1), (69, 1), (74, 1)],  # D F A D      climbs further
        [(72, 1.5), (70, 0.5), (69, 2)],  # C Bb A       onto the dominant
        [(74, 1.5), (72, 0.5), (70, 2)],  # D C Bb       second half, up an octave in most
        [(67, 1), (70, 1), (74, 2)],  # G Bb D
        [(75, 1.5), (74, 0.5), (70, 1), (67, 1)],  # Eb D Bb G    the high point
        [(73, 2), (69, 2)],  # C# A         half cadence, back to the top
    ],
    'chords': ['Dm', 'Eb', 'Dm', 'C|A', 'Bb', 'Gm', 'Eb', 'A'],
}

NAMES = {
    'C': 0,
    'C#': 1,
    'Db': 1,
    'D': 2,
    'D#': 3,
    'Eb': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'Gb': 6,
    'G': 7,
    'G#': 8,
    'Ab': 8,
    'A': 9,
    'A#': 10,
    'Bb': 10,
    'B': 11,
}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8], 'sus': [0, 5, 7]}


def parse_chord(s):
    root = s[:2] if len(s) > 1 and s[1] in '#b' else s[:1]
    pc = NAMES[root]
    bass = 36 + pc
    if bass > 42:
        bass -= 12  # roots between G1 (31) and F#2 (42)
    return bass, QUAL[s[len(root) :]]


def tones(root, qual, k):
    """k-th chord tone upward from root: 0 root, 1 third, 2 fifth, 3 octave..."""
    return root + qual[k % 3] + 12 * (k // 3)


# Bar filters for percussion and doubling.
ALL = lambda b: True
EVEN = lambda b: b % 2 == 0
ODD = lambda b: b % 2 == 1
LATE = lambda b: b >= 4
END = lambda b: b >= 6
TOPS = lambda b: b in (0, 4)


def eighths(seq, dur=0.42, acc=(0, 3, 6), hi=92, lo=62, short=0.3):
    return [(i * 0.5, k, dur if i in acc else short, hi if i in acc else lo) for i, k in enumerate(seq)]


# ---- The variations ------------------------------------------------------
# ost/arp pattern entries: (beat, tone, dur, vel). tone: chord-tone index (tones()),
# or ('s', semitones) above the root. 'alt' gives a second pattern for odd bars.
# perc entries: ('d', gm_drum_note, beat, dur, vel, bars) on the drum channel, or
# ('p', program, note, beat, dur, vel, bars) pitched; note 'root'/'root+12' follows the chord.
SECTORS = {
    'cindergate': dict(  # Fire: the forge that never stopped. Cello hammer 3+3+2, anvil, horn.
        bpm=84,
        pc={},
        ost=dict(
            prog=42,
            oct=12,
            pat=eighths([0, 0, 2, 3, 0, 0, ('s', 1), 3]),
            alt=eighths([0, 0, 2, 3, 0, 0, ('s', 8), 3]),
        ),
        bass=dict(prog=43),
        pad=dict(prog=48, vel=(52, 64), low=57),
        pad2=dict(prog=52, vel=48, bars=LATE),
        mel=dict(prog=60, oct=(-12, 0), vel=78),
        dbl=dict(prog=40, oct=12, vel=-14, bars=LATE),
        perc=[
            ('p', 47, 'root+12', 0, 0.5, 96, ALL),
            ('p', 47, 'root+12', 1.5, 0.5, 70, ALL),
            ('p', 47, 'root+12', 3, 0.5, 82, ALL),
            ('p', 14, 74, 3, 0.25, 80, ALL),
            ('p', 14, 74, 1.5, 0.25, 70, END),
            ('d', 80, 3.5, 0.2, 55, ALL),
            ('d', 35, 0, 0.3, 60, ALL),
        ],
        sparkle=dict(prog=8, n=(2, 3), base=60),
    ),
    'heights': dict(  # Air: bright D mixolydian, flute over harp, open sky.
        bpm=100,
        pc={3: 4, 5: 6, 10: 11},
        chords=['D', 'Em', 'D', 'C|A', 'Bm', 'G', 'Em', 'A'],
        ost=dict(
            prog=46,
            oct=24,
            pat=[(i * 0.5, k, 0.5, 60 if i % 4 else 74) for i, k in enumerate([0, 2, 3, 4, 5, 4, 3, 2])],
        ),
        bass=dict(prog=45, beats=(0, 2), dur=0.5, vel=70),
        pad=dict(prog=49, vel=(40, 50), low=62),
        pad2=dict(prog=53, vel=40, bars=LATE),
        mel=dict(prog=73, oct=(12, 12), vel=80, grace=True, artic=0.9),
        dbl=dict(prog=71, oct=0, vel=-16, bars=LATE),
        perc=[
            ('d', 81, 0, 1, 50, EVEN),
            ('d', 82, 0.5, 0.2, 30, ALL),
            ('d', 82, 1.5, 0.2, 30, ALL),
            ('d', 82, 2.5, 0.2, 30, ALL),
            ('d', 82, 3.5, 0.2, 34, ALL),
        ],
        sparkle=dict(prog=9, n=(2, 3), base=72),
    ),
    'spirewatch': dict(  # Lightning: fast and tense, spiccato strings, trumpet stabs, thunder.
        bpm=116,
        pc={},
        ost=dict(
            prog=48,
            oct=12,
            pat=[
                (i * 0.25, k, 0.18, 84 if i % 4 == 0 else 58)
                for i, k in enumerate([0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2, 1, 2])
            ],
        ),
        bass=dict(prog=43, beats=(0, 1.5, 2, 3.5), dur=0.4, vel=82),
        pad=dict(prog=44, vel=(46, 60), low=57),
        mel=dict(prog=56, oct=(0, 0), vel=88, artic=0.55, stutter=True),
        dbl=dict(prog=61, oct=-12, vel=-10, bars=LATE),
        perc=[
            ('p', 47, 'root+12', 0, 0.4, 104, ALL),
            ('p', 47, 'root+12', 2.5, 0.3, 84, ALL),
            ('p', 47, 'root+12', 3.5, 0.25, 70, ODD),
            ('d', 49, 0, 1, 76, TOPS),
            ('d', 38, 1, 0.2, 46, ALL),
            ('d', 38, 3, 0.2, 52, ALL),
            ('p', 55, 'root+24', 0, 0.5, 70, lambda b: b in (3, 7)),
        ],
        sparkle=dict(prog=98, n=(2, 4), base=74),
    ),
    'collegium': dict(  # Arcane: the orrery. Music box melody, harp clockwork, wood-block ticks.
        bpm=76,
        pc={},
        ost=dict(
            prog=46,
            oct=24,
            pat=[(i * 0.5, k, 0.45, 64 if i % 2 else 72) for i, k in enumerate([0, 1, 2, 3, 4, 3, 2, 1])],
        ),
        bass=dict(prog=43, vel=64),
        pad=dict(prog=52, vel=(44, 56), low=57),
        pad2=dict(prog=89, vel=36, bars=LATE),
        mel=dict(prog=10, oct=(12, 12), vel=84),
        dbl=dict(prog=11, oct=0, vel=-12, bars=LATE),
        perc=[
            ('d', 76, 0, 0.1, 44, ALL),
            ('d', 77, 1, 0.1, 34, ALL),
            ('d', 76, 2, 0.1, 40, ALL),
            ('d', 77, 3, 0.1, 34, ALL),
            ('d', 81, 0, 1, 40, TOPS),
        ],
        sparkle=dict(prog=9, n=(3, 4), base=72),
    ),
    'drowned': dict(  # Water: slow swell, cello melody over rolling harp triplets, the sea.
        bpm=66,
        pc={},
        ost=dict(
            prog=46,
            oct=12,
            pat=[
                (i / 3, k, 0.6, 58 if i % 3 else 70)
                for i, k in enumerate([0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3])
            ],
        ),
        bass=dict(prog=43, vel=70),
        pad=dict(prog=89, vel=(46, 56), low=57),
        pad2=dict(prog=49, vel=46, bars=LATE),
        mel=dict(prog=42, oct=(-12, 0), vel=84),
        dbl=dict(prog=68, oct=0, vel=-18, bars=LATE),
        perc=[('p', 122, 50, 0, 3.8, 34, TOPS), ('p', 47, 'root+12', 0, 1, 56, EVEN)],
        sparkle=dict(prog=11, n=(1, 2), base=72),
    ),
    'quarry': dict(  # Earth: heavy, low brass and taiko, the pick on stone.
        bpm=72,
        pc={},
        ost=dict(
            prog=42,
            oct=12,
            pat=[
                (0, 0, 0.9, 96),
                (1, 0, 0.4, 70),
                (1.5, 2, 0.4, 74),
                (2, 0, 0.9, 90),
                (3, 3, 0.4, 72),
                (3.5, 2, 0.4, 68),
            ],
        ),
        bass=dict(prog=43, vel=96),
        pad=dict(prog=53, vel=(50, 62), low=50),
        pad2=dict(prog=48, vel=50, bars=LATE),
        mel=dict(prog=57, oct=(-12, -12), vel=88),
        dbl=dict(prog=60, oct=0, vel=-10, bars=LATE),
        perc=[
            ('p', 116, 'root+12', 0, 0.5, 110, ALL),
            ('p', 116, 'root+12', 1.5, 0.5, 80, ALL),
            ('p', 116, 'root+12', 2, 0.5, 96, ALL),
            ('p', 116, 'root+12', 3.5, 0.3, 70, ODD),
            ('d', 75, 2.5, 0.1, 60, ALL),
            ('d', 75, 3.75, 0.1, 50, ALL),
            ('p', 58, 'root', 0, 3.8, 72, LATE),
        ],
        sparkle=None,
    ),
    'frostmarket': dict(  # Ice: sparse and cold, flute and glockenspiel, music-box frost, sleigh bells.
        bpm=70,
        pc={},
        ost=dict(prog=10, oct=36, pat=[(0, 3, 0.4, 56), (1, 4, 0.4, 50), (2, 5, 0.4, 54), (3, 4, 0.4, 48)]),
        bass=dict(prog=43, beats=(0,), dur=3.8, vel=54),
        pad=dict(prog=49, vel=(38, 48), low=64),
        pad2=dict(prog=52, vel=34, bars=LATE),
        mel=dict(prog=73, oct=(0, 0), vel=80),
        dbl=dict(prog=9, oct=12, vel=-14, bars=LATE),
        perc=[('d', 83, 1, 0.3, 36, ODD), ('d', 83, 3, 0.3, 40, ALL), ('d', 81, 0, 1, 36, TOPS)],
        sparkle=dict(prog=98, n=(3, 4), base=76),
    ),
    'gloamside': dict(  # Dark: slowest, bassoon and choir, a tolling bell, organ underneath.
        bpm=60,
        pc={},
        ost=dict(
            prog=42,
            oct=12,
            pat=[(0, 0, 0.95, 80), (1, 2, 0.95, 60), (2, ('s', 1), 0.95, 66), (3, 0, 0.95, 58)],
        ),
        bass=dict(prog=43, vel=76),
        pad=dict(prog=19, vel=(36, 46), low=50),
        pad2=dict(prog=52, vel=56, bars=LATE),
        mel=dict(prog=70, oct=(-12, -12), vel=84),
        dbl=dict(prog=52, oct=0, vel=-6, bars=LATE),
        perc=[('p', 14, 62, 0, 2, 76, EVEN), ('d', 35, 0, 0.6, 66, ALL), ('d', 35, 2, 0.4, 44, ODD)],
        sparkle=None,
    ),
}


def build(name, seed=7):
    cfg = SECTORS[name]
    rnd = random.Random(seed)
    pcmap = cfg.get('pc', {})
    bpm = cfg['bpm']
    chords = [[parse_chord(h) for h in c.split('|')] for c in cfg.get('chords', THEME['chords'])]
    chords = [c if len(c) == 2 else [c[0], c[0]] for c in chords]
    ev, chans = {}, {}

    def chan(tr, prog, vol=100, rev=70):
        if tr not in chans:
            ch = len(chans)
            ch = ch + 1 if ch >= 9 else ch  # skip the drum channel
            chans[tr] = ch
            ev.setdefault(tr, []).extend(
                [
                    (0, mido.Message('program_change', channel=ch, program=prog)),
                    (0, mido.Message('control_change', channel=ch, control=7, value=vol)),
                    (0, mido.Message('control_change', channel=ch, control=91, value=rev)),
                ]
            )
        return chans[tr]

    def note(tr, ch, n, start, dur, vel):
        vel = max(1, min(127, int(vel + rnd.randint(-5, 5))))
        n = max(0, min(127, n))
        s, e = int(start * TPB), int((start + dur) * TPB) - 6
        ev.setdefault(tr, []).append((s, mido.Message('note_on', channel=ch, note=n, velocity=vel)))
        ev.setdefault(tr, []).append((e, mido.Message('note_off', channel=ch, note=n, velocity=0)))

    def mode(n):
        return n - n % 12 + pcmap.get(n % 12, n % 12)

    def tone_of(k, root, qual, oct):
        if isinstance(k, tuple):
            return root + oct + k[1]
        return tones(root, qual, k) + oct

    ev['drums'] = [(0, mido.Message('control_change', channel=9, control=91, value=70))]
    for b in range(BARS):
        t0 = b * 4
        same = chords[b][0] == chords[b][1]
        half = lambda beat: chords[b][0 if beat < 2 else 1]
        # accompaniment
        o = cfg['ost']
        ch = chan('ost', o['prog'], 100, 50)
        pat = o['alt'] if (b % 2 and 'alt' in o) else o['pat']
        for beat, k, d, v in pat:
            r, q = half(beat)
            note('ost', ch, tone_of(k, r, q, o['oct']), t0 + beat, d, v)
        # bass, pad, second pad
        bc = cfg['bass']
        ch = chan('bass', bc['prog'], 95, 45)
        for beat in bc.get('beats', (0,) if same else (0, 2)):
            r, q = half(beat)
            note(
                'bass',
                ch,
                r,
                t0 + beat,
                bc.get('dur', (4 if same else 2) - beat % 2 - 0.05),
                bc.get('vel', 80),
            )
        for key in ('pad', 'pad2'):
            p = cfg.get(key)
            if not p or not p.get('bars', ALL)(b):
                continue
            ch = chan(key, p['prog'], 85, 95)
            v = p['vel'] if isinstance(p['vel'], int) else p['vel'][0 if b < 4 else 1]
            for h in ((0,) if same else (0, 1)):
                r, q = chords[b][h]
                for iv in q:
                    n = r + 24 + iv
                    while n < p.get('low', 57):
                        n += 12
                    note(key, ch, n, t0 + 2 * h, (4 if same else 2) - 0.05, v)
        # percussion
        for spec in cfg['perc']:
            if spec[0] == 'd':
                _, n, beat, d, v, bars = spec
                if bars(b):
                    note('drums', 9, n, t0 + beat, d, v)
            else:
                _, prog, n, beat, d, v, bars = spec
                if not bars(b):
                    continue
                tr = 'perc%d' % prog
                ch = chan(tr, prog, 100, 60)
                if isinstance(n, str):
                    r = half(beat)[0]
                    n = r + (int(n[5:]) if '+' in n else 0)
                    if prog == 47 and n > 53:
                        n -= 12  # keep timpani in range
                note(tr, ch, n, t0 + beat, d, v)
        # sparkle
        s = cfg.get('sparkle')
        if s:
            ch = chan('sparkle', s['prog'], 80, 110)
            r, q = chords[b][0]
            for _ in range(rnd.randint(*s['n']) if b >= 4 else s['n'][0]):
                n = r + s['base'] - 36 + rnd.choice(q) + rnd.choice([0, 12])
                while n < s['base']:
                    n += 12
                note(
                    'sparkle',
                    ch,
                    min(n, 100),
                    t0 + rnd.choice([0.5, 1.5, 2.25, 2.75, 3.25]),
                    0.4,
                    rnd.randint(40, 62),
                )

    # melody and its doubling
    m = cfg['mel']
    mch = chan('mel', m['prog'], 110, 80)
    dcfg = cfg.get('dbl')
    dch = chan('dbl', dcfg['prog'], 95, 90) if dcfg else None
    for b, bar in enumerate(THEME['melody']):
        t = b * 4
        for theme_n, d in bar:
            base = mode(theme_n)  # the theme note in this sector's mode
            n = base + m['oct'][0 if b < 4 else 1]
            v = m['vel'] + (8 if b >= 4 else 0) + (6 if d >= 2 else 0)
            art = m.get('artic', 0.97)
            if m.get('stutter') and d >= 1.5:  # long notes become repeated stabs
                k = 0
                while k < d:
                    note('mel', mch, n, t + k, 0.5 * art, v - (0 if k == 0 else 14))
                    k += 0.5
            elif m.get('grace') and d >= 1:  # a quick upper-neighbour flick into the note
                note('mel', mch, n + 2, t, 0.12, v - 16)
                note('mel', mch, n, t + 0.12, d * art - 0.12, v)
            else:
                note('mel', mch, n, t, d * art, v)
            if dcfg and dcfg['bars'](b):
                note('dbl', dch, base + dcfg['oct'], t, d * 0.97, v + dcfg['vel'])
            t += d
    # expression swell into the second half, ease back for the loop
    for k in range(9):
        ev['mel'].append(
            (
                int((12 + k * 0.5) * TPB),
                mido.Message('control_change', channel=mch, control=11, value=80 + k * 5),
            )
        )
        ev['mel'].append(
            (
                int((28 + k * 0.45) * TPB),
                mido.Message('control_change', channel=mch, control=11, value=120 - k * 5),
            )
        )

    mid = mido.MidiFile(ticks_per_beat=TPB)
    end = BARS * 4 * TPB
    first = True
    for tr_name, lst in ev.items():
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=tr_name))
        if first:
            tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm)))
            first = False
        last = 0
        for at, msg in sorted(lst, key=lambda x: (x[0], x[1].type == 'note_on')):
            tr.append(msg.copy(time=at - last))
            last = at
        tr.append(mido.MetaMessage('end_of_track', time=max(0, end - last)))
    return mid


def loop_seconds(name):
    return BARS * 4 * 60 / SECTORS[name]['bpm']


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name in sys.argv[1:] or SECTORS:
        build(name).save(os.path.join(OUT, name + '.mid'))
        print('%-12s %5.1f s' % (name, loop_seconds(name)))
