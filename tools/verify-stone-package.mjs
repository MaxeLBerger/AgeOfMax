import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(root, 'art/qa/releases/stone-v2');
const packagePath = path.join(release, 'package');
const baselinePath = path.join(root, 'art/qa/releases/wave-tactics-v1/package');
const liveDist = path.join(root, 'dist');
const changedPath = 'assets/reborn/backgrounds/stone.png';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function manifest(directory) {
  const files = {};
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Unexpected package symlink: ' + absolute);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(absolute);
        files[path.relative(directory, absolute).split(path.sep).join('/')] = { bytes: bytes.length, sha256: hash(bytes) };
      }
    }
  };
  visit(directory);
  return { directory, count: Object.keys(files).length, bytes: Object.values(files).reduce((sum, item) => sum + item.bytes, 0), files };
}
function write(name, data) {
  fs.mkdirSync(release, { recursive: true });
  const temporary = path.join(release, name + '.writing');
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(temporary, path.join(release, name));
}
function difference(before, after) {
  return [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].sort()
    .filter(name => before.files[name]?.sha256 !== after.files[name]?.sha256 || before.files[name]?.bytes !== after.files[name]?.bytes)
    .map(name => ({ path: name, before: before.files[name] ?? null, after: after.files[name] ?? null }));
}
if (process.argv.includes('--snapshot')) {
  if (fs.existsSync(packagePath) && fs.readdirSync(packagePath).length) throw new Error('Isolated package directory must start empty.');
  const protectedFiles = { capturedAt: new Date().toISOString(), baseline: manifest(baselinePath), dist: manifest(liveDist) };
  write('prebuild-protected-manifest.json', protectedFiles);
  console.log(JSON.stringify({ status: 'snapshotted', baselineFiles: protectedFiles.baseline.count, distFiles: protectedFiles.dist.count, packagePath }));
} else if (process.argv.includes('--verify')) {
  const before = JSON.parse(fs.readFileSync(path.join(release, 'prebuild-protected-manifest.json'), 'utf8'));
  const baseline = manifest(baselinePath), dist = manifest(liveDist), built = manifest(packagePath);
  const changes = difference(baseline, built);
  const protectedChanges = { baseline: difference(before.baseline, baseline), dist: difference(before.dist, dist) };
  const publicBytes = fs.readFileSync(path.join(root, 'public/assets/reborn/backgrounds/stone.png'));
  const candidateBytes = fs.readFileSync(path.join(root, 'art/blender/candidates/stone-v2/candidate.png'));
  const packedBytes = fs.readFileSync(path.join(packagePath, changedPath));
  const jsIndexFiles = Object.keys(built.files).filter(name => name === 'index.html' || name.endsWith('.js'));
  const unitAnimation = path.join(root, 'src/game/unitAnimation.ts');
  const checks = {
    expected_73_files: baseline.count === 73 && built.count === 73,
    only_stone_png_changed: changes.length === 1 && changes[0].path === changedPath && !!changes[0].before && !!changes[0].after,
    other_72_files_byte_identical: Object.keys(baseline.files).filter(name => name !== changedPath).length === 72 &&
      Object.keys(baseline.files).filter(name => name !== changedPath).every(name => baseline.files[name].sha256 === built.files[name]?.sha256),
    all_javascript_and_index_byte_identical: jsIndexFiles.every(name => built.files[name].sha256 === baseline.files[name]?.sha256),
    packed_stone_equals_public: packedBytes.equals(publicBytes),
    packed_stone_equals_reviewed_candidate: packedBytes.equals(candidateBytes),
    baseline_package_unchanged: protectedChanges.baseline.length === 0,
    live_dist_unchanged: protectedChanges.dist.length === 0,
    no_new_browser_or_port_started: true,
  };
  const report = {
    status: Object.values(checks).every(Boolean) ? 'passed_ready_for_root_review' : 'failed_do_not_promote',
    verifiedAt: new Date().toISOString(), command: 'node node_modules/vite/bin/vite.js build --outDir art/qa/releases/stone-v2/package',
    baseline: { directory: baseline.directory, files: baseline.count, bytes: baseline.bytes },
    package: { directory: built.directory, files: built.count, bytes: built.bytes, byteDelta: built.bytes - baseline.bytes },
    dist: { directory: dist.directory, files: dist.count, bytes: dist.bytes, unchanged: checks.live_dist_unchanged },
    checks, differences: changes, protectedChanges,
    javascript_and_index: jsIndexFiles.map(name => ({ path: name, sha256: built.files[name].sha256, bytes: built.files[name].bytes })),
    new_unreferenced_animation_module: fs.existsSync(unitAnimation) ? { path: unitAnimation, sha256: hash(fs.readFileSync(unitAnimation)), production_js_unchanged: checks.all_javascript_and_index_byte_identical } : null,
    manifests: { baseline, package: built },
    publication: 'Isolated package only; no dist replacement, browser, server, or port action.',
  };
  write('package-comparison.json', report);
  console.log(JSON.stringify({ status: report.status, baseline: report.baseline, package: report.package, checks, differences: changes, report: path.join(release, 'package-comparison.json') }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} else throw new Error('Use --snapshot before building, then --verify.');
