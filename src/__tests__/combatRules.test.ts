import { describe, it, expect } from '@jest/globals';
import { canAttack, damageAgainst, enemyEpochAt, segmentHitFraction, waveSize, DIFFICULTY, EPOCH_INCOME, formationFootprint, formationGap, segmentBoxHitFraction } from '../game/combatRules';
import units from '../../data/units.json';
import epochs from '../../data/epochs.json';
import type { UnitType } from '../game/types';

const unit = (id: string) => units.find(value => value.id === id)! as UnitType;

describe('Combat rules', () => {
  it('keeps infantry 24px apart and leaves at least 36px around heavy vehicles', () => {
    expect(formationFootprint('clubman')).toBe(24);
    expect(formationFootprint('tank')).toBe(36);
    expect(formationGap('clubman', 'spearman')).toBe(24);
    expect(formationGap('tank', 'rifleman')).toBe(36);
    expect(formationGap('rifleman', 'tank')).toBe(36);
  });

  it('treats all attack intervals as seconds, with the same cadence against bases and troops', () => {
    expect(canAttack(1499, 0, 1.5)).toBe(false);
    expect(canAttack(1500, 0, 1.5)).toBe(true);
    expect(canAttack(0, -Infinity, 4)).toBe(true);
    expect(canAttack(1510, 1500, 1.5)).toBe(false);
  });

  it('gives spears a measurable counter against charging units, not every melee unit', () => {
    expect(damageAgainst(unit('spearman'), unit('dino-rider'), 10)).toBe(17);
    expect(damageAgainst(unit('spearman'), unit('clubman'), 10)).toBe(10);
    expect(damageAgainst(unit('knight'), unit('archer'), 20)).toBe(25);
  });

  it('gives siege weapons meaningful structure damage', () => {
    expect(damageAgainst(unit('cannon'), undefined, 100)).toBe(220);
    expect(damageAgainst(unit('cannon'), unit('tank'), 100)).toBe(100);
  });

  it('sweeps fast projectiles through targets at 4x speed and includes both endpoints', () => {
    expect(segmentHitFraction(0, 0, 100, 0, 50, 8, 10)).toBeCloseTo(0.44);
    expect(segmentHitFraction(0, 0, 100, 0, -5, 0, 10)).toBe(0);
    expect(segmentHitFraction(0, 0, 100, 0, 105, 0, 10)).toBeCloseTo(0.95);
    expect(segmentHitFraction(0, 0, 0, 0, 0, 0, 10)).toBe(0);
    expect(segmentHitFraction(0, 0, 100, 0, 50, 11, 10)).toBeNull();
  });

  it('sweeps a base wall in either direction without accepting flights above or beside it', () => {
    expect(segmentBoxHitFraction(0, 50, 100, 50, 40, 20, 60, 80)).toBe(0.4);
    expect(segmentBoxHitFraction(100, 50, 0, 50, 40, 20, 60, 80)).toBe(0.4);
    expect(segmentBoxHitFraction(50, 50, 50, 50, 40, 20, 60, 80)).toBe(0);
    expect(segmentBoxHitFraction(50, 0, 50, 100, 40, 20, 60, 80)).toBe(0.2);
    expect(segmentBoxHitFraction(0, 10, 100, 10, 40, 20, 60, 80)).toBeNull();
    expect(segmentBoxHitFraction(70, 0, 70, 100, 40, 20, 60, 80)).toBeNull();
    expect(segmentBoxHitFraction(100, 50, 200, 50, 40, 20, 60, 80)).toBeNull();
  });

  it('keeps waves bounded and difficulty ordered, even in an indefinitely long match', () => {
    for (const wave of [1, 2, 7, 30, 1000]) {
      expect(waveSize(wave, 'easy')).toBeLessThan(waveSize(wave, 'medium'));
      expect(waveSize(wave, 'medium')).toBeLessThan(waveSize(wave, 'hard'));
      expect(waveSize(wave, 'hard')).toBeLessThanOrEqual(16);
    }
    const interval = DIFFICULTY.medium.enemyEpochMs;
    expect(enemyEpochAt(interval - 1, 'medium')).toBe(0);
    expect(enemyEpochAt(interval, 'medium')).toBe(1);
    expect(enemyEpochAt(60 * 60000, 'hard')).toBe(4);
  });

  it('never makes a harder difficulty friendlier on any lever of the difficulty table', () => {
    const levels = [DIFFICULTY.easy, DIFFICULTY.medium, DIFFICULTY.hard];
    for (let index = 1; index < levels.length; index++) {
      const easier = levels[index - 1], harder = levels[index];
      expect(harder.startingGold).toBeLessThanOrEqual(easier.startingGold);
      expect(harder.income).toBeLessThanOrEqual(easier.income);
      expect(harder.bounty).toBeLessThanOrEqual(easier.bounty);
      expect(harder.enemyEpochMs).toBeLessThanOrEqual(easier.enemyEpochMs);
      expect(harder.enemyStats).toBeGreaterThanOrEqual(easier.enemyStats);
      expect(harder.waveSizeOffset).toBeGreaterThan(easier.waveSizeOffset);
      expect(harder.enemyGun).toBeGreaterThanOrEqual(easier.enemyGun);
      expect(harder.enemyFortress).toBeGreaterThanOrEqual(easier.enemyFortress);
      expect(harder.lateSurge).toBeGreaterThanOrEqual(easier.lateSurge);
    }
  });

  it('supports all five epochs with affordable units, distinct roles and complete unlocks', () => {
    for (const [index, epoch] of epochs.entries()) {
      const roster = units.filter(value => value.epoch === epoch.id);
      expect(roster).toHaveLength(4);
      expect(roster.map(value => value.id).sort()).toEqual([...epoch.unlocks.units].sort());
      expect(Math.min(...roster.map(value => value.goldCost))).toBeLessThan(EPOCH_INCOME[index] * 20);
      for (const value of roster) {
        expect(value.hp).toBeGreaterThan(0);
        expect(value.damage).toBeGreaterThan(0);
        expect(value.attackSpeed).toBeGreaterThan(0.1);
      }
    }
    expect(epochs.at(-1)!.xpToNext).toBe(0);
  });
});
