import { rgbToOklab } from './palette';

export interface ImageTelemetryMetrics {
  meanLuminance: number; // 0 to 1
  contrastStdDev: number; // 0 to 1
  warmth: number; // -1 (cool blue) to +1 (warm amber)
  saturation: number; // 0 (grayscale) to 1 (vivid)
}

/**
 * Computes statistical lighting and chromatic properties from RGBA pixel data.
 */
export function analyzeImageMetrics(rgba: Uint8ClampedArray | Uint8Array): ImageTelemetryMetrics {
  let sumL = 0;
  let sumL2 = 0;
  let sumWarmth = 0;
  let sumChroma = 0;
  let count = 0;

  const step = Math.max(1, Math.floor(rgba.length / 4 / 2000)); // Sample ~2000 pixels

  for (let i = 0; i < rgba.length; i += step * 4) {
    const alpha = rgba[i + 3];
    if (alpha < 128) continue;

    const lab = rgbToOklab(rgba[i], rgba[i + 1], rgba[i + 2]);
    sumL += lab.l;
    sumL2 += lab.l * lab.l;

    // In OKLab: +b* is yellow/warm, -b* is blue/cool. +a* is red/magenta, -a* is green.
    sumWarmth += lab.b;
    const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    sumChroma += chroma;
    count++;
  }

  if (count === 0) {
    return { meanLuminance: 0.5, contrastStdDev: 0.1, warmth: 0, saturation: 0 };
  }

  const meanLuminance = sumL / count;
  const variance = Math.max(0, sumL2 / count - meanLuminance * meanLuminance);
  const contrastStdDev = Math.sqrt(variance);
  const avgWarmth = sumWarmth / count;
  const avgSaturation = (sumChroma / count) * 4; // Normalized scale ~ 0 to 1

  return {
    meanLuminance: Math.round(meanLuminance * 1000) / 1000,
    contrastStdDev: Math.round(contrastStdDev * 1000) / 1000,
    warmth: Math.round(avgWarmth * 1000) / 1000,
    saturation: Math.round(avgSaturation * 1000) / 1000,
  };
}

/**
 * Infers initial photography mood tags based on lighting and chromatic telemetry.
 * Returns suggested tags for the photographer to review or refine.
 */
export function inferMoodTags(metrics: ImageTelemetryMetrics): string[] {
  const tags: string[] = [];

  // Key / Exposure classification
  if (metrics.meanLuminance < 0.32) {
    tags.push('low-key');
  } else if (metrics.meanLuminance > 0.68) {
    tags.push('high-key');
  }

  // Chromatic warmth classification
  if (metrics.warmth > 0.04) {
    tags.push('warm');
  } else if (metrics.warmth < -0.04) {
    tags.push('cool');
  }

  // Saturation classification
  if (metrics.saturation < 0.08) {
    tags.push('monochrome');
  } else if (metrics.saturation > 0.40) {
    tags.push('vivid');
  } else if (metrics.saturation < 0.22) {
    tags.push('muted');
  }

  // Contrast / Cinematic
  if (metrics.contrastStdDev > 0.26) {
    tags.push('high-contrast');
  }

  return tags.length > 0 ? tags : ['natural'];
}

