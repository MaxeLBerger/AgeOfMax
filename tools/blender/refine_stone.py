"""Stage an authored prehistoric settlement in the original Stone valley.

No external assets or skills. All scene changes and renders remain candidates.
The original camera, continuous terrain, foreground lane and canonical files
are preserved. Ordinary Blender meshes, curves and shader nodes stay editable.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random
import struct
import sys
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
COLLECTION = None
CREATED = []
GROUPS = []
CROWN_TEMPLATE = None
M = {}
TAU = math.tau


def atomic(source, target):
    for attempt in range(12):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if attempt == 11:
                raise
            time.sleep(.15)


def write_json(path, data):
    temporary = path.with_suffix('.writing.json')
    temporary.write_text(json.dumps(data, indent=2), encoding='utf-8')
    atomic(temporary, path)


def camera_contract():
    scene = bpy.context.scene
    camera = scene.camera
    return {'name':camera.name, 'matrix':[list(row) for row in camera.matrix_world],
            'type':camera.data.type, 'ortho_scale':camera.data.ortho_scale,
            'resolution':[scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage]}


def terrain_hash():
    obj = bpy.data.objects['Sculpted continuous valley']
    digest = hashlib.sha256()
    for vertex in obj.data.vertices:
        digest.update(struct.pack('<3f', *vertex.co))
    for polygon in obj.data.polygons:
        digest.update(struct.pack('<I', polygon.material_index))
        digest.update(struct.pack('<'+'I'*len(polygon.vertices), *polygon.vertices))
    for row in obj.matrix_world:
        digest.update(struct.pack('<4f', *row))
    return digest.hexdigest()


def bounds(objects):
    scene=bpy.context.scene
    points=[world_to_camera_view(scene,scene.camera,obj.matrix_world@Vector(v))
            for obj in objects if obj.type in {'MESH','CURVE'} for v in obj.bound_box]
    return [round(min(p.x for p in points)*1280,2),round((1-max(p.y for p in points))*720,2),
            round(max(p.x for p in points)*1280,2),round((1-min(p.y for p in points))*720,2)]


def soil(x,y):
    terrain=bpy.data.objects['Sculpted continuous valley']
    hit,point,normal,index=terrain.ray_cast(Vector((x,y,30)),Vector((0,0,-1)),distance=70)
    if not hit:raise RuntimeError('No ground at '+str((x,y)))
    return point.z


def empty(name, location=(0,0,0)):
    obj=bpy.data.objects.new('STN_'+name,None)
    COLLECTION.objects.link(obj);obj.location=location
    CREATED.append(obj);GROUPS.append(obj)
    return obj


def mesh(name, vertices, faces, material, parent=None, bevel=0, smooth=False):
    data=bpy.data.meshes.new('STN_'+name+'_Mesh')
    data.from_pydata(vertices,[],faces);data.validate();data.update()
    obj=bpy.data.objects.new('STN_'+name,data)
    COLLECTION.objects.link(obj);obj.parent=parent
    data.materials.append(material)
    if bevel:
        mod=obj.modifiers.new('Soft eroded edges','BEVEL');mod.width=bevel;mod.segments=3
    if smooth:
        for polygon in data.polygons:polygon.use_smooth=True
    CREATED.append(obj)
    return obj


def strand(name, points, radius, material, parent=None):
    curve=bpy.data.curves.new('STN_'+name+'_Curve','CURVE')
    curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for point,coordinate in zip(spline.points,points):point.co=(*coordinate,1)
    obj=bpy.data.objects.new('STN_'+name,curve)
    COLLECTION.objects.link(obj);obj.parent=parent;curve.materials.append(material)
    CREATED.append(obj)
    return obj


def material(name, color, roughness=.9, variation=.17, bump=.015):
    mat=bpy.data.materials.new('STN_'+name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    shader=nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=roughness
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=5
    noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.7
    ramp=nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(*(c*(1-variation) for c in color),1)
    ramp.color_ramp.elements[1].color=(*(min(1,c*(1+variation)) for c in color),1)
    links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],shader.inputs['Base Color'])
    grain=nodes.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=48
    bumpnode=nodes.new('ShaderNodeBump');bumpnode.inputs['Strength'].default_value=.25
    bumpnode.inputs['Distance'].default_value=bump
    links.new(grain.outputs['Fac'],bumpnode.inputs['Height']);links.new(bumpnode.outputs['Normal'],shader.inputs['Normal'])
    M[name]=mat
    return mat


def materials():
    for name,color in {
        'stone':(.37,.395,.335),'stoneLight':(.43,.42,.335),'stoneDark':(.24,.28,.25),
        'moss':(.155,.235,.11),'bark':(.18,.105,.048),'wood':(.34,.205,.091),
        'birch':(.49,.46,.33),'rope':(.37,.29,.15),'hide':(.47,.32,.17),
        'hideLight':(.61,.445,.24),'hideDark':(.30,.22,.12),'earth':(.205,.235,.135),
        'leaf0':(.125,.235,.105),'leaf1':(.24,.335,.115),'leaf2':(.31,.37,.17),
        'pine':(.08,.18,.12),'ash':(.08,.065,.045),'ember':(.47,.085,.015),
        'flame':(.9,.32,.035),'bone':(.62,.575,.40),
    }.items():material(name,color)

    # Continuous lichen and mineral grain, not polygon-index moss patches.
    for key in ('stone','stoneLight','stoneDark'):
        mat=M[key];nodes,links=mat.node_tree.nodes,mat.node_tree.links
        shader=nodes.get('Principled BSDF')
        base=next(link.from_socket for link in links if link.to_node==shader and link.to_socket.name=='Base Color')
        lichen=nodes.new('ShaderNodeTexNoise');lichen.inputs['Scale'].default_value=16
        lichen.inputs['Detail'].default_value=4;lichen.inputs['Roughness'].default_value=.78
        colors=nodes.new('ShaderNodeValToRGB')
        colors.color_ramp.elements[0].position=.46;colors.color_ramp.elements[0].color=(0,0,0,1)
        colors.color_ramp.elements[1].position=.72;colors.color_ramp.elements[1].color=(.38,.38,.38,1)
        links.new(lichen.outputs['Fac'],colors.inputs[0])
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.inputs[2].default_value=(.19,.25,.11,1)
        links.new(colors.outputs['Color'],mix.inputs[0]);links.new(base,mix.inputs[1])
        links.new(mix.outputs[0],shader.inputs['Base Color'])
        bumpnode=next(node for node in nodes if node.type=='BUMP')
        bumpnode.inputs['Distance'].default_value=.035


    material('dolmenStone',(.425,.432,.363),roughness=.94,variation=.07,bump=.018)
    mat=M['dolmenStone'];nodes,links=mat.node_tree.nodes,mat.node_tree.links
    shader=nodes.get('Principled BSDF')
    base=next(link.from_socket for link in links if link.to_node==shader and link.to_socket.name=='Base Color')
    fleck=nodes.new('ShaderNodeTexNoise');fleck.inputs['Scale'].default_value=6.2;fleck.inputs['Detail'].default_value=2.2
    remap=nodes.new('ShaderNodeValToRGB')
    remap.color_ramp.elements[0].position=.56;remap.color_ramp.elements[0].color=(0,0,0,1)
    remap.color_ramp.elements[1].position=.80;remap.color_ramp.elements[1].color=(.24,.24,.24,1)
    mix=nodes.new('ShaderNodeMixRGB');mix.inputs[2].default_value=(.22,.27,.15,1)
    links.new(fleck.outputs['Fac'],remap.inputs[0]);links.new(remap.outputs['Color'],mix.inputs[0])
    links.new(base,mix.inputs[1]);links.new(mix.outputs[0],shader.inputs['Base Color'])
    material('hideRepair',(.405,.295,.185),roughness=.98,variation=.055,bump=.009)
    for key in ('hide','hideLight','hideDark'):
        shader=M[key].node_tree.nodes.get('Principled BSDF')
        shader.inputs['Roughness'].default_value=.97
        if 'Specular IOR Level' in shader.inputs:shader.inputs['Specular IOR Level'].default_value=.18
        if 'Sheen Weight' in shader.inputs:shader.inputs['Sheen Weight'].default_value=.065
        for node in M[key].node_tree.nodes:
            if node.type=='TEX_NOISE' and node.inputs['Scale'].default_value<10:
                node.inputs['Scale'].default_value=3.0;node.inputs['Detail'].default_value=1.8
            if node.type=='BUMP':
                node.inputs['Distance'].default_value=.007
                node.inputs['Strength'].default_value=.18

    for key,strength in [('ember',1.8),('flame',3.5)]:
        shader=M[key].node_tree.nodes.get('Principled BSDF')
        shader.inputs['Emission Color'].default_value=(*M[key].diffuse_color[:3],1)
        shader.inputs['Emission Strength'].default_value=strength


def rock(name, center, size, seed, parent=None, mat='stone', flat=False):
    rng=random.Random(seed);n=18
    radial=[rng.uniform(.87,1.10) for _ in range(n)]
    vertices=[]
    levels=[(-.5,.73),(-.42,.89),(-.24,1),(.16,1),(.37,.90),(.5,.70)]
    for j,(z,radius) in enumerate(levels):
        shift_x=rng.uniform(-.035,.035)*size[0];shift_y=rng.uniform(-.04,.04)*size[1]
        for i in range(n):
            angle=TAU*i/n
            dz=0 if flat and j in (0,len(levels)-1) else rng.uniform(-.048,.048)
            taper=radial[i]*rng.uniform(.94,1.045)
            vertices.append((center[0]+shift_x+size[0]*.5*math.cos(angle)*radius*taper,
                             center[1]+shift_y+size[1]*.5*math.sin(angle)*radius*taper,
                             center[2]+size[2]*(z+dz)))
    faces=[tuple(reversed(range(n))),tuple(range((len(levels)-1)*n,len(levels)*n))]
    faces.extend((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(levels)-1) for i in range(n))
    obj=mesh(name,vertices,faces,M[mat],parent,min(size)*.055,True)
    return obj


def foliage(name, center, size, seed, material_name, parent):
    # A connected softened crown plus real small leaves along its silhouette.
    # Cached raw mesh construction avoids hundreds of dependency-graph operators.
    global CROWN_TEMPLATE
    rng=random.Random(seed)
    if CROWN_TEMPLATE is None:
        import bmesh
        bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=2,radius=1)
        bm.verts.ensure_lookup_table()
        CROWN_TEMPLATE=([tuple(v.co) for v in bm.verts],[[v.index for v in f.verts] for f in bm.faces])
        bm.free()
    source,source_faces=CROWN_TEMPLATE
    vertices=[];faces=[]
    # Several smaller overlapping lobes give each bough a broken leafy outline.
    centers=[(-.43,0,0),(.42,.08,.05),(0,-.40,.04),(.02,.39,.10),(0,0,.40)]
    for ci,offset in enumerate(centers):
        start=len(vertices)
        for v in source:
            scale=rng.uniform(.90,1.09)
            vertices.append(tuple(center[j]+offset[j]*size[j]+v[j]*size[j]*.64*scale for j in range(3)))
        faces.extend(tuple(start+i for i in face) for face in source_faces)
    obj=mesh(name,vertices,faces,M[material_name],parent,0,True)
    # Separate leaf tips retain crisp natural micro silhouettes at final resolution.
    leaf_vertices=[];leaf_faces=[]
    for i in range(20):
        normal=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(-1,1))).normalized()
        surface=Vector(tuple(center[j]+normal[j]*size[j]*rng.uniform(.96,1.04) for j in range(3)))
        tangent=normal.cross(Vector((0,0,1)))
        if tangent.length<.01:tangent=Vector((1,0,0))
        tangent.normalize()
        turn=rng.uniform(0,TAU)
        axis=tangent*math.cos(turn)+normal.cross(tangent)*math.sin(turn)
        width=normal.cross(axis).normalized()
        length=rng.uniform(.055,.09);breadth=length*(.22 if material_name=='pine' else .47)
        start=len(leaf_vertices)
        for point in [surface-axis*length,surface+width*breadth,surface+normal*.025,surface+axis*length,surface-width*breadth]:
            leaf_vertices.append(tuple(point))
        leaf_faces.extend([(start,start+1,start+2),(start+1,start+3,start+2),
                           (start+3,start+4,start+2),(start+4,start,start+2)])
    leaves=mesh('FineLeafSilhouette',leaf_vertices,leaf_faces,M[material_name],parent,0,True)
    leaves.visible_shadow=False
    leaves.data.materials.append(M['leaf1' if material_name!='pine' else 'leaf0'])
    for face in leaves.data.polygons:
        if rng.random()<.20:face.material_index=1
    return obj


def ground_patch(name, x,y, width,depth, seed,parent):
    rng=random.Random(seed);segments=40;rings=7
    radial=[rng.uniform(.90,1.065) for _ in range(segments)]
    vertices=[(x,y,soil(x,y)+.008)]
    for ring in range(1,rings+1):
        for i in range(segments):
            a=TAU*i/segments;r=radial[i]*ring/rings
            px=x+math.cos(a)*width*.5*r;py=y+math.sin(a)*depth*.5*r
            vertices.append((px,py,soil(px,py)+.011))
    faces=[(0,i+1,(i+1)%segments+1) for i in range(segments)]
    for ring in range(rings-1):
        for i in range(segments):
            a=1+ring*segments+i;b=1+ring*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh(name,vertices,faces,M['earth'],parent,0,True)


def weathered_dolmen_stone(name, center, size, seed, parent, cap=False):
    """Eroded independent contours with small exact planar bearing regions."""
    rng=random.Random(seed)
    n=42 if cap else 26
    cx,cy,cz=center;sx,sy,sz=size
    vertices=[];faces=[]
    if cap:
        # Asymmetric broad slab: chipped perimeter, rounded crown, no box extrusion.
        outline=[]
        for i in range(n):
            a=TAU*i/n
            shape=1+.080*math.sin(3*a+.55)+.048*math.cos(5*a-.3)
            notch=.115*math.exp(-((a-3.75)/.23)**2)+.065*math.exp(-((a-5.25)/.17)**2)
            outline.append((math.cos(a)*(shape-notch),math.sin(a)*(shape-notch)))
        maxx=max(abs(p[0]) for p in outline);maxy=max(abs(p[1]) for p in outline)
        outline=[(x/maxx,y/maxy) for x,y in outline]
        # The inner bottom region is planar; only perimeter edges rise away from it.
        rings=[(.86,-.50),(.94,-.34),(1.0,-.01),(.91,.30),(.65,.42),(.30,.465)]
        for ring,(radius,zbase) in enumerate(rings):
            for i,(px,py) in enumerate(outline):
                a=TAU*i/n
                relief=0 if ring==0 else .052*math.sin(2*a+ring*.38)+.030*math.cos(5*a-.6)
                z=max(-.50,min(.49,zbase+relief))
                vertices.append((cx+sx*.5*px*radius,cy+sy*.5*py*radius,cz+sz*z))
        vertices.append((cx-.10,cy+.045,cz+sz*.49))
        for ring in range(len(rings)-1):
            for i in range(n):
                j=(i+1)%n;faces.append((ring*n+i,ring*n+j,(ring+1)*n+j,(ring+1)*n+i))
        # Flat bearing underside spans all three original support centerpoints.
        faces.append(tuple(reversed(range(n))))
        last=(len(rings)-1)*n;center_index=len(vertices)-1
        faces.extend((last+i,last+(i+1)%n,center_index) for i in range(n))
    else:
        # Different shoulders, bellies, taper and lean for each upright.
        profiles={
            21:[(.0,.80,-.07),(.12,.99,-.04),(.31,.91,.07),(.53,.76,.10),(.73,.86,.02),(.91,.69,-.04)],
            22:[(.0,.89,.03),(.12,.94,.08),(.32,.74,-.03),(.56,.96,-.07),(.76,.88,-.02),(.91,.77,.05)],
            23:[(.0,.95,0),(.13,.91,-.03),(.34,.84,.01),(.58,.79,.04),(.78,.86,.02),(.92,.75,0)],
        }
        profile=profiles[seed]
        for ring,(fraction,radius,shift) in enumerate(profile):
            for i in range(n):
                a=TAU*i/n
                radial=1+.115*math.sin(3*a+seed*.17)+.065*math.cos(5*a+ring*.56)
                # A few chipped corners replace uniform long vertical edges.
                radial-=.11*math.exp(-((a-(4.0 if seed==21 else 5.3))/.26)**2)*math.sin(math.pi*fraction)
                px=math.cos(a)*radius*radial
                py=math.sin(a)*radius*(1+.07*math.sin(4*a-ring*.6))
                jitter=0 if ring==0 else .018*math.sin(4*a+ring)
                vertices.append((cx+sx*(px*.5+shift),cy+sy*(py*.5+.025*math.sin(ring+seed)),cz-sz*.5+sz*(fraction+jitter)))
        # A small level top bearing island keeps contact real while its rim is eroded.
        for i in range(n):
            a=TAU*i/n
            vertices.append((cx+.205*math.cos(a),cy+.205*math.sin(a),cz+sz*.5))
        levels=len(profile)+1
        faces.append(tuple(reversed(range(n))))
        for ring in range(levels-1):
            for i in range(n):
                j=(i+1)%n;faces.append((ring*n+i,ring*n+j,(ring+1)*n+j,(ring+1)*n+i))
        faces.append(tuple(range((levels-1)*n,levels*n)))
    obj=mesh(name,vertices,faces,M['dolmenStone'],parent,.012,True)
    obj['eroded_contours_revision']=3
    obj['exact_bearing_patch']=True
    return obj


def dolmen():
    x,y=-5.15,25.3
    root=empty('MegalithShelter',(x,y,0))
    ground=max(soil(x+dx,y+dy) for dx,dy in [(-1.25,-.15),(1.25,-.15),(0,.65)])
    roof_base=ground+2.7
    for i,(dx,dy,width,depth) in enumerate([(-1.28,-.08,1.12,1.25),(1.27,-.08,1.14,1.27),(0,.78,2.75,.72)]):
        bottom=soil(x+dx,y+dy)-.10
        weathered_dolmen_stone('DolmenBearingOrthostat',(dx,dy,(bottom+roof_base)/2),
                              (width,depth,roof_base-bottom),21+i,root)
    weathered_dolmen_stone('BroadFlatBearingCapstone',(0,.12,roof_base+.40),(4.40,2.65,.80),32,root,True)
    root['bearing_elevation']=roof_base;root['orthostat_count']=3;root['real_recess_depth']=1.5
    root['focal_refinement_revision']=3
    ground_patch('TroddenDolmenApproach',x,y-1.6,5.3,3.0,21,None)
    for i,(dx,dy,s) in enumerate([(-2.9,-.1,.75),(-2.7,.8,.9),(2.7,.5,.68),(-1.3,1.7,.6)]):
        h=soil(x+dx,y+dy)
        rock('WeatheredFallenStone',(x+dx,y+dy,h+s*.32),(s,s*.8,s*.64),45+i,None,'stone')
    return root


def shelter(name, x,y, width,depth,height,seed,angle):
    root=empty(name,(x,y,max(soil(x+dx,y+dy) for dx,dy in [(-width*.4,0),(width*.4,0),(0,depth*.4)])))
    root.rotation_euler.z=angle
    w=width/2;d=depth/2
    def roof_point(side,t,v,lift=0):
        between=(v*4)%1
        span=math.sin(math.pi*between)**1.6
        cross=math.sin(math.pi*t)**.65
        sag=.185*span*cross*(.93+.12*math.sin(seed+v*3))
        fold=.032*math.sin(t*6*math.pi+v*2.2)*span*math.sin(math.pi*t)
        hem=.028*math.sin(v*8*math.pi+.3)*t*t
        return (side*w*t,-d+depth*v,height*(1-t)+.18*t-sag+fold+hem+.015+lift)
    def front_point(side,u,v,lift=0):
        inner=.33 if v<=.47 else .33*(1-v)/.53
        inner+=.035*math.sin(v*3*math.pi)*(1-v)
        outer=w*(1-v)
        px=side*(inner+u*max(0,outer-inner))
        z=height*v+.18*u*(1-v)
        sag=.125*math.sin(math.pi*u)*math.sin(math.pi*v)
        folds=.032*math.sin(u*5*math.pi+v*1.5)*math.sin(math.pi*u)*math.sin(math.pi*v)
        py=-d-.022+sag+folds-.024*math.sin(math.pi*v)*(1-u)-lift
        return (px,py,z)
    # A-frame ribs support the front roof and leave the center doorway unobstructed.
    strand('ForkedRidgeSupport',[(0,d,-.18),(0,d,height+.12)],.071,M['wood'],root)
    strand('ForkedSupportTip',[(0,d,height-.17),(.18,d,height+.23)],.035,M['wood'],root)
    strand('ContinuousRidgeBeam',[(0,-d-.18,height),(0,d+.18,height)],.08,M['bark'],root)
    for row in range(5):
        py=-d+row*depth/4
        for side in (-1,1):
            strand('ExposedBentRoofRib',[(side*(w+.08),py,-.12),(side*w*.64,py,height*.40),(0,py,height+.04)],.042,M['wood'],root)
    for side in (-1,1):
        nx,ny=24,40
        vertices=[roof_point(side,ix/nx,iy/ny) for iy in range(ny+1) for ix in range(nx+1)]
        faces=[]
        for iy in range(ny):
            for ix in range(nx):
                a=iy*(nx+1)+ix;faces.append((a,a+1,a+nx+2,a+nx+1))
        roof=mesh('DrapedHideRoof',vertices,faces,M['hideLight' if seed%2 else 'hide'],root,0,True)
        solid=roof.modifiers.new('Supple skin thickness','SOLIDIFY');solid.thickness=.012
        roof['actual_sag_between_supports']=.185;roof['support_intervals']=4
        for v in (.34,.68):
            strand('JoinedHidePanelSeam',[roof_point(side,i/30,v,.012) for i in range(31)],.012,M['hideDark'],root)
            for i in range(1,10):
                t=i/10
                strand('RoofSeamCrossStitch',[roof_point(side,t-.015,v-.013,.018),roof_point(side,t+.015,v+.013,.018)],.008,M['rope'],root)
        strand('RolledHideEave',[roof_point(side,1,i/48,.004) for i in range(49)],.022,M['hideDark'],root)
        # Triangular entrance side panels are dense curved surfaces, never flat paper polygons.
        nu,nv=18,24
        vertices=[front_point(side,iu/nu,iv/nv) for iv in range(nv+1) for iu in range(nu+1)]
        faces=[]
        for iv in range(nv):
            for iu in range(nu):
                a=iv*(nu+1)+iu;faces.append((a,a+1,a+nu+2,a+nu+1))
        panel=mesh('SplitHideEntrancePanel',vertices,faces,M['hide' if side>0 else 'hideLight'],root,0,True)
        skin=panel.modifiers.new('Soft entrance edge thickness','SOLIDIFY');skin.thickness=.012
        strand('SoftRolledDoorEdge',[front_point(side,0,i/36,.012) for i in range(36)],.017,M['hideDark'],root)
        # One subtle joining seam per entrance side, with sparse hand-sized stitches.
        strand('EntranceJoiningSeam',[front_point(side,.55,.10+i*.022,.012) for i in range(28)],.009,M['hideDark'],root)
        for i in range(6):
            v=.16+i*.076
            strand('EntranceCrossStitch',[front_point(side,.535,v-.010,.019),front_point(side,.565,v+.010,.019)],.007,M['rope'],root)
        # A single small repair on the visible roof side, following the actual drape.
        if side==1:
            t0,t1=.56,.76;v0,v1=.37,.49
            pv=[roof_point(side,t0+(t1-t0)*ix/4,v0+(v1-v0)*iy/4,.027) for iy in range(5) for ix in range(5)]
            pf=[(iy*5+ix,iy*5+ix+1,iy*5+ix+6,iy*5+ix+5) for iy in range(4) for ix in range(4)]
            mesh('SmallFunctionalHideRepair',pv,pf,M['hideRepair'],root,0,True)
            for j in range(4):
                v=v0+(v1-v0)*(j+.5)/4
                for t in (t0,t1):
                    strand('RepairEdgeLacing',[roof_point(side,t-.013,v-.008,.033),roof_point(side,t+.013,v+.008,.033)],.007,M['rope'],root)
        for py in (-d,d):
            strand('HideGuyline',[(side*w,py,.20),(side*(w+.40),py-.1,-.04)],.012,M['rope'],root)
            strand('GuylineWoodPeg',[(side*(w+.40),py-.1,-.14),(side*(w+.40),py-.1,.06)],.026,M['wood'],root)
            for turn in range(4):
                pts=[(.09*math.cos(TAU*i/16),py+.04*turn,height+.09*math.sin(TAU*i/16)) for i in range(17)]
                strand('RidgeRopeLashing',pts,.012,M['rope'],root)
        for v in (0,.5,1):
            base=Vector(roof_point(side,.94,v))
            for k in range(2):
                pts=[tuple(base+Vector((.035*math.cos(TAU*i/12),.035*math.sin(TAU*i/12),.035*k))) for i in range(13)]
                strand('HideToFrameLashing',pts,.010,M['rope'],root)
    root['real_open_entrance']=True
    root['skin_shelter_style']='Unattributed practical timber and hide construction'
    root['focal_refinement_revision']=3
    return root


def camp_details():
    x,y=.85,23.7
    root=empty('CampHearthAndWorkArea')
    ground_patch('WornSettlementClearing',x,y,7.0,4.0,30,root)
    h=soil(x,y)
    rock('AshFilledHearth',(x,y,h+.018),(.92,.76,.08),58,root,'ash',True)
    for i in range(10):
        a=TAU*i/10;px=x+.55*math.cos(a);py=y+.45*math.sin(a)
        rock('HearthRingStone',(px,py,soil(px,py)+.10),(.27,.22,.19),59+i,root,'stoneDark')
    for a in (.2,1.5,2.7):
        strand('CharredFirewood',[(x+math.cos(a)*.35,y+math.sin(a)*.30,h+.08),(x-math.cos(a)*.3,y-math.sin(a)*.3,h+.15)],.071,M['ash'],root)
    for i in range(5):
        a=TAU*i/5
        rock('VisibleWarmEmber',(x+.19*math.cos(a),y+.13*math.sin(a),h+.15),(.15,.13,.08),74+i,root,'ember')
    for i in range(4):
        a=TAU*i/4;fx=x+.12*math.cos(a);fy=y+.11*math.sin(a)
        verts=[(fx-.10,fy-.055,h+.13),(fx+.10,fy-.055,h+.13),(fx+.035,fy+.03,h+.44+(i%2)*.14),(fx-.07,fy+.065,h+.20)]
        mesh('SmallHearthFlame',verts,[(0,1,2),(0,2,3)],M['flame'],root)
    lamp=bpy.data.lights.new('STN_HearthWarmth','POINT');lamp.energy=22;lamp.color=(1,.34,.07);lamp.shadow_soft_size=.5
    obj=bpy.data.objects.new('STN_HearthWarmth',lamp);COLLECTION.objects.link(obj);obj.location=(x,y,h+.4);CREATED.append(obj)
    # Split log work bench, raw flint pieces and tied timber storage.
    bx,by=-.7,24.3;bz=soil(bx,by)
    for dy in (-.42,.42):
        strand('WorkbenchLeg',[(bx,by+dy,bz-.04),(bx,by+dy,bz+.51)],.10,M['bark'],root)
    strand('LongTimberWorkSurface',[(bx,by-.62,bz+.53),(bx,by+.62,bz+.53)],.21,M['wood'],root)
    for i in range(3):
        rock('UnfinishedFlintTool',(bx+.08,by-.3+i*.3,bz+.74),(.16,.24,.09),82+i,root,'stoneDark')
    sx,sy=2.8,25.2;sz=soil(sx,sy)
    for row in range(2):
        for i in range(3-row):
            strand('StackedSeasoningTimber',[(sx-.7,sy+i*.20+row*.08,sz+.13+row*.16),(sx+.7,sy+i*.20+row*.08,sz+.13+row*.16)],.09,M['bark'],root)
    # Raised drying rack with two unmarked skins.
    rx,ry=3.2,26.2;rz=max(soil(rx-.7,ry),soil(rx+.7,ry))
    for dx in (-.7,.7):
        strand('DryingRackFork',[(rx+dx,ry,rz-.12),(rx+dx,ry,rz+1.65)],.054,M['wood'],root)
    strand('DryingRackCrossbar',[(rx-.86,ry,rz+1.55),(rx+.86,ry,rz+1.55)],.052,M['wood'],root)
    for i,dx in enumerate((-.36,.33)):
        verts=[(rx+dx-.26,ry,rz+1.50),(rx+dx+.26,ry,rz+1.50),(rx+dx+.21,ry-.025,rz+.54),(rx+dx,ry-.04,rz+.40),(rx+dx-.22,ry-.02,rz+.64)]
        mesh('PlainDrapedDryingSkin',verts,[(0,1,2,3,4)],M['hideLight' if i else 'hide'],root,0,True)
    return root


def broadleaf(name,x,y,height,seed,species='oak'):
    rng=random.Random(seed);root=empty(name,(x,y,soil(x,y)-.10))
    lean=rng.uniform(-.16,.16)
    bark=M['birch' if species=='birch' else 'bark']
    strand('IrregularLivingTrunk',[(0,0,0),(lean,0,height*.42),(lean*.7,.07,height*.78)],height*.035,bark,root)
    crown_count=18 if species=='birch' else 25
    for i in range(crown_count):
        angle=TAU*i/crown_count+rng.uniform(-.3,.3);fraction=rng.uniform(.52,.88)
        reach=height*(.22 if species=='birch' else .31)*rng.uniform(.7,1.05)
        bx=math.cos(angle)*reach;by=math.sin(angle)*reach
        z=height*fraction
        strand('IndividualLivingBough',[(lean*.7,0,height*.35),(bx*.55,by*.55,z*.79),(bx,by,z)],height*.012,bark,root)
        shape=(height*.15,height*.13,height*.17) if species=='birch' else (height*.175,height*.145,height*.115)
        foliage('UnevenLeafCluster',(bx,by,z),shape,seed*30+i,'leaf'+str((seed+i)%3),root)
    foliage('LooseTopFoliage',(lean,0,height*.93),(height*.15,height*.14,height*.13),seed*40,'leaf1',root)
    if species=='birch':
        for i in range(7):
            z=height*(.08+i*.084)
            strand('DarkBirchBarkScar',[(-.035, -.072,z),(.067,-.04,z+.014)],.017,M['bark'],root)
    return root


def pine(name,x,y,height,seed):
    rng=random.Random(seed);root=empty(name,(x,y,soil(x,y)-.08))
    strand('CrookedPineTrunk',[(0,0,0),(.09,0,height*.6),(.03,.04,height)],height*.027,M['bark'],root)
    for i in range(17):
        t=.36+.60*i/17
        angle=i*2.40+rng.uniform(-.2,.2)
        reach=height*(.25-.19*(t-.36)/.6)*rng.uniform(.78,1.18)
        cx=math.cos(angle)*reach;cy=math.sin(angle)*reach;z=height*t
        strand('SparsePineBough',[(.06,0,z-.10),(cx*.65,cy*.65,z),(cx,cy,z+.04)],height*.008,M['bark'],root)
        foliage('IrregularNeedleFan',(cx,cy,z+.10),(max(.11,reach*.63),max(.10,reach*.52),height*.071),seed*20+i,'pine' if i%3 else 'leaf0',root)
    return root


def landscape():
    roots=[]
    # Deliberately unequal groups keep the central settlement and path readable.
    tree_specs=[
        (-17,18,4.8,'oak'),(-14.4,20,4.5,'oak'),(-12.8,26,4.9,'pine'),
        (-11.5,24,3.6,'birch'),(-15.8,30,5.1,'pine'),(-10.4,32,4.2,'oak'),
        (-13.1,35,4.6,'pine'),(-18.5,28,5.6,'pine'),(-8.9,35,3.2,'birch'),
        (9.2,25,3.7,'birch'),(11.6,22,4.6,'oak'),(14.8,18,5.1,'oak'),
        (15.9,27,5.5,'pine'),(12.5,30,4.5,'pine'),(9.8,34,4.0,'pine'),
        (17.6,23,4.9,'birch'),(18.6,30,5.6,'pine'),(6.7,35,3.2,'birch'),
        (2.6,38,2.2,'oak'),(-.8,38,2.8,'birch'),
    ]
    for index,(x,y,h,species) in enumerate(tree_specs):
        roots.append(pine('SparsePine',x,y,h,200+index) if species=='pine'
                     else broadleaf('Birch' if species=='birch' else 'SpreadingTree',x,y,h,200+index,species))
    rockroot=empty('NaturalStoneOutcrops')
    for index,(x,y,w,d,h) in enumerate([
        (-9.2,21.5,2.1,1.8,1.5),(-10.3,22.0,1.4,1.4,.9),(-8.9,23.0,1.4,1.2,.7),
        (7.3,25.0,2.9,2.1,1.8),(8.8,25.7,1.7,1.4,1.1),(6.1,25.5,1.6,1.5,.85),
        (10.0,28.3,2.4,1.4,1.2),(-2.5,31,1.8,1.4,.65),
    ]):
        z=soil(x,y)+h*.38
        rock('LowErodedOutcrop',(x,y,z),(w,d,h),250+index,rockroot,'stone' if index%2 else 'stoneDark')
    roots.append(rockroot)
    bushroot=empty('LowMeadowEdgeScrub')
    for i,(x,y) in enumerate([(-8.4,21),(-9.7,23),(-10.5,24.8),(6.3,24),(8.6,25.6),(9.9,27),(5.4,29),(-2.2,32)]):
        z=soil(x,y)
        for k in range(3):
            foliage('SmallScrubPatch',(x+(k-1)*.30,y+.17*(k%2),z+.30),(.46,.35,.30),340+i*3+k,'leaf'+str(k),bushroot)
    roots.append(bushroot)
    return roots


def tune_light():
    bpy.data.objects['Late golden sun'].data.energy=1550
    bpy.data.objects['Late golden sun'].data.size=7
    bpy.data.objects['Blue sky bounce'].data.energy=700
    bpy.data.objects['Sun shafts'].data.angle=.07
    fog=bpy.data.objects['Atmosphere behind the battlefield']
    mat=fog.data.materials[0].copy();mat.name='STN_ValleyDepthGradient';fog.data.materials[0]=mat
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    volume=next(node for node in nodes if node.type=='PRINCIPLED_VOLUME')
    coords=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ')
    density=nodes.new('ShaderNodeValToRGB')
    stops=[(0,.005),(.3,.009),(.6,.018),(1,.022)]
    for e,(p,v) in zip(density.color_ramp.elements,[stops[0],stops[-1]]):e.position=p;e.color=(v,v,v,1)
    for p,v in stops[1:-1]:
        e=density.color_ramp.elements.new(p);e.color=(v,v,v,1)
    links.new(coords.outputs['Generated'],sep.inputs[0]);links.new(sep.outputs['Y'],density.inputs[0])
    links.new(density.outputs['Color'],volume.inputs['Density'])


def build(source,outdir):
    global COLLECTION
    public=ROOT/'public/assets/reborn/backgrounds/stone.png'
    source_sha=hashlib.sha256(source.read_bytes()).hexdigest();public_sha=hashlib.sha256(public.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    if bpy.data.collections.get('STN_Settlement'):raise RuntimeError('Refinement requires original source.')
    camera_before=camera_contract();terrain_before=terrain_hash()
    archive=bpy.data.collections.new('STN_SourceArchive');bpy.context.scene.collection.children.link(archive)
    archived=[]
    prefixes=('Ancient megalith','Ridge standing stone','Crown lintel','Tapered pine trunk',
              'Individually sculpted evergreen boughs','Soft conifer crown')
    for obj in list(bpy.data.objects):
        if any(obj.name==p or obj.name.startswith(p+'.') for p in prefixes):
            for col in list(obj.users_collection):col.objects.unlink(obj)
            archive.objects.link(obj);obj.hide_render=True;obj.hide_viewport=True;archived.append(obj.name)
    archive.hide_render=True;archive.hide_viewport=True
    COLLECTION=bpy.data.collections.new('STN_Settlement');bpy.context.scene.collection.children.link(COLLECTION)
    materials()
    focus=dolmen()
    main=shelter('MainHideShelter',.3,28.8,3.6,3.4,2.55,91,-.13)
    side=shelter('SmallToolShelter',4.25,27.5,2.8,2.7,1.94,92,.19)
    hearth=camp_details()
    environment=landscape();tune_light()
    scene=bpy.context.scene
    scene['authored_environment_revision']=2;scene['environment_id']='stone'
    scene['runtime_background']='backgrounds/stone.png';scene['authoring_source']='tools/blender/refine_stone.py'
    scene['runtime_layout']='1280x720; combat_y=500; quiet_lane=410..525; HUD_top=82; HUD_bottom=552'
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(outdir/'candidate.png')
    bpy.context.view_layer.update()
    group_bounds={o.name:bounds(o.children_recursive) for o in [focus,main,side,hearth]+environment if any(c.type in {'MESH','CURVE'} for c in o.children_recursive)}
    print('STONE_BOUNDS '+json.dumps(group_bounds),flush=True)
    assert camera_contract()==camera_before,'Camera changed'
    assert terrain_hash()==terrain_before,'Terrain changed'
    assert all(v[1]>=95 and v[3]<=410 for v in group_bounds.values()),group_bounds
    assert hashlib.sha256(source.read_bytes()).hexdigest()==source_sha
    assert hashlib.sha256(public.read_bytes()).hexdigest()==public_sha
    outdir.mkdir(parents=True,exist_ok=True)
    for path,target in [(source,outdir/'original-background-stone.blend'),(public,outdir/'original-background-stone.png')]:
        if not target.exists():
            temporary=target.with_suffix(target.suffix+'.copying');temporary.write_bytes(path.read_bytes());atomic(temporary,target)
    bpy.context.preferences.filepaths.save_version=0
    temporary=outdir/'candidate.saving.blend';bpy.ops.wm.save_as_mainfile(filepath=str(temporary),compress=True)
    atomic(temporary,outdir/'candidate.blend')
    report={'status':'built','source':str(source),'source_sha256':source_sha,'public_original_sha256':public_sha,
            'source_and_public_unchanged':True,'camera_before':camera_before,'camera_after':camera_contract(),'camera_unchanged':True,
            'terrain_sha256_before':terrain_before,'terrain_sha256_after':terrain_hash(),'terrain_unchanged':True,
            'group_bounds_1280x720':group_bounds,'new_object_count':len(CREATED),'total_objects':len(bpy.data.objects),
            'archived_objects':archived,'trees':20,'vegetation_forms':['spreading broadleaf','birch','irregular pine','low scrub'],
            'geometry_checks':{'dolmen_uprights':focus['orthostat_count'],'bearing_elevation':focus['bearing_elevation'],
            'real_open_shelter_entrances':bool(main['real_open_entrance'] and side['real_open_entrance'])},
            'rendered':False,'publication':'candidate only'}
    write_json(outdir/'metrics.json',report)
    print('STONE_CANDIDATE_BUILT '+str(outdir/'candidate.blend'),flush=True)


def render(outdir,samples):
    bpy.ops.wm.open_mainfile(filepath=str(outdir/'candidate.blend'),load_ui=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES'
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
    devices=[]
    for device in prefs.devices:
        device.use=device.type=='OPTIX'
        if device.use:devices.append(device.name)
    if not devices:raise RuntimeError('No OptiX device; refusing long unexpected CPU render.')
    scene.cycles.device='GPU';scene.cycles.samples=samples;scene.cycles.use_denoising=True
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(outdir/'candidate.rendering.png')
    start=time.monotonic();bpy.ops.render.render(write_still=True)
    atomic(outdir/'candidate.rendering.png',outdir/'candidate.png')
    report=json.loads((outdir/'metrics.json').read_text())
    report.update({'status':'rendered','rendered':True,'render_samples':samples,'render_devices':devices,'render_seconds':round(time.monotonic()-start,2)})
    write_json(outdir/'metrics.json',report)
    print('STONE_CANDIDATE_RENDERED '+str(outdir/'candidate.png'),flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    original=ROOT/'art/blender/candidates/stone-v2/original-background-stone.blend'
    parser.add_argument('--source',type=Path,default=original if original.exists() else ROOT/'art/blender/background-stone.blend')
    parser.add_argument('--outdir',type=Path,default=ROOT/'art/blender/candidates/stone-v2')
    parser.add_argument('--render',action='store_true');parser.add_argument('--render-only',action='store_true')
    parser.add_argument('--samples',type=int,default=32)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    outdir=args.outdir.resolve()
    if not outdir.is_relative_to(ROOT/'art/blender/candidates'):raise RuntimeError('Outputs must remain inside candidates.')
    if not args.render_only:build(args.source.resolve(),outdir)
    if args.render or args.render_only:render(outdir,args.samples)


if __name__=='__main__':main()
