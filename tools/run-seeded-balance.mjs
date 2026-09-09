import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const group = 'seed-matrix-' + new Date().toISOString().replace(/[-:.]/g, '');
const directory = path.join('art/qa', group);
await mkdir(directory, { recursive: true });
const profiles = [{ difficulty: 'medium', mode: 'mixed' }, { difficulty: 'hard', mode: 'mixed' }, { difficulty: 'medium', mode: 'line' }];
const seeds = ['101', '202', '303'];
const runs = [];
async function run(profile, seed, suffix = '') {
  const label = profile.difficulty + '-' + profile.mode + '-' + seed + suffix;
  const report = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/combat-playthrough.mjs'], { cwd: process.cwd(),
      env: { ...process.env, QA_DIFFICULTY: profile.difficulty, QA_MODE: profile.mode, QA_SEED: seed,
        QA_SPEED: '1', QA_ABILITIES: '1', QA_REPORT_GROUP: group }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.once('error', reject);
    child.once('exit', async code => {
      await writeFile(path.join(directory, label + '.log'), stdout + (stderr ? '\nSTDERR:\n' + stderr : ''));
      if (code !== 0) { reject(new Error(label + ' failed: ' + stderr)); return; }
      try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); }
    });
  });
  if (report.errors.length) throw new Error(label + ': runtime errors ' + JSON.stringify(report.errors));
  console.log(JSON.stringify({ label, seconds: +report.relativeSeconds.toFixed(3), winner: report.winner,
    epoch: report.samples.at(-1).epoch, kills: report.kills, recruits: report.recruits,
    minimumBaseFraction: report.minimumBase.player.fraction, meteor: report.meteorCasts, artillery: report.artilleryCasts,
    startTime: report.initial.simulationTime, report: report.artifacts.json }));
  return report;
}
for (const profile of profiles) for (const seed of seeds) runs.push(await run(profile, seed));

// A single extra replay audits the claimed determinism; it is not another strategy sample.
const replay = await run(profiles[0], seeds[0], '-replay');
const comparable = report => {
  const { runId, createdAt, artifacts, ...state } = report;
  return state;
};
const replayMatches = JSON.stringify(comparable(runs[0])) === JSON.stringify(comparable(replay));
const fingerprints = [...new Set(runs.map(report => report.sourceFingerprint))];
const summary = { createdAt: new Date().toISOString(), group, seeds, profiles,
  sourceFingerprints: fingerprints, sameSourceVersion: fingerprints.length === 1,
  replay: { source: runs[0].artifacts.json, repeated: replay.artifacts.json, exactStateMatch: replayMatches },
  runs: runs.map(report => ({
    options: report.options, seconds: report.relativeSeconds, winner: report.winner, endedBy: report.endedBy,
    recruits: report.recruits, recruitsById: report.recruitsById, unitGold: report.goldSpentOnUnits,
    kills: report.kills, finalEpoch: report.samples.at(-1).epoch, finalEnemyEpoch: report.samples.at(-1).enemyEpoch,
    minimumBase: report.minimumBase.player, meteorCasts: report.meteorCasts, artilleryCasts: report.artilleryCasts,
    epochTransitions: report.epochTransitions, blockedOrders: report.blockedOrders, towerAttempts: report.towerAttempts,
    start: report.initial, errors: report.errors, artifact: report.artifacts.json,
  })),
};
await writeFile(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('SUMMARY ' + path.join(directory, 'summary.json'));
console.log('SAME_SOURCE=' + summary.sameSourceVersion + ' EXACT_REPLAY=' + replayMatches);
if (!summary.sameSourceVersion || !replayMatches) process.exitCode = 2;
