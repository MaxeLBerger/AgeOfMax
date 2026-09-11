import { describe, it, expect, jest } from '@jest/globals';
import { EventEmitter } from 'node:events';

jest.mock('phaser', () => ({
  __esModule: true,
  default: { Scene: class {}, Geom: { Rectangle: class { static Contains(): boolean { return true; } } }, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Math: {
    Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
    Distance: { Between: (x: number, y: number, tx: number, ty: number) => Math.hypot(tx - x, ty - y) },
    Angle: { Between: (x: number, y: number, tx: number, ty: number) => Math.atan2(ty - y, tx - x) },
  } },
}));

import { BattleScene } from '../scenes/BattleScene';
import { DIFFICULTY, FORTRESS_GUN } from '../game/combatRules';
import { planEnemyWave } from '../game/enemyWaves';
import type { UnitType } from '../game/types';
import unitData from '../../data/units.json';

function sprite(id: string, side = 'player') {
  const definition = unitData.find(unit => unit.id === id)!;
  const data: Record<string, any> = { ...definition, unitId: id, side, uid: Math.random(), maxHp: definition.hp,
    attackSpeed: definition.attackSpeed, lastAttackTime: -Infinity, hp: definition.hp, cost: definition.goldCost };
  const value: any = { active: true, x: 600, y: 500, unitData: definition, currentHp: definition.hp, maxHp: definition.hp,
    body: { enable: true, velocity: { x: 0, y: 0 } },
    getData: (key: string) => data[key], setData: (key: any, v: any) => { typeof key === 'string' ? data[key] = v : Object.assign(data, key); return value; },
  };
  for (const key of ['clearTint', 'setTint', 'setScale', 'setDepth', 'setAcceleration', 'setRotation', 'setAlpha', 'setOrigin', 'setFrame', 'setSize', 'setOffset', 'setInteractive', 'setFlipX']) value[key] = () => value;
  value.setPosition = (x: number, y: number) => { value.x = x; value.y = y; return value; };
  value.setTexture = (key: string) => { value.texture = { key }; return value; };
  value.setVelocityX = (x: number) => { value.body.velocity.x = x; return value; };
  value.setVelocity = (x: number, y: number) => { Object.assign(value.body.velocity, { x, y }); return value; };
  value.setActive = (active: boolean) => { value.active = active; return value; };
  value.setVisible = () => value;
  return value;
}

function harness() {
  const battle = new BattleScene() as any;
  const events = new EventEmitter();
  const timerCallbacks: Array<() => void> = [];
  const scheduled: Array<{ at: number; callback: () => void }> = [];
  let clockTime = 0;
  battle.scene = { get: () => ({ events }) };
  battle.time = { timeScale: 1, delayedCall: (delay: number, callback: () => void) => {
    timerCallbacks.push(callback); scheduled.push({ at: clockTime + delay, callback });
  } };
  const advanceClock = (realMilliseconds: number) => {
    const delta = realMilliseconds * battle.time.timeScale;
    clockTime += delta; battle.simulationTime += delta;
    const due = scheduled.filter(timer => timer.at <= clockTime);
    for (const timer of due) { scheduled.splice(scheduled.indexOf(timer), 1); timer.callback(); }
  };
  battle.tweens = { timeScale: 1, killTweensOf: jest.fn() };
  battle.physics = { world: { timeScale: 1 }, pause: jest.fn(), resume: jest.fn(),
    velocityFromRotation: (angle: number, speed: number, velocity: any) => Object.assign(velocity, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }) };
  const group = () => ({ children: { entries: [] as any[] }, countActive: function () { return this.children.entries.filter(unit => unit.active).length; }, killAndHide: jest.fn() });
  battle.playerUnits = group(); battle.enemyUnits = group(); battle.projectiles = group();
  battle.playerBase = { hp: 4200, maxHp: 4200, x: 100, side: 'player' };
  battle.enemyBase = { hp: 4200, maxHp: 4200, x: 1180, side: 'enemy' };
  battle.soundEffects = { playUnitSpawn: jest.fn(), playXPGain: jest.fn(), play: jest.fn(), playCombat: jest.fn(), playGoldCollect: jest.fn(), playEpochAdvance: jest.fn(), stopAll: jest.fn() };
  battle.music = { playBattleMusic: jest.fn(), stop: jest.fn() };
  battle.killStreakManager = { registerKill: () => 0, reset: jest.fn() };
  battle.goldFeedback = { showGoldGain: jest.fn() };
  for (const method of ['createHealthBar', 'updateHealthBar', 'destroyHealthBar', 'showFloatingDamage', 'showDeathEffect', 'showGoldParticles', 'updateBaseHealthBar', 'updateBackground', 'hideTurretGrid', 'closeTurretMenu', 'updateAllHealthBars', 'updateSpecialCooldowns', 'updateTurrets', 'updateFortressGun', 'spawnMuzzleFlash', 'animateRangedAttack', 'updateUnitPresentation']) battle[method] = jest.fn();
  return { battle, events, timerCallbacks, advanceClock };
}

describe('Battle gameplay integration', () => {
  it('does not apply base damage on every frame between attacks', () => {
    const { battle, advanceClock } = harness();
    const clubman = sprite('clubman'); clubman.x = 1090;
    const initialHP = battle.enemyBase.hp;
    battle.attackBase(clubman, 'enemy');
    advanceClock(159);
    expect(battle.enemyBase.hp).toBe(initialHP);
    advanceClock(1);
    const afterFirst = battle.enemyBase.hp;
    expect(afterFirst).toBe(initialHP - clubman.getData('damage'));
    for (let frame = 0; frame < 60; frame++) { advanceClock(16); battle.attackBase(clubman, 'enemy'); }
    expect(battle.enemyBase.hp).toBe(afterFirst);
    advanceClock(80); // Exactly 1200 game milliseconds since the first windup.
    battle.attackBase(clubman, 'enemy');
    advanceClock(159);
    expect(battle.enemyBase.hp).toBe(afterFirst);
    advanceClock(1);
    expect(battle.enemyBase.hp).toBe(afterFirst - clubman.getData('damage'));
  });

  it('launches siege shots at contact but damages the base only when the projectile reaches its wall', () => {
    const { battle, advanceClock } = harness();
    const cannon = sprite('cannon'); cannon.x = 1000;
    const shot = sprite('slinger'); shot.active = false;
    battle.projectiles.get = jest.fn(() => shot);
    battle.attackBase(cannon, 'enemy');
    advanceClock(159);
    expect(battle.projectiles.get).not.toHaveBeenCalled();
    expect(battle.enemyBase.hp).toBe(4200);
    advanceClock(1);
    expect(battle.projectiles.get).toHaveBeenCalledTimes(1);
    expect(shot.active).toBe(true);
    expect(shot.body.velocity.x).toBeGreaterThan(0);
    expect(shot.getData('targetBaseSide')).toBe('enemy');
    expect(shot.getData('damage')).toBe(95);
    expect(shot.getData('baseDamage')).toBe(209);
    expect(battle.enemyBase.hp).toBe(4200);
    // The already launched shell continues even if its cannon dies.
    cannon.active = false;
    shot.setPosition(1110, 448); battle.processManualProjectile(shot);
    expect(battle.enemyBase.hp).toBe(4200);
    shot.setPosition(1135, 448); battle.processManualProjectile(shot);
    expect(battle.enemyBase.hp).toBe(3991);
    expect(shot.active).toBe(false);
    expect(shot.body.enable).toBe(false);
    battle.processManualProjectile(shot);
    expect(battle.enemyBase.hp).toBe(3991);
  });

  it('lets an enemy intercept a siege shot without taking the structure damage multiplier', () => {
    const { battle } = harness();
    const cannon = sprite('cannon'); cannon.x = 1000;
    const shot = sprite('slinger');
    const defender = sprite('tank', 'enemy'); defender.x = 1080;
    battle.enemyUnits.children.entries = [defender]; battle.projectiles.get = () => shot;
    battle.fireBaseProjectile(cannon, 'enemy');
    shot.setPosition(1140, 460); battle.processManualProjectile(shot);
    expect(defender.getData('hp')).toBe(defender.maxHp - 95);
    expect(battle.enemyBase.hp).toBe(4200);
    expect(shot.active).toBe(false);
  });

  it('lets a defender whose body has reached the wall intercept before its centre passes it', () => {
    for (const side of ['player', 'enemy']) {
      const { battle } = harness();
      const targetSide = side === 'player' ? 'enemy' : 'player';
      const cannon = sprite('cannon', side); cannon.x = side === 'player' ? 1000 : 280;
      const shot = sprite('slinger'); battle.projectiles.get = () => shot;
      // Its centre is behind the wall, but its collision surface protrudes in front.
      const defender = sprite('tank', targetSide); defender.x = side === 'player' ? 1119 : 161;
      (side === 'player' ? battle.enemyUnits : battle.playerUnits).children.entries = [defender];
      battle.fireBaseProjectile(cannon, targetSide);
      shot.setPosition(side === 'player' ? 1200 : 80, 460);
      battle.processManualProjectile(shot);
      expect((side === 'player' ? battle.enemyBase : battle.playerBase).hp).toBe(4200);
      expect(defender.getData('hp')).toBe(defender.maxHp - 95);
      expect(shot.active).toBe(false);
    }
  });

  it('stops a fast base shot at the wall before enemies behind it and mirrors enemy shots', () => {
    for (const side of ['player', 'enemy']) {
      const { battle } = harness();
      const targetSide = side === 'player' ? 'enemy' : 'player';
      const cannon = sprite('cannon', side); cannon.x = side === 'player' ? 1000 : 280;
      const shot = sprite('slinger'); battle.projectiles.get = () => shot;
      const hidden = sprite('tank', targetSide); hidden.x = side === 'player' ? 1180 : 100;
      (side === 'player' ? battle.enemyUnits : battle.playerUnits).children.entries = [hidden];
      battle.fireBaseProjectile(cannon, targetSide);
      expect(Math.sign(shot.body.velocity.x)).toBe(side === 'player' ? 1 : -1);
      shot.setPosition(side === 'player' ? 1230 : 50, 448);
      battle.processManualProjectile(shot);
      expect((side === 'player' ? battle.enemyBase : battle.playerBase).hp).toBe(3991);
      expect(hidden.getData('hp')).toBe(hidden.maxHp);
      expect(shot.active).toBe(false);
    }
  });

  it('melee hits ranged troops at the 160ms visual contact and ranged shots share that windup', () => {
    const { battle, advanceClock } = harness();
    const clubman = sprite('clubman');
    const slinger = sprite('slinger', 'enemy');
    battle.fireUnitProjectile = jest.fn();
    battle.handleUnitCollision(clubman, slinger);
    advanceClock(159);
    expect(slinger.getData('hp')).toBe(slinger.maxHp);
    expect(battle.fireUnitProjectile).not.toHaveBeenCalled();
    advanceClock(1);
    expect(slinger.getData('hp')).toBe(slinger.maxHp - clubman.getData('damage'));
    expect(slinger.x).toBe(600);
    expect(battle.fireUnitProjectile).toHaveBeenCalledTimes(1);
    battle.handleUnitCollision(clubman, slinger);
    expect(slinger.getData('hp')).toBe(slinger.maxHp - clubman.getData('damage'));
  });

  it('keeps a pending contact paused and scales the remaining windup with game speed', () => {
    const { battle, advanceClock } = harness();
    const attacker = sprite('clubman'), target = sprite('slinger', 'enemy');
    battle.attackUnit(attacker, target);
    advanceClock(80);
    battle.setPaused(true);
    advanceClock(3000);
    expect(target.getData('hp')).toBe(target.maxHp);
    battle.setSimulationSpeed(4);
    battle.setPaused(false);
    advanceClock(19);
    expect(target.getData('hp')).toBe(target.maxHp);
    advanceClock(1);
    expect(target.getData('hp')).toBe(target.maxHp - attacker.getData('damage'));
  });

  for (const ranged of [false, true]) {
    for (const cancellation of ['dead-attacker', 'reused-attacker', 'dead-target', 'reused-target', 'out-of-range']) {
      it(`cancels a pending ${ranged ? 'ranged' : 'melee'} attack after ${cancellation}`, () => {
        const { battle, advanceClock } = harness();
        const attacker = sprite(ranged ? 'slinger' : 'clubman'), target = sprite('clubman', 'enemy');
        battle.fireUnitProjectile = jest.fn();
        battle.attackUnit(attacker, target);
        if (cancellation === 'dead-attacker') attacker.active = false;
        if (cancellation === 'reused-attacker') attacker.setData('uid', 'new-life');
        if (cancellation === 'dead-target') target.active = false;
        if (cancellation === 'reused-target') target.setData('uid', 'new-life');
        if (cancellation === 'out-of-range') target.x += 600;
        advanceClock(160);
        expect(target.getData('hp')).toBe(target.maxHp);
        expect(battle.fireUnitProjectile).not.toHaveBeenCalled();
        expect(attacker.getData('lastAttackTime')).toBe(0);
      });
    }
  }

  it('cancels base contact if its attacker has been recycled or left base range', () => {
    for (const cancellation of ['recycled', 'left-range', 'dead']) {
      const { battle, advanceClock } = harness();
      const attacker = sprite('clubman'); attacker.x = 1090;
      battle.attackBase(attacker, 'enemy');
      if (cancellation === 'recycled') attacker.setData('uid', 'new-life');
      if (cancellation === 'left-range') attacker.x = 600;
      if (cancellation === 'dead') attacker.active = false;
      advanceClock(160);
      expect(battle.enemyBase.hp).toBe(4200);
    }
  });

  it('keeps ranged troops stopped while their target remains in range', () => {
    const { battle } = harness();
    const archer = sprite('archer'); archer.x = 500;
    const clubman = sprite('clubman', 'enemy'); clubman.x = 700;
    battle.playerUnits.children.entries = [archer]; battle.enemyUnits.children.entries = [clubman];
    battle.fireUnitProjectile = jest.fn();
    battle.update(0, 16);
    expect(archer.body.velocity.x).toBe(0);
    expect(archer.getData('inCombat')).toBe(true);
    expect(clubman.body.velocity.x).toBeLessThan(0);
  });


  it('rejects a blocked exit without charging and immediately uses space freed by a death', () => {
    const { battle, events } = harness();
    const failure = jest.fn(); events.on('commandFailed', failure);
    battle.gold = 500;
    battle.playerUnits.children.entries = [0, 1, 2].map(row => {
      const unit = sprite('clubman'); unit.x = 150 - row * 10; unit.setData('formationRow', row); return unit;
    });
    battle.playerUnits.get = jest.fn();
    battle.spawnUnitByData('player', unitData[0]);
    expect(battle.gold).toBe(500);
    expect(battle.playerUnits.get).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith('Ausgang belegt – kurz warten');
    battle.playerUnits.children.entries[1].active = false;
    expect(battle.findFormationSpawn('player', 'clubman')).toEqual({ x: 140, y: 500, row: 1 });
  });

  it('spaces mixed-size friendly columns on both sides without stopping a freely marching column', () => {
    for (const side of ['player', 'enemy']) {
      const { battle } = harness();
      const direction = side === 'player' ? 1 : -1;
      const tank = sprite('tank', side); tank.x = 640; tank.setData('formationRow', 0);
      const rifle = sprite('rifleman', side); rifle.x = 640 - direction * 10; rifle.setData('formationRow', 0);
      const group = side === 'player' ? battle.playerUnits : battle.enemyUnits;
      group.children.entries = [rifle, tank];
      // Occupy the other two rows so this also exercises same-row correction.
      for (const row of [1, 2]) { const guard = sprite('tank', side); guard.x = rifle.x; guard.setData('formationRow', row); group.children.entries.push(guard); }
      battle.updateRangedUnits(100);
      expect(direction * (tank.x - rifle.x)).toBeGreaterThanOrEqual(36);
      expect(direction * rifle.body.velocity.x).toBeGreaterThan(0);
      expect(direction * rifle.body.velocity.x).toBeLessThanOrEqual(tank.getData('speed'));
      expect(rifle.y).toBe(493);
      expect(rifle.body.velocity.y).toBe(0);
    }
  });

  it('keeps 24 mixed troops separated across many movement frames at normal and accelerated steps', () => {
    for (const step of [1000 / 60, 4000 / 60]) {
      const { battle } = harness();
      battle.attackBase = jest.fn();
      const troops = Array.from({ length: 24 }, (_, index) => {
        const troop = sprite(index % 2 ? 'clubman' : 'dino-rider');
        const row = index % 3; troop.setData('formationRow', row); troop.setData('uid', index + 1);
        troop.x = 480 - Math.floor(index / 3) * 42 - row * 10;
        return troop;
      });
      battle.playerUnits.children.entries = troops;
      for (let frame = 0; frame < 600; frame++) {
        battle.updateRangedUnits(step);
        for (const troop of troops) troop.x += troop.body.velocity.x * step / 1000;
        for (const row of [0, 1, 2]) {
          const line = troops.filter(troop => troop.getData('formationRow') === row).sort((a, b) => b.x - a.x);
          for (let index = 1; index < line.length; index++) {
            const gap = line[index - 1].getData('unitId') === 'dino-rider' || line[index].getData('unitId') === 'dino-rider' ? 36 : 24;
            expect(line[index - 1].x - line[index].x).toBeGreaterThanOrEqual(gap - 0.000001);
          }
        }
      }
      expect(Math.max(...troops.map(troop => troop.x))).toBeGreaterThan(800);
    }
  });

  it('lets faster melee use an open row beside stationary ranged support', () => {
    const { battle } = harness();
    const slinger = sprite('slinger'); slinger.x = 550; slinger.setData('formationRow', 0);
    const warrior = sprite('clubman'); warrior.x = 522; warrior.setData('formationRow', 0);
    const enemy = sprite('clubman', 'enemy'); enemy.x = 700; enemy.setData('formationRow', 1);
    battle.playerUnits.children.entries = [slinger, warrior]; battle.enemyUnits.children.entries = [enemy];
    battle.updateRangedUnits(16);
    expect(slinger.body.velocity.x).toBe(0);
    expect(warrior.getData('formationRow')).not.toBe(0);
    expect(warrior.body.velocity.x).toBe(40);
    enemy.active = false;
    battle.updateRangedUnits(16);
    expect(slinger.body.velocity.x).toBe(36);
  });

  it('reinitializes a recycled spearman as the purchased slinger without stale identity or cooldowns', () => {
    const { battle } = harness();
    const recycled = sprite('spearman', 'enemy'); recycled.active = false;
    recycled.setData({ uid: 900, formationRow: 2, formationBlocked: true, xpAwarded: true, attackUntil: 99999 });
    battle.playerUnits.children.entries = [recycled]; battle.playerUnits.get = () => recycled;
    battle.gold = 500;
    const slinger = unitData.find(unit => unit.id === 'slinger')!;
    battle.spawnUnitByData('player', slinger);
    expect(battle.gold).toBe(435);
    expect(recycled.texture.key).toBe('slinger');
    expect(recycled.unitData).toBe(slinger);
    expect(recycled.getData('unitId')).toBe('slinger');
    expect(recycled.getData('type')).toBe('ranged');
    expect(recycled.getData('side')).toBe('player');
    expect(recycled.getData('uid')).not.toBe(900);
    expect(recycled.getData('formationRow')).toBe(0);
    expect(recycled.getData('formationBlocked')).toBe(false);
    expect(recycled.getData('hp')).toBe(slinger.hp);
    expect(recycled.getData('lastAttackTime')).toBe(-Infinity);
    expect(recycled.getData('xpAwarded')).toBe(false);
    expect(recycled.getData('attackUntil')).toBe(0);
    expect(recycled.body.velocity.x).toBe(slinger.speed);
  });

  it('awards a kill once and keeps visible health synchronized for abilities and projectiles', () => {
    const { battle } = harness();
    const enemy = sprite('clubman', 'enemy');
    battle.damageUnit(enemy, 20, 'player');
    expect(enemy.currentHp).toBe(enemy.getData('hp'));
    battle.damageUnit(enemy, 10000, 'player');
    const gold = battle.gold;
    const xp = battle.xp;
    battle.damageUnit(enemy, 10000, 'player');
    expect(battle.gold).toBe(gold);
    expect(battle.xp).toBe(xp);
    expect(battle.kills).toBe(1);
    expect(enemy.currentHp).toBe(0);
    expect(enemy.body.enable).toBe(false);
  });

  it('shares game time between income, cooldowns and wave progression and freezes them on pause', () => {
    const { battle } = harness();
    battle.setSimulationSpeed(4);
    const initialGold = battle.gold;
    for (let i = 0; i < 10; i++) battle.update(0, 25);
    expect(battle.simulationTime).toBe(1000);
    expect(battle.gold).toBe(initialGold + 8);
    expect(battle.physics.world.timeScale).toBe(0.25);
    battle.setPaused(true);
    for (let i = 0; i < 10; i++) battle.update(0, 25);
    expect(battle.simulationTime).toBe(1000);
    expect(battle.gold).toBe(initialGold + 8);
    battle.setPaused(false);
    expect(battle.time.timeScale).toBe(4);
  });

  it('uses the full Phaser frame delta for game time and income at low frame rates', () => {
    const { battle } = harness();
    battle.setSimulationSpeed(4);
    const before = battle.gold;
    for (let frame = 0; frame < 8; frame++) battle.update((frame + 1) * 125, 125);
    // Clock and Arcade World each consume 8 * 125 * 4 = 4000 game milliseconds.
    expect(battle.simulationTime).toBe(4000);
    expect(battle.gold).toBe(before + 4 * 8);
    battle.update(1000, -10);
    expect(battle.simulationTime).toBe(4000);
    expect(battle.gold).toBe(before + 4 * 8);
  });

  it('resolves a base crossing before recycling a fast projectile beyond the screen', () => {
    for (const side of ['player', 'enemy']) {
      const { battle } = harness();
      const targetSide = side === 'player' ? 'enemy' : 'player';
      const shooter = sprite('laser-soldier', side); shooter.x = side === 'player' ? 970 : 310;
      const shot = sprite('slinger'); battle.projectiles.get = () => shot;
      battle.projectiles.children.entries = [shot];
      battle.fireBaseProjectile(shooter, targetSide);
      shot.setPosition(side === 'player' ? 1386 : -106, 448);
      battle.update(125, 125);
      expect((side === 'player' ? battle.enemyBase : battle.playerBase).hp).toBe(4110);
      expect(shot.active).toBe(false);
      expect(shot.body.enable).toBe(false);
      battle.update(250, 125);
      expect((side === 'player' ? battle.enemyBase : battle.playerBase).hp).toBe(4110);
    }
  });

  it('requires a deliberate advancement, retains overflow XP and changes only the player base', () => {
    const { battle, events } = harness();
    const ready = jest.fn(); events.on('updateEpochReady', ready);
    battle.addXP(2000);
    battle.addXP(350);
    expect(battle.currentEpochIndex).toBe(0);
    expect(ready).toHaveBeenCalledWith(true);
    battle.advanceEpoch();
    expect(battle.currentEpochIndex).toBe(1);
    expect(battle.xp).toBe(150);
    expect(battle.playerBase.maxHp).toBe(5600);
    expect(battle.enemyBase.maxHp).toBe(4200);
  });

  it('removes only its own UI subscriptions during restart, preserving UI listeners', () => {
    const { battle, events } = harness();
    const listener = jest.fn(); events.on('spawnUnit', listener);
    battle.listenToUIEvents();
    expect(events.listenerCount('spawnUnit')).toBe(2);
    battle.shutdownBattle();
    expect(events.listenerCount('spawnUnit')).toBe(1);
    battle.listenToUIEvents();
    expect(events.listenerCount('spawnUnit')).toBe(2);
  });

  it('does not charge gold when the army is full and rejects locked epoch units', () => {
    const { battle } = harness();
    battle.playerUnits.children.entries = Array.from({ length: 24 }, () => sprite('clubman'));
    const gold = battle.gold;
    battle.spawnUnitByData('player', unitData[0]);
    expect(battle.gold).toBe(gold);
    battle.playerUnits.children.entries = [];
    battle.spawnUnitByData('player', unitData.find(unit => unit.id === 'mech'));
    expect(battle.gold).toBe(gold);
  });

  it('emits exactly one win result even if several lethal base attacks share a frame', () => {
    const { battle, events } = harness();
    const result = jest.fn(); events.on('gameOver', result);
    battle.damageBase('enemy', 5000);
    battle.damageBase('enemy', 5000);
    expect(result).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ winner: 'player' }));
  });

  it('stops enemy recruitment during respite and begins the following wave on game time', () => {
    const { battle } = harness();
    battle.spawnUnitByData = jest.fn();
    battle.simulationTime = 12000;
    battle.updateWaves();
    expect(battle.wavePhase).toBe('assault');
    expect(battle.waveNumber).toBe(1);
    expect(battle.spawnUnitByData).toHaveBeenCalledTimes(1);
    battle.simulationTime = 40000;
    battle.updateWaves();
    expect(battle.wavePhase).toBe('respite');
    battle.simulationTime = 55999;
    battle.updateWaves();
    expect(battle.spawnUnitByData).toHaveBeenCalledTimes(1);
    battle.simulationTime = 56000;
    battle.updateWaves();
    expect(battle.wavePhase).toBe('assault');
    expect(battle.waveNumber).toBe(2);
    expect(battle.spawnUnitByData).toHaveBeenCalledTimes(2);
  });

  it('updates an open upgrade menu as income arrives or gold is spent, then removes its listener', () => {
    const { battle, events } = harness();
    const display = (x = 0, y = 0, text = ''): any => {
      const object: any = new EventEmitter();
      Object.assign(object, { x, y, text, list: [], active: true });
      for (const method of ['setDepth', 'setOrigin', 'setStrokeStyle', 'setFillStyle', 'setColor']) object[method] = () => object;
      object.setInteractive = () => { object.input = { enabled: true }; return object; };
      object.disableInteractive = () => { if (object.input) object.input.enabled = false; return object; };
      object.setText = (text: string) => { object.text = text; return object; };
      object.add = (children: any) => { object.list.push(...(Array.isArray(children) ? children : [children])); return object; };
      object.destroy = () => { object.active = false; object.emit('destroy'); };
      return object;
    };
    battle.add = { container: (x: number, y: number) => display(x, y), rectangle: (x: number, y: number) => display(x, y), text: display };
    battle.updateGridVisuals = jest.fn(); battle.showFloatingFeedback = jest.fn();
    battle.closeTurretMenu = (BattleScene.prototype as any).closeTurretMenu.bind(battle);
    const slot = { x: 235, y: 521, occupied: true, level: 1,
      turretData: { id: 'wooden-spike', name: 'Palisade', damage: 16, range: 145, attackSpeed: 1.6, goldCost: 100 } };
    battle.gold = 50;
    battle.showTurretMenu(slot, 0, 2);
    const menu = battle.turretMenuContainer;
    const upgrade = menu.list.find((child: any) => child.x === -60 && child.text === '');
    expect(upgrade.input?.enabled ?? false).toBe(false);
    expect(events.listenerCount('updateGold')).toBe(1);
    battle.addGold(16);
    expect(upgrade.input.enabled).toBe(true);
    battle.addGold(-10);
    expect(upgrade.input.enabled).toBe(false);
    battle.addGold(10);
    upgrade.emit('pointerdown');
    expect(slot.level).toBe(2);
    expect(battle.gold).toBe(6);
    expect(menu.active).toBe(false);
    expect(events.listenerCount('updateGold')).toBe(0);
  });

  it('sends an epoch identifier that the German HUD can translate', () => {
    const { battle, events } = harness();
    const updates: any[] = []; events.on('updateWave', update => updates.push(update));
    for (const [index, id] of ['stone', 'castle', 'renaissance', 'modern', 'future'].entries()) {
      battle.enemyEpochIndex = index; battle.emitBattleStatus();
      expect(updates.at(-1).enemyEpoch).toBe(id);
    }
  });

  it('deals spike-turret damage directly instead of leaking stationary projectiles', () => {
    const { battle } = harness();
    const enemy = sprite('clubman', 'enemy');
    const slot = { turretData: { id: 'wooden-spike', damage: 16, projectileSpeed: 0 }, level: 1 };
    battle.launchProjectile = jest.fn();
    battle.fireTurretProjectile(slot, enemy);
    expect(enemy.getData('hp')).toBe(enemy.maxHp - 16);
    expect(battle.launchProjectile).not.toHaveBeenCalled();
  });

  it('lets the enemy fortress gun hit the closest attacker in range on its own clock, and stay silent when disabled', () => {
    const { battle } = harness();
    battle.updateFortressGun = (BattleScene.prototype as any).updateFortressGun.bind(battle);
    const shots: any[] = [];
    battle.projectiles.get = jest.fn(() => { const shot = sprite('slinger'); shots.push(shot); return shot; });
    const near = sprite('clubman'); near.x = 1180 - 150;
    const far = sprite('spearman'); far.x = 1180 - FORTRESS_GUN.range - 1;
    battle.playerUnits.children.entries = [far, near];
    battle.enemyEpochIndex = 1;
    const previous = DIFFICULTY.medium.enemyGun;
    try {
      DIFFICULTY.medium.enemyGun = 0;
      battle.simulationTime = 10000;
      battle.updateFortressGun();
      expect(shots).toHaveLength(0);
      DIFFICULTY.medium.enemyGun = 1.5;
      battle.updateFortressGun();
      expect(shots).toHaveLength(1);
      expect(shots[0].getData('owner')).toBe('enemy');
      expect(shots[0].getData('damage')).toBe(Math.round(FORTRESS_GUN.damage[1] * 1.5));
      expect(shots[0].getData('splash')).toBe(FORTRESS_GUN.splash);
      expect(shots[0].texture.key).toBe('arrow');
      expect(shots[0].body.velocity.x).toBeLessThan(0);
      battle.simulationTime += FORTRESS_GUN.intervalMs - 1;
      battle.updateFortressGun();
      expect(shots).toHaveLength(1);
      // The remaining troop stands one pixel beyond the gun's reach.
      battle.simulationTime += 1;
      near.active = false;
      battle.updateFortressGun();
      expect(shots).toHaveLength(1);
      // A fortress below a quarter of its hit points falls silent; at exactly a quarter it still fires.
      near.active = true;
      battle.simulationTime += FORTRESS_GUN.intervalMs;
      battle.enemyBase.hp = battle.enemyBase.maxHp * FORTRESS_GUN.silentBelow - 1;
      battle.updateFortressGun();
      expect(shots).toHaveLength(1);
      battle.enemyBase.hp = battle.enemyBase.maxHp * FORTRESS_GUN.silentBelow;
      battle.updateFortressGun();
      expect(shots).toHaveLength(2);
    } finally {
      DIFFICULTY.medium.enemyGun = previous;
    }
  });

  it('strengthens every further wave of the final enemy epoch and announces that strength in advance', () => {
    const { battle, events } = harness();
    const updates: any[] = []; events.on('updateWave', update => updates.push(update));
    battle.spawnUnitByData = jest.fn();
    battle.makeWavePlan = (number: number) => planEnemyWave(number, 'medium', 'future', unitData as UnitType[]);
    battle.wavePlan = battle.makeWavePlan(1);
    const surge = DIFFICULTY.medium.lateSurge;
    battle.simulationTime = 12000; battle.updateWaves();
    expect(battle.waveSurge).toBe(1);
    expect(updates.at(-1).surge).toBe(1);
    battle.simulationTime = 40000; battle.updateWaves();
    expect(battle.wavePhase).toBe('respite');
    expect(updates.at(-1).surge).toBeCloseTo(1 + surge);
    battle.simulationTime = 56000; battle.updateWaves();
    expect(battle.waveSurge).toBeCloseTo(1 + surge);
    expect(updates.at(-1).surge).toBeCloseTo(1 + surge);
  });

  it('applies the difficulty and wave strength to the hit points and damage of arriving enemies', () => {
    const { battle } = harness();
    const recycled = sprite('clubman', 'enemy'); recycled.active = false;
    battle.enemyUnits.children.entries = [recycled]; battle.enemyUnits.get = () => recycled;
    battle.waveSurge = 1.5;
    const clubman = unitData.find(unit => unit.id === 'clubman')!;
    expect(battle.spawnUnitByData('enemy', clubman)).toBe(true);
    const stats = DIFFICULTY.medium.enemyStats * 1.5;
    expect(recycled.getData('hp')).toBe(Math.round(clubman.hp * stats));
    expect(recycled.getData('damage')).toBe(Math.round(clubman.damage * stats));
  });

  it('uses distinct laser and plasma shots for future towers', () => {
    const { battle } = harness();
    expect(battle.getProjectileTexture({ id: 'laser-turret' })).toBe('laser');
    expect(battle.getProjectileTexture({ id: 'rail-gun' })).toBe('laser');
    expect(battle.getProjectileTexture({ id: 'ion-cannon' })).toBe('plasma');
    expect(battle.getProjectileScale('laser')).toBe(0.38);
    expect(battle.getProjectileScale('plasma')).toBe(0.42);
  });

  it('fully reinitializes recycled projectiles including owner, damage, flight flags and hit history', () => {
    const { battle } = harness();
    const shot = sprite('slinger');
    shot.setData({ consumed: true, hitUids: new Set([1]), manualCollision: false, owner: 'enemy', splash: 100, pierce: 10, targetBaseSide: 'player', baseDamage: 900 });
    battle.projectiles.get = () => shot;
    const enemy = sprite('clubman', 'enemy');
    battle.launchProjectile(100, 480, enemy, 'arrow', 'player', 25, 500);
    expect(shot.getData('owner')).toBe('player');
    expect(shot.getData('damage')).toBe(25);
    expect(shot.getData('targetBaseSide')).toBeNull();
    expect(shot.getData('baseDamage')).toBe(0);
    expect(shot.getData('hitUids').size).toBe(0);
    expect(shot.getData('splash')).toBe(0);
    expect(shot.getData('pierce')).toBe(0);
    expect(shot.getData('manualCollision')).toBe(true);
    expect(shot.getData('consumed')).toBe(false);
    expect(shot.body.enable).toBe(true);
    expect(shot.body.velocity.x).toBeGreaterThan(0);
  });
});
