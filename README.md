# makefun-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/acengrahmi/makefun-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/acengrahmi/makefun-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A free offline web app that turns any photo into GTA 6-style multi-panel cover art
and exports it as a PNG to share. Photos never leave the machine; everything runs
from static files, no network request.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## What it does

- **6 multi-panel layouts** — Hero (1 photo), Split (2), Duo (2 stacked), Grid (4),
  Collage (5: one hero + four small), and tilted Snapshots (3 polaroid-style frames).
- **Any photo, per panel** — upload several photos, click a panel to place a photo in
  it, drag to pan, scroll (or the Zoom slider) to zoom, "Fill all panels" to reuse one
  photo everywhere. Two free sample photos ship under `app/samples/`.
- **6 Vice City colour grades** — Neon Sunset, Vice Teal, Halftone Pop (posterize +
  comic halftone dots), Mono Noir, Palm Gold, Palm Dusk. Each grade is a duotone
  gradient map applied per panel on canvas.
- **Poster lettering** — a big condensed Anton title with a sunset gradient fill and
  white outline, a glowing neon Pacifico script subtitle, a gold badge pill and a
  five-star row. All original: no Rockstar logo, artwork or fonts.
- **One-click PNG export** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, or all three
  at once. Film grain and vignette finish every cover.

## Use it

Serve `app/` with any static server (`node serve.ts`, then open
http://localhost:8080), add photos, pick a layout and grade, type the title, and
hit **Download PNG**.

## Files

- `app/index.html`, `app/style.css` — the editor page.
- `app/src/cover.js` — the cover engine: layouts, grades, halftone, lettering.
- `app/src/main.js` — editor wiring: tray, pickers, drag/zoom, export.
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots.
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License (`OFL.txt`).
- `main.ts` — the make.fun entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored `vendor/makefun-app.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=t155jt27&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
