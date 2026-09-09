"""Reopen the staged future scene, check preservation, and exercise the normal exporter."""
import argparse
import sys
import hashlib
import json
import runpy
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/future-v2'
ART=runpy.run_path(str(Path(__file__).with_name('refine_future.py')),run_name='future_art_library')


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def material_contract(mat):
    record={'name':mat.name,'color':ART['serial'](mat.diffuse_color),'nodes':[],'links':[]}
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            inputs={socket.name:ART['serial'](socket.default_value) for socket in node.inputs if hasattr(socket,'default_value')}
            entry={'name':node.name,'type':node.type,'inputs':inputs}
            if node.type=='VALTORGB':
                entry['ramp']=[(stop.position,ART['serial'](stop.color)) for stop in node.color_ramp.elements]
            record['nodes'].append(entry)
        record['links']=[(link.from_node.name,link.from_socket.name,link.to_node.name,link.to_socket.name) for link in mat.node_tree.links]
    return record


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--canonical',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    output=STAGE/'canonical-export-validation' if args.canonical else STAGE/'reproduction'
    checked_source=ROOT/'art/blender/background-future.blend' if args.canonical else STAGE/'background-future.blend'
    metrics=json.loads((STAGE/'source-check.json').read_text())
    canonical_source=ROOT/'art/blender/background-future.blend'
    canonical_image=ROOT/'public/assets/reborn/backgrounds/future.png'
    baseline_source=STAGE/'baseline/background-future.blend'
    baseline_image=STAGE/'baseline/future.png'
    canonical_before=file_hash(canonical_source)
    public_before=file_hash(canonical_image)
    published=(STAGE/'promotion.json').exists()
    if published:
        publication=json.loads((STAGE/'promotion.json').read_text())
        assert canonical_before==publication['files'][0]['new_sha256']
        assert public_before==publication['files'][1]['new_sha256']
    else:
        assert canonical_before==file_hash(baseline_source),'Canonical source changed during staged review'
        assert public_before==file_hash(baseline_image),'Public image changed during staged review'
    assert not args.canonical or published,'Canonical audit requires verified publication'
    bpy.ops.wm.open_mainfile(filepath=str(baseline_source))
    before={name:ART['fingerprint'](bpy.data.objects[name]) for name in metrics['protected_hashes']}
    assert before==metrics['protected_hashes'],'Baseline object contract changed'
    names={mat.name for name in before for mat in getattr(bpy.data.objects[name].data,'materials',[]) if mat}
    materials_before={name:material_contract(bpy.data.materials[name]) for name in names}
    lights_before={obj.name:(ART['serial'](obj.data.color),obj.data.energy,obj.data.type) for obj in bpy.data.objects if obj.type=='LIGHT'}
    bpy.ops.wm.open_mainfile(filepath=str(checked_source))
    after={name:ART['fingerprint'](bpy.data.objects[name]) for name in before}
    assert before==after,'Protected geometry changed when candidate was reopened'
    materials_after={name:material_contract(bpy.data.materials[name]) for name in names}
    assert materials_before==materials_after,'Existing environment material changed'
    lights_after={obj.name:(ART['serial'](obj.data.color),obj.data.energy,obj.data.type) for obj in bpy.data.objects if obj.type=='LIGHT'}
    assert lights_before==lights_after,'Existing light changed'
    architecture=[obj for obj in bpy.data.objects if obj.name.startswith(ART['PREFIX'])]
    assert len(architecture)==326
    architecture_before={obj.name:ART['fingerprint'](obj) for obj in architecture}
    render_settings=(bpy.context.scene.render.resolution_x,bpy.context.scene.render.resolution_y,bpy.context.scene.render.resolution_percentage)
    assert render_settings==(1600,900,100)
    exporter=ART['LIB']['export_static']
    exporter.__globals__['SOURCE']=checked_source.parent
    exporter.__globals__['OUT']=output
    exporter('backgrounds','future','player',64)
    architecture_after={name:ART['fingerprint'](bpy.data.objects[name]) for name in architecture_before}
    assert architecture_before==architecture_after,'Regular exporter changed the authored architecture'
    after_export={name:ART['fingerprint'](bpy.data.objects[name]) for name in before}
    assert after_export==before,'Regular exporter changed the environment'
    assert file_hash(canonical_source)==canonical_before
    assert file_hash(canonical_image)==public_before
    report={'passed':True,'reopened_protected_objects':len(before),'architecture_objects':len(architecture),
            'preserved_environment_materials':len(names),'preserved_existing_lights':len(lights_before),
            'camera_hash':metrics['camera_hash'],'terrain_hash':metrics['terrain_hash'],
            'exporter_preserves_architecture':True,'public_unchanged':True,'canonical_unchanged':True,
            'canonical_blend_sha256':canonical_before if args.canonical else file_hash(baseline_source),'public_png_sha256':public_before if args.canonical else file_hash(baseline_image),
            'candidate_blend_sha256':file_hash(STAGE/'background-future.blend'),
            'candidate_png_sha256':file_hash(STAGE/'future.png'),
            'regular_export_path':str((output/'backgrounds/future.png').relative_to(STAGE)),'render_samples':64,'audited_published_canonical':args.canonical,'publication_present':published}
    ART['LIB']['write_json_atomic']((output/'source-validation.json') if args.canonical else (STAGE/'reproduction-check.json'),report)
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
