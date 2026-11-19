// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the exported cover alone, drawn by the app itself at export size.
// Query params: layout, grade, size (square|portrait|wide), title, subtitle, badge,
// panels (comma list of photo indexes per panel), photo (default photo for panel 0).
// window.__shotReady is set once the scene is painted.
import { SIZES, renderCover } from './cover.js';

function applyScene(query, api) {
  const { state, drawPreview } = api;
  if (query.get('layout')) api.setLayout(query.get('layout'));
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('title') !== null) {
    state.title = query.get('title');
    const t = document.getElementById('title');
    if (t) t.value = state.title;
  }
  if (query.get('subtitle') !== null) {
    state.subtitle = query.get('subtitle');
    const s = document.getElementById('subtitle');
    if (s) s.value = state.subtitle;
  }
  if (query.get('badge') !== null) {
    state.badge = query.get('badge');
    const b = document.getElementById('badge');
    if (b) b.value = state.badge;
  }
  const panels = query.get('panels');
  if (panels) {
    panels.split(',').forEach((v, i) => {
      if (state.panels[i]) state.panels[i].photo = Number(v) % state.photos.length;
    });
  }
  drawPreview();
}

export async function runShot(shot, query, api) {
  if (shot === 'editor') window.__previewMaxSide = 560;
  await api.boot();
  applyScene(query, api);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[query.get('size')] || SIZES.square;
    const canvas = document.getElementById('preview');
    canvas.width = size.w;
    canvas.height = size.h;
    const cover = renderCover(api.state, size.w, size.h);
    canvas.getContext('2d').drawImage(cover, 0, 0);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
