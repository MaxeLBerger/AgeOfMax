import type { Page } from '@playwright/test';
import { test, expect, clickGame, sceneActive, snapshot, startBattle, technicalSetup } from './game-fixture';

async function expectFocus(page: Page, index: number): Promise<void> {
  // Inspect the actual rendered button styles, not merely an internal focus index.
  await expect.poll(() => page.evaluate(() => {
    const ui = window.__AGE_OF_MAX__.scene.getScene('UIScene');
    return ui.overlayButtons.map(({ bg }: any) => bg.lineWidth);
  })).toEqual(index === 0 ? [2, 1] : [1, 2]);
  const colors = await page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('UIScene').overlayButtons.map(({ bg }: any) => bg.fillColor));
  expect(colors[0]).not.toBe(colors[1]);
}

async function blockedBattleCommands(page: Page): Promise<void> {
  await page.waitForTimeout(80);
  const before = await snapshot(page);
  await page.keyboard.type('qwerasdfgu123', { delay: 15 });
  await page.waitForTimeout(180);
  const after = await snapshot(page);
  for (const key of ['gold', 'xp', 'simulationTime', 'epoch', 'speed', 'meteorAt', 'artilleryAt', 'wave', 'phaseEndsAt'] as const)
    expect(after[key], key).toBe(before[key]);
  expect(after.player).toEqual(before.player);
  expect(after.enemy).toEqual(before.enemy);
  expect(after.shots).toEqual(before.shots);
  expect(after.towers).toEqual(before.towers);
}

async function buyOnce(page: Page): Promise<void> {
  const before = await snapshot(page);
  expect(before.player).toHaveLength(0);
  expect(before.speed).toBe(1);
  expect(before.epoch).toBe(0);
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
  const after = await snapshot(page);
  expect(after.player[0].uid).toBe(1);
  expect(after.player[0].id).toBe('clubman');
  expect(after.gold).toBe(before.gold - 50 +
    8 * (Math.floor(after.simulationTime / 1000) - Math.floor(before.simulationTime / 1000)));
}

async function menuToBattle(page: Page): Promise<void> {
  await sceneActive(page, 'MenuScene');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.scene.isActive('MenuScene'))).toBe(true);
  // This fresh Enter is accepted; the Enter that left the old overlay must not leak here.
  await page.keyboard.press('Enter');
  await sceneActive(page, 'DifficultyScene');
  await clickGame(page, 1050, 610);
  await sceneActive(page, 'BattleScene');
}

/** Deliberate terminal setup: a real attack delivers the final hit, without emitting a result. */
async function finishBattle(page: Page, winner: 'player' | 'enemy'): Promise<void> {
  await technicalSetup(page, { holdWaves: true });
  await page.evaluate(winner => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const loser = winner === 'player' ? battle.enemyBase : battle.playerBase;
    loser.hp = 1;
    battle.updateBaseHealthBar(winner === 'player' ? 'enemy' : 'player');
    if (winner === 'enemy') {
      for (const unit of battle.playerUnits.getChildren()) if (unit.active) battle.recycleUnit(unit);
      battle.spawnUnitByData('enemy', battle.unitsDatabase[0]);
    }
    const group = winner === 'player' ? battle.playerUnits : battle.enemyUnits;
    const unit = group.getChildren().find((candidate: any) => candidate.active);
    unit.setPosition(winner === 'player' ? 1090 : 190, unit.y);
    unit.body.reset(unit.x, unit.y);
    unit.setData('lastAttackTime', -Infinity);
  }, winner);
  await expect.poll(async () => (await snapshot(page)).gameOver).toBe(true);
}

test('Pause overlay supports visible keyboard focus, pointer handoff and a clean return through the menu', async ({ page }) => {
  await startBattle(page);
  await buyOnce(page);
  const subscriptions = (await snapshot(page)).subscriptions;
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  await expectFocus(page, 0);
  await blockedBattleCommands(page);
  for (const key of ['F2', 'F3']) {
    const field = key === 'F2' ? 'debugEnabled' : 'developerMode';
    for (const expected of [true, false]) {
      await page.keyboard.press(key);
      await expect.poll(() => page.evaluate(field => window.__AGE_OF_MAX__.scene.getScene('BattleScene')[field], field)).toBe(expected);
    }
  }
  await page.keyboard.press('ArrowUp');
  await expectFocus(page, 1);
  await page.keyboard.press('ArrowDown');
  await expectFocus(page, 0);
  await page.keyboard.press('Tab');
  await expectFocus(page, 1);
  await page.keyboard.press('Shift+Tab');
  await expectFocus(page, 0);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(false);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  await expectFocus(page, 0);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(false);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  await expectFocus(page, 0);
  const bounds = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(bounds.x + 640 * bounds.width / 1280, bounds.y + 470 * bounds.height / 720);
  await expectFocus(page, 1);
  await page.keyboard.press('ArrowUp');
  await expectFocus(page, 0);
  await page.mouse.move(bounds.x + 640 * bounds.width / 1280, bounds.y + 412 * bounds.height / 720);
  await page.mouse.move(bounds.x + 640 * bounds.width / 1280, bounds.y + 470 * bounds.height / 720);
  await expectFocus(page, 1);
  await page.screenshot({ path: 'art/qa/pause-keyboard-focus.png' });
  await page.keyboard.press('Enter');
  await menuToBattle(page);
  expect((await snapshot(page)).subscriptions).toEqual(subscriptions);
  await buyOnce(page);
});

for (const winner of ['player', 'enemy'] as const) {
  test(`Technical terminal setup: ${winner === 'player' ? 'victory' : 'defeat'} overlay accepts keyboard restart and menu return with fresh commands`, async ({ page }) => {
    await startBattle(page);
    await buyOnce(page);
    const subscriptions = (await snapshot(page)).subscriptions;
    await finishBattle(page, winner);
    expect((await snapshot(page)).overlayTexts).toContain(winner === 'player' ? 'SIEG' : 'NIEDERLAGE');
    await expectFocus(page, 0);
    await blockedBattleCommands(page);
    await page.screenshot({ path: `art/qa/${winner === 'player' ? 'victory' : 'defeat'}-keyboard-focus.png` });
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).gameOver).toBe(false);
    expect((await snapshot(page)).subscriptions).toEqual(subscriptions);
    await buyOnce(page);
    await finishBattle(page, winner);
    await expectFocus(page, 0);
    await page.keyboard.press('ArrowDown');
    await expectFocus(page, 1);
    await page.keyboard.press('Tab');
    await expectFocus(page, 0);
    await page.keyboard.press('Shift+Tab');
    await expectFocus(page, 1);
    await page.keyboard.press('Enter');
    await menuToBattle(page);
    expect((await snapshot(page)).subscriptions).toEqual(subscriptions);
    await buyOnce(page);
  });
}
