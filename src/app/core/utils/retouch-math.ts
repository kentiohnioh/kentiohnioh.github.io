import { RetouchSliders, SpotHealPoint, AnatomicalZoneId } from '../models/retouch.model';
import { rgbToOklab, oklabToRgb } from './palette';

/**
 * Evaluates the micro-edge gate factor for a pixel given its original and low-pass filtered luminance.
 * When the difference exceeds the edge threshold (e.g., eyelash, sharp pore, mole), gating returns ~0,
 * suppressing smoothing and preserving full natural sharpness.
 *
 * @param diff Absolute luminance difference |I_orig - I_low| in [0, 1]
 * @param edgeThreshold Threshold beyond which detail is recognized as a structural feature
 */
export function microEdgeGate(diff: number, edgeThreshold = 0.08): number {
  if (diff <= 0.001) return 1.0;
  // Gaussian rolloff: as diff grows past threshold, gate drops towards 0
  const ratio = diff / edgeThreshold;
  return Math.exp(-0.5 * ratio * ratio);
}

/**
 * Applies spot healing patch operation to an RGBA pixel buffer.
 */
export function applySpotHeal(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  heal: SpotHealPoint
): void {
  const tx = Math.round(heal.target.x * width);
  const ty = Math.round(heal.target.y * height);
  const dx = Math.round(heal.donor.x * width);
  const dy = Math.round(heal.donor.y * height);
  const r = Math.round(heal.radius * Math.min(width, height));
  const feather = Math.max(0.01, heal.feather);

  const rSq = r * r;
  const innerR = r * (1 - feather);
  const innerRSq = innerR * innerR;

  const minX = Math.max(0, tx - r);
  const maxX = Math.min(width - 1, tx + r);
  const minY = Math.max(0, ty - r);
  const maxY = Math.min(height - 1, ty + r);

  const offsetX = dx - tx;
  const offsetY = dy - ty;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distSq = (x - tx) * (x - tx) + (y - ty) * (y - ty);
      if (distSq > rSq) continue;

      let weight = 1.0;
      if (distSq > innerRSq) {
        const d = Math.sqrt(distSq);
        const t = (r - d) / (r - innerR);
        // Smoothstep interpolation
        weight = t * t * (3 - 2 * t);
      }

      const srcX = Math.max(0, Math.min(width - 1, x + offsetX));
      const srcY = Math.max(0, Math.min(height - 1, y + offsetY));

      const targetIdx = (y * width + x) * 4;
      const donorIdx = (srcY * width + srcX) * 4;

      for (let c = 0; c < 3; c++) {
        const donorVal = pixels[donorIdx + c];
        const targetVal = pixels[targetIdx + c];
        pixels[targetIdx + c] = Math.round(targetVal * (1 - weight) + donorVal * weight);
      }
    }
  }
}

/**
 * Neutralizes erythema / transient red flare in OKLab without shifting melanin lightness L or skin hue.
 */
export function neutralizeRedCast(
  r: number,
  g: number,
  b: number,
  strength: number,
  targetChromaticityA = 0.04
): { r: number; g: number; b: number } {
  if (strength <= 0) return { r, g, b };

  const lab = rgbToOklab(r, g, b);
  // In OKLab, positive 'a' represents redness.
  // If 'a' is higher than target baseline, gently compress excess 'a'
  if (lab.a > targetChromaticityA) {
    const factor = Math.min(1.0, (strength / 100) * 0.5); // capped at 50% reduction for natural ethics
    const excessA = lab.a - targetChromaticityA;
    const adjustedA = lab.a - excessA * factor;
    return oklabToRgb({ l: lab.l, a: adjustedA, b: lab.b });
  }

  return { r, g, b };
}

/**
 * Natural teeth whitening: selectively desaturates yellow cast while gently lifting luminance,
 * strictly capped to avoid artificial, chalky fluorescent white.
 */
export function enhanceTeeth(
  r: number,
  g: number,
  b: number,
  whiteningStrength: number
): { r: number; g: number; b: number } {
  if (whiteningStrength <= 0) return { r, g, b };

  const lab = rgbToOklab(r, g, b);
  const factor = Math.min(0.5, whiteningStrength / 100); // capped at natural limit

  // In OKLab, positive 'b' represents yellowness.
  // Desaturate positive b
  let adjustedB = lab.b;
  if (adjustedB > 0) {
    adjustedB = adjustedB * (1 - factor * 0.6);
  }

  // Gentle luminance lift, capped at +0.08
  const maxLift = 0.08 * factor;
  const adjustedL = Math.min(0.95, lab.l + maxLift);

  return oklabToRgb({ l: adjustedL, a: lab.a, b: adjustedB });
}

/**
 * Natural sclera brightening: gently softens veins without creating an artificial "alien" eye glow.
 */
export function enhanceSclera(
  r: number,
  g: number,
  b: number,
  radianceStrength: number
): { r: number; g: number; b: number } {
  if (radianceStrength <= 0) return { r, g, b };

  const lab = rgbToOklab(r, g, b);
  const factor = Math.min(0.4, radianceStrength / 100); // capped at natural limit

  // Soften redness (positive a) and yellowness (positive b)
  const adjustedA = lab.a > 0 ? lab.a * (1 - factor * 0.4) : lab.a;
  const adjustedB = lab.b > 0 ? lab.b * (1 - factor * 0.4) : lab.b;

  // Modest luminance lift, capped at +0.06
  const adjustedL = Math.min(0.94, lab.l + 0.06 * factor);

  return oklabToRgb({ l: adjustedL, a: adjustedA, b: adjustedB });
}

/**
 * Iris micro-contrast and catchlight pop enhancement.
 */
export function enhanceIris(
  r: number,
  g: number,
  b: number,
  clarity: number,
  catchlightPop: number
): { r: number; g: number; b: number } {
  if (clarity <= 0 && catchlightPop <= 0) return { r, g, b };

  const lab = rgbToOklab(r, g, b);
  let l = lab.l;

  // Iris clarity: s-curve contrast centered at l = 0.4
  if (clarity > 0) {
    const contrastFactor = 1.0 + (clarity / 100) * 0.35;
    l = 0.4 + (l - 0.4) * contrastFactor;
    l = Math.max(0.02, Math.min(0.98, l));
  }

  // Catchlight pop: if specular highlight (l > 0.7), boost luminance
  if (catchlightPop > 0 && l > 0.7) {
    const boost = (l - 0.7) * (catchlightPop / 100) * 0.4;
    l = Math.min(1.0, l + boost);
  }

  return oklabToRgb({ l, a: lab.a, b: lab.b });
}

/**
 * Computes high-frequency energy ratio E_HF_retouched / E_HF_original for a given zone mask.
 * This verifies the Protected-Zone Invariance rule: protected zones (lashes, brows, irises, hair,
 * beard, glasses) must retain >= 95% of their high-frequency energy even at extreme skin smoothing.
 */
export function computeHighFrequencyRetention(
  original: Float32Array, // Luminance in [0, 1]
  retouched: Float32Array,
  lowPass: Float32Array,
  mask: Float32Array, // Zone weights in [0, 1]
  width: number,
  height: number
): number {
  let origHfEnergy = 0.0;
  let retouchedHfEnergy = 0.0;
  let totalWeight = 0.0;

  const count = width * height;
  for (let i = 0; i < count; i++) {
    const w = mask[i];
    if (w < 0.05) continue;

    totalWeight += w;

    // High frequency is the difference from the low-pass base
    const origHf = original[i] - lowPass[i];
    const retouchedHf = retouched[i] - lowPass[i];

    origHfEnergy += origHf * origHf * w;
    retouchedHfEnergy += retouchedHf * retouchedHf * w;
  }

  if (totalWeight < 1 || origHfEnergy < 1e-6) {
    return 1.0; // Invariant if zone has no significant high frequencies
  }

  return retouchedHfEnergy / origHfEnergy;
}