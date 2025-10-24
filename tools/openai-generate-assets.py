#!/usr/bin/env python3
"""
OpenAI DALL-E 3 Asset Generator for Age of War
Generates all 48 game assets automatically using DALL-E 3
"""

import os
import time
import requests
from pathlib import Path
from openai import OpenAI

# Asset definitions
ASSETS = [
    {"id": 1, "name": "clubman", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of a primitive caveman warrior holding a wooden club, wearing animal fur, brown and tan colors, 64x64 pixels style, transparent background, retro game sprite, crisp pixel edges, centered on white background"},
    {"id": 2, "name": "spearman", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of a Stone Age warrior with stone-tipped spear, leather armor, brown earth tones, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 3, "name": "slinger", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of primitive slinger holding sling weapon, light tribal clothing, brown and beige tones, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 4, "name": "dino-rider", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of caveman riding small dinosaur, prehistoric theme, brown and green colors, 96x96 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 5, "name": "swordsman", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of medieval knight with sword and shield, chainmail armor, grey and silver colors, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 6, "name": "archer", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of medieval archer drawing longbow, leather armor, brown and grey tones, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 7, "name": "knight", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of armored knight on horseback, full plate armor, grey and silver metallic, 96x96 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 8, "name": "ballista", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of medieval siege ballista, wooden frame with metal reinforcements, brown and grey, 96x96 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 9, "name": "musketeer", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of Renaissance musketeer with musket rifle, fancy plumed hat, blue and gold uniform, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 10, "name": "cavalry", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of Renaissance cavalry soldier on horse, bronze armor with blue accents, 96x96 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 11, "name": "cannon", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of Renaissance cannon on wooden wheels, bronze barrel, 96x96 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 12, "name": "duelist", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of Renaissance duelist with rapier sword, elegant clothing with burgundy and gold, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 13, "name": "rifleman", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of WW1 soldier with rifle, military uniform, olive green and brown, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 14, "name": "grenadier", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of modern grenadier with grenade launcher, tactical gear, dark green and black, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 15, "name": "tank", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of modern military tank, angular armor, olive green and grey camouflage, 128x96 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 16, "name": "sniper", "folder": "units", "size": "1024x1024", "prompt": "Pixel art side-view sprite of military sniper with scoped rifle, camouflage ghillie suit, green and brown tones, 64x64 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 17, "name": "stone-tower-t1", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of basic Stone Age defensive tower, wooden structure with stone reinforcements, brown tones, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 18, "name": "stone-tower-t2", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of improved Stone Age tower, more stones and wood, brown tones, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 19, "name": "stone-tower-t3", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of advanced Stone Age tower, heavily reinforced, brown tones, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 20, "name": "castle-tower-t1", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of basic medieval stone tower, grey stone with battlements, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 21, "name": "castle-tower-t2", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of reinforced medieval tower, taller structure, grey, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 22, "name": "castle-tower-t3", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of fortified medieval tower, heavy fortress, grey, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 23, "name": "cannon-tower-t1", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of basic Renaissance cannon tower, bronze cannon on stone platform, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 24, "name": "cannon-tower-t2", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of improved cannon tower, larger bronze cannon, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 25, "name": "cannon-tower-t3", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of advanced cannon tower, double cannons, bronze and blue, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 26, "name": "gun-turret-t1", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of basic modern gun turret, steel bunker with machine gun, grey and dark green, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 27, "name": "gun-turret-t2", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of reinforced gun turret, concrete bunker with dual guns, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 28, "name": "gun-turret-t3", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of advanced gun turret, armored bunker with heavy weapons, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 29, "name": "laser-turret-t1", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of basic futuristic laser turret, sleek metallic with glowing cyan core, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 30, "name": "laser-turret-t2", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of improved laser turret, larger glowing core, cyan and purple, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 31, "name": "laser-turret-t3", "folder": "turrets", "size": "1024x1024", "prompt": "Pixel art top-down view of advanced laser turret, sci-fi design with bright cyan energy, 48x48 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 32, "name": "player-base", "folder": "buildings", "size": "1024x1024", "prompt": "Pixel art side-view sprite of fortified main base building with blue color theme, defensive structure, 64x128 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 33, "name": "enemy-base", "folder": "buildings", "size": "1024x1024", "prompt": "Pixel art side-view sprite of fortified enemy base building with red color theme, defensive structure, 64x128 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 34, "name": "rock", "folder": "projectiles", "size": "1024x1024", "prompt": "Pixel art sprite of thrown rock projectile, brown stone, simple shape, 16x16 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 35, "name": "arrow", "folder": "projectiles", "size": "1024x1024", "prompt": "Pixel art sprite of flying arrow projectile, wooden shaft with metal tip, horizontal, 24x8 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 36, "name": "cannonball", "folder": "projectiles", "size": "1024x1024", "prompt": "Pixel art sprite of iron cannonball, dark grey sphere, 16x16 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 37, "name": "bullet", "folder": "projectiles", "size": "1024x1024", "prompt": "Pixel art sprite of bullet projectile, small brass shell, 12x4 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 38, "name": "laser", "folder": "projectiles", "size": "1024x1024", "prompt": "Pixel art sprite of futuristic laser beam, glowing cyan energy bolt, 32x8 pixels style, transparent background, retro game sprite, centered on white background"},
    {"id": 39, "name": "gold-coin", "folder": "ui", "size": "1024x1024", "prompt": "Pixel art icon of gold coin, shiny yellow with highlights, 32x32 pixels style, transparent background, retro game UI asset, centered on white background"},
    {"id": 40, "name": "xp-star", "folder": "ui", "size": "1024x1024", "prompt": "Pixel art icon of experience star, glowing white and yellow, 32x32 pixels style, transparent background, retro game UI asset, centered on white background"},
    {"id": 41, "name": "raining-rocks-icon", "folder": "ui", "size": "1024x1024", "prompt": "Pixel art icon showing falling meteors, brown and orange, 48x48 pixels style, transparent background, retro game UI button, centered on white background"},
    {"id": 42, "name": "artillery-strike-icon", "folder": "ui", "size": "1024x1024", "prompt": "Pixel art icon showing explosion bombardment, orange and red, 48x48 pixels style, transparent background, retro game UI button, centered on white background"},
    {"id": 43, "name": "turret-placeholder", "folder": "ui", "size": "1024x1024", "prompt": "Pixel art icon of generic turret silhouette, grey, simple shape, 32x32 pixels style, transparent background, retro game UI asset, centered on white background"},
    {"id": 44, "name": "stone-age-bg", "folder": "backgrounds", "size": "1792x1024", "prompt": "Pixel art game background, prehistoric landscape with caves and primitive trees, earth tones, 1280x720 pixels style, parallax-ready, retro game background"},
    {"id": 45, "name": "castle-age-bg", "folder": "backgrounds", "size": "1792x1024", "prompt": "Pixel art game background, medieval castle walls and banners, grey stone with blue sky, 1280x720 pixels style, parallax-ready, retro game background"},
    {"id": 46, "name": "renaissance-bg", "folder": "backgrounds", "size": "1792x1024", "prompt": "Pixel art game background, Renaissance city with architecture and flags, warm tones, 1280x720 pixels style, parallax-ready, retro game background"},
    {"id": 47, "name": "modern-bg", "folder": "backgrounds", "size": "1792x1024", "prompt": "Pixel art game background, modern city ruins and battlefield, grey and brown, 1280x720 pixels style, parallax-ready, retro game background"},
    {"id": 48, "name": "future-bg", "folder": "backgrounds", "size": "1792x1024", "prompt": "Pixel art game background, futuristic sci-fi cityscape with neon lights, cyan and purple, 1280x720 pixels style, parallax-ready, retro game background"},
]

def download_image(url, filepath):
    """Download image from URL"""
    response = requests.get(url)
    with open(filepath, 'wb') as f:
        f.write(response.content)

def generate_all_assets(api_key, start_from=1, batch_size=10):
    """Generate all assets using OpenAI DALL-E 3"""
    client = OpenAI(api_key=api_key)
    
    project_root = Path(__file__).parent.parent
    output_folder = project_root / "downloads" / "generated-assets"
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print("")
    print(" Age of War - OpenAI DALL-E 3 Asset Generator")
    print("")
    print(f"Generating {len(ASSETS)} assets...")
    print(f"Output folder: {output_folder}")
    print("")
    print(" Estimated cost: ~$1-2 for all 48 assets")
    print("")
    
    assets_to_generate = [a for a in ASSETS if a["id"] >= start_from]
    successful = 0
    failed = []
    
    for i, asset in enumerate(assets_to_generate, 1):
        asset_id = asset["id"]
        name = asset["name"]
        prompt = asset["prompt"]
        size = asset["size"]
        
        filename = f"asset-{asset_id}-{name}.png"
        filepath = output_folder / filename
        
        print(f"[{i}/{len(assets_to_generate)}] Asset {asset_id}/48: {name}")
        
        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            download_image(image_url, filepath)
            
            print(f"     {filename}")
            successful += 1
            
            # Rate limiting - DALL-E has 5 images/minute limit
            if i % batch_size == 0 and i < len(assets_to_generate):
                print(f"     Waiting 60s (rate limit)...")
                time.sleep(60)
            else:
                time.sleep(2)
            
        except Exception as e:
            print(f"     Failed: {e}")
            failed.append((asset_id, name, str(e)))
    
    print("")
    print(" Summary:")
    print(f"    Successful: {successful}/{len(assets_to_generate)}")
    
    if failed:
        print(f"    Failed: {len(failed)}")
        for asset_id, name, error in failed:
            print(f"      - Asset {asset_id} ({name}): {error}")
    
    print("")
    print("Next steps:")
    print(f"  1. Check generated assets in: {output_folder}")
    print("  2. Run: python tools/organize-assets.py")
    print("")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python tools/openai-generate-assets.py <API_KEY> [--start-from N]")
        sys.exit(1)
    
    api_key = sys.argv[1]
    start_from = 1
    
    for i, arg in enumerate(sys.argv[2:]):
        if arg == "--start-from" and i + 1 < len(sys.argv) - 2:
            start_from = int(sys.argv[i + 3])
    
    generate_all_assets(api_key, start_from)
