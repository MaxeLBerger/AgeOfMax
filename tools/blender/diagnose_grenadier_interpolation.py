import sys,json,math
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_bow_throw_family as B
import audit_animation_study as C
bpy.ops.wm.open_mainfile(filepath=str(B.STAGE/'grenadier/unit-grenadier.blend'))
s=bpy.context.scene;r=next(o for o in bpy.data.objects if o.type=='ARMATURE');actions=json.loads(s['animation_study_actions'])
for clip in ['walk','attack']:
 for name,action in actions[clip].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
 rows=[]
 for i in range(257):
  time=i/32;s.frame_set(math.floor(time),subframe=time%1);bpy.context.view_layer.update();p=r.pose.bones['weapon.grenade'];rest=r.data.bones['weapon.grenade'];q=p.matrix.to_quaternion()@rest.matrix_local.to_quaternion().inverted();expected=p.matrix.translation+q@Vector((-.04,.005,-.04));actual=C.center(bpy.data.objects['Hand']);rows.append(((actual-expected).length,time))
 print(clip,sorted(rows,reverse=True)[:12])
