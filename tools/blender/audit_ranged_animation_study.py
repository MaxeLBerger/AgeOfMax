"""Reopen staged ranged sources and audit evaluated bindings, motion, and markers."""
import hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_ranged_animation_study as BUILD
import audit_animation_study as COMMON
ROOT=BUILD.ROOT
STAGE=BUILD.STAGE


def main():
    results={};team_sockets={}
    for unit in ['rifleman','sniper']:
        for faction in ['player','enemy']:
            suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key
            model=json.loads((directory/'model-check.json').read_text())
            bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{key}.blend'))
            scene=bpy.context.scene;actions=json.loads(scene['animation_study_actions'])
            rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
            meshes=[o for o in bpy.data.objects if o.type=='MESH']
            soles=[bpy.data.objects[n] for n in ['Boot sole','Boot sole.001']]
            hands=[bpy.data.objects[n] for n in ['Hand','Hand.001']]
            weapon_meshes=[o for o in meshes if 'weapon.rifle' in o.vertex_groups]
            assert weapon_meshes
            def evaluate(clip,time):
                for name,action in actions[clip].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
                scene.frame_set(math.floor(time),subframe=time%1);bpy.context.view_layer.update()
            evaluate('walk',0);start={o.name:COMMON.center(o) for o in meshes}
            evaluate('walk',8);loop=max((COMMON.center(o)-start[o.name]).length for o in meshes)
            evaluate('attack',8);recovery=max((COMMON.center(o)-start[o.name]).length for o in meshes)
            foot_drift=grip_error=socket_error=marker_error=stance_error=surface_gap=aim_error=0
            attack_start=None;lowest=100;stance_first={};right=scene.camera.matrix_world.to_3x3().col[0].copy();right.z=0;right.normalize()
            for clip in ['walk','attack']:
                for index in range(129):
                    time=index/16;t=time/8;evaluate(clip,time)
                    feet=[COMMON.center(o) for o in soles]
                    lowest=min(lowest,min(v.z for o in soles for v in COMMON.vertices(o)))
                    if clip=='attack':
                        if attack_start is None:attack_start=feet
                        foot_drift=max(foot_drift,max((p-q).length for p,q in zip(feet,attack_start)))
                    else:
                        for leg,(foot,offset) in enumerate(zip(feet,[0,.5])):
                            phase=t+offset;cycle=math.floor(phase);local=phase-cycle
                            if local<.60:
                                advected=foot+right*(model['cycle_distance_world']*t)
                                group=(leg,cycle)
                                if group not in stance_first:stance_first[group]=advected
                                stance_error=max(stance_error,(advected-stance_first[group]).length)
                    delta=rig.pose.bones['weapon.rifle'].matrix@rig.data.bones['weapon.rifle'].matrix_local.inverted()
                    for hand,grip in zip(hands,model['grips_in_weapon_rest']):
                        grip_error=max(grip_error,(COMMON.center(hand)-rig.matrix_world@delta@Vector(grip)).length)
                    point=BUILD.ART['weapon_points'](unit)
                    marker=bpy.data.objects['Weapon muzzle / runtime socket'].matrix_world.translation
                    marker_error=max(marker_error,(point-marker).length)
                for frame in range(8):
                    evaluate(clip,frame)
                    vertices=[];polygons=[]
                    for obj in weapon_meshes:
                        e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=e.to_mesh();offset=len(vertices)
                        vertices.extend([e.matrix_world@v.co for v in mesh.vertices])
                        polygons.extend([[offset+i for i in p.vertices] for p in mesh.polygons]);e.to_mesh_clear()
                    tree=BVHTree.FromPolygons(vertices,polygons)
                    for hand in hands:surface_gap=max(surface_gap,min(tree.find_nearest(v)[3] for v in COMMON.vertices(hand)))
                    if clip=='attack' and frame in [2,3,4,5]:
                        delta=rig.pose.bones['weapon.rifle'].matrix@rig.data.bones['weapon.rifle'].matrix_local.inverted()
                        sight_rest=Vector((.26,-.25,2.14) if unit=='sniper' else (.22,-.35,1.47))
                        aim_error=max(aim_error,(COMMON.center(bpy.data.objects['Eye glint'])-rig.matrix_world@delta@sight_rest).length)
                    p=world_to_camera_view(scene,scene.camera,BUILD.ART['weapon_points'](unit))
                    projected=Vector((p.x*256,(1-p.y)*256));expected=Vector(model['sockets'][frame+(8 if clip=='attack' else 0)])
                    socket_error=max(socket_error,(projected-expected).length)
            current={'source':COMMON.digest(ROOT/f'art/blender/unit-{key}.blend'),
                     'sheet':COMMON.digest(ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'),
                     'sockets':COMMON.digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
            record={'passed':False,'samples_per_clip':129,'mesh_count':len(meshes),'bone_count':len(rig.data.bones),
                    'loop_seam_world':loop,'recovery_seam_world':recovery,'attack_foot_drift_world':foot_drift,
                    'advected_stance_drift_world':stance_error,'both_hand_grip_max_error_world':grip_error,
                    'actual_hand_weapon_max_surface_gap_world':surface_gap,'lowest_sole_vertex_world_z':lowest,
                    'marker_subframe_max_error_world':marker_error,'socket_projection_max_error_pixels':socket_error,
                    'eye_to_sight_axis_target_max_error_world':aim_error,'production_unchanged':current==model['source_hashes']}
            results[key]=record
            # Always write measurements before a failed assertion for precise diagnosis.
            BUILD.ART['write_json_atomic'](STAGE/'source-audit.json',results)
            assert loop<.0001 and recovery<.0001,('clip seam',key,loop,recovery)
            assert foot_drift<.001 and stance_error<.001,('foot contact',key,foot_drift,stance_error)
            assert aim_error<.001,('eye sight alignment',key,aim_error)
            assert grip_error<.003,('both hand centers',key,grip_error)
            assert surface_gap<.02,('actual hand weapon contact',key,surface_gap)
            assert marker_error<.006 and socket_error<.001,('weapon marker',key,marker_error,socket_error)
            assert lowest>0 and current==model['source_hashes']
            record['passed']=True;team_sockets[key]=model['sockets']
            BUILD.ART['write_json_atomic'](STAGE/'source-audit.json',results)
            print('RANGED_SOURCE_AUDIT',key,json.dumps(record),flush=True)
    shared={}
    for unit in ['rifleman','sniper']:
        assert team_sockets[unit]==team_sockets[unit+'-enemy'],('faction socket mismatch',unit)
        shared[unit]=team_sockets[unit]
    BUILD.ART['write_json_atomic'](STAGE/'weapon-sockets.json',shared)
    BUILD.ART['write_json_atomic'](STAGE/'source-audit.json',results)


if __name__=='__main__':main()
