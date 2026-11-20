// shots.js — the fixed scenes the screenshot flow loads, so every screenshot is the app
// itself running in a browser, never a composite: ?shot=cover paints one exported cover
// full-window (the app's own drawing of it, at a size inside the gate's limits), and
// ?shot=editor opens the editor with a scene already composed. The remaining query
// parameters (layout, grade, ink, title, subtitle, caption, heat, size) dress the scene.

export function readShotRequest() {
  const query = new URLSearchParams(location.search);
  const kind = query.get('shot');
  if (kind !== 'cover' && kind !== 'editor') return null;
  return {
    kind,
    layoutId: query.get('layout') ?? undefined,
    gradeId: query.get('grade') ?? undefined,
    ink: query.get('ink') === '1',
    title: query.get('title') ?? undefined,
    subtitle: query.get('subtitle') ?? undefined,
    caption: query.get('caption') ?? undefined,
    heat: query.has('heat') ? Number(query.get('heat')) : undefined,
    sizeId: query.get('size') ?? undefined,
  };
}
