import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const output = path.join(root, 'art/qa/wave-tactics-v1');
await fs.mkdir(output, { recursive: true });
const sourceFiles = ['src/game/enemyWaves.ts', 'src/game/combatRules.ts', 'data/units.json'];
const fingerprint = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async file =>
  [file, createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const sources = await fingerprint();
const bundled = await build({
  stdin: { contents: "export * from './src/game/enemyWaves'; export { unitRole, waveSize } from './src/game/combatRules';", resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { planEnemyWave, referenceWaveCost, unitRole, waveSize } =
  await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const units = JSON.parse(await fs.readFile('data/units.json', 'utf8'));
const epochs = ['stone', 'castle', 'renaissance', 'modern', 'future'];
const difficulties = ['easy', 'medium', 'hard'];
const byId = new Map(units.map(unit => [unit.id, unit]));
const issues = [], plans = [], identities = [];
const check = (condition, label) => { if (!condition) issues.push(label); };
for (const epoch of epochs) for (const difficulty of difficulties) for (let wave = 1; wave <= 32; wave++) {
  const label = epoch + '/' + difficulty + '/' + wave;
  try {
    const plan = planEnemyWave(wave, difficulty, epoch, units);
    const reversed = planEnemyWave(wave, difficulty, epoch, [...units].reverse());
    const roles = { line: 0, ranged: 0, assault: 0, siege: 0 };
    const counts = {};
    for (const id of plan.unitIds) {
      check(byId.has(id) && byId.get(id)?.epoch === epoch, label + ': invalid troop ' + id);
      roles[unitRole(id)]++;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    const value = plan.unitIds.reduce((sum, id) => sum + byId.get(id).goldCost, 0);
    const front = roles.line + roles.assault;
    check(plan.unitIds.length === waveSize(wave, difficulty), label + ': cardinality');
    check(Number.isFinite(plan.cost) && plan.cost > 0 && plan.cost === value, label + ': actual cost');
    check(Number.isFinite(plan.referenceCost) && plan.referenceCost > 0, label + ': reference cost');
    check(plan.referenceCost === referenceWaveCost(wave, difficulty, epoch, units), label + ': reference mismatch');
    check(value >= plan.referenceCost * 0.92 && value <= plan.referenceCost * 1.08, label + ': budget band');
    check(front >= Math.ceil(plan.unitIds.length * 0.3), label + ': front minimum');
    check(['line', 'assault'].includes(unitRole(plan.unitIds[0])), label + ': first troop must protect support');
    check(Object.keys(counts).length >= 3, label + ': insufficient troop diversity');
    check(plan.roster.every(row => Number.isInteger(row.count) && row.count > 0 && counts[row.id] === row.count)
      && plan.roster.length === Object.keys(counts).length, label + ': announced roster mismatch');
    check(JSON.stringify(plan) === JSON.stringify(reversed), label + ': JSON order changed plan');
    check(Object.isFrozen(plan) && Object.isFrozen(plan.unitIds) && Object.isFrozen(plan.roster)
      && plan.roster.every(Object.isFrozen), label + ': mutable announcement');
    check(epoch !== 'stone' || plan.tactic !== 'siege', label + ': nonexistent stone siege');
    check(plan.tactic !== 'siege' || roles.siege > 0, label + ': siege without siege troops');
    check(plan.tactic !== 'volley' || roles.ranged > 0, label + ': volley without shooters');
    check(plan.tactic !== 'charge' || (epoch === 'modern' ? (counts.tank ?? 0) > 0 : roles.assault > 0),
      label + ': charge without its announced heavy troops');
    plans.push({ difficulty, ...plan, roles, front, costRatio: value / plan.referenceCost });
  } catch (error) { issues.push(label + ': ' + error.message); }
}
// These wave numbers have the same capped troop count and the same legacy budget offset.
// Compare tactical emphasis without confounding it with more soldiers or a larger budget.
for (const epoch of epochs) for (const difficulty of difficulties) {
  const variants = Object.fromEntries(Object.entries({ mixed: 17, charge: 22, siege: 13, volley: 19 })
    .map(([key, number]) => [key, plans.find(plan => plan.epoch === epoch && plan.difficulty === difficulty && plan.number === number)]));
  if (Object.values(variants).some(plan => !plan)) continue;
  const { mixed, charge, siege, volley } = variants;
  const count = (plan, id) => plan.roster.find(row => row.id === id)?.count ?? 0;
  check(Object.values(variants).every(plan => plan.unitIds.length === mixed.unitIds.length && plan.referenceCost === mixed.referenceCost),
    epoch + '/' + difficulty + ': identity comparisons must share count and budget');
  const strength = { mixed: epoch === 'modern' ? count(mixed, 'tank') : mixed.roles.assault,
    charge: epoch === 'modern' ? count(charge, 'tank') : charge.roles.assault };
  check(strength.charge > strength.mixed, epoch + '/' + difficulty + ': charge has no increased heavy presence');
  check(volley.roles.ranged > mixed.roles.ranged, epoch + '/' + difficulty + ': volley has no increased shooter presence');
  if (epoch !== 'stone') check(siege.roles.siege > mixed.roles.siege, epoch + '/' + difficulty + ': siege has no increased siege presence');
  identities.push({ epoch, difficulty, count: mixed.unitIds.length, referenceCost: mixed.referenceCost,
    heavyMixed: strength.mixed, heavyCharge: strength.charge, rangedMixed: mixed.roles.ranged, rangedVolley: volley.roles.ranged,
    siegeMixed: mixed.roles.siege, siegeFocus: epoch === 'stone' ? null : siege.roles.siege });
}
const finalSources = await fingerprint();
check(JSON.stringify(sources) === JSON.stringify(finalSources), 'Sources changed while the audit was running.');
const budgetRange = { minimum: Math.min(...plans.map(plan => plan.costRatio)), maximum: Math.max(...plans.map(plan => plan.costRatio)) };
const report = { createdAt: new Date().toISOString(), scope: 'Pure wave-plan audit; no browser battles, runtime integration, or production writes.',
  expectedPlans: 480, checkedPlans: plans.length, issues, sources, finalSources, budgetRange, identities, plans };
const stamp = report.createdAt.replace(/[-:.]/g, '');
const file = path.join(output, 'plan-audit-' + stamp + '.json');
await fs.writeFile(file, JSON.stringify(report, null, 2));
await fs.writeFile(path.join(output, 'latest.json'), JSON.stringify({ artifact: path.relative(root, file), checkedPlans: plans.length, issues, sources }, null, 2));
const rows = identities.map(row => '| ' + row.epoch + ' | ' + row.difficulty + ' | ' + row.count + ' | ' + row.referenceCost
  + ' | ' + row.heavyMixed + ' → ' + row.heavyCharge + ' | ' + row.rangedMixed + ' → ' + row.rangedVolley
  + ' | ' + row.siegeMixed + ' → ' + (row.siegeFocus ?? 'entfällt') + ' |').join('\n');
const markdown = '# Reiner Wellenplan-Audit\n\n' + report.createdAt + '\n\n' + plans.length + '/480 Pläne, ' + issues.length + ' Beanstandungen. Keine Spielpartie oder Produktionsänderung.\n\n'
  + '| Epoche | Schwierigkeit | Anzahl | Referenzgold | Durchbruch: schwer | Schützen | Belagerung |\n|---|---|---:|---:|---:|---:|---:|\n' + rows
  + '\n\nDie Pfeile vergleichen die jeweilige Taktik mit Mischformation bei gleicher Anzahl und gleichem Budget. Die schwere Moderne-Rolle wird anhand realer Panzer gezählt, andere Epochen anhand der bestehenden assault-Rolle. Alle konkreten Zusammensetzungen und Spawnreihenfolgen stehen in der JSON-Datei.\n\n'
  + (issues.length ? '## Beanstandungen\n\n' + issues.map(issue => '- ' + issue).join('\n') : 'Alle geprüften Planverträge sind erfüllt.') + '\n';
await fs.writeFile(path.join(output, 'plan-audit-' + stamp + '.md'), markdown);
console.log(JSON.stringify({ checkedPlans: plans.length, expectedPlans: 480, issues, budgetRange, identities, artifact: path.relative(root, file) }, null, 2));
if (issues.length || plans.length !== 480) process.exitCode = 1;
