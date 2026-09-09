"""Read nominal unit data and actual Blender camera projection for gait planning."""
import hashlib,json
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3'
source=ROOT/'data/units.json'
catalog={'status':'nominal design targets; only staged studies have measured contact evidence',
         'unit_data_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'units':{}}
for unit in json.loads(source.read_text()):
    uid=unit['id'];path=ROOT/f'art/blender/unit-{uid}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene;camera=scene.camera
    scale=.57 if uid in ['super-heavy','mech'] else .51 if uid in ['dino-rider','knight','cavalry','tank','ballista','cannon'] else .43
    right=camera.matrix_world.to_3x3().col[0].copy();right.z=0;right.normalize()
    projected=world_to_camera_view(scene,camera,right)-world_to_camera_view(scene,camera,Vector())
    raw=projected.x*256;distance=unit['speed']*.520
    motion='mounted' if uid in ['dino-rider','knight','cavalry'] else 'wheel-or-track' if uid in ['ballista','cannon','tank'] else 'mechanical-biped' if uid=='mech' else 'biped'
    catalog['units'][uid]={'nominalSpeedPxPerSecond':unit['speed'],'referenceDisplayScale':scale,
        'cycleDistancePixels':round(distance,4),'nominalCycleDurationMs':520,'rawPixelsPerWorldUnit':raw,
        'cycleDistanceBlenderWorld':distance/(raw*scale),'nominalPixelsPer65msSample':unit['speed']*.065,
        'motionKind':motion,'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'footContactVerified':uid in ['clubman','knight','rifleman','sniper'],
        'note':'Wheel/track circumference must be measured before accepting a 520ms mechanical loop.' if motion=='wheel-or-track' else 'Target stride; exact anatomy and contact require per-family audit.'}
assert len(catalog['units'])==20
(STAGE/'gait-catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
rows=['# Nominale Gangstrecken aus Daten und Quellenprojektion','','| Typ | Tempo px/s | Skala | Zyklus px | Zyklus Blender | px je 65 ms | Bewegung |','|---|---:|---:|---:|---:|---:|---|']
for uid,r in catalog['units'].items():rows.append(f'| {uid} | {r["nominalSpeedPxPerSecond"]} | {r["referenceDisplayScale"]} | {r["cycleDistancePixels"]:.2f} | {r["cycleDistanceBlenderWorld"]:.4f} | {r["nominalPixelsPer65msSample"]:.2f} | {r["motionKind"]} |')
rows.extend(['','Diese Werte sind rechnerische Entwurfsziele. Fußkontakte sind bisher nur in den isolierten Studien von clubman, knight, rifleman und sniper geprüft. Bei Rädern/Ketten ist die mechanisch passende Schleifenstrecke nach Umfang/Gliedabstand noch offen. Kamera und Quellen wurden ausschließlich gelesen.'])
(STAGE/'GAIT_CATALOG.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
print('GAIT_CATALOG',len(catalog['units']),'sources read; no production mutation')
