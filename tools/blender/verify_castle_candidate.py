"""Verify castle candidate image/export parity and exact original backups."""
from pathlib import Path
import hashlib
import json
from PIL import Image,ImageChops,ImageStat

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/castle-v2'

def main():
    paths={'canonical_source':ROOT/'art/blender/background-castle.blend',
           'archived_source':STAGE/'original-background-castle.blend',
           'canonical_png':ROOT/'public/assets/reborn/backgrounds/castle.png',
           'archived_png':STAGE/'original-background-castle.png',
           'candidate_source':STAGE/'candidate.blend','candidate_png':STAGE/'candidate.png',
           'reexport_png':STAGE/'export-validation/exports/backgrounds/castle.png'}
    records={name:{'path':str(path.relative_to(ROOT)),'bytes':path.stat().st_size,
                   'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for name,path in paths.items()}
    assert records['canonical_source']['sha256']==records['archived_source']['sha256']
    assert records['canonical_png']['sha256']==records['archived_png']['sha256']
    left=Image.open(paths['candidate_png']);right=Image.open(paths['reexport_png'])
    assert left.size==right.size==(1600,900) and left.mode==right.mode=='RGBA'
    difference=ImageChops.difference(left,right);extrema=difference.getextrema()
    means=ImageStat.Stat(difference).mean
    changed=sum(any(value for value in pixel) for pixel in difference.getdata())
    comparison={'dimensions':[1600,900],'max_channel_difference':max(high for low,high in extrema),
                'mean_channel_difference':means,'changed_pixels':changed,'total_pixels':1440000,
                'pixel_identical':left.tobytes()==right.tobytes()}
    assert comparison['max_channel_difference']<=1 and max(means)<.0003 and changed<800,comparison
    export=json.loads((STAGE/'export-validation/source-validation.json').read_text())
    assert export['status']=='passed' and all(export['checks'].values())
    report={'status':'passed','files':records,'source_and_public_unchanged':True,
            'originals_match_backups':True,'pixel_comparison':comparison,'export_validation':export}
    temporary=STAGE/'publication-evidence.writing.json'
    temporary.write_text(json.dumps(report,indent=2),encoding='utf-8')
    temporary.replace(STAGE/'publication-evidence.json')
    print(json.dumps({'status':'passed','pixel_comparison':comparison,
                     'candidate_hashes':{name:records[name]['sha256'] for name in ('candidate_source','candidate_png')}},indent=2))

if __name__=='__main__':main()
