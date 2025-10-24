import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rawData = readFileSync(join(__dirname, '../data/units.json'), 'utf-8');
const unitsData = JSON.parse(rawData.replace(/^\uFEFF/, '')); // Remove BOM if present

interface UnitType {
  id: string;
  name: string;
  epoch: string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  attackSpeed: number;
  goldCost: number;
  type: string;
}

function calculateMetrics(unit: UnitType) {
  const dps = unit.damage / unit.attackSpeed;
  const hpPerGold = unit.hp / unit.goldCost;
  const dpsPerGold = dps / unit.goldCost;
  const effectiveValue = (unit.hp * dps * unit.speed) / (unit.goldCost * unit.attackSpeed);
  
  return { dps, hpPerGold, dpsPerGold, effectiveValue };
}

function balancePass(units: UnitType[]): UnitType[] {
  console.log("\n=== BALANCE PASS ANALYSIS ===\n");
  
  const balanced = units.map((unit) => {
    const old = calculateMetrics(unit);
    
    let newUnit = { ...unit };
    
    const epochMultipliers: Record<string, number> = {
      stone: 1.0,
      castle: 1.4,
      renaissance: 1.8,
      modern: 2.5,
      future: 3.2
    };
    
    const epochMult = epochMultipliers[unit.epoch] || 1.0;
    
    if (unit.type === "ranged") {
      newUnit.hp = Math.round(unit.hp * 0.9);
      newUnit.damage = Math.round(unit.damage * 1.15);
    } else {
      newUnit.hp = Math.round(unit.hp * 1.1);
      newUnit.damage = Math.round(unit.damage * 1.05);
    }
    
    const targetEfficiency = 0.5 * epochMult;
    const currentEfficiency = old.effectiveValue;
    
    if (currentEfficiency < targetEfficiency * 0.8) {
      newUnit.goldCost = Math.round(unit.goldCost * 0.9);
    } else if (currentEfficiency > targetEfficiency * 1.2) {
      newUnit.goldCost = Math.round(unit.goldCost * 1.1);
    }
    
    const newMetrics = calculateMetrics(newUnit);
    
    console.log(`${unit.name.padEnd(20)} | ${unit.epoch.padEnd(12)} | ${unit.type.padEnd(6)}`);
    console.log(`  HP:   ${unit.hp.toString().padEnd(4)} -> ${newUnit.hp.toString().padEnd(4)} | DPS: ${old.dps.toFixed(1).padEnd(5)} -> ${newMetrics.dps.toFixed(1).padEnd(5)}`);
    console.log(`  Cost: ${unit.goldCost.toString().padEnd(4)} -> ${newUnit.goldCost.toString().padEnd(4)} | Eff: ${old.effectiveValue.toFixed(2).padEnd(5)} -> ${newMetrics.effectiveValue.toFixed(2).padEnd(5)}`);
    console.log("");
    
    return newUnit;
  });
  
  return balanced;
}

const balancedUnits = balancePass(unitsData as UnitType[]);

console.log("\n=== SUMMARY TABLE ===\n");
console.log("Unit                 | HP (Old -> New) | DPS (Old -> New) | Cost (Old -> New)");
console.log("---------------------|-----------------|------------------|------------------");

(unitsData as UnitType[]).forEach((old, i) => {
  const newU = balancedUnits[i];
  const oldDPS = (old.damage / old.attackSpeed).toFixed(1);
  const newDPS = (newU.damage / newU.attackSpeed).toFixed(1);
  
  console.log(
    `${old.name.padEnd(20)} | ${old.hp.toString().padEnd(3)} -> ${newU.hp.toString().padEnd(3)}     | ${oldDPS.padEnd(4)} -> ${newDPS.padEnd(4)}    | ${old.goldCost.toString().padEnd(3)} -> ${newU.goldCost.toString().padEnd(3)}`
  );
});

console.log("\n Balance pass complete!");
