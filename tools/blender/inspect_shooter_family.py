"""Read saved player/enemy rifle bindings before authoring the ranged family study."""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/ranged-family-2'
STAGE.mkdir(parents=True,exist_ok=True)
report={}
for unit in ['musketeer','laser-soldier','plasma-trooper']:
    for faction in ['player','enemy']:
        suffix='-enemy' if faction=='enemy' else ''
        path=ROOT/f'art/blender/unit-{unit}{suffix}.blend'
        bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene;scene.frame_set(1)
        rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
        objects={obj.name:{'type':obj.type,'location':list(obj.location),'scale':list(obj.scale),
                          'parent':obj.parent.name if obj.parent else None,
                          'groups':list(obj.vertex_groups.keys()) if obj.type=='MESH' else [],
                          'materials':[mat.name for mat in obj.data.materials] if obj.type=='MESH' else []}
                 for obj in bpy.data.objects}
        bones={b.name:{'head':list(b.head_local),'tail':list(b.tail_local),'parent':b.parent.name if b.parent else None} for b in rig.data.bones}
        curves=[{'path':curve.data_path,'axis':curve.array_index,'keys':[[float(key.co.x),float(key.co.y),key.interpolation] for key in curve.keyframe_points]}
                for curve in rig.animation_data.action.fcurves]
        report[unit+suffix]={'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'scene_properties':{k:str(scene[k]) for k in scene.keys()},
                             'objects':objects,'bones':bones,'action':rig.animation_data.action.name,'curves':curves}
        print(unit,faction,'bones',list(bones),'properties',report[unit+suffix]['scene_properties'])
        print('weapon_parts',[(name,obj['location'],obj['groups']) for name,obj in objects.items() if any(word in name.lower() for word in ['rifle','stock','receiver','grip','magazine','hand','boot','sole','musket','laser','plasma','coil','barrel','flint','energy'])])
(STAGE/'source-inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
