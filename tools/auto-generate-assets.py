#!/usr/bin/env python3
"""
Automatic Asset Generator for Age of War
Uses Replicate API to generate all 48 game assets automatically
"""

import os
import time
import json
from pathlib import Path

try:
    import replicate
except ImportError:
    print("Installing replicate package...")
    os.system("pip install replicate")
    import replicate

# Asset definitions with prompts and sizes
ASSETS = [
    # Units - Stone Age
    {"id": 1, "name": "clubman", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of a primitive caveman warrior holding a wooden club, wearing animal fur, brown and tan colors, 64x64 pixels, transparent background, retro game sprite style, crisp pixel edges"},
    {"id": 2, "name": "spearman", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of a Stone Age warrior with stone-tipped spear, leather armor, brown earth tones, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 3, "name": "slinger", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of primitive slinger holding sling weapon, light tribal clothing, brown and beige tones, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 4, "name": "dino-rider", "folder": "units", "size": (96, 96), "prompt": "Pixel art side-view sprite of caveman riding small dinosaur, prehistoric theme, brown and green colors, 96x96 pixels, transparent background, retro game sprite"},
    
    # Units - Castle Age
    {"id": 5, "name": "swordsman", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of medieval knight with sword and shield, chainmail armor, grey and silver colors, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 6, "name": "archer", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of medieval archer drawing longbow, leather armor, brown and grey tones, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 7, "name": "knight", "folder": "units", "size": (96, 96), "prompt": "Pixel art side-view sprite of armored knight on horseback, full plate armor, grey and silver metallic, 96x96 pixels, transparent background, retro game sprite"},
    {"id": 8, "name": "ballista", "folder": "units", "size": (96, 96), "prompt": "Pixel art side-view sprite of medieval siege ballista, wooden frame with metal reinforcements, brown and grey, 96x96 pixels, transparent background, retro game sprite"},
    
    # Units - Renaissance
    {"id": 9, "name": "musketeer", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of Renaissance musketeer with musket rifle, fancy plumed hat, blue and gold uniform, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 10, "name": "cavalry", "folder": "units", "size": (96, 96), "prompt": "Pixel art side-view sprite of Renaissance cavalry soldier on horse, bronze armor with blue accents, 96x96 pixels, transparent background, retro game sprite"},
    {"id": 11, "name": "cannon", "folder": "units", "size": (96, 96), "prompt": "Pixel art side-view sprite of Renaissance cannon on wooden wheels, bronze barrel, 96x96 pixels, transparent background, retro game sprite"},
    {"id": 12, "name": "duelist", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of Renaissance duelist with rapier sword, elegant clothing with burgundy and gold, 64x64 pixels, transparent background, retro game sprite"},
    
    # Units - Modern
    {"id": 13, "name": "rifleman", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of WW1 soldier with rifle, military uniform, olive green and brown, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 14, "name": "grenadier", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of modern grenadier with grenade launcher, tactical gear, dark green and black, 64x64 pixels, transparent background, retro game sprite"},
    {"id": 15, "name": "tank", "folder": "units", "size": (128, 96), "prompt": "Pixel art side-view sprite of modern military tank, angular armor, olive green and grey camouflage, 128x96 pixels, transparent background, retro game sprite"},
    {"id": 16, "name": "sniper", "folder": "units", "size": (64, 64), "prompt": "Pixel art side-view sprite of military sniper with scoped rifle, camouflage ghillie suit, green and brown tones, 64x64 pixels, transparent background, retro game sprite"},
    
    # Turrets - Stone Age
    {"id": 17, "name": "stone-tower-t1", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of basic Stone Age defensive tower, wooden structure with stone reinforcements, brown tones, level 1, 48x48 pixels, transparent background"},
    {"id": 18, "name": "stone-tower-t2", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of improved Stone Age tower, more stones and wood, brown tones, level 2, 48x48 pixels, transparent background"},
    {"id": 19, "name": "stone-tower-t3", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of advanced Stone Age tower, heavily reinforced, brown tones, level 3, 48x48 pixels, transparent background"},
    
    # Turrets - Castle Age
    {"id": 20, "name": "castle-tower-t1", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of basic medieval stone tower, grey stone with battlements, level 1, 48x48 pixels, transparent background"},
    {"id": 21, "name": "castle-tower-t2", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of reinforced medieval tower, taller structure, grey, level 2, 48x48 pixels, transparent background"},
    {"id": 22, "name": "castle-tower-t3", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of fortified medieval tower, heavy fortress, grey, level 3, 48x48 pixels, transparent background"},
    
    # Turrets - Renaissance
    {"id": 23, "name": "cannon-tower-t1", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of basic Renaissance cannon tower, bronze cannon on stone platform, 48x48 pixels, transparent background"},
    {"id": 24, "name": "cannon-tower-t2", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of improved cannon tower, larger bronze cannon, 48x48 pixels, transparent background"},
    {"id": 25, "name": "cannon-tower-t3", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of advanced cannon tower, double cannons, bronze and blue, 48x48 pixels, transparent background"},
    
    # Turrets - Modern
    {"id": 26, "name": "gun-turret-t1", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of basic modern gun turret, steel bunker with machine gun, grey and dark green, 48x48 pixels, transparent background"},
    {"id": 27, "name": "gun-turret-t2", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of reinforced gun turret, concrete bunker with dual guns, 48x48 pixels, transparent background"},
    {"id": 28, "name": "gun-turret-t3", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of advanced gun turret, armored bunker with heavy weapons, 48x48 pixels, transparent background"},
    
    # Turrets - Future
    {"id": 29, "name": "laser-turret-t1", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of basic futuristic laser turret, sleek metallic with glowing cyan core, 48x48 pixels, transparent background"},
    {"id": 30, "name": "laser-turret-t2", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of improved laser turret, larger glowing core, cyan and purple, 48x48 pixels, transparent background"},
    {"id": 31, "name": "laser-turret-t3", "folder": "turrets", "size": (48, 48), "prompt": "Pixel art top-down view of advanced laser turret, sci-fi design with bright cyan energy, 48x48 pixels, transparent background"},
    
    # Buildings
    {"id": 32, "name": "player-base", "folder": "buildings", "size": (64, 128), "prompt": "Pixel art side-view sprite of fortified main base building with blue color theme, defensive structure, 64x128 pixels, transparent background"},
    {"id": 33, "name": "enemy-base", "folder": "buildings", "size": (64, 128), "prompt": "Pixel art side-view sprite of fortified enemy base building with red color theme, defensive structure, 64x128 pixels, transparent background"},
    
    # Projectiles
    {"id": 34, "name": "rock", "folder": "projectiles", "size": (16, 16), "prompt": "Pixel art sprite of thrown rock projectile, brown stone, simple shape, 16x16 pixels, transparent background"},
    {"id": 35, "name": "arrow", "folder": "projectiles", "size": (24, 8), "prompt": "Pixel art sprite of flying arrow projectile, wooden shaft with metal tip, horizontal, 24x8 pixels, transparent background"},
    {"id": 36, "name": "cannonball", "folder": "projectiles", "size": (16, 16), "prompt": "Pixel art sprite of iron cannonball, dark grey sphere, 16x16 pixels, transparent background"},
    {"id": 37, "name": "bullet", "folder": "projectiles", "size": (12, 4), "prompt": "Pixel art sprite of bullet projectile, small brass shell, 12x4 pixels, transparent background"},
    {"id": 38, "name": "laser", "folder": "projectiles", "size": (32, 8), "prompt": "Pixel art sprite of futuristic laser beam, glowing cyan energy bolt, 32x8 pixels, transparent background"},
    
    # UI
    {"id": 39, "name": "gold-coin", "folder": "ui", "size": (32, 32), "prompt": "Pixel art icon of gold coin, shiny yellow with highlights, 32x32 pixels, transparent background"},
    {"id": 40, "name": "xp-star", "folder": "ui", "size": (32, 32), "prompt": "Pixel art icon of experience star, glowing white and yellow, 32x32 pixels, transparent background"},
    {"id": 41, "name": "raining-rocks-icon", "folder": "ui", "size": (48, 48), "prompt": "Pixel art icon showing falling meteors, brown and orange, 48x48 pixels, transparent background"},
    {"id": 42, "name": "artillery-strike-icon", "folder": "ui", "size": (48, 48), "prompt": "Pixel art icon showing explosion bombardment, orange and red, 48x48 pixels, transparent background"},
    {"id": 43, "name": "turret-placeholder", "folder": "ui", "size": (32, 32), "prompt": "Pixel art icon of generic turret silhouette, grey, simple shape, 32x32 pixels, transparent background"},
    
    # Backgrounds
    {"id": 44, "name": "stone-age-bg", "folder": "backgrounds", "size": (1280, 720), "prompt": "Pixel art game background, prehistoric landscape with caves and primitive trees, earth tones, 1280x720 pixels, parallax-ready"},
    {"id": 45, "name": "castle-age-bg", "folder": "backgrounds", "size": (1280, 720), "prompt": "Pixel art game background, medieval castle walls and banners, grey stone with blue sky, 1280x720 pixels, parallax-ready"},
    {"id": 46, "name": "renaissance-bg", "folder": "backgrounds", "size": (1280, 720), "prompt": "Pixel art game background, Renaissance city with architecture and flags, warm tones, 1280x720 pixels, parallax-ready"},
    {"id": 47, "name": "modern-bg", "folder": "backgrounds", "size": (1280, 720), "prompt": "Pixel art game background, modern city ruins and battlefield, grey and brown, 1280x720 pixels, parallax-ready"},
    {"id": 48, "name": "future-bg", "folder": "backgrounds", "size": (1280, 720), "prompt": "Pixel art game background, futuristic sci-fi cityscape with neon lights, cyan and purple, 1280x720 pixels, parallax-ready"},
]

def download_image(url, filepath):
    """Download image from URL to filepath"""
    import urllib.request
    urllib.request.urlretrieve(url, filepath)

def generate_all_assets(api_key=None, start_from=1, dry_run=False):
    """Generate all assets using Replicate API"""
    
    # Setup API key
    if api_key:
        os.environ["REPLICATE_API_TOKEN"] = api_key
    elif not os.environ.get("REPLICATE_API_TOKEN"):
        print("")
        print("ERROR: No API key found!")
        print("")
        print("Get your FREE API key:")
        print("1. Go to: https://replicate.com/signin")
        print("2. Sign up (free account)")
        print("3. Go to: https://replicate.com/account/api-tokens")
        print("4. Copy your API token")
        print("")
        print("Then run:")
        print('  python tools/auto-generate-assets.py --api-key "YOUR_KEY_HERE"')
        print("")
        return
    
    project_root = Path(__file__).parent.parent
    downloads_folder = project_root / "downloads" / "generated-assets"
    downloads_folder.mkdir(parents=True, exist_ok=True)
    
    print("")
    print(" Age of War - Automatic Asset Generator")
    print("")
    print(f"Generating {len(ASSETS)} assets...")
    print(f"Output folder: {downloads_folder}")
    print("")
    
    if dry_run:
        print(" DRY RUN - No actual API calls will be made")
        print("")
    
    # Filter assets to generate
    assets_to_generate = [a for a in ASSETS if a["id"] >= start_from]
    
    successful = 0
    failed = []
    
    for i, asset in enumerate(assets_to_generate, 1):
        asset_id = asset["id"]
        name = asset["name"]
        folder = asset["folder"]
        size = asset["size"]
        prompt = asset["prompt"]
        
        filename = f"asset-{asset_id}-{name}.png"
        filepath = downloads_folder / filename
        
        print(f"[{i}/{len(assets_to_generate)}] Asset {asset_id}/{len(ASSETS)}: {name} ({size[0]}x{size[1]})")
        
        if dry_run:
            print(f"   Would generate: {filename}")
            continue
        
        try:
            # Use SDXL Lightning for fast pixel art generation
            output = replicate.run(
                "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
                input={
                    "prompt": prompt,
                    "width": size[0],
                    "height": size[1],
                    "num_outputs": 1,
                    "output_format": "png",
                    "guidance_scale": 2
                }
            )
            
            # Download the generated image
            image_url = output[0]
            download_image(image_url, filepath)
            
            print(f"    {filename}")
            successful += 1
            
            # Rate limiting - wait 2 seconds between requests
            if i < len(assets_to_generate):
                time.sleep(2)
            
        except Exception as e:
            print(f"    Failed: {e}")
            failed.append((asset_id, name, str(e)))
    
    print("")
    print(" Summary:")
    print(f"   Successful: {successful}/{len(assets_to_generate)}")
    
    if failed:
        print(f"    Failed: {len(failed)}")
        for asset_id, name, error in failed:
            print(f"     - Asset {asset_id} ({name}): {error}")
    
    print("")
    print("Next steps:")
    print(f"  1. Check generated assets in: {downloads_folder}")
    print("  2. Run: python tools/organize-assets.py")
    print("")

if __name__ == "__main__":
    import sys
    
    api_key = None
    start_from = 1
    dry_run = False
    
    # Parse command line arguments
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--api-key" and i + 1 < len(sys.argv) - 1:
            api_key = sys.argv[i + 2]
        elif arg == "--start-from" and i + 1 < len(sys.argv) - 1:
            start_from = int(sys.argv[i + 2])
        elif arg == "--dry-run":
            dry_run = True
        elif arg == "--help" or arg == "-h":
            print("Usage: python tools/auto-generate-assets.py [options]")
            print("")
            print("Options:")
            print("  --api-key KEY       Replicate API key")
            print("  --start-from N      Start from asset number N (default: 1)")
            print("  --dry-run           Preview without generating")
            print("  --help, -h          Show this help")
            print("")
            print("Example:")
            print('  python tools/auto-generate-assets.py --api-key "r8_abc123..."')
            sys.exit(0)
    
    generate_all_assets(api_key, start_from, dry_run)
