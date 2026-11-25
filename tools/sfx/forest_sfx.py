# The Moriquende's sound effects, synthesised from scratch (numpy only, no samples or soundfont).
#   python3 tools/sfx/forest_sfx.py [name ...]      → audio/sfx/forest/<name>.mp3
#   python3 tools/sfx/forest_sfx.py --wav [name]    also keeps the .wav next to it, to listen closely
# Played by js/forest.js (FOREST_SFX): the signs at dawn, the week's big moments and your spell.
# Every sound is built from a seeded random stream, so a re-run gives the same files.
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'audio', 'sfx', 'forest')
rng = np.random.default_rng(7)


# ── building blocks ────────────────────────────────────────────────────
def T(sec): return np.arange(int(sec * SR)) / SR
def noise(sec): return rng.standard_normal(int(sec * SR))

def filt(x, lo=None, hi=None, order=2):
    """Band-limit by shaping the spectrum (a smooth Butterworth-like response)."""
    n = len(x); m = 1 << (n + SR // 4 - 1).bit_length()     # room so the response can't wrap round
    X = np.fft.rfft(x, m); f = np.fft.rfftfreq(m, 1 / SR); f[0] = 1e-3
    H = np.ones_like(f)
    if lo: H /= np.sqrt(1 + (lo / f) ** (2 * order))
    if hi: H /= np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * H, m)[:n]

def env(n, a, d, sustain_to=None):
    """Attack a seconds, then exponential decay with time constant d."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e

def place(buf, snd, at, gain=1.0):
    i = int(at * SR); j = min(len(buf), i + len(snd))
    if i < len(buf): buf[i:j] += snd[:j - i] * gain
    return buf

def reverb(x, rt=1.8, wet=0.35, dark=3500, pre=0.02):
    """Convolve with a decaying noise tail: a forest clearing, not a hall."""
    f = int(0.03 * SR); x = x.copy(); x[-f:] *= np.linspace(1, 0, f)   # never feed it a cut-off end
    L = int(rt * SR)
    t = np.arange(L) / SR
    ir = rng.standard_normal(L) * np.exp(-6.9 * t / rt)
    ir = filt(ir, 120, dark); ir[:int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    n = len(x) + L; m = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:n]
    out = np.concatenate([x, np.zeros(L)])
    return (1 - wet) * out + wet * y * 0.9

def glide(f0, f1, sec, curve=1.0):
    t = np.linspace(0, 1, int(sec * SR)); return f0 + (f1 - f0) * t ** curve

def osc(freq, partials=((1, 1),), vib=0.0, vib_hz=5.0):
    """Additive oscillator over a frequency track (array)."""
    n = len(freq); t = np.arange(n) / SR
    f = freq * (1 + vib * np.sin(2 * np.pi * vib_hz * t + rng.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(a * np.sin(k * ph + rng.uniform(0, 6)) for k, a in partials)

def trim(x, thresh=3e-3):
    k = np.where(np.abs(x) > thresh * np.abs(x).max())[0]
    return x[:k[-1] + int(0.05 * SR)] if len(k) else x

def finish(x, fade=0.04):
    x = trim(x); f = int(fade * SR)
    x[-f:] *= np.linspace(1, 0, f)
    return 0.9 * x / np.abs(x).max()


# ── drums ──────────────────────────────────────────────────────────────
def drum(f0=58, decay=0.55, drop=2.2, body=1.0, click=0.35, sec=1.4):
    """A skin drum: a pitch-dropping fundamental, a second mode, and the beater's click."""
    t = T(sec)
    f = f0 * (1 + drop * np.exp(-t / 0.018))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.35 * body * np.sin(1.59 * ph) * np.exp(-t / (decay * 0.4))
    tone *= np.exp(-t / decay)
    c = filt(noise(sec), 200, 1800) * np.exp(-t / 0.012) * click
    return tone + c

def war_drums():
    """Deep war drums in the forge rhythm 3+3+2 (the theme's), far off through the trees, then nearer."""
    bpm = 104; e = 60 / bpm / 2                      # an eighth
    out = np.zeros(int(8.0 * SR))
    hits = [0, 3, 6]                                  # 3+3+2 in eighths
    for bar in range(3):
        for i, h in enumerate(hits):
            at = (bar * 8 + h) * e
            near = 0.55 + 0.22 * bar
            place(out, drum(52 + rng.uniform(-2, 2), 0.7, click=0.25), at, near * (1.0 if i == 0 else 0.8))
            place(out, drum(78, 0.35, click=0.2), at + e * 0.5, 0.25 * near)   # a smaller drum answers
    out += filt(noise(len(out) / SR), 25, 90) * 0.05 * np.linspace(0.4, 1, len(out))   # the ground shakes
    out = filt(out, 30, 1400)
    return finish(reverb(out, rt=2.4, wet=0.42, dark=1800))

def goblin_drums():
    """Small skittering hand drums and clacking sticks, too quick and never quite in time."""
    out = np.zeros(int(3.0 * SR)); at = 0.0
    while at < 2.3:
        f = rng.choice([190, 230, 270, 330])
        place(out, drum(f, 0.09, drop=1.2, body=0.5, click=0.6, sec=0.35), at, rng.uniform(0.4, 0.9))
        if rng.random() < 0.35:   # sticks on a skull
            s = filt(noise(0.05), 1800, 6000) * env(int(0.05 * SR), 0.001, 0.008)
            place(out, s, at + 0.04, 0.5)
        at += rng.choice([0.07, 0.09, 0.11, 0.14, 0.2]) * rng.uniform(0.85, 1.2)
    out *= np.linspace(0.7, 1, len(out)) ** 2 * np.minimum(1, np.linspace(3, 0, len(out)))
    return finish(reverb(filt(out, 80, 5000), rt=1.4, wet=0.3, dark=3000))


# ── horns ──────────────────────────────────────────────────────────────
def horn(f, sec, scoop=0.94, bright=1.0, vib=0.004):
    """A great bull-horn: brassy harmonics that brighten as it swells, a scoop up to pitch, breath."""
    n = int(sec * SR); t = np.arange(n) / SR
    track = f * (1 - (1 - scoop) * np.exp(-t / 0.09))
    amp = np.minimum(1, t / 0.12) * np.minimum(1, (sec - t) / 0.35).clip(0, 1)
    parts = [(k, (1 / k) ** (1.3 - 0.5 * bright)) for k in range(1, 14)]
    tone = osc(track, parts, vib=vib, vib_hz=4.6)
    tone = filt(tone, 60, 900 + 2200 * bright)
    breath = filt(noise(sec), 300, 2500) * 0.04
    return (tone * amp + breath * amp) * (0.6 + 0.4 * amp)

def warhost():
    """The Warhost marches: two horn blasts, the drums at a march, and a roar of many throats."""
    out = np.zeros(int(7.5 * SR))
    place(out, horn(73.4, 2.2), 0.0, 1.0)              # D2
    place(out, horn(110, 1.0, bright=1.3), 2.4, 0.9)   # A2, short
    place(out, horn(73.4, 2.6, bright=1.2), 3.5, 1.0)
    bpm = 120; e = 60 / bpm / 2
    for k in range(int(6.8 / e)):
        if k % 8 in (0, 3, 6) or (k > 16 and k % 2 == 0):
            place(out, drum(50, 0.6, click=0.3), 0.6 + k * e, 0.55 if k % 8 == 0 else 0.35)
    roar = filt(noise(5.0), 250, 1100)
    roar *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.8 * T(5.0)) ** 2) * np.minimum(1, T(5.0) / 1.2)
    place(out, roar, 2.2, 0.22)
    return finish(reverb(filt(out, 30, 3500), rt=2.6, wet=0.38, dark=2200))

def horn_far():
    """One orc horn far off to the east: they've come."""
    out = horn(82.4, 2.6, bright=0.6)                   # E2
    return finish(reverb(filt(out, 50, 1200), rt=3.0, wet=0.55, dark=1500))

def horn_leave():
    """A horn sagging down as a band gives up and goes."""
    n = int(2.8 * SR); t = np.arange(n) / SR
    track = 98 * (1 - 0.18 * (t / t[-1]) ** 1.6)
    amp = np.minimum(1, t / 0.15) * np.linspace(1, 0, n) ** 0.7
    tone = filt(osc(track, [(k, (1 / k) ** 1.1) for k in range(1, 10)], vib=0.006), 50, 1600) * amp
    return finish(reverb(tone, rt=3.0, wet=0.5, dark=1500))


# ── the wild ───────────────────────────────────────────────────────────
def one_howl(f_lo, f_hi, sec, start_rise=0.35):
    n = int(sec * SR); u = np.linspace(0, 1, n)
    track = np.where(u < start_rise, f_lo + (f_hi - f_lo) * np.sin(np.pi / 2 * u / start_rise),
                     f_hi - (f_hi - f_lo * 0.8) * np.maximum(0, (u - start_rise) / (1 - start_rise)) ** 2.2)
    amp = np.minimum(1, u / 0.08) * np.minimum(1, (1 - u) / 0.25)
    tone = osc(track, [(1, 1), (2, 0.28), (3, 0.12), (4, 0.05)], vib=0.012, vib_hz=5.5)
    rough = filt(noise(sec), 400, 3000) * 0.04
    return (tone + rough) * amp

def howl():
    """Varg howling: one long voice, a second joins higher and later."""
    out = np.zeros(int(5.0 * SR))
    place(out, one_howl(330, 560, 3.2), 0.0, 1.0)
    place(out, one_howl(420, 680, 2.6, 0.3), 1.3, 0.6)
    return finish(reverb(filt(out, 200, 4000), rt=3.2, wet=0.5, dark=3000))

def timber():
    """A felled tree: the trunk groans, cracks, the crown rushes down, and the ground takes it."""
    out = np.zeros(int(5.0 * SR))
    # groan: a stick-slip creak, rough pulses whose rate climbs as it gives
    n = int(1.6 * SR); u = np.linspace(0, 1, n)
    rate = 18 + 70 * u ** 2
    ph = np.cumsum(rate * (1 + 0.15 * rng.standard_normal(n))) / SR
    pulses = (np.sin(2 * np.pi * ph) > 0.92).astype(float)
    creak = filt(pulses + 0.05 * rng.standard_normal(n), 250, 1400) * np.minimum(1, u * 3)
    place(out, creak, 0.0, 0.9)
    # crack
    crack = filt(noise(0.12), 400, 8000) * env(int(0.12 * SR), 0.0005, 0.02)
    place(out, crack, 1.6, 1.0)
    for k in range(6):   # splinters
        place(out, filt(noise(0.03), 1500, 7000) * env(int(0.03 * SR), 0.0005, 0.006), 1.62 + rng.uniform(0, 0.25), 0.5)
    # the crown through the air
    rush = filt(noise(1.1), 600, 5000) * np.sin(np.linspace(0, np.pi, int(1.1 * SR))) ** 2
    place(out, rush, 1.7, 0.35)
    # the fall
    t = T(2.0)
    thud = np.sin(2 * np.pi * 38 * t * (1 + 0.5 * np.exp(-t / 0.05))) * np.exp(-t / 0.45)
    thud += filt(noise(2.0), 30, 500) * np.exp(-t / 0.35) * 0.8
    place(out, thud, 2.75, 1.0)
    for k in range(5):   # branches snapping under it
        place(out, filt(noise(0.04), 900, 5000) * env(int(0.04 * SR), 0.0005, 0.01), 2.78 + rng.uniform(0, 0.4), 0.4)
    return finish(reverb(out, rt=2.2, wet=0.35, dark=2500))

def fire():
    """The trees burning: a low roar and a crackle of sap."""
    sec = 3.6; n = int(sec * SR); t = T(sec)
    roar = filt(noise(sec), 60, 450) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 0.23 * t))
    out = roar * 0.5
    at = 0.0
    while at < sec - 0.1:
        L = rng.uniform(0.004, 0.02)
        pop = filt(noise(L + 0.02), 800, 9000) * env(int((L + 0.02) * SR), 0.0003, L / 3)
        place(out, pop, at, rng.uniform(0.2, 1.0) ** 2)
        at += rng.exponential(0.035)
    out *= np.minimum(1, t / 0.5) * np.minimum(1, (sec - t) / 0.8)
    return finish(reverb(out, rt=1.0, wet=0.2, dark=4000))

def chirp(f0, f1, sec):
    n = int(sec * SR); u = np.linspace(0, 1, n)
    return osc(f0 + (f1 - f0) * u ** 0.7, [(1, 1), (2, 0.1)]) * np.sin(np.pi * u) ** 1.5

def birds():
    """Birds starting up from the trees: a clatter of wings and alarm calls."""
    out = np.zeros(int(2.8 * SR))
    # wings: noise chopped at a flapping rate, rising and thinning out
    sec = 1.6; n = int(sec * SR); t = T(sec)
    flap = (0.5 + 0.5 * np.sin(2 * np.pi * (14 + 6 * t) * t)) ** 3
    wings = filt(noise(sec), 500, 4500) * flap * np.exp(-t / 0.7) * np.minimum(1, t / 0.03)
    place(out, wings, 0.0, 0.8)
    for k in range(14):   # alarm calls
        f = rng.uniform(2600, 4200)
        place(out, chirp(f, f * rng.uniform(1.15, 1.5), rng.uniform(0.04, 0.09)), 0.1 + rng.uniform(0, 1.9), rng.uniform(0.15, 0.4))
    return finish(reverb(out, rt=1.6, wet=0.3, dark=6000))

def silence():
    """The wood falls silent: the last of the wind through the leaves, and nothing after."""
    sec = 3.2; t = T(sec)
    wind = filt(noise(sec), 120, 900) * (np.sin(np.pi * np.minimum(1, t / 2.2)) ** 2) * (1 + 0.3 * np.sin(2 * np.pi * 0.6 * t))
    leaves = filt(noise(sec), 2500, 7000) * 0.15 * np.exp(-t / 0.9) * np.minimum(1, (sec - t) / 0.6)
    return finish(reverb(wind + leaves, rt=2.5, wet=0.4, dark=2000))


# ── Elfhome's own ──────────────────────────────────────────────────────
def bell(f, sec=2.2):
    t = T(sec)
    return sum(a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t / d)
               for r, a, d in ((1, 1, 1.4), (2.76, 0.35, 0.6), (5.4, 0.15, 0.25), (0.5, 0.2, 1.8))) * np.minimum(1, t / 0.003)

def tend():
    """Sylvara tends an ancient tree: soft wooden-glass chimes in E Dorian, rising."""
    out = np.zeros(int(3.6 * SR))
    for i, f in enumerate((659.3, 987.8, 1174.7, 1318.5)):     # E5 B5 D6 E6
        place(out, bell(f), i * 0.22, 0.5 - 0.06 * i)
    shimmer = filt(noise(1.5), 4000, 9000) * np.sin(np.linspace(0, np.pi, int(1.5 * SR))) * 0.04
    place(out, shimmer, 0.3, 1.0)
    return finish(reverb(out, rt=2.6, wet=0.45, dark=6000))

def fight():
    """A clash in the trees: blades on blades, blows, a shield."""
    out = np.zeros(int(2.0 * SR))
    for at in (0.0, 0.32, 0.55, 0.95):
        sec = 0.8; t = T(sec)
        ring = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in
                   ((1180 * rng.uniform(0.9, 1.1), 1, 0.25), (2650, 0.6, 0.15), (4170, 0.4, 0.08), (5900, 0.2, 0.05)))
        hit = filt(noise(0.03), 1500, 9000) * env(int(0.03 * SR), 0.0003, 0.005)
        place(out, ring * 0.35, at, 1.0); place(out, hit, at, 0.8)
        place(out, drum(90, 0.12, drop=0.8, click=0.8, sec=0.4), at + 0.12, 0.6)   # a blow lands
    return finish(reverb(out, rt=1.2, wet=0.25, dark=5000))

def spell_strike():
    """Your strike: a gathering rush, then the blow."""
    out = np.zeros(int(1.8 * SR))
    sec = 0.55; u = np.linspace(0, 1, int(sec * SR))
    whoosh = filt(noise(sec), 300, 3000) * u ** 2
    whoosh += osc(glide(180, 720, sec, 2.0), [(1, 1), (2, 0.4), (3, 0.2)]) * u ** 3 * 0.3
    place(out, whoosh, 0.0, 0.8)
    t = T(1.0)
    boom = np.sin(2 * np.pi * 60 * t * (1 + 1.5 * np.exp(-t / 0.03))) * np.exp(-t / 0.3)
    boom += filt(noise(1.0), 100, 4000) * np.exp(-t / 0.08)
    place(out, boom, sec, 1.0)
    return finish(reverb(out, rt=1.6, wet=0.3, dark=4000))

def spell_ward():
    """Your ward: a thicket shoots up, branches creaking and leaves rushing, over a warm rising chord."""
    sec = 1.9; t = T(sec); u = t / sec
    out = np.zeros(int(2.6 * SR))
    chord = sum(osc(np.full(len(t), f) * (1 + 0.04 * u), [(1, 1), (2, 0.2)]) for f in (164.8, 246.9, 329.6, 392.0))
    place(out, chord * np.sin(np.pi * u) ** 1.5 * 0.25, 0.0)
    at = 0.0
    while at < sec - 0.2:   # leaves and twigs, thicker as it grows
        L = rng.uniform(0.03, 0.12)
        place(out, filt(noise(L), 1500, 7000) * np.sin(np.linspace(0, np.pi, int(L * SR))), at, 0.12 + 0.3 * at / sec)
        at += rng.exponential(0.05 * (1.2 - at / sec))
    for k in range(4):
        place(out, filt(noise(0.03), 600, 2500) * env(int(0.03 * SR), 0.0005, 0.008), 0.4 + k * 0.35 + rng.uniform(0, 0.1), 0.5)
    return finish(reverb(out, rt=1.8, wet=0.35, dark=5000))

def spell_dispel():
    """Your dispel: a glassy shimmer that unravels downward and snaps."""
    sec = 1.3; t = T(sec); u = t / sec
    out = np.zeros(int(2.4 * SR))
    for f in (1760, 2217, 2637):
        place(out, osc(glide(f, f * 0.45, sec, 1.5), [(1, 1), (3, 0.15)]) * (1 + 0.5 * np.sin(2 * np.pi * 11 * t)) * np.sin(np.pi * u) * 0.25, 0.0)
    snap = filt(noise(0.06), 2000, 10000) * env(int(0.06 * SR), 0.0003, 0.012)
    place(out, snap, sec * 0.92, 0.45)
    return finish(reverb(out, rt=1.6, wet=0.3, dark=4500))


SOUNDS = {
    'drums_war': war_drums, 'drums_goblin': goblin_drums, 'warhost': warhost,
    'horn_far': horn_far, 'horn_leave': horn_leave,
    'howl': howl, 'timber': timber, 'fire': fire, 'birds': birds, 'silence': silence,
    'tend': tend, 'fight': fight,
    'spell_strike': spell_strike, 'spell_ward': spell_ward, 'spell_dispel': spell_dispel,
}


def write(name, x, keep_wav=False):
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(tempfile.mkdtemp(), name + '.wav')
    w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-b:a', '96k', mp3], check=True)
    if keep_wav: os.replace(tmp, os.path.join(OUT, name + '.wav'))
    print('%-14s %4.1f s  %3d KB' % (name, len(x) / SR, os.path.getsize(mp3) // 1024))


if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(SOUNDS)
    for n in names:
        rng = np.random.default_rng(sum(map(ord, n)))     # each sound its own fixed stream
        write(n, SOUNDS[n](), '--wav' in sys.argv)
