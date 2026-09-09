import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGaitMetadata, UNIT_ANIMATION_LAYOUT } from './src/game/unitAnimation';

/** Ship only files consumed by BootScene; Blender sources and intermediate frames stay local. */
function runtimeArt(): Plugin {
  return {
    name: 'age-of-max-runtime-art',
    apply: 'build',
    generateBundle() {
      const units = JSON.parse(readFileSync(resolve('data/units.json'), 'utf8')) as Array<{ id: string }>;
      const epochs = JSON.parse(readFileSync(resolve('data/epochs.json'), 'utf8')) as Array<{ id: string }>;
      const files = [
        ...units.flatMap(unit => ['units/' + unit.id + '.png', 'units-enemy/' + unit.id + '.png']),
        ...epochs.flatMap(epoch => ['backgrounds/' + epoch.id + '.png', 'bases/' + epoch.id + '.png', 'bases-enemy/' + epoch.id + '.png',
          ...[1, 2, 3].map(tower => 'towers/' + epoch.id + '-' + tower + '.png')]),
        'weapon-sockets.json', 'gait-metadata.json',
      ];
      for (const file of files) {
        const path = resolve('public/assets/reborn', file);
        let source: Buffer;
        try { source = readFileSync(path); }
        catch { throw new Error('The Blender export is incomplete: ' + path); }
        if (source.length < 100) throw new Error('The Blender export is empty: ' + path);
        if (file === 'gait-metadata.json') parseGaitMetadata(JSON.parse(source.toString('utf8')));
        if (file.endsWith('.png')) {
          const expected = file.startsWith('units') ? [256 * UNIT_ANIMATION_LAYOUT.frameCount, 256]
            : file.startsWith('backgrounds') ? [1600, 900] : file.startsWith('bases') ? [512, 512] : [256, 256];
          if (source.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
            || source.readUInt32BE(16) !== expected[0] || source.readUInt32BE(20) !== expected[1]
            || source.subarray(-12, -4).toString('hex') !== '0000000049454e44')
            throw new Error('The Blender export has an incompatible image contract: ' + path);
        }
        this.emitFile({ type: 'asset', fileName: 'assets/reborn/' + file, source });
      }
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  // Preserve the project's existing deployment path.
  base: mode === 'production' ? '/AgeOfMax/' : '/',
  // Dev still serves live exports. Production explicitly emits its complete runtime contract.
  publicDir: command === 'build' ? false : 'public',
  plugins: [runtimeArt()],
  resolve: { preserveSymlinks: true },
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: mode !== 'production',
  },
}));
