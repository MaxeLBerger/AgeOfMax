"""Render isolated mechanical sources; optional unexported loop closures."""
import argparse,json,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent))
import build_machine_animation_study as BUILD
p=argparse.ArgumentParser()
p.add_argument('--unit',choices=['cannon','tank','both'],default='both')
p.add_argument('--faction',choices=['player','enemy','both'],default='both')
p.add_argument('--frames',default=','.join(map(str,range(16))))
p.add_argument('--samples',type=int,default=48)
p.add_argument('--closures',action='store_true')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
frames=[int(n) for n in args.frames.split(',')]
assert frames and all(0<=n<16 for n in frames)
for unit in BUILD.SPEED if args.unit=='both' else [args.unit]:
 for faction in ['player','enemy'] if args.faction=='both' else [args.faction]:
  key=unit+('-enemy' if faction=='enemy' else '')
  directory=BUILD.STAGE/key
  bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{key}.blend'))
  scene=bpy.context.scene;assert scene['animation_study_revision']==3
  actions=json.loads(scene['animation_study_actions'])
  BUILD.ART['configure_renderer'](args.samples)
  assert (scene.render.resolution_x,scene.render.resolution_y)==(256,256)
  manifest_path=directory/'frame-manifest.json'
  manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
  source_hash=BUILD.digest(directory/f'unit-{key}.blend')
  targets=[('walk' if i<8 else 'attack',i%8,f'{i:02d}.png') for i in frames]
  if args.closures:targets.extend([('walk',8,'walk-closure.png'),('attack',8,'attack-closure.png')])
  for clip,frame,name in targets:
   for obj,action in actions[clip].items():bpy.data.objects[obj].animation_data.action=bpy.data.actions[action]
   scene.frame_set(frame);bpy.context.view_layer.update()
   BUILD.ART['render_atomic'](directory/'frames'/name)
   manifest[name]={'source_sha256':source_hash,'png_sha256':BUILD.digest(directory/'frames'/name),
                   'clip':clip,'action_frame':frame,'samples':args.samples}
   BUILD.write_json(manifest_path,manifest)
  print('MACHINE_STUDY_RENDERED',key,[x[2] for x in targets],flush=True)
