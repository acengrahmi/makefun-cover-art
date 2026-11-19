# Neon Coast — build report (v3, gta6-cover-art-01)

Fresh build written in this session only. Nothing was read from, copied
from, or reproduced from the v1/v2 build directories; all app code below was
written from the competition spec in this session.

## What it is

"Neon Coast", a fully offline GTA 6-style cover maker (`app/`, static files,
zero network requests). Six layouts (Hero, Split, Duo, Grid, Collage,
Snapshots tilted polaroids), per-panel photo placement with drag-to-pan and
scroll/slider zoom, "Fill all panels", six Vice City colour grades as
per-panel duotone gradient maps on canvas (Neon Sunset, Vice Teal, Halftone
Pop with posterize + comic halftone dots, Mono Noir, Palm Gold, Palm Dusk)
plus seeded film grain and vignette, and poster lettering: condensed
gradient title with white outline (auto-fits so it never hits the badge),
glowing neon script subtitle, gold badge pill, five-star row. One-click PNG
export in 1080x1080, 1080x1350, 1920x1080, or all three. No Rockstar logo,
artwork or font; lettering uses system condensed/script font stacks. The two
kit sample photos ship as defaults.

## Files

- `README.md` — live make.fun badges (competition, rank, reward for
  acengrahmi/makefun-cover-art) + bounty link, written first and never edited.
- `app/index.html`, `app/style.css` — editor chrome (dark neon theme).
- `app/src/render.js` — cover engine: `layoutFrames`, grade LUTs, halftone,
  grain, vignette, polaroid frames, title band, `drawCover`,
  `exportCoverPng`.
- `app/src/editor.js` — state, photo tray, layout/grade chips, panel
  picking, drag pan, wheel zoom, upload, export, `window.__neon` test hook.
- `app/src/shots.js` — `?shot=cover` / `?shot=editor` scenes.
- `app/samples/pier.jpg`, `app/samples/boulevard.jpg` — kit samples.
- `main.ts` — hand-in program (written in 4 messages: initial write + 3
  edits), copies `app/` + `screenshots/`, writes `dossier.json`, self-checks
  the hand-in and clears stale screenshots.
- `shots.json` — the 4 screenshot scenes.
- `serve.ts`, `vendor/makefun-app.ts`, `LICENSE` — kit files, unchanged.

## Validation (all run in-session, headless Chromium via CDP)

- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` succeeds; run twice
  into `out/` and `out2/` → `dossier.json` byte-identical.
  - dossier: 776,092 bytes (cap 1,500,000), sha256
    `ebedf071ddb97a5754cf687133484e07d2451091255b1dfcfb4d44fb343d6b74`
  - total `/output`: 1,483,959 bytes; app/ 7 files.
- Network: every request across all 4 scenes + the plain editor page was to
  127.0.0.1 only (page, CSS, 3 JS modules, 2 sample photos) — zero external
  requests. Console errors: 0 on every scene.
- Export: `window.__neon.exportPngDataUrl(1080,1080)` returned a real PNG
  (magic bytes verified), 1080x1080, 2,292,429 bytes; visually identical to
  the preview (checked the saved PNG).
- Screenshots (all generated in-session via `?shot=` + headless Chromium,
  JPEG q72), each ≤ 256 KiB, long side ≤ 1280, short side ≥ 480:
  - `1-cover.jpg` 1280x720, 117,247 B — exported wide cover, Collage,
    Neon Sunset, "Sunset Heist".
  - `2-editor.jpg` 1280x720, 97,918 B — editor, both samples loaded,
    Collage selected.
  - `3-cover.jpg` 1024x1280, 222,892 B — exported portrait cover, Grid 4,
    Halftone Pop, "Boulevard Queen".
  - `4-cover.jpg` 1080x1080, 115,487 B — exported square cover, tilted
    Snapshots, Vice Teal, "Neon Nights".

## Defects found and fixed (viewed every screenshot, iterated)

1. Badge pill overlapped long titles ("BOULEVARD QUEEN") — added title
   auto-fit (shrink until width ≤ 58% of the band when a badge is present).
2. Cover shots repeated one photo in every small panel — shot scenes now
   alternate the two sample photos across slots.
3. Tilted Snapshots polaroids clipped at the canvas edges — narrowed frames
   to 33% width, reduced rotations (-0.09 / 0.02 / 0.08).
4. `3-cover.jpg` was 300,381 B at JPEG q82, over the 256 KiB cap — re-shot
   at q72 (222,892 B).
5. My own title auto-fit edit briefly declared `titlePx` twice
   (SyntaxError, caught by the headless run before any screenshot was
   kept) — removed the duplicate declaration; re-verified clean.

## Not done by this build (parent's job)

No `makefun.mjs` record/bundle/submit command was run, nothing was pushed,
GitHub was not touched. The live recording was left running.
