"""Render only isolated melee candidates; no source or runtime asset writes."""
import argparse,json,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_melee_animation_study as BUILD
parser=argparse.ArgumentParser()
parser.add_argument('--unit',choices=list(BUILD.UNITS)+['both'],default='both')
parser.add_argument('--faction',choices=['player','enemy','both'],default='player')
parser.add_argument('--frames',default='0,2,10,12,14')
parser.add_argument('--samples',type=int,default=48)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
frames=[int(v) for v in args.frames.split(',')]
assert frames and all(0<=v<16 for v in frames)
for unit in BUILD.UNITS if args.unit=='both' else [args.unit]:
    for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:
        key=unit+('-enemy' if faction=='enemy' else '');directory=BUILD.STAGE/key
        bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{key}.blend'),load_ui=False)
        scene=bpy.context.scene
        assert scene['animation_study_revision']==3
        assert (scene.render.resolution_x,scene.render.resolution_y)==(256,256)
        actions=json.loads(scene['animation_study_actions']);BUILD.ART['configure_renderer'](args.samples)
        for frame in frames:
            for name,action in actions['walk' if frame<8 else 'attack'].items():
                bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
            scene.frame_set(frame%8);bpy.context.view_layer.update()
            BUILD.ART['render_atomic'](directory/'frames'/f'{frame:02d}.png')
        print('MELEE_FRAMES_RENDERED',key,frames,flush=True)
