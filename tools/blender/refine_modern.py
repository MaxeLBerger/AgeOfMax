"""Author a bounded modern industrial architecture candidate in an existing valley.

Standalone bpy source: no original generator or external model dependencies.
Canonical/public assets are only read. Every output stays in the candidate folder.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import struct
import sys
import time
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
COLLECTION = None
CREATED = []
M = {}
TERRACES = []
TAU = math.tau


def replace_file(source, target):
    for attempt in range(12):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if attempt == 11:
                raise
            time.sleep(0.15)


def write_json(path, data):
    temporary = path.with_suffix('.writing.json')
    temporary.write_text(json.dumps(data, indent=2), encoding='utf-8')
    replace_file(temporary, path)


def lane_hash():
    obj = bpy.data.objects['Sculpted continuous valley']
    digest = hashlib.sha256()
    for vertex in obj.data.vertices:
        digest.update(struct.pack('<3f', *vertex.co))
    for polygon in obj.data.polygons:
        digest.update(struct.pack('<I', polygon.material_index))
        digest.update(struct.pack('<' + 'I' * len(polygon.vertices), *polygon.vertices))
    for row in obj.matrix_world:
        digest.update(struct.pack('<4f', *row))
    return digest.hexdigest()


def camera_contract():
    scene = bpy.context.scene
    camera = scene.camera
    return {'name': camera.name, 'matrix': [list(row) for row in camera.matrix_world],
            'type': camera.data.type, 'ortho_scale': camera.data.ortho_scale,
            'resolution': [scene.render.resolution_x, scene.render.resolution_y,
                           scene.render.resolution_percentage]}


def screen_bounds(objects):
    scene = bpy.context.scene
    points = [world_to_camera_view(scene, scene.camera, obj.matrix_world @ Vector(corner))
              for obj in objects if obj.type in {'MESH', 'CURVE'} for corner in obj.bound_box]
    return [round(min(p.x for p in points) * 1280, 2),
            round((1 - max(p.y for p in points)) * 720, 2),
            round(max(p.x for p in points) * 1280, 2),
            round((1 - min(p.y for p in points)) * 720, 2)]


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    COLLECTION.objects.link(obj)
    obj.parent = parent
    obj.location = location
    CREATED.append(obj)
    return obj


def mesh(name, vertices, faces, material, parent=None, bevel=0, smooth=False):
    data = bpy.data.meshes.new(name + '_Mesh')
    data.from_pydata(vertices, [], faces)
    data.validate()
    data.update()
    obj = bpy.data.objects.new(name, data)
    COLLECTION.objects.link(obj)
    obj.parent = parent
    if material:
        data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new('Hand dressed edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    if smooth:
        for face in data.polygons:
            face.use_smooth = True
    CREATED.append(obj)
    return obj


def box(name, center, size, material, parent=None, bevel=0.012):
    x, y, z = center
    a, b, c = (n / 2 for n in size)
    vertices = [(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
                (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)]
    faces = [(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    return mesh(name, vertices, faces, material, parent, bevel)


def cylinder(name, center, radius, height, material, parent=None, segments=16, top_radius=None):
    x, y, z = center
    other = radius if top_radius is None else top_radius
    vertices = [(x+r*math.cos(TAU*i/segments),y+r*math.sin(TAU*i/segments),z+h)
                for r,h in [(radius,-height/2),(other,height/2)] for i in range(segments)]
    faces = [tuple(reversed(range(segments))), tuple(range(segments, 2*segments))]
    faces.extend((i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments))
    return mesh(name, vertices, faces, material, parent, 0.008, segments > 12)


def line(name, points, radius, material, parent=None):
    curve = bpy.data.curves.new(name + '_Curve', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1)
    obj = bpy.data.objects.new(name, curve)
    COLLECTION.objects.link(obj)
    obj.parent = parent
    curve.materials.append(material)
    CREATED.append(obj)
    return obj


def extrude(name, polygon, front, depth, material, parent):
    n = len(polygon)
    vertices = [(x,y,z) for y in (front,front+depth) for x,z in polygon]
    faces = [tuple(reversed(range(n))), tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    return mesh(name, vertices, faces, material, parent)


def arch(name, x, front, spring, radius, width, depth, material, parent):
    steps = 20
    vertices = [(x+r*math.cos(math.pi*i/steps),y,spring+r*math.sin(math.pi*i/steps))
                for y in (front,front+depth) for r in (radius,radius+width)
                for i in range(steps+1)]
    stride = steps+1
    faces = []
    for i in range(steps):
        faces.extend([(i,i+1,i+1+stride,i+stride),
                      (i+2*stride,i+3*stride,i+1+3*stride,i+1+2*stride),
                      (i,i+2*stride,i+1+2*stride,i+1),
                      (i+stride,i+1+stride,i+1+3*stride,i+3*stride)])
    faces.extend([(0,stride,3*stride,2*stride),
                  (steps,steps+2*stride,steps+3*stride,steps+stride)])
    return mesh(name, vertices, faces, material, parent, 0.008)


def material(name, color, roughness, metallic=0, variation=0.06, bump=0.01):
    mat = bpy.data.materials.new('MOD_' + name)
    mat.diffuse_color = (*color,1)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 4.5
    noise.inputs['Detail'].default_value = 2.3
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*(v*(1-variation) for v in color),1)
    ramp.color_ramp.elements[1].color = (*(min(1,v*(1+variation)) for v in color),1)
    links.new(noise.outputs['Fac'], ramp.inputs[0])
    links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    grain = nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 42
    bump_node = nodes.new('ShaderNodeBump')
    bump_node.inputs['Strength'].default_value = 0.2
    bump_node.inputs['Distance'].default_value = bump
    links.new(grain.outputs['Fac'], bump_node.inputs['Height'])
    links.new(bump_node.outputs['Normal'], shader.inputs['Normal'])
    return mat


def soil_height(x, y):
    ground = bpy.data.objects['Sculpted continuous valley']
    inverse = ground.matrix_world.inverted()
    hit, point, normal, face = ground.ray_cast(inverse @ Vector((x,y,30)), Vector((0,0,-1)), distance=70)
    if not hit:
        raise RuntimeError('No soil below architecture at ' + str((x,y)))
    return (ground.matrix_world @ point).z



def terrace(name,x,y,width,depth,rotation=0):
    root=empty(name,(x,y,0))
    angle=math.radians(rotation);root.rotation_euler.z=angle
    corners=[(-width/2,-depth/2),(width/2,-depth/2),(width/2,depth/2),(-width/2,depth/2)]
    def world_xy(px,py):
        return x+px*math.cos(angle)-py*math.sin(angle),y+px*math.sin(angle)+py*math.cos(angle)
    heights=[soil_height(*world_xy(px,py)) for px,py in corners]+[soil_height(x,y)]
    top=max(heights)+.16
    # Poured retaining walls follow many real soil samples, rather than four
    # coarse corner heights. A few construction joints replace the stone blocks.
    perimeter=[]
    for index,(ax,ay) in enumerate(corners):
        bx,by=corners[(index+1)%4]
        count=max(2,math.ceil(math.hypot(bx-ax,by-ay)/.32))
        for sample in range(count):
            t=sample/count;px=ax+(bx-ax)*t;py=ay+(by-ay)*t
            perimeter.append((px,py,min(top-.025,soil_height(*world_xy(px,py))-.06)))
    n=len(perimeter)
    vertices=perimeter+[(px,py,top) for px,py,z in perimeter]
    faces=[tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh(name+'_PouredConcreteRetainingWall',vertices,faces,M['retaining'],root)
    box(name+'_ConcreteDeckEdge',(0,0,top+.045),(width+.08,depth+.08,.09),M['stone'],root)
    for index in range(1,math.ceil(width/1.5)):
        px=-width/2+index*1.5
        if px>width/2-.18:continue
        low=soil_height(*world_xy(px,-depth/2))-.025
        if top>low:
            box(name+'_ConcreteConstructionJoint',(px,-depth/2-.006,(top+low)/2),
                (.019,.015,top-low),M['joint'],root,0)
    floor=top+.09
    parent=empty(name+'_Superstructure',(0,0,floor),root)
    TERRACES.append({'name':name,'soil_heights':heights,'coping_top':floor,
                     'skirt_corner_penetration':.06,'perimeter_soil_samples':n,
                     'world_center':[x,y],'rotation':rotation,'retaining_material':'poured concrete'})
    return root,parent,floor

def create_materials():
    definitions={
      'stone':((.40,.43,.39),.85,0,.045,.014),
      'retaining':((.285,.32,.29),.91,0,.045,.013),
      'joint':((.23,.26,.235),.95,0,.02,.006),
      'paving':((.22,.245,.215),.96,0,.065,.012),
      'ramp':((.29,.32,.28),.91,0,.035,.009),
      'trim':((.53,.55,.49),.78,0,.035,.010),
      'mortar':((.23,.26,.23),.91,0,.04,.012),
      'brick':((.32,.14,.083),.88,0,.06,.020),
      'steel':((.115,.18,.19),.40,.67,.055,.006),
      'roof':((.22,.30,.30),.48,.68,.05,.008),
      'edge':((.40,.46,.42),.36,.74,.04,.004),
      'dark':((.028,.042,.045),.73,0,.02,.003),
      'glass':((.11,.235,.265),.19,.14,.015,.001),
      'glassWarm':((.28,.30,.24),.23,.10,.025,.001),
      'copper':((.30,.20,.095),.49,.64,.07,.006),
      'rubber':((.025,.031,.032),.86,0,.05,.008),
      'wood':((.15,.19,.19),.59,.45,.04,.007),
      'yellow':((.49,.36,.13),.69,.10,.02,.006)}
    for name,values in definitions.items():
        M[name]=material(name,*values)
    for name in ('glass','glassWarm'):
        shader=M[name].node_tree.nodes.get('Principled BSDF')
        shader.inputs['Transmission Weight'].default_value=.18
        shader.inputs['IOR'].default_value=1.45
        shader.inputs['Coat Weight'].default_value=.32
        shader.inputs['Coat Roughness'].default_value=.16
    nodes,links=M['brick'].node_tree.nodes,M['brick'].node_tree.links
    shader=nodes.get('Principled BSDF')
    coordinates=nodes.new('ShaderNodeTexCoord')
    bricks=nodes.new('ShaderNodeTexBrick')
    bricks.inputs['Color1'].default_value=(.31,.135,.073,1)
    bricks.inputs['Color2'].default_value=(.245,.088,.051,1)
    bricks.inputs['Mortar'].default_value=(.17,.18,.155,1)
    bricks.inputs['Scale'].default_value=1
    bricks.inputs['Mortar Size'].default_value=.009
    bricks.inputs['Brick Width'].default_value=.48
    bricks.inputs['Row Height'].default_value=.22
    separate=nodes.new('ShaderNodeSeparateXYZ')
    combine=nodes.new('ShaderNodeCombineXYZ')
    links.new(coordinates.outputs['Object'],separate.inputs[0])
    links.new(separate.outputs['X'],combine.inputs['X'])
    links.new(separate.outputs['Z'],combine.inputs['Y'])
    links.new(separate.outputs['Y'],combine.inputs['Z'])
    links.new(combine.outputs[0],bricks.inputs['Vector'])
    links.new(bricks.outputs['Color'],shader.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value=.32
    bump.inputs['Distance'].default_value=.023
    links.new(bricks.outputs['Fac'],bump.inputs['Height'])
    links.new(bump.outputs['Normal'],shader.inputs['Normal'])


def glass_opening(name,x,front,bottom,width,height,parent,columns=2,rows=2,warm=False):
    box(name+'_Interior',(x,front+.35,bottom+height/2),(width,.04,height),M['dark'],parent,0)
    box(name+'_RecessedGlass',(x,front+.18,bottom+height/2),(width,.018,height),M['glassWarm' if warm else 'glass'],parent,.001)
    for sign in (-1,1):
        box(name+'_DeepJamb',(x+sign*(width/2+.035),front+.06,bottom+height/2),(.07,.23,height+.09),M['edge'],parent,.008)
    for z in (bottom-.035,bottom+height+.035):
        box(name+'_WindowHeadSill',(x,front+.035,z),(width+.14,.25,.07),M['edge'],parent,.007)
    for col in range(1,columns):
        box(name+'_VerticalMullion',(x-width/2+width*col/columns,front+.12,bottom+height/2),
            (.042,.095,height),M['steel'],parent,.004)
    for row in range(1,rows):
        box(name+'_Transom',(x,front+.12,bottom+height*row/rows),(width,.095,.042),M['steel'],parent,.004)


def roller_opening(name,x,front,bottom,width,height,parent):
    box(name+'_DarkReveal',(x,front+.31,bottom+height/2),(width,.04,height),M['dark'],parent,0)
    box(name+'_InsetShutter',(x,front+.19,bottom+height/2),(width-.06,.04,height-.04),M['steel'],parent,.003)
    for row in range(max(1,int(height/.115))):
        box(name+'_ShutterFold',(x,front+.155,bottom+.055+row*.115),(width-.08,.026,.025),M['edge'],parent,.002)
    for sign in (-1,1):
        box(name+'_DoorTrack',(x+sign*(width/2+.045),front+.07,bottom+height/2),(.09,.26,height+.12),M['stone'],parent,.010)
    box(name+'_RollerHood',(x,front-.015,bottom+height+.09),(width+.24,.37,.18),M['roof'],parent)
    box(name+'_Handle',(x+.27,front+.125,bottom+.43),(.19,.035,.042),M['rubber'],parent,.004)


def front_wall(name,width,depth,height,parent,openings,wall='stone'):
    # Rectangular openings are removed analytically by subdividing the facade.
    # No unbroken box exists behind the recessed glass or doors.
    front=-depth/2
    box(name+'_RearWall',(0,depth/2-.10,height/2),(width,.20,height),M[wall],parent,0)
    for sign in (-1,1):
        box(name+'_SideWall',(sign*(width/2-.10),0,height/2),(.20,depth,height),M[wall],parent,0)
    xs=sorted(set([-width/2,width/2]+[v for x,z,w,h,kind in openings for v in (x-w/2,x+w/2)]))
    zs=sorted(set([0,height]+[v for x,z,w,h,kind in openings for v in (z,z+h)]))
    for left,right in zip(xs,xs[1:]):
        for bottom,top in zip(zs,zs[1:]):
            x,z=(left+right)/2,(bottom+top)/2
            if any(abs(x-ox)<w/2 and oz<z<oz+h for ox,oz,w,h,kind in openings):
                continue
            box(name+'_PerforatedWall',(x,front+.10,z),(right-left,.20,top-bottom),M[wall],parent,0)
    for index,(x,z,w,h,kind) in enumerate(openings):
        if kind=='roller':
            roller_opening(name+'_Bay%02d'%index,x,front,z,w,h,parent)
        else:
            glass_opening(name+'_Window%02d'%index,x,front,z,w,h,parent,
                          max(1,round(w/.36)),max(1,round(h/.43)),kind=='warm')
    box(name+'_FoundationPlinth',(0,0,.12),(width+.10,depth+.10,.24),M['stone'],parent)


def flat_roof(name,width,depth,height,parent,parapet=.23):
    box(name+'_RoofSlab',(0,0,height),(width+.16,depth+.16,.14),M['roof'],parent)
    for sign in (-1,1):
        box(name+'_ParapetFrontBack',(0,sign*depth/2,height+parapet/2),(width+.14,.13,parapet),M['stone'],parent)
        box(name+'_ParapetSide',(sign*width/2,0,height+parapet/2),(.13,depth,parapet),M['stone'],parent)
        box(name+'_CopingFrontBack',(0,sign*depth/2,height+parapet+.027),(width+.20,.19,.055),M['edge'],parent,.006)


def hvac(name,x,y,z,parent):
    box(name+'_AirHandlingHousing',(x,y,z+.22),(.94,.67,.44),M['roof'],parent)
    box(name+'_ConcreteFeet',(x,y,z+.045),(1.04,.76,.09),M['stone'],parent)
    for index in range(7):
        box(name+'_IntakeLouvre',(x,y-.348,z+.09+index*.044),(.73,.035,.018),M['dark'],parent,.002)
    for px in (-.25,.25):
        cylinder(name+'_FanGuard',(x+px,y,z+.456),.19,.025,M['dark'],parent,24)
        cylinder(name+'_FanHub',(x+px,y,z+.475),.045,.028,M['edge'],parent,12)
        for index in range(5):
            angle=TAU*index/5
            line(name+'_FanGuardSpoke',[(x+px,y,z+.48),
                 (x+px+.18*math.cos(angle),y+.18*math.sin(angle),z+.48)],.008,M['edge'],parent)


def factory():
    root,parent,floor=terrace('MOD_SawtoothWorks',-6.0,23.5,6.70,4.1,-3)
    openings=[(-2.4,.80,1.08,1.28,'glass'),(-.85,.80,1.08,1.28,'glass'),
              (.70,.80,1.08,1.28,'warm'),(2.23,.25,1.06,1.73,'roller')]
    front_wall('MOD_Factory',6.4,3.8,2.55,parent,openings,'brick')
    for x in (-3.12,-1.625,-.075,1.475,3.12):
        box('MOD_FactoryConcretePier',(x,-1.975,1.42),(.145,.19,2.84),M['stone'],parent,.008)
    box('MOD_FactoryLintel',(0,-1.94,2.5),(6.52,.20,.18),M['stone'],parent)
    # Each tooth has a steep glazed northlight and a longer standing-seam roof.
    for tooth in range(4):
        x0=-3.30+tooth*1.65; x1=x0+1.65; peak=x0+.28
        base,high,depth=2.66,3.48,2.03
        mesh('MOD_SawtoothMetalSlope',[(peak,-depth,high),(x1,-depth,base),
             (x1,depth,base),(peak,depth,high)],[(0,1,2,3)],M['roof'],parent)
        mesh('MOD_NorthlightRoofGlass',[(x0,-depth,base),(peak,-depth,high),
             (peak,depth,high),(x0,depth,base)],[(0,1,2,3)],M['glass'],parent)
        # Open structural end: glazed triangle bounded by steel beams, no solid backing.
        triangle=[(x0+.06,-depth-.012,base+.025),(peak,-depth-.012,high-.06),
                  (x1-.10,-depth-.012,base+.025)]
        mesh('MOD_ToothEndGlazing',triangle,[(0,1,2)],M['glass'],parent)
        for side in (-1,1):
            line('MOD_SawtoothEndFrame',[(x0,side*depth,base),(peak,side*depth,high),
                 (x1,side*depth,base)],.037,M['edge'],parent)
            line('MOD_SawtoothTieBeam',[(x0,side*depth,base),(x1,side*depth,base)],.045,M['steel'],parent)
        for bay in range(8):
            y=-depth+bay*(2*depth/7)
            line('MOD_RoofStandingSeam',[(peak,y,high+.019),(x1,y,base+.019)],.014,M['edge'],parent)
            line('MOD_NorthlightMullion',[(x0,y,base),(peak,y,high)],.025,M['steel'],parent)
        line('MOD_SawtoothRidge',[(peak,-depth,high),(peak,depth,high)],.038,M['edge'],parent)
    for index,(x,y,height) in enumerate([(-2.55,1.12,4.25),(-1.30,1.37,3.78)]):
        cylinder('MOD_BrickFlue',(x,y,height/2),.31,height,M['brick'],parent,24,.245)
        for z in (.40,height-.25):
            cylinder('MOD_FlueConcreteBand',(x,y,z),.34,.13,M['stone'],parent,24)
        cylinder('MOD_FlueTopRim',(x,y,height),.31,.13,M['edge'],parent,24)
        cylinder('MOD_FlueDarkBore',(x,y,height+.07),.245,.013,M['dark'],parent,24)
    # A purposeful downpipe and one short intake duct; no unrelated surface clutter.
    line('MOD_FactoryDownpipe',[(-3.25,-1.98,2.70),(-3.25,-1.98,.31),(-3.03,-1.98,.21)],.039,M['steel'],parent)
    box('MOD_FactoryLoadingAwning',(2.20,-2.16,2.22),(1.48,.65,.10),M['roof'],parent)
    for x in (1.62,2.76):
        line('MOD_AwningWallBrace',[(x,-1.98,1.81),(x,-2.44,2.17)],.025,M['steel'],parent)
    return root


def control_office():
    root,parent,floor=terrace('MOD_ControlOffice',.65,25.7,3.90,3.25,4)
    parent.scale.z=.90
    # A compact modern framed building with a set-back vertical service core.
    openings=[]
    for floor_index in range(4):
        for col,x in enumerate((-1.15,0,1.15)):
            openings.append((x,.25+floor_index*.87,.76,.56,'warm' if (floor_index+col)%5==0 else 'glass'))
    front_wall('MOD_Office',3.60,2.85,3.72,parent,openings,'stone')
    for x in (-1.75,-.57,.57,1.75):
        box('MOD_OfficeStructuralFin',(x,-1.52,1.88),(.12,.30,3.76),M['trim'],parent,.012)
    for z in (.15,1.02,1.89,2.76,3.67):
        box('MOD_OfficeFloorSlab',(0,-1.48,z),(3.83,.34,.13),M['trim'],parent)
    for row in range(4):
        z=.88+row*.87
        for x in (-1.15,0,1.15):
            box('MOD_OfficeWindowSunshade',(x,-1.68,z),(.95,.48,.045),M['edge'],parent,.007)
    flat_roof('MOD_OfficeFlatRoof',3.73,2.98,3.78,parent,.20)
    hvac('MOD_OfficeAirHandler',-.70,.24,3.86,parent)
    core=empty('MOD_SteppedServiceCore',(.94,.33,0),parent)
    front_wall('MOD_ServiceCore',1.28,2.08,4.63,core,[(0,3.90,.74,.49,'glass')],'stone')
    flat_roof('MOD_ServiceCoreRoof',1.41,2.20,4.68,core,.20)
    # A small, singular aerial, sized below the protected skyline.
    line('MOD_RadioAerialMast',[(.95,.45,4.86),(.95,.45,5.29)],.026,M['edge'],parent)
    for z in (5.03,5.18):
        line('MOD_RadioAerialCrossbar',[(.65,.45,z),(1.25,.45,z)],.019,M['edge'],parent)
    entrance=empty('MOD_GlazedEntrance',(0,-1.76,0),parent)
    box('MOD_OfficeEntranceCanopy',(0,-.18,.99),(1.36,.78,.10),M['roof'],entrance)
    for sign in (-1,1):
        box('MOD_OfficeEntrancePost',(sign*.60,-.48,.51),(.055,.055,.98),M['edge'],entrance)
    return root


def loading_hall():
    root,parent,floor=terrace('MOD_LoadingHall',6.75,22.7,6.06,4.15,-5)
    openings=[]
    for x in (-1.90,0,1.90):
        openings.extend([(x,.25,1.38,1.65,'roller'),(x,2.05,1.40,.32,'glass')])
    front_wall('MOD_Loading',5.80,3.90,2.48,parent,openings,'stone')
    for x in (-2.83,-.95,.95,2.83):
        box('MOD_HallStructuralPier',(x,-2.02,1.34),(.16,.23,2.68),M['trim'],parent)
    # Elliptical barrel vault with steel ribs and separate end glazing.
    width,depth,base,rise=3.04,2.10,2.57,.94
    sections=48
    vertices=[]
    for y in (-depth,depth):
        for step in range(sections+1):
            angle=math.pi*step/sections
            vertices.append((-width*math.cos(angle),y,base+rise*math.sin(angle)))
    faces=[(i,i+1,i+sections+2,i+sections+1) for i in range(sections)]
    mesh('MOD_BarrelRoofSkin',vertices,faces,M['roof'],parent,0,True)
    for step in range(0,sections+1,3):
        angle=math.pi*step/sections
        x=-width*math.cos(angle); z=base+rise*math.sin(angle)+.024
        line('MOD_BarrelStandingSeam',[(x,-depth,z),(x,depth,z)],.021,M['edge'],parent)
    for y in (-depth,depth):
        points=[(-width*math.cos(math.pi*step/sections),y,base+rise*math.sin(math.pi*step/sections))
                for step in range(sections+1)]
        line('MOD_BarrelEndRib',points,.060,M['edge'],parent)
    # The curved front is actual glazing, split by a small structural fan.
    front_vertices=[(0,-depth-.014,base)]+[(x,-depth-.014,z) for x,y,z in vertices[:sections+1]]
    mesh('MOD_BarrelEndGlass',front_vertices,[(0,i+1,i+2) for i in range(sections)],M['glass'],parent)
    line('MOD_BarrelEndTie',[(-width,-depth,base),(width,-depth,base)],.062,M['steel'],parent)
    for step in (8,16,24,32,40):
        angle=math.pi*step/sections
        line('MOD_BarrelEndMullion',[(0,-depth-.03,base),
             (-width*math.cos(angle),-depth-.03,base+rise*math.sin(angle))],.032,M['steel'],parent)
    box('MOD_DockCanopy',(-.95,-2.29,1.96),(3.47,.83,.105),M['roof'],parent)
    for x in (-2.49,.59):
        line('MOD_DockCanopyBrace',[(x,-1.99,1.55),(x,-2.67,1.91)],.032,M['steel'],parent)
    for x in (-2.60,-1.20,-.70,.70,1.20,2.60):
        box('MOD_DockRubberBumper',(x,-2.09,.37),(.16,.18,.48),M['rubber'],parent)
    for x in (-2.58,2.58):
        cylinder('MOD_ProtectiveBollard',(x,-2.31,.28),.055,.54,M['yellow'],parent,12)
    # One functional roof exhaust marks this building without duplicating the office kit.
    cylinder('MOD_HallRoofVent',(1.65,.81,3.51),.18,.32,M['steel'],parent,20)
    cylinder('MOD_HallVentRainCap',(1.65,.81,3.72),.27,.12,M['edge'],parent,20,.21)
    return root

def move_occluding_pines():
    moved=[]
    trunks=sorted([o for o in bpy.data.objects if o.name=='Tapered pine trunk' or o.name.startswith('Tapered pine trunk.')],key=lambda o:o.name)
    selected=[o for o in trunks if -9.5<o.location.x<10.6 and 5<o.location.y<23.5]
    for index,trunk in enumerate(selected):
        suffix=trunk.name[len('Tapered pine trunk'):]
        old=trunk.location.copy()
        cluster=index%3
        if cluster==0:
            x,y=-11.15-(index%4)*.34,24+(index%7)*1.13
        elif cluster==1:
            x,y=11.25+(index%5)*.27,23+(index%6)*1.21
        else:
            x,y=.05+(index%4)*.35,33+(index%5)*.92
        delta=Vector((x-old.x,y-old.y,soil_height(x,y)-soil_height(old.x,old.y)))
        names=[]
        for prefix in ('Tapered pine trunk','Individually sculpted evergreen boughs','Soft conifer crown'):
            obj=bpy.data.objects.get(prefix+suffix)
            if obj is not None:
                obj.location += delta
                names.append(obj.name)
        moved.append({'objects':names,'delta':list(delta)})
    return moved


def tune_lighting():
    bpy.data.objects['Late golden sun'].data.energy=1500
    bpy.data.objects['Late golden sun'].data.size=7
    bpy.data.objects['Blue sky bounce'].data.energy=800
    bpy.data.objects['Sun shafts'].data.angle=.07
    fog=bpy.data.objects['Atmosphere behind the battlefield']
    fog_material=fog.data.materials[0].copy()
    fog_material.name='MOD_ValleyDepthGradient'
    fog.data.materials[0]=fog_material
    nodes,links=fog_material.node_tree.nodes,fog_material.node_tree.links
    volume=next(node for node in nodes if node.type=='PRINCIPLED_VOLUME')
    coordinates=nodes.new('ShaderNodeTexCoord')
    separate=nodes.new('ShaderNodeSeparateXYZ')
    density=nodes.new('ShaderNodeValToRGB')
    density.name='Less fog over readable front architecture'
    stops=[(0,.005),(.29,.008),(.55,.017),(1,.022)]
    for element,(position,value) in zip(density.color_ramp.elements,(stops[0],stops[-1])):
        element.position=position
        element.color=(value,value,value,1)
    for position,value in stops[1:-1]:
        element=density.color_ramp.elements.new(position)
        element.color=(value,value,value,1)
    links.new(coordinates.outputs['Generated'],separate.inputs[0])
    links.new(separate.outputs['Y'],density.inputs[0])
    links.new(density.outputs['Color'],volume.inputs['Density'])




def smooth_path(anchors,subdivisions=12):
    points=[]
    for index in range(len(anchors)-1):
        p0=Vector(anchors[max(0,index-1)]);p1=Vector(anchors[index])
        p2=Vector(anchors[index+1]);p3=Vector(anchors[min(len(anchors)-1,index+2)])
        for step in range(subdivisions):
            t=step/subdivisions
            point=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
            points.append(point)
    points.append(Vector(anchors[-1]))
    return points


def terrain_service_road(parent,anchors,width):
    centers=smooth_path(anchors)
    across=6;vertices=[]
    for index,point in enumerate(centers):
        tangent=centers[min(index+1,len(centers)-1)]-centers[max(0,index-1)]
        tangent.normalize();normal=Vector((-tangent.y,tangent.x))
        for column in range(across+1):
            xy=point+normal*width*(column/across-.5)
            vertices.append((xy.x,xy.y,soil_height(xy.x,xy.y)+.045))
    stride=across+1
    faces=[(row*stride+col,row*stride+col+1,(row+1)*stride+col+1,(row+1)*stride+col)
           for row in range(len(centers)-1) for col in range(across)]
    obj=mesh('MOD_GroundedServiceCourt',vertices,faces,M['paving'],parent)
    return {'object':obj.name,'centerline':anchors,'width':width,'soil_samples':len(vertices),
            'surface_offset_above_sampled_soil':.045}


def access_ramp(name,building,local_x,local_front,floor,end,width,parent):
    origin=building.matrix_world@Vector((local_x,local_front,floor+.05))
    start=Vector((origin.x,origin.y));end=Vector(end)
    tangent=end-start;length=tangent.length;tangent.normalize()
    normal=Vector((-tangent.y,tangent.x))
    segments=max(24,math.ceil(length/.25));across=6;stride=across+1
    vertices=[];grade_samples=[]
    for row in range(segments+1):
        t=row/segments;center=start.lerp(end,t)
        row_width=width*(1+.12*t)
        row_heights=[]
        for column in range(across+1):
            lateral=column/across-.5
            xy=center+normal*row_width*lateral
            end_xy=end+normal*width*1.12*lateral
            end_height=soil_height(end_xy.x,end_xy.y)+.05
            designed=origin.z*(1-t)+end_height*t
            z=max(designed,soil_height(xy.x,xy.y)+.05)
            vertices.append((xy.x,xy.y,z));row_heights.append(z)
        grade_samples.append(row_heights[across//2])
    faces=[(row*stride+col,row*stride+col+1,(row+1)*stride+col+1,(row+1)*stride+col)
           for row in range(segments) for col in range(across)]
    obj=mesh(name+'_ContinuousRampSurface',vertices,faces,M['ramp'],parent)
    for column in (0,across):
        top=[vertices[row*stride+column] for row in range(segments+1)]
        bottom=[(x,y,min(z-.01,soil_height(x,y)-.045)) for x,y,z in top]
        skirt_vertices=top+bottom;n=len(top)
        skirt_faces=[(i,i+1,i+n+1,i+n) for i in range(n-1)]
        mesh(name+'_GroundedRampCheek',skirt_vertices,skirt_faces,M['retaining'],parent)
    final_errors=[]
    for vertex in vertices[-stride:]:
        final_errors.append(vertex[2]-soil_height(vertex[0],vertex[1]))
    assert max(abs(error-.05) for error in final_errors)<.0001,(name,final_errors)
    return {'object':obj.name,'building':building.name,'start':[origin.x,origin.y,origin.z],
            'end':[end.x,end.y,grade_samples[-1]],'width':width,'length':length,
            'average_grade':abs(grade_samples[-1]-grade_samples[0])/length,
            'max_segment_grade':max(abs(b-a)/(length/segments) for a,b in zip(grade_samples,grade_samples[1:])),
            'soil_samples':len(vertices),'end_offsets_above_soil':final_errors,
            'continuous_ground_join':True}


def service_yard(groups):
    bpy.context.view_layer.update()
    parent=empty('MOD_SharedIndustrialServiceCourt')
    anchors=[(-8.0,18.0),(-6.0,18.0),(-3.7,17.7),(-.8,17.0),
             (2.5,16.0),(4.6,14.5),(6.8,13.6),(9.65,15.0)]
    road=terrain_service_road(parent,anchors,2.65)
    by_name={group.name:group for group in groups}
    floors={record['name']:record['coping_top'] for record in TERRACES}
    ramps=[access_ramp('MOD_WorksAccess',by_name['MOD_SawtoothWorks'],2.23,-2.11,
                       floors['MOD_SawtoothWorks'],(-3.7,17.7),1.55,parent),
           access_ramp('MOD_OfficeAccess',by_name['MOD_ControlOffice'],0,-1.80,
                       floors['MOD_ControlOffice'],(-.8,17.0),1.48,parent),
           access_ramp('MOD_DockAccess',by_name['MOD_LoadingHall'],0,-2.12,
                       floors['MOD_LoadingHall'],(6.8,13.6),2.25,parent)]
    bpy.context.view_layer.update()
    bounds=screen_bounds(parent.children_recursive)
    assert bounds[3]<463,('Service yard approaches combat lane too closely',bounds)
    return {'name':parent.name,'road':road,'ramps':ramps,'bounds_1280x720':bounds,
            'connected_buildings':list(by_name),'terrain_unchanged':True}

def verify_openings():
    scene=bpy.context.scene
    deps=bpy.context.evaluated_depsgraph_get()
    results=[]
    for parent_name,origin,expected in [
      ('MOD_ControlOffice_Superstructure',(.10,-2,.42),'MOD_Office_Window04_RecessedGlass'),
      ('MOD_SawtoothWorks_Superstructure',(-2.10,-2.5,1.05),'MOD_Factory_Window00_RecessedGlass')]:
        parent=bpy.data.objects[parent_name]
        transform=parent.matrix_world
        hit,point,normal,index,obj,matrix=scene.ray_cast(deps,transform@Vector(origin),
                  (transform.to_3x3()@Vector((0,1,0))).normalized(),distance=2)
        record={'parent':parent_name,'origin':origin,'hit':obj.name if hit else None,
                'local_hit':list(transform.inverted()@point) if hit else None}
        # Windows are looked up by their actual ray hit, not by naming alone.
        assert hit and 'RecessedGlass' in obj.name,record
        results.append(record)
    return results


def build(source,outdir):
    global COLLECTION
    source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    public=ROOT/'public/assets/reborn/backgrounds/modern.png'
    public_hash=hashlib.sha256(public.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    if bpy.data.collections.get('MOD_Architecture'):
        raise RuntimeError('Use the original source, not an already refined candidate.')
    source_camera=camera_contract(); source_lane=lane_hash()
    archive=bpy.data.collections.new('MOD_SourceArchive')
    bpy.context.scene.collection.children.link(archive)
    prefixes=('Modern skyline','Horizontal glass band','Communications dish','Radio tower lattice','Radio tower leg')
    archived=[]
    for obj in list(bpy.data.objects):
        if any(obj.name==prefix or obj.name.startswith(prefix+'.') for prefix in prefixes):
            for collection in list(obj.users_collection):collection.objects.unlink(obj)
            archive.objects.link(obj)
            obj.hide_render=True;obj.hide_viewport=True
            archived.append(obj.name)
    archive.hide_render=True;archive.hide_viewport=True
    COLLECTION=bpy.data.collections.new('MOD_Architecture')
    bpy.context.scene.collection.children.link(COLLECTION)
    create_materials()
    groups=[factory(),control_office(),loading_hall()]
    yard=service_yard(groups)
    pines=move_occluding_pines()
    tune_lighting()
    scene=bpy.context.scene
    scene['authored_environment_revision']=2
    scene['environment_id']='modern'
    scene['runtime_background']='backgrounds/modern.png'
    scene['authoring_source']='tools/blender/refine_modern.py'
    scene['runtime_layout']='1280x720; combat_y=500; HUD_top=82; HUD_bottom=552'
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(outdir/'candidate.png')
    bpy.context.view_layer.update()
    bounds={group.name:screen_bounds(group.children_recursive) for group in groups}
    print('MODERN_BUILD_BOUNDS '+json.dumps(bounds),flush=True)
    assert camera_contract()==source_camera,'Camera changed.'
    assert lane_hash()==source_lane,'Terrain changed.'
    assert all(values[1]>=132 and values[3]<440 for values in bounds.values()),bounds
    openings=verify_openings()
    assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
    assert hashlib.sha256(public.read_bytes()).hexdigest()==public_hash
    outdir.mkdir(parents=True,exist_ok=True)
    original=outdir/'original-background-modern.blend'
    if not original.exists():original.write_bytes(source.read_bytes())
    original_png=outdir/'original-background-modern.png'
    if not original_png.exists():original_png.write_bytes(public.read_bytes())
    bpy.context.preferences.filepaths.save_version=0
    temporary=outdir/'candidate.saving.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(temporary),compress=True)
    replace_file(temporary,outdir/'candidate.blend')
    report={'status':'built','source':str(source),'source_sha256':source_hash,
      'public_original_sha256':public_hash,'source_and_public_unchanged':True,
      'camera_before':source_camera,'camera_after':camera_contract(),'camera_unchanged':True,
      'terrain_sha256_before':source_lane,'terrain_sha256_after':lane_hash(),'terrain_unchanged':True,
      'building_groups':[group.name for group in groups],'bounds_1280x720':bounds,
      'service_yard':yard,
      'archived_objects':archived,'new_object_count':len(CREATED),'total_objects':len(bpy.data.objects),
      'terrace_grounding':TERRACES,'relocated_pine_groups':pines,'raycast_window_checks':openings,
      'rendered':False,'publication':'candidate only',
      'materials':{name:{'roughness':mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value,
                        'metallic':mat.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value}
                   for name,mat in M.items()}}
    write_json(outdir/'metrics.json',report)
    print('MODERN_CANDIDATE_BUILT '+str(outdir/'candidate.blend'),flush=True)


def render(outdir,samples):
    bpy.ops.wm.open_mainfile(filepath=str(outdir/'candidate.blend'),load_ui=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES'
    preferences=bpy.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type='OPTIX';preferences.get_devices()
    devices=[]
    for device in preferences.devices:
        device.use=device.type=='OPTIX'
        if device.use:devices.append(device.name)
    if not devices:raise RuntimeError('No OptiX device; refusing an unexpected long CPU render.')
    scene.cycles.device='GPU';scene.cycles.samples=samples;scene.cycles.use_denoising=True
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(outdir/'candidate.rendering.png')
    start=time.monotonic();bpy.ops.render.render(write_still=True)
    replace_file(outdir/'candidate.rendering.png',outdir/'candidate.png')
    metrics=json.loads((outdir/'metrics.json').read_text())
    metrics.update({'status':'rendered','rendered':True,'render_samples':samples,'render_devices':devices,
                    'render_seconds':round(time.monotonic()-start,2),'render_path':str(outdir/'candidate.png')})
    write_json(outdir/'metrics.json',metrics)
    print('MODERN_CANDIDATE_RENDERED '+str(outdir/'candidate.png'),flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    original=ROOT/'art/blender/candidates/modern-v2/original-background-modern.blend'
    parser.add_argument('--source',type=Path,default=original if original.exists() else ROOT/'art/blender/background-modern.blend')
    parser.add_argument('--outdir',type=Path,default=ROOT/'art/blender/candidates/modern-v2')
    parser.add_argument('--render',action='store_true');parser.add_argument('--render-only',action='store_true')
    parser.add_argument('--samples',type=int,default=32)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    source=args.source.resolve();outdir=args.outdir.resolve()
    if not outdir.is_relative_to(ROOT/'art/blender/candidates'):
        raise RuntimeError('Every output must remain inside the isolated candidate tree.')
    if not args.render_only:build(source,outdir)
    if args.render or args.render_only:render(outdir,args.samples)


if __name__=='__main__':main()
