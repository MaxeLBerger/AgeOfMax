"""Compatibility entry point for the saved-scene Blender production pipeline.

Geometry is authored in art/blender/*.blend. See export_scenes.py and
art/blender/source-recovery.json for the initial generator recovery record.
"""
import runpy
from pathlib import Path

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('export_scenes.py')), run_name='__main__')
