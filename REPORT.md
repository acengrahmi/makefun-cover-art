# Panel Heat — Vice Cover Studio (gta6-cover-art-01, v5 build report)

## What was built

An offline browser app that turns a person's own photos plus a caption into GTA-style
multi-panel cover art, exported as PNG. No network requests anywhere; photos are read
locally and never leave the device. Entry point `main.ts` (hand-written for this entry)
copies `app/` + `screenshots/` to the output directory and writes `dossier.json` through
the kit's unmodified `vendor/makefun-app.ts`, with extra in-program gate validation
(screenshot count and per-file byte caps, dossier size cap).

App structure (`app/`):

- `src/grade.js` — the poster colour pipeline: per-pixel contrast/saturation, then a
  gradient-map blend from one of five ramps (Vice Sunset, Neon Night, Golden Hour,
  Teal Pop, Noir Heat) or Natural+; an optional posterised *ink* mode (7 luminance
  bands); a print finish of halftone dots, film grain and vignette.
- `src/panels.js` — four layouts as polygon geometry in unit space: **Vice Nine**
  (9 panels, one diagonal cut), **Hero & Strip** (big slanted hero + three stacked),
  **Tilted Snaps** (three rotated snapshots, drawn specially), **Full Bleed** (edge to
  edge + corner inset). Per-panel photo assignment, pan and zoom state.
- `src/lettering.js` — all-original drawn furniture: sunset-gradient condensed title
  (Anton, vendored under OFL), neon script subtitle (Pacifico, OFL), five-star heat
  meter, caption bar, circular studio badge, retro sun disc and palm silhouettes.
- `src/cover.js` — composition: panel clipping and cover-fit drawing, painted sunset
  backdrop for the tilted layout, furniture placement, three export sizes
  (1080×1080, 1080×1350, 1920×1080).
- `src/main.js` — the editor: drag-and-drop / file-picker photo intake, sample tray,
  click-a-panel then drag to reposition and scroll to zoom, layout/grade/size pickers,
  title/subtitle/caption fields, heat slider, one-click export of one size or all
  three, and the `?shot=` screenshot mode used to produce `screenshots/`.
- Five sample photos ship with the app: the kit's two CC0 samples plus three
  image-model-generated Vice-style photos (convertible, rooftop, neon diner), so the
  opening composition is a full nine-panel cover before the user adds anything.

## Judging criteria targeted

1. **The art** — the dossier's top image is a wide nine-panel cover in the Vice Sunset
   grade: teal-to-salmon gradient map, halftone print texture, giant gradient title
   with keyline, neon script subtitle, star meter, caption bar and badge. Two further
   cover shots show the Hero layout in Golden Hour and the Tilted Snaps layout in Neon
   Night, so the sheet demonstrates range, not one lucky render.
2. **Works with any photo** — the pipeline is photo-agnostic (luminance-based grades,
   cover-fit with drag/zoom per panel, defaults that compose well untouched), which is
   what the human finalist review exercises with their own photo.
3. **Fast and easy** — five samples preloaded into a finished cover on first paint;
   drop photos, click a panel, type, export. Export-all writes all three sizes in one
   click.
4. **Polish** — dark neon editor UI with a live preview, selection outline on the
   active panel, sensible framing hints per layout so faces are not cropped by
   default, deterministic hand-in.

## Visual iterations

- **Round 1** (headless Chromium screenshots of the cover and editor): composition and
  grade worked, but at 1920×1080 the title's cap height ran off the top edge (baseline
  was a fixed fraction of height); the halftone was slightly heavy; the top-left
  panel cropped its subject's face.
  → Title is now fitted first and its baseline anchored to the fitted size; halftone
  alpha 0.55 → 0.45; Vice blend 0.78 → 0.72 for richer photo detail; per-layout pan
  hints added.
- **Round 2** (all four scenes): wide cover and editor confirmed fixed. On the Hero
  portrait the star meter sat over the top strip photo's face → that panel's default
  pan moved down (+0.14). On the Tilted square the stars overlapped the title's last
  letter → centered titles now anchor at 46% width with a 74% max width, clearing the
  meter. The backdrop palms read as stray strokes behind the cards → sun disc enlarged
  and raised, palms shrunk to small silhouettes flanking the bottom cards.
- **Round 3** (final): all four screenshots re-rendered and inspected as the actual
  JPEGs that ship; stars clear of faces and title, palms read as palms, covers hold
  together at thumbnail size.

## Validation

- `node main.ts` run twice into different output dirs: identical `dossier.json`
  (sha256 f25f5987…), identical `app/` and `screenshots/` trees — deterministic.
  Dossier 1,250,225 bytes (cap 1.5 MiB); app 19 files / 787,750 bytes (caps 993 files /
  48 MiB); `app/index.html` well under 1 MiB.
- Screenshots: 4 JPEGs, each ≤ 256 KiB, long side ≤ 1280, short side ≥ 480
  (229,891 / 172,704 / 256,628 / 233,277 bytes).
- `vendor/makefun-app.ts` is byte-identical to the kit's copy (md5
  6f94f0d00d190143a0516a0d904832e3).
- Kit check (`makefun check`) re-run against the committed tree after this report was
  committed with the entry.
- No network references in `app/`: all scripts, styles, fonts and images are local
  files; fonts are SIL OFL (Anton, Pacifico) with license texts vendored.
