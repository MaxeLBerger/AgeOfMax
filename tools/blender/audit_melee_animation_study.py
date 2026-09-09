"""Reopen the melee candidates and measure real subframe foot, grip and marker geometry."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_melee_animation_study as BUILD
import audit_animation_study as COMMON

def audit(unit,faction):
    suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=BUILD.STAGE/key
    model=json.loads((directory/'model-check.json').read_text())
    source=directory/f'unit-{key}.blend';sha=COMMON.digest(source)
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    scene=bpy.context.scene;rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    actions=json.loads(scene['animation_study_actions'])
    gait=json.loads(scene['animation_study_gait'])
    assert len(gait)==7 and gait==json.loads((directory/'gait-metadata.partial.json').read_text())[unit]
    meshes=[o for o in bpy.data.objects if o.type=='MESH']
    soles=[bpy.data.objects[name] for name in model['sole_meshes']]
    hand=bpy.data.objects[model['hand_mesh']]
    weapon=[o for o in meshes if model['weapon_bone'] in o.vertex_groups]
    shield=[o for o in meshes if 'shield.grip' in o.vertex_groups]
    def evaluate(clip,time):
        for name,action in actions[clip].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
        scene.frame_set(math.floor(time),subframe=time%1);bpy.context.view_layer.update()
    evaluate('walk',0);start={o.name:COMMON.center(o) for o in meshes}
    evaluate('walk',8);loop=max((COMMON.center(o)-start[o.name]).length for o in meshes)
    evaluate('attack',8);recovery=max((COMMON.center(o)-start[o.name]).length for o in meshes)
    evaluate('attack',0);entry=max((COMMON.center(o)-start[o.name]).length for o in meshes)
    foot_drift=stance_error=grip_error=shield_error=marker_error=socket_error=surface_gap=shield_surface_gap=0
    far_grip_error=vertex_only_gap=0;surface_intersection_samples=[]
    far_hand=bpy.data.objects[model.get('far_hand_mesh','Hand.001')]
    lowest=100;attack_start=None;stance_first={};foot_ground_max=0;ground_reference={}
    right=scene.camera.matrix_world.to_3x3().col[0].copy();right.z=0;right.normalize()
    frames=[]
    for clip in ['walk','attack']:
        for index in range(257):
            time=index/32;t=time/8;evaluate(clip,time)
            feet=[COMMON.center(o) for o in soles]
            lowest=min(lowest,min(v.z for o in soles for v in COMMON.vertices(o)))
            if clip=='attack':
                if attack_start is None:attack_start=feet
                foot_drift=max(foot_drift,max((p-q).length for p,q in zip(feet,attack_start)))
            else:
                for leg,(foot,offset) in enumerate(zip(feet,[0,.5])):
                    phase=t+offset;local=phase%1
                    if local<.60:
                        advected=foot+right*model['cycle_distance_world']*t;group=(leg,math.floor(phase))
                        if group not in stance_first:stance_first[group]=advected
                        stance_error=max(stance_error,(advected-stance_first[group]).length)
                        z=min(v.z for v in COMMON.vertices(soles[leg]))
                        if group not in ground_reference:ground_reference[group]=z
                        foot_ground_max=max(foot_ground_max,abs(z-ground_reference[group]))
            delta=rig.pose.bones[model['weapon_bone']].matrix@rig.data.bones[model['weapon_bone']].matrix_local.inverted()
            grip_error=max(grip_error,(COMMON.center(hand)-rig.matrix_world@delta@Vector(model['weapon_grip_rest'])).length)
            if model.get('far_weapon_grip_rest'):
                far_grip_error=max(far_grip_error,(COMMON.center(far_hand)-rig.matrix_world@delta@Vector(model['far_weapon_grip_rest'])).length)
            if shield:
                transform=rig.pose.bones['shield.grip'].matrix@rig.data.bones['shield.grip'].matrix_local.inverted()
                shield_error=max(shield_error,(COMMON.center(bpy.data.objects['Hand.001'])-rig.matrix_world@transform@Vector(model['shield_grip_rest'])).length)
            actual=BUILD.ART['weapon_points'](unit)
            marker=bpy.data.objects['Weapon muzzle / runtime socket'].matrix_world.translation
            marker_error=max(marker_error,(actual-marker).length)
        for frame in range(8):
            evaluate(clip,frame)
            for objects,hands,is_shield in [(weapon,[hand]+([far_hand] if model.get('far_weapon_grip_rest') else []),False)]+([(shield,[bpy.data.objects['Hand.001']],True)] if shield else []):
                points=[];polygons=[];edges=[]
                for obj in objects:
                    e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=e.to_mesh();offset=len(points)
                    points.extend([e.matrix_world@v.co for v in mesh.vertices])
                    polygons.extend([[offset+i for i in p.vertices] for p in mesh.polygons])
                    edges.extend([(offset+edge.vertices[0],offset+edge.vertices[1]) for edge in mesh.edges]);e.to_mesh_clear()
                tree=BVHTree.FromPolygons(points,polygons)
                distances=[]
                for h in hands:
                    e=h.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=e.to_mesh()
                    hp=[e.matrix_world@v.co for v in mesh.vertices]
                    ht=BVHTree.FromPolygons(hp,[list(p.vertices) for p in mesh.polygons])
                    he=[tuple(edge.vertices) for edge in mesh.edges];e.to_mesh_clear()
                    corner_gap=min(tree.find_nearest(v)[3] for v in hp)
                    vertex_only_gap=max(vertex_only_gap,corner_gap)
                    # A long shaft can intersect the broad palm faces without
                    # touching any glove corner. Test real segments against real
                    # mesh triangles in both directions instead of loosening bounds.
                    crossing=None
                    for vertices,segments,target in [(points,edges,ht),(hp,he,tree)]:
                        for a,b in segments:
                            direction=vertices[b]-vertices[a];length=direction.length
                            if length<1e-8:continue
                            hit=target.ray_cast(vertices[a],direction/length,length)
                            if hit[0] is not None and hit[3]<=length+1e-7:
                                crossing=list(hit[0]);break
                        if crossing is not None:break
                    distance=0 if crossing is not None else min(corner_gap,min(ht.find_nearest(v)[3] for v in points))
                    distances.append(distance)
                    if crossing is not None:surface_intersection_samples.append({'sprite':frame+(8 if clip=='attack' else 0),'hand':h.name,'world':crossing})
                gap=max(distances)
                if is_shield:shield_surface_gap=max(shield_surface_gap,gap)
                else:surface_gap=max(surface_gap,gap)
            point=BUILD.ART['weapon_points'](unit);projected=world_to_camera_view(scene,scene.camera,point)
            expected=Vector(model['sockets'][frame+(8 if clip=='attack' else 0)])
            socket_error=max(socket_error,(Vector((projected.x*256,(1-projected.y)*256))-expected).length)
            frames.append({'sprite':frame+(8 if clip=='attack' else 0),'weapon_world':list(point),'hand_world':list(COMMON.center(hand)),
                           'foot_centers':[list(COMMON.center(o)) for o in soles]})
    motion=[]
    for ratio in [1,.5,0]:
        groups={};drift=0
        for index in range(257):
            seconds=index/256*.520;cycle=seconds/.520*ratio;evaluate('walk',(cycle%1)*8)
            for leg,(sole,offset) in enumerate(zip(soles,[0,.5])):
                phase=cycle+offset
                if phase%1>=.60:continue
                p=world_to_camera_view(scene,scene.camera,COMMON.center(sole))
                x=p.x*256*model['runtime_scale']+model['runtime_speed']*ratio*seconds
                group=(leg,math.floor(phase))
                if group not in groups:groups[group]=x
                drift=max(drift,abs(x-groups[group]))
        motion.append({'actual_speed_fraction':ratio,'samples':257,'max_stance_screen_drift_pixels':drift})
    current={'source':COMMON.digest(BUILD.ROOT/f'art/blender/unit-{key}.blend'),
             'sheet':COMMON.digest(BUILD.ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'),
             'sockets':COMMON.digest(BUILD.ROOT/'public/assets/reborn/weapon-sockets.json')}
    record={'passed':False,'unit':unit,'faction':faction,'source_sha256':sha,'samples_per_clip':257,
        'loop_seam_world':loop,'recovery_seam_world':recovery,'attack_entry_seam_world':entry,
        'attack_foot_drift_world':foot_drift,'advected_stance_drift_world':stance_error,'stance_ground_drift_world':foot_ground_max,
        'gait':gait,'actual_weapon_hand_grip_error_world':grip_error,'actual_far_weapon_hand_grip_error_world':far_grip_error,'actual_weapon_hand_surface_gap_world':surface_gap,
        'vertex_only_surface_gap_world':vertex_only_gap,
        'surface_distance_method':'Bidirectional mesh segment/triangle intersections, otherwise bidirectional nearest vertices',
        'surface_intersections':surface_intersection_samples,
        'actual_shield_hand_grip_error_world':shield_error,'actual_shield_hand_surface_gap_world':shield_surface_gap,
        'lowest_sole_world_z':lowest,'marker_subframe_error_world':marker_error,'socket_projection_error_pixels':socket_error,
        'motion_scenarios':motion,'frames':frames,'production_unchanged':current==model['source_hashes']}
    BUILD.ART['write_json_atomic'](directory/'geometry-audit.json',record)
    assert max(loop,recovery,entry)<.0001,('clip seams',key,loop,recovery,entry)
    assert max(foot_drift,stance_error,foot_ground_max)<.001,('foot contacts',key,foot_drift,stance_error,foot_ground_max)
    assert max(grip_error,shield_error,far_grip_error)<.003,('hand grip',key,grip_error,shield_error)
    assert max(surface_gap,shield_surface_gap)<.025,('actual hand surface',key,surface_gap,shield_surface_gap)
    assert marker_error<.006 and socket_error<.001,('marker',key,marker_error,socket_error)
    assert all(item['max_stance_screen_drift_pixels']<.005 for item in motion),('motion drift',key,motion)
    assert lowest>0 and current==model['source_hashes']
    record['passed']=True;BUILD.ART['write_json_atomic'](directory/'geometry-audit.json',record)
    print('MELEE_GEOMETRY_PASSED',key,json.dumps({k:v for k,v in record.items() if k not in ['frames','surface_intersections']}),flush=True)
    return record,model['sockets']

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--unit',choices=list(BUILD.UNITS)+['both'],default='both')
    parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    results=json.loads((BUILD.STAGE/'source-audit.json').read_text()) if args.unit!='both' and (BUILD.STAGE/'source-audit.json').exists() else {}
    shared={}
    for unit in BUILD.UNITS if args.unit=='both' else [args.unit]:
        sockets=[]
        for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:
            key=unit+('-enemy' if faction=='enemy' else '')
            results[key],points=audit(unit,faction);sockets.append(points)
            BUILD.ART['write_json_atomic'](BUILD.STAGE/'source-audit.json',results)
        if len(sockets)==2:assert sockets[0]==sockets[1],('Team sockets differ',unit)
        shared[unit]=sockets[0]
    for candidate in BUILD.UNITS:
        if all(candidate+suffix in results and results[candidate+suffix]['passed'] for suffix in ['', '-enemy']):
            shared[candidate]=json.loads((BUILD.STAGE/candidate/'model-check.json').read_text())['sockets']
    BUILD.ART['write_json_atomic'](BUILD.STAGE/'weapon-sockets.json',shared)
if __name__=='__main__':main()
