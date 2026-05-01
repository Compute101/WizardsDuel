"""
Sprite generator for WizardsDuel.
Composites PNG layers and applies palette swaps to produce final character sprites.

Spritesheet format: 48x64px frames, 4 columns x 5 rows (192x320 total).

Layer files live in sprites/layers/<slot>/<name>.png
Each layer must be 192x320 with transparency where not used.

Slots (composited bottom to top):
  body/   - base character shape (required, e.g. mage-f, mage-m)
  hair/   - hairstyle overlay (optional, use "none" to skip)
  hat/    - hat overlay (optional, use "none" to skip)
  staff/  - staff overlay (optional, use "none" to skip)

To add a new character:
  1. Add an entry to CHARACTERS below
  2. Run: python3 generate_sprites.py

To add a new layer variant (e.g. a new hat):
  1. Create sprites/layers/hat/my-hat.png (192x320, RGBA)
  2. Reference it in a character entry as "hat": "my-hat"

Palette swaps map RGBA tuples from the composited image to new RGBA tuples.
Only list colors you want to change — everything else is kept as-is.

Base palette reference (from mage-light body):
  Outline:        (20,  12,  28)
  Robe dark:      (44,  20,  80), (48,  32,  80), (72,  40, 120)
  Robe mid:       (140, 88,  200), (200, 160, 48)
  Robe highlight: (60,  160, 220), (120, 220, 255)
  Skin dark:      (140, 100, 48)
  Skin mid:       (196, 140, 88)
  Skin light:     (240, 188, 140)
  Staff/whites:   (240, 240, 240)
  Glow:           (255, 255, 180)
"""

from PIL import Image
import numpy as np
import os

SPRITES_DIR = os.path.dirname(os.path.abspath(__file__))
LAYERS_DIR  = os.path.join(SPRITES_DIR, "layers")

# ---------------------------------------------------------------------------
# Palette definitions
# ---------------------------------------------------------------------------

PALETTE_DEFAULT = {}  # no changes — keep base colors

PALETTE_DARK = {
    (44,  20,  80,  255): ( 55,  10,  10, 255),
    (48,  32,  80,  255): ( 35,  10,  10, 255),
    (72,  40, 120,  255): (110,  18,  18, 255),
    (140,  88, 200, 255): (170,  45,  45, 255),
    (200, 160,  48,  255): (140,  18,  18, 255),
    (60,  160, 220, 255): (180,  70,  10, 255),
    (120, 220, 255, 255): (255, 140,  20, 255),
    (255, 255, 180, 255): (255, 220, 100, 255),
}

# Add more palettes here, e.g.:
# PALETTE_GREEN = { (44, 20, 80, 255): (10, 60, 10, 255), ... }

# ---------------------------------------------------------------------------
# Character definitions
# ---------------------------------------------------------------------------
# Each character needs:
#   body:    layer name from layers/body/   (required)
#   hair:    layer name from layers/hair/   ("none" to skip)
#   hat:     layer name from layers/hat/    ("none" to skip)
#   staff:   layer name from layers/staff/  ("none" to skip)
#   palette: palette dict to apply after compositing
#
# Male/female counts must stay equal.
# ---------------------------------------------------------------------------

CHARACTERS = {
    # --- Female ---
    "mage-light": {
        "body":    "mage-f",
        "hair":    "none",
        "hat":     "none",
        "staff":   "none",
        "palette": PALETTE_DEFAULT,
    },
    "mage-dark": {
        "body":    "mage-f",
        "hair":    "none",
        "hat":     "none",
        "staff":   "none",
        "palette": PALETTE_DARK,
    },

    # --- Male (add matching entries once body/mage-m.png exists) ---
    # "mage-m-light": {
    #     "body":    "mage-m",
    #     "hair":    "none",
    #     "hat":     "none",
    #     "staff":   "none",
    #     "palette": PALETTE_DEFAULT,
    # },
    # "mage-m-dark": {
    #     "body":    "mage-m",
    #     "hair":    "none",
    #     "hat":     "none",
    #     "staff":   "none",
    #     "palette": PALETTE_DARK,
    # },
}

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

LAYER_SLOTS = ["body", "hair", "hat", "staff"]


def load_layer(slot: str, name: str) -> np.ndarray | None:
    if name == "none":
        return None
    path = os.path.join(LAYERS_DIR, slot, f"{name}.png")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Layer not found: {path}")
    return np.array(Image.open(path).convert("RGBA"))


def composite_layers(layers: list[np.ndarray]) -> np.ndarray:
    """Alpha-composite a list of RGBA arrays bottom to top."""
    base = layers[0].astype(np.float32)
    for overlay in layers[1:]:
        oa = overlay[:, :, 3:4] / 255.0
        base = overlay * oa + base * (1.0 - oa)
    return np.clip(base, 0, 255).astype(np.uint8)


def apply_palette(arr: np.ndarray, palette: dict) -> np.ndarray:
    result = arr.copy()
    for src, dst in palette.items():
        mask = np.all(arr == src, axis=2)
        result[mask] = dst
    return result


def check_gender_balance():
    # Count characters per body type to enforce equal gender representation
    counts = {}
    for cfg in CHARACTERS.values():
        body = cfg["body"]
        counts[body] = counts.get(body, 0) + 1

    bodies = list(counts.keys())
    if len(bodies) > 1:
        values = list(counts.values())
        if len(set(values)) > 1:
            summary = ", ".join(f"{b}: {c}" for b, c in counts.items())
            raise ValueError(f"Unequal character counts per body type ({summary}). Add matching entries to balance.")


def generate_sprites():
    check_gender_balance()

    for name, cfg in CHARACTERS.items():
        layer_arrays = []
        for slot in LAYER_SLOTS:
            arr = load_layer(slot, cfg[slot])
            if arr is not None:
                layer_arrays.append(arr)

        if not layer_arrays:
            raise ValueError(f"Character '{name}' has no layers.")

        composited = composite_layers(layer_arrays) if len(layer_arrays) > 1 else layer_arrays[0].copy()
        final = apply_palette(composited, cfg["palette"])

        out_path = os.path.join(SPRITES_DIR, f"{name}.png")
        Image.fromarray(final, "RGBA").save(out_path)
        print(f"Generated: {out_path}")


if __name__ == "__main__":
    generate_sprites()
