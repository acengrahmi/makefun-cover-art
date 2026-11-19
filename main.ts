// Neon Coast, a gta6-cover-art-01 entry (Node 22, standard library only).
//
// The app lives in this directory's app/ folder: plain static files a desktop
// browser loads offline (app/index.html and its ES modules, the Anton + Pacifico
// fonts vendored under app/fonts, no network request at all). This program is the
// entry's hand-in: it copies app/ and screenshots/ from beside this file into
// /output and writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library. Outside the grader's container, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the folder holding this file; the output folder is the
// grader's /output, or MAKEFUN_OUTPUT_DIR when running it by hand.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Hand in the app exactly as it stands: every static file under app/, then the
// screenshots the maker took of it. The screenshots folder is created even when
// it is empty so the output tree always has the shape the gate expects.
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier is byte for byte what the vendored library writes from the handed-in
// app/ and screenshots/, capped to the scorer's own limits (reference/gate.json):
// its text at most 160 KiB, at most 4 screenshots of at most 256 KiB each, app/ at
// most 993 files and 48 MiB in all, and no path under app/ over 1000 bytes. Those
// caps also keep the whole of /output inside the platform's 1000-entry, 64 MiB
// ceiling that app/, screenshots/ and dossier.json share.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
