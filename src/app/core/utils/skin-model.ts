import { rgbToOklab, OklabColor } from './palette';

export interface SkinPatchSample {
  r: number;
  g: number;
  b: number;
}

export interface GaussianSkinModel {
  meanA: number;
  meanB: number;
  meanL: number;
  invCov00: number; // Matrix elements for 2D inverse covariance
  invCov01: number;
  invCov10: number;
  invCov11: number;
}

/**
 * Fits a 2D Gaussian in OKLab (a*, b*) chromaticity space from sampled facial patches.
 * Works across all Fitzpatrick skin tones (I through VI) by adapting to the subject's
 * own sampled distribution rather than an arbitrary universal skin color gate.
 */
export function fitSubjectSkinModel(samples: SkinPatchSample[]): GaussianSkinModel {
  if (samples.length === 0) {
    // Default neutral warm skin centroid fallback
    return {
      meanL: 0.5,
      meanA: 0.04,
      meanB: 0.05,
      invCov00: 400,
      invCov01: 0,
      invCov10: 0,
      invCov11: 400,
    };
  }

  // Convert to OKLab
  const labSamples: OklabColor[] = samples.map((s) => rgbToOklab(s.r, s.g, s.b));

  // Filter out specular highlights (L > 0.92) and deep cast shadows (L < 0.12)
  const filtered = labSamples.filter((p) => p.l >= 0.12 && p.l <= 0.92);
  const data = filtered.length >= 5 ? filtered : labSamples;

  // 1. Compute Mean
  let sumA = 0;
  let sumB = 0;
  let sumL = 0;
  for (const p of data) {
    sumA += p.a;
    sumB += p.b;
    sumL += p.l;
  }
  const meanA = sumA / data.length;
  const meanB = sumB / data.length;
  const meanL = sumL / data.length;

  // 2. Compute 2D Covariance Matrix
  let varA = 0;
  let varB = 0;
  let covAB = 0;

  for (const p of data) {
    const da = p.a - meanA;
    const db = p.b - meanB;
    varA += da * da;
    varB += db * db;
    covAB += da * db;
  }

  const n = Math.max(1, data.length - 1);
  varA /= n;
  varB /= n;
  covAB /= n;

  // Regularize covariance with minimum variance floor to prevent singularity
  const eps = 0.0004;
  const s00 = varA + eps;
  const s11 = varB + eps;
  const s01 = covAB;

  // 3. Invert 2x2 Covariance Matrix
  const det = s00 * s11 - s01 * s01;
  const invDet = 1.0 / Math.max(1e-7, det);

  return {
    meanA,
    meanB,
    meanL,
    invCov00: s11 * invDet,
    invCov01: -s01 * invDet,
    invCov10: -s01 * invDet,
    invCov11: s00 * invDet,
  };
}

/**
 * Computes soft probability weight [0, 1] that a given pixel belongs to the subject's skin.
 * Uses Mahalanobis distance in OKLab space: D_M^2 = (p - mu)^T * Sigma^-1 * (p - mu)
 */
export function evaluateSkinGateProbability(
  r: number,
  g: number,
  b: number,
  model: GaussianSkinModel,
  thresholdSigma = 2.5
): number {
  const lab = rgbToOklab(r, g, b);

  // Luminance boundary sanity check
  if (lab.l < 0.05 || lab.l > 0.98) {
    return 0.0;
  }

  const da = lab.a - model.meanA;
  const db = lab.b - model.meanB;

  // Squared Mahalanobis distance
  const d2 = da * (model.invCov00 * da + model.invCov01 * db) +
             db * (model.invCov10 * da + model.invCov11 * db);

  // Soft Gaussian bell curve: exp(-d2 / (2 * thresholdSigma^2))
  const exponent = -d2 / (2 * thresholdSigma * thresholdSigma);
  if (exponent < -8.0) return 0.0;

  return Math.exp(exponent);
}

