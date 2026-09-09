import sys,json
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_bow_throw_family as B
p=B.STAGE/'slinger/baseline/unit-slinger.blend'
bpy.ops.wm.open_mainfile(filepath=str(p));B.RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');B.BASE.RIG=B.RIG
def detail(o):
 return {'matrix':[list(r) for r in o.matrix_world], 'vertices':[list(v.co) for v in o.data.vertices], 'parent':o.parent.name if o.parent else None,'materials':[m.name for m in o.data.materials]}
old={o.name:detail(o) for o in bpy.data.objects if o.type=='MESH' and o.name!='Woven sling'}
B.prepare_human('slinger');B.prepare_slinger()
for name,record in old.items():
 now=detail(bpy.data.objects[name])
 if record!=now:print('CHANGED',name,json.dumps({key:{'before':record[key],'after':now[key]} for key in record if record[key]!=now[key]}))
