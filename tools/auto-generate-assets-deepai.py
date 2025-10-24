#!/usr/bin/env python3
"""
DeepAI Text-to-Image Asset Generator for Age of Max
- Uses DeepAI text2img API (Free tier: ~500 images/month)
- Generates the same 48 assets defined for the project
- Post-processes images to target sprite sizes using Pillow (nearest-neighbor)

Usage:
  python tools/auto-generate-assets-deepai.py --api-key <DEEPAI_API_KEY> [--start-from N]
  # or set env var DEEPAI_API_KEY and run without --api-key

Output:
  downloads/generated-assets/asset-<id>-<name>.png
"""

import os
import io
import sys
import time
import json
import math
import argparse
from pathlib import Path

import requests
from PIL import Image

# Pillow compatibility for NEAREST resampling across versions and type stubs
try:
    from PIL.Image import Resampling  # type: ignore
    RESAMPLE_NEAREST = Resampling.NEAREST  # Pillow >= 9.1
except Exception:  # pragma: no cover - fallback for older Pillow
    RESAMPLE_NEAREST = 0  # NEAREST constant value

DEEPAI_ENDPOINT = "https://api.deepai.org/api/text2img"

# Asset definitions (id, name, prompt, target_size)
ASSETS = [
    {"id": 1, "name": "clubman", "prompt": "Pixel art side-view sprite of a primitive caveman warrior holding a wooden club, wearing animal fur, brown and tan colors, 64x64 pixels, transparent or white background, retro game sprite, crisp pixel edges", "size": (64, 64)},
    {"id": 2, "name": "spearman", "prompt": "Pixel art side-view sprite of a Stone Age warrior with stone-tipped spear, leather armor, brown earth tones, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 3, "name": "slinger", "prompt": "Pixel art side-view sprite of primitive slinger holding sling weapon, light tribal clothing, brown and beige tones, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 4, "name": "dino-rider", "prompt": "Pixel art side-view sprite of caveman riding small dinosaur, prehistoric theme, brown and green colors, 96x96 pixels, transparent or white background, retro game sprite", "size": (96, 96)},
    {"id": 5, "name": "swordsman", "prompt": "Pixel art side-view sprite of medieval knight with sword and shield, chainmail armor, grey and silver colors, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 6, "name": "archer", "prompt": "Pixel art side-view sprite of medieval archer drawing longbow, leather armor, brown and grey tones, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 7, "name": "knight", "prompt": "Pixel art side-view sprite of armored knight on horseback, full plate armor, grey and silver metallic, 96x96 pixels, transparent or white background, retro game sprite", "size": (96, 96)},
    {"id": 8, "name": "ballista", "prompt": "Pixel art side-view sprite of medieval siege ballista, wooden frame with metal reinforcements, brown and grey, 96x96 pixels, transparent or white background, retro game sprite", "size": (96, 96)},
    {"id": 9, "name": "musketeer", "prompt": "Pixel art side-view sprite of Renaissance musketeer with musket rifle, fancy plumed hat, blue and gold uniform, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 10, "name": "cavalry", "prompt": "Pixel art side-view sprite of Renaissance cavalry soldier on horse, bronze armor with blue accents, 96x96 pixels, transparent or white background, retro game sprite", "size": (96, 96)},
    {"id": 11, "name": "cannon", "prompt": "Pixel art side-view sprite of Renaissance cannon on wooden wheels, bronze barrel, 96x96 pixels, transparent or white background, retro game sprite", "size": (96, 96)},
    {"id": 12, "name": "duelist", "prompt": "Pixel art side-view sprite of Renaissance duelist with rapier sword, elegant clothing with burgundy and gold, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 13, "name": "rifleman", "prompt": "Pixel art side-view sprite of WW1 soldier with rifle, military uniform, olive green and brown, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 14, "name": "grenadier", "prompt": "Pixel art side-view sprite of modern grenadier with grenade launcher, tactical gear, dark green and black, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},
    {"id": 15, "name": "tank", "prompt": "Pixel art side-view sprite of modern military tank, angular armor, olive green and grey camouflage, 128x96 pixels, transparent or white background, retro game sprite", "size": (128, 96)},
    {"id": 16, "name": "sniper", "prompt": "Pixel art side-view sprite of military sniper with scoped rifle, camouflage ghillie suit, green and brown tones, 64x64 pixels, transparent or white background, retro game sprite", "size": (64, 64)},

    # Turrets (top-down, 48x48)
    {"id": 17, "name": "stone-tower-t1", "prompt": "Pixel art top-down view of basic Stone Age defensive tower, wooden structure with stone reinforcements, brown tones, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 18, "name": "stone-tower-t2", "prompt": "Pixel art top-down view of improved Stone Age tower, more stones and wood, brown tones, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 19, "name": "stone-tower-t3", "prompt": "Pixel art top-down view of advanced Stone Age tower, reinforced with rocks, brown tones, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 20, "name": "castle-tower-t1", "prompt": "Pixel art top-down view of basic medieval stone tower, grey stone with battlements, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 21, "name": "castle-tower-t2", "prompt": "Pixel art top-down view of reinforced medieval tower, taller structure, grey, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 22, "name": "castle-tower-t3", "prompt": "Pixel art top-down view of fortified medieval tower, heavy stone fortress, grey, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 23, "name": "cannon-tower-t1", "prompt": "Pixel art top-down view of basic Renaissance cannon tower, bronze cannon on stone platform, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 24, "name": "cannon-tower-t2", "prompt": "Pixel art top-down view of improved cannon tower, larger bronze cannon, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 25, "name": "cannon-tower-t3", "prompt": "Pixel art top-down view of advanced cannon tower, double cannons, bronze and blue, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 26, "name": "gun-turret-t1", "prompt": "Pixel art top-down view of basic modern gun turret, steel bunker with machine gun, grey and dark green, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 27, "name": "gun-turret-t2", "prompt": "Pixel art top-down view of reinforced gun turret, concrete bunker with dual guns, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 28, "name": "gun-turret-t3", "prompt": "Pixel art top-down view of advanced gun turret, armored bunker with heavy weapons, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 29, "name": "laser-turret-t1", "prompt": "Pixel art top-down view of basic futuristic laser turret, sleek metallic with glowing cyan core, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 30, "name": "laser-turret-t2", "prompt": "Pixel art top-down view of improved laser turret, larger glowing core, cyan and purple, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},
    {"id": 31, "name": "laser-turret-t3", "prompt": "Pixel art top-down view of advanced laser turret, sci-fi design with bright cyan energy, 48x48 pixels, transparent or white background, retro game sprite", "size": (48, 48)},

    # Buildings 64x128
    {"id": 32, "name": "player-base", "prompt": "Pixel art side-view sprite of fortified main base building with blue color theme, defensive structure, 64x128 pixels, transparent or white background, retro game sprite", "size": (64, 128)},
    {"id": 33, "name": "enemy-base", "prompt": "Pixel art side-view sprite of fortified enemy base building with red color theme, defensive structure, 64x128 pixels, transparent or white background, retro game sprite", "size": (64, 128)},

    # Projectiles
    {"id": 34, "name": "rock", "prompt": "Pixel art sprite of thrown rock projectile, brown stone, simple shape, 16x16 pixels, transparent or white background, retro game sprite", "size": (16, 16)},
    {"id": 35, "name": "arrow", "prompt": "Pixel art sprite of flying arrow projectile, wooden shaft with metal tip, horizontal orientation, 24x8 pixels, transparent or white background, retro game sprite", "size": (24, 8)},
    {"id": 36, "name": "cannonball", "prompt": "Pixel art sprite of iron cannonball projectile, dark grey sphere, 16x16 pixels, transparent or white background, retro game sprite", "size": (16, 16)},
    {"id": 37, "name": "bullet", "prompt": "Pixel art sprite of bullet projectile, small brass shell, 12x4 pixels, transparent or white background, retro game sprite", "size": (12, 4)},
    {"id": 38, "name": "laser", "prompt": "Pixel art sprite of futuristic laser beam, glowing cyan energy bolt, 32x8 pixels, transparent or white background, retro game sprite", "size": (32, 8)},

    # UI
    {"id": 39, "name": "gold-coin", "prompt": "Pixel art icon of gold coin, shiny yellow with highlights, 32x32 pixels, transparent or white background, retro game UI asset", "size": (32, 32)},
    {"id": 40, "name": "xp-star", "prompt": "Pixel art icon of experience star, glowing white and yellow, 32x32 pixels, transparent or white background, retro game UI asset", "size": (32, 32)},
    {"id": 41, "name": "raining-rocks-icon", "prompt": "Pixel art icon showing falling rocks/meteors from sky, brown and orange colors, 48x48 pixels, transparent or white background, retro game UI button", "size": (48, 48)},
    {"id": 42, "name": "artillery-strike-icon", "prompt": "Pixel art icon showing explosion bombardment, orange and red colors, 48x48 pixels, transparent or white background, retro game UI button", "size": (48, 48)},
    {"id": 43, "name": "turret-placeholder", "prompt": "Pixel art icon of generic turret silhouette, grey color, simple shape, 32x32 pixels, transparent or white background, retro game UI asset", "size": (32, 32)},

    # Backgrounds (we'll request 1024x720 then downscale to 1280x720 if needed via upscale step)
    {"id": 44, "name": "stone-age-bg", "prompt": "Pixel art game background, prehistoric landscape with caves and primitive trees, earth tones, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 45, "name": "castle-age-bg", "prompt": "Pixel art game background, medieval castle walls and banners, grey stone with blue sky, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 46, "name": "renaissance-bg", "prompt": "Pixel art game background, Renaissance city with architecture and flags, warm tones, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 47, "name": "modern-bg", "prompt": "Pixel art game background, modern city ruins and battlefield, grey and brown tones, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 48, "name": "future-bg", "prompt": "Pixel art game background, futuristic sci-fi cityscape with neon lights, cyan and purple colors, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
]


def nearest_resize_to_canvas(img: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    """Resize with NEAREST (pixel-art friendly) and letterbox if aspect differs."""
    tw, th = target_size
    # If transparent not present, convert to RGBA
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    iw, ih = img.size
    # Compute scale preserving aspect to fit inside target
    scale = min(tw / iw, th / ih)
    new_w = max(1, int(round(iw * scale)))
    new_h = max(1, int(round(ih * scale)))

    resized = img.resize((new_w, new_h), resample=RESAMPLE_NEAREST)

    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    off_x = (tw - new_w) // 2
    off_y = (th - new_h) // 2
    canvas.paste(resized, (off_x, off_y))
    return canvas


def download_image_to_bytes(url: str) -> bytes:
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    return resp.content


def deepai_generate(api_key: str, prompt: str, width: int, height: int) -> str:
    """Call DeepAI text2img and return output image URL.
    DeepAI docs: https://deepai.org/docs → text2img endpoint
    """
    headers = {"api-key": api_key}

    # DeepAI recommends sizes like 512x512, 1024x720, 1024x576. Keep within bounds.
    # Clamp to multiples of 32 and within 128..1536.
    def clamp_dim(v: int) -> int:
        v = max(128, min(1536, v))
        return int(round(v / 32) * 32)

    w = clamp_dim(width)
    h = clamp_dim(height)

    # Try JSON body first
    resp = requests.post(
        DEEPAI_ENDPOINT,
        headers={**headers, "Content-Type": "application/json"},
        json={"text": prompt, "width": str(w), "height": str(h)},
        timeout=120,
    )

    # If server rejects JSON, retry with classic form-data and minimal fields
    if resp.status_code != 200:
        resp = requests.post(
            DEEPAI_ENDPOINT,
            headers=headers,
            data={"text": prompt, "width": str(w), "height": str(h)},
            timeout=120,
        )
        if resp.status_code != 200:
            resp = requests.post(
                DEEPAI_ENDPOINT,
                headers=headers,
                data={"text": prompt},
                timeout=120,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"DeepAI error {resp.status_code}: {resp.text[:400]}")

    data = resp.json()
    # DeepAI typically returns {'output_url': '...'}; sometimes nested.
    output_url = data.get("output_url") or data.get("data", {}).get("output_url")
    if not output_url:
        raise RuntimeError(f"DeepAI missing output_url: {json.dumps(data)[:400]}")
    return output_url


def main():
    parser = argparse.ArgumentParser(description="Generate assets via DeepAI text2img")
    parser.add_argument("--api-key", dest="api_key", help="DeepAI API key (or set DEEPAI_API_KEY)")
    parser.add_argument("--start-from", dest="start_from", type=int, default=1, help="Start from asset id")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("DEEPAI_API_KEY")
    if not api_key:
        print("ERROR: Provide --api-key or set DEEPAI_API_KEY env var.")
        sys.exit(1)

    project_root = Path(__file__).parent.parent
    out_dir = project_root / "downloads" / "generated-assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    assets = [a for a in ASSETS if a["id"] >= args.start_from]
    print("\n🎨 Age of Max – DeepAI generator")
    print(f"Using DeepAI endpoint: {DEEPAI_ENDPOINT}")
    print(f"Output folder: {out_dir}")
    print(f"Assets to generate: {len(assets)} (starting from {args.start_from})\n")

    ok = 0
    fails: list[tuple[int, str, str]] = []

    for idx, asset in enumerate(assets, 1):
        aid = asset["id"]
        name = asset["name"]
        prompt = asset["prompt"]
        tw, th = asset["size"]
        filename = f"asset-{aid}-{name}.png"
        target_path = out_dir / filename
        print(f"[{idx}/{len(assets)}] {aid}/48 {name} → {tw}x{th}")

        try:
            # Request a square or near-target generation to preserve details; backgrounds use wide.
            req_w, req_h = (max(tw, 512), max(th, 512)) if aid <= 43 else (1024, 720)
            url = deepai_generate(api_key, prompt, req_w, req_h)
            img_bytes = download_image_to_bytes(url)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")

            # Pixel-art friendly resize onto exact canvas
            out_img = nearest_resize_to_canvas(img, (tw, th))
            out_img.save(target_path)
            print(f"    ✅ saved {filename}")
            ok += 1

            # Gentle pacing to avoid any throttle
            time.sleep(1.2)
        except Exception as e:
            print(f"    ❌ {e}")
            fails.append((aid, name, str(e)))
            # small backoff
            time.sleep(2.5)

    print("\n📊 Summary")
    print(f"   ✅ {ok}/{len(assets)} success")
    if fails:
        print(f"   ❌ {len(fails)} failed:")
        for aid, name, err in fails:
            print(f"      - {aid} {name}: {err}")

    print("\nNext:")
    print("  1) Inspect downloads/generated-assets")
    print("  2) Run: python tools/organize-assets.py")


if __name__ == "__main__":
    main()
