// main.ts — hands Ember & Anvil in for best-game-01.
// Node 22, standard library only. It copies game/ and screenshots/ from
// this repository into the output directory and writes /output/dossier.json
// with buildDossier from vendor/makefun-game.ts.
//
// The grader's /output is a mounted volume on a read-only filesystem, so
// this program NEVER deletes the output directory itself: it only clears
// the game/ and screenshots/ subdirectories inside it, then copies in.
// Deleting /output itself fails with EBUSY and would reject the entry.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function clearSubdir(dir: string): void {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
clearSubdir(join(outDir, 'game'));
clearSubdir(join(outDir, 'screenshots'));
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`ember-anvil: dossier.json written (${dossier.length} bytes)`);
