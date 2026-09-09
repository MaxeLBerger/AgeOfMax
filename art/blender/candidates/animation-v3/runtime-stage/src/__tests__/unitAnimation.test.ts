import unitDefinitions from '../../data/units.json';
import { UNIT_ANIMATION_LAYOUT, parseGaitMetadata, scaledCycleDistance, resetWalkPhase,
  advanceWalkPhase, walkFrameAtPhase, attackFrameAt, settledWalkPhase, type WalkPhaseState } from '../game/unitAnimation';

/** Synthetic schema fixtures are not evidence that the twenty Blender gaits have been authored or approved. */
function metadata() {
  return {
    version: 1, animationLayoutVersion: 3, frameSize: [256, 256],
    walkFrames: [0, 1, 2, 3, 4, 5, 6, 7], attackFrames: [8, 9, 10, 11, 12, 13, 14, 15],
    attackFrameDurationMs: 40, contactFrame: 12, contactDelayMs: 160,
    units: Object.fromEntries(unitDefinitions.map(unit => {
      const wheel = ['ballista', 'cannon', 'tank'].includes(unit.id);
      const mounted = ['knight', 'cavalry', 'dino-rider'].includes(unit.id);
      const heavy = ['mech', 'super-heavy'].includes(unit.id);
      return [unit.id, {
        nominalSpeedPxPerSecond: unit.speed, referenceDisplayScale: heavy ? .57 : wheel || mounted ? .51 : .43,
        cycleDistancePixels: unit.speed * .520, nominalCycleDurationMs: 520,
        motionKind: wheel ? 'wheel-or-track' : mounted ? 'mounted' : unit.id === 'mech' ? 'mechanical-biped' : 'biped',
        stanceFraction: wheel ? 0 : .6, doubleSupportFrames: wheel ? [] as number[] : [0, 4],
      }];
    })),
  };
}
function withUnitField(field: string, value: unknown) {
  const input = metadata();
  return { ...input, units: { ...input.units, rifleman: { ...input.units.rifleman, [field]: value } } };
}
function travel(positions: number[], cycleDistance: number): WalkPhaseState {
  return positions.slice(1).reduce((state, x) => advanceWalkPhase(state, x, cycleDistance), resetWalkPhase(positions[0]));
}

describe('sixteen-frame runtime metadata contract', () => {
  it('accepts exactly the real twenty IDs, keeps layout 3, and does not trust later caller mutations', () => {
    const raw = metadata(), parsed = parseGaitMetadata(raw);
    expect(Object.keys(parsed.units).sort()).toEqual(unitDefinitions.map(unit => unit.id).sort());
    expect(UNIT_ANIMATION_LAYOUT.frameSize).toEqual([256, 256]);
    expect(UNIT_ANIMATION_LAYOUT.frameCount).toBe(16);
    expect(UNIT_ANIMATION_LAYOUT.walkFrames).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(UNIT_ANIMATION_LAYOUT.attackFrames).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(UNIT_ANIMATION_LAYOUT.attackDurationMs).toBe(320);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.units)).toBe(true);
    expect(Object.isFrozen(parsed.units.rifleman)).toBe(true);
    expect(Object.isFrozen(parsed.units.rifleman.doubleSupportFrames)).toBe(true);
    raw.units.rifleman.cycleDistancePixels = 1;
    raw.units.rifleman.doubleSupportFrames[0] = 7;
    expect(parsed.units.rifleman.cycleDistancePixels).toBeCloseTo(22.88, 12);
    expect(parsed.units.rifleman.doubleSupportFrames).toEqual([0, 4]);
    expect(Reflect.set(parsed.units.rifleman, 'cycleDistancePixels', 1)).toBe(false);
    expect(parseGaitMetadata({ ...metadata(), units: Object.fromEntries(Object.entries(metadata().units).reverse()) })).toEqual(parsed);
  });

  it('rejects missing, foreign and inherited IDs rather than accepting an incomplete design catalog', () => {
    const missing = metadata(); delete missing.units.sniper;
    expect(() => parseGaitMetadata(missing)).toThrow();
    const foreign = metadata(); foreign.units.unknown = foreign.units.sniper;
    expect(() => parseGaitMetadata(foreign)).toThrow();
    const inherited = metadata();
    inherited.units = Object.assign(Object.create({ sniper: inherited.units.sniper }), missing.units);
    expect(() => parseGaitMetadata(inherited)).toThrow();
    expect(() => parseGaitMetadata({ status: 'nominal design targets', units: metadata().units })).toThrow();
  });

  it.each([
    ['version', 2], ['animationLayoutVersion', 2], ['frameSize', [512, 256]],
    ['walkFrames', [0, 1, 2, 3]], ['attackFrames', [4, 5, 6, 7]],
    ['attackFrameDurationMs', 80], ['contactFrame', 6], ['contactDelayMs', 80],
    ['attackFrames', [8, 9, 10, 11, Number.NaN, 13, 14, 15]],
    ['walkFrames', [0, 1, 2, 3, 4, 5, 6, Infinity]],
  ] as [string, unknown][])('rejects incompatible %s', (field, value) => {
    expect(() => parseGaitMetadata({ ...metadata(), [field]: value })).toThrow();
  });

  it.each(['nominalSpeedPxPerSecond', 'referenceDisplayScale', 'cycleDistancePixels', 'nominalCycleDurationMs'])(
    'requires positive finite numeric %s', field => {
      for (const value of [0, -1, Number.NaN, Infinity, '44', null])
        expect(() => parseGaitMetadata(withUnitField(field, value))).toThrow();
    });

  it('rejects stale unit speeds and the common error of applying the reference scale a second time', () => {
    expect(() => parseGaitMetadata(withUnitField('nominalSpeedPxPerSecond', 44.000001))).toThrow();
    expect(() => parseGaitMetadata(withUnitField('cycleDistancePixels', 22.88 * .43))).toThrow();
    expect(() => parseGaitMetadata(withUnitField('nominalCycleDurationMs', 1040))).toThrow();
    const tiny = metadata();
    tiny.units.rifleman.nominalCycleDurationMs = .000001;
    tiny.units.rifleman.cycleDistancePixels = .0000001;
    expect(() => parseGaitMetadata(tiny)).toThrow();
  });

  it('allows a measured wheel circumference to define a different duration without inventing feet', () => {
    const raw = metadata();
    raw.units.tank.nominalCycleDurationMs = 780;
    raw.units.tank.cycleDistancePixels = 31 * .780;
    const tank = parseGaitMetadata(raw).units.tank;
    expect(tank.nominalCycleDurationMs).toBe(780);
    expect(tank.stanceFraction).toBe(0);
    expect(tank.doubleSupportFrames).toEqual([]);
    raw.units.tank.doubleSupportFrames = [0];
    expect(() => parseGaitMetadata(raw)).toThrow();
  });

  it.each([[], [8], [-1], [.5], [0, 0], [NaN], [Infinity], new Array(1)].map(frames => ({ frames })))(
    'requires actual distinct grounded walk frames: $frames', ({ frames }) => {
      expect(() => parseGaitMetadata(withUnitField('doubleSupportFrames', frames))).toThrow();
    });

  it('rejects unknown motion, invalid stance and unexpected schema fields', () => {
    expect(() => parseGaitMetadata(withUnitField('motionKind', 'hover'))).toThrow();
    for (const value of [0, 1, -.1, 1.1, NaN, Infinity])
      expect(() => parseGaitMetadata(withUnitField('stanceFraction', value))).toThrow();
    expect(() => parseGaitMetadata(withUnitField('unexpectedScale', 2))).toThrow();
    expect(() => parseGaitMetadata({ ...metadata(), extraLayout: 2 })).toThrow();
    expect(() => parseGaitMetadata(null)).toThrow();
  });
});

describe('actual-distance walk phase, prepared for later BattleScene integration', () => {
  const rifleman = parseGaitMetadata(metadata()).units.rifleman;

  it('advances half as far at half real movement speed over the same elapsed interval', () => {
    const times = [0, .065, .130, .195, .260], cycle = scaledCycleDistance(rifleman, .43);
    const full = travel(times.map(seconds => 100 + 44 * seconds), cycle);
    const half = travel(times.map(seconds => 100 + 22 * seconds), cycle);
    expect(full.phase).toBeCloseTo(.5, 12);
    expect(half.phase).toBeCloseTo(.25, 12);
    expect(half.phase).toBeCloseTo(full.phase / 2, 12);
    expect(walkFrameAtPhase(full.phase)).toBe(4);
    expect(walkFrameAtPhase(half.phase)).toBe(2);
  });

  it('chooses the same phase and frame for equal travelled paths at 1x, 4x and mirrored direction', () => {
    const cycle = scaledCycleDistance(rifleman, .43);
    const one = travel([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11.44], cycle);
    const four = travel([0, 4, 8, 11.44], cycle);
    const enemy = travel([1100, 1096, 1092, 1088.56], cycle);
    expect(one.phase).toBeCloseTo(four.phase, 12);
    expect(enemy.phase).toBeCloseTo(one.phase, 12);
    expect([one, four, enemy].map(state => walkFrameAtPhase(state.phase))).toEqual([4, 4, 4]);
  });

  it('does not advance while paused or stopped, including a currently raised-foot frame', () => {
    let state = resetWalkPhase(100, 3 / 8);
    const original = state;
    for (let frame = 0; frame < 240; frame++) state = advanceWalkPhase(state, 100, rifleman.cycleDistancePixels);
    expect(state).toBe(original);
    expect(state.phase).toBe(3 / 8);
    expect(walkFrameAtPhase(state.phase)).toBe(3); // No implicit snap to an unverified idle pose.
  });

  it('scales an already displayed stride proportionally and treats a negative scale only as mirroring', () => {
    expect(scaledCycleDistance(rifleman, .43)).toBe(rifleman.cycleDistancePixels);
    expect(scaledCycleDistance(rifleman, -.43)).toBeCloseTo(22.88, 12);
    expect(scaledCycleDistance(rifleman, .86)).toBeCloseTo(45.76, 12);
    expect(scaledCycleDistance(rifleman, .215)).toBeCloseTo(11.44, 12);
    const normal = travel([0, 5.72], scaledCycleDistance(rifleman, .43));
    const large = travel([0, 5.72], scaledCycleDistance(rifleman, .86));
    expect(normal.phase).toBe(.25);
    expect(large.phase).toBe(.125);
  });

  it('resets spawn, pool reuse and a backward teleport without counting the discontinuity', () => {
    const old = advanceWalkPhase(resetWalkPhase(600, .5), 605.72, rifleman.cycleDistancePixels);
    const teleported = resetWalkPhase(180, .25);
    expect(advanceWalkPhase(teleported, 180, rifleman.cycleDistancePixels)).toBe(teleported);
    expect(advanceWalkPhase(teleported, 182.86, rifleman.cycleDistancePixels).phase).toBeCloseTo(.375, 12);
    const pooled = resetWalkPhase(1100);
    expect(pooled.phase).toBe(0);
    expect(advanceWalkPhase(pooled, 1097.14, rifleman.cycleDistancePixels).phase).toBeCloseTo(.125, 12);
    expect(old).toEqual({ previousX: 605.72, phase: .75 });
  });

  it('counts a real direction reversal as travel and wraps complete cycles at frame zero', () => {
    const reverse = travel([0, 2.86, 0], rifleman.cycleDistancePixels);
    expect(reverse.phase).toBe(.25);
    const cycle = travel(Array.from({ length: 9 }, (_, index) => index * 2.86), rifleman.cycleDistancePixels);
    expect(cycle.phase).toBe(0);
    expect(walkFrameAtPhase(cycle.phase)).toBe(0);
    expect(walkFrameAtPhase(.125 - .00001)).toBe(0);
    expect(walkFrameAtPhase(.125)).toBe(1);
    expect(walkFrameAtPhase(.999)).toBe(7);
  });

  it('rejects non-finite positions, zero or corrupt strides and invalid scales before they create NaN frames', () => {
    for (const value of [NaN, Infinity]) {
      expect(() => resetWalkPhase(value)).toThrow();
      expect(() => resetWalkPhase(0, value)).toThrow();
      expect(() => advanceWalkPhase(resetWalkPhase(0), value, 22.88)).toThrow();
      expect(() => walkFrameAtPhase(value)).toThrow();
    }
    for (const value of [0, -1, NaN, Infinity])
      expect(() => advanceWalkPhase(resetWalkPhase(0), 1, value)).toThrow();
    for (const value of [0, NaN, Infinity]) expect(() => scaledCycleDistance(rifleman, value)).toThrow();
    expect(() => walkFrameAtPhase(1)).toThrow();
    expect(() => walkFrameAtPhase(-.1)).toThrow();
  });
});

describe('independent attack clock', () => {
  it('has a half-open 320ms interval and switches to the contact frame precisely at 160ms', () => {
    expect(attackFrameAt(-.001)).toBeNull();
    expect(attackFrameAt(0)).toBe(8);
    expect(attackFrameAt(39.999)).toBe(8);
    expect(attackFrameAt(40)).toBe(9);
    expect(attackFrameAt(159.999)).toBe(11);
    expect(attackFrameAt(160)).toBe(UNIT_ANIMATION_LAYOUT.contactFrame);
    expect(attackFrameAt(199.999)).toBe(12);
    expect(attackFrameAt(200)).toBe(13);
    expect(attackFrameAt(319.999)).toBe(15);
    expect(attackFrameAt(320)).toBeNull();
    expect(attackFrameAt(999)).toBeNull();
    expect(UNIT_ANIMATION_LAYOUT.contactDelayMs).toBe(160);
  });

  it('uses game time once, including a held paused time, independently of walk progress', () => {
    const one = [0, 40, 80, 120, 160, 200, 240, 280].map(attackFrameAt);
    expect(one).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect([0, 160].map(attackFrameAt)).toEqual([one[0], one[4]]);
    expect(Array.from({ length: 12 }, () => attackFrameAt(160))).toEqual(Array(12).fill(12));
    expect(() => attackFrameAt(NaN)).toThrow();
    expect(() => attackFrameAt(Infinity)).toThrow();
  });
});


describe('authored grounded stop selection', () => {
  const catalog = parseGaitMetadata(metadata()).units;
  it('lands on a verified support pose from every point of the cycle and stays there', () => {
    for (let step = 0; step < 80; step++) {
      const phase = step / 80, stopped = settledWalkPhase(catalog.rifleman, phase);
      expect(catalog.rifleman.doubleSupportFrames).toContain(walkFrameAtPhase(stopped));
      expect(settledWalkPhase(catalog.rifleman, stopped)).toBe(stopped);
      const gap = Math.abs(stopped - phase);
      expect(Math.min(gap, 1 - gap)).toBeLessThanOrEqual(.25);
    }
    expect(settledWalkPhase(catalog.rifleman, .375)).toBe(.5);
    expect(settledWalkPhase(catalog.rifleman, .875)).toBe(0);
  });

  it('holds a mechanical wheel angle while stopped instead of turning it to a rest pose', () => {
    for (const phase of [0, .125, .37, .875, .999]) {
      expect(settledWalkPhase(catalog.cannon, phase)).toBe(phase);
      expect(settledWalkPhase(catalog.tank, phase)).toBe(phase);
    }
  });

  it('resumes from the landed pose using only subsequent physical travel', () => {
    const gait = catalog.rifleman;
    const stopped = resetWalkPhase(500, settledWalkPhase(gait, .375));
    expect(advanceWalkPhase(stopped, 500, gait.cycleDistancePixels)).toBe(stopped);
    const resumed = advanceWalkPhase(stopped, 500 + gait.cycleDistancePixels / 8, gait.cycleDistancePixels);
    expect(resumed.phase).toBeCloseTo(.625, 12);
    expect(walkFrameAtPhase(resumed.phase)).toBe(5);
  });

  it('rejects invalid phases before selecting a visible grounded pose', () => {
    for (const phase of [NaN, Infinity, -1, 1])
      expect(() => settledWalkPhase(catalog.rifleman, phase)).toThrow();
  });
});
