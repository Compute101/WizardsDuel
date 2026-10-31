"""Generate downscaled portrait copies for the UI.

The originals in portraits/*.png are 1000-1500 px source art (~2-3 MB each).
The UI only ever shows them small, so it loads these instead:
  portraits/small/<key>.jpg  - shortest side 256 px (cards, HUD, chat avatars)
  portraits/medium/<key>.jpg - shortest side 720 px (character detail panel)

Re-run after adding or changing a portrait:  python3 tools/make_portrait_thumbs.py
"""
import glob, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'portraits')
SIZES = {'small': 256, 'medium': 720}

for src in sorted(glob.glob(os.path.join(ROOT, '*.png'))):
    key = os.path.splitext(os.path.basename(src))[0]
    im = Image.open(src).convert('RGB')
    for folder, short in SIZES.items():
        os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
        scale = short / min(im.size)
        out = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale < 1 else im
        out.save(os.path.join(ROOT, folder, key + '.jpg'), 'JPEG', quality=85, optimize=True, progressive=True)
    print(key)
