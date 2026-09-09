"""Isolated 16-frame animation study: authored continuous clips, no runtime edits.

Eight walk samples span 520ms, eight attack samples span 320ms; attack sample4
is contact at160ms, sprite index12. Separate Blender actions include unsampled
closure keys, so walk interpolation can never enter the attack clip.
"""
import argparse,hashlib,json,math,runpy,shutil,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3'
ART=runpy.run_path(str(Path(__file__).with_name('export_scenes.py')),run_name='art_library')
UNITS={'clubman':(40,.43),'knight':(55,.51)}


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def smooth(t):return t*t*(3-2*t)
def serial(v):return [round(float(x),7) for x in v]
def world_vertices(obj):
    e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=e.to_mesh()
    points=[e.matrix_world@v.co for v in mesh.vertices]
    e.to_mesh_clear()
    return points
def center(obj):
    points=world_vertices(obj)
    return sum(points,Vector())/len(points)


def sample_source(clip,t):
    time=1+t*4 if clip=='walk' else 5+t*4
    if time<=4 and clip=='walk' or time<=8 and clip=='attack':
        bpy.context.scene.frame_set(math.floor(time),subframe=time%1)
        bpy.context.view_layer.update()
        return {p.name:p.matrix_basis.copy() for p in RIG.pose.bones}
    first=4 if clip=='walk' else 8
    bpy.context.scene.frame_set(first)
    a={p.name:p.matrix_basis.copy() for p in RIG.pose.bones}
    bpy.context.scene.frame_set(1)
    b={p.name:p.matrix_basis.copy() for p in RIG.pose.bones}
    weight=smooth(time-first)
    return {name:a[name].lerp(b[name],weight) for name in a}


def bone(name,head,tail,parent):
    bpy.context.view_layer.objects.active=RIG;RIG.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    item=RIG.data.edit_bones.get(name) or RIG.data.edit_bones.new(name)
    item.head=head;item.tail=tail;item.parent=RIG.data.edit_bones.get(parent)
    bpy.ops.object.mode_set(mode='OBJECT');RIG.select_set(False)


def set_pose(name,head,rotation=Quaternion()):
    rest=RIG.data.bones[name]
    p=RIG.pose.bones[name];p.rotation_mode='QUATERNION'
    p.matrix=Matrix.Translation(Vector(head))@(rotation@rest.matrix_local.to_quaternion()).to_matrix().to_4x4()
    bpy.context.view_layer.update()


def point_pose(name,head,tail):
    rest=RIG.data.bones[name]
    set_pose(name,head,(rest.tail_local-rest.head_local).rotation_difference(Vector(tail)-Vector(head)))


def joint(a,b,l1,l2,pole):
    delta=b-a;distance=delta.length
    if distance>l1+l2+1e-4:
        raise RuntimeError(f'Unreachable limb: {distance:.5f} > {l1+l2:.5f}')
    axis=delta.normalized();d=min(distance,l1+l2-.00001)
    tangent=(Vector(pole)-axis*Vector(pole).dot(axis)).normalized()
    along=(l1*l1-l2*l2+d*d)/(2*d)
    return a+axis*along+tangent*math.sqrt(max(0,l1*l1-along*along))


def solve_leg(upper,lower,target,pole):
    rest=RIG.data.bones[upper]
    parent=RIG.pose.bones[rest.parent.name]
    head=parent.matrix@parent.bone.matrix_local.inverted()@rest.head_local
    mid=joint(head,Vector(target),rest.length,RIG.data.bones[lower].length,pole)
    point_pose(upper,head,mid);point_pose(lower,mid,target)


def step(phase,offset,base,unit):
    # Constant backwards velocity during stance cancels the game's forward motion.
    p=(phase+offset)%1;stance=.60
    half=CYCLE_DISTANCE*stance/2
    if p<stance:
        x=half-CYCLE_DISTANCE*p;lift=0
    else:
        u=(p-stance)/(1-stance)
        x=-half+2*half*smooth(u)
        lift=(.15 if unit=='clubman' else .18)*math.sin(math.pi*u)**2
    return Vector(base)+RIGHT*x+Vector((0,0,lift)),p<stance


def store_keys(obj,frame):
    if obj.type=='ARMATURE':
        targets=obj.pose.bones
    else:targets=[obj]
    for target in targets:
        target.rotation_mode='QUATERNION'
        key=(obj.name,target.name if obj.type=='ARMATURE' else '')
        if key in PREVIOUS and target.rotation_quaternion.dot(PREVIOUS[key])<0:
            target.rotation_quaternion.negate()
        PREVIOUS[key]=target.rotation_quaternion.copy()
        for channel in ['location','rotation_quaternion','scale']:
            target.keyframe_insert(channel,frame=frame)


def prepare(unit):
    global RIG,RIGHT,CYCLE_DISTANCE,BODY,HORSE,FOOT_OBJECTS,GRIP_REST,SHAFT_AXIS,WRIST_NAME
    RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    scene=bpy.context.scene
    RIGHT=scene.camera.matrix_world.to_3x3().col[0].copy();RIGHT.z=0;RIGHT.normalize()
    projected=world_to_camera_view(scene,scene.camera,RIGHT)-world_to_camera_view(scene,scene.camera,Vector())
    CYCLE_DISTANCE=UNITS[unit][0]*.520/(projected.x*256*UNITS[unit][1])
    bpy.context.scene.frame_set(1)
    RIG.animation_data_clear()
    for pose in RIG.pose.bones:pose.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    BODY=None;HORSE=[]
    if unit=='clubman':
        for side in ['near','far']:
            ankle=RIG.data.bones['shin.'+side].tail_local.copy()
            bone('foot.'+side,ankle,ankle+Vector((.25,0,0)),'shin.'+side)
        for obj in bpy.data.objects:
            if obj.type=='MESH' and obj.name.startswith(('Boot sole','Leather boot')):
                ART['set_group'](obj,RIG,'foot.far' if obj.name.endswith('.001') else 'foot.near')
        FOOT_OBJECTS=[bpy.data.objects['Boot sole'],bpy.data.objects['Boot sole.001']]
    else:
        # Remove the original rigid pendulum parenting and articulate both segments.
        for index in range(4):
            suffix=f'.{index:03d}' if index else ''
            holder=bpy.data.objects['Articulated mount leg'+suffix]
            holder.animation_data_clear();holder.rotation_euler=(0,0,0)
        bpy.context.view_layer.update()
        for index in range(4):
            suffix=f'.{index:03d}' if index else ''
            holder=bpy.data.objects['Articulated mount leg'+suffix]
            objects={name:bpy.data.objects[name+suffix] for name in ['Upper mount leg','Lower mount leg','Mount knee','Cloven hoof']}
            hip=holder.location.copy();knee=center(objects['Mount knee']);hoof=center(objects['Cloven hoof'])
            matrices={name:obj.matrix_world.copy() for name,obj in objects.items()}
            for name,obj in objects.items():
                obj.parent=None;obj.matrix_world=matrices[name];obj.animation_data_clear()
            HORSE.append({'hip':hip,'knee':knee,'hoof':hoof,'objects':objects,'matrices':matrices,
                          'offset':[0,.5,.5,0][index]})
        BODY=bpy.data.objects.new('Study / articulated horse body',None)
        bpy.context.collection.objects.link(BODY)
        limb_objects={o for leg in HORSE for o in leg['objects'].values()}
        for obj in list(bpy.data.objects):
            if obj==BODY:continue
            if obj.name=='Rider saddle assembly' or (obj.type=='MESH' and obj.parent is None and not obj.vertex_groups and obj not in limb_objects):
                mat=obj.matrix_world.copy();obj.parent=BODY;obj.matrix_world=mat
        FOOT_OBJECTS=[leg['objects']['Cloven hoof'] for leg in HORSE]
    bpy.context.view_layer.update()
    # Weapon wrist and hand/fingers share one rigid grip transform.
    GRIP_REST=Vector((.34,-.345,1.15));WRIST_NAME='weapon.wrist'
    SHAFT_AXIS=Vector((.16,-.005,.7)) if unit=='clubman' else Vector((1.1,0,.65))
    if unit=='knight':bone(WRIST_NAME,GRIP_REST,GRIP_REST+SHAFT_AXIS,'forearm.near')
    for obj in bpy.data.objects:
        if obj.type!='MESH':continue
        near_hand=obj.name in ['Hand','Fingers','Fingers.001','Fingers.002']
        weapon=unit=='knight' and obj.name.startswith(('Long ash spear','Spear socket','Knapped spearhead'))
        if near_hand or weapon:ART['set_group'](obj,RIG,WRIST_NAME)
    marker=bpy.data.objects.get('Weapon muzzle / runtime socket')
    marker.animation_data_clear()


def animate_horse(phase,clip):
    wave=math.sin(math.pi*phase)**2 if clip=='attack' else 0
    bob=-.075+.012*math.cos(math.tau*phase*2) if clip=='walk' else -.063-.013*wave
    BODY.location=(.035*wave,0,bob)
    BODY.rotation_mode='QUATERNION';BODY.rotation_quaternion=Quaternion((0,1,0),-.018*wave)
    bpy.context.view_layer.update()
    for leg in HORSE:
        base=leg['hoof'].copy();base.x=leg['hip'].x+.04
        target,stance=step(phase if clip=='walk' else 0,leg['offset'],base,'knight')
        hip=BODY.matrix_world@leg['hip']
        mid=joint(hip,target,(leg['knee']-leg['hip']).length,(leg['hoof']-leg['knee']).length,(-1,0,0))
        for name,start,end,oldstart,oldend in [
                ('Upper mount leg',hip,mid,leg['hip'],leg['knee']),
                ('Lower mount leg',mid,target,leg['knee'],leg['hoof'])]:
            rotation=(oldend-oldstart).rotation_difference(end-start)
            leg['objects'][name].matrix_world=Matrix.Translation(start)@rotation.to_matrix().to_4x4()@Matrix.Translation(-oldstart)@leg['matrices'][name]
        leg['objects']['Mount knee'].matrix_world=Matrix.Translation(mid-leg['knee'])@leg['matrices']['Mount knee']
        leg['objects']['Cloven hoof'].matrix_world=Matrix.Translation(target-leg['hoof'])@leg['matrices']['Cloven hoof']


def set_pose_frame(unit,clip,t,source_pose):
    for name,matrix in source_pose.items():RIG.pose.bones[name].matrix_basis=matrix
    bpy.context.view_layer.update()
    if unit=='clubman':
        lift=-.064+.014*math.cos(math.tau*t*2) if clip=='walk' else -.050-.018*math.sin(math.pi*t)**2
        shift=.035*math.sin(math.pi*t)**2 if clip=='attack' else 0
        rest=RIG.data.bones['root'];set_pose('root',rest.head_local+Vector((shift,0,lift)))
        for side,offset in [('near',0),('far',.5)]:
            ankle=RIG.data.bones['shin.'+side].tail_local.copy()
            target,stance=step(t if clip=='walk' else 0,offset,ankle,unit)
            solve_leg('thigh.'+side,'shin.'+side,target,(1,0,0))
            set_pose('foot.'+side,target)
    else:
        animate_horse(t,clip)
        # Seat, boots and shield remain stable while the torso and lance perform the strike.
        for side in ['near','far']:
            RIG.pose.bones['thigh.'+side].matrix_basis=Matrix.Identity(4)
            RIG.pose.bones['shin.'+side].matrix_basis=Matrix.Identity(4)
        set_pose('root',RIG.data.bones['root'].head_local)
        hit=math.sin(math.pi*t)**2 if clip=='attack' else 0
        lean=.08*hit
        set_pose('spine',RIG.data.bones['spine'].head_local,Quaternion((0,1,0),lean))
        spine=RIG.pose.bones['spine'];head=spine.matrix@spine.bone.matrix_local.inverted()@RIG.data.bones['head'].head_local
        set_pose('head',head,Quaternion((0,1,0),-.02*hit))
        if clip=='walk':
            hand=Vector((.38,-.345,1.40+.015*math.sin(math.tau*t)))
            direction=Vector((1,0,.55))
        else:
            times=[0,.25,.5,.75,1]
            hands=[(.27,-.345,1.40),(.33,-.345,1.52),(.65,-.345,1.69),(.45,-.345,1.46),(.38,-.345,1.40)]
            slopes=[.45,.27,-.035,.30,.55]
            i=min(3,int(t*4));u=smooth((t-times[i])/.25)
            hand=Vector(hands[i]).lerp(Vector(hands[i+1]),u)
            direction=Vector((1,0,slopes[i]*(1-u)+slopes[i+1]*u))
        solve_leg('arm.near','forearm.near',hand,(-1,0,-.2))
        rest=RIG.data.bones[WRIST_NAME]
        parent=RIG.pose.bones['forearm.near']
        position=parent.matrix@parent.bone.matrix_local.inverted()@rest.head_local
        set_pose(WRIST_NAME,position,(rest.tail_local-rest.head_local).rotation_difference(direction))
    bpy.context.view_layer.update()
    marker=bpy.data.objects['Weapon muzzle / runtime socket']
    marker.location=ART['weapon_points'](unit)


def build(unit,samples,render):
    global RIG,PREVIOUS
    directory=STAGE/unit;directory.mkdir(parents=True,exist_ok=True)
    baseline=directory/'baseline';baseline.mkdir(exist_ok=True)
    source=ROOT/f'art/blender/unit-{unit}.blend';sheet=ROOT/f'public/assets/reborn/units/{unit}.png'
    for path in [source,sheet]:
        target=baseline/path.name
        if not target.exists():shutil.copy2(path,target)
    before={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    bpy.ops.wm.open_mainfile(filepath=str(baseline/source.name))
    RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    source_poses={clip:[sample_source(clip,i/64) for i in range(65)] for clip in ['walk','attack']}
    for obj in bpy.data.objects:
        if obj.animation_data and obj.animation_data.action:obj.animation_data.action.use_fake_user=True
    prepare(unit)
    marker=bpy.data.objects['Weapon muzzle / runtime socket']
    animated=[RIG,marker]+([BODY]+[o for leg in HORSE for o in leg['objects'].values()] if BODY else [])
    action_sets={}
    for clip in ['walk','attack']:
        PREVIOUS={};action_sets[clip]={}
        for obj in animated:
            obj.animation_data_clear();obj.animation_data_create()
            action=bpy.data.actions.new(f'Study {unit} / {clip} / {obj.name}')
            action.use_fake_user=True;obj.animation_data.action=action;action_sets[clip][obj.name]=action.name
        for sample in range(65):
            t=sample/64
            set_pose_frame(unit,clip,t,source_poses[clip][sample])
            for obj in animated:store_keys(obj,sample/8)
        for obj in animated:
            for curve in obj.animation_data.action.fcurves:
                for key in curve.keyframe_points:key.interpolation='LINEAR'
    scene=bpy.context.scene
    scene['animation_study_revision']=3
    scene['animation_study_actions']=json.dumps(action_sets)
    scene['animation_study_contract']='walk:8x65ms=520ms; attack:8x40ms=320ms; sprite12=contact160ms; frame8 per clip is unsampled closure'
    scene.frame_start=0;scene.frame_end=8;scene.render.fps=25
    ART['configure_renderer'](samples)
    sockets=[];frame_checks=[];clip_checks={}
    for clip in ['walk','attack']:
        for obj in animated:obj.animation_data.action=bpy.data.actions[action_sets[clip][obj.name]]
        measurements=[]
        # Inspect actual evaluated geometry between authored keys, not only analytic targets.
        for index in range(129):
            time=index/16;t=time/8
            scene.frame_set(math.floor(time),subframe=time%1);bpy.context.view_layer.update()
            feet=[]
            for foot_index,obj in enumerate(FOOT_OBJECTS):
                vertices=world_vertices(obj);position=sum(vertices,Vector())/len(vertices)
                offset=[0,.5][foot_index] if unit=='clubman' else [0,.5,.5,0][foot_index]
                stance=(t+offset)%1<.60 if clip=='walk' else True
                feet.append({'center':serial(position),'minimum_z':min(p.z for p in vertices),'stance':stance,
                             'advected_center':serial(position+RIGHT*CYCLE_DISTANCE*t)})
            hand=center(bpy.data.objects['Hand'])
            wrist=RIG.matrix_world@RIG.pose.bones[WRIST_NAME].matrix.translation
            measurements.append({'time':time,'feet':feet,'hand_grip_distance':(hand-wrist).length})
        stance_error=0;ground_range=0
        for foot_index in range(len(FOOT_OBJECTS)):
            for start,end in zip(measurements,measurements[1:]):
                a,b=start['feet'][foot_index],end['feet'][foot_index]
                if a['stance'] and b['stance']:
                    key='advected_center' if clip=='walk' else 'center'
                    stance_error=max(stance_error,(Vector(a[key])-Vector(b[key])).length)
                    ground_range=max(ground_range,abs(a['minimum_z']-b['minimum_z']))
        clip_checks[clip]={'evaluated_subframe_samples':129,'max_stance_step_error_world':stance_error,
                           'max_contact_ground_step_world':ground_range,
                           'max_hand_grip_distance_world':max(m['hand_grip_distance'] for m in measurements),
                           'samples':measurements}
        assert stance_error<.001,(unit,clip,'foot stance',stance_error)
        assert ground_range<.001,(unit,clip,'ground contact',ground_range)
        assert clip_checks[clip]['max_hand_grip_distance_world']<.003,(unit,clip,'hand grip')
        for frame in range(8):
            scene.frame_set(frame);bpy.context.view_layer.update()
            index=frame+(8 if clip=='attack' else 0)
            point=ART['weapon_points'](unit);p=world_to_camera_view(scene,scene.camera,point)
            sockets.append([round(p.x*256,3),round((1-p.y)*256,3)])
            frame_checks.append({'sprite':index,'clip':clip,'clip_ms':frame*(65 if clip=='walk' else 40),
                                 'weapon_world':serial(point)})
            if render:ART['render_atomic'](directory/'frames'/f'{index:02d}.png')
    for obj in animated:obj.animation_data.action=bpy.data.actions[action_sets['walk'][obj.name]]
    scene.frame_set(0)
    ART['save_scene'](directory/f'unit-{unit}.blend')
    after={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    assert before==after,'Production asset changed during study'
    report={'passed':True,'unit':unit,'frame_count':16,'sheet_size':[4096,256],'contact_sprite_index':12,'contact_ms':160,
            'walk_ms':520,'attack_ms':320,'actions':action_sets,'frames':frame_checks,'sockets':sockets,
            'cycle_distance_world':CYCLE_DISTANCE,'runtime_speed':UNITS[unit][0],'runtime_scale':UNITS[unit][1],
            'production_hashes':before,'production_unchanged':True,'geometry_checks':clip_checks}
    ART['write_json_atomic'](directory/'geometry-check.json',report)
    ART['write_json_atomic'](directory/'weapon-sockets.json',{unit:sockets})
    print('STUDY_READY',unit,json.dumps({clip:{k:v for k,v in check.items() if k!='samples'} for clip,check in clip_checks.items()}),flush=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=['clubman','knight','both'],default='both')
    parser.add_argument('--model-only',action='store_true');parser.add_argument('--samples',type=int,default=48)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in UNITS if args.unit=='both' else [args.unit]:build(unit,args.samples,not args.model_only)


if __name__=='__main__':main()
