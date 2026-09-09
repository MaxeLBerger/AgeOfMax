"""Read rest geometry of bow/string/sling/grenade meshes without saving sources."""
import json
from pathlib import Path
import bpy
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/bow-throw-family'
report={}
for unit,names in {'archer':['Yew longbow','Bowstring','Nocked arrow','Arrowhead'],
                   'slinger':['Woven sling','Loaded sling pouch','Sling stone'],
                   'grenadier':['Segmented grenade','Grenade lever','Grenade pin']}.items():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'art/blender/unit-{unit}.blend'))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data_clear()
    for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update();report[unit]={}
    for name in names:
        obj=bpy.data.objects[name];points=[obj.matrix_world@v.co for v in obj.data.vertices]
        low=[min(p[i] for p in points) for i in range(3)];high=[max(p[i] for p in points) for i in range(3)]
        record={'vertices':len(points),'polygons':len(obj.data.polygons),'bounds':[low,high],
                'materials':[m.name for m in obj.data.materials],'modifiers':[(m.type,m.name) for m in obj.modifiers],
                'sample_world_points':[list(p) for p in points[::max(1,len(points)//32)]],
                'distinct_z':sorted(set(round(p.z,3) for p in points)),
                'distinct_x':sorted(set(round(p.x,3) for p in points))}
        report[unit][name]=record
        print(unit,name,'vertices',len(points),'bounds',low,high,'modifiers',record['modifiers'])
(STAGE/'mechanism-inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
