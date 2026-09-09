"""Check both supported sheet contracts without changing production assets."""
import hashlib, importlib.util, json
from pathlib import Path
from PIL import Image
ROOT = Path.cwd()
spec = importlib.util.spec_from_file_location('packer', ROOT/'tools/blender/pack_sheets.py')
packer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packer)
stage = ROOT/'art/blender/candidates/animation-v3/packer-validation'
sources = {8: ROOT/'public/assets/reborn/units/clubman.png',
           16: ROOT/'art/blender/candidates/animation-v3/clubman/clubman-16.png'}
results = []
for count, source in sources.items():
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    original = Image.open(source).convert('RGBA')
    packer.OUT = stage/str(count)/'exports'
    packer.FRAMES = stage/str(count)/'frames'
    directory = packer.FRAMES/'player'/'clubman'
    directory.mkdir(parents=True, exist_ok=True)
    for index in range(count):
        original.crop((index*256,0,(index+1)*256,256)).save(directory/f'{index}.png')
    report = packer.pack('clubman', 'player', count)
    result = Image.open(packer.OUT/'units/clubman.png').convert('RGBA')
    assert result.size == (count*256,256) and result.tobytes() == original.tobytes()
    assert report['frames'] == count and report['contactFrame'] == count*3//4
    assert report['attackFrameDurationMs']*(count//2) == 320
    assert report['contactDelayMs'] == 160
    assert len(report['walk']) == len(report['attack']) == count//2
    assert packer.existing_record('clubman','player',count)['frames'] == count
    try:
        packer.existing_record('clubman','player',16 if count == 8 else 8)
    except ValueError:
        rejects_wrong_contract = True
    else:
        raise AssertionError('A mixed sheet contract was silently accepted')
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before
    results.append({'frames':count,'source':str(source.relative_to(ROOT)),
                    'source_unchanged':True,'pixels_identical':True,
                    'wrong_contract_rejected':rejects_wrong_contract,'report':report})
path = stage/'validation.json'
path.parent.mkdir(parents=True,exist_ok=True)
temporary = path.with_suffix('.tmp')
temporary.write_text(json.dumps({'passed':True,'results':results},indent=2))
temporary.replace(path)
print(json.dumps({'passed':True,'contracts':[8,16],'source_unchanged':True,
                  'pixels_identical':True,'wrong_contract_rejected':True}))
