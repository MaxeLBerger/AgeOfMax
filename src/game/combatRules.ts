import type { UnitType } from './types';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Everything that separates the three difficulty levels, in one table. */
export interface DifficultyProfile {
  /** Gold available when the battle begins. */
  startingGold: number;
  /** Multiplier for passive income per second. */
  income: number;
  /** Share of the kill bounty paid for a defeated enemy. */
  bounty: number;
  /** Hit point and damage multiplier for enemy troops. */
  enemyStats: number;
  /** Troops added to every announced wave. */
  waveSizeOffset: number;
  /** Game milliseconds between two enemy technology advances. */
  enemyEpochMs: number;
  /** Hit point multiplier for the enemy fortress. */
  enemyFortress: number;
  /** Damage multiplier for the gun of the enemy fortress (0 disables it). */
  enemyGun: number;
  /** Extra enemy troop strength for every further wave of the final enemy epoch, so no match stalls forever. */
  lateSurge: number;
}

// Tuned with complete bot matches of novice to expert player archetypes; see docs/QA_REBUILD.md.
export const DIFFICULTY: Record<Difficulty, DifficultyProfile> = {
  easy: { startingGold: 300, income: 1, bounty: 0.42, enemyStats: 0.92, waveSizeOffset: -1, enemyEpochMs: 155000, enemyFortress: 1.5, enemyGun: 0.75, lateSurge: 0.08 },
  medium: { startingGold: 240, income: 1, bounty: 0.38, enemyStats: 1.1, waveSizeOffset: 0, enemyEpochMs: 145000, enemyFortress: 1.5, enemyGun: 1, lateSurge: 0.12 },
  hard: { startingGold: 150, income: 1, bounty: 0.33, enemyStats: 1.15, waveSizeOffset: 2, enemyEpochMs: 125000, enemyFortress: 1.5, enemyGun: 1.25, lateSurge: 0.12 },
};

/** Announced waves grow by one troop every second wave until the cap. */
export const WAVE_GROWTH = { first: 8, cap: 14 };
/**
 * The enemy fortress fires at the closest attacker near its wall; damage follows its epoch.
 * Strong against an early siege, restrained later so a late assault can still break the wall.
 * Below a quarter of its hit points the gun falls silent, so a nearly won siege can be finished.
 */
export const FORTRESS_GUN = { range: 280, intervalMs: 1500, splash: 45, silentBelow: 0.25, damage: [20, 35, 50, 65, 80] };
export const ARMY_LIMIT = 24;
export const WAVE_ASSAULT_MS = 28000;
export const WAVE_RESPITE_MS = 16000;
export const INITIAL_PREPARE_MS = 12000;
// Later epochs pay enough to finish a match against the larger late waves.
export const EPOCH_INCOME = [8, 15, 26, 42, 68];
export const BASE_HP = [4200, 5600, 7600, 10000, 14000];
export const FORMATION_OFFSETS = [-7, 0, 7] as const;

/** Centre spacing in screen pixels; mounted troops and engines need more room. */
export function formationFootprint(id: string): number {
  return ['dino-rider', 'knight', 'cavalry', 'tank', 'ballista', 'cannon', 'mech', 'super-heavy'].includes(id) ? 36 : 24;
}

export function formationGap(firstId: string, secondId: string): number {
  return Math.max(formationFootprint(firstId), formationFootprint(secondId));
}


/** All combat clocks consume game milliseconds; JSON intervals are seconds. */
export function canAttack(nowMs: number, previousMs: number, intervalSeconds: number): boolean {
  return nowMs - previousMs >= Math.max(100, intervalSeconds * 1000);
}

export function waveSize(wave: number, difficulty: Difficulty): number {
  const baseline = Math.min(WAVE_GROWTH.cap, WAVE_GROWTH.first + Math.floor(wave / 2));
  return Math.max(3, baseline + DIFFICULTY[difficulty].waveSizeOffset);
}

export function enemyEpochAt(elapsedMs: number, difficulty: Difficulty): number {
  return Math.min(4, Math.floor(elapsedMs / DIFFICULTY[difficulty].enemyEpochMs));
}

export function unitRole(id: string): 'line' | 'ranged' | 'assault' | 'siege' {
  if (['ballista', 'cannon', 'grenadier', 'plasma-trooper'].includes(id)) return 'siege';
  if (['dino-rider', 'knight', 'cavalry', 'super-heavy'].includes(id)) return 'assault';
  if (['slinger', 'archer', 'musketeer', 'sniper', 'laser-soldier'].includes(id)) return 'ranged';
  return 'line';
}

export function damageAgainst(attacker: UnitType, target: UnitType | undefined, baseDamage: number): number {
  const role = unitRole(attacker.id);
  let multiplier = 1;
  if (!target) multiplier = role === 'siege' ? 2.2 : role === 'assault' ? 1.4 : 1;
  else if (attacker.id === 'spearman' && unitRole(target.id) === 'assault') multiplier = 1.7;
  else if (role === 'assault' && unitRole(target.id) === 'ranged') multiplier = 1.25;
  else if (attacker.id === 'sniper' && unitRole(target.id) === 'line') multiplier = 1.4;
  return Math.max(1, Math.round(baseDamage * multiplier));
}

/** First contact with a circular hit volume, including tangency and a start inside it. */
export function segmentHitFraction(ax: number, ay: number, bx: number, by: number, x: number, y: number, radius: number): number | null {
  const dx = bx - ax, dy = by - ay;
  const ox = ax - x, oy = ay - y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
  return entry >= 0 && entry <= 1 ? entry : null;
}

/** First contact of a swept segment with an axis-aligned wall, including a start inside it. */
export function segmentBoxHitFraction(ax: number, ay: number, bx: number, by: number,
  left: number, top: number, right: number, bottom: number): number | null {
  let entry = 0, exit = 1;
  for (const [start, delta, min, max] of [[ax, bx - ax, left, right], [ay, by - ay, top, bottom]]) {
    if (Math.abs(delta) < 0.000001) { if (start < min || start > max) return null; continue; }
    const first = (min - start) / delta, last = (max - start) / delta;
    entry = Math.max(entry, Math.min(first, last));
    exit = Math.min(exit, Math.max(first, last));
    if (entry > exit) return null;
  }
  return entry;
}
