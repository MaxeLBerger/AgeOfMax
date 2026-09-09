"""Authored 16-frame melee clips in isolated sources; five distinct weapon paths, including preserved Titan v2.

All original mesh geometry/materials and original bone rest definitions remain.
Missing hands/feet, a rigid weapon grip and shield control close inspected binding
gaps. Frames 0..7 per action are exported; action frame 8 closes the clip.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_animation_study as BASE
import build_ranged_animation_study as COMMON
ROOT=COMMON.ROOT;ART=COMMON.ART
STAGE=ROOT/'art/blender/candidates/animation-v3/melee-family'
UNITS={
 'clubman':{
   'speed':40,'scale':.43,'grip':[.34,-.345,1.15],'axis':[.16,-.005,.70],
   'weapon_parts':['Carved club handle','Club leather binding','Stone warclub head'],
   'marker':'Stone warclub head','walk_hand':[.38,-.345,1.29],'walk_pitch':1.25,
   'hands':[[.38,-.345,1.29],[.18,-.37,1.58],[.03,-.37,1.87],[.22,-.35,1.70],[.61,-.36,1.49],[.63,-.35,1.28],[.43,-.35,1.25],[.37,-.345,1.25],[.38,-.345,1.29]],
   'pitches':[1.25,1.65,2.25,1.05,-.12,-.40,.10,.70,1.25],
   'note':'Heavy diagonal stone-club swing: shoulder windup, forward contact, low follow-through and recovery.',
 },
 'swordsman':{
   'speed':43,'scale':.43,'grip':[.40,-.35,1.17],'axis':[.08,0,1.11],
   'weapon_parts':['Fullered sword blade','Wrapped sword grip','Sword crossguard','Sword pommel'],
   'marker':'Fullered sword blade','walk_hand':[.34,-.36,1.32],'walk_pitch':1.16,
   'hands':[[.34,-.36,1.32],[.22,-.36,1.57],[.07,-.36,1.68],[.22,-.40,1.70],[.57,-.39,1.48],[.56,-.39,1.22],[.33,-.38,1.25],[.30,-.36,1.30],[.34,-.36,1.32]],
   'pitches':[1.16,1.65,2.02,1.10,.06,-.35,.10,.65,1.16],
   'note':'Controlled sword cut with a raised guard, forward blade contact and shield maintained on the other hand.',
 },
}
UNITS.update({
 'spearman':{
   'speed':38,'scale':.43,'grip':[.40,-.35,1.31],'axis':[1.70,0,.92],
   'weapon_parts':['Long ash spear','Spear socket','Knapped spearhead'],
   'marker':'Knapped spearhead','walk_hand':[.28,-.39,1.32],'walk_pitch':.80,
   'hands':[[.28,-.39,1.32],[.18,-.39,1.34],[.05,-.39,1.37],[.26,-.39,1.46],[.64,-.38,1.48],[.56,-.38,1.46],[.31,-.39,1.39],[.24,-.39,1.35],[.28,-.39,1.32]],
   'pitches':[.80,.55,.20,.08,.06,.10,.33,.60,.80],
   'note':'Axial spear thrust from a drawn-back chamber; continuous grip on the real ash shaft, shield on the other arm.',
 },
 'duelist':{
   'speed':47,'scale':.43,'grip':[.40,-.35,1.17],'axis':[.08,0,1.11],
   'weapon_parts':['Fullered sword blade','Wrapped sword grip','Sword crossguard','Sword pommel'],
   'marker':'Fullered sword blade','walk_hand':[.28,-.38,1.25],'walk_pitch':.60,
   'hands':[[.28,-.38,1.25],[.20,-.39,1.31],[.13,-.40,1.36],[.40,-.41,1.44],[.70,-.40,1.43],[.56,-.40,1.40],[.25,-.39,1.31],[.25,-.38,1.27],[.28,-.38,1.25]],
   'pitches':[.60,.38,.14,.06,.015,.08,.27,.46,.60],
   'note':'Compact sword counter-thrust with a low forward guard, quick extension and controlled withdrawal; distinct from the Swordsman cut.',
 },
 'super-heavy':{
   'speed':31,'scale':.57,'grip':[.30,-.20,1.51],'far_grip':[.30,-.20,1.84],
   'axis':[0,0,1.2],'marker':'Aether warhammer head','weapon_parts':[],
   'note':'Titan v2 anatomy, all sixteen rest bones and bindings retained. Broad stance, rear-loaded windup, torso rotation, two real shaft grips and a heavy downward follow-through.',
 },
})
HAND_REST={'near':Vector((.34,-.345,1.15)),'far':Vector((.34,.345,1.15))}
TITAN_HAND_REST={'near':Vector((.46,-.46,1.04)),'far':Vector((.46,.46,1.04))}

SHIELD_REST=Vector((.20,-.485,1.43))

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def sample_vector(values,t):return Vector([COMMON.sample([point[axis] for point in values],t) for axis in range(3)])
def bone_record(rig):return {b.name:[list(b.head_local),list(b.tail_local),b.parent.name if b.parent else None] for b in rig.data.bones}
def ensure_backup(source,target):
    if not target.exists():
        temporary=target.with_suffix(target.suffix+'.copying');temporary.write_bytes(source.read_bytes());ART['replace_atomic'](temporary,target)
    assert digest(source)==digest(target),('Original changed since archive',source)

def prepare(unit):
    rig=BASE.RIG;scene=bpy.context.scene;config=UNITS[unit]
    scene.frame_set(1);rig.animation_data_clear()
    for pose in rig.pose.bones:pose.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    if unit=='super-heavy':
        assert scene['authored_character_revision']==2 and len(rig.data.bones)==16
        assert scene['runtime_weapon_mesh']=='Aether warhammer head'
        scene['melee_shield_control']=False
    for side in [] if unit=='super-heavy' else ['near','far']:
        ankle=rig.data.bones['shin.'+side].tail_local.copy()
        BASE.bone('foot.'+side,ankle,ankle+Vector((.25,0,0)),'shin.'+side)
        hand=rig.data.bones['forearm.'+side].tail_local.copy()
        BASE.bone('hand.'+side,hand,hand+Vector((.15,0,0)),'forearm.'+side)
    if 'weapon.wrist' not in rig.data.bones:
        grip=Vector(config['grip']);BASE.bone('weapon.wrist',grip,grip+Vector(config['axis']),'root')
    shield_objects=[]
    for obj in bpy.data.objects:
        if obj.type!='MESH' or unit=='super-heavy':continue
        group=None
        if obj.name.startswith(('Leather boot','Boot sole')):group='foot.far' if obj.name.endswith('.001') else 'foot.near'
        if obj.name in ['Hand','Fingers','Fingers.001','Fingers.002']:group='hand.near'
        if obj.name in ['Hand.001','Fingers.003','Fingers.004','Fingers.005']:group='hand.far'
        if any(obj.name==p or obj.name.startswith(p+'.') for p in config['weapon_parts']):group='weapon.wrist'
        if obj.name.startswith(('Round hide shield','Shield ')):shield_objects.append(obj)
        if group:ART['set_group'](obj,rig,group)
    if shield_objects:
        BASE.bone('shield.grip',SHIELD_REST,SHIELD_REST+Vector((0,0,.35)),'root')
        for obj in shield_objects:ART['set_group'](obj,rig,'shield.grip')
    scene['runtime_weapon_mesh']=config['marker']
    if unit in ['swordsman','duelist','spearman']:
        blade=bpy.data.objects[config['marker']]
        points=[blade.matrix_world@v.co for v in blade.data.vertices]
        component=0 if unit=='spearman' else 2
        tip=max(v[component] for v in points)
        indices=[i for i,v in enumerate(points) if v[component]>=tip-.008]
        assert indices and len(indices)<len(points)
        scene['runtime_weapon_vertex_indices']=indices
    bpy.data.objects['Weapon muzzle / runtime socket'].animation_data_clear()
    BASE.RIGHT=scene.camera.matrix_world.to_3x3().col[0].copy();BASE.RIGHT.z=0;BASE.RIGHT.normalize()
    p=world_to_camera_view(scene,scene.camera,BASE.RIGHT)-world_to_camera_view(scene,scene.camera,Vector())
    BASE.CYCLE_DISTANCE=config['speed']*.520/(p.x*256*config['scale'])
    scene['melee_shield_control']=bool(shield_objects)

def hand_pose(side,desired,rotation,titan=False):
    rig=BASE.RIG;rest=rig.data.bones['hand.'+side]
    target=Vector(desired)-rotation@((TITAN_HAND_REST if titan else HAND_REST)[side]-rest.head_local)
    BASE.solve_leg('arm.'+side,'forearm.'+side,target,(0,-1 if side=='near' else 1,-.3))
    BASE.set_pose('hand.'+side,target,rotation)

def pose(unit,clip,t):
    if unit=='super-heavy':
        return titan_pose(clip,t)
    rig=BASE.RIG;config=UNITS[unit]
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    wave=math.sin(math.pi*t)**2 if clip=='attack' else 0
    drop=-.067-.040*wave if clip=='attack' else -.075+.008*math.cos(math.tau*t*2)
    shift=.065*wave if clip=='attack' else 0
    BASE.set_pose('root',rig.data.bones['root'].head_local+Vector((shift,0,drop)))
    root=rig.pose.bones['root'];lean=.055+.12*wave
    BASE.set_pose('spine',root.matrix@root.bone.matrix_local.inverted()@rig.data.bones['spine'].head_local,Quaternion((0,1,0),lean))
    spine=rig.pose.bones['spine']
    BASE.set_pose('head',spine.matrix@spine.bone.matrix_local.inverted()@rig.data.bones['head'].head_local,Quaternion((0,1,0),.025+.035*wave))
    for side,offset in [('near',0),('far',.5)]:
        ankle=rig.data.bones['shin.'+side].tail_local.copy()
        target,_=BASE.step(t if clip=='walk' else 0,offset,ankle,'clubman')
        BASE.solve_leg('thigh.'+side,'shin.'+side,target,(1,0,0));BASE.set_pose('foot.'+side,target)
    if clip=='walk':
        origin=Vector(config['walk_hand'])+Vector((.012*math.sin(math.tau*t),0,.015*math.sin(math.tau*t*2)))
        pitch=config['walk_pitch']+.025*math.sin(math.tau*t)
    else:origin=sample_vector(config['hands'],t);pitch=COMMON.sample(config['pitches'],t)
    rest=rig.data.bones['weapon.wrist']
    rotation=(rest.tail_local-rest.head_local).rotation_difference(Vector((math.cos(pitch),0,math.sin(pitch))))
    # Compute grip from the rigid weapon before solving the arm; set the weapon
    # after the forearm, since the inspected Clubman wrist retains that parent.
    desired=origin+rotation@(Vector(config['grip'])-rest.head_local)
    hand_pose('near',desired,rotation)
    BASE.set_pose('weapon.wrist',origin,rotation)
    if bpy.context.scene['melee_shield_control']:
        shield_target=Vector((.39+.035*wave,.105,1.40+.025*wave))
        if clip=='walk':shield_target+=Vector((.008*math.sin(math.tau*t),0,.012*math.sin(math.tau*t*2)))
        shield_rotation=Quaternion((0,1,0),-.05*wave)
        hand_pose('far',shield_target,shield_rotation)
        BASE.set_pose('shield.grip',shield_target,shield_rotation)
    else:
        far=Vector((.18-.08*wave,.32,1.27+.035*wave))
        if clip=='walk':far+=Vector((.025*math.sin(math.tau*t+math.pi),0,.014*math.sin(math.tau*t*2)))
        hand_pose('far',far,Quaternion())
    bpy.context.view_layer.update()
    bpy.data.objects['Weapon muzzle / runtime socket'].location=ART['weapon_points'](unit)

def titan_pose(clip,t):
    # Titan v2 is anatomically independent: retain its broad armour, sixteen
    # bones, all original bindings, torso loading and actual two-handed haft.
    rig=BASE.RIG
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    idle_pitch=math.atan2(-.542,.84)
    if clip=='walk':
        cycle=math.sin(math.tau*t)
        hip_x=-.02;hip_z=-.085+.009*math.cos(math.tau*t*2)
        lean=.06+.025*cycle;twist=.035*cycle
        origin=Vector((.29+.025*cycle,-.18,1.60+.025*cycle*cycle))
        pitch=idle_pitch-.035*cycle
    else:
        hip_x=COMMON.sample([-.02,-.05,-.09,-.04,.07,.025,-.02,-.02,-.02],t)
        hip_z=COMMON.sample([-.076,-.10,-.12,-.08,-.13,-.11,-.09,-.08,-.076],t)
        lean=COMMON.sample([.06,-.04,-.12,.01,.22,.15,.09,.07,.06],t)
        twist=COMMON.sample([0,-.04,-.07,-.02,.065,.035,.015,.005,0],t)
        origin=sample_vector([[.29,-.18,1.60],[.18,-.18,1.66],[.13,-.16,1.70],[.34,-.16,1.79],[.37,-.16,1.70],[.30,-.16,1.56],[.24,-.18,1.53],[.27,-.18,1.57],[.29,-.18,1.60]],t)
        pitch=COMMON.sample([idle_pitch,.70,math.atan2(.96,-.28),math.atan2(.90,.43),math.atan2(-.475,.88),idle_pitch,-.45,-.50,idle_pitch],t)
    BASE.set_pose('root',rig.data.bones['root'].head_local+Vector((hip_x,0,hip_z)))
    root=rig.pose.bones['root']
    BASE.set_pose('spine',root.matrix@root.bone.matrix_local.inverted()@rig.data.bones['spine'].head_local,Quaternion((0,1,0),lean)@Quaternion((0,0,1),twist))
    spine=rig.pose.bones['spine']
    BASE.set_pose('head',spine.matrix@spine.bone.matrix_local.inverted()@rig.data.bones['head'].head_local,Quaternion((0,1,0),.03))
    for side,offset in [('near',0),('far',.5)]:
        ankle=rig.data.bones['shin.'+side].tail_local.copy()
        target,_=BASE.step(t if clip=='walk' else 0,offset,ankle,'clubman')
        target.z=ankle.z+(target.z-ankle.z)*.6
        BASE.solve_leg('thigh.'+side,'shin.'+side,target,(1,0,0));BASE.set_pose('foot.'+side,target)
    rest=rig.data.bones['weapon.wrist']
    direction=Vector((math.cos(pitch),0,math.sin(pitch)))
    rotation=(rest.tail_local-rest.head_local).rotation_difference(direction)
    for side,grip in [('near',UNITS['super-heavy']['grip']),('far',UNITS['super-heavy']['far_grip'])]:
        desired=origin+rotation@(Vector(grip)-rest.head_local)
        hand_pose(side,desired,rotation,titan=True)
    BASE.set_pose('weapon.wrist',origin,rotation)
    bpy.context.view_layer.update()
    bpy.data.objects['Weapon muzzle / runtime socket'].location=ART['weapon_points']('super-heavy')


def build(unit,faction):
    suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;config=UNITS[unit]
    directory=STAGE/key;baseline=directory/'baseline';baseline.mkdir(parents=True,exist_ok=True)
    source=ROOT/f'art/blender/unit-{key}.blend';sheet=ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'
    for path in [source,sheet]:ensure_backup(path,baseline/path.name)
    before={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    bpy.ops.wm.open_mainfile(filepath=str(baseline/source.name),load_ui=False)
    scene=bpy.context.scene;BASE.RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig=BASE.RIG
    mesh_before={o.name:COMMON.mesh_contract(o,bindings=unit=='super-heavy') for o in bpy.data.objects if o.type=='MESH'}
    bones_before=bone_record(rig)
    if rig.animation_data and rig.animation_data.action:rig.animation_data.action.use_fake_user=True
    prepare(unit)
    animated=[rig,bpy.data.objects['Weapon muzzle / runtime socket']];sets={}
    phase_times={clip:sorted(set([i/128 for i in range(129)]+([.1,.6] if clip=='walk' else []))) for clip in ['walk','attack']}
    for clip in ['walk','attack']:
        BASE.PREVIOUS={};sets[clip]={}
        for obj in animated:
            obj.animation_data_clear();obj.animation_data_create()
            action=bpy.data.actions.new(f'Melee {key} / {clip} / {obj.name}');action.use_fake_user=True
            obj.animation_data.action=action;sets[clip][obj.name]=action.name
        for t in phase_times[clip]:
            pose(unit,clip,t)
            for obj in animated:BASE.store_keys(obj,t*8)
        for obj in animated:
            for curve in obj.animation_data.action.fcurves:
                for point in curve.keyframe_points:point.interpolation='LINEAR'
    assert mesh_before=={o.name:COMMON.mesh_contract(o,bindings=unit=='super-heavy') for o in bpy.data.objects if o.type=='MESH'},'Original mesh geometry/materials changed'
    assert all(bone_record(rig)[name]==record for name,record in bones_before.items()),'Original bone rest changed'
    scene['animation_study_revision']=3;scene['animation_study_actions']=json.dumps(sets)
    scene['animation_study_contract']='walk8x65ms=520ms; attack8x40ms=320ms; contact sprite12 at160ms; clip frame8 is closure'
    scene['animation_study_family']='melee: distinct authored strike paths and corrected rigid hand grips'
    scene['animation_study_gait']=json.dumps({'nominalSpeedPxPerSecond':config['speed'],'referenceDisplayScale':config['scale'],
        'cycleDistancePixels':config['speed']*.520,'nominalCycleDurationMs':520,'motionKind':'biped',
        'stanceFraction':.60,'doubleSupportFrames':[0,4]})
    scene.frame_start=0;scene.frame_end=8;scene.render.fps=25
    sockets=[]
    for clip in ['walk','attack']:
        for obj in animated:obj.animation_data.action=bpy.data.actions[sets[clip][obj.name]]
        for frame in range(8):
            scene.frame_set(frame);bpy.context.view_layer.update()
            p=world_to_camera_view(scene,scene.camera,ART['weapon_points'](unit))
            sockets.append([round(p.x*256,3),round((1-p.y)*256,3)])
    for obj in animated:obj.animation_data.action=bpy.data.actions[sets['walk'][obj.name]]
    scene.frame_set(0);ART['configure_renderer'](48)
    ART['save_scene'](directory/f'unit-{key}.blend')
    after={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    assert before==after,'Production changed during isolated study'
    report={'passed':True,'unit':unit,'faction':faction,'source_hashes':before,'production_unchanged':True,
        'mesh_count':len(mesh_before),'mesh_contracts':mesh_before,'rest_geometry_and_materials_preserved':True,
        'original_bones':bones_before,'original_bones_preserved':True,'bone_count':len(rig.data.bones),
        'actions':sets,'frames':16,'contact_index':12,'contact_ms':160,'walk_ms':520,'attack_ms':320,
        'cycle_distance_world':BASE.CYCLE_DISTANCE,'runtime_speed':config['speed'],'runtime_scale':config['scale'],
        'weapon_grip_rest':config['grip'],'weapon_bone':'weapon.wrist',
        'hand_mesh':'Titan heavy armoured gauntlet' if unit=='super-heavy' else 'Hand',
        'far_hand_mesh':'Titan heavy armoured gauntlet.001' if unit=='super-heavy' else 'Hand.001',
        'far_weapon_grip_rest':config.get('far_grip'),
        'sole_meshes':['Titan broad planted outsole','Titan broad planted outsole.001'] if unit=='super-heavy' else ['Boot sole','Boot sole.001'],
        'all_original_bindings_preserved':unit=='super-heavy',
        'shield_grip_rest':list(SHIELD_REST) if scene['melee_shield_control'] else None,
        'sockets':sockets,'authored_motion_note':config['note'],'key_counts':{k:len(v) for k,v in phase_times.items()}}
    ART['write_json_atomic'](directory/'model-check.json',report)
    ART['write_json_atomic'](directory/'weapon-sockets.json',{unit:sockets})
    ART['write_json_atomic'](directory/'gait-metadata.partial.json',{unit:{
        'nominalSpeedPxPerSecond':config['speed'],'referenceDisplayScale':config['scale'],
        'cycleDistancePixels':config['speed']*.520,'nominalCycleDurationMs':520,'motionKind':'biped',
        'stanceFraction':.60,'doubleSupportFrames':[0,4]}})
    print('MELEE_STUDY_BUILT',key,len(mesh_before),len(rig.data.bones),flush=True)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--unit',choices=list(UNITS)+['both'],default='both')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in UNITS if args.unit=='both' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:build(unit,faction)
if __name__=='__main__':main()
