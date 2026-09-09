"""Author isolated cannon/tank v3 clips from the saved mechanical meshes.

No public/canonical/runtime writes. Identical repeated wheel/track geometry may
close by a measured permutation; named material points need not return to the
same spoke/shoe in a textureless repeated assembly. Pixel seam is audited too.
"""
import argparse, hashlib, json, math, os, runpy, shutil, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/machine-family'
sys.path.insert(0,str(Path(__file__).parent))
ART=runpy.run_path(str(Path(__file__).with_name('export_scenes.py')),run_name='machine_export_library')
SPEED={'cannon':25,'tank':31}
SCALE=.51
SOCKET='Weapon muzzle / runtime socket'

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write_json(path,value): ART['write_json_atomic'](path,value)
def copy_atomic(source,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():
        assert digest(source)==digest(target),'Archived source changed: '+str(source)
        return
    temporary=target.with_name(target.name+'.copying')
    shutil.copyfile(source,temporary)
    ART['replace_atomic'](temporary,target)

def material_contract(material):
    record={'name':material.name,'diffuse':list(material.diffuse_color),'nodes':[],'links':[]}
    if material.use_nodes:
        for node in material.node_tree.nodes:
            values={}
            for slot in node.inputs:
                if hasattr(slot,'default_value'):
                    v=slot.default_value
                    if isinstance(v,(bool,int,float,str)): values[slot.name]=v
                    else:
                        try: values[slot.name]=list(v)
                        except TypeError: pass
            record['nodes'].append([node.name,node.bl_idname,values])
        record['links']=[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in material.node_tree.links]
    return record

def mesh_contract(obj):
    record={'v':[list(v.co) for v in obj.data.vertices],
            'p':[(list(p.vertices),p.material_index) for p in obj.data.polygons],
            'materials':[material_contract(m) for m in obj.data.materials],
            'parent':obj.parent.name if obj.parent else None,
            'groups':list(obj.vertex_groups.keys()),
            'weights':[[(g.group,g.weight) for g in v.groups] for v in obj.data.vertices],
            'modifiers':[(m.name,m.type) for m in obj.modifiers],
            'shape_keys':{k.name:[list(v.co) for v in k.data] for k in obj.data.shape_keys.key_blocks} if obj.data.shape_keys else {}}
    return hashlib.sha256(json.dumps(record,sort_keys=True).encode()).hexdigest()

def projection(scene,vector):
    return (world_to_camera_view(scene,scene.camera,vector)-world_to_camera_view(scene,scene.camera,Vector())).x*256

def values_at(values,t):
    p=max(0,min(8,t*8));i=min(7,int(p));u=p-i;u=u*u*(3-2*u)
    return values[i]*(1-u)+values[i+1]*u

def measured_setup(unit):
    meshes=[o for o in bpy.data.objects if o.type=='MESH']
    root=bpy.data.objects['Mechanical motion rig']
    scene=bpy.context.scene
    if unit=='cannon':
        wheel=bpy.data.objects['Gun carriage wheel']
        radius=max(math.hypot(v.co.x,v.co.y) for v in wheel.data.vertices)
        wheels=[o for o in meshes if o.name.startswith(('Gun carriage wheel','Iron wheel rim','Wooden wheel spoke'))]
        # The six spokes and 20-sided wooden discs share a 180-degree symmetry.
        # Eight 22.5-degree samples avoid the reverse-wheel alias of 45-degree
        # steps over a complete revolution (six spokes repeat every 60 degrees).
        angle=math.pi;cycle=radius*angle
        centers={o.name:Vector((0,o.location.y,.39)) for o in wheels}
        barrel=[o for o in meshes if o.name.startswith(('Gun barrel','Dark muzzle','Gun reinforcement band'))]
        setup={'radius':radius,'wheel_angle':angle,'cycle_world':cycle,'wheel_centers':centers,
               'wheels':wheels,'barrel':barrel,'pivot':Vector((0,0,.75)),'tracks':[],
               'mechanism':{'wheel_radius_world':radius,'wheel_circumference_world':math.tau*radius,
                            'cycle_rotation_degrees':180,'spokes_per_wheel':6,
                            'closure':'180-degree common geometric symmetry of discs/rims/six spokes',
                            'wheel_axis_world':[0,1,0]}}
    else:
        wheel=bpy.data.objects['Road wheel']
        radius=max(math.hypot(v.co.x,v.co.y) for v in wheel.data.vertices)
        tracks=sorted([o for o in meshes if o.name.startswith('Animated individual track shoe')],key=lambda o:o.name)
        assert len(tracks)==88
        near=[o for o in tracks if o.location.y<0];assert len(near)==44
        minimum=min(o.location.x for o in near);maximum=max(o.location.x for o in near)
        half_extent=(maximum-minimum)/2;cx=(maximum+minimum)/2
        cz=(min(o.location.z for o in near)+max(o.location.z for o in near))/2
        # A quarter road-wheel turn equals three repeated shoes. Derive capsule
        # radius from that exact pitch/loop closure while preserving X extents.
        # Existing shoes themselves, hull, wheels and track assemblies are intact.
        angle=math.pi/2;cycle=radius*angle;pitch=cycle/3;perimeter=pitch*44
        curve_radius=(perimeter-4*half_extent)/(math.tau-4)
        assert .25<curve_radius<.38,curve_radius
        half_straight=half_extent-curve_radius
        wheels=[o for o in meshes if o.name.startswith(('Road wheel','Wheel hub'))]
        centers={o.name:o.matrix_world.translation.copy() for o in wheels}
        barrel=[bpy.data.objects[n] for n in ['Tank cannon','Muzzle brake','Muzzle bore']]
        original_steps=[(near[(i+1)%44].location-near[i].location).length for i in range(44)]
        setup={'radius':radius,'wheel_angle':angle,'cycle_world':cycle,'wheel_centers':centers,
               'wheels':wheels,'barrel':barrel,'pivot':Vector((.23,0,1.42)),
               'tracks':tracks,'track_pitch':pitch,'track_perimeter':perimeter,
               'track_radius':curve_radius,'track_half_straight':half_straight,'track_cx':cx,'track_cz':cz,
               'mechanism':{'wheel_radius_world':radius,'wheel_circumference_world':math.tau*radius,
                            'cycle_rotation_degrees':90,'wheel_axis_world':[0,1,0],
                            'shoes_per_side':44,'shoe_pitch_world':pitch,
                            'track_perimeter_world':perimeter,'track_radius_world':curve_radius,
                            'track_half_straight_world':half_straight,
                            'original_centerline_z_extent_world':[min(o.location.z for o in near),max(o.location.z for o in near)],
                            'new_centerline_z_extent_world':[cz-curve_radius,cz+curve_radius],
                            'original_neighbor_distance_world':[min(original_steps),max(original_steps)],
                            'closure':'quarter-turn road wheels and three equally spaced shoes; original meshes preserved',
                            'shoe_advances_per_cycle':3}}
    setup['root']=root
    setup['raw_x_pixels']=projection(scene,Vector((1,0,0)))
    setup['gait']={'nominalSpeedPxPerSecond':SPEED[unit],'referenceDisplayScale':SCALE,
                   'cycleDistancePixels':setup['cycle_world']*setup['raw_x_pixels']*SCALE,
                   'nominalCycleDurationMs':setup['cycle_world']*setup['raw_x_pixels']*SCALE/SPEED[unit]*1000,
                   'motionKind':'wheel-or-track','stanceFraction':0,'doubleSupportFrames':[]}
    setup['mechanism']['projected_world_axis']=[1,0,0]
    setup['mechanism']['raw_pixels_per_world_axis_unit']=setup['raw_x_pixels']
    return setup

def track_point(setup,distance,y):
    s=distance%setup['track_perimeter'];h=setup['track_half_straight'];r=setup['track_radius']
    if s<2*h:
        x=h-s;z=-r;tx=-1;tz=0
    elif s<2*h+math.pi*r:
        a=-math.pi/2-(s-2*h)/r
        x=-h+r*math.cos(a);z=r*math.sin(a);tx=math.sin(a);tz=-math.cos(a)
    elif s<4*h+math.pi*r:
        u=s-(2*h+math.pi*r);x=-h+u;z=r;tx=1;tz=0
    else:
        a=math.pi/2-(s-(4*h+math.pi*r))/r
        x=h+r*math.cos(a);z=r*math.sin(a);tx=math.sin(a);tz=-math.cos(a)
    return Vector((setup['track_cx']+x,y,setup['track_cz']+z)),math.atan2(-tz,tx)

def apply_pose(unit,clip,t,setup,rest,previous_angles):
    for name,matrix in rest.items(): bpy.data.objects[name].matrix_basis=matrix.copy()
    setup['root'].location=(0,0,0)
    # Use the same world-to-local decomposition for moving and stopped wheels.
    # This preserves evaluated shading across the walk0/attack0 transition.
    a=setup['wheel_angle']*t if clip=='walk' else 0
    for obj in setup['wheels']:
        center=setup['wheel_centers'][obj.name]
        transform=Matrix.Translation(center)@Matrix.Rotation(a,4,'Y')@Matrix.Translation(-center)
        obj.matrix_world=transform@setup['world_rest'][obj.name]
    if unit=='tank':
        for side in [-1,1]:
            shoes=[o for o in setup['tracks'] if setup['world_rest'][o.name].translation.y*side>0]
            assert len(shoes)==44
            for index,obj in enumerate(shoes):
                y=setup['world_rest'][obj.name].translation.y
                point,angle=track_point(setup,index*setup['track_pitch']+(setup['cycle_world']*t if clip=='walk' else 0),y)
                previous=previous_angles.get(obj.name,angle)
                while angle-previous>math.pi:angle-=math.tau
                while angle-previous< -math.pi:angle+=math.tau
                previous_angles[obj.name]=angle
                obj.location=point;obj.rotation_mode='XYZ';obj.rotation_euler=(0,angle,0)
    if clip=='attack':
        if unit=='cannon':
            pitch=values_at([0,.010,.025,.033,.031,.022,.007,-.009,0],t)
            recoil=values_at([0,0,0,0,.032,.14,.065,.018,0],t)
        else:
            pitch=values_at([0,.012,.024,.030,.025,.016,.006,-.008,0],t)
            recoil=values_at([0,0,0,0,.045,.17,.081,.019,0],t)
        pivot=setup['pivot']
        transform=Matrix.Translation(pivot+Vector((-recoil,0,0)))@Matrix.Rotation(-pitch,4,'Y')@Matrix.Translation(-pivot)
        for obj in setup['barrel']:obj.matrix_world=transform@setup['world_rest'][obj.name]
    bpy.context.view_layer.update()
    bpy.data.objects[SOCKET].location=ART['weapon_points'](unit)

def store_keys(obj,frame,previous_quaternions):
    obj.keyframe_insert('location',frame=frame)
    if obj.name.startswith('Animated individual track shoe'):
        obj.keyframe_insert('rotation_euler',frame=frame)
    else:
        # Rotation decomposition can flip a quaternion sign at a pi boundary.
        # Keep each continuous clip on one hemisphere before linear sampling.
        q=obj.rotation_quaternion
        if obj.name in previous_quaternions and q.dot(previous_quaternions[obj.name])<0:
            q.negate();obj.rotation_quaternion=q
        previous_quaternions[obj.name]=q.copy()
        obj.keyframe_insert('rotation_quaternion',frame=frame)
    obj.keyframe_insert('scale',frame=frame)

def build(unit,faction):
    suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key
    directory.mkdir(parents=True,exist_ok=True)
    sources=[ROOT/f'art/blender/unit-{key}.blend',ROOT/f'public/assets/reborn/units{suffix}/{unit}.png',
             ROOT/'public/assets/reborn/weapon-sockets.json',ROOT/'data/units.json']
    for source in sources:copy_atomic(source,directory/'baseline'/source.name)
    before={str(p.relative_to(ROOT)).replace('\\','/'):digest(p) for p in sources}
    bpy.ops.wm.open_mainfile(filepath=str(directory/'baseline'/sources[0].name))
    scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
    contracts={o.name:mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'}
    setup=measured_setup(unit)
    # Fix the evaluated front surface once in the preserved rest pose.
    weapon_name='Dark muzzle' if unit=='cannon' else 'Muzzle bore'
    weapon=bpy.data.objects[weapon_name]
    evaluated=weapon.evaluated_get(bpy.context.evaluated_depsgraph_get())
    vertices=[evaluated.matrix_world@v.co for v in evaluated.data.vertices]
    maximum=max(v.x for v in vertices)
    front=[i for i,v in enumerate(vertices) if v.x>=maximum-1e-5]
    assert len(front)==(20 if unit=='cannon' else 4)
    scene['runtime_weapon_mesh']=weapon_name
    scene['runtime_weapon_vertex_indices']=front
    scene['runtime_weapon_evaluated_vertex_count']=len(vertices)
    setup['mechanism']['muzzle_front_vertex_indices']=front
    setup['mechanism']['muzzle_evaluated_vertex_count']=len(vertices)
    # The old pennant has its own combined eight-frame shape-key action, outside
    # object action mappings. Keep its authored initial fold and all key geometry;
    # explicitly remove that old timeline so it cannot contaminate either clip.
    for mesh in bpy.data.objects:
        if mesh.type=='MESH' and mesh.data.shape_keys and mesh.data.shape_keys.animation_data:
            keys=mesh.data.shape_keys
            values={key.name:key.value for key in keys.key_blocks}
            if keys.animation_data.action:keys.animation_data.action.use_fake_user=True
            keys.animation_data_clear()
            for shape in keys.key_blocks:shape.value=values[shape.name]
    animated=list(dict.fromkeys([setup['root'],*setup['wheels'],*setup['tracks'],*setup['barrel'],bpy.data.objects[SOCKET]]))
    setup['world_rest']={o.name:o.matrix_world.copy() for o in animated}
    for obj in animated:
        if obj.animation_data and obj.animation_data.action:obj.animation_data.action.use_fake_user=True
        obj.animation_data_clear()
        if not obj.name.startswith('Animated individual track shoe'):
            quaternion=obj.rotation_euler.to_quaternion() if obj.rotation_mode!='QUATERNION' else obj.rotation_quaternion.copy()
            obj.rotation_mode='QUATERNION';obj.rotation_quaternion=quaternion
    rest={o.name:o.matrix_basis.copy() for o in animated}
    sets={}
    for clip in ['walk','attack']:
        sets[clip]={}
        for obj in animated:
            obj.animation_data_create();action=bpy.data.actions.new(f'Machine v3 / {key} / {clip} / {obj.name}')
            action.use_fake_user=True;obj.animation_data.action=action;sets[clip][obj.name]=action.name
        previous_angles={};previous_quaternions={}
        for i in range(129):
            t=i/128;apply_pose(unit,clip,t,setup,rest,previous_angles)
            for obj in animated:store_keys(obj,t*8,previous_quaternions)
        for obj in animated:
            for curve in obj.animation_data.action.fcurves:
                for point in curve.keyframe_points:point.interpolation='LINEAR'
    assert contracts=={o.name:mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'},'Original mesh/material/binding changed'
    scene['animation_study_revision']=3
    scene['animation_study_actions']=json.dumps(sets)
    scene['animation_study_contract']='walk8 distance-based mechanical cycle; attack8x40ms=320ms; contact sprite12 at160ms; local8 closure'
    scene['animation_study_family']='machine-family / independent moving wheels, closed track shoes and barrel recoil; fixed chassis'
    scene['animation_study_gait']=json.dumps(setup['gait'])
    scene['animation_machine_mechanism']=json.dumps(setup['mechanism'])
    scene.frame_start=0;scene.frame_end=8;scene.render.fps=25
    sockets=[]
    for clip in ['walk','attack']:
        for obj in animated:obj.animation_data.action=bpy.data.actions[sets[clip][obj.name]]
        for frame in range(8):
            scene.frame_set(frame);bpy.context.view_layer.update()
            p=world_to_camera_view(scene,scene.camera,ART['weapon_points'](unit))
            sockets.append([round(p.x*256,3),round((1-p.y)*256,3)])
    for obj in animated:obj.animation_data.action=bpy.data.actions[sets['walk'][obj.name]]
    scene.frame_set(0);bpy.context.view_layer.update()
    ART['save_scene'](directory/f'unit-{key}.blend')
    after={str(p.relative_to(ROOT)).replace('\\','/'):digest(p) for p in sources};assert before==after
    write_json(directory/'model-check.json',{'unit':unit,'faction':faction,'passed':True,'production_unchanged':True,
               'source_hashes':before,'candidate_sha256':digest(directory/f'unit-{key}.blend'),
               'mesh_count':len(contracts),'mesh_contracts':contracts,'geometry_material_bindings_preserved':True,
               'actions':sets,'gait':setup['gait'],'mechanism':setup['mechanism'],'sockets':sockets,
               'attack_duration_ms':320,'contact_frame':12,'contact_delay_ms':160,'frame_size':[256,256],'frame_count':16})
    write_json(directory/'weapon-sockets.json',{unit:sockets})
    write_json(directory/'gait-metadata.partial.json',{unit:setup['gait']})
    print('MACHINE_STUDY_BUILT',key,json.dumps(setup['gait']),flush=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=['cannon','tank','both'],default='both')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in SPEED if args.unit=='both' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:build(unit,faction)
if __name__=='__main__':main()
