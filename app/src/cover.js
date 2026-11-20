// cover.js — the composer: it paints a complete cover onto any canvas at any size, so
// the editor preview and the exported PNG are the same drawing. Panels of graded photos
// come first (grid layouts with white gutters and the genre's diagonal cuts, or the
// Tilted Snaps cards over a painted sunset), then the furniture every cover carries:
// title, neon script subtitle, heat stars, caption bar, studio badge, print finish.

import { makeGrainTile, paintPrintFinish } from './grade.js';
import { panelsForLayout, polygonBounds, tiltCardRect } from './panels.js';
import {
  drawCaptionBar, drawCoverTitle, drawHeatMeter, drawPalmSilhouette,
  drawScriptSubtitle, drawStudioBadge, drawSunDisc, fitDisplaySize, DISPLAY_FONT,
} from './lettering.js';

export const EXPORT_SIZES = [
  { id: 'square', name: 'Square', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide', w: 1920, h: 1080 },
];

export function createCoverState() {
  return {
    layoutId: 'nine',
    gradeId: 'vice',
    inkMode: false,
    halftone: true,
    title: 'NEON HEAT',
    subtitle: 'vice nights',
    caption: 'ONE LAST RIDE',
    heat: 4,
    photos: [],
    panels: [],
  };
}

export function coverFileName(size) {
  return `panel-heat-cover-${size.w}x${size.h}.png`;
}

let sharedGrainTile = null;
function grainTile() {
  if (!sharedGrainTile) sharedGrainTile = makeGrainTile();
  return sharedGrainTile;
}

function panelPhoto(state, gradedFor, index) {
  const adjust = state.panels[index];
  if (!adjust) return { adjust: null, graded: null };
  const photo = state.photos[adjust.photoIndex];
  return { adjust, graded: photo ? gradedFor(photo) : null };
}

// Cover-fit a graded photo canvas into a pixel box, with the panel's pan and zoom.
function drawPhotoCoverFit(ctx, graded, box, adjust) {
  const scale = Math.max(box.w / graded.width, box.h / graded.height) * (adjust?.zoom ?? 1);
  const drawW = graded.width * scale;
  const drawH = graded.height * scale;
  const dx = box.x + (box.w - drawW) / 2 + (adjust?.panX ?? 0) * box.w;
  const dy = box.y + (box.h - drawH) / 2 + (adjust?.panY ?? 0) * box.h;
  ctx.drawImage(graded, dx, dy, drawW, drawH);
}

function drawGridPanel(ctx, unitPoints, width, height, state, gradedFor, index) {
  const points = unitPoints.map(([x, y]) => [x * width, y * height]);
  const unit = polygonBounds(unitPoints);
  const box = { x: unit.x * width, y: unit.y * height, w: unit.w * width, h: unit.h * height };
  const { adjust, graded } = panelPhoto(state, gradedFor, index);
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  if (graded) {
    drawPhotoCoverFit(ctx, graded, box, adjust);
  } else {
    const empty = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    empty.addColorStop(0, '#10657a');
    empty.addColorStop(1, '#3d1d5e');
    ctx.fillStyle = empty;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();
  return points;
}

function paintGridBorders(ctx, allPoints, width, height) {
  const gutter = Math.max(5, Math.round(width * 0.0085));
  ctx.save();
  ctx.strokeStyle = '#f6f1e7';
  ctx.lineWidth = gutter;
  ctx.lineJoin = 'miter';
  for (const points of allPoints) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.strokeStyle = '#14100e';
  ctx.lineWidth = Math.max(4, gutter * 0.75);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
  ctx.restore();
}

function paintSunsetBackdrop(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.8);
  sky.addColorStop(0, '#1b2a6b');
  sky.addColorStop(0.45, '#6d2a7a');
  sky.addColorStop(0.72, '#c73e6d');
  sky.addColorStop(1, '#ff7e47');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height * 0.8);
  drawSunDisc(ctx, { cx: width * 0.5, cy: height * 0.34, radius: width * 0.19 });
  const sea = ctx.createLinearGradient(0, height * 0.8, 0, height);
  sea.addColorStop(0, '#175d75');
  sea.addColorStop(0.12, '#123a5c');
  sea.addColorStop(1, '#0a2438');
  ctx.fillStyle = sea;
  ctx.fillRect(0, height * 0.8, width, height * 0.2);
  ctx.fillStyle = 'rgba(255,210,140,0.5)';
  ctx.fillRect(0, height * 0.8, width, Math.max(2, height * 0.003));
  drawPalmSilhouette(ctx, { baseX: width * 0.03, baseY: height * 0.995, height: height * 0.15, lean: 0.25 });
  drawPalmSilhouette(ctx, { baseX: width * 0.985, baseY: height * 0.995, height: height * 0.13, lean: -0.35 });
}

function drawTiltedCard(ctx, card, width, height, state, gradedFor, index) {
  const rect = tiltCardRect(card, width, height);
  const frame = Math.max(8, Math.round(width * 0.011));
  const bottomFrame = frame * 2.7;
  const { adjust, graded } = panelPhoto(state, gradedFor, index);
  ctx.save();
  ctx.translate(rect.cx, rect.cy);
  ctx.rotate(rect.rot);
  ctx.shadowColor = 'rgba(8,4,18,0.5)';
  ctx.shadowBlur = width * 0.02;
  ctx.shadowOffsetY = height * 0.012;
  ctx.fillStyle = '#fdfcf8';
  ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.shadowColor = 'transparent';
  const photoBox = {
    x: -rect.w / 2 + frame,
    y: -rect.h / 2 + frame,
    w: rect.w - frame * 2,
    h: rect.h - frame - bottomFrame,
  };
  ctx.beginPath();
  ctx.rect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
  ctx.clip();
  if (graded) {
    drawPhotoCoverFit(ctx, graded, photoBox, adjust);
  } else {
    ctx.fillStyle = '#10657a';
    ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
  }
  ctx.restore();
}

// The furniture every layout shares, drawn over the panels: title block, heat stars,
// caption bar, studio badge, then the print finish over everything.
function paintCoverFurniture(ctx, state, width, height, centeredTitle) {
  const maxTitleWidth = centeredTitle ? width * 0.74 : width * 0.64;
  const startSize = centeredTitle ? width * 0.125 : width * 0.118;
  // Fit the title first, then anchor its baseline so the cap height always clears the
  // top edge — at wide sizes a fixed baseline would push the letters off the cover.
  const fittedSize = fitDisplaySize(ctx, (state.title || '').toUpperCase(), maxTitleWidth, startSize);
  const titleY = height * 0.03 + fittedSize * 0.78;
  const titleX = centeredTitle ? width * 0.46 : width * 0.045;
  const usedSize = drawCoverTitle(ctx, {
    title: state.title,
    x: titleX,
    y: titleY,
    maxWidth: maxTitleWidth,
    align: centeredTitle ? 'center' : 'left',
    startSize: fittedSize,
  });
  if (usedSize) {
    ctx.font = `${usedSize}px ${DISPLAY_FONT}`;
    const titleWidth = ctx.measureText((state.title || '').toUpperCase()).width;
    const subX = centeredTitle ? titleX + titleWidth * 0.2 : titleX + titleWidth * 0.6;
    drawScriptSubtitle(ctx, {
      subtitle: state.subtitle,
      x: subX,
      y: titleY + usedSize * 0.34,
      size: usedSize * 0.36,
    });
  }
  const starRadius = Math.min(30, Math.max(11, width * 0.017));
  drawHeatMeter(ctx, { rightX: width * 0.962, y: height * 0.055, radius: starRadius, heat: state.heat });
  const barHeight = drawCaptionBar(ctx, { caption: state.caption, width, height });
  const badgeRadius = Math.min(84, Math.max(36, width * 0.052));
  drawStudioBadge(ctx, {
    cx: width - badgeRadius - width * 0.026,
    cy: height - barHeight - badgeRadius * 0.42,
    radius: badgeRadius,
  });
  paintPrintFinish(ctx, width, height, { halftone: state.halftone, grainTile: grainTile() });
}

// Paint the whole cover. gradedFor(photo) returns the photo's graded canvas for the
// state's current grade and ink setting (the editor caches them; see main.js).
export function composeCover(canvas, state, gradedFor) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const panels = panelsForLayout(state.layoutId);

  if (state.layoutId === 'tilt') {
    paintSunsetBackdrop(ctx, width, height);
    panels.forEach((panel, index) => drawTiltedCard(ctx, panel.card, width, height, state, gradedFor, index));
    paintCoverFurniture(ctx, state, width, height, true);
    return;
  }

  ctx.fillStyle = '#f6f1e7';
  ctx.fillRect(0, 0, width, height);
  const allPoints = panels.map((panel, index) => drawGridPanel(ctx, panel.points, width, height, state, gradedFor, index));
  paintGridBorders(ctx, allPoints, width, height);
  paintCoverFurniture(ctx, state, width, height, state.layoutId === 'bleed');
}
