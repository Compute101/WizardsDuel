# Tavern music for the Winks Table: a cheery set of two jigs, the kind a fiddler plays in the corner of
# the Wren's Nest while you flick. Background music: steady, warm, never loud, and bright enough to buck
# you up when the game's going badly.
#   python3 tools/music/tavern.py          -> audio/tavern_theme.mid / .mp3 (a seamless loop)
#   python3 tools/music/tavern.py --x3     -> also tavern_theme_x3.mp3 (the loop three times, to hear the join)
#
# A set of two jigs in 6/8 (quaver = half a beat, a bar = three beats), each played AABB:
#   Squop's Jig    G major    A: fiddle alone          A: whistle on the tune, fiddle a third below
#                             B: accordion on the tune B: everyone, tambourine in
#   Bucked Up      D major    the same build again, a step brighter
# The last bar walks down from D7 (D C B A) into the first bar again, so the loop never stops.
# Under it: guitar off-beat strums, a plucked bass on the beat (root, then fifth) and a soft bodhran.
# Same tools as the other music (FluidSynth + FluidR3_GM, the reverb tail folded onto the start), but
# mixed quiet: about -24 dBFS RMS, so it sits under the table's sounds and talk.
import os, subprocess, sys, tempfile, wave
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'audio')
NAME = 'tavern_theme'
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TPB = 480
BPM = 150             # crotchets: a dotted crotchet at 100, a relaxed jig
TAIL = 6              # beats of reverb rendered past the loop's end, then folded onto its start
TARGET_DB = -24.0     # RMS level of the finished loop: background

N = {}
for o in range(2, 8):
    for i, nm in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']):
        N[nm + str(o)] = 12 * (o + 1) + i

# Tunes: a bar is six quavers; a note is 'B4' (a quaver), 'B4:2' (a crotchet), 'B4:3' (dotted), '-' a rest
SQUOP_A = [('G',  'D5 B4 G4 B4 D5 G5'), ('C',  'E5 C5 E5 G5 E5 C5'), ('G',  'D5 B4 D5 G5 D5 B4'),
           ('D',  'A4 B4 C5 D5 E5 F#5'), ('G', 'G5 F#5 G5 D5 B4 G4'), ('C', 'E5 F#5 G5 A5 G5 E5'),
           ('D',  'D5 B4 G4 A4 F#4 D4'), ('G', 'G4:3 G4:2 -')]
SQUOP_B = [('C',  'E5 G5 C6 B5 A5 G5'), ('G',  'B5 G5 D5 G5 B5 D6'), ('D',  'A5 F#5 D5 C6 A5 F#5'),
           ('G',  'G5 B5 G5 D5 B4 D5'), ('C',  'E5 G5 E5 C6 B5 A5'), ('G',  'B5 G5 D5 B5 A5 G5'),
           ('D',  'F#5 G5 A5 D5 E5 F#5'), ('G', 'G5:3 G5:2 -')]
BUCK_A = [('D',  'A4 D5 F#5 A5 F#5 D5'), ('G',  'B4 D5 G5 B5 G5 D5'), ('D',  'F#5 E5 D5 A4 D5 F#5'),
          ('A',  'E5 F#5 E5 C#5 B4 A4'), ('D',  'D5 F#5 A5 D6 A5 F#5'), ('G',  'G5 A5 B5 G5 E5 D5'),
          ('A',  'C#5 D5 E5 A4 C#5 E5'), ('D', 'D5:3 D5:2 -')]
BUCK_B = [('G',  'B5 A5 G5 D5 G5 B5'), ('D',  'A5 F#5 D5 F#5 A5 D6'), ('Em', 'G5 E5 B4 E5 G5 B5'),
          ('A',  'A5 E5 C#5 A4 C#5 E5'), ('G',  'D5 G5 B5 D6 B5 G5'), ('D',  'F#5 E5 D5 A5 F#5 D5'),
          ('A',  'E5 F#5 G5 A5 G5 E5'), ('D', 'D5:3 D5:2 -')]
TURN = ('D7', 'D5:3 C5 B4 A4')          # the very last bar: down into the top again

CHORDS = {'G': ['G', 'B', 'D'], 'C': ['C', 'E', 'G'], 'D': ['D', 'F#', 'A'], 'A': ['A', 'C#', 'E'],
          'Em': ['E', 'G', 'B'], 'D7': ['D', 'F#', 'A', 'C']}
SCALES = {'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], 'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']}
PC = {nm: i for i, nm in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}

# part -> (GM program, channel volume, pan, reverb)
PARTS = {'fiddle': (110, 100, 50, 60), 'whistle': (78, 84, 76, 60), 'accordion': (21, 80, 40, 50),
         'guitar': (25, 72, 84, 45), 'bass': (32, 92, 64, 30)}
ev = {p: [] for p in list(PARTS) + ['drums']}
CH = {p: i for i, p in enumerate(PARTS)}
CH['drums'] = 9


def parse(s):
    out = []
    for tok in s.split():
        nm, _, d = tok.partition(':')
        out.append((None if nm == '-' else N[nm], int(d or 1)))
    return out


def note(part, beat, pitch, dur, vel):
    if pitch is None:
        return
    c = CH[part]
    ev[part].append((int(beat * TPB), mido.Message('note_on', channel=c, note=pitch, velocity=int(vel))))
    ev[part].append((int((beat + dur) * TPB) - 2, mido.Message('note_off', channel=c, note=pitch, velocity=0)))


def third_below(p, key):
    """The diatonic third below a melody note, for a second voice."""
    sc = [PC[x] for x in SCALES[key]]
    i = sc.index(p % 12)
    q = sc[(i - 2) % 7]
    d = (p % 12 - q) % 12
    return p - d


def melody(part, start, bars, vel, key=None, harm=None):
    """Play a tune's bars from beat `start`; harm: a part to play a third below it."""
    b = start
    for _, tune in bars:
        q = 0
        for i, (p, d) in enumerate(parse(tune)):
            accent = 12 if q in (0, 3) else 0                    # lean on each dotted-crotchet beat
            note(part, b + q * 0.5, p, d * 0.5 * 0.92, vel + accent)
            if harm and p is not None:
                note(harm, b + q * 0.5, third_below(p, key), d * 0.5 * 0.92, vel - 18 + accent)
            q += d
        b += 3


def backing(start, bars, full):
    """Guitar off-beats, bass on the beat, a soft bodhran; `full` adds the tambourine."""
    b = start
    for ch, _ in bars:
        tones = CHORDS[ch]
        root = N[tones[0] + '2']
        fifth = root + 7
        note('bass', b, root, 1.3, 84)
        note('bass', b + 1.5, fifth if ch != 'D7' else N['A2'], 1.3, 74)
        strum = sorted(N[t + '3'] if N[t + '3'] >= N['G3'] else N[t + '4'] for t in tones)
        for q in (1, 2, 4, 5):                                   # "da-DUM-dum da-DUM-dum": off the beat
            for k, p in enumerate(strum):
                note('guitar', b + q * 0.5 + k * 0.012, p, 0.4, 52 if q in (2, 5) else 44)
        for q, (dn, v) in {0: (41, 64), 2: (64, 34), 3: (41, 50), 5: (64, 40)}.items():
            note('drums', b + q * 0.5, dn, 0.2, v)
        if full:
            note('drums', b + 1.5, 54, 0.2, 34)
        b += 3


def accordion_chords(start, bars, vel):
    b = start
    for ch, _ in bars:
        for k, t in enumerate(CHORDS[ch]):
            p = N[t + '4']
            p = p - 12 if p > N['D5'] else p
            note('accordion', b, p, 2.8, vel)
        b += 3


def tune_set(start, A, B, key, last=False):
    """AABB, building up: fiddle; whistle + fiddle harmony; accordion; everyone."""
    b = start
    melody('fiddle', b, A, 78); backing(b, A, False); b += 24
    melody('whistle', b, A, 70, key, harm='fiddle'); backing(b, A, False); b += 24
    melody('accordion', b, B, 72); backing(b, B, False); b += 24
    B2 = B[:-1] + [TURN] if last else B
    melody('fiddle', b, B2, 82); melody('whistle', b, B2, 60); accordion_chords(b, B2, 50); backing(b, B2, True)
    return b + 24


def build():
    b = tune_set(0, SQUOP_A, SQUOP_B, 'G')
    b = tune_set(b, BUCK_A, BUCK_B, 'D', last=True)
    return b                                                   # the loop's length in beats


def save(path, end):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    meta = mido.MidiTrack(); mid.tracks.append(meta)
    meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
    meta.append(mido.MetaMessage('time_signature', numerator=6, denominator=8, time=0))
    for part, msgs in ev.items():
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        c = CH[part]
        head = []
        if part != 'drums':
            prog, vol, pan, rev = PARTS[part]
            head = [mido.Message('program_change', channel=c, program=prog),
                    mido.Message('control_change', channel=c, control=7, value=vol),
                    mido.Message('control_change', channel=c, control=10, value=pan),
                    mido.Message('control_change', channel=c, control=91, value=rev)]
        else:
            head = [mido.Message('control_change', channel=9, control=7, value=90),
                    mido.Message('control_change', channel=9, control=91, value=40)]
        for m in head:
            tr.append(m.copy(time=0))
        last = 0
        for t, m in sorted(msgs, key=lambda x: (x[0], x[1].type == 'note_on')):
            tr.append(m.copy(time=t - last)); last = t
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((end + TAIL) * TPB) - last)))
    mid.save(path)


def render(end, x3=False):
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, NAME + '.mid')
    save(mpath, end)
    with tempfile.TemporaryDirectory() as td:
        raw = os.path.join(td, 'raw.wav')
        subprocess.run(['fluidsynth', '-ni', '-g', '0.5', '-r', '44100', '-F', raw, SF2, mpath],
                       check=True, capture_output=True)
        with wave.open(raw) as w:
            sr, nch = w.getframerate(), w.getnchannels()
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64).reshape(-1, nch)
        L = int(round(end * 60 / BPM * sr))
        out = a[:L].copy()
        tail = a[L:][:L]
        out[:len(tail)] += tail                                # fold the reverb tail onto the start: seamless
        rms = np.sqrt((out ** 2).mean()) / 32767
        gain = 10 ** (TARGET_DB / 20) / max(rms, 1e-9)
        out *= gain
        peak = np.abs(out).max() / 32767
        if peak > 0.98:
            out *= 0.98 / peak
        pcm = np.clip(out, -32767, 32767).astype(np.int16)
        loop = os.path.join(td, 'loop.wav')
        with wave.open(loop, 'wb') as w:
            w.setnchannels(nch); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
        mp3 = os.path.join(OUT, NAME + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', loop, '-b:a', '128k', mp3], check=True)
        if x3:
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stream_loop', '2', '-i', loop, '-b:a', '128k',
                            os.path.join(OUT, NAME + '_x3.mp3')], check=True)
        print('Tavern loop %.1f s (%d bars of 6/8 at %d), RMS %.1f dBFS, peak %.2f' % (
            L / sr, end / 3, BPM * 2 / 3, 20 * np.log10(np.sqrt((pcm.astype(float) ** 2).mean()) / 32767), peak))


if __name__ == '__main__':
    end = build()
    render(end, x3='--x3' in sys.argv)
