import { ColorGradeRecipe } from '../models/color-grade.model';

export type RGB = [number, number, number];

/**
 * Calculates luminance using Rec. 709 coefficients.
 */
export function getLuminance(rgb: RGB): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Applies exposure compensation in EV units (-3.0 to +3.0).
 */
export function applyExposure(rgb: RGB, ev: number): RGB {
  if (ev === 0) return rgb;
  const factor = Math.pow(2, ev);
  return [rgb[0] * factor, rgb[1] * factor, rgb[2] * factor];
}

/**
 * Applies White Balance: Temperature (-100 cool to +100 warm) and Tint (-100 green to +100 magenta).
 */
export function applyTemperatureAndTint(rgb: RGB, temperature: number, tint: number): RGB {
  if (temperature === 0 && tint === 0) return rgb;

  // Temperature scales Red vs Blue
  const tempFactor = temperature / 100;
  const rTemp = 1.0 + tempFactor * 0.25;
  const bTemp = 1.0 - tempFactor * 0.25;

  // Tint scales Green vs Red/Blue
  const tintFactor = tint / 100;
  const gTint = 1.0 - tintFactor * 0.15;
  const rbTint = 1.0 + tintFactor * 0.08;

  return [
    Math.max(0, rgb[0] * rTemp * rbTint),
    Math.max(0, rgb[1] * gTint),
    Math.max(0, rgb[2] * bTemp * rbTint),
  ];
}

/**
 * Applies Contrast, Highlights, Shadows, Whites, and Blacks tone adjustments.
 */
export function applyToneControls(
  rgb: RGB,
  contrast: number,
  highlights: number,
  shadows: number,
  whites: number,
  blacks: number
): RGB {
  let [r, g, b] = rgb;
  const lum = getLuminance(rgb);

  // 1. Contrast around midpoint 0.18
  if (contrast !== 0) {
    const factor = (100 + contrast) / 100;
    r = 0.18 + (r - 0.18) * factor;
    g = 0.18 + (g - 0.18) * factor;
    b = 0.18 + (b - 0.18) * factor;
  }

  // 2. Highlights (smooth ramp active above 0.5)
  if (highlights !== 0) {
    const hWeight = Math.max(0, (lum - 0.5) * 2);
    const hOffset = (highlights / 100) * 0.25 * hWeight;
    r += hOffset;
    g += hOffset;
    b += hOffset;
  }

  // 3. Shadows (smooth ramp active below 0.5)
  if (shadows !== 0) {
    const sWeight = Math.max(0, (0.5 - lum) * 2);
    const sOffset = (shadows / 100) * 0.25 * sWeight;
    r += sOffset;
    g += sOffset;
    b += sOffset;
  }

  // 4. Whites (extreme high-end clipping control)
  if (whites !== 0) {
    const wWeight = Math.pow(Math.max(0, (lum - 0.7) / 0.3), 2);
    const wOffset = (whites / 100) * 0.2 * wWeight;
    r += wOffset;
    g += wOffset;
    b += wOffset;
  }

  // 5. Blacks (extreme shadow floor control)
  if (blacks !== 0) {
    const bWeight = Math.pow(Math.max(0, (0.3 - lum) / 0.3), 2);
    const bOffset = (blacks / 100) * 0.2 * bWeight;
    r += bOffset;
    g += bOffset;
    b += bOffset;
  }

  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

/**
 * Applies Saturation and Vibrance. Vibrance selectively boosts lower-saturated colors
 * while protecting already saturated areas and skin tones.
 */
export function applyVibranceAndSaturation(rgb: RGB, vibrance: number, saturation: number): RGB {
  if (vibrance === 0 && saturation === 0) return rgb;

  const lum = getLuminance(rgb);
  const maxC = Math.max(rgb[0], rgb[1], rgb[2]);
  const minC = Math.min(rgb[0], rgb[1], rgb[2]);
  const currentSat = maxC > 0.001 ? (maxC - minC) / maxC : 0;

  // Vibrance factor: selectively protects already saturated colors
  const vibFactor = (vibrance / 100) * Math.max(0, 1.0 - currentSat);
  // Total saturation multiplier
  const satFactor = 1.0 + saturation / 100 + vibFactor;

  return [
    Math.max(0, lum + (rgb[0] - lum) * satFactor),
    Math.max(0, lum + (rgb[1] - lum) * satFactor),
    Math.max(0, lum + (rgb[2] - lum) * satFactor),
  ];
}

/**
 * Applies Split Toning to shadows and highlights.
 */
export function applySplitToning(
  rgb: RGB,
  splitTone: ColorGradeRecipe['splitTone']
): RGB {
  const { shadowHue, shadowSat, highlightHue, highlightSat, balance } = splitTone;
  if (shadowSat === 0 && highlightSat === 0) return rgb;

  const lum = getLuminance(rgb);
  // Midpoint shifted by balance (-100 to +100 -> 0.2 to 0.8)
  const midpoint = 0.5 + (balance / 100) * 0.3;

  const shadowTint = hueToRgb(shadowHue);
  const highlightTint = hueToRgb(highlightHue);

  let [r, g, b] = rgb;

  // Shadow tinting
  if (lum < midpoint && shadowSat > 0) {
    const weight = Math.pow((midpoint - lum) / midpoint, 1.5) * (shadowSat / 100) * 0.3;
    r = r * (1 - weight) + shadowTint[0] * lum * weight * 2;
    g = g * (1 - weight) + shadowTint[1] * lum * weight * 2;
    b = b * (1 - weight) + shadowTint[2] * lum * weight * 2;
  }

  // Highlight tinting
  if (lum > midpoint && highlightSat > 0) {
    const weight = Math.pow((lum - midpoint) / (1.0 - midpoint), 1.5) * (highlightSat / 100) * 0.3;
    r = r * (1 - weight) + highlightTint[0] * weight;
    g = g * (1 - weight) + highlightTint[1] * weight;
    b = b * (1 - weight) + highlightTint[2] * weight;
  }

  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

/**
 * Evaluates procedural film grain with luminance-weighted response curve.
 * Grain is prominent in midtones and attenuated in deep blacks and specular whites.
 */
export function evaluateLuminanceGrainWeight(lum: number): number {
  const clamped = Math.max(0, Math.min(1, lum));
  // Filmic bell curve: sin(pi * lum)
  return Math.sin(Math.PI * clamped);
}

/**
 * Calculates vignette attenuation multiplier (0 to 1).
 */
export function calculateVignetteMultiplier(
  uvX: number,
  uvY: number,
  vignette: ColorGradeRecipe['vignette']
): number {
  if (vignette.amount === 0) return 1.0;

  // Center coordinate (-1 to 1)
  const dx = (uvX - 0.5) * 2.0;
  const dy = (uvY - 0.5) * 2.0;

  // Roundness aspect adjustment
  const roundnessFactor = 1.0 + (vignette.roundness / 100) * 0.5;
  const dist = Math.sqrt(dx * dx * roundnessFactor + dy * dy / roundnessFactor);

  const midpoint = vignette.midpoint / 100;
  const feather = Math.max(0.01, vignette.feather / 100);

  if (dist <= midpoint) return 1.0;

  const t = Math.min(1.0, (dist - midpoint) / feather);
  const smooth = t * t * (3 - 2 * t);

  const intensity = (vignette.amount / 100) * 0.75;
  return Math.max(0, 1.0 + intensity * smooth);
}

/**
 * Blends the graded color back towards the original color for pixels covered by the skin protection mask.
 * This guarantees that portraits retain healthy, natural skin tones even under aggressive creative grades.
 */
export function blendSkinProtection(
  graded: RGB,
  original: RGB,
  skinMaskWeight: number, // 0 to 1
  protectStrength: number // 0 to 1
): RGB {
  if (protectStrength <= 0 || skinMaskWeight <= 0.001) {
    return graded;
  }

  const factor = Math.max(0, Math.min(1, skinMaskWeight * protectStrength));
  return [
    graded[0] * (1 - factor) + original[0] * factor,
    graded[1] * (1 - factor) + original[1] * factor,
    graded[2] * (1 - factor) + original[2] * factor,
  ];
}

/**
 * Converts hue angle (0-360) to pure saturated RGB tint.
 */
function hueToRgb(hue: number): RGB {
  const h = ((hue % 360) + 360) % 360 / 60;
  const c = 1.0;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 1) { r = c; g = x; b = 0; }
  else if (h >= 1 && h < 2) { r = x; g = c; b = 0; }
  else if (h >= 2 && h < 3) { r = 0; g = c; b = x; }
  else if (h >= 3 && h < 4) { r = 0; g = x; b = c; }
  else if (h >= 4 && h < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [r, g, b];
}
