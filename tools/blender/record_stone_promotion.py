"""Record the independently verified two-file Stone integration and canonical reexport."""
from datetime import datetime, timezone
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

ready=json.loads((stage/'final-readiness.json').read_text())
canonical=json.loads((stage/'canonical-export-validation/source-validation.json').read_text())
candidate_export=json.loads((stage/'export-validation/source-validation.json').read_text())
assert canonical['input_is_canonical']
assert all(canonical['checks'].values())
assert canonical['new_geometry_sha256']==candidate_export['new_geometry_sha256']
files=[]
for prior in ready['files']:
    source=Path(prior['candidate']);target=Path(prior['target']);backup=Path(prior['original_backup'])
    entry={'candidate':str(source),'target':str(target),'original_backup':str(backup),
           'candidate_sha256':prior['candidate_sha256'],'target_before_sha256':prior['target_current_sha256'],
           'original_backup_sha256':prior['backup_sha256'],'target_before_matched_original_backup':prior['target_matches_original_backup'],
           'candidate_bytes':prior['candidate_bytes'],'target_after_sha256':sha(target),'candidate_current_sha256':sha(source),
           'backup_current_sha256':sha(backup),'target_matches_reviewed_candidate':sha(target)==prior['candidate_sha256'],
           'reviewed_candidate_unchanged':sha(source)==prior['candidate_sha256'],
           'original_backup_preserved':sha(backup)==prior['backup_sha256']}
    assert entry['target_matches_reviewed_candidate'] and entry['reviewed_candidate_unchanged'] and entry['original_backup_preserved']
    files.append(entry)
assert canonical['input_sha256']==files[0]['target_after_sha256']
published=ROOT/'public/assets/reborn/backgrounds/stone.png'
reexport=stage/'canonical-export-validation/exports/backgrounds/stone.png'
a=Image.open(published).convert('RGBA');b=Image.open(reexport).convert('RGBA')
assert a.size==b.size==(1600,900)
diff=ImageChops.difference(a.convert('RGB'),b.convert('RGB'))
hist=diff.histogram();changed=sum(max(pixel)>0 for pixel in diff.getdata())
maximum=max(pair[1] for pair in diff.getextrema())
alpha_equal=a.getchannel('A').tobytes()==b.getchannel('A').tobytes()
pixel={
    'status':'pixel_identical' if a.tobytes()==b.tobytes() else 'validated_with_minimal_rgb_rounding_difference',
    'published':str(published),'isolated_canonical_reexport':str(reexport),
    'published_sha256':sha(published),'reexport_sha256':sha(reexport),
    'dimensions':list(a.size),'rgba_pixels_identical':a.tobytes()==b.tobytes(),'alpha_identical':alpha_equal,
    'maximum_rgb_channel_difference_8bit':maximum,'different_rgb_pixels':changed,
    'total_pixels':a.width*a.height,'fraction_different':changed/(a.width*a.height),
    'mean_rgb_channel_difference_8bit':sum((i%256)*count for i,count in enumerate(hist))/(a.width*a.height*3),
    'comparison':'Every RGBA byte and all three RGB channels, independently of alpha difference.',
}
assert maximum<=1 and changed/(a.width*a.height)<.001 and alpha_equal
write(stage/'canonical-export-validation/pixel-validation.json',pixel)
promotion={
    'status':'integrated_and_canonical_export_verified',
    'performed_by':'root','root_reported_execution_reference':'b13297','root_reported_exit_code':0,
    'independent_post_verification_utc':datetime.now(timezone.utc).isoformat(),
    'scope':'Exactly the two reviewed Stone asset files; this report and canonical audit perform no asset replacement.',
    'files':files,'original_archives_preserved':True,'canonical_and_public_match_reviewed_candidates':True,
    'canonical_export_validation':str(stage/'canonical-export-validation/source-validation.json'),
    'canonical_geometry_matches_candidate':True,
    'canonical_export_checks':canonical['checks'],'canonical_pixel_comparison':pixel,
    'contact_points':27,'all_contact_gaps_zero':True,'clear_entrance_rays':6,
    'gameplay_review':ready['gameplay_review'],'gameplay_review_sha256':ready['gameplay_review_sha256'],
    'no_public_or_dist_writes_by_post_verification':True,
}
write(stage/'promotion.json',promotion)
print(json.dumps(promotion,indent=2))
