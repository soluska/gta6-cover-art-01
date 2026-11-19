// scenes.js — panel backdrops drawn entirely with canvas paths: a striped retro sun, palm silhouettes,
// a neon skyline, a muscle car, a speedboat, a helicopter and flamingos over the same sunset sky.
// No image files: every shape below is code, so the scenes sit happily beside any photo.

/** The scene catalogue the panel menu offers, in display order. */
export const SCENES = [
  { id: 'palms', label: 'Palm sunset' },
  { id: 'skyline', label: 'Neon skyline' },
  { id: 'car', label: 'Muscle car' },
  { id: 'boat', label: 'Speedboat' },
  { id: 'chopper', label: 'Chopper' },
  { id: 'flamingo', label: 'Flamingos' },
];

const INK = '#160a2a';       // silhouette ink: near-black violet
const INK_SOFT = '#2a1150';  // a step lighter, for far layers

/** Paints the shared Vice sky: plum zenith melting through magenta and coral into a gold horizon. */
export function paintSky(ctx, x, y, w, h, night = false) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  if (night) {
    sky.addColorStop(0, '#070b2e'); sky.addColorStop(0.45, '#2b1058');
    sky.addColorStop(0.75, '#7a1e6e'); sky.addColorStop(1, '#e84e7a');
  } else {
    sky.addColorStop(0, '#2b1058'); sky.addColorStop(0.38, '#8e2a7d');
    sky.addColorStop(0.66, '#e8497a'); sky.addColorStop(0.85, '#ff7a42');
    sky.addColorStop(1, '#ffc44d');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
}

/** The retro sun: a fat disc sliced by horizon lines that thicken as they fall. */
export function paintSun(ctx, cx, cy, r, night = false) {
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, night ? '#ff5e8a' : '#ffe95e');
  sun.addColorStop(0.55, night ? '#ff2e7e' : '#ff9a3d');
  sun.addColorStop(1, '#ff2e7e');
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(20, 6, 40, 0.55)';
  let ly = cy + r * 0.08, gap = r * 0.055;
  for (let i = 0; i < 5; i++) { ctx.fillRect(cx - r, ly, r * 2, gap * 0.62); ly += gap * 1.55; gap *= 1.28; }
  ctx.restore();
}

/** A palm: curved trunk plus a crown of drooping fronds, drawn around its base point. */
export function paintPalm(ctx, bx, by, height, lean = 0.16, ink = INK) {
  const topX = bx + height * lean, topY = by - height;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, height * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx + height * lean * 0.3, by - height * 0.6, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, height * 0.03);
  for (let i = 0; i < 9; i++) {
    const spread = (i / 8 - 0.5) * 2;                    // -1 (hard left) .. 1 (hard right)
    const reach = height * (0.4 + 0.08 * Math.cos(spread * 2.2));
    const ex = topX + spread * reach;
    const ey = topY + reach * (0.34 - 0.3 * (1 - Math.abs(spread))) + height * 0.02;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + spread * reach * 0.45, topY - reach * 0.3, ex, ey);
    ctx.stroke();
  }
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(topX - height * 0.03, topY + height * 0.03, height * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(topX + height * 0.04, topY + height * 0.045, height * 0.028, 0, Math.PI * 2); ctx.fill();
}

/** Ground shadow band along the foot of a panel. */
function paintGround(ctx, x, y, w, h, top) {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y + h * top, w, h * (1 - top));
}

/** Palm sunset: big sliced sun, sea glints, two palms leaning in from the corners. */
export function drawPalmSunset(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h);
  paintSun(ctx, x + w * 0.5, y + h * 0.52, Math.min(w, h) * 0.34);
  ctx.fillStyle = 'rgba(255, 220, 130, 0.5)';
  for (let i = 0; i < 7; i++) {
    const gy = y + h * (0.6 + i * 0.05);
    ctx.fillRect(x + w * (0.18 + 0.09 * Math.sin(i * 3.1)), gy, w * (0.2 + 0.06 * Math.cos(i * 1.7)), Math.max(1.5, h * 0.008));
  }
  paintGround(ctx, x, y, w, h, 0.8);
  paintPalm(ctx, x + w * 0.1, y + h * 1.0, h * 0.78, 0.22);
  paintPalm(ctx, x + w * 0.94, y + h * 1.0, h * 0.62, -0.3);
}

/** Neon skyline: two tower layers, lit windows, and a cyan-magenta sign glow on the water. */
export function drawNeonSkyline(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h, true);
  paintSun(ctx, x + w * 0.78, y + h * 0.3, Math.min(w, h) * 0.16, true);
  const layers = [
    { ink: INK_SOFT, base: 0.62, seed: 3, win: 'rgba(120, 220, 255, 0.5)' },
    { ink: INK, base: 0.74, seed: 11, win: 'rgba(255, 190, 90, 0.85)' },
  ];
  for (const layer of layers) {
    let bx = x - w * 0.04;
    let s = layer.seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    while (bx < x + w) {
      const bw = w * (0.08 + rnd() * 0.1);
      const bh = h * (0.2 + rnd() * 0.3);
      ctx.fillStyle = layer.ink;
      ctx.fillRect(bx, y + h * layer.base - bh, bw, bh + h);
      ctx.fillStyle = layer.win;
      const cols = Math.max(1, Math.floor(bw / (w * 0.028)));
      const rows = Math.max(2, Math.floor(bh / (h * 0.045)));
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        if (rnd() > 0.45) ctx.fillRect(bx + w * 0.012 + c * w * 0.026, y + h * layer.base - bh + h * 0.02 + r * h * 0.042, w * 0.012, h * 0.02);
      }
      bx += bw + w * 0.012;
    }
  }
  const glow = ctx.createLinearGradient(0, y + h * 0.78, 0, y + h);
  glow.addColorStop(0, 'rgba(255, 46, 126, 0.35)'); glow.addColorStop(1, 'rgba(10, 6, 30, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
}

/** Muscle car: a low, long silhouette with chrome glints, parked against the sun. */
export function drawMuscleCar(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h);
  paintSun(ctx, x + w * 0.34, y + h * 0.46, Math.min(w, h) * 0.3);
  paintGround(ctx, x, y, w, h, 0.72);
  const cw = w * 0.86, ch = h * 0.3, cx = x + w * 0.07, cy = y + h * 0.72 - ch;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx, cy + ch * 0.78);
  ctx.lineTo(cx + cw * 0.03, cy + ch * 0.52);            // rear deck
  ctx.lineTo(cx + cw * 0.2, cy + ch * 0.46);
  ctx.lineTo(cx + cw * 0.3, cy + ch * 0.1);              // roofline up
  ctx.quadraticCurveTo(cx + cw * 0.36, cy - ch * 0.04, cx + cw * 0.46, cy);
  ctx.lineTo(cx + cw * 0.62, cy + ch * 0.06);
  ctx.lineTo(cx + cw * 0.72, cy + ch * 0.4);             // long hood
  ctx.lineTo(cx + cw * 0.97, cy + ch * 0.5);
  ctx.quadraticCurveTo(cx + cw, cy + ch * 0.56, cx + cw * 0.99, cy + ch * 0.78);
  ctx.closePath(); ctx.fill();
  // glasshouse cut
  ctx.fillStyle = 'rgba(255, 150, 90, 0.75)';
  ctx.beginPath();
  ctx.moveTo(cx + cw * 0.33, cy + ch * 0.14);
  ctx.lineTo(cx + cw * 0.45, cy + ch * 0.05);
  ctx.lineTo(cx + cw * 0.6, cy + ch * 0.1);
  ctx.lineTo(cx + cw * 0.68, cy + ch * 0.38);
  ctx.lineTo(cx + cw * 0.36, cy + ch * 0.4);
  ctx.closePath(); ctx.fill();
  // wheels + chrome
  for (const fx of [0.2, 0.82]) {
    ctx.fillStyle = '#0a0518';
    ctx.beginPath(); ctx.arc(cx + cw * fx, cy + ch * 0.82, ch * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath(); ctx.arc(cx + cw * fx, cy + ch * 0.82, ch * 0.13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 220, 150, 0.9)';
  ctx.fillRect(cx + cw * 0.965, cy + ch * 0.55, cw * 0.02, ch * 0.1);  // headlight
  ctx.fillStyle = 'rgba(255, 80, 90, 0.95)';
  ctx.fillRect(cx + cw * 0.005, cy + ch * 0.55, cw * 0.015, ch * 0.12); // tail light
}

/** Speedboat: hull, wake fan and spray, racing across a sunset sea. */
export function drawSpeedboat(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h);
  paintSun(ctx, x + w * 0.68, y + h * 0.4, Math.min(w, h) * 0.26);
  const sea = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  sea.addColorStop(0, '#7a1e6e'); sea.addColorStop(1, '#160a2a');
  ctx.fillStyle = sea;
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
  ctx.fillStyle = 'rgba(255, 200, 110, 0.55)';
  for (let i = 0; i < 6; i++) ctx.fillRect(x + w * (0.55 + 0.05 * Math.sin(i * 2.3)), y + h * (0.6 + i * 0.06), w * 0.16, Math.max(1.5, h * 0.01));
  const bw = w * 0.68, bh = h * 0.2, bx = x + w * 0.24, by = y + h * 0.56;
  ctx.fillStyle = 'rgba(240, 244, 255, 0.75)'; // wake fan
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.1, by + bh * 0.7);
  ctx.lineTo(x + w * 0.02, by + bh * 1.6);
  ctx.lineTo(x + w * 0.05, by + bh * 2.2);
  ctx.lineTo(bx + bw * 0.3, by + bh * 0.9);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = INK; // hull
  ctx.beginPath();
  ctx.moveTo(bx, by + bh * 0.55);
  ctx.lineTo(bx + bw * 0.12, by + bh * 0.2);
  ctx.lineTo(bx + bw * 0.55, by);
  ctx.lineTo(bx + bw * 0.98, by + bh * 0.12);
  ctx.lineTo(bx + bw * 0.9, by + bh * 0.62);
  ctx.lineTo(bx + bw * 0.25, by + bh * 0.85);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(240, 244, 255, 0.9)'; // waterline stripe, so the hull reads on dark water
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.06, by + bh * 0.52);
  ctx.lineTo(bx + bw * 0.93, by + bh * 0.2);
  ctx.lineTo(bx + bw * 0.88, by + bh * 0.34);
  ctx.lineTo(bx + bw * 0.1, by + bh * 0.62);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff2e7e'; // cockpit stripe
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.4, by + bh * 0.08);
  ctx.lineTo(bx + bw * 0.62, by + bh * 0.02);
  ctx.lineTo(bx + bw * 0.7, by + bh * 0.3);
  ctx.lineTo(bx + bw * 0.44, by + bh * 0.34);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; // spray dots
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(bx + bw * (0.02 + 0.05 * Math.sin(i * 1.9)), by + bh * (0.5 + 0.16 * Math.cos(i * 2.6)), Math.max(1.5, h * 0.012), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Chopper: a helicopter silhouette with a blurred rotor, crossing the sun. */
export function drawChopper(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h, true);
  paintSun(ctx, x + w * 0.5, y + h * 0.55, Math.min(w, h) * 0.32, true);
  paintPalm(ctx, x + w * 0.06, y + h * 1.02, h * 0.5, 0.2);
  const cx = x + w * 0.52, cy = y + h * 0.3, s = Math.min(w, h);
  ctx.strokeStyle = 'rgba(10, 4, 24, 0.55)';
  ctx.lineWidth = Math.max(2, s * 0.012);
  ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.1); ctx.lineTo(cx + s * 0.3, cy - s * 0.1); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); // body
  ctx.ellipse(cx, cy, s * 0.13, s * 0.075, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); // tail boom + fin
  ctx.moveTo(cx + s * 0.1, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.36, cy + s * 0.03);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.03);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(cx + s * 0.33, cy - s * 0.11, s * 0.02, s * 0.12);
  ctx.fillStyle = 'rgba(140, 240, 255, 0.8)'; // cockpit glass
  ctx.beginPath(); ctx.ellipse(cx - s * 0.06, cy - s * 0.01, s * 0.05, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; // skids
  ctx.lineWidth = Math.max(1.5, s * 0.008);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.09, cy + s * 0.11); ctx.lineTo(cx + s * 0.09, cy + s * 0.11);
  ctx.moveTo(cx - s * 0.05, cy + s * 0.07); ctx.lineTo(cx - s * 0.06, cy + s * 0.11);
  ctx.moveTo(cx + s * 0.05, cy + s * 0.07); ctx.lineTo(cx + s * 0.06, cy + s * 0.11);
  ctx.stroke();
}

/** Flamingos: two long-necked birds wading in neon shallows. */
export function drawFlamingos(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h);
  paintSun(ctx, x + w * 0.3, y + h * 0.42, Math.min(w, h) * 0.24);
  const water = ctx.createLinearGradient(0, y + h * 0.58, 0, y + h);
  water.addColorStop(0, 'rgba(232, 73, 122, 0.85)'); water.addColorStop(1, '#2a1150');
  ctx.fillStyle = water;
  ctx.fillRect(x, y + h * 0.58, w, h * 0.42);
  const bird = (bx, by, s, flip) => {
    ctx.save();
    ctx.translate(bx, by); ctx.scale(flip * s, s);
    ctx.strokeStyle = '#ff5e8a'; ctx.fillStyle = '#ff5e8a';
    ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.17, -0.15, 0, Math.PI * 2); ctx.fill(); // body
    ctx.beginPath(); // S neck
    ctx.moveTo(0.24, -0.08);
    ctx.bezierCurveTo(0.42, -0.2, 0.3, -0.38, 0.44, -0.5);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0.46, -0.5, 0.07, 0.055, 0.4, 0, Math.PI * 2); ctx.fill(); // head
    ctx.fillStyle = '#160a2a';
    ctx.beginPath(); ctx.moveTo(0.52, -0.52); ctx.lineTo(0.64, -0.47); ctx.lineTo(0.52, -0.44); ctx.closePath(); ctx.fill(); // beak tip
    ctx.strokeStyle = '#e84e7a'; ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(-0.05, 0.14); ctx.lineTo(-0.05, 0.62); ctx.stroke(); // standing leg
    ctx.beginPath(); ctx.moveTo(0.08, 0.14); ctx.lineTo(0.2, 0.34); ctx.lineTo(0.14, 0.6); ctx.stroke(); // bent leg
    ctx.restore();
  };
  bird(x + w * 0.38, y + h * 0.66, h * 0.5, 1);
  bird(x + w * 0.72, y + h * 0.74, h * 0.34, -1);
  ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + w * (0.12 + 0.16 * i), y + h * (0.86 + 0.025 * Math.sin(i * 2.2)), w * 0.09, Math.max(1.5, h * 0.008));
}

/** Draws a scene by id into a rect; unknown ids fall back to the palm sunset. */
export function drawScene(ctx, id, x, y, w, h) {
  switch (id) {
    case 'skyline': return drawNeonSkyline(ctx, x, y, w, h);
    case 'car': return drawMuscleCar(ctx, x, y, w, h);
    case 'boat': return drawSpeedboat(ctx, x, y, w, h);
    case 'chopper': return drawChopper(ctx, x, y, w, h);
    case 'flamingo': return drawFlamingos(ctx, x, y, w, h);
    default: return drawPalmSunset(ctx, x, y, w, h);
  }
}

/**
 * A demo portrait drawn from code alone — flat-shaded face, shades and a sunset backdrop —
 * so the app can be tried with no photo at hand. Returns a canvas used like any other photo.
 */
export function drawDemoPortrait(size = 720) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  paintSky(ctx, 0, 0, size, size);
  paintSun(ctx, size * 0.5, size * 0.44, size * 0.3);
  paintPalm(ctx, size * 0.06, size * 1.02, size * 0.55, 0.24);
  paintPalm(ctx, size * 0.97, size * 1.02, size * 0.44, -0.3);
  const cx = size / 2;
  // shoulders / jacket
  ctx.fillStyle = '#123a5e';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.3, size);
  ctx.quadraticCurveTo(cx - size * 0.28, size * 0.78, cx - size * 0.1, size * 0.74);
  ctx.lineTo(cx + size * 0.1, size * 0.74);
  ctx.quadraticCurveTo(cx + size * 0.28, size * 0.78, cx + size * 0.3, size);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff2e7e'; // shirt V
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.09, size * 0.75); ctx.lineTo(cx + size * 0.09, size * 0.75);
  ctx.lineTo(cx, size * 0.92); ctx.closePath(); ctx.fill();
  // neck + face
  ctx.fillStyle = '#c97e56';
  ctx.fillRect(cx - size * 0.05, size * 0.6, size * 0.1, size * 0.16);
  ctx.fillStyle = '#e09a68';
  ctx.beginPath(); ctx.ellipse(cx, size * 0.44, size * 0.155, size * 0.19, 0, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = '#241126';
  ctx.beginPath();
  ctx.ellipse(cx, size * 0.3, size * 0.165, size * 0.1, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(cx + size * 0.17, size * 0.42, cx + size * 0.13, size * 0.4);
  ctx.lineTo(cx - size * 0.13, size * 0.4);
  ctx.quadraticCurveTo(cx - size * 0.17, size * 0.42, cx - size * 0.165, size * 0.3);
  ctx.fill();
  // shades
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(cx - size * 0.145, size * 0.415, size * 0.125, size * 0.055);
  ctx.fillRect(cx + size * 0.02, size * 0.415, size * 0.125, size * 0.055);
  ctx.fillRect(cx - size * 0.02, size * 0.43, size * 0.04, size * 0.014);
  ctx.fillStyle = 'rgba(255, 120, 160, 0.75)'; // lens glint
  ctx.fillRect(cx - size * 0.13, size * 0.425, size * 0.05, size * 0.012);
  ctx.fillRect(cx + size * 0.035, size * 0.425, size * 0.05, size * 0.012);
  // smile + chin shade
  ctx.strokeStyle = '#8a4f30';
  ctx.lineWidth = size * 0.008;
  ctx.beginPath(); ctx.arc(cx, size * 0.545, size * 0.055, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  return canvas;
}
