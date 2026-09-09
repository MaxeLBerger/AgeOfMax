import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const group = 'seed-after-precision-' + new Date().toISOString().replace(/[-:.]/g, '');
const dir = path.join('art/qa', group);
await mkdir(dir, { recursive: true });
const baselinePath = 'art/qa/seed-matrix-20260909T014354814Z/summary.json';
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const profiles = [{ difficulty: 'medium', mode: 'mixed', speed: '1' }, { difficulty: 'hard', mode: 'mixed', speed: '1' }, { difficulty: 'medium', mode: 'line', speed: '1' }, { difficulty: 'medium', mode: 'mixed', speed: '4' }];
const runs = [];
for (const profile of profiles) {
 const label = profile.difficulty + '-' + profile.mode + '-101-' + profile.speed + 'x';
 const report = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['tools/combat-playthrough.mjs'], { env: { ...process.env, QA_DIFFICULTY: profile.difficulty, QA_MODE: profile.mode, QA_SEED: '101', QA_SPEED: profile.speed, QA_ABILITIES: '1', QA_REPORT_GROUP: group }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => stdout += data); child.stderr.on('data', data => stderr += data);
  child.once('error', reject);
  child.once('exit', async code => {
   await writeFile(path.join(dir, label + '.log'), stdout + (stderr ? '\nSTDERR:\n' + stderr : ''));
   if (code !== 0) return reject(new Error(label + ': ' + stderr));
   try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); }
  });
 });
 if (report.errors.length) throw new Error(label + ': ' + JSON.stringify(report.errors));
 const base = baseline.runs.find(r => r.options.difficulty === profile.difficulty && r.options.mode === profile.mode && r.options.seed === '101');
 const row = { label, seconds: report.relativeSeconds, winner: report.winner, endedBy: report.endedBy, kills: report.kills, recruits: report.recruits, unitGold: report.goldSpentOnUnits, minimumBase: report.minimumBase.player, meteorCasts: report.meteorCasts, artilleryCasts: report.artilleryCasts, finalSample: report.samples.at(-1), sourceFingerprint: report.sourceFingerprint, report: report.artifacts.json, baseline: base ? { seconds: base.seconds, winner: base.winner, kills: base.kills, recruits: base.recruits, minimumBase: base.minimumBase, artifact: base.artifact } : null };
 runs.push(row);
 await writeFile(path.join(dir, 'summary.json'), JSON.stringify({ group, baselinePath, profiles, runs }, null, 2));
 console.log(JSON.stringify(row));
}
console.log('SUMMARY ' + path.join(dir, 'summary.json'));
