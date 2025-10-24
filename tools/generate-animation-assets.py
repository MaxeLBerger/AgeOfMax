#!/usr/bin/env python3
'''
Animation Asset Generator for Age of Max
Generiert animierte Sprite-Frames für alle Units
'''

import os
import json
from pathlib import Path

# Animation-Definitionen für jede Unit
ANIMATION_ASSETS = [
    # ===== STONE AGE UNITS =====
    {
        'name': 'clubman',
        'epoch': 'stone_age',
        'size': (64, 64),
        'animations': {
            'idle': {
                'frames': 4,
                'prompts': [
                    'Pixel art side-view sprite of caveman warrior standing still, frame 1 of idle animation, holding club down, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior breathing cycle, frame 2 of idle animation, club slightly moving, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior standing, frame 3 of idle animation, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior idle, frame 4 of idle animation, 64x64, transparent background',
                ]
            },
            'walk': {
                'frames': 6,
                'prompts': [
                    'Pixel art side-view sprite of caveman warrior walking, frame 1 of 6, left foot forward, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior walking, frame 2 of 6, mid-stride, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior walking, frame 3 of 6, right foot forward, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior walking, frame 4 of 6, mid-stride, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior walking, frame 5 of 6, left foot forward, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman warrior walking, frame 6 of 6, ready to loop, 64x64, transparent background',
                ]
            },
            'attack': {
                'frames': 5,
                'prompts': [
                    'Pixel art side-view sprite of caveman raising club up, frame 1 of attack animation, preparing strike, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman with club at peak, frame 2 of attack, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman swinging club down, frame 3 of attack, motion blur, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman club hitting ground, frame 4 of attack, impact, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman recovering from swing, frame 5 of attack, 64x64, transparent background',
                ]
            },
            'death': {
                'frames': 4,
                'prompts': [
                    'Pixel art side-view sprite of caveman getting hit, frame 1 of death animation, stumbling, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman falling backward, frame 2 of death, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman hitting ground, frame 3 of death, 64x64, transparent background',
                    'Pixel art side-view sprite of caveman lying dead on ground, frame 4 of death, final frame, 64x64, transparent background',
                ]
            }
        }
    },
    
    # Weitere Units können hier hinzugefügt werden...
]

def generate_animation_manifest():
    '''Erstellt eine Manifest-Datei mit allen Animationen'''
    manifest = {
        'version': '1.0',
        'units': []
    }
    
    for unit in ANIMATION_ASSETS:
        unit_data = {
            'name': unit['name'],
            'epoch': unit['epoch'],
            'size': unit['size'],
            'animations': {}
        }
        
        for anim_name, anim_data in unit['animations'].items():
            unit_data['animations'][anim_name] = {
                'frames': anim_data['frames'],
                'fps': 12 if anim_name == 'walk' else 8,
                'loop': anim_name in ['idle', 'walk']
            }
        
        manifest['units'].append(unit_data)
    
    return manifest

if __name__ == '__main__':
    manifest = generate_animation_manifest()
    
    # Speichere Manifest
    with open('tools/animation-manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(' Animation Manifest erstellt!')
    print(f'   {len(ANIMATION_ASSETS)} Units mit Animationen')
    
    # Zähle alle Frames
    total_frames = 0
    for unit in ANIMATION_ASSETS:
        for anim in unit['animations'].values():
            total_frames += anim['frames']
    
    print(f'   {total_frames} Frames insgesamt')
