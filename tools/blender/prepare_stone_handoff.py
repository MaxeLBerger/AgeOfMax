"""Prepare read-only final hashes and exact RGB evidence for the Stone candidate handoff."""
import hashlib
import json
import os
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[2]
stage=ROOT/'art/blender/candidates/stone-v2'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,value):
    temp=path.with_suffix('.writing.json')
    temp.write_text(json.dumps(value,indent=2),encoding='utf-8')
    os.replace(temp,path)

files=[]
for candidate,target,backup in [
    (stage/'candidate.blend',ROOT/'art/blender/background-stone.blend',stage/'original-background-stone.blend'),
    (stage/'candidate.png',ROOT/'public/assets/reborn/backgrounds/stone.png',stage/'original-background-stone.png'),
]:
    files.append({'candidate':str(candidate),'target':str(target),'original_backup':str(backup),
                  'candidate_sha256':sha(candidate),'target_current_sha256':sha(target),'backup_sha256':sha(backup),
                  'target_matches_original_backup':sha(target)==sha(backup),'candidate_bytes':candidate.stat().st_size})
assert all(item['target_matches_original_backup'] for item in files)
geometry=json.loads((stage/'geometry-validation.json').read_text())
export=json.loads((stage/'export-validation/source-validation.json').read_text())
metrics=json.loads((stage/'metrics.json').read_text())
assert geometry['source_sha256']==files[0]['candidate_sha256']
assert export['input_sha256']==files[0]['candidate_sha256']
assert len(geometry['dolmen_bearing_contacts'])==27
assert all(c['gap']==0 for c in geometry['dolmen_bearing_contacts'])
assert len(geometry['entrance_clearance_rays'])==6
assert all(c['passed'] for c in geometry['entrance_clearance_rays'])
assert all(export['checks'].values())
a=Image.open(stage/'candidate.png').convert('RGBA')
b=Image.open(stage/'export-validation/exports/backgrounds/stone.png').convert('RGBA')
assert a.size==b.size==(1600,900)
difference=ImageChops.difference(a.convert('RGB'),b.convert('RGB'))
hist=difference.histogram()
changed=sum(max(pixel)>0 for pixel in difference.getdata())
maximum=max(pair[1] for pair in difference.getextrema())
mean=sum((i%256)*count for i,count in enumerate(hist))/(a.width*a.height*3)
same=a.tobytes()==b.tobytes()
pixel={
    'status':'pixel_identical' if same else 'validated_with_minimal_rgb_rounding_difference',
    'candidate_size':list(a.size),'export_size':list(b.size),
    'rgba_pixels_identical':same,'candidate_sha256':sha(stage/'candidate.png'),
    'reexport_sha256':sha(stage/'export-validation/exports/backgrounds/stone.png'),
    'comparison':'Every RGBA byte and all three RGB channels, independently of alpha difference.',
    'maximum_rgb_channel_difference_8bit':maximum,'mean_rgb_channel_difference_8bit':mean,
    'different_rgb_pixels':changed,'total_pixels':a.width*a.height,
    'fraction_different':changed/(a.width*a.height),
}
write(stage/'export-validation/pixel-validation.json',pixel)
assert maximum<=1,(maximum,changed)
assert changed/(a.width*a.height)<.001,(maximum,changed)
report={
    'status':'ready_for_root_two_file_promotion','publication':'not performed',
    'review':'Root personally reviewed the final HUD image and approved this focal art iteration.',
    'files':files,'geometry_report':str(stage/'geometry-validation.json'),
    'export_report':str(stage/'export-validation/source-validation.json'),
    'pixel_report':str(stage/'export-validation/pixel-validation.json'),
    'gameplay_review':str(ROOT/'art/qa/visual-stone-candidate.jpg'),
    'gameplay_review_sha256':sha(ROOT/'art/qa/visual-stone-candidate.jpg'),
    'contact_points':27,'all_contact_gaps_zero':True,'clear_entrance_rays':6,
    'camera_unchanged':metrics['camera_unchanged'],'terrain_unchanged':metrics['terrain_unchanged'],
    'new_geometry_vertical_screen_bounds':[geometry['all_new_geometry_bounds_1280x720'][1],geometry['all_new_geometry_bounds_1280x720'][3]],
    'normal_export_checks':export['checks'],'pixel_comparison':pixel,
    'root_next_step':'Independently recheck listed hashes and narrowly promote only the two files if still matching. No runtime source or dist writes are part of this handoff.',
}
write(stage/'final-readiness.json',report)
print(json.dumps(report,indent=2))
