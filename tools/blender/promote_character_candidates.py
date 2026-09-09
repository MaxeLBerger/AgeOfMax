"""Promote the reviewed Titan/sniper candidate set without changing other units.

Run only after the coordinated gameplay baseline has finished loading the old
assets. Both independent candidate QA reports must pass before any publication.
"""
import hashlib
import json
import os
import runpy
import time
from pathlib import Path

from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/heavy-sniper-v1'
OUT=ROOT/'public/assets/reborn'
UNITS=['super-heavy','sniper']


def atomic_bytes(path,raw):
    path=path.resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f'Output escaped workspace: {path}')
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_name(path.stem+'.promoting'+path.suffix)
    with temporary.open('wb') as handle:
        handle.write(raw)
        handle.flush()
        os.fsync(handle.fileno())
    for attempt in range(12):
        try:
            os.replace(temporary,path)
            return
        except PermissionError:
            if attempt==11:raise
            time.sleep(.12*(attempt+1))


def atomic_json(path,value):
    atomic_bytes(path,json.dumps(value,indent=2).encode('utf-8'))


def main():
    for report in ['verification.json','source-validation.json']:
        value=json.loads((STAGE/report).read_text())
        if value.get('status')!='passed' or value.get('issues'):
            raise RuntimeError(f'Candidate gate is not green: {report}')
    sockets=json.loads((STAGE/'weapon-sockets.json').read_text())
    if set(sockets)!=set(UNITS):raise RuntimeError('Unexpected candidate socket IDs')
    original_sockets=json.loads((OUT/'weapon-sockets.json').read_text())
    merged_sockets={**original_sockets,**sockets}
    unchanged={uid:value for uid,value in original_sockets.items() if uid not in UNITS}
    assert unchanged=={uid:value for uid,value in merged_sockets.items() if uid not in UNITS}
    operations=[]
    for uid in UNITS:
        for faction,suffix in [('player',''),('enemy','-enemy')]:
            operations.append((STAGE/f'unit-{uid}{suffix}.blend',ROOT/f'art/blender/unit-{uid}{suffix}.blend'))
            for folder in ['units','portraits']:
                operations.append((STAGE/f'exports/{folder}{suffix}/{uid}.png',OUT/f'{folder}{suffix}/{uid}.png'))
            for index in range(8):
                operations.append((STAGE/f'frames/{faction}/{uid}/{index}.png',
                                   ROOT/f'art/blender/frames/{faction}/{uid}/{index}.png'))
    payloads=[(source,destination,source.read_bytes()) for source,destination in operations]
    if any(len(raw)<500 for _,_,raw in payloads):raise RuntimeError('Unexpected empty candidate output')
    records=[]
    for source,destination,raw in payloads:
        atomic_bytes(destination,raw)
        records.append({'source':str(source.relative_to(ROOT)),
                        'destination':str(destination.relative_to(ROOT)),
                        'sha256':hashlib.sha256(raw).hexdigest()})
    atomic_json(OUT/'weapon-sockets.json',merged_sockets)
    packer=runpy.run_path(str(ROOT/'tools/blender/pack_sheets.py'),run_name='packer_library')
    units=json.loads((ROOT/'data/units.json').read_text())
    for faction,suffix in [('player',''),('enemy','-enemy')]:
        manifest_path=OUT/f'manifest{suffix}.json'
        manifest=json.loads(manifest_path.read_text())
        for index,record in enumerate(manifest['units']):
            if record['id'] in UNITS:
                manifest['units'][index]=packer['existing_record'](record['id'],faction)
        atomic_json(manifest_path,manifest)
        contact=Image.new('RGB',(1000,800),(18,31,37));draw=ImageDraw.Draw(contact)
        for index,unit in enumerate(units):
            sheet=Image.open(OUT/f'units{suffix}/{unit["id"]}.png').convert('RGBA')
            preview=sheet.crop((0,0,256,256));preview.thumbnail((180,180))
            x=index%5*200;y=index//5*200
            contact.paste(preview,(x+10,y),preview)
            draw.text((x+8,y+181),unit['id'],fill=(230,222,195))
        contact.save(ROOT/f'art/blender/unit-contact-sheet{suffix}.jpg',quality=92)
    published=json.loads((OUT/'weapon-sockets.json').read_text())
    assert len(published)==20 and all(published[uid]==value for uid,value in unchanged.items())
    report={'status':'promoted','units':UNITS,'spriteSheets':4,'portraits':4,'blenderSources':4,
            'intermediateFrames':32,'updatedSocketIds':UNITS,'unchangedSocketIds':sorted(unchanged),
            'files':records}
    atomic_json(STAGE/'promotion.json',report)
    print(json.dumps({key:value for key,value in report.items() if key!='files'},indent=2))


if __name__=='__main__':main()
