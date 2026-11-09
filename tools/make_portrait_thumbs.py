"""Generate downscaled portrait copies for the UI.

The originals in portraits/*.png are 1000-1500 px source art (~2-3 MB each).
The UI only ever shows them small, so it loads these instead:
  portraits/small/<key>.jpg  - 256x256 close-up of the face (cards, HUD, chat
                               avatars, reveal cards), cropped using FACES below
  portraits/medium/<key>.jpg - whole portrait, shortest side 720 px (character
                               detail panel)

FACES gives each portrait's face crop as (cx, cy, size): the centre of the
square as fractions of the image width / height, and its side as a fraction of
the image width. A portrait missing from FACES falls back to the top-centre
square. When adding a portrait, add its entry, run the script, and check the
crop with:  python3 tools/make_portrait_thumbs.py --preview out.png

Re-run after adding or changing a portrait:  python3 tools/make_portrait_thumbs.py
"""
import glob, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'portraits')
SMALL = 256
MEDIUM = 720

FACES = {
    'aurelia':   (0.475, 0.21, 0.34),
    'cinder':    (0.52, 0.21, 0.32),
    'durin':     (0.47, 0.24, 0.36),
    'eldrin':    (0.47, 0.25, 0.32),
    'emberic':   (0.44, 0.22, 0.32),
    'fizzwick':  (0.455, 0.28, 0.34),
    'gnash':     (0.51, 0.33, 0.38),
    'gretch':    (0.55, 0.18, 0.34),
    'korvath':   (0.48, 0.20, 0.36),
    'mal':       (0.47, 0.30, 0.36),
    'mary':      (0.45, 0.27, 0.32),
    'mirel':     (0.56, 0.23, 0.32),
    'mordant':   (0.40, 0.21, 0.32),
    'nyxara':    (0.52, 0.19, 0.30),
    'ponder':    (0.53, 0.28, 0.34),
    'skadi':     (0.43, 0.22, 0.34),
    'sylvara':   (0.48, 0.25, 0.34),
    'thessaly':  (0.49, 0.18, 0.30),
    'valdris':   (0.43, 0.17, 0.32),
    'weizan':    (0.48, 0.19, 0.30),
    'zacharius': (0.43, 0.24, 0.34),
}


def face_box(key, im):
    cx, cy, size = FACES.get(key, (0.5, 0.25, 0.5))
    side = round(size * im.width)
    left = round(cx * im.width - side / 2)
    top = round(cy * im.height - side / 2)
    left = max(0, min(im.width - side, left))
    top = max(0, min(im.height - side, top))
    return (left, top, left + side, top + side)


def sources():
    return sorted(glob.glob(os.path.join(ROOT, '*.png')))


def save(im, folder, key):
    os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
    im.save(os.path.join(ROOT, folder, key + '.jpg'), 'JPEG', quality=85, optimize=True, progressive=True)


def build():
    for src in sources():
        key = os.path.splitext(os.path.basename(src))[0]
        im = Image.open(src).convert('RGB')
        face = im.crop(face_box(key, im))
        save(face.resize((SMALL, SMALL), Image.LANCZOS) if face.width > SMALL else face, 'small', key)
        scale = MEDIUM / min(im.size)
        med = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale < 1 else im
        save(med, 'medium', key)
        print(key)


def preview(out):
    """Contact sheet: each portrait with its crop box, and the crop beside it."""
    cell = 200
    srcs = sources()
    cols = 4
    rows = (len(srcs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell * 2, rows * (int(cell * 1.5) + 4)), 'black')
    for i, src in enumerate(srcs):
        key = os.path.splitext(os.path.basename(src))[0]
        im = Image.open(src).convert('RGB')
        box = face_box(key, im)
        sc = cell / im.width
        thumb = im.resize((cell, round(im.height * sc)))
        d = ImageDraw.Draw(thumb)
        d.rectangle([v * sc for v in box], outline=(255, 255, 0), width=2)
        d.text((4, 4), key, fill='yellow')
        x, y = (i % cols) * cell * 2, (i // cols) * (int(cell * 1.5) + 4)
        sheet.paste(thumb, (x, y))
        sheet.paste(im.crop(box).resize((cell, cell)), (x + cell, y))
    sheet.save(out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--preview':
        preview(sys.argv[2])
    else:
        build()
