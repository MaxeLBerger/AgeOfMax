"""Independent ballista/mech v3 study; preserve saved visible meshes/materials."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).parent))
import build_machine_animation_study as COMMON
ROOT=COMMON.ROOT
STAGE=ROOT/'art/blender/candidates/animation-v3/machine-family-2'
ART=COMMON.ART
SPECS={'ballista':(27,.51),'mech':(34,.57)}
SOCKET=COMMON.SOCKET

def joint(a,b,l1,l2,pole):
    delta=b-a;distance=delta.length
    if distance>l1+l2+1e-5:raise RuntimeError(f'Unreachable mechanical joint: {distance} > {l1+l2}')
    axis=delta.normalized();along=(l1*l1-l2*l2+distance*distance)/(2*distance)
    tangent=(Vector(pole)-axis*Vector(pole).dot(axis)).normalized()
    return a+axis*along+tangent*math.sqrt(max(0,l1*l1-along*along))

def freeze_legacy(objects):
    for obj in objects:
        if obj.animation_data and obj.animation_data.action:obj.animation_data.action.use_fake_user=True
        obj.animation_data_clear()
        if obj.type=='MESH' and obj.data.shape_keys and obj.data.shape_keys.animation_data:
            keys=obj.data.shape_keys;values={k.name:k.value for k in keys.key_blocks}
            if keys.animation_data.action:keys.animation_data.action.use_fake_user=True
            keys.animation_data_clear()
            for shape in keys.key_blocks:shape.value=values[shape.name]

def fix_muzzle(unit):
    name='Iron quarrel head' if unit=='ballista' else 'Arm emitter'
    obj=bpy.data.objects[name];e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points=[e.matrix_world@v.co for v in e.data.vertices];maximum=max(p.x for p in points)
    indices=[i for i,p in enumerate(points) if p.x>=maximum-1e-5]
    scene=bpy.context.scene;scene['runtime_weapon_mesh']=name
    scene['runtime_weapon_vertex_indices']=indices;scene['runtime_weapon_evaluated_vertex_count']=len(points)
    return {'mesh':name,'front_vertex_indices':indices,'evaluated_vertex_count':len(points)}

def projection(direction):
    scene=bpy.context.scene
    return (world_to_camera_view(scene,scene.camera,direction)-world_to_camera_view(scene,scene.camera,Vector())).x*256

def key_control(obj,name):
    obj.keyframe_insert(data_path='["'+name+'"]')

def driver_point(curve,index,axis,controller,expression):
    fc=curve.data.driver_add(f'splines[0].bezier_points[{index}].co',axis)
    driver=fc.driver;driver.type='SCRIPTED';driver.expression=expression
    variable=driver.variables.new();variable.name='n';variable.type='SINGLE_PROP'
    variable.targets[0].id=controller;variable.targets[0].data_path='["nock_x"]'

def prepare_ballista(rest):
    scene=bpy.context.scene
    wheels=[o for o in bpy.data.objects if o.name.startswith(('Ballista wheel','Wheel iron tyre'))]
    radius=max(math.hypot(v.co.x,v.co.y) for v in bpy.data.objects['Ballista wheel'].data.vertices)
    angle=math.tau/16;distance=radius*angle
    bow=bpy.data.objects['Composite ballista bow'];string=bpy.data.objects['Ballista bowstring']
    bow_points=bow.data.splines[0].bezier_points;string_points=string.data.splines[0].bezier_points
    original_curves={o.name:[{'co':list(p.co),'left':list(p.handle_left),'right':list(p.handle_right),
                    'types':[p.handle_left_type,p.handle_right_type]} for p in o.data.splines[0].bezier_points] for o in [bow,string]}
    shaft=bpy.data.objects['Ballista quarrel'];evaluated=shaft.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points=[evaluated.matrix_world@v.co for v in evaluated.data.vertices];minimum=min(p.x for p in points)
    nock=sum([p for p in points if p.x<=minimum+1e-5],Vector())/len([p for p in points if p.x<=minimum+1e-5])
    root=bow_points[1].co.copy();tip=bow_points[0].co.copy()
    arm_xy=(tip.x-root.x)**2+tip.y**2
    rope_xy=(tip.x-nock.x)**2+tip.y**2
    bow['nock_x']=nock.x
    # Two circle intersections preserve the measured limb root-tip length and
    # taut half-string length while the bow tips and nock travel together.
    along=f'(({arm_xy!r}-{rope_xy!r}+({root.x!r}-n)**2)/(2*({root.x!r}-n)))'
    tip_x=f'{root.x!r}-{along}'
    for curve in [bow,string]:
        for index,side in [(0,-1),(2,1)]:
            driver_point(curve,index,0,bow,tip_x)
            driver_point(curve,index,1,bow,f'{side}*sqrt(max(0,{arm_xy!r}-{along}**2))')
    driver_point(string,1,0,bow,'n')
    string_points[1].co.z=nock.z
    for point in string_points:point.handle_left_type='VECTOR';point.handle_right_type='VECTOR'
    # A taut string is straight on each side of the measured shaft nock, not
    # the inherited loose AUTO-handle curve. Original points are archived.
    return {'wheels':wheels,'wheel_centers':{o.name:rest[o.name].translation.copy() for o in wheels},
        'radius':radius,'angle':angle,'world_distance':distance,'direction':Vector((1,0,0)),
        'nominal_ms':distance*projection(Vector((1,0,0)))*.51/27*1000,
        'bow':bow,'string':string,'shaft':shaft,'head':bpy.data.objects['Iron quarrel head'],
        'nock':nock,'root':root,'tip':tip,'arm_length':(tip-root).length,'rope_half_length':(tip-nock).length,
        'original_curves':original_curves,'curve_count':2,
        'mechanism':{'wheel_radius_world':radius,'wheel_circumference_world':math.tau*radius,'cycle_rotation_degrees':22.5,
            'wheel_axis_world':[0,1,0],'common_radial_symmetry':16,'bow_root':list(root),'loaded_nock':list(nock),
            'bow_limb_root_tip_length_world':(tip-root).length,'taut_half_string_length_world':(tip-nock).length,
            'string_handles':'VECTOR, taut from each bow tip to measured bolt nock',
            'release_frame':12,'bolt_hidden_from_ms':160,'original_curve_points':original_curves}}

def prepare_mech(rest):
    scene=bpy.context.scene
    direction=scene.camera.matrix_world.to_3x3().col[0].copy();direction.z=0;direction.normalize()
    cycle=34*.520/(projection(direction)*.57)
    legs=[]
    for suffix,offset in [('',0),('.001',.5)]:
        names={name:bpy.data.objects[name+suffix] for name in [
            'Hip joint','Upper mechanical leg','Exposed knee bearing','Shin armour','Armoured stabilizer foot','Foot toe edge','Leg piston']}
        hip=rest[names['Hip joint'].name].translation.copy()
        knee=rest[names['Exposed knee bearing'].name].translation.copy()
        foot=rest[names['Armoured stabilizer foot'].name].translation.copy()
        piston=names['Leg piston'];z=(max(v.co.z for v in piston.data.vertices)+min(v.co.z for v in piston.data.vertices))/2
        cylinder_ends=[rest[piston.name]@Vector((0,0,min(v.co.z for v in piston.data.vertices))),
                       rest[piston.name]@Vector((0,0,max(v.co.z for v in piston.data.vertices)))]
        cylinder_ends.sort(key=lambda p:-p.z)
        legs.append({'objects':names,'hip':hip,'knee':knee,'foot':foot,'l1':(knee-hip).length,
            'l2':(foot-knee).length,'offset':offset,'piston_ends':cylinder_ends})
    arms=[]
    for side,suffix in [(-1,''),(1,'.001')]:
        shoulder=rest['Shoulder bearing'+suffix].translation.copy()
        upper=bpy.data.objects['Mech upper arm'+suffix]
        vertices=[rest[upper.name]@Vector((0,0,z)) for z in [min(v.co.z for v in upper.data.vertices),max(v.co.z for v in upper.data.vertices)]]
        elbow=min(vertices,key=lambda p:p.z)
        gauntlet=bpy.data.objects['Armoured gauntlet'+suffix]
        barrels=[o for o in bpy.data.objects if o.name.startswith(('Arm mounted plasma barrel','Arm emitter')) and rest[o.name].translation.y*side>0]
        arms.append({'shoulder':shoulder,'elbow':elbow,'upper':upper,'gauntlet':gauntlet,'barrels':barrels,'side':side})
    return {'legs':legs,'arms':arms,'direction':direction,'world_distance':cycle,'nominal_ms':520,
        'mechanism':{'motion':'measured two-segment joints, horizontal soles, separate hydraulic piston and weapon recoil',
            'stance_fraction':.6,'double_support_frames':[0,4],'leg_measurements':[{'hip':list(l['hip']),'knee':list(l['knee']),
            'foot_center':list(l['foot']),'upper_length':l['l1'],'lower_length':l['l2'],'piston_ends':[list(p) for p in l['piston_ends']]} for l in legs]}}

def stance_target(phase,offset,base,setup):
    p=(phase+offset)%1;half=setup['world_distance']*.6/2
    if p<.6:travel=half-setup['world_distance']*p;lift=0
    else:
        u=(p-.6)/.4;travel=-half+2*half*(u*u*(3-2*u));lift=.145*math.sin(math.pi*u)**2
    return base+setup['direction']*travel+Vector((0,0,lift))

def pose_mech(clip,t,setup,rest):
    rig=bpy.data.objects['Mechanical motion rig']
    bob=-.073+.012*math.cos(math.tau*t*2) if clip=='walk' else -.061
    rig.location=(0,0,bob);bpy.context.view_layer.update()
    body_delta=rig.matrix_world@rest[rig.name].inverted()
    for leg in setup['legs']:
        target=stance_target(t if clip=='walk' else 0,leg['offset'],leg['foot'],setup)
        hip=body_delta@leg['hip'];knee=joint(hip,target,leg['l1'],leg['l2'],(-1,0,0))
        upper_rotation=(leg['knee']-leg['hip']).rotation_difference(knee-hip)
        lower_rotation=(leg['foot']-leg['knee']).rotation_difference(target-knee)
        transforms={
            'Hip joint':Matrix.Translation(hip-leg['hip']),
            'Upper mechanical leg':Matrix.Translation(hip)@upper_rotation.to_matrix().to_4x4()@Matrix.Translation(-leg['hip']),
            'Exposed knee bearing':Matrix.Translation(knee-leg['knee']),
            'Shin armour':Matrix.Translation(knee)@lower_rotation.to_matrix().to_4x4()@Matrix.Translation(-leg['knee']),
            'Armoured stabilizer foot':Matrix.Translation(target-leg['foot']),
            'Foot toe edge':Matrix.Translation(target-leg['foot'])}
        for name,transform in transforms.items():leg['objects'][name].matrix_world=transform@rest[leg['objects'][name].name]
        old_top,old_bottom=leg['piston_ends']
        top=hip+(old_top-leg['hip']);bottom=knee+lower_rotation@(old_bottom-leg['knee'])
        old_axis=old_bottom-old_top;new_axis=bottom-top
        piston=leg['objects']['Leg piston'];rotation=old_axis.rotation_difference(new_axis)
        # The existing telescoping rod extends along its own cylinder axis.
        center=(top+bottom)/2
        old_center=(old_top+old_bottom)/2
        transform=Matrix.Translation(center)@rotation.to_matrix().to_4x4()@Matrix.Translation(-old_center)
        piston.matrix_world=transform@rest[piston.name]
        piston.scale.z*=new_axis.length/old_axis.length
    for arm in setup['arms']:
        shoulder=body_delta@arm['shoulder']
        offset=.8 if arm['side']<0 else math.pi+.8
        swing=.035*(math.sin(math.tau*t+offset)-math.sin(offset)) if clip=='walk' else 0
        upper_rotation=Quaternion((0,1,0),swing)
        elbow=shoulder+upper_rotation@(arm['elbow']-arm['shoulder'])
        arm['upper'].matrix_world=Matrix.Translation(shoulder)@upper_rotation.to_matrix().to_4x4()@Matrix.Translation(-arm['shoulder'])@rest[arm['upper'].name]
        if clip=='walk':pitch=.07+.012*(math.sin(math.tau*t+arm['side'])-math.sin(arm['side']));recoil=0
        else:
            pitch=COMMON.values_at([.07,.035,.008,0,0,.014,.025,.052,.07],t)
            recoil=COMMON.values_at([0,0,0,0,.025,.085,.040,.009,0],t)
        forward=Vector((math.cos(pitch),0,-math.sin(pitch)))
        fore=Matrix.Translation(elbow)@Matrix.Rotation(pitch,4,'Y')@Matrix.Translation(-arm['elbow'])
        arm['gauntlet'].matrix_world=fore@rest[arm['gauntlet'].name]
        for obj in arm['barrels']:obj.matrix_world=Matrix.Translation(-forward*recoil)@fore@rest[obj.name]

def pose_ballista(clip,t,setup,rest):
    bpy.data.objects['Mechanical motion rig'].location=(0,0,0)
    angle=setup['angle']*t if clip=='walk' else 0
    for wheel in setup['wheels']:
        center=setup['wheel_centers'][wheel.name]
        wheel.matrix_world=Matrix.Translation(center)@Matrix.Rotation(angle,4,'Y')@Matrix.Translation(-center)@rest[wheel.name]
    shift=0 if clip=='walk' else COMMON.values_at([0,-.055,-.105,-.12,.27,.38,.15,-.02,0],t)
    setup['bow']['nock_x']=setup['nock'].x+shift
    for obj in [setup['shaft'],setup['head']]:
        obj.matrix_world=Matrix.Translation(Vector((shift,0,0)))@rest[obj.name]
        obj.hide_render=clip=='attack' and .5<=t<1

def build(unit,faction):
    suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key;directory.mkdir(parents=True,exist_ok=True)
    paths=[ROOT/f'art/blender/unit-{key}.blend',ROOT/f'public/assets/reborn/units{suffix}/{unit}.png',
           ROOT/'public/assets/reborn/weapon-sockets.json',ROOT/'data/units.json']
    for path in paths:COMMON.copy_atomic(path,directory/'baseline'/path.name)
    source_hashes={str(p.relative_to(ROOT)).replace('\\','/'):COMMON.digest(p) for p in paths}
    bpy.ops.wm.open_mainfile(filepath=str(directory/'baseline'/paths[0].name))
    scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
    meshes={o.name:COMMON.mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'}
    objects=[o for o in bpy.data.objects if o.type in ['MESH','CURVE','EMPTY']]
    rest={o.name:o.matrix_world.copy() for o in objects}
    freeze_legacy(objects)
    for obj in objects:
        q=obj.rotation_euler.to_quaternion() if obj.rotation_mode!='QUATERNION' else obj.rotation_quaternion.copy()
        obj.rotation_mode='QUATERNION';obj.rotation_quaternion=q
    setup=prepare_ballista(rest) if unit=='ballista' else prepare_mech(rest)
    setup['mechanism']['muzzle']=fix_muzzle(unit)
    basis={o.name:o.matrix_basis.copy() for o in objects}
    # Every animated dependency lives in object Actions; curve point drivers
    # explicitly read the bow object's keyed nock_x. No data Action is hidden
    # outside the shared v3 object-to-Action mapping.
    actions={}
    for clip in ['walk','attack']:
        actions[clip]={}
        for obj in objects:
            obj.animation_data_create();a=bpy.data.actions.new(f'Machine family2 / {key} / {clip} / {obj.name}')
            a.use_fake_user=True;obj.animation_data.action=a;actions[clip][obj.name]=a.name
        previous={}
        for t in sorted(set([i/128 for i in range(129)]+[.1,.6])):
            for obj in objects:obj.matrix_basis=basis[obj.name].copy()
            if unit=='ballista':pose_ballista(clip,t,setup,rest)
            else:pose_mech(clip,t,setup,rest)
            bpy.context.view_layer.update()
            bpy.data.objects[SOCKET].location=ART['weapon_points'](unit)
            for obj in objects:
                COMMON.store_keys(obj,t*8,previous)
                obj.keyframe_insert('hide_render',frame=t*8)
                if unit=='ballista' and obj==setup['bow']:obj.keyframe_insert(data_path='["nock_x"]',frame=t*8)
        for obj in objects:
            for curve in obj.animation_data.action.fcurves:
                for point in curve.keyframe_points:point.interpolation='CONSTANT' if curve.data_path=='hide_render' else 'LINEAR'
    assert meshes=={o.name:COMMON.mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'},'Original mesh/material/binding changed'
    speed,scale=SPECS[unit]
    gait={'nominalSpeedPxPerSecond':speed,'referenceDisplayScale':scale,
        'cycleDistancePixels':setup['world_distance']*projection(setup['direction'])*scale,
        'nominalCycleDurationMs':setup['nominal_ms'],'motionKind':'wheel-or-track' if unit=='ballista' else 'mechanical-biped',
        'stanceFraction':0 if unit=='ballista' else .6,'doubleSupportFrames':[] if unit=='ballista' else [0,4]}
    scene['animation_study_revision']=3;scene['animation_study_actions']=json.dumps(actions)
    scene['animation_study_gait']=json.dumps(gait);scene['animation_machine_mechanism']=json.dumps(setup['mechanism'])
    scene['animation_study_family']='ballista measured bow/string/release; mech true joint/sole motion'
    scene['animation_study_contract']='walk8 distance-based; attack8x40ms=320ms; hidden released bolt and contact sprite12 at160ms; local8 closure'
    scene.frame_start=0;scene.frame_end=8;scene.render.fps=25
    sockets=[]
    for clip in ['walk','attack']:
        for obj in objects:obj.animation_data.action=bpy.data.actions[actions[clip][obj.name]]
        for frame in range(8):
            scene.frame_set(frame);bpy.context.view_layer.update()
            p=world_to_camera_view(scene,scene.camera,ART['weapon_points'](unit))
            sockets.append([round(p.x*256,3),round((1-p.y)*256,3)])
    for obj in objects:obj.animation_data.action=bpy.data.actions[actions['walk'][obj.name]]
    scene.frame_set(0);bpy.context.view_layer.update()
    ART['save_scene'](directory/f'unit-{key}.blend')
    assert source_hashes=={str(p.relative_to(ROOT)).replace('\\','/'):COMMON.digest(p) for p in paths}
    COMMON.write_json(directory/'model-check.json',{'passed':True,'unit':unit,'faction':faction,'source_hashes':source_hashes,
        'candidate_sha256':COMMON.digest(directory/f'unit-{key}.blend'),'mesh_count':len(meshes),'mesh_contracts':meshes,
        'actions':actions,'gait':gait,'mechanism':setup['mechanism'],'sockets':sockets,'production_unchanged':True,
        'frame_size':[256,256],'frame_count':16,'contact_frame':12,'contact_delay_ms':160,'attack_duration_ms':320})
    COMMON.write_json(directory/'weapon-sockets.json',{unit:sockets});COMMON.write_json(directory/'gait-metadata.partial.json',{unit:gait})
    print('MACHINE_FAMILY2_BUILT',key,json.dumps(gait),flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--unit',choices=['ballista','mech','both'],default='both')
    p.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in SPECS if args.unit=='both' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:build(unit,faction)
if __name__=='__main__':main()
