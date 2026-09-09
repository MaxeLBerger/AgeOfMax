"""Measure final future render reproduction and assemble a labelled review sheet."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFont,ImageStat

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/future-v2'


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--canonical',action='store_true')
    args=parser.parse_args()
    checked_directory=STAGE/'canonical-export-validation' if args.canonical else STAGE/'reproduction'
    original=Image.open(STAGE/'baseline/future.png').convert('RGB')
    candidate=Image.open(STAGE/'future.png').convert('RGB')
    reproduction=Image.open(checked_directory/'backgrounds/future.png').convert('RGB')
    assert original.size==candidate.size==reproduction.size==(1600,900)
    diff=ImageChops.difference(candidate,reproduction)
    extrema=diff.getextrema()
    largest=max(pair[1] for pair in extrema)
    changed=sum(1 for rgb in diff.getdata() if max(rgb)>0)
    assert largest<=2,(largest,changed)
    # Preserve the ground geometry, report honest lighting differences in the combat band.
    band_box=(0,513,1600,657)
    band_diff=ImageChops.difference(original.crop(band_box),candidate.crop(band_box))
    band_stats=ImageStat.Stat(band_diff)
    report={'passed':True,'dimensions':[1600,900],'reproduction_max_channel_difference':largest,
            'reproduction_pixels_different':changed,'total_pixels':1600*900,
            'combat_band_mean_absolute_rgb_difference':band_stats.mean,
            'combat_band_maximum_channel_difference':max(pair[1] for pair in band_diff.getextrema()),
            'note':'Band pixel differences include changed building shadows and independent Cycles sampling; geometry and camera hashes are checked separately.',
            'candidate_png_sha256':hashlib.sha256((STAGE/'future.png').read_bytes()).hexdigest()}
    report['audited_published_canonical']=args.canonical
    report_path=checked_directory/'render-check.json' if args.canonical else STAGE/'render-check.json'
    report_path.write_text(json.dumps(report,indent=2),encoding='utf-8')
    if args.canonical:
        print(json.dumps(report,indent=2))
        return
    canvas=Image.new('RGB',(1600,1020),(16,23,29))
    draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',25)
    small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',19)
    draw.text((24,15),'FUTURE CITADEL - staged Blender architecture review',font=font,fill=(231,237,239))
    canvas.paste(original.resize((800,450),Image.Resampling.LANCZOS),(0,76))
    canvas.paste(candidate.resize((800,450),Image.Resampling.LANCZOS),(800,76))
    draw.text((20,48),'BEFORE · original ring clipped by the upper frame',font=small,fill=(184,199,207))
    draw.text((820,48),'AFTER · supported ring and connected city terraces',font=small,fill=(184,199,207))
    canvas.paste(original.crop((160,75,1440,505)).resize((800,269),Image.Resampling.LANCZOS),(0,569))
    canvas.paste(candidate.crop((160,75,1440,505)).resize((800,269),Image.Resampling.LANCZOS),(800,569))
    draw.text((20,539),'Architecture detail',font=small,fill=(184,199,207))
    draw.text((820,539),'Three building families / structural joints / recessed bays',font=small,fill=(184,199,207))
    draw.text((24,865),'1600 × 900 · same camera, terrain, plants, existing lights and environment materials',font=font,fill=(231,237,239))
    draw.text((24,909),'Ring top: runtime y99, below HUD y82. New geometry ends before combat band y410.',font=small,fill=(184,199,207))
    draw.text((24,945),'Public and canonical assets remain unchanged. Editable candidate and regular-export reproduction included.',font=small,fill=(184,199,207))
    canvas.save(STAGE/'before-after.jpg',quality=93)
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
