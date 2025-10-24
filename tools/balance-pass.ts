import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Unit = {
  id: string;
  name: string;
  epoch: 'stone' | 'castle' | 'renaissance' | 'modern' | 'future';
  hp: number;
  damage: number;
  speed: number;
  range: number;
  attackSpeed: number;
  goldCost: number;
  type: 'melee' | 'ranged';
};

type Epoch = {
  id: string;
  name: string;
  xpToNext: number;
  unlocks: { units: string[]; turrets: string[] };
};

const ROOT = path.join(__dirname, '..');
const unitsPath = path.join(ROOT, 'data', 'units.json');
const epochsPath = path.join(ROOT, 'data', 'epochs.json');

const round = (n: number) => Math.round(n);
const dps = (u: Unit) => +(u.damage / u.attackSpeed).toFixed(2);

function loadJson<T>(p: string): T {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function saveJson<T>(p: string, data: T) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function run() {
  const unitsOld: Unit[] = loadJson(unitsPath);
  const epochs: Epoch[] = loadJson(epochsPath);

  // Safety check: Detect if already applied
  const clubman = unitsOld.find(u => u.id === 'clubman');
  const slinger = unitsOld.find(u => u.id === 'slinger');
  
  if (clubman && clubman.hp > 80) {
    console.log('\n⚠️  WARNING: Balance pass appears to already be applied!');
    console.log(`   Clubman HP is ${clubman.hp} (expected 80 for fresh run)`);
    console.log('   Run aborted to prevent double-application.\n');
    console.log('To reset: Restore original units.json from backup or git.\n');
    return;
  }
  
  if (slinger && slinger.damage < 12) {
    console.log('\n⚠️  WARNING: Balance pass appears to already be applied!');
    console.log(`   Slinger Damage is ${slinger.damage} (expected 12 for fresh run)`);
    console.log('   Run aborted to prevent double-application.\n');
    console.log('To reset: Restore original units.json from backup or git.\n');
    return;
  }

  const unitsNew: Unit[] = unitsOld.map(u => ({ ...u }));

  console.log('\n=== Balance Pass: Applying Rules ===\n');

  // Rule 1: Stone melee units: HP +20%
  let stoneChanges = 0;
  for (const u of unitsNew) {
    if (u.epoch === 'stone' && u.type === 'melee') {
      const oldHP = u.hp;
      u.hp = round(u.hp * 1.2);
      console.log(`Stone Melee: ${u.name} HP ${oldHP} -> ${u.hp} (+20%)`);
      stoneChanges++;
    }
  }
  console.log(`Applied: ${stoneChanges} stone melee units buffed\n`);

  // Rule 2: Ranged units: DPS -10% (reduce damage)
  let rangedChanges = 0;
  for (const u of unitsNew) {
    if (u.type === 'ranged') {
      const oldDmg = u.damage;
      u.damage = Math.max(1, round(u.damage * 0.9));
      console.log(`Ranged: ${u.name} Damage ${oldDmg} -> ${u.damage} (-10%)`);
      rangedChanges++;
    }
  }
  console.log(`Applied: ${rangedChanges} ranged units nerfed\n`);

  // Rule 3: XP Thresholds per epoch: 200/400/800/1500/0
  const xpMap: Record<string, number> = {
    stone: 200,
    castle: 400,
    renaissance: 800,
    modern: 1500,
    future: 0,
  };
  
  console.log('XP Thresholds updated:');
  for (const e of epochs) {
    const id = e.id.toLowerCase();
    if (xpMap[id] !== undefined) {
      const oldXP = e.xpToNext;
      e.xpToNext = xpMap[id];
      console.log(`  ${e.name}: ${oldXP} -> ${e.xpToNext}`);
    }
  }

  // Save changes
  saveJson(unitsPath, unitsNew);
  saveJson(epochsPath, epochs);

  // Diff table
  const rows = unitsOld.map((oldU) => {
    const nu = unitsNew.find(n => n.id === oldU.id)!;
    return {
      unit: oldU.name,
      epoch: oldU.epoch,
      type: oldU.type,
      oldHP: oldU.hp,
      newHP: nu.hp,
      oldDPS: dps(oldU),
      newDPS: dps(nu),
      cost: oldU.goldCost,
    };
  });

  console.log('\n=== Balance Pass Result (Units) ===');
  console.table(rows);

  console.log('\n=== XP Thresholds (epochs.json) ===');
  console.table(
    epochs.map(e => ({ epoch: e.name, xpToNext: e.xpToNext }))
  );

  console.log('\n Balance pass complete! Files updated:');
  console.log('  - data/units.json');
  console.log('  - data/epochs.json');
  console.log('\nNote: Gold tick rate must be set to 8/s in BattleScene.ts');
}

run();
