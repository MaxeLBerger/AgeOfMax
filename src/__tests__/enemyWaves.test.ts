import { describe, it, expect } from '@jest/globals';
import unitData from '../../data/units.json';
import type { UnitType } from '../game/types';
import { planEnemyWave, referenceWaveCost } from '../game/enemyWaves';
import { unitRole, waveSize, type Difficulty } from '../game/combatRules';

const database = unitData as UnitType[];
const epochs = ['stone', 'castle', 'renaissance', 'modern', 'future'];
const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
const cases = epochs.flatMap(epoch => difficulties.map(difficulty => ({ epoch, difficulty })));
const byId = new Map(database.map(unit => [unit.id, unit]));
const roleCount = (ids: readonly string[], role: ReturnType<typeof unitRole>) => ids.filter(id => unitRole(id) === role).length;

describe('announced enemy wave plans', () => {
  it.each(cases)('keeps all 32 $epoch/$difficulty plans within the real troop, budget and front contracts', ({ epoch, difficulty }) => {
    for (let number = 1; number <= 32; number++) {
      const plan = planEnemyWave(number, difficulty, epoch, database);
      expect(plan.number).toBe(number);
      expect(plan.epoch).toBe(epoch);
      expect(plan.unitIds).toHaveLength(waveSize(number, difficulty));
      expect(plan.unitIds.every(id => byId.get(id)?.epoch === epoch)).toBe(true);
      const gold = plan.unitIds.reduce((sum, id) => sum + byId.get(id)!.goldCost, 0);
      expect(Number.isFinite(plan.referenceCost)).toBe(true);
      expect(plan.referenceCost).toBeGreaterThan(0);
      expect(plan.cost).toBe(gold);
      expect(plan.cost).toBeGreaterThanOrEqual(plan.referenceCost * 0.92);
      expect(plan.cost).toBeLessThanOrEqual(plan.referenceCost * 1.08);
      const front = roleCount(plan.unitIds, 'line') + roleCount(plan.unitIds, 'assault');
      expect(front).toBeGreaterThanOrEqual(Math.ceil(plan.unitIds.length * 0.3));
      expect(['line', 'assault']).toContain(unitRole(plan.unitIds[0]));
      expect(new Set(plan.unitIds).size).toBeGreaterThanOrEqual(3);
      expect(plan.title.length).toBeGreaterThan(0);
      expect(plan.advice.length).toBeGreaterThan(0);
      expect(plan.roster.reduce((sum, row) => sum + row.count, 0)).toBe(plan.unitIds.length);
      for (const row of plan.roster) {
        expect(Number.isInteger(row.count)).toBe(true);
        expect(row.count).toBeGreaterThan(0);
        expect(plan.unitIds.filter(id => id === row.id)).toHaveLength(row.count);
      }
      expect(planEnemyWave(number, difficulty, epoch, [...database].reverse())).toEqual(plan);
      const interleaved = [...database.filter((_, index) => index % 2), ...database.filter((_, index) => !(index % 2))];
      expect(planEnemyWave(number, difficulty, epoch, interleaved)).toEqual(plan);
      if (epoch === 'stone') expect(plan.tactic).not.toBe('siege');
      if (plan.tactic === 'siege') expect(roleCount(plan.unitIds, 'siege')).toBeGreaterThan(0);
      if (plan.tactic === 'volley') expect(roleCount(plan.unitIds, 'ranged')).toBeGreaterThan(0);
      if (plan.tactic === 'charge') expect(epoch === 'modern'
        ? plan.unitIds.filter(id => id === 'tank').length : roleCount(plan.unitIds, 'assault')).toBeGreaterThan(0);
    }
  });

  it.each(cases)('gives $epoch/$difficulty tactics a measurable emphasis at the same count and budget', ({ epoch, difficulty }) => {
    // All four numbers are beyond the count cap and share the old order's zero offset.
    const mixed = planEnemyWave(17, difficulty, epoch, database);
    const charge = planEnemyWave(22, difficulty, epoch, database);
    const siege = planEnemyWave(13, difficulty, epoch, database);
    const volley = planEnemyWave(19, difficulty, epoch, database);
    expect(mixed.tactic).toBe('mixed');
    expect(charge.tactic).toBe('charge');
    expect(volley.tactic).toBe('volley');
    for (const plan of [charge, siege, volley]) {
      expect(plan.unitIds.length).toBe(mixed.unitIds.length);
      expect(plan.referenceCost).toBe(mixed.referenceCost);
    }
    const heavy = (ids: readonly string[]) => epoch === 'modern'
      ? ids.filter(id => id === 'tank').length : roleCount(ids, 'assault');
    expect(heavy(charge.unitIds)).toBeGreaterThan(heavy(mixed.unitIds));
    expect(roleCount(volley.unitIds, 'ranged')).toBeGreaterThan(roleCount(mixed.unitIds, 'ranged'));
    if (epoch === 'stone') expect(siege.tactic).toBe('mixed');
    else expect(roleCount(siege.unitIds, 'siege')).toBeGreaterThan(roleCount(mixed.unitIds, 'siege'));
    if (epoch === 'modern') {
      expect(charge.title).toBe('Panzerkeil');
      expect(unitRole('tank')).toBe('line'); // Planning does not grant an assault damage bonus.
    }
  });

  it.each([
    ['stone', 535, 665, 950], ['castle', 1075, 1370, 1945], ['renaissance', 1740, 1995, 3055],
    ['modern', 2440, 2970, 4365], ['future', 3830, 4730, 6780],
  ] as [string, number, number, number][])('retains independently counted early, offset and capped normal budgets for %s', (epoch, first, third, capped) => {
    // Historical first-wave multiplicities 3/2/2/1; wave 3: 2/2/3/2; wave 30: 5/3/4/2.
    expect(referenceWaveCost(1, 'medium', epoch, database)).toBe(first);
    expect(referenceWaveCost(3, 'medium', epoch, database)).toBe(third);
    expect(referenceWaveCost(30, 'medium', epoch, database)).toBe(capped);
  });

  it('does not mutate definitions or let an announced composition change through a shared reference', () => {
    const protectedDatabase = Object.freeze(database.map(unit => Object.freeze({ ...unit })));
    const before = JSON.stringify(protectedDatabase);
    const plan = planEnemyWave(14, 'medium', 'future', protectedDatabase);
    const recorded = JSON.stringify(plan);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.unitIds)).toBe(true);
    expect(Object.isFrozen(plan.roster)).toBe(true);
    expect(plan.roster.every(Object.isFrozen)).toBe(true);
    expect(Reflect.set(plan, 'cost', 0)).toBe(false);
    expect(Reflect.set(plan.unitIds, '0', 'clubman')).toBe(false);
    expect(Reflect.set(plan.roster[0], 'count', 999)).toBe(false);
    expect(JSON.stringify(plan)).toBe(recorded);
    expect(JSON.stringify(protectedDatabase)).toBe(before);
  });

  it('rejects a missing or duplicated troop instead of borrowing from another epoch', () => {
    expect(() => planEnemyWave(1, 'medium', 'stone', database.filter(unit => unit.id !== 'slinger'))).toThrow();
    const replaced = database.filter(unit => unit.id !== 'slinger').concat({ ...database[0] });
    expect(() => planEnemyWave(1, 'medium', 'stone', replaced)).toThrow();
    expect(() => planEnemyWave(1, 'medium', 'unknown', database)).toThrow();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid wave number %s', number => {
    expect(() => planEnemyWave(number, 'medium', 'stone', database)).toThrow();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid troop gold cost %s before comparing budgets', goldCost => {
    const invalid = database.map(unit => unit.id === 'clubman' ? { ...unit, goldCost } : unit);
    expect(() => planEnemyWave(1, 'medium', 'stone', invalid)).toThrow();
  });
});
