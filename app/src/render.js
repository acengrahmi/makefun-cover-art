// Neon Coast — cover drawing engine.
// Everything is drawn on canvas from the state object: no images are fetched
// at run time except the photos the user (or the sample loader) hands in.
// A grade is a duotone gradient map: each photo pixel's brightness is
// re-mapped through the grade's colour stops, then grain and a vignette
// are laid over the panel. Lettering is drawn with system font stacks.

export const GRADES = {
  sunset: {
    label: 'Neon Sunset',
    stops: [[0, '#160a2e'], [0.35, '#7b1e6e'], [0.65, '#ff2e88'], [0.85, '#ff9e3d'], [1, '#fff3c4']],
    swatch: 'linear-gradient(90deg,#160a2e,#ff2e88,#ffb347)',
    posterize: 0, halftone: false,
  },
  teal: {
    label: 'Vice Teal',
    stops: [[0, '#02141a'], [0.35, '#075e63'], [0.65, '#0fb5a8'], [0.85, '#7df0dd'], [1, '#e8fff9']],
    swatch: 'linear-gradient(90deg,#02141a,#0fb5a8,#e8fff9)',
    posterize: 0, halftone: false,
  },
  halftone: {
    label: 'Halftone Pop',
    stops: [[0, '#12002e'], [0.4, '#c40e6e'], [0.7, '#ff2079'], [0.9, '#ffd319'], [1, '#ffffff']],
    swatch: 'linear-gradient(90deg,#12002e,#ff2079,#ffd319)',
    posterize: 4, halftone: true,
  },
  noir: {
    label: 'Mono Noir',
    stops: [[0, '#000000'], [0.35, '#2e2e2e'], [0.7, '#8f8f8f'], [1, '#ffffff']],
    swatch: 'linear-gradient(90deg,#000,#666,#fff)',
    posterize: 0, halftone: false,
  },
  gold: {
    label: 'Palm Gold',
    stops: [[0, '#1c0f00'], [0.35, '#6e3f00'], [0.65, '#d98a12'], [0.85, '#ffcf4d'], [1, '#ffe9a8']],
    swatch: 'linear-gradient(90deg,#1c0f00,#e8a020,#ffe9a8)',
    posterize: 0, halftone: false,
  },
  dusk: {
    label: 'Palm Dusk',
    stops: [[0, '#0a0618'], [0.35, '#3b1d5e'], [0.65, '#b34a7d'], [0.85, '#ff9d76'], [1, '#ffd6a5']],
    swatch: 'linear-gradient(90deg,#0a0618,#b34a7d,#ffd6a5)',
    posterize: 0, halftone: false,
  },
};

export const LAYOUTS = {
  hero: { label: 'Hero', slots: 1 },
  split: { label: 'Split', slots: 2 },
  duo: { label: 'Duo', slots: 2 },
  grid: { label: 'Grid', slots: 4 },
  collage: { label: 'Collage', slots: 5 },
  snapshots: { label: 'Snapshots', slots: 3 },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// Deterministic noise, so the same state always draws the same cover.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const rnd = mulberry32(20261119);
  const c = document.createElement('canvas');
  c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = rnd() < 0.5 ? 0 : 26;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return noiseTile;
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function gradeLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops.map(([t, hex]) => [t, hexRgb(hex)]);
  for (let i = 0; i < 256; i++) {
    let t = i / 255;
    if (grade.posterize) t = Math.round(t * (grade.posterize - 1)) / (grade.posterize - 1);
    let a = stops[0]; let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const k = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = Math.round(a[1][ch] + (b[1][ch] - a[1][ch]) * k);
  }
  return lut;
}

// Panel rectangles inside the art area, in fractions of that area.
// Returns { frames: [{x,y,w,h,rot}], titleTop }.
export function layoutFrames(layout, artW, artH) {
  const g = 0.012; // gap, as a fraction of the smaller art side
  const gap = Math.min(artW, artH) * g;
  const F = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (layout) {
    case 'hero':
      return { frames: [F(0, 0, artW, artH)], titleTop: false };
    case 'split': {
      const w = (artW - gap) / 2;
      return { frames: [F(0, 0, w, artH), F(w + gap, 0, w, artH)], titleTop: false };
    }
    case 'duo': {
      const h = (artH - gap) / 2;
      return { frames: [F(0, 0, artW, h), F(0, h + gap, artW, h)], titleTop: false };
    }
    case 'grid': {
      const w = (artW - gap) / 2; const h = (artH - gap) / 2;
      return {
        frames: [F(0, 0, w, h), F(w + gap, 0, w, h), F(0, h + gap, w, h), F(w + gap, h + gap, w, h)],
        titleTop: false,
      };
    }
    case 'collage': {
      const heroW = artW * 0.58;
      const smallW = (artW - heroW - gap * 2) / 2;
      const smallH = (artH - gap) / 2;
      const rx = heroW + gap;
      return {
        frames: [
          F(0, 0, heroW, artH),
          F(rx, 0, smallW, smallH), F(rx + smallW + gap, 0, smallW, smallH),
          F(rx, smallH + gap, smallW, smallH), F(rx + smallW + gap, smallH + gap, smallW, smallH),
        ],
        titleTop: false,
      };
    }
    case 'snapshots': {
      // Three tilted polaroid frames, overlapping, title band on top.
      // Kept narrow and shallow-angled so no rotated corner leaves the canvas.
      const pw = artW * 0.33; const ph = artH * 0.62;
      const cy = (artH - ph) / 2 + artH * 0.05;
      return {
        frames: [
          F(artW * 0.045, cy - artH * 0.02, pw, ph, -0.09),
          F(artW * 0.335, cy + artH * 0.02, pw, ph, 0.02),
          F(artW * 0.625, cy - artH * 0.015, pw, ph, 0.08),
        ],
        titleTop: true,
      };
    }
    default:
      return { frames: [F(0, 0, artW, artH)], titleTop: false };
  }
}

function drawPhotoInto(g, img, fx, fy, fw, fh, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(fw / iw, fh / ih) * zoom;
  const dw = iw * scale; const dh = ih * scale;
  const dx = fx + (fw - dw) / 2 + ox * fw;
  const dy = fy + (fh - dh) / 2 + oy * fh;
  g.drawImage(img, dx, dy, dw, dh);
}

function applyGrade(g, w, h, grade) {
  const lut = gradeLut(grade);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const lum = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const l = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    lum[p] = l;
    d[i] = lut[l * 3]; d[i + 1] = lut[l * 3 + 1]; d[i + 2] = lut[l * 3 + 2];
  }
  g.putImageData(img, 0, 0);
  if (grade.halftone) {
    const step = Math.max(6, Math.round(w / 130));
    const dark = grade.stops[0][1];
    g.fillStyle = dark;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        const l = lum[Math.floor(y) * w + Math.floor(x)];
        const r = (1 - l / 255) * step * 0.55;
        if (r > 0.6) {
          g.globalAlpha = 0.42;
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
      }
    }
    g.globalAlpha = 1;
  }
}

function finishPanel(g, w, h) {
  // Film grain.
  const tile = getNoiseTile();
  const pat = g.createPattern(tile, 'repeat');
  g.save();
  g.globalAlpha = 0.5;
  g.fillStyle = pat;
  g.fillRect(0, 0, w, h);
  g.restore();
  // Vignette.
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawPanel(ctx, frame, slot, grade, W, H) {
  const px = Math.max(2, Math.round(frame.w));
  const py = Math.max(2, Math.round(frame.h));
  const off = document.createElement('canvas');
  off.width = px; off.height = py;
  const g = off.getContext('2d');
  g.fillStyle = '#241a3d';
  g.fillRect(0, 0, px, py);
  if (slot && slot.img) {
    drawPhotoInto(g, slot.img, 0, 0, px, py, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    applyGrade(g, px, py, grade);
  } else {
    // Empty panel: diagonal placeholder stripes so the layout still reads.
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = Math.max(2, px * 0.01);
    for (let x = -py; x < px + py; x += px * 0.09) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + py, py); g.stroke();
    }
    g.restore();
  }
  finishPanel(g, px, py);

  ctx.save();
  if (frame.rot) {
    ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
    ctx.rotate(frame.rot);
    ctx.translate(-frame.w / 2, -frame.h / 2);
    ctx.drawImage(off, 0, 0, frame.w, frame.h);
  } else {
    ctx.drawImage(off, frame.x, frame.y, frame.w, frame.h);
  }
  ctx.restore();
}

function drawPolaroidFrame(ctx, frame, W, H) {
  // White border + soft shadow around a tilted snapshot frame.
  const pad = Math.max(6, W * 0.012);
  const strip = Math.max(14, H * 0.028);
  ctx.save();
  ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
  ctx.rotate(frame.rot);
  ctx.translate(-frame.w / 2, -frame.h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.02;
  ctx.shadowOffsetY = H * 0.008;
  ctx.fillStyle = '#fdf8ef';
  roundRectPath(ctx, -pad, -pad, frame.w + pad * 2, frame.h + pad + strip, pad * 0.7);
  ctx.fill();
  ctx.restore();
}

function drawTitleBand(ctx, state, bandX, bandY, bandW, bandH, W, H) {
  const cx = bandX + bandW / 2;
  // Deep band with a neon hairline on its edge.
  const bg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  bg.addColorStop(0, '#150b28');
  bg.addColorStop(1, '#0a0616');
  ctx.fillStyle = bg;
  ctx.fillRect(bandX, bandY, bandW, bandH);
  const hair = ctx.createLinearGradient(bandX, 0, bandX + bandW, 0);
  hair.addColorStop(0, '#ffd319'); hair.addColorStop(0.5, '#ff2e88'); hair.addColorStop(1, '#19d3c5');
  ctx.fillStyle = hair;
  ctx.fillRect(bandX, bandY, bandW, Math.max(2, H * 0.004));

  const title = (state.title || 'SUNSET HEIST').toUpperCase();
  const sub = state.subtitle || '';
  const badge = state.badge || '';
  const stars = Math.max(0, Math.min(5, state.stars ?? 5));

  const subPx = Math.max(12, bandH * 0.17);
  const titleY = bandY + bandH * 0.52;
  const subY = bandY + bandH * 0.82;

  // Big condensed title: sunset gradient fill, white outline, slight tilt.
  // Auto-fit: shrink until the title clears the badge pill on the right.
  let titlePx = Math.min(bandH * 0.46, bandW * 0.11);
  const maxTitleW = badge ? bandW * 0.58 : bandW * 0.92;
  ctx.save();
  ctx.font = `900 ${titlePx}px "Arial Narrow", "Liberation Sans Narrow", "Helvetica Neue", sans-serif`;
  while (titlePx > 10 && ctx.measureText(title).width * 0.82 > maxTitleW) {
    titlePx *= 0.92;
    ctx.font = `900 ${titlePx}px "Arial Narrow", "Liberation Sans Narrow", "Helvetica Neue", sans-serif`;
  }
  ctx.restore();

  ctx.save();
  ctx.translate(cx, titleY);
  ctx.rotate(-0.015);
  ctx.scale(0.82, 1);
  ctx.font = `900 ${titlePx}px "Arial Narrow", "Liberation Sans Narrow", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const fill = ctx.createLinearGradient(0, -titlePx * 0.6, 0, titlePx * 0.6);
  fill.addColorStop(0, '#ffe45e');
  fill.addColorStop(0.45, '#ff9e3d');
  fill.addColorStop(0.75, '#ff2e88');
  fill.addColorStop(1, '#8c1eff');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, titlePx * 0.07);
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Neon script subtitle.
  if (sub) {
    ctx.save();
    ctx.font = `italic 600 ${subPx}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subPx * 0.7;
    ctx.fillStyle = '#fff0f7';
    ctx.fillText(sub, cx, subY);
    ctx.restore();
  }

  // Gold badge pill, top-right of the band.
  if (badge) {
    const badgePx = Math.max(11, bandH * 0.13);
    ctx.save();
    ctx.font = `800 ${badgePx}px "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
    const tw = ctx.measureText(badge.toUpperCase()).width;
    const bw = tw + badgePx * 2.2;
    const bh = badgePx * 2.1;
    const bx = bandX + bandW - bw - bandW * 0.03;
    const by = bandY + bandH * 0.12;
    const gold = ctx.createLinearGradient(bx, by, bx, by + bh);
    gold.addColorStop(0, '#ffe45e'); gold.addColorStop(1, '#e8a020');
    ctx.fillStyle = gold;
    roundRectPath(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#241300';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badge.toUpperCase(), bx + bw / 2, by + bh / 2 + 1);
    ctx.restore();
  }

  // Five-star row, bottom-left of the band.
  if (stars > 0) {
    const starPx = Math.max(12, bandH * 0.16);
    const sx = bandX + bandW * 0.03;
    const sy = bandY + bandH * 0.78;
    ctx.save();
    ctx.font = `${starPx}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd319';
    ctx.shadowBlur = starPx * 0.5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < stars ? '#ffd319' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', sx + i * starPx * 1.25, sy);
    }
    ctx.restore();
  }
}

// Draw the whole cover onto `canvas` at exactly W x H.
// `state` carries layout, grade key, title/subtitle/badge/stars and slots:
// slots[i] = { img, zoom, ox, oy }.
export function drawCover(canvas, state, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] ? state.layout : 'collage';

  ctx.fillStyle = '#0c0817';
  ctx.fillRect(0, 0, W, H);

  const bandH = Math.round(H * 0.19);
  const { frames, titleTop } = layoutFrames(layout, W, H - bandH);
  const artY = titleTop ? bandH : 0;
  const bandY = titleTop ? 0 : H - bandH;

  // Polaroid white frames go under the photos.
  if (layout === 'snapshots') {
    for (const f of frames) {
      drawPolaroidFrame(ctx, { ...f, x: f.x, y: f.y + artY }, W, H);
    }
  }

  frames.forEach((f, i) => {
    const slot = (state.slots || [])[i] || null;
    drawPanel(ctx, { ...f, y: f.y + artY }, slot, grade, W, H);
    if (layout === 'snapshots') {
      // Handwritten-style caption strip at the foot of each polaroid.
      ctx.save();
      ctx.translate(f.x + f.w / 2, f.y + artY + f.h + Math.max(6, H * 0.008));
      ctx.rotate(f.rot);
      ctx.font = `italic 600 ${Math.max(11, H * 0.016)}px "Segoe Script", "Brush Script MT", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3a2a55';
      ctx.fillText(state.subtitle || 'Neon Coast', 0, 0);
      ctx.restore();
    }
  });

  drawTitleBand(ctx, state, 0, bandY, W, bandH, W, H);

  // Thin neon rim around the whole cover.
  const rim = ctx.createLinearGradient(0, 0, W, H);
  rim.addColorStop(0, '#ffd319'); rim.addColorStop(0.5, '#ff2e88'); rim.addColorStop(1, '#19d3c5');
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(3, W * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  return canvas;
}

// Render to a fresh canvas and hand back a PNG blob.
export async function exportCoverPng(state, W, H) {
  const c = document.createElement('canvas');
  drawCover(c, state, W, H);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
