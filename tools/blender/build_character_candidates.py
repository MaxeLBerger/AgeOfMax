"""Author isolated Titan and sniper geometry/pose candidates from saved scenes.

No public assets are changed. All meshes, poses, renders and sockets are staged
under art/blender/candidates/heavy-sniper-v1 for side-by-side review.
"""
import argparse
import json
import math
import runpy
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
STAGE = ROOT / 'art/blender/candidates/heavy-sniper-v1'
ART = runpy.run_path(str(ROOT/'tools/blender/export_scenes.py'),run_name='art_library')
RIG = None


def material(name, color, metallic=0, roughness=.5, emission=0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = (*color,1)
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color,1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    if emission:
        shader.inputs['Emission Color'].default_value = (*color,1)
        shader.inputs['Emission Strength'].default_value = emission
    return result


def bind(obj, bone):
    ART['set_group'](obj,RIG,bone)
    return obj


def finish(obj, name, mat, bone=None, bevel=0):
    obj.name = name
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Manufactured edge bevel','BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        normals = obj.modifiers.new('Broad weighted face normals','WEIGHTED_NORMAL')
        normals.keep_sharp = True
    if bone:
        bind(obj,bone)
    return obj


def box(name, location, dimensions, mat, bone=None, bevel=.025, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rotation:
        obj.rotation_euler = rotation
    return finish(obj,name,mat,bone,bevel)


def ellipsoid(name, location, radii, mat, bone=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=location)
    obj = bpy.context.object
    obj.scale = radii
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return finish(obj,name,mat,bone)


def beam(name, start, end, radius, mat, bone=None, vertices=16):
    start,end=Vector(start),Vector(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=(end-start).length,
                                       location=(start+end)/2)
    obj = bpy.context.object
    obj.rotation_mode='QUATERNION'
    obj.rotation_quaternion=(end-start).to_track_quat('Z','Y')
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices)==4
    return finish(obj,name,mat,bone,.006)


def plate(name, rings, mat, bone=None, bevel=.025):
    """A closed, tapered octagonal shell, with authored bevel-compatible topology."""
    vertices=[]
    for z,cx,half_x,half_y in rings:
        for x,y in [(-.68,-1),(.68,-1),(1,-.68),(1,.68),(.68,1),(-.68,1),(-1,.68),(-1,-.68)]:
            vertices.append((cx+x*half_x,y*half_y,z))
    faces=[tuple(reversed(range(8))),tuple(range((len(rings)-1)*8,len(rings)*8))]
    for row in range(len(rings)-1):
        for i in range(8):
            faces.append((row*8+i,row*8+(i+1)%8,(row+1)*8+(i+1)%8,(row+1)*8+i))
    mesh=bpy.data.meshes.new(name+' topology')
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj,name,mat,bone,bevel)


def remove_names(names):
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and any(obj.name==name or obj.name.startswith(name+'.') for name in names):
            bpy.data.objects.remove(obj,do_unlink=True)


def new_bone(name, head, tail, parent):
    bpy.context.view_layer.objects.active=RIG
    RIG.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bone=RIG.data.edit_bones.get(name) or RIG.data.edit_bones.new(name)
    bone.head=head
    bone.tail=tail
    bone.parent=RIG.data.edit_bones.get(parent)
    bpy.ops.object.mode_set(mode='OBJECT')
    RIG.select_set(False)


def reset_animation():
    bpy.context.scene.frame_set(1)
    # The old Titan source used a nonuniformly scaled parent for every mesh and
    # its armature. New structural geometry is authored in the rig's native
    # coordinates; remove that display-scale wrapper consistently before posing.
    for obj in bpy.data.objects:
        if obj.type in ['MESH','ARMATURE'] and obj.parent is not None:
            obj.parent = None
            obj.matrix_parent_inverse = Matrix.Identity(4)
    bpy.context.view_layer.update()
    if RIG.animation_data:
        RIG.animation_data_clear()
    for bone in RIG.pose.bones:
        bone.rotation_mode='QUATERNION'
        bone.matrix_basis=Matrix.Identity(4)
    for obj in bpy.data.objects:
        if obj.type=='MESH' and obj.animation_data:
            obj.animation_data_clear()
    bpy.context.view_layer.update()


def add_extremity_bones():
    for side in ['near','far']:
        ankle=RIG.data.bones['shin.'+side].tail_local.copy()
        new_bone('foot.'+side,ankle,ankle+Vector((.28,0,0)),'shin.'+side)
        hand=RIG.data.bones['forearm.'+side].tail_local.copy()
        new_bone('hand.'+side,hand,hand+Vector((.15,0,0)),'forearm.'+side)
    for obj in bpy.data.objects:
        if obj.type!='MESH':
            continue
        if obj.name.startswith(('Boot sole','Leather boot')):
            bind(obj,'foot.far' if obj.name.endswith('.001') else 'foot.near')
        if obj.name=='Hand' or obj.name.startswith('Fingers') and obj.name in ['Fingers','Fingers.001','Fingers.002']:
            bind(obj,'hand.near')
        elif obj.name=='Hand.001' or obj.name in ['Fingers.003','Fingers.004','Fingers.005']:
            bind(obj,'hand.far')


def key_matrix(name, matrix, frame):
    bone=RIG.pose.bones[name]
    bone.rotation_mode='QUATERNION'
    bone.matrix=matrix
    bpy.context.view_layer.update()
    for channel in ['location','rotation_quaternion','scale']:
        bone.keyframe_insert(channel,frame=frame)


def rotated_bone(name, head, rotation, frame):
    rest=RIG.data.bones[name]
    key_matrix(name,Matrix.Translation(Vector(head)) @ (rotation @ rest.matrix_local.to_quaternion()).to_matrix().to_4x4(),frame)


def pointed_bone(name, head, tail, frame):
    rest=RIG.data.bones[name]
    direction=Vector(tail)-Vector(head)
    rotation=(rest.tail_local-rest.head_local).rotation_difference(direction)
    rotated_bone(name,head,rotation,frame)


def solve_limb(upper, lower, target, pole, frame):
    rest=RIG.data.bones[upper]
    parent=RIG.pose.bones[rest.parent.name]
    head=parent.matrix @ parent.bone.matrix_local.inverted() @ rest.head_local
    target=Vector(target)
    vector=target-head
    distance=vector.length
    length_a=rest.length
    length_b=RIG.data.bones[lower].length
    if distance > length_a+length_b+.008:
        raise RuntimeError(f'Unreachable {upper} target at frame {frame}: {distance:.3f} > {length_a+length_b:.3f}')
    distance=min(distance,length_a+length_b-.0001)
    direction=vector.normalized()
    target=head+direction*distance
    pole=Vector(pole)
    perpendicular=(pole-direction*pole.dot(direction)).normalized()
    along=(length_a*length_a-length_b*length_b+distance*distance)/(2*distance)
    height=math.sqrt(max(0,length_a*length_a-along*along))
    joint=head+direction*along+perpendicular*height
    pointed_bone(upper,head,joint,frame)
    pointed_bone(lower,joint,target,frame)
    return target


def body_pose(frame, hip_x, hip_z, lean, twist=0, head_pitch=0):
    root=RIG.data.bones['root']
    rotated_bone('root',root.head_local+Vector((hip_x,0,hip_z)),Quaternion(),frame)
    spine=RIG.data.bones['spine']
    parent=RIG.pose.bones['root']
    head=parent.matrix @ parent.bone.matrix_local.inverted() @ spine.head_local
    rotation=Quaternion((0,1,0),lean) @ Quaternion((0,0,1),twist)
    rotated_bone('spine',head,rotation,frame)
    parent=RIG.pose.bones['spine']
    head_rest=RIG.data.bones['head']
    head=parent.matrix @ parent.bone.matrix_local.inverted() @ head_rest.head_local
    rotated_bone('head',head,Quaternion((0,1,0),head_pitch),frame)
    return head,rotation


def planted_legs(frame, near, far):
    result=[]
    for side,target in [('near',near),('far',far)]:
        ankle=solve_limb('thigh.'+side,'shin.'+side,target,(1,0,0),frame)
        rotated_bone('foot.'+side,ankle,Quaternion(),frame)
        result.append(list(ankle))
    return result


def weapon_pose(name, origin, direction, frame):
    rest=RIG.data.bones[name]
    rotation=(rest.tail_local-rest.head_local).rotation_difference(Vector(direction))
    rotated_bone(name,origin,rotation,frame)
    return RIG.pose.bones[name].matrix @ rest.matrix_local.inverted()


def grip_arms(frame, near, far):
    for side,target in [('near',near),('far',far)]:
        wrist=solve_limb('arm.'+side,'forearm.'+side,target,(0,0,-1),frame)
        rotated_bone('hand.'+side,wrist,Quaternion(),frame)


def titan_geometry():
    cloth=bpy.data.materials.get('Faction woven cloth and enamel') or bpy.data.materials.get('Deep turquoise cloth')
    steel=material('Titan forged dark steel',(.095,.12,.13),.83,.3)
    edges=material('Titan machined bronze',(.34,.205,.075),.72,.34)
    ivory=material('Titan ceramic armour',(.38,.405,.39),.38,.4)
    dark=material('Titan flexible black joint seals',(.021,.027,.029),.05,.78)
    light=material('Aether emission / Titan conduits',(.12,.67,.76),.35,.32,2.5)
    remove_names(['Armoured exo helmet','Continuous dark visor','Aether visor strip','Helmet comm disk',
        'Layered shoulder pauldron','Gold pauldron lip','Heavy exosuit breastplate','Exosuit collar',
        'Chest reactor','Back power cell','Field pack','Load bearing ammunition pouch','Shoulder harness',
        'Sculpted chest waist and shoulders','Shaped pelvis','Broad leather girdle','Bronze belt buckle',
        'Upper arm','Forearm','Deltoid','Elbow','Hand','Fingers','Leather vambrace','Shaped thigh',
        'Calf','Knee','Leather boot','Boot sole','Leg binding','Shin greave','Thigh plate',
        'Warhammer haft','Aether warhammer head','Hammer energy face'])
    # Wider joints and limbs make armour volume structural rather than oversized hats.
    for side,sign in [('near',-1),('far',1)]:
        new_bone('arm.'+side,(0,sign*.46,1.84),(.04,sign*.53,1.30),'spine')
        new_bone('forearm.'+side,(.04,sign*.53,1.30),(.43,sign*.46,1.02),'arm.'+side)
        new_bone('thigh.'+side,(0,sign*.31,1.03),(0,sign*.31,.58),'root')
        new_bone('shin.'+side,(0,sign*.31,.58),(.04,sign*.31,.16),'thigh.'+side)
    add_extremity_bones()
    new_bone('weapon.wrist',(.3,-.2,1.45),(.3,-.2,2.65),'root')
    plate('Titan articulated abdomen',[(1.06,0,.25,.34),(1.32,0,.30,.40),(1.55,0,.31,.43)],dark,'spine',.035)
    plate('Titan main tapered breastplate',[(1.34,.055,.32,.37),(1.63,.01,.38,.47),(1.92,-.025,.30,.47)],ivory,'spine',.055)
    plate('Titan hip armour belt',[(.95,0,.26,.36),(1.16,0,.29,.42)],steel,'root',.035)
    for z in [1.13,1.23,1.33]:
        box('Titan floating abdominal lamella',(.30,0,z),(.11,.62,.085),steel,'spine',.019)
    box('Titan lower breastplate faction enamel',(.348,0,1.56),(.10,.59,.24),cloth,'spine',.033)
    box('Titan upper chest sternum plate',(.288,0,1.78),(.11,.24,.18),steel,'spine',.03)
    beam('Titan inset chest reactor bezel',(.345,0,1.73),(.42,0,1.73),.095,edges,'spine')
    beam('Titan controlled chest reactor light',(.422,0,1.73),(.433,0,1.73),.065,light,'spine')
    for side,sign in [('near',-1),('far',1)]:
        upper='arm.'+side
        lower='forearm.'+side
        thigh='thigh.'+side
        shin='shin.'+side
        foot='foot.'+side
        hand='hand.'+side
        y=sign*.46
        ellipsoid('Titan shoulder ball mechanism',(0,y,1.84),(.22,.24,.22),dark,upper)
        box('Titan pauldron rubber gasket',(-.035,sign*.52,1.90),(.67,.42,.35),dark,upper,.09)
        box('Titan main shoulder bastion',(-.03,sign*.55,1.97),(.66,.47,.32),ivory,upper,.08)
        box('Titan pauldron enamel inlay',(.01,sign*.798,1.98),(.38,.033,.13),cloth,upper,.018)
        for index in range(3):
            box('Titan layered deltoid plate',(.01,sign*(.57+.035*index),1.79-index*.095),
                (.47-index*.05,.27,.14),steel if index==2 else ivory,upper,.032)
        beam('Titan upper arm actuator',(0,y,1.81),(.04,sign*.53,1.34),.16,dark,upper)
        beam('Titan elbow swivel axle',(.04,sign*.44,1.30),(.04,sign*.65,1.30),.13,edges,upper)
        beam('Titan forearm pressure sleeve',(.06,sign*.53,1.28),(.42,y,1.04),.17,dark,lower)
        box('Titan forearm layered armour',(.25,sign*.55,1.20),(.46,.30,.26),steel,lower,.045,rotation=(0,.55,0))
        box('Titan forearm ceramic shield',(.25,sign*.69,1.23),(.34,.07,.22),ivory,lower,.035,rotation=(0,.40,0))
        box('Titan heavy armoured gauntlet',(.46,y,1.04),(.24,.23,.20),steel,hand,.038)
        for finger in range(3):
            box('Titan gauntlet knuckle',(.585,y+(finger-1)*.065,1.065),(.07,.045,.10),ivory,hand,.014)
        beam('Titan thigh undersuit',(0,sign*.31,1.00),(0,sign*.31,.61),.19,dark,thigh)
        box('Titan upper leg side plate',(.075,sign*.37,.83),(.39,.36,.39),ivory,thigh,.065)
        box('Titan hanging hip tasset',(.15,sign*.41,1.02),(.32,.31,.25),steel,thigh,.036)
        beam('Titan exposed knee bearing',(0,sign*.30,.58),(0,sign*.53,.58),.14,steel,thigh)
        beam('Titan knee actuator center',(0,sign*.531,.58),(0,sign*.56,.58),.078,edges,thigh)
        box('Titan overlapping knee shield',(.18,sign*.31,.61),(.20,.38,.24),ivory,shin,.05)
        beam('Titan lower leg hydraulic core',(.02,sign*.31,.54),(.04,sign*.31,.20),.16,dark,shin)
        box('Titan massive shin greave',(.14,sign*.31,.35),(.32,.36,.38),ivory,shin,.058)
        box('Titan shin enamel panel',(.31,sign*.31,.36),(.035,.20,.20),cloth,shin,.012)
        beam('Titan knee piston housing',(-.12,sign*.49,.36),(-.08,sign*.49,.52),.047,steel,shin)
        beam('Titan knee piston rod',(-.08,sign*.49,.51),(-.02,sign*.49,.63),.023,edges,shin)
        box('Titan broad planted outsole',(.15,sign*.31,.065),(.53,.34,.09),dark,foot,.025)
        box('Titan angular armoured boot',(.13,sign*.31,.16),(.48,.31,.19),steel,foot,.045)
        box('Titan toe impact plate',(.36,sign*.31,.14),(.16,.34,.16),ivory,foot,.032)
        for z in [1.40,1.62,1.82]:
            box('Titan rear heat sink fin',(-.40,sign*.23,z),(.15,.11,.09),steel,'spine',.01)
    box('Titan recessed helmet housing',(-.015,0,2.17),(.46,.43,.46),steel,'head',.095)
    box('Titan angled forehead armour',(.075,0,2.36),(.38,.44,.14),ivory,'head',.036)
    box('Titan angular cheek guard',(.22,0,2.10),(.12,.39,.24),ivory,'head',.036)
    box('Titan dark visor recess',(.264,0,2.22),(.034,.31,.095),dark,'head',.018)
    box('Titan narrow luminous visor',(.286,0,2.228),(.023,.25,.032),light,'head',.009)
    for y in [-.20,.20]:
        box('Titan raised collar plate',(-.02,y,1.99),(.41,.14,.16),steel,'spine',.035)
    weapon='weapon.wrist'
    beam('Titan forged hammer shaft',(.30,-.2,1.37),(.30,-.2,2.62),.052,steel,weapon)
    for z in [1.49,1.60,1.73]:
        beam('Titan insulated shaft grip',(.30,-.2,z-.045),(.30,-.2,z+.045),.068,dark,weapon)
    beam('Titan hammer neck reinforcement',(.30,-.2,2.38),(.30,-.2,2.57),.10,edges,weapon)
    box('Aether warhammer head',(.30,-.2,2.65),(.83,.39,.37),steel,weapon,.065)
    box('Titan hammer suspended upper bridge',(.30,-.2,2.865),(.71,.28,.10),ivory,weapon,.022)
    for x in [-.145,.745]:
        box('Titan hammer machined striking face',(x,-.2,2.65),(.12,.45,.44),edges,weapon,.035)
        box('Titan hammer hardened impact plate',(x+(-.07 if x<0 else .07),-.2,2.65),(.07,.35,.34),ivory,weapon,.017)
    for y in [-.407,.007]:
        box('Titan hammer energy channel',(.30,y,2.66),(.37,.018,.05),light,weapon,.009)
        for x in [.04,.56]:
            beam('Titan hammer assembly bolt',(x,y,2.62),(x,y+(-.02 if y<0 else .02),2.62),.037,edges,weapon)


def sniper_geometry():
    field=material('Sniper weathered field cloth',(.065,.10,.078),0,.9)
    dark=material('Sniper reinforced graphite',(.032,.043,.047),.48,.46)
    gunmetal=material('Sniper machined receiver steel',(.19,.235,.235),.83,.28)
    rubber=material('Sniper black polymer and gloves',(.023,.028,.026),.05,.72)
    lens=material('Sniper optic glass',(.018,.095,.13),.45,.13)
    leather=bpy.data.materials['Hair leather and fur']
    team=bpy.data.materials.get('Deep turquoise cloth') or bpy.data.materials.get('Faction woven cloth and enamel')
    remove_names(['Field helmet','Helmet rim','Helmet chin strap','Optical sight','Receiver','Rifle barrel',
        'Magazine','Shaped rifle stock','Trigger grip','Sniper camouflage field cape','Sniper camouflage mantle'])
    for obj in bpy.data.objects:
        if obj.type!='MESH':continue
        if obj.name.startswith(('Sculpted chest waist','Shaped thigh','Field pack','Shaped pelvis','Upper arm')):
            obj.data.materials.clear();obj.data.materials.append(field)
        if obj.name.startswith(('Hand','Fingers')):
            obj.data.materials.clear();obj.data.materials.append(rubber)
    add_extremity_bones()
    new_bone('weapon.rifle',(-.03,-.25,1.87),(1.52,-.25,1.87),'root')
    box('Sniper fitted plate carrier',(.17,0,1.54),(.19,.50,.49),dark,'spine',.05)
    for side,sign in [('near',-1),('far',1)]:
        box('Sniper faction arm patch',(.02,sign*.49,1.65),(.19,.022,.12),team,'arm.'+side,.013)
        box('Sniper padded knee protector',(.11,sign*.23,.58),(.15,.24,.19),dark,'shin.'+side,.04)
    # Open-front hood, with a shaped crown and neck folds; face remains visible.
    vertices=[];faces=[];segments=12
    hood_rings=[(1.96,.17,.22),(2.12,.22,.235),(2.31,.255,.245),(2.43,.13,.15),(2.455,.025,.035)]
    for z,rx,ry in hood_rings:
        for i in range(segments+1):
            angle=math.radians(62+236*i/segments)
            vertices.append((-.01+math.cos(angle)*rx,math.sin(angle)*ry,z))
    for row in range(len(hood_rings)-1):
        for i in range(segments):
            a=row*(segments+1)+i
            faces.append((a,a+1,a+segments+2,a+segments+1))
    mesh=bpy.data.meshes.new('Sniper sculpted open hood topology');mesh.from_pydata(vertices,[],faces);mesh.update()
    hood=bpy.data.objects.new('Sniper tailored field hood',mesh);bpy.context.collection.objects.link(hood)
    finish(hood,hood.name,field,'head')
    thickness=hood.modifiers.new('Hood woven shell','SOLIDIFY');thickness.thickness=.022
    smooth=hood.modifiers.new('Soft draped hood','SUBSURF');smooth.levels=1
    # Broad upper mantle narrows into a folded asymmetric hem behind the legs.
    vertices=[];faces=[]
    cape_rings=[(1.83,-.20,.43),(1.62,-.37,.47),(1.24,-.47,.40),(.87,-.55,.34),(.73,-.63,.25)]
    for row,(z,x,width) in enumerate(cape_rings):
        for i in range(7):
            y=(i/6*2-1)*width
            fold=math.cos(i*math.pi)*(.035+row*.012)
            vertices.append((x+fold,y,z+(i%2)*.025))
    for row in range(len(cape_rings)-1):
        for i in range(6):
            a=row*7+i;faces.append((a,a+1,a+8,a+7))
    mesh=bpy.data.meshes.new('Sculpted sniper mantle topology');mesh.from_pydata(vertices,[],faces);mesh.update()
    cape=bpy.data.objects.new('Sniper weighted field mantle',mesh);bpy.context.collection.objects.link(cape)
    finish(cape,cape.name,field,'spine')
    thickness=cape.modifiers.new('Mantle cloth shell','SOLIDIFY');thickness.thickness=.025
    smooth=cape.modifiers.new('Rounded cloth folds','SUBSURF');smooth.levels=1
    for index in range(5):
        # Small hanging cloth tabs preserve a broken field silhouette at distance.
        y=-.34+index*.16
        box('Sniper mantle field tie',(-.43,y,1.35-index%2*.08),(.04,.055,.20),field,'spine',.015)
    weapon='weapon.rifle'
    box('Sniper rubber shoulder buttpad',(-.10,-.25,1.84),(.10,.135,.24),rubber,weapon,.022)
    box('Sniper adjustable skeletal stock',(.07,-.25,1.85),(.28,.11,.14),field,weapon,.024)
    box('Sniper stock cheek riser',(.07,-.25,1.955),(.23,.13,.07),rubber,weapon,.017)
    box('Receiver',(.36,-.25,1.87),(.38,.135,.14),gunmetal,weapon,.018)
    box('Sniper top receiver rail',(.42,-.25,1.96),(.58,.10,.025),dark,weapon,.006)
    box('Sniper ventilated fore-end',(.68,-.25,1.86),(.35,.13,.15),field,weapon,.022)
    for x in [.55,.62,.69,.76,.83]:
        box('Sniper handguard side vent',(x,-.323,1.87),(.043,.017,.037),rubber,weapon,.007)
    beam('Rifle barrel',(.75,-.25,1.87),(1.48,-.25,1.87),.031,gunmetal,weapon)
    beam('Sniper barrel shoulder',(.83,-.25,1.87),(.94,-.25,1.87),.049,dark,weapon)
    beam('Sniper muzzle brake',(1.45,-.25,1.87),(1.55,-.25,1.87),.047,dark,weapon)
    for x in [1.48,1.52]:
        box('Sniper muzzle brake vent',(x,-.295,1.87),(.015,.016,.04),rubber,weapon,.003)
    box('Sniper angled pistol grip',(.30,-.25,1.72),(.085,.10,.22),rubber,weapon,.018,rotation=(0,-.25,0))
    box('Sniper box magazine',(.43,-.25,1.71),(.13,.105,.21),dark,weapon,.014,rotation=(0,.12,0))
    for x in [.25,.57]:
        box('Sniper scope ring base',(x,-.25,2.005),(.055,.08,.095),gunmetal,weapon,.01)
    beam('Sniper precision scope',(.15,-.25,2.075),(.63,-.25,2.075),.057,dark,weapon)
    beam('Sniper optic objective bell',(.57,-.25,2.075),(.72,-.25,2.075),.079,dark,weapon)
    beam('Sniper scope objective glass',(.723,-.25,2.075),(.729,-.25,2.075),.063,lens,weapon)
    beam('Sniper eyepiece rubber',(.10,-.25,2.075),(.19,-.25,2.075),.070,rubber,weapon)
    beam('Sniper elevation turret',(.38,-.25,2.1),(.38,-.25,2.17),.045,dark,weapon)
    beam('Sniper side windage turret',(.38,-.29,2.075),(.38,-.35,2.075),.038,dark,weapon)
    beam('Sniper bolt handle',(.40,-.32,1.90),(.45,-.39,1.86),.014,gunmetal,weapon)
    ellipsoid('Sniper bolt knob',(.45,-.39,1.86),(.031,.027,.027),rubber,weapon)
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.name.startswith(('Sniper scope','Sniper precision scope',
            'Sniper optic objective','Sniper eyepiece','Sniper elevation turret','Sniper side windage')):
            obj.location += Vector((.22,0,.065))


def animate_titan():
    frames=[]
    idle_direction=Vector((.84,0,-.542)).normalized()
    for index in range(8):
        frame=index+1
        bpy.context.scene.frame_set(frame)
        if index<4:
            cycle=[0,1,0,-1][index]
            hip_x=-.02
            hip_z=-.045-abs(cycle)*.015
            lean=.06+cycle*.025
            twist=cycle*.035
            origin=Vector((.29+cycle*.025,-.18,1.60+abs(cycle)*.025))
            direction=(Quaternion((0,1,0),cycle*.035) @ idle_direction).normalized()
            near=(.04+cycle*.22,-.31,.16+(0.07 if cycle<0 else 0))
            far=(.04-cycle*.22,.31,.16+(0.07 if cycle>0 else 0))
        else:
            hip_x,hip_z,lean,twist,origin,direction=[
                (-.09,-.12,-.12,-.07,(.13,-.16,1.70),(-.28,0,.96)),
                (-.04,-.08,.01,-.02,(.34,-.16,1.79),(.43,0,.90)),
                (.07,-.13,.22,.065,(.37,-.16,1.70),(.88,0,-.475)),
                (.025,-.11,.15,.035,(.30,-.16,1.56),(.84,0,-.542)),
            ][index-4]
            origin=Vector(origin);direction=Vector(direction).normalized()
            near=(.32,-.31,.16);far=(-.23,.31,.16)
        body_pose(frame,hip_x,hip_z,lean,twist,head_pitch=.03)
        ankles=planted_legs(frame,near,far)
        weapon_pose('weapon.wrist',origin,direction,frame)
        grip_arms(frame,origin+direction*.06,origin+direction*.39)
        frames.append({'frame':index,'ankles':ankles,'hammerOrigin':list(origin),'hammerDirection':list(direction)})
    return frames


def animate_sniper():
    frames=[]
    rest=RIG.data.bones['weapon.rifle']
    for index in range(8):
        frame=index+1
        bpy.context.scene.frame_set(frame)
        if index<4:
            cycle=[0,1,0,-1][index]
            hip_x=-.03
            hip_z=-.025-abs(cycle)*.025
            lean=.09+cycle*.015
            pitch=-.22+cycle*.025
            recoil=0
            near=(.04+cycle*.24,-.23,.14+(0.055 if cycle<0 else 0))
            far=(.04-cycle*.24,.23,.14+(0.055 if cycle>0 else 0))
        else:
            hip_x,hip_z,lean,pitch,recoil=[
                (-.09,-.22,.15,-.075,0),
                (-.07,-.24,.17,0,0),
                (-.08,-.24,.18,.012,.045),
                (-.095,-.23,.13,-.02,.065),
            ][index-4]
            near=(.38,-.23,.14);far=(-.24,.23,.14)
        head,rotation=body_pose(frame,hip_x,hip_z,lean,0,head_pitch=.16 if index>=4 else .03)
        if index>=4:
            rotated_bone('head',head+Vector((-.01,-.11,-.025)),Quaternion((0,1,0),.16),frame)
        ankles=planted_legs(frame,near,far)
        shoulder=RIG.pose.bones['spine'].matrix @ RIG.data.bones['spine'].matrix_local.inverted() @ Vector((0,-.25,1.79))
        origin=shoulder+Vector((-.03-recoil,0,.055))
        direction=Vector((math.cos(pitch),0,math.sin(pitch)))
        delta=weapon_pose('weapon.rifle',origin,direction,frame)
        near_grip=delta @ Vector((.29,-.25,1.72))
        far_grip=delta @ Vector((.48,-.25,1.79))
        grip_arms(frame,near_grip,far_grip)
        frames.append({'frame':index,'ankles':ankles,'rifleOrigin':list(origin),
                       'rifleDirection':list(direction),'nearGrip':list(near_grip),'farGrip':list(far_grip)})
    return frames


def main():
    global RIG
    parser=argparse.ArgumentParser()
    parser.add_argument('--unit',choices=['sniper','super-heavy','both'],default='both')
    parser.add_argument('--preview',action='store_true')
    parser.add_argument('--samples',type=int,default=48)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    STAGE.mkdir(parents=True,exist_ok=True)
    units=['super-heavy','sniper'] if args.unit=='both' else [args.unit]
    sockets_path=STAGE/'weapon-sockets.json'
    sockets=json.loads(sockets_path.read_text()) if sockets_path.exists() else {}
    pose_report={}
    for uid in units:
        baseline=STAGE/f'baseline/unit-{uid}.blend'
        baseline.parent.mkdir(parents=True,exist_ok=True)
        if not baseline.exists():
            shutil.copy2(ROOT/f'art/blender/unit-{uid}.blend',baseline)
        bpy.ops.wm.open_mainfile(filepath=str(baseline))
        RIG=next(obj for obj in bpy.data.objects if obj.type=='ARMATURE')
        reset_animation()
        ART['configure_renderer'](args.samples)
        if uid=='super-heavy':
            titan_geometry()
            poses=animate_titan()
        else:
            sniper_geometry()
            poses=animate_sniper()
            ART['weapon_points'].__globals__['WEAPONS']['sniper']='Sniper muzzle brake'
        scene=bpy.context.scene
        scene['candidate_design']='Titan and sniper silhouette / grounded attack study v1'
        scene['runtime_anchor']=[.5,.92]
        scene['contact_frame']=7
        scene['authored_character_revision']=2
        scene['runtime_weapon_mesh']='Sniper muzzle brake' if uid=='sniper' else 'Aether warhammer head'
        sockets[uid]=ART['bake_sockets'](uid)
        pose_report[uid]=poses
        scene.frame_set(1)
        ART['save_scene'](STAGE/f'unit-{uid}.blend')
        for faction in ['player','enemy']:
            if faction=='enemy':
                ART['enemy_materials']()
                ART['save_scene'](STAGE/f'unit-{uid}-enemy.blend')
            frames=[1,5,7] if args.preview else list(range(1,9))
            for frame in frames:
                scene.frame_set(frame)
                ART['render_atomic'](STAGE/f'frames/{faction}/{uid}/{frame-1}.png')
            print('CANDIDATE_READY',uid,faction,flush=True)
    ART['write_json_atomic'](sockets_path,sockets)
    ART['write_json_atomic'](STAGE/'pose-contract.json',pose_report)


if __name__=='__main__':
    main()
