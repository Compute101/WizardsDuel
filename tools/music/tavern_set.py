# More tavern music for the Winks Table. The table plays a set of tunes one after another (shuffled), so
# no single one wears thin: Squop's jigs (tools/music/tavern.py) and the four here. Each is a whole piece
# with a proper ending and then a pause, so the next can start after it.
#   python3 tools/music/tavern_set.py            -> audio/tavern/<name>.mid / .mp3 for all four
#   python3 tools/music/tavern_set.py polka      -> just one
#
#   reel     The Squidger's Reel  D major, 4/4, crotchet 176   banjo, then fiddle and whistle; the quick one
#   waltz    Lantern Light        F major, 3/4, crotchet 126   accordion, then flute; oom-pah-pah, the gentle one
#   polka    Potted It!           B♭ major, 2/4, crotchet 112  clarinet, trombone, pub piano and tuba; bouncy
#   slipjig  The Fen Road         E Dorian, 9/8, crotchet 138  recorder, lute and harp, tabor; a minstrel's tune
#
# All background music: steady, warm, mixed quiet (about -24 dBFS RMS like the jigs), FluidSynth +
# FluidR3_GM like the rest of the game's music. Each ends on a held chord, lets the reverb ring out, fades
# and then holds `PAUSE` seconds of silence.
import os, subprocess, sys, tempfile, wave
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'audio', 'tavern')
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TPB = 480
TARGET_DB = -24.0
RING = 2.6            # seconds after the last note for the reverb to die away (faded over its last second)
PAUSE = 1.6           # seconds of silence after that, before the next tune

PCN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
PC = {n: i for i, n in enumerate(PCN)}
PC.update({'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10})


def pitch(nm):
    """'Bb4' -> 70"""
    return 12 * (int(nm[-1]) + 1) + PC[nm[:-1]]


def chord_pcs(ch):
    """'Bb', 'Em', 'F7', 'Am7' -> pitch classes, root first"""
    root = ch[:2] if len(ch) > 1 and ch[1] in '#b' else ch[:1]
    q = ch[len(root):]
    r = PC[root]
    third = 3 if q.startswith('m') else 4
    pcs = [r, (r + third) % 12, (r + 7) % 12]
    if q.endswith('7'):
        pcs.append((r + 10) % 12)
    return pcs


def voice(ch, lo):
    """Close voicing of a chord with every note in [lo, lo+12)"""
    return sorted(lo + ((p - lo) % 12) for p in chord_pcs(ch))


class Piece:
    def __init__(self, name, bpm, bar, num, den, parts):
        """bar: beats (crotchets) in a bar; parts: name -> (program, volume, pan, reverb[, chorus])"""
        self.name, self.bpm, self.bar, self.num, self.den = name, bpm, bar, num, den
        self.parts = parts
        self.ch = {}
        c = 0
        for p in parts:
            if c == 9:
                c += 1
            self.ch[p] = c; c += 1
        self.ch['drums'] = 9
        self.ev = {p: [] for p in list(parts) + ['drums']}
        self.end = 0

    def note(self, part, beat, p, dur, vel):
        if p is None:
            return
        c = self.ch[part]
        vel = max(1, min(127, int(vel)))
        self.ev[part].append((int(beat * TPB), mido.Message('note_on', channel=c, note=p, velocity=vel)))
        self.ev[part].append((int((beat + dur) * TPB) - 2, mido.Message('note_off', channel=c, note=p, velocity=0)))
        self.end = max(self.end, beat + dur)

    def melody(self, part, start, bars, vel, step=0.5, strong=(0,), harm=None, shift=0, legato=0.92):
        """Play tune bars [(chord, 'D5 F#5:2 - ...')] from `start`; each token unit is `step` beats.
        strong: unit positions in a bar to lean on. harm: (part, semitones below or 'third', vel drop)."""
        b = start
        for ch, tune in bars:
            q = 0
            for tok in tune.split():
                nm, _, d = tok.partition(':')
                d = int(d or 1)
                if nm != '-':
                    p = pitch(nm) + shift
                    acc = 10 if q in strong else 0
                    self.note(part, b + q * step, p, d * step * legato, vel + acc)
                    if harm:
                        hp, how, drop = harm
                        h = p - how if isinstance(how, int) else third_below(p, ch)
                        self.note(hp, b + q * step, h, d * step * legato, vel - drop + acc)
                q += d
            b += self.bar
        return b


def third_below(p, ch):
    """A chord tone below a melody note (a third or so), for a second voice that sits in the harmony"""
    pcs = chord_pcs(ch)
    for d in (3, 4, 5, 2):
        if (p - d) % 12 in pcs:
            return p - d
    return p - 3


# ── 1. The Squidger's Reel ────────────────────────────────────────────────────────────────────────────
REEL_A = [('D', 'A4 D5 F#5 D5 A4 D5 F#5 A5'), ('G', 'B5 A5 G5 F#5 E5 D5 B4 G4'),
          ('D', 'A4 D5 F#5 D5 A4 D5 F#5 D5'), ('A', 'E5 F#5 E5 C#5 A4 B4 C#5 E5'),
          ('D', 'A4 D5 F#5 D5 A4 D5 F#5 A5'), ('G', 'B5 G5 E5 G5 B5 A5 G5 F#5'),
          ('A', 'E5 A5 G5 E5 C#5 E5 A4 C#5'), ('D', 'D5:2 F#5 E5 D5:4')]
REEL_B = [('D', 'F#5 A5 D6 A5 F#5 A5 D6 A5'), ('G', 'B5 D6 B5 G5 D5 G5 B5 G5'),
          ('D', 'F#5 A5 F#5 D5 A4 D5 F#5 A5'), ('Em', 'G5 F#5 E5 D5 E5 F#5 G5 B5'),
          ('D', 'A5 F#5 D5 F#5 A5 D6 A5 F#5'), ('G', 'G5 B5 D6 B5 G5 E5 D5 B4'),
          ('A', 'C#5 E5 A5 G5 F#5 E5 D5 C#5'), ('D', 'D5:2 A4 F#4 D4:4')]
REEL_END = ('D', 'D5:2 A5 F#5 D6:4')


def reel():
    s = Piece('reel', 176, 4, 4, 4, {'banjo': (105, 88, 40, 40), 'fiddle': (110, 96, 60, 60),
                                    'whistle': (78, 80, 80, 60), 'guitar': (25, 70, 90, 45),
                                    'bass': (32, 92, 64, 30)})

    def back(start, bars, full):
        b = start
        for ch, _ in bars:
            pcs = chord_pcs(ch)
            root = 36 + ((pcs[0] - 0) % 12)
            root = root - 12 if root > 45 else root
            s.note('bass', b, root, 0.9, 86); s.note('bass', b + 2, root + 7, 0.9, 76)
            for q in (1, 3):                                         # boom-CHICK
                for k, p in enumerate(voice(ch, 55)):
                    s.note('guitar', b + q + k * 0.01, p, 0.45, 56)
            if full:
                for q in (1.5, 3.5):
                    for k, p in enumerate(voice(ch, 55)):
                        s.note('guitar', b + q + k * 0.01, p, 0.25, 38)
            for q, (dn, v) in {0: (41, 62), 1: (64, 30), 2: (41, 50), 3: (64, 36)}.items():
                s.note('drums', b + q, dn, 0.2, v)
            if full:
                for q in (0.5, 1.5, 2.5, 3.5):
                    s.note('drums', b + q, 54, 0.1, 26)            # tambourine
            b += 4
        return b

    b = 0
    st = (0, 4)
    # A A: banjo alone, then the fiddle joins it
    s.melody('banjo', b, REEL_A, 74, strong=st, legato=0.6); back(b, REEL_A, False); b += 32
    s.melody('fiddle', b, REEL_A, 76, strong=st); s.melody('banjo', b, REEL_A, 50, strong=st, legato=0.5)
    back(b, REEL_A, False); b += 32
    # B B: whistle up top, fiddle under it; then everyone
    s.melody('whistle', b, REEL_B, 70, strong=st, harm=('fiddle', 'third', 14)); back(b, REEL_B, False); b += 32
    s.melody('fiddle', b, REEL_B, 80, strong=st); s.melody('whistle', b, REEL_B, 58, strong=st)
    s.melody('banjo', b, REEL_B, 46, strong=st, legato=0.5, shift=-12); back(b, REEL_B, True); b += 32
    # A once more, everyone, with the ending
    last = REEL_A[:-1] + [REEL_END]
    s.melody('fiddle', b, last, 80, strong=st); s.melody('whistle', b, last, 62, strong=st)
    s.melody('banjo', b, last, 48, strong=st, legato=0.5)
    back(b, last[:-1], True); b += 28
    # the final bar: a held D chord, a bass and bodhran stop on the one
    for p in voice('D', 50) + [38, 50]:
        s.note('guitar' if p > 45 else 'bass', b + 2, p, 2.5, 66)
    s.note('bass', b, 38, 1.6, 90); s.note('drums', b, 41, 0.3, 70); s.note('drums', b + 2, 41, 0.3, 80)
    s.note('drums', b + 2, 49, 1.0, 40)
    s.end = b + 4.5
    return s


# ── 2. Lantern Light (a waltz) ────────────────────────────────────────────────────────────────────────
WALTZ_A = [('F', 'C5:2 A4 C5 F5:2'), ('C7', 'E5:4 D5 C5'), ('C7', 'Bb4:2 G4 Bb4 E5:2'), ('F', 'F5:4 C5:2'),
           ('Bb', 'D5:2 F5 D5 Bb4:2'), ('F', 'C5:2 A4 C5 F5:2'), ('C7', 'G5:2 F5 E5 D5 E5'), ('F', 'F5:6')]
WALTZ_B = [('Dm', 'A5:2 F5 D5 A5:2'), ('Bb', 'Bb5:3 A5 G5 F5'), ('F', 'A5:2 G5 F5 C5:2'), ('C', 'G5:4 E5:2'),
           ('Gm', 'Bb4:2 D5 G5 Bb5:2'), ('F', 'A5:3 G5 F5 E5'), ('C7', 'E5:2 C5 E5 G5 Bb5'), ('F', 'A5:4 -:2')]
WALTZ_END = [('C7', 'E5:2 D5 C5 G5 E5'), ('F', 'F5:6')]


def waltz():
    s = Piece('waltz', 126, 3, 3, 4, {'accordion': (21, 84, 46, 50), 'flute': (73, 86, 70, 70),
                                     'guitar': (24, 76, 86, 50), 'harp': (46, 60, 30, 70),
                                     'bass': (32, 90, 64, 30)})

    def back(start, bars, harp):
        b = start
        for i, (ch, _) in enumerate(bars):
            pcs = chord_pcs(ch)
            root = 36 + pcs[0]
            root = root - 12 if root > 45 else root
            s.note('bass', b, root if i % 2 == 0 else root + 7 - (12 if root + 7 > 47 else 0), 1.4, 84)
            for q in (1, 2):                                         # oom-PAH-PAH
                for k, p in enumerate(voice(ch, 57)):
                    s.note('guitar', b + q + k * 0.012, p, 0.6, 50 if q == 1 else 44)
            if harp:                                                # rolling harp quavers
                arp = voice(ch, 60) + [voice(ch, 72)[0]]
                for k, p in enumerate(arp + arp[-2:0:-1][:2]):
                    s.note('harp', b + k * 0.5, p, 0.9, 40 if k else 48)
            s.note('drums', b, 41, 0.2, 40); s.note('drums', b + 1, 42, 0.1, 22); s.note('drums', b + 2, 42, 0.1, 22)
            b += 3
        return b

    b = 0
    st = (0,)
    AB = WALTZ_A + WALTZ_B
    s.melody('accordion', b, AB, 70, strong=st); back(b, AB, False); b += 48
    s.melody('flute', b, AB, 72, strong=st)
    for i, (ch, _) in enumerate(AB):                                # accordion holds the chords under the flute
        for p in voice(ch, 60):
            s.note('accordion', b + i * 3, p, 2.8, 38)
    back(b, AB, True); b += 48
    last = WALTZ_A + WALTZ_B[:-2] + WALTZ_END
    s.melody('flute', b, last, 70, strong=st); s.melody('accordion', b, last, 52, strong=st, shift=-12)
    back(b, last[:-1], True); b += 45
    for p in voice('F', 53) + [41, 29]:                             # a long last chord, harp rolled up to it
        s.note('bass' if p < 45 else 'guitar', b, p, 5, 62)
    for k, p in enumerate([53, 57, 60, 65, 69, 72, 77]):
        s.note('harp', b + k * 0.12, p, 4.5, 46)
    s.end = b + 5.5
    return s


# ── 3. Potted It! (a polka) ───────────────────────────────────────────────────────────────────────────
POLKA_A = [('Bb', 'F4 Bb4 D5 F5'), ('Bb', 'D5:2 Bb4:2'), ('F7', 'Eb5 D5 C5 Bb4'), ('F7', 'C5:2 A4:2'),
           ('F7', 'Eb4 A4 C5 Eb5'), ('F7', 'C5:2 A4:2'), ('Bb', 'D5 C5 Bb4 F4'), ('Bb', 'Bb4:2 -:2'),
           ('Bb', 'F4 Bb4 D5 F5'), ('Eb', 'G5:2 Eb5:2'), ('Bb', 'F5 D5 Bb4 D5'), ('Gm', 'G5:2 D5:2'),
           ('Cm', 'Eb5 G5 Eb5 C5'), ('F7', 'Eb5 C5 A4 C5'), ('F7', 'C5 A4 F4 A4'), ('Bb', 'Bb4:2 -:2')]
POLKA_B = [('Eb', 'G4:2 Bb4:2'), ('Eb', 'Eb5:3 D5'), ('Bb7', 'F5:2 D5:2'), ('Bb7', 'Bb4:4'),
           ('Bb7', 'Ab4:2 Bb4:2'), ('Bb7', 'F5:3 Eb5'), ('Eb', 'G5:2 Eb5:2'), ('Eb', 'Bb4:4'),
           ('Eb', 'G4:2 Bb4:2'), ('Ab', 'C5:3 Ab4'), ('Eb', 'Bb4:2 G4:2'), ('C7', 'G4 C5 E5 G5'),
           ('Fm', 'Ab5:2 F5:2'), ('Bb7', 'D5 F5 Ab5 F5'), ('Bb7', 'F5 D5 Bb4 D5'), ('Eb', 'Eb5:2 -:2')]
POLKA_END = [('Bb', 'Bb4 -:1 F4 Bb4'), ('Bb', 'Bb5 -:3')]


def polka():
    s = Piece('polka', 112, 2, 2, 4, {'clarinet': (71, 92, 54, 50), 'trombone': (57, 76, 76, 50),
                                     'piano': (3, 70, 40, 40), 'tuba': (58, 88, 64, 30)})

    def back(start, bars, snare):
        b = start
        for i, (ch, _) in enumerate(bars):
            pcs = chord_pcs(ch)
            root = 34 + ((pcs[0] - 10) % 12)                        # tuba from B♭1 up
            s.note('tuba', b, root if i % 2 == 0 else root + 7 - (12 if root + 7 > 46 else 0), 0.45, 88)
            for q in (0.5, 1.5):                                     # oom-PAH: pub piano off the beat
                for k, p in enumerate(voice(ch, 58)):
                    s.note('piano', b + q, p, 0.3, 54)
            s.note('drums', b, 36, 0.2, 54)
            s.note('drums', b + 0.5, 38 if snare else 37, 0.1, 30 if snare else 40)
            s.note('drums', b + 1, 36, 0.2, 44)
            s.note('drums', b + 1.5, 38 if snare else 37, 0.1, 30 if snare else 40)
            b += 2
        return b

    b = 0
    st = (0, 2)
    s.melody('clarinet', b, POLKA_A, 74, strong=st, legato=0.8); back(b, POLKA_A, False); b += 32
    s.melody('clarinet', b, POLKA_A, 76, strong=st, legato=0.8, harm=('trombone', 'third', 16))
    back(b, POLKA_A, True); b += 32
    # the trio, a fourth up in E♭: trombone takes the tune, then the clarinet over it
    s.melody('trombone', b, POLKA_B, 78, strong=st, shift=-12, legato=0.85); back(b, POLKA_B, False); b += 32
    s.melody('clarinet', b, POLKA_B, 74, strong=st, legato=0.8)
    s.melody('trombone', b, POLKA_B, 60, strong=st, shift=-12, legato=0.85); back(b, POLKA_B, True); b += 32
    last = POLKA_A[:-1] + POLKA_END
    s.melody('clarinet', b, last, 78, strong=st, legato=0.8, harm=('trombone', 'third', 14))
    s.melody('piano', b, last, 46, strong=st, legato=0.5, shift=12)
    back(b, last[:-2], True); b += 30
    # the button: "da-da ... DUM"
    s.note('tuba', b, 34, 0.4, 90); s.note('tuba', b + 2, 34, 0.5, 96)
    for p in voice('Bb', 58):
        s.note('piano', b + 2, p, 0.6, 70)
    s.note('drums', b, 36, 0.2, 60); s.note('drums', b + 2, 36, 0.3, 74); s.note('drums', b + 2, 49, 1.0, 44)
    s.end = b + 3
    return s


# ── 4. The Fen Road (a slip jig) ──────────────────────────────────────────────────────────────────────
SLIP_A = [('Em', 'E5:2 B4 E5 F#5 G5 E5:2 D5'), ('D', 'D5:2 A4 D5 E5 F#5 A5:2 F#5'),
          ('Em', 'E5:2 B4 E5 F#5 G5 B5:2 A5'), ('A', 'A5 G5 F#5 E5 C#5 A4 C#5:2 E5'),
          ('Em', 'E5:2 B4 E5 F#5 G5 E5:2 D5'), ('D', 'D5:2 F#5 A5 B5 A5 F#5 E5 D5'),
          ('A7', 'C#5 E5 A5 G5 F#5 E5 D5 C#5 B4'), ('Em', 'E5:3 B4:3 E5:3')]
SLIP_B = [('G', 'B5:2 G5 D6:2 B5 G5 A5 F#5'), ('D', 'A5:2 F#5 D5 F#5 A5 D6:2 A5'),
          ('Em', 'G5:2 E5 B5:2 A5 G5 E5 D5'), ('A7', 'C#5 E5 A5 C#6 B5 A5 G5:2 E5'),
          ('G', 'B5:2 G5 D5 G5 B5 D6:2 B5'), ('D', 'A5 F#5 D5 A5 F#5 D5 F#5:2 A5'),
          ('A7', 'G5 F#5 E5 C#5 E5 A5 G5 F#5 E5'), ('Em', 'E5:3 B4:3 E5:3')]
SLIP_END = ('E', 'E5:6 -:3')


def slipjig():
    s = Piece('slipjig', 138, 4.5, 9, 8, {'recorder': (74, 90, 56, 70), 'lute': (24, 82, 80, 50),
                                         'harp': (46, 66, 34, 70), 'viola': (41, 60, 44, 70),
                                         'bass': (43, 70, 64, 40)})

    def back(start, bars, full):
        b = start
        for ch, _ in bars:
            v = voice(ch, 52)
            pcs = chord_pcs(ch)
            root = 40 + ((pcs[0] - 4) % 12)
            for beat in range(3):                                   # lute: root, then the chord, each dotted beat
                t = b + beat * 1.5
                s.note('lute', t, v[0] if beat != 1 else v[0] - 12 + (12 if v[0] - 12 < 40 else 0), 0.45, 60)
                s.note('lute', t + 0.5, v[1], 0.45, 46); s.note('lute', t + 1.0, v[2], 0.45, 46)
            if full:
                s.note('bass', b, root - 12 if root > 47 else root, 4.2, 54)
            s.note('drums', b, 45, 0.2, 52); s.note('drums', b + 1.5, 45, 0.2, 34)
            s.note('drums', b + 3, 45, 0.2, 40); s.note('drums', b + 4, 76, 0.1, 22)   # tabor, and a woodblock tick
            b += 4.5
        return b

    b = 0
    st = (0, 3, 6)
    s.melody('recorder', b, SLIP_A, 72, strong=st); back(b, SLIP_A, False); b += 36
    s.melody('harp', b, SLIP_A, 66, strong=st, legato=1.4); s.melody('recorder', b, SLIP_A, 48, strong=st, shift=12)
    back(b, SLIP_A, True); b += 36
    s.melody('recorder', b, SLIP_B, 72, strong=st, harm=('viola', 'third', 18)); back(b, SLIP_B, True); b += 36
    s.melody('recorder', b, SLIP_B, 74, strong=st); s.melody('harp', b, SLIP_B, 50, strong=st, shift=-12, legato=1.2)
    back(b, SLIP_B, True); b += 36
    last = SLIP_A[:-1] + [SLIP_END]
    s.melody('recorder', b, last, 74, strong=st, harm=('viola', 'third', 18))
    back(b, last[:-1], True); b += 31.5
    # end bright: E major, harp rolled up to it
    for p in voice('E', 52):
        s.note('lute', b, p, 4, 60)
    s.note('bass', b, 40, 4.5, 60)
    for k, p in enumerate([52, 56, 59, 64, 68, 71, 76]):
        s.note('harp', b + k * 0.1, p, 4, 46)
    s.note('drums', b, 45, 0.3, 56)
    s.end = b + 4.5
    return s


PIECES = {'reel': reel, 'waltz': waltz, 'polka': polka, 'slipjig': slipjig}


def save(s, path):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    meta = mido.MidiTrack(); mid.tracks.append(meta)
    meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(s.bpm), time=0))
    meta.append(mido.MetaMessage('time_signature', numerator=s.num, denominator=s.den, time=0))
    tail = int((s.end + RING * s.bpm / 60 + 1) * TPB)
    for part, msgs in s.ev.items():
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        c = s.ch[part]
        if part != 'drums':
            prog, vol, pan, rev = s.parts[part][:4]
            head = [mido.Message('program_change', channel=c, program=prog),
                    mido.Message('control_change', channel=c, control=7, value=vol),
                    mido.Message('control_change', channel=c, control=10, value=pan),
                    mido.Message('control_change', channel=c, control=91, value=rev)]
        else:
            head = [mido.Message('control_change', channel=9, control=7, value=88),
                    mido.Message('control_change', channel=9, control=91, value=40)]
        for m in head:
            tr.append(m.copy(time=0))
        last = 0
        for t, m in sorted(msgs, key=lambda x: (x[0], x[1].type == 'note_on')):
            tr.append(m.copy(time=t - last)); last = t
        tr.append(mido.MetaMessage('end_of_track', time=max(0, tail - last)))
    mid.save(path)


def finish(a, sr, end_s, out_mp3):
    """Cut at the last note + RING (fading over the last second), add PAUSE of silence, set the level"""
    L = min(len(a), int((end_s + RING) * sr))
    out = a[:L].copy()
    f = int(sr * 1.0)
    out[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    body = out[:int(end_s * sr)]
    rms = np.sqrt((body ** 2).mean()) / 32767
    out *= 10 ** (TARGET_DB / 20) / max(rms, 1e-9)
    peak = np.abs(out).max() / 32767
    if peak > 0.98:
        out *= 0.98 / peak
    out = np.vstack([out, np.zeros((int(PAUSE * sr), a.shape[1]))])
    pcm = np.clip(out, -32767, 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as td:
        w = os.path.join(td, 'o.wav')
        with wave.open(w, 'wb') as wf:
            wf.setnchannels(a.shape[1]); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-b:a', '128k', out_mp3], check=True)
    return len(pcm) / sr, peak


def render(s):
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, s.name + '.mid')
    save(s, mpath)
    with tempfile.TemporaryDirectory() as td:
        raw = os.path.join(td, 'raw.wav')
        subprocess.run(['fluidsynth', '-ni', '-g', '0.5', '-r', '44100', '-F', raw, SF2, mpath],
                       check=True, capture_output=True)
        with wave.open(raw) as w:
            sr, nch = w.getframerate(), w.getnchannels()
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64).reshape(-1, nch)
    secs, peak = finish(a, sr, s.end * 60 / s.bpm, os.path.join(OUT, s.name + '.mp3'))
    print('%-8s %5.1f s at %d bpm (%.0f bars), peak %.2f' % (s.name, secs, s.bpm, s.end / s.bar, peak))


if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if not a.startswith('-')] or list(PIECES)
    for n in names:
        render(PIECES[n]())
