"""Pack and verify staged characters, and build immutable before/after review sheets."""
import hashlib
import json
import runpy
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/heavy-sniper-v1'
UNITS=['super-heavy','sniper']
EXPORT=STAGE/'exports'
packer=runpy.run_path(str(ROOT/'tools/blender/pack_sheets.py'),run_name='packer_library')
packer['pack'].__globals__['FRAMES']=STAGE/'frames'
packer['pack'].__globals__['OUT']=EXPORT
records=[];issues=[]

for uid in UNITS:
    for faction in ['player','enemy']:
        record=packer['pack'](uid,faction)
        suffix='-enemy' if faction=='enemy' else ''
        path=EXPORT/f'units{suffix}/{uid}.png'
        sheet=Image.open(path).convert('RGBA')
        hashes=[];bounds=[]
        for index in range(8):
            frame=sheet.crop((index*256,0,(index+1)*256,256))
            box=frame.getchannel('A').point(lambda p:255 if p>40 else 0).getbbox()
            if box is None or box[0]<=0 or box[1]<=0 or box[2]>=256 or box[3]>=256:
                issues.append(f'Empty/clipped {uid} {faction} frame {index}: {box}')
            bounds.append(box)
            hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        if len(set(hashes[:4]))<3 or len(set(hashes[4:]))<4:
            issues.append(f'Insufficient distinct poses {uid} {faction}')
        record.update({'bounds':bounds,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        records.append(record)

sockets=json.loads((STAGE/'weapon-sockets.json').read_text())
if set(sockets)!=set(UNITS):issues.append('Wrong staged socket IDs')
for uid,values in sockets.items():
    if len(values)!=8 or not all(len(v)==2 and all(0<n<256 for n in v) for v in values):
        issues.append(f'Invalid sockets: {uid}')

poses=json.loads((STAGE/'pose-contract.json').read_text())
for uid,frames in poses.items():
    for frame in frames[4:]:
        expected=.16 if uid=='super-heavy' else .14
        if any(abs(ankle[2]-expected)>.002 for ankle in frame['ankles']):
            issues.append(f'Unplanted attack ankle: {uid} {frame["frame"]}')
    if max(abs(frames[4]['ankles'][side][axis]-frame['ankles'][side][axis])
           for frame in frames[5:] for side in [0,1] for axis in range(3))>.003:
        issues.append(f'Attack feet slide: {uid}')

try:font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
except OSError:font=ImageFont.load_default()
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
for uid in UNITS:
    # Main comparison shows all eight exact exported frames at native resolution.
    canvas=Image.new('RGB',(2048,620),(18,29,35));draw=ImageDraw.Draw(canvas)
    before=Image.open(STAGE/f'baseline/units/{uid}.png').convert('RGBA')
    after=Image.open(EXPORT/f'units/{uid}.png').convert('RGBA')
    draw.text((20,10),f'{uid.upper()}  |  BEFORE',font=font,fill=(221,221,211))
    canvas.paste(before,(0,45),before)
    draw.text((20,310),'CANDIDATE  |  authored geometry, planted attack, articulated grips',font=font,fill=(208,194,150))
    canvas.paste(after,(0,355),after)
    for index in range(8):
        label=f'{index}: '+(['walk','walk','walk','walk','windup','aim / swing','CONTACT','recovery'][index])
        draw.text((index*256+10,284),label,font=small,fill=(142,166,173))
        draw.text((index*256+10,595),label,font=small,fill=(142,166,173))
    canvas.save(STAGE/f'{uid}-before-after.png')
    compact=Image.new('RGB',(768,626),(18,29,35));draw=ImageDraw.Draw(compact)
    draw.text((15,9),f'{uid.upper()} - idle / windup / contact',font=font,fill=(228,217,190))
    for column,index in enumerate([0,4,6]):
        for row,sheet in enumerate([before,after]):
            frame=sheet.crop((index*256,0,(index+1)*256,256))
            compact.paste(frame,(column*256,40+row*290),frame)
    draw.text((15,296),'BEFORE',font=small,fill=(144,166,171))
    draw.text((15,590),'CANDIDATE',font=small,fill=(228,217,190))
    compact.save(STAGE/f'{uid}-comparison.png')

report={'status':'passed' if not issues else 'failed','images':4,'frames':32,
        'sources':4,'socketUnits':2,'issues':issues,'records':records,
        'checks':['dimensions','alpha/clipping','distinct poses','eight sockets per unit',
                  'both attack feet planted','no attack foot sliding'],
        'limits':'A bounded silhouette/pose improvement, not AAA certification. Full gameplay integration remains a separate gate.'}
(STAGE/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps({key:value for key,value in report.items() if key!='records'},indent=2))
raise SystemExit(bool(issues))
