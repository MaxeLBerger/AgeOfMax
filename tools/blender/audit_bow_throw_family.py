"""Audit real bow/string/sling/throw contacts and precise rendered release states."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_bow_throw_family as BUILD
import audit_animation_study as COMMON
STAGE=BUILD.STAGE;ART=BUILD.ART


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=['archer','slinger','grenadier','all'],default='all')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    results={};shared_sockets={};shared_gaits={}
    for unit in list(BUILD.SPEED) if args.unit=='all' else [args.unit]:
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:
            suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key
            model=json.loads((directory/'model-check.json').read_text())
            bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{key}.blend'))
            scene=bpy.context.scene;rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
            actions=json.loads(scene['animation_study_actions']);meshes=[o for o in bpy.data.objects if o.type=='MESH']
            projectiles=[bpy.data.objects[name] for name in json.loads(scene['animation_release_objects'])]
            feet=[bpy.data.objects[name] for name in ['Boot sole','Boot sole.001']]
            def evaluate(clip,time):
                for name,action in actions[clip].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
                scene.frame_set(math.floor(time),subframe=time%1);bpy.context.view_layer.update()
            evaluate('walk',0);start={o.name:COMMON.center(o) for o in meshes}
            evaluate('walk',8);loop=max((COMMON.center(o)-start[o.name]).length for o in meshes)
            evaluate('attack',0);entry=max((COMMON.center(o)-start[o.name]).length for o in meshes)
            evaluate('attack',8);recovery=max((COMMON.center(o)-start[o.name]).length for o in meshes)
            marker_error=socket_error=foot_drift=grip_error=string_error=stance_error=0
            minimum_z=100;feet_start=None;stance_first={};signatures={'walk':set(),'attack':set()};visibility=[]
            right=scene.camera.matrix_world.to_3x3().col[0].copy();right.z=0;right.normalize()
            for clip in ['walk','attack']:
                for index in range(513):
                    time=index/64;t=time/8;evaluate(clip,time)
                    actual=ART['weapon_points'](unit);marker=bpy.data.objects['Weapon muzzle / runtime socket'].matrix_world.translation
                    marker_error=max(marker_error,(actual-marker).length)
                    centers=[COMMON.center(foot) for foot in feet]
                    minimum_z=min(minimum_z,min(v.z for foot in feet for v in COMMON.vertices(foot)))
                    if clip=='attack':
                        if feet_start is None:feet_start=centers
                        foot_drift=max(foot_drift,max((a-b).length for a,b in zip(centers,feet_start)))
                    else:
                        for leg,(point,offset) in enumerate(zip(centers,[0,.5])):
                            p=t+offset
                            if p%1<.6:
                                value=point+right*(model['cycle_distance_world']*t);group=(leg,math.floor(p))
                                if group not in stance_first:stance_first[group]=value
                                stance_error=max(stance_error,(value-stance_first[group]).length)
                    near=COMMON.center(bpy.data.objects['Hand']);far=COMMON.center(bpy.data.objects['Hand.001'])
                    if unit=='archer':
                        grip=rig.pose.bones['weapon.bow'].matrix.translation;nock=rig.pose.bones['weapon.arrow'].matrix.translation
                        grip_error=max(grip_error,(near-grip).length)
                        if clip=='walk' or t<=.46875 or t==1:grip_error=max(grip_error,(far-nock).length)
                        points=COMMON.vertices(bpy.data.objects['Yew longbow'])
                        for side,indices in json.loads(scene['animation_bow_tip_vertices']).items():
                            tip=sum((points[i] for i in indices),Vector())/len(indices);bone=rig.pose.bones['bow.string.'+side]
                            string_error=max(string_error,(bone.head-tip).length,(bone.tail-nock).length)
                    elif unit=='slinger':
                        string_error=max(string_error,(rig.pose.bones['sling.retained'].head-near).length)
                        if clip=='walk' or t<=.46875 or t==1:
                            expected=near+Vector((0,.022,.015))
                            string_error=max(string_error,(rig.pose.bones['sling.release'].head-expected).length)
                    else:
                        bone=rig.pose.bones['weapon.grenade'];rest=rig.data.bones['weapon.grenade']
                        rotation=bone.matrix.to_quaternion()@rest.matrix_local.to_quaternion().inverted()
                        grip_error=max(grip_error,(near-(bone.matrix.translation+rotation@Vector((-.04,.005,-.04)))).length)
                for frame in range(8):
                    evaluate(clip,frame)
                    signatures[clip].add(tuple(round(v,5) for bone in rig.pose.bones for row in bone.matrix for v in row))
                    hidden=all(obj.hide_render for obj in projectiles)
                    expected=clip=='attack' and frame>=4
                    assert hidden==expected,('projectile release visibility',key,clip,frame,hidden)
                    visibility.append({'frame':frame+(8 if clip=='attack' else 0),'projectile_hidden':hidden})
                    p=world_to_camera_view(scene,scene.camera,ART['weapon_points'](unit))
                    coordinate=Vector((p.x*256,(1-p.y)*256));saved=Vector(model['sockets'][frame+(8 if clip=='attack' else 0)])
                    socket_error=max(socket_error,(coordinate-saved).length)
            # Explicitly test immediately before contact and at the exact boundary.
            evaluate('attack',3.999);assert not any(o.hide_render for o in projectiles)
            evaluate('attack',4);assert all(o.hide_render for o in projectiles)
            now={'source':COMMON.digest(BUILD.ROOT/f'art/blender/unit-{key}.blend'),
                 'sheet':COMMON.digest(BUILD.ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'),
                 'sockets':COMMON.digest(BUILD.ROOT/'public/assets/reborn/weapon-sockets.json')}
            record={'passed':False,'bone_count':len(rig.data.bones),'samples_per_clip':513,
                'loop_error_world':loop,'attack_entry_error_world':entry,'recovery_error_world':recovery,
                'attack_foot_drift_world':foot_drift,'advected_stance_drift_world':stance_error,
                'grip_error_world':grip_error,'mechanism_string_endpoint_error_world':string_error,
                'marker_subframe_error_world':marker_error,'socket_projection_error_pixels':socket_error,
                'lowest_sole_vertex_world_z':minimum_z,'unique_walk_poses':len(signatures['walk']),
                'unique_attack_poses':len(signatures['attack']),'visibility':visibility,'production_unchanged':now==model['source_hashes']}
            results[key]=record;ART['write_json_atomic'](STAGE/'source-audit.json',results)
            assert max(loop,entry,recovery)<.0001,('clip seams',key,loop,entry,recovery)
            assert foot_drift<.001 and stance_error<.001,('foot contact',key,foot_drift,stance_error)
            assert grip_error<.003 and string_error<.006,('mechanism binding',key,grip_error,string_error)
            assert marker_error<.006 and socket_error<.001,('marker',key,marker_error,socket_error)
            assert minimum_z>0 and all(len(s)==8 for s in signatures.values()) and now==model['source_hashes']
            record['passed']=True
            if unit in shared_sockets:assert shared_sockets[unit]==model['sockets'] and shared_gaits[unit]==model['gait']
            shared_sockets[unit]=model['sockets'];shared_gaits[unit]=model['gait']
            ART['write_json_atomic'](STAGE/'source-audit.json',results)
            print('BOW_THROW_AUDIT',key,json.dumps({k:v for k,v in record.items() if k!='visibility'}),flush=True)
    ART['write_json_atomic'](STAGE/'weapon-sockets.json',shared_sockets)
    ART['write_json_atomic'](STAGE/'gait-metadata.partial.json',shared_gaits)


if __name__=='__main__':main()
