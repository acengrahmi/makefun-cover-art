// Neon Coast editor: wires the controls to the cover renderer, handles
// photo upload, per-panel drag-to-pan and scroll-to-zoom, PNG export, and the
// ?shot= scenes the screenshots are taken from.
import { GRADES, GRADE_ORDER } from './grades.js';
import { LAYOUTS, LAYOUT_ORDER, panelRects } from './layouts.js';
import { renderCover, exportCanvas, downloadCanvas, sizeOf } from './cover.js';

const $ = (id) => document.getElementById(id);

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

const state = {
  layout: 'collage',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Neon Coast',
  subtitle: 'vice city nights',
  badge: 'EST. 2026',
  stars: 5,
  photos: [],
  slots: [],
  selected: 0,
  activePhoto: -1,
};

const preview = $('preview');
const statusEl = $('status');

function slotCount() {
  return LAYOUTS[state.layout].panels;
}

function ensureSlots() {
  const n = slotCount();
  while (state.slots.length < n) state.slots.push({ photo: null, zoom: 1, ox: 0, oy: 0 });
  state.slots.length = n;
  if (state.selected >= n) state.selected = 0;
}

function previewSize() {
  const [w, h] = sizeOf(state.size);
  const scale = 900 / Math.max(w, h);
  return [Math.round(w * scale), Math.round(h * scale)];
}

export function redraw() {
  ensureSlots();
  const [w, h] = previewSize();
  renderCover(preview, state, w, h, true);
  syncZoomSlider();
}

function syncZoomSlider() {
  const slot = state.slots[state.selected];
  const zoom = $('zoom-input');
  if (slot) zoom.value = String(Math.round((slot.zoom || 1) * 100));
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ---- pickers ---------------------------------------------------------------

function buildPickers() {
  const layoutBox = $('layout-picker');
  LAYOUT_ORDER.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = key;
    b.textContent = `${LAYOUTS[key].label} · ${LAYOUTS[key].blurb}`;
    b.addEventListener('click', () => {
      state.layout = key;
      state.selected = 0;
      markPicked(layoutBox, b);
      redraw();
    });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('grade-picker');
  GRADE_ORDER.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.grade = key;
    const dot = document.createElement('span');
    dot.className = 'swatch';
    dot.style.background = GRADES[key].swatch;
    b.appendChild(dot);
    b.appendChild(document.createTextNode(GRADES[key].label));
    b.addEventListener('click', () => {
      state.grade = key;
      markPicked(gradeBox, b);
      redraw();
    });
    gradeBox.appendChild(b);
  });
  markPicked(layoutBox, layoutBox.querySelector('[data-layout="collage"]'));
  markPicked(gradeBox, gradeBox.querySelector('[data-grade="sunset"]'));
}

function markPicked(box, btn) {
  box.querySelectorAll('.pick').forEach((el) => el.classList.toggle('on', el === btn));
}

// ---- photos ----------------------------------------------------------------

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.label;
    thumb.title = photo.label;
    if (i === state.activePhoto) thumb.classList.add('active');
    if (state.slots.some((s) => s.photo === photo)) thumb.classList.add('placed');
    thumb.addEventListener('click', () => {
      state.activePhoto = i;
      if (state.selected >= 0) placePhoto(state.selected, i);
      renderTray();
      redraw();
    });
    tray.appendChild(thumb);
  });
}

function placePhoto(panelIdx, photoIdx) {
  const slot = state.slots[panelIdx];
  const photo = state.photos[photoIdx];
  if (!slot || !photo) return;
  slot.photo = photo;
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  state.photos.push({ img, label: file.name });
  if (state.activePhoto === -1) state.activePhoto = 0;
  renderTray();
  redraw();
}

async function loadSamples() {
  const names = ['pier', 'boulevard'];
  for (const name of names) {
    if (state.photos.some((p) => p.label === name)) continue;
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push({ img, label: name });
  }
  if (state.activePhoto === -1) state.activePhoto = 0;
  renderTray();
}

// Put the active photo (or the first photo) into every panel.
function fillAllPanels() {
  const photo = state.photos[state.activePhoto] ?? state.photos[0];
  if (!photo) {
    setStatus('Add a photo first, then Fill all panels.');
    return;
  }
  state.slots.forEach((slot) => {
    slot.photo = photo;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  });
  setStatus(`Filled ${state.slots.length} panels with ${photo.label}.`);
  renderTray();
  redraw();
}

// ---- canvas pointer: select, pan, zoom -------------------------------------

function canvasPoint(event) {
  const box = preview.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) * (preview.width / box.width),
    y: (event.clientY - box.top) * (preview.height / box.height),
  };
}

function hitPanel(point) {
  const rects = panelRects(state.layout, preview.width, preview.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    let dx = point.x - cx;
    let dy = point.y - cy;
    if (r.rot) {
      const c = Math.cos(-r.rot);
      const s = Math.sin(-r.rot);
      const rx = dx * c - dy * s;
      const ry = dx * s + dy * c;
      dx = rx;
      dy = ry;
    }
    if (Math.abs(dx) <= r.w / 2 && Math.abs(dy) <= r.h / 2) return i;
  }
  return -1;
}

function wireCanvas() {
  let drag = null;
  preview.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const idx = hitPanel(point);
    if (idx === -1) return;
    state.selected = idx;
    const slot = state.slots[idx];
    if (state.activePhoto >= 0 && slot && !slot.photo) {
      placePhoto(idx, state.activePhoto);
      renderTray();
    }
    drag = { x: event.clientX, y: event.clientY, ox: slot ? slot.ox : 0, oy: slot ? slot.oy : 0 };
    preview.setPointerCapture(event.pointerId);
    redraw();
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const slot = state.slots[state.selected];
    if (!slot || !slot.photo) return;
    const box = preview.getBoundingClientRect();
    const rects = panelRects(state.layout, preview.width, preview.height);
    const r = rects[state.selected];
    const scaleX = preview.width / box.width;
    const dx = (event.clientX - drag.x) * scaleX;
    const dy = (event.clientY - drag.y) * scaleX;
    const spanX = Math.max(1, r.w * 0.5);
    const spanY = Math.max(1, r.h * 0.5);
    slot.ox = clamp(drag.ox - (dx / spanX) * 2, -1, 1);
    slot.oy = clamp(drag.oy - (dy / spanY) * 2, -1, 1);
    redraw();
  });
  const endDrag = () => { drag = null; };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const slot = state.slots[state.selected];
    if (!slot) return;
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    slot.zoom = clamp((slot.zoom || 1) * factor, 1, 3);
    redraw();
  }, { passive: false });
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---- export ------------------------------------------------------------------

async function exportOne() {
  const canvas = exportCanvas(state, state.size);
  const bytes = await downloadCanvas(canvas, `neon-coast-${state.size}.png`);
  setStatus(`Exported neon-coast-${state.size}.png (${Math.round(bytes / 1024)} KiB).`);
}

async function exportAll() {
  const sizes = ['1080x1080', '1080x1350', '1920x1080'];
  for (const key of sizes) {
    const canvas = exportCanvas(state, key);
    await downloadCanvas(canvas, `neon-coast-${key}.png`);
    await new Promise((r) => setTimeout(r, 250));
  }
  setStatus('Exported all three sizes.');
}

// ---- controls --------------------------------------------------------------

function wireControls() {
  $('photo-input').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      try {
        await addPhotoFile(file);
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    }
    event.target.value = '';
  });
  $('use-samples').addEventListener('click', async () => {
    await loadSamples();
    fillAllPanels();
  });
  $('fill-all').addEventListener('click', fillAllPanels);
  $('title-input').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle-input').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('badge-input').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  $('stars-input').addEventListener('change', (e) => { state.stars = Number(e.target.value); redraw(); });
  $('size-input').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
  $('zoom-input').addEventListener('input', (e) => {
    const slot = state.slots[state.selected];
    if (slot) {
      slot.zoom = Number(e.target.value) / 100;
      redraw();
    }
  });
  $('export-one').addEventListener('click', () => { exportOne().catch(() => setStatus('Export failed.')); });
  $('export-all').addEventListener('click', () => { exportAll().catch(() => setStatus('Export failed.')); });
  $('shuffle').addEventListener('click', () => {
    const i = GRADE_ORDER.indexOf(state.grade);
    state.grade = GRADE_ORDER[(i + 1) % GRADE_ORDER.length];
    document.querySelectorAll('#grade-picker .pick').forEach((el) => {
      el.classList.toggle('on', el.dataset.grade === state.grade);
    });
    redraw();
  });
}

// ---- ?shot= scenes and diagnostics ------------------------------------------

async function runShotScene() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (!shot) return false;

  if (query.get('layout') && LAYOUTS[query.get('layout')]) state.layout = query.get('layout');
  if (query.get('grade') && GRADES[query.get('grade')]) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('caption')) {
    state.title = query.get('caption');
    $('title-input').value = state.title;
  }
  if (query.get('subtitle')) {
    state.subtitle = query.get('subtitle');
    $('subtitle-input').value = state.subtitle;
  }

  await loadSamples();
  const first = query.get('photo') ?? 'pier';
  const second = query.get('photo2') ?? 'boulevard';
  const a = state.photos.findIndex((p) => p.label === first);
  const b = state.photos.findIndex((p) => p.label === second);
  ensureSlots();
  state.slots.forEach((slot, i) => {
    const pick = i % 2 === 0 ? a : b;
    if (pick >= 0) {
      slot.photo = state.photos[pick];
      slot.zoom = 1;
      slot.ox = 0;
      slot.oy = 0;
    }
  });
  state.activePhoto = a >= 0 ? a : 0;
  renderTray();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = sizeOf(state.size);
    renderCover(preview, state, w, h, false);
  } else {
    redraw();
  }

  if (query.get('diag') === '1') await writeDiagnostics();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
  return true;
}

// Diagnostics for the maker: which URLs the page loaded, and whether the
// export path writes a real PNG. Shown in #diag for headless checks.
async function writeDiagnostics() {
  const diag = $('diag');
  diag.hidden = false;
  const lines = [];
  const resources = performance.getEntriesByType('resource').map((r) => r.name);
  lines.push(`resources: ${resources.length}`);
  resources.forEach((url) => lines.push(`  ${url}`));
  const external = resources.filter((u) => !u.startsWith('http://localhost') && !u.startsWith('http://127.0.0.1'));
  lines.push(`external requests: ${external.length}`);
  try {
    const canvas = exportCanvas(state, state.size);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng = pngSig.every((v, i) => head[i] === v);
    lines.push(`export ${state.size}: PNG signature ${isPng ? 'OK' : 'BAD'}, ${blob.size} bytes, ${canvas.width}x${canvas.height}`);
  } catch (err) {
    lines.push(`export check failed: ${err.message}`);
  }
  diag.textContent = lines.join('\n');
}

// ---- boot --------------------------------------------------------------------

export async function startStudio() {
  buildPickers();
  wireControls();
  wireCanvas();
  const inShot = await runShotScene();
  if (inShot) return; // the scene already painted its own canvas; leave it alone
  await loadSamples();
  fillAllPanels();
  redraw();
}
