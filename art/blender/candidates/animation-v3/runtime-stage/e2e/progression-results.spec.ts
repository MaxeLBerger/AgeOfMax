import { test, expect, clickGame, snapshot, startBattle, technicalSetup, clickTowerAction } from './game-fixture';
import { units, epochs, turrets } from './catalog';

test('Technical setup: all five epoch catalogs recruit the right units and build all fifteen tower types', async ({ page }) => {
  test.setTimeout(90_000);
  await startBattle(page);
  await technicalSetup(page, { gold: 100000, holdWaves: true });
  const backgrounds = ['stone-age-bg', 'castle-age-bg', 'renaissance-bg', 'modern-bg', 'future-bg'];
  for (const [index, epoch] of epochs.entries()) {
    await technicalSetup(page, { clearUnits: true });
    const state = await snapshot(page);
    const roster = units.filter(unit => unit.epoch === epoch.id), towers = turrets.filter(tower => tower.epoch === epoch.id);
    expect(state.unitCards.map(card => card.id)).toEqual(roster.map(unit => unit.id));
    expect(state.turretCards.map(card => card.id)).toEqual(towers.map(tower => tower.id));
    expect(state.turretCards.map(card => card.index)).toEqual(towers.map(tower => turrets.indexOf(tower)));
    expect(state.background).toBe(backgrounds[index]);
    for (let slot = 0; slot < 4; slot++) {
      // Let a free exit appear when the three formation rows are occupied.
      await expect.poll(() => page.evaluate(id => !!window.__AGE_OF_MAX__.scene.getScene('BattleScene').findFormationSpawn('player', id), roster[slot].id)).toBe(true);
      await clickGame(page, 90 + slot * 143, 645);
      await expect.poll(async () => (await snapshot(page)).player.length).toBe(slot + 1);
    }
    await expect.poll(async () => (await snapshot(page)).player.length).toBe(4);
    expect((await snapshot(page)).player.map(unit => unit.id)).toEqual(roster.map(unit => unit.id));
    for (let slot = 0; slot < 3; slot++) {
      await clickGame(page, 668 + slot * 96, 645);
      await clickGame(page, state.towers[slot].x, state.towers[slot].y);
      await expect.poll(async () => (await snapshot(page)).towers[slot].id).toBe(towers[slot].id);
      expect((await snapshot(page)).towers[slot].texture).toBe(`${epoch.id}-tower-${slot + 1}`);
    }
    for (let slot = 0; slot < 3; slot++) await clickTowerAction(page, slot, 'sell');
    expect((await snapshot(page)).towers.every(slot => !slot.occupied)).toBe(true);
    if (index < 4) {
      const before = await snapshot(page);
      await technicalSetup(page, { xp: epoch.xpToNext + 137 });
      await clickGame(page, 1097, 611);
      await expect.poll(async () => (await snapshot(page)).epoch).toBe(index + 1);
      const next = await snapshot(page);
      expect(next.xp).toBe(137);
      expect(next.playerBase.maxHp).toBeGreaterThan(before.playerBase.maxHp);
      expect(next.enemyBase.maxHp).toBe(before.enemyBase.maxHp);
    }
  }
  await page.keyboard.press('u');
  expect((await snapshot(page)).epoch).toBe(4);
  expect((await snapshot(page)).epochReady).toBe(false);
});

for (const winner of ['player', 'enemy'] as const) {
  test(`Technical terminal setup: ${winner === 'player' ? 'victory' : 'defeat'} freezes battle and restart has exactly one recruitment handler`, async ({ page }) => {
    await startBattle(page);
    await technicalSetup(page, { holdWaves: true });
    await page.keyboard.press('q');
    await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
    const subscriptions = (await snapshot(page)).subscriptions;
    // Put a real unit one hit from ending a deliberately prepared battle.
    // The normal per-frame attack path, not a direct result event, must end it.
    await page.evaluate(winner => {
      const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
      const loser = winner === 'player' ? battle.enemyBase : battle.playerBase;
      loser.hp = 1;
      battle.updateBaseHealthBar(winner === 'player' ? 'enemy' : 'player');
      if (winner === 'enemy') {
        // Isolate the base hit from the already-recruited probe soldier.
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
    const over = await snapshot(page);
    expect(over.overlayTexts).toContain(winner === 'player' ? 'SIEG' : 'NIEDERLAGE');
    await page.waitForTimeout(250);
    const frozen = await snapshot(page);
    expect(frozen.gold).toBe(over.gold);
    expect(frozen.simulationTime).toBe(over.simulationTime);
    await clickGame(page, 640, 412);
    await expect.poll(async () => (await snapshot(page)).gameOver).toBe(false);
    const fresh = await snapshot(page);
    expect(fresh.epoch).toBe(0);
    expect(fresh.xp).toBe(0);
    expect(fresh.speed).toBe(1);
    expect(fresh.player).toHaveLength(0);
    expect(fresh.enemy).toHaveLength(0);
    expect(fresh.subscriptions).toEqual(subscriptions);
    expect(fresh.playerBase.hp).toBe(fresh.playerBase.maxHp);
    expect(fresh.enemyBase.hp).toBe(fresh.enemyBase.maxHp);
    await page.keyboard.press('q');
    await expect.poll(async () => (await snapshot(page)).player.length).toBe(1);
    const recruited = await snapshot(page);
    expect(recruited.gold).toBe(fresh.gold - units[0].goldCost + (Math.floor(recruited.simulationTime / 1000) - Math.floor(fresh.simulationTime / 1000)) * 8);
  });
}
