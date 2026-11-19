// cover.js — the poster press. Composes a cover from a layout of panels (photos graded by grade.js,
// backdrops drawn by scenes.js), lays the caption in big stacked display lettering over a scrim,
// and finishes with the white panel gutters, a credits bar, grain and a vignette.
import { gradedPhoto } from './grade.js';
import { drawScene, SCENES } from './scenes.js';

// Panel rectangles are fractions of the canvas; the first is always the hero. The masthead zone at
// the top is left panel-free so the title sits on the art the way a game cover's does.
export const LAYOUTS = [
  {
    id: 'classic', label: 'Classic Six',
    panels: [
      { x: 0.0, y: 0.15, w: 0.62, h: 0.55, role: 'hero' },
      { x: 0.62, y: 0.15, w: 0.38, h: 0.275, role: 'panel' },
      { x: 0.62, y: 0.425, w: 0.38, h: 0.275, role: 'panel' },
      { x: 0.0, y: 0.70, w: 0.34, h: 0.30, role: 'panel' },
      { x: 0.34, y: 0.70, w: 0.33, h: 0.30, role: 'panel' },
      { x: 0.67, y: 0.70, w: 0.33, h: 0.30, role: 'panel' },
    ],
  },
  {
    id: 'mosaic', label: 'Mosaic Eight',
    panels: [
      { x: 0.27, y: 0.30, w: 0.46, h: 0.44, role: 'hero' },
      { x: 0.0, y: 0.15, w: 0.27, h: 0.30, role: 'panel' },
      { x: 0.73, y: 0.15, w: 0.27, h: 0.30, role: 'panel' },
      { x: 0.0, y: 0.45, w: 0.27, h: 0.29, role: 'panel' },
      { x: 0.73, y: 0.45, w: 0.27, h: 0.29, role: 'panel' },
      { x: 0.0, y: 0.74, w: 0.34, h: 0.26, role: 'panel' },
      { x: 0.34, y: 0.74, w: 0.39, h: 0.26, role: 'panel' },
      { x: 0.73, y: 0.74, w: 0.27, h: 0.26, role: 'panel' },
      { x: 0.27, y: 0.15, w: 0.46, h: 0.15, role: 'panel' },
    ],
  },
  {
    id: 'strip', label: 'Split Strip',
    panels: [
      { x: 0.0, y: 0.15, w: 0.55, h: 0.85, role: 'hero' },
      { x: 0.55, y: 0.15, w: 0.45, h: 0.283, role: 'panel' },
      { x: 0.55, y: 0.433, w: 0.45, h: 0.284, role: 'panel' },
      { x: 0.55, y: 0.717, w: 0.45, h: 0.283, role: 'panel' },
    ],
  },
  {
    id: 'wide', label: 'Wide Story',
    panels: [
      { x: 0.0, y: 0.15, w: 0.66, h: 0.49, role: 'hero' },
      { x: 0.66, y: 0.15, w: 0.34, h: 0.49, role: 'panel' },
      { x: 0.0, y: 0.64, w: 0.33, h: 0.36, role: 'panel' },
      { x: 0.33, y: 0.64, w: 0.34, h: 0.36, role: 'panel' },
      { x: 0.67, y: 0.64, w: 0.33, h: 0.36, role: 'panel' },
    ],
  },
];

/** The layout object for an id, falling back to Classic Six. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

const SCENE_ROTATION = ['skyline', 'car', 'palms', 'boat', 'flamingo', 'chopper'];
const SLICE_FOCI = [
  { ox: 0.5, oy: 0.25 }, { ox: 0.28, oy: 0.6 }, { ox: 0.72, oy: 0.45 }, { ox: 0.5, oy: 0.75 },
];

/**
 * The starter plan for a layout: the hero takes the first photo full-frame; the other panels
 * alternate a drawn scene with a zoomed slice of the photo, so one photo fills a whole cover
 * and extra photos can be swapped in panel by panel.
 */
export function defaultPanelPlan(layout) {
  return layout.panels.map((panel, i) => {
    if (i === 0) return { kind: 'photo', photo: 0, treatment: null, zoom: 1, ox: 0.5, oy: 0.5 };
    if (i % 2 === 1) return { kind: 'scene', scene: SCENE_ROTATION[(i - 1) / 2 % SCENE_ROTATION.length] };
    const focus = SLICE_FOCI[(i / 2 - 1) % SLICE_FOCI.length];
    return { kind: 'photo', photo: 0, treatment: i % 4 === 0 ? 'duotone' : null, zoom: 1.7, ox: focus.ox, oy: focus.oy };
  });
}

/** Draws the whole cover described by `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const layout = layoutById(state.layout);
  ctx.fillStyle = '#160a2a';
  ctx.fillRect(0, 0, W, H);
  layout.panels.forEach((rect, i) => {
    const plan = state.panels[i] ?? defaultPanelPlan(layout)[i];
    const px = rect.x * W, py = rect.y * H, pw = rect.w * W, ph = rect.h * H;
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    if (plan.kind === 'photo' && state.photos[plan.photo]) {
      paintPanelPhoto(ctx, state.photos[plan.photo], plan, state, px, py, pw, ph);
    } else {
      drawScene(ctx, plan.kind === 'scene' ? plan.scene : 'palms', px, py, pw, ph);
    }
    paintPanelShade(ctx, px, py, pw, ph);
    ctx.restore();
  });
  paintGutters(ctx, layout, W, H);
  drawMasthead(ctx, state, W, H);
  drawCreditsBar(ctx, state, W, H);
  applyGrainAndVignette(ctx, W, H);
  if (state.selectedPanel != null && state.showSelection) {
    const rect = layout.panels[state.selectedPanel];
    if (rect) {
      ctx.strokeStyle = '#22e6ff';
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.strokeRect(rect.x * W + 2, rect.y * H + 2, rect.w * W - 4, rect.h * H - 4);
    }
  }
}

/** Paints one photo into a panel: graded, cover-fitted, positioned by the plan's focus and zoom. */
function paintPanelPhoto(ctx, photo, plan, state, px, py, pw, ph) {
  const treatment = plan.treatment ?? state.grade;
  const source = gradedPhoto(photo.img, treatment);
  const iw = source.width, ih = source.height;
  const scale = Math.max(pw / iw, ph / ih) * (plan.zoom ?? 1);
  const dw = iw * scale, dh = ih * scale;
  const dx = px - (dw - pw) * (plan.ox ?? 0.5);
  const dy = py - (dh - ph) * (plan.oy ?? 0.5);
  ctx.drawImage(source, dx, dy, dw, dh);
}

/** A soft inner shade at a panel's edges, so each cell sits into the page like a printed frame. */
function paintPanelShade(ctx, px, py, pw, ph) {
  const edge = Math.min(pw, ph) * 0.16;
  const grad = ctx.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0, 'rgba(10, 2, 24, 0.22)');
  grad.addColorStop(0.25, 'rgba(10, 2, 24, 0)');
  grad.addColorStop(0.8, 'rgba(10, 2, 24, 0)');
  grad.addColorStop(1, 'rgba(10, 2, 24, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(255, 190, 90, 0.05)';
  ctx.fillRect(px, py, pw, edge * 0.4);
}

/** The white gutters between panels and the poster's outer frame line. */
function paintGutters(ctx, layout, W, H) {
  const gutter = Math.max(3, Math.min(W, H) * 0.009);
  ctx.strokeStyle = '#f7f3ea';
  ctx.lineWidth = gutter;
  for (const rect of layout.panels) {
    ctx.strokeRect(rect.x * W, rect.y * H, rect.w * W, rect.h * H);
  }
  ctx.lineWidth = gutter * 1.6;
  ctx.strokeRect(0, 0, W, H);
}

const TITLE_FONT = '"Noto Sans Display", "Arial Black", "Liberation Sans", "DejaVu Sans", sans-serif';

/** Splits a caption into stacked lines: one word a line when short, else wrapped to width. */
function stackCaption(ctx, text, maxWidth, size) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  if (words.length <= 3) {
    const lines = [words[0]];
    for (let i = 1; i < words.length; i++) {
      const joined = `${lines[lines.length - 1]} ${words[i]}`;
      ctx.font = titleFont(size);
      if (ctx.measureText(joined).width * 0.86 <= maxWidth && words.length > 2) lines[lines.length - 1] = joined;
      else lines.push(words[i]);
    }
    return lines;
  }
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    ctx.font = titleFont(size);
    if (ctx.measureText(next).width * 0.86 > maxWidth && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function titleFont(size) {
  return `italic 900 ${size}px ${TITLE_FONT}`;
}

/** Draws one line of display lettering: condensed, sheared, outlined, with a hard offset shadow. */
function drawTitleLine(ctx, line, cx, cy, size, style) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.07, 1, 0, 0);
  ctx.scale(0.86, 1);
  ctx.font = titleFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(255, 46, 126, 0.85)';
  ctx.fillText(line, size * 0.045, size * 0.06);
  ctx.strokeStyle = '#14061f';
  ctx.lineWidth = size * 0.17;
  ctx.strokeText(line, 0, 0);
  if (style === 'white') ctx.fillStyle = '#ffffff';
  else if (style === 'neon') ctx.fillStyle = '#2ee6ff';
  else {
    const grad = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.55);
    grad.addColorStop(0, '#fff6b8'); grad.addColorStop(0.45, '#ffc44d');
    grad.addColorStop(0.75, '#ff7a42'); grad.addColorStop(1, '#ff2e7e');
    ctx.fillStyle = grad;
  }
  ctx.fillText(line, 0, 0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.save();
  ctx.beginPath(); ctx.rect(-size * 4, -size * 0.52, size * 8, size * 0.3); ctx.clip();
  ctx.fillText(line, 0, 0);
  ctx.restore();
  ctx.restore();
}

/** The masthead: letterspaced kicker over the stacked caption, on a scrim at the chosen edge. */
function drawMasthead(ctx, state, W, H) {
  const top = state.titlePos !== 'bottom';
  const zoneH = H * 0.34;
  const scrim = ctx.createLinearGradient(0, top ? 0 : H, 0, top ? zoneH : H - zoneH);
  scrim.addColorStop(0, 'rgba(12, 3, 26, 0.62)');
  scrim.addColorStop(1, 'rgba(12, 3, 26, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, top ? 0 : H - zoneH, W, zoneH);
  const caption = state.caption?.trim();
  if (!caption) return;
  let size = H * 0.105;
  let lines = stackCaption(ctx, caption, W * 0.9, size);
  ctx.font = titleFont(size);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width * 0.86));
  if (widest > W * 0.92) {
    size *= (W * 0.92) / widest;
    lines = stackCaption(ctx, caption, W * 0.9, size);
  }
  const lineStep = size * 0.98;
  const blockH = lineStep * lines.length;
  const kicker = (state.subtitle ?? '').trim().toUpperCase();
  const baseY = top ? H * 0.028 : H - H * 0.028 - blockH - (kicker ? size * 0.42 : 0);
  if (kicker) {
    ctx.save();
    ctx.font = `700 ${Math.max(11, size * 0.21)}px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.max(2, size * 0.09)}px`; } catch { /* older canvas: no letterSpacing */ }
    ctx.fillStyle = '#ffd9a0';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(kicker, W / 2, baseY + size * 0.14);
    ctx.restore();
  }
  lines.forEach((line, i) => {
    drawTitleLine(ctx, line, W / 2, baseY + (kicker ? size * 0.42 : 0) + lineStep * (i + 0.5), size, state.titleStyle);
  });
}

/** The footer's poster credits, tiny and letterspaced, over a dark strip. */
function drawCreditsBar(ctx, state, W, H) {
  const barH = Math.max(18, H * 0.032);
  const grad = ctx.createLinearGradient(0, H - barH, 0, H);
  grad.addColorStop(0, 'rgba(10, 2, 22, 0)');
  grad.addColorStop(1, 'rgba(10, 2, 22, 0.78)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - barH * 1.6, W, barH * 1.6);
  ctx.save();
  ctx.font = `600 ${Math.max(9, barH * 0.42)}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '3px'; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(255, 240, 214, 0.92)';
  ctx.fillText('NEON VICE STUDIO ★ STARRING YOU ★ SHOT ON LOCATION IN THE NEON CITY', W / 2, H - barH * 0.52);
  ctx.restore();
}

let grainPattern = null;

/** Finishing pass: film grain from a code-generated noise tile, plus a soft vignette. */
function applyGrainAndVignette(ctx, W, H) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 256; tile.height = 256;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 118 + Math.random() * 40;
      data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
    }
    tctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(8, 1, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 1, 18, 0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

export { SCENES };
