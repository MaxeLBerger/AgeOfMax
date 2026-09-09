"""Author only the four rifleman/sniper player/enemy 16-frame study sources.

Existing Sniper-v2 geometry and bindings are preserved. Rifleman receives five
missing hand/foot/weapon controls, with unchanged mesh geometry and materials.
Both hands are solved against fixed points on the actual weapon transform.
"""
import argparse,hashlib,json,math,shutil,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_animation_study as BASE

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/ranged-family'
ART=BASE.ART
SPEED={'rifleman':44,'sniper':36}
GRIPS={'rifleman':[(.45,-.35,1.15),(.56,-.35,1.23)],'sniper':[(.29,-.25,1.72),(.48,-.25,1.79)]}


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def sample(values,t):
    index=min(len(values)-2,int(t*(len(values)-1)))
    u=BASE.smooth(t*(len(values)-1)-index)
    return values[index]*(1-u)+values[index+1]*u


def mesh_contract(obj,bindings=False):
    record={'name':obj.name,'vertices':[list(v.co) for v in obj.data.vertices],
            'polygons':[(list(p.vertices),p.material_index) for p in obj.data.polygons],
            'matrix':[list(row) for row in obj.matrix_world],
            'materials':[mat.name for mat in obj.data.materials],
            'parent':obj.parent.name if obj.parent else None}
    if bindings:
        record['groups']=list(obj.vertex_groups.keys())
        record['weights']=[[(g.group,g.weight) for g in v.groups] for v in obj.data.vertices]
    return hashlib.sha256(json.dumps(record,sort_keys=True).encode()).hexdigest()


def prepare(unit):
    rig=BASE.RIG
    bpy.context.scene.frame_set(1)
    rig.animation_data_clear()
    for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    if unit=='rifleman':
        for side in ['near','far']:
            ankle=rig.data.bones['shin.'+side].tail_local.copy()
            BASE.bone('foot.'+side,ankle,ankle+Vector((.25,0,0)),'shin.'+side)
            hand=rig.data.bones['forearm.'+side].tail_local.copy()
            BASE.bone('hand.'+side,hand,hand+Vector((.15,0,0)),'forearm.'+side)
        BASE.bone('weapon.rifle',(0,-.35,1.32),(1.12,-.35,1.32),'root')
        for obj in bpy.data.objects:
            if obj.type!='MESH':continue
            group=None
            if obj.name.startswith(('Leather boot','Boot sole')):group='foot.far' if obj.name.endswith('.001') else 'foot.near'
            if obj.name in ['Hand','Fingers','Fingers.001','Fingers.002']:group='hand.near'
            if obj.name in ['Hand.001','Fingers.003','Fingers.004','Fingers.005']:group='hand.far'
            if obj.name.startswith(('Receiver','Rifle barrel','Magazine','Shaped rifle stock','Trigger grip','Optical sight')):group='weapon.rifle'
            if group:ART['set_group'](obj,rig,group)
    else:
        assert bpy.context.scene['authored_character_revision']==2
        assert bpy.context.scene['runtime_weapon_mesh']=='Sniper muzzle brake'
        assert len(rig.data.bones)==16
        assert all(name in rig.data.bones for name in ['foot.near','foot.far','hand.near','hand.far','weapon.rifle'])
    bpy.data.objects['Weapon muzzle / runtime socket'].animation_data_clear()
    camera=bpy.context.scene.camera
    BASE.RIGHT=camera.matrix_world.to_3x3().col[0].copy();BASE.RIGHT.z=0;BASE.RIGHT.normalize()
    p=world_to_camera_view(bpy.context.scene,camera,BASE.RIGHT)-world_to_camera_view(bpy.context.scene,camera,Vector())
    BASE.CYCLE_DISTANCE=SPEED[unit]*.520/(p.x*256*.43)


def pose(unit,clip,t,source_pose):
    rig=BASE.RIG
    for name,matrix in source_pose.items():rig.pose.bones[name].matrix_basis=matrix
    bpy.context.view_layer.update()
    if unit=='sniper':
        # Preserve the authored v2 torso/head/cape pose. Only the walk hip receives
        # a small grounding correction; blend that same correction into recovery.
        root=rig.pose.bones['root'].matrix.copy()
        drop=.04 if clip=='walk' else .04*BASE.smooth(max(0,(t-.75)/.25))
        root.translation.z-=drop;rig.pose.bones['root'].matrix=root
        bpy.context.view_layer.update()
    else:
        wave=math.sin(math.pi*t)**2 if clip=='attack' else 0
        hip_z=-.070-.016*wave if clip=='attack' else -.082+.012*math.cos(math.tau*t*2)
        BASE.set_pose('root',rig.data.bones['root'].head_local+Vector((-.025+.018*wave,0,hip_z)))
        lean=.07+.05*wave if clip=='attack' else .07+.015*math.sin(math.tau*t)
        BASE.set_pose('spine',rig.pose.bones['root'].matrix@rig.data.bones['root'].matrix_local.inverted()@rig.data.bones['spine'].head_local,Quaternion((0,1,0),lean))
        spine=rig.pose.bones['spine']
        head=spine.matrix@spine.bone.matrix_local.inverted()@rig.data.bones['head'].head_local
        BASE.set_pose('head',head,Quaternion((0,1,0),.04+.10*wave))
    # The firing stance uses the same two planted targets as walk phase zero.
    # Sniper retains its deep authored crouch while the narrower foot placement
    # allows an exact recovery seam without a hidden sliding step.
    for side,offset in [('near',0),('far',.5)]:
        ankle=rig.data.bones['shin.'+side].tail_local.copy()
        target,_=BASE.step(t if clip=='walk' else 0,offset,ankle,'clubman')
        BASE.solve_leg('thigh.'+side,'shin.'+side,target,(1,0,0))
        BASE.set_pose('foot.'+side,target)
    spine=rig.pose.bones['spine']
    if unit=='sniper':
        shoulder=spine.matrix@spine.bone.matrix_local.inverted()@Vector((0,-.25,1.79))
        if clip=='walk':pitch=-.22+.025*math.sin(math.tau*t);recoil=0
        else:
            pitch=sample([-.075,-.030,0,0,.012,.018,-.02,-.10,-.22],t)
            recoil=sample([0,0,0,0,.045,.065,.040,.013,0],t)
        origin=shoulder+Vector((-.03-recoil,0,.055))
    else:
        shoulder=spine.matrix@spine.bone.matrix_local.inverted()@Vector((0,-.23,1.79))
        if clip=='walk':pitch=-.20+.018*math.sin(math.tau*t);recoil=0
        else:
            pitch=sample([-.07,-.035,0,0,.008,.022,.010,-.08,-.20],t)
            recoil=sample([0,0,0,0,.028,.052,.025,.007,0],t)
        origin=shoulder+Vector((-.08-recoil,0,.16))
    rest=rig.data.bones['weapon.rifle']
    direction=Vector((math.cos(pitch),0,math.sin(pitch)))
    rotation=(rest.tail_local-rest.head_local).rotation_difference(direction)
    BASE.set_pose('weapon.rifle',origin,rotation)
    delta=rig.pose.bones['weapon.rifle'].matrix@rest.matrix_local.inverted()
    for side,grip in zip(['near','far'],GRIPS[unit]):
        desired=delta@Vector(grip)
        # Correct the hand mesh's0.01-unit offset from its bone head explicitly.
        hand_rest=Vector((.34,-.345 if side=='near' else .345,1.15))
        hand_bone=rig.data.bones['hand.'+side]
        target=desired-rotation@(hand_rest-hand_bone.head_local)
        BASE.solve_leg('arm.'+side,'forearm.'+side,target,(0,0,-1))
        BASE.set_pose('hand.'+side,target,rotation)
    if clip=='attack':
        # Place the whole head, including hood/face meshes, onto the actual sight
        # axis. Eye relief is0.105 world units behind the Sniper eyepiece center.
        weight=sample([.35,.75,1,1,1,1,.6,.25,0],t)
        head=rig.pose.bones['head'].matrix.copy()
        eye_rest=Vector((.19,-.128,2.188))
        sight_rest=Vector((.26,-.25,2.14) if unit=='sniper' else (.22,-.35,1.47))
        desired_eye=delta@sight_rest
        actual_eye=head@rig.data.bones['head'].matrix_local.inverted()@eye_rest
        head.translation+=(desired_eye-actual_eye)*weight
        rig.pose.bones['head'].matrix=head
    bpy.context.view_layer.update()
    bpy.data.objects['Weapon muzzle / runtime socket'].location=ART['weapon_points'](unit)


def build(unit,faction):
    suffix='-enemy' if faction=='enemy' else ''
    directory=STAGE/(unit+suffix);baseline=directory/'baseline';baseline.mkdir(parents=True,exist_ok=True)
    source=ROOT/f'art/blender/unit-{unit}{suffix}.blend'
    sheet=ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'
    for path in [source,sheet]:
        target=baseline/path.name
        if not target.exists():shutil.copy2(path,target)
    before={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    bpy.ops.wm.open_mainfile(filepath=str(baseline/source.name))
    scene=bpy.context.scene;BASE.RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    rig=BASE.RIG
    mesh_before={o.name:mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'}
    binding_before={o.name:mesh_contract(o,True) for o in bpy.data.objects if o.type=='MESH'}
    bone_before={b.name:[list(b.head_local),list(b.tail_local),b.parent.name if b.parent else None] for b in rig.data.bones}
    phase_times={clip:sorted(set([i/64 for i in range(65)]+([.1,.6] if clip=='walk' else []))) for clip in ['walk','attack']}
    poses={clip:{phase:BASE.sample_source(clip,phase) for phase in phase_times[clip]} for clip in ['walk','attack']}
    if rig.animation_data and rig.animation_data.action:rig.animation_data.action.use_fake_user=True
    prepare(unit)
    animated=[rig,bpy.data.objects['Weapon muzzle / runtime socket']]
    sets={}
    for clip in ['walk','attack']:
        BASE.PREVIOUS={};sets[clip]={}
        for obj in animated:
            obj.animation_data_clear();obj.animation_data_create()
            action=bpy.data.actions.new(f'Study {unit}{suffix} / {clip} / {obj.name}')
            action.use_fake_user=True;obj.animation_data.action=action;sets[clip][obj.name]=action.name
        for phase in phase_times[clip]:
            pose(unit,clip,phase,poses[clip][phase])
            for obj in animated:BASE.store_keys(obj,phase*8)
        for obj in animated:
            for curve in obj.animation_data.action.fcurves:
                for key in curve.keyframe_points:key.interpolation='LINEAR'
    mesh_after={o.name:mesh_contract(o) for o in bpy.data.objects if o.type=='MESH'}
    assert mesh_before==mesh_after,'Rest mesh geometry or material assignment changed'
    if unit=='sniper':
        assert binding_before=={o.name:mesh_contract(o,True) for o in bpy.data.objects if o.type=='MESH'},'Sniper-v2 binding changed'
        assert bone_before=={b.name:[list(b.head_local),list(b.tail_local),b.parent.name if b.parent else None] for b in rig.data.bones},'Sniper-v2 bone geometry changed'
    gait={'nominalSpeedPxPerSecond':SPEED[unit],'referenceDisplayScale':.43,'cycleDistancePixels':round(SPEED[unit]*.520,5),
          'nominalCycleDurationMs':520,'motionKind':'biped','stanceFraction':.6,'doubleSupportFrames':[0,4]}
    scene['animation_study_gait']=json.dumps(gait)
    scene['animation_study_revision']=3
    scene['animation_study_actions']=json.dumps(sets)
    scene['animation_study_contract']='walk8x65ms=520ms; attack8x40ms=320ms; contact sprite12 at160ms; clip frame8 is closure'
    scene['animation_study_family']='rifleman/sniper shoulder weapons; both grips solved from weapon transform'
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
    ART['save_scene'](directory/f'unit-{unit}{suffix}.blend')
    after={'source':digest(source),'sheet':digest(sheet),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
    assert before==after
    report={'passed':True,'unit':unit,'faction':faction,'source_hashes':before,'production_unchanged':True,
            'mesh_count':len(mesh_before),'mesh_contracts':mesh_before,'rest_geometry_and_materials_preserved':True,
            'sniper_v2_bindings_preserved':unit=='sniper','bone_count':len(rig.data.bones),'original_bones':bone_before,
            'actions':sets,'frames':16,'contact_index':12,'contact_ms':160,'walk_ms':520,'attack_ms':320,
            'cycle_distance_world':BASE.CYCLE_DISTANCE,'runtime_speed':SPEED[unit],'runtime_scale':.43,
            'grips_in_weapon_rest':GRIPS[unit],'sockets':sockets,
            'stance_note':'Firing feet use walk-phase0 targets; Sniper keeps authored v2 torso/head/crouch with narrower foot spacing for a continuous recovery seam.'}
    report['gait']=gait
    ART['write_json_atomic'](directory/'gait-metadata.partial.json',{unit:gait})
    partial_path=STAGE/'gait-metadata.partial.json'
    partial=json.loads(partial_path.read_text()) if partial_path.exists() else {}
    partial[unit]=gait;ART['write_json_atomic'](partial_path,partial)
    ART['write_json_atomic'](directory/'model-check.json',report)
    ART['write_json_atomic'](directory/'weapon-sockets.json',{unit:sockets})
    print('RANGED_STUDY_BUILT',unit,faction,'meshes',len(mesh_before),'bones',len(rig.data.bones),flush=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=['rifleman','sniper','both'],default='both')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in SPEED if args.unit=='both' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:build(unit,faction)


if __name__=='__main__':main()
