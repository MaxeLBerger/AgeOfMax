"""Create the early five-pose melee review board from genuine Blender renders."""
import argparse,json,os
from pathlib import Path
from PIL import Image,ImageDraw
import review_animation_study as REVIEW
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/melee-family'
parser=argparse.ArgumentParser();parser.add_argument('--units',default='clubman,swordsman');parser.add_argument('--name',default='pose-preview');args=parser.parse_args()
units=args.units.split(',');assert all(u in ['clubman','spearman','swordsman','duelist','super-heavy'] for u in units)
frames=[0,2,10,12,14]
board=REVIEW.backdrop((1280,290*len(units)));draw=ImageDraw.Draw(board)
bounds={}
for row,unit in enumerate(units):
    bounds[unit]={}
    for col,frame in enumerate(frames):
        image=Image.open(STAGE/unit/'frames'/f'{frame:02d}.png').convert('RGBA')
        box=image.getchannel('A').point(lambda value:255 if value>12 else 0).getbbox()
        bounds[unit][str(frame)]=box
        assert box and box[0]>=2 and box[1]>=2 and box[2]<=254 and box[3]<=254,(unit,frame,box)
        REVIEW.paste(board,image,col*256,row*290+26)
        draw.text((col*256+12,row*290+6),f'{unit} / sprite {frame}'+(' CONTACT' if frame==12 else ''),font=REVIEW.SMALL,fill=(235,219,183))
temp=STAGE/(args.name+'.writing.jpg');board.save(temp,quality=93);os.replace(temp,STAGE/(args.name+'.jpg'))
temp=STAGE/(args.name+'-bounds.writing.json');temp.write_text(json.dumps(bounds,indent=2));os.replace(temp,STAGE/(args.name+'-bounds.json'))
print(json.dumps(bounds))
