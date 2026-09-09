"""Verify rendered pixels, faction variants, animated sockets and source contracts."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image
from animation_contract import validate_gait_document

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/reborn'
EPOCHS = ['stone', 'castle', 'renaissance', 'modern', 'future']
UNITS = json.loads((ROOT / 'data/units.json').read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--frames',type=int,choices=[8,16],default=8)
FRAME_COUNT = parser.parse_args().frames
CLIP_FRAMES = FRAME_COUNT // 2
issues = []
records = []
sources = []


def check_image(path, size, transparent=False):
    if not path.exists():
        issues.append(f'Missing {path.relative_to(ROOT)}')
        return None
    try:
        im = Image.open(path)
        im.load()
    except (OSError, ValueError) as error:
        issues.append(f'Unreadable image {path.relative_to(ROOT)}: {error}')
        return None
    if im.size != size:
        issues.append(f'Wrong dimensions {path.name}: {im.size}, expected {size}')
    if transparent:
        if im.mode != 'RGBA':
            issues.append(f'Missing RGBA alpha: {path.name}')
        elif im.getchannel('A').getextrema() != (0, 255):
            issues.append(f'Wrong alpha range: {path.name}')
    records.append({'file': str(path.relative_to(ROOT)), 'size': im.size,
                    'bytes': path.stat().st_size,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    return im


def check_source(name):
    path = ROOT / 'art/blender' / f'{name}.blend'
    if not path.exists():
        issues.append(f'Missing editable source: {name}')
        return
    raw = path.read_bytes()
    if len(raw) < 500 or not any(raw[:64]):
        issues.append(f'Invalid source: {name}')
    sources.append({'file': str(path.relative_to(ROOT)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest()})


for epoch in EPOCHS:
    check_image(OUT / 'backgrounds' / f'{epoch}.png', (1600,900))
    check_source(f'background-{epoch}')
    for suffix in ['', '-enemy']:
        check_image(OUT / ('bases'+suffix) / f'{epoch}.png', (512,512), True)
        check_source(f'base-{epoch}{suffix}')
        for tier in range(1,4):
            check_image(OUT / ('towers'+suffix) / f'{epoch}-{tier}.png', (256,256), True)
            check_source(f'tower-{epoch}-{tier}{suffix}')

for unit in UNITS:
    uid = unit['id']
    faction_hashes = []
    for suffix in ['', '-enemy']:
        im = check_image(OUT / ('units'+suffix) / f'{uid}.png', (256*FRAME_COUNT,256), True)
        check_source(f'unit-{uid}{suffix}')
        if im is None:
            continue
        faction_hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
        hashes = []
        for index in range(FRAME_COUNT):
            frame = im.crop((index*256,0,(index+1)*256,256))
            alpha = frame.getchannel('A')
            bounds = alpha.point(lambda p: 255 if p > 40 else 0).getbbox()
            if not bounds:
                issues.append(f'Empty frame: {uid}{suffix}:{index}')
            elif bounds[0] <= 0 or bounds[1] <= 0 or bounds[2] >= 256 or bounds[3] >= 256:
                issues.append(f'Clipped frame: {uid}{suffix}:{index}: {bounds}')
            hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        minimum_poses = 3 if FRAME_COUNT == 8 else 7
        if len(set(hashes[:CLIP_FRAMES])) < minimum_poses:
            issues.append(f'Fewer than {minimum_poses} walk poses: {uid}{suffix}')
        if len(set(hashes[CLIP_FRAMES:])) < minimum_poses:
            issues.append(f'Fewer than {minimum_poses} attack poses: {uid}{suffix}')
        if set(hashes[CLIP_FRAMES:]) == set(hashes[:CLIP_FRAMES]):
            issues.append(f'Attack duplicates walk: {uid}{suffix}')
    if len(faction_hashes) == 2 and faction_hashes[0] == faction_hashes[1]:
        issues.append(f'Factions have identical pixels: {uid}')

socket_path = OUT / 'weapon-sockets.json'
sockets = {}
if not socket_path.exists():
    issues.append('Missing weapon-sockets.json')
else:
    try:
        sockets = json.loads(socket_path.read_text())
    except (ValueError, OSError) as error:
        issues.append(f'Unreadable weapon sockets: {error}')
    if set(sockets) != {unit['id'] for unit in UNITS}:
        issues.append('Socket keys do not exactly match all twenty unit IDs')
    for uid, frames in sockets.items():
        if not isinstance(frames, list) or len(frames) != FRAME_COUNT:
            issues.append(f'Socket needs {FRAME_COUNT} frames: {uid}')
            continue
        for index, point in enumerate(frames):
            if not isinstance(point, list) or len(point) != 2 or not all(
                isinstance(value, (int,float)) and math.isfinite(value) and 0 < value < 256
                for value in point):
                issues.append(f'Invalid socket: {uid}:{index}: {point}')

gait_units = 0
if FRAME_COUNT == 16:
    try:
        gait_data = json.loads((OUT / 'gait-metadata.json').read_text())
        validate_gait_document(gait_data, UNITS)
        gait_units = len(gait_data['units'])
    except (OSError, ValueError, RuntimeError, TypeError) as error:
        issues.append(f'Invalid measured gait metadata: {error}')

for path in (ROOT / 'tools/blender').glob('*.py'):
    try:
        compile(path.read_text(encoding='utf-8'), str(path), 'exec')
    except (SyntaxError, ValueError) as error:
        issues.append(f'Invalid Python source {path.name}: {error}')

report = {'status': 'passed' if not issues else 'failed',
          'animationFrames': FRAME_COUNT,
          'checkedImages': len(records), 'expectedImages': 85,
          'checkedSources': len(sources), 'expectedSources': 85,
          'socketUnits': len(sockets), 'gaitUnits': gait_units, 'issues': issues,
          'files': records, 'sources': sources,
          'scope': 'Pixels, dimensions, alpha, clipping, pose distinctness, faction difference, finite socket coordinates and saved source integrity. This does not certify AAA quality or replace gameplay/visual review.'}
(ROOT / 'art/blender/verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps({key: value for key,value in report.items() if key not in ['files','sources']}, indent=2))
raise SystemExit(bool(issues))
