"""Independent geometry and timing audit of saved ballista/mech v3 sources."""
import json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,kdtree
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).parent))
import build_machine_family_two as BUILD
COMMON=BUILD.COMMON
def vertices(obj):
    e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=e.to_mesh()
    result=[e.matrix_world@v.co for v in mesh.vertices];e.to_mesh_clear();return result
def all_vertices(objects):return [p for o in objects for p in vertices(o)]
def gap(a,b):
    tree=kdtree.KDTree(len(b))
    for i,p in enumerate(b):tree.insert(p,i)
    tree.balance();return max(tree.find(p)[2] for p in a)
def activate(actions,clip,t):
    for name,action in actions[clip].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
    frame=t*8;bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
def projected(point):
    s=bpy.context.scene;p=world_to_camera_view(s,s.camera,point);return Vector((p.x*256,(1-p.y)*256))
def back_center(obj):
    points=vertices(obj);minimum=min(p.x for p in points);end=[p for p in points if p.x<=minimum+1e-5]
    return sum(end,Vector())/len(end)
report={};issues=[]
for unit in BUILD.SPECS:
 for faction in ['player','enemy']:
    key=unit+('-enemy' if faction=='enemy' else '');directory=BUILD.STAGE/key;path=directory/f'unit-{key}.blend'
    model=json.loads((directory/'model-check.json').read_text())
    bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene;actions=json.loads(scene['animation_study_actions'])
    assert scene['animation_study_revision']==3
    assert {o.name:COMMON.mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'}==model['mesh_contracts']
    objects=[o for o in bpy.data.objects if o.type in ['MESH','CURVE']]
    gait=model['gait'];mechanism=model['mechanism'];camera=scene.camera
    direction=Vector((1,0,0)) if unit=='ballista' else camera.matrix_world.to_3x3().col[0].copy()
    direction.z=0;direction.normalize()
    pixels=(world_to_camera_view(scene,camera,direction)-world_to_camera_view(scene,camera,Vector())).x*256
    stride=gait['cycleDistancePixels']/gait['referenceDisplayScale']/pixels
    errors={'marker_raw_pixels':0,'chassis_world':0,'string_tip_world':0,'string_nock_world':0,'string_length_world':0,'bow_limb_length_world':0,
            'limb_length_world':0,'foot_up_angle_radians':0,'piston_attachment_world':0,'stance_corrected_drift_world':0,'attack_support_world':0,
            'wheel_angle_radians':0}
    source_samples={};sockets=[];hidden=[];stand_rows=[[],[]];bounds=[];double_support=[];first_angle=None;previous_angle=None
    foot_ref=[];joint_ranges=[[],[]]
    for clip in ['walk','attack']:
        source_samples[clip]=[]
        for i in range(257):
            t=i/256;activate(actions,clip,t)
            actual=BUILD.ART['weapon_points'](unit);marker=bpy.data.objects[BUILD.SOCKET].matrix_world.translation
            errors['marker_raw_pixels']=max(errors['marker_raw_pixels'],(projected(actual)-projected(marker)).length)
            if i%32==0 and i<256:sockets.append([round(v,3) for v in projected(actual)])
            if unit=='ballista':
                errors['chassis_world']=max(errors['chassis_world'],bpy.data.objects['Mechanical motion rig'].location.length)
                bow=bpy.data.objects['Composite ballista bow'];string=bpy.data.objects['Ballista bowstring']
                bp=[bow.matrix_world@p.co for p in bow.data.splines[0].bezier_points]
                sp=[string.matrix_world@p.co for p in string.data.splines[0].bezier_points]
                errors['string_tip_world']=max(errors['string_tip_world'],(bp[0]-sp[0]).length,(bp[2]-sp[2]).length)
                nock=back_center(bpy.data.objects['Ballista quarrel'])
                errors['string_nock_world']=max(errors['string_nock_world'],(nock-sp[1]).length)
                for j in [0,2]:
                    errors['string_length_world']=max(errors['string_length_world'],abs((sp[j]-sp[1]).length-mechanism['taut_half_string_length_world']))
                    errors['bow_limb_length_world']=max(errors['bow_limb_length_world'],abs((bp[j]-bp[1]).length-mechanism['bow_limb_root_tip_length_world']))
                if clip=='walk':
                    wheel=bpy.data.objects['Ballista wheel'];p=wheel.matrix_world.to_3x3()@wheel.data.vertices[0].co
                    angle=math.atan2(-p.z,p.x)
                    if previous_angle is not None:
                        while angle-previous_angle>math.pi:angle-=math.tau
                        while angle-previous_angle< -math.pi:angle+=math.tau
                    if first_angle is None:first_angle=angle
                    previous_angle=angle
                    errors['wheel_angle_radians']=max(errors['wheel_angle_radians'],abs(angle-first_angle-math.radians(mechanism['cycle_rotation_degrees'])*t))
                if clip=='attack' and i%32==0:
                    hidden.append({'frame':8+i//32,'hidden':bpy.data.objects['Ballista quarrel'].hide_render,'head_hidden':bpy.data.objects['Iron quarrel head'].hide_render})
            else:
                ground=[]
                for side,suffix in enumerate(['','.001']):
                    hip=bpy.data.objects['Hip joint'+suffix].matrix_world.translation
                    knee=bpy.data.objects['Exposed knee bearing'+suffix].matrix_world.translation
                    foot=bpy.data.objects['Armoured stabilizer foot'+suffix]
                    ankle=foot.matrix_world.translation;measure=mechanism['leg_measurements'][side]
                    errors['limb_length_world']=max(errors['limb_length_world'],abs((knee-hip).length-measure['upper_length']),abs((ankle-knee).length-measure['lower_length']))
                    up=foot.matrix_world.to_3x3().col[2].normalized()
                    errors['foot_up_angle_radians']=max(errors['foot_up_angle_radians'],up.angle(Vector((0,0,1))))
                    sole=min(p.z for p in vertices(foot));ground.append(sole);joint_ranges[side].append(list(knee))
                    if clip=='walk':
                        p=(t+side*.5)%1
                        if p<.6-1e-7:
                            stand_rows[side].append((t,ankle.dot(direction)+stride*t,sole))
                        if i in [0,128,256]:
                            if side==1:double_support.append({'action_frame':t*8,'sole_z_world':ground.copy()})
                    elif i==0:
                        if len(foot_ref)<=side:foot_ref.append(vertices(foot))
                    else:errors['attack_support_world']=max(errors['attack_support_world'],gap(vertices(foot),foot_ref[side]))
                    oldhip,oldknee,oldfoot=[Vector(measure[n]) for n in ['hip','knee','foot_center']]
                    top,bottom=map(Vector,measure['piston_ends'])
                    rotation=(oldfoot-oldknee).rotation_difference(ankle-knee)
                    desired=[hip+(top-oldhip),knee+rotation@(bottom-oldknee)]
                    piston=bpy.data.objects['Leg piston'+suffix]
                    ends=[piston.matrix_world@Vector((0,0,z)) for z in [min(v.co.z for v in piston.data.vertices),max(v.co.z for v in piston.data.vertices)]]
                    errors['piston_attachment_world']=max(errors['piston_attachment_world'],min(max((ends[0]-desired[0]).length,(ends[1]-desired[1]).length),max((ends[1]-desired[0]).length,(ends[0]-desired[1]).length)))
            if i%32==0:
                source_samples[clip].append(all_vertices(objects))
                if i<256:
                    points=[projected(p) for o in objects if not o.hide_render for p in vertices(o)]
                    bounds.append([min(p.x for p in points),min(p.y for p in points),max(p.x for p in points),max(p.y for p in points)])
    for rows in stand_rows:
        first=last=None
        for t,x,z in rows:
            if last is None or t-last>1/256+1e-7:first=x
            errors['stance_corrected_drift_world']=max(errors['stance_corrected_drift_world'],abs(x-first));last=t
    loop=gap(source_samples['walk'][0],source_samples['walk'][-1])
    recovery=gap(source_samples['walk'][0],source_samples['attack'][-1])
    # Includes the unexported closure point for the final actual-motion interval.
    displacement=[max((a-b).length for a,b in zip(source_samples['walk'][j],source_samples['walk'][j+1])) for j in range(8)]
    marker_inside=all(0<=p[0]<=256 and 0<=p[1]<=256 for p in sockets)
    bounds_inside=all(b[0]>=1 and b[1]>=1 and b[2]<=255 and b[3]<=255 for b in bounds)
    visibility_ok=unit!='ballista' or all(r['hidden']==r['head_hidden']==(12<=r['frame']<16) for r in hidden)
    original_ok=all(COMMON.digest(BUILD.ROOT/relative)==sha for relative,sha in model['source_hashes'].items())
    team_error=max((Vector(a)-Vector(b)).length for a,b in zip(report[unit]['sockets'],sockets)) if faction=='enemy' else 0
    passed=all(v<(.02 if k=='marker_raw_pixels' else .0001) for k,v in errors.items()) and loop<.0001 and recovery<.0001 and all(d>1e-5 for d in displacement) and bounds_inside and marker_inside and visibility_ok and original_ok and sockets==model['sockets'] and team_error<=.001
    result={'passed':passed,'source_sha256':COMMON.digest(path),'production_unchanged':original_ok,'mesh_count':model['mesh_count'],
        'mesh_material_binding_contracts_preserved':True,'samples_per_clip':257,'maximum_errors':errors,'geometric_loop_gap_world':loop,
        'attack_recovery_gap_world':recovery,'adjacent_walk_material_point_displacement_world':displacement,'visible_geometry_bounds_raw_pixels':bounds,
        'double_support':double_support,'release_visibility':hidden,'sockets':sockets,'team_socket_max_error_raw_pixels':team_error,'gait':gait}
    report[key]=result
    if not passed:issues.append(key)
    print('FAMILY2_AUDIT',key,json.dumps({k:v for k,v in result.items() if k not in ['sockets','visible_geometry_bounds_raw_pixels','adjacent_walk_material_point_displacement_world']}),flush=True)
COMMON.write_json(BUILD.STAGE/'source-audit.json',{'passed':not issues,'issues':issues,'units':report})
if issues:raise RuntimeError('Second machine family audit failed: '+str(issues))
