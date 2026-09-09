"""Author a compact hill-fortress castle candidate in the existing AgeOfMax valley.

Standalone bpy authoring. Geometry helpers are included; no lost generator,
external models or runtime authoring-library dependency. All outputs stay staged.
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
    mat = bpy.data.materials.new('CAS_' + name)
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



def create_materials():
    definitions={
      'stone':((.45,.43,.34),.83,0,.09,.022),
      'stoneLight':((.54,.51,.40),.83,0,.065,.020),
      'stoneDark':((.34,.36,.30),.90,0,.07,.024),
      'trim':((.58,.55,.43),.77,0,.045,.014),
      'mortar':((.26,.285,.235),.96,0,.04,.018),
      'oak':((.17,.095,.047),.88,0,.14,.025),
      'wood':((.24,.155,.076),.86,0,.10,.023),
      'plaster':((.49,.445,.335),.93,0,.045,.014),
      'dark':((.023,.035,.033),.93,0,.015,.002),
      'iron':((.13,.18,.175),.52,.62,.06,.009),
      'brass':((.39,.255,.088),.43,.64,.05,.004),
      'roof0':((.11,.205,.22),.78,.08,.05,.013),
      'roof1':((.145,.245,.25),.76,.08,.05,.013),
      'roof2':((.085,.165,.185),.82,.06,.05,.013),
      'cloth':((.06,.23,.215),.94,0,.08,.007),
      'path':((.285,.29,.22),.98,0,.08,.014)}
    for name,values in definitions.items():M[name]=material(name,*values)


def block_batch(name,blocks,materials,parent):
    vertices=[];faces=[];indices=[]
    cube_faces=[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    for center,size,material_index in blocks:
        x,y,z=center;a,b,c=(value/2 for value in size);offset=len(vertices)
        vertices.extend([(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
                         (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)])
        faces.extend(tuple(offset+i for i in face) for face in cube_faces)
        indices.extend([material_index]*6)
    obj=mesh(name,vertices,faces,None,parent,.008)
    for mat in materials:obj.data.materials.append(mat)
    for face,index in zip(obj.data.polygons,indices):face.material_index=index
    return obj


def subtract_interval(intervals,left,right):
    result=[]
    for a,b in intervals:
        if right<=a or left>=b:result.append((a,b));continue
        if a<left:result.append((a,left))
        if right<b:result.append((right,b))
    return result


def masonry_panel(name,width,depth,bottom,top,parent,openings=(),front=0,veneer=True):
    # Each opening is a rectangle genuinely absent through the whole wall depth.
    xs=sorted(set([-width/2,width/2]+[value for x,z,w,h in openings for value in (x-w/2,x+w/2)]))
    zs=sorted(set([bottom,top]+[value for x,z,w,h in openings for value in (z,z+h)]))
    solids=[]
    for left,right in zip(xs,xs[1:]):
        for low,high in zip(zs,zs[1:]):
            x,z=(left+right)/2,(low+high)/2
            if any(abs(x-ox)<w/2 and oz<z<oz+h for ox,oz,w,h in openings):continue
            solids.append(((x,front+depth/2,z),(right-left,depth,high-low),0))
    block_batch(name+'_PerforatedMasonryCore',solids,[M['mortar']],parent)
    if not veneer:return
    blocks=[];row_height=.27;row=0;low=bottom
    while low<top-.025:
        high=min(top,low+row_height)
        intervals=[(-width/2,width/2)]
        for x,z,w,h in openings:
            if low<z+h and high>z:intervals=subtract_interval(intervals,x-w/2-.009,x+w/2+.009)
        for a,b in intervals:
            cursor=a;index=0
            while cursor<b-.025:
                size=.54+.19*((index+row*2)%3)
                if index==0 and row%2:size*=.63
                end=min(b,cursor+size)
                if end-cursor>.027:
                    blocks.append((((cursor+end)/2,front-.026,(low+high)/2),
                                  (end-cursor-.016,.095,high-low-.015),(row+index)%3))
                cursor=end;index+=1
        low=high;row+=1
    block_batch(name+'_CoursedStoneFacing',blocks,[M['stone'],M['stoneLight'],M['stoneDark']],parent)
    for x,z,w,h in openings:
        box(name+'_SlitHead',(x,front-.08,z+h+.045),(w+.22,.19,.09),M['trim'],parent,.009)
        box(name+'_SlitSill',(x,front-.085,z-.035),(w+.19,.20,.07),M['stone'],parent,.008)


def footing(name,x,y,width,depth,rotation=0,floor=None):
    root=empty(name,(x,y,0));angle=math.radians(rotation);root.rotation_euler.z=angle
    def world_xy(px,py):return x+px*math.cos(angle)-py*math.sin(angle),y+px*math.sin(angle)+py*math.cos(angle)
    corners=[(-width/2,-depth/2),(width/2,-depth/2),(width/2,depth/2),(-width/2,depth/2)]
    heights=[soil_height(*world_xy(px,py)) for px,py in corners]+[soil_height(x,y)]
    level=max(heights)+.16 if floor is None else max(floor,max(heights)+.045)
    perimeter=[]
    for index,(ax,ay) in enumerate(corners):
        bx,by=corners[(index+1)%4];count=max(2,math.ceil(math.hypot(bx-ax,by-ay)/.32))
        for step in range(count):
            t=step/count;px=ax+(bx-ax)*t;py=ay+(by-ay)*t
            perimeter.append((px,py,soil_height(*world_xy(px,py))-.075))
    n=len(perimeter)
    mesh(name+'_SlopeFoundation',perimeter+[(px,py,level) for px,py,z in perimeter],
         [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(range(n,2*n))],M['stoneDark'],root)
    box(name+'_FoundationCoping',(0,0,level+.055),(width+.05,depth+.05,.11),M['stone'],root)
    floor_level=level+.11
    parent=empty(name+'_Superstructure',(0,0,floor_level),root)
    TERRACES.append({'name':name,'soil_heights':heights,'coping_top':floor_level,
                     'world_center':[x,y],'rotation':rotation,'perimeter_soil_samples':n})
    return root,parent,floor_level


def square_shell(name,width,depth,height,parent,openings_front,openings_side=()):
    for label,position,rotation,w,openings in [
       ('Front',(0,-depth/2,0),0,width,openings_front),
       ('Back',(0,depth/2,0),math.pi,width,openings_side),
       ('Left',(-width/2,0,0),-math.pi/2,depth,openings_side),
       ('Right',(width/2,0,0),math.pi/2,depth,openings_side)]:
        face=empty(name+'_'+label,position,parent);face.rotation_euler.z=rotation
        masonry_panel(name+'_'+label,w,.34,0,height,face,openings)


def battlement_line(name,width,depth,height,parent,spacing=.75):
    box(name+'_Parapet',(0,0,height+.16),(width,depth,.32),M['stone'],parent)
    count=max(2,round(width/spacing))
    for index in range(count):
        x=-width/2+(index+.5)*width/count
        box(name+'_Merlon',(x,0,height+.53),(.41,depth,.43),M['stoneLight'],parent,.025)
        box(name+'_SlopingMerlonCap',(x,0,height+.76),(.47,depth+.075,.085),M['stone'],parent,.017)


def octagonal_bastion():
    root,parent,floor=footing('CAS_WestBastion',-5.45,23.65,2.76,2.76,-2)
    deck=4.05-floor;radius=1.32;sides=8
    for index in range(sides):
        alpha=TAU*index/sides;apothem=radius*math.cos(math.pi/sides)
        face=empty('CAS_BastionFacet',((apothem-.17)*math.cos(alpha),(apothem-.17)*math.sin(alpha),0),parent)
        face.rotation_euler.z=alpha+math.pi/2
        slit=[(0,deck*.47,.14,.65)] if index not in (0,1,7) else []
        masonry_panel('CAS_BastionFacet',2*radius*math.sin(math.pi/sides),.34,0,deck,face,slit,front=-.17)
    cylinder('CAS_BastionWallWalk',(0,0,deck+.045),1.46,.16,M['stone'],parent,8)
    for index in range(sides):
        if index==0:continue  # Walkway stair enters through this real gap.
        alpha=TAU*index/sides
        face=empty('CAS_BastionParapet',((1.29)*math.cos(alpha),1.29*math.sin(alpha),0),parent)
        face.rotation_euler.z=alpha+math.pi/2
        battlement_line('CAS_BastionCrown',.98,.30,deck+.12,face,.70)
        for sign in (-1,1):
            box('CAS_BastionCorbel',(sign*.28,-.08,deck-.14),(.13,.42,.24),M['stoneDark'],face)
    root['walk_height']=floor+deck+.12
    return root


def keep():
    root,parent,floor=footing('CAS_SquareKeep',-3.20,28.10,3.28,2.92,-5)
    openings=[(-.78,.75,.15,.67),(.78,.75,.15,.67),(-.78,2.72,.24,.58),(.78,2.72,.24,.58)]
    square_shell('CAS_Keep',3.04,2.68,3.72,parent,openings,[(0,1.20,.15,.72)])
    box('CAS_KeepUpperCourse',(0,0,2.71),(3.17,2.80,.14),M['stoneLight'],parent)
    box('CAS_KeepCoping',(0,0,3.75),(3.30,2.94,.17),M['trim'],parent)
    for x in (-1.34,-.68,0,.68,1.34):
        box('CAS_KeepFrontCorbel',(x,-1.47,3.58),(.16,.28,.32),M['stoneDark'],parent)
    roof('CAS_KeepSlateHip',3.57,3.18,3.87,.83,parent,'hip')
    line('CAS_KeepBannerPole',[(0,0,4.75),(0,0,5.20)],.018,M['oak'],parent)
    vertices=[(0,0,5.14),(.30,.035,5.14),(.67,-.02,5.12),
              (0,0,4.90),(.30,.045,4.91),(.58,-.015,4.93)]
    mesh('CAS_KeepClothBanner',vertices,[(0,1,4,3),(1,2,5,4)],M['cloth'],parent)
    return root


def east_watchtower():
    root,parent,floor=footing('CAS_RoundWatchtower',5.35,24.0,2.90,2.90,2)
    deck=4.10-floor;radius=1.25;sides=12
    for index in range(sides):
        alpha=TAU*index/sides;apothem=radius*math.cos(math.pi/sides)
        face=empty('CAS_WatchtowerFacet',((apothem-.17)*math.cos(alpha),(apothem-.17)*math.sin(alpha),0),parent)
        face.rotation_euler.z=alpha+math.pi/2
        slits=[(0,deck*.46,.135,.72)] if index%2==0 else []
        masonry_panel('CAS_Watchtower',2*radius*math.sin(math.pi/sides),.34,0,deck,face,slits,front=-.17)
    cylinder('CAS_HoardingTimberFloor',(0,0,deck+.04),1.51,.13,M['wood'],parent,8)
    for index in range(8):
        angle=TAU*index/8
        face=empty('CAS_HoardingFrame',(1.33*math.cos(angle),1.33*math.sin(angle),0),parent)
        face.rotation_euler.z=angle+math.pi/2
        for x in (-.50,.50):
            box('CAS_HoardingUpright',(x,0,deck+.47),(.10,.13,.84),M['oak'],face)
            line('CAS_HoardingBrace',[(x,-.10,deck-.05),(x,.30,deck-.43)],.055,M['oak'],face)
        box('CAS_HoardingLintel',(0,0,deck+.84),(1.12,.16,.14),M['oak'],face)
        if index!=4:
            for plank in range(7):
                box('CAS_HoardingParapetPlank',(-.45+plank*.15,0,deck+.24),(.142,.08,.40),M['wood'],face,.007)
            box('CAS_HoardingSill',(0,-.02,deck+.46),(1.13,.13,.09),M['oak'],face)
    # Short eight-sided roof with a flat crown; deliberately unlike a pointed cone.
    base=deck+.94
    for ring in range(4):
        t0=ring/4;t1=(ring+1.08)/4
        r0=1.68+( .35-1.68)*t0;r1=1.68+(.35-1.68)*min(1,t1)
        z0=base+.60*t0;z1=base+.60*min(1,t1)
        vertices=[(radius*math.cos(TAU*i/8),radius*math.sin(TAU*i/8),z)
                  for radius,z in [(r0,z0),(r1,z1)] for i in range(8)]
        mesh('CAS_HoardingSlateCourses',vertices,[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],M['roof'+str(ring%3)],parent)
    for index in range(8):
        angle=TAU*index/8
        line('CAS_HoardingHipRib',[(1.70*math.cos(angle),1.70*math.sin(angle),base+.015),
             (.35*math.cos(angle),.35*math.sin(angle),base+.63)],.032,M['roof1'],parent)
    cylinder('CAS_HoardingFlatCrown',(0,0,base+.64),.40,.075,M['iron'],parent,8)
    root['walk_height']=floor+deck+.11
    return root


def hall():
    root,parent,floor=footing('CAS_InnerGreatHall',1.50,29.5,4.85,2.85,4)
    square_shell('CAS_GreatHall',4.60,2.60,3.18,parent,
                 [(-1.40,2.10,.43,.72),(0,2.10,.43,.72),(1.40,2.10,.43,.72)],[(0,2.10,.30,.64)])
    for z in (1.83,3.10):
        box('CAS_HallHorizontalTimber',(0,-1.37,z),(4.74,.14,.13),M['oak'],parent)
    for x in (-2.25,-.70,.70,2.25):
        box('CAS_HallTimberPost',(x,-1.37,2.48),(.12,.15,1.30),M['oak'],parent)
    for a,b in [(-2.20,-1.76),(-.63,-.27),(.63,.27),(2.20,1.76)]:
        line('CAS_HallDiagonalBrace',[(a,-1.40,1.90),(b,-1.40,3.00)],.045,M['oak'],parent)
    roof('CAS_GreatHallSlateGable',4.99,3.04,3.31,1.01,parent,'gable')
    for sign in (-1,1):
        line('CAS_HallBargeboard',[(sign*2.51,-1.56,3.3),(sign*2.51,0,4.36),
             (sign*2.51,1.56,3.3)],.055,M['oak'],parent)
    box('CAS_HallStoneChimney',(1.36,.55,3.92),(.35,.38,.96),M['stone'],parent)
    box('CAS_HallChimneyCoping',(1.36,.55,4.43),(.48,.49,.13),M['stoneDark'],parent)
    return root


def arch_stones(name,x,front,spring,radius,width,depth,parent,count=13):
    for index in range(count):
        a=index*math.pi/count+.012;b=(index+1)*math.pi/count-.012
        polygon=[(x+radius*math.cos(a),spring+radius*math.sin(a)),
                 (x+radius*math.cos(b),spring+radius*math.sin(b)),
                 (x+(radius+width)*math.cos(b),spring+(radius+width)*math.sin(b)),
                 (x+(radius+width)*math.cos(a),spring+(radius+width)*math.sin(a))]
        extrude(name+'_Voussoir',polygon,front,depth,M[['stone','trim','stoneLight'][index%3]],parent)


def arch_wall(name,width,height,front,depth,radius,spring,parent):
    # A true arch tunnel: neither a full wall nor a black plane blocks the opening.
    box(name+'_LeftPier',(-(width/2+radius)/2,front+depth/2,height/2),
        (width/2-radius,depth,height),M['stone'],parent)
    box(name+'_RightPier',((width/2+radius)/2,front+depth/2,height/2),
        (width/2-radius,depth,height),M['stone'],parent)
    top=spring+radius
    box(name+'_Header',(0,front+depth/2,(height+top)/2),(radius*2,depth,height-top),M['stone'],parent)
    left=[(-radius,top),(0,top)]+[(radius*math.cos(math.pi/2+i*math.pi/32),spring+radius*math.sin(math.pi/2+i*math.pi/32)) for i in range(1,17)]
    right=[(0,top),(radius,top)]+[(radius*math.cos(i*math.pi/32),spring+radius*math.sin(i*math.pi/32)) for i in range(17)]
    extrude(name+'_LeftArchSpandrel',left,front,depth,M['stone'],parent)
    extrude(name+'_RightArchSpandrel',right,front,depth,M['stone'],parent)
    arch_stones(name,0,front-.095,spring,radius,.22,.28,parent)
    for sign in (-1,1):
        for row in range(math.ceil(spring/.23)):
            z=.115+row*.23
            if z>spring:continue
            box(name+'_CarvedJamb',(sign*(radius+.11),front-.08,z),(.22,.25,.21),M['trim'],parent,.014)


def gatehouse():
    root,parent,floor=footing('CAS_RecessedGatehouse',.30,25.0,3.62,3.10,0)
    body_height=3.50-floor
    arch_wall('CAS_MainGate',3.34,body_height,-1.40,2.65,.81,.93,parent)
    arch('CAS_BarrelVaultLining',0,-1.41,.93,.815,.095,2.65,M['stoneDark'],parent)
    arch_stones('CAS_RearGateArch',0,1.08,.93,.81,.13,.20,parent)
    # Raised portcullis leaves the lower tunnel open and reveals its actual depth.
    for index in range(9):
        x=-.70+index*.175
        box('CAS_RaisedPortcullisBar',(x,-1.01,1.65),(.045,.055,.72),M['iron'],parent,.006)
    for z in (1.41,1.70,1.93):
        box('CAS_PortcullisCrossbar',(0,-1.01,z),(1.51,.065,.045),M['iron'],parent,.005)
    for side in (-1,1):
        leaf=empty('CAS_OpenInnerGateLeaf',(side*.70,.88,0),parent)
        leaf.rotation_euler.z=side*.68
        box('CAS_InnerGateTimbers',(-side*.15,0,.77),(.30,.13,1.54),M['oak'],leaf)
        for z in (.30,.98):
            box('CAS_GateIronStrap',(-side*.15,-.08,z),(.32,.055,.045),M['iron'],leaf)
    floor_walk=3.50-floor
    box('CAS_GateUpperFloor',(0,0,floor_walk+.045),(3.64,3.15,.17),M['stone'],parent)
    for x in (-1.63,-.82,0,.82,1.63):
        box('CAS_GateFrontCorbel',(x,-1.60,floor_walk-.13),(.15,.45,.33),M['stoneDark'],parent)
    for y in (-1.45,1.35):
        for x in (-1.52,-.76,0,.76,1.52):
            box('CAS_GateWatchPost',(x,y,floor_walk+.48),(.12,.15,.83),M['oak'],parent)
        box('CAS_GateWatchSill',(0,y,floor_walk+.17),(3.38,.14,.19),M['wood'],parent)
        box('CAS_GateWatchHeader',(0,y,floor_walk+.89),(3.46,.17,.16),M['oak'],parent)
        for x in (-1.15,-.38,.38,1.15):
            box('CAS_GateLowParapet',(x,y,floor_walk+.32),(.64,.10,.35),M['wood'],parent,.010)
    roof('CAS_GatehouseTimberRoof',3.88,3.48,floor_walk+.99,.72,parent,'gable')
    root['gate_floor']=floor;root['walk_height']=3.50
    return root


def curtain(name,start,end,slits=3):
    a=Vector(start);b=Vector(end);center=(a+b)/2;length=(b-a).length
    root=empty(name,(center.x,center.y,0));root.rotation_euler.z=math.atan2(b.y-a.y,b.x-a.x)
    bpy.context.view_layer.update()
    heights=[]
    for index in range(max(4,math.ceil(length/.3))+1):
        point=a.lerp(b,index/max(4,math.ceil(length/.3)))
        heights.append(soil_height(point.x,point.y))
    bottom=min(heights)-.09;walk=3.50
    openings=[(-length/2+(index+1)*length/(slits+1),2.05,.15,.64) for index in range(slits)]
    masonry_panel(name,length,.90,bottom,walk,root,openings,front=-.45)
    box(name+'_WalkwayDeck',(0,0,walk+.055),(length+.16,1.07,.11),M['stone'],root)
    crown=empty(name+'_OuterParapet',(0,-.405,0),root)
    battlement_line(name,length,.26,walk+.12,crown)
    for index in range(max(2,math.ceil(length/.85))+1):
        x=-length/2+length*index/max(2,math.ceil(length/.85))
        box(name+'_InnerRailPost',(x,.48,walk+.37),(.055,.07,.55),M['oak'],root)
    box(name+'_InnerHandrail',(0,.48,walk+.65),(length+.04,.07,.07),M['oak'],root,.007)
    root['walk_clear_width']=.73
    root['walk_height']=walk+.11
    return root


def wall_stairs(name,start,end,z0,z1):
    root=empty(name)
    a=Vector(start);b=Vector(end);direction=(b-a).normalized();length=(b-a).length
    angle=math.atan2(direction.y,direction.x);steps=6
    for index in range(steps):
        center=a.lerp(b,(index+.5)/steps)
        high=z0+(z1-z0)*(index+1)/steps
        block=box(name+'_StoneTread',(0,0,(z0-.10+high)/2),(length/steps+.015,.66,high-z0+.10),M['stone'],root)
        block.location=(center.x,center.y,0);block.rotation_euler.z=angle
    normal=Vector((-direction.y,direction.x))*.34
    for side in (-1,1):
        line(name+'_WoodHandrail',[(a.x+normal.x*side,a.y+normal.y*side,z0+.49),
             (b.x+normal.x*side,b.y+normal.y*side,z1+.49)],.029,M['oak'],root)
    return root


def curtain_system():
    walls=[curtain('CAS_WestFrontCurtain',(-5.35,23.0),(-1.49,23.0),3),
           curtain('CAS_EastFrontCurtain',(2.10,23.0),(5.35,23.0),3),
           curtain('CAS_GateWestReturn',(-1.49,23.0),(-1.49,24.1),1),
           curtain('CAS_GateEastReturn',(2.10,24.1),(2.10,23.0),1),
           curtain('CAS_WestRearCurtain',(-4.65,27.55),(-5.35,23.65),2),
           curtain('CAS_EastRearCurtain',(5.35,24.0),(2.70,28.8),3)]
    walls += [wall_stairs('CAS_BastionAccessStair',(-3.50,23.30),(-4.63,23.58),3.61,4.17),
              wall_stairs('CAS_WatchtowerAccessStair',(3.20,23.42),(4.13,23.93),3.61,4.21)]
    return walls


def ground_path(name,points,width,parent):
    centers=[]
    for index in range(len(points)-1):
        a=Vector(points[index]);b=Vector(points[index+1]);count=max(4,math.ceil((b-a).length/.20))
        for step in range(count):centers.append(a.lerp(b,step/count))
    centers.append(Vector(points[-1]));vertices=[]
    for index,point in enumerate(centers):
        tangent=centers[min(index+1,len(centers)-1)]-centers[max(0,index-1)];tangent.normalize()
        normal=Vector((-tangent.y,tangent.x))
        for side in (-1,0,1):
            xy=point+normal*width*.5*side
            vertices.append((xy.x,xy.y,soil_height(xy.x,xy.y)+.045))
    mesh(name,vertices,[(i*3+j,i*3+j+1,(i+1)*3+j+1,(i+1)*3+j) for i in range(len(centers)-1) for j in range(2)],M['path'],parent)
    return len(vertices)


def gate_approach(gate):
    root=empty('CAS_GateBridgeApproach')
    bpy.context.view_layer.update()
    start=gate.matrix_world@Vector((0,-1.55,float(gate['gate_floor'])+.02))
    end=Vector((-.65,18.65,soil_height(-.65,18.65)+.14))
    direction=Vector((end.x-start.x,end.y-start.y));length=direction.length;direction.normalize()
    normal=Vector((-direction.y,direction.x))
    steps=max(14,math.ceil(length/.18))
    for index in range(steps):
        t=(index+.5)/steps;center=start.lerp(end,t)
        plank=box('CAS_BridgeDeckPlank',(0,0,center.z),(1.57,length/steps-.014,.072),M['wood' if index%4 else 'oak'],root,.008)
        plank.location=(center.x,center.y,0);plank.rotation_euler.z=math.atan2(direction.y,direction.x)-math.pi/2
    for side in (-1,1):
        offset=normal*.60*side
        line('CAS_BridgeMainTimber',[(start.x+offset.x,start.y+offset.y,start.z-.12),
             (end.x+offset.x,end.y+offset.y,end.z-.12)],.09,M['oak'],root)
        rail_offset=normal*.78*side
        line('CAS_BridgeHandrail',[(start.x+rail_offset.x,start.y+rail_offset.y,start.z+.52),
             (end.x+rail_offset.x,end.y+rail_offset.y,end.z+.52)],.045,M['oak'],root)
        for index in range(6):
            t=index/5;point=start.lerp(end,t)
            box('CAS_BridgeRailPost',(point.x+rail_offset.x,point.y+rail_offset.y,point.z+.25),(.075,.075,.61),M['oak'],root)
    for t in (.13,.87):
        center=start.lerp(end,t)
        ground=soil_height(center.x,center.y)
        pier=box('CAS_BridgeStoneAbutment',(0,0,(ground-.08+center.z-.08)/2),
                 (1.82,.48,max(.10,center.z-ground)),M['stoneDark'],root)
        pier.location=(center.x,center.y,0);pier.rotation_euler.z=math.atan2(direction.y,direction.x)-math.pi/2
        cap=box('CAS_BridgeAbutmentCoping',(0,0,center.z-.08),(1.93,.56,.13),M['stone'],root)
        cap.location=(center.x,center.y,0);cap.rotation_euler.z=pier.rotation_euler.z
    path_samples=ground_path('CAS_GroundedGateTrail',[(end.x,end.y),(-1.70,17.70),(-3.30,17.95)],1.57,root)
    # A short grounded court strip continues the passage inside the walls.
    ground_path('CAS_InnerCourtTrail',[(.30,26.30),(.10,27.40),(.35,28.0)],1.55,root)
    root['bridge_length']=length;root['bridge_planks']=steps;root['trail_soil_samples']=path_samples
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
    fog_material.name='CAS_ValleyDepthGradient'
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



def verify_geometry():
    scene=bpy.context.scene;deps=bpy.context.evaluated_depsgraph_get();checks=[]
    gate=bpy.data.objects['CAS_RecessedGatehouse_Superstructure']
    origin=gate.matrix_world@Vector((.12,-1.70,.55))
    direction=(gate.matrix_world.to_3x3()@Vector((0,1,0))).normalized()
    hit,point,normal,index,obj,matrix=scene.ray_cast(deps,origin,direction,distance=2.75)
    assert not hit,('The gate passage is blocked',obj.name if obj else None)
    checks.append({'name':'Unblocked real vaulted gate passage','ray_distance':2.75,'passed':True})
    face=bpy.data.objects['CAS_BastionFacet.006']
    bastion=bpy.data.objects['CAS_WestBastion_Superstructure']
    deck=4.05-bastion.location.z
    origin=face.matrix_world@Vector((0,-.55,deck*.47+.27))
    direction=(face.matrix_world.to_3x3()@Vector((0,1,0))).normalized()
    hit,point,normal,index,obj,matrix=scene.ray_cast(deps,origin,direction,distance=.80)
    assert not hit,('Arrow slit is blocked',obj.name if obj else None)
    checks.append({'name':'Arrow slit penetrates the bastion wall','ray_distance':.80,'passed':True})
    walls=[obj for obj in CREATED if obj.type=='EMPTY' and 'walk_clear_width' in obj]
    assert len(walls)==6 and min(float(wall['walk_clear_width']) for wall in walls)>.70
    checks.append({'name':'Six linked curtain-wall walks have actual clear depth above .70','passed':True})
    return checks


def build(source,outdir):
    global COLLECTION
    source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    public=ROOT/'public/assets/reborn/backgrounds/castle.png'
    public_hash=hashlib.sha256(public.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    if bpy.data.collections.get('CAS_Architecture'):
        raise RuntimeError('Use the original castle source, not an existing refined candidate.')
    camera_before=camera_contract();terrain_before=lane_hash()
    archive=bpy.data.collections.new('CAS_SourceArchive');bpy.context.scene.collection.children.link(archive)
    prefixes=('Banner staff','Castle gate','Castle turret roof','Crenellation','Finial',
              'Limestone curtain wall','Portcullis','Wall cap','Wind shaped woven banner')
    archived=[]
    for obj in list(bpy.data.objects):
        if any(obj.name==name or obj.name.startswith(name+'.') for name in prefixes):
            for collection in list(obj.users_collection):collection.objects.unlink(obj)
            archive.objects.link(obj);obj.hide_render=True;obj.hide_viewport=True;archived.append(obj.name)
    archive.hide_render=True;archive.hide_viewport=True
    COLLECTION=bpy.data.collections.new('CAS_Architecture');bpy.context.scene.collection.children.link(COLLECTION)
    create_materials()
    gate=gatehouse()
    groups=[octagonal_bastion(),keep(),east_watchtower(),hall(),gate]
    walls=curtain_system();approach=gate_approach(gate)
    pines=move_occluding_pines();tune_lighting()
    scene=bpy.context.scene
    scene['authored_environment_revision']=2;scene['environment_id']='castle'
    scene['runtime_background']='backgrounds/castle.png';scene['authoring_source']='tools/blender/refine_castle.py'
    scene['runtime_layout']='1280x720; combat_y=500; quiet_lane=410..525; HUD_top=82; HUD_bottom=552'
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(outdir/'candidate.png')
    bpy.context.view_layer.update()
    bounds={obj.name:screen_bounds(obj.children_recursive) for obj in groups+walls+[approach]}
    print('CASTLE_BOUNDS '+json.dumps(bounds),flush=True)
    assert camera_contract()==camera_before,'Camera changed.'
    assert lane_hash()==terrain_before,'Terrain changed.'
    assert all(value[1]>=108 and value[3]<=410 for value in bounds.values()),bounds
    geometry_checks=verify_geometry()
    assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
    assert hashlib.sha256(public.read_bytes()).hexdigest()==public_hash
    outdir.mkdir(parents=True,exist_ok=True)
    for path,target in [(source,outdir/'original-background-castle.blend'),(public,outdir/'original-background-castle.png')]:
        if not target.exists():target.write_bytes(path.read_bytes())
    bpy.context.preferences.filepaths.save_version=0
    temporary=outdir/'candidate.saving.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(temporary),compress=True);replace_file(temporary,outdir/'candidate.blend')
    report={'status':'built','source':str(source),'source_sha256':source_hash,
      'public_original_sha256':public_hash,'source_and_public_unchanged':True,
      'camera_before':camera_before,'camera_after':camera_contract(),'camera_unchanged':True,
      'terrain_sha256_before':terrain_before,'terrain_sha256_after':lane_hash(),'terrain_unchanged':True,
      'architecture_bounds_1280x720':bounds,'archived_objects':archived,
      'new_object_count':len(CREATED),'total_objects':len(bpy.data.objects),'terrain_footings':TERRACES,
      'geometry_checks':geometry_checks,'relocated_pine_groups':pines,
      'bridge':{'length':approach['bridge_length'],'deck_planks':approach['bridge_planks'],
                'trail_soil_samples':approach['trail_soil_samples']},
      'rendered':False,'publication':'candidate only'}
    write_json(outdir/'metrics.json',report)
    print('CASTLE_CANDIDATE_BUILT '+str(outdir/'candidate.blend'),flush=True)


def render(outdir,samples):
    bpy.ops.wm.open_mainfile(filepath=str(outdir/'candidate.blend'),load_ui=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES'
    preferences=bpy.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type='OPTIX';preferences.get_devices();devices=[]
    for device in preferences.devices:
        device.use=device.type=='OPTIX'
        if device.use:devices.append(device.name)
    if not devices:raise RuntimeError('No OptiX device; refusing unexpected long CPU rendering.')
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
    print('CASTLE_CANDIDATE_RENDERED '+str(outdir/'candidate.png'),flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    original=ROOT/'art/blender/candidates/castle-v2/original-background-castle.blend'
    parser.add_argument('--source',type=Path,default=original if original.exists() else ROOT/'art/blender/background-castle.blend')
    parser.add_argument('--outdir',type=Path,default=ROOT/'art/blender/candidates/castle-v2')
    parser.add_argument('--render',action='store_true');parser.add_argument('--render-only',action='store_true')
    parser.add_argument('--samples',type=int,default=32)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    source=args.source.resolve();outdir=args.outdir.resolve()
    if not outdir.is_relative_to(ROOT/'art/blender/candidates'):
        raise RuntimeError('Outputs must remain inside the isolated candidate tree.')
    if not args.render_only:build(source,outdir)
    if args.render or args.render_only:render(outdir,args.samples)


if __name__=='__main__':main()
