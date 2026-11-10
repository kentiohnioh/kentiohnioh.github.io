import { ColorGradeRecipe } from '../models/color-grade.model';
import { rgbToOklab, oklabToRgb } from './palette';
import { generateIdentityLut } from './cube-lut';

export type FilmStockId =
  | 'kodachrome-64'
  | 'portra-400'
  | 'tri-x-400'
  | 'fuji-pro-400h'
  | 'cinestill-800t';

export interface FilmProfileMetadata {
  id: FilmStockId;
  name: string;
  manufacturer: string;
  type: 'color-reversal' | 'color-negative' | 'black-and-white' | 'motion-picture';
  description: string;
  iso: number;
  recipe: ColorGradeRecipe;
}

export const FILM_PROFILES: Record<FilmStockId, FilmProfileMetadata> = {
  'kodachrome-64': {
    id: 'kodachrome-64',
    name: 'Kodachrome 64',
    manufacturer: 'Kodak',
    type: 'color-reversal',
    description: 'Iconic saturated primaries, warm golden highlights, deep blacks, and legendary archival contrast.',
    iso: 64,
    recipe: {
      schemaVersion: 1,
      presetId: 'kodachrome-64',
      exposureEV: 0,
      contrast: 22,
      highlights: -10,
      shadows: -15,
      whites: 12,
      blacks: -18,
      temperature: 8,
      tint: -2,
      vibrance: 18,
      saturation: 12,
      splitTone: {
        shadowHue: 215,
        shadowSat: 10,
        highlightHue: 42,
        highlightSat: 15,
        balance: -5,
      },
      lut: {
        id: 'kodachrome-64',
        strength: 0.85,
      },
      halation: {
        threshold: 0.85,
        radius: 12,
        strength: 0.15,
        tint: 15,
      },
      vignette: {
        amount: -12,
        midpoint: 50,
        roundness: 0,
        feather: 60,
      },
      grain: {
        amount: 14,
        size: 1.0,
        roughness: 45,
        seed: 64,
      },
      skinProtect: {
        enabled: true,
        strength: 0.75,
        mode: 'mask',
      },
    },
  },

  'portra-400': {
    id: 'portra-400',
    name: 'Portra 400',
    manufacturer: 'Kodak',
    type: 'color-negative',
    description: 'World benchmark for portraiture: creamy skin tone roll-off, soft pastel highlights, natural color.',
    iso: 400,
    recipe: {
      schemaVersion: 1,
      presetId: 'portra-400',
      exposureEV: 0.15,
      contrast: -8,
      highlights: -18,
      shadows: 14,
      whites: 5,
      blacks: -5,
      temperature: 6,
      tint: 4,
      vibrance: 8,
      saturation: -4,
      splitTone: {
        shadowHue: 200,
        shadowSat: 6,
        highlightHue: 38,
        highlightSat: 12,
        balance: 10,
      },
      lut: {
        id: 'portra-400',
        strength: 0.8,
      },
      halation: {
        threshold: 0.9,
        radius: 10,
        strength: 0.1,
        tint: 20,
      },
      vignette: {
        amount: -6,
        midpoint: 55,
        roundness: 10,
        feather: 70,
      },
      grain: {
        amount: 18,
        size: 1.2,
        roughness: 50,
        seed: 400,
      },
      skinProtect: {
        enabled: true,
        strength: 0.9,
        mode: 'mask',
      },
    },
  },

  'tri-x-400': {
    id: 'tri-x-400',
    name: 'Tri-X 400',
    manufacturer: 'Kodak',
    type: 'black-and-white',
    description: 'Legendary photojournalism monochrome: gritty silver halide grain, dramatic S-curve punch, deep shadows.',
    iso: 400,
    recipe: {
      schemaVersion: 1,
      presetId: 'tri-x-400',
      exposureEV: 0,
      contrast: 28,
      highlights: 10,
      shadows: -20,
      whites: 15,
      blacks: -25,
      temperature: 0,
      tint: 0,
      vibrance: -100,
      saturation: -100,
      splitTone: {
        shadowHue: 0,
        shadowSat: 0,
        highlightHue: 0,
        highlightSat: 0,
        balance: 0,
      },
      lut: {
        id: 'tri-x-400',
        strength: 1.0,
      },
      halation: {
        threshold: 0.95,
        radius: 8,
        strength: 0.05,
        tint: 0,
      },
      vignette: {
        amount: -18,
        midpoint: 45,
        roundness: -10,
        feather: 50,
      },
      grain: {
        amount: 35,
        size: 1.6,
        roughness: 65,
        seed: 3400,
      },
      skinProtect: {
        enabled: false,
        strength: 0,
        mode: 'mask',
      },
    },
  },

  'fuji-pro-400h': {
    id: 'fuji-pro-400h',
    name: 'Fujifilm Pro 400H',
    manufacturer: 'Fujifilm',
    type: 'color-negative',
    description: 'Airy cyan/green highlights, cool ethereal pastels, luminous skin tones, and gentle shadow lift.',
    iso: 400,
    recipe: {
      schemaVersion: 1,
      presetId: 'fuji-pro-400h',
      exposureEV: 0.25,
      contrast: -12,
      highlights: -15,
      shadows: 20,
      whites: -5,
      blacks: 8,
      temperature: -10,
      tint: -6,
      vibrance: 12,
      saturation: -8,
      splitTone: {
        shadowHue: 155,
        shadowSat: 8,
        highlightHue: 195,
        highlightSat: 14,
        balance: 15,
      },
      lut: {
        id: 'fuji-pro-400h',
        strength: 0.85,
      },
      halation: {
        threshold: 0.92,
        radius: 10,
        strength: 0.08,
        tint: 180,
      },
      vignette: {
        amount: -4,
        midpoint: 60,
        roundness: 20,
        feather: 80,
      },
      grain: {
        amount: 15,
        size: 1.1,
        roughness: 40,
        seed: 4004,
      },
      skinProtect: {
        enabled: true,
        strength: 0.85,
        mode: 'mask',
      },
    },
  },

  'cinestill-800t': {
    id: 'cinestill-800t',
    name: 'CineStill 800T',
    manufacturer: 'CineStill',
    type: 'motion-picture',
    description: 'Tungsten-balanced night cinematic stock: rich teal-and-orange palette, vivid amber highlights, atmospheric halation.',
    iso: 800,
    recipe: {
      schemaVersion: 1,
      presetId: 'cinestill-800t',
      exposureEV: 0,
      contrast: 15,
      highlights: -8,
      shadows: -10,
      whites: 10,
      blacks: -12,
      temperature: -24, // Cool tungsten baseline
      tint: 8,
      vibrance: 25,
      saturation: 8,
      splitTone: {
        shadowHue: 198, // Teal shadows
        shadowSat: 24,
        highlightHue: 32, // Warm amber/orange highlights
        highlightSat: 22,
        balance: -8,
      },
      lut: {
        id: 'cinestill-800t',
        strength: 0.9,
      },
      halation: {
        threshold: 0.8,
        radius: 20,
        strength: 0.35,
        tint: 10, // Distinct red/orange halation
      },
      vignette: {
        amount: -15,
        midpoint: 48,
        roundness: 0,
        feather: 55,
      },
      grain: {
        amount: 28,
        size: 1.4,
        roughness: 60,
        seed: 800,
      },
      skinProtect: {
        enabled: true,
        strength: 0.8,
        mode: 'mask',
      },
    },
  },
};

/**
 * Procedurally generates a 3D LUT Float32Array for a given film stock.
 */
export function generateFilmStockLut(stockId: FilmStockId, size = 33): Float32Array {
  const lut = generateIdentityLut(size);
  const totalVoxels = size * size * size;

  for (let i = 0; i < totalVoxels; i++) {
    const r = lut[i * 3];
    const g = lut[i * 3 + 1];
    const b = lut[i * 3 + 2];

    const mapped = applyFilmStockTransform(stockId, r, g, b);
    lut[i * 3] = mapped[0];
    lut[i * 3 + 1] = mapped[1];
    lut[i * 3 + 2] = mapped[2];
  }

  return lut;
}

/**
 * Mathematical transfer function for each film stock.
 */
function applyFilmStockTransform(
  stockId: FilmStockId,
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const lab = rgbToOklab(r * 255, g * 255, b * 255);
  let { l, a, b: ob } = lab;

  switch (stockId) {
    case 'kodachrome-64': {
      // Contrast S-curve on L
      l = sCurve(l, 1.35);
      // Boost red and blue saturation (expand chromaticity)
      a *= 1.25;
      ob *= 1.15;
      // Warm golden shift in highlights
      if (l > 0.6) {
        ob += (l - 0.6) * 0.05;
      }
      break;
    }

    case 'portra-400': {
      // Soft gentle contrast with lifted shadow toe and soft highlight shoulder
      l = Math.pow(l, 0.95);
      l = sCurve(l, 0.9);
      // Calm saturated hues slightly, gentle warm peach skin shift
      a *= 0.95;
      ob *= 0.98;
      // Mild golden warmth
      ob += 0.01;
      break;
    }

    case 'tri-x-400': {
      // Complete desaturation
      a = 0;
      ob = 0;
      // Punchy silver-halide S-curve
      l = sCurve(l, 1.45);
      break;
    }

    case 'fuji-pro-400h': {
      // Soft contrast, lifted shadows
      l = 0.03 + 0.94 * sCurve(l, 0.92);
      // Cyan-green cool highlight shift
      a -= 0.012;
      ob -= 0.015;
      break;
    }

    case 'cinestill-800t': {
      // Moderate contrast
      l = sCurve(l, 1.15);
      // Teal shadows (shift negative a/b in shadows)
      if (l < 0.5) {
        const factor = (0.5 - l) * 0.08;
        a -= factor * 0.5;
        ob -= factor;
      }
      // Warm amber highlights (shift positive b in highlights)
      if (l > 0.5) {
        const factor = (l - 0.5) * 0.09;
        a += factor * 0.4;
        ob += factor;
      }
      break;
    }
  }

  const srgb = oklabToRgb({ l: Math.max(0, Math.min(1, l)), a, b: ob });
  return [
    Math.max(0, Math.min(1, srgb.r / 255)),
    Math.max(0, Math.min(1, srgb.g / 255)),
    Math.max(0, Math.min(1, srgb.b / 255)),
  ];
}

/**
 * Standard photographic S-curve centered at 0.5 midpoint.
 */
function sCurve(x: number, slope: number): number {
  if (slope === 1.0) return x;
  // Smooth symmetric sigmoid
  const centered = x - 0.5;
  const shaped = (slope * centered) / (1 + (slope - 1) * Math.abs(2 * centered));
  return Math.max(0, Math.min(1, shaped + 0.5));
}
