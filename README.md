![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/acengrahmi/makefun-cover-art/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/acengrahmi/makefun-cover-art/reward.svg)

[View the bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast — GTA 6-style Cover Maker

Turn your own photos into a multi-panel Vice City neon cover, right in the
browser. Pick one of six poster layouts (Hero, Split, Duo, Grid, Collage,
Snapshots), drop a different photo into every panel — or fill them all with
one — then pan and zoom each photo, grade it with one of six sunset/neon
colour grades (including a posterized Halftone Pop comic look), and letter it
with a big gradient title, a glowing neon script subtitle, a gold badge and a
five-star row. Export as a PNG in 1080×1080, 1080×1350 or 1920×1080, or all
three at once.

Fully offline: the app is plain static files under `app/`, loads nothing from
the network, and your photos never leave your machine. The lettering is
drawn from system condensed/script font stacks — no Rockstar logo, artwork
or font is used anywhere. The two sample photos under `app/samples/` were
made with an image model for make.fun and are free to use.

Run it with `node serve.ts` and open http://localhost:8080. Hand it in with
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

MIT licensed.
