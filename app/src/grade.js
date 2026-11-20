// grade.js — the colour pipeline that turns an ordinary photo into poster art.
//
// Every grade is a gradient map: the photo's luminance is pushed through a Vice City
// colour ramp (deep teal shadows, warm skin mid-tones, hot orange-pink highlights),
// blended back with a contrast-and-saturation enhanced copy of the photo so faces stay
// photographic while the light turns into sunset. Ink mode posterises the luminance
// first, which flattens the photo into the banded, printed look of poster art.
// The print finish (grain, halftone dots, vignette) lives here too, so the editor
// preview and the exported PNG go through exactly the same pipeline.

export const GRADE_RECIPES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    stops: [[0, '#0a1c38'], [0.3, '#10657a'], [0.52, '#43b3a2'], [0.7, '#e8a35c'], [0.86, '#ff7847'], [1, '#ffeec2']],
    saturation: 1.14, contrast: 1.07, blend: 0.72,
  },
  {
    id: 'neon',
    name: 'Neon Night',
    stops: [[0, '#0a0e33'], [0.32, '#1b3a9e'], [0.58, '#b83bd6'], [0.8, '#ff5e8a'], [1, '#ffe3f4']],
    saturation: 1.18, contrast: 1.08, blend: 0.84,
  },
  {
    id: 'gold',
    name: 'Golden Hour',
    stops: [[0, '#160f2e'], [0.35, '#6e2b3a'], [0.62, '#d96c33'], [0.85, '#ffb84d'], [1, '#fff6cf']],
    saturation: 1.1, contrast: 1.05, blend: 0.8,
  },
  {
    id: 'teal',
    name: 'Teal Pop',
    stops: [[0, '#03222b'], [0.4, '#0b6e7e'], [0.7, '#39c2b0'], [1, '#eafff8']],
    saturation: 1.16, contrast: 1.06, blend: 0.76,
  },
  {
    id: 'noir',
    name: 'Noir Heat',
    stops: [[0, '#07070a'], [0.5, '#6e6259'], [1, '#fff3df']],
    saturation: 0.92, contrast: 1.12, blend: 0.88,
  },
  {
    id: 'natural',
    name: 'Natural+',
    stops: null,
    saturation: 1.18, contrast: 1.06, blend: 0,
  },
];

export function gradeRecipeById(gradeId) {
  return GRADE_RECIPES.find((recipe) => recipe.id === gradeId) ?? GRADE_RECIPES[0];
}

function hexToRgbTriple(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// A 256-step colour ramp built by interpolating the recipe's stops in RGB.
export function buildLuminanceRamp(stops) {
  const ramp = new Uint8ClampedArray(256 * 3);
  const points = stops.map(([at, hex]) => [at, hexToRgbTriple(hex)]);
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let lower = points[0];
    let upper = points[points.length - 1];
    for (let s = 0; s < points.length - 1; s += 1) {
      if (t >= points[s][0] && t <= points[s + 1][0]) {
        lower = points[s];
        upper = points[s + 1];
        break;
      }
    }
    const span = upper[0] - lower[0] || 1;
    const mix = Math.min(1, Math.max(0, (t - lower[0]) / span));
    for (let channel = 0; channel < 3; channel += 1) {
      ramp[i * 3 + channel] = lower[1][channel] + (upper[1][channel] - lower[1][channel]) * mix;
    }
  }
  return ramp;
}

const rampCache = new Map();
function rampForRecipe(recipe) {
  if (!recipe.stops) return null;
  if (!rampCache.has(recipe.id)) rampCache.set(recipe.id, buildLuminanceRamp(recipe.stops));
  return rampCache.get(recipe.id);
}

// Grade one photo into a canvas of its own (capped at maxSide so big phone photos stay
// fast). The editor caches the result per photo, grade and ink setting.
export function gradePhotoToCanvas(image, recipe, { ink = false, maxSide = 1600 } = {}) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);

  const ramp = rampForRecipe(recipe);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const contrast = recipe.contrast;
  const saturation = recipe.saturation;
  const blend = recipe.blend;
  const inkLevels = ink ? 7 : 0;

  for (let i = 0; i < pixels.length; i += 4) {
    // Contrast around mid-grey, then saturation around the pixel's own luminance.
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];
    r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luminance + (r - luminance) * saturation;
    g = luminance + (g - luminance) * saturation;
    b = luminance + (b - luminance) * saturation;

    if (ramp) {
      let rampIndex = Math.min(255, Math.max(0, Math.round(luminance)));
      if (inkLevels) {
        const band = Math.round((rampIndex / 255) * (inkLevels - 1));
        rampIndex = Math.round((band / (inkLevels - 1)) * 255);
      }
      const keep = 1 - blend;
      pixels[i] = r * keep + ramp[rampIndex * 3] * blend;
      pixels[i + 1] = g * keep + ramp[rampIndex * 3 + 1] * blend;
      pixels[i + 2] = b * keep + ramp[rampIndex * 3 + 2] * blend;
    } else {
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// A tile of mid-grey noise; laid over the cover with the overlay composite it reads as
// film grain without darkening or lightening the art overall.
export function makeGrainTile(size = 144) {
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = 128 + (Math.random() * 44 - 22);
    imageData.data[i] = value;
    imageData.data[i + 1] = value;
    imageData.data[i + 2] = value;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return tile;
}

// A tile of soft dots for the halftone print texture.
function makeHalftoneTile(cell = 9) {
  const tile = document.createElement('canvas');
  tile.width = cell;
  tile.height = cell;
  const ctx = tile.getContext('2d');
  const gradient = ctx.createRadialGradient(cell / 2, cell / 2, 0, cell / 2, cell / 2, cell * 0.34);
  gradient.addColorStop(0, 'rgba(12,8,20,0.85)');
  gradient.addColorStop(1, 'rgba(12,8,20,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cell, cell);
  return tile;
}

// The shared print finish: halftone dots in soft light, a whisper of grain, and a
// vignette that pulls the eye to the middle of the cover.
export function paintPrintFinish(ctx, width, height, { halftone = true, grainTile = null } = {}) {
  if (halftone) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = ctx.createPattern(makeHalftoneTile(), 'repeat');
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  if (grainTile) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.78,
  );
  vignette.addColorStop(0, 'rgba(10,4,24,0)');
  vignette.addColorStop(1, 'rgba(10,4,24,0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
