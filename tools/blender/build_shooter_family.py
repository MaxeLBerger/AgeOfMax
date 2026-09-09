"""Author the isolated second shoulder-weapon batch with anatomy-specific grips.

The measured rifle controls and clip writer are reused; source geometry is kept.
Musket, laser and plasma get distinct shoulder height, brace and recoil curves.
"""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_ranged_animation_study as RANGED
BASE=RANGED.BASE;ART=RANGED.ART;ROOT=RANGED.ROOT
STAGE=ROOT/'art/blender/candidates/animation-v3/ranged-family-2'
UNITS={
    'musketeer':{'speed':40,'grips':[(.45,-.35,1.15),(.60,-.35,1.245)],'height':.22,'origin_x':-.10,
        'lean':.09,'brace':.075,'walk_pitch':-.23,'kick':[0,0,0,0,.018,.095,.05,-.10,-.23],
        'recoil':[0,0,0,0,.04,.08,.044,.012,0],'note':'Long musket held under the fore-end; pronounced physical follow-through.'},
    'laser-soldier':{'speed':48,'grips':[(.45,-.35,1.15),(.56,-.35,1.23)],'height':.20,'origin_x':-.085,
        'lean':.065,'brace':.022,'walk_pitch':-.18,'kick':[0,0,0,0,0,.012,.008,-.07,-.18],
        'recoil':[0,0,0,0,.004,.012,.006,.002,0],'note':'Steady beam platform with minimal weapon recoil; all three luminous rails remain attached.'},
    'plasma-trooper':{'speed':42,'grips':[(.45,-.35,1.15),(.58,-.35,1.235)],'height':.20,'origin_x':-.10,
        'lean':.105,'brace':.08,'walk_pitch':-.21,'kick':[0,0,0,0,.015,.058,.035,-.09,-.21],
        'recoil':[0,0,0,0,.024,.065,.036,.009,0],'note':'Braced pulsed discharge; actual chamber and acceleration coils remain on the weapon, reservoirs on the torso.'},
}
ORIGINAL_PREPARE=RANGED.prepare


def prepare(unit):
    # All three inspected originals share the exact rifle rest rig and boot/hand
    # geometry. Only missing controls are added; every mesh contract is preserved.
    RANGED.SPEED['rifleman']=UNITS[unit]['speed']
    ORIGINAL_PREPARE('rifleman')
    for obj in bpy.data.objects:
        if obj.type=='MESH' and obj.name.startswith(('Rifle energised coil','Plasma acceleration coil','Plasma containment chamber')):
            ART['set_group'](obj,BASE.RIG,'weapon.rifle')
    if unit=='plasma-trooper':
        # Fix the actual front-face vertices in rest geometry. Selecting current
        # extreme-X vertices after each rotation changes the anchor discontinuously.
        mesh=bpy.data.objects['Plasma acceleration coil.002']
        points=[mesh.matrix_world@v.co for v in mesh.data.vertices]
        maximum=max(v.x for v in points);minimum=min(v.x for v in points)
        indices=[i for i,v in enumerate(points) if v.x>=maximum-max(.008,(maximum-minimum)*.025)]
        assert len(indices)>=3 and len(indices)<len(points)
        scene=bpy.context.scene;scene['runtime_weapon_mesh']=mesh.name
        scene['runtime_weapon_vertex_indices']=indices


def pose(unit,clip,t,source_pose):
    config=UNITS[unit];rig=BASE.RIG
    for name,matrix in source_pose.items():rig.pose.bones[name].matrix_basis=matrix
    bpy.context.view_layer.update()
    wave=math.sin(math.pi*t)**2 if clip=='attack' else 0
    hip_z=-.07-.022*wave if clip=='attack' else -.082+.012*math.cos(math.tau*t*2)
    BASE.set_pose('root',rig.data.bones['root'].head_local+Vector((-.025+.018*wave,0,hip_z)))
    lean=config['lean']+config['brace']*wave if clip=='attack' else config['lean']+.015*math.sin(math.tau*t)
    root=rig.pose.bones['root']
    BASE.set_pose('spine',root.matrix@root.bone.matrix_local.inverted()@rig.data.bones['spine'].head_local,Quaternion((0,1,0),lean))
    spine=rig.pose.bones['spine']
    head=spine.matrix@spine.bone.matrix_local.inverted()@rig.data.bones['head'].head_local
    BASE.set_pose('head',head,Quaternion((0,1,0),.04+.10*wave))
    for side,offset in [('near',0),('far',.5)]:
        target,_=BASE.step(t if clip=='walk' else 0,offset,rig.data.bones['shin.'+side].tail_local.copy(),'clubman')
        BASE.solve_leg('thigh.'+side,'shin.'+side,target,(1,0,0));BASE.set_pose('foot.'+side,target)
    if clip=='walk':pitch=config['walk_pitch']+.018*math.sin(math.tau*t);recoil=0
    else:
        # Early samples lift the long weapon into the sightline. The contact is
        # index12 /160ms; recoil differs by mechanism rather than color alone.
        pitches=list(config['kick']);pitches[0]=config['walk_pitch']*.35;pitches[1]=-.035
        pitch=RANGED.sample(pitches,t);recoil=RANGED.sample(config['recoil'],t)
    shoulder=spine.matrix@spine.bone.matrix_local.inverted()@Vector((0,-.23,1.79))
    origin=shoulder+Vector((config['origin_x']-recoil,0,config['height']))
    rest=rig.data.bones['weapon.rifle'];direction=Vector((math.cos(pitch),0,math.sin(pitch)))
    rotation=(rest.tail_local-rest.head_local).rotation_difference(direction)
    BASE.set_pose('weapon.rifle',origin,rotation)
    delta=rig.pose.bones['weapon.rifle'].matrix@rest.matrix_local.inverted()
    for side,grip in zip(['near','far'],config['grips']):
        desired=delta@Vector(grip)
        hand_rest=Vector((.34,-.345 if side=='near' else .345,1.15))
        target=desired-rotation@(hand_rest-rig.data.bones['hand.'+side].head_local)
        BASE.solve_leg('arm.'+side,'forearm.'+side,target,(0,0,-1));BASE.set_pose('hand.'+side,target,rotation)
    if clip=='attack':
        # These three actual source weapons have no optical scope. Aim along the
        # physical barrel/receiver crown, not the previous scoped-rifle height.
        weight=RANGED.sample([.35,.75,1,1,1,1,.6,.25,0],t)
        head=rig.pose.bones['head'].matrix.copy();eye_rest=Vector((.19,-.128,2.188))
        desired=delta@Vector((.22,-.35,1.37))
        actual=head@rig.data.bones['head'].matrix_local.inverted()@eye_rest
        head.translation+=(desired-actual)*weight;rig.pose.bones['head'].matrix=head
    bpy.context.view_layer.update()
    bpy.data.objects['Weapon muzzle / runtime socket'].location=ART['weapon_points'](unit)


def build(unit,faction):
    RANGED.STAGE=STAGE;RANGED.SPEED={uid:data['speed'] for uid,data in UNITS.items()}
    RANGED.GRIPS={uid:data['grips'] for uid,data in UNITS.items()};RANGED.prepare=prepare;RANGED.pose=pose
    RANGED.build(unit,faction)
    suffix='-enemy' if faction=='enemy' else '';directory=STAGE/(unit+suffix)
    scene=bpy.context.scene;scene['animation_study_family']='shoulder weapons batch2: musket / laser / plasma'
    scene['animation_study_aim_rest']=json.dumps([.22,-.35,1.37])
    ART['save_scene'](directory/f'unit-{unit}{suffix}.blend')
    report=json.loads((directory/'model-check.json').read_text())
    report.pop('sniper_v2_bindings_preserved',None)
    report['stance_note']='Two planted firing feet; weapon-specific brace, shoulder height and recoil.'
    report['mechanism_note']=UNITS[unit]['note'];report['aim_rest']=[.22,-.35,1.37]
    report['recoil_samples_world']=UNITS[unit]['recoil']
    ART['write_json_atomic'](directory/'model-check.json',report)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=list(UNITS)+['all'],default='all')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for unit in list(UNITS) if args.unit=='all' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:build(unit,faction)


if __name__=='__main__':main()
