"""Render selected samples from the two saved Blender actions, only into the study."""
import argparse,json,math,runpy,sys
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3'
ART=runpy.run_path(str(Path(__file__).with_name('export_scenes.py')),run_name='art_library')
parser=argparse.ArgumentParser()
parser.add_argument('--unit',choices=['clubman','knight','both'],default='both')
parser.add_argument('--frames',default=','.join(str(i) for i in range(16)))
parser.add_argument('--samples',type=int,default=48)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
frames=[int(value) for value in args.frames.split(',')]
assert frames and all(0<=frame<16 for frame in frames)
for unit in ['clubman','knight'] if args.unit=='both' else [args.unit]:
    bpy.ops.wm.open_mainfile(filepath=str(STAGE/unit/f'unit-{unit}.blend'))
    scene=bpy.context.scene
    assert scene['animation_study_revision']==3
    actions=json.loads(scene['animation_study_actions'])
    ART['configure_renderer'](args.samples)
    assert (scene.render.resolution_x,scene.render.resolution_y)==(256,256)
    for frame in frames:
        clip='walk' if frame<8 else 'attack'
        for name,action_name in actions[clip].items():
            bpy.data.objects[name].animation_data.action=bpy.data.actions[action_name]
        scene.frame_set(frame%8)
        ART['render_atomic'](STAGE/unit/'frames'/f'{frame:02d}.png')
    print('STUDY_RENDERED',unit,frames,flush=True)
