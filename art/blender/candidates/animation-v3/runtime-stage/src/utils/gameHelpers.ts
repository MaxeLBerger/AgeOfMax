import type { Epoch } from '../game/types';

/**
 * Calculate XP reward for dealing damage
 * @param damage - Amount of damage dealt
 * @param targetHp - Remaining HP of target
 * @returns XP amount (capped at actual damage dealt)
 */
export function calculateXPFromDamage(damage: number, targetHp: number): number {
  return Math.max(0, Math.min(damage, targetHp));
}

/**
 * Calculate bonus XP for killing a unit
 * @param unitCost - Gold cost of the killed unit
 * @returns Bonus XP (10 base + 10% of unit cost)
 */
export function calculateKillBonusXP(unitCost: number = 50): number {
  return 10 + Math.floor(unitCost * 0.1);
}

/**
 * Check if XP threshold reached for epoch progression
 * @param currentXP - Current XP amount
 * @param currentEpoch - Current epoch data
 * @returns True if epoch can advance
 */
export function canAdvanceEpoch(currentXP: number, currentEpoch: Epoch): boolean {
  return currentEpoch.xpToNext > 0 && currentXP >= currentEpoch.xpToNext;
}

/**
 * Calculate gold bounty for killing an enemy unit
 * @param unitCost - Gold cost of the killed unit
 * @returns Base gold bounty (20 base + 80% of unit cost)
 */
export function calculateKillGoldBounty(unitCost: number = 50): number {
  return 20 + Math.floor(unitCost * 0.8);
}


/**
 * Get epoch by index with bounds checking
 * @param epochs - Array of all epochs
 * @param index - Desired epoch index
 * @returns Epoch at index or last epoch if out of bounds
 */
export function getEpochSafe(epochs: Epoch[], index: number): Epoch {
  const clampedIndex = Math.max(0, Math.min(index, epochs.length - 1));
  return epochs[clampedIndex];
}

/**
 * Calculate unit spawn cost with epoch multiplier
 * @param baseCost - Base unit gold cost
 * @param epochMultiplier - Epoch cost multiplier (1.0 = no change)
 * @returns Final spawn cost
 */
export function calculateSpawnCost(baseCost: number, epochMultiplier: number = 1.0): number {
  return Math.ceil(baseCost * epochMultiplier);
}

/** Data files express attack speed as seconds between attacks. */
export function attackIntervalMs(attackSpeedSeconds: number): number {
  return Math.max(100, attackSpeedSeconds * 1000);
}

/** Preserve earned progress when one reward crosses an epoch threshold. */
export function calculateOverflowXP(currentXP: number, threshold: number): number {
  return threshold > 0 ? Math.max(0, currentXP - threshold) : currentXP;
}

export function calculateProgress(xp: number, threshold: number): number {
  if (threshold <= 0) return 1;
  return Math.max(0, Math.min(1, xp / threshold));
}

