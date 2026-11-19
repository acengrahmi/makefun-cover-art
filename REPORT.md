# REPORT — Neon Coast (gta6-cover-art-01, v4 build)

Fresh from-scratch build of the "Neon Coast" GTA 6 cover maker. All app code
was written in this session; no file from any earlier build (v1/v2/v3) was
read, opened or copied. Entry commit: `72fb8d512167b18d431d23c7685aa8adbb944fc2`
("make.fun entry: gta6-cover-art-01").

## What was built

- `app/index.html` + `app/style.css` — dark neon editor: photo tray, layout
  and grade pickers, title/subtitle/badge/stars controls, size selector,
  zoom slider, export buttons, live preview canvas.
- `app/src/grades.js` — 6 duotone gradient-map grades (Neon Sunset, Vice
  Teal, Halftone Pop with comic dot overlay, Mono Noir, Palm Gold, Palm
  Dusk), per-pixel gradient mapping with an S-curve, deterministic seeded
  film grain.
- `app/src/layouts.js` — 6 layouts (Hero, Split, Duo, Grid, Collage 5-panel,
  tilted polaroid Snapshots) as pixel geometry plus the title-band placement
  (foot, or top for Snapshots).
- `app/src/cover.js` — canvas renderer: cover-fit photo per panel with
  zoom/pan, grade at capped working size, halftone overlay, white gutters /
  polaroid cards, sunset-gradient condensed title with white keyline, glowing
  neon script subtitle, gold badge pill, five-star row, grain + vignette.
- `app/src/editor.js` — upload (multiple files, stays on machine), click a
  photo then a panel to place it, drag to pan, scroll to zoom, Fill all
  panels, PNG export at 1080x1080 / 1080x1350 / 1920x1080 / all three,
  `?shot=` scenes and `?diag=1` diagnostics.
- `app/src/main.js` — boot.
- `main.ts` — written in 3 separate messages (write + 2 appends); copies
  app/ + screenshots/ and writes dossier.json via vendor/makefun-app.ts
  (kept byte-for-byte, untouched). Starter LICENSE (MIT, SPDX line) kept.
- `README.md` — written once, final form, carries the three live make.fun
  badges (competition, rank, reward for acengrahmi/makefun-cover-art) plus
  the bounty link. No shields.io, no placeholders.
- `shots.json` — 4 scenes matching the screenshots.

## Validation evidence

- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` succeeds; `out/`
  holds app/, screenshots/, dossier.json; total 2,109,841 bytes (cap 64 MiB).
- Dossier: 1,132,946 bytes (cap 1.5 MiB),
  sha256 `6067a0a0be7933e8d698a65e7ef34a3533689959426bfb4bcbfc16dc22aef8f5`.
  Two runs produce byte-identical dossier.json (same sha256) — deterministic.
- Headless Chromium (Playwright headless shell, CDP driver written for this
  build): page loads with **0 external requests** (8 local resources only);
  `?diag=1` export check: PNG signature OK, 1,300,121 bytes at 1080x1080.
- Interactive check via CDP: clicking Grid layout + Halftone grade redraws
  (preview pixels change), size switch to 1920x1080 resizes the preview
  canvas to 900x506, title input updates, tray holds 2 sample photos,
  zero page exceptions.
- Screenshots (all generated in-session from the app's `?shot=` scenes):

  | file | size | dims | scene |
  |---|---|---|---|
  | screenshots/1-cover.jpg | 226,081 B | 1280x720 | exported wide cover, Collage, Neon Sunset |
  | screenshots/2-editor.jpg | 173,825 B | 1280x720 | editor, both samples loaded, Collage |
  | screenshots/3-cover.jpg | 244,041 B | 1024x1280 | exported portrait cover, Grid, Halftone Pop |
  | screenshots/4-cover.jpg | 171,835 B | 1080x1080 | exported square cover, Snapshots, Vice Teal |

  All ≤ 256 KiB, long side ≤ 1280, short side ≥ 480. First by name is the cover.

## Defects found and fixed (iterate step)

1. **Blank preview** — first screenshots showed an empty canvas. Root cause:
   `titleBand()` in layouts.js returned fractions (0..1) while `panelRects()`
   and `paintTitleBlock()` treated them as pixels, giving panels a negative
   height. Fixed `titleBand()` to return pixels; verified by pixel probes
   (hero panel then read sunset orange [253,164,86]).
2. **Title hidden behind the badge** — "NEON COAST" / "PALM HEIST" ran under
   the gold badge pill at small sizes. Fixed by measuring the badge first and
   centring the title in the space the badge leaves free.
3. **Selection outline leaking into cover shots** — `startStudio()` redrew
   the editor preview (with the gold selection dashes) after a `?shot=cover`
   scene had painted the export canvas. Fixed: return early when a shot scene
   ran. Cover shots are now clean; the editor shot keeps the outline as the
   interactive affordance.
4. **Two screenshots over the 256 KiB cap** (3-cover 413,911 B, 4-cover
   296,635 B) — re-encoded at JPEG quality 70/75; now 244,041 B and 171,835 B.

## Not done by this build (parent's job)

No `record`/`bundle`/`submit` command was run, no GitHub push, no recording
stop. The recording (01a1f3c6-0b10-7119-a82b-81643ea73cfd) was left running.
