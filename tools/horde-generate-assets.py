#!/usr/bin/env python3
"""
AI Horde (Stable Horde) Text-to-Image Asset Generator for Age of Max
- Uses the free Stable Horde community API (https://stablehorde.net)
- No payment required; anonymous requests work but are slower. API key recommended for higher priority.

Usage:
  python tools/horde-generate-assets.py --api-key <HORDE_API_KEY> [--start-from N]
  # or set env var HORDE_API_KEY and run without --api-key

Output:
  downloads/generated-assets/asset-<id>-<name>.png
"""

import os
import io
import sys
import time
import json
import base64
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from PIL import Image

HORDE_ASYNC_ENDPOINT = "https://stablehorde.net/api/v2/generate/async"
HORDE_STATUS_ENDPOINT = "https://stablehorde.net/api/v2/generate/status/{id}"

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

    {"id": 32, "name": "player-base", "prompt": "Pixel art side-view sprite of fortified main base building with blue color theme, defensive structure, 64x128 pixels, transparent or white background, retro game sprite", "size": (64, 128)},
    {"id": 33, "name": "enemy-base", "prompt": "Pixel art side-view sprite of fortified enemy base building with red color theme, defensive structure, 64x128 pixels, transparent or white background, retro game sprite", "size": (64, 128)},

    {"id": 34, "name": "rock", "prompt": "Pixel art sprite of thrown rock projectile, brown stone, simple shape, 16x16 pixels, transparent or white background, retro game sprite", "size": (16, 16)},
    {"id": 35, "name": "arrow", "prompt": "Pixel art sprite of flying arrow projectile, wooden shaft with metal tip, horizontal orientation, 24x8 pixels, transparent or white background, retro game sprite", "size": (24, 8)},
    {"id": 36, "name": "cannonball", "prompt": "Pixel art sprite of iron cannonball projectile, dark grey sphere, 16x16 pixels, transparent or white background, retro game sprite", "size": (16, 16)},
    {"id": 37, "name": "bullet", "prompt": "Pixel art sprite of bullet projectile, small brass shell, 12x4 pixels, transparent or white background, retro game sprite", "size": (12, 4)},
    {"id": 38, "name": "laser", "prompt": "Pixel art sprite of futuristic laser beam, glowing cyan energy bolt, 32x8 pixels, transparent or white background, retro game sprite", "size": (32, 8)},

    {"id": 39, "name": "gold-coin", "prompt": "Pixel art icon of gold coin, shiny yellow with highlights, 32x32 pixels, transparent or white background, retro game UI asset", "size": (32, 32)},
    {"id": 40, "name": "xp-star", "prompt": "Pixel art icon of experience star, glowing white and yellow, 32x32 pixels, transparent or white background, retro game UI asset", "size": (32, 32)},
    {"id": 41, "name": "raining-rocks-icon", "prompt": "Pixel art icon showing falling rocks/meteors from sky, brown and orange colors, 48x48 pixels, transparent or white background, retro game UI button", "size": (48, 48)},
    {"id": 42, "name": "artillery-strike-icon", "prompt": "Pixel art icon showing explosion bombardment, orange and red colors, 48x48 pixels, transparent or white background, retro game UI button", "size": (48, 48)},
    {"id": 43, "name": "turret-placeholder", "prompt": "Pixel art icon of generic turret silhouette, grey color, simple shape, 32x32 pixels, transparent or white background, retro game UI asset", "size": (32, 32)},

    {"id": 44, "name": "stone-age-bg", "prompt": "Pixel art game background, prehistoric landscape with caves and primitive trees, earth tones, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 45, "name": "castle-age-bg", "prompt": "Pixel art game background, medieval castle walls and banners, grey stone with blue sky, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 46, "name": "renaissance-bg", "prompt": "Pixel art game background, Renaissance city with architecture and flags, warm tones, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 47, "name": "modern-bg", "prompt": "Pixel art game background, modern city ruins and battlefield, grey and brown tones, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
    {"id": 48, "name": "future-bg", "prompt": "Pixel art game background, futuristic sci-fi cityscape with neon lights, cyan and purple colors, parallax-ready, retro game background, clean pixel look", "size": (1280, 720)},
]

# Pillow NEAREST compatibility
try:
    from PIL.Image import Resampling  # type: ignore
    RESAMPLE_NEAREST = Resampling.NEAREST
except Exception:
    RESAMPLE_NEAREST = 0


def nearest_resize_to_canvas(img: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    tw, th = target_size
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    iw, ih = img.size
    scale = min(tw / iw, th / ih)
    new_w = max(1, int(round(iw * scale)))
    new_h = max(1, int(round(ih * scale)))
    resized = img.resize((new_w, new_h), resample=RESAMPLE_NEAREST)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.paste(resized, ((tw - new_w) // 2, (th - new_h) // 2))
    return canvas


def horde_submit_job(api_key: str, prompt: str, width: int, height: int) -> str:
    headers = {
        "apikey": api_key or "0000000000",  # anonymous if empty
        "accept": "application/json",
        "Content-Type": "application/json",
        "Client-Agent": "AgeOfMax/1.0 (github.com/MaximilianHaak)"
    }
    # Clamp dims to Horde supported ranges; multiples of 64 for SDXL recommended
    def clamp64(v: int) -> int:
        v = max(64, min(1536, v))
        return int(round(v / 64) * 64)

    w = clamp64(width)
    h = clamp64(height)

    body = {
        "prompt": prompt,
        "nsfw": False,
        "censor_nsfw": True,
        "params": {
            "n": 1,
            "width": w,
            "height": h,
            "steps": 20,
            "sampler_name": "k_euler_a",
            "cfg_scale": 6.5,
            "karras": True,
            "clip_skip": 1,
            "image_format": "png"
        },
        # Let the network pick available SDXL workers; specifying model narrows pool
        "models": ["SDXL 1.0"],
    }

    resp = requests.post(HORDE_ASYNC_ENDPOINT, headers=headers, json=body, timeout=120)
    if resp.status_code != 202:
        raise RuntimeError(f"Horde submit error {resp.status_code}: {resp.text[:400]}")
    data = resp.json()
    # Returns { "id": "job-id", ... }
    job_id = data.get("id")
    if not job_id:
        raise RuntimeError(f"Horde missing job id: {json.dumps(data)[:400]}")
    return job_id


def horde_poll_result(api_key: str, job_id: str, name: str, poll_interval: float = 5.0, timeout: float = 900.0) -> bytes:
    headers = {
        "apikey": api_key or "0000000000",
        "accept": "application/json",
        "Client-Agent": "AgeOfMax/1.0 (github.com/MaximilianHaak)"
    }
    status_url = HORDE_STATUS_ENDPOINT.format(id=job_id)
    start = time.time()
    last_line = ""
    while True:
        resp = requests.get(status_url, headers=headers, timeout=120)
        if resp.status_code != 200:
            raise RuntimeError(f"Horde status error {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        # When done, 'generations' contains a list with base64 images
        gens = data.get("generations")
        if gens:
            b64 = gens[0].get("img")
            if not b64:
                raise RuntimeError("Horde result missing image data")
            # Handle possible data URI prefix and non-png formats
            if isinstance(b64, str) and b64.startswith("data:"):
                # e.g., data:image/webp;base64,AAAA...
                try:
                    b64 = b64.split(",", 1)[1]
                except Exception:
                    pass
            try:
                return base64.b64decode(b64)
            except Exception as e:
                raise RuntimeError(f"Invalid base64 image data: {e}")
        # Still in queue / processing
        queue_pos = data.get("queue_position")
        wait = data.get("wait_time") or data.get("eta")
        state = data.get("state") or ("processing" if data.get("processing") else "waiting")
        line = f"      ⏳ {name}: {state}"
        if queue_pos is not None:
            line += f", queue pos {queue_pos}"
        if wait is not None:
            line += f", eta ~{wait}s"
        if line != last_line:
            print(line)
            last_line = line
        if time.time() - start > timeout:
            raise TimeoutError("Horde generation timed out")
        time.sleep(poll_interval)


def main():
    parser = argparse.ArgumentParser(description="Generate assets via AI Horde (Stable Horde)")
    parser.add_argument("--api-key", dest="api_key", help="Horde API key (or set HORDE_API_KEY; optional)")
    parser.add_argument("--start-from", dest="start_from", type=int, default=1, help="Start from asset id")
    parser.add_argument("--concurrency", dest="concurrency", type=int, default=4, help="Number of parallel jobs (3-5 recommended)")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("HORDE_API_KEY") or "0000000000"

    project_root = Path(__file__).parent.parent
    out_dir = project_root / "downloads" / "generated-assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    assets = [a for a in ASSETS if a["id"] >= args.start_from]
    print("\n🎨 Age of Max – AI Horde generator")
    print(f"Using Horde endpoint: {HORDE_ASYNC_ENDPOINT}")
    print(f"Output folder: {out_dir}")
    print(f"Assets to generate: {len(assets)} (starting from {args.start_from})\n")

    ok = 0
    fails = []

    def process_one(idx: int, asset: dict) -> tuple[int, str, bool, str | None]:
        aid = asset["id"]
        name = asset["name"]
        prompt = asset["prompt"]
        tw, th = asset["size"]
        filename = f"asset-{aid}-{name}.png"
        target_path = out_dir / filename
        print(f"[{idx}/{len(assets)}] {aid}/48 {name} → {tw}x{th}")
        try:
            # Request near-target dims (clamped to 64 multiples)
            req_w, req_h = (max(tw, 512), max(th, 512)) if aid <= 43 else (1280, 768)
            job_id = horde_submit_job(api_key, prompt, req_w, req_h)
            print(f"      🔗 job id: {job_id}")
            print(f"         status: https://stablehorde.net/api/v2/generate/status/{job_id}")
            img_bytes = horde_poll_result(api_key, job_id, name)
            # Try to open; if WEBP without support, save raw and mark as failed gracefully
            try:
                img = Image.open(io.BytesIO(img_bytes))
                img = img.convert("RGBA")
            except Exception as e:
                # Dump a diagnostic file for inspection
                diag_path = (out_dir / f"{filename}.raw").with_suffix(".bin")
                with open(diag_path, "wb") as f:
                    f.write(img_bytes)
                return (aid, name, False, f"cannot open image (saved raw to {diag_path.name}): {e}")
            out_img = nearest_resize_to_canvas(img, (tw, th))
            out_img.save(target_path)
            print(f"    ✅ saved {filename}")
            return (aid, name, True, None)
        except Exception as e:
            return (aid, name, False, str(e))

    # Thread pool for moderate parallelism
    with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as executor:
        futures = []
        for idx, asset in enumerate(assets, 1):
            futures.append(executor.submit(process_one, idx, asset))
            # Stagger submissions slightly to avoid bursts
            time.sleep(0.2)
        for fut in as_completed(futures):
            aid, name, success, err = fut.result()
            if success:
                ok += 1
            else:
                print(f"    ❌ {aid} {name}: {err}")
                fails.append((aid, name, err or "unknown error"))

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
