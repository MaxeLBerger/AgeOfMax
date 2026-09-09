"""Validate a completed family through the regular exporter on isolated source copies."""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
import export_scenes as exporter
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--family',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
families=ROOT/'art/blender/candidates/animation-v3'
family=(families/args.family).resolve()
if family.parent!=families.resolve():raise ValueError('Expected one family directory')
stage=families/'exporter-audits'/args.family
source_dir=stage/'sources'
source_dir.mkdir(parents=True,exist_ok=True)
watch={}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
selected=[]
for definition in exporter.UNITS:
    uid=definition['id']
    if not (family/uid/f'unit-{uid}.blend').exists():continue
    selected.append(definition)
    for suffix in ['','-enemy']:
        key=uid+suffix
        original=family/key/f'unit-{key}.blend'
        if not original.exists():raise RuntimeError(f'Missing team source: {key}')
        watch[str(original)]=digest(original)
        target=source_dir/original.name
        shutil.copy2(original,target);watch[str(target)]=digest(target)
if not selected:raise RuntimeError('No complete authored units')
for path in (ROOT/'public/assets/reborn').rglob('*'):
    if path.is_file():watch[str(path)]=digest(path)
exporter.SOURCE=source_dir
exporter.OUT=stage/'unused-output'
gaits={};checks={}
expected_gaits=json.loads((family/'gait-metadata.partial.json').read_text(encoding='utf-8'))
for definition in selected:
    uid=definition['id']
    try:exporter.export_unit(definition,['player','enemy'],48,False,8)
    except RuntimeError as error:assert 'contract mismatch' in str(error)
    else:raise AssertionError('Wrong requested frame count accepted')
    actual=exporter.export_unit(definition,['player','enemy'],48,False,16,gaits)
    expected=json.loads((family/uid/'weapon-sockets.json').read_text(encoding='utf-8'))[uid]
    maximum=max(abs(a-b) for pa,pb in zip(actual,expected) for a,b in zip(pa,pb))
    assert len(actual)==len(expected)==16 and maximum<=.001001,(uid,maximum)
    assert gaits[uid]==expected_gaits[uid],uid
    scene=bpy.context.scene
    original_gait=scene['animation_study_gait']
    del scene['animation_study_gait']
    try:exporter.authored_gait_metadata(scene,definition)
    except RuntimeError as error:assert 'Missing authored gait' in str(error)
    else:raise AssertionError('Missing saved gait accepted')
    scene['animation_study_gait']=original_gait
    bad=json.loads(original_gait);bad['nominalSpeedPxPerSecond']+=1
    scene['animation_study_gait']=json.dumps(bad)
    try:exporter.authored_gait_metadata(scene,definition)
    except RuntimeError as error:assert 'speed/scale' in str(error)
    else:raise AssertionError('Stale nominal gait speed accepted')
    scene['animation_study_gait']=original_gait
    topology_rejected=None
    if scene.get('runtime_weapon_vertex_indices') is not None:
        name=scene['runtime_weapon_mesh'];obj=bpy.data.objects[name]
        expected_count=scene.get('runtime_weapon_evaluated_vertex_count',len(obj.data.vertices))
        present='runtime_weapon_evaluated_vertex_count' in scene
        scene['runtime_weapon_evaluated_vertex_count']=expected_count+1
        try:exporter.weapon_points(uid)
        except RuntimeError as error:
            assert 'topology changed' in str(error);topology_rejected=True
        else:raise AssertionError('Changed muzzle topology accepted')
        if present:scene['runtime_weapon_evaluated_vertex_count']=expected_count
        else:del scene['runtime_weapon_evaluated_vertex_count']
    checks[uid]={'sockets':16,'markerMaxErrorPixels':maximum,'teamGaitsMatch':True,'savedGaitMatchesFamily':True,
                 'wrongFrameCountRejected':True,'missingGaitRejected':True,'staleSpeedRejected':True,
                 'changedMuzzleTopologyRejected':topology_rejected}
assert all(digest(Path(path))==value for path,value in watch.items()),'Source or public mutation'
assert not exporter.OUT.exists(),'Read-only export audit wrote output assets'
report={'passed':True,'scope':'Regular saved-action exporter, both teams, 16 projected markers and measured source gait.',
        'rendered':False,'family':args.family,'units':checks,'gaitMetadataPartial':gaits,
        'originalAndCopiedSourcesUnchanged':True,'publicUnchanged':True,'watchedHashes':watch}
exporter.write_json_atomic(stage/'validation.json',report)
print('ANIMATION_FAMILY_EXPORT_AUDIT',json.dumps({'passed':True,'family':args.family,'units':checks}),flush=True)
