import { test as base, expect, type Page } from '@playwright/test';
import { basename } from 'node:path';

declare global { interface Window { __AGE_OF_MAX__: any; } }

export const test = base.extend<{ cleanRuntime: void }>({
  cleanRuntime: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/assets/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await use();
    await testInfo.attach('runtime-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
    expect(errors, 'No uncaught browser error or failed asset response').toEqual([]);
  }, { auto: true }],
});
export { expect };

/** A normal run keeps its screenshot in the ignored test output; only QA_CAPTURE_EVIDENCE=1 refreshes the recorded art/qa evidence. */
export async function captureEvidence(page: Page, evidencePath: string): Promise<void> {
  const refresh = process.env.QA_CAPTURE_EVIDENCE === '1';
  await page.screenshot({ path: refresh ? evidencePath : test.info().outputPath(basename(evidencePath)) });
}

export async function sceneActive(page: Page, key: string): Promise<void> {
  await expect.poll(() => page.evaluate(key => window.__AGE_OF_MAX__?.scene.isActive(key) ?? false, key), { timeout: 30000 }).toBe(true);
}

/** Pointer coordinates are converted from the 1280×720 game world after every resize. */
export async function clickGame(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.click(bounds!.x + x * bounds!.width / 1280, bounds!.y + y * bounds!.height / 720);
}

export async function openMenu(page: Page): Promise<void> {
  await page.goto('/');
  await sceneActive(page, 'MenuScene');
  await expect(page.locator('canvas')).toBeVisible();
}

export async function startBattle(page: Page, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<void> {
  await openMenu(page);
  await clickGame(page, 250, 370);
  await sceneActive(page, 'DifficultyScene');
  await clickGame(page, { easy: 250, medium: 640, hard: 1020 }[difficulty], 370);
  await clickGame(page, 1050, 610);
  await sceneActive(page, 'BattleScene');
  await expect.poll(() => page.evaluate(() => !!window.__AGE_OF_MAX__.scene.getScene('BattleScene').playerBase)).toBe(true);
}

export async function snapshot(page: Page) {
  return page.evaluate(() => {
    const game = window.__AGE_OF_MAX__, battle = game.scene.getScene('BattleScene'), ui = game.scene.getScene('UIScene');
    const troop = (unit: any) => ({ uid: unit.getData('uid'), id: unit.getData('unitId'), hp: unit.getData('hp'), x: unit.x, y: unit.y,
      texture: unit.texture.key, frame: unit.frame.name, enabled: unit.body.enable });
    return {
      gold: battle.gold, xp: battle.xp, epoch: battle.currentEpochIndex, enemyEpoch: battle.enemyEpochIndex,
      simulationTime: battle.simulationTime, speed: battle.simulationSpeed, paused: battle.paused, gameOver: battle.gameOver,
      difficulty: battle.difficulty, wave: battle.waveNumber, phase: battle.wavePhase, phaseEndsAt: battle.phaseEndsAt,
      playerBase: { ...battle.playerBase }, enemyBase: { ...battle.enemyBase },
      player: (battle.playerUnits.getChildren() as any[]).filter((unit: any) => unit.active).map(troop),
      enemy: (battle.enemyUnits.getChildren() as any[]).filter((unit: any) => unit.active).map(troop),
      shots: (battle.projectiles.getChildren() as any[]).filter((shot: any) => shot.active).map((shot: any) => ({ x: shot.x, y: shot.y, owner: shot.getData('owner') })),
      towers: (battle.turretGrid.flat() as any[]).map((slot: any) => ({ occupied: slot.occupied, id: slot.turretData?.id ?? null, epoch: slot.turretData?.epoch ?? null,
        level: slot.level ?? 0, x: slot.x, y: slot.y, lastFireTime: slot.lastFireTime, texture: slot.turret?.texture.key ?? null })),
      selectedTower: battle.selectedTurretIndex, uiSelectedTower: ui.selectedTurretIndex,
      meteorAt: battle.rainingRocksLastUsed, artilleryAt: battle.artilleryStrikeLastUsed,
      unitCards: (ui.unitCards as any[]).map((card: any) => ({ id: card.id, index: card.index, price: card.price.text, texture: card.image.texture.key })),
      turretCards: (ui.turretCards as any[]).map((card: any) => ({ id: card.id, index: card.index, price: card.price.text, texture: card.image.texture.key })),
      epochReady: ui.epochReady, epochText: ui.epochText.text, abilityTexts: ui.abilityTexts.map((text: any) => text.text),
      overlayTexts: ui.overlay?.list.filter((object: any) => typeof object.text === 'string').map((object: any) => object.text) ?? [],
      feedback: ui.feedbackText.text, background: battle.backgroundImage.texture.key,
      subscriptions: { spawn: ui.events.listenerCount('spawnUnit'), evolve: ui.events.listenerCount('advanceEpoch'), gold: ui.events.listenerCount('updateGold') },
    };
  });
}

/** Deliberate technical setup, never used as evidence of an earned playthrough. */
export async function technicalSetup(page: Page, options: { gold?: number; xp?: number; holdWaves?: boolean; clearUnits?: boolean } = {}): Promise<void> {
  await page.evaluate(options => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const ui = window.__AGE_OF_MAX__.scene.getScene('UIScene');
    if (options.gold !== undefined) { battle.gold = options.gold; ui.events.emit('updateGold', battle.gold); }
    if (options.xp !== undefined) {
      battle.xp = options.xp;
      ui.events.emit('updateXP', battle.xp, battle.epochs[battle.currentEpochIndex].xpToNext);
      ui.events.emit('updateEpochReady', battle.epochs[battle.currentEpochIndex].xpToNext > 0 && battle.xp >= battle.epochs[battle.currentEpochIndex].xpToNext);
    }
    if (options.holdWaves) battle.phaseEndsAt = Number.MAX_SAFE_INTEGER;
    if (options.clearUnits) {
      for (const group of [battle.playerUnits, battle.enemyUnits]) for (const unit of group.getChildren()) if (unit.active) battle.recycleUnit(unit);
    }
  }, options);
}

export async function towerMenuPoint(page: Page, action: 'upgrade' | 'sell' | 'close') {
  return page.evaluate(action => {
    const menu = window.__AGE_OF_MAX__.scene.getScene('BattleScene').turretMenuContainer;
    if (!menu?.active) return null;
    return { x: menu.x + (action === 'upgrade' ? -60 : action === 'sell' ? 60 : 105), y: menu.y + (action === 'close' ? -52.5 : 42.5) };
  }, action);
}

export async function clickTowerAction(page: Page, index: number, action: 'upgrade' | 'sell' | 'close'): Promise<void> {
  const state = await snapshot(page), slot = state.towers[index];
  await clickGame(page, slot.x, slot.y - 30);
  await expect.poll(() => towerMenuPoint(page, action)).not.toBeNull();
  // New Phaser interactive objects join the input list on the next frame.
  // A human can only click the menu after it has been painted.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const point = (await towerMenuPoint(page, action))!;
  await clickGame(page, point.x, point.y);
}
