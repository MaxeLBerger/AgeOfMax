"""Inspect saved authored Blender scenes without modifying them."""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
report = {}
for path in sorted((ROOT / 'art/blender').glob('unit-*.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene = bpy.context.scene
    scene.frame_set(1)
    objects = []
    for o in bpy.data.objects:
        objects.append({'name': o.name, 'type': o.type, 'location': list(o.location),
            'materials': [m.name for m in o.data.materials] if o.type == 'MESH' else [],
            'groups': list(o.vertex_groups.keys()) if o.type == 'MESH' else [],
            'modifiers': [(m.name, m.type) for m in o.modifiers]})
    poses = {}
    for frame in range(1, 9):
        scene.frame_set(frame)
        poses[frame] = {o.name: {p.name: list(p.rotation_euler) for p in o.pose.bones}
                       for o in bpy.data.objects if o.type == 'ARMATURE'}
    report[path.stem] = {'objects': objects, 'poses': poses,
        'texts': [t.name for t in bpy.data.texts],
        'camera': {'location': list(scene.camera.location), 'rotation': list(scene.camera.rotation_euler)},
        'render': {'engine': scene.render.engine, 'samples': scene.cycles.samples}}
(ROOT / 'art/blender/scene-inspection.json').write_text(json.dumps(report, indent=2))
print('Inspected', len(report), 'saved unit scenes')
