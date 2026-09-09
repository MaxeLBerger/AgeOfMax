"""Losslessly assemble Blender frames and document the final sheet contract."""
import argparse
import json
import os
import time
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/reborn'
FRAMES = ROOT / 'art/blender/frames'


def replace_atomic(source, destination):
    for attempt in range(12):
        try:
            os.replace(source, destination)
            return
        except PermissionError:
            if attempt == 11:
                raise
            time.sleep(.12 * (attempt + 1))


def save_atomic(image, path):
    temporary = path.with_name(path.stem + '.packing.png')
    image.save(temporary, optimize=True)
    replace_atomic(temporary, path)


def describe(unit_id, faction, frames):
    suffix = '-enemy' if faction == 'enemy' else ''
    for index, frame in enumerate(frames):
        if frame.size != (256,256):
            raise ValueError(f'{unit_id}: incorrect frame dimensions {frame.size}')
        if not frame.getchannel('A').getbbox():
            raise ValueError(f'{unit_id}: blank Blender frame {index}')
    count = len(frames)
    if count not in (8, 16):
        raise ValueError(f'{unit_id}: unsupported animation length {count}')
    half = count // 2
    return {'id':unit_id, 'faction':faction, 'frames':count, 'frameWidth':256,
            'frameHeight':256, 'file':f'units{suffix}/{unit_id}.png', 'anchor':[.5,.92],
            'animationLayoutVersion':3 if count == 16 else 1,
            'walk':list(range(half)), 'attack':list(range(half,count)),
            'contactFrame':half + half//2, 'attackFrameDurationMs':320/half,
            'contactDelayMs':160, 'direction':'right',
            'frameBounds':[frame.getchannel('A').getbbox() for frame in frames],
            'distinctFrames':len({frame.tobytes() for frame in frames})}


def existing_record(unit_id, faction, frame_count=8):
    suffix = '-enemy' if faction == 'enemy' else ''
    path = OUT / ('units'+suffix) / f'{unit_id}.png'
    sheet = Image.open(path).convert('RGBA')
    if sheet.size != (256*frame_count,256):
        raise ValueError(f'{unit_id}: incorrect existing sheet dimensions {sheet.size}')
    frames = [sheet.crop((index*256,0,(index+1)*256,256)) for index in range(frame_count)]
    return describe(unit_id, faction, frames)


def pack(unit_id, faction='player', frame_count=8):
    suffix = '-enemy' if faction == 'enemy' else ''
    frames = [Image.open(FRAMES/faction/unit_id/f'{index}.png').convert('RGBA') for index in range(frame_count)]
    record = describe(unit_id, faction, frames)
    sheet = Image.new('RGBA',(256*frame_count,256))
    for index, frame in enumerate(frames):
        sheet.paste(frame,(index*256,0))
    (OUT/('units'+suffix)).mkdir(parents=True,exist_ok=True)
    save_atomic(sheet,OUT/('units'+suffix)/f'{unit_id}.png')
    (OUT/('portraits'+suffix)).mkdir(parents=True,exist_ok=True)
    save_atomic(frames[0],OUT/('portraits'+suffix)/f'{unit_id}.png')
    return record


def main():
    global OUT, FRAMES
    parser = argparse.ArgumentParser()
    parser.add_argument('--unit')
    parser.add_argument('--frames',type=int,choices=[8,16],default=8,
                        help='Explicit complete sheet contract; legacy production remains 8 until migration.')
    parser.add_argument('--output-root',type=Path,default=OUT)
    parser.add_argument('--frames-root',type=Path,default=FRAMES)
    parser.add_argument('--faction',choices=['player','enemy'],default='player')
    args = parser.parse_args()
    OUT = args.output_root.resolve()
    FRAMES = args.frames_root.resolve()
    suffix = '-enemy' if args.faction == 'enemy' else ''
    units = json.loads((ROOT/'data/units.json').read_text())
    report = []
    for unit in units:
        if args.unit and args.unit != unit['id']:
            continue
        if args.unit or (FRAMES/args.faction/unit['id']/f'{args.frames-1}.png').exists():
            report.append(pack(unit['id'],args.faction,args.frames))
        else:
            # A fresh checkout intentionally has no intermediate frames. Preserve
            # its committed sheets when only one selected unit was regenerated.
            report.append(existing_record(unit['id'],args.faction,args.frames))
    print(json.dumps(report,indent=2))
    if args.unit:
        return
    manifest = {'source':'Original editable Blender 4.5.13 scenes in art/blender',
                'animationLayoutVersion':3 if args.frames == 16 else 1,
                'units':report,
                'backgrounds':{epoch:f'backgrounds/{epoch}.png' for epoch in ['stone','castle','renaissance','modern','future']},
                'baseSize':[512,512], 'towerSize':[256,256], 'weaponSockets':'weapon-sockets.json'}
    path = OUT/f'manifest{suffix}.json'
    temporary = path.with_suffix('.writing.json')
    with temporary.open('w',encoding='utf-8') as handle:
        json.dump(manifest,handle,indent=2)
        handle.flush()
        os.fsync(handle.fileno())
    replace_atomic(temporary,path)
    thumbs = Image.new('RGB',(1000,200*((len(report)+4)//5)),(18,31,37))
    draw = ImageDraw.Draw(thumbs)
    for index,unit in enumerate(report):
        sheet = Image.open(OUT/unit['file']).convert('RGBA')
        preview = sheet.crop((0,0,256,256))
        preview.thumbnail((180,180))
        x = index%5*200
        y = index//5*200
        thumbs.paste(preview,(x+10,y),preview)
        draw.text((x+8,y+181),unit['id'],fill=(230,222,195))
    if report:
        preview_path = (ROOT/f'art/blender/unit-contact-sheet{suffix}.jpg' if OUT == ROOT/'public/assets/reborn'
                        else OUT/f'unit-contact-sheet{suffix}.jpg')
        thumbs.save(preview_path,quality=92)


if __name__ == '__main__':
    main()
