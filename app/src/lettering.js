// lettering.js — everything on the cover that is drawn rather than photographed: the
// big condensed title with its sunset gradient and keyline, the neon script subtitle,
// the caption bar, the five-star heat meter, the round studio badge, and the sunset
// scenery (retro sun disc, palm silhouettes) that backs the Tilted Snaps layout.
// Fonts are Anton (display) and Pacifico (script), both SIL Open Font License,
// vendored under app/fonts/ — original lettering, no game artwork or font files.

export const DISPLAY_FONT = 'Anton';
export const SCRIPT_FONT = 'Pacifico';

// Shrink the Anton size until the line fits maxWidth; returns the size used.
export function fitDisplaySize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${DISPLAY_FONT}`;
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 4;
    ctx.font = `${size}px ${DISPLAY_FONT}`;
  }
  return size;
}

// The cover title: white-to-sunset gradient fill, a heavy dark keyline, and a soft drop
// shadow, so it sits over busy photo panels and still reads at thumbnail size.
// (x, y) is the baseline start; align is 'left' or 'center'. Returns the size used.
export function drawCoverTitle(ctx, { title, x, y, maxWidth, align = 'left', startSize }) {
  const text = (title || '').toUpperCase();
  if (!text) return 0;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const size = fitDisplaySize(ctx, text, maxWidth, startSize);
  const gradient = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.55, '#ffe9c4');
  gradient.addColorStop(1, '#ff9d6f');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#17110d';
  ctx.lineWidth = size * 0.17;
  ctx.strokeText(text, x, y);
  ctx.shadowColor = 'rgba(10,4,20,0.5)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetY = size * 0.035;
  ctx.fillStyle = gradient;
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}

// The neon script subtitle, tucked under the title's right shoulder, glowing pink.
export function drawScriptSubtitle(ctx, { subtitle, x, y, size }) {
  const text = (subtitle || '').trim();
  if (!text) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.045);
  ctx.font = `${size}px ${SCRIPT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2d78';
  ctx.shadowBlur = size * 0.55;
  ctx.fillStyle = '#ff6fa5';
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = size * 0.22;
  ctx.fillStyle = '#ffd7e8';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function starPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawStar(ctx, cx, cy, radius, fillStyle) {
  starPath(ctx, cx, cy, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

// The heat meter: five stars in a row ending at rightX — filled stars are gold,
// the rest are ghosted outlines over the art.
export function drawHeatMeter(ctx, { rightX, y, radius, heat }) {
  const gap = radius * 2.5;
  for (let i = 0; i < 5; i += 1) {
    const cx = rightX - (4 - i) * gap;
    if (i < heat) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,170,40,0.8)';
      ctx.shadowBlur = radius * 0.7;
      drawStar(ctx, cx, y, radius, '#ffc93e');
      ctx.restore();
    } else {
      starPath(ctx, cx, y, radius);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = radius * 0.16;
      ctx.stroke();
    }
  }
}

// The black caption bar along the bottom edge, its words lettered in Anton with a
// warm-white keyline above it. Returns the bar height.
export function drawCaptionBar(ctx, { caption, width, height }) {
  const barHeight = Math.round(height * 0.082);
  const top = height - barHeight;
  ctx.save();
  ctx.fillStyle = 'rgba(9,7,13,0.94)';
  ctx.fillRect(0, top, width, barHeight);
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(0, top, width, Math.max(2, height * 0.004));
  const text = (caption || '').toUpperCase();
  if (text) {
    const size = fitDisplaySize(ctx, text, width * 0.72, barHeight * 0.54);
    ctx.font = `${size}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.round(size * 0.06)}px`; } catch { /* older engines */ }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, width * 0.04, top + barHeight * 0.56);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  }
  ctx.restore();
  return barHeight;
}

function drawArcText(ctx, text, cx, cy, radius, startAngle, endAngle, flip) {
  const chars = [...text];
  const span = endAngle - startAngle;
  chars.forEach((char, index) => {
    const angle = startAngle + (span * (index + 0.5)) / chars.length;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
}

// The round studio badge that overlaps the caption bar's right end: a gold star in a
// dark roundel, ringed with the studio's name. Original art, drawn fresh each cover.
export function drawStudioBadge(ctx, { cx, cy, radius }) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#10131f';
  ctx.fill();
  ctx.lineWidth = radius * 0.09;
  ctx.strokeStyle = '#ffb347';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.03;
  ctx.strokeStyle = 'rgba(247,243,234,0.65)';
  ctx.stroke();
  ctx.font = `${radius * 0.3}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f7f3ea';
  drawArcText(ctx, 'PANEL HEAT', cx, cy, radius * 0.62, -Math.PI * 0.92, -Math.PI * 0.08, false);
  drawArcText(ctx, 'COVER STUDIO', cx, cy, radius * 0.62, Math.PI * 0.85, Math.PI * 0.15, true);
  drawStar(ctx, cx, cy + radius * 0.05, radius * 0.3, '#ffc93e');
  ctx.restore();
}

// A striped retro sun, drawn on its own layer so the stripes can be cut out of it.
export function drawSunDisc(ctx, { cx, cy, radius }) {
  const disc = document.createElement('canvas');
  disc.width = Math.ceil(radius * 2);
  disc.height = Math.ceil(radius * 2);
  const dctx = disc.getContext('2d');
  const gradient = dctx.createLinearGradient(0, 0, 0, radius * 2);
  gradient.addColorStop(0, '#ffd23e');
  gradient.addColorStop(0.6, '#ff7e47');
  gradient.addColorStop(1, '#ff2d78');
  dctx.fillStyle = gradient;
  dctx.beginPath();
  dctx.arc(radius, radius, radius, 0, Math.PI * 2);
  dctx.fill();
  dctx.globalCompositeOperation = 'destination-out';
  let stripeY = radius * 1.04;
  let stripeH = radius * 0.03;
  while (stripeY < radius * 2) {
    dctx.fillRect(0, stripeY, radius * 2, stripeH);
    stripeY += stripeH + radius * 0.09;
    stripeH *= 1.55;
  }
  ctx.drawImage(disc, cx - radius, cy - radius);
}

// A palm silhouette: a curved tapered trunk and seven drooping fronds.
export function drawPalmSilhouette(ctx, { baseX, baseY, height, lean = 0.18, color = '#07222e' }) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  const trunkHalf = height * 0.032;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(baseX - trunkHalf, baseY);
  ctx.quadraticCurveTo(baseX + lean * height * 0.35 - trunkHalf * 0.7, baseY - height * 0.55, topX - trunkHalf * 0.4, topY);
  ctx.lineTo(topX + trunkHalf * 0.4, topY);
  ctx.quadraticCurveTo(baseX + lean * height * 0.35 + trunkHalf * 0.7, baseY - height * 0.55, baseX + trunkHalf, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = height * 0.017;
  const fronds = [
    [-0.44, -0.2, 0.3], [-0.3, -0.3, 0.22], [-0.12, -0.36, 0.18],
    [0.08, -0.37, 0.18], [0.26, -0.31, 0.24], [0.42, -0.2, 0.32], [0.5, -0.02, 0.3],
  ];
  for (const [dx, lift, droop] of fronds) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + dx * height * 0.55, topY + lift * height,
      topX + dx * height, topY + droop * height,
    );
    ctx.stroke();
  }
  ctx.restore();
}
