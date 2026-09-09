/**
 * Prepare the complete 16-frame runtime in an isolated source tree.
 * Does not modify live scenes, public assets or dist. Promotion is a separate
 * whole-contract operation after all forty authored sheets are approved.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),stage=path.join(root,'art/blender/candidates/animation-v3/runtime-stage');
if(!stage.startsWith(root+path.sep))throw Error('Stage outside workspace');
await fs.mkdir(stage,{recursive:true});
await fs.cp(path.join(root,'src'),path.join(stage,'src'),{recursive:true});
await fs.cp(path.join(root,'data'),path.join(stage,'data'),{recursive:true});
await fs.cp(path.join(root,'e2e'),path.join(stage,'e2e'),{recursive:true});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const changed=[];
async function edit(file,transform){
 const before=await fs.readFile(path.join(root,file),'utf8');
 const after=transform(before.replaceAll('\r\n','\n'));
 const target=path.join(stage,file);
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target+'.tmp',after);await fs.rename(target+'.tmp',target);
 changed.push({file,beforeSha256:sha(before),stagedSha256:sha(after)});
}
function replace(text,old,next,count=1){
 const parts=text.split(old);
 if(parts.length!==count+1)throw Error('Expected '+count+' occurrences of '+old.slice(0,90)+', found '+(parts.length-1));
 return parts.join(next);
}
await edit('src/scenes/BootScene.ts',text=>{
 text=replace(text,"import unitsData from '../../data/units.json';","import unitsData from '../../data/units.json';\nimport { UNIT_ANIMATION_LAYOUT, parseGaitMetadata } from '../game/unitAnimation';");
 text=replace(text,"    this.load.json('weapon-sockets', 'assets/reborn/weapon-sockets.json');","    this.load.json('weapon-sockets', 'assets/reborn/weapon-sockets.json');\n    this.load.json('gait-metadata', 'assets/reborn/gait-metadata.json');");
 text=replace(text,"    const sockets = this.cache.json.get('weapon-sockets') as Record<string, unknown> | undefined;","    try {\n      this.registry.set('unit-gaits', parseGaitMetadata(this.cache.json.get('gait-metadata')));\n    } catch { this.failed.add('gait-metadata'); }\n    const sockets = this.cache.json.get('weapon-sockets') as Record<string, unknown> | undefined;");
 text=replace(text,'imageSize(key, 2048, 256);','imageSize(key, 256 * UNIT_ANIMATION_LAYOUT.frameCount, 256);');
 text=replace(text,'frame < 8;','frame < UNIT_ANIMATION_LAYOUT.frameCount;');
 text=replace(text,'points.length !== 8','points.length !== UNIT_ANIMATION_LAYOUT.frameCount');
 return text;
});
await edit('src/scenes/BattleScene.ts',text=>{
 text=replace(text,"import { planEnemyWave, type EnemyWavePlan } from '../game/enemyWaves';","import { planEnemyWave, type EnemyWavePlan } from '../game/enemyWaves';\nimport { UNIT_ANIMATION_LAYOUT, advanceWalkPhase, attackFrameAt, resetWalkPhase, scaledCycleDistance,\n  settledWalkPhase, walkFrameAtPhase, type GaitMetadata, type WalkPhaseState } from '../game/unitAnimation';");
 text=replace(text,'  private effects?: BattleEffects;','  private effects?: BattleEffects;\n  private gaitMetadata!: GaitMetadata;');
 text=replace(text,"    this.gameOver = false;\n    this.xp = 0;","    this.gameOver = false;\n    this.gaitMetadata = this.registry.get('unit-gaits') as GaitMetadata;\n    this.xp = 0;");
 text=replace(text,'    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownBattle, this);',
  '    // Arcade writes Body movement back to Sprite.x during its earlier POST_UPDATE listener.\n    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateUnitPresentation, this);\n    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownBattle, this);');
 text=replace(text,'  private shutdownBattle(): void {\n','  private shutdownBattle(): void {\n    this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateUnitPresentation, this);\n');
 text=replace(text,"      unit.setData('attackUntil', 0);","      unit.setData('attackUntil', 0);\n      unit.setData('walkPhase', resetWalkPhase(spawnX));\n      unit.setData('visualAttackCancelledAt', -Infinity);\n      unit.setData('attackContactPending', null);");
 text=replace(text,'this.simulationTime + 320','this.simulationTime + UNIT_ANIMATION_LAYOUT.attackDurationMs',3);
 text=replace(text,'// Attack frames 4–7 use 80ms each: frame 6 is the visible contact.','// Eight attack samples retain the existing 320ms clip and 160ms contact.');
 text=replace(text,'this.time.delayedCall(160,','this.time.delayedCall(UNIT_ANIMATION_LAYOUT.contactDelayMs,',3);
 text=replace(text,'    this.updateAllHealthBars();\n    this.updateUnitPresentation();\n','');
 text=replace(text,'          if (direction * (unit.x - limit) > 0) unit.setPosition(limit, unit.y);',
  "          if (direction * (unit.x - limit) > 0) {\n            unit.setPosition(limit, unit.y);\n            // A spacing correction is a teleport, not a travelled footstep.\n            unit.setData('walkPhase', resetWalkPhase(limit, unit.getData('walkPhase')?.phase || 0));\n          }");
 text=replace(text,'muzzlePoint(sockets, data.id, 6,','muzzlePoint(sockets, data.id, UNIT_ANIMATION_LAYOUT.contactFrame,',2);
 text=replace(text,"      const data = (attacker as GameUnit).unitData!;",
  "      attacker.setData('attackContactPending', attacker.getData('lastAttackTime'));\n      const data = (attacker as GameUnit).unitData!;");
 text=replace(text,"      this.fireUnitProjectile(attacker, target);",
  "      attacker.setData('attackContactPending', attacker.getData('lastAttackTime'));\n      this.fireUnitProjectile(attacker, target);");
 text=replace(text,"      const data = (unit as GameUnit).unitData!;",
  "      unit.setData('attackContactPending', unit.getData('lastAttackTime'));\n      const data = (unit as GameUnit).unitData!;");
 const start=text.indexOf('  private updateUnitPresentation(): void {');
 const end=text.indexOf('  private spawnMuzzleFlash(',start);
 if(start<0||end<0)throw Error('Presentation method missing');
 const method=[
  '  private updateUnitPresentation(): void {',
  '    if (this.gameOver || this.paused) return;',
  '    this.unitShadows.clear();',
  '    for (const group of [this.playerUnits, this.enemyUnits]) {',
  '      for (const child of group.getChildren()) {',
  '        const unit = child as Phaser.Physics.Arcade.Sprite;',
  '        if (!unit.active) continue;',
  "        const gait = this.gaitMetadata.units[unit.getData('unitId')];",
  "        const previous = unit.getData('walkPhase') as WalkPhaseState;",
  '        let phase = advanceWalkPhase(previous, unit.x, scaledCycleDistance(gait, unit.scaleX));',
  '        // A fixed physics step can leave position unchanged on a rendering frame.',
  '        // Keep its walk pose while commanded movement continues; phase still uses distance only.',
  '        const moving = Math.abs(unit.x - previous.previousX) > 1e-6 || Math.abs(unit.body?.velocity.x || 0) > 1e-6;',
  "        const attackStart = unit.getData('lastAttackTime') as number;",
  "        const activeAttack = this.simulationTime < (unit.getData('attackUntil') || 0);",
  "        const contact = unit.getData('attackContactPending') === attackStart;",
  "        if (activeAttack && moving && !unit.getData('inCombat') && !contact) unit.setData('visualAttackCancelledAt', attackStart);",
  "        const attack = activeAttack && unit.getData('visualAttackCancelledAt') !== attackStart;",
  '        let frame: number;',
  '        if (attack || contact) {',
  '          // At 4x, a real contact can occur between 40ms samples: show its authored pose once.',
  '          frame = contact ? UNIT_ANIMATION_LAYOUT.contactFrame : attackFrameAt(this.simulationTime - attackStart)!;',
  '          phase = resetWalkPhase(unit.x);',
  '        } else {',
  '          if (!moving) phase = resetWalkPhase(unit.x, settledWalkPhase(gait, phase.phase));',
  '          frame = walkFrameAtPhase(phase.phase);',
  '        }',
  "        unit.setData('attackContactPending', null);",
  "        unit.setData('walkPhase', phase);",
  '        unit.setFrame(frame);',
  '        unit.setDepth(100 + unit.y - LANE_Y);',
  '        this.unitShadows.fillStyle(0x0a181e, 0.25).fillEllipse(unit.x, unit.y + 1, unit.displayWidth * 0.32, 7);',
  "        this.unitShadows.lineStyle(1.3, unit.getData('side') === 'player' ? 0x85c5bb : 0xd98d7c, 0.7)",
  '          .strokeEllipse(unit.x, unit.y + 2, 25, 6);',
  '      }',
  '    }',
  '    this.updateAllHealthBars();',
  '  }',
  '',
  ''
 ].join('\n');
 text=text.slice(0,start)+method+text.slice(end);
 return text;
});
await edit('vite.config.ts',text=>{
 text=replace(text,"import { resolve } from 'node:path';","import { resolve } from 'node:path';\nimport { parseGaitMetadata, UNIT_ANIMATION_LAYOUT } from './src/game/unitAnimation';");
 text=replace(text,"        'weapon-sockets.json',","        'weapon-sockets.json', 'gait-metadata.json',");
 text=replace(text,"        this.emitFile({ type: 'asset', fileName: 'assets/reborn/' + file, source });",
  "        if (file === 'gait-metadata.json') parseGaitMetadata(JSON.parse(source.toString('utf8')));\n"
  +"        if (file.endsWith('.png')) {\n"
  +"          const expected = file.startsWith('units') ? [256 * UNIT_ANIMATION_LAYOUT.frameCount, 256]\n"
  +"            : file.startsWith('backgrounds') ? [1600, 900] : file.startsWith('bases') ? [512, 512] : [256, 256];\n"
  +"          if (source.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'\n"
  +"            || source.readUInt32BE(16) !== expected[0] || source.readUInt32BE(20) !== expected[1]\n"
  +"            || source.subarray(-12, -4).toString('hex') !== '0000000049454e44')\n"
  +"            throw new Error('The Blender export has an incompatible image contract: ' + path);\n"
  +"        }\n"
  +"        this.emitFile({ type: 'asset', fileName: 'assets/reborn/' + file, source });");
 return text;
});

await edit('e2e/check-assets.ts',text=>{
 text=replace(text,"import { resolve } from 'node:path';","import { resolve } from 'node:path';\nimport { parseGaitMetadata } from '../src/game/unitAnimation';");
 text=replace(text,"    'weapon-sockets.json',","    'weapon-sockets.json', 'gait-metadata.json',");
 text=replace(text,'? [2048, 256]','? [4096, 256]');
 text=replace(text,'sockets[id].length !== 8','sockets[id].length !== 16');
 text=replace(text,'must contain eight finite','must contain sixteen finite');
 text=replace(text,"  const sockets = JSON.parse(","  parseGaitMetadata(JSON.parse(readFileSync(resolve('public/assets/reborn/gait-metadata.json'), 'utf8')));\n  const sockets = JSON.parse(");
 return text;
});
await edit('e2e/menus-assets.spec.ts',text=>{
 text=replace(text,'eight real frames per troop','sixteen real frames per troop');
 text=replace(text,'[2048, 256]','[4096, 256]');
 text=replace(text,'.toHaveLength(8)','.toHaveLength(16)',2);
 text=replace(text,"      sockets: game.cache.json.get('weapon-sockets'),","      sockets: game.cache.json.get('weapon-sockets'),\n      gaits: game.registry.get('unit-gaits'),");
 text=replace(text,'  expect(state.failed).toEqual([]);','  expect(state.failed).toEqual([]);\n  expect(Object.keys(state.gaits.units).sort()).toEqual(units.map(unit => unit.id).sort());\n  expect(state.gaits.contactFrame).toBe(12);');
 return text;
});
await edit('src/__tests__/projectilePresentation.test.ts',text=>{
 text=replace(text,'{ length: 8 }','{ length: 16 }');
 text=replace(text,'frames[6]','frames[12]');
 return replace(text,"'rifleman', 6,","'rifleman', 12,",2);
});
await edit('tools/production-smoke.mjs',text=>replace(text,'assert.equal(files.size, 71,','assert.equal(files.size, 72,'));
await edit('tools/visual-epoch.mjs',text=>replace(text,'unit.setFrame(6);',"unit.setFrame(game.cache.json.get('gait-metadata')?.contactFrame ?? 6);"));
await edit('tools/combat-playthrough.mjs',text=>{
 text=replace(text,"  'public/assets/reborn/weapon-sockets.json', 'tools/combat-playthrough.mjs',",
 "  'public/assets/reborn/weapon-sockets.json', 'public/assets/reborn/gait-metadata.json',\n  'src/game/unitAnimation.ts', 'tools/combat-playthrough.mjs',");
 return text;
});
await edit('tools/blender/render.ps1',text=>replace(text,'[int]$Frames=8,','[int]$Frames=16,'));
await edit('tools/blender/export_scenes.py',text=>replace(text,"choices=[8,16], default=8,","choices=[8,16], default=16,"));
await edit('tools/blender/pack_sheets.py',text=>{
 text=replace(text,"choices=[8,16],default=8,","choices=[8,16],default=16,");
 text=replace(text,'Explicit complete sheet contract; legacy production remains 8 until migration.','Complete sheet contract; use 8 explicitly for an older source set.');
 text=replace(text,"'weaponSockets':'weapon-sockets.json'}","'weaponSockets':'weapon-sockets.json',\n                **({'gaitMetadata':'gait-metadata.json'} if args.frames == 16 else {})}");
 return text;
});
await edit('tools/blender/verify_art.py',text=>{
 text=replace(text,'choices=[8,16],default=8)','choices=[8,16],default=16)');
 return text;
});

const config={extends:path.relative(stage,path.join(root,'tsconfig.json')).replaceAll('\\','/'),include:['src/**/*'],exclude:['src/__tests__/**/*']};
await fs.writeFile(path.join(stage,'tsconfig.json'),JSON.stringify(config,null,2));
await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify({stagedAt:new Date().toISOString(),status:'prepared_only_not_applied',stage,changed,requirements:['All 40 authored 4096x256 sheets approved','20 identical-team gait entries and 20x16 sockets','Source hash guards and whole-contract promotion','Browser motion, stop, contact, pause and restart checks']},null,2));
console.log(JSON.stringify({stage,changed:changed.map(item=>item.file),status:'prepared_only_not_applied'}));
