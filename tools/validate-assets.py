#!/usr/bin/env python3
"""
Validate asset images by asset number for size and transparency.

Usage:
  python tools/validate-assets.py --downloads  # scan default Downloads
  python tools/validate-assets.py --path C:\\Users\\me\\Downloads
  python tools/validate-assets.py --strict      # require PNG with alpha and some transparency
"""

from pathlib import Path
import argparse
import re

try:
    from PIL import Image
except Exception as e:
    Image = None


# Expected dimensions per asset number
EXPECTED_SIZE = {
    # Units - Stone Age
    1: (64, 64),
    2: (64, 64),
    3: (64, 64),
    4: (96, 96),
    # Units - Castle Age
    5: (64, 64), 6: (64, 64), 7: (96, 96), 8: (96, 96),
    # Units - Renaissance
    9: (64, 64), 10: (96, 96), 11: (96, 96), 12: (64, 64),
    # Units - Modern
    13: (64, 64), 14: (64, 64), 15: (128, 96), 16: (64, 64),
    # Turrets - Stone Age
    17: (48, 48), 18: (48, 48), 19: (48, 48),
    # Turrets - Castle Age
    20: (48, 48), 21: (48, 48), 22: (48, 48),
    # Turrets - Renaissance
    23: (48, 48), 24: (48, 48), 25: (48, 48),
    # Turrets - Modern
    26: (48, 48), 27: (48, 48), 28: (48, 48),
    # Turrets - Future
    29: (48, 48), 30: (48, 48), 31: (48, 48),
    # Buildings
    32: (64, 128), 33: (64, 128),
    # Projectiles
    34: (16, 16), 35: (24, 8), 36: (16, 16), 37: (12, 4), 38: (32, 8),
    # UI
    39: (32, 32), 40: (32, 32), 41: (48, 48), 42: (48, 48), 43: (32, 32),
    # Backgrounds
    44: (1280, 720), 45: (1280, 720), 46: (1280, 720), 47: (1280, 720), 48: (1280, 720),
}


def parse_asset_num(name: str) -> int | None:
    lower = name.lower()
    # match asset-12-..., asset12..., or standalone 12 in name
    m = re.search(r"asset[-_ ]?(\d{1,2})", lower) or re.search(r"(?<!\d)(\d{1,2})(?!\d)", lower)
    if not m:
        return None
    try:
        n = int(m.group(1))
        return n if 1 <= n <= 48 else None
    except ValueError:
        return None


def has_any_transparency(img: Image.Image) -> bool:
    if img.mode in ("RGBA", "LA"):
        alpha = img.getchannel("A")
        # quick sample check: corners and a grid of pixels
        w, h = img.size
        sample_points = set([
            (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
            (w // 2, h // 2)
        ])
        # add a few grid points
        for gx in range(1, 4):
            for gy in range(1, 4):
                sample_points.add((w * gx // 4, h * gy // 4))
        for (x, y) in sample_points:
            if alpha.getpixel((x, y)) < 255:
                return True
        # fallback: check extrema (more expensive for large images)
        extrema = alpha.getextrema()
        return extrema is not None and extrema[0] < 255
    return False


def validate_image(path: Path, strict: bool = False) -> tuple[bool, str]:
    if Image is None:
        return False, "Pillow not installed. Run: pip install pillow"
    try:
        with Image.open(path) as img:
            num = parse_asset_num(path.stem)
            if num is None:
                return False, "No asset number found in filename"
            expected = EXPECTED_SIZE.get(num)
            if not expected:
                return False, f"No expected size mapping for asset {num}"
            if img.size != expected:
                return False, f"Wrong size {img.size}, expected {expected}"
            if strict:
                if path.suffix.lower() != ".png":
                    return False, "Strict: must be .png"
                if not has_any_transparency(img):
                    return False, "Strict: PNG has no transparency (alpha)"
            return True, "OK"
    except Exception as e:
        return False, f"Error: {e}"


def find_downloads_folder() -> Path | None:
    from os import path
    home = Path.home()
    d = home / "Downloads"
    return d if d.exists() else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", type=str, default=None, help="Folder to scan (default: Downloads)")
    ap.add_argument("--strict", action="store_true", help="Require PNG with alpha and some transparency")
    args = ap.parse_args()

    root = Path(args.path) if args.path else find_downloads_folder()
    if not root or not root.exists():
        print(" Source folder not found:", root)
        return 1

    images = [p for p in root.iterdir() if p.is_file() and p.suffix.lower() in (".png", ".jpg", ".webp")]
    if not images:
        print(" No images found in", root)
        return 0

    print(" Validating:", root)
    bad = 0
    for p in sorted(images):
        ok, msg = validate_image(p, strict=args.strict)
        status = "OK" if ok else "FAIL"
        print(f" {status:4}  {p.name}  ->  {msg}")
        if not ok:
            bad += 1

    print()
    if bad:
        print(f" Summary: {len(images)} checked, {bad} issue(s) found")
        return 2
    else:
        print(f" Summary: {len(images)} checked, all good")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

