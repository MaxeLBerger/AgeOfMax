"""Measure actual grip mesh contact, independently of the wrist control point."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3'
for unit in ['clubman','knight']:
    bpy.ops.wm.open_mainfile(filepath=str(STAGE/unit/f'unit-{unit}.blend'))
    scene=bpy.context.scene;actions=json.loads(scene['animation_study_actions'])
    for name,action in actions['attack'].items():bpy.data.objects[name].animation_data.action=bpy.data.actions[action]
    for frame in [0,4,7]:
        scene.frame_set(frame);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
        shaft=bpy.data.objects['Carved club handle' if unit=='clubman' else 'Long ash spear'].evaluated_get(deps)
        data=shaft.to_mesh();points=[shaft.matrix_world@v.co for v in data.vertices]
        tree=BVHTree.FromPolygons(points,[list(p.vertices) for p in data.polygons]);shaft.to_mesh_clear()
        hand=bpy.data.objects['Hand'].evaluated_get(deps);data=hand.to_mesh()
        points=[hand.matrix_world@v.co for v in data.vertices];hand.to_mesh_clear()
        point=sum(points,Vector())/len(points)
        print(unit,frame,'center_to_haft_surface',tree.find_nearest(point)[3],'minimum_hand_surface_distance',min(tree.find_nearest(p)[3] for p in points))
