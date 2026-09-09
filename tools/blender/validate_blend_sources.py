"""Open every delivered Blender source to verify it remains editable and complete."""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
records = []
for path in sorted((ROOT / 'art/blender').glob('*.blend')):
    if '.saving.' in path.name:
        continue
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene = bpy.context.scene
    if scene.camera is None or not any(obj.type == 'MESH' for obj in scene.objects):
        raise RuntimeError(f'Missing scene camera or geometry: {path.name}')
    if path.name.startswith('unit-') and not bpy.data.objects.get('Weapon muzzle / runtime socket'):
        raise RuntimeError(f'Missing editable weapon socket: {path.name}')
    records.append({'file': path.name, 'objects': len(scene.objects),
                    'camera': scene.camera.name,
                    'bones': sum(len(obj.data.bones) for obj in scene.objects if obj.type == 'ARMATURE')})
report = {'status':'passed','openedSources':len(records),'sources':records}
(ROOT / 'art/blender/blend-validation.json').write_text(json.dumps(report,indent=2))
print('BLEND_VALIDATION='+json.dumps({'status':'passed','openedSources':len(records)}))
