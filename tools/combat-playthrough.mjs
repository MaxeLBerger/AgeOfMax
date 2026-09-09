import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.QA_BROWSER_PATH || (existsSync(installedChrome) ? installedChrome : undefined);
const options = {
  difficulty: process.env.QA_DIFFICULTY ?? 'medium',
  mode: process.env.QA_MODE ?? 'mixed',
  speed: Number(process.env.QA_SPEED ?? 1),
  abilities: process.env.QA_ABILITIES !== '0',
  seed: process.env.QA_SEED ?? null,
};
if (!['easy', 'medium', 'hard'].includes(options.difficulty) || !['mixed', 'line', 'idle'].includes(options.mode)
  || ![1, 2, 4].includes(options.speed)) throw new Error('Invalid QA difficulty, strategy or speed.');

const fingerprintFiles = [
  'src/scenes/BattleScene.ts', 'src/game/combatRules.ts', 'src/game/enemyWaves.ts', 'src/game/BattleEffects.ts',
  'src/utils/KillStreakManager.ts', 'data/units.json', 'data/turrets.json', 'data/epochs.json',
  'public/assets/reborn/weapon-sockets.json', 'tools/combat-playthrough.mjs',
];
const sourceHashes = Object.fromEntries(await Promise.all(fingerprintFiles.map(async file =>
  [file, createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const sourceFingerprint = createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');
const runId = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
const group = (process.env.QA_REPORT_GROUP ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
const seedLabel = options.seed === null ? '' : '-seed-' + options.seed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
const name = 'combat-' + options.difficulty + '-' + options.mode + '-' + options.speed + 'x'
  + (options.abilities ? '' : '-noabilities') + seedLabel + '-' + runId;
const directory = path.join('art/qa', group);
await fs.mkdir(directory, { recursive: true });
const artifacts = { json: path.join(directory, name + '.json'), screenshot: path.join(directory, name + '.png') };

const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/assets/') && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
  });
  await page.goto(process.env.QA_BASE_URL ?? 'http://127.0.0.1:5190');
  await page.waitForFunction(() => window.__AGE_OF_MAX__?.scene.isActive('MenuScene'), { timeout: 40000 });
  const result = await page.evaluate(async options => {
    const game = window.__AGE_OF_MAX__;
    const phaserUrl = performance.getEntriesByType('resource').map(entry => entry.name)
      .find(url => new URL(url).pathname.endsWith('/node_modules/.vite/deps/phaser.js'));
    if (!phaserUrl) throw new Error('The live Phaser module was not found; do not seed a second module instance.');
    const module = await import(phaserUrl);
    const Phaser = module.default?.__esModule ? module.default.default : module.default;
    if (!Phaser?.Math?.RND?.sow) throw new Error('The live Phaser random generator is unavailable.');

    let virtualWallElapsed = 0;
    if (options.seed !== null) Date.now = () => 1700000000000 + Math.round(virtualWallElapsed);
    let randomState = 0, randomCalls = 0;
    if (options.seed !== null) {
      randomState = 2166136261;
      for (const character of options.seed) randomState = Math.imul(randomState ^ character.charCodeAt(0), 16777619) >>> 0;
      Math.random = () => {
        randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
        randomCalls++;
        return randomState / 4294967296;
      };
      Phaser.Math.RND.sow([options.seed]);
    }
    const rngBeforeCreate = { mathState: randomState, mathCalls: randomCalls, phaserState: Phaser.Math.RND.state() };

    // Stop while still in the menu. Scene creation and the entire simulation run in
    // this same JavaScript job, so no real battle frame can occur between them.
    game.loop.stop();
    game.registry.set('difficulty', options.difficulty);
    game.scene.stop('MenuScene');
    game.scene.start('UIScene');
    game.scene.start('BattleScene');
    const battle = game.scene.getScene('BattleScene');
    if (!battle.playerBase || battle.simulationTime !== 0) throw new Error('A seeded run must begin directly after create(), at simulation time zero.');
    const ui = game.scene.getScene('UIScene');
    ui.events.emit('setSimulationSpeed', options.speed);
    const startSimulationTime = battle.simulationTime;
    const initial = {
      simulationTime: startSimulationTime, gold: battle.gold, xp: battle.xp, kills: battle.kills,
      epoch: battle.currentEpochIndex, enemyEpoch: battle.enemyEpochIndex, wave: battle.waveNumber,
      phase: battle.wavePhase, phaseEndsAt: battle.phaseEndsAt, speed: battle.simulationSpeed,
      playerBase: { ...battle.playerBase }, enemyBase: { ...battle.enemyBase },
      playerArmy: battle.playerUnits.countActive(true), enemyArmy: battle.enemyUnits.countActive(true),
      incomeAccumulator: battle.incomeAccumulator, wavePlan: battle.wavePlan ?? null,
      rng: { mathState: randomState, mathCalls: randomCalls, phaserState: Phaser.Math.RND.state() },
    };
    const expectedGold = { easy: 360, medium: 240, hard: 200 }[options.difficulty];
    if (initial.gold !== expectedGold || initial.xp !== 0 || initial.kills !== 0 || initial.playerArmy || initial.enemyArmy
      || initial.incomeAccumulator !== 0 || initial.phaseEndsAt !== 12000) throw new Error('The initial snapshot is not a fresh, unmodified battle.');

    let timestamp = options.seed === null ? game.loop.now : 0;
    const dt = 1000 / 60, maximumDurationMs = 16 * 60 * 1000;
    let lastDecision = -4000, lastSample = -30000, choice = 0, built = false, frames = 0;
    let meteorCasts = 0, artilleryCasts = 0, blockedOrders = 0, unaffordableDecisions = 0;
    const purchases = [], towerAttempts = [], abilityUses = [], samples = [];
    const wavePlans = [], waveAttempts = [], observedEnemySpawns = [];
    const observedEnemyUids = new Set();
    let lastPlan, observedWave = 0, observedAttempted = 0, observedArrived = 0;
    const epochs = [{ t: 0, side: 'player', index: 0, id: 'stone' }, { t: 0, side: 'enemy', index: 0, id: 'stone' }];
    const byEpoch = { player: {}, enemy: {} };
    const minimumBase = {
      player: { fraction: 1, hp: battle.playerBase.hp, maxHp: battle.playerBase.maxHp, t: 0, epoch: 0 },
      enemy: { fraction: 1, hp: battle.enemyBase.hp, maxHp: battle.enemyBase.maxHp, t: 0, epoch: 0 },
    };
    const rosters = [
      ['clubman', 'slinger', 'spearman', 'slinger', 'dino-rider'],
      ['swordsman', 'archer', 'knight', 'archer', 'ballista'],
      ['duelist', 'musketeer', 'cavalry', 'duelist', 'cannon'],
      ['tank', 'rifleman', 'grenadier', 'rifleman', 'sniper'],
      ['mech', 'laser-soldier', 'plasma-trooper', 'mech', 'super-heavy'],
    ];
    let lastPlayerEpoch = 0, lastEnemyEpoch = 0;
    const relativeTime = () => battle.simulationTime - startSimulationTime;
    const observe = () => {
      const t = relativeTime();
      // Passive reporting only: no event, RNG, clock or decision is changed.
      const plan = battle.wavePlan;
      if (plan && plan !== lastPlan) {
        wavePlans.push({ announcedAt: t, phase: battle.wavePhase, attackAt: battle.phaseEndsAt,
          ...JSON.parse(JSON.stringify(plan)) });
        lastPlan = plan;
      }
      if (battle.wavePhase === 'assault' && plan) {
        if (observedWave !== battle.waveNumber) {
          observedWave = battle.waveNumber; observedAttempted = 0; observedArrived = 0;
        }
        const attemptedDelta = battle.waveSpawned - observedAttempted;
        const arrivedDelta = battle.waveArrived - observedArrived;
        if (attemptedDelta > 0) waveAttempts.push({ t, wave: battle.waveNumber, epoch: plan.epoch,
          firstIndex: observedAttempted, plannedIds: plan.unitIds.slice(observedAttempted, battle.waveSpawned),
          attemptedDelta, arrivedDelta, attempted: battle.waveSpawned, arrived: battle.waveArrived });
        observedAttempted = battle.waveSpawned; observedArrived = battle.waveArrived;
      }
      for (const unit of battle.enemyUnits.getChildren()) if (unit.active && !observedEnemyUids.has(unit.getData('uid'))) {
        observedEnemyUids.add(unit.getData('uid'));
        observedEnemySpawns.push({ t, wave: battle.waveNumber, uid: unit.getData('uid'), id: unit.getData('unitId'),
          epoch: unit.getData('epoch'), spawnedAt: unit.getData('spawnTimestamp'), goldCost: unit.getData('cost'),
          maxHp: unit.getData('maxHp'), damage: unit.getData('damage') });
      }
      for (const side of ['player', 'enemy']) {
        const base = side === 'player' ? battle.playerBase : battle.enemyBase;
        const epoch = side === 'player' ? battle.currentEpochIndex : battle.enemyEpochIndex;
        const fraction = base.hp / base.maxHp;
        const item = { fraction, hp: base.hp, maxHp: base.maxHp, t, epoch };
        if (fraction < minimumBase[side].fraction) minimumBase[side] = item;
        if (!byEpoch[side][epoch] || fraction < byEpoch[side][epoch].fraction) byEpoch[side][epoch] = item;
      }
      if (battle.currentEpochIndex !== lastPlayerEpoch) {
        lastPlayerEpoch = battle.currentEpochIndex;
        epochs.push({ t, side: 'player', index: lastPlayerEpoch, id: battle.epochs[lastPlayerEpoch].id });
      }
      if (battle.enemyEpochIndex !== lastEnemyEpoch) {
        lastEnemyEpoch = battle.enemyEpochIndex;
        epochs.push({ t, side: 'enemy', index: lastEnemyEpoch, id: battle.epochs[lastEnemyEpoch].id });
      }
    };
    const sample = () => ({
      t: Math.round(relativeTime() / 1000), absoluteTimeMs: battle.simulationTime,
      gold: battle.gold, xp: battle.xp, kills: battle.kills, epoch: battle.currentEpochIndex,
      enemyEpoch: battle.enemyEpochIndex, wave: battle.waveNumber, phase: battle.wavePhase,
      plannedWave: battle.wavePlan?.number ?? null, tactic: battle.wavePlan?.tactic ?? null,
      attempted: battle.waveSpawned, arrived: battle.waveArrived, player: Math.round(battle.playerBase.hp),
      enemy: Math.round(battle.enemyBase.hp), pArmy: battle.playerUnits.countActive(true), eArmy: battle.enemyUnits.countActive(true),
      shots: battle.projectiles.countActive(true),
      pFront: Math.round(Math.max(0, ...battle.playerUnits.children.entries.filter(unit => unit.active).map(unit => unit.x))),
      objects: battle.children.list.length,
    });
    observe();
    samples.push(sample());
    lastSample = 0;

    for (; relativeTime() < maximumDurationMs && frames < 60 * 60 * 16 && !battle.gameOver; frames++) {
      if (options.mode !== 'idle' && relativeTime() - lastDecision >= 1500) {
        lastDecision = relativeTime();
        ui.events.emit('advanceEpoch');
        const ids = rosters[battle.currentEpochIndex];
        const id = options.mode === 'line' ? ids[0] : ids[choice % ids.length];
        const definition = battle.unitsDatabase.find(unit => unit.id === id);
        if (battle.gold >= definition.goldCost) {
          const beforeUid = battle.unitUidCounter, beforeGold = battle.gold;
          ui.events.emit('spawnUnit', id);
          if (battle.unitUidCounter !== beforeUid) {
            const paid = beforeGold - battle.gold;
            if (paid !== definition.goldCost) throw new Error('A successful recruitment did not pay its normal price.');
            purchases.push({ t: relativeTime(), id, epoch: battle.currentEpochIndex, paid, goldBefore: beforeGold, goldAfter: battle.gold });
          } else blockedOrders++;
          choice++;
        } else unaffordableDecisions++;
        const enemies = battle.enemyUnits.children.entries.filter(unit => unit.active);
        if (options.abilities && enemies.length >= 5 && enemies.some(unit => unit.x < 650)) {
          const before = battle.rainingRocksLastUsed;
          ui.events.emit('useRainingRocks');
          if (battle.rainingRocksLastUsed !== before) {
            meteorCasts++;
            abilityUses.push({ t: relativeTime(), type: 'meteor', enemies: enemies.length });
          }
        }
        if (options.abilities && enemies.length >= 7 && battle.currentEpochIndex >= 2) {
          const before = battle.artilleryStrikeLastUsed;
          ui.events.emit('useArtilleryStrike');
          if (battle.artilleryStrikeLastUsed !== before) {
            artilleryCasts++;
            abilityUses.push({ t: relativeTime(), type: 'artillery', enemies: enemies.length });
          }
        }
        // Preserve the original bot's single defensive-building policy.
        if (!built && battle.gold >= 200) {
          const before = battle.gold;
          ui.events.emit('selectTurret', 0);
          battle.onTurretSlotClick(0, 0);
          towerAttempts.push({ t: relativeTime(), built: battle.turretGrid[0][0].occupied,
            id: battle.turretGrid[0][0].turretData?.id ?? null, paid: before - battle.gold });
          built = true;
        }
      }
      observe();
      timestamp += dt;
      virtualWallElapsed += dt;
      game.headlessStep(timestamp, dt);
      observe();
      if (relativeTime() - lastSample >= 30000 || battle.gameOver) {
        lastSample = relativeTime();
        samples.push(sample());
      }
    }
    if (samples.at(-1).absoluteTimeMs !== battle.simulationTime) samples.push(sample());

    // Render the terminal state without performing an unrecorded extra combat tick.
    game.renderer.preRender();
    game.scene.render(game.renderer);
    game.renderer.postRender();
    const recruitsById = {};
    for (const purchase of purchases) recruitsById[purchase.id] = (recruitsById[purchase.id] ?? 0) + 1;
    return {
      initial, virtualWallClock: options.seed !== null, frameTimestampOrigin: options.seed === null ? game.loop.now : 0,
      startSimulationTimeMs: startSimulationTime, simulationStepMs: dt, frameCount: frames,
      relativeSeconds: relativeTime() / 1000, seconds: battle.simulationTime / 1000,
      gameOver: battle.gameOver, winner: battle.gameOver ? (battle.enemyBase.hp <= 0 ? 'player' : 'enemy') : null,
      endedBy: battle.gameOver ? 'base-destroyed' : 'simulation-limit',
      playerHP: battle.playerBase.hp, enemyHP: battle.enemyBase.hp, kills: battle.kills,
      recruits: purchases.length, goldSpentOnUnits: purchases.reduce((total, purchase) => total + purchase.paid, 0),
      recruitsById, purchases, blockedOrders, unaffordableDecisions,
      meteorCasts, artilleryCasts, abilityUses, towerAttempts, epochTransitions: epochs,
      minimumBase, minimumBaseByEpoch: byEpoch, samples, wavePlans, waveAttempts, observedEnemySpawns,
      waveReporting: 'Read-only observations before/after each original frame; attempt counters include every attempt, active-sprite observations may omit a same-frame death.',
      rng: { seeded: options.seed !== null, algorithm: 'FNV-1a seed hash; 32-bit LCG for Math.random; Phaser RND.sow',
        beforeCreate: rngBeforeCreate, final: { mathState: randomState, mathCalls: randomCalls, phaserState: Phaser.Math.RND.state() } },
      policy: { decisionEveryMs: 1500, automaticEvolution: true, rosters, line: 'first roster entry of each epoch',
        meteor: 'at least five enemies and one left of x=650', artillery: 'at least seven enemies from Renaissance',
        defense: 'one attempt to build stone tower 1 when gold reaches 200 after recruitment' },
    };
  }, options);
  const report = { runId, createdAt: new Date().toISOString(), options, sourceFingerprint, sourceHashes, ...result, errors, artifacts };
  await fs.writeFile(artifacts.json, JSON.stringify(report, null, 2));
  await page.screenshot({ path: artifacts.screenshot });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
