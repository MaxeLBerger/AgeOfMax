"""Refine and render the original, editable AgeOfMax Blender scenes.

The saved .blend scenes are the canonical geometry source. The initial procedural
generator was lost to an interrupted all-zero write; this exporter deliberately
does not pretend that it can regenerate that geometry from an empty scene.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from scene_details import add_siege_banner
from animation_contract import validate_gait_metadata, gait_document
SOURCE = ROOT / 'art/blender'
OUT = ROOT / 'public/assets/reborn'
EPOCHS = ['stone', 'castle', 'renaissance', 'modern', 'future']
UNITS = json.loads((ROOT / 'data/units.json').read_text())
WEAPONS = {
    'clubman': 'Stone warclub head', 'spearman': 'Knapped spearhead',
    'slinger': 'Sling stone', 'dino-rider': 'Stone warclub head',
    'swordsman': 'Fullered sword blade', 'archer': 'Arrowhead',
    'knight': 'Knapped spearhead', 'ballista': 'Iron quarrel head',
    'musketeer': 'Rifle barrel', 'cavalry': 'Knapped spearhead',
    'cannon': 'Dark muzzle', 'duelist': 'Fullered sword blade',
    'rifleman': 'Rifle barrel', 'grenadier': 'Segmented grenade',
    'tank': 'Muzzle bore', 'sniper': 'Rifle barrel',
    'laser-soldier': 'Rifle barrel', 'mech': 'Arm emitter',
    'plasma-trooper': 'Plasma acceleration coil.002', 'super-heavy': 'Aether warhammer head',
}


def replace_atomic(source, destination):
    for attempt in range(12):
        try:
            os.replace(source, destination)
            return
        except PermissionError:
            if attempt == 11:
                raise
            time.sleep(.12 * (attempt + 1))


def write_json_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.writing.json')
    with temporary.open('w', encoding='utf-8') as handle:
        json.dump(data, handle, indent=2)
        handle.flush()
        os.fsync(handle.fileno())
    replace_atomic(temporary, path)


def save_scene(path):
    temporary = path.with_name(path.stem + '.saving.blend')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(temporary), compress=True)
    replace_atomic(temporary, path)


def configure_renderer(samples):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    preferences = bpy.context.preferences.addons['cycles'].preferences
    try:
        preferences.compute_device_type = 'OPTIX'
        preferences.get_devices()
        for device in preferences.devices:
            device.use = device.type == 'OPTIX'
        if any(device.type == 'OPTIX' for device in preferences.devices):
            scene.cycles.device = 'GPU'
    except (TypeError, RuntimeError):
        scene.cycles.device = 'CPU'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'


def render_atomic(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.stem + '.rendering.png')
    bpy.context.scene.render.filepath = str(temporary)
    bpy.ops.render.render(write_still=True)
    if temporary.stat().st_size < 500:
        raise RuntimeError(f'Empty render: {temporary}')
    replace_atomic(temporary, path)


def material_color(material, color):
    material.diffuse_color = color
    if not material.use_nodes:
        return
    for node in material.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Base Color'].default_value = color
            if 'emission' in material.name.lower():
                node.inputs['Emission Color'].default_value = color
        if node.type == 'VALTORGB':
            for stop in node.color_ramp.elements:
                value = .65 + stop.position * .35
                stop.color = tuple(channel * value for channel in color[:3]) + (1,)


def enemy_materials():
    for material in bpy.data.materials:
        name = material.name.lower()
        if any(word in name for word in ['turquoise', 'petrol', 'teal', 'banner cloth', 'faction woven']):
            material_color(material, (.42, .024, .044, 1))
        elif 'aether emission' in name:
            material_color(material, (1.0, .09, .028, 1))


def armature():
    return next((obj for obj in bpy.data.objects if obj.type == 'ARMATURE'), None)


def set_group(obj, rig, group_name):
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=group_name)
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    if not any(modifier.type == 'ARMATURE' for modifier in obj.modifiers):
        modifier = obj.modifiers.new('Original rig deformation', 'ARMATURE')
        modifier.object = rig


def add_sniper_cape():
    if bpy.data.objects.get('Sniper camouflage field cape'):
        return
    rig = armature()
    # A separate thick cloth shell leaves the long rifle and arms unobstructed.
    mesh = bpy.data.meshes.new('Tailored field cape mesh')
    vertices = [(-.16, -.30, 1.82), (-.18, .30, 1.82),
                (-.44, -.37, 1.38), (-.47, .36, 1.38),
                (-.53, -.29, .92), (-.57, .27, .98)]
    mesh.from_pydata(vertices, [], [(0, 1, 3, 2), (2, 3, 5, 4)])
    mesh.update()
    obj = bpy.data.objects.new('Sniper camouflage field cape', mesh)
    bpy.context.collection.objects.link(obj)
    material = bpy.data.materials.new('Sniper muted field cape')
    material.use_nodes = True
    material_color(material, (.075, .11, .08, 1))
    material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .88
    obj.data.materials.append(material)
    thickness = obj.modifiers.new('Cloth thickness', 'SOLIDIFY')
    thickness.thickness = .025
    edge = obj.modifiers.new('Soft cloth edge', 'BEVEL')
    edge.width = .035
    edge.segments = 3
    if rig:
        set_group(obj, rig, 'spine')


def add_attack_wrist(unit_id):
    if unit_id not in ['clubman', 'dino-rider', 'super-heavy']:
        return
    rig = armature()
    scene = bpy.context.scene
    scene.frame_set(1)
    if 'weapon.wrist' not in rig.data.bones:
        hand = bpy.data.objects['Hand']
        head = bpy.data.objects[WEAPONS[unit_id]]
        bpy.context.view_layer.objects.active = rig
        rig.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bone = rig.data.edit_bones.new('weapon.wrist')
        bone.head = rig.matrix_world.inverted() @ hand.matrix_world.translation
        bone.tail = rig.matrix_world.inverted() @ head.matrix_world.translation
        bone.parent = rig.data.edit_bones['forearm.near']
        bpy.ops.object.mode_set(mode='OBJECT')
        rig.select_set(False)
        for obj in bpy.data.objects:
            if obj.type != 'MESH':
                continue
            if any(word in obj.name for word in ['club handle', 'Club leather binding', 'warclub head',
                                                'warhammer head', 'Warhammer haft', 'Hammer energy face']):
                set_group(obj, rig, 'weapon.wrist')
    wrist = rig.pose.bones['weapon.wrist']
    wrist.rotation_mode = 'QUATERNION'
    for frame in range(1, 5):
        scene.frame_set(frame)
        wrist.rotation_quaternion = (1, 0, 0, 0)
        wrist.keyframe_insert('rotation_quaternion', frame=frame)
    # Pose 4 winds up, 5 swings forward, 6 contacts, 7 recovers (zero-based).
    poses = [(-.45, -.30, (-.45, 0, .9)),
             (-.80, -.38, (.45, 0, .75)),
             (-1.00, -.54, (1, 0, -.12)),
             (-.25, -.08, (.32, 0, .95))]
    rest = rig.data.bones['weapon.wrist']
    rest_vector = rest.tail_local - rest.head_local
    for frame, (upper, fore, direction) in enumerate(poses, 5):
        scene.frame_set(frame)
        rig.pose.bones['arm.near'].rotation_euler.z = upper
        rig.pose.bones['forearm.near'].rotation_euler.z = fore
        for name in ['arm.near', 'forearm.near']:
            rig.pose.bones[name].keyframe_insert('rotation_euler', frame=frame)
        bpy.context.view_layer.update()
        parent = rig.pose.bones['forearm.near']
        parent_delta = parent.matrix @ parent.bone.matrix_local.inverted()
        position = parent_delta @ rest.head_local
        rotation = rest_vector.rotation_difference(Vector(direction)) @ rest.matrix_local.to_quaternion()
        wrist.matrix = Matrix.Translation(position) @ rotation.to_matrix().to_4x4()
        bpy.context.view_layer.update()
        wrist.keyframe_insert('rotation_quaternion', frame=frame)
    scene['attack_contact_frame'] = 7
    scene['attack_contract'] = 'windup=5; swing=6; impact=7; recover=8'


def weapon_points(unit_id):
    name = bpy.context.scene.get('runtime_weapon_mesh', WEAPONS[unit_id])
    obj = bpy.data.objects.get(name)
    if obj is None:
        # These aliases support the original named meshes, without guessed screen positions.
        aliases = {'slinger': ['Sling pouch', 'Leather sling pouch', 'Sling loaded stone', 'Sling cord'],
                   'plasma-trooper': ['Plasma emitter', 'Rifle barrel', 'Plasma barrel']}
        obj = next((bpy.data.objects.get(alias) for alias in aliases.get(unit_id, [])
                    if bpy.data.objects.get(alias)), None)
    if obj is None:
        raise RuntimeError(f'Missing authored weapon mesh for {unit_id}: {name}')
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    vertices = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
    # Some broad muzzles need a fixed authored front surface. Selecting new
    # extremal vertices as the weapon tilts would make the socket slide.
    authored_indices = bpy.context.scene.get('runtime_weapon_vertex_indices')
    if authored_indices is not None:
        if 'runtime_weapon_mesh' not in bpy.context.scene:
            raise RuntimeError(f'Fixed muzzle indices require an explicit mesh: {unit_id}')
        try:
            indices = list(authored_indices)
        except TypeError as error:
            raise RuntimeError(f'Invalid fixed muzzle indices: {unit_id}') from error
        if (not indices or any(type(index) is not int or index < 0 or index >= len(vertices) for index in indices)
                or len(set(indices)) != len(indices)):
            raise RuntimeError(f'Invalid fixed muzzle indices: {unit_id}')
        expected_count = bpy.context.scene.get('runtime_weapon_evaluated_vertex_count', len(obj.data.vertices))
        if type(expected_count) is not int or expected_count <= 0:
            raise RuntimeError(f'Invalid authored muzzle topology count: {unit_id}')
        if len(vertices) != expected_count:
            raise RuntimeError(f'Muzzle topology changed after index authoring: {unit_id}')
        return sum((vertices[index] for index in indices), Vector()) / len(indices)
    if unit_id in ['grenadier', 'slinger', 'clubman', 'dino-rider', 'super-heavy']:
        return sum(vertices, Vector()) / len(vertices)
    maximum = max(vertex.x for vertex in vertices)
    minimum = min(vertex.x for vertex in vertices)
    end = [vertex for vertex in vertices if vertex.x >= maximum - max(.008, (maximum-minimum)*.025)]
    return sum(end, Vector()) / len(end)


def bake_sockets(unit_id):
    scene = bpy.context.scene
    marker = bpy.data.objects.get('Weapon muzzle / runtime socket')
    if marker is None:
        marker = bpy.data.objects.new('Weapon muzzle / runtime socket', None)
        bpy.context.collection.objects.link(marker)
    marker.empty_display_type = 'SPHERE'
    marker.empty_display_size = .04
    marker['runtime_contract'] = '256px frame; anchor=(0.5,0.92); project before horizontal enemy flip'
    if marker.animation_data:
        marker.animation_data_clear()
    coordinates = []
    for frame in range(1, 9):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        point = weapon_points(unit_id)
        marker.location = point
        marker.keyframe_insert('location', frame=frame)
        projected = world_to_camera_view(scene, scene.camera, point)
        coordinates.append([round(projected.x * 256, 3), round((1-projected.y) * 256, 3)])
    return coordinates


def pack(unit_id, faction, frame_count=8):
    subprocess.run([str(ROOT / '.conda/python.exe'), str(ROOT / 'tools/blender/pack_sheets.py'),
                    '--unit', unit_id, '--faction', faction, '--frames', str(frame_count),
                    '--output-root', str(OUT), '--frames-root', str(SOURCE / 'frames')],
                   check=True, stdout=subprocess.DEVNULL)


def authored_animation_actions(scene):
    """Read the complete saved v3 clip bindings; never rebuild an authored pose."""
    if scene.get('animation_study_revision') != 3:
        raise RuntimeError('Unsupported authored animation layout')
    try:
        actions = json.loads(scene['animation_study_actions'])
    except (KeyError, TypeError, ValueError) as error:
        raise RuntimeError('Missing saved walk/attack action mapping') from error
    if not isinstance(actions, dict) or set(actions) != {'walk', 'attack'}:
        raise RuntimeError('An authored animation needs exactly walk and attack clips')
    for clip, mapping in actions.items():
        if not isinstance(mapping, dict) or not mapping:
            raise RuntimeError(f'Empty authored clip: {clip}')
        for object_name, action_name in mapping.items():
            obj = bpy.data.objects.get(object_name)
            action = bpy.data.actions.get(action_name)
            if obj is None or obj.animation_data is None or action is None:
                raise RuntimeError(f'Broken authored binding: {clip}/{object_name}/{action_name}')
    if set(actions['walk']) != set(actions['attack']):
        raise RuntimeError('Walk and attack must bind the same animated objects')
    if scene.camera is None:
        raise RuntimeError('Missing authored animation camera')
    if (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage) != (256, 256, 100):
        raise RuntimeError('Authored animation must render 256x256 samples')
    return actions


def authored_gait_metadata(scene, unit):
    """Read a measured gait from the saved source; nominal targets are not a fallback."""
    try:
        gait = json.loads(scene['animation_study_gait'])
    except (KeyError, TypeError, ValueError) as error:
        raise RuntimeError(f"Missing authored gait: {unit['id']}") from error
    return validate_gait_metadata(gait, unit)


def set_authored_animation_sample(actions, index):
    if not isinstance(index, int) or not 0 <= index < 16:
        raise ValueError('Authored animation sample must be 0..15')
    clip = 'walk' if index < 8 else 'attack'
    for object_name, action_name in actions[clip].items():
        bpy.data.objects[object_name].animation_data.action = bpy.data.actions[action_name]
    bpy.context.scene.frame_set(index % 8)
    bpy.context.view_layer.update()


def export_authored_unit(unit, factions, samples, render_frames=True, gait_catalog=None):
    """Export each saved team source read-only; character v2 and v3 bindings survive."""
    unit_id = unit['id']
    reference = None
    reference_gait = None
    for faction in factions:
        suffix = '-enemy' if faction == 'enemy' else ''
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE / f'unit-{unit_id}{suffix}.blend'))
        scene = bpy.context.scene
        actions = authored_animation_actions(scene)
        gait = authored_gait_metadata(scene, unit)
        if reference_gait is not None and reference_gait != gait:
            raise RuntimeError(f'Faction gait mismatch for {unit_id}')
        reference_gait = gait
        configure_renderer(samples)
        coordinates = []
        for index in range(16):
            set_authored_animation_sample(actions, index)
            point = weapon_points(unit_id)
            projected = world_to_camera_view(scene, scene.camera, point)
            coordinate = [round(projected.x * 256, 3), round((1-projected.y) * 256, 3)]
            if not all(math.isfinite(value) and 0 < value < 256 for value in coordinate):
                raise RuntimeError(f'Invalid authored socket: {unit_id}/{faction}/{index}')
            coordinates.append(coordinate)
            if render_frames:
                render_atomic(SOURCE / 'frames' / faction / unit_id / f'{index}.png')
        if reference is not None and any(abs(a-b) > .001001 for pa,pb in zip(reference,coordinates) for a,b in zip(pa,pb)):
            raise RuntimeError(f'Faction socket mismatch for {unit_id}; do not merge different geometry')
        reference = coordinates
        if render_frames:
            pack(unit_id, faction, 16)
        print(f'ART_AUTHORED_UNIT_READY {unit_id} {faction} layout=3 frames=16', flush=True)
    if gait_catalog is not None:
        gait_catalog[unit_id] = reference_gait
    return reference


def export_unit(unit, factions, samples, render_frames=True, expected_frame_count=None, gait_catalog=None):
    unit_id = unit['id']
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE / f'unit-{unit_id}.blend'))
    authored_revision = bpy.context.scene.get('animation_study_revision', 0)
    actual_frame_count = 16 if authored_revision else 8
    if expected_frame_count is not None and actual_frame_count != expected_frame_count:
        raise RuntimeError(f'Animation contract mismatch: {unit_id} source={actual_frame_count}, requested={expected_frame_count}')
    if authored_revision:
        if bpy.context.scene['animation_study_revision'] != 3:
            raise RuntimeError(f'Unknown authored animation revision: {unit_id}')
        return export_authored_unit(unit, factions, samples, render_frames, gait_catalog)
    configure_renderer(samples)
    if bpy.context.scene.get('authored_character_revision', 0) < 2:
        add_siege_banner(unit_id)
        if unit_id == 'sniper':
            add_sniper_cape()
        add_attack_wrist(unit_id)
    sockets = bake_sockets(unit_id)
    bpy.context.scene.frame_set(1)
    save_scene(SOURCE / f'unit-{unit_id}.blend')
    if not render_frames:
        if 'enemy' in factions:
            enemy_materials()
            save_scene(SOURCE / f'unit-{unit_id}-enemy.blend')
        return sockets
    for faction in factions:
        suffix = '-enemy' if faction == 'enemy' else ''
        if faction == 'enemy':
            enemy_materials()
            save_scene(SOURCE / f'unit-{unit_id}-enemy.blend')
        for frame in range(1, 9):
            bpy.context.scene.frame_set(frame)
            render_atomic(SOURCE / 'frames' / faction / unit_id / f'{frame-1}.png')
        pack(unit_id, faction)
        print(f'ART_UNIT_READY {unit_id} {faction}', flush=True)
    return sockets


def export_static(kind, epoch, faction, samples):
    suffix = '-enemy' if faction == 'enemy' else ''
    if kind == 'backgrounds':
        filenames = [(f'background-{epoch}', f'backgrounds/{epoch}.png')]
    elif kind == 'bases':
        filenames = [(f'base-{epoch}', f'bases{suffix}/{epoch}.png')]
    else:
        filenames = [(f'tower-{epoch}-{tier}', f'towers{suffix}/{epoch}-{tier}.png') for tier in range(1,4)]
    for source, target in filenames:
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE / f'{source}.blend'))
        configure_renderer(samples)
        if faction == 'enemy':
            enemy_materials()
            save_scene(SOURCE / f'{source}-enemy.blend')
        render_atomic(OUT / target)


def main():
    import sys
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind', choices=['all','units','backgrounds','bases','towers'], default='all')
    parser.add_argument('--epoch', choices=EPOCHS+['all'], default='all')
    parser.add_argument('--unit')
    parser.add_argument('--sockets-only', action='store_true')
    parser.add_argument('--faction', choices=['player','enemy','both'], default='both')
    parser.add_argument('--samples', type=int, default=48)
    parser.add_argument('--frames', type=int, choices=[8,16], default=16,
                        help='Expected complete animation contract; reject mixed source layouts.')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    factions = ['player','enemy'] if args.faction == 'both' else [args.faction]
    epochs = EPOCHS if args.epoch == 'all' else [args.epoch]
    sockets_path = OUT / 'weapon-sockets.json'
    sockets = json.loads(sockets_path.read_text()) if sockets_path.exists() else {}
    gait_path = OUT / 'gait-metadata.json'
    gaits = {}
    if args.frames == 16 and gait_path.exists():
        existing = json.loads(gait_path.read_text())
        if not isinstance(existing, dict) or not isinstance(existing.get('units'), dict):
            raise RuntimeError('Invalid existing gait metadata')
        if existing != gait_document(existing['units']):
            raise RuntimeError('Existing gait metadata has a different animation layout')
        gaits = existing['units']
    if args.kind in ['all','units']:
        for unit in UNITS:
            if args.unit and unit['id'] not in args.unit.split(','):
                continue
            if unit['epoch'] not in epochs:
                continue
            sockets[unit['id']] = export_unit(unit, factions, args.samples, not args.sockets_only, args.frames,
                                               gaits if args.frames == 16 else None)
            write_json_atomic(sockets_path, sockets)
            if args.frames == 16:
                write_json_atomic(gait_path, gait_document(gaits))
        write_json_atomic(sockets_path, sockets)
    for kind in ['backgrounds','bases','towers']:
        if args.kind not in ['all',kind]:
            continue
        for epoch in epochs:
            for faction in (['player'] if kind == 'backgrounds' else factions):
                export_static(kind, epoch, faction, args.samples)
    print('ART_EXPORT_COMPLETE', flush=True)


if __name__ == '__main__':
    main()
