"""Read-only geometric bearing and clearance audit for the staged Stone scene."""
import hashlib
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
import refine_stone

source=ROOT/'art/blender/candidates/stone-v2/candidate.blend'
before=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
bpy.context.view_layer.update()
root=bpy.data.objects['STN_MegalithShelter']
roof=bpy.data.objects['STN_BroadFlatBearingCapstone']
supports=[bpy.data.objects['STN_DolmenBearingOrthostat'+suffix] for suffix in ('','.001','.002')]
height=root['bearing_elevation']
contacts=[]
for support,(sx,sy) in zip(supports,[(-1.28,-.08),(1.27,-.08),(0,.78)]):
    for dx in (-.08,0,.08):
        for dy in (-.08,0,.08):
            x,y=sx+dx,sy+dy
            hit_cap,cap,normal,index=roof.ray_cast(Vector((x,y,height-.2)),Vector((0,0,1)),distance=.5)
            hit_support,bearing,normal,index=support.ray_cast(Vector((x,y,height+.2)),Vector((0,0,-1)),distance=.5)
            assert hit_cap and hit_support,(support.name,'missing bearing',dx,dy)
            gap=abs(cap.z-bearing.z)
            assert gap<.001,(support.name,gap,dx,dy)
            contacts.append({'support':support.name,'sample_offset':[dx,dy],
                             'cap_underside':cap.z,'orthostat_top':bearing.z,'gap':gap})
scene=bpy.context.scene;deps=bpy.context.evaluated_depsgraph_get()
entrances=[]
for name,depth in [('STN_MainHideShelter',3.4),('STN_SmallToolShelter',2.7)]:
    shelter=bpy.data.objects[name]
    for offset in (-.20,0,.20):
        start=shelter.matrix_world@Vector((offset,-depth/2-.10,.65))
        direction=(shelter.matrix_world.to_3x3()@Vector((0,1,0))).normalized()
        hit,point,normal,index,obj,matrix=scene.ray_cast(deps,start,direction,distance=.55)
        assert not hit,(name,offset,obj.name if obj else None)
        entrances.append({'shelter':name,'horizontal_offset':offset,'clear_depth':.55,'passed':True})
all_objects=[obj for obj in bpy.data.objects if obj.name.startswith('STN_') and not obj.hide_render and obj.type in {'MESH','CURVE'}]
projected=refine_stone.bounds(all_objects)
assert projected[1]>=95 and projected[3]<=410,projected
assert before==hashlib.sha256(source.read_bytes()).hexdigest()
report={'status':'passed','source_sha256':before,'source_unchanged':True,'dolmen_bearing_contacts':contacts,
        'entrance_clearance_rays':entrances,'all_new_geometry_bounds_1280x720':projected,
        'all_new_geometry_above_combat_lane':True}
refine_stone.write_json(source.parent/'geometry-validation.json',report)
print('STONE_GEOMETRY_VALIDATED '+json.dumps(report))
