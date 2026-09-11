// Difficulty balance matrix: plays complete matches of the real Phaser simulation through the same
// UI events a player uses. Eight player archetypes span novice to expert play; every match draws a
// seeded personality inside its archetype. Matches run on the internal clock (no rendering) against
// a local development server, because the QA bridge window.__AGE_OF_MAX__ only exists there.
//
//   node node_modules/vite/bin/vite.js --config e2e/vite.config.ts   (QA server on 127.0.0.1:5190)
//   node tools/balance-matrix.mjs
//
// Options (environment): QA_BASE_URL, QA_DIFFICULTIES, QA_STRATEGIES, QA_SEEDS, QA_SPEED (1, 2 or 4),
// QA_PARALLEL, QA_MAX_MINUTES, QA_REPORT_GROUP, QA_VARIANTS (JSON file with [{ name, patch }] entries
// that mutate exported configuration objects such as DIFFICULTY before each match).
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5190/';
const list = (name, fallback) => (process.env[name] ?? fallback).split(',').map(value => value.trim()).filter(Boolean);
const difficulties = list('QA_DIFFICULTIES', 'easy,medium,hard');
const strategies = list('QA_STRATEGIES', 'idle,novice,casual,average,rush,expert,turtle,massing');
const seeds = list('QA_SEEDS', '1,2,3,4,5,6,7,8,9,10');
const variants = process.env.QA_VARIANTS ? JSON.parse(await fs.readFile(process.env.QA_VARIANTS, 'utf8')) : [{ name: 'current', patch: null }];
const speed = Number(process.env.QA_SPEED ?? 4);
const parallel = Number(process.env.QA_PARALLEL ?? 4);
const maxMinutes = Number(process.env.QA_MAX_MINUTES ?? 20);
if (![1, 2, 4].includes(speed)) throw new Error('QA_SPEED must be 1, 2 or 4.');
const group = (process.env.QA_REPORT_GROUP ?? 'balance-' + new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)).replace(/[^a-zA-Z0-9_-]/g, '');
const directory = path.join('art/qa', group);
await fs.mkdir(directory, { recursive: true });
const outFile = path.join(directory, `matches-${speed}x.jsonl`);

async function runMatch(opts) {
  const game = window.__AGE_OF_MAX__;
  if (!game) throw new Error('Development bridge missing.');
  const silent = () => {};
  console.log = silent; console.info = silent; console.debug = silent;
  const phaserUrl = performance.getEntriesByType('resource').map(entry => entry.name)
    .find(url => new URL(url).pathname.endsWith('/node_modules/.vite/deps/phaser.js'));
  if (!phaserUrl) throw new Error('Live Phaser module not found.');
  const module = await import(phaserUrl);
  const Phaser = module.default?.__esModule ? module.default.default : module.default;
  const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
  let wall = 0;
  Date.now = () => 1700000000000 + Math.round(wall);
  let gameState = hash('game:' + opts.seed);
  Math.random = () => { gameState = (Math.imul(gameState, 1664525) + 1013904223) >>> 0; return gameState / 4294967296; };
  Phaser.Math.RND.sow(['game:' + opts.seed]);
  let botState = hash('bot:' + opts.seed + ':' + opts.strategy);
  const rand = () => { botState = (Math.imul(botState, 1664525) + 1013904223) >>> 0; return botState / 4294967296; };
  const between = (low, high) => low + (high - low) * rand();
  // Every match draws a personality inside its archetype: 0 = slowest, 1 = sharpest.
  const skill = opts.skill ?? rand();
  const lerp = (worst, best) => worst + (best - worst) * skill;

  // Optional balance variant: mutate exported, plain configuration objects before the battle starts.
  if (opts.patch) {
    for (const [url, changes] of Object.entries(opts.patch)) {
      const target = await import(url);
      for (const [key, value] of Object.entries(changes)) {
        const parts = key.split('.');
        let object = target;
        for (const part of parts.slice(0, -1)) object = object[part];
        const last = parts.at(-1);
        if (Array.isArray(object[last]) && Array.isArray(value)) object[last].splice(0, object[last].length, ...value);
        else if (object[last] && typeof object[last] === 'object' && typeof value === 'object') Object.assign(object[last], value);
        else object[last] = value;
      }
    }
  }

  game.loop.stop();
  game.registry.set('difficulty', opts.difficulty);
  game.scene.stop('MenuScene');
  game.scene.start('UIScene');
  game.scene.start('BattleScene');
  const battle = game.scene.getScene('BattleScene');
  const ui = game.scene.getScene('UIScene');
  if (!battle.playerBase || battle.simulationTime !== 0) throw new Error('Battle did not start fresh.');
  ui.events.emit('setSimulationSpeed', opts.speed);

  const U = battle.unitsDatabase, T = battle.turretsDatabase, E = battle.epochs;
  const role = id => ['ballista', 'cannon', 'grenadier', 'plasma-trooper'].includes(id) ? 'siege'
    : ['dino-rider', 'knight', 'cavalry', 'super-heavy'].includes(id) ? 'assault'
      : ['slinger', 'archer', 'musketeer', 'sniper', 'laser-soldier'].includes(id) ? 'ranged' : 'line';
  const now = () => battle.simulationTime;
  const epochId = () => E[battle.currentEpochIndex].id;
  const roster = () => U.filter(unit => unit.epoch === epochId());
  const towerCatalog = () => T.map((tower, index) => ({ ...tower, index })).filter(tower => tower.epoch === epochId());
  const alive = group => group.getChildren().filter(unit => unit.active);
  const slots = () => battle.turretGrid[0];
  const stats = { purchases: 0, unitGold: 0, byId: {}, blocked: 0, towersBuilt: 0, towerGold: 0, upgrades: 0, sold: 0,
    meteor: 0, artillery: 0, advances: [], capped: 0 };

  const buy = unit => {
    if (!unit || battle.gold < unit.goldCost) return false;
    if (alive(battle.playerUnits).length >= 24) { stats.capped++; return false; }
    const before = battle.unitUidCounter, gold = battle.gold;
    ui.events.emit('spawnUnit', unit.id);
    if (battle.unitUidCounter !== before) {
      stats.purchases++; stats.unitGold += gold - battle.gold; stats.byId[unit.id] = (stats.byId[unit.id] ?? 0) + 1;
      return true;
    }
    stats.blocked++;
    return false;
  };
  const build = (tower, col) => {
    const slot = slots()[col];
    if (!tower || !slot || slot.occupied || battle.gold < tower.goldCost) return false;
    const gold = battle.gold;
    ui.events.emit('selectTurret', tower.index);
    battle.onTurretSlotClick(0, col);
    if (slots()[col].occupied) { stats.towersBuilt++; stats.towerGold += gold - battle.gold; return true; }
    ui.events.emit('selectTurret', -1);
    return false;
  };
  const upgradeCost = slot => {
    const level = slot.level || 1;
    return level === 1 ? Math.round(slot.turretData.goldCost * 0.6) : level === 2 ? Math.round(slot.turretData.goldCost * 0.8) : 0;
  };
  const upgrade = col => {
    const slot = slots()[col];
    if (!slot.occupied) return false;
    const cost = upgradeCost(slot), level = slot.level || 1;
    if (!cost || battle.gold < cost) return false;
    battle.upgradeTurret(slot, 0, col, cost);
    if ((slot.level || 1) > level) { stats.upgrades++; stats.towerGold += cost; return true; }
    return false;
  };
  const refund = slot => {
    const data = slot.turretData, level = slot.level || 1;
    let invested = data.goldCost;
    if (level >= 2) invested += Math.round(data.goldCost * 0.6);
    if (level >= 3) invested += Math.round(data.goldCost * 0.8);
    return Math.round(invested * 0.7);
  };
  const sell = col => {
    const slot = slots()[col];
    if (!slot.occupied) return false;
    battle.sellTurret(slot, 0, col, refund(slot));
    stats.sold++;
    return true;
  };
  const meteor = () => {
    const before = battle.rainingRocksLastUsed;
    ui.events.emit('useRainingRocks');
    if (battle.rainingRocksLastUsed !== before) { stats.meteor++; return true; }
    return false;
  };
  const artillery = () => {
    const before = battle.artilleryStrikeLastUsed;
    ui.events.emit('useArtilleryStrike');
    if (battle.artilleryStrikeLastUsed !== before) { stats.artillery++; return true; }
    return false;
  };
  const meteorReady = () => (ui.cooldowns?.[0] ?? 1) <= 0;
  const artilleryReady = () => battle.currentEpochIndex >= 2 && (ui.cooldowns?.[1] ?? 1) <= 0;
  let readySince = null, advanceDelay = 0;
  const tryAdvance = ([low, high]) => {
    const epoch = E[battle.currentEpochIndex];
    const ready = epoch.xpToNext > 0 && battle.xp >= epoch.xpToNext;
    if (!ready) { readySince = null; return; }
    if (readySince === null) { readySince = now(); advanceDelay = between(low, high) * 1000; }
    if (now() - readySince < advanceDelay) return;
    const index = battle.currentEpochIndex;
    ui.events.emit('advanceEpoch');
    if (battle.currentEpochIndex > index) { stats.advances.push({ t: Math.round(now()), to: battle.currentEpochIndex }); readySince = null; }
  };
  const weighted = weights => {
    const total = weights.reduce((sum, value) => sum + value, 0);
    let pick = rand() * total;
    for (let index = 0; index < weights.length; index++) { pick -= weights[index]; if (pick <= 0) return index; }
    return weights.length - 1;
  };
  const composition = targets => {
    const units = roster();
    const available = Object.keys(targets).filter(key => units.some(unit => role(unit.id) === key));
    const army = alive(battle.playerUnits).filter(unit => unit.getData('epoch') === epochId());
    const counts = Object.fromEntries(available.map(key => [key, army.filter(unit => role(unit.getData('unitId')) === key).length]));
    const total = available.reduce((sum, key) => sum + targets[key], 0);
    const size = army.length + 1;
    let best = available[0], deficit = -Infinity;
    for (const key of available) {
      const value = targets[key] / total * size - counts[key];
      if (value > deficit + 1e-9) { deficit = value; best = key; }
    }
    const options = units.filter(unit => role(unit.id) === best);
    return options[Math.floor(rand() * options.length)];
  };
  const cheapest = () => roster().filter(unit => battle.gold >= unit.goldCost).sort((a, b) => a.goldCost - b.goldCost)[0];
  const densest = (xs, width) => {
    const sorted = [...xs].sort((a, b) => a - b);
    let best = 0;
    for (let start = 0, end = 0; end < sorted.length; end++) {
      while (sorted[end] - sorted[start] > width) start++;
      best = Math.max(best, end - start + 1);
    }
    return best;
  };

  let starve = 0, rushChoice = 0, gathering = false;
  const rushRosters = [
    ['clubman', 'slinger', 'spearman', 'slinger', 'dino-rider'],
    ['swordsman', 'archer', 'knight', 'archer', 'ballista'],
    ['duelist', 'musketeer', 'cavalry', 'duelist', 'cannon'],
    ['tank', 'rifleman', 'grenadier', 'rifleman', 'sniper'],
    ['mech', 'laser-soldier', 'plasma-trooper', 'mech', 'super-heavy'],
  ];
  const policies = {
    idle: { interval: [1e9, 1e9], decide: () => {} },
    // Slow reactions, card-order bias, late advancement, panic abilities, rarely builds.
    novice: { interval: [lerp(5, 3), lerp(6.5, 4.5)], decide: () => {
      tryAdvance([lerp(14, 4), lerp(26, 12)]);
      const enemies = alive(battle.enemyUnits);
      if (meteorReady() && enemies.some(unit => unit.x < 380) && rand() < 0.6) meteor();
      if (artilleryReady() && enemies.filter(unit => unit.x < 520).length >= 3 && rand() < 0.5) artillery();
      const catalog = towerCatalog();
      if (!slots().some(slot => slot.occupied) && now() > 50000 && battle.gold >= catalog[0].goldCost + 60 && rand() < lerp(0.1, 0.3)) build(catalog[0], 0);
      if (rand() < lerp(0.7, 0.95)) {
        const units = roster();
        // A beginner clicks more recruits when gold piles up, still without a plan.
        for (let purchase = 0; purchase < 3; purchase++) {
          const pick = units[weighted([0.4, 0.25, 0.2, 0.15])];
          if (purchase > 0 && battle.gold < pick.goldCost * 2) break;
          if (buy(pick)) continue;
          if (purchase === 0 && rand() < 0.5 && buy(cheapest())) continue;
          break;
        }
      }
    } },
    // Between novice and average: decent but slow, one tower, notices evolution a little late.
    casual: { interval: [lerp(3.2, 2.2), lerp(4.4, 3.2)], decide: () => {
      tryAdvance([lerp(8, 2), lerp(14, 6)]);
      const enemies = alive(battle.enemyUnits);
      if (meteorReady() && (enemies.filter(unit => unit.x < 500).length >= 2 || enemies.filter(unit => unit.x < 750).length >= 5)) meteor();
      if (artilleryReady() && enemies.filter(unit => unit.x < 800).length >= 5) artillery();
      const catalog = towerCatalog(), grid = slots();
      const outdated = grid.findIndex(slot => slot.occupied && slot.turretData.epoch !== epochId());
      if (outdated >= 0 && battle.gold >= catalog[0].goldCost + 200 && rand() < 0.5) { sell(outdated); build(catalog[0], outdated); }
      if (!grid.some(slot => slot.occupied) && alive(battle.playerUnits).length >= 3 && battle.gold >= catalog[0].goldCost + 80) build(catalog[0], 0);
      const targets = { line: 0.45, ranged: 0.3, assault: 0.15, siege: 0.1 };
      const unit = rand() < lerp(0.55, 0.85) ? composition(targets) : roster()[Math.floor(rand() * 4)];
      if (buy(unit)) { if (battle.gold >= unit.goldCost * 3) buy(composition(targets)); }
      else if (rand() < 0.4) buy(cheapest());
    } },
    // Sensible composition, uses towers moderately, reasonable ability timing.
    average: { interval: [lerp(2.4, 1.6), lerp(3.2, 2.4)], decide: () => {
      tryAdvance([lerp(3.5, 0.5), lerp(7, 3)]);
      const enemies = alive(battle.enemyUnits);
      if (meteorReady() && (enemies.filter(unit => unit.x < 720).length >= 4 || enemies.some(unit => unit.x < 420))) meteor();
      if (artilleryReady() && enemies.length >= 5) artillery();
      const catalog = towerCatalog(), grid = slots();
      const outdated = grid.findIndex(slot => slot.occupied && slot.turretData.epoch !== epochId());
      if (outdated >= 0 && battle.gold >= catalog[0].goldCost + 260) { sell(outdated); build(catalog[0], outdated); }
      const built = grid.filter(slot => slot.occupied).length, empty = grid.findIndex(slot => !slot.occupied);
      if (alive(battle.playerUnits).length >= 4 && built < 2 && empty >= 0) {
        const tower = catalog[Math.min(catalog.length - 1, built)];
        if (battle.gold >= tower.goldCost + 120) build(tower, empty);
      }
      const unit = composition({ line: 0.4, ranged: 0.3, assault: 0.2, siege: 0.1 });
      if (buy(unit)) { starve = 0; if (battle.gold >= unit.goldCost * 2.5) buy(composition({ line: 0.4, ranged: 0.3, assault: 0.2, siege: 0.1 })); }
      else if (++starve >= 3) { if (buy(cheapest())) starve = 0; }
    } },
    // The historical QA bot: fixed rotation, spends immediately.
    rush: { interval: [1.5, 1.5], decide: () => {
      tryAdvance([0, 0]);
      const ids = rushRosters[battle.currentEpochIndex];
      const unit = U.find(value => value.id === ids[rushChoice % ids.length]);
      if (battle.gold >= unit.goldCost) { buy(unit); rushChoice++; }
      const enemies = alive(battle.enemyUnits);
      if (enemies.length >= 5 && enemies.some(value => value.x < 650)) meteor();
      if (enemies.length >= 7 && battle.currentEpochIndex >= 2) artillery();
    } },
    // Reads the announced wave, counters it, keeps three current towers, times abilities.
    expert: { interval: [lerp(1.2, 0.8), lerp(1.5, 1.1)], decide: () => {
      tryAdvance([0, lerp(2, 1)]);
      const enemies = alive(battle.enemyUnits);
      const nearBase = enemies.filter(unit => unit.x < 460).length;
      if (meteorReady() && (densest(enemies.map(unit => unit.x), 190) >= 5 || nearBase >= 3)) meteor();
      if (artilleryReady() && (enemies.filter(unit => unit.x >= 380 && unit.x <= 1140).length >= 6 || nearBase >= 4)) artillery();
      const tactic = battle.wavePlan?.tactic ?? 'mixed';
      const targets = tactic === 'charge' ? { line: 0.5, ranged: 0.3, assault: 0.1, siege: 0.1 }
        : tactic === 'volley' ? { line: 0.3, ranged: 0.25, assault: 0.3, siege: 0.15 }
          : tactic === 'siege' ? { line: 0.3, ranged: 0.3, assault: 0.3, siege: 0.1 }
            : { line: 0.35, ranged: 0.35, assault: 0.15, siege: 0.15 };
      const catalog = towerCatalog(), grid = slots(), army = alive(battle.playerUnits).length;
      const outdated = grid.findIndex(slot => slot.occupied && slot.turretData.epoch !== epochId());
      const best = catalog.reduce((top, tower) => tower.damage / tower.attackSpeed / tower.goldCost > top.damage / top.attackSpeed / top.goldCost ? tower : top, catalog[0]);
      if (outdated >= 0 && army >= 6 && battle.gold >= best.goldCost + 150) { sell(outdated); build(best, outdated); }
      const empty = grid.findIndex(slot => !slot.occupied);
      if (army >= 6 && empty >= 0 && battle.gold >= best.goldCost + 100) build(best, empty);
      for (let purchase = 0; purchase < 3; purchase++) { if (!buy(composition(targets))) break; }
      if (army >= 10) {
        const col = grid.findIndex(slot => slot.occupied && slot.turretData.epoch === epochId() && (slot.level || 1) < 3 && battle.gold >= upgradeCost(slot) + 150);
        if (col >= 0) upgrade(col);
      }
    } },
    // Tower-first player: fills and upgrades all three slots before spending surplus on troops.
    turtle: { interval: [lerp(2.3, 1.5), lerp(3.3, 2.5)], decide: () => {
      tryAdvance([lerp(4, 1), lerp(8, 4)]);
      const enemies = alive(battle.enemyUnits);
      if (meteorReady() && (enemies.filter(unit => unit.x < 600).length >= 3)) meteor();
      if (artilleryReady() && enemies.length >= 5) artillery();
      const catalog = towerCatalog(), grid = slots();
      const outdated = grid.findIndex(slot => slot.occupied && slot.turretData.epoch !== epochId());
      if (outdated >= 0 && battle.gold >= catalog[2].goldCost) { sell(outdated); build(catalog[2], outdated); }
      const empty = grid.findIndex(slot => !slot.occupied);
      if (empty >= 0) { if (!build(catalog[Math.min(2, empty)], empty) && battle.gold < catalog[0].goldCost && alive(battle.playerUnits).length < 3) buy(cheapest()); return; }
      const col = grid.findIndex(slot => (slot.level || 1) < 3);
      if (col >= 0 && upgrade(col)) return;
      buy(composition({ line: 0.5, ranged: 0.3, assault: 0.1, siege: 0.1 }));
    } },
  };
  // Tower-first like the turtle, but with the defence complete it saves gold and releases one assault group.
  policies.massing = { interval: [lerp(2.3, 1.5), lerp(3.3, 2.5)], decide: () => {
    tryAdvance([lerp(4, 1), lerp(8, 4)]);
    const enemies = alive(battle.enemyUnits);
    if (meteorReady() && (enemies.filter(unit => unit.x < 600).length >= 3)) meteor();
    if (artilleryReady() && enemies.length >= 5) artillery();
    const catalog = towerCatalog(), grid = slots();
    const outdated = grid.findIndex(slot => slot.occupied && slot.turretData.epoch !== epochId());
    if (outdated >= 0 && battle.gold >= catalog[2].goldCost) { sell(outdated); build(catalog[2], outdated); }
    const empty = grid.findIndex(slot => !slot.occupied);
    if (empty >= 0) { if (!build(catalog[Math.min(2, empty)], empty) && battle.gold < catalog[0].goldCost && alive(battle.playerUnits).length < 3) buy(cheapest()); return; }
    const col = grid.findIndex(slot => (slot.level || 1) < 3);
    if (col >= 0 && upgrade(col)) return;
    const targets = { line: 0.45, ranged: 0.3, assault: 0.15, siege: 0.1 };
    const costs = roster().map(unit => unit.goldCost);
    if (!gathering && battle.gold >= Math.max(...costs) * 6) gathering = true;
    if (gathering) {
      for (let purchase = 0; purchase < 4; purchase++) if (!buy(composition(targets))) break;
      if (battle.gold < Math.min(...costs)) gathering = false;
    }
  } };
  const policy = policies[opts.strategy];
  if (!policy) throw new Error('Unknown strategy ' + opts.strategy);

  const initial = { gold: battle.gold, playerHp: battle.playerBase.hp, enemyHp: battle.enemyBase.hp };
  let minPlayer = 1, minPlayerAt = 0, firstDamageAt = null, damageTaken = 0;
  let lastHp = battle.playerBase.hp, lastMax = battle.playerBase.maxHp, minEnemy = 1, enemyHalfAt = null;
  const epochMin = {};
  const samples = [];
  const sample = () => samples.push({ t: Math.round(now() / 1000), gold: Math.round(battle.gold), xp: Math.round(battle.xp),
    epoch: battle.currentEpochIndex, enemyEpoch: battle.enemyEpochIndex, wave: battle.waveNumber, phase: battle.wavePhase,
    player: Math.round(battle.playerBase.hp), playerMax: battle.playerBase.maxHp, enemy: Math.round(battle.enemyBase.hp), enemyMax: battle.enemyBase.maxHp,
    pArmy: alive(battle.playerUnits).length, eArmy: alive(battle.enemyUnits).length,
    towers: slots().map(slot => slot.occupied ? slot.turretData.id + ':' + (slot.level || 1) : '-').join(',') });
  const observe = () => {
    const base = battle.playerBase, fraction = base.hp / base.maxHp;
    if (fraction < minPlayer) { minPlayer = fraction; minPlayerAt = now(); }
    const key = battle.currentEpochIndex;
    epochMin[key] = Math.min(epochMin[key] ?? 1, fraction);
    if (base.maxHp === lastMax && base.hp < lastHp) { damageTaken += lastHp - base.hp; firstDamageAt ??= now(); }
    lastHp = base.hp; lastMax = base.maxHp;
    const enemyFraction = battle.enemyBase.hp / battle.enemyBase.maxHp;
    minEnemy = Math.min(minEnemy, enemyFraction);
    if (enemyFraction <= 0.5 && enemyHalfAt === null) enemyHalfAt = now();
  };
  const dt = 1000 / 60, limit = opts.maxMinutes * 60000;
  let timestamp = 0, frames = 0, nextDecision = 0, lastSample = 0;
  sample();
  const started = performance.now();
  while (!battle.gameOver && now() < limit) {
    if (now() >= nextDecision) {
      policy.decide();
      nextDecision = now() + between(...policy.interval) * 1000;
    }
    timestamp += dt; wall += dt;
    game.headlessStep(timestamp, dt);
    observe();
    frames++;
    if (now() - lastSample >= 30000) { lastSample = now(); sample(); }
  }
  sample();
  const winner = battle.gameOver ? (battle.enemyBase.hp <= 0 ? 'player' : 'enemy') : null;
  return {
    difficulty: opts.difficulty, strategy: opts.strategy, seed: opts.seed, variant: opts.variant, speed: opts.speed, skill: +skill.toFixed(3),
    winner, seconds: Math.round(now()) / 1000, wallMs: Math.round(performance.now() - started), frames,
    kills: battle.kills, epoch: battle.currentEpochIndex, enemyEpoch: battle.enemyEpochIndex, wave: battle.waveNumber,
    minPlayer: +minPlayer.toFixed(4), minPlayerAt: Math.round(minPlayerAt / 1000), firstDamageAt: firstDamageAt === null ? null : Math.round(firstDamageAt / 1000),
    damageTaken: Math.round(damageTaken), minEnemy: +minEnemy.toFixed(4), enemyHalfAt: enemyHalfAt === null ? null : Math.round(enemyHalfAt / 1000),
    epochMin: Object.fromEntries(Object.entries(epochMin).map(([key, value]) => [key, +value.toFixed(3)])),
    finalPlayer: Math.round(battle.playerBase.hp), finalEnemy: Math.round(battle.enemyBase.hp), initial, stats, samples,
  };
}

const jobs = [];
for (const variant of variants) for (const difficulty of difficulties) for (const strategy of strategies) for (const seed of seeds)
  jobs.push({ variant: variant.name, patch: variant.patch ?? null, difficulty, strategy, seed, speed, maxMinutes });
console.log(`jobs=${jobs.length} parallel=${parallel} speed=${speed} out=${outFile}`);

// Full Chromium (new headless) with GPU access; matches do not render, only the menu before each run does.
const browser = await chromium.launch({ channel: 'chromium',
  args: process.platform === 'win32' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] : [] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const probe = await context.newPage();
const renderer = await probe.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const extension = gl?.getExtension('WEBGL_debug_renderer_info');
  return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null;
});
await probe.close();
console.log('renderer', renderer);
if (!renderer || /swiftshader|software|llvmpipe/i.test(renderer)) console.warn('Warning: software rendering; menus load slowly, results are unaffected.');

const results = [];
const errors = [];
let cursor = 0;
async function worker(id) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({ worker: id, message: error.message }));
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(BASE, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__AGE_OF_MAX__?.scene.isActive('MenuScene'), null, { timeout: 60000 });
        const result = await page.evaluate(runMatch, job);
        results.push(result);
        await fs.appendFile(outFile, JSON.stringify(result) + '\n');
        const verdict = result.winner === 'player' ? 'WIN ' : result.winner === 'enemy' ? 'LOSS' : 'OPEN';
        console.log(`${job.variant} ${job.difficulty.padEnd(6)} ${job.strategy.padEnd(7)} s${String(job.seed).padEnd(3)} ${verdict} ${String(result.seconds).padStart(7)}s ` +
          `ep${result.epoch}/${result.enemyEpoch} kills ${String(result.kills).padStart(3)} minBase ${(result.minPlayer * 100).toFixed(0).padStart(3)}%`);
        break;
      } catch (error) {
        console.log(`retry ${job.difficulty}/${job.strategy}/${job.seed}: ${error.message}`);
        if (attempt === 1) errors.push({ job: `${job.difficulty}/${job.strategy}/${job.seed}`, message: error.message });
      }
    }
  }
  await page.close();
}
await Promise.all(Array.from({ length: Math.min(parallel, jobs.length) }, (_, id) => worker(id)));
await browser.close();

// Cell = wins/matches, median time of the wins (or of the losses), median lowest own base, unresolved matches.
const median = values => { const sorted = values.filter(value => value !== null && value !== undefined).sort((a, b) => a - b); return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null; };
const clock = seconds => seconds === null ? '-' : `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
const table = [];
for (const variant of variants) for (const difficulty of difficulties) {
  table.push(`\n### ${variant.name} · ${difficulty} · ${speed}x\n`, '| Archetype | Siege | Zeit | Tiefste Basis | Offen |', '|---|---:|---:|---:|---:|');
  for (const strategy of strategies) {
    const group = results.filter(result => result.variant === variant.name && result.difficulty === difficulty && result.strategy === strategy);
    if (!group.length) continue;
    const wins = group.filter(result => result.winner === 'player'), open = group.filter(result => result.winner === null).length;
    const time = wins.length ? clock(median(wins.map(result => result.seconds))) : 'N ' + clock(median(group.map(result => result.seconds)));
    table.push(`| ${strategy} | ${wins.length}/${group.length} | ${time} | ${Math.round(median(group.map(result => result.minPlayer)) * 100)} % | ${open} |`);
  }
}
const summary = { createdAt: new Date().toISOString(), base: BASE, speed, maxMinutes, seeds, difficulties, strategies,
  variants: variants.map(variant => variant.name), matches: results.length, errors };
await fs.writeFile(path.join(directory, `summary-${speed}x.json`), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(directory, `summary-${speed}x.md`), table.join('\n').trim() + '\n');
console.log(table.join('\n'));
if (errors.length) { console.log('\nERRORS', JSON.stringify(errors, null, 2)); process.exitCode = 1; }
console.log('\nRESULTS ' + outFile);
