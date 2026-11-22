# WizardsDuel battle theme: the Corvanthe theme (corvanthe.THEME) as a seamless combat loop.
#   python3 tools/music/battle_theme.py           -> audio/battle_theme.mid / .mp3 (a seamless loop)
#   python3 tools/music/battle_theme.py --midi    -> the MIDI only
#   python3 tools/music/battle_theme.py --check   -> also print ranges, loudness, and the seam
#   python3 tools/music/battle_theme.py --x3      -> also write battle_theme_x3.wav in the scratch dir (seam by ear)
#
# 138 bpm, 48 bars, about 83 s. Everything rides on the forge rhythm (3+3+2): the low strings hammer it in 16ths
# (accents on 1, the "and" of 2 and 4 of each half bar), the basses, timpani and taiko in 8ths (beats 1, 2&, 4).
#
#   A  Gathering  bars 0-3    D minor   ostinato alone, the anvil; horns call the opening (D F A), trombones
#                                       answer with the Phrygian fall (Bb G Eb)
#   B  Engage     bars 4-11   D minor   the theme on horns and cellos, snare on 2 and 4, brass stabs
#   C  Assault    bars 12-19  D minor   violins and trumpets take it up an octave, horns hold a counter line
#   D  Stalk      bars 20-27  G minor   the drop: tremolo strings, choir, taiko only; low horns carry the
#                                       theme's first half, a muted trumpet its second (the whole theme a 4th up)
#   E  Gather     bars 28-35  Bb, A     the opening figure in stretto, climbing from tuba to violins; then an
#                                       A pedal and a snare roll building to the top
#   F  Onslaught  bars 36-43  D minor   the whole theme tutti, choir and violins high, trumpets, horn counter line
#   G  Turn       bars 44-47  Bb Eb A   three bars of 3+3+2 hammer blows, falling back; the A leads to bar 0
import os, random, subprocess, sys, tempfile, wave
import numpy as np
import mido
import corvanthe as cv

TPB = cv.TPB
BPM = 138
OUTDIR = os.path.join(cv.HERE, '..', '..', 'audio')
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
rnd = random.Random(11)

# track -> (GM program, volume, pan, reverb, playable range)
PARTS = {
    'vln':   (48, 120, 40, 80, (55, 100)),
    'trem':  (44, 100, 60, 85, (50, 86)),    # tremolo strings
    'ost':   (41, 124, 74, 60, (45, 79)),    # violas, the 16th-note hammer (staccato)
    'cello': (42, 122, 84, 70, (36, 76)),
    'bass':  (43, 118, 90, 60, (26, 55)),
    'horn':  (60, 116, 46, 85, (41, 77)),
    'tpt':   (56, 112, 78, 75, (55, 84)),
    'mute':  (59, 96, 70, 80, (55, 82)),     # muted trumpet
    'tbn':   (57, 104, 88, 75, (40, 72)),
    'tuba':  (58, 100, 80, 70, (26, 58)),
    'timp':  (47, 122, 56, 70, (38, 57)),
    'taiko': (116, 112, 64, 60, (36, 60)),
    'choir': (52, 104, 64, 95, (48, 79)),
    'anvil': (14, 70, 30, 70, (74, 86)),
}
BD, SN, CRASH, CYM, ROLL = 36, 38, 49, 57, 38
ev, chans = {}, {}
HIT = (0, 1.5, 3)            # the forge rhythm in 8ths, per bar
NBARS = 48
SEC = {'A': 0, 'B': 4, 'C': 12, 'D': 20, 'E': 28, 'F': 36, 'G': 44}


def ch(tr):
    if tr == 'drums':
        if tr not in ev:
            ev[tr] = [(0, mido.Message('program_change', channel=9, program=48)),
                      (0, mido.Message('control_change', channel=9, control=7, value=110)),
                      (0, mido.Message('control_change', channel=9, control=91, value=70))]
        return 9
    if tr not in chans:
        c = len(chans)
        c = c + 1 if c >= 9 else c
        chans[tr] = c
        prog, vol, pan, rev, _ = PARTS[tr]
        ev[tr] = [(0, mido.Message('program_change', channel=c, program=prog)),
                  (0, mido.Message('control_change', channel=c, control=7, value=vol)),
                  (0, mido.Message('control_change', channel=c, control=10, value=pan)),
                  (0, mido.Message('control_change', channel=c, control=11, value=110)),
                  (0, mido.Message('control_change', channel=c, control=91, value=rev))]
    return chans[tr]


def cc(tr, beat, val, ctl=11):
    ev.setdefault(tr, [])
    ev[tr].append((int(beat * TPB), mido.Message('control_change', channel=ch(tr), control=ctl,
                                                 value=max(0, min(127, int(val))))))


def cresc(tr, b0, b1, v0, v1):
    steps = max(2, int((b1 - b0) * 4))
    for k in range(steps + 1):
        cc(tr, b0 + (b1 - b0) * k / steps, v0 + (v1 - v0) * k / steps)


def note(tr, n, start, dur, vel, jitter=3, art=.92):
    c = ch(tr)
    vel = max(1, min(127, int(vel + rnd.randint(-jitter, jitter))))
    s = int(start * TPB)
    e = int((start + dur * art) * TPB)
    ev[tr].append((s, mido.Message('note_on', channel=c, note=int(n), velocity=vel)))
    ev[tr].append((max(s + 10, e), mido.Message('note_off', channel=c, note=int(n), velocity=0)))


def drum(n, start, vel, dur=.2):
    note('drums', n, start, dur, vel, jitter=4, art=1)


# ---- Harmony ---------------------------------------------------------------
# A chord per half bar: (root pc, quality). Written per bar as 'X' or 'X|Y'; 'X/B' puts B in the bass.
QUAL = {'': (0, 4, 7), 'm': (0, 3, 7)}


def parse(s):
    s, _, b = s.partition('/')
    root = s[:2] if len(s) > 1 and s[1] in '#b' else s[:1]
    pc = cv.NAMES[root]
    return pc, QUAL[s[len(root):]], cv.NAMES[b] if b else pc


T = cv.THEME['chords']                                       # Dm Eb Dm C|A Bb Gm Eb A
UP4 = ['Gm', 'Ab', 'Gm', 'F|D', 'Eb', 'Cm', 'Ab', 'D']        # the theme's chords a 4th up (Stalk)
BARS = (['Dm', 'Eb/D', 'Dm', 'Eb/D'] + T + T + UP4 +
        ['Bb', 'Cm/Bb', 'Bb', 'Cm/Bb', 'A', 'Bb/A', 'A', 'A'] + T + ['Bb', 'Eb', 'A', 'A'])
assert len(BARS) == NBARS
HALF = []
for b in BARS:
    h = b.split('|')
    HALF += [parse(h[0]), parse(h[-1])]


def chord_at(beat):
    return HALF[int(beat // 2) % len(HALF)]


def low(pc, lo):
    """The pitch of pc at or above lo."""
    return lo + (pc - lo) % 12


def bars(sec, n):
    return range(SEC[sec], SEC[sec] + n)


# ---- The theme -------------------------------------------------------------
def theme_bar(i):
    return cv.THEME['melody'][i]


def melody(tr, bar0, which, shift, vel, art=.9, swell=0):
    """Theme bars `which` (indices into the 8-bar tune) from bar0, transposed by shift."""
    for k, i in enumerate(which):
        t = (bar0 + k) * 4
        for n, d in theme_bar(i):
            note(tr, n + shift, t, d, vel + (5 if d >= 2 else 0), art=art if d >= 1 else .8)
            if swell and d >= 2:
                cresc(tr, t, t + d * .6, 104, 104 + swell); cresc(tr, t + d * .6, t + d, 104 + swell, 104)
            t += d


# ---- Parts -----------------------------------------------------------------
OST_PAT = [(0, 'r', 1), (1, 'r', 0), (2, '8', 0), (3, 'r', 1), (4, 'r', 0), (5, '5', 0), (6, 'r', 1), (7, '3', 0)]


def ostinato(b, vel, acc=22):
    """The 16th-note hammer: 3+3+2 accents per half bar, root / fifth / octave / third of the chord."""
    for half in (0, 1):
        pc, q, bass = HALF[2 * b + half]
        r = low(bass if bass != pc else pc, 45)
        for i, kind, a in OST_PAT:
            n = {'r': r, '5': low((pc + q[2]) % 12, r), '8': r + 12, '3': low((pc + q[1]) % 12, r)}[kind]
            note('ost', n, b * 4 + half * 2 + i * .25, .25, vel + (acc if a else 0), jitter=4, art=.55)


def basses(b, vel, tuba=False):
    for h in HIT:
        pc, q, bass = chord_at(b * 4 + h)
        n = low(bass, 31)
        note('bass', n, b * 4 + h, 1.4 if h < 3 else .9, vel, art=.7)
        note('cello', n + 12, b * 4 + h, 1.4 if h < 3 else .9, vel - 6, art=.7)
        if tuba:
            note('tuba', n, b * 4 + h, 1.2 if h < 3 else .8, vel - 8, art=.65)


def timpani(b, vel, fill=False):
    for h in HIT:
        pc, q, bass = chord_at(b * 4 + h)
        n = low(bass, 38)
        if n > 50:
            n -= 12
        note('timp', n, b * 4 + h, .5, vel if h == 0 else vel - 12, art=.9)
    if fill:
        for k, t in enumerate((3.5, 3.75)):
            note('timp', low(chord_at(b * 4)[2], 38), b * 4 + t, .25, vel - 10 + k * 8)


def taiko(b, vel):
    for h in HIT:
        note('taiko', 48, b * 4 + h, .5, vel if h == 0 else vel - 14, art=1)
    note('taiko', 43, b * 4 + 3.5, .3, vel - 20, art=1)


def anvil(b, vel):
    note('anvil', 79, b * 4 + 3, .3, vel, art=.8)


def snare(b, vel, fill=False):
    drum(SN, b * 4 + 1, vel); drum(SN, b * 4 + 3, vel + 6)
    drum(BD, b * 4, vel); drum(BD, b * 4 + 1.5, vel - 10)
    if fill:
        for k in range(4):
            drum(SN, b * 4 + 3 + k * .25, vel - 14 + k * 6)


def roll(b0, b1, v0, v1):
    steps = int((b1 - b0) * 4 * 4)
    for k in range(steps):
        drum(SN, b0 * 4 + k * .25, v0 + (v1 - v0) * k / steps, .12)


def stabs(tr, b, vel, top=60):
    """Brass chord hits on the forge rhythm, voiced closely under `top`."""
    for h in HIT:
        pc, q, bass = chord_at(b * 4 + h)
        r = low(pc, top - 12)
        for n in sorted({r, low((pc + q[1]) % 12, r), low((pc + q[2]) % 12, r)}):
            note(tr, n, b * 4 + h, .4 if h < 3 else .5, vel if h == 0 else vel - 8, art=.6)


def pad(tr, b, vel, lo=55, voices=3):
    """Sustained chord, a new voicing each half bar, kept near lo (nearest voicing to the last)."""
    for half in (0, 1):
        pc, q, bass = HALF[2 * b + half]
        ns = sorted(low((pc + i) % 12, lo) for i in q)[:voices]
        for n in ns:
            note(tr, n, b * 4 + half * 2, 2, vel, jitter=2, art=.98)


_counter_last = [65]


def counter(tr, b, vel, lo, hi):
    """A sustained counter line: per half bar, the chord tone nearest the last note (steps over leaps)."""
    for half in (0, 1):
        pc, q, bass = HALF[2 * b + half]
        last = _counter_last[0]
        opts = [n for n in range(lo, hi + 1) if n % 12 in {(pc + i) % 12 for i in q} and n != last]
        n = min(opts, key=lambda n: (abs(n - last), -n))
        _counter_last[0] = n
        note(tr, n, b * 4 + half * 2, 2, vel, art=.97)


def crash(b, vel=96):
    drum(CRASH, b * 4, vel, 2)


# ---- The arrangement -------------------------------------------------------
# A Gathering (0-3): the hammer alone, growing; the anvil; horn call and trombone answer
for b in bars('A', 4):
    ostinato(b, 60 + (b - SEC['A']) * 5)
    timpani(b, 72 + (b - SEC['A']) * 4, fill=b == SEC['A'] + 3)
    anvil(b, 74)
    if b >= SEC['A'] + 2:
        basses(b, 74)
cresc('ost', 0, 16, 92, 112)
melody('horn', SEC['A'] + 0, [0], -12, 92)                    # D F A, low and bare
for n, d, t in ((58, 1.5, 0), (55, .5, 1.5), (51, 2, 2)):     # Bb G Eb, the fall
    note('tbn', n, (SEC['A'] + 1) * 4 + t, d, 88, art=.85)
melody('horn', SEC['A'] + 2, [2], -12, 98)                    # D F A D
for n, d, t in ((58, 1.5, 0), (55, .5, 1.5), (51, 1, 2), (50, 1, 3)):
    note('tbn', n, (SEC['A'] + 3) * 4 + t, d, 94, art=.85)
    note('tuba', n - 12, (SEC['A'] + 3) * 4 + t, d, 86, art=.85)

# B Engage (4-11): the theme on horns and cellos, snare, brass stabs
crash(SEC['B'], 90)
melody('horn', SEC['B'], range(8), 0, 98, swell=12)
melody('cello', SEC['B'], range(8), -12, 84)
for b in bars('B', 8):
    ostinato(b, 66)
    basses(b, 82)
    timpani(b, 84, fill=b == SEC['B'] + 7)
    snare(b, 64, fill=b == SEC['B'] + 7)
    anvil(b, 70)
    stabs('tbn', b, 76, top=60)
    pad('trem', b, 50, lo=62)

# C Assault (12-19): violins and trumpets an octave up, horn counter line, everything louder
crash(SEC['C'], 104)
melody('vln', SEC['C'], range(8), 12, 100, swell=14)
melody('tpt', SEC['C'], range(8), 0, 96, art=.82)
_counter_last[0] = 62
for b in bars('C', 8):
    ostinato(b, 72)
    basses(b, 92, tuba=True)
    timpani(b, 94, fill=b == SEC['C'] + 7)
    snare(b, 76, fill=b in (SEC['C'] + 3, SEC['C'] + 7))
    anvil(b, 76)
    stabs('tbn', b, 86, top=60)
    counter('horn', b, 86, 57, 70)
    if b % 2 == 0:
        drum(CYM, b * 4, 64, 1)

# D Stalk (20-27): the drop. G minor, tremolo strings and choir, taiko, low horns then muted trumpet
crash(SEC['D'], 70)
for b in bars('D', 8):
    ostinato(b, 50, acc=18)
    taiko(b, 86)
    pad('trem', b, 66, lo=55)
    pad('choir', b, 58, lo=55)
    note('bass', low(HALF[2 * b][2], 31), b * 4, 4, 70, art=.98)
cresc('ost', SEC['D'] * 4, SEC['D'] * 4 + 1, 100, 96)
melody('horn', SEC['D'], range(4), 5 - 12, 92)                # the first half a 4th up, an octave down
melody('mute', SEC['D'] + 4, range(4, 8), 5 - 12, 92, art=.8)  # the second half, muted trumpet
for b in (SEC['D'] + 3, SEC['D'] + 7):
    for t in (3, 3.5):
        drum(BD, b * 4 + t, 70)

# E Gather (28-35): the opening figure in stretto, tuba to violins; an A pedal and a snare roll
STRETTO = [('tuba', -24), ('tbn', -12), ('horn', -12), ('horn', 0), ('tpt', 0), ('vln', 12)]
for b in bars('E', 8):
    k = b - SEC['E']
    ostinato(b, 58 + k * 3)
    pad('trem', b, 60 + k * 3, lo=57)
    if k < 4:
        taiko(b, 82 + k * 3)
        note('bass', low(HALF[2 * b][2], 31), b * 4, 4, 76, art=.98)
    else:
        basses(b, 80 + (k - 4) * 4, tuba=k >= 6)
        timpani(b, 84 + (k - 4) * 5)
    # the rising triad of the bar's chord, entering on each beat a little higher
    pc, q, bass = HALF[2 * b]
    for e in range(2):
        tr, sh = STRETTO[min(len(STRETTO) - 1, k * 2 // 3 + e)]
        lo, hi = PARTS[tr][4]
        r = low(pc, max(lo, 50 + sh + (k % 4) * 2))
        t = b * 4 + e * 2
        for j, iv in enumerate((0, q[1], q[2])):
            note(tr, r + iv, t + j * .5, .5 if j < 2 else 1, 84 + k * 3, art=.85)
cresc('ost', SEC['E'] * 4, (SEC['E'] + 8) * 4, 96, 116)
roll(SEC['E'] + 4, SEC['E'] + 8, 40, 100)
for b in (SEC['E'] + 6, SEC['E'] + 7):
    stabs('tbn', b, 82 + (b - SEC['E'] - 6) * 8, top=58)

# F Onslaught (36-43): the whole theme tutti
crash(SEC['F'], 112)
melody('vln', SEC['F'], range(8), 12, 108, swell=12)
melody('choir', SEC['F'], range(8), 0, 92)
melody('tpt', SEC['F'], range(8), 0, 104, art=.84)
melody('tbn', SEC['F'], range(8), -12, 92, art=.84)
_counter_last[0] = 65
for b in bars('F', 8):
    ostinato(b, 76)
    basses(b, 98, tuba=True)
    timpani(b, 100, fill=b in (SEC['F'] + 3, SEC['F'] + 7))
    taiko(b, 92)
    snare(b, 80, fill=b == SEC['F'] + 7)
    anvil(b, 80)
    counter('horn', b, 94, 57, 72)
    pad('trem', b, 64, lo=55)
    drum(CYM, b * 4, 70 if b % 2 else 82, 1)
    if b == SEC['F'] + 4:
        crash(b, 100)

# G Turn (44-47): hammer blows on Bb, Eb, A, falling back to the Gathering's level
crash(SEC['G'], 108)
for b in bars('G', 4):
    k = b - SEC['G']
    v = 104 - k * 10
    ostinato(b, 70 - k * 3)
    basses(b, v - 4, tuba=k < 3)
    timpani(b, v, fill=k == 3)
    stabs('tbn', b, v - 10, top=60)
    stabs('tpt', b, v - 14, top=72) if k < 2 else None
    stabs('horn', b, v - 12, top=67)
    anvil(b, 76)
    for h in HIT:
        drum(BD, b * 4 + h, v - 16)
note('choir', 69, SEC['G'] * 4 + 8, 8, 78, art=.95); note('choir', 61, SEC['G'] * 4 + 8, 8, 72, art=.95)
cresc('ost', SEC['G'] * 4, NBARS * 4, 112, 94)               # back to bar 0's expression for the loop
END_BEATS = NBARS * 4


def seconds(beat):
    return beat * 60 / BPM


# ---- output ----------------------------------------------------------------
ORDER = {'program_change': 0, 'control_change': 0, 'note_off': 1, 'note_on': 2}


def save(path, tail=0):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name', name='WizardsDuel battle theme'))
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
    for name, lst in ev.items():
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=name))
        last = 0
        for at_, msg in sorted(lst, key=lambda x: (max(0, x[0]), ORDER[x[1].type])):
            at_ = max(0, at_)
            tr.append(msg.copy(time=at_ - last)); last = at_
        tr.append(mido.MetaMessage('end_of_track', time=max(0, int((END_BEATS + tail) * TPB) - last)))
    mid.save(path)


def synth(mid_path, gain):
    tmp = tempfile.mkdtemp()
    raw = os.path.join(tmp, 'raw.wav')
    subprocess.run(['fluidsynth', '-ni', '-g', str(gain), '-r', '44100', '-F', raw, SF2, mid_path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    w = wave.open(raw); chn, sr = w.getnchannels(), w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, chn).astype(np.float32)
    return a, sr, tmp


def limit(x, sr, drive=1.6, ceil=.92):
    """Peak limiter (as in main_theme.py), run on the loop wrapped round so the seam gets the same gain."""
    pad = int(.5 * sr)
    x = np.concatenate([x[-pad:], x, x[:pad]]) * drive
    blk = 64
    n = len(x) // blk * blk
    env = np.abs(x[:n]).max(axis=1).reshape(-1, blk).max(axis=1)
    g = np.minimum(1, ceil / np.maximum(env, 1e-9))
    w = int(.012 * sr / blk)
    g = np.min(np.lib.stride_tricks.sliding_window_view(np.pad(g, w, mode='edge'), 2 * w + 1), axis=1)
    rel = int(.15 * sr / blk)
    out = g.copy()
    for i in range(1, len(out)):
        out[i] = min(g[i], out[i - 1] + (1 - out[i - 1]) / rel)
    k = np.ones(2 * w + 1) / (2 * w + 1)
    out = np.minimum(out, np.convolve(np.pad(out, w, mode='edge'), k, 'valid'))
    gain = np.interp(np.arange(len(x)), np.arange(len(out)) * blk + blk / 2, out)
    y = (x * gain[:, None])[pad:-pad]
    return y * min(1, ceil / np.abs(y).max())


def render(mp3_path, x3=False):
    tmpm = os.path.join(tempfile.mkdtemp(), 't.mid')
    save(tmpm, tail=12)                                   # render on past the end for the reverb tail
    gain = .45
    while True:
        a, sr, tmp = synth(tmpm, gain)
        peak = np.abs(a).max()
        if peak < 32000:
            break
        gain *= .75
    L = int(round(seconds(END_BEATS) * sr))
    loop = a[:L].copy()
    tail = a[L:]
    loop[:len(tail)] += tail[:L]                          # fold the ring past the end onto the start
    loop = limit(loop / np.abs(loop).max(), sr) * 32767
    out = os.path.join(tmp, 'loop.wav')
    o = wave.open(out, 'wb'); o.setnchannels(loop.shape[1]); o.setsampwidth(2); o.setframerate(sr)
    o.writeframes(loop.astype(np.int16).tobytes()); o.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-b:a', '160k', mp3_path], check=True)
    print('battle theme %.1f s, %d bars at %d bpm; synth gain %.2f, raw peak %d' % (L / sr, NBARS, BPM, gain, peak))
    if x3:
        p = os.path.join(os.environ.get('SCRATCH', tmp), 'battle_theme_x3.wav')
        o = wave.open(p, 'wb'); o.setnchannels(loop.shape[1]); o.setsampwidth(2); o.setframerate(sr)
        o.writeframes(np.tile(loop, (3, 1)).astype(np.int16).tobytes()); o.close()
        print('three times round:', p)
    return loop, sr


def check(a, sr):
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    nm = lambda n: '%s%d' % (names[n % 12], n // 12 - 1)
    print('\nSections')
    for k, b in SEC.items():
        print('  %5.1f s  bar %2d  %s' % (seconds(b * 4), b, k))
    print('\nRanges (lowest - highest, allowed)')
    for tr, lst in ev.items():
        ns = [m.note for _, m in lst if m.type == 'note_on']
        if tr == 'drums' or not ns:
            continue
        lo, hi = PARTS[tr][4]
        flag = '' if lo <= min(ns) and max(ns) <= hi else '   <-- OUT OF RANGE'
        print('  %-6s %-4s - %-4s (%s - %s)  %4d notes%s' % (tr, nm(min(ns)), nm(max(ns)), nm(lo), nm(hi), len(ns), flag))
    print('  channels used: %d melodic + drums' % len(chans))
    m = a.mean(axis=1) / 32767
    win = 5 * sr
    print('\nLoudness, RMS per 5 s (dBFS)')
    for i in range(0, len(m), win):
        seg = m[i:i + win]
        db = 20 * np.log10(max(1e-6, np.sqrt((seg ** 2).mean())))
        print('  %3d-%3d s %6.1f dB  %s' % (i / sr, min(len(m), i + win) / sr, db, '#' * max(0, int((db + 48) * 1.2))))
    print('  peak %.3f, overall RMS %.1f dB' % (np.abs(a).max() / 32767, 20 * np.log10(np.sqrt((m ** 2).mean()))))
    # the seam: the jump in sample value and in short-term loudness across the join
    w = int(.05 * sr)
    rms = lambda s: 20 * np.log10(max(1e-6, np.sqrt((s ** 2).mean())))
    print('\nSeam: last 50 ms %.1f dB, first 50 ms %.1f dB; sample step at the join %.4f (typical step %.4f)' % (
        rms(m[-w:]), rms(m[:w]), abs(m[0] - m[-1]), np.abs(np.diff(m)).mean()))


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    save(os.path.join(OUTDIR, 'battle_theme.mid'))
    if '--midi' not in sys.argv:
        a, sr = render(os.path.join(OUTDIR, 'battle_theme.mp3'), '--x3' in sys.argv)
        if '--check' in sys.argv:
            check(a, sr)
