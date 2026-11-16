# A small sample player: renders the music MIDI through real orchestral recordings
# (VSCO 2 Community Edition, CC0: https://github.com/sgossner/VSCO-2-CE) instead of the
# FluidR3 General MIDI soundfont. Parts with no samples (choir, synth pads, effects)
# still come from FluidR3 and are mixed in.
#
#   python3 tools/music/sampler.py <sector|main> [--x3]
#   VSCO=/path/to/VSCO-2-CE (default /tmp/claude-0/snd/vsco), clone it with
#   git clone --depth 1 https://github.com/sgossner/VSCO-2-CE.git
#
# How it plays a note: the nearest recorded pitch, resampled to the exact note; a
# velocity layer by loudness and round robins when the library has them; short notes
# use a short articulation (spiccato, staccato) where there is one; a release fade at
# note-off. Then stereo seating, a synthetic concert-hall reverb, and a master limiter.
import os, re, glob, struct, subprocess, sys, tempfile, wave
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
VSCO = os.environ.get('VSCO', '/tmp/claude-0/snd/vsco')
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
SR = 44100

# ---- reading samples ---------------------------------------------------------
_wav = {}


def read_wav(path):
    if path in _wav:
        return _wav[path]
    with open(path, 'rb') as f:
        data = f.read()
    pos, fmt, raw = 12, None, None
    while pos < len(data) - 8:
        cid, size = data[pos:pos + 4], struct.unpack('<I', data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if cid == b'fmt ':
            fmt = struct.unpack('<HHIIHH', body[:16])
        elif cid == b'data':
            raw = body
        pos += 8 + size + (size & 1)
    _, ch, sr, _, _, bits = fmt
    if bits == 16:
        a = np.frombuffer(raw[:len(raw) // 2 * 2], dtype='<i2').astype(np.float32) / 32768
    else:  # 24-bit
        b = np.frombuffer(raw[:len(raw) // 3 * 3], dtype=np.uint8).reshape(-1, 3)
        a = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        a = np.where(a >= 1 << 23, a - (1 << 24), a).astype(np.float32) / (1 << 23)
    a = a[:len(a) // ch * ch].reshape(-1, ch)
    if ch == 1:
        a = np.repeat(a, 2, axis=1)
    peak = np.abs(a).max() or 1
    on = np.nonzero(np.abs(a).max(axis=1) > peak * .02)[0]   # skip the silence before the attack
    start = max(0, (on[0] if len(on) else 0) - int(.004 * sr))
    _wav[path] = a[start:]
    return _wav[path]


NOTE = re.compile(r'(?<![A-Za-z])([A-G]#?)(-?\d)(?=[_.])')
PCS = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def detect_midi(a):
    """Rough pitch of a sample (harmonic product spectrum), as a MIDI number."""
    m = a.mean(axis=1)
    seg = m[int(.08 * SR):int(.08 * SR) + 16384]
    if len(seg) < 4096:
        seg = m[:16384]
    seg = seg * np.hanning(len(seg))
    sp = np.abs(np.fft.rfft(seg, 1 << 16))
    hps = sp.copy()
    for k in (2, 3):
        d = sp[::k]
        hps[:len(d)] *= d
    lo = int(25 / (SR / (1 << 16)))
    i = lo + np.argmax(hps[lo:len(sp) // 3])
    f = i * SR / (1 << 16)
    return 69 + 12 * np.log2(f / 440) if f > 0 else None


class Inst:
    """One articulation of one instrument: a folder of note-named samples."""

    def __init__(self, folders, pattern='*.wav', release=.25, gain=1.0, fixed=None):
        self.release, self.gain = release, gain
        self.notes = {}     # midi -> {layer: [paths]}
        files = []
        for fo in folders if isinstance(folders, (list, tuple)) else [folders]:
            files += sorted(glob.glob(os.path.join(VSCO, fo, pattern)))
        if fixed:           # {midi: [paths]} for unnamed samples (timpani drums, anvil)
            for n, ps in fixed.items():
                for p in ps:
                    self._add(n, p)
            self._layers()
            return
        named = []
        for p in files:
            m = NOTE.search(os.path.basename(p))
            if m:
                named.append((PCS[m.group(1)], int(m.group(2)), p))
        if not named:
            raise ValueError('no samples in %s' % folders)
        # octave convention: compare names with detected pitch (C3=60 or C4=60)
        probe = named[::max(1, len(named) // 6)][:6]
        best, err = 2, 1e9
        for off in (1, 2):
            e = 0
            for pc, o, p in probe:
                d = detect_midi(read_wav(p))
                if d is not None:
                    x = d - (12 * (o + off) + pc)
                    e += min(abs(x), abs(x - 12 * round(x / 12)) + 3)
            if e < err:
                best, err = off, e
        for pc, o, p in named:
            self._add(12 * (o + best) + pc, p)
        self._layers()

    def _add(self, n, p):
        m = re.search(r'_v(\d+)', os.path.basename(p)) or re.search(r'_(pp|p|mp|mf|f|ff|fff)[_.]', os.path.basename(p))
        dyn = {'pp': 1, 'p': 2, 'mp': 3, 'mf': 4, 'f': 5, 'ff': 6, 'fff': 7}
        layer = int(m.group(1)) if m and m.group(1).isdigit() else dyn.get(m.group(1), 1) if m else 1
        self.notes.setdefault(n, {}).setdefault(layer, []).append(p)

    def _layers(self):
        self.keys = sorted(self.notes)
        self.rr = {}

    def pick(self, n, vel):
        k = min(self.keys, key=lambda s: (abs(s - n), s < n))   # nearest, prefer pitching down
        layers = sorted(self.notes[k])
        li = layers[min(len(layers) - 1, int(vel / 128 * len(layers)))]
        paths = self.notes[k][li]
        r = self.rr.get((k, li), 0)
        self.rr[(k, li)] = r + 1
        return k, paths[r % len(paths)]


def V(*parts):
    return os.path.join(*parts)


_insts = {}


def inst(key):
    if key in _insts:
        return _insts[key]
    d = {
        'vln': lambda: Inst(V('Strings', 'Violin Section', 'susVib'), release=.35),
        'vln_s': lambda: Inst(V('Strings', 'Violin Section', 'Spic'), release=.08),
        'vln_trem': lambda: Inst(V('Strings', 'Violin Section', 'Trem'), release=.3),
        'vla': lambda: Inst(V('Strings', 'Viola Section', 'susvib'), release=.35),
        'vla_s': lambda: Inst(V('Strings', 'Viola Section', 'spic'), release=.08),
        'vc': lambda: Inst(V('Strings', 'Cello Section', 'susvib'), release=.35),
        'vc_s': lambda: Inst(V('Strings', 'Cello Section', 'spic'), release=.08),
        'vc_trem': lambda: Inst(V('Strings', 'Cello Section', 'trem'), release=.3),
        'cb': lambda: Inst(V('Strings', 'Solo Contrabass', 'SusNV'), release=.35, gain=1.3),
        'cb_s': lambda: Inst(V('Strings', 'Solo Contrabass', 'Spic'), release=.1, gain=1.3),
        'cb_trem': lambda: Inst(V('Strings', 'Solo Contrabass', 'Trem'), release=.3, gain=1.3),
        'vln_pizz': lambda: Inst(V('Strings', 'Violin Section', 'Pizz'), release=.2),
        'vc_pizz': lambda: Inst(V('Strings', 'Cello Section', 'pizzT'), release=.2),
        'harp': lambda: Inst(V('Strings', 'Harp'), release=1.2),
        'hn': lambda: Inst(V('Brass', 'F Horn', 'sus'), release=.3),
        'hn_s': lambda: Inst(V('Brass', 'F Horn', 'stac'), release=.12),
        'tpt': lambda: Inst(V('Brass', 'Trumpet', 'sus'), release=.25),
        'tpt_s': lambda: Inst(V('Brass', 'Trumpet', 'stac'), release=.1),
        'tbn': lambda: Inst(V('Brass', 'Tenor Trombone', 'sus'), release=.25),
        'tbn_s': lambda: Inst(V('Brass', 'Tenor Trombone', 'stac'), release=.1),
        'tuba': lambda: Inst(V('Brass', 'Tuba', 'sus'), release=.3),
        'picc': lambda: Inst(V('Woodwinds', 'Piccolo', 'Sus'), release=.2),
        'fl': lambda: Inst(V('Woodwinds', 'Flute', 'susvib'), release=.25),
        'ob': lambda: Inst(V('Woodwinds', 'Oboe', 'Vib'), release=.2),
        'cl': lambda: Inst(V('Woodwinds', 'Clarinet', 'susLong'), release=.2),
        'bsn': lambda: Inst(V('Woodwinds', 'Bassoon', 'sus'), release=.2),
        'glock': lambda: Inst(V('Percussion', 'Glock'), release=1.5, gain=.6),
        'marimba': lambda: Inst(V('Percussion', 'Marimba'), release=.8),
        'tubular': lambda: Inst('Percussion', 'TB_hit_*.wav', release=3),
        'organ': lambda: Inst(V('Keys', 'Organ', '*'), '*.wav', release=.4, gain=.7),
        'timp': lambda: timpani(),
        'anvil': lambda: Inst('', fixed={74: glob.glob(V(VSCO, 'Percussion', 'Anvil_Hit1_v*_Sum.wav'))}, release=2, gain=.8),
    }
    _insts[key] = d[key]()
    return _insts[key]


def timpani():
    fixed = {}
    for k in range(1, 6):
        ps = sorted(glob.glob(V(VSCO, 'Percussion', 'Timpani', 'Timpani%d_Hit_v*_Sum.wav' % k)))
        if ps:
            n = detect_midi(read_wav(ps[-1]))
            n = int(round(n)) if n else 40 + k * 3
            while n > 57:
                n -= 12
            while n < 38:
                n += 12
            fixed.setdefault(n, []).extend(ps)
    return Inst('', fixed=fixed, release=1.5, gain=1.2)


# GM program -> (long articulation, short articulation, pan, reverb send). A list picks by pitch.
SPLIT_STR = [(55, 'vc'), (67, 'vla'), (200, 'vln')]
SPLIT_STR_S = [(55, 'vc_s'), (67, 'vla_s'), (200, 'vln_s')]
SPLIT_TREM = [(50, 'cb_trem'), (60, 'vc_trem'), (200, 'vln_trem')]
PROG = {
    40: ('vln', 'vln_s', -.35, .3), 41: ('vla', 'vla_s', .1, .3), 42: ('vc', 'vc_s', .3, .28),
    43: ('cb', 'cb_s', .45, .25), 44: (SPLIT_TREM, SPLIT_TREM, 0, .3), 45: ('vc_pizz', 'vc_pizz', .2, .3),
    48: (SPLIT_STR, SPLIT_STR_S, 0, .32), 49: (SPLIT_STR, SPLIT_STR, 0, .34), 46: ('harp', 'harp', -.45, .35),
    56: ('tpt', 'tpt_s', .15, .3), 57: ('tbn', 'tbn_s', .3, .3), 58: ('tuba', 'tuba', .35, .28),
    60: ('hn', 'hn_s', -.2, .38), 61: ('hn', 'hn_s', 0, .35), 72: ('picc', 'picc', -.1, .3),
    73: ('fl', 'fl', -.15, .32), 68: ('ob', 'ob', -.05, .3), 69: ('ob', 'ob', -.05, .3), 71: ('cl', 'cl', .1, .3),
    70: ('bsn', 'bsn', .15, .3), 9: ('glock', 'glock', .2, .35), 8: ('glock', 'glock', .2, .4),
    12: ('marimba', 'marimba', .2, .3), 14: ('tubular', 'tubular', .25, .4), 19: ('organ', 'organ', 0, .4),
    47: ('timp', 'timp', 0, .3),
}
DRUMS = {  # GM drum note -> glob in Percussion (velocity layers from the names)
    35: 'BDrumNewhit_v*', 36: 'BDrumNewhit_v*', 38: 'Snare2-HitSN_v*', 49: 'cymbal-crash1_*', 57: 'cymbal-crash1_*',
    51: 'susCymb1-hitstick_*', 80: 'Triangle3-HitM_v*', 81: 'Triangle3-Hit_v*', 83: 'Sleighbells_Hit_*',
    75: 'Claves1_Hit_v*', 76: 'LogDrumHi_MedM_v*', 77: 'LogDrumLo_MedM_v*', 82: 'Tamb1-Shake_v*',
}
_drums = {}


def drum(n):
    if n not in _drums:
        ps = glob.glob(V(VSCO, 'Percussion', DRUMS[n] + '.wav'))
        _drums[n] = Inst('', fixed={60: ps}, release=2.5, gain={35: 1.3, 36: 1.3, 38: .7, 49: .6, 57: .6, 51: .5}.get(n, .6))
    return _drums[n]


def choose(spec, n):
    if isinstance(spec, list):
        return next(k for top, k in spec if n < top)
    return spec


# ---- the renderer --------------------------------------------------------------
def notes_of(mid):
    """[(track, prog, channel, note, start_s, dur_s, vel)] from a MIDI file."""
    tempo, out = 500000, []
    for tr in mid.tracks:
        for m in tr:
            if m.type == 'set_tempo':
                tempo = m.tempo
    for ti, tr in enumerate(mid.tracks):
        t, prog, on = 0, {}, {}
        for m in tr:
            t += m.time
            if m.type == 'program_change':
                prog[m.channel] = m.program
            elif m.type == 'note_on' and m.velocity > 0:
                on[(m.channel, m.note)] = (t, m.velocity)
            elif m.type in ('note_off', 'note_on') and (m.channel, m.note) in on:
                s, v = on.pop((m.channel, m.note))
                sec = mido.tick2second
                out.append((ti, prog.get(m.channel, 0), m.channel, m.note, sec(s, mid.ticks_per_beat, tempo),
                            sec(t - s, mid.ticks_per_beat, tempo), v))
    return out


def place(buf, a, at):
    e = min(len(buf), at + len(a))
    if e > at:
        buf[at:e] += a[:e - at]


def play(ins, n, dur, vel):
    k, path = ins.pick(n, vel)
    a = read_wav(path)
    ratio = 2 ** ((n - k) / 12)
    need = int((dur + ins.release) * SR)
    src_len = min(len(a), int(need * ratio) + 2)
    if ratio != 1:
        idx = np.arange(0, src_len - 1, ratio)
        a = np.stack([np.interp(idx, np.arange(src_len), a[:src_len, c]) for c in (0, 1)], axis=1)
    else:
        a = a[:src_len].copy()
    off = int(dur * SR)
    rel = int(ins.release * SR)
    if len(a) > off:                       # release from note-off
        tail = a[off:off + rel]
        tail *= np.linspace(1, 0, len(tail))[:, None] ** 2
        a = a[:off + len(tail)]
    a *= ins.gain * level(path) * (vel / 127) ** 2
    return a


_lvl = {}


def level(path):
    """Gain that brings a sample to a common loudness (its first half second), so velocity,
    not which dynamic layer was recorded louder, sets how loud a note plays."""
    if path not in _lvl:
        a = read_wav(path)[:int(.5 * SR)]
        _lvl[path] = .12 / max(1e-4, float(np.sqrt((a ** 2).mean())))
    return _lvl[path]


def pan(a, p):
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    return a * np.array([l, r], dtype=np.float32) * 1.41


def hall_ir(sec=2.6, pre=.022, seed=3):
    rng = np.random.default_rng(seed)
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)).astype(np.float32) * np.exp(-6.9 * t / sec)[:, None]
    # darker as it decays: blend a smoothed copy in over time
    k = 24
    sm = np.cumsum(ir, axis=0)
    sm[k:] = sm[k:] - sm[:-k]
    sm /= k
    w = np.clip(t / 1.2, 0, 1)[:, None]
    ir = ir * (1 - w) * .5 + sm * w * 2.2
    ir[:int(.05 * SR)] *= np.linspace(.2, 1, int(.05 * SR))[:, None]
    ir = np.concatenate([np.zeros((int(pre * SR), 2), np.float32), ir])
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def convolve(x, ir):
    n = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    out = np.empty((len(x) + len(ir) - 1, 2), np.float32)
    for c in (0, 1):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], n) * np.fft.rfft(ir[:, c], n), n)[:len(out)]
    return out


def fluid_part(mid, tracks, length):
    """Render only the given tracks with FluidR3 (no reverb of its own), for parts with no samples."""
    m = mido.MidiFile(ticks_per_beat=mid.ticks_per_beat)
    for i, tr in enumerate(mid.tracks):
        if i in tracks or any(x.type == 'set_tempo' for x in tr):
            nt = mido.MidiTrack()
            for x in tr:
                if x.type in ('note_on', 'note_off') and i not in tracks:
                    nt.append(mido.MetaMessage('marker', text='', time=x.time))
                elif x.type == 'control_change' and x.control == 91:
                    nt.append(x.copy(value=0))
                else:
                    nt.append(x)
            m.tracks.append(nt)
    tmp = tempfile.mkdtemp()
    p, w = os.path.join(tmp, 'f.mid'), os.path.join(tmp, 'f.wav')
    m.save(p)
    subprocess.run(['fluidsynth', '-ni', '-R', '0', '-C', '0', '-g', '0.5', '-r', str(SR), '-F', w, SF2, p],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wv = wave.open(w)
    a = np.frombuffer(wv.readframes(wv.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
    out = np.zeros((length, 2), np.float32)
    place(out, a, 0)
    return out


# Per-piece instrument swaps: Cindergate's "bell" part is a smith's anvil.
OVERRIDES = {'cindergate': {14: ('anvil', 'anvil', .25, .35)}}


def render(mid, seconds, tail=4.0, over=None):
    progs = {**PROG, **(over or {})}
    L = int((seconds + tail) * SR)
    dry = np.zeros((L, 2), np.float32)
    send = np.zeros((L, 2), np.float32)
    fallback, missing = set(), set()
    for ti, prog, chn, n, s, d, v in notes_of(mid):
        at = int(s * SR)
        if chn == 9:
            if n not in DRUMS:
                fallback.add(ti); missing.add('drum %d' % n); continue
            a = play(drum(n), 60, max(d, 1.5), v)
            p, rv = (.1 if n in (49, 57, 51) else 0), .3
        elif prog in progs:
            long_, short_, p, rv = progs[prog]
            spec = short_ if d < .32 else long_
            a = play(inst(choose(spec, n)), n, d, v)
        else:
            fallback.add(ti); missing.add('program %d' % prog); continue
        a = pan(a, p)
        place(dry, a, at)
        place(send, a * rv, at)
    if fallback:
        f = fluid_part(mid, fallback, L) * 1.6
        place(dry, f, 0)
        place(send, f * .4, 0)
        print('  from FluidR3:', ', '.join(sorted(missing)))
    wet = convolve(send, hall_ir())[:L]
    mix = dry * .8 + wet * 1.1
    return mix


def master(a):
    a = a / (np.abs(a).max() or 1)
    a = np.tanh(a * 1.4) / np.tanh(1.4)     # gentle limiter
    return a * .9


def write_mp3(a, path):
    tmp = tempfile.mkdtemp()
    w = os.path.join(tmp, 'o.wav')
    o = wave.open(w, 'wb')
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR)
    o.writeframes((a * 32767).astype(np.int16).tobytes()); o.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-b:a', '192k', path], check=True)


def render_sector(name, x3=False):
    import corvanthe as cv
    mid = cv.build(name)
    secs = cv.loop_seconds(name)
    a = render(mid, secs, tail=4, over=OVERRIDES.get(name))
    L = int(round(secs * SR))
    loop = a[:L].copy()
    loop[:len(a) - L] += a[L:]                  # fold the hall's tail onto the start
    loop = master(loop)
    out = os.path.join(cv.OUT, name + '_hq.mp3')
    write_mp3(loop, out)
    if x3:
        write_mp3(np.concatenate([loop] * 3), os.path.join(cv.OUT, name + '_hq_x3.mp3'))
    print('%s -> %s' % (name, out))


def render_main(module='main_theme'):
    mod = __import__(module)
    tmp = os.path.join(tempfile.mkdtemp(), 'm.mid')
    mod.save(tmp)
    mid = mido.MidiFile(tmp)
    a = render(mid, mid.length, tail=3)
    loud = np.nonzero(np.abs(a).max(axis=1) > np.abs(a).max() * .004)[0]
    a = a[:loud[-1] + int(.3 * SR)]
    a = master(a)
    f = int(1.2 * SR)
    a[-f:] *= np.linspace(1, 0, f)[:, None]
    out = os.path.join(HERE, '..', '..', 'audio', module + '_hq.mp3')
    write_mp3(a, out)
    print('%s -> %s (%.1f s)' % (module, out, len(a) / SR))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for name in args:
        if name.startswith('main'):
            render_main(name)
        else:
            render_sector(name, '--x3' in sys.argv)
