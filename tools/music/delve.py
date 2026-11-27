# The Stoneheart Delve: six pieces of mining music for Durin's mine, each a seamless loop.
#   python3 tools/music/delve.py [work|deep|halls|hammer|jig|ale ...] -> audio/delve/<name>.mid / .mp3 (all if none named)
#   python3 tools/music/delve.py --check                 -> also print ranges, loudness and the seam
#   python3 tools/music/delve.py --x3                    -> also <name>_x3.mp3 (the loop three times, to hear the join)
#
# The brief (docs/mine-design.md, "Build order" 7): a dwarf sound, low brass and anvils, kin to the
# Corvanthe theme. FluidR3 like the rest of the music. js/mine.js plays them in turn while the Delve is open.
#
# work   "Pick and Lantern"      D minor, 96 bpm. A work song: picks strike on 1 and 3 over a tuba
#                                ostinato. Muster (bassoons), Chorus (the men sing the Corvanthe theme,
#                                trombones under them), Answer (horn calls, bassoons answer, pizzicato),
#                                All Hands (the theme again, everyone, the anvil on 4).
# deep   "Lamplight in the Deep" A minor, 66 bpm. The quiet one: a low drone, drips (kalimba, celesta), a
#                                far-off miner's pick. Drips, Hum (cor anglais over the men humming), Vein
#                                (a glint of C major: clarinet, harp, celesta), Return (the cello tune).
# halls  "Halls of the Stoneheart" C minor, 80 bpm. The grand one: Gate (the Corvanthe theme down a tone on
#                                trombones and tubas, the forge rhythm 3+3+2 in the low strings), Hall (E-flat
#                                major, the horns), Deep (the choir over tremolo strings, a timpani roll),
#                                Grand (the theme tutti, the anvil on 4), falling back to the quiet Gate.
# The second three are original tunes (no Corvanthe theme), upbeat, with the dwarves singing:
# hammer "Hammer and Hold"       G major, 116 bpm. Picks on 2 and 4 like a backbeat, tuba oom-pah; the horn's
#                                tune, a sung verse with trombone answers, a two-part chorus, a trumpet descant.
# jig    "The Deep Seam Jig"     A minor, 12/8 at 112. Flute and bassoon, tambourine on every triplet, the
#                                dwarves shouting "Hey!", a C major turn on the horn, then all of them sing it.
# ale    "Ale at the Shift's End" B-flat major, 100 bpm. Stamp, clap, tankard clink; one dwarf starts the song,
#                                all join in two parts, a quieter tale in G minor on bassoon, the last round tutti.
import os, random, subprocess, sys, tempfile, wave
from fractions import Fraction
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, '..', '..', 'audio', 'delve')
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TPB = 480
TAIL_BEATS = 8
CEIL = 0.89

# track -> (GM program, volume, pan, reverb, playable range); 'drums' is channel 10
PARTS = {
    'tuba': (58, 100, 70, 70, (28, 58)),
    'tbn': (57, 98, 52, 80, (40, 72)),
    'horn': (60, 100, 40, 95, (41, 77)),
    'horn2': (60, 90, 88, 95, (41, 77)),
    'tpt': (56, 84, 60, 85, (55, 82)),
    'bsn': (70, 100, 76, 75, (34, 75)),
    'cor': (69, 100, 56, 90, (52, 81)),
    'clar': (71, 98, 70, 90, (50, 91)),
    'choir': (52, 92, 64, 105, (45, 79)),
    'hum': (53, 88, 60, 110, (45, 72)),
    'strs': (48, 96, 64, 95, (40, 96)),
    'slow': (49, 96, 64, 105, (36, 88)),
    'trem': (44, 92, 50, 95, (40, 88)),
    'pizz': (45, 96, 78, 70, (36, 84)),
    'cello': (42, 102, 80, 80, (36, 76)),
    'cb': (43, 100, 84, 70, (28, 55)),
    'harp': (46, 100, 34, 90, (36, 96)),
    'cel': (8, 80, 90, 110, (60, 103)),
    'kal': (108, 84, 30, 115, (60, 96)),
    'pad': (89, 76, 64, 105, (36, 76)),
    'timp': (47, 104, 64, 75, (38, 55)),
    'anvil': (14, 66, 34, 70, (74, 86)),
    'choir2': (52, 86, 76, 105, (45, 79)),  # the second part of the dwarves' singing
    'flute': (73, 94, 44, 90, (60, 96)),
    'drums': (0, 104, 64, 70, (27, 87)),
}
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
QUAL = {
    '': [0, 4, 7],
    'm': [0, 3, 7],
    'sus4': [0, 5, 7],
    '7': [0, 4, 7, 10],
    'm7': [0, 3, 7, 10],
    'maj7': [0, 4, 7, 11],
    'madd9': [0, 3, 7, 14],
}
# drum notes (GM): a pick on stone is claves over a low tom; far off it's the wood block alone
CLAVES, WOOD, LOTOM, BD, SHAKER = 75, 77, 41, 35, 70
CLAP, SNARE, TAMB, CRASH = 39, 38, 54, 49


def N(s):
    pc, i = NAMES[s[0]], 1
    while s[i] in '#b':
        pc += 1 if s[i] == '#' else -1
        i += 1
    return pc + 12 * (int(s[i:]) + 1)


class Chord:
    def __init__(self, nm):
        main, _, slash = nm.partition('/')
        root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
        self.name = nm
        self.root = (NAMES[root[0]] + (1 if '#' in root else -1 if 'b' in root else 0)) % 12
        self.iv = QUAL[main[len(root) :]]
        self.pcs = sorted({(self.root + i) % 12 for i in self.iv})
        if slash:
            self.bass = (NAMES[slash[0]] + (1 if '#' in slash else -1 if 'b' in slash else 0)) % 12
        else:
            self.bass = self.root

    def low(self, lo=28):
        return lo + (self.bass - lo) % 12

    def rootlow(self, lo=28):
        return lo + (self.root - lo) % 12

    def fifth(self):
        return (self.root + 7) % 12

    def tones(self, lo, hi):
        return [n for n in range(lo, hi + 1) if n % 12 in self.pcs]


def voicing(c, lo, hi, n):
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


class Song:
    def __init__(self, name, title, bpm, sections, seed, target_db, tempo=None):
        self.name, self.title, self.bpm, self.target_db = name, title, bpm, target_db
        self.rnd = random.Random(seed)
        self.ev, self.chans, self.LEVEL = {}, {}, {}
        self.sections = sections
        self.HARM, self.SEC = [], {}
        for key, _, names in sections:
            self.SEC[key] = len(self.HARM)
            for nm in names:
                h = [Chord(x) for x in nm.split('|')]
                self.HARM.append(h if len(h) == 2 else h * 2)
        self.NBARS = len(self.HARM)
        self.END = self.NBARS * 4
        self.TEMPO = tempo or [(0, bpm)]

    # ---- events ----
    def ch(self, tr):
        if tr not in self.chans:
            if tr == 'drums':
                c = 9
            else:
                c = len([k for k in self.chans if k != 'drums'])
                c = c + 1 if c >= 9 else c
            self.chans[tr] = c
            prog, vol, pan, rev, _ = PARTS[tr]
            self.LEVEL[tr] = 100
            self.ev[tr] = [
                (0, mido.Message('program_change', channel=c, program=prog)),
                (0, mido.Message('control_change', channel=c, control=7, value=vol)),
                (0, mido.Message('control_change', channel=c, control=10, value=pan)),
                (0, mido.Message('control_change', channel=c, control=11, value=100)),
                (0, mido.Message('control_change', channel=c, control=91, value=rev)),
                (0, mido.Message('control_change', channel=c, control=93, value=20)),
            ]
        return self.chans[tr]

    def cc(self, tr, beat, val, ctl=11):
        self.ev[tr].append(
            (
                int(beat * TPB),
                mido.Message(
                    'control_change', channel=self.ch(tr), control=ctl, value=max(0, min(127, int(val)))
                ),
            )
        )

    def dyn(self, tr, beat, val):
        self.ch(tr)
        self.LEVEL[tr] = val
        self.cc(tr, beat, val)

    def cresc(self, tr, b0, b1, v0, v1):
        self.ch(tr)
        steps = max(2, int((b1 - b0) * 4))
        for k in range(steps + 1):
            self.cc(tr, b0 + (b1 - b0) * k / steps, v0 + (v1 - v0) * k / steps)
        self.LEVEL[tr] = v1

    def note(self, tr, n, start, dur, vel, jitter=3, art=0.95):
        c = self.ch(tr)
        vel = max(1, min(127, int(vel + self.rnd.randint(-jitter, jitter))))
        s = int(start * TPB)
        e = min(int((start + dur * art) * TPB), self.END * TPB - 8)
        if s >= self.END * TPB - 8:
            return
        self.ev[tr].append((s, mido.Message('note_on', channel=c, note=int(n), velocity=vel)))
        self.ev[tr].append((max(s + 10, e), mido.Message('note_off', channel=c, note=int(n), velocity=0)))

    def drum(self, n, start, vel, dur=0.2):
        self.note('drums', n, start, dur, vel, jitter=5, art=1)

    def line(self, tr, bar, s, vel, shift=0, art=0.95, swell=0):
        """'B4:1.5 A4:.5 r:2' from the start of a bar; long notes bloom by `swell`."""
        t = bar * 4
        for tok in s.split():
            nm, d = tok.split(':')
            d = float(Fraction(d))  # '1.5', '.5' or '2/3' (a triplet's long note)
            if nm != 'r':
                self.note(
                    tr,
                    N(nm) + shift,
                    t,
                    d,
                    vel + (4 if d >= 2 else 0),
                    art=art if d >= 0.5 else min(art, 0.85),
                )
                if swell and d >= 1.5:
                    L = self.LEVEL[tr]
                    for k in range(9):
                        x = k / 8
                        self.cc(tr, t + d * x, L + swell * (x / 0.5 if x < 0.5 else 1 - (x - 0.5) * 1.3))
                    self.cc(tr, t + d, L)
            t += d

    def held(self, tr, bars, lo, hi, n, vel, halves=True):
        """The chords held, voiced in [lo, hi]."""
        for b in bars:
            for half in (0, 1) if halves else (0,):
                c = self.HARM[b][half]
                if half and c.name == self.HARM[b][0].name:
                    continue
                dur = 4 if c.name == self.HARM[b][1].name else 2
                for x in voicing(c, lo, hi, n):
                    self.note(tr, x, b * 4 + half * 2, dur, vel, jitter=2, art=1.0)

    def at(self, beat):
        b = int(beat // 4)
        return self.HARM[b % self.NBARS][1 if beat % 4 >= 2 else 0]

    # ---- output ----
    def seconds(self, beat):
        t, last, bpm = 0.0, 0.0, self.TEMPO[0][1]
        for b, v in sorted(self.TEMPO):
            if b >= beat:
                break
            t += (b - last) * 60 / bpm
            last, bpm = b, v
        return t + (beat - last) * 60 / bpm

    def save(self, path, tail=0):
        ORDER = {'program_change': 0, 'control_change': 0, 'note_off': 1, 'note_on': 2}
        mid = mido.MidiFile(ticks_per_beat=TPB)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=self.title))
        last = 0
        for beat, bpm in sorted(self.TEMPO):
            a = int(beat * TPB)
            tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=a - last))
            last = a
        for name, lst in self.ev.items():
            tr = mido.MidiTrack()
            mid.tracks.append(tr)
            tr.append(mido.MetaMessage('track_name', name=name))
            last = 0
            for a, msg in sorted(lst, key=lambda x: (max(0, x[0]), ORDER[x[1].type])):
                a = max(0, a)
                tr.append(msg.copy(time=a - last))
                last = a
            tr.append(mido.MetaMessage('end_of_track', time=max(0, int((self.END + tail) * TPB) - last)))
        mid.save(path)

    def level(self, out, sr):
        x = out / 32767
        x *= 10 ** ((self.target_db - 20 * np.log10(np.sqrt((x.mean(axis=1) ** 2).mean()))) / 20)
        blk = sr // 100
        n = len(x) // blk + 1
        pad = np.concatenate([x, x[: n * blk - len(x)]])
        peak = np.abs(pad).reshape(n, blk, -1).max(axis=(1, 2))
        g = np.minimum(1, CEIL / np.maximum(peak, 1e-6))
        g = np.minimum.reduce([np.roll(g, -k) for k in range(4)])
        for _ in range(2):
            for i in range(-60, 2 * n):
                g[i % n] = min(g[i % n], g[(i - 1) % n] + 0.004)
        g = np.convolve(np.concatenate([g[-5:], g, g[:5]]), np.ones(5) / 5, 'same')[5:-5]
        gs = np.repeat(g, blk)[: len(x)]
        x = np.clip(x * gs[:, None], -CEIL, CEIL)
        print('  levelled to %.1f dB RMS; limiter up to %.1f dB' % (self.target_db, -20 * np.log10(g.min())))
        return x * 32767

    def render(self, mp3, x3=False):
        tmp = tempfile.mkdtemp()
        mpath, raw, loop = (os.path.join(tmp, f) for f in ('t.mid', 'raw.wav', 'loop.wav'))
        self.save(mpath, TAIL_BEATS)
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
            a = (
                np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
                .reshape(-1, chn)
                .astype(np.float32)
            )
            if np.abs(a).max() < 32000:
                break
            gain *= 0.75
        L = int(round(self.seconds(self.END) * sr))
        out = a[:L].copy()
        tail = a[L:][:L]
        out[: len(tail)] += tail  # the reverb tail folded onto the start: a seamless loop
        out = self.level(out, sr)
        o = wave.open(loop, 'wb')
        o.setnchannels(out.shape[1])
        o.setsampwidth(2)
        o.setframerate(sr)
        o.writeframes(out.astype(np.int16).tobytes())
        o.close()
        ff = ['ffmpeg', '-y', '-loglevel', 'error']
        subprocess.run(ff + ['-i', loop, '-b:a', '128k', mp3], check=True)
        if x3:
            subprocess.run(
                ff + ['-stream_loop', '2', '-i', loop, '-b:a', '128k', mp3[:-4] + '_x3.mp3'], check=True
            )
        print('  %s: loop %.1f s, %d bars; synth gain %.2f' % (self.title, L / sr, self.NBARS, gain))
        return out, sr

    def check(self, a, sr):
        nmz = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
        nm = lambda n: '%s%d' % (nmz[n % 12], n // 12 - 1)
        for key, title, chords in self.sections:
            print(
                '  %5.1f s  bar %2d  %-10s %s'
                % (self.seconds(self.SEC[key] * 4), self.SEC[key], title, ' | '.join(chords))
            )
        for tr, lst in self.ev.items():
            ns = [m.note for _, m in lst if m.type == 'note_on']
            if not ns or tr == 'drums':
                continue
            lo, hi = PARTS[tr][4]
            flag = '' if lo <= min(ns) and max(ns) <= hi else '   <-- OUT OF RANGE'
            print('    %-6s %-4s - %-4s %4d notes%s' % (tr, nm(min(ns)), nm(max(ns)), len(ns), flag))
        m = a.mean(axis=1) / 32767
        rms = lambda seg: 20 * np.log10(max(1e-6, np.sqrt((seg**2).mean())))
        win = 8 * sr
        print(
            '  loudness per 8 s:', ' '.join('%.0f' % rms(m[i : i + win]) for i in range(0, len(m) - sr, win))
        )
        print('  seam: last 1 s %.1f dB, first 1 s %.1f dB' % (rms(m[-sr:]), rms(m[:sr])))


# ── 1. Pick and Lantern: the work song ──────────────────────────────────────
# The Corvanthe theme (tools/music/corvanthe.py THEME), the men's chorus in B and D
THEME_D = [
    'D4:1 F4:1 A4:2',
    'Bb4:1.5 G4:.5 Eb4:2',
    'D4:1 F4:1 A4:1 D5:1',
    'C5:1.5 Bb4:.5 A4:2',
    'D5:1.5 C5:.5 Bb4:2',
    'G4:1 Bb4:1 D5:2',
    'Eb5:1.5 D5:.5 Bb4:1 G4:1',
    'C#5:2 A4:2',
]
THEME_CH = ['Dm', 'Eb', 'Dm', 'C|A', 'Bb', 'Gm', 'Eb', 'A']


def work():
    s = Song(
        'work',
        'Pick and Lantern',
        96,
        [
            ('A', 'Muster', ['Dm', 'Dm', 'C', 'Dm', 'Dm', 'Bb', 'C', 'Dm']),
            ('B', 'Chorus', THEME_CH),
            ('C', 'Answer', ['F', 'C', 'Dm', 'A', 'Bb', 'F', 'Gm', 'A']),
            ('D', 'All Hands', THEME_CH),
        ],
        seed=4471,
        target_db=-20.0,
    )
    A, B, C, D = (s.SEC[k] for k in 'ABCD')
    # the picks: on 1 and 3 all the way, a lighter tap on the & of 4 from the chorus on
    for b in range(s.NBARS):
        loud = 8 if b >= D else 0
        for beat in (0, 2):
            s.drum(CLAVES, b * 4 + beat, 66 + loud)
            s.drum(LOTOM, b * 4 + beat, 58 + loud)
        if b >= B:
            s.drum(WOOD, b * 4 + 3.5, 44)
        if b >= C:
            s.drum(SHAKER, b * 4 + 1, 30)
            s.drum(SHAKER, b * 4 + 3, 30)
        if b >= B and b % 2 == 1:
            s.note('anvil', 79, b * 4 + 3, 0.3, 52 + loud, art=0.8)
    # the tuba ostinato: heave on 1, the fifth on the & of 2, the root on 3, a pick-up on 4
    s.dyn('tuba', 0, 86)
    for b in range(s.NBARS):
        for half in (0, 1):
            c = s.HARM[b][half]
            r = c.rootlow(31)
            f = r + 7 if r + 7 <= 50 else r - 5
            if half == 0:
                s.note('tuba', r, b * 4, 1.4, 70, art=0.8)
                s.note('tuba', f, b * 4 + 1.5, 0.5, 58, art=0.7)
            else:
                s.note('tuba', r, b * 4 + 2, 1, 66, art=0.8)
                s.note('tuba', r, b * 4 + 3, 0.5, 56, art=0.7)
                s.note('tuba', f, b * 4 + 3.5, 0.5, 54, art=0.7)
    # low strings hold the chords from bar 2, louder later
    s.dyn('strs', 0, 66)
    s.held('strs', range(2, s.NBARS), 50, 67, 3, 46)
    s.cresc('strs', D * 4 - 8, D * 4, 60, 76)
    # A Muster: the bassoon's tune
    s.dyn('bsn', 0, 88)
    for bar, ln in (
        (A + 2, 'D4:1 D4:.5 E4:.5 F4:1 D4:1'),
        (A + 3, 'C4:1 A3:1 C4:1.5 r:.5'),
        (A + 4, 'D4:1 F4:.5 G4:.5 A4:1 G4:.5 F4:.5'),
        (A + 5, 'F4:1 D4:1 Bb3:1.5 r:.5'),
        (A + 6, 'C4:1 E4:1 G4:1 E4:1'),
        (A + 7, 'D4:3 r:1'),
    ):
        s.line('bsn', bar, ln, 72, art=0.85)
        s.line('bsn', bar, ln, 56, shift=-12, art=0.85) if bar >= A + 4 else None
    # B Chorus: the men sing the theme, an octave down, trombones with them
    s.dyn('choir', B * 4, 86)
    s.dyn('tbn', B * 4, 74)
    for k, ln in enumerate(THEME_D):
        s.line('choir', B + k, ln, 70, shift=-12, swell=6)
        s.line('tbn', B + k, ln, 60, shift=-12, art=0.9)
    # C Answer: horn calls, the bassoons answer, pizzicato walking under
    s.dyn('horn', C * 4, 84)
    calls = [
        ('F4:.5 A4:.5 C5:1 r:2', 'r:2 C4:.5 A3:.5 F3:1'),
        ('E4:.5 G4:.5 C5:1 r:2', 'r:2 G3:.5 E3:.5 C3:1'),
        ('D4:.5 F4:.5 A4:.5 D5:.5 r:2', 'r:2 A3:.5 F3:.5 D3:1'),
        ('C#4:1 E4:1 A4:2', 'r:2 E3:1 A2:1'),
        ('D4:.5 F4:.5 Bb4:1 r:2', 'r:2 F3:.5 D3:.5 Bb2:1'),
        ('C4:.5 F4:.5 A4:1 r:2', 'r:2 C4:.5 A3:.5 F3:1'),
        ('Bb3:.5 D4:.5 G4:1 r:2', 'r:2 D4:.5 Bb3:.5 G3:1'),
        ('A3:1 C#4:1 E4:1.5 r:.5', 'A2:2 C#3:1 E3:1'),
    ]
    for k, (h, bs) in enumerate(calls):
        s.line('horn', C + k, h, 74, art=0.88)
        s.line('bsn', C + k, bs, 70, art=0.82)
    s.dyn('horn2', C * 4 + 28, 76)
    s.line('horn2', C + 7, 'E3:1 A3:1 C#4:1.5 r:.5', 66)
    s.dyn('pizz', C * 4, 78)
    for b in range(C, s.NBARS):
        c = s.HARM[b][0]
        ts = c.tones(c.rootlow(43), c.rootlow(43) + 14)
        for k, t in enumerate((0, 1, 2, 3)):
            c2 = s.HARM[b][1 if t >= 2 else 0]
            ts2 = c2.tones(c2.rootlow(43), c2.rootlow(43) + 14)
            s.note('pizz', ts2[[0, 2, 1, 2][k] % len(ts2)], b * 4 + t, 0.5, 60, art=0.5)
    # D All Hands: the theme on horns at pitch, the men under them, trombones, a counter-line on bassoon
    s.dyn('horn', D * 4, 86)
    s.dyn('horn2', D * 4, 76)
    s.dyn('choir', D * 4, 88)
    s.dyn('tbn', D * 4, 80)
    s.dyn('tuba', D * 4, 90)
    for k, ln in enumerate(THEME_D):
        s.line('horn', D + k, ln, 80, swell=6)
        s.line('choir', D + k, ln, 74, shift=-12, swell=6)
        s.line('tbn', D + k, ln, 66, shift=-12, art=0.9)
    s.held('horn2', range(D, s.NBARS), 53, 64, 2, 60)
    for k, ln in enumerate(
        [
            'A3:2 C4:2',
            'G3:2 Bb3:2',
            'F3:2 A3:2',
            'E3:2 C#3:2',
            'F3:2 D3:2',
            'D3:2 G3:2',
            'G3:2 Eb3:2',
            'E3:2 C#3:2',
        ]
    ):
        s.line('bsn', D + k, ln, 64)
    # the last bar thins toward the quiet start
    for tr in ('horn', 'horn2', 'choir', 'tbn', 'strs', 'tuba'):
        s.cresc(tr, s.END - 4, s.END - 0.1, s.LEVEL[tr], s.LEVEL[tr] - 22)
    return s


# ── 2. Lamplight in the Deep: the quiet one ─────────────────────────────────
def deep():
    s = Song(
        'deep',
        'Lamplight in the Deep',
        66,
        [
            ('A', 'Drips', ['Am', 'Am', 'Fmaj7/A', 'Am', 'Dm/A', 'Am', 'Fmaj7', 'Esus4|E']),
            ('B', 'Hum', ['Am', 'G', 'F', 'E', 'Am', 'Dm', 'F', 'E']),
            ('C', 'Vein', ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm7', 'G']),
            ('D', 'Return', ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'Esus4|E']),
        ],
        seed=9026,
        target_db=-22.5,
    )
    A, B, C, D = (s.SEC[k] for k in 'ABCD')
    rnd = s.rnd
    # the drone: slow strings low, a warm pad, the bass on the roots
    for tr, v in (('slow', 66), ('pad', 58), ('cb', 70)):
        s.dyn(tr, 0, v)
    s.held('slow', range(s.NBARS), 45, 64, 3, 44)
    for b in range(s.NBARS):
        for half in (0, 1):
            c = s.HARM[b][half]
            if half and c.name == s.HARM[b][0].name:
                continue
            dur = 4 if c.name == s.HARM[b][1].name else 2
            s.note('cb', c.low(28), b * 4 + half * 2, dur, 50, jitter=2, art=1.0)
        drone = [N('A2'), N('E3')] if not (C <= b < D) else [N('C3'), N('G3')]
        for n in drone:
            s.note('pad', n, b * 4, 4, 46, jitter=1, art=1.0)
    # drips: kalimba and celesta, a few a bar, from the chord, high and far apart
    s.dyn('kal', 0, 80)
    s.dyn('cel', 0, 70)
    for b in range(s.NBARS):
        n = 2 if b < C or b >= D else 1
        for k in range(n):
            t = b * 4 + rnd.choice([0.5, 1, 1.75, 2.5, 3, 3.25]) + k * 0.1
            c = s.at(t)
            s.note('kal', rnd.choice(c.tones(74, 91)), t, 1.5, 46 - 4 * k, jitter=8)
        if rnd.random() < 0.35:
            t = b * 4 + rnd.choice([1.5, 3.5])
            s.note('cel', rnd.choice(s.at(t).tones(84, 98)), t, 1, 34, jitter=6)
    # a miner far off: two or three strokes now and then
    for b in range(0, s.NBARS, 2):
        if b in (C + 2, C + 4):
            continue
        t0 = b * 4 + rnd.choice([0, 1, 2])
        for k in range(rnd.choice([2, 3, 3])):
            s.drum(WOOD, t0 + k * 0.75, 30 - 3 * k)
            s.drum(LOTOM, t0 + k * 0.75, 22)
    # A: a horn far away, the first breath of a tune on the bassoon
    s.dyn('horn', 0, 54)
    s.line('horn', A + 5, 'E3:1 A3:3', 40, swell=8)
    s.dyn('bsn', 0, 72)
    s.line('bsn', A + 6, 'C3:1 B2:1 A2:2', 48, swell=6)
    s.line('bsn', A + 7, 'B2:3 r:1', 44)
    # B Hum: the cor anglais over the men humming
    s.dyn('hum', B * 4, 40)
    s.cresc('hum', B * 4, B * 4 + 16, 40, 82)
    s.held('hum', range(B, C), 48, 62, 3, 52)
    s.cresc('hum', C * 4 - 4, C * 4, 82, 30)
    s.dyn('cor', B * 4, 86)
    for k, ln in enumerate(
        [
            'E4:1.5 A4:.5 C5:1 B4:1',
            'D5:2 B4:1 G4:1',
            'A4:1.5 G4:.5 F4:1 A4:1',
            'G#4:3 r:1',
            'A4:1 C5:1 E5:1.5 D5:.5',
            'F5:2 D5:1 A4:1',
            'C5:1.5 B4:.5 A4:1 F4:1',
            'E4:3 r:1',
        ]
    ):
        s.line('cor', B + k, ln, 64, swell=8)
    # C Vein: a seam of light, C major; clarinet, the harp rolling, more celesta
    s.dyn('clar', C * 4, 84)
    for k, ln in enumerate(
        [
            'E5:1.5 D5:.5 C5:1 G4:1',
            'D5:2 B4:2',
            'C5:1 E5:1 A5:1.5 G5:.5',
            'G5:3 r:1',
            'F5:1.5 E5:.5 C5:1 A4:1',
            'G4:1 C5:1 E5:2',
            'F5:1 E5:1 D5:1 C5:1',
            'D5:2 B4:1 G4:1',
        ]
    ):
        s.line('clar', C + k, ln, 62, swell=6)
    s.dyn('harp', C * 4, 84)
    for b in range(C, D):
        for half in (0, 1):
            c = s.HARM[b][half]
            ts = c.tones(c.low(43), c.low(43) + 28)[:5]
            pat = (ts + ts[-2:0:-1])[half * 4 : half * 4 + 4]
            for k, n in enumerate(pat):
                s.note('harp', n, b * 4 + half * 2 + k * 0.5, 1.5, 54 if k == 0 else 42, art=1.0)
    for b in range(C, D):
        t = b * 4 + 2.5
        s.note('cel', rnd.choice(s.at(t).tones(79, 91)), t, 1, 40)
    # D Return: the cello's tune, the hum once more, softly
    s.dyn('cello', D * 4, 82)
    for k, ln in enumerate(
        [
            'A3:1.5 C4:.5 E4:2',
            'F4:1.5 E4:.5 C4:2',
            'E4:1 G4:1 C4:1.5 D4:.5',
            'D4:3 r:1',
            'C4:1 B3:1 A3:1 E4:1',
            'F4:2 E4:1 C4:1',
            'D4:2 F4:1 E4:1',
            'B3:2 G#3:1.5 r:.5',
        ]
    ):
        s.line('cello', D + k, ln, 64, swell=8)
    s.dyn('hum', D * 4 + 8, 34)
    s.held('hum', range(D + 2, D + 7), 52, 64, 2, 44)
    for tr in ('slow', 'pad', 'cb'):
        s.cresc(tr, s.END - 4, s.END - 0.1, s.LEVEL[tr], s.LEVEL[tr] - 6)
    return s


# ── 3. Halls of the Stoneheart: the grand one ───────────────────────────────
THEME_C = [
    'C4:1 Eb4:1 G4:2',
    'Ab4:1.5 F4:.5 Db4:2',
    'C4:1 Eb4:1 G4:1 C5:1',
    'Bb4:1.5 Ab4:.5 G4:2',
    'C5:1.5 Bb4:.5 Ab4:2',
    'F4:1 Ab4:1 C5:2',
    'Db5:1.5 C5:.5 Ab4:1 F4:1',
    'B4:2 G4:2',
]
THEME_CH_C = ['Cm', 'Db', 'Cm', 'Bb|G', 'Ab', 'Fm', 'Db', 'G']


def halls():
    s = Song(
        'halls',
        'Halls of the Stoneheart',
        80,
        [
            ('A', 'Gate', THEME_CH_C),
            ('B', 'Hall', ['Eb', 'Bb/D', 'Cm', 'Ab', 'Eb/G', 'Ab', 'F', 'Bb']),
            ('C', 'Deep', ['Ab', 'Ab', 'Fm', 'Fm', 'Db', 'Db', 'G', 'G']),
            ('D', 'Grand', THEME_CH_C),
        ],
        seed=1312,
        target_db=-20.0,
        tempo=[(0, 80), (32 * 4 - 4, 77)],
    )
    A, B, C, D = (s.SEC[k] for k in 'ABCD')
    HIT = (0, 1.5, 3)  # the forge rhythm, 3+3+2
    # cellos and basses on the forge rhythm (not in the Deep)
    s.dyn('cello', 0, 74)
    s.dyn('cb', 0, 80)
    for b in range(s.NBARS):
        if C <= b < D:
            continue
        for h in HIT:
            c = s.at(b * 4 + h)
            r = c.rootlow(36)
            s.note('cello', r, b * 4 + h, 1, 70 if h == 0 else 58, art=0.7)
            s.note('cb', c.rootlow(28), b * 4 + h, 1, 66 if h == 0 else 54, art=0.7)
    s.cresc('cello', D * 4 - 8, D * 4, 74, 100)
    s.cresc('cb', D * 4 - 8, D * 4, 80, 104)
    # the march: a bass drum on 1, timpani on the roots, the anvil on 4 at the gate and the grand
    s.dyn('timp', 0, 86)
    for b in range(s.NBARS):
        if C <= b < D:
            continue
        loud = 16 if b >= D else 0
        s.drum(BD, b * 4, 58 + loud)
        c = s.HARM[b][0]
        tn = c.rootlow(38)
        tn = tn - 12 if tn > 50 else tn
        s.note('timp', tn, b * 4, 0.5, 62 + loud, art=0.9)
        if b < B or b >= D:
            s.note('anvil', 79, b * 4 + 3, 0.3, 50 + loud, art=0.8)
        if b >= D:
            s.note('timp', tn, b * 4 + 1.5, 0.5, 66, art=0.9)
            s.note('timp', tn, b * 4 + 3, 0.5, 60, art=0.9)
    # A Gate: the theme low on trombones over a tuba, quiet, the strings held behind
    s.dyn('tbn', 0, 72)
    s.dyn('tuba', 0, 78)
    for k, ln in enumerate(THEME_C):
        s.line('tbn', A + k, ln, 60, shift=-12, swell=6)
    for b in range(s.NBARS):
        for half in (0, 1):
            c = s.HARM[b][half]
            if half and c.name == s.HARM[b][0].name:
                continue
            dur = 4 if c.name == s.HARM[b][1].name else 2
            s.note('tuba', c.low(31), b * 4 + half * 2, dur, 56 if b < D else 70, art=0.95)
    s.dyn('slow', 0, 60)
    s.held('slow', range(A, B), 48, 63, 3, 40)
    # B Hall: E-flat major, the horns' tune, strings warm under it, a trumpet answer at the end
    s.dyn('horn', B * 4, 88)
    s.dyn('horn2', B * 4, 78)
    for k, ln in enumerate(
        [
            'Bb3:1 Eb4:1 G4:2',
            'F4:1.5 Eb4:.5 D4:2',
            'Eb4:1 G4:1 C5:1.5 Bb4:.5',
            'Ab4:3 r:1',
            'G4:1 Bb4:1 Eb5:2',
            'C5:1.5 Bb4:.5 Ab4:1 C5:1',
            'A4:1 C5:1 F4:1.5 A4:.5',
            'Bb4:3 r:1',
        ]
    ):
        s.line('horn', B + k, ln, 72, swell=8)
    s.held('horn2', range(B, C), 51, 62, 2, 54)
    s.dyn('strs', B * 4, 70)
    s.held('strs', range(B, C), 55, 74, 4, 46)
    s.dyn('tpt', B * 4 + 24, 72)
    s.line('tpt', B + 7, 'r:1 F4:.5 Bb4:.5 D5:2', 60)
    # C Deep: the choir alone over tremolo strings, a timpani roll into the grand
    s.dyn('choir', C * 4, 70)
    s.cresc('choir', C * 4, D * 4, 70, 100)
    s.held('choir', range(C, D), 48, 62, 3, 54)
    for k, ln in enumerate(
        [
            'Eb4:2 C4:2',
            'Ab4:4',
            'F4:2 Ab4:1 G4:1',
            'F4:4',
            'F4:2 Ab4:2',
            'Db5:2 C5:1 Ab4:1',
            'B4:4',
            'D5:2 B4:2',
        ]
    ):
        s.line('choir', C + k, ln, 62, swell=6)
    s.dyn('trem', C * 4, 40)
    s.cresc('trem', C * 4, D * 4, 40, 100)
    s.held('trem', range(C, D), 43, 67, 4, 58)
    for t in np.arange(C * 4 + 24, D * 4 - 0.5, 0.125):
        x = (t - (C * 4 + 24)) / 7.5
        s.note('timp', N('G2'), t, 0.125, 28 + 70 * x * x, jitter=4, art=1.0)
    s.note('timp', N('G2'), D * 4 - 0.5, 0.5, 98)
    # D Grand: the theme tutti; horns at pitch, trumpets above, the choir and trombones an octave down
    for tr, v in (
        ('horn', 100),
        ('horn2', 92),
        ('tpt', 84),
        ('choir', 100),
        ('tbn', 96),
        ('strs', 92),
        ('tuba', 100),
    ):
        s.dyn(tr, D * 4, v)
    for k, ln in enumerate(THEME_C):
        s.line('horn', D + k, ln, 82, swell=6)
        s.line('tpt', D + k, ln, 62, art=0.9)
        s.line('choir', D + k, ln, 76, shift=-12, swell=4)
        s.line('tbn', D + k, ln, 70, shift=-12, art=0.92)
    s.held('horn2', range(D, s.NBARS), 50, 62, 2, 64)
    s.held('strs', range(D, s.NBARS), 60, 84, 4, 62)
    # the last bar falls away to the quiet gate
    for tr in ('horn', 'horn2', 'tpt', 'choir', 'tbn', 'strs', 'tuba', 'cello', 'cb'):
        s.cresc(tr, s.END - 3, s.END - 0.1, s.LEVEL[tr], s.LEVEL[tr] - 26)
    for tr, v in (('tbn', 72), ('tuba', 78), ('cello', 74), ('cb', 80), ('choir', 70)):
        s.dyn(tr, 0, v)
    return s


# ── 4. Hammer and Hold: a cheerful work song the dwarves sing ───────────────
# Original (no Corvanthe theme). G major, 116 bpm; the picks land on 2 and 4 like a backbeat.
def hammer():
    s = Song(
        'hammer',
        'Hammer and Hold',
        116,
        [
            ('A', 'Strike Up', ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G']),
            ('B', 'Verse', ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am', 'D']),
            ('C', 'Chorus', ['C', 'G', 'D', 'G', 'C', 'G', 'Am|D', 'G']),
            ('D', 'Chorus Again', ['C', 'G', 'D', 'G', 'C', 'G', 'Am|D', 'D7']),
        ],
        seed=2207,
        target_db=-19.5,
    )
    A, B, C, D = (s.SEC[k] for k in 'ABCD')
    for b in range(s.NBARS):
        big = 10 if b >= C else 0
        s.drum(BD, b * 4, 62 + big)
        s.drum(BD, b * 4 + 2, 56 + big)
        for beat in (1, 3):  # the picks: the backbeat
            s.drum(CLAVES, b * 4 + beat, 72 + big)
            s.drum(LOTOM, b * 4 + beat, 54 + big)
        if b >= C:
            s.drum(CLAP, b * 4 + 1, 58)
            s.drum(CLAP, b * 4 + 3, 62)
            s.note('anvil', 79, b * 4 + 3.5, 0.3, 54, art=0.8)
        if b >= B:
            for k in range(8):
                s.drum(SHAKER, b * 4 + k * 0.5, 34 if k % 2 else 24)
        if b in (C - 1, s.NBARS - 1):  # a fill into the chorus and back to the top
            for k in range(4):
                s.drum(SNARE, b * 4 + 3 + k * 0.25, 50 + k * 8)
    # tuba oom-pah: root on 1, fifth on 3; pizzicato chords on the offbeats
    s.dyn('tuba', 0, 90)
    s.dyn('pizz', 0, 80)
    for b in range(s.NBARS):
        for half in (0, 1):
            c = s.HARM[b][half]
            r = c.rootlow(31)
            s.note(
                'tuba',
                r if half == 0 else (r + 7 if r + 7 <= 50 else r - 5),
                b * 4 + half * 2,
                1,
                70,
                art=0.7,
            )
            for k in (0.5, 1.5):
                for x in voicing(c, 55, 67, 3):
                    s.note('pizz', x, b * 4 + half * 2 + k, 0.4, 50, jitter=2, art=0.5)
    # A Strike Up: the horn plays the tune
    TUNE = [
        'D4:.5 G4:.5 G4:.5 A4:.5 B4:1 G4:1',
        'C5:.5 B4:.5 A4:.5 G4:.5 E4:1 G4:1',
        'B4:.5 A4:.5 G4:.5 B4:.5 D5:1 B4:1',
        'A4:1.5 G4:.5 F#4:2',
        'D4:.5 G4:.5 G4:.5 A4:.5 B4:1 G4:1',
        'E5:.5 D5:.5 C5:.5 B4:.5 A4:1 C5:1',
        'B4:.5 A4:.5 G4:.5 F#4:.5 A4:1 F#4:1',
        'G4:2 r:2',
    ]
    s.dyn('horn', 0, 86)
    s.dyn('bsn', 0, 80)
    for k, ln in enumerate(TUNE):
        s.line('horn', A + k, ln, 72, art=0.85)
        if k >= 4:
            s.line('bsn', A + k, ln, 58, shift=-12, art=0.8)
    # B Verse: the dwarves sing, the trombones answer at the ends of the lines
    VERSE = [
        'G4:1 G4:.5 G4:.5 B4:1 G4:1',
        'E4:1 G4:.5 E4:.5 B3:2',
        'C5:1 B4:.5 A4:.5 G4:1 E4:1',
        'D4:1.5 E4:.5 F#4:1 r:1',
        'G4:1 G4:.5 A4:.5 B4:1 D5:1',
        'E5:1 D5:.5 B4:.5 G4:2',
        'A4:1 C5:.5 B4:.5 A4:1 F#4:1',
        'D4:2 r:1 D4:.5 D4:.5',
    ]
    s.dyn('choir', B * 4, 90)
    s.dyn('tbn', B * 4, 82)
    for k, ln in enumerate(VERSE):
        s.line('choir', B + k, ln, 74, shift=-12, art=0.9)
    s.line('tbn', B + 3, 'r:3 D3:.25 E3:.25 F#3:.5', 70, art=0.8)
    s.line('tbn', B + 1, 'r:3 B2:.5 D3:.5', 64, art=0.8)
    s.line('tbn', B + 5, 'r:3 B2:.5 D3:.5', 64, art=0.8)
    s.dyn('strs', B * 4, 64)
    s.held('strs', range(B, s.NBARS), 50, 67, 3, 42)
    # C Chorus: the dwarves in two parts, the horns with the tune
    MEL = [
        'G4:1 E4:1 G4:1 C5:1',
        'B4:1.5 A4:.5 G4:2',
        'A4:1 F#4:1 A4:1 D5:1',
        'B4:2 G4:2',
        'C5:1 C5:.5 C5:.5 E5:1 C5:1',
        'D5:1 B4:.5 B4:.5 G4:2',
        'C5:1 A4:1 D5:1 C5:1',
        'B4:3 r:1',
    ]
    HAR = [
        'E4:1 C4:1 E4:1 G4:1',
        'G4:1.5 F#4:.5 D4:2',
        'F#4:1 D4:1 F#4:1 A4:1',
        'G4:2 D4:2',
        'G4:1 G4:.5 G4:.5 C5:1 G4:1',
        'B4:1 G4:.5 G4:.5 D4:2',
        'A4:1 E4:1 F#4:1 A4:1',
        'G4:3 r:1',
    ]
    s.dyn('choir', C * 4, 100)
    s.dyn('choir2', C * 4, 88)
    s.dyn('horn2', C * 4, 76)
    for sec in (C, D):
        mel, har = MEL[:], HAR[:]
        if sec == D:
            mel[7], har[7] = 'A4:1 F#4:1 D4:1 r:1', 'F#4:1 D4:1 C4:1 r:1'
        for k in range(8):
            s.line('choir', sec + k, mel[k], 78, shift=-12, art=0.92)
            s.line('choir2', sec + k, har[k], 68, shift=-12, art=0.92)
            s.line('horn', sec + k, mel[k], 70 if sec == C else 76, art=0.88)
            s.line('horn2', sec + k, har[k], 60, art=0.88)
    # D: a trumpet descant over the second chorus
    s.dyn('tpt', D * 4, 74)
    for k, ln in enumerate(
        [
            'E5:2 G5:2',
            'D5:2 B4:2',
            'F#5:2 A5:2',
            'G5:4',
            'G5:2 E5:2',
            'D5:2 G5:2',
            'E5:2 F#5:2',
            'A5:2 F#5:1 r:1',
        ]
    ):
        s.line('tpt', D + k, ln, 58, swell=6)
    for tr in ('choir', 'choir2', 'horn', 'horn2', 'tpt', 'strs'):
        s.cresc(tr, s.END - 2, s.END - 0.1, s.LEVEL[tr], s.LEVEL[tr] - 14)
    return s


# ── 5. The Deep Seam Jig: a quick 12/8 dance down the shaft ─────────────────
# Original. A minor, 112 dotted-quarter beats a minute (a bar is 4 beats of three triplet quavers).
def jig():
    s = Song(
        'jig',
        'The Deep Seam Jig',
        112,
        [
            ('A', 'Tune', ['Am', 'G', 'Am', 'Em', 'Am', 'G', 'F', 'E']),
            ('B', 'Tune and Shouts', ['Am', 'G', 'Am', 'Em', 'Am', 'G', 'F', 'E']),
            ('C', 'The Turn', ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'E']),
            ('D', 'All Sing', ['Am', 'G', 'Am', 'Em', 'Am', 'G', 'F', 'E']),
        ],
        seed=6118,
        target_db=-19.5,
    )
    A, B, C, D = (s.SEC[k] for k in 'ABCD')
    T, Q = 1 / 3, 2 / 3
    for b in range(s.NBARS):
        big = 8 if b >= D else 0
        for beat in (0, 2):  # the picks on the strong beats
            s.drum(CLAVES, b * 4 + beat, 72 + big)
            s.drum(LOTOM, b * 4 + beat, 58 + big)
        s.drum(BD, b * 4, 58 + big)
        for beat in range(4):  # the tambourine on every triplet, the first one leaning
            for k in range(3):
                if b >= B or k == 0:
                    s.drum(TAMB, b * 4 + beat + k * T, (44 if k == 0 else 26) + big)
        s.note('anvil', 79, b * 4 + 3 + Q, 0.25, 46 + big, art=0.8)
    # tuba root and fifth, pizzicato "um-cha" on the off-triplets
    s.dyn('tuba', 0, 88)
    s.dyn('pizz', 0, 78)
    for b in range(s.NBARS):
        c = s.HARM[b][0]
        r = c.rootlow(31)
        f = r + 7 if r + 7 <= 50 else r - 5
        for beat, n in ((0, r), (1, f), (2, r), (3, f)):
            s.note('tuba', n, b * 4 + beat, Q, 66 if beat % 2 == 0 else 56, art=0.7)
            for x in voicing(c, 55, 67, 3):
                s.note('pizz', x, b * 4 + beat + Q, T, 46, jitter=2, art=0.6)
    TUNE = [
        'A4:2/3 C5:1/3 E5:2/3 C5:1/3 A4:2/3 C5:1/3 E5:2/3 A5:1/3',
        'G5:2/3 E5:1/3 D5:2/3 B4:1/3 G4:2/3 B4:1/3 D5:2/3 B4:1/3',
        'A4:2/3 C5:1/3 E5:2/3 C5:1/3 A4:2/3 B4:1/3 C5:2/3 D5:1/3',
        'E5:1 D5:2/3 B4:1/3 G4:2/3 E4:1/3 B4:1',
        'A4:2/3 C5:1/3 E5:2/3 A5:1/3 G5:2/3 E5:1/3 D5:2/3 C5:1/3',
        'B4:2/3 D5:1/3 G5:2/3 D5:1/3 B4:2/3 A4:1/3 G4:2/3 B4:1/3',
        'A4:2/3 C5:1/3 F5:2/3 E5:1/3 D5:2/3 C5:1/3 A4:2/3 C5:1/3',
        'B4:1 G#4:2/3 E4:1/3 B4:1 r:1',
    ]
    # A Tune: flute and bassoon an octave apart
    s.dyn('flute', 0, 86)
    s.dyn('bsn', 0, 82)
    for k, ln in enumerate(TUNE):
        s.line('flute', A + k, ln, 70, art=0.8)
        s.line('bsn', A + k, ln, 62, shift=-12, art=0.8)
    # B: again, the horns under it in sixths, and the dwarves shout "Hey!" at the top of every other bar
    s.dyn('horn', B * 4, 74)
    s.dyn('choir', B * 4, 100)
    for k, ln in enumerate(TUNE):
        s.line('flute', B + k, ln, 72, art=0.8)
        s.line('bsn', B + k, ln, 62, shift=-12, art=0.8)
    for k in range(8):
        c = s.HARM[B + k][0]
        s.held('horn', [B + k], 53, 64, 2, 54, halves=False)
        if k % 2 == 1:
            for x in voicing(c, 50, 62, 3):
                s.note('choir', x, (B + k) * 4 + 3, 0.3, 92, jitter=2, art=0.9)
    # C The Turn: C major, the horn leads, the dwarves hum chords under it
    TURN = [
        'E5:2/3 D5:1/3 C5:2/3 G4:1/3 E4:2/3 G4:1/3 C5:1',
        'D5:2/3 B4:1/3 G4:2/3 B4:1/3 D5:1 B4:1',
        'C5:2/3 B4:1/3 A4:2/3 E4:1/3 A4:2/3 B4:1/3 C5:2/3 E5:1/3',
        'B4:2 G4:1 r:1',
        'A4:2/3 C5:1/3 F5:2/3 C5:1/3 A4:2/3 F4:1/3 A4:2/3 C5:1/3',
        'G4:2/3 C5:1/3 E5:2/3 C5:1/3 G4:1 E4:1',
        'F4:2/3 A4:1/3 D5:2/3 A4:1/3 F5:2/3 E5:1/3 D5:2/3 C5:1/3',
        'B4:1 E5:1 G#4:1 E4:1',
    ]
    s.dyn('horn', C * 4, 88)
    s.dyn('hum', C * 4, 70)
    for k, ln in enumerate(TURN):
        s.line('horn', C + k, ln, 72, art=0.85)
        s.line('flute', C + k, ln, 50, shift=12, art=0.8) if k >= 4 else None
    s.held('hum', range(C, D), 50, 64, 3, 50)
    # D All Sing: the dwarves take the tune, low and in unison, flute and horn with them
    s.dyn('choir', D * 4, 100)
    s.dyn('choir2', D * 4, 90)
    s.dyn('horn', D * 4, 84)
    for k, ln in enumerate(TUNE):
        s.line('choir', D + k, ln, 80, shift=-12, art=0.85)
        s.line('choir2', D + k, ln, 66, shift=-24, art=0.85) if k % 4 != 3 else None
        s.line('flute', D + k, ln, 70, art=0.8)
        s.line('horn', D + k, ln, 64, shift=-12, art=0.8)
    for x in voicing(s.HARM[s.NBARS - 1][0], 50, 62, 3):
        s.note('choir', x, s.END - 1, 0.3, 96, jitter=2, art=0.9)  # a last "Hey!" into the top
    for tr in ('flute', 'bsn', 'horn', 'choir', 'choir2'):
        s.cresc(tr, s.END - 1.5, s.END - 0.1, s.LEVEL[tr], s.LEVEL[tr] - 10)
    return s


# ── 6. Ale at the Shift's End: a stomping drinking song ─────────────────────
# Original. B-flat major, 100 bpm: stamp on 1 and 3, clap on 2 and 4, a tankard clink on the & of 4.
def ale():
    s = Song(
        'ale',
        "Ale at the Shift's End",
        100,
        [
            ('A', 'Tankards', ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'Eb|F', 'Bb']),
            ('B', 'All Together', ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'Eb|F', 'Bb']),
            ('C', 'The Tale', ['Gm', 'Dm', 'Eb', 'Bb', 'Gm', 'Cm', 'Eb', 'F']),
            ('D', 'Last Round', ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'Eb', 'F7']),
        ],
        seed=8830,
        target_db=-19.5,
    )
    A, B, C, D = (s.SEC[k] for k in 'ABCD')
    for b in range(s.NBARS):
        tale = C <= b < D
        big = 10 if b >= D else 0
        s.drum(BD, b * 4, (48 if tale else 70) + big)
        s.drum(BD, b * 4 + 2, (42 if tale else 64) + big)
        if not tale:
            s.drum(LOTOM, b * 4, 50 + big)
            s.drum(LOTOM, b * 4 + 2, 46 + big)
            s.drum(CLAP, b * 4 + 1, 66 + big)
            s.drum(CLAP, b * 4 + 3, 70 + big)
            s.drum(CLAVES, b * 4 + 3.5, 50 + big)
        if b == D - 1:  # the room joins back in
            for k in range(8):
                s.drum(SNARE, b * 4 + 2 + k * 0.25, 40 + k * 6)
            s.drum(CRASH, D * 4, 70)
    s.drum(CRASH, B * 4, 60)
    # tuba on the roots, walking up into each change; strings and accordion-like held chords
    s.dyn('tuba', 0, 88)
    for b in range(s.NBARS):
        for half in (0, 1):
            c = s.HARM[b][half]
            r = c.rootlow(31)
            s.note('tuba', r, b * 4 + half * 2, 1, 70, art=0.75)
            s.note('tuba', r + 7 if r + 7 <= 50 else r - 5, b * 4 + half * 2 + 1, 1, 58, art=0.6)
    s.dyn('strs', 0, 58)
    s.held('strs', range(B, s.NBARS), 50, 67, 3, 44)
    MEL = [
        'F4:1 Bb4:1 Bb4:1 D5:1',
        'C5:1.5 Bb4:.5 A4:2',
        'G4:1 Bb4:1 D5:1 G5:1',
        'Eb5:1.5 D5:.5 Bb4:2',
        'F4:1 Bb4:1 D5:1 F5:1',
        'Eb5:1 D5:1 C5:2',
        'Bb4:1 G4:1 A4:1 C5:1',
        'Bb4:3 r:1',
    ]
    HAR = [
        'D4:1 F4:1 F4:1 Bb4:1',
        'A4:1.5 F4:.5 F4:2',
        'D4:1 G4:1 Bb4:1 D5:1',
        'G4:1.5 F4:.5 G4:2',
        'D4:1 F4:1 Bb4:1 D5:1',
        'C5:1 Bb4:1 A4:2',
        'G4:1 Eb4:1 F4:1 A4:1',
        'D4:3 r:1',
    ]
    # A Tankards: one dwarf starts the song, the others hum along
    s.dyn('choir', 0, 82)
    s.dyn('hum', 0, 52)
    for k, ln in enumerate(MEL):
        s.line('choir', A + k, ln, 70, shift=-12, art=0.92)
    s.held('hum', range(A + 4, B), 48, 60, 2, 46)
    # B All Together: in two parts, trombones and horns with them
    s.dyn('choir', B * 4, 100)
    s.dyn('choir2', B * 4, 90)
    s.dyn('tbn', B * 4, 80)
    s.dyn('horn', B * 4, 80)
    for sec in (B, D):
        for k in range(8):
            mel, har = MEL[k], HAR[k]
            if sec == D and k == 7:
                mel, har = 'A4:1 C5:1 Eb5:1 r:1', 'F4:1 A4:1 C5:1 r:1'
            s.line('choir', sec + k, mel, 80, shift=-12, art=0.92)
            s.line('choir2', sec + k, har, 70, shift=-12, art=0.92)
            s.line('horn', sec + k, mel, 66, art=0.9)
            s.line('tbn', sec + k, har, 64, shift=-12, art=0.9)
    # C The Tale: G minor, softer; the bassoon tells it over the dwarves' hum, a horn behind
    s.dyn('bsn', C * 4, 90)
    s.dyn('hum', C * 4, 72)
    s.dyn('horn', C * 4, 62)
    for k, ln in enumerate(
        [
            'D4:1 G4:1 Bb4:1.5 A4:.5',
            'A4:2 F4:1 D4:1',
            'Eb4:1 G4:1 Bb4:1 G4:1',
            'F4:3 r:1',
            'G4:1 Bb4:1 D5:1.5 C5:.5',
            'Eb5:2 C5:1 G4:1',
            'Bb4:1 G4:1 Eb4:1 G4:1',
            'A4:2 C5:1 r:1',
        ]
    ):
        s.line('bsn', C + k, ln, 70, swell=6)
    s.held('hum', range(C, D), 48, 62, 3, 52)
    s.held('horn', range(C + 4, D), 53, 62, 2, 46)
    s.cresc('hum', D * 4 - 4, D * 4, 72, 40)
    # D Last Round: the whole hall, with a trumpet over the top
    for tr, v in (('choir', 106), ('choir2', 96), ('tbn', 88), ('horn', 88), ('tuba', 96), ('strs', 72)):
        s.dyn(tr, D * 4, v)
    s.dyn('tpt', D * 4, 76)
    for k, ln in enumerate(
        ['D5:2 F5:2', 'F5:2 C5:2', 'D5:2 G5:2', 'G5:4', 'F5:2 D5:2', 'G5:2 F5:2', 'Eb5:2 G5:2', 'F5:3 r:1']
    ):
        s.line('tpt', D + k, ln, 60, swell=6)
    for tr in ('choir', 'choir2', 'tbn', 'horn', 'tpt', 'strs', 'tuba'):
        s.cresc(tr, s.END - 2, s.END - 0.1, s.LEVEL[tr], s.LEVEL[tr] - 18)
    for tr, v in (('choir', 82), ('tuba', 88)):
        s.dyn(tr, 0, v)
    return s


SONGS = {'work': work, 'deep': deep, 'halls': halls, 'hammer': hammer, 'jig': jig, 'ale': ale}

if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(SONGS)
    for n in names:
        s = SONGS[n]()
        print(n)
        s.save(os.path.join(OUTDIR, n + '.mid'))
        if '--midi' not in sys.argv:
            a, sr = s.render(os.path.join(OUTDIR, n + '.mp3'), '--x3' in sys.argv)
            if '--check' in sys.argv:
                s.check(a, sr)
