/**
 * Structural Similarity Index (SSIM) Perceptual Metric.
 * Used by the Ingest Quality Guard to ensure compressed variants never drop
 * below the perceptual quality floor (default SSIM >= 0.985).
 */

export interface SsimOptions {
  windowSize?: number; // Default: 8
  k1?: number; // Default: 0.01
  k2?: number; // Default: 0.03
  bitDepth?: number; // Default: 8 (L = 255)
}

/**
 * Computes mean SSIM on the luminance channel between two RGBA buffers of identical dimensions.
 * Returns a value in [0, 1], where 1.0 is identical.
 */
export function computeSsim(
  originalRgba: Uint8ClampedArray | Uint8Array,
  compressedRgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: SsimOptions = {}
): number {
  if (originalRgba.length !== compressedRgba.length) {
    throw new Error('Image buffers must have identical lengths for SSIM calculation');
  }

  const windowSize = options.windowSize ?? 8;
  const L = (1 << (options.bitDepth ?? 8)) - 1; // 255
  const k1 = options.k1 ?? 0.01;
  const k2 = options.k2 ?? 0.03;
  const c1 = (k1 * L) ** 2;
  const c2 = (k2 * L) ** 2;

  // Extract luminance: Y = 0.299*R + 0.587*G + 0.114*B
  const totalPixels = width * height;
  const yOrig = new Float32Array(totalPixels);
  const yComp = new Float32Array(totalPixels);

  for (let i = 0, p = 0; i < originalRgba.length; i += 4, p++) {
    yOrig[p] = 0.299 * originalRgba[i] + 0.587 * originalRgba[i + 1] + 0.114 * originalRgba[i + 2];
    yComp[p] = 0.299 * compressedRgba[i] + 0.587 * compressedRgba[i + 1] + 0.114 * compressedRgba[i + 2];
  }

  let ssimSum = 0;
  let windowsCount = 0;

  for (let y = 0; y <= height - windowSize; y += windowSize) {
    for (let x = 0; x <= width - windowSize; x += windowSize) {
      let meanX = 0;
      let meanY = 0;
      const n = windowSize * windowSize;

      // 1. Compute means
      for (let wy = 0; wy < windowSize; wy++) {
        const rowOffset = (y + wy) * width + x;
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = rowOffset + wx;
          meanX += yOrig[idx];
          meanY += yComp[idx];
        }
      }
      meanX /= n;
      meanY /= n;

      // 2. Compute variances and covariance
      let varX = 0;
      let varY = 0;
      let covXY = 0;

      for (let wy = 0; wy < windowSize; wy++) {
        const rowOffset = (y + wy) * width + x;
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = rowOffset + wx;
          const dx = yOrig[idx] - meanX;
          const dy = yComp[idx] - meanY;
          varX += dx * dx;
          varY += dy * dy;
          covXY += dx * dy;
        }
      }

      varX /= n - 1;
      varY /= n - 1;
      covXY /= n - 1;

      // 3. Compute window SSIM
      const numerator = (2 * meanX * meanY + c1) * (2 * covXY + c2);
      const denominator = (meanX * meanX + meanY * meanY + c1) * (varX + varY + c2);
      const winSsim = numerator / denominator;

      ssimSum += winSsim;
      windowsCount++;
    }
  }

  if (windowsCount === 0) return 1.0;
  const meanSsim = ssimSum / windowsCount;
  return Math.max(0, Math.min(1, meanSsim));
}

/**
 * Checks if the compressed buffer satisfies the perceptual floor.
 * Default floor: 0.985
 */
export function meetsPerceptualFloor(
  original: Uint8ClampedArray | Uint8Array,
  compressed: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  floor = 0.985
): { passes: boolean; ssim: number } {
  const ssim = computeSsim(original, compressed, width, height);
  return {
    passes: ssim >= floor,
    ssim: Math.round(ssim * 10000) / 10000,
  };
}

