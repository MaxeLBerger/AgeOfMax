import type { Page } from '@playwright/test';
import { test, expect, startBattle, technicalSetup, sceneActive, clickGame } from './game-fixture';

async function gaitSamples(page: Page, count = 30): Promise<any[][]> {
  return page.evaluate(count => new Promise<any[][]>(resolve => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const samples: any[][] = [];
    const sample = () => {
      samples.push([battle.playerUnits, battle.enemyUnits].flatMap(group => group.getChildren()
        .filter((unit: any) => unit.active).map((unit: any) => ({
          id: unit.getData('unitId'), uid: unit.getData('uid'), x: unit.x,
          frame: Number(unit.frame.name), phase: { ...unit.getData('walkPhase') },
          gait: battle.gaitMetadata.units[unit.getData('unitId')], scale: unit.scaleX,
          inCombat: unit.getData('inCombat'), side: unit.getData('side'),
        }))));
      if (samples.length >= count) {
        battle.events.off('postupdate', sample);
        resolve(samples);
      }
    };
    // Registered after the production presentation listener and actual Arcade postUpdate.
    battle.events.on('postupdate', sample);
  }), count);
}

test('Rendered gait samples use current post-physics positions on both sides at 1× and 4×', async ({ page }) => {
  await startBattle(page);
  await technicalSetup(page, { holdWaves: true });
  await page.keyboard.press('q');
  await page.evaluate(() => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    battle.spawnUnitByData('enemy', battle.unitsDatabase.find((unit: any) => unit.id === 'clubman'));
  });
  for (const speedKey of ['1', '3']) {
    await page.keyboard.press(speedKey);
    const samples = await gaitSamples(page);
    expect(samples.every(sample => sample.length === 2)).toBe(true);
    let travelled = 0;
    for (let index = 1; index < samples.length; index++) {
      for (const unit of samples[index]) {
        const before = samples[index - 1].find(previous => previous.uid === unit.uid);
        expect(unit.inCombat).toBe(false);
        expect(unit.phase.previousX).toBe(unit.x);
        const distance = Math.abs(unit.x - before.x);
        travelled += distance;
        const stride = unit.gait.cycleDistancePixels * Math.abs(unit.scale) / unit.gait.referenceDisplayScale;
        const expected = ((before.phase.phase + distance / stride) % 1 + 1) % 1;
        const phaseGap = Math.abs(expected - unit.phase.phase);
        expect(Math.min(phaseGap, 1 - phaseGap)).toBeLessThan(1e-8);
        expect(unit.frame).toBe(Math.floor(unit.phase.phase * 8 + 1e-9) % 8);
      }
    }
    expect(travelled).toBeGreaterThan(5);
  }
});

test('A real movement stop lands on an authored support pose and resumes from that same phase', async ({ page }) => {
  await startBattle(page);
  await technicalSetup(page, { holdWaves: true });
  await page.keyboard.press('q');
  await page.waitForTimeout(210);
  await page.evaluate(() => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const unit = battle.playerUnits.getChildren().find((child: any) => child.active);
    // Technical halt of the real movement controller, without setting time or sprite frame.
    unit.setData('speed', 0);
  });
  await page.waitForTimeout(100);
  const stopped = await gaitSamples(page, 10);
  expect(stopped.every(sample => sample[0].x === stopped[0][0].x)).toBe(true);
  expect(stopped.every(sample => sample[0].frame === stopped[0][0].frame)).toBe(true);
  expect(stopped[0][0].gait.doubleSupportFrames).toContain(stopped[0][0].frame);
  await page.evaluate(() => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const unit = battle.playerUnits.getChildren().find((child: any) => child.active);
    unit.setData('speed', unit.unitData.speed);
  });
  const resumed = await gaitSamples(page, 10);
  const first = stopped.at(-1)![0], last = resumed.at(-1)![0];
  expect(last.x).toBeGreaterThan(first.x);
  const expected = (first.phase.phase + (last.x - first.x) / last.gait.cycleDistancePixels) % 1;
  expect(last.phase.phase).toBeCloseTo(expected, 8);
});

for (const speed of [1, 4]) test('The real delayed hit shows the contact pose once at ' + speed + '×', async ({ page }) => {
  await startBattle(page);
  await technicalSetup(page, { holdWaves: true });
  await page.keyboard.press(speed === 1 ? '1' : '3');
  const contacts = await page.evaluate(() => new Promise<any[]>(resolve => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const definition = battle.unitsDatabase.find((unit: any) => unit.id === 'clubman');
    battle.spawnUnitByData('player', definition);
    battle.spawnUnitByData('enemy', definition);
    const player = battle.playerUnits.getChildren().find((unit: any) => unit.active);
    const enemy = battle.enemyUnits.getChildren().find((unit: any) => unit.active);
    for (const [unit, x] of [[player, 530], [enemy, 561]]) {
      unit.setData('formationRow', 1);
      unit.body.reset(x, 500);
      unit.setData('walkPhase', { previousX: x, phase: 0 });
    }
    const previousHp = new Map<any, number>([[player, player.getData('hp')], [enemy, enemy.getData('hp')]]);
    const start = battle.simulationTime, events: any[] = [];
    const observe = () => {
      for (const [victim, attacker] of [[enemy, player], [player, enemy]]) {
        const hp = victim.getData('hp');
        if (hp < previousHp.get(victim)!) events.push({
          elapsed: battle.simulationTime - attacker.getData('lastAttackTime'),
          frame: Number(attacker.frame.name), damage: previousHp.get(victim)! - hp,
          expectedDamage: attacker.getData('damage'), side: attacker.getData('side'),
        });
        previousHp.set(victim, hp);
      }
      if (battle.simulationTime - start >= 600) {
        battle.events.off('postupdate', observe);resolve(events);
      }
    };
    battle.events.on('postupdate', observe);
  }));
  expect(contacts).toHaveLength(2);
  expect(contacts.map(contact => contact.side).sort()).toEqual(['enemy', 'player']);
  for (const contact of contacts) {
    expect(contact.frame).toBe(12);
    expect(contact.elapsed).toBeGreaterThanOrEqual(160);
    expect(contact.elapsed).toBeLessThan(speed === 1 ? 200 : 320);
    expect(contact.damage).toBe(contact.expectedDamage);
  }
});

test('Pool reuse clears a previous gait and attack cancellation without duplicating the scene listener', async ({ page }) => {
  await startBattle(page);
  await technicalSetup(page, { gold: 1000, holdWaves: true });
  await page.keyboard.press('q');
  await page.waitForTimeout(230);
  const reused = await page.evaluate(() => {
    const battle = window.__AGE_OF_MAX__.scene.getScene('BattleScene');
    const old = battle.playerUnits.getChildren().find((unit: any) => unit.active);
    const oldUid = old.getData('uid'), oldPhase = old.getData('walkPhase').phase;
    old.setData('visualAttackCancelledAt', 1234);
    old.setData('attackContactPending', 1234);
    battle.recycleUnit(old);
    battle.spawnUnitByData('player', battle.unitsDatabase.find((unit: any) => unit.id === 'spearman'));
    const unit = battle.playerUnits.getChildren().find((child: any) => child.active);
    return { sameObject: unit === old, oldUid, newUid: unit.getData('uid'), oldPhase,
      phase: unit.getData('walkPhase'), x: unit.x, frame: Number(unit.frame.name),
      attackCancellationCleared: unit.getData('visualAttackCancelledAt') === -Infinity,
      pendingContactCleared: unit.getData('attackContactPending') === null,
      listenerCount: battle.events.listeners('postupdate').filter((listener: any) => listener === battle.updateUnitPresentation).length };
  });
  expect(reused.sameObject).toBe(true);
  expect(reused.newUid).toBeGreaterThan(reused.oldUid);
  expect(reused.oldPhase).toBeGreaterThan(0);
  expect(reused.phase).toEqual({ previousX: reused.x, phase: 0 });
  expect(reused.frame).toBe(0);
  expect(reused.attackCancellationCleared).toBe(true);
  expect(reused.pendingContactCleared).toBe(true);
  expect(reused.listenerCount).toBe(1);
});

test('An incomplete gait catalog blocks loading and the regular reload control recovers', async ({ page }) => {
  const route = '**/assets/reborn/gait-metadata.json';
  await page.route(route, request => request.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, units: {} }),
  }));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() =>
    window.__AGE_OF_MAX__?.scene.getScene('BootScene')?.failed.has('gait-metadata') ?? false)).toBe(true);
  expect(await page.evaluate(() => window.__AGE_OF_MAX__.scene.isActive('MenuScene'))).toBe(false);
  await page.unroute(route);
  await Promise.all([page.waitForEvent('domcontentloaded'), clickGame(page, 640, 436)]);
  await sceneActive(page, 'MenuScene');
  expect(await page.evaluate(() => [...window.__AGE_OF_MAX__.scene.getScene('BootScene').failed])).toEqual([]);
});
