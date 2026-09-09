import bpy,json,hashlib,os
from pathlib import Path
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/machine-family'
STAGE.mkdir(parents=True,exist_ok=True)
report={}
for unit in ['cannon','tank']:
 for faction in ['player','enemy']:
  key=unit+('-enemy' if faction=='enemy' else '')
  path=ROOT/f'art/blender/unit-{key}.blend'
  bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene;scene.frame_set(1)
  objects={}
  for obj in bpy.data.objects:
   record={'type':obj.type,'location':list(obj.location),'rotation':list(obj.rotation_euler),'scale':list(obj.scale),'matrix':[list(row) for row in obj.matrix_world],'parent':obj.parent.name if obj.parent else None}
   if obj.type=='MESH':
    coords=[list(v.co) for v in obj.data.vertices]
    record.update(vertices=len(coords),bounds=[[min(v[i] for v in coords),max(v[i] for v in coords)] for i in range(3)],groups=list(obj.vertex_groups.keys()),materials=[m.name for m in obj.data.materials],modifiers=[(m.name,m.type,getattr(getattr(m,'object',None),'name',None)) for m in obj.modifiers],mesh_sha256=hashlib.sha256(json.dumps({'v':coords,'p':[list(p.vertices) for p in obj.data.polygons]},sort_keys=True).encode()).hexdigest())
   if obj.type=='ARMATURE':
    record['bones']={b.name:{'head':list(b.head_local),'tail':list(b.tail_local),'parent':b.parent.name if b.parent else None} for b in obj.data.bones}
   if obj.animation_data and obj.animation_data.action:
    record['action']=obj.animation_data.action.name
    record['curves']=[{'path':c.data_path,'axis':c.array_index,'keys':[[float(k.co.x),float(k.co.y),k.interpolation] for k in c.keyframe_points]} for c in obj.animation_data.action.fcurves]
   objects[obj.name]=record
  camera=scene.camera;right=camera.matrix_world.to_3x3().col[0].copy();right.z=0;right.normalize()
  projection=(world_to_camera_view(scene,camera,right)-world_to_camera_view(scene,camera,Vector())).x*256
  report[key]={'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'scene_properties':{k:str(scene[k]) for k in scene.keys()},'camera':camera.name,'right':list(right),'raw_pixels_per_world_unit':projection,'objects':objects}
  print('INSPECTED',key,len(objects),flush=True)
p=STAGE/'source-inspection.json';tmp=p.with_suffix('.writing.json');tmp.write_text(json.dumps(report,indent=2),encoding='utf-8');os.replace(tmp,p)
