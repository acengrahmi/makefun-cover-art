// Neon Coast cover renderer: draws the whole poster on a 2D canvas, at any
// export size, from the editor state. No network, no fonts to fetch — the
// lettering uses system font stacks only.
import { GRADES, applyGrade, halftoneOverlay, grainTile } from './grades.js';
import { panelRects, titleBand } from './layouts.js';

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export function sizeOf(key) {
  return SIZES[key] ?? SIZES['1080x1080'];
}

// Work out which slice of the photo fills a panel of rw x rh, cover-style,
// with a zoom multiplier and a pan offset (ox, oy in -1..1 of the slack).
export function coverSlice(img, rw, rh, zoom, ox, oy) {
  const scale = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * zoom;
  const sw = rw / scale;
  const sh = rh / scale;
  const slackX = img.naturalWidth - sw;
  const slackY = img.naturalHeight - sh;
  return {
    sx: slackX / 2 - ox * slackX / 2,
    sy: slackY / 2 - oy * slackY / 2,
    sw,
    sh,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Paint one photo panel, graded, onto ctx. `slot` is { photo, zoom, ox, oy }.
export function paintPanel(ctx, rect, slot, gradeKey) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.translate(-cx, -cy);

  // White gutter / card behind the photo.
  const pad = rect.frame === 'polaroid' ? rect.w * 0.045 : Math.max(2, rect.w * 0.006);
  const strip = rect.frame === 'polaroid' ? rect.h * 0.14 : 0;
  ctx.fillStyle = '#fdf8f0';
  ctx.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2 + strip);

  const photoRect = {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h - (rect.frame === 'polaroid' ? strip : 0),
  };

  if (slot && slot.photo && slot.photo.img && slot.photo.img.naturalWidth > 0) {
    const img = slot.photo.img;
    // Grade at a capped working size, then scale up onto the cover.
    const cap = 880;
    const scale = Math.min(1, cap / Math.max(photoRect.w, photoRect.h));
    const pw = Math.max(2, Math.round(photoRect.w * scale));
    const ph = Math.max(2, Math.round(photoRect.h * scale));
    const work = document.createElement('canvas');
    work.width = pw;
    work.height = ph;
    const wctx = work.getContext('2d');
    const slice = coverSlice(img, pw, ph, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    wctx.drawImage(img, slice.sx, slice.sy, slice.sw, slice.sh, 0, 0, pw, ph);
    const graded = applyGrade(wctx.getImageData(0, 0, pw, ph), gradeKey);
    wctx.putImageData(graded, 0, 0);
    ctx.drawImage(work, photoRect.x, photoRect.y, photoRect.w, photoRect.h);
    const grade = GRADES[gradeKey] ?? GRADES.sunset;
    if (grade.halftone) {
      const dots = halftoneOverlay(work, Math.max(6, Math.round(7 * scale)));
      ctx.globalAlpha = 0.5;
      ctx.drawImage(dots, photoRect.x, photoRect.y, photoRect.w, photoRect.h);
      ctx.globalAlpha = 1;
    }
  } else {
    // Empty panel: a sunset placeholder so the poster still reads as art.
    const g = ctx.createLinearGradient(photoRect.x, photoRect.y, photoRect.x + photoRect.w, photoRect.y + photoRect.h);
    g.addColorStop(0, '#3d1150');
    g.addColorStop(0.55, '#c22a72');
    g.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = g;
    ctx.fillRect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.round(photoRect.h * 0.06)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', photoRect.x + photoRect.w / 2, photoRect.y + photoRect.h / 2);
  }

  // Thin dark keyline inside the photo edge, poster-print style.
  ctx.strokeStyle = 'rgba(20,8,32,0.55)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.strokeRect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);

  if (rect.frame === 'polaroid') {
    ctx.fillStyle = '#2b123f';
    ctx.font = `italic 700 ${Math.round(strip * 0.42)}px "Segoe Script", "Brush Script MT", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('neon coast', rect.x + rect.w / 2, rect.y + rect.h - strip / 2 + pad);
  }
  ctx.restore();
}

// The title block: sunset-gradient condensed title with a white keyline,
// a glowing neon script subtitle, a gold badge pill and a star row.
export function paintTitleBlock(ctx, band, state, w) {
  const { title, subtitle, badge, stars } = state;
  const cx = band.x + band.w / 2;

  // Band backing: deep violet with a gold hairline on top.
  const bg = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  bg.addColorStop(0, '#1c0b31');
  bg.addColorStop(1, '#0d0518');
  ctx.fillStyle = bg;
  ctx.fillRect(band.x - w * 0.01, band.y, band.w + w * 0.02, band.h);
  ctx.fillStyle = '#ffc44d';
  ctx.fillRect(band.x, band.y, band.w, Math.max(2, w * 0.002));

  const titleSize = Math.round(band.h * (band.top ? 0.52 : 0.42));
  const titleFont = (px) => `900 ${px}px Impact, "Arial Narrow", "Helvetica Neue", sans-serif`;
  // Measure the badge first so the title never runs underneath it: the title
  // is centred in the space the badge leaves free.
  const gap = w * 0.02;
  let badgeBox = null;
  if (badge) {
    const label = badge.toUpperCase();
    const bp = Math.round(band.h * 0.13);
    ctx.font = `800 ${bp}px "Arial Narrow", system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    const bw = tw + bp * 2.2;
    const bh = bp * 2.1;
    badgeBox = { label, bp, bw, bh, bx: band.x + band.w - bw, by: band.y + band.h * 0.1 };
  }
  const titleAreaW = badgeBox ? band.w - badgeBox.bw - gap : band.w;
  const titleCx = band.x + titleAreaW / 2;
  let px = titleSize;
  ctx.font = titleFont(px);
  const words = (title || 'NEON COAST').toUpperCase();
  const maxW = titleAreaW * 0.94;
  while (px > 24 && ctx.measureText(words).width > maxW) {
    px -= 4;
    ctx.font = titleFont(px);
  }
  const ty = band.y + band.h * (band.top ? 0.42 : 0.44);
  const grad = ctx.createLinearGradient(0, ty - px, 0, ty + px * 0.2);
  grad.addColorStop(0, '#ffe9a8');
  grad.addColorStop(0.45, '#ff9a4d');
  grad.addColorStop(0.75, '#ff2e88');
  grad.addColorStop(1, '#c22a72');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, px * 0.045);
  ctx.strokeText(words, titleCx, ty);
  ctx.fillStyle = grad;
  ctx.fillText(words, titleCx, ty);

  // Neon script subtitle, glowing.
  const subSize = Math.round(band.h * (band.top ? 0.26 : 0.2));
  ctx.font = `italic 700 ${subSize}px "Segoe Script", "Brush Script MT", cursive`;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.round(subSize * 0.55);
  ctx.fillStyle = '#7dfce8';
  ctx.fillText(subtitle || '', cx, band.y + band.h * (band.top ? 0.8 : 0.78));
  ctx.shadowBlur = 0;

  // Gold badge pill, top right of the band.
  if (badgeBox) {
    const { label, bp, bw, bh, bx, by } = badgeBox;
    ctx.font = `800 ${bp}px "Arial Narrow", system-ui, sans-serif`;
    ctx.fillStyle = '#ffc44d';
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#241028';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
  }

  // Star row under the subtitle.
  if (stars > 0) {
    const starSize = Math.round(band.h * 0.15);
    ctx.font = `${starSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffc44d';
    const row = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    ctx.fillText(row, cx, band.y + band.h * 0.94);
  }
}

// Draw the full cover on `canvas` at W x H. `state` holds layout, grade,
// slots, title, subtitle, badge and stars. `showSelection` draws the editor's
// gold outline around the selected panel (preview only, never exported).
export function renderCover(canvas, state, W, H, showSelection = false) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Backdrop: night violet, darker at the foot where the title sits.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a0e45');
  bg.addColorStop(0.6, '#160a26');
  bg.addColorStop(1, '#0a0512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const grain = grainTile();
  const rects = panelRects(state.layout, W, H);
  rects.forEach((rect, i) => {
    paintPanel(ctx, rect, state.slots[i], state.grade);
  });

  const band = titleBand(state.layout, W, H);
  paintTitleBlock(ctx, band, state, W);

  // Film grain + vignette over the whole poster.
  const pattern = ctx.createPattern(grain, 'repeat');
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,2,12,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  if (showSelection && state.selected >= 0 && rects[state.selected]) {
    const r = rects[state.selected];
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    if (r.rot) ctx.rotate(r.rot);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    ctx.strokeStyle = '#ffc44d';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.setLineDash([W * 0.012, W * 0.008]);
    ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.restore();
  }
  return canvas;
}

// Build a fresh canvas of the cover at an export size.
export function exportCanvas(state, sizeKey) {
  const [w, h] = sizeOf(sizeKey);
  return renderCover(document.createElement('canvas'), state, w, h, false);
}

// Trigger a browser download of a canvas as a PNG file.
export function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG export failed'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(blob.size);
    }, 'image/png');
  });
}
