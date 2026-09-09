import { test, expect, clickGame, openMenu, sceneActive, snapshot, startBattle } from './game-fixture';
import { units, epochs } from './catalog';
import { installAudioProbe, audioSnapshot } from './audio-probe';

test('Boot loads the complete five-epoch texture contract and eight real frames per troop', async ({ page }) => {
  await openMenu(page);
  await expect(page).toHaveTitle(/Age of Max/);
  const state = await page.evaluate(({ units, epochs }) => {
    const game = window.__AGE_OF_MAX__;
    return {
      failed: [...game.scene.getScene('BootScene').failed],
      units: units.flatMap(unit => [unit.id, `${unit.id}-enemy`]).map(id => {
        const texture = game.textures.get(id);
        return { id, key: texture.key, width: texture.source[0].width, height: texture.source[0].height,
          frames: Object.keys(texture.frames).filter(key => /^\d+$/.test(key)).map(key => ({ width: texture.frames[key].width, height: texture.frames[key].height })) };
      }),
      scenery: epochs.flatMap(epoch => [`base-${epoch.id}`, `base-${epoch.id}-enemy`, ...[1, 2, 3].map(tower => `${epoch.id}-tower-${tower}`)])
        .map(key => ({ key, loaded: game.textures.exists(key) })),
      sockets: game.cache.json.get('weapon-sockets'),
      backgrounds: ['stone-age-bg', 'castle-age-bg', 'renaissance-bg', 'modern-bg', 'future-bg'].map(key => game.textures.exists(key)),
    };
  }, { units, epochs });
  expect(state.failed).toEqual([]);
  for (const unit of state.units) {
    expect(unit.key).toBe(unit.id);
    expect([unit.width, unit.height]).toEqual([2048, 256]);
    expect(unit.frames).toHaveLength(8);
    expect(unit.frames.every(frame => frame.width === 256 && frame.height === 256)).toBe(true);
  }
  expect(state.scenery.every(texture => texture.loaded)).toBe(true);
  expect(state.backgrounds).toEqual([true, true, true, true, true]);
  for (const { id } of units) {
    expect(state.sockets[id]).toHaveLength(8);
    expect(state.sockets[id].every((point: number[]) => point.length === 2 && point.every(Number.isFinite))).toBe(true);
  }
});


test('Malformed weapon data shows a recoverable loading error and the reload control retries the real export', async ({ page }) => {
  const route = '**/assets/reborn/weapon-sockets.json';
  await page.route(route, request => request.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ clubman: [[null, 34]] }),
  }));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => {
    const boot = window.__AGE_OF_MAX__?.scene.getScene('BootScene');
    return boot?.children.list.some((child: any) => typeof child.text === 'string' && child.text.includes('Fehlende oder beschädigte Spieldaten:')) ?? false;
  })).toBe(true);
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.scene.isActive('MenuScene'))).toBe(false);
  await expect(page.locator('canvas')).toBeVisible();
  await page.unroute(route);
  await Promise.all([page.waitForEvent('domcontentloaded'), clickGame(page, 640, 436)]);
  await sceneActive(page, 'MenuScene');
  expect(await page.evaluate(() => [...window.__AGE_OF_MAX__.scene.getScene('BootScene').failed])).toEqual([]);
});

test('Menus support keyboard navigation, audible live volume, resize-aware clicks and persisted settings', async ({ page }) => {
  await installAudioProbe(page);
  await openMenu(page);
  for (let key = 0; key < 3; key++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await sceneActive(page, 'SettingsScene');
  await clickGame(page, 578, 282); // Real pointer input unlocks Web Audio and sets music to 50%.
  await expect.poll(async () => (await audioSnapshot(page, 0.5)).some(bus => bus.state === 'running' && bus.rms > 0.0001), { intervals: [50, 100, 200] }).toBe(true);
  await clickGame(page, 439, 282); // Mute through the actual slider, not a test-only audio call.
  await expect.poll(async () => (await audioSnapshot(page, 0)).some(bus => bus.state === 'running' && bus.rms < 0.000001)).toBe(true);
  await clickGame(page, 578, 282);
  await expect.poll(async () => (await audioSnapshot(page, 0.5)).some(bus => bus.rms > 0.0001)).toBe(true);
  await clickGame(page, 662, 381); // SFX 80%.
  await clickGame(page, 760, 496); // Reduced motion on.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ageOfMax.settings.v1')!));
  expect(saved.musicVolume).toBeCloseTo(0.5, 1);
  expect(saved.sfxVolume).toBeCloseTo(0.8, 1);
  expect(saved.reducedMotion).toBe(true);
  await page.keyboard.press('Escape');
  await sceneActive(page, 'MenuScene');
  await page.reload();
  await sceneActive(page, 'MenuScene');
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.registry.get('settings'))).toEqual(saved);

  await page.setViewportSize({ width: 900, height: 680 });
  await expect.poll(async () => (await page.locator('canvas').boundingBox())?.width).toBeLessThanOrEqual(900);
  const bounds = (await page.locator('canvas').boundingBox())!;
  expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 2);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(681);
  await clickGame(page, 250, 439);
  await expect.poll(() => page.evaluate(() => !!window.__AGE_OF_MAX__.scene.getScene('MenuScene').help?.active)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => !!window.__AGE_OF_MAX__.scene.getScene('MenuScene').help?.active)).toBe(false);
  await clickGame(page, 250, 370);
  await sceneActive(page, 'DifficultyScene');
  await page.keyboard.press('Escape');
  await sceneActive(page, 'MenuScene');
  await startBattle(page);
  await page.keyboard.press('q');
  await expect.poll(async () => (await audioSnapshot(page, 0.8)).some(bus => bus.state === 'running' && bus.rms > 0.00001), { intervals: [20, 30, 50] }).toBe(true);
});

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  test(`The ${difficulty} choice reaches a fresh battle with its own economy and working HUD`, async ({ page }) => {
    await startBattle(page, difficulty);
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
    const state = await snapshot(page);
    const initial = { easy: 360, medium: 240, hard: 200 }[difficulty];
    expect(state.difficulty).toBe(difficulty);
    expect(state.gold).toBe(initial + Math.floor(state.simulationTime / 1000) * 8);
    expect(state.epoch).toBe(0);
    expect(state.playerBase.hp).toBe(state.playerBase.maxHp);
    expect(state.enemyBase.hp).toBe(state.enemyBase.maxHp);
    expect(state.player).toEqual([]);
    expect(state.unitCards.map(card => card.id)).toEqual(units.filter(unit => unit.epoch === 'stone').map(unit => unit.id));
    expect(state.overlayTexts).toContain('PAUSIERT');
    await clickGame(page, 640, 469);
    await sceneActive(page, 'MenuScene');
    expect(await page.evaluate(() => window.__AGE_OF_MAX__.scene.isActive('BattleScene'))).toBe(false);
  });
}

test('Blocked browser storage keeps settings, recruitment, debug toggles and menu restart usable for the session', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Access to local storage is denied for this document.', 'SecurityError'); },
    });
  });
  await openMenu(page);
  await clickGame(page, 250, 500);
  await sceneActive(page, 'SettingsScene');
  await clickGame(page, 757, 282);
  await expect.poll(() => page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('SettingsScene').saveStatus.text))
    .toContain('Für diese Sitzung gespeichert.');
  await page.keyboard.press('Escape');
  await sceneActive(page, 'MenuScene');
  await clickGame(page, 250, 370);
  await sceneActive(page, 'DifficultyScene');
  await clickGame(page, 1050, 610);
  await sceneActive(page, 'BattleScene');
  const initial = await snapshot(page);
  expect(initial.difficulty).toBe('medium');
  expect(initial.player).toHaveLength(0);
  expect(initial.xp).toBe(0);
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
  const recruited = await snapshot(page);
  expect(recruited.player[0].id).toBe('clubman');
  expect(recruited.gold).toBe(initial.gold - 50 +
    8 * (Math.floor(recruited.simulationTime / 1000) - Math.floor(initial.simulationTime / 1000)));
  await expect.poll(async () => (await snapshot(page)).player[0].x).toBeGreaterThan(recruited.player[0].x + 10);
  await expect.poll(async () => (await snapshot(page)).simulationTime).toBeGreaterThan(recruited.simulationTime);

  for (const expected of [true, false]) {
    await page.keyboard.press('F3');
    await expect.poll(() => page.evaluate(() => {
      const game = window.__AGE_OF_MAX__;
      return [game.scene.getScene('BattleScene').developerMode, game.registry.get('settings').developerMode];
    })).toEqual([expected, expected]);
  }
  for (const expected of [true, false]) {
    await page.keyboard.press('F2');
    await expect.poll(() => page.evaluate(() => window.__AGE_OF_MAX__.scene.getScene('BattleScene').debugEnabled)).toBe(expected);
  }
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  await clickGame(page, 640, 470);
  await sceneActive(page, 'MenuScene');
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.scene.isActive('BattleScene'))).toBe(false);
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.registry.get('settings').musicVolume)).toBeCloseTo(0.45);
  await clickGame(page, 250, 370);
  await sceneActive(page, 'DifficultyScene');
  await clickGame(page, 1050, 610);
  await sceneActive(page, 'BattleScene');
  const restarted = await snapshot(page);
  expect(restarted.epoch).toBe(0);
  expect(restarted.speed).toBe(1);
  expect(restarted.player).toHaveLength(0);
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
  const secondBuy = await snapshot(page);
  expect(secondBuy.player[0].uid).toBe(1);
  expect(secondBuy.gold).toBe(restarted.gold - 50 +
    8 * (Math.floor(secondBuy.simulationTime / 1000) - Math.floor(restarted.simulationTime / 1000)));
});
