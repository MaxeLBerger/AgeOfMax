export interface Epoch {
  id: string;
  name: string;
  xpToNext: number;
  unlocks: {
    units: string[];
    turrets: string[];
  };
}

export interface UnitType {
  id: string;
  name: string;
  epoch: string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  attackSpeed: number;
  goldCost: number;
  type: 'melee' | 'ranged';
}

export interface TurretType {
  id: string;
  name: string;
  epoch: string;
  hp: number;
  damage: number;
  range: number;
  attackSpeed: number;
  goldCost: number;
  projectileSpeed: number;
}

export interface Projectile {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage: number;
  owner: 'player' | 'enemy';
}

export interface Economy {
  gold: number;
  xp: number;
  goldPerTick: number;
  tickInterval: number;
}

export interface Base {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  side: 'player' | 'enemy';
}