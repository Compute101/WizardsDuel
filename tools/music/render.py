# Render Corvanthe's district themes to seamless MP3 loops.
#   python3 tools/music/render.py [sector ...] [--x3]
# Needs: mido, numpy, fluidsynth, ffmpeg and a GM soundfont
#   (apt-get install fluidsynth fluid-soundfont-gm). --x3 also writes <sector>_x3.mp3
# (the loop three times, to check the seam by ear).
# The reverb tail past the loop's end is folded back onto its start, so the
# loop joins without a gap or a cut-off echo.
import os, subprocess, sys, tempfile, wave
import numpy as np
import corvanthe as cv

SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TAIL_BEATS = 8


def render(name, x3=False):
    mid = cv.build(name)
    for tr in mid.tracks:
        tr[-1].time += TAIL_BEATS * cv.TPB
    tmp = tempfile.mkdtemp()
    mpath, raw, loop = (os.path.join(tmp, f) for f in ('t.mid', 'raw.wav', 'loop.wav'))
    mid.save(mpath)
    subprocess.run(
        ['fluidsynth', '-ni', '-g', '0.6', '-r', '44100', '-F', raw, SF2, mpath],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    w = wave.open(raw)
    ch, sr = w.getnchannels(), w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).astype(np.float32)
    L = int(round(cv.loop_seconds(name) * sr))
    out = a[:L].copy()
    tail = a[L:]
    out[: len(tail)] += tail[:L]
    out *= 0.89 * 32767 / np.abs(out).max()
    o = wave.open(loop, 'wb')
    o.setnchannels(ch)
    o.setsampwidth(2)
    o.setframerate(sr)
    o.writeframes(out.astype(np.int16).tobytes())
    o.close()
    os.makedirs(cv.OUT, exist_ok=True)
    mid_out = cv.build(name)
    mid_out.save(os.path.join(cv.OUT, name + '.mid'))
    ff = ['ffmpeg', '-y', '-loglevel', 'error']
    subprocess.run(ff + ['-i', loop, '-b:a', '160k', os.path.join(cv.OUT, name + '.mp3')], check=True)
    if x3:
        subprocess.run(
            ff + ['-stream_loop', '2', '-i', loop, '-b:a', '160k', os.path.join(cv.OUT, name + '_x3.mp3')],
            check=True,
        )
    print('%-12s %5.1f s' % (name, L / sr))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for n in args or cv.SECTORS:
        render(n, '--x3' in sys.argv)
