"""
Sprite generator for WizardsDuel.
Generates character variants by applying palette swaps to a base sprite.

Usage:
    python3 generate_sprites.py

To add a new character:
    1. Add an entry to CHARACTERS dict below
    2. Map only the colors you want to change (unmapped colors are kept as-is)
    3. Run the script
"""

from PIL import Image
import numpy as np
import os

SPRITES_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_SPRITE = os.path.join(SPRITES_DIR, "mage-light.png")

# Base palette colors (from mage-light.png) for reference:
# Outline/shadow:   (20,  12,  28)
# Robe dark:        (44,  20,  80), (48,  32,  80), (72,  40, 120)
# Robe mid:         (140, 88,  200), (200, 160, 48)
# Robe highlight:   (60, 160, 220), (120, 220, 255)
# Skin dark:        (140, 100, 48)
# Skin mid:         (196, 140, 88)
# Skin light:       (240, 188, 140)
# Staff/whites:     (240, 240, 240)
# Glow:             (255, 255, 180)

# Each character maps RGBA tuples from the base sprite to new RGBA tuples.
# Only include colors you want to change — everything else stays the same.
CHARACTERS = {
    "mage-dark": {
        # Blues/purples swapped to reds/oranges
        (44,  20,  80,  255): ( 55,  10,  10, 255),
        (48,  32,  80,  255): ( 35,  10,  10, 255),
        (72,  40, 120,  255): (110,  18,  18, 255),
        (140,  88, 200, 255): (170,  45,  45, 255),
        (200, 160,  48,  255): (140,  18,  18, 255),
        (60,  160, 220, 255): (180,  70,  10, 255),
        (120, 220, 255, 255): (255, 140,  20, 255),
        (255, 255, 180, 255): (255, 220, 100, 255),
    },

    # --- Add new characters below ---
    # Example: green mage
    # "mage-green": {
    #     (44,  20,  80,  255): ( 10,  40,  10, 255),
    #     (48,  32,  80,  255): ( 10,  30,  10, 255),
    #     (72,  40, 120,  255): ( 20,  80,  20, 255),
    #     (140,  88, 200, 255): ( 40, 140,  40, 255),
    #     (200, 160,  48,  255): ( 30, 120,  30, 255),
    #     (60,  160, 220, 255): ( 80, 200,  80, 255),
    #     (120, 220, 255, 255): (160, 255, 160, 255),
    #     (255, 255, 180, 255): (200, 255, 200, 255),
    # },
}


def apply_palette(base_arr: np.ndarray, palette: dict) -> np.ndarray:
    result = base_arr.copy()
    for src, dst in palette.items():
        mask = np.all(base_arr == src, axis=2)
        result[mask] = dst
    return result


def generate_sprites():
    base_img = Image.open(BASE_SPRITE).convert("RGBA")
    base_arr = np.array(base_img)

    for name, palette in CHARACTERS.items():
        out_arr = apply_palette(base_arr, palette)
        out_img = Image.fromarray(out_arr, "RGBA")
        out_path = os.path.join(SPRITES_DIR, f"{name}.png")
        out_img.save(out_path)
        print(f"Generated: {out_path}")


if __name__ == "__main__":
    generate_sprites()
