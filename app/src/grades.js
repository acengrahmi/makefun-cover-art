// Colour grades for Neon Coast: each grade is a duotone gradient map.
// A pixel's luminance picks a colour along the grade's stops, so every photo
// gets the same poster treatment whatever it shows. Stops are [t, [r, g, b]].
export const GRADES = {
  sunset: {
    label: 'Neon Sunset',
    swatch: 'linear-gradient(135deg,#ff2e88,#ff8a3d 60%,#ffd76e)',
    stops: [
      [0.0, [24, 6, 52]],
      [0.22, [110, 24, 92]],
      [0.48, [214, 72, 78]],
      [0.74, [255, 158, 74]],
      [1.0, [255, 238, 176]],
    ],
  },
  teal: {
    label: 'Vice Teal',
    swatch: 'linear-gradient(135deg,#0b3d5c,#2ee6c8 60%,#e8fff8)',
    stops: [
      [0.0, [6, 26, 44]],
      [0.25, [12, 84, 108]],
      [0.5, [30, 168, 158]],
      [0.78, [120, 226, 196]],
      [1.0, [232, 255, 248]],
    ],
  },
  halftone: {
    label: 'Halftone Pop',
    swatch: 'linear-gradient(135deg,#1b1b2e,#ff3d7e 55%,#ffe14d)',
    stops: [
      [0.0, [22, 16, 44]],
      [0.3, [168, 32, 96]],
      [0.6, [255, 92, 110]],
      [0.85, [255, 196, 82]],
      [1.0, [255, 246, 214]],
    ],
    halftone: true,
  },
  noir: {
    label: 'Mono Noir',
    swatch: 'linear-gradient(135deg,#000,#666 60%,#fff)',
    stops: [
      [0.0, [8, 8, 10]],
      [0.35, [58, 58, 64]],
      [0.65, [138, 138, 146]],
      [1.0, [246, 246, 250]],
    ],
  },
  gold: {
    label: 'Palm Gold',
    swatch: 'linear-gradient(135deg,#2a1503,#c77f1a 55%,#ffe9a8)',
    stops: [
      [0.0, [30, 14, 4]],
      [0.28, [96, 54, 12]],
      [0.55, [196, 124, 30]],
      [0.8, [246, 190, 84]],
      [1.0, [255, 236, 172]],
    ],
  },
  dusk: {
    label: 'Palm Dusk',
    swatch: 'linear-gradient(135deg,#12082e,#7b2fbe 55%,#ff7ad9)',
    stops: [
      [0.0, [14, 6, 40]],
      [0.3, [74, 34, 128]],
      [0.58, [168, 62, 168]],
      [0.82, [248, 116, 190]],
      [1.0, [255, 214, 232]],
    ],
  },
};

export const GRADE_ORDER = ['sunset', 'teal', 'halftone', 'noir', 'gold', 'dusk'];

// Blend one channel value between two stops.
function mixChannel(a, b, f) {
  return Math.round(a + (b - a) * f);
}

// Look a luminance (0..1) up along a grade's stops.
export function gradeColour(stops, lum) {
  const t = lum < 0 ? 0 : lum > 1 ? 1 : lum;
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return [mixChannel(c0[0], c1[0], f), mixChannel(c0[1], c1[1], f), mixChannel(c0[2], c1[2], f)];
    }
  }
  return stops[stops.length - 1][1].slice();
}

// Recolour an ImageData in place through a grade's gradient map.
// Luminance uses the familiar Rec. 601 weights, with a gentle S-curve so
// mid-tones keep their separation instead of washing out.
export function applyGrade(imageData, gradeKey) {
  const grade = GRADES[gradeKey] ?? GRADES.sunset;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    let lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    lum = lum * lum * (3 - 2 * lum);
    const [r, g, b] = gradeColour(grade.stops, lum);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  return imageData;
}

// Comic halftone: stamp ink dots over the graded picture, the dot in each
// cell sized by how dark the cell is. Returns a canvas the caller draws on top.
export function halftoneOverlay(sourceCanvas, cell = 7) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = h;
  const pctx = probe.getContext('2d');
  pctx.drawImage(sourceCanvas, 0, 0);
  const data = pctx.getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#160a24';
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      let sum = 0;
      let n = 0;
      for (let sy = y; sy < Math.min(y + cell, h); sy += 2) {
        for (let sx = x; sx < Math.min(x + cell, w); sx += 2) {
          const i = (sy * w + sx) * 4;
          sum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          n++;
        }
      }
      const lum = n ? sum / n : 1;
      const radius = (1 - lum) * cell * 0.72;
      if (radius < 0.6) continue;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return out;
}

// Deterministic film grain: a small noise tile from a seeded generator, so
// two exports of the same cover are byte-identical.
export function grainTile(size = 128, seed = 20261119) {
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  const img = ctx.createImageData(size, size);
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tile;
}
