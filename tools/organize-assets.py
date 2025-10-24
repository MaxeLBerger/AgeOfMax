#!/usr/bin/env python3
"""
Asset Organizer for Age of War Game
Automatically renames and moves downloaded assets to correct folders
"""

import os
import shutil
from pathlib import Path

# Asset mapping: filename pattern -> (folder, final_name)
ASSET_MAP = {
    # Units - Stone Age
    '1': ('units', 'clubman.png'),
    '2': ('units', 'spearman.png'),
    '3': ('units', 'slinger.png'),
    '4': ('units', 'dino-rider.png'),
    
    # Units - Castle Age
    '5': ('units', 'swordsman.png'),
    '6': ('units', 'archer.png'),
    '7': ('units', 'knight.png'),
    '8': ('units', 'ballista.png'),
    
    # Units - Renaissance
    '9': ('units', 'musketeer.png'),
    '10': ('units', 'cavalry.png'),
    '11': ('units', 'cannon.png'),
    '12': ('units', 'duelist.png'),
    
    # Units - Modern
    '13': ('units', 'rifleman.png'),
    '14': ('units', 'grenadier.png'),
    '15': ('units', 'tank.png'),
    '16': ('units', 'sniper.png'),
    
    # Turrets - Stone Age
    '17': ('turrets', 'stone-tower-t1.png'),
    '18': ('turrets', 'stone-tower-t2.png'),
    '19': ('turrets', 'stone-tower-t3.png'),
    
    # Turrets - Castle Age
    '20': ('turrets', 'castle-tower-t1.png'),
    '21': ('turrets', 'castle-tower-t2.png'),
    '22': ('turrets', 'castle-tower-t3.png'),
    
    # Turrets - Renaissance
    '23': ('turrets', 'cannon-tower-t1.png'),
    '24': ('turrets', 'cannon-tower-t2.png'),
    '25': ('turrets', 'cannon-tower-t3.png'),
    
    # Turrets - Modern
    '26': ('turrets', 'gun-turret-t1.png'),
    '27': ('turrets', 'gun-turret-t2.png'),
    '28': ('turrets', 'gun-turret-t3.png'),
    
    # Turrets - Future
    '29': ('turrets', 'laser-turret-t1.png'),
    '30': ('turrets', 'laser-turret-t2.png'),
    '31': ('turrets', 'laser-turret-t3.png'),
    
    # Buildings
    '32': ('buildings', 'player-base.png'),
    '33': ('buildings', 'enemy-base.png'),
    
    # Projectiles
    '34': ('projectiles', 'rock.png'),
    '35': ('projectiles', 'arrow.png'),
    '36': ('projectiles', 'cannonball.png'),
    '37': ('projectiles', 'bullet.png'),
    '38': ('projectiles', 'laser.png'),
    
    # UI Elements
    '39': ('ui', 'gold-coin.png'),
    '40': ('ui', 'xp-star.png'),
    '41': ('ui', 'raining-rocks-icon.png'),
    '42': ('ui', 'artillery-strike-icon.png'),
    '43': ('ui', 'turret-placeholder.png'),
    
    # Backgrounds
    '44': ('backgrounds', 'stone-age-bg.png'),
    '45': ('backgrounds', 'castle-age-bg.png'),
    '46': ('backgrounds', 'renaissance-bg.png'),
    '47': ('backgrounds', 'modern-bg.png'),
    '48': ('backgrounds', 'future-bg.png'),
}

def find_downloads_folder():
    """Find the user's Downloads folder"""
    home = Path.home()
    downloads = home / 'Downloads'
    if downloads.exists():
        return downloads
    return None

def organize_assets(source_folder=None, dry_run=False):
    """
    Organize assets from source folder to public/assets/
    
    Args:
        source_folder: Path to folder with downloaded assets (default: Downloads)
        dry_run: If True, only show what would be done without moving files
    """
    if source_folder is None:
        source_folder = find_downloads_folder()
    
    if not source_folder or not Path(source_folder).exists():
        print(f' Source folder not found: {source_folder}')
        return
    
    source_path = Path(source_folder)
    project_root = Path(__file__).parent.parent
    assets_root = project_root / 'public' / 'assets'
    
    print(f' Source folder: {source_path}')
    print(f' Target folder: {assets_root}')
    print('')
    
    # Find all image files that might be assets
    image_files = list(source_path.glob('*.png')) + list(source_path.glob('*.jpg')) + list(source_path.glob('*.webp'))
    
    moved_count = 0
    skipped_count = 0
    
    for img_file in sorted(image_files):
        # Try to extract asset number from filename
        asset_num = None
        filename_lower = img_file.stem.lower()
        
        # Try different patterns: "asset-1", "1", "clubman", etc.
        for num in ASSET_MAP.keys():
            if num in filename_lower or f'asset-{num}' in filename_lower or f'asset{num}' in filename_lower:
                asset_num = num
                break
        
        if asset_num and asset_num in ASSET_MAP:
            folder, final_name = ASSET_MAP[asset_num]
            target_dir = assets_root / folder
            target_file = target_dir / final_name
            
            # Create target directory if it doesn't exist
            if not dry_run:
                target_dir.mkdir(parents=True, exist_ok=True)
            
            print(f' Asset {asset_num}: {img_file.name}')
            print(f'    {target_file.relative_to(project_root)}')
            
            if not dry_run:
                shutil.copy2(img_file, target_file)
            
            moved_count += 1
        else:
            print(f'  Skipped: {img_file.name} (no matching asset number)')
            skipped_count += 1
    
    print('')
    print(f' Summary:')
    print(f'    Organized: {moved_count} assets')
    print(f'     Skipped: {skipped_count} files')
    
    if dry_run:
        print('')
        print(' DRY RUN - No files were actually moved')
        print('   Run without --dry-run to move files')

def list_missing_assets():
    """List assets that are still missing"""
    project_root = Path(__file__).parent.parent
    assets_root = project_root / 'public' / 'assets'
    
    missing = []
    
    for asset_num, (folder, filename) in ASSET_MAP.items():
        target_file = assets_root / folder / filename
        if not target_file.exists():
            missing.append((asset_num, folder, filename))
    
    if missing:
        print(f' Missing {len(missing)} assets:')
        print('')
        for num, folder, filename in missing:
            print(f'   Asset {num.rjust(2)}: {folder}/{filename}')
    else:
        print(' All 48 assets are present!')
    
    return len(missing)

if __name__ == '__main__':
    import sys
    
    if '--dry-run' in sys.argv:
        print(' DRY RUN MODE - No files will be moved')
        print('')
        organize_assets(dry_run=True)
    elif '--check' in sys.argv:
        list_missing_assets()
    elif '--help' in sys.argv or '-h' in sys.argv:
        print('Usage:')
        print('  python tools/organize-assets.py          # Organize assets from Downloads')
        print('  python tools/organize-assets.py --dry-run # Preview what would be done')
        print('  python tools/organize-assets.py --check   # Check which assets are missing')
    else:
        organize_assets()
        print('')
        print('Checking for missing assets...')
        print('')
        missing_count = list_missing_assets()
        
        if missing_count == 0:
            print('')
            print(' All assets ready! You can now update BootScene.ts')
