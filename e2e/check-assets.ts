import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/** Do not launch an incomplete art build into a misleading wall of browser failures. */
export default function checkAssets(): void {
  const units: Array<{ id: string }> = JSON.parse(readFileSync(resolve('data/units.json'), 'utf8'));
  const epochs: Array<{ id: string }> = JSON.parse(readFileSync(resolve('data/epochs.json'), 'utf8'));
  const required = [
    ...units.flatMap(unit => ['units/' + unit.id + '.png', 'units-enemy/' + unit.id + '.png']),
    ...epochs.flatMap(epoch => ['backgrounds/' + epoch.id + '.png', 'bases/' + epoch.id + '.png', 'bases-enemy/' + epoch.id + '.png',
      ...[1, 2, 3].map(tower => 'towers/' + epoch.id + '-' + tower + '.png')]),
    'weapon-sockets.json',
  ];
  const missing = required.filter(file => {
    try { return statSync(resolve('public/assets/reborn', file)).size < 100; }
    catch { return true; }
  });
  if (missing.length) throw new Error('Blender assets are incomplete (' + missing.length + '/' + required.length
    + '). Finish the render/export before browser QA.\n' + missing.join('\n'));
  // Validate actual PNG headers and complete trailers independently of the art manifest.
  for (const file of required.filter(file => file.endsWith('.png'))) {
    const png = readFileSync(resolve('public/assets/reborn', file));
    const expected = file.startsWith('units') ? [2048, 256] : file.startsWith('backgrounds') ? [1600, 900] : file.startsWith('bases') ? [512, 512] : [256, 256];
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      || png.readUInt32BE(16) !== expected[0] || png.readUInt32BE(20) !== expected[1]
      || png.subarray(-12, -4).toString('hex') !== '0000000049454e44') {
      throw new Error(file + ' must be a complete ' + expected.join('×') + ' PNG.');
    }
  }
  const sockets = JSON.parse(readFileSync(resolve('public/assets/reborn/weapon-sockets.json'), 'utf8')) as Record<string, number[][]>;
  for (const { id } of units) {
    if (!Array.isArray(sockets[id]) || sockets[id].length !== 8
      || sockets[id].some(point => !Array.isArray(point) || point.length !== 2 || point.some(value => !Number.isFinite(value)))) {
      throw new Error('weapon-sockets.json must contain eight finite [x, y] points for ' + id + '.');
    }
    if (readFileSync(resolve('public/assets/reborn/units', id + '.png'))
      .equals(readFileSync(resolve('public/assets/reborn/units-enemy', id + '.png')))) {
      throw new Error(id + ' needs a distinct enemy material render.');
    }
  }
}
