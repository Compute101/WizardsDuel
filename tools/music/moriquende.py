# The Moriquende: the forest's theme (Elfhome and the forest year), a seamless loop.
#   python3 tools/music/moriquende.py           -> audio/moriquende_theme.mid / .mp3
#   python3 tools/music/moriquende.py --check   -> also print ranges, loudness and the seam
#   python3 tools/music/moriquende.py --x3      -> also moriquende_theme_x3.mp3 (the loop three times)
#
# The user's brief: soothing and tranquil, yet with stirring phrases, as if the wood is still and
# peaceful but could be roused at any moment. E Dorian (the raised C# is the wood's light), 72 bpm,
# harp and slow strings over a soft drone, the tune on flute and clarinet; distant horns call twice,
# and once the wood stirs: horn call, low strings and a timpani roll swell to a height, then fall still.
#
#   A  Stillness  bars 0-7    E Dorian  harp, warm pad, the flute tune; nothing hurries
#   B  Birdsong   bars 8-15   G Lydian  clarinet, with flute bird-calls and celesta glints; a horn far off
#   C  Stirring   bars 16-23  E minor   a horn call answered, cellos and tremolo strings rise, timpani roll,
#                                       the strings take the call up to a height on B7 ... and
#   D  Settling   bars 24-31  E minor   the wood goes still again: the flute alone over the harp, one last
#                                       faint horn, Bsus4 -> B at the end leading back to bar 0
import os, random, subprocess, sys, tempfile, wave
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, '..', '..', 'audio')
NAME = 'moriquende_theme'
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TPB = 480
BPM = 72
TAIL_BEATS = 10
rnd = random.Random(5150)

# track -> (GM program, volume, pan, reverb, playable range)
PARTS = {
    'flute': (73, 104, 58, 110, (60, 96)),
    'clar': (71, 100, 74, 105, (50, 91)),
    'horn': (60, 96, 36, 120, (41, 77)),
    'horn2': (60, 88, 92, 120, (41, 77)),
    'strs': (49, 100, 64, 110, (40, 88)),  # slow strings: the held chords
    'trem': (44, 96, 50, 105, (40, 88)),  # tremolo strings, in the stirring
    'vln': (48, 108, 44, 105, (55, 96)),  # violins take the call up
    'cello': (42, 104, 80, 95, (36, 72)),
    'bass': (43, 96, 84, 90, (28, 55)),
    'harp': (46, 104, 34, 100, (36, 96)),
    'pad': (89, 80, 64, 110, (40, 76)),  # warm pad: the drone under everything
    'choir': (52, 84, 60, 120, (48, 76)),
    'cel': (8, 84, 88, 120, (72, 103)),
    'timp': (47, 104, 64, 90, (40, 55)),
}
ev, chans, LEVEL = {}, {}, {}


def ch(tr):
    if tr not in chans:
        c = len(chans)
        c = c + 1 if c >= 9 else c
        chans[tr] = c
        prog, vol, pan, rev, _ = PARTS[tr]
        LEVEL[tr] = 100
        ev[tr] = [
            (0, mido.Message('program_change', channel=c, program=prog)),
            (0, mido.Message('control_change', channel=c, control=7, value=vol)),
            (0, mido.Message('control_change', channel=c, control=10, value=pan)),
            (0, mido.Message('control_change', channel=c, control=11, value=100)),
            (0, mido.Message('control_change', channel=c, control=91, value=rev)),
            (0, mido.Message('control_change', channel=c, control=93, value=30)),
        ]
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


def note(tr, n, start, dur, vel, jitter=3, art=0.97):
    c = ch(tr)
    vel = max(1, min(127, int(vel + rnd.randint(-jitter, jitter))))
    s = int(start * TPB)
    e = min(int((start + dur * art) * TPB), END_BEATS * TPB - 8)
    ev[tr].append((s, mido.Message('note_on', channel=c, note=int(n), velocity=vel)))
    ev[tr].append((max(s + 10, e), mido.Message('note_off', channel=c, note=int(n), velocity=0)))


NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def N(s):
    pc, i = NAMES[s[0]], 1
    while s[i] in '#b':
        pc += 1 if s[i] == '#' else -1
        i += 1
    return pc + 12 * (int(s[i:]) + 1)


def line(tr, bar, s, vel, shift=0, art=0.97, swell=0):
    """'B4:1.5 A4:.5 r:2' from the start of a bar; long notes bloom by `swell` and settle back."""
    t = bar * 4
    for tok in s.split():
        nm, d = tok.split(':')
        d = float(d)
        if nm != 'r':
            note(tr, N(nm) + shift, t, d, vel + (4 if d >= 2 else 0), art=art if d >= 0.5 else min(art, 0.85))
            if swell and d >= 1.5:
                L = LEVEL[tr]
                for k in range(9):
                    x = k / 8
                    cc(tr, t + d * x, L + swell * (x / 0.5 if x < 0.5 else 1 - (x - 0.5) * 1.3))
                cc(tr, t + d, L)
        t += d


# ---- harmony: one chord a bar ('|' splits a bar in two) --------------------
QUAL = {
    '': [0, 4, 7],
    'm': [0, 3, 7],
    'sus4': [0, 5, 7],
    'sus2': [0, 2, 7],
    '7': [0, 4, 7, 10],
    'm7': [0, 3, 7, 10],
    'maj7': [0, 4, 7, 11],
    'add9': [0, 4, 7, 14],
    'madd9': [0, 3, 7, 14],
}


class Chord:
    def __init__(self, nm):
        main, _, slash = nm.partition('/')
        root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
        self.name = nm
        self.root = (NAMES[root[0]] + (1 if '#' in root else -1 if 'b' in root else 0)) % 12
        self.iv = QUAL[main[len(root) :]]
        self.pcs = sorted({(self.root + i) % 12 for i in self.iv})
        b = slash or None
        self.bass = (NAMES[b[0]] + (1 if '#' in b else 0)) % 12 if b else self.root

    def low(self, lo=28):
        return lo + (self.bass - lo) % 12

    def tones(self, lo, hi):
        return [n for n in range(lo, hi + 1) if n % 12 in self.pcs]


SECTIONS = [
    ('A', 'Stillness', ['Emadd9', 'Emadd9', 'Cmaj7/E', 'D', 'Em', 'G/D', 'Cmaj7', 'D']),
    ('B', 'Birdsong', ['G', 'A/G', 'Em7', 'Bm', 'C', 'G/B', 'Am7', 'D']),
    ('C', 'Stirring', ['Em', 'Em', 'C', 'D', 'Em', 'C', 'Am', 'B7']),
    ('D', 'Settling', ['Cmaj7', 'G/B', 'Am7', 'Emadd9', 'C', 'G/D', 'Am7', 'Bsus4|B']),
]
HARM, SEC = [], {}
for key, _, names in SECTIONS:
    SEC[key] = len(HARM)
    for nm in names:
        h = [Chord(x) for x in nm.split('|')]
        HARM.append(h if len(h) == 2 else h * 2)
NBARS = len(HARM)
END_BEATS = NBARS * 4
A, B, C, D = (SEC[k] for k in 'ABCD')
TEMPO = [
    (0, BPM),
    (C * 4 + 16, BPM + 4),
    (D * 4, BPM),
    (END_BEATS - 4, BPM - 3),
]  # the stirring presses on a little


def seconds(beat):
    t, last, bpm = 0.0, 0.0, TEMPO[0][1]
    for b, v in sorted(TEMPO):
        if b >= beat:
            break
        t += (b - last) * 60 / bpm
        last, bpm = b, v
    return t + (beat - last) * 60 / bpm


def voicing(c, lo, hi, n):
    """n chord tones in [lo, hi], spread from the bottom, every pitch class once before any doubles."""
    ts = c.tones(lo, hi)
    out, seen = [], set()
    for t in ts:
        if t % 12 not in seen:
            out.append(t)
            seen.add(t % 12)
    for t in ts:
        if len(out) >= n:
            break
        if t not in out:
            out.append(t)
    return sorted(out[:n])


# ---- the drone, the held strings and the bass, all the way through ---------
for tr, v in (('pad', 62), ('strs', 70), ('bass', 74), ('harp', 82)):
    dyn(tr, 0, v)
for b in range(NBARS):
    for half in (0, 1):
        c = HARM[b][half]
        if half and c.name == HARM[b][0].name:
            continue
        t, dur = b * 4 + half * 2, 4 if c.name == HARM[b][1].name else 2
        for n in voicing(c, 52, 71, 4):
            note('strs', n, t, dur, 46, jitter=2, art=1.0)
        note('bass', c.low(28), t, dur, 52, jitter=2, art=1.0)
    # the pad holds E and B under every bar but the B7 and the B at the end (its E would rub)
    pcs = HARM[b][0].pcs
    drone = [N('E3'), N('B3')] if 4 in pcs or 11 in pcs else [N('D3'), N('A3')]
    if HARM[b][0].name.startswith('B'):
        drone = [N('B2'), N('F#3')]
    for n in drone:
        note('pad', n, b * 4, 4, 50, jitter=1, art=1.0)

# ---- the harp: slow rising and falling quavers, sparse in the stirring -----
for b in range(NBARS):
    for half in (0, 1):
        c = HARM[b][half]
        ts = [n for n in c.tones(c.low(40), c.low(40) + 30)][:6]
        pat = ts + ts[-2:0:-1]  # up five, down: 8 quavers over a bar
        steps = pat[:4] if half == 0 else pat[4:8]
        if C <= b < C + 6:  # the stirring: the harp waits, only a low pluck a beat
            if half == 0:
                note('harp', ts[0], b * 4, 2, 60)
            continue
        for k, n in enumerate(steps):
            v = 58 if k == 0 else 46
            note('harp', n, b * 4 + half * 2 + k * 0.5, 1.5, v, jitter=4, art=1.0)
    if C + 6 <= b < D:  # back in with the height of the stirring, louder
        pass

# ---- A: Stillness. The flute tune, unhurried --------------------------------
dyn('flute', 0, 82)
line('flute', A + 1, 'B4:1.5 A4:.5 B4:1 E5:1', 70, swell=8)
line('flute', A + 2, 'D5:2 C5:1 B4:1', 66, swell=6)
line('flute', A + 3, 'A4:3 r:1', 62, swell=8)
line('flute', A + 4, 'G4:1 A4:1 B4:1.5 D5:.5', 68)
line('flute', A + 5, 'E5:2 D5:1 B4:1', 70, swell=8)
line('flute', A + 6, 'A4:2 G4:1 E4:1', 64)
line('flute', A + 7, 'F#4:3 r:1', 60, swell=6)

# ---- B: Birdsong. The clarinet over G, the C# a shaft of light -------------
dyn('clar', B * 4, 84)
line('clar', B + 0, 'B4:1.5 C#5:.5 D5:2', 70, swell=8)
line('clar', B + 1, 'E5:1 C#5:1 A4:2', 66, swell=6)
line('clar', B + 2, 'B4:1.5 D5:.5 E5:1 G5:1', 70)
line('clar', B + 3, 'F#5:3 r:1', 68, swell=10)
line('clar', B + 4, 'E5:1.5 D5:.5 C5:1 E5:1', 68)
line('clar', B + 5, 'D5:2 B4:2', 64, swell=6)
line('clar', B + 6, 'C5:1 B4:1 A4:1 G4:1', 62)
line('clar', B + 7, 'A4:3 r:1', 58, swell=6)
# bird-calls on the flute in the clarinet's rests, and glints on the celesta
for bar, s in (
    (B + 1, 'r:2.5 E6:.25 F#6:.25 E6:.5 r:.5'),
    (B + 3, 'r:3 A5:.25 B5:.25 A5:.5'),
    (B + 5, 'r:2.5 G6:.25 A6:.25 G6:.5 r:.5'),
    (B + 7, 'r:3 F#5:.25 A5:.25 F#5:.5'),
):
    line('flute', bar, s, 52, art=0.8)
dyn('cel', 0, 78)
for b in list(range(B, B + 8)) + list(range(D, D + 6)):
    c = HARM[b][0]
    hi = c.tones(80, 96)
    for k in range(2):
        t = b * 4 + rnd.choice([0.5, 1.5, 2.5, 3]) + k * 0.25
        note('cel', rnd.choice(hi), t, 1, 40, jitter=6)
# a horn far off: the first hint that the wood can wake
dyn('horn', B * 4, 58)
line('horn', B + 6, 'E4:1 B4:3', 44, swell=10)

# ---- C: Stirring. Horn call and answer, strings rise, timpani roll ---------
dyn('horn', C * 4, 78)
dyn('horn2', C * 4, 70)
line('horn', C + 0, 'r:2 B3:1 E4:1', 62)
line('horn', C + 1, 'B4:2.5 A4:.5 G4:1', 70, swell=10)
line('horn', C + 2, 'E4:3 r:1', 64, swell=8)
line('horn2', C + 3, 'D4:1 A4:2.5 F#4:.5', 64, swell=8)  # the answer, from the other side of the wood
cresc('horn2', C * 4 + 12, C * 4 + 16, 70, 60)
# cellos pulse, then tremolo strings and choir rise under the strings' call
dyn('cello', C * 4, 70)
for b in range(C, C + 8):
    c = HARM[b][0]
    r = c.low(36)
    for k in range(4):
        note('cello', r if k % 2 == 0 else r + 7, b * 4 + k, 1, 56 + (b - C) * 4, art=0.6)
dyn('trem', C * 4 + 8, 40)
cresc('trem', C * 4 + 8, C * 4 + 30, 40, 104)
for b in range(C + 2, C + 8):
    for n in voicing(HARM[b][0], 55, 79, 4):
        note('trem', n, b * 4, 4, 62, jitter=2, art=1.0)
dyn('choir', C * 4 + 12, 40)
cresc('choir', C * 4 + 12, C * 4 + 30, 40, 96)
for b in range(C + 3, C + 8):
    for n in voicing(HARM[b][0], 55, 72, 3):
        note('choir', n, b * 4, 4, 58, jitter=2, art=1.0)
# the violins take the call up to the height
dyn('vln', C * 4 + 16, 76)
cresc('vln', C * 4 + 16, C * 4 + 28, 76, 112)
line('vln', C + 4, 'B4:1 E5:1 F#5:1 G5:1', 76)
line('vln', C + 5, 'A5:1.5 G5:.5 E5:2', 82, swell=8)
line('vln', C + 6, 'C6:2 B5:1 A5:1', 90, swell=8)
line('vln', C + 7, 'B5:2 A5:1 F#5:.75 r:.25', 94, swell=6)
# both horns on the chords at the height
line('horn', C + 5, 'E4:2 G4:2', 74, swell=8)
line('horn2', C + 5, 'C4:2 E4:2', 70)
line('horn', C + 6, 'A4:4', 80, swell=10)
line('horn2', C + 6, 'E4:4', 74)
line('horn', C + 7, 'B4:2 A4:1.5 r:.5', 84)
line('horn2', C + 7, 'D#4:2 F#4:1.5 r:.5', 78)
# the timpani roll: soft at first, swelling into the height, cut off before the settling
dyn('timp', C * 4, 100)
for t in np.arange(C * 4 + 20, C * 4 + 31.5, 0.125):
    x = (t - (C * 4 + 20)) / 11.5
    note('timp', N('E2') if t < C * 4 + 28 else N('B1') + 12, t, 0.125, 30 + 70 * x * x, jitter=4, art=1.0)
note('timp', N('B2'), C * 4 + 31.5, 0.5, 96)
# strings, bass and pad swell with it
for tr, lo, hi in (('strs', 70, 98), ('bass', 74, 100), ('pad', 62, 76), ('cello', 70, 100)):
    cresc(tr, C * 4 + 16, C * 4 + 30, lo, hi)

# ---- D: Settling. Still again ----------------------------------------------
for tr, v in (('strs', 70), ('bass', 74), ('pad', 62), ('trem', 0), ('choir', 0), ('vln', 60), ('cello', 60)):
    dyn(tr, D * 4, v)
dyn('flute', D * 4, 80)
line('flute', D + 0, 'G5:1.5 E5:.5 D5:2', 64, swell=6)
line('flute', D + 1, 'B4:2 D5:1 G4:1', 60)
line('flute', D + 2, 'C5:1.5 B4:.5 A4:2', 60, swell=6)
line('flute', D + 3, 'B4:4', 58, swell=8)
line('flute', D + 4, 'r:1 G4:1 A4:1 B4:1', 56)
line('flute', D + 5, 'D5:3 B4:1', 58, swell=6)
line('flute', D + 6, 'C5:2 A4:2', 54)
line('flute', D + 7, 'B4:3 r:1', 50, swell=4)
# one last horn, very far off: the wood is only sleeping
dyn('horn', D * 4, 52)
line('horn', D + 5, 'r:1 E4:1 B4:2', 40, swell=8)
# the last bar thins out toward the quiet start
for tr in ('strs', 'bass', 'pad', 'harp'):
    cresc(tr, END_BEATS - 4, END_BEATS - 0.1, LEVEL[tr], LEVEL[tr] - 8)


# ---- output ----------------------------------------------------------------
ORDER = {'program_change': 0, 'control_change': 0, 'note_off': 1, 'note_on': 2}


def save(path, tail=0):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name', name='The Moriquende'))
    last = 0
    for beat, bpm in sorted(TEMPO):
        at_ = int(beat * TPB)
        tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=at_ - last))
        last = at_
    for name, lst in ev.items():
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=name))
        last = 0
        for at_, msg in sorted(lst, key=lambda x: (max(0, x[0]), ORDER[x[1].type])):
            at_ = max(0, at_)
            tr.append(msg.copy(time=at_ - last))
            last = at_
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((END_BEATS + tail) * TPB) - last)))
    mid.save(path)


def write_wav(path, a, sr):
    o = wave.open(path, 'wb')
    o.setnchannels(a.shape[1])
    o.setsampwidth(2)
    o.setframerate(sr)
    o.writeframes(a.astype(np.int16).tobytes())
    o.close()


TARGET_DB = -19.0  # overall RMS: a shade under the towns' themes (about -16), it's the quiet place
CEIL = 0.89  # the limiter's ceiling (of full scale)


def level(out, sr):
    """Bring the loop to TARGET_DB, with a smooth look-ahead limiter so the stirring's peaks don't clip.
    The gain envelope is worked out round the loop (wrapped), so the seam isn't touched by it."""
    x = out / 32767
    x *= 10 ** ((TARGET_DB - 20 * np.log10(np.sqrt((x.mean(axis=1) ** 2).mean()))) / 20)
    blk = sr // 100  # 10 ms blocks
    n = len(x) // blk + 1
    pad = np.concatenate([x, x[: n * blk - len(x)]])
    peak = np.abs(pad).reshape(n, blk, -1).max(axis=(1, 2))
    g = np.minimum(1, CEIL / np.maximum(peak, 1e-6))
    g = np.minimum.reduce([np.roll(g, -k) for k in range(4)])  # 40 ms look-ahead
    for _ in range(2):  # release: ease back up over about 300 ms
        for i in range(-60, 2 * n):
            g[i % n] = min(g[i % n], g[(i - 1) % n] + 0.004)
    g = np.convolve(np.concatenate([g[-5:], g, g[:5]]), np.ones(5) / 5, 'same')[5:-5]
    gs = np.repeat(g, blk)[: len(x)]
    x = np.clip(x * gs[:, None], -CEIL, CEIL)
    print(
        'levelled to %.1f dB RMS; limiter took up to %.1f dB off the loudest moments'
        % (TARGET_DB, -20 * np.log10(g.min()))
    )
    return x * 32767


def render(mp3_path, x3=False):
    """A seamless loop: the reverb tail past the loop's end is folded back onto its start."""
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
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, chn).astype(np.float32)
        if np.abs(a).max() < 32000:
            break
        gain *= 0.75
    L = int(round(seconds(END_BEATS) * sr))
    out = a[:L].copy()
    tail = a[L:][:L]
    out[: len(tail)] += tail
    out = level(out, sr)
    write_wav(loop, out, sr)
    ff = ['ffmpeg', '-y', '-loglevel', 'error']
    subprocess.run(ff + ['-i', loop, '-b:a', '128k', mp3_path], check=True)
    if x3:
        subprocess.run(
            ff + ['-stream_loop', '2', '-i', loop, '-b:a', '128k', mp3_path[:-4] + '_x3.mp3'], check=True
        )
    print('The Moriquende: loop %.1f s, %d bars at %d bpm; synth gain %.2f' % (L / sr, NBARS, BPM, gain))
    return out, sr


def check(a, sr):
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    nm = lambda n: '%s%d' % (names[n % 12], n // 12 - 1)
    print('\nSections')
    for key, title, chords in SECTIONS:
        print('  %5.1f s  bar %2d  %-10s %s' % (seconds(SEC[key] * 4), SEC[key], title, ' | '.join(chords)))
    print('  %5.1f s  loop point' % seconds(END_BEATS))
    print('\nRanges')
    for tr, lst in ev.items():
        ns = [m.note for _, m in lst if m.type == 'note_on']
        if not ns:
            continue
        lo, hi = PARTS[tr][4]
        flag = '' if lo <= min(ns) and max(ns) <= hi else '   <-- OUT OF RANGE'
        print('  %-6s %-4s - %-4s %4d notes%s' % (tr, nm(min(ns)), nm(max(ns)), len(ns), flag))
    m = a.mean(axis=1) / 32767
    rms = lambda seg: 20 * np.log10(max(1e-6, np.sqrt((seg**2).mean())))
    win = 5 * sr
    print('\nLoudness, RMS per 5 s (dBFS)')
    for i in range(0, len(m) - sr, win):
        v = rms(m[i : i + win])
        print(
            '  %3d-%3d s %6.1f dB  %s'
            % (i / sr, min(len(m), i + win) / sr, v, '#' * max(0, int((v + 48) * 1.2)))
        )
    print('  overall %.1f dB' % rms(m))
    print(
        '\nSeam: last 1 s %.1f dB, first 1 s %.1f dB, sample step %.4f'
        % (rms(m[-sr:]), rms(m[:sr]), abs(m[0] - m[-1]))
    )


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    save(os.path.join(OUTDIR, NAME + '.mid'))
    if '--midi' not in sys.argv:
        a, sr = render(os.path.join(OUTDIR, NAME + '.mp3'), '--x3' in sys.argv)
        if '--check' in sys.argv:
            check(a, sr)
