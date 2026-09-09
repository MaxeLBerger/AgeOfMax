"""Read the actual animation actions before designing the isolated 16-frame study."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'art/blender/candidates/animation-v3'
OUT.mkdir(parents=True,exist_ok=True)

def vec(v):
    return [round(float(x),6) for x in v]

def center(obj):
    obj=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    return sum(points,Vector())/len(points)

report={}
for unit in ['clubman','knight']:
    source=ROOT/f'art/blender/unit-{unit}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    s=bpy.context.scene;s.frame_set(1)
    rigs=[o for o in bpy.data.objects if o.type=='ARMATURE']
    entries={}
    for obj in bpy.data.objects:
        entry={'type':obj.type,'parent':obj.parent.name if obj.parent else None,'location':vec(obj.location),'scale':vec(obj.scale)}
        if obj.type=='MESH':
            entry.update(center=vec(center(obj)),groups=list(obj.vertex_groups.keys()))
        if obj.animation_data and obj.animation_data.action:
            action=obj.animation_data.action
            entry['action']={'name':action.name,'curves':[{'path':curve.data_path,'index':curve.array_index,
                'keys':[[*vec(key.co),key.interpolation] for key in curve.keyframe_points]} for curve in action.fcurves]}
        entries[obj.name]=entry
    bones={rig.name:{b.name:{'head':vec(b.head_local),'tail':vec(b.tail_local),'parent':b.parent.name if b.parent else None}
                    for b in rig.data.bones} for rig in rigs}
    samples=[]
    selected=[o for o in bpy.data.objects if o.type=='MESH' and any(t in o.name.lower() for t in ['sole','hoof','hand','handle','spear','lance','mount','muzzle'])]
    for time in [1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8]:
        s.frame_set(math.floor(time),subframe=time%1)
        bpy.context.view_layer.update()
        samples.append({'time':time,'centers':{o.name:vec(center(o)) for o in selected},
                        'rig_matrices':{rig.name:{p.name:[vec(row) for row in p.matrix] for p in rig.pose.bones} for rig in rigs}})
    report[unit]={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'objects':entries,'bones':bones,
                  'scene':{'fps':s.render.fps,'start':s.frame_start,'end':s.frame_end,'camera':s.camera.name,
                           'custom':{k:str(s[k]) for k in s.keys()}},'samples':samples}
    animated=[name for name,value in entries.items() if 'action' in value]
    print(unit,'objects',len(entries),'animated',animated,'bones',bones)
(OUT/'original-action-inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
