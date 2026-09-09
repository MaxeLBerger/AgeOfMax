"""Measure rendered-source soles against nominal, half-speed and stopped movement."""
import json,math,sys
from pathlib import Path
import bpy
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_ranged_animation_study as BUILD
import audit_animation_study as COMMON
BUILD.STAGE=BUILD.ROOT/'art/blender/candidates/animation-v3/ranged-family-2'
catalog=json.loads((BUILD.STAGE.parent/'gait-catalog.json').read_text())
results={}
for unit in ['musketeer','laser-soldier','plasma-trooper']:
    directory=BUILD.STAGE/unit
    bpy.ops.wm.open_mainfile(filepath=str(directory/f'unit-{unit}.blend'))
    scene=bpy.context.scene;actions=json.loads(scene['animation_study_actions'])
    for name,action in actions['walk'].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
    soles=[bpy.data.objects[name] for name in ['Boot sole','Boot sole.001']]
    unit_data=catalog['units'][unit];speed=unit_data['nominalSpeedPxPerSecond'];scale=unit_data['referenceDisplayScale']
    measurements=[]
    for mode in ['distance-driven','fixed-clock-counterexample']:
        for ratio in [1,.5,0]:
            groups={};max_drift=0
            for index in range(257):
                seconds=index/256*.520
                cycle=seconds/.520*(ratio if mode=='distance-driven' else 1)
                frame=(cycle%1)*8
                scene.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
                for leg,(sole,offset) in enumerate(zip(soles,[0,.5])):
                    phase=cycle+offset
                    if phase%1>=.60:continue
                    projected=world_to_camera_view(scene,scene.camera,COMMON.center(sole))
                    game_x=projected.x*256*scale+speed*ratio*seconds
                    group=(leg,math.floor(phase))
                    if group not in groups:groups[group]=game_x
                    max_drift=max(max_drift,abs(game_x-groups[group]))
            if mode=='distance-driven':assert max_drift<.005,(unit,ratio,max_drift)
            measurements.append({'phase_model':mode,'actual_speed_fraction':ratio,'max_stance_world_screen_drift_pixels':max_drift})
    results[unit]={'passed':True,'nominal_speed_pixels_per_second':speed,'cycle_distance_pixels':speed*.520,
        'reference_display_scale':scale,'samples_per_scenario':257,'measurements':measurements,
        'nominal_frame_hold_quantization_bound_pixels':speed*.065,
        'limits':'Continuous Blender samples prove stance geometry. Eight discrete images still quantize motion. Abrupt stop/idle transition requires runtime review.',
        'source_sha256':COMMON.digest(directory/f'unit-{unit}.blend')}
BUILD.ART['write_json_atomic'](BUILD.STAGE/'gait-motion-evidence.json',results)
print(json.dumps(results,indent=2))
