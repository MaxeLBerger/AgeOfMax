"""Project candidate attack poses before committing the animation keys."""
import bpy, json, math
from pathlib import Path
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/blender/unit-clubman.blend'))
s=bpy.context.scene
s.frame_set(7)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
obj=bpy.data.objects['Stone warclub head']
def center(o):
    e=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    vs=[e.matrix_world@v.co for v in e.data.vertices]
    p=sum(vs,Vector())/len(vs)
    c=world_to_camera_view(s,s.camera,p)
    return [round(c.x*256,1),round((1-c.y)*256,1)]
report=[]
for upper in [-2,-1.5,-1,-.5,0,.5,1,1.5,2]:
    for fore in [-2,-1.5,-1,-.5,0,.5,1,1.5,2]:
        rig.pose.bones['arm.near'].rotation_euler.z=upper
        rig.pose.bones['forearm.near'].rotation_euler.z=fore
        bpy.context.view_layer.update()
        head=center(obj);hand=center(bpy.data.objects['Hand'])
        report.append({'upper':upper,'fore':fore,'head':head,'hand':hand,
                       'score':(head[0]-194)**2+(head[1]-151)**2})
print('POSE_CANDIDATES='+json.dumps(sorted(report,key=lambda r:r['score'])[:15]))
