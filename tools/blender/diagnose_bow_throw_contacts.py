import sys,math
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_bow_throw_family as B
import audit_animation_study as C
for unit in ['slinger','grenadier']:
 bpy.ops.wm.open_mainfile(filepath=str(B.STAGE/unit/'baseline'/f'unit-{unit}.blend'))
 B.RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');B.BASE.RIG=B.RIG
 old={o.name:B.RANGED.mesh_contract(o) for o in bpy.data.objects if o.type=='MESH' and o.name!='Woven sling'}
 B.prepare_human(unit)
 print('REST_HAND',unit,list(C.center(bpy.data.objects['Hand'])),list(C.center(bpy.data.objects['Hand.001'])))
 if unit=='slinger':
  B.prepare_slinger();obj=bpy.data.objects['Sling stone'];print('BEFORE',list(obj.rotation_euler),[list(r) for r in obj.matrix_world]);B.BASE.PREVIOUS={};B.BASE.store_keys(obj,0);bpy.context.view_layer.update();print('AFTER',[list(r) for r in obj.matrix_world])
  print('CHANGED',[name for name,value in old.items() if value!=B.RANGED.mesh_contract(bpy.data.objects[name])])
 else:
  B.prepare_grenadier()
  for t in [0,.25,.375,.5,.75,1]:
   B.pose(unit,'attack',t);p=B.RIG.pose.bones['weapon.grenade'];r=B.RIG.data.bones['weapon.grenade'];rot=p.matrix.to_quaternion()@r.matrix_local.to_quaternion().inverted();expected=p.matrix.translation+rot@Vector((-.04,.005,-.04));near=C.center(bpy.data.objects['Hand']);print('DIRECT_GRIP',t,list(near),list(expected),(near-expected).length)
