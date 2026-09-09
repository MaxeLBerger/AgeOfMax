"""Shared Blender-independent validation of measured 16-frame gait contracts."""
import math


def validate_gait_metadata(gait, unit):
    """Validate one source-derived entry against its existing runtime definition."""
    fields = {'nominalSpeedPxPerSecond', 'referenceDisplayScale', 'cycleDistancePixels',
              'nominalCycleDurationMs', 'motionKind', 'stanceFraction', 'doubleSupportFrames'}
    if not isinstance(gait, dict) or set(gait) != fields:
        raise RuntimeError(f"Invalid authored gait fields: {unit['id']}")
    for field in ['nominalSpeedPxPerSecond', 'referenceDisplayScale', 'cycleDistancePixels', 'nominalCycleDurationMs']:
        value = gait[field]
        if type(value) not in (int, float) or not math.isfinite(value) or value <= 0:
            raise RuntimeError(f"Invalid authored gait number: {unit['id']}/{field}")
    scale = .57 if unit['id'] in ['super-heavy', 'mech'] else (
        .51 if unit['id'] in ['dino-rider', 'knight', 'cavalry', 'tank', 'ballista', 'cannon'] else .43)
    if gait['nominalSpeedPxPerSecond'] != unit['speed'] or gait['referenceDisplayScale'] != scale:
        raise RuntimeError(f"Authored gait differs from runtime unit speed/scale: {unit['id']}")
    expected_distance = gait['nominalSpeedPxPerSecond'] * gait['nominalCycleDurationMs'] / 1000
    if not math.isclose(gait['cycleDistancePixels'], expected_distance, rel_tol=1e-6, abs_tol=0):
        raise RuntimeError(f"Authored gait distance/duration mismatch: {unit['id']}")
    kind = gait['motionKind']
    if kind not in ['biped', 'mounted', 'mechanical-biped', 'wheel-or-track']:
        raise RuntimeError(f"Invalid authored motion kind: {unit['id']}")
    stance, support = gait['stanceFraction'], gait['doubleSupportFrames']
    if type(stance) not in (int, float) or not math.isfinite(stance):
        raise RuntimeError(f"Invalid authored stance: {unit['id']}")
    if (not isinstance(support, list) or any(type(frame) is not int or not 0 <= frame < 8 for frame in support)
            or len(set(support)) != len(support)):
        raise RuntimeError(f"Invalid authored support frames: {unit['id']}")
    if kind == 'wheel-or-track':
        valid_support = stance == 0 and not support
    else:
        valid_support = 0 < stance < 1 and bool(support)
    if not valid_support:
        raise RuntimeError(f"Authored stance does not match motion kind: {unit['id']}")
    return gait


def gait_document(units):
    return {'version': 1, 'animationLayoutVersion': 3, 'frameSize': [256, 256],
            'walkFrames': list(range(8)), 'attackFrames': list(range(8, 16)),
            'attackFrameDurationMs': 40, 'contactFrame': 12, 'contactDelayMs': 160,
            'units': units}


def validate_gait_document(value, definitions):
    if not isinstance(value, dict) or not isinstance(value.get("units"), dict):
        raise RuntimeError("Invalid gait metadata document")
    if value != gait_document(value["units"]):
        raise RuntimeError("Invalid complete gait animation layout")
    if set(value["units"]) != {unit["id"] for unit in definitions}:
        raise RuntimeError("Gait keys do not match all runtime unit IDs")
    for unit in definitions:
        validate_gait_metadata(value["units"][unit["id"]], unit)
    return value
