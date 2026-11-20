// Panel Heat — Vice Cover Studio: the hand-in program for the gta6-cover-art-01 entry.
//
// The app itself is the static site under app/ (open app/index.html in a desktop browser; it
// runs fully offline and never uploads a photo). This program's one job is to hand that app
// in exactly the way the bounty asks: copy app/ and screenshots/ into the output directory
// and write dossier.json there with the kit's vendored buildDossier library, at the scorer's
// own caps, so the dossier the judge reads is byte for byte the one the gate rebuilds.
//
// Run it locally the same way the grader does, with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// It prints a one-line summary of what it handed in and refuses (exit 1) when the entry is
// incomplete, rather than handing in a broken dossier quietly.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps (reference/gate.json), passed to buildDossier unchanged: the text cap
// shapes the dossier bytes, and the rest refuse anything the scorer itself would refuse.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function countTreeBytes(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const inner = countTreeBytes(path);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}

function listScreenshotNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.') && /\.(png|jpe?g)$/i.test(name))
    .sort();
}

function handIn(): void {
  const appDir = join(repoDir, 'app');
  const shotsDir = join(repoDir, 'screenshots');
  const shotNames = listScreenshotNames(shotsDir);
  if (!existsSync(join(appDir, 'index.html'))) throw new Error('app/index.html is missing');
  if (shotNames.length < 3 || shotNames.length > 4) {
    throw new Error(`screenshots/ must hold 3 or 4 images, found ${shotNames.length}`);
  }
  for (const name of shotNames) {
    const { size } = statSync(join(shotsDir, name));
    if (size > DOSSIER_CAPS.screenshots.max_bytes) {
      throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB gate cap`);
    }
  }

  mkdirSync(outputDir, { recursive: true });
  cpSync(appDir, join(outputDir, 'app'), { recursive: true });
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  const dossierBytes = Buffer.byteLength(dossier);
  if (dossierBytes > 1572864) {
    throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB gate cap`);
  }
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  const appTotals = countTreeBytes(join(outputDir, 'app'));
  console.log(
    `panel-heat: handed in ${appTotals.files} app files (${appTotals.bytes} bytes), ` +
      `${shotNames.length} screenshots (${shotNames.join(', ')}), ` +
      `dossier ${dossierBytes} bytes -> ${outputDir}`,
  );
}

handIn();
