"""Reopen all ten authored melee sources and compare original scene contracts."""
import hashlib,json,sys
from pathlib import Path
import bpy
from mathutils import Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_melee_animation_study as BUILD

def serial(value):
    if isinstance(value,(str,bool,float,int)):return value
    try:return list(value)
    except TypeError:return str(value)
def material_state():
    result={}
    for material in bpy.data.materials:
        record={'diffuse':list(material.diffuse_color),'roughness':material.roughness,'metallic':material.metallic}
        if material.use_nodes:
            record['nodes']={n.name:{'type':n.type,'inputs':{i.identifier:serial(i.default_value) for i in n.inputs if hasattr(i,'default_value')}} for n in material.node_tree.nodes}
            record['ramps']={n.name:[(e.position,list(e.color)) for e in n.color_ramp.elements] for n in material.node_tree.nodes if hasattr(n,'color_ramp')}
            record['links']=[(link.from_node.name,link.from_socket.identifier,link.to_node.name,link.to_socket.identifier) for link in material.node_tree.links]
        result[material.name]=record
    return result
report={}
for unit in BUILD.UNITS:
    for suffix in ['', '-enemy']:
        key=unit+suffix;directory=BUILD.STAGE/key
        model=json.loads((directory/'model-check.json').read_text());inspection=json.loads((directory/'source-inspection.json').read_text())
        source=directory/f'unit-{key}.blend';before=BUILD.digest(source)
        original=directory/'baseline'/f'unit-{key}.blend'
        assert BUILD.digest(original)==model['source_hashes']['source']
        assert BUILD.digest(directory/'baseline'/f'{unit}.png')==model['source_hashes']['sheet']
        bpy.ops.wm.open_mainfile(filepath=str(original),load_ui=False);original_materials=material_state()
        referenced_materials={m.name for o in bpy.data.objects if o.type=='MESH' for m in o.data.materials if m}
        bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False);scene=bpy.context.scene
        current_materials=material_state()
        assert all(current_materials.get(name)==original_materials[name] for name in referenced_materials),('Referenced team material changed',key)
        removed_unused=sorted(set(original_materials)-set(current_materials))
        assert not set(removed_unused)&referenced_materials
        camera={'matrix':[list(row) for row in scene.camera.matrix_world],'scale':scene.camera.data.ortho_scale,'resolution':[scene.render.resolution_x,scene.render.resolution_y]}
        assert camera==inspection['camera'],('Camera changed',key)
        rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
        assert all(BUILD.bone_record(rig)[name]==record for name,record in model['original_bones'].items())
        actions=json.loads(scene['animation_study_actions']);gait=json.loads(scene['animation_study_gait'])
        assert gait==json.loads((directory/'gait-metadata.partial.json').read_text())[unit]
        assert scene['animation_study_revision']==3 and set(actions)=={'walk','attack'} and len(gait)==7
        for clip,objects in actions.items():
            for name,action in objects.items():
                assert name in bpy.data.objects and action in bpy.data.actions
                curves=bpy.data.actions[action].fcurves;assert curves
                assert all(len(curve.keyframe_points)==model['key_counts'][clip] for curve in curves)
                assert all(abs(curve.keyframe_points[0].co.x)<1e-6 and abs(curve.keyframe_points[-1].co.x-8)<1e-6 for curve in curves)
        rig.animation_data_clear()
        for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
        bpy.context.view_layer.update()
        actual={o.name:BUILD.COMMON.mesh_contract(o,bindings=unit=='super-heavy') for o in bpy.data.objects if o.type=='MESH'}
        assert actual==model['mesh_contracts'],('Rest geometry changed on disk',key)
        if unit=='super-heavy':assert len(rig.data.bones)==16 and scene['authored_character_revision']==2
        assert BUILD.digest(source)==before
        report[key]={'passed':True,'source_sha256':before,'camera_preserved':True,'all_referenced_material_inputs_links_and_color_ramps_preserved':True,'unused_unreferenced_materials_omitted_by_blender_save':removed_unused,'original_rest_meshes_preserved':True,'original_bones_preserved':True,'all_original_bindings_preserved':unit=='super-heavy','source_file_unchanged_by_validation':True,'original_backups_verified':True,'bone_count':len(rig.data.bones),'mesh_count':len(actual),'gait':gait,'key_counts':model['key_counts']}
BUILD.ART['write_json_atomic'](BUILD.STAGE/'source-preservation.json',report)
print('ALL_TEN_MELEE_SOURCES_PRESERVED',json.dumps({k:{n:v for n,v in r.items() if n not in ['gait','key_counts']} for k,r in report.items()}),flush=True)