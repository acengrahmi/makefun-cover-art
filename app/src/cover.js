// Neon Coast cover engine: multi-panel layouts, Vice City colour grades and GTA-poster
// lettering, all drawn on canvas. Everything here is original art: Anton + Pacifico
// (SIL OFL, vendored under app/fonts) and the two sample photos from the kit.

/** Post sizes the app exports, in the common share formats. */
export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

/**
 * Layouts: each returns panel rects as fractions of the cover (x, y, w, h) plus an
 * optional rotation in degrees and where the title block goes ('bottom' | 'top').
 */
export const LAYOUTS = {
  hero: {
    label: 'Hero · 1 photo',
    titleZone: 'bottom',
    panels: () => [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  split: {
    label: 'Split · 2 panels',
    titleZone: 'bottom',
    panels: () => [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  duo: {
    label: 'Duo · 2 stacked',
    titleZone: 'bottom',
    panels: () => [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  grid4: {
    label: 'Grid · 4 panels',
    titleZone: 'bottom',
    panels: () => [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  collage5: {
    label: 'Collage · 5 panels',
    titleZone: 'bottom',
    panels: () => [
      { x: 0, y: 0, w: 0.56, h: 1 },
      { x: 0.56, y: 0, w: 0.22, h: 0.5 },
      { x: 0.78, y: 0, w: 0.22, h: 0.5 },
      { x: 0.56, y: 0.5, w: 0.22, h: 0.5 },
      { x: 0.78, y: 0.5, w: 0.22, h: 0.5 },
    ],
  },
  tilted: {
    label: 'Snapshots · tilted',
    titleZone: 'top',
    panels: () => [
      { x: 0.04, y: 0.32, w: 0.42, h: 0.58, rot: -6 },
      { x: 0.32, y: 0.26, w: 0.42, h: 0.58, rot: 4 },
      { x: 0.58, y: 0.32, w: 0.38, h: 0.58, rot: -3 },
    ],
  },
};

/** Colour grades: a duotone gradient map over luminance, optionally posterized + halftone. */
export const GRADES = {
  sunset: {
    label: 'Neon Sunset',
    stops: [[0, '#160a2e'], [0.45, '#c2187a'], [0.75, '#ff5e3a'], [1, '#ffd166']],
    mix: 0.62, posterize: 0, halftone: false,
  },
  teal: {
    label: 'Vice Teal',
    stops: [[0, '#03181f'], [0.45, '#007a78'], [0.8, '#2de2c5'], [1, '#ffe9f4']],
    mix: 0.55, posterize: 0, halftone: false,
  },
  halftone: {
    label: 'Halftone Pop',
    stops: [[0, '#12041f'], [0.4, '#ff2e88'], [0.7, '#ff9a3d'], [1, '#fff3c4']],
    mix: 0.7, posterize: 5, halftone: true,
  },
  noir: {
    label: 'Mono Noir',
    stops: [[0, '#000000'], [0.5, '#5a5a5a'], [1, '#ffffff']],
    mix: 0.85, posterize: 0, halftone: false,
  },
  gold: {
    label: 'Palm Gold',
    stops: [[0, '#2a1503'], [0.45, '#a35a12'], [0.75, '#ff9a3d'], [1, '#fff0b3']],
    mix: 0.6, posterize: 0, halftone: false,
  },
  palm: {
    label: 'Palm Dusk',
    stops: [[0, '#04160f'], [0.4, '#0d6e57'], [0.7, '#ff5e8a'], [1, '#ffe9a8']],
    mix: 0.58, posterize: 0, halftone: false,
  },
};

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function gradeColor(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / Math.max(1e-6, t1 - t0);
      const a = hexRgb(c0);
      const b = hexRgb(c1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return hexRgb(stops[stops.length - 1][1]);
}

/** Applies a grade's gradient map (and posterize) to the pixels of `canvas` in place. */
export function applyGrade(canvas, grade) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const stops = grade.stops;
  for (let i = 0; i < d.length; i += 4) {
    let lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    if (grade.posterize) lum = Math.round(lum * (grade.posterize - 1)) / (grade.posterize - 1);
    const g = gradeColor(stops, lum);
    const m = grade.mix;
    d[i] = d[i] * (1 - m) + g[0] * m;
    d[i + 1] = d[i + 1] * (1 - m) + g[1] * m;
    d[i + 2] = d[i + 2] * (1 - m) + g[2] * m;
  }
  ctx.putImageData(img, 0, 0);
  if (grade.halftone) drawHalftoneDots(ctx, w, h);
}

/** Comic-book halftone dots: bigger black dots where the image is dark. */
export function drawHalftoneDots(ctx, w, h) {
  const step = Math.max(7, Math.round(w / 130));
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  ctx.fillStyle = '#12041f';
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      if (lum < 0.62) {
        const r = (step / 2) * (1 - lum / 0.62) * 0.9;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  noiseTile = document.createElement('canvas');
  noiseTile.width = 128;
  noiseTile.height = 128;
  const c = noiseTile.getContext('2d');
  const img = c.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return noiseTile;
}

/** Film grain + vignette over the whole cover. */
export function addGrainAndVignette(ctx, w, h) {
  const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,2,16,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/** Draws one photo into a panel canvas with cover-fit, zoom and pan, then grades it. */
export function renderPanel(photo, panel, pw, ph, grade) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(pw));
  c.height = Math.max(2, Math.round(ph));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b0f2e';
  ctx.fillRect(0, 0, c.width, c.height);
  if (photo) {
    const iw = photo.naturalWidth || photo.width;
    const ih = photo.naturalHeight || photo.height;
    const scale = Math.max(c.width / iw, c.height / ih) * (panel.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (c.width - dw) / 2 + (panel.ox || 0) * c.width;
    const dy = (c.height - dh) / 2 + (panel.oy || 0) * c.height;
    ctx.drawImage(photo, dx, dy, dw, dh);
  }
  applyGrade(c, grade);
  return c;
}

function fitFont(ctx, text, fontFor, maxWidth, startSize) {
  let size = startSize;
  ctx.font = fontFor(size);
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = fontFor(size);
  }
  return size;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The title block: gradient Anton title, neon Pacifico subtitle, badge pill, star row. */
export function drawTitleBlock(ctx, w, h, state) {
  const zone = LAYOUTS[state.layout].titleZone;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const badge = (state.badge || '').trim().toUpperCase();
  const scale = (state.titleSize || 100) / 100;
  const bandH = h * (zone === 'top' ? 0.24 : 0.3);

  if (zone === 'bottom') {
    const band = ctx.createLinearGradient(0, h - bandH * 1.4, 0, h);
    band.addColorStop(0, 'rgba(10,3,20,0)');
    band.addColorStop(1, 'rgba(10,3,20,0.88)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h - bandH * 1.4, w, bandH * 1.4);
  } else {
    const band = ctx.createLinearGradient(0, 0, 0, bandH * 1.3);
    band.addColorStop(0, 'rgba(10,3,20,0.85)');
    band.addColorStop(1, 'rgba(10,3,20,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, bandH * 1.3);
  }

  // Fit the title first: every other block stacks off its real size, so the badge
  // and stars never land on top of the letters.
  let titleSize = 0;
  if (title) {
    titleSize = fitFont(ctx, title, (s) => `${s}px Anton, 'Arial Narrow', sans-serif`, w * 0.92, h * 0.115 * scale);
  }
  // Baseline: bottom zone sits the title on the foot; top zone starts it below the
  // top edge (baseline = top margin + cap height, so nothing clips).
  const baseY = zone === 'top' ? h * 0.05 + titleSize : h - h * 0.055;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (title) {
    const size = titleSize;
    const grad = ctx.createLinearGradient(0, baseY - size, 0, baseY);
    grad.addColorStop(0, '#fff3c4');
    grad.addColorStop(0.45, '#ffb347');
    grad.addColorStop(1, '#ff2e88');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.04;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = '#ffffff';
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    ctx.strokeText(title, w / 2, baseY);
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, baseY);
    ctx.restore();
    if (subtitle) {
      const subSize = fitFont(ctx, subtitle, (s) => `${s}px Pacifico, cursive`, w * 0.6, h * 0.052);
      ctx.save();
      // Bottom zone: script rides just above the title's right end; top zone: just
      // below the baseline, clear of the badge pill in the middle.
      const subY = zone === 'top' ? baseY + size * 0.12 : baseY - size * 1.02;
      ctx.translate(w * 0.72, subY);
      ctx.rotate(-0.07);
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = '#ff7ad9';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = subSize * 0.7;
      ctx.fillText(subtitle, 0, 0);
      ctx.restore();
    }
  }

  if (badge) {
    const bSize = Math.max(13, h * 0.021);
    ctx.font = `${bSize}px Anton, 'Arial Narrow', sans-serif`;
    const bw = ctx.measureText(badge).width + bSize * 2.2;
    const bh = bSize * 2.1;
    const bx = (w - bw) / 2;
    // Bottom zone: pill + stars stack above the title; top zone: below it.
    const by = zone === 'top' ? baseY + titleSize * 0.3 : baseY - titleSize - h * 0.02 - bh;
    ctx.save();
    ctx.fillStyle = 'rgba(10,3,20,0.72)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1.5, h * 0.0016);
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, w / 2, by + bh / 2 + bSize * 0.05);
    ctx.restore();
    // Star row: above the pill on bottom-zone covers, below it on top-zone ones.
    const starR = Math.max(5, h * 0.008);
    const gap = starR * 2.6;
    const total = gap * 4;
    const starY = zone === 'top' ? by + bh + starR * 2.4 : by - starR * 2.4;
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, w / 2 - total / 2 + i * gap, starY, starR, '#ffd166');
    }
  }
}

/**
 * Renders the whole cover from `state` at pixel size (w, h) and returns the canvas.
 * state: { layout, grade, title, subtitle, badge, titleSize, photos, panels }
 * panels: [{ photo, zoom, ox, oy }] aligned with the layout's panel list.
 */
export function renderCover(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[state.layout] || LAYOUTS.collage5;
  const grade = GRADES[state.grade] || GRADES.sunset;

  // Sunset sky behind the panels and gutters.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b0f3d');
  sky.addColorStop(0.45, '#8a1d63');
  sky.addColorStop(0.75, '#ff5e3a');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const gutter = Math.max(2, Math.round(w * 0.006));
  const rects = layout.panels(w, h);
  rects.forEach((r, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = state.photos[panel.photo] || null;
    const pw = r.w * w - gutter * 2;
    const ph = r.h * h - gutter * 2;
    const pc = renderPanel(photo, panel, pw, ph, grade);
    const cx = (r.x * w + r.w * w / 2);
    const cy = (r.y * h + r.h * h / 2);
    ctx.save();
    ctx.translate(cx, cy);
    if (r.rot) ctx.rotate((r.rot * Math.PI) / 180);
    ctx.drawImage(pc, -pw / 2, -ph / 2, pw, ph);
    // White poster frame around the panel.
    ctx.lineWidth = Math.max(2, w * 0.0035);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  });

  drawTitleBlock(ctx, w, h, state);
  addGrainAndVignette(ctx, w, h);
  return canvas;
}

/** Renders the cover at a named post size and returns a PNG blob. */
export function exportCoverBlob(state, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.square;
  const canvas = renderCover(state, size.w, size.h);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Panel rects in preview-canvas pixels, for hit-testing clicks and drags. */
export function previewRects(state, w, h) {
  return LAYOUTS[state.layout].panels(w, h).map((r) => ({
    x: r.x * w, y: r.y * h, w: r.w * w, h: r.h * h, rot: r.rot || 0,
  }));
}
