"""Refine the existing Renaissance scene with authored architecture.

Standalone Blender script; no original generator or third-party modules required.
Usage: blender --disable-autoexec -b --python tools/blender/refine_renaissance.py --
       --source art/blender/background-renaissance.blend
       --outdir art/blender/candidates/renaissance-v2 --render --samples 48
Only the candidate directory is written. Canonical sources and public stay intact.
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
    mat = bpy.data.materials.new('REN_' + name)
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


def create_materials():
    definitions = {'stone':((.53,.49,.37),.79,0,.05,.016),
      'trim':((.65,.61,.48),.73,0,.035,.010), 'plaster':((.58,.55,.43),.85,0,.035,.009),
      'rose':((.48,.355,.26),.84,0,.05,.012), 'ochre':((.48,.41,.25),.83,0,.04,.01),
      'wood':((.11,.14,.115),.86,0,.07,.016), 'oak':((.19,.105,.05),.82,0,.10,.024),
      'dark':((.025,.04,.045),.81,0,.06,.003), 'copper':((.085,.23,.175),.49,.62,.15,.012),
      'copperEdge':((.20,.27,.18),.43,.68,.08,.005), 'brass':((.43,.29,.10),.35,.72,.05,.005),
      'roof0':((.34,.115,.055),.84,0,.055,.015), 'roof1':((.42,.15,.071),.83,0,.055,.015),
      'roof2':((.285,.083,.045),.85,0,.055,.015), 'mortar':((.32,.32,.255),.89,0,.06,.016),
      'soil':((.25,.23,.135),.94,0,.09,.024)}
    for key, values in definitions.items():
        M[key] = material(key, *values)


def soil_height(x, y):
    ground = bpy.data.objects['Sculpted continuous valley']
    inverse = ground.matrix_world.inverted()
    hit, point, normal, face = ground.ray_cast(inverse @ Vector((x,y,30)), Vector((0,0,-1)), distance=70)
    if not hit:
        raise RuntimeError('No soil below architecture at ' + str((x,y)))
    return (ground.matrix_world @ point).z


def terrace(name, x, y, width, depth, rotation=0):
    root = empty(name, (x,y,0))
    angle = math.radians(rotation)
    root.rotation_euler.z = angle
    corners = [(-width/2,-depth/2),(width/2,-depth/2),(width/2,depth/2),(-width/2,depth/2)]
    def world_xy(px, py):
        return x+px*math.cos(angle)-py*math.sin(angle), y+px*math.sin(angle)+py*math.cos(angle)
    heights = [soil_height(*world_xy(px,py)) for px,py in corners]
    heights.append(soil_height(x,y))
    top = max(heights) + .16
    vertices = [(px,py,z-.06) for (px,py),z in zip(corners,heights)]
    vertices += [(px,py,top) for px,py in corners]
    mesh(name+'_GroundedRetainingSkirt', vertices,
         [(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)], M['mortar'], root)
    box(name+'_TerraceCoping', (0,0,top+.045), (width+.08,depth+.08,.09), M['stone'],root)
    for row in range(max(1,math.ceil((top-min(heights))/.24))):
        z = top-.13-row*.24
        for index in range(math.ceil(width/.53)):
            px = -width/2+.25+index*.53+(row%2)*.13
            if px > width/2-.12:
                continue
            ground_z = soil_height(*world_xy(px,-depth/2))
            if z+.10 > ground_z:
                low = max(z-.11, ground_z-.04)
                box(name+'_RetainingBlock', (px,-depth/2-.015,(low+z+.10)/2),
                    (.48,.08,z+.10-low),M['stone'],root,.008)
    floor = top+.09
    superstructure = empty(name+'_Superstructure',(0,0,floor),root)
    # Broad steps have sampled soil bottoms, avoiding floating feet on the existing slope.
    for index in range(4):
        py = -depth/2-.13-index*.22
        ground_z = soil_height(*world_xy(0,py))
        stair_top = floor-(index+1)*.085
        if stair_top > ground_z:
            box(name+'_ApproachStep', (0,py,(ground_z-.035+stair_top)/2),
                (1.36,.28,stair_top-ground_z+.035),M['stone'],root,.015)
    TERRACES.append({'name':name,'soil_heights':heights,'coping_top':floor,
                     'skirt_corner_penetration':.06,'world_center':[x,y], 'rotation':rotation})
    return root, superstructure, floor


def window(name, x, front, bottom, width, height, parent, arched=True, shutters=False):
    top = bottom+height
    box(name+'_RecessBack', (x,front+.27,bottom+height/2), (width,.035,height),M['dark'],parent,0)
    # The wall caller leaves the complete rectangle open. These corner solids
    # define the actual curved opening rather than painting black over a wall.
    if arched:
        radius = width/2
        spring = top-radius
        left = [(x-radius,top),(x,top)] + [
            (x+radius*math.cos(math.pi/2+i*math.pi/24),spring+radius*math.sin(math.pi/2+i*math.pi/24))
            for i in range(1,13)]
        right = [(x,top),(x+radius,top)] + [
            (x+radius*math.cos(i*math.pi/24),spring+radius*math.sin(i*math.pi/24)) for i in range(13)]
        extrude(name+'_ArchLeftSpandrel',left,front,.19,M['plaster'],parent)
        extrude(name+'_ArchRightSpandrel',right,front,.19,M['plaster'],parent)
        arch(name+'_CarvedArch',x,front-.055,spring,radius,.065,.14,M['trim'],parent)
        jamb_height = spring-bottom
        box(name+'_Keystone',(x,front-.075,top+.025),(.09,.18,.14),M['trim'],parent)
    else:
        jamb_height = height
        box(name+'_Lintel',(x,front-.04,top+.035),(width+.18,.18,.07),M['trim'],parent)
    for sign in (-1,1):
        box(name+'_StoneJamb',(x+sign*(width/2+.035),front-.025,bottom+jamb_height/2),
            (.07,.16,jamb_height),M['trim'],parent,.008)
    box(name+'_ProjectingSill',(x,front-.065,bottom-.035),(width+.22,.23,.07),M['trim'],parent)
    box(name+'_WoodMullion',(x,front+.22,bottom+height*.46),(.026,.04,height*.92),M['wood'],parent,.002)
    box(name+'_Transom',(x,front+.22,bottom+height*.51),(width,.04,.028),M['wood'],parent,.002)
    if shutters:
        for sign in (-1,1):
            px = x+sign*(width*.75+.08)
            box(name+'_OpenShutter',(px,front-.025,bottom+height*.47),(.22,.055,height*.89),M['wood'],parent)
            for ratio in (.2,.5,.8):
                box(name+'_ShutterBrace',(px,front-.058,bottom+height*ratio),(.20,.025,.034),M['oak'],parent,.002)


def facade(name, width, depth, height, parent, rows=2, columns=3, wall='plaster',
           arched=True, door=True, shutters=False, back=True):
    front = -depth/2
    if back:
        box(name+'_RearWall',(0,depth/2-.095,height/2),(width,.19,height),M[wall],parent,0)
        for sign in (-1,1):
            box(name+'_SideWall',(sign*(width/2-.095),0,height/2),(.19,depth,height),M[wall],parent,0)
    openings = []
    story = height/rows
    for row in range(rows):
        for col in range(columns):
            x = -width/2+(col+1)*width/(columns+1)
            w = min(.61,width/(columns+1)*.53)
            bottom = row*story+.23
            h = story*.56
            is_door = door and row == 0 and col == columns//2
            if is_door:
                bottom, h, w = .02, min(1.3,story*.91), w*1.2
            openings.append((x,bottom,w,h,is_door))
    xs = sorted(set([-width/2,width/2]+[value for x,z,w,h,d in openings for value in (x-w/2,x+w/2)]))
    zs = sorted(set([0,height]+[value for x,z,w,h,d in openings for value in (z,z+h)]))
    for left,right in zip(xs,xs[1:]):
        for bottom,top in zip(zs,zs[1:]):
            cx,cz = (left+right)/2,(bottom+top)/2
            if any(abs(cx-x)<w/2 and z<cz<z+h for x,z,w,h,d in openings):
                continue
            box(name+'_PerforatedWallPanel',(cx,front+.095,cz),(right-left,.19,top-bottom),M[wall],parent,0)
    for index,(x,z,w,h,is_door) in enumerate(openings):
        window(name+'_Window%02d'%index,x,front,z,w,h,parent,arched,shutters and not is_door)
        if is_door:
            box(name+'_DoorInsideReveal',(x,front+.24,z+h*.36),(w*.91,.04,h*.70),M['oak'],parent,.006)
            for ratio in (.15,.5):
                box(name+'_DoorHinge',(x,front+.21,z+h*ratio),(w*.8,.025,.025),M['brass'],parent,.003)
    for row in range(1,rows+1):
        box(name+'_StringCourse',(0,0,row*story+.025),(width+.16,depth+.14,.075),M['trim'],parent)
    for sign in (-1,1):
        for row in range(math.floor(height/.27)):
            block_width = .30 if row%2 else .23
            box(name+'_CornerQuoin',(sign*(width/2-block_width/2+.025),front-.025,.135+row*.27),
                (block_width,.07,.245),M['stone'],parent,.006)


def roof(name, width, depth, base, rise, parent, kind='hip'):
    w,d = width/2,depth/2
    if kind == 'shed':
        vertices=[(-w,-d,base),(w,-d,base),(w,d,base+rise),(-w,d,base+rise)]
        faces=[(0,1,2,3)]
        ridge = w
    else:
        ridge = max(.15,w-min(d*.75,w*.7)) if kind == 'hip' else w
        vertices=[(-w,-d,base),(w,-d,base),(w,d,base),(-w,d,base),
                  (-ridge,0,base+rise),(ridge,0,base+rise)]
        faces=[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)]
    mesh(name+'_SolidRoofProfile',vertices,faces,M['roof0'],parent)
    line(name+'_FrontEave',[(-w,-d,base),(w,-d,base)],.07,M['oak'],parent)
    line(name+'_RearEave',[(-w,d,base+(rise if kind=='shed' else 0)),
                         (w,d,base+(rise if kind=='shed' else 0))],.055,M['oak'],parent)
    count = max(4,math.ceil(depth/.23))
    def surface(t, side=-1):
        y = (-d+2*d*t) if kind == 'shed' else side*d*(1-t)
        extent = w if kind in {'gable','shed'} else w+(ridge-w)*t
        return extent,y,base+rise*t+.017
    for side in ((-1,) if kind=='shed' else (-1,1)):
        for row in range(count):
            t0,t1=row/count,min(1,(row+1.10)/count)
            e0,y0,z0=surface(t0,side)
            e1,y1,z1=surface(t1,side)
            mesh(name+'_OverlappingTileCourse',[(-e0,y0,z0),(e0,y0,z0),(e1,y1,z1),(-e1,y1,z1)],
                 [(0,1,2,3)],M['roof'+str(row%3)],parent)
            for col in range(max(1,int(2*e0/.27))):
                ratio=(col+.5)/(max(1,int(2*e0/.27)))
                line(name+'_TileChannel',[(e0*(2*ratio-1),y0,z0+.011),
                     (e1*(2*ratio-1),y1,z1+.011)],.011,M['roof2'],parent)
    if kind != 'shed':
        for index in range(max(1,math.ceil(2*ridge/.24))):
            x0=-ridge+index*.24
            line(name+'_RidgeCap',[(x0,0,base+rise+.035),(min(ridge,x0+.255),0,base+rise+.035)],
                 .065,M['roof1'],parent)
        for sign in (-1,1):
            line(name+'_HipSeam',[(sign*w,-d,base+.025),(sign*ridge,0,base+rise+.04)],.033,M['roof1'],parent)


def observatory():
    root,parent,floor = terrace('REN_Observatory',3.1,22,5.4,3.6,-3)
    max_z = (500.76-5.268*22-157)/39.652
    parent.scale.z = min(1,max(.68,(max_z-floor)/5.16))
    facade('REN_ObservatoryPalazzo',4.6,3,2.2,parent,2,3)
    box('REN_ObservatoryRoofTerrace',(0,0,2.29),(4.88,3.22,.16),M['trim'],parent)
    for side in (-1,1):
        for index in range(19):
            x = -2.16+index*.24
            cylinder('REN_StoneBaluster',(x,side*1.50,2.50),.037,.35,M['stone'],parent,8)
        box('REN_BalustradeRail',(0,side*1.50,2.70),(4.5,.14,.11),M['trim'],parent)
    radius = 1.37
    facet_width = 2*radius*math.sin(math.pi/8)
    apothem = radius*math.cos(math.pi/8)
    cylinder('REN_OctagonalDrumFoot',(0,0,2.42),1.43,.13,M['trim'],parent,8)
    for index in range(8):
        alpha = TAU*index/8+math.pi/8
        facet = empty('REN_DrumPerforatedFacet',
                      ((apothem-.095)*math.cos(alpha),(apothem-.095)*math.sin(alpha),2.45),parent)
        facet.rotation_euler.z = alpha+math.pi/2
        facade('REN_DrumArch',facet_width,.19,.88,facet,1,1,'stone',True,False,False,False)
    cylinder('REN_OctagonalDrumCornice',(0,0,3.35),1.45,.12,M['trim'],parent,8)
    sides,rings = 64,14
    vertices=[]
    for ring in range(rings+1):
        angle=(math.pi/2)*ring/rings
        r=1.52*math.cos(angle)
        z=3.40+1.04*math.sin(angle)
        vertices.extend((r*math.cos(TAU*i/sides),r*math.sin(TAU*i/sides),z) for i in range(sides))
    faces=[(ring*sides+i,ring*sides+(i+1)%sides,(ring+1)*sides+(i+1)%sides,(ring+1)*sides+i)
           for ring in range(rings) for i in range(sides)]
    mesh('REN_PatinatedCopperDome',vertices,faces,M['copper'],parent,0,True)
    for index in range(16):
        azimuth=TAU*index/16
        points=[]
        for step in range(21):
            angle=step*math.pi/40
            r=1.533*math.cos(angle)
            points.append((r*math.cos(azimuth),r*math.sin(azimuth),3.40+1.055*math.sin(angle)))
        line('REN_RaisedCopperRib',points,.027,M['copperEdge'],parent)
    cylinder('REN_CopperEaveRing',(0,0,3.435),1.55,.095,M['copperEdge'],parent,64)
    cylinder('REN_LanternFoot',(0,0,4.47),.30,.09,M['copperEdge'],parent,8)
    cylinder('REN_LanternDarkInterior',(0,0,4.68),.18,.35,M['dark'],parent,8)
    for index in range(8):
        angle=TAU*index/8
        cylinder('REN_LanternPier',(.25*math.cos(angle),.25*math.sin(angle),4.69),.025,.37,M['brass'],parent,8)
    cylinder('REN_LanternCap',(0,0,4.92),.34,.17,M['copper'],parent,8,.065)
    cylinder('REN_LanternFinial',(0,0,5.085),.028,.20,M['brass'],parent,12,.005)
    line('REN_TerraceTelescope',[(1.78,-.79,2.72),(2.10,-1.23,2.96)],.07,M['brass'],parent)
    line('REN_TelescopeLens',[(2.10,-1.23,2.96),(2.12,-1.26,2.977)],.073,M['dark'],parent)
    for px,py in [(1.61,-.75),(2,-.66),(1.88,-1.10)]:
        line('REN_TelescopeTripod',[(1.82,-.84,2.74),(px,py,2.36)],.021,M['wood'],parent)
    return root


def loggia():
    root,parent,floor = terrace('REN_LoggiaWest',-6.8,19.2,4.08,2.25,3)
    for side in (-1,1):
        for index in range(5):
            x=-1.72+index*.86
            box('REN_LoggiaPier',(x,side*.9,.60),(.18,.30,1.2),M['stone'],parent)
            box('REN_LoggiaPierFoot',(x,side*.9,.08),(.29,.39,.16),M['trim'],parent)
            box('REN_LoggiaCapital',(x,side*.9,1.12),(.28,.36,.12),M['trim'],parent)
        for index in range(4):
            x=-1.29+index*.86
            arch('REN_OpenLoggiaArch',x,side*.9-.15,1.13,.34,.105,.30,M['trim'],parent)
            box('REN_LoggiaArchKeystone',(x,side*.9,1.51),(.11,.34,.19),M['stone'],parent)
    box('REN_LoggiaFrieze',(0,0,1.65),(3.86,1.88,.22),M['plaster'],parent)
    box('REN_LoggiaCornice',(0,0,1.79),(3.99,2,.09),M['trim'],parent)
    roof('REN_LoggiaHipRoof',4.08,2.07,1.85,.57,parent,'hip')
    box('REN_LoggiaBench',(0,.42,.40),(2.5,.32,.12),M['oak'],parent)
    for x in (-.95,.95):
        box('REN_LoggiaBenchLeg',(x,.42,.20),(.14,.30,.4),M['stone'],parent)
    return root


def civic_palazzo():
    root,parent,floor = terrace('REN_CivicPalazzo',-3.9,23,5.15,2.95,-5)
    facade('REN_Civic',4.8,2.6,2.8,parent,2,5)
    roof('REN_CivicHipRoof',5.06,2.87,2.91,.76,parent,'hip')
    extrude('REN_CentralPediment',[(-.70,2.89),(.70,2.89),(0,3.54)],-1.47,.19,M['plaster'],parent)
    line('REN_PedimentLeftCornice',[(-.77,-1.51,2.89),(0,-1.51,3.59)],.065,M['trim'],parent)
    line('REN_PedimentRightCornice',[(0,-1.51,3.59),(.77,-1.51,2.89)],.065,M['trim'],parent)
    box('REN_PedimentBase',(0,-1.49,2.91),(1.56,.22,.10),M['trim'],parent)
    circle=[(.19*math.cos(TAU*i/32),-1.583,3.13+.19*math.sin(TAU*i/32)) for i in range(33)]
    line('REN_SundialStoneRing',circle,.016,M['stone'],parent)
    for index in range(9):
        angle=math.pi*(index/8)
        line('REN_SundialHourMark',[(.14*math.cos(angle),-1.604,3.13+.14*math.sin(angle)),
             (.18*math.cos(angle),-1.604,3.13+.18*math.sin(angle))],.007,M['wood'],parent)
    line('REN_SundialGnomon',[(0,-1.61,3.13),(0,-1.75,3.24)],.018,M['brass'],parent)
    return root


def workshop():
    root,parent,floor = terrace('REN_Workshop',-.7,25.5,2.24,1.9,7)
    facade('REN_WorkshopFacade',2,1.6,1.65,parent,1,2,'ochre',False,False)
    roof('REN_WorkshopGableRoof',2.22,1.87,1.76,.64,parent,'gable')
    box('REN_WorkshopChimney',(.55,.32,2.48),(.27,.26,.69),M['stone'],parent)
    box('REN_WorkshopChimneyCap',(.55,.32,2.86),(.37,.36,.12),M['trim'],parent)
    for row in range(2):
        for col in range(2):
            line('REN_WorkshopLogStack',[(-.88+col*.13,-.92,.12+row*.13),(-.88+col*.13,-1.22,.12+row*.13)],
                 .065,M['oak'],parent)
    cylinder('REN_WorkshopBarrel',(.87,-1.06,.22),.15,.41,M['oak'],parent,12)
    for z in (.065,.21,.36):
        cylinder('REN_WorkshopBarrelHoop',(.87,-1.06,z),.157,.026,M['wood'],parent,12)
    return root


def east_house(name,x,y,width,depth,height,rotation,kind,wall,rows):
    root,parent,floor=terrace(name,x,y,width+.24,depth+.25,rotation)
    facade(name+'_Facade',width,depth,height,parent,rows,2,wall,False,True,True)
    roof(name+'_Roof',width+.23,depth+.23,height+.11,.64 if kind=='hip' else .48,parent,kind)
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
    bpy.data.objects['Blue sky bounce'].data.energy=650
    bpy.data.objects['Sun shafts'].data.angle=.07
    fog=bpy.data.objects['Atmosphere behind the battlefield']
    fog_material=fog.data.materials[0].copy()
    fog_material.name='REN_ValleyDepthGradient'
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


def build(source,outdir):
    global COLLECTION
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    if bpy.data.collections.get('REN_Architecture'):
        raise RuntimeError('Use the canonical source, not an already refined candidate.')
    source_camera=camera_contract()
    source_lane=lane_hash()
    archive=bpy.data.collections.new('REN_SourceArchive')
    bpy.context.scene.collection.children.link(archive)
    prefixes=('Observatory drum','Copper observatory dome','Observatory spire',
              'Old republic house','Terracotta gable','Inset window')
    archived=[]
    for obj in list(bpy.data.objects):
        if any(obj.name==prefix or obj.name.startswith(prefix+'.') for prefix in prefixes):
            for collection in list(obj.users_collection):
                collection.objects.unlink(obj)
            archive.objects.link(obj)
            obj.hide_render=True
            obj.hide_viewport=True
            archived.append(obj.name)
    archive.hide_render=True
    archive.hide_viewport=True
    COLLECTION=bpy.data.collections.new('REN_Architecture')
    bpy.context.scene.collection.children.link(COLLECTION)
    create_materials()
    groups=[observatory(),loggia(),civic_palazzo(),workshop(),
            east_house('REN_EastHouseA',7,23.5,2.6,1.9,2.1,-7,'hip','rose',2),
            east_house('REN_EastHouseB',8.8,27,1.8,1.55,1.6,8,'shed','ochre',1)]
    pines=move_occluding_pines()
    tune_lighting()
    scene=bpy.context.scene
    scene['authored_environment_revision']=2
    scene['environment_id']='renaissance'
    scene['runtime_background']='backgrounds/renaissance.png'
    scene['authoring_source']='tools/blender/refine_renaissance.py'
    scene['runtime_layout']='1280x720; combat_y=500; HUD_top=82; HUD_bottom=552'
    scene.render.resolution_x=1600
    scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    bpy.context.view_layer.update()
    candidate_camera=camera_contract()
    candidate_lane=lane_hash()
    if source_camera != candidate_camera:
        raise RuntimeError('Camera or resolution contract changed.')
    if source_lane != candidate_lane:
        raise RuntimeError('Terrain mesh or lane changed.')
    bounds={group.name:screen_bounds(group.children_recursive)
            for group in groups}
    if bounds['REN_Observatory'][1] < 132:
        raise RuntimeError('Observatory violates its HUD headroom: '+str(bounds['REN_Observatory']))
    outdir.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.save_version=0
    temporary=outdir/'candidate.saving.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(temporary),compress=True)
    replace_file(temporary,outdir/'candidate.blend')
    metrics={'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
             'candidate':str(outdir/'candidate.blend'),'camera_before':source_camera,
             'camera_after':candidate_camera,'camera_unchanged':True,
             'terrain_sha256_before':source_lane,'terrain_sha256_after':candidate_lane,
             'terrain_unchanged':True,'archived_source_objects':archived,
             'new_object_count':len(CREATED),'architecture_bounds_1280x720':bounds,
             'terrace_grounding':TERRACES,'relocated_pine_groups':pines,
             'rendered':False,'public_assets_changed':False,
             'notes':['Front facade walls contain geometric openings; window backs sit 0.27 units inside.',
                      'Loggia arches are open front to back, without opaque backing.',
                      'Octagonal observatory drum consists of eight perforated facets.',
                      'Terrain hash covers every source vertex, polygon index/material, and world matrix.']}
    write_json(outdir/'metrics.json',metrics)
    print('RENAISSANCE_CANDIDATE_BUILT '+json.dumps({'new_objects':len(CREATED),'bounds':bounds}))


def render(outdir,samples):
    bpy.ops.wm.open_mainfile(filepath=str(outdir/'candidate.blend'),load_ui=False)
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    preferences=bpy.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type='OPTIX'
    preferences.get_devices()
    devices=[]
    for device in preferences.devices:
        device.use=device.type=='OPTIX'
        if device.use:
            devices.append(device.name)
    if not devices:
        raise RuntimeError('No OptiX device; refusing an unexpected long CPU render.')
    scene.cycles.device='GPU'
    scene.cycles.samples=samples
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1600
    scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(outdir/'candidate.rendering.png')
    start=time.monotonic()
    bpy.ops.render.render(write_still=True)
    replace_file(outdir/'candidate.rendering.png',outdir/'candidate.png')
    path=outdir/'metrics.json'
    metrics=json.loads(path.read_text(encoding='utf-8'))
    metrics.update({'rendered':True,'render_samples':samples,'render_devices':devices,
                    'render_seconds':round(time.monotonic()-start,2),
                    'render_path':str(outdir/'candidate.png')})
    write_json(path,metrics)
    print('RENAISSANCE_CANDIDATE_RENDERED '+str(outdir/'candidate.png'))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    original=ROOT/'art/blender/candidates/renaissance-v2/original-background-renaissance.blend'
    parser.add_argument('--source',type=Path,default=original if original.exists() else ROOT/'art/blender/background-renaissance.blend')
    parser.add_argument('--outdir',type=Path,default=ROOT/'art/blender/candidates/renaissance-v2')
    parser.add_argument('--render',action='store_true')
    parser.add_argument('--render-only',action='store_true')
    parser.add_argument('--samples',type=int,default=48)
    arguments=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    source=arguments.source.resolve()
    outdir=arguments.outdir.resolve()
    public=(ROOT/'public').resolve()
    canonical=(ROOT/'art/blender').resolve()
    if outdir==canonical or outdir==public or public in outdir.parents:
        raise RuntimeError('Output must be a separate candidate directory, never public or canonical root.')
    if not arguments.render_only:
        build(source,outdir)
    if arguments.render or arguments.render_only:
        render(outdir,arguments.samples)


if __name__=='__main__':
    main()
