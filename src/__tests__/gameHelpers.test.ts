import { describe, it, expect } from '@jest/globals';
import {
  calculateXPFromDamage,
  calculateKillBonusXP,
  canAdvanceEpoch,
  calculateGoldTick,
  getEpochSafe,
  calculateSpawnCost
} from '../utils/gameHelpers';
import type { Epoch } from '../game/types';

describe('Game Helpers', () => {
  describe('calculateXPFromDamage', () => {
    it('should return damage when target HP is higher', () => {
      expect(calculateXPFromDamage(50, 100)).toBe(50);
    });

    it('should cap at remaining HP', () => {
      expect(calculateXPFromDamage(50, 30)).toBe(30);
    });

    it('should return 0 for negative values', () => {
      expect(calculateXPFromDamage(-10, 50)).toBe(0);
    });
  });

  describe('calculateKillBonusXP', () => {
    it('should return base 10 XP for default cost', () => {
      expect(calculateKillBonusXP()).toBe(15); // 10 + 10% of 50
    });

    it('should add 10% of unit cost', () => {
      expect(calculateKillBonusXP(100)).toBe(20); // 10 + 10
      expect(calculateKillBonusXP(200)).toBe(30); // 10 + 20
    });
  });

  describe('canAdvanceEpoch', () => {
    const testEpoch: Epoch = {
      id: 'stone',
      name: 'Stone Age',
      xpToNext: 100,
      unlocks: { units: [], turrets: [] }
    };

    it('should return true when XP threshold reached', () => {
      expect(canAdvanceEpoch(100, testEpoch)).toBe(true);
      expect(canAdvanceEpoch(150, testEpoch)).toBe(true);
    });

    it('should return false when below threshold', () => {
      expect(canAdvanceEpoch(99, testEpoch)).toBe(false);
    });

    it('should return false for final epoch (xpToNext = 0)', () => {
      const finalEpoch = { ...testEpoch, xpToNext: 0 };
      expect(canAdvanceEpoch(1000, finalEpoch)).toBe(false);
    });
  });

  describe('calculateGoldTick', () => {
    it('should calculate gold for 1 second at 6/s', () => {
      expect(calculateGoldTick(1000, 6)).toBe(6);
    });

    it('should calculate gold for partial seconds', () => {
      expect(calculateGoldTick(500, 6)).toBe(3);
      expect(calculateGoldTick(166.67, 6)).toBeCloseTo(1, 1);
    });

    it('should handle zero delta', () => {
      expect(calculateGoldTick(0, 6)).toBe(0);
    });
  });

  describe('getEpochSafe', () => {
    const epochs: Epoch[] = [
      { id: '1', name: 'First', xpToNext: 100, unlocks: { units: [], turrets: [] } },
      { id: '2', name: 'Second', xpToNext: 200, unlocks: { units: [], turrets: [] } },
      { id: '3', name: 'Third', xpToNext: 0, unlocks: { units: [], turrets: [] } }
    ];

    it('should return correct epoch for valid index', () => {
      expect(getEpochSafe(epochs, 1).name).toBe('Second');
    });

    it('should clamp negative index to 0', () => {
      expect(getEpochSafe(epochs, -5).name).toBe('First');
    });

    it('should clamp out-of-bounds index to last', () => {
      expect(getEpochSafe(epochs, 999).name).toBe('Third');
    });
  });

  describe('calculateSpawnCost', () => {
    it('should return base cost with default multiplier', () => {
      expect(calculateSpawnCost(50)).toBe(50);
    });

    it('should apply multiplier correctly', () => {
      expect(calculateSpawnCost(50, 1.5)).toBe(75);
      expect(calculateSpawnCost(50, 2.0)).toBe(100);
    });

    it('should ceil fractional results', () => {
      expect(calculateSpawnCost(45, 1.2)).toBe(54); // 54 from 45 * 1.2 = 54
      expect(calculateSpawnCost(33, 1.7)).toBe(57); // 56.1 ceiled to 57
    });
  });
});
