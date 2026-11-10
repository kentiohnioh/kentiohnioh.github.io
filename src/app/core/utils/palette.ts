import { PaletteSwatch } from '../models/catalog.model';

export interface RgbColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface OklabColor {
  l: number; // 0-1
  a: number; // -0.4 to 0.4
  b: number; // -0.4 to 0.4
}

export interface OklchColor {
  l: number; // 0-1
  c: number; // 0-0.4
  h: number; // 0-360
}

/**
 * Converts sRGB (0-255) to Linear RGB (0-1).
 */
export function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear RGB (0-1) to sRGB (0-255).
 */
export function linearToSRgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

/**
 * Converts sRGB to OKLab color space.
 * Reference: Björn Ottosson (2020)
 */
export function rgbToOklab(r: number, g: number, b: number): OklabColor {
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    l: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Converts OKLab to OKLCH (Lightness, Chroma, Hue in degrees).
 */
export function oklabToOklch(lab: OklabColor): OklchColor {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return {
    l: Math.round(lab.l * 1000) / 1000,
    c: Math.round(c * 1000) / 1000,
    h: Math.round(h * 10) / 10,
  };
}

/**
 * Converts OKLab back to sRGB.
 */
export function oklabToRgb(lab: OklabColor): RgbColor {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.2914855480 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return {
    r: linearToSRgb(lr),
    g: linearToSRgb(lg),
    b: linearToSRgb(lb),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extracts 5 dominant swatches using K-Means clustering in OKLab perceptual space.
 * Ignores near-black (L < 0.06) and near-white (L > 0.96) outliers.
 */
export function extractPaletteFromRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  k = 5,
  maxIterations = 10
): PaletteSwatch[] {
  const samplePixels: OklabColor[] = [];
  const totalPixels = rgba.length / 4;
  const step = Math.max(1, Math.floor(totalPixels / 1500)); // Sample ~1500 pixels for fast extraction

  for (let i = 0; i < rgba.length; i += step * 4) {
    const alpha = rgba[i + 3];
    if (alpha < 128) continue; // Skip transparent pixels

    const lab = rgbToOklab(rgba[i], rgba[i + 1], rgba[i + 2]);

    // Exclude specular highlights and crushed shadow outliers
    if (lab.l >= 0.06 && lab.l <= 0.96) {
      samplePixels.push(lab);
    }
  }

  if (samplePixels.length === 0) {
    // Fallback if image was all black/white
    return [
      { hex: '#111317', oklch: { l: 0.1, c: 0.01, h: 260 }, weight: 0.5 },
      { hex: '#e8ecf2', oklch: { l: 0.9, c: 0.01, h: 260 }, weight: 0.5 },
    ];
  }

  // K-Means++ initialization
  const centroids: OklabColor[] = [samplePixels[Math.floor(Math.random() * samplePixels.length)]];
  while (centroids.length < k && centroids.length < samplePixels.length) {
    let maxDist = -1;
    let nextCentroid = samplePixels[0];

    for (const p of samplePixels) {
      let minDist = Infinity;
      for (const c of centroids) {
        const d = (p.l - c.l) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (d < minDist) minDist = d;
      }
      if (minDist > maxDist) {
        maxDist = minDist;
        nextCentroid = p;
      }
    }
    centroids.push(nextCentroid);
  }

  // Iterate K-Means
  const clusters: number[] = new Array(samplePixels.length).fill(0);
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign
    for (let i = 0; i < samplePixels.length; i++) {
      const p = samplePixels[i];
      let bestDist = Infinity;
      let bestCluster = 0;

      for (let cIdx = 0; cIdx < centroids.length; cIdx++) {
        const c = centroids[cIdx];
        const dist = (p.l - c.l) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = cIdx;
        }
      }
      clusters[i] = bestCluster;
    }

    // Recompute centroids
    const sums = centroids.map(() => ({ l: 0, a: 0, b: 0, count: 0 }));
    for (let i = 0; i < samplePixels.length; i++) {
      const cIdx = clusters[i];
      const p = samplePixels[i];
      sums[cIdx].l += p.l;
      sums[cIdx].a += p.a;
      sums[cIdx].b += p.b;
      sums[cIdx].count++;
    }

    let changed = false;
    for (let cIdx = 0; cIdx < centroids.length; cIdx++) {
      if (sums[cIdx].count > 0) {
        const newL = sums[cIdx].l / sums[cIdx].count;
        const newA = sums[cIdx].a / sums[cIdx].count;
        const newB = sums[cIdx].b / sums[cIdx].count;
        if (Math.abs(centroids[cIdx].l - newL) > 0.001) changed = true;
        centroids[cIdx] = { l: newL, a: newA, b: newB };
      }
    }
    if (!changed) break;
  }

  // Count cluster weights
  const counts = new Array(centroids.length).fill(0);
  for (const c of clusters) counts[c]++;

  const total = samplePixels.length;
  const swatches: PaletteSwatch[] = centroids.map((c, i) => {
    const rgb = oklabToRgb(c);
    const oklch = oklabToOklch(c);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const weight = Math.round((counts[i] / total) * 100) / 100;
    return { hex, oklch, weight };
  });

  // Sort by weight descending
  swatches.sort((a, b) => b.weight - a.weight);

  // Normalize weights so they sum to 1.00
  const sumWeights = swatches.reduce((acc, s) => acc + s.weight, 0);
  if (sumWeights > 0) {
    swatches.forEach((s) => {
      s.weight = Math.round((s.weight / sumWeights) * 100) / 100;
    });
  }

  return swatches.slice(0, 5);
}

