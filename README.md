# makefun-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/acengrahmi/makefun-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/acengrahmi/makefun-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Panel Heat — Vice Cover Studio.** An offline web app that turns your own photos and a
caption into GTA-style cover art: the multi-panel poster look with a Vice City
neon-sunset colour grade, exported as a PNG to share. Your photos are read on your own
machine and never uploaded — the app makes no network request at all.

What it does:

- **Real multi-panel covers** — four layouts (Vice Nine, Hero & Strip, Tilted Snaps,
  Full Bleed) with the genre's white gutters and diagonal cuts, filled from one photo
  or many.
- **A poster colour pipeline** — five gradient-map grades (Vice Sunset, Neon Night,
  Golden Hour, Teal Pop, Noir Heat) plus Natural+, an optional posterised *ink* mode,
  and a halftone + grain + vignette print finish, so a phone snapshot comes out looking
  like printed key art.
- **Any photo, posed by hand** — drop in photos, click a panel, drag to reposition,
  scroll to zoom; sensible defaults compose a strong cover before you touch anything.
- **Genre lettering, all original** — a big condensed title with a sunset gradient and
  keyline, a neon script subtitle, a five-star heat meter, a caption bar and a studio
  badge, drawn by the app itself. Fonts are Anton and Pacifico (SIL Open Font License,
  vendored under `app/fonts/`); no game artwork, logos or font files.
- **One-step export** — PNG in the three common post sizes, 1080 × 1080, 1080 × 1350
  and 1920 × 1080, one size at a time or all three at once.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
```

The app is plain static files under `app/` with no build step. To hand the entry in
(copies `app/` and `screenshots/` out and writes the dossier the judge reads):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Entered on make.fun — see the bounty: https://make.fun/bounty/gta6-cover-art-01

---

<sub>Entered on [make.fun](https://make.fun/?ref=t155jt27&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
