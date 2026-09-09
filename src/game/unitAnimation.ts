import unitDefinitions from '../../data/units.json';

export const UNIT_ANIMATION_LAYOUT = Object.freeze({
  metadataVersion: 1,
  animationLayoutVersion: 3,
  frameSize: Object.freeze([256, 256] as const),
  frameCount: 16,
  walkFrames: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7] as const),
  attackFrames: Object.freeze([8, 9, 10, 11, 12, 13, 14, 15] as const),
  attackFrameDurationMs: 40,
  contactFrame: 12,
  contactDelayMs: 160,
  attackDurationMs: 320,
} as const);

const MOTION_KINDS = ['biped', 'mounted', 'mechanical-biped', 'wheel-or-track'] as const;
export type MotionKind = typeof MOTION_KINDS[number];

export interface UnitGaitMetadata {
  readonly nominalSpeedPxPerSecond: number;
  readonly referenceDisplayScale: number;
  /** Game pixels at referenceDisplayScale; this is already scaled, not a raw sheet distance. */
  readonly cycleDistancePixels: number;
  readonly nominalCycleDurationMs: number;
  readonly motionKind: MotionKind;
  readonly stanceFraction: number;
  readonly doubleSupportFrames: readonly number[];
}
export interface GaitMetadata {
  readonly version: 1;
  readonly animationLayoutVersion: 3;
  readonly frameSize: readonly [256, 256];
  readonly walkFrames: readonly number[];
  readonly attackFrames: readonly number[];
  readonly attackFrameDurationMs: 40;
  readonly contactFrame: 12;
  readonly contactDelayMs: 160;
  readonly units: Readonly<Record<string, UnitGaitMetadata>>;
}

function invalid(field: string, expected: string): never {
  throw new Error('Invalid unit animation ' + field + ': expected ' + expected + '.');
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(field, 'an object');
  return value as Record<string, unknown>;
}
function finite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(field, 'a finite number');
  return value;
}
function positive(value: unknown, field: string): number {
  const number = finite(value, field);
  if (number <= 0) invalid(field, 'a positive number');
  return number;
}
function keys(value: Record<string, unknown>, expected: readonly string[], field: string): void {
  const actual = Object.keys(value);
  if (actual.length !== expected.length || expected.some(key => !Object.prototype.hasOwnProperty.call(value, key)))
    invalid(field, 'exactly ' + expected.join(', '));
}
function exactFrames(value: unknown, expected: readonly number[], field: string): void {
  if (!Array.isArray(value) || value.length !== expected.length || expected.some((frame, index) => value[index] !== frame))
    invalid(field, '[' + expected.join(', ') + ']');
}
function close(first: number, second: number): boolean {
  return Math.abs(first - second) <= 1e-6 * Math.max(Math.abs(first), Math.abs(second));
}

/** Checks runtime data, not the separate Blender proof of grounded feet or measured wheel geometry. */
export function parseGaitMetadata(value: unknown): GaitMetadata {
  const layout = UNIT_ANIMATION_LAYOUT;
  const input = record(value, 'metadata');
  keys(input, ['version', 'animationLayoutVersion', 'frameSize', 'walkFrames', 'attackFrames',
    'attackFrameDurationMs', 'contactFrame', 'contactDelayMs', 'units'], 'metadata fields');
  for (const [field, expected] of Object.entries({
    version: layout.metadataVersion, animationLayoutVersion: layout.animationLayoutVersion,
    attackFrameDurationMs: layout.attackFrameDurationMs, contactFrame: layout.contactFrame, contactDelayMs: layout.contactDelayMs,
  })) if (input[field] !== expected) invalid(field, String(expected));
  exactFrames(input.frameSize, UNIT_ANIMATION_LAYOUT.frameSize, 'frameSize');
  exactFrames(input.walkFrames, UNIT_ANIMATION_LAYOUT.walkFrames, 'walkFrames');
  exactFrames(input.attackFrames, UNIT_ANIMATION_LAYOUT.attackFrames, 'attackFrames');
  const catalog = record(input.units, 'units');
  const ids = unitDefinitions.map(unit => unit.id);
  if (ids.length !== 20 || new Set(ids).size !== 20) invalid('unit definitions', 'the twenty unique migration IDs');
  keys(catalog, ids, 'unit IDs');
  const units: Record<string, UnitGaitMetadata> = {};
  for (const definition of unitDefinitions) {
    const id = definition.id, entry = record(catalog[id], id);
    keys(entry, ['nominalSpeedPxPerSecond', 'referenceDisplayScale', 'cycleDistancePixels',
      'nominalCycleDurationMs', 'motionKind', 'stanceFraction', 'doubleSupportFrames'], id + ' fields');
    const nominalSpeedPxPerSecond = positive(entry.nominalSpeedPxPerSecond, id + '.nominalSpeedPxPerSecond');
    const referenceDisplayScale = positive(entry.referenceDisplayScale, id + '.referenceDisplayScale');
    const cycleDistancePixels = positive(entry.cycleDistancePixels, id + '.cycleDistancePixels');
    const nominalCycleDurationMs = positive(entry.nominalCycleDurationMs, id + '.nominalCycleDurationMs');
    if (nominalSpeedPxPerSecond !== definition.speed) invalid(id + '.nominalSpeedPxPerSecond', 'the speed in units.json');
    const expectedDistance = nominalSpeedPxPerSecond * nominalCycleDurationMs / 1000;
    if (!Number.isFinite(expectedDistance) || !close(cycleDistancePixels, expectedDistance))
      invalid(id + '.cycleDistancePixels', 'nominal speed multiplied by cycle seconds, at the reference display scale');
    if (!MOTION_KINDS.includes(entry.motionKind as MotionKind)) invalid(id + '.motionKind', MOTION_KINDS.join(' / '));
    const motionKind = entry.motionKind as MotionKind;
    const stanceFraction = finite(entry.stanceFraction, id + '.stanceFraction');
    const support = entry.doubleSupportFrames;
    if (!Array.isArray(support) || Array.from(support).some(frame => !Number.isInteger(frame) || frame < 0 || frame >= layout.walkFrames.length)
      || new Set(support).size !== support.length) invalid(id + '.doubleSupportFrames', 'unique walk frame indices 0–7');
    if (motionKind === 'wheel-or-track') {
      if (stanceFraction !== 0 || support.length !== 0) invalid(id, 'zero stance and no support frames for wheels or tracks');
    } else if (stanceFraction <= 0 || stanceFraction >= 1 || support.length === 0)
      invalid(id, 'a stance fraction between zero and one and at least one grounded walk frame');
    units[id] = Object.freeze({ nominalSpeedPxPerSecond, referenceDisplayScale, cycleDistancePixels,
      nominalCycleDurationMs, motionKind, stanceFraction, doubleSupportFrames: Object.freeze([...support]) });
  }
  return Object.freeze({
    version: layout.metadataVersion, animationLayoutVersion: layout.animationLayoutVersion, frameSize: layout.frameSize,
    walkFrames: UNIT_ANIMATION_LAYOUT.walkFrames, attackFrames: UNIT_ANIMATION_LAYOUT.attackFrames,
    attackFrameDurationMs: layout.attackFrameDurationMs, contactFrame: layout.contactFrame,
    contactDelayMs: layout.contactDelayMs, units: Object.freeze(units),
  });
}

/** Negative scale mirrors the same gait; applying referenceDisplayScale again would double-scale it. */
export function scaledCycleDistance(gait: UnitGaitMetadata, scaleX: number): number {
  const magnitude = Math.abs(finite(scaleX, 'scaleX'));
  positive(magnitude, 'absolute scaleX');
  const distance = positive(gait.cycleDistancePixels, 'cycleDistancePixels')
    * (magnitude / positive(gait.referenceDisplayScale, 'referenceDisplayScale'));
  return positive(distance, 'scaled cycle distance');
}

export interface WalkPhaseState {
  readonly previousX: number;
  readonly phase: number;
}
function normalizedPhase(value: number): number {
  let phase = ((value % 1) + 1) % 1;
  // Suppress only floating-point residue at exact frame boundaries, not actual sub-frame travel.
  const count = UNIT_ANIMATION_LAYOUT.walkFrames.length;
  const nearestFrame = Math.round(phase * count);
  if (Math.abs(phase * count - nearestFrame) < 1e-10) phase = (nearestFrame % count) / count;
  return phase;
}
function checkedPhase(value: number): number {
  finite(value, 'walk phase');
  if (value < 0 || value >= 1) invalid('walk phase', 'a fraction from zero (inclusive) to one (exclusive)');
  return value;
}

/** Call on spawn, pool reuse and explicit teleport. The optional phase offset has no previous travel. */
export function resetWalkPhase(x: number, phaseOffset = 0): WalkPhaseState {
  return { previousX: finite(x, 'reset x'), phase: normalizedPhase(finite(phaseOffset, 'phase offset')) };
}

/** Sample after actual horizontal movement. No time, velocity or simulation-speed multiplier enters. */
export function advanceWalkPhase(state: WalkPhaseState, nextX: number, cycleDistancePixels: number): WalkPhaseState {
  finite(state.previousX, 'previous x');
  finite(nextX, 'next x');
  checkedPhase(state.phase);
  positive(cycleDistancePixels, 'cycle distance');
  const distance = finite(Math.abs(nextX - state.previousX), 'travel distance');
  if (distance === 0) return state;
  return { previousX: nextX, phase: normalizedPhase(finite(state.phase + distance / cycleDistancePixels, 'advanced phase')) };
}

/** Stopping preserves the chosen walk pose; a grounded idle transition still needs separate integration. */
export function walkFrameAtPhase(phase: number): number {
  return UNIT_ANIMATION_LAYOUT.walkFrames[Math.floor(normalizedPhase(checkedPhase(phase)) * UNIT_ANIMATION_LAYOUT.walkFrames.length)];
}

/**
 * Choose the nearest authored grounded pose once motion stops. This discrete
 * landing can move a foot slightly; it is not a new timed walk cycle.
 * Wheels and tracks preserve their angle instead of snapping to a rest phase.
 */
export function settledWalkPhase(gait: UnitGaitMetadata, phase: number): number {
  checkedPhase(phase);
  if (!gait.doubleSupportFrames.length) return phase;
  let selected = phase, closest = Infinity;
  for (const frame of gait.doubleSupportFrames) {
    const candidate = frame / UNIT_ANIMATION_LAYOUT.walkFrames.length;
    const gap = Math.abs(candidate - phase);
    const distance = Math.min(gap, 1 - gap);
    if (distance < closest) { closest = distance; selected = candidate; }
  }
  return selected;
}

/** The half-open attack interval is [0,320): contact is frame 12 at 160 game milliseconds. */
export function attackFrameAt(elapsedMs: number): number | null {
  finite(elapsedMs, 'attack elapsed milliseconds');
  if (elapsedMs < 0 || elapsedMs >= UNIT_ANIMATION_LAYOUT.attackDurationMs) return null;
  return UNIT_ANIMATION_LAYOUT.attackFrames[Math.floor(elapsedMs / UNIT_ANIMATION_LAYOUT.attackFrameDurationMs)];
}
