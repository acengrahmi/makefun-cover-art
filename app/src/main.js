// main.js — the Panel Heat editor: photo intake, panel selection and posing, the
// layout / grade / words controls, live preview, and one-click PNG export in the three
// post sizes. Everything runs locally; photos are read from the person's own machine
// and never uploaded anywhere.

import { gradePhotoToCanvas, gradeRecipeById } from './grade.js';
import {
  defaultPanelAdjusts, panelsForLayout, pointInPolygon, polygonBounds, tiltCardRect,
} from './panels.js';
import { EXPORT_SIZES, composeCover, coverFileName, createCoverState } from './cover.js';
import { readShotRequest } from './shots.js';

const SAMPLE_PHOTOS = [
  { id: 'convertible', label: 'Convertible on the boulevard', src: 'samples/convertible.jpg' },
  { id: 'rooftop', label: 'Rooftop at dusk', src: 'samples/rooftop.jpg' },
  { id: 'neon', label: 'Friends under neon', src: 'samples/neon.jpg' },
  { id: 'boulevard', label: 'Boulevard palms', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'The old pier', src: 'samples/pier.jpg' },
];

const state = createCoverState();
let selectedPanelIndex = 0;
let selectedSize = EXPORT_SIZES[1];
let shotCoverMode = false;
let photoSerial = 0;
const gradedCache = new Map();

const canvas = document.getElementById('previewCanvas');
const previewCtx = canvas.getContext('2d');
const statusLine = document.getElementById('statusLine');

function setStatus(text) {
  statusLine.textContent = text;
}

// The graded canvas for a photo at the current grade and ink setting, cached: grading
// is the only expensive step, and it happens once per photo per look.
function gradedFor(photo) {
  const key = `${photo.id}|${state.gradeId}|${state.inkMode ? 'ink' : 'flat'}`;
  if (!gradedCache.has(key)) {
    gradedCache.set(key, gradePhotoToCanvas(photo.img, gradeRecipeById(state.gradeId), { ink: state.inkMode }));
  }
  return gradedCache.get(key);
}

let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

function renderPreview() {
  if (shotCoverMode) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    composeCover(canvas, state, gradedFor);
    return;
  }
  const scale = Math.min(1000 / selectedSize.w, 1000 / selectedSize.h);
  canvas.width = Math.round(selectedSize.w * scale);
  canvas.height = Math.round(selectedSize.h * scale);
  composeCover(canvas, state, gradedFor);
  drawSelectionOverlay();
}

function drawSelectionOverlay() {
  const panels = panelsForLayout(state.layoutId);
  const panel = panels[selectedPanelIndex];
  if (!panel) return;
  const width = canvas.width;
  const height = canvas.height;
  previewCtx.save();
  previewCtx.strokeStyle = '#ff2d78';
  previewCtx.lineWidth = 3;
  previewCtx.setLineDash([11, 8]);
  if (panel.points) {
    previewCtx.beginPath();
    panel.points.forEach(([x, y], i) => {
      const px = x * width;
      const py = y * height;
      if (i === 0) previewCtx.moveTo(px, py);
      else previewCtx.lineTo(px, py);
    });
    previewCtx.closePath();
    previewCtx.stroke();
  } else {
    const rect = tiltCardRect(panel.card, width, height);
    previewCtx.translate(rect.cx, rect.cy);
    previewCtx.rotate(rect.rot);
    previewCtx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  }
  previewCtx.restore();
}

// ---------- photos ----------

function addPhoto(img, label) {
  const photo = { id: `photo-${photoSerial}`, label, img };
  photoSerial += 1;
  state.photos.push(photo);
  if (state.panels.length === 0) {
    state.panels = defaultPanelAdjusts(state.layoutId, state.photos.length);
  }
  buildPhotoTray();
  requestRender();
}

function loadImageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamplePhotos() {
  for (const sample of SAMPLE_PHOTOS) {
    const img = await loadImageFromUrl(sample.src);
    addPhoto(img, sample.label);
  }
}

function buildPhotoTray() {
  const tray = document.getElementById('photoTray');
  tray.replaceChildren();
  state.photos.forEach((photo, photoIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = `${photo.label} — pour into the selected panel`;
    if (state.panels.some((panel) => panel.photoIndex === photoIndex)) button.classList.add('in-use');
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.label;
    button.append(img);
    button.addEventListener('click', () => {
      const adjust = state.panels[selectedPanelIndex];
      if (adjust) adjust.photoIndex = photoIndex;
      buildPhotoTray();
      requestRender();
    });
    tray.append(button);
  });
}

function acceptPhotoFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    loadImageFromUrl(url).then((img) => {
      addPhoto(img, file.name);
      setStatus(`${file.name} added — it is in the tray, ready to pour into a panel.`);
    });
  }
}

// ---------- panel posing ----------

function panelBoundsPx(index) {
  const panel = panelsForLayout(state.layoutId)[index];
  if (!panel) return { w: canvas.width, h: canvas.height };
  if (panel.points) {
    const bounds = polygonBounds(panel.points);
    return { w: bounds.w * canvas.width, h: bounds.h * canvas.height };
  }
  const rect = tiltCardRect(panel.card, canvas.width, canvas.height);
  return { w: rect.w, h: rect.h };
}

function panelIndexAtPx(px, py) {
  const panels = panelsForLayout(state.layoutId);
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const panel = panels[i];
    if (panel.points) {
      if (pointInPolygon(px / canvas.width, py / canvas.height, panel.points)) return i;
    } else {
      const rect = tiltCardRect(panel.card, canvas.width, canvas.height);
      const dx = px - rect.cx;
      const dy = py - rect.cy;
      const cos = Math.cos(-rect.rot);
      const sin = Math.sin(-rect.rot);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      if (Math.abs(localX) <= rect.w / 2 && Math.abs(localY) <= rect.h / 2) return i;
    }
  }
  return -1;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function clampPan(value) {
  return Math.min(0.6, Math.max(-0.6, value));
}

function selectPanel(index) {
  selectedPanelIndex = index;
  syncSelectedPanelUi();
  requestRender();
}

function syncSelectedPanelUi() {
  const panels = panelsForLayout(state.layoutId);
  document.getElementById('selectedPanelLabel').textContent =
    `Panel ${selectedPanelIndex + 1} of ${panels.length} — drag it on the cover, or pour a photo into it`;
  const adjust = state.panels[selectedPanelIndex];
  document.getElementById('zoomRange').value = adjust ? String(adjust.zoom) : '1';
}

let dragState = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const index = panelIndexAtPx(point.x, point.y);
  if (index >= 0) selectPanel(index);
  const adjust = state.panels[selectedPanelIndex];
  if (!adjust) return;
  dragState = { x: point.x, y: point.y, panX: adjust.panX, panY: adjust.panY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragState) return;
  const point = canvasPoint(event);
  const adjust = state.panels[selectedPanelIndex];
  const bounds = panelBoundsPx(selectedPanelIndex);
  adjust.panX = clampPan(dragState.panX + (point.x - dragState.x) / Math.max(1, bounds.w));
  adjust.panY = clampPan(dragState.panY + (point.y - dragState.y) / Math.max(1, bounds.h));
  requestRender();
});
canvas.addEventListener('pointerup', () => { dragState = null; });
canvas.addEventListener('pointercancel', () => { dragState = null; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const index = panelIndexAtPx(point.x, point.y);
  if (index >= 0 && index !== selectedPanelIndex) selectPanel(index);
  const adjust = state.panels[selectedPanelIndex];
  if (!adjust) return;
  adjust.zoom = Math.min(3, Math.max(1, adjust.zoom * (event.deltaY < 0 ? 1.07 : 0.93)));
  syncSelectedPanelUi();
  requestRender();
}, { passive: false });

// ---------- controls ----------

function markPressed(containerId, attr, value) {
  document.querySelectorAll(`#${containerId} button`).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[attr] === value));
  });
}

function bindChoiceGrid(containerId, attr, onPick) {
  document.getElementById(containerId).addEventListener('click', (event) => {
    const button = event.target.closest(`button[data-${attr}]`);
    if (button) onPick(button.dataset[attr]);
  });
}

function setLayout(layoutId) {
  state.layoutId = layoutId;
  state.panels = defaultPanelAdjusts(layoutId, state.photos.length);
  selectedPanelIndex = 0;
  markPressed('layoutChoices', 'layout', layoutId);
  buildPhotoTray();
  syncSelectedPanelUi();
  requestRender();
}

function setGrade(gradeId) {
  state.gradeId = gradeId;
  gradedCache.clear();
  markPressed('gradeChoices', 'grade', gradeId);
  requestRender();
}

function setSize(sizeId) {
  selectedSize = EXPORT_SIZES.find((size) => size.id === sizeId) ?? EXPORT_SIZES[0];
  markPressed('sizeChoices', 'size', selectedSize.id);
  requestRender();
}

function bindControls() {
  bindChoiceGrid('layoutChoices', 'layout', setLayout);
  bindChoiceGrid('gradeChoices', 'grade', setGrade);
  bindChoiceGrid('sizeChoices', 'size', (sizeId) => setSize(sizeId));

  const photoInput = document.getElementById('photoInput');
  photoInput.addEventListener('change', () => acceptPhotoFiles(photoInput.files ?? []));
  const dropZone = document.getElementById('dropZone');
  for (const target of [dropZone, canvas]) {
    target.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('dragging');
    });
    target.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
    target.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragging');
      acceptPhotoFiles(event.dataTransfer?.files ?? []);
    });
  }

  document.getElementById('inkToggle').addEventListener('change', (event) => {
    state.inkMode = event.target.checked;
    gradedCache.clear();
    requestRender();
  });
  document.getElementById('halftoneToggle').addEventListener('change', (event) => {
    state.halftone = event.target.checked;
    requestRender();
  });
  document.getElementById('titleInput').addEventListener('input', (event) => {
    state.title = event.target.value;
    requestRender();
  });
  document.getElementById('subtitleInput').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    requestRender();
  });
  document.getElementById('captionInput').addEventListener('input', (event) => {
    state.caption = event.target.value;
    requestRender();
  });
  document.getElementById('heatRange').addEventListener('input', (event) => {
    state.heat = Number(event.target.value);
    document.getElementById('heatValue').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    requestRender();
  });
  document.getElementById('zoomRange').addEventListener('input', (event) => {
    const adjust = state.panels[selectedPanelIndex];
    if (adjust) adjust.zoom = Number(event.target.value);
    requestRender();
  });
  document.getElementById('centerPanelButton').addEventListener('click', () => {
    const adjust = state.panels[selectedPanelIndex];
    if (adjust) {
      adjust.panX = 0;
      adjust.panY = 0;
    }
    requestRender();
  });
  document.getElementById('fillPanelsButton').addEventListener('click', () => {
    const adjust = state.panels[selectedPanelIndex];
    if (!adjust) return;
    state.panels.forEach((panel) => { panel.photoIndex = adjust.photoIndex; });
    buildPhotoTray();
    requestRender();
  });
  document.getElementById('exportButton').addEventListener('click', () => exportPng(selectedSize));
  document.getElementById('exportAllButton').addEventListener('click', () => {
    EXPORT_SIZES.forEach((size, i) => setTimeout(() => exportPng(size), i * 400));
  });
}

// ---------- export ----------

function exportPng(size) {
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  composeCover(out, state, gradedFor);
  out.toBlob((blob) => {
    if (!blob) return;
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = coverFileName(size);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 4000);
    setStatus(`Exported ${coverFileName(size)} — a ${size.w} × ${size.h} PNG, ready to post.`);
  }, 'image/png');
}

// ---------- screenshot scenes & start ----------

function applyShotRequest(shot) {
  if (shot.layoutId) setLayout(shot.layoutId);
  if (shot.gradeId) setGrade(shot.gradeId);
  if (shot.ink) {
    state.inkMode = true;
    document.getElementById('inkToggle').checked = true;
    gradedCache.clear();
  }
  if (shot.title !== undefined) {
    state.title = shot.title;
    document.getElementById('titleInput').value = shot.title;
  }
  if (shot.subtitle !== undefined) {
    state.subtitle = shot.subtitle;
    document.getElementById('subtitleInput').value = shot.subtitle;
  }
  if (shot.caption !== undefined) {
    state.caption = shot.caption;
    document.getElementById('captionInput').value = shot.caption;
  }
  if (shot.heat !== undefined && Number.isFinite(shot.heat)) {
    state.heat = Math.min(5, Math.max(0, shot.heat));
    document.getElementById('heatRange').value = String(state.heat);
  }
  if (shot.sizeId) setSize(shot.sizeId);
  if (shot.kind === 'cover') {
    shotCoverMode = true;
    document.body.classList.add('shot-cover');
  }
}

async function init() {
  bindControls();
  markPressed('layoutChoices', 'layout', state.layoutId);
  markPressed('gradeChoices', 'grade', state.gradeId);
  markPressed('sizeChoices', 'size', selectedSize.id);
  await loadSamplePhotos();
  await Promise.all([
    document.fonts.load('90px Anton'),
    document.fonts.load('40px Pacifico'),
  ]);
  await document.fonts.ready;
  const shot = readShotRequest();
  if (shot) applyShotRequest(shot);
  syncSelectedPanelUi();
  renderPreview();
  if (shot) {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  }
}

init();
