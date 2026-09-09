import { connectToManualPage } from './qa-browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const { page } = await connectToManualPage();
const commands = JSON.parse(process.argv[2] || '[]');
for (const action of commands) {
  if (action.key) { await page.keyboard.press(action.key, { delay: 60 }); await page.waitForTimeout(100); }
  if (action.click) { await page.mouse.click(...action.click); await page.waitForTimeout(100); }
  if (action.wait) await page.waitForTimeout(action.wait);
  if (action.reload) await page.reload({ waitUntil: 'networkidle' });
  if (action.capture) {
    const filename = path.basename(action.capture);
    await page.screenshot({ path: 'art/qa/' + filename });
  }
}
const state = await page.evaluate(() => {
  const game = window.__AGE_OF_MAX__;
  if (!game) return { ready: false };
  const scenes = game.scene.getScenes(true).map(scene => scene.sys.settings.key);
  const battle = game.scene.getScene('BattleScene');
  if (!battle?.scene.isActive()) return { scenes, failed: [...game.scene.getScene('BootScene').failed] };
  const units = group => group.getChildren().filter(x => x.active).map(x => ({
    uid:x.getData('uid'), id:x.getData('unitId'), hp:x.getData('hp'), x:Math.round(x.x), y:Math.round(x.y), texture:x.texture.key,
  }));
  return { scenes, time:Math.round(battle.simulationTime), gold:battle.gold, xp:battle.xp,
    epoch:battle.currentEpochIndex, enemyEpoch:battle.enemyEpochIndex, wave:battle.waveNumber, phase:battle.wavePhase,
    hp:battle.playerBase.hp, enemyHp:battle.enemyBase.hp, paused:battle.paused, over:battle.gameOver,
    kills:battle.kills, speed:battle.simulationSpeed, player:units(battle.playerUnits), enemy:units(battle.enemyUnits),
    wavePlan:battle.wavePlan, attempted:battle.waveSpawned, arrived:battle.waveArrived,
    scoutVisible:game.scene.getScene('UIScene').scout?.visible,
    towers:battle.turretGrid.flat().map(t => ({id:t.turretData?.id,level:t.level,x:t.x,y:t.y})),
    framesPerSecond:Math.round(game.loop.actualFps) };
});
await fs.appendFile('art/qa/manual-playthrough.jsonl', JSON.stringify({ at:new Date().toISOString(), commands, state })+'\n');
console.log(JSON.stringify(state));
process.exit(0);
