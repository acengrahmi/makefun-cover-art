// Neon Coast — gta6-cover-art-01 entry program (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file into
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// kit's starter does — the plumbing is the same, the app is our own.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });

const shotsDir = join(outDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
// Clear stale screenshots from an earlier hand-in so the output only ever
// holds the shots this repository has now.
for (const name of readdirSync(shotsDir)) {
  const target = join(shotsDir, name);
  if (statSync(target).isFile()) rmSync(target);
}
const repoShots = join(repoRoot, 'screenshots');
if (existsSync(repoShots)) {
  for (const name of readdirSync(repoShots)) {
    const src = join(repoShots, name);
    if (statSync(src).isFile() && /\.(png|jpe?g)$/i.test(name)) {
      cpSync(src, join(shotsDir, name));
    }
  }
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Small self-check so a broken hand-in fails loudly instead of silently:
// the dossier must exist and the two things the gate reads first — the app
// entry point and at least one screenshot — must be in place.
const dossierPath = join(outDir, 'dossier.json');
if (!existsSync(dossierPath) || !existsSync(join(outDir, 'app', 'index.html'))) {
  throw new Error('hand-in incomplete: dossier.json or app/index.html missing');
}
const shotCount = readdirSync(shotsDir).filter((n) => /\.(png|jpe?g)$/i.test(n)).length;
if (shotCount < 3) throw new Error(`hand-in incomplete: only ${shotCount} screenshot(s)`);
console.log(`Neon Coast handed in: ${shotCount} screenshot(s), dossier at ${dossierPath}`);
