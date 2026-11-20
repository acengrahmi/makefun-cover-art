// panels.js — the cover layouts: where each photo panel sits, in unit space (0..1 on
// both axes), so the same layout composes at any export size. Grid layouts are lists of
// polygons (rectangles, plus the genre's signature diagonal cuts); Tilted Snaps is a
// fanned stack of snapshot cards over a painted sky, so its panels are rotated cards.

export const COVER_LAYOUTS = [
  { id: 'nine', name: 'Vice Nine', blurb: 'The classic nine-panel poster grid, one panel cut on the diagonal.' },
  { id: 'hero', name: 'Hero & Strip', blurb: 'One big hero panel with a stacked strip beside it and a slanted cut.' },
  { id: 'tilt', name: 'Tilted Snaps', blurb: 'Loose snapshots fanned over a sunset sky with palms and a retro sun.' },
  { id: 'bleed', name: 'Full Bleed', blurb: 'One photo edge to edge, a second panel inset in the corner.' },
];

const GRID_PANELS = {
  nine: [
    [[0, 0], [0.4, 0], [0.4, 0.36], [0, 0.36]],
    [[0.4, 0], [0.72, 0], [0.72, 0.36], [0.4, 0.36]],
    [[0.72, 0], [1, 0], [1, 0.36], [0.72, 0.36]],
    [[0, 0.36], [0.26, 0.36], [0.26, 0.68], [0, 0.68]],
    [[0.26, 0.36], [0.72, 0.36], [0.72, 0.68], [0.26, 0.68]],
    [[0.72, 0.36], [1, 0.36], [1, 0.68], [0.79, 0.68]],
    [[0, 0.68], [0.34, 0.68], [0.34, 1], [0, 1]],
    [[0.34, 0.68], [0.67, 0.68], [0.67, 1], [0.34, 1]],
    [[0.67, 0.68], [1, 0.68], [1, 1], [0.67, 1]],
  ],
  hero: [
    [[0, 0], [0.66, 0], [0.66, 0.84], [0.57, 1], [0, 1]],
    [[0.66, 0], [1, 0], [1, 0.34], [0.66, 0.34]],
    [[0.66, 0.34], [1, 0.34], [1, 0.67], [0.66, 0.67]],
    [[0.66, 0.67], [1, 0.67], [1, 1], [0.57, 1]],
  ],
  bleed: [
    [[0, 0], [1, 0], [1, 1], [0, 1]],
    [[0.69, 0.58], [1, 0.58], [1, 1], [0.69, 1]],
  ],
};

const TILT_CARDS = [
  { cx: 0.28, cy: 0.47, w: 0.5, h: 0.58, rot: -6 },
  { cx: 0.71, cy: 0.43, w: 0.46, h: 0.55, rot: 5 },
  { cx: 0.5, cy: 0.75, w: 0.42, h: 0.42, rot: -2 },
];

// Which photo (by index into the photo tray) each panel opens with, per layout, so a
// fresh cover already looks composed: the strongest photo takes the hero spot.
const DEFAULT_PHOTO_ORDER = {
  nine: [1, 2, 3, 3, 0, 4, 2, 4, 1],
  hero: [0, 1, 2, 3],
  bleed: [0, 4],
  tilt: [0, 2, 1],
};

export function layoutById(layoutId) {
  return COVER_LAYOUTS.find((layout) => layout.id === layoutId) ?? COVER_LAYOUTS[0];
}

export function panelsForLayout(layoutId) {
  if (layoutId === 'tilt') return TILT_CARDS.map((card) => ({ card }));
  return (GRID_PANELS[layoutId] ?? GRID_PANELS.nine).map((points) => ({ points }));
}

// Small framing hints for the opening composition: panels whose photo's subject sits
// high in its frame open panned up a little, so faces are not cropped at the panel edge.
const PAN_HINTS = {
  nine: { 0: { panY: -0.18 }, 6: { panY: -0.06 } },
  hero: { 1: { panY: 0.14 } },
  bleed: {},
  tilt: {},
};

// Fresh per-panel adjustments: which photo fills the panel, how far it is panned
// (in panel-size units) and how far it is zoomed past cover-fit.
export function defaultPanelAdjusts(layoutId, photoCount) {
  const order = DEFAULT_PHOTO_ORDER[layoutId] ?? DEFAULT_PHOTO_ORDER.nine;
  const hints = PAN_HINTS[layoutId] ?? {};
  return panelsForLayout(layoutId).map((_, index) => ({
    photoIndex: photoCount ? order[index % order.length] % photoCount : 0,
    panX: 0,
    panY: 0,
    zoom: 1,
    ...(hints[index] ?? {}),
  }));
}

export function polygonBounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The on-canvas rectangle a tilted card occupies before rotation, in pixels.
export function tiltCardRect(card, width, height) {
  return {
    cx: card.cx * width,
    cy: card.cy * height,
    w: card.w * width,
    h: card.h * height,
    rot: (card.rot * Math.PI) / 180,
  };
}
