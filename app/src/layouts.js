// Panel layouts for Neon Coast. Every layout is described in fractions of the
// cover (0..1), so the same geometry works at any export size. A panel is
// { x, y, w, h, rot, frame } where rot is a tilt in radians and frame is
// 'edge' (thin white gutter) or 'polaroid' (white card with a caption strip).
// The title block sits in its own band: at the foot for most layouts, at the
// top for the tilted Snapshots layout.

const GAP = 0.012; // white gutter between panels, as a share of the width

export const LAYOUTS = {
  hero: { label: 'Hero', panels: 1, blurb: 'One big photo' },
  split: { label: 'Split', panels: 2, blurb: 'Two side by side' },
  duo: { label: 'Duo', panels: 2, blurb: 'Two stacked' },
  grid: { label: 'Grid', panels: 4, blurb: 'Four squares' },
  collage: { label: 'Collage', panels: 5, blurb: 'Hero + four small' },
  snapshots: { label: 'Snapshots', panels: 3, blurb: 'Tilted polaroids' },
};

export const LAYOUT_ORDER = ['hero', 'split', 'duo', 'grid', 'collage', 'snapshots'];

// Where the title block lives: { x, y, w, h, top } in PIXELS of the cover.
export function titleBand(layoutKey, w, h) {
  if (layoutKey === 'snapshots') {
    return { x: 0.05 * w, y: 0.03 * h, w: 0.9 * w, h: 0.16 * h, top: true };
  }
  const bandH = h > w ? 0.2 * h : 0.24 * h;
  return { x: 0.04 * w, y: h - bandH - 0.02 * h, w: 0.92 * w, h: bandH, top: false };
}

// Panel rectangles for a layout on a cover of w x h pixels.
export function panelRects(layoutKey, w, h) {
  const gap = GAP * w;
  const band = titleBand(layoutKey, w, h);
  const top = layoutKey === 'snapshots' ? band.y + band.h : 0;
  const bottom = layoutKey === 'snapshots' ? h : band.y - gap;
  const areaH = bottom - top;
  const full = { x: 0, y: top, w, h: areaH };
  const edge = { rot: 0, frame: 'edge' };

  if (layoutKey === 'hero') return [{ ...full, ...edge }];

  if (layoutKey === 'split') {
    const half = (w - gap) / 2;
    return [
      { x: 0, y: top, w: half, h: areaH, ...edge },
      { x: half + gap, y: top, w: half, h: areaH, ...edge },
    ];
  }

  if (layoutKey === 'duo') {
    const half = (areaH - gap) / 2;
    return [
      { x: 0, y: top, w, h: half, ...edge },
      { x: 0, y: top + half + gap, w, h: half, ...edge },
    ];
  }

  if (layoutKey === 'grid') {
    const cw = (w - gap) / 2;
    const ch = (areaH - gap) / 2;
    return [
      { x: 0, y: top, w: cw, h: ch, ...edge },
      { x: cw + gap, y: top, w: cw, h: ch, ...edge },
      { x: 0, y: top + ch + gap, w: cw, h: ch, ...edge },
      { x: cw + gap, y: top + ch + gap, w: cw, h: ch, ...edge },
    ];
  }

  if (layoutKey === 'collage') return collageRects(w, h);

  // Snapshots: three polaroid cards, tilted, overlapping the middle of the cover.
  const cardW = w * 0.34;
  const cardH = areaH * 0.82;
  const cy = top + (areaH - cardH) / 2;
  return [
    { x: w * 0.05, y: cy + h * 0.02, w: cardW, h: cardH, rot: -0.07, frame: 'polaroid' },
    { x: w * 0.33, y: cy - h * 0.015, w: cardW, h: cardH, rot: 0.02, frame: 'polaroid' },
    { x: w * 0.61, y: cy + h * 0.025, w: cardW, h: cardH, rot: 0.06, frame: 'polaroid' },
  ];
}

// Collage: one tall hero on the left, four small panels in a 2x2 block right.
export function collageRects(w, h) {
  const gap = GAP * w;
  const band = titleBand('collage', w, h);
  const top = 0;
  const bottom = band.y - gap;
  const areaH = bottom - top;
  const heroW = w * 0.56;
  const colX = heroW + gap;
  const colW = w - colX;
  const smallH = (areaH - gap) / 2;
  const halfW = (colW - gap) / 2;
  return [
    { x: 0, y: top, w: heroW, h: areaH, rot: 0, frame: 'edge' },
    { x: colX, y: top, w: halfW, h: smallH, rot: 0, frame: 'edge' },
    { x: colX + halfW + gap, y: top, w: halfW, h: smallH, rot: 0, frame: 'edge' },
    { x: colX, y: top + smallH + gap, w: halfW, h: smallH, rot: 0, frame: 'edge' },
    { x: colX + halfW + gap, y: top + smallH + gap, w: halfW, h: smallH, rot: 0, frame: 'edge' },
  ];
}
