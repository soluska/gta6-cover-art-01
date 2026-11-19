// grade.js — the colour lab. Every treatment is computed from the photo's own pixels on an offscreen
// canvas: nothing is fetched, nothing leaves the machine. Standard grades run through a 256-entry
// look-up table per channel (fast enough to re-grade live); the duotone and poster-pop treatments
// map each pixel by its luminance through a small ink ramp.

/** The grade presets the editor offers, in the order the panel-treatment menu lists them. */
export const TREATMENTS = [
  { id: 'sunset', label: 'Vice Sunset grade' },
  { id: 'neon', label: 'Neon Nights grade' },
  { id: 'duotone', label: 'Duotone ink' },
  { id: 'poster', label: 'Poster-pop cutout' },
  { id: 'none', label: 'Original photo' },
];

const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** A gentle filmic S-curve: lifts the toe, shoulders the highlights, adds contrast in between. */
function sCurve(v, strength) {
  const x = v / 255;
  const curved = x * x * (3 - 2 * x);
  return clampByte((x + (curved - x) * strength) * 255);
}

/** Builds one channel's LUT for a split-tone grade: shadows lean one hue, highlights another. */
function splitToneLut({ shadow, highlight, curve, saturation, lift }) {
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let v = sCurve(i, curve);
    v = clampByte(v + lift * (1 - t) * 255 * 0.12);
    lut[i] = v;
  }
  // Saturation and split toning are cross-channel, so the LUT alone is not the whole grade;
  // gradeWithLut applies them per pixel using these parameters, kept beside the table.
  return { lut, shadow, highlight, saturation };
}

const GRADE_DEFS = {
  // Vice Sunset: teal-plum shadows, magenta mids, hot gold highlights; rich and warm.
  sunset: () => splitToneLut({
    shadow: [26, 10, 54], highlight: [255, 176, 92], curve: 0.42, saturation: 1.32, lift: 0.5,
  }),
  // Neon Nights: deep blue shadows, cyan/pink split, harder contrast for after-dark shots.
  neon: () => splitToneLut({
    shadow: [8, 16, 64], highlight: [140, 240, 255], curve: 0.55, saturation: 1.45, lift: 0.25,
  }),
};

const gradeCache = new Map();

/** Returns a canvas holding `image` graded with `treatment`, cached per image + treatment. */
export function gradedPhoto(image, treatment) {
  if (treatment === 'none' || !treatment) return image;
  const key = `${treatment}`;
  let perImage = gradeCache.get(image);
  if (!perImage) { perImage = new Map(); gradeCache.set(image, perImage); }
  if (perImage.has(key)) return perImage.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (treatment === 'duotone') applyDuotone(frame);
  else if (treatment === 'poster') applyPosterPop(frame);
  else applySplitTone(frame, GRADE_DEFS[treatment] ? GRADE_DEFS[treatment]() : GRADE_DEFS.sunset());
  ctx.putImageData(frame, 0, 0);
  perImage.set(key, canvas);
  return canvas;
}

/** Applies a split-tone LUT grade: per-channel curve, saturation around the pixel's own luma, then a hue lean. */
function applySplitTone(frame, grade) {
  const d = frame.data;
  const { lut, shadow, highlight, saturation } = grade;
  for (let i = 0; i < d.length; i += 4) {
    let r = lut[d[i]], g = lut[d[i + 1]], b = lut[d[i + 2]];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luma + (r - luma) * saturation;
    g = luma + (g - luma) * saturation;
    b = luma + (b - luma) * saturation;
    const t = luma / 255;
    const lean = 0.16;
    r += ((shadow[0] * (1 - t) + highlight[0] * t) / 255 - 0.5) * lean * 255 * (t < 0.5 ? 1 - t : t);
    g += ((shadow[1] * (1 - t) + highlight[1] * t) / 255 - 0.5) * lean * 255 * (t < 0.5 ? 1 - t : t);
    b += ((shadow[2] * (1 - t) + highlight[2] * t) / 255 - 0.5) * lean * 255 * (t < 0.5 ? 1 - t : t);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

// Duotone ink ramp: deep violet-black shadows melting into hot coral and gold.
const DUOTONE_STOPS = [
  [0.0, [24, 8, 44]], [0.35, [110, 24, 92]], [0.62, [232, 62, 110]],
  [0.82, [255, 122, 66]], [1.0, [255, 214, 130]],
];

/** Maps every pixel onto the duotone ramp by luminance — the two-ink poster look. */
function applyDuotone(frame) {
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const [r, g, b] = rampAt(DUOTONE_STOPS, luma);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

// Poster-pop bands: four flat inks, so a portrait reads as a screen-printed cutout.
const POSTER_BANDS = [
  [0.30, [26, 10, 48]], [0.52, [122, 30, 118]], [0.74, [244, 84, 96]], [1.01, [255, 226, 168]],
];

/** Quantises luminance into the four poster inks, keeping a hint of the original hue in the top band. */
function applyPosterPop(frame) {
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    for (const [edge, ink] of POSTER_BANDS) {
      if (luma < edge) {
        if (edge > 1) { // top band: blend the ink with the photo so faces keep their warmth
          d[i] = ink[0] * 0.55 + d[i] * 0.45;
          d[i + 1] = ink[1] * 0.55 + d[i + 1] * 0.45;
          d[i + 2] = ink[2] * 0.55 + d[i + 2] * 0.45;
        } else {
          d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2];
        }
        break;
      }
    }
  }
}

/** Linear interpolation along a colour ramp of [position, [r, g, b]] stops. */
function rampAt(stops, t) {
  for (let s = 1; s < stops.length; s++) {
    if (t <= stops[s][0]) {
      const [p0, c0] = stops[s - 1];
      const [p1, c1] = stops[s];
      const f = (t - p0) / Math.max(1e-6, p1 - p0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}
