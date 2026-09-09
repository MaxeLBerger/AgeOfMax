"""Render the saved club attack sequence as four review images."""
import runpy
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
art = runpy.run_path(str(ROOT / 'tools/blender/export_scenes.py'), run_name='art_library')
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art/blender/unit-clubman.blend'))
art['configure_renderer'](48)
for frame in range(5, 9):
    bpy.context.scene.frame_set(frame)
    art['render_atomic'](ROOT / 'art/blender/attack-review' / f'{frame-1}.png')
