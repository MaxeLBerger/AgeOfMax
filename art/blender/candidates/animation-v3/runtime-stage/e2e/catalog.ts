import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Epoch, TurretType, UnitType } from '../src/game/types';

export const units: UnitType[] = JSON.parse(readFileSync(resolve('data/units.json'), 'utf8'));
export const epochs: Epoch[] = JSON.parse(readFileSync(resolve('data/epochs.json'), 'utf8'));
export const turrets: TurretType[] = JSON.parse(readFileSync(resolve('data/turrets.json'), 'utf8'));
