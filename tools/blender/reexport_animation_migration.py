"""Re-export the entire approved animation set through the regular saved-scene pipeline."""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
import export_scenes as exporter
from animation_contract import validate_gait_document
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--preflight-only',action='store_true')
parser.add_argument('--samples',type=int,default=48)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
base=ROOT/'art/blender/candidates/animation-v3'
approval=json.loads((base/'accepted-families.json').read_text(encoding='utf-8'))
ids=[uid for family in approval['families'] for uid in family['units']]
required={unit['id'] for unit in exporter.UNITS}
if len(ids)!=20 or set(ids)!=required:
    raise RuntimeError('Full re-export requires all twenty approved unit types; missing: '+', '.join(sorted(required-set(ids))))
stage=base/'complete-reexport'
source_dir=stage/'sources'
source_dir.mkdir(parents=True,exist_ok=True)
watch={};references={};expected_gaits={}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
for family in approval['families']:
    directory=base/family['name']
    partial=json.loads((directory/'gait-metadata.partial.json').read_text(encoding='utf-8'))
    for uid in family['units']:
        expected_gaits[uid]=partial[uid]
        for suffix in ['','-enemy']:
            key=uid+suffix
            original=directory/key/f'unit-{key}.blend'
            relative=original.relative_to(ROOT).as_posix()
            expected=family['sources'][relative]
            assert digest(original)==expected,f'Approved source changed: {key}'
            watch[str(original)]=expected
            target=source_dir/original.name
            shutil.copy2(original,target);watch[str(target)]=digest(target)
            reference=directory/key/f'{key}-16.png'
            references[key]={'file':str(reference),'sha256':digest(reference)}
for protected in [ROOT/'public/assets/reborn',ROOT/'art/blender']:
    for path in protected.glob('*' if protected.name=='blender' else '**/*'):
        if path.is_file():watch[str(path)]=digest(path)
exporter.SOURCE=source_dir
exporter.OUT=stage/'exports'
gaits={};sockets={}
# Every saved pair is checked before any GPU render starts.
for definition in exporter.UNITS:
    uid=definition['id']
    sockets[uid]=exporter.export_unit(definition,['player','enemy'],args.samples,False,16,gaits)
    assert gaits[uid]==expected_gaits[uid],f'Saved gait differs from acceptance: {uid}'
validate_gait_document(exporter.gait_document(gaits),exporter.UNITS)
assert all(digest(Path(path))==expected for path,expected in watch.items()),'Preflight mutated protected source/assets'
preflight={'passed':True,'unitTypes':20,'teamSources':40,'socketsPerType':16,'sourceAndPublicUnchanged':True,
           'references':references,'watchedHashes':watch,'gaitMetadata':exporter.gait_document(gaits)}
exporter.write_json_atomic(stage/'preflight.json',preflight)
if args.preflight_only:
    print('COMPLETE_ANIMATION_PREFLIGHT_PASSED',flush=True)
    raise SystemExit(0)
for definition in exporter.UNITS:
    uid=definition['id']
    rendered=exporter.export_unit(definition,['player','enemy'],args.samples,True,16,gaits)
    assert rendered==sockets[uid],f'Render changed projected sockets: {uid}'
exporter.write_json_atomic(exporter.OUT/'weapon-sockets.json',sockets)
exporter.write_json_atomic(exporter.OUT/'gait-metadata.json',exporter.gait_document(gaits))
assert all(digest(Path(path))==expected for path,expected in watch.items()),'Re-export mutated protected source/assets'
files={}
for uid in ids:
    for suffix in ['','-enemy']:
        path=exporter.OUT/f'units{suffix}'/f'{uid}.png'
        files[str(path)]={'bytes':path.stat().st_size,'sha256':digest(path)}
report={'passed':True,'renderedFrames':640,'teamSheets':40,'samples':args.samples,'sourceAndPublicUnchanged':True,
        'gaitUnits':20,'socketUnits':20,'files':files,'references':references,'watchedHashes':watch,
        'next':'Compare pixels against all approved sheets, then inspect and test the complete staged runtime before promotion.'}
exporter.write_json_atomic(stage/'render-validation.json',report)
print('COMPLETE_ANIMATION_REEXPORT_PASSED',json.dumps({'frames':640,'sheets':40,'samples':args.samples}),flush=True)
