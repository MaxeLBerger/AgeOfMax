"""Verify saved v3 action export on isolated copies; never render or write public files."""
import argparse,hashlib,json,shutil,struct,sys
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
import export_scenes as exporter
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--render',action='store_true')
parser.add_argument('--unit',choices=['rifleman','sniper','both'],default='both')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
selected=['rifleman','sniper'] if args.unit=='both' else [args.unit]
STAGE=ROOT/'art/blender/candidates/animation-v3'/('exporter-render-validation' if args.render else 'exporter-validation')
STAGE.mkdir(parents=True,exist_ok=True)
source_dir=STAGE/'source'
source_dir.mkdir(exist_ok=True)
watch={}
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
for unit in selected:
    for suffix in ['', '-enemy']:
        key=unit+suffix
        original=ROOT/f'art/blender/candidates/animation-v3/ranged-family/{key}/unit-{key}.blend'
        copy=source_dir/f'unit-{key}.blend'
        watch[str(original)]=digest(original)
        shutil.copy2(original,copy)
        watch[str(copy)]=digest(copy)
for path in (ROOT/'public/assets/reborn').rglob('*'):
    if path.is_file(): watch[str(path)]=digest(path)
exporter.SOURCE=source_dir
exporter.OUT=STAGE/'exports'
results={}
for uid in selected:
    definition=next(unit for unit in exporter.UNITS if unit['id']==uid)
    try:
        exporter.export_unit(definition,['player','enemy'],8,False,8)
    except RuntimeError as error:
        assert 'contract mismatch' in str(error), str(error)
    else:
        raise AssertionError('An incorrect expected frame contract was accepted')
    coordinates=exporter.export_unit(definition,['player','enemy'],48,args.render,16)
    expected=json.loads((ROOT/f'art/blender/candidates/animation-v3/ranged-family/{uid}/weapon-sockets.json').read_text())[uid]
    maximum=max(abs(a-b) for pa,pb in zip(coordinates,expected) for a,b in zip(pa,pb))
    assert len(coordinates)==len(expected)==16 and maximum<=.001001, (uid,maximum)
    results[uid]={'frames':16,'matches_study_max_difference_pixels':maximum,
                 'factions_match':True,'coordinates':coordinates}
assert all(digest(Path(path))==value for path,value in watch.items()), 'Source or public file changed'
if args.render:
    for uid in selected:
        for faction,suffix in [('player',''),('enemy','-enemy')]:
            sheet=exporter.OUT/f'units{suffix}'/f'{uid}.png'
            assert struct.unpack('>II',sheet.read_bytes()[16:24])==(4096,256)
            frames=list((source_dir/'frames'/faction/uid).glob('*.png'))
            assert len(frames)==16
else:
    assert not exporter.OUT.exists(), 'Sockets-only test must not create any runtime exports'
report={'passed':True,'scope':'Existing saved clips, both team sources, sixteen real projected points.',
        'rendered':args.render,'wrong_requested_contract_rejected':True,
        'all_original_and_copied_sources_unchanged':True,'all_public_files_unchanged':True,
        'results':results,'source_hashes':watch}
path=STAGE/'validation.json';tmp=path.with_suffix('.tmp')
tmp.write_text(json.dumps(report,indent=2));tmp.replace(path)
print('AUTHORED_EXPORTER_CHECK',json.dumps({'passed':True,'units':list(results),'max_differences':[v['matches_study_max_difference_pixels'] for v in results.values()],'public_unchanged':True}),flush=True)
