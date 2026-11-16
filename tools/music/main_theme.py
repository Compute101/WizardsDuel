# WizardsDuel main theme: the Corvanthe theme (corvanthe.THEME), arranged big.
#   python3 tools/music/main_theme.py      -> audio/main_theme.mid / .mp3
#
#   A  Intro      bars 0-3    D minor  horns pp over a string tremolo and the forge heartbeat
#   B  Statement  bars 4-11   D minor  the theme on horns, forge ostinato, choir from the middle
#   C  Build      bars 12-15  rising   the opening figure in sequence Bb, C, D, B7, snare roll, harp gliss
#   D  Grand      bars 16-23  E minor  up a tone: trumpets, violins, piccolo, full choir, horn countermelody
#   E  Coda       bars 24-27  E major  C - D - E major (Picardy), roll, one last tutti hit
import os, random, subprocess, sys, tempfile, wave
import numpy as np
import mido
import corvanthe as cv

BPM = 76
TPB = cv.TPB
OUTDIR = os.path.join(cv.HERE, '..', '..', 'audio')
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
rnd = random.Random(11)

PROGS = {  # track -> GM program
    'ost': 42, 'cellomel': 42, 'bass': 43, 'timp': 47, 'trem': 44, 'str': 48, 'choir': 52,
    'horns': 60, 'tpt': 56, 'tbn': 57, 'tuba': 58, 'vln': 40, 'harp': 46, 'picc': 72, 'bells': 14}
ev, chans = {}, {}


def ch(tr):
    if tr == 'drums':
        return 9
    if tr not in chans:
        c = len(chans)
        c = c + 1 if c >= 9 else c
        chans[tr] = c
        ev.setdefault(tr, []).extend([
            (0, mido.Message('program_change', channel=c, program=PROGS[tr])),
            (0, mido.Message('control_change', channel=c, control=7, value=100)),
            (0, mido.Message('control_change', channel=c, control=11, value=110)),
            (0, mido.Message('control_change', channel=c, control=91, value=85))])
    return chans[tr]


def note(tr, n, start, dur, vel, jitter=4):
    c = ch(tr)
    vel = max(1, min(127, int(vel + rnd.randint(-jitter, jitter))))
    s, e = int(start * TPB), int((start + dur) * TPB) - 6
    ev.setdefault(tr, []).append((s, mido.Message('note_on', channel=c, note=int(n), velocity=vel)))
    ev.setdefault(tr, []).append((e, mido.Message('note_off', channel=c, note=int(n), velocity=0)))


def ramp(tr, b0, b1, v0, v1, steps=16):
    c = ch(tr)
    for k in range(steps + 1):
        at = b0 + (b1 - b0) * k / steps
        ev.setdefault(tr, []).append((int(at * TPB), mido.Message('control_change', channel=c, control=11,
                                                                   value=int(v0 + (v1 - v0) * k / steps))))


def roll(tr, n, start, dur, v0, v1, step=.125):
    k, t = 0, 0.0
    total = int(dur / step)
    while t < dur - 1e-6:
        note(tr, n, start + t, step, v0 + (v1 - v0) * k / max(1, total - 1), 2)
        t += step; k += 1


def chord(name, shift=0):
    bass, q = cv.parse_chord(name)
    bass += shift
    if bass > 42:
        bass -= 12
    return bass, q


def voicing(bass, q, lo, hi):
    pcs = {(bass + i) % 12 for i in q}
    return [n for n in range(lo, hi + 1) if n % 12 in pcs]


# ---- harmony, bar by bar: list of halves (bass, qual) --------------------
def bars_of(names, shift=0):
    out = []
    for nm in names:
        h = [chord(x, shift) for x in nm.split('|')]
        out.append(h if len(h) == 2 else h * 2)
    return out


A = bars_of(['Dm', 'Eb', 'Dm', 'A'])
B = bars_of(cv.THEME['chords'])
C = bars_of(['Bb', 'C', 'D', 'B'])
D = bars_of(cv.THEME['chords'], 2)
E = bars_of(['C', 'D', 'E', 'E'])
HARM = A + B + C + D + E
SEC = {'A': 0, 'B': 4, 'C': 12, 'D': 16, 'E': 24}
NBARS = len(HARM)


def half(b, beat):
    return HARM[b][0 if beat < 2 else 1]


def melody(notes, start_bar, shift=0):
    """[(n, dur)] flattened into [(n, start_beat, dur)]."""
    out, t = [], start_bar * 4
    for n, d in notes:
        out.append((n + shift, t, d))
        t += d
    return out


THEME = [x for bar in cv.THEME['melody'] for x in bar]

# ---- A: intro --------------------------------------------------------------
for b in range(0, 4):
    t = b * 4
    bass, q = HARM[b][0]
    note('bass', bass, t, 3.95, 54 + b * 6)
    for i, v in ((0, 52), (3, 40), (6, 46)):          # forge heartbeat
        note('timp', min(bass + 12, 50), t + i * .5, .5, v + b * 8)
    if b >= 2:
        for i, k in enumerate([0, 0, 2, 3, 0, 0, None, 3]):
            n = bass + 12 + (q[k % 3] + 12 * (k // 3) if k is not None else (1 if b == 2 else 8))
            note('ost', n, t + i * .5, .35, (70 if i in (0, 3, 6) else 46) + (b - 2) * 10)
        for n in voicing(bass, q, 55, 69):
            note('choir', n, t, 3.95, 42 + (b - 2) * 14)
note('trem', 50, 0, 15.9, 70)
note('trem', 38, 0, 15.9, 70)
ramp('trem', 0, 16, 40, 115)
for n, s, d in melody(THEME[:6], 0, -12):              # bars 1-2 of the theme, low and quiet
    note('horns', n, s, d * .97, 58)
roll('timp', 45, 14, 2, 40, 100)                         # into B
for k in range(8):                                       # harp sweep up into B
    note('harp', [50, 53, 57, 62, 65, 69, 74, 77][k], 15 + k * .125, .8, 60 + k * 4)
roll('drums', 51, 13, 3, 20, 80, .25)                    # cymbal swell

# ---- B: statement ----------------------------------------------------------
for b in range(SEC['B'], SEC['C']):
    t, lb = b * 4, b - SEC['B']
    for i in range(8):
        bass, q = half(b, i * .5)
        k = [0, 0, 2, 3, 0, 0, None, 3][i]
        n = bass + 12 + (q[k % 3] + 12 * (k // 3) if k is not None else (1 if lb % 2 == 0 else 8))
        acc = i in (0, 3, 6)
        note('ost', n, t + i * .5, .42 if acc else .3, (90 if acc else 62) + lb)
        if acc:
            note('timp', min(bass + 12, 52), t + i * .5, .5, 84 + lb * 2)
    for h in (0, 1):
        bass, q = HARM[b][h]
        note('bass', bass, t + h * 2, 1.95, 84)
        for n in voicing(bass, q, 55, 70):
            note('str', n, t + h * 2, 1.95, 56 + lb * 2)
        if lb >= 4:
            for n in voicing(bass, q, 55, 74):
                note('choir', n, t + h * 2, 1.95, 60 + lb * 3)
    note('bells', 74, t + 3, .3, 60)                     # the Cindergate anvil, a nod
    note('drums', 35, t, .4, 70)
    if lb >= 4:
        note('drums', 38, t + 1, .2, 52); note('drums', 38, t + 3, .2, 58)
note('drums', 49, SEC['B'] * 4, 2, 92)
for n, s, d in melody(THEME, SEC['B']):
    v = 90 + (8 if s >= (SEC['B'] + 4) * 4 else 0)
    note('horns', n, s, d * .97, v)
    note('cellomel', n - 12, s, d * .97, v - 18)
    if s >= (SEC['B'] + 4) * 4:
        note('vln', n + 12, s, d * .97, v - 20)

# ---- C: build -------------------------------------------------------------
seq = [[(70, 1), (74, 1), (77, 2)], [(72, 1), (76, 1), (79, 2)], [(74, 1), (78, 1), (81, 2)],
       [(71, 1), (75, 1), (78, 1), (81, 1)]]
for lb, bar in enumerate(seq):
    b = SEC['C'] + lb
    t = b * 4
    bass, q = HARM[b][0]
    for n, s, d in melody(bar, b):
        note('tpt', n, s, d * .97, 92 + lb * 6)
        note('horns', n - 12, s, d * .97, 92 + lb * 6)
    for i in range(8):
        k = [0, 0, 2, 3, 0, 0, 2, 3][i]
        note('ost', bass + 12 + q[k % 3] + 12 * (k // 3), t + i * .5, .35, 80 + lb * 8 + (12 if i in (0, 3, 6) else 0))
    note('bass', bass, t, 3.95, 90); note('tuba', bass, t, 3.95, 70 + lb * 10)
    for n in voicing(bass, q, 55, 74):
        note('choir', n, t, 3.95, 70 + lb * 10)
        note('trem', n, t, 3.95, 70 + lb * 10)
    if lb == 3:                                          # B7: the seventh in the strings
        note('str', 69, t, 3.95, 90)
    note('timp', min(bass + 12, 52), t, .5, 90 + lb * 6)
    if lb >= 2:
        for i in (3, 6):
            note('tbn', bass + 12, t + i * .5, .4, 96 + lb * 4)
ramp('trem', SEC['C'] * 4, SEC['D'] * 4, 70, 120)
roll('drums', 38, (SEC['C'] + 2) * 4, 8, 40, 118, .125)   # snare roll
roll('drums', 51, (SEC['C'] + 2) * 4, 8, 30, 100, .25)
roll('timp', 47, (SEC['C'] + 3) * 4, 4, 70, 122)
for k, n in enumerate([59, 63, 66, 69, 71, 75, 78, 81, 83, 87, 90, 93]):   # harp gliss over B7
    note('harp', n, (SEC['C'] + 3) * 4 + 2.5 + k * .125, .6, 70 + k * 4)

# ---- D: grand statement in E minor ------------------------------------------
GT = melody(THEME, SEC['D'], 2)
for n, s, d in GT:
    lb = int(s // 4) - SEC['D']
    v = 108 + (8 if lb >= 4 else 0)
    note('tpt', n, s, d * .95, v)
    note('vln', n + 12, s, d * .97, v - 6)
    if lb >= 4:
        note('picc', n + 12, s, d * .95, v - 18)
# horn countermelody: half notes, nearest chord tone, never on the melody's note
prev = 67
for b in range(SEC['D'], SEC['E']):
    for h in (0, 1):
        bass, q = HARM[b][h]
        mel_now = [n for n, s, d in GT if s <= b * 4 + h * 2 < s + d]
        cands = [n for n in voicing(bass, q, 60, 74) if not mel_now or n % 12 != mel_now[0] % 12]
        prev = min(cands, key=lambda n: (abs(n - prev), n))
        note('horns', prev, b * 4 + h * 2, 1.95, 96)
for b in range(SEC['D'], SEC['E']):
    t, lb = b * 4, b - SEC['D']
    for i in range(8):
        bass, q = half(b, i * .5)
        k = [0, 0, 2, 3, 0, 0, None, 3][i]
        n = bass + 12 + (q[k % 3] + 12 * (k // 3) if k is not None else (1 if lb % 2 == 0 else 8))
        acc = i in (0, 3, 6)
        note('ost', n, t + i * .5, .42 if acc else .3, 112 if acc else 84)
        if acc:
            note('tbn', bass + 12, t + i * .5, .45, 110)
            note('timp', min(bass + 12, 52), t + i * .5, .5, 112)
            note('drums', 35, t + i * .5, .3, 96)
    for h in (0, 1):
        bass, q = HARM[b][h]
        note('bass', bass, t + h * 2, 1.95, 100)
        note('tuba', bass, t + h * 2, 1.95, 92)
        for n in voicing(bass, q, 55, 76):
            note('choir', n, t + h * 2, 1.95, 96 + lb * 2)
        for n in voicing(bass, q, 52, 72):
            note('str', n, t + h * 2, 1.95, 84)
    for i, v in ((1, 70), (1.75, 52), (2, 60), (3, 76), (3.5, 56), (3.75, 60)):   # march snare
        note('drums', 38, t + i, .15, v)
    if lb % 2 == 0:
        note('drums', 49, t, 3, 112)
        note('bells', 76 if lb % 4 == 0 else 71, t, 2, 90)

# ---- E: coda, E major ------------------------------------------------------
t0 = SEC['E'] * 4
coda = [(76, 2), (79, 2), (78, 2), (81, 2), (80, 4)]
for n, s, d in melody(coda, SEC['E']):
    note('tpt', n, s, d * .97, 116)
    note('vln', n + 12, s, d * .97, 108)
    note('picc', n + 12, s, d * .97, 96)
    note('horns', n - 12, s, d * .97, 108)
for lb in range(3):
    b = SEC['E'] + lb
    t = b * 4
    bass, q = HARM[b][0]
    dur = 3.95
    note('bass', bass, t, dur, 104); note('tuba', bass, t, dur, 100)
    for n in voicing(bass, q, 52, 76):
        note('choir', n, t, dur, 104 + lb * 6)
        note('str', n, t, dur, 92 + lb * 6)
    for n in voicing(bass, q, 48, 64):
        note('tbn', n, t, dur, 98 + lb * 6)
    if lb < 2:
        for i, v in ((0, 116), (1.5, 96), (3, 104)):
            note('timp', min(bass + 12, 52), t + i, .5, v)
            note('drums', 35, t + i, .3, 100)
    note('drums', 49, t, 3, 116 if lb != 1 else 100)
roll('timp', 52, t0 + 8, 4, 80, 124)
roll('drums', 38, t0 + 10, 2, 60, 118, .125)
# the last hit: everyone, on beat 1 of the final bar, then let the hall ring
fin = t0 + 12
bass, q = HARM[-1][0]
for tr, lo, hi, v in (('choir', 52, 76, 118), ('str', 40, 76, 116), ('tbn', 40, 64, 120), ('horns', 52, 72, 118),
                      ('tpt', 64, 80, 122), ('vln', 64, 88, 116), ('picc', 76, 88, 100), ('harp', 40, 88, 100)):
    for n in voicing(bass, q, lo, hi):
        note(tr, n, fin, 1.6, v, 2)
note('bass', 28, fin, 1.6, 120); note('tuba', 28, fin, 1.6, 120); note('timp', 40, fin, 1.2, 127, 0)
note('drums', 49, fin, 4, 127, 0); note('drums', 57, fin, 4, 120, 0); note('drums', 35, fin, .5, 127, 0)
note('bells', 76, fin, 4, 110, 0); note('bells', 64, fin, 4, 100, 0)
END_BEATS = fin + 4


def save(path):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    first = True
    for tr_name, lst in ev.items():
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=tr_name))
        if first:
            tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM))); first = False
        last = 0
        for at, msg in sorted(lst, key=lambda x: (x[0], x[1].type == 'note_on')):
            tr.append(msg.copy(time=at - last)); last = at
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((END_BEATS + 4) * TPB) - last)))
    mid.save(path)


def render(mid_path, mp3_path):
    tmp = tempfile.mkdtemp()
    raw = os.path.join(tmp, 'raw.wav'); out = os.path.join(tmp, 'out.wav')
    subprocess.run(['fluidsynth', '-ni', '-g', '0.5', '-r', '44100', '-F', raw, SF2, mid_path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    w = wave.open(raw); chn, sr = w.getnchannels(), w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, chn).astype(np.float32)
    a *= 0.9 * 32767 / np.abs(a).max()
    loud = np.nonzero(np.abs(a).max(axis=1) > 300)[0]      # trim the silence after the hall's ring
    a = a[:loud[-1] + int(.3 * sr)]
    f = int(1.5 * sr)
    a[-f:] *= np.linspace(1, 0, f)[:, None]               # fade the last of the ring
    o = wave.open(out, 'wb'); o.setnchannels(chn); o.setsampwidth(2); o.setframerate(sr)
    o.writeframes(a.astype(np.int16).tobytes()); o.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-b:a', '192k', mp3_path], check=True)
    print('main theme %.1f s, %d bars' % (len(a) / sr, NBARS))


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    mp = os.path.join(OUTDIR, 'main_theme.mid')
    save(mp)
    if '--midi' not in sys.argv:
        render(mp, os.path.join(OUTDIR, 'main_theme.mp3'))
