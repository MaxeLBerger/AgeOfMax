"""Audit and archive all ten canonical melee sources before animation work."""
import hashlib,json,sys,math
from pathlib import Path
import bpy
from mathutils import Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_ranged_animation_study as COMMON
ROOT=COMMON.ROOT;ART=COMMON.ART
STAGE=ROOT/'art/blender/candidates/animation-v3/melee-family'
UNITS=['clubman','spearman','swordsman','duelist','super-heavy']
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def vec(v):return [round(float(x),7) for x in v]
def center(obj):
    e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh()
    pts=[e.matrix_world@v.co for v in m.vertices];e.to_mesh_clear()
    from mathutils import Vector
    return sum(pts,Vector())/len(pts)
report={}
for unit in UNITS:
    for faction in ['player','enemy']:
        suffix='-enemy' if faction=='enemy' else '';key=unit+suffix
        directory=STAGE/key;baseline=directory/'baseline';baseline.mkdir(parents=True,exist_ok=True)
        source=ROOT/f'art/blender/unit-{key}.blend';sheet=ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'
        for origin in [source,sheet]:
            target=baseline/origin.name
            if not target.exists():
                temp=target.with_suffix(target.suffix+'.copying');temp.write_bytes(origin.read_bytes());ART['replace_atomic'](temp,target)
            assert digest(origin)==digest(target),('Baseline differs',key,origin.name)
        bpy.ops.wm.open_mainfile(filepath=str(baseline/source.name),load_ui=False)
        scene=bpy.context.scene;rig=next(obj for obj in bpy.data.objects if obj.type=='ARMATURE')
        animated={obj.name:obj.animation_data.action.name for obj in bpy.data.objects if obj.animation_data and obj.animation_data.action}
        bones={b.name:{'head':vec(b.head_local),'tail':vec(b.tail_local),'parent':b.parent.name if b.parent else None} for b in rig.data.bones}
        names=[obj.name for obj in bpy.data.objects if obj.type=='MESH' and any(word in obj.name.lower() for word in ['hand','finger','boot','sole','sword','spear','club','hammer','shield','hilt','haft','grip','handle','pommel','blade'])]
        frames={}
        for frame in [1,3,5,6,7,8]:
            scene.frame_set(frame);bpy.context.view_layer.update()
            frames[str(frame)]={name:vec(center(bpy.data.objects[name])) for name in names}
        scene.frame_set(1);rig.animation_data_clear()
        for pose in rig.pose.bones:pose.matrix_basis=Matrix.Identity(4)
        bpy.context.view_layer.update()
        objects={}
        for obj in bpy.data.objects:
            if obj.type!='MESH':continue
            coords=[obj.matrix_world@v.co for v in obj.data.vertices]
            objects[obj.name]={'groups':list(obj.vertex_groups.keys()),'materials':[m.name for m in obj.data.materials],
                'geometry_sha256':COMMON.mesh_contract(obj),'bindings_sha256':COMMON.mesh_contract(obj,True),
                'rest_center':vec(sum(coords,__import__('mathutils').Vector())/len(coords)),
                'world_extents':[[min(v[i] for v in coords),max(v[i] for v in coords)] for i in range(3)],
                'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons)}
        entry={'unit':unit,'faction':faction,'source_sha256':digest(source),'sheet_sha256':digest(sheet),
            'socket_file_sha256':digest(ROOT/'public/assets/reborn/weapon-sockets.json'),
            'scene_properties':{k:str(scene[k]) for k in scene.keys()},'animated_objects':animated,'bones':bones,
            'camera':{'matrix':[list(row) for row in scene.camera.matrix_world],'scale':scene.camera.data.ortho_scale,
                      'resolution':[scene.render.resolution_x,scene.render.resolution_y]},
            'objects':objects,'sampled_source_centers':frames}
        report[key]=entry
        ART['write_json_atomic'](directory/'source-inspection.json',entry)
        print('MELEE_SOURCE',key,json.dumps({'bones':bones,'properties':entry['scene_properties'],
             'selected':{name:objects[name] for name in names if not name.startswith('Fingers')}}),flush=True)
ART['write_json_atomic'](STAGE/'source-inspection.json',report)
