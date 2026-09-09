"""Independently reopen study sources and check actual evaluated clip seams and sockets."""
import hashlib,json,math,runpy
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3'
ART=runpy.run_path(str(Path(__file__).with_name('export_scenes.py')),run_name='art_library')


def vertices(obj):
    e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=e.to_mesh()
    points=[e.matrix_world@v.co for v in mesh.vertices];e.to_mesh_clear();return points
def center(obj):
    p=vertices(obj);return sum(p,Vector())/len(p)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    results={}
    original=json.loads((STAGE/'original-action-inspection.json').read_text())
    for unit in ['clubman','knight']:
        directory=STAGE/unit;report=json.loads((directory/'geometry-check.json').read_text())
        bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{unit}.blend'))
        scene=bpy.context.scene;actions=json.loads(scene['animation_study_actions'])
        rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
        meshes=[o for o in bpy.data.objects if o.type=='MESH']
        feet=[bpy.data.objects[name] for name in (['Boot sole','Boot sole.001'] if unit=='clubman' else ['Cloven hoof'+(f'.{i:03d}' if i else '') for i in range(4)])]
        def sample(clip,time):
            for name,action in actions[clip].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
            scene.frame_set(math.floor(time),subframe=time%1);bpy.context.view_layer.update()
        sample('walk',0);start={o.name:center(o) for o in meshes}
        sample('walk',8);loop_error=max((center(o)-start[o.name]).length for o in meshes)
        sample('attack',8);recovery_error=max((center(o)-start[o.name]).length for o in meshes)
        assert loop_error<.00001,('loop seam',unit,loop_error)
        assert recovery_error<.00001,('recovery seam',unit,recovery_error)
        socket_error=0;marker_error=0;grip_error=0;shaft_gap=0;attack_feet=[];min_ground=100
        for clip in ['walk','attack']:
            for index in range(129):
                time=index/16;sample(clip,time)
                weapon=ART['weapon_points'](unit)
                marker=bpy.data.objects['Weapon muzzle / runtime socket'].matrix_world.translation
                marker_error=max(marker_error,(weapon-marker).length)
                grip=rig.matrix_world@rig.pose.bones['weapon.wrist'].matrix.translation
                grip_error=max(grip_error,(center(bpy.data.objects['Hand'])-grip).length)
                if clip=='attack':attack_feet.append([center(o) for o in feet])
                min_ground=min(min_ground,min(p.z for foot in feet for p in vertices(foot)))
            for frame in range(8):
                sample(clip,frame)
                shaft=bpy.data.objects['Carved club handle' if unit=='clubman' else 'Long ash spear'].evaluated_get(bpy.context.evaluated_depsgraph_get())
                data=shaft.to_mesh()
                tree=BVHTree.FromPolygons([shaft.matrix_world@v.co for v in data.vertices],[list(p.vertices) for p in data.polygons])
                shaft.to_mesh_clear()
                shaft_gap=max(shaft_gap,min(tree.find_nearest(p)[3] for p in vertices(bpy.data.objects['Hand'])))
                projected=world_to_camera_view(scene,scene.camera,ART['weapon_points'](unit))
                actual=Vector((projected.x*256,(1-projected.y)*256))
                expected=Vector(report['sockets'][frame+(8 if clip=='attack' else 0)])
                socket_error=max(socket_error,(actual-expected).length)
        drift=max((frame[i]-attack_feet[0][i]).length for frame in attack_feet for i in range(len(feet)))
        assert drift<.0001,('attack foot drift',unit,drift)
        assert grip_error<.003,('hand grip',unit,grip_error)
        assert socket_error<.001,('exported socket projection',unit,socket_error)
        assert marker_error<.006,('interpolated weapon marker',unit,marker_error)
        assert shaft_gap<.006,('actual hand/shaft mesh gap',unit,shaft_gap)
        assert min_ground>0,('below ground foot geometry',unit,min_ground)
        old_samples=[entry for entry in original[unit]['samples'] if 5<=entry['time']<=8]
        old_drift=max((Vector(entry['centers'][foot.name])-Vector(old_samples[0]['centers'][foot.name])).length for entry in old_samples for foot in feet)
        now={'source':digest(ROOT/f'art/blender/unit-{unit}.blend'),
             'sheet':digest(ROOT/f'public/assets/reborn/units/{unit}.png'),
             'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
        assert now==report['production_hashes']
        results[unit]={'passed':True,'mesh_count':len(meshes),'bone_count':len(rig.data.bones),
                       'walk_loop_mesh_center_error':loop_error,'attack_to_walk_recovery_mesh_center_error':recovery_error,
                       'original_attack_foot_center_drift':old_drift,'study_attack_foot_center_drift':drift,
                       'subframe_marker_max_error_world':marker_error,'socket_projection_max_error_pixels':socket_error,
                       'hand_to_wrist_max_error_world':grip_error,'actual_hand_to_shaft_max_surface_gap_world':shaft_gap,'lowest_foot_vertex_world_z':min_ground,
                       'production_unchanged':True,'samples_per_clip':129,
                       'note':'Marker subframe error includes interpolation between authored keys. Runtime uses the exact16 projected samples.'}
    ART['write_json_atomic'](STAGE/'source-audit.json',results)
    print(json.dumps(results,indent=2))


if __name__=='__main__':main()
