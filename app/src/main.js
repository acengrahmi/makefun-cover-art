// Neon Coast editor: photo tray, layout + grade pickers, per-panel crop/zoom by drag,
// title lettering controls, one-click PNG export in the three post sizes.
// A `?shot=` query sets up a fixed scene for screenshots (./shots.js).
import { LAYOUTS, GRADES, SIZES, renderCover, exportCoverBlob, previewRects } from './cover.js';
import { runShot } from './shots.js';

const preview = document.getElementById('preview');
const status = document.getElementById('status');
const stageLabel = document.getElementById('stageLabel');

/** Live editor state: photos are Image elements, panels point at them by index. */
export const state = {
  layout: 'collage5',
  grade: 'sunset',
  size: 'square',
  title: 'VICE CITY NIGHTS',
  subtitle: 'neon dreams',
  badge: 'LEONIDA · EST. 2026',
  titleSize: 100,
  photos: [],
  panels: [],
};
let selectedPanel = 0;
let selectedPhoto = 0;
let dragging = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelCount() {
  return LAYOUTS[state.layout].panels(1, 1).length;
}

/** Rebuilds the panel list for the current layout, keeping photos where they fit. */
export function resetPanels() {
  const old = state.panels;
  state.panels = Array.from({ length: panelCount() }, (_, i) => {
    const prev = old[i];
    return {
      photo: prev ? prev.photo % Math.max(1, state.photos.length) : i % Math.max(1, state.photos.length),
      zoom: 1, ox: 0, oy: 0,
    };
  });
  selectedPanel = 0;
}

function drawPreview() {
  const size = SIZES[state.size];
  // Screenshot scenes may shrink the preview so the whole cover fits the window.
  const maxSide = window.__previewMaxSide || 900;
  const scale = Math.min(1, maxSide / Math.max(size.w, size.h));
  const pw = Math.round(size.w * scale);
  const ph = Math.round(size.h * scale);
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw;
    preview.height = ph;
  }
  const cover = renderCover(state, pw, ph);
  const ctx = preview.getContext('2d');
  ctx.drawImage(cover, 0, 0);
  // Selected-panel outline (editor only, never in the export).
  const rects = previewRects(state, pw, ph);
  const r = rects[selectedPanel];
  if (r) {
    ctx.save();
    ctx.strokeStyle = '#2de2c5';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
  stageLabel.textContent = `Live preview — ${size.w} × ${size.h}`;
  updatePanelInfo();
}

function updatePanelInfo() {
  const panel = state.panels[selectedPanel];
  const info = document.getElementById('panelInfo');
  if (!panel) { info.textContent = 'No panel selected.'; return; }
  const name = state.photos[panel.photo]?.dataset?.name || `Photo ${panel.photo + 1}`;
  info.innerHTML = `Panel <b>${selectedPanel + 1} of ${state.panels.length}</b> · <b>${name}</b> · zoom ${Math.round(panel.zoom * 100)}%`;
  const zoom = document.getElementById('zoom');
  zoom.value = Math.round(panel.zoom * 100);
}

function buildTray() {
  const tray = document.getElementById('tray');
  tray.innerHTML = '';
  state.photos.forEach((img, i) => {
    const el = document.createElement('img');
    el.src = img.src;
    el.alt = img.dataset.name || `Photo ${i + 1}`;
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', String(i === selectedPhoto));
    el.addEventListener('click', () => {
      selectedPhoto = i;
      const panel = state.panels[selectedPanel];
      if (panel) panel.photo = i;
      buildTray();
      drawPreview();
    });
    tray.appendChild(el);
  });
}

function buildPickers() {
  const layouts = document.getElementById('layouts');
  layouts.innerHTML = '';
  const thumbs = {
    hero: '1fr', split: '1fr 1fr', duo: '1fr / 1fr', grid4: '1fr 1fr / 1fr 1fr',
    collage5: '2fr 1fr 1fr / 1fr 1fr', tilted: '1fr 1fr 1fr',
  };
  Object.entries(LAYOUTS).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.layout));
    const cells = def.panels(1, 1).length;
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    thumb.style.gridTemplateColumns = thumbs[id].includes('/') ? thumbs[id].split('/')[0] : thumbs[id];
    thumb.style.gridTemplateRows = thumbs[id].includes('/') ? thumbs[id].split('/')[1] : '1fr';
    for (let i = 0; i < cells; i++) thumb.appendChild(document.createElement('i'));
    b.appendChild(thumb);
    b.appendChild(document.createTextNode(def.label));
    b.addEventListener('click', () => {
      state.layout = id;
      resetPanels();
      buildPickers();
      drawPreview();
    });
    layouts.appendChild(b);
  });

  const grades = document.getElementById('grades');
  grades.innerHTML = '';
  Object.entries(GRADES).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.grade));
    const sw = document.createElement('span');
    sw.className = `swatch ${id}`;
    b.appendChild(sw);
    b.appendChild(document.createTextNode(def.label));
    b.addEventListener('click', () => {
      state.grade = id;
      buildPickers();
      drawPreview();
    });
    grades.appendChild(b);
  });

  const sizes = document.getElementById('sizes');
  sizes.innerHTML = '';
  Object.entries(SIZES).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.size));
    b.textContent = `${def.w} × ${def.h}`;
    b.addEventListener('click', () => {
      state.size = id;
      buildPickers();
      drawPreview();
    });
    sizes.appendChild(b);
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportOne(sizeKey) {
  const size = SIZES[sizeKey];
  status.textContent = `Rendering ${size.w} × ${size.h}…`;
  const blob = await exportCoverBlob(state, sizeKey);
  const slug = (state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  downloadBlob(blob, `${slug}-${size.w}x${size.h}.png`);
  status.textContent = `Saved ${slug}-${size.w}x${size.h}.png`;
}

// --- Pointer editing on the preview: click selects, drag pans, wheel zooms. ---
function canvasPoint(e) {
  const rect = preview.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (preview.width / rect.width),
    y: (e.clientY - rect.top) * (preview.height / rect.height),
  };
}

function hitPanel(p) {
  const rects = previewRects(state, preview.width, preview.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
  }
  return -1;
}

preview.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p);
  if (i < 0) return;
  selectedPanel = i;
  const panel = state.panels[i];
  selectedPhoto = panel.photo;
  dragging = { x: p.x, y: p.y, ox: panel.ox, oy: panel.oy };
  preview.setPointerCapture(e.pointerId);
  buildTray();
  drawPreview();
});
preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const panel = state.panels[selectedPanel];
  panel.ox = Math.max(-0.6, Math.min(0.6, dragging.ox + (p.x - dragging.x) / preview.width));
  panel.oy = Math.max(-0.6, Math.min(0.6, dragging.oy + (p.y - dragging.y) / preview.height));
  drawPreview();
});
preview.addEventListener('pointerup', () => { dragging = null; });
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  drawPreview();
}, { passive: false });

// --- Controls ---
document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    img.dataset.name = file.name;
    state.photos.push(img);
  }
  selectedPhoto = state.photos.length - 1;
  buildTray();
  drawPreview();
});
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; drawPreview(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; drawPreview(); });
document.getElementById('badge').addEventListener('input', (e) => { state.badge = e.target.value; drawPreview(); });
document.getElementById('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); drawPreview(); });
document.getElementById('zoom').addEventListener('input', (e) => {
  const panel = state.panels[selectedPanel];
  if (panel) { panel.zoom = Number(e.target.value) / 100; drawPreview(); }
});
document.getElementById('fillAll').addEventListener('click', () => {
  state.panels.forEach((p) => { p.photo = selectedPhoto; });
  drawPreview();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  const panel = state.panels[selectedPanel];
  if (panel) { panel.zoom = 1; panel.ox = 0; panel.oy = 0; }
  drawPreview();
});
document.getElementById('shuffle').addEventListener('click', () => {
  const layoutIds = Object.keys(LAYOUTS);
  const gradeIds = Object.keys(GRADES);
  state.layout = layoutIds[Math.floor(Math.random() * layoutIds.length)];
  state.grade = gradeIds[Math.floor(Math.random() * gradeIds.length)];
  resetPanels();
  buildPickers();
  drawPreview();
});
document.getElementById('export').addEventListener('click', () => exportOne(state.size));
document.getElementById('exportAll').addEventListener('click', async () => {
  for (const key of Object.keys(SIZES)) {
    // eslint-disable-next-line no-await-in-loop
    await exportOne(key);
  }
  status.textContent = 'Saved all three sizes.';
});

// --- Boot: fonts first (canvas lettering needs them), then the sample photos. ---
export async function boot() {
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }
  const boulevard = await loadImage('samples/boulevard.jpg');
  boulevard.dataset.name = 'Boulevard';
  const pier = await loadImage('samples/pier.jpg');
  pier.dataset.name = 'Pier';
  state.photos = [boulevard, pier];
  resetPanels();
  buildTray();
  buildPickers();
  drawPreview();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { boot, state, drawPreview, loadImage, setLayout: (id) => { state.layout = id; resetPanels(); } });
} else {
  boot();
}
