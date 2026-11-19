// Neon Coast — editor wiring: state, tray, chips, drag-to-pan, export.
// The drawing itself lives in render.js; this file only owns the page.
import { GRADES, LAYOUTS, SIZES, drawCover, exportCoverPng, layoutFrames } from './render.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const statusEl = $('status');

const state = {
  layout: 'collage',
  grade: 'sunset',
  size: '1080x1080',
  title: 'SUNSET HEIST',
  subtitle: 'Neon Coast',
  badge: 'NEON COAST',
  stars: 5,
  photos: [],          // { name, img }
  slots: [],           // { img, zoom, ox, oy } — one per layout slot, max 5
  selected: 0,
  selectedPhoto: 0,
};
for (let i = 0; i < 5; i++) state.slots.push({ img: null, zoom: 1, ox: 0, oy: 0 });

let shotMode = false;
let drawQueued = false;

function currentSize() {
  return SIZES[state.size] || SIZES['1080x1080'];
}

function redraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    const [w, h] = currentSize();
    drawCover(stage, state, w, h);
    syncPanelInfo();
  });
}

function note(msg) {
  statusEl.textContent = msg;
  window.clearTimeout(note._t);
  note._t = window.setTimeout(() => { statusEl.textContent = ''; }, 4000);
}

// ---------- photos ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function addPhoto(name, src) {
  const img = await loadImage(src);
  state.photos.push({ name, img });
  renderTray();
  return state.photos.length - 1;
}

async function loadSamples() {
  const pier = await addPhoto('Pier', 'samples/pier.jpg');
  const blvd = await addPhoto('Boulevard', 'samples/boulevard.jpg');
  // Default spread: pier in the hero slot, boulevard across the small ones.
  state.slots[0].img = state.photos[pier].img;
  for (let i = 1; i < 5; i++) state.slots[i].img = state.photos[blvd].img;
  state.selectedPhoto = pier;
  renderTray();
}

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.backgroundImage = `url("${p.img.src}")`;
    b.setAttribute('aria-pressed', String(state.selectedPhoto === i));
    b.title = p.name;
    const label = document.createElement('span');
    label.textContent = p.name;
    b.appendChild(label);
    b.addEventListener('click', () => {
      state.selectedPhoto = i;
      const slot = state.slots[state.selected];
      if (slot) { slot.img = p.img; slot.zoom = 1; slot.ox = 0; slot.oy = 0; }
      renderTray();
      redraw();
    });
    tray.appendChild(b);
  });
}

$('uploader').addEventListener('change', async (e) => {
  const files = [...(e.target.files || [])];
  for (const f of files) {
    const dataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    });
    await addPhoto(f.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo', dataUrl);
  }
  note(`${files.length} photo${files.length === 1 ? '' : 's'} added — click a panel, then a photo, to place it.`);
  e.target.value = '';
  redraw();
});

$('fillAll').addEventListener('click', () => {
  const p = state.photos[state.selectedPhoto];
  if (!p) return;
  for (const slot of state.slots) { slot.img = p.img; slot.zoom = 1; slot.ox = 0; slot.oy = 0; }
  note(`Filled every panel with “${p.name}”.`);
  redraw();
});

// ---------- layout + grade chips ----------
function buildChips(container, entries, current, onPick, swatchOf) {
  const box = $(container);
  box.innerHTML = '';
  for (const [key, def] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    if (swatchOf) {
      const sw = document.createElement('span');
      sw.className = 'grade-swatch';
      sw.style.background = swatchOf(def);
      b.prepend(sw);
    }
    b.setAttribute('aria-pressed', String(current === key));
    b.addEventListener('click', () => {
      onPick(key);
      buildChips(container, entries, key, onPick, swatchOf);
      redraw();
    });
    box.appendChild(b);
  }
}

buildChips('layoutRow', LAYOUTS, state.layout, (k) => {
  state.layout = k;
  state.selected = 0;
});
buildChips('gradeRow', GRADES, state.grade, (k) => { state.grade = k; }, (g) => g.swatch);

// ---------- lettering + size ----------
$('titleIn').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subIn').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('badgeIn').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
$('starsIn').addEventListener('input', (e) => { state.stars = Number(e.target.value); redraw(); });
$('sizeSel').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });

const zoomIn = $('zoomIn');
zoomIn.addEventListener('input', () => {
  const slot = state.slots[state.selected];
  if (slot) slot.zoom = Number(zoomIn.value);
  redraw();
});

function syncPanelInfo() {
  const layout = LAYOUTS[state.layout];
  const slot = state.slots[state.selected];
  zoomIn.value = String(slot ? slot.zoom : 1);
  $('panelInfo').textContent =
    `Panel ${state.selected + 1} of ${layout.slots} · ${slot && slot.img ? 'photo placed — drag to pan' : 'empty — pick a photo below'}`;
}

// ---------- panel picking, pan, zoom on the preview ----------
function previewFrames() {
  const [w, h] = currentSize();
  const bandH = Math.round(h * 0.19);
  const { frames, titleTop } = layoutFrames(state.layout, w, h - bandH);
  const artY = titleTop ? bandH : 0;
  return frames.map((f) => ({ ...f, y: f.y + artY }));
}

function eventPoint(e) {
  const r = stage.getBoundingClientRect();
  const [w, h] = currentSize();
  return {
    x: (e.clientX - r.left) / r.width * w,
    y: (e.clientY - r.top) / r.height * h,
  };
}

function hitPanel(p) {
  const frames = previewFrames();
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i];
    // Undo the tilt for snapshots so the hit box follows the frame.
    let px = p.x; let py = p.y;
    if (f.rot) {
      const cx = f.x + f.w / 2; const cy = f.y + f.h / 2;
      const c = Math.cos(-f.rot); const s = Math.sin(-f.rot);
      const dx = p.x - cx; const dy = p.y - cy;
      px = cx + dx * c - dy * s;
      py = cy + dx * s + dy * c;
    }
    if (px >= f.x && px <= f.x + f.w && py >= f.y && py <= f.y + f.h) return i;
  }
  return -1;
}

let dragging = null;
stage.addEventListener('pointerdown', (e) => {
  const p = eventPoint(e);
  const i = hitPanel(p);
  if (i < 0) return;
  state.selected = i;
  stage.setPointerCapture(e.pointerId);
  dragging = { x: p.x, y: p.y, frame: previewFrames()[i] };
  syncPanelInfo();
  redraw();
});
stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = eventPoint(e);
  const slot = state.slots[state.selected];
  if (!slot || !slot.img) return;
  slot.ox += (p.x - dragging.x) / dragging.frame.w;
  slot.oy += (p.y - dragging.y) / dragging.frame.h;
  slot.ox = Math.max(-0.6, Math.min(0.6, slot.ox));
  slot.oy = Math.max(-0.6, Math.min(0.6, slot.oy));
  dragging.x = p.x; dragging.y = p.y;
  redraw();
});
stage.addEventListener('pointerup', () => { dragging = null; });
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.slots[state.selected];
  if (!slot) return;
  slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// ---------- export ----------
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportOne() {
  const [w, h] = currentSize();
  const blob = await exportCoverPng(state, w, h);
  downloadBlob(blob, `neon-coast-${w}x${h}.png`);
  note(`Exported neon-coast-${w}x${h}.png — check your downloads.`);
}

$('exportOne').addEventListener('click', exportOne);
$('exportAll').addEventListener('click', async () => {
  for (const key of Object.keys(SIZES)) {
    const [w, h] = SIZES[key];
    const blob = await exportCoverPng(state, w, h);
    downloadBlob(blob, `neon-coast-${w}x${h}.png`);
    await new Promise((r) => window.setTimeout(r, 350));
  }
  note('Exported all three sizes.');
});

// Test / screenshot hook: lets the shot scenes and the headless checks
// export a PNG and read its bytes without touching the downloads folder.
window.__neon = {
  state,
  redraw,
  exportPngDataUrl: async (w, h) => {
    const blob = await exportCoverPng(state, w, h);
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  },
};

// ---------- boot ----------
const params = new URLSearchParams(location.search);
shotMode = params.has('shot');
if (shotMode) {
  document.body.classList.add('shot-cover');
  await loadSamples();
  await runShot(params.get('shot'), params, state, redraw);
} else {
  await loadSamples();
  redraw();
}
