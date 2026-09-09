"""Render only the four isolated ranged animation sources and selected samples."""
import argparse,json,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_shooter_family as BUILD
parser=argparse.ArgumentParser()
parser.add_argument('--unit',choices=['musketeer','laser-soldier','plasma-trooper','both'],default='both')
parser.add_argument('--faction',choices=['player','enemy','both'],default='both')
parser.add_argument('--frames',default=','.join(map(str,range(16))))
parser.add_argument('--samples',type=int,default=48)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
frames=[int(n) for n in args.frames.split(',')];assert frames and all(0<=n<16 for n in frames)
for unit in ['musketeer','laser-soldier','plasma-trooper'] if args.unit=='both' else [args.unit]:
    for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:
        key=unit+('-enemy' if faction=='enemy' else '');directory=BUILD.STAGE/key
        bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{key}.blend'))
        scene=bpy.context.scene;assert scene['animation_study_revision']==3
        actions=json.loads(scene['animation_study_actions']);BUILD.ART['configure_renderer'](args.samples)
        assert (scene.render.resolution_x,scene.render.resolution_y)==(256,256)
        for frame in frames:
            for name,action in actions['walk' if frame<8 else 'attack'].items():
                bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
            scene.frame_set(frame%8)
            BUILD.ART['render_atomic'](directory/'frames'/f'{frame:02d}.png')
        print('RANGED_STUDY_RENDERED',key,frames,flush=True)
