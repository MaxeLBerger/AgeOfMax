"""Make a local mechanism contact strip from actual staged Blender frames."""
import argparse
from pathlib import Path
from PIL import Image,ImageDraw
import review_animation_study as REVIEW
STAGE=Path(__file__).resolve().parents[2]/'art/blender/candidates/animation-v3/bow-throw-family'
parser=argparse.ArgumentParser();parser.add_argument('--unit',default='archer');parser.add_argument('--frames',default='0,10,11,12,14')
args=parser.parse_args();frames=[int(f) for f in args.frames.split(',')]
canvas=REVIEW.backdrop((256*len(frames),300));draw=ImageDraw.Draw(canvas)
for index,frame in enumerate(frames):
    image=Image.open(STAGE/args.unit/'frames'/f'{frame:02d}.png').convert('RGBA')
    REVIEW.paste(canvas,image,index*256,28)
    label=f'{args.unit} / {frame}'+(' / RELEASE160 ms' if frame==12 else '')
    draw.text((index*256+10,6),label,font=REVIEW.SMALL,fill=(233,225,207))
canvas.save(STAGE/f'{args.unit}-mechanism-preview.jpg',quality=95)
