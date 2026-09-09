"""Verify the existing static exporter on an isolated Stone scene copy.

The input scene is read only. Both copied .blend and rendered PNG stay in outdir.
Example: blender -b --python audit_stone_export.py -- --source candidate.blend
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import bpy

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
import export_scenes
import refine_stone


def signature():
    result={}
    for obj in bpy.data.objects:
        if not obj.name.startswith('STN_'):
            continue
        record={'type':obj.type,'matrix':[list(row) for row in obj.matrix_world],
                'hide_render':obj.hide_render,'hide_viewport':obj.hide_viewport,
                'parent':obj.parent.name if obj.parent else None}
        if obj.type=='MESH':
            record['vertices']=[list(vertex.co) for vertex in obj.data.vertices]
            record['faces']=[list(face.vertices) for face in obj.data.polygons]
            record['materials']=[mat.name for mat in obj.data.materials]
        elif obj.type=='CURVE':
            record['bevel']=obj.data.bevel_depth
            record['splines']=[[list(point.co) for point in spline.points] for spline in obj.data.splines]
        result[obj.name]=record
    return hashlib.sha256(json.dumps(result,sort_keys=True).encode()).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--outdir',type=Path,default=ROOT/'art/blender/candidates/stone-v2/export-validation')
    parser.add_argument('--samples',type=int,default=32)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    source=args.source.resolve(); outdir=args.outdir.resolve()
    if not outdir.is_relative_to(ROOT/'art/blender/candidates'):
        raise RuntimeError('Audit outputs must stay inside the isolated candidate tree.')
    original_bytes=source.read_bytes()
    original_hash=hashlib.sha256(original_bytes).hexdigest()
    public=ROOT/'public/assets/reborn/backgrounds/stone.png'
    public_hash=hashlib.sha256(public.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    scene=bpy.context.scene
    if not bpy.data.collections.get('STN_Settlement'):
        raise RuntimeError('The selected scene does not contain the refined architecture.')
    scene['authored_environment_revision']=2
    scene['environment_id']='stone'
    scene['runtime_background']='backgrounds/stone.png'
    scene['authoring_source']='tools/blender/refine_stone.py'
    scene['runtime_layout']='1280x720; combat_y=500; quiet_lane=410..525; HUD_top=82; HUD_bottom=552'
    # The copy uses the exact basename expected by export_static. OUT is isolated.
    copies=outdir/'source'; copies.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(outdir/'exports/backgrounds/stone.png')
    prepared=copies/'background-stone.blend'
    export_scenes.save_scene(prepared)
    bpy.context.view_layer.update()
    geometry_before=signature()
    camera_before=refine_stone.camera_contract()
    terrain_before=refine_stone.terrain_hash()
    copied_source_hash=hashlib.sha256(prepared.read_bytes()).hexdigest()
    export_scenes.SOURCE=copies
    export_scenes.OUT=outdir/'exports'
    export_scenes.export_static('backgrounds','stone','player',args.samples)
    bpy.context.view_layer.update()
    checks={'architecture_geometry_unchanged':geometry_before==signature(),
            'camera_unchanged':camera_before==refine_stone.camera_contract(),
            'terrain_unchanged':terrain_before==refine_stone.terrain_hash(),
            'input_file_unchanged':original_hash==hashlib.sha256(source.read_bytes()).hexdigest(),
            'copied_source_unchanged_by_exporter':copied_source_hash==hashlib.sha256(prepared.read_bytes()).hexdigest(),
            'public_png_unchanged':public_hash==hashlib.sha256(public.read_bytes()).hexdigest(),
            'archive_hidden':bpy.data.collections['STN_SourceArchive'].hide_render,
            'metadata_preserved':bpy.context.scene.get('authored_environment_revision')==2}
    assert all(checks.values()),checks
    report={'status':'passed','input':str(source),'input_sha256':original_hash,
            'input_is_canonical':source==ROOT/'art/blender/background-stone.blend',
            'isolated_source':str(prepared),'exporter':'tools/blender/export_scenes.py::export_static',
            'output':str(outdir/'exports/backgrounds/stone.png'),
            'samples':args.samples,'resolution':[1600,900],'new_geometry_sha256':geometry_before,
            'checks':checks,'opened_objects':len(bpy.data.objects),
            'scene_metadata':{key:bpy.context.scene[key] for key in ['authored_environment_revision',
                              'environment_id','runtime_background','authoring_source','runtime_layout']}}
    export_scenes.write_json_atomic(outdir/'source-validation.json',report)
    print('STONE_EXPORT_VALIDATED '+json.dumps(checks))


if __name__=='__main__':
    main()
