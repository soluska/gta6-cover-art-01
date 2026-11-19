// main.js — wires the Neon Vice editor: photo intake (files, drag and drop, samples, a portrait the
// app draws itself), the layout and panel editors, live preview with drag-to-position and
// scroll-to-zoom, and one-click PNG export in the three post sizes. A `?shot=` query instead sets
// up a fixed scene for the maker's screenshots (./shots.js).
import { drawCover, layoutById, LAYOUTS, defaultPanelPlan } from './cover.js';
import { SCENES } from './scenes.js';
import { drawDemoPortrait } from './scenes.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');

const state = {
  photos: [],            // [{ img, name }] — img is an Image or a canvas, always local
  layout: 'classic',
  panels: [],
  grade: 'sunset',
  caption: captionInput.value,
  subtitle: subtitleInput.value,
  titlePos: 'top',
  titleStyle: 'sunset',
  size: [1080, 1080],
  selectedPanel: 0,
};

function redraw() {
  drawCover(canvas, { ...state, showSelection: state.selectedPanel != null });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the tray and, if the hero panel is still empty of photos, puts it there. */
function addPhoto(img, name) {
  state.photos.push({ img, name });
  if (state.photos.length === 1) {
    state.panels = defaultPanelPlan(layoutById(state.layout));
    renderPanelList();
  }
  renderPhotoList();
  redraw();
  status.textContent = `${name} loaded — assign it to any panel, or export as is.`;
}

function renderPhotoList() {
  const list = document.getElementById('photo-list');
  list.replaceChildren();
  state.photos.forEach((photo, i) => {
    const fig = document.createElement('figure');
    const thumb = document.createElement('img');
    thumb.src = photo.img.currentSrc ?? photo.img.toDataURL?.() ?? '';
    thumb.alt = photo.name;
    const cap = document.createElement('figcaption');
    cap.textContent = `${i + 1}. ${photo.name}`;
    fig.append(thumb, cap);
    list.append(fig);
  });
}

// ---- photo intake -----------------------------------------------------------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('photo');
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
for (const event of ['dragover', 'dragenter']) {
  dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add('dragging'); });
}
for (const event of ['dragleave', 'drop']) {
  dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove('dragging'); });
}
dropzone.addEventListener('drop', async (e) => {
  for (const file of e.dataTransfer.files) await takeFile(file);
});
fileInput.addEventListener('change', async () => {
  for (const file of fileInput.files) await takeFile(file);
  fileInput.value = '';
});

async function takeFile(file) {
  if (!file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  addPhoto(img, file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 18) || 'Photo');
}

document.getElementById('sample-pier').addEventListener('click', async () => {
  addPhoto(await loadImage('samples/pier.jpg'), 'Pier sample');
});
document.getElementById('sample-boulevard').addEventListener('click', async () => {
  addPhoto(await loadImage('samples/boulevard.jpg'), 'Boulevard sample');
});
document.getElementById('sample-demo').addEventListener('click', () => {
  addPhoto(drawDemoPortrait(), 'Demo portrait');
});

// ---- layout + grade ---------------------------------------------------------
const layoutsBox = document.getElementById('layouts');
for (const layout of LAYOUTS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `chip${layout.id === state.layout ? ' is-on' : ''}`;
  button.textContent = layout.label;
  button.addEventListener('click', () => {
    state.layout = layout.id;
    state.panels = defaultPanelPlan(layout);
    state.selectedPanel = 0;
    for (const b of layoutsBox.children) b.classList.toggle('is-on', b === button);
    renderPanelList();
    redraw();
  });
  layoutsBox.append(button);
}
document.getElementById('grade').addEventListener('change', (e) => {
  state.grade = e.target.value;
  redraw();
});

// ---- panel editor -----------------------------------------------------------
const panelList = document.getElementById('panel-list');
const chipsBox = document.getElementById('content-chips');
const panelName = document.getElementById('panel-name');
const treatmentSelect = document.getElementById('panel-treatment');
const zoomRange = document.getElementById('panel-zoom');

function planSummary(plan) {
  if (!plan) return '—';
  if (plan.kind === 'scene') return `Scene · ${SCENES.find((s) => s.id === plan.scene)?.label ?? plan.scene}`;
  return `Photo ${plan.photo + 1}${plan.treatment ? ` · ${plan.treatment}` : ''}`;
}

function renderPanelList() {
  const layout = layoutById(state.layout);
  panelList.replaceChildren();
  layout.panels.forEach((rect, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `panel-row${i === state.selectedPanel ? ' is-on' : ''}`;
    const left = document.createElement('span');
    left.textContent = rect.role === 'hero' ? `Panel ${i + 1} · Hero` : `Panel ${i + 1}`;
    const right = document.createElement('small');
    right.textContent = planSummary(state.panels[i]);
    row.append(left, right);
    row.addEventListener('click', () => selectPanel(i));
    panelList.append(row);
  });
  renderPanelEditor();
}

function selectPanel(i) {
  state.selectedPanel = i;
  renderPanelList();
  redraw();
}

function renderPanelEditor() {
  const i = state.selectedPanel;
  const plan = state.panels[i];
  chipsBox.replaceChildren();
  if (!plan) { panelName.textContent = 'Pick a panel to edit it.'; return; }
  panelName.textContent = `Panel ${i + 1} — choose what fills it:`;
  state.photos.forEach((photo, pi) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${plan.kind === 'photo' && plan.photo === pi ? ' is-on' : ''}`;
    chip.textContent = `Photo ${pi + 1}`;
    chip.addEventListener('click', () => {
      state.panels[i] = plan.kind === 'photo' && plan.photo === pi
        ? plan
        : { kind: 'photo', photo: pi, treatment: null, zoom: 1, ox: 0.5, oy: 0.5 };
      renderPanelList(); redraw();
    });
    chipsBox.append(chip);
  });
  for (const scene of SCENES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${plan.kind === 'scene' && plan.scene === scene.id ? ' is-on' : ''}`;
    chip.textContent = scene.label;
    chip.addEventListener('click', () => {
      state.panels[i] = { kind: 'scene', scene: scene.id };
      renderPanelList(); redraw();
    });
    chipsBox.append(chip);
  }
  const isPhoto = plan.kind === 'photo';
  treatmentSelect.disabled = !isPhoto;
  zoomRange.disabled = !isPhoto;
  if (isPhoto) {
    treatmentSelect.value = plan.treatment ?? '';
    zoomRange.value = plan.zoom ?? 1;
  }
}

treatmentSelect.addEventListener('change', () => {
  const plan = state.panels[state.selectedPanel];
  if (plan?.kind === 'photo') {
    plan.treatment = treatmentSelect.value || null;
    renderPanelList(); redraw();
  }
});
zoomRange.addEventListener('input', () => {
  const plan = state.panels[state.selectedPanel];
  if (plan?.kind === 'photo') {
    plan.zoom = Number(zoomRange.value);
    redraw();
  }
});

// ---- words ------------------------------------------------------------------
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('title-pos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
document.getElementById('title-style').addEventListener('change', (e) => { state.titleStyle = e.target.value; redraw(); });

// ---- sizes + export ---------------------------------------------------------
const sizesBox = document.getElementById('sizes');
for (const button of sizesBox.querySelectorAll('.size')) {
  button.addEventListener('click', () => {
    const [w, h] = button.dataset.size.split('x').map(Number);
    state.size = [w, h];
    canvas.width = w; canvas.height = h;
    for (const b of sizesBox.children) b.classList.toggle('is-on', b === button);
    redraw();
  });
}

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = state.size;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  drawCover(out, { ...state, showSelection: false });
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved neon-vice-cover-${w}x${h}.png — post it anywhere.`;
  }, 'image/png');
});

document.getElementById('shuffle').addEventListener('click', () => {
  state.panels = state.panels.map((plan) => {
    if (plan.kind !== 'scene') return plan;
    let next = plan.scene;
    while (next === plan.scene) next = SCENES[Math.floor(Math.random() * SCENES.length)].id;
    return { ...plan, scene: next };
  });
  renderPanelList();
  redraw();
});

// ---- drag to position, scroll to zoom ---------------------------------------
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const fx = (clientX - box.left) / box.width;
  const fy = (clientY - box.top) / box.height;
  const layout = layoutById(state.layout);
  const index = layout.panels.findIndex((r) => fx >= r.x && fx < r.x + r.w && fy >= r.y && fy < r.y + r.h);
  return { index, fx, fy };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { index } = panelAt(e.clientX, e.clientY);
  if (index < 0) return;
  selectPanel(index);
  const plan = state.panels[index];
  if (plan?.kind === 'photo') {
    drag = { index, x: e.clientX, y: e.clientY, ox: plan.ox ?? 0.5, oy: plan.oy ?? 0.5 };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const plan = state.panels[drag.index];
  const photo = state.photos[plan.photo];
  if (!photo) return;
  const rect = layoutById(state.layout).panels[drag.index];
  const box = canvas.getBoundingClientRect();
  const pw = rect.w * canvas.width, ph = rect.h * canvas.height;
  const iw = photo.img.naturalWidth || photo.img.width, ih = photo.img.naturalHeight || photo.img.height;
  const scale = Math.max(pw / iw, ph / ih) * (plan.zoom ?? 1);
  const overflowX = Math.max(1, iw * scale - pw), overflowY = Math.max(1, ih * scale - ph);
  const dx = (e.clientX - drag.x) * (canvas.width / box.width);
  const dy = (e.clientY - drag.y) * (canvas.height / box.height);
  plan.ox = Math.min(1, Math.max(0, drag.ox - dx / overflowX));
  plan.oy = Math.min(1, Math.max(0, drag.oy - dy / overflowY));
  redraw();
});
for (const event of ['pointerup', 'pointercancel']) canvas.addEventListener(event, () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const { index } = panelAt(e.clientX, e.clientY);
  const plan = state.panels[index];
  if (!plan || plan.kind !== 'photo') return;
  e.preventDefault();
  selectPanel(index);
  plan.zoom = Math.min(3.2, Math.max(1, (plan.zoom ?? 1) * (e.deltaY < 0 ? 1.07 : 0.93)));
  zoomRange.value = plan.zoom;
  redraw();
}, { passive: false });

// ---- start ------------------------------------------------------------------
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (sample, text) => {
    const img = await loadImage(sample);
    state.photos = [{ img, name: 'Sample' }];
    if (sample.includes('boulevard')) state.layout = 'mosaic';
    [...layoutsBox.children].forEach((b, bi) => b.classList.toggle('is-on', LAYOUTS[bi].id === state.layout));
    state.panels = defaultPanelPlan(layoutById(state.layout));
    state.selectedPanel = shot === 'cover' ? null : 0;
    state.caption = text;
    captionInput.value = text;
    renderPhotoList();
    renderPanelList();
    redraw();
  });
} else {
  state.panels = defaultPanelPlan(layoutById(state.layout));
  addPhoto(drawDemoPortrait(), 'Demo portrait');
  renderPanelList();
  redraw();
}
