"""Author a staged, editable future citadel over the saved valley scene.

No canonical files are modified. Geometry is rebuilt deterministically from an
immutable stage-local baseline, so rerunning never duplicates architectural parts.
"""
import argparse
import hashlib
import json
import math
import runpy
import shutil
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
STAGE = ROOT / 'art/blender/candidates/future-v2'
OLD_GROUPS = ('Aether city tower', 'Vertical luminous spine', 'Crown floating collar',
              'Orbital horizon gate', 'Orbital energised inner rim', 'Gate stabilizer')
LIB = runpy.run_path(str(Path(__file__).with_name('export_scenes.py')), run_name='art_library')
PREFIX = 'Citadel / '


def serial(value):
    if isinstance(value, (float, int, str, bool)):
        return round(value, 8) if isinstance(value, float) else value
    try:
        return [serial(item) for item in value]
    except TypeError:
        return str(value)


def fingerprint(obj):
    data = {'name': obj.name, 'type': obj.type, 'matrix': serial(obj.matrix_world),
            'modifiers': [(m.name, m.type) for m in obj.modifiers]}
    if obj.type == 'MESH':
        data.update(vertices=[serial(v.co) for v in obj.data.vertices],
                    polygons=[(list(p.vertices), p.material_index) for p in obj.data.polygons],
                    materials=[m.name for m in obj.data.materials])
    if obj.type == 'CAMERA':
        data.update(ortho_scale=obj.data.ortho_scale, lens=obj.data.lens, camera_type=obj.data.type)
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def material(name, color, rough=.5, metal=0, emission=0):
    mat = bpy.data.materials.new(PREFIX + name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def finish(obj, name, mat, bevel=0):
    obj.name = PREFIX + name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    ARCH.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Fabricated edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    return obj


def box(name, loc, dims, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cylinder(name, loc, radius, depth, mat, vertices=24, bevel=.02):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    return finish(bpy.context.object, name, mat, bevel)


def beam(name, a, b, width, depth, mat):
    a, b = Vector(a), Vector(b)
    obj = box(name, (a+b)/2, (width, depth, (b-a).length), mat, .025)
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return obj


def mesh(name, vertices, faces, mat, bevel=.025):
    data = bpy.data.meshes.new(PREFIX + name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(PREFIX + name, data)
    ARCH.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Fabricated edge radius', 'BEVEL')
        mod.width, mod.segments = bevel, 2
    return obj


def tapered(name, x, y, bottom, top, width, depth, taper, mat):
    vertices = [(x+sx*width*s/2, y+sy*depth*s/2, z)
                for z, s in [(bottom, 1), (top, taper)] for sx, sy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    return mesh(name, vertices, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], mat)


def arc(name, center, inner, outer, start, end, depth, mat, segments=12):
    x, y, z = center
    vertices = []
    for yy in [y-depth/2, y+depth/2]:
        for r in [inner, outer]:
            for i in range(segments+1):
                a = start + (end-start)*i/segments
                vertices.append((x+r*math.cos(a), yy, z+r*math.sin(a)))
    n = segments+1
    faces = []
    for i in range(segments):
        faces.extend([(i,i+1,n+i+1,n+i), (2*n+i,3*n+i,3*n+i+1,2*n+i+1),
                      (i,2*n+i,2*n+i+1,i+1), (n+i,n+i+1,3*n+i+1,3*n+i)])
    faces.extend([(0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)])
    return mesh(name, vertices, faces, mat, .01)


def glazing_grid(name, x, front_y, bottom, rows, columns, width, row_height=.43):
    for row in range(rows):
        for col in range(columns):
            xx = x + (col-(columns-1)/2)*width/columns
            zz = bottom+(row+.5)*row_height
            # Occupied rooms are scattered deterministically inside deep dark bays.
            occupied = (row*3+col*5+int(abs(x)*10)) % 7 in [0,1]
            box(name+' inset room', (xx,front_y,zz), (width/columns-.075,.025,row_height-.12),
                LIT if occupied else GLASS, .008)
    for row in range(1,rows):
        box(name+' shadow sill',(x,front_y-.055,bottom+row*row_height),
            (width+.06,.16,.035), TITANIUM,.008)


def hall(x, y, base, width=3.0):
    box('Service hall foundation',(x,y,base-.13),(width+.45,2.9,.28), CONCRETE,.08)
    box('Service hall rear mass',(x,y+.25,base+.52),(width,1.7,1.04), CERAMIC,.07)
    box('Service hall deep front recess',(x,y-.68,base+.5),(width-.16,.15,.8), DARK,.025)
    glazing_grid('Service hall',x,y-.78,base+.1,2,5,width-.35,.4)
    for xx in [x-width/2+.10,x,x+width/2-.10]:
        box('Service hall structural pier',(xx,y-.82,base+.55),(.17,.45,1.1), CERAMIC,.025)
    box('Service hall floating roof slab',(x,y-.1,base+1.15),(width+.45,2.7,.18), TITANIUM,.04)
    for xx in [x-width*.35,x,x+width*.35]:
        box('Service hall rooftop heat exchanger',(xx,y+.25,base+1.32),(.38,1.28,.20), DARK,.02)
        for j in range(5):
            box('Service hall radiator fin',(xx,y-.22+j*.24,base+1.45),(.42,.045,.15), TITANIUM,.008)


def habitation(x, y, base, height, mirror=1):
    width, depth = 1.85, 1.7
    box('Habitation hillside footing',(x,y,base-.25),(2.7,2.4,.6), CONCRETE,.1)
    tapered('Habitation buttressed body',x,y,base,base+height,width,depth,.84,CERAMIC)
    box('Habitation recessed facade',(x,y-depth/2-.015,base+height*.49),(1.37,.05,height*.88), DARK,.02)
    rows = int((height-.5)/.43)
    glazing_grid('Habitation',x,y-depth/2-.05,base+.2,rows,3,1.2)
    # A separate narrow elevator stack and stepped occupied crown make a useful silhouette.
    box('Habitation external elevator spine',(x+mirror*1.04,y+.17,base+height*.42),(.32,1.05,height*.84), DARK,.03)
    for zz in [base+.35,base+height*.46,base+height*.82]:
        box('Habitation mechanical setback',(x,y,zz),(2.02,1.93,.17), TITANIUM,.035)
    for level in range(3):
        box('Habitation stepped crown',(x-mirror*.12*level,y+.1,base+height+.13+level*.23),
            (1.86-level*.36,1.76-level*.31,.25), TITANIUM if level==0 else CERAMIC,.04)
    box('Habitation rooftop aerial',(x-mirror*.32,y+.3,base+height+.94),(.06,.06,.5), DARK,.008)


def power_stack(x,y,base,height=3.5):
    cylinder('Power house foundation',(x,y,base-.08),1.2,.42,CONCRETE,12)
    cylinder('Power house dark core',(x,y,base+height/2),.77,height,DARK,24)
    for sector in range(12):
        angle = math.tau*sector/12
        xx, yy = x+math.cos(angle)*.82,y+math.sin(angle)*.82
        obj=box('Power house structural fin',(xx,yy,base+height*.46),(.16,.32,height*.92),CERAMIC,.025)
        obj.rotation_euler.z=angle
    cylinder('Power house crown bearing',(x,y,base+height),1.04,.18,TITANIUM,24)
    cylinder('Power house ventilator darkness',(x,y,base+height+.12),.81,.2,DARK,24)
    for sector in range(8):
        angle=math.tau*sector/8
        obj=box('Power house open turbine blade',(x+math.cos(angle)*.46,y+math.sin(angle)*.46,base+height+.3),(.8,.13,.16),TITANIUM,.018)
        obj.rotation_euler.z=angle+.4
    cylinder('Power house raised hub',(x,y,base+height+.30),.19,.25,BRONZE,16)


def observatory(x,y,base,height=2.7):
    box('Observatory hillside base',(x,y,base+.38),(2.15,2.0,.82),CONCRETE,.08)
    tapered('Observatory broad pedestal',x,y,base+.55,base+height-.6,1.45,1.4,.76,CERAMIC)
    cylinder('Observatory faceted glazed gallery',(x,y,base+height-.34),1.25,.67,GLASS,8,.02)
    for sector in range(8):
        angle=math.tau*sector/8
        box('Observatory gallery mullion',(x+math.cos(angle)*1.16,y+math.sin(angle)*1.16,base+height-.32),(.075,.075,.7),TITANIUM,.01)
    cylinder('Observatory wide weather hood',(x,y,base+height+.06),1.42,.19,CERAMIC,8,.04)
    cylinder('Observatory sensor plinth',(x,y,base+height+.28),.56,.3,DARK,8,.02)
    beam('Observatory angled sensor mast',(x,y,base+height+.35),(x+.32,y,base+height+.95),.06,.06,TITANIUM)
    box('Observatory sensor plate',(x+.34,y,base+height+.91),(.55,.14,.28),TITANIUM,.03)


def design():
    # The large low podium ties the smaller ring and distinct tower families into a settlement.
    box('Terrace lowest retaining wall',(0,22.45,.30),(12.0,5.1,1.20),CONCRETE,.10)
    box('Terrace intermediate inhabited platform',(0,22,1.0),(10.65,4.75,.34),CERAMIC,.08)
    box('Terrace upper ring dais',(0,22,1.27),(7.55,3.55,.23),TITANIUM,.07)
    box('Terrace front dark drainage joint',(0,18.45,.67),(11.5,.045,.09),DARK,.015)
    for step in range(7):
        height=.43+step*.135
        box('Processional stair tread',(0,17.9+step*.35,height/2),(2.25,.39,height),CERAMIC,.018)
    # Low parapets deliberately stop before the combat band's screen-space edge.
    for x in [-5.2,5.2]:
        box('Terrace parapet',(x,19.7,1.23),(.18,2.55,.46),CERAMIC,.035)
    hall(-4.1,22.1,1.0,2.8)
    hall(4.1,22.1,1.0,2.8)
    center=(0,22,4.25)
    arc('Ring inner graphite race',center,2.47,2.64,0,math.tau,.48,DARK,96)
    arc('Ring recessed cyan aperture',(0,21.748,4.25),2.475,2.504,0,math.tau,.022,CYAN,96)
    for segment in range(12):
        middle=math.tau*(segment+.5)/12
        a,b=math.tau*segment/12+.018, math.tau*(segment+1)/12-.018
        arc('Ring segmented titanium shell',center,2.63,2.87,a,b,.53,TITANIUM,8)
        arc('Ring ceramic protective face',(0,21.706,4.25),2.69,2.83,a+.025,b-.025,.07,CERAMIC,8)
        arc('Ring bronze compression joint',(0,22,4.25),2.57,2.92,a-.025,a+.012,.65,BRONZE,2)
        # Real housings at cardinal sectors add construction logic without filling the aperture.
        if segment in [1,4,7,10]:
            xx,zz=math.cos(middle)*2.94,4.25+math.sin(middle)*2.94
            obj=box('Ring servicing cassette',(xx,22,zz),(.26,.82,.51),DARK,.04)
            obj.rotation_euler.y=math.pi/2-middle
    for sign in [-1,1]:
        box('Ring buttress foundation',(sign*3.55,22,1.35),(1.15,2,.4),CONCRETE,.07)
        beam('Ring load bearing diagonal',(sign*3.65,22,1.53),(sign*2.34,22,2.92),.44,.82,CERAMIC)
        beam('Ring exposed diagonal spine',(sign*3.58,21.54,1.59),(sign*2.35,21.54,2.90),.14,.14,BRONZE)
        box('Ring lateral service bearing',(sign*2.37,22,2.95),(.64,1.0,.48),DARK,.07)
        for z in [2.84,3.06]:
            bolt=cylinder('Ring bearing fastener',(sign*2.37,21.47,z),.06,.045,BRONZE,12,.008)
            bolt.rotation_euler.x=math.pi/2
    box('Ring lower cradle',(0,22,1.52),(1.15,1.1,.23),DARK,.035)
    # Asymmetric masses and three architectural families replace nine repeated obelisks.
    habitation(-8.45,27.3,.45,4.35,-1)
    habitation(8.7,29.0,.45,4.85,1)
    power_stack(-5.55,29.4,.3,3.9)
    power_stack(5.65,30.3,.25,3.1)
    observatory(-11.4,27.5,.3,2.75)
    observatory(11.25,24.6,.0,3.0)
    # Elevated service conduits join real structures; both ends sit on load-bearing piers.
    for sign in [-1,1]:
        box('Enclosed service bridge',(sign*6.9,28,2.0),(2.3,.65,.53),DARK,.045)
        box('Service bridge weather cap',(sign*6.9,28,2.30),(2.4,.82,.12),TITANIUM,.025)
        for dx in [-.7,0,.7]:
            box('Service bridge inset light',(sign*6.9+dx,27.663,2.02),(.38,.023,.15),LIT,.008)
        for dx in [-.88,.88]:
            box('Service bridge pier',(sign*6.9+dx,28,1.05),(.21,.52,1.45),CERAMIC,.025)


def projected_bounds(objects):
    bpy.context.view_layer.update()
    scene=bpy.context.scene
    coords=[]
    deps=bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != 'MESH':
            continue
        evaluated=obj.evaluated_get(deps)
        data=evaluated.to_mesh()
        for vertex in data.vertices:
            point=world_to_camera_view(scene,scene.camera,evaluated.matrix_world @ vertex.co)
            coords.append((point.x*1600,(1-point.y)*900))
        evaluated.to_mesh_clear()
    return {'left':min(x for x,y in coords),'top':min(y for x,y in coords),
            'right':max(x for x,y in coords),'bottom':max(y for x,y in coords)}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--model-only',action='store_true')
    parser.add_argument('--render-only',action='store_true')
    parser.add_argument('--samples',type=int,default=64)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    STAGE.mkdir(parents=True,exist_ok=True)
    baseline=STAGE/'baseline'
    baseline.mkdir(exist_ok=True)
    for source,target in [(ROOT/'art/blender/background-future.blend',baseline/'background-future.blend'),
                          (ROOT/'public/assets/reborn/backgrounds/future.png',baseline/'future.png')]:
        if not target.exists():
            shutil.copy2(source,target)
    if args.render_only:
        bpy.ops.wm.open_mainfile(filepath=str(STAGE/'background-future.blend'))
        LIB['configure_renderer'](args.samples)
        LIB['render_atomic'](STAGE/'future.png')
        return
    bpy.ops.wm.open_mainfile(filepath=str(baseline/'background-future.blend'))
    global ARCH,CERAMIC,CONCRETE,DARK,TITANIUM,BRONZE,GLASS,LIT,CYAN
    protected=[obj for obj in bpy.data.objects if not any(obj.name.startswith(name) for name in OLD_GROUPS)]
    before={obj.name:fingerprint(obj) for obj in protected}
    material_before={mat.name:serial(mat.diffuse_color) for mat in bpy.data.materials}
    removed=[]
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(name) for name in OLD_GROUPS):
            removed.append(obj.name)
            bpy.data.objects.remove(obj,do_unlink=True)
    ARCH=bpy.data.collections.new('Future citadel / authored architecture v2')
    bpy.context.scene.collection.children.link(ARCH)
    CERAMIC=material('warm mineral ceramic',(.46,.46,.405),.48,.12)
    CONCRETE=material('weathered retaining stone',(.22,.245,.225),.8,.03)
    DARK=material('graphite structural alloy',(.035,.060,.073),.42,.62)
    TITANIUM=material('pale titanium edgework',(.32,.42,.45),.29,.72)
    BRONZE=material('bronze mechanical connections',(.35,.20,.075),.32,.70)
    GLASS=material('recessed smoked glazing',(.013,.041,.058),.18,.55)
    LIT=material('occupied amber rooms',(.60,.35,.14),.34,.15,.35)
    CYAN=material('aperture calibration seam',(.04,.6,.72),.28,.35,2.0)
    design()
    bpy.context.view_layer.update()
    after={obj.name:fingerprint(obj) for obj in protected}
    changed=[name for name in before if before[name]!=after[name]]
    assert not changed,changed
    assert all(serial(bpy.data.materials[name].diffuse_color)==color for name,color in material_before.items())
    bounds=projected_bounds(list(ARCH.objects))
    ring_bounds=projected_bounds([obj for obj in ARCH.objects if obj.name.startswith(PREFIX+'Ring')])
    assert ring_bounds['top']>102.5,ring_bounds
    assert bounds['bottom']<512.5,bounds
    scene=bpy.context.scene
    assert (scene.render.resolution_x,scene.render.resolution_y)==(1600,900)
    scene['authored_background_revision']=2
    scene['authored_background_design']='Terraced citadel, supported segmented ring, habitation / power / observatory families'
    LIB['configure_renderer'](args.samples)
    LIB['save_scene'](STAGE/'background-future.blend')
    report={'passed':True,'source':'background-future.blend','removed_objects':removed,
            'architecture_objects':len(ARCH.objects),'preserved_objects':len(protected),
            'changed_protected_objects':changed,'protected_hashes':before,
            'camera_hash':before[scene.camera.name],
            'terrain_hash':before['Sculpted continuous valley'],
            'architecture_bounds_native_1600x900':bounds,'ring_bounds_native_1600x900':ring_bounds,
            'ring_top_runtime_1280x720':ring_bounds['top']*.8,
            'combat_band_runtime':[410,525],'resolution':[1600,900],
            'geometry_contract':'All new geometry stays above native y512.5 / runtime y410. Lighting can differ.'}
    LIB['write_json_atomic'](STAGE/'source-check.json',report)
    if not args.model_only:
        LIB['render_atomic'](STAGE/'future.png')
    print(json.dumps({key:value for key,value in report.items() if key not in ['protected_hashes','removed_objects']},indent=2))


if __name__=='__main__':
    main()
