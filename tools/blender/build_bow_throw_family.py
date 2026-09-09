"""Author actual bow draw/string release, sling release, and grenade throw studies.

Only isolated candidates are saved. Visible projectiles leave the authored hands
at sample12 via mapped object Actions; their evaluated geometry still anchors the
runtime launch. All mechanism animation uses mapped object/bone Actions.
"""
import argparse,hashlib,json,math,shutil,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_animation_study as BASE
import build_ranged_animation_study as RANGED
ROOT=RANGED.ROOT;ART=BASE.ART
STAGE=ROOT/'art/blender/candidates/animation-v3/bow-throw-family'
SPEED={'archer':39,'slinger':36,'grenadier':39}
RIG=None;ANIMATED=[];PROJECTILES=[];BOW_TIPS={};MECHANISM={}
REST_BOW_GRIP=Vector((.83,-.35,1.255));REST_NOCK=Vector((.54,-.35,1.355))


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def sample(values,t):
    i=min(len(values)-2,int(t*(len(values)-1)));u=BASE.smooth(t*(len(values)-1)-i)
    if isinstance(values[0],(tuple,list,Vector)):return Vector(values[i]).lerp(Vector(values[i+1]),u)
    return values[i]*(1-u)+values[i+1]*u
def center(obj):return BASE.center(obj)


def cord(name,head,tail,material,bone_name,radius=.008):
    head=Vector(head);tail=Vector(tail);axis=tail-head
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=axis.length,location=(head+tail)/2)
    obj=bpy.context.object;obj.name=name;obj.rotation_mode='QUATERNION';obj.rotation_quaternion=axis.to_track_quat('Z','Y')
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:polygon.use_smooth=True
    BASE.bone(bone_name,head,tail,'root');ART['set_group'](obj,RIG,bone_name)
    return obj


def segment_pose(name,head,tail):
    rest=RIG.data.bones[name];axis=Vector(tail)-Vector(head)
    rotation=(rest.tail_local-rest.head_local).rotation_difference(axis)
    matrix=Matrix.Translation(Vector(head))@(rotation@rest.matrix_local.to_quaternion()).to_matrix().to_4x4()
    RIG.pose.bones[name].matrix=matrix@Matrix.Diagonal(Vector((1,axis.length/rest.length,1,1)))
    bpy.context.view_layer.update()


def hand(side,target,rotation=Quaternion(),pole=(0,0,-1)):
    rest_center=Vector((.34,-.345 if side=='near' else .345,1.15))
    wrist=Vector(target)-rotation@(rest_center-RIG.data.bones['hand.'+side].head_local)
    BASE.solve_leg('arm.'+side,'forearm.'+side,wrist,pole)
    BASE.set_pose('hand.'+side,wrist,rotation)


def prepare_human(unit):
    RIG.animation_data_clear()
    for p in RIG.pose.bones:p.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    for side in ['near','far']:
        ankle=RIG.data.bones['shin.'+side].tail_local.copy()
        BASE.bone('foot.'+side,ankle,ankle+Vector((.25,0,0)),'shin.'+side)
        wrist=RIG.data.bones['forearm.'+side].tail_local.copy()
        BASE.bone('hand.'+side,wrist,wrist+Vector((.15,0,0)),'forearm.'+side)
    for obj in bpy.data.objects:
        if obj.type!='MESH':continue
        group=None
        if obj.name.startswith(('Boot sole','Leather boot')):group='foot.far' if obj.name.endswith('.001') else 'foot.near'
        if obj.name in ['Hand','Fingers','Fingers.001','Fingers.002']:group='hand.near'
        if obj.name in ['Hand.001','Fingers.003','Fingers.004','Fingers.005']:group='hand.far'
        if group:ART['set_group'](obj,RIG,group)
    scene=bpy.context.scene;BASE.RIGHT=scene.camera.matrix_world.to_3x3().col[0].copy();BASE.RIGHT.z=0;BASE.RIGHT.normalize()
    p=world_to_camera_view(scene,scene.camera,BASE.RIGHT)-world_to_camera_view(scene,scene.camera,Vector())
    BASE.CYCLE_DISTANCE=SPEED[unit]*.520/(p.x*256*.43)


def prepare_archer():
    global PROJECTILES,BOW_TIPS,MECHANISM
    scene=bpy.context.scene;bow=bpy.data.objects['Yew longbow']
    points=[bow.matrix_world@v.co for v in bow.data.vertices]
    low=min(p.z for p in points);high=max(p.z for p in points)
    BOW_TIPS={'upper':[i for i,p in enumerate(points) if p.z>=high-.035],
              'lower':[i for i,p in enumerate(points) if p.z<=low+.035]}
    tips={side:sum((points[i] for i in indices),Vector())/len(indices) for side,indices in BOW_TIPS.items()}
    BASE.bone('weapon.bow',REST_BOW_GRIP,REST_BOW_GRIP+Vector((0,0,.4)),'root')
    for side in ['upper','lower']:BASE.bone('bow.'+side,REST_BOW_GRIP,tips[side],'weapon.bow')
    for group in list(bow.vertex_groups):bow.vertex_groups.remove(group)
    groups={name:bow.vertex_groups.new(name=name) for name in ['weapon.bow','bow.upper','bow.lower']}
    for index,p in enumerate(points):
        distance=p.z-REST_BOW_GRIP.z;wing='bow.upper' if distance>=0 else 'bow.lower'
        influence=min(1,max(0,(abs(distance)-.09)/.30))
        if influence<1:groups['weapon.bow'].add([index],1-influence,'REPLACE')
        if influence>0:groups[wing].add([index],influence,'REPLACE')
    old_string=bpy.data.objects['Bowstring'];material=old_string.data.materials[0]
    bpy.data.objects.remove(old_string,do_unlink=True)
    for side in ['upper','lower']:cord('Tensioned bowstring '+side,tips[side],REST_NOCK,material,'bow.string.'+side)
    BASE.bone('weapon.arrow',REST_NOCK,REST_NOCK+Vector((.3,0,0)),'root')
    for name in ['Nocked arrow','Arrowhead']:
        obj=bpy.data.objects[name];inverse=obj.matrix_world.inverted()
        for v in obj.data.vertices:
            point=obj.matrix_world@v.co
            point.x=REST_NOCK.x+(point.x+.15)*(.86/1.26)
            point.z+=REST_NOCK.z-1.21
            v.co=inverse@point
        # Apply only the existing tip bevel before fixing actual front vertices;
        # topology must remain stable after authoring, while the armature deforms it.
        if name=='Arrowhead':
            bpy.context.view_layer.objects.active=obj;obj.select_set(True)
            for modifier in list(obj.modifiers):
                if modifier.type=='BEVEL':bpy.ops.object.modifier_apply(modifier=modifier.name)
            obj.select_set(False)
        ART['set_group'](obj,RIG,'weapon.arrow')
    head=bpy.data.objects['Arrowhead'];head_points=[head.matrix_world@v.co for v in head.data.vertices]
    maximum=max(p.x for p in head_points)
    scene['runtime_weapon_mesh']=head.name
    scene['runtime_weapon_vertex_indices']=[i for i,p in enumerate(head_points) if p.x>=maximum-.006]
    scene['animation_bow_tip_vertices']=json.dumps(BOW_TIPS)
    PROJECTILES=[bpy.data.objects[name] for name in ['Nocked arrow','Arrowhead']]
    MECHANISM={'kind':'flexing bow with two tensioned string segments','bow_grip_rest':list(REST_BOW_GRIP),
               'nock_rest':list(REST_NOCK),'arrow_length_world':.86,'draw_distance_world':.38,
               'replaced_geometry':['Bowstring'],'adjusted_geometry':['Nocked arrow','Arrowhead'],
               'release_index':12,'mechanism_release_starts_ms':150,'release_visibility':'projectile hide_render, geometry still evaluated'}


def prepare_slinger():
    global PROJECTILES,MECHANISM
    old=bpy.data.objects['Woven sling'];material=old.data.materials[0]
    bpy.data.objects.remove(old,do_unlink=True)
    pouch=Vector((.8,-.35,1.77));grip=Vector((.34,-.345,1.15))
    BASE.bone('weapon.pouch',pouch,pouch+Vector((.2,0,0)),'root')
    for name in ['Loaded sling pouch','Sling stone']:ART['set_group'](bpy.data.objects[name],RIG,'weapon.pouch')
    cord('Retained sling cord',grip,pouch+Vector((0,-.025,0)),material,'sling.retained')
    cord('Release sling cord',grip+Vector((0,.022,.015)),pouch+Vector((0,.025,0)),material,'sling.release')
    bpy.context.scene['runtime_weapon_mesh']='Sling stone'
    PROJECTILES=[bpy.data.objects['Sling stone']]
    MECHANISM={'kind':'two-cord sling with released free end','cord_radius_world':.57,
               'replaced_geometry':['Woven sling'],'adjusted_geometry':[],'release_index':12,
               'mechanism_release_starts_ms':150,'release_visibility':'stone hide_render; empty pouch and both cords remain visible'}


def prepare_grenadier():
    global PROJECTILES,MECHANISM
    origin=Vector((.46,-.35,1.25));pin=Vector((.42,-.35,1.39))
    BASE.bone('weapon.grenade',origin,origin+Vector((.2,0,0)),'root')
    BASE.bone('grenade.pin',pin,pin+Vector((.15,0,0)),'root')
    for name in ['Segmented grenade','Grenade lever']:ART['set_group'](bpy.data.objects[name],RIG,'weapon.grenade')
    ART['set_group'](bpy.data.objects['Grenade pin'],RIG,'grenade.pin')
    bpy.context.scene['runtime_weapon_mesh']='Segmented grenade'
    PROJECTILES=[bpy.data.objects[name] for name in ['Segmented grenade','Grenade lever']]
    MECHANISM={'kind':'pin pull, overhead throw, empty-hand follow-through','replaced_geometry':[],
               'adjusted_geometry':[],'release_index':12,'mechanism_release_starts_ms':160,'release_visibility':'grenade and lever hide_render; held pin stays in other hand'}


def body(unit,clip,t):
    wave=math.sin(math.pi*t)**2 if clip=='attack' else 0
    hip_z=-.07-.018*wave if clip=='attack' else -.082+.012*math.cos(math.tau*t*2)
    BASE.set_pose('root',RIG.data.bones['root'].head_local+Vector((-.02+.024*wave,0,hip_z)))
    lean=.055+.085*wave if clip=='attack' else .055+.012*math.sin(math.tau*t)
    root=RIG.pose.bones['root']
    BASE.set_pose('spine',root.matrix@root.bone.matrix_local.inverted()@RIG.data.bones['spine'].head_local,Quaternion((0,1,0),lean))
    spine=RIG.pose.bones['spine'];head=spine.matrix@spine.bone.matrix_local.inverted()@RIG.data.bones['head'].head_local
    BASE.set_pose('head',head,Quaternion((0,1,0),.035+.055*wave))
    for side,offset in [('near',0),('far',.5)]:
        target,_=BASE.step(t if clip=='walk' else 0,offset,RIG.data.bones['shin.'+side].tail_local.copy(),'clubman')
        BASE.solve_leg('thigh.'+side,'shin.'+side,target,(1,0,0));BASE.set_pose('foot.'+side,target)


def archer_pose(clip,t):
    if clip=='walk':grip=Vector((.50,-.35,1.33+.012*math.sin(math.tau*t)));angle=.20+.018*math.sin(math.tau*t);draw=0
    else:
        grip=sample([(.50,-.35,1.33),(.55,-.35,1.53),(.61,-.35,1.76),(.62,-.35,1.78),(.64,-.35,1.78),(.60,-.35,1.72),(.54,-.35,1.53),(.51,-.35,1.38),(.50,-.35,1.33)],t)
        angle=sample([.20,.10,0,0,0,.025,.09,.16,.20],t)
        if t<=.375:draw=sample([0,.25,.60,1],t/.375)
        elif t<=.46875:draw=1
        elif t<.5:draw=1-BASE.smooth((t-.46875)/.03125)
        else:draw=sample([0,.08,0,0,0],(t-.5)/.5)
    rotation=Quaternion((0,1,0),angle);BASE.set_pose('weapon.bow',grip,rotation)
    for side,sign in [('upper',-1),('lower',1)]:BASE.set_pose('bow.'+side,grip,rotation@Quaternion((0,1,0),sign*.065*draw))
    delta=RIG.pose.bones['weapon.bow'].matrix@RIG.data.bones['weapon.bow'].matrix_local.inverted()
    nock=delta@(REST_NOCK+Vector((-.38*draw,0,0)))
    BASE.set_pose('weapon.arrow',nock,rotation)
    points=BASE.world_vertices(bpy.data.objects['Yew longbow'])
    for side,indices in BOW_TIPS.items():
        tip=sum((points[i] for i in indices),Vector())/len(indices)
        segment_pose('bow.string.'+side,tip,nock)
    hand('near',grip,rotation)
    if clip=='attack' and .46875<=t<1:
        # The fingers stop holding the string during the final10ms of arrow
        # acceleration. At160ms the arrow exits and the hand stays near the cheek.
        held=delta@(REST_NOCK+Vector((-.38,0,0)))
        recovery=BASE.smooth(max(0,(t-.625)/.375))
        far=held.lerp(nock,recovery)
    else:far=nock
    hand('far',far,rotation)
    if clip=='attack':
        weight=sample([0,.4,1,1,1,.7,.3,.1,0],t)
        head=RIG.pose.bones['head'].matrix.copy();eye=head@RIG.data.bones['head'].matrix_local.inverted()@Vector((.19,-.128,2.188))
        target=Vector((eye.x,nock.y,nock.z+.045));head.translation+=(target-eye)*weight;RIG.pose.bones['head'].matrix=head


def slinger_pose(clip,t):
    if clip=='walk':palm=Vector((.37,-.35,1.18+.012*math.sin(math.tau*t)));angle=.95+.025*math.sin(math.tau*t)
    else:
        palm=sample([(.37,-.35,1.18),(.15,-.38,1.52),(.20,-.40,1.72),(.32,-.40,1.86),(.40,-.40,1.82),(.57,-.38,1.62),(.53,-.35,1.38),(.40,-.35,1.23),(.37,-.35,1.18)],t)
        angle=sample([.95,-.45,-1.90,-3.32,-math.pi*1.5,-5.5,-6.5,-5.6,.95-math.tau],t)
    pouch=palm+Vector((.57*math.cos(angle),0,.57*math.sin(angle)))
    rotation=Quaternion((0,1,0),-angle+.95)
    BASE.set_pose('weapon.pouch',pouch,rotation);hand('near',palm,Quaternion((0,1,0),-.12))
    far=Vector((.25,.30,1.18)) if clip=='walk' else sample([(.25,.30,1.18),(.10,.30,1.36),(-.12,.30,1.52),(-.18,.30,1.53),(-.10,.30,1.40),(.05,.30,1.27),(.18,.30,1.20),(.24,.30,1.18),(.25,.30,1.18)],t)
    hand('far',far)
    near_pouch=pouch+Vector((0,-.025,0));far_pouch=pouch+Vector((0,.025,0))
    segment_pose('sling.retained',palm,near_pouch)
    if clip=='attack' and .46875<=t<1:
        opening=BASE.smooth((t-.46875)/.03125) if t<.5 else sample([1,1,.8,.3,0],(t-.5)/.5)
        free=palm+Vector((0,.022,.015))
        flight=far_pouch+Vector((-.57*math.cos(angle+.85),.04,-.57*math.sin(angle+.85)))
        free=free.lerp(flight,opening)
    else:free=palm+Vector((0,.022,.015))
    segment_pose('sling.release',free,far_pouch)


def grenadier_pose(clip,t):
    if clip=='walk':origin=Vector((.44,-.35,1.22+.012*math.sin(math.tau*t)));angle=0
    else:
        origin=sample([(.44,-.35,1.22),(.36,-.35,1.58),(-.10,-.42,1.96),(.08,-.43,2.24),(.62,-.40,1.97),(.66,-.40,1.53),(.57,-.35,1.23),(.48,-.35,1.20),(.44,-.35,1.22)],t)
        angle=sample([0,-.2,-.8,-1.2,.2,.7,.3,0,0],t)
    rotation=Quaternion((0,1,0),angle);BASE.set_pose('weapon.grenade',origin,rotation)
    hand('near',origin+rotation@Vector((-.04,.005,-.04)),rotation,(0,-1,0))
    delta=RIG.pose.bones['weapon.grenade'].matrix@RIG.data.bones['weapon.grenade'].matrix_local.inverted()
    attached_pin=delta@Vector((.42,-.35,1.39))
    if clip=='walk':far=Vector((.29,.32,1.20));pin=attached_pin
    elif t<=.125:
        far=Vector((.29,.32,1.20)).lerp(attached_pin,BASE.smooth(t/.125));pin=attached_pin
    else:
        far=sample([(.29,.32,1.20),(.293,-.35,1.709),(.07,.10,1.60),(-.08,.20,1.55),(-.10,.25,1.40),(.05,.30,1.25),(.20,.32,1.20),(.28,.32,1.20),(.29,.32,1.20)],t)
        # Rejoin the loaded idle state only at the unrendered closure key.
        blend=BASE.smooth(max(0,(t-.875)/.125));pin=far.lerp(attached_pin,blend)
    hand('far',far,pole=(0,1,0));BASE.set_pose('grenade.pin',pin)


def pose(unit,clip,t):
    body(unit,clip,t)
    {'archer':archer_pose,'slinger':slinger_pose,'grenadier':grenadier_pose}[unit](clip,t)
    for obj in PROJECTILES:obj.hide_render=clip=='attack' and .5<=t<1
    bpy.context.view_layer.update()
    bpy.data.objects['Weapon muzzle / runtime socket'].location=ART['weapon_points'](unit)


def build(unit,faction):
    global RIG,ANIMATED
    suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key;baseline=directory/'baseline'
    baseline.mkdir(parents=True,exist_ok=True)
    source=ROOT/f'art/blender/unit-{key}.blend';sheet=ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'
    before={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    for path in [source,sheet]:
        if not (baseline/path.name).exists():shutil.copy2(path,baseline/path.name)
    bpy.ops.wm.open_mainfile(filepath=str(baseline/source.name));scene=bpy.context.scene
    RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');BASE.RIG=RIG
    allowed={'archer':{'Bowstring','Nocked arrow','Arrowhead'},'slinger':{'Woven sling'},'grenadier':set()}[unit]
    body_contracts={o.name:RANGED.mesh_contract(o) for o in bpy.data.objects if o.type=='MESH' and o.name not in allowed}
    if RIG.animation_data and RIG.animation_data.action:RIG.animation_data.action.use_fake_user=True
    prepare_human(unit)
    {'archer':prepare_archer,'slinger':prepare_slinger,'grenadier':prepare_grenadier}[unit]()
    marker=bpy.data.objects['Weapon muzzle / runtime socket'];ANIMATED=[RIG,marker]+PROJECTILES
    sets={}
    for clip in ['walk','attack']:
        sets[clip]={};BASE.PREVIOUS={}
        for obj in ANIMATED:
            obj.animation_data_clear();obj.animation_data_create()
            action=bpy.data.actions.new(f'Study {key} / {clip} / {obj.name}');action.use_fake_user=True
            obj.animation_data.action=action;sets[clip][obj.name]=action.name
        subdivisions=256 if unit=='grenadier' and clip=='attack' else 64
        phases=sorted(set([i/subdivisions for i in range(subdivisions+1)]+([.1,.6] if clip=='walk' else [])))
        for phase in phases:
            pose(unit,clip,phase)
            for obj in ANIMATED:
                if obj in PROJECTILES:obj.keyframe_insert('hide_render',frame=phase*8)
                else:BASE.store_keys(obj,phase*8)
        for obj in ANIMATED:
            for curve in obj.animation_data.action.fcurves:
                for keyframe in curve.keyframe_points:keyframe.interpolation='CONSTANT' if curve.data_path=='hide_render' else 'LINEAR'
    assert body_contracts=={name:RANGED.mesh_contract(bpy.data.objects[name]) for name in body_contracts},'Unapproved body/accessory mesh change'
    gait={'nominalSpeedPxPerSecond':SPEED[unit],'referenceDisplayScale':.43,'cycleDistancePixels':round(SPEED[unit]*.520,5),
          'nominalCycleDurationMs':520,'motionKind':'biped','stanceFraction':.6,'doubleSupportFrames':[0,4]}
    scene['animation_study_revision']=3;scene['animation_study_actions']=json.dumps(sets);scene['animation_study_gait']=json.dumps(gait)
    scene['animation_study_contract']='walk8x65ms; attack8x40ms; release sprite12 at160ms; frame8 is closure'
    scene['animation_study_family']='bow / sling / grenade: actual mechanism and visible release'
    scene['animation_study_mechanism']=json.dumps(MECHANISM);scene['animation_release_objects']=json.dumps([o.name for o in PROJECTILES])
    scene.frame_start=0;scene.frame_end=8;scene.render.fps=25;sockets=[]
    for clip in ['walk','attack']:
        for obj in ANIMATED:obj.animation_data.action=bpy.data.actions[sets[clip][obj.name]]
        for frame in range(8):
            scene.frame_set(frame);bpy.context.view_layer.update()
            point=world_to_camera_view(scene,scene.camera,ART['weapon_points'](unit))
            sockets.append([round(point.x*256,3),round((1-point.y)*256,3)])
    for obj in ANIMATED:obj.animation_data.action=bpy.data.actions[sets['walk'][obj.name]]
    scene.frame_set(0);ART['configure_renderer'](48);ART['save_scene'](directory/f'unit-{key}.blend')
    assert before=={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    report={'passed':True,'unit':unit,'faction':faction,'source_hashes':before,'production_unchanged':True,
            'preserved_body_accessory_meshes':len(body_contracts),'body_mesh_contracts':body_contracts,
            'mechanism':MECHANISM,'actions':sets,'gait':gait,'sockets':sockets,'frames':16,'release_index':12,'release_ms':160,
            'bone_count':len(RIG.data.bones),'cycle_distance_world':BASE.CYCLE_DISTANCE,
            'visible_projectiles':[o.name for o in PROJECTILES]}
    ART['write_json_atomic'](directory/'model-check.json',report)
    ART['write_json_atomic'](directory/'weapon-sockets.json',{unit:sockets})
    ART['write_json_atomic'](directory/'gait-metadata.partial.json',{unit:gait})
    print('BOW_THROW_BUILT',unit,faction,'bones',len(RIG.data.bones),'projectile actions',len(PROJECTILES),flush=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=list(SPEED)+['all'],default='all')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in list(SPEED) if args.unit=='all' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:build(unit,faction)


if __name__=='__main__':main()
