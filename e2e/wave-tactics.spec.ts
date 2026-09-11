import type { Page } from '@playwright/test';
import { test, expect, clickGame, snapshot, startBattle, technicalSetup } from './game-fixture';
import { DIFFICULTY, INITIAL_PREPARE_MS, WAVE_ASSAULT_MS, WAVE_RESPITE_MS, waveSize } from '../src/game/combatRules';

/** The first normal wave that belongs to an enemy epoch, and the respite that announces it. */
function enemyEpochBoundary(epoch: number) {
  const cycle = WAVE_ASSAULT_MS + WAVE_RESPITE_MS;
  let wave = 1;
  while (INITIAL_PREPARE_MS + (wave - 1) * cycle < epoch * DIFFICULTY.medium.enemyEpochMs) wave++;
  const attackAt = INITIAL_PREPARE_MS + (wave - 1) * cycle;
  return { wave, attackAt, respiteAt: attackAt - WAVE_RESPITE_MS };
}

async function waveSnapshot(page: Page) {
  return page.evaluate(() => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const ui = window.__AGE_OF_MAX__.scene.getScene('UIScene');
    return {
      plan: battle.wavePlan, announced: ui.scoutWave?.plan, phase: battle.wavePhase,
      attempted: battle.waveSpawned, arrived: battle.waveArrived, nextSpawnAt: battle.nextEnemySpawnAt,
      visible: ui.scout.visible, pinned: ui.scoutPinned, paused: battle.paused,
      header: ui.waveText.text, detail: ui.waveDetail.text, status: ui.scoutStatus.text,
      texts: ui.scout.list.filter((object: any) => typeof object.text === 'string').map((object: any) => object.text),
      portraits: ui.scout.list.filter((object: any) => object.type === 'Image')
        .map((object: any) => ({ texture: object.texture.key, frame: object.frame.name })),
    };
  });
}

async function moveGame(page: Page, x: number, y: number) {
  const bounds = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(bounds.x + x * bounds.width / 1280, bounds.y + y * bounds.height / 720);
}

/** Deliberately prepares only a wave boundary. This is not an earned playthrough or a balance sample. */
async function prepareRespite(page: Page, wave: number, time: number) {
  return page.evaluate(({ wave, time }) => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    for (const group of [battle.playerUnits, battle.enemyUnits])
      for (const unit of group.getChildren()) if (unit.active) battle.recycleUnit(unit);
    battle.waveNumber = wave;
    battle.wavePhase = 'assault';
    battle.phaseEndsAt = time;
    battle.simulationTime = time;
    battle.updateWaves();
    battle.emitBattleStatus();
    return { plan: battle.wavePlan, attackAt: battle.phaseEndsAt, phase: battle.wavePhase, enemyEpoch: battle.enemyEpochIndex };
  }, { wave, time });
}

test('Wave intelligence is a nonmodal announcement with keyboard, hover, pin and Escape priorities', async ({ page }) => {
  await startBattle(page);
  await moveGame(page, 500, 370);
  const initial = await waveSnapshot(page);
  expect(initial.plan.number).toBe(1);
  expect(initial.plan.epoch).toBe('stone');
  expect(initial.plan.unitIds).toHaveLength(waveSize(1, 'medium'));
  expect(initial.announced).toEqual(initial.plan);
  expect(initial.header).toContain('Mischformation');
  expect(initial.detail).toContain('Angriff in');
  expect(initial.visible).toBe(false);
  await page.keyboard.press('i');
  await expect.poll(async () => (await waveSnapshot(page)).pinned).toBe(true);
  expect((await waveSnapshot(page)).visible).toBe(true);
  const moving = await snapshot(page);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).simulationTime).toBeGreaterThan(moving.simulationTime);
  expect((await snapshot(page)).paused).toBe(false);
  // Both overlays exist: cancel a real affordable construction selection before dismissing intelligence.
  await page.keyboard.press('a');
  await expect.poll(async () => (await snapshot(page)).selectedTower).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).selectedTower).toBe(-1);
  expect((await waveSnapshot(page)).pinned).toBe(true);
  expect((await snapshot(page)).paused).toBe(false);
  await page.keyboard.press('Escape');
  expect((await waveSnapshot(page)).visible).toBe(false);
  expect((await snapshot(page)).paused).toBe(false);
  await moveGame(page, 790, 35);
  await expect.poll(async () => (await waveSnapshot(page)).visible).toBe(true);
  expect((await waveSnapshot(page)).pinned).toBe(false);
  await moveGame(page, 500, 370);
  await expect.poll(async () => (await waveSnapshot(page)).visible).toBe(false);
  await clickGame(page, 790, 35);
  await moveGame(page, 500, 370);
  await expect.poll(async () => (await waveSnapshot(page)).pinned).toBe(true);
  expect((await waveSnapshot(page)).visible).toBe(true);
  const beforeBuy = await snapshot(page);
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
  const bought = await snapshot(page);
  expect(bought.gold).toBe(beforeBuy.gold - 50 + 8 *
    (Math.floor(bought.simulationTime / 1000) - Math.floor(beforeBuy.simulationTime / 1000)));
  expect((await waveSnapshot(page)).plan).toEqual(initial.plan);
  await page.keyboard.press('i');
  expect((await waveSnapshot(page)).visible).toBe(false);
  await page.keyboard.press('i');
  expect((await waveSnapshot(page)).visible).toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  expect((await waveSnapshot(page)).visible).toBe(false);
  const paused = await snapshot(page);
  await page.keyboard.type('iqwe123', { delay: 15 });
  await page.waitForTimeout(200);
  const frozen = await snapshot(page);
  expect(frozen.simulationTime).toBe(paused.simulationTime);
  expect(frozen.gold).toBe(paused.gold);
  expect(frozen.player).toEqual(paused.player);
  expect((await waveSnapshot(page)).visible).toBe(false);
  await page.keyboard.press('Space');
  expect((await snapshot(page)).paused).toBe(false);
  expect((await waveSnapshot(page)).pinned).toBe(false);
});

test('Technical XP and wave-boundary setup: player evolution cannot change a committed upcoming enemy epoch or roster', async ({ page }) => {
  await startBattle(page);
  const initial = (await waveSnapshot(page)).plan;
  const requiredXP = await page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('BattleScene').epochs[0].xpToNext);
  await technicalSetup(page, { xp: requiredXP });
  await page.keyboard.press('u');
  await expect.poll(async () => (await snapshot(page)).epoch).toBe(1);
  expect((await waveSnapshot(page)).plan).toEqual(initial);
  // The respite before the first normal Castle wave announces the enemy's
  // advance while the enemy itself is still in the Stone Age.
  const castle = enemyEpochBoundary(1);
  const upcoming = await prepareRespite(page, castle.wave - 1, castle.respiteAt);
  expect(upcoming.phase).toBe('respite');
  expect(upcoming.attackAt).toBe(castle.attackAt);
  expect(upcoming.enemyEpoch).toBe(0);
  expect(upcoming.plan.number).toBe(castle.wave);
  expect(upcoming.plan.epoch).toBe('castle');
  await page.keyboard.press('i');
  const intel = await waveSnapshot(page);
  expect(intel.announced).toEqual(upcoming.plan);
  expect(intel.texts.join(' ')).toContain('Mittelalter');
  expect(intel.header).toContain(String(castle.wave));
  const nextXP = await page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('BattleScene').epochs[1].xpToNext);
  await technicalSetup(page, { xp: nextXP });
  await page.keyboard.press('u');
  await expect.poll(async () => (await snapshot(page)).epoch).toBe(2);
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
  expect((await waveSnapshot(page)).plan).toEqual(upcoming.plan);
  const attack = await page.evaluate(attackAt => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    battle.simulationTime = attackAt;
    battle.updateWaves();
    battle.emitBattleStatus();
    return { plan: battle.wavePlan, phase: battle.wavePhase, epoch: battle.enemyEpochIndex,
      attempts: battle.waveSpawned, arrived: battle.waveArrived,
      first: battle.enemyUnits.getChildren().find((unit: any) => unit.active)?.getData('unitId') };
  }, upcoming.attackAt);
  expect(attack.plan).toEqual(upcoming.plan);
  expect(attack.phase).toBe('assault');
  expect(attack.epoch).toBe(1);
  expect(attack.first).toBe(upcoming.plan.unitIds[0]);
  expect(attack.attempts).toBe(1);
  expect(attack.arrived).toBe(1);
  expect((await waveSnapshot(page)).status).toContain('Geplant:');
});

test('Technical blocked-exit and clock setup: attempts follow announced IDs with no hidden retry army', async ({ page }) => {
  await startBattle(page);
  const result = await page.evaluate(() => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const plan = battle.wavePlan;
    const goldBefore = battle.gold;
    // Three actual sprites occupy all formation exits; no spawning method is mocked.
    const blocker = battle.unitsDatabase.find((unit: any) => unit.id === 'clubman');
    const created = [0, 1, 2].map(() => battle.spawnUnitByData('enemy', blocker));
    battle.simulationTime = 12000;
    battle.updateWaves();
    const blocked = { attempted: battle.waveSpawned, arrived: battle.waveArrived, count: battle.enemyUnits.countActive(true) };
    for (const unit of battle.enemyUnits.getChildren()) if (unit.active) battle.recycleUnit(unit);
    const beforeDue = battle.nextEnemySpawnAt - 1;
    battle.simulationTime = beforeDue;
    battle.updateWaves();
    const noRetry = { attempted: battle.waveSpawned, arrived: battle.waveArrived, count: battle.enemyUnits.countActive(true) };
    const successful: string[] = [];
    const counters: Array<{ attempted: number; arrived: number; at: number }> = [];
    for (let index = 1; index < plan.unitIds.length; index++) {
      battle.simulationTime = battle.nextEnemySpawnAt;
      const oldUid = battle.unitUidCounter;
      battle.updateWaves();
      const unit = battle.enemyUnits.getChildren().find((candidate: any) => candidate.active && candidate.getData('uid') >= oldUid);
      successful.push(unit?.getData('unitId') ?? 'MISSING');
      counters.push({ attempted: battle.waveSpawned, arrived: battle.waveArrived, at: battle.simulationTime });
      // Only free the exit for the next due attempt; this technical probe does not simulate combat.
      if (unit) { unit.setPosition(950 - index * 35, unit.y); unit.body.reset(unit.x, unit.y); }
    }
    battle.simulationTime = 39999;
    battle.updateWaves();
    const exhausted = { attempted: battle.waveSpawned, arrived: battle.waveArrived, count: battle.enemyUnits.countActive(true) };
    battle.simulationTime = 40000;
    battle.updateWaves();
    battle.emitBattleStatus();
    return { plan, created, blocked, noRetry, successful, counters, exhausted, goldBefore, goldAfter: battle.gold,
      phase: battle.wavePhase, nextPlan: battle.wavePlan, nextAttackAt: battle.phaseEndsAt };
  });
  expect(result.created).toEqual([true, true, true]);
  expect(result.blocked).toEqual({ attempted: 1, arrived: 0, count: 3 });
  expect(result.noRetry).toEqual({ attempted: 1, arrived: 0, count: 0 });
  expect(result.successful).toEqual(result.plan.unitIds.slice(1));
  for (const [index, counters] of result.counters.entries()) {
    expect(counters.attempted).toBe(index + 2);
    expect(counters.arrived).toBe(index + 1);
    expect(counters.at).toBeCloseTo(12000 + (index + 1) * 25000 / result.plan.unitIds.length, 5);
  }
  const troops = waveSize(1, 'medium');
  expect(result.exhausted).toEqual({ attempted: troops, arrived: troops - 1, count: troops - 1 });
  expect(result.goldAfter).toBe(result.goldBefore);
  expect(result.phase).toBe('respite');
  expect(result.nextPlan.number).toBe(2);
  expect(result.nextAttackAt).toBe(INITIAL_PREPARE_MS + WAVE_ASSAULT_MS + WAVE_RESPITE_MS);
});

test('Technical epoch-boundary setup: all five intelligence cards fit at 900px and show their real enemy portraits', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await startBattle(page);
  await moveGame(page, 500, 370);
  await page.keyboard.press('i');
  const entries = [{ id: 'stone', wave: 0, at: 0 }, ...['castle', 'renaissance', 'modern', 'future'].map((id, index) => {
    const boundary = enemyEpochBoundary(index + 1);
    return { id, wave: boundary.wave - 1, at: boundary.respiteAt };
  })];
  for (const entry of entries) {
    if (entry.wave) await prepareRespite(page, entry.wave, entry.at);
    const state = await waveSnapshot(page);
    expect(state.visible).toBe(true);
    expect(state.plan.epoch).toBe(entry.id);
    expect(state.portraits).toEqual(state.plan.roster.map((row: any) => ({ texture: row.id + '-enemy', frame: 'portrait' })));
    for (const row of state.plan.roster) expect(state.texts).toContain(row.count + '×');
    const layout = await page.evaluate(() => {
      const ui = window.__AGE_OF_MAX__.scene.getScene('UIScene');
      const panel = ui.scout.list[0].getBounds();
      return { panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        objects: ui.scout.list.filter((object: any) => object.type === 'Text' || object.type === 'Image')
          .map((object: any) => { const bounds = object.getBounds(); return { label: object.text ?? object.texture.key,
            left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }; }) };
    });
    expect(layout.panel.left).toBeGreaterThanOrEqual(0);
    expect(layout.panel.right).toBeLessThanOrEqual(1280);
    expect(layout.panel.top).toBeGreaterThanOrEqual(82);
    expect(layout.panel.bottom).toBeLessThan(452);
    for (const object of layout.objects) {
      expect(object.left, object.label).toBeGreaterThanOrEqual(layout.panel.left);
      expect(object.right, object.label).toBeLessThanOrEqual(layout.panel.right);
      expect(object.top, object.label).toBeGreaterThanOrEqual(layout.panel.top);
      expect(object.bottom, object.label).toBeLessThanOrEqual(layout.panel.bottom);
    }
    await page.screenshot({ path: 'art/qa/wave-tactics-v1/intel-' + entry.id + '-900.png' });
  }
  await clickGame(page, 952, 111);
  await expect.poll(async () => (await waveSnapshot(page)).visible).toBe(false);
  expect((await snapshot(page)).paused).toBe(false);
});
