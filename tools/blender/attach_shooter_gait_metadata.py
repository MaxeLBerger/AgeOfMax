"""Attach the measured seven-field gait contract to completed staged sources only."""
import hashlib,json,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_ranged_animation_study as STUDY
ROOT=STUDY.ROOT
FAMILIES={'ranged-family':['rifleman','sniper'],'ranged-family-2':['musketeer','laser-soldier','plasma-trooper']}
DATA={unit['id']:unit for unit in json.loads((ROOT/'data/units.json').read_text())}


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def scene_signature():
    def vector(v):return [float(n) for n in v]
    record={'frame':bpy.context.scene.frame_current,'actions':{},'objects':{},'materials':{},
            'clip_mapping':bpy.context.scene['animation_study_actions']}
    for action in bpy.data.actions:
        record['actions'][action.name]=[(c.data_path,c.array_index,c.extrapolation,
            [(vector(k.co),vector(k.handle_left),vector(k.handle_right),k.interpolation) for k in c.keyframe_points]) for c in action.fcurves]
    for obj in bpy.data.objects:
        item={'type':obj.type,'matrix':[vector(row) for row in obj.matrix_world],
              'parent':obj.parent.name if obj.parent else None,'hide_render':obj.hide_render,
              'modifiers':[(m.name,m.type) for m in obj.modifiers]}
        if obj.type=='MESH':
            item.update(vertices=[vector(v.co) for v in obj.data.vertices],polygons=[(list(p.vertices),p.material_index) for p in obj.data.polygons],
                groups=list(obj.vertex_groups.keys()),weights=[[(g.group,g.weight) for g in v.groups] for v in obj.data.vertices],
                materials=[m.name for m in obj.data.materials])
        if obj.type=='ARMATURE':item['bones']=[(b.name,vector(b.head_local),vector(b.tail_local),b.parent.name if b.parent else None) for b in obj.data.bones]
        if obj.type=='CAMERA':item['camera']=[obj.data.type,obj.data.ortho_scale,obj.data.lens,obj.data.shift_x,obj.data.shift_y]
        record['objects'][obj.name]=item
    for material in bpy.data.materials:
        nodes=[]
        if material.node_tree:
            for node in material.node_tree.nodes:
                inputs=[]
                for socket in node.inputs:
                    if not hasattr(socket,'default_value'):continue
                    value=socket.default_value
                    if isinstance(value,(float,int,str,bool)):inputs.append((socket.name,value))
                    else:
                        try:inputs.append((socket.name,list(value)))
                        except TypeError:pass
                nodes.append((node.name,node.type,inputs))
        record['materials'][material.name]=nodes
    return hashlib.sha256(json.dumps(record,sort_keys=True).encode()).hexdigest()


for family,units in FAMILIES.items():
    stage=ROOT/'art/blender/candidates/animation-v3'/family;results={};partial={}
    evidence_path=stage/'gait-motion-evidence.json';evidence=json.loads(evidence_path.read_text())
    for unit in units:
        speed=DATA[unit]['speed']
        gait={'nominalSpeedPxPerSecond':speed,'referenceDisplayScale':.43,'cycleDistancePixels':round(speed*.520,5),
              'nominalCycleDurationMs':520,'motionKind':'biped','stanceFraction':.6,'doubleSupportFrames':[0,4]}
        partial[unit]=gait
        for faction in ['player','enemy']:
            key=unit+('-enemy' if faction=='enemy' else '');directory=stage/key;source=directory/f'unit-{key}.blend'
            original_hash=digest(source);sheet_hash=digest(directory/f'{key}-16.png')
            bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene
            assert scene['animation_study_revision']==3
            signature=scene_signature();scene['animation_study_gait']=json.dumps(gait)
            STUDY.ART['save_scene'](source)
            bpy.ops.wm.open_mainfile(filepath=str(source))
            assert scene_signature()==signature,('scene changed beyond metadata',key)
            assert json.loads(bpy.context.scene['animation_study_gait'])==gait
            assert digest(directory/f'{key}-16.png')==sheet_hash
            STUDY.ART['write_json_atomic'](directory/'gait-metadata.partial.json',{unit:gait})
            model_path=directory/'model-check.json';model=json.loads(model_path.read_text());model['gait']=gait
            STUDY.ART['write_json_atomic'](model_path,model)
            updated_hash=digest(source)
            results[key]={'passed':True,'old_source_sha256':original_hash,'source_sha256':updated_hash,
                'geometry_binding_action_material_camera_signature':signature,'scene_preserved_except_gait_metadata':True,'render_sheet_unchanged':True}
            if faction=='player':
                evidence[unit]['source_sha256_before_gait_metadata']=evidence[unit]['source_sha256']
                evidence[unit]['source_sha256']=updated_hash
                evidence[unit]['metadata_only_update_preserved_scene_signature']=signature
            print('GAIT_METADATA_ATTACHED',key,flush=True)
    STUDY.ART['write_json_atomic'](stage/'gait-metadata.partial.json',partial)
    STUDY.ART['write_json_atomic'](stage/'metadata-update-check.json',results)
    STUDY.ART['write_json_atomic'](evidence_path,evidence)
