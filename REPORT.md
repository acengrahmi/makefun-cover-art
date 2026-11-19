# REPORT — Neon Coast: GTA-style Cover Studio (gta6-cover-art-01)

## What was built

A multi-panel GTA 6-style cover maker (`app/`, fully offline, no network requests):

- **6 layouts** — Hero (1 photo), Split (2), Duo (2 stacked), Grid (4), Collage
  (5: hero + 4 small), Snapshots (3 tilted polaroid frames). Title block at the
  foot, or at the top for the tilted layout.
- **Per-panel photo control** — upload several photos, click a panel to place a
  photo, drag to pan, scroll / slider to zoom, "Fill all panels" reuse.
  Two free kit sample photos ship as defaults.
- **6 Vice City grades** — Neon Sunset, Vice Teal, Halftone Pop (posterize +
  comic halftone dots), Mono Noir, Palm Gold, Palm Dusk; each a duotone gradient
  map applied per panel on canvas, plus film grain + vignette.
- **Poster lettering** — Anton condensed title (sunset gradient fill, white
  outline), glowing Pacifico neon script subtitle, gold badge pill, 5-star row.
  All original: no Rockstar logo, artwork or fonts (Anton + Pacifico vendored
  under the SIL OFL).
- **One-click PNG export** — 1080 × 1080, 1080 × 1350, 1920 × 1080, or all three
  at once. `?shot=` scenes drive the screenshots.

## Validation

- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` — succeeds; `out/`
  holds `app/`, `screenshots/`, `dossier.json` (1,064,755 bytes, under the
  1.5 MiB cap). Two runs produce byte-identical `dossier.json` (sha256
  `7d6f929b…eccf6`) and identical trees.
- Headless-Chromium check: page loads with **zero external requests**; switching
  layout/grade/size redraws cleanly; clicking Export downloads a real PNG
  `vice-city-nights-1080x1350.png` (3,422,650 bytes, valid PNG header,
  1080 × 1350).
- Gate limits: app/ 10 files / 660,276 bytes (cap 993 files / 48 MiB);
  screenshots 4 files, each ≤ 256 KiB, long side ≤ 1280, short side ≥ 480.

## Iteration (round 1 → round 2)

First screenshots showed two title-block defects, both fixed and re-shot:

1. The badge pill and star row landed **on top of the title** in the bottom-zone
   covers — fixed by fitting the title first and stacking badge + stars off its
   real size.
2. The top-zone title in the tilted layout was **clipped at the top edge**
   (baseline too high) and its subtitle rendered off-screen — fixed by baselining
   the title below the top margin and moving the subtitle under the title.
   Tilted panels were also enlarged (0.52 → 0.58 height) to fill the empty
   orange foot.

## Screenshots

- `1-cover.jpg` (1280 × 720, 168,502 B) — exported wide cover, Collage 5-panel,
  Neon Sunset, "VICE CITY NIGHTS".
- `2-editor.jpg` (1280 × 720, 137,218 B) — editor with both sample photos
  loaded, Collage layout selected, live preview with selected-panel outline.
- `3-cover.jpg` (1024 × 1280, 243,371 B) — exported portrait cover, Grid 4,
  Halftone Pop, "PIER PRESSURE".
- `4-cover.jpg` (1080 × 1080, 219,986 B) — exported square cover, tilted
  Snapshots, Vice Teal, "NIGHT SHIFT".

## Notes for the parent

- `main.ts` rewritten in 3 separate writes; `vendor/makefun-app.ts` untouched.
- Do NOT push / create the GitHub repo / submit from here — parent handles that.
- Leader gap addressed: 5-panel + 4-grid multi-photo covers, halftone grade,
  and all three post sizes, matching the leaders' feature set.
