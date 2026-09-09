import type { UnitType } from './types';
import { unitRole, waveSize, type Difficulty } from './combatRules';

export type WaveTactic = 'mixed' | 'charge' | 'siege' | 'volley';
export interface EnemyWavePlan {
  readonly number: number;
  readonly epoch: string;
  readonly tactic: WaveTactic;
  readonly title: string;
  readonly advice: string;
  readonly unitIds: readonly string[];
  readonly roster: readonly { readonly id: string; readonly count: number }[];
  readonly cost: number;
  readonly referenceCost: number;
}

// Named formations preserve the tested pressure budget even if JSON entries are reordered.
const ORIGINAL_ROSTERS: Record<string, readonly string[]> = {
  stone: ['clubman', 'spearman', 'slinger', 'dino-rider'],
  castle: ['swordsman', 'archer', 'knight', 'ballista'],
  renaissance: ['musketeer', 'cavalry', 'cannon', 'duelist'],
  modern: ['rifleman', 'grenadier', 'tank', 'sniper'],
  future: ['laser-soldier', 'mech', 'plasma-trooper', 'super-heavy'],
};
const ORIGINAL_ORDER = [0, 1, 0, 2, 1, 3, 0, 2, 3, 1, 2, 0];
const CYCLE: readonly WaveTactic[] = ['mixed', 'charge', 'volley', 'mixed', 'siege', 'charge', 'volley', 'siege'];
type Role = ReturnType<typeof unitRole>;
const WEIGHTS: Record<WaveTactic, Record<Role, number>> = {
  mixed: { line: 0.4, ranged: 0.25, assault: 0.2, siege: 0.15 },
  charge: { line: 0.22, ranged: 0.18, assault: 0.52, siege: 0.08 },
  siege: { line: 0.3, ranged: 0.1, assault: 0.14, siege: 0.46 },
  volley: { line: 0.25, ranged: 0.5, assault: 0.2, siege: 0.05 },
};
const isFront = (unit: UnitType): boolean => ['line', 'assault'].includes(unitRole(unit.id));

export function referenceWaveCost(wave: number, difficulty: Difficulty, epoch: string, units: readonly UnitType[]): number {
  const named = ORIGINAL_ROSTERS[epoch];
  if (!named) throw new Error('Unknown wave epoch: ' + epoch);
  const offset = wave % 3 === 0 ? 2 : 0;
  return Array.from({ length: waveSize(wave, difficulty) }, (_, index) => {
    const id = named[ORIGINAL_ORDER[(index + offset) % ORIGINAL_ORDER.length]];
    const unit = units.find(candidate => candidate.id === id);
    if (!unit || unit.epoch !== epoch) throw new Error('Missing wave unit: ' + id);
    if (!Number.isFinite(unit.goldCost) || unit.goldCost <= 0) throw new Error('Invalid wave unit cost: ' + id);
    return unit.goldCost;
  }).reduce((sum, cost) => sum + cost, 0);
}

function describe(tactic: WaveTactic, epoch: string): { title: string; advice: string } {
  if (tactic === 'mixed') return { title: 'Mischformation', advice: 'Kombiniere eine starke Front mit Fernkampf. Halte Gold für Verstärkung zurück.' };
  if (tactic === 'siege') return { title: 'Belagerung', advice: 'Fange die Angreifer früh ab: Ihre Belagerungswaffen bedrohen deine Festung.' };
  if (tactic === 'volley') return {
    title: 'Schützenformation',
    advice: epoch === 'modern' ? 'Panzer nach vorn, Scharfschützen dahinter. Nutze Artillerie gegen dichte Gruppen.'
      : 'Schütze deine schnellen Angreifer mit einer stabilen Front und erreiche die gegnerischen Schützen.',
  };
  return {
    title: epoch === 'modern' ? 'Panzerkeil' : epoch === 'future' ? 'Titanenvorstoß' : 'Durchbruch',
    advice: epoch === 'stone' ? 'Speerwächter sind stark gegen Reiter. Lass deine Schleuderer hinter ihnen kämpfen.'
      : epoch === 'modern' ? 'Verstärke deine Front. Panzerabwehr und konzentriertes Feuer helfen gegen schwere Fahrzeuge.'
        : 'Schwere Angreifer suchen den Nahkampf. Halte deine Schützen hinter einer belastbaren Front.',
  };
}

/** Immutable, announced before the assault. No player state or hidden stat multipliers enter this plan. */
export function planEnemyWave(wave: number, difficulty: Difficulty, epoch: string, database: readonly UnitType[]): EnemyWavePlan {
  if (!Number.isInteger(wave) || wave < 1) throw new Error('Wave numbers start at one.');
  const units = database.filter(unit => unit.epoch === epoch).sort((a, b) => a.id.localeCompare(b.id));
  if (units.length !== 4) throw new Error('Every wave epoch needs its four complete troop definitions.');
  const count = waveSize(wave, difficulty), budget = referenceWaveCost(wave, difficulty, epoch, database);
  let tactic = CYCLE[(wave - 1) % CYCLE.length];
  // The Stone Age has no siege weapon. Its announced label must describe real capabilities.
  if (tactic === 'siege' && !units.some(unit => unitRole(unit.id) === 'siege')) tactic = 'mixed';
  const weights = units.map(unit => {
    const role = unitRole(unit.id);
    return WEIGHTS[tactic][role] / units.filter(other => unitRole(other.id) === role).length;
  });
  if (tactic === 'charge' && !units.some(unit => unitRole(unit.id) === 'assault')) {
    const heavy = units.reduce((best, unit) => isFront(unit) && unit.hp > best.hp ? unit : best,
      units.find(isFront)!);
    weights[units.indexOf(heavy)] += WEIGHTS.charge.assault;
  }
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const desired = weights.map(weight => weight / sum * count);
  let best: number[] | undefined, bestScore = Infinity, cost = 0;
  // At most 969 count combinations for the four existing troops, once every 44 seconds.
  for (let a = 0; a <= count; a++) for (let b = 0; b <= count - a; b++) for (let c = 0; c <= count - a - b; c++) {
    const counts = [a, b, c, count - a - b - c];
    if (counts.filter(value => value > 0).length < 3) continue;
    if (counts.reduce((total, value, index) => total + (isFront(units[index]) ? value : 0), 0) < Math.ceil(count * 0.3)) continue;
    const candidateCost = counts.reduce((total, value, index) => total + value * units[index].goldCost, 0);
    if (candidateCost < budget * 0.92 || candidateCost > budget * 1.08) continue;
    const shapeError = counts.reduce((total, value, index) => {
      const role = unitRole(units[index].id);
      const primary = tactic === 'volley' ? role === 'ranged' : tactic === 'siege' ? role === 'siege'
        : tactic === 'charge' ? role === 'assault' || (epoch === 'modern' && units[index].id === 'tank') : false;
      return total + (value - desired[index]) ** 2 * (primary ? 4 : 1);
    }, 0);
    const score = shapeError + Math.abs(candidateCost - budget) / budget * 0.25;
    if (score < bestScore - 1e-9) { bestScore = score; best = counts; cost = candidateCost; }
  }
  if (!best) throw new Error('No fair formation fits the wave budget: ' + epoch + '/' + wave + '/' + difficulty);
  const remaining = [...best], dispatched = units.map(() => 0), unitIds: string[] = [];
  const order: Record<WaveTactic, readonly Role[]> = {
    mixed: ['line', 'ranged', 'assault', 'line', 'siege', 'ranged'],
    charge: ['line', 'assault', 'ranged', 'assault', 'line', 'siege'],
    siege: ['line', 'assault', 'siege', 'line', 'siege', 'ranged'],
    volley: ['line', 'ranged', 'assault', 'ranged', 'line', 'siege'],
  };
  for (let position = 0; position < count; position++) {
    const preferred = order[tactic][position % order[tactic].length];
    let chosen = -1, score = -Infinity;
    for (let index = 0; index < units.length; index++) {
      if (!remaining[index] || (position === 0 && !isFront(units[index]))) continue;
      const nextScore = best[index] * (position + 1) / count - dispatched[index]
        + (unitRole(units[index].id) === preferred ? 0.8 : 0);
      if (nextScore > score) { chosen = index; score = nextScore; }
    }
    if (chosen < 0) throw new Error('Incomplete formation dispatch.');
    unitIds.push(units[chosen].id); remaining[chosen]--; dispatched[chosen]++;
  }
  return Object.freeze({
    number: wave, epoch, tactic, ...describe(tactic, epoch),
    unitIds: Object.freeze(unitIds),
    roster: Object.freeze(units.map((unit, index) => Object.freeze({ id: unit.id, count: best![index] })).filter(entry => entry.count > 0)),
    cost, referenceCost: budget,
  });
}
