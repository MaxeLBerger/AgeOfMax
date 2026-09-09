"""Add the agreed seven gait fields without changing staged geometry or actions."""
import hashlib,json,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_melee_animation_study as BUILD

def state():
    scene=bpy.context.scene
    return {
      'meshes':{o.name:BUILD.COMMON.mesh_contract(o,bindings=True) for o in bpy.data.objects if o.type=='MESH'},
      'bones':BUILD.bone_record(next(o for o in bpy.data.objects if o.type=='ARMATURE')),
      'camera':[list(row) for row in scene.camera.matrix_world],
      'actions':{a.name:[(f.data_path,f.array_index,[(list(k.co),k.interpolation) for k in f.keyframe_points]) for f in a.fcurves] for a in bpy.data.actions},
      'render':[scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage],
    }
report={}
for unit in ['clubman','swordsman']:
    for suffix in ['', '-enemy']:
        key=unit+suffix;directory=BUILD.STAGE/key;source=directory/f'unit-{key}.blend'
        bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
        before=state();old=BUILD.digest(source)
        gait=json.loads((directory/'gait-metadata.partial.json').read_text())[unit]
        assert len(gait)==7
        bpy.context.scene['animation_study_gait']=json.dumps(gait)
        assert state()==before
        BUILD.ART['save_scene'](source)
        bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
        assert state()==before and json.loads(bpy.context.scene['animation_study_gait'])==gait
        report[key]={'passed':True,'before_sha256':old,'after_sha256':BUILD.digest(source),'geometry_bindings_bones_camera_actions_preserved':True,'gait':gait}
BUILD.ART['write_json_atomic'](BUILD.STAGE/'gait-metadata-preservation.json',report)
print('MELEE_GAIT_METADATA_PRESERVED',list(report),flush=True)