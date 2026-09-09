"""Reopen machine candidates and measure clips, contact, closures and source retention."""
import json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,kdtree
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).parent))
import build_machine_animation_study as BUILD

def vertices(objects):
 points=[]
 for obj in objects:
  evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
  mesh=evaluated.to_mesh()
  points.extend([evaluated.matrix_world@p.co for p in mesh.vertices]);evaluated.to_mesh_clear()
 return points
def nearest_gap(a,b):
 tree=kdtree.KDTree(len(b))
 for i,p in enumerate(b):tree.insert(p,i)
 tree.balance()
 return max(tree.find(p)[2] for p in a)
def projected(point):
 s=bpy.context.scene;p=world_to_camera_view(s,s.camera,point)
 return Vector((p.x*256,(1-p.y)*256))
def activate(actions,clip,t):
 for obj,action in actions[clip].items():bpy.data.objects[obj].animation_data.action=bpy.data.actions[action]
 frame=t*8;bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
def bounds(points):return [[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
results={};issues=[]
for unit in BUILD.SPEED:
 for faction in ['player','enemy']:
  key=unit+('-enemy' if faction=='enemy' else '');directory=BUILD.STAGE/key
  path=directory/f'unit-{key}.blend';check=json.loads((directory/'model-check.json').read_text())
  bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene
  assert scene['animation_study_revision']==3
  actions=json.loads(scene['animation_study_actions']);gait=json.loads(scene['animation_study_gait'])
  unchanged={relative:BUILD.digest(BUILD.ROOT/relative)==sha for relative,sha in check['source_hashes'].items()}
  original_meshes={o.name:BUILD.mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'}
  assert original_meshes==check['mesh_contracts']
  meshes=[o for o in bpy.data.objects if o.type=='MESH']
  wheels=[o for o in meshes if o.name.startswith(('Gun carriage wheel','Iron wheel rim','Wooden wheel spoke','Road wheel','Wheel hub'))]
  tracks=[o for o in meshes if o.name.startswith('Animated individual track shoe')]
  moving_names={*actions['walk']}
  fixed=[o for o in meshes if o.name not in moving_names]
  barrel_names=['Gun barrel','Dark muzzle'] if unit=='cannon' else ['Tank cannon','Muzzle bore']
  wheel_probe=bpy.data.objects['Gun carriage wheel' if unit=='cannon' else 'Road wheel']
  probe_vertex=max(wheel_probe.data.vertices,key=lambda v:v.co.x).co.copy()
  first_wheel_angle=None;previous_wheel_angle=None;wheel_rotation_error=0;measured_turn=0
  fixed_reference={};drift=0;marker_error=0;min_contacts=[];cycle_positions=[];attack_positions=[];sockets=[];track_ground={}
  for clip in ['walk','attack']:
   samples=[]
   for i in range(257):
    t=i/256;activate(actions,clip,t)
    if clip=='walk':
     radial=wheel_probe.matrix_world.to_3x3()@probe_vertex
     angle=math.atan2(-radial.z,radial.x)
     if previous_wheel_angle is not None:
      while angle-previous_wheel_angle>math.pi:angle-=math.tau
      while angle-previous_wheel_angle< -math.pi:angle+=math.tau
     if first_wheel_angle is None:first_wheel_angle=angle
     previous_wheel_angle=angle;measured_turn=angle-first_wheel_angle
     expected=math.radians(check['mechanism']['cycle_rotation_degrees'])*t
     wheel_rotation_error=max(wheel_rotation_error,abs(measured_turn-expected))
    for obj in fixed:
     p=obj.matrix_world.translation
     if obj.name not in fixed_reference:fixed_reference[obj.name]=p.copy()
     drift=max(drift,(p-fixed_reference[obj.name]).length)
    root=bpy.data.objects['Mechanical motion rig'];drift=max(drift,root.location.length)
    actual=BUILD.ART['weapon_points'](unit);marker=bpy.data.objects[BUILD.SOCKET].matrix_world.translation
    marker_error=max(marker_error,(projected(actual)-projected(marker)).length)
    if i%32==0 and i<256:sockets.append([round(x,3) for x in projected(actual)])
    if i%32==0:
     vp=vertices(wheels+tracks)
     samples.append(vp)
     min_contacts.append(min(p.z for p in vp))
    if clip=='walk' and tracks:
     mechanism=check['mechanism'];r=mechanism['track_radius_world']
     bottom=sum(mechanism['new_centerline_z_extent_world'])/2-r
     for obj in tracks:
      p=obj.matrix_world.translation
      if abs(p.z-bottom)<1e-6:
       value=p.x+check['gait']['cycleDistancePixels']/check['gait']['referenceDisplayScale']/mechanism['raw_pixels_per_world_axis_unit']*t
       track_ground.setdefault(obj.name,[]).append([t,value])
    if clip=='attack':attack_positions.append(list(actual))
   if clip=='walk':cycle_positions=samples
   else:
    attack_contact_geometry=samples
  loop_gap=max(nearest_gap(cycle_positions[0],cycle_positions[-1]),nearest_gap(cycle_positions[-1],cycle_positions[0]))
  # Only compare contiguous stance runs; a track shoe can leave/re-enter ground.
  stance_drift=0
  for rows in track_ground.values():
   first=last=None
   for t,x in rows:
    if last is None or t-last>1/256+1e-7:first=x
    stance_drift=max(stance_drift,abs(x-first));last=t
  attack_support_gap=max(nearest_gap(attack_contact_geometry[0],p) for p in attack_contact_geometry)
  activate(actions,'walk',0);walk_geometry=vertices(meshes)
  activate(actions,'attack',1);recovery_gap=nearest_gap(walk_geometry,vertices(meshes))
  expected=check['sockets'];sockets_match=sockets==expected
  deltas=[max((a-b).length for a,b in zip(cycle_positions[i],cycle_positions[i+1])) for i in range(8)]
  # Exact source transformations are not symmetric permutations; this confirms
  # there is actual moving geometry in every exported interval.
  assert all(delta>1e-4 for delta in deltas)
  total_recoil=max(attack_positions[0][0]-p[0] for p in attack_positions)
  player=results.get(unit)
  team_error=max((Vector(a)-Vector(b)).length for a,b in zip(player['sockets'],sockets)) if player else 0
  result={'passed':all(unchanged.values()) and drift<1e-7 and marker_error<.02 and loop_gap<1e-4 and recovery_gap<1e-4 and attack_support_gap<1e-7 and stance_drift<1e-4 and sockets_match and team_error<=.001 and wheel_rotation_error<1e-5,
   'source_sha256':BUILD.digest(path),'production_unchanged':all(unchanged.values()),
   'mesh_count':len(original_meshes),'mesh_material_binding_contracts_preserved':True,
   'samples_per_clip':257,'fixed_chassis_max_translation_world':drift,
   'marker_geometry_max_error_raw_pixels':marker_error,
   'anonymous_mechanism_loop_gap_world':loop_gap,'attack_support_gap_world':attack_support_gap,
   'attack_recovery_gap_world':recovery_gap,
   'track_stance_forward_corrected_drift_world':stance_drift,
   'measured_wheel_turn_degrees':math.degrees(measured_turn),'wheel_angular_phase_error_radians':wheel_rotation_error,
   'support_bounds_z_world':[min(min_contacts),max(min_contacts)],
   'adjacent_walk_material_point_displacement_world':deltas,
   'max_muzzle_recoil_world_x':total_recoil,'gait':gait,'sockets':sockets,
   'team_socket_max_error_raw_pixels':team_error,
   'note':'Closure allows permutation of identical spokes/shoes; source mesh topology and material bindings are unchanged. Pixel texture seam is a separate render check.'}
  results[key]=result
  if not result['passed']:issues.append(key)
  print('MACHINE_AUDIT',key,json.dumps({k:v for k,v in result.items() if k not in ['sockets','gait']}),flush=True)
BUILD.write_json(BUILD.STAGE/'source-audit.json',{'passed':not issues,'issues':issues,'units':results})
if issues:raise RuntimeError('Machine source audit failed: '+str(issues))
