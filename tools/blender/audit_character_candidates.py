"""Verify staged rig contact, actual planted soles and repeatable canonical exports."""
import json
import math
import runpy
import shutil
from pathlib import Path

import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/heavy-sniper-v1'
REPRO=STAGE/'reproduction-check'
REPRO.mkdir(exist_ok=True)
UNITS=['super-heavy','sniper']
issues=[];records=[]
art=runpy.run_path(str(ROOT/'tools/blender/export_scenes.py'),run_name='art_library')
art['export_unit'].__globals__['SOURCE']=REPRO


def center(obj):
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    vertices=[evaluated.matrix_world@vertex.co for vertex in evaluated.data.vertices]
    return sum(vertices,Vector())/len(vertices)


def geometry_snapshot():
    scene=bpy.context.scene
    snapshots=[]
    rig=next(obj for obj in bpy.data.objects if obj.type=='ARMATURE')
    for frame in range(1,9):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        snapshots.append({bone.name:[round(value,6) for row in bone.matrix for value in row]
                          for bone in rig.pose.bones})
    return {'meshes':sorted(obj.name for obj in scene.objects if obj.type=='MESH'),
            'bones':list(rig.data.bones.keys()),'poses':snapshots}


for uid in UNITS:
    for suffix in ['', '-enemy']:
        path=STAGE/f'unit-{uid}{suffix}.blend'
        bpy.ops.wm.open_mainfile(filepath=str(path))
        scene=bpy.context.scene
        assert scene['authored_character_revision']==2
        assert scene.get('runtime_weapon_mesh') in bpy.data.objects
        feet=[obj for obj in bpy.data.objects if obj.name.startswith(
              'Titan broad planted outsole' if uid=='super-heavy' else 'Boot sole')]
        assert len(feet)==2
        foot_positions=[]
        for frame in range(5,9):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            foot_positions.append([center(obj) for obj in feet])
        drift=max((position-foot_positions[0][index]).length for positions in foot_positions
                  for index,position in enumerate(positions))
        if drift>.0001:issues.append(f'Actual sole mesh slides: {uid}{suffix}, {drift}')
        scene.frame_set(7)
        grip_evidence={}
        if uid=='sniper':
            eye=center(bpy.data.objects['Eye socket'])
            ocular=center(bpy.data.objects['Sniper eyepiece rubber'])
            difference=ocular-eye
            grip_evidence={'eye':list(eye),'ocular':list(ocular),'ocularMinusEye':list(difference)}
            if not 0<difference.x<.20 or abs(difference.y)>.06 or abs(difference.z)>.06:
                issues.append(f'Sniper ocular is not aligned with eye: {list(difference)}')
        records.append({'source':path.name,'meshCount':sum(obj.type=='MESH' for obj in scene.objects),
                        'attackSoleDrift':drift,'gripEvidence':grip_evidence})
    shutil.copy2(STAGE/f'unit-{uid}.blend',REPRO/f'unit-{uid}.blend')
    bpy.ops.wm.open_mainfile(filepath=str(REPRO/f'unit-{uid}.blend'))
    before=geometry_snapshot()
    unit=next(unit for unit in art['UNITS'] if unit['id']==uid)
    for iteration in range(2):
        art['export_unit'](unit,['player','enemy'],64,render_frames=False)
        bpy.ops.wm.open_mainfile(filepath=str(REPRO/f'unit-{uid}.blend'))
        after=geometry_snapshot()
        if before!=after:
            issues.append(f'Canonical exporter changed geometry or animation: {uid}, pass {iteration+1}')

report={'status':'passed' if not issues else 'failed','openedSources':4,
        'repeatExportPasses':4,'issues':issues,'records':records}
(STAGE/'source-validation.json').write_text(json.dumps(report,indent=2))
print('CANDIDATE_SOURCE_AUDIT='+json.dumps(report))
raise SystemExit(bool(issues))
