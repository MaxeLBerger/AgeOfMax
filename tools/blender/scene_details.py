"""Small, authored Blender additions shared by saved-scene exports."""
import bpy


def add_siege_banner(unit_id):
    if unit_id not in ['ballista', 'cannon'] or bpy.data.objects.get('Siege faction pennant'):
        return
    scene = bpy.context.scene
    scene.frame_set(1)
    faction = bpy.data.materials.get('Faction woven cloth and enamel')
    if faction is None:
        faction = bpy.data.materials.new('Faction woven cloth and enamel')
        faction.use_nodes = True
        faction.diffuse_color = (.025, .24, .25, 1)
        shader = faction.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = faction.diffuse_color
        shader.inputs['Roughness'].default_value = .8
    bronze = bpy.data.materials.get('Antique bronze edges')
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.018, depth=.82,
                                       location=(-.56, .10, 1.10))
    mast = bpy.context.object
    mast.name = 'Siege pennant brass mast'
    if bronze:
        mast.data.materials.append(bronze)
    mesh = bpy.data.meshes.new('Folded siege pennant cloth')
    mesh.from_pydata([(-.56,.10,1.49),(-.79,.04,1.46),(-1.00,.14,1.43),
                     (-.56,.10,1.18),(-.79,.04,1.16),(-1.00,.14,1.43)],
                    [], [(0,1,4,3),(1,2,5,4)])
    mesh.update()
    flag = bpy.data.objects.new('Siege faction pennant', mesh)
    bpy.context.collection.objects.link(flag)
    flag.data.materials.append(faction)
    thickness = flag.modifiers.new('Heavy woven cloth thickness','SOLIDIFY')
    thickness.thickness = .015
    # The authored fabric fold changes slightly with wagon motion.
    flag.shape_key_add(name='Basis')
    gust = flag.shape_key_add(name='Breeze')
    for i in [1,2,4,5]:
        gust.data[i].co.y += .07 if i in [1,4] else -.055
    for frame, value in enumerate([.2,.7,.4,0,.5,.85,.45,.1],1):
        gust.value = value
        gust.keyframe_insert('value',frame=frame)
