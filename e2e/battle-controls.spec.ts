import { test, expect, clickGame, snapshot, startBattle, technicalSetup, clickTowerAction, towerMenuPoint } from './game-fixture';
import { units, epochs, turrets } from './catalog';

test('Recruitment buttons spend real gold once and keyboard recruitment uses the same contract', async ({ page }) => {
  await startBattle(page);
  const before = await snapshot(page);
  await clickGame(page, 90, 645);
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
  await page.keyboard.press('w');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(2);
  const after = await snapshot(page);
  expect(after.player.map(unit => unit.id)).toEqual(['clubman', 'spearman']);
  const cost = units.find(unit => unit.id === 'clubman')!.goldCost + units.find(unit => unit.id === 'spearman')!.goldCost;
  expect(after.gold).toBe(before.gold - cost + (Math.floor(after.simulationTime / 1000) - Math.floor(before.simulationTime / 1000)) * 8);
  expect(after.player.every(unit => unit.enabled && unit.texture === unit.id)).toBe(true);
  const x = after.player[0].x;
  await expect.poll(async () => (await snapshot(page)).player[0].x).toBeGreaterThan(x + 5);
});


test('Three occupied formation exits reject a fourth rapid order without charging and reopen after movement', async ({ page }) => {
  await startBattle(page);
  const before = await snapshot(page);
  await page.keyboard.type('qqqq', { delay: 0 });
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(3);
  const blocked = await snapshot(page);
  const price = units.find(unit => unit.id === 'clubman')!.goldCost;
  expect(blocked.gold).toBe(before.gold - price * 3 + (Math.floor(blocked.simulationTime / 1000) - Math.floor(before.simulationTime / 1000)) * 8);
  expect(blocked.feedback).toContain('Ausgang belegt');
  await expect.poll(() => page.evaluate(() => !!window.__AGE_OF_MAX__.scene.getScene('BattleScene').findFormationSpawn('player', 'clubman'))).toBe(true);
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(4);
  const reopened = await snapshot(page);
  expect(reopened.gold).toBe(before.gold - price * 4 + (Math.floor(reopened.simulationTime / 1000) - Math.floor(before.simulationTime / 1000)) * 8);
});

test('Pause freezes combat, income, wave time, ability cooldown and troop frames at 1× and 4×', async ({ page }) => {
  await startBattle(page);
  await page.keyboard.press('q');
  await page.keyboard.press('f');
  for (const [key, speed] of [['1', 1], ['3', 4]] as const) {
    await page.keyboard.press(key);
    await expect.poll(async () => (await snapshot(page)).speed).toBe(speed);
    await expect.poll(async () => (await snapshot(page)).player[0].x).toBeGreaterThan(160);
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
    await page.waitForTimeout(80); // Let the already-started physics post-update settle.
    const before = await snapshot(page);
    await page.keyboard.press('q'); // Paused keyboard and canvas orders must be ignored.
    await clickGame(page, 90, 645);
    await page.waitForTimeout(600);
    const after = await snapshot(page);
    expect(after.simulationTime).toBe(before.simulationTime);
    expect(after.gold).toBe(before.gold);
    expect(after.player).toEqual(before.player);
    expect(after.enemy).toEqual(before.enemy);
    expect(after.shots).toEqual(before.shots);
    expect(after.wave).toBe(before.wave);
    expect(after.phaseEndsAt).toBe(before.phaseEndsAt);
    expect(after.abilityTexts).toEqual(before.abilityTexts);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await snapshot(page)).simulationTime).toBeGreaterThan(before.simulationTime + 100);
  }
});

test('Technical setup: tower selection cancels, build spends gold, upgrade caps at three and sale frees the slot', async ({ page }) => {
  await startBattle(page);
  await technicalSetup(page, { gold: 2000, holdWaves: true });
  const initial = await snapshot(page);
  await page.keyboard.press('a');
  await expect.poll(async () => (await snapshot(page)).selectedTower).toBe(0);
  await page.keyboard.press('Escape');
  const canceled = await snapshot(page);
  expect(canceled.selectedTower).toBe(-1);
  expect(canceled.uiSelectedTower).toBe(-1);
  expect(canceled.paused).toBe(false);
  expect(canceled.towers.every(slot => !slot.occupied)).toBe(true);
  await clickGame(page, 668, 645);
  await clickGame(page, initial.towers[0].x, initial.towers[0].y);
  await expect.poll(async () => (await snapshot(page)).towers[0].id).toBe('rock-thrower');
  let state = await snapshot(page);
  expect(state.towers[0].level).toBe(1);
  expect(state.selectedTower).toBe(-1);
  const price = turrets.find(tower => tower.id === 'rock-thrower')!.goldCost;
  expect(state.gold).toBe(initial.gold - price + (Math.floor(state.simulationTime / 1000) - Math.floor(initial.simulationTime / 1000)) * 8);
  await clickTowerAction(page, 0, 'upgrade');
  await expect.poll(async () => (await snapshot(page)).towers[0].level).toBe(2);
  await clickTowerAction(page, 0, 'upgrade');
  await expect.poll(async () => (await snapshot(page)).towers[0].level).toBe(3);
  state = await snapshot(page);
  const spent = price + Math.round(price * 0.6) + Math.round(price * 0.8);
  expect(state.gold).toBe(initial.gold - spent + (Math.floor(state.simulationTime / 1000) - Math.floor(initial.simulationTime / 1000)) * 8);
  await clickTowerAction(page, 0, 'upgrade'); // Disabled maximum-level button.
  expect((await snapshot(page)).towers[0].level).toBe(3);
  // The menu is already open after the disabled action; dismiss through its real close control.
  const close = (await towerMenuPoint(page, 'close'))!;
  await clickGame(page, close.x, close.y);
  await expect.poll(() => page.evaluate(() => !!window.__AGE_OF_MAX__.scene.getScene('BattleScene').turretMenuContainer?.active)).toBe(false);
  await clickTowerAction(page, 0, 'sell');
  await expect.poll(async () => (await snapshot(page)).towers[0].occupied).toBe(false);
  state = await snapshot(page);
  expect(state.gold).toBe(initial.gold - spent + Math.round(spent * 0.7) + (Math.floor(state.simulationTime / 1000) - Math.floor(initial.simulationTime / 1000)) * 8);
});


test('An open upgrade menu becomes usable when real income reaches its price', async ({ page }) => {
  await startBattle(page);
  await page.keyboard.press('s');
  const initial = await snapshot(page);
  await clickGame(page, initial.towers[0].x, initial.towers[0].y);
  await expect.poll(async () => (await snapshot(page)).towers[0].id).toBe('wooden-spike');
  await page.keyboard.type('qq', { delay: 0 });
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(2);
  const upgradeCost = Math.round(turrets.find(tower => tower.id === 'wooden-spike')!.goldCost * 0.6);
  expect((await snapshot(page)).gold).toBeLessThan(upgradeCost);
  await clickTowerAction(page, 0, 'upgrade'); // It is still unaffordable; the menu stays open.
  expect((await snapshot(page)).towers[0].level).toBe(1);
  await page.evaluate(() => Object.assign(window, { __upgradeMenu: window.__AGE_OF_MAX__.scene.getScene('BattleScene').turretMenuContainer }));
  await expect.poll(async () => (await snapshot(page)).gold).toBeGreaterThanOrEqual(upgradeCost);
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('BattleScene').turretMenuContainer === (window as any).__upgradeMenu)).toBe(true);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const point = (await towerMenuPoint(page, 'upgrade'))!;
  const before = await snapshot(page);
  await clickGame(page, point.x, point.y);
  await expect.poll(async () => (await snapshot(page)).towers[0].level).toBe(2);
  const after = await snapshot(page);
  expect(after.gold).toBe(before.gold - upgradeCost + (Math.floor(after.simulationTime / 1000) - Math.floor(before.simulationTime / 1000)) * 8);
});

test('Technical setup: abilities enforce unlocks, cooldowns and speed-scaled recovery', async ({ page }) => {
  await startBattle(page);
  await technicalSetup(page, { holdWaves: true });
  const before = await snapshot(page);
  await clickGame(page, 1178, 671);
  const locked = await snapshot(page);
  expect(locked.artilleryAt).toBe(before.artilleryAt);
  expect(locked.abilityTexts[1]).toBe('AB RENAISSANCE');
  expect(locked.feedback).toContain('Renaissance');
  await clickGame(page, 1015, 671);
  await expect.poll(async () => (await snapshot(page)).meteorAt).toBeGreaterThanOrEqual(0);
  const used = await snapshot(page);
  await page.keyboard.press('f');
  expect((await snapshot(page)).meteorAt).toBe(used.meteorAt);
  await page.keyboard.press('3');
  await expect.poll(() => page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('UIScene').cooldowns[0])).toBeLessThan(42500);
  await page.keyboard.press('1');
  for (const threshold of [epochs[0].xpToNext, epochs[1].xpToNext]) {
    await technicalSetup(page, { xp: threshold });
    await page.keyboard.press('u');
  }
  await expect.poll(async () => (await snapshot(page)).epoch).toBe(2);
  expect((await snapshot(page)).abilityTexts[1]).toBe('BEREIT');
  await page.keyboard.press('g');
  await expect.poll(async () => (await snapshot(page)).artilleryAt).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).abilityTexts[1]).toMatch(/\d+ s/);
});
