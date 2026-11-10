/**
 * Fast Guided Filter for Edge-Preserving Anatomical Mask Refinement.
 * Reference: Kaiming He, Jian Sun, Xiaoou Tang (IEEE TPAMI 2013).
 *
 * Runs in O(N) linear time using separable box filters, preserving sharp photographic
 * boundaries (hair strands, lips, lashes, jawline) without Gaussian edge bleeding.
 */

export interface GuidedFilterOptions {
  radius?: number; // Filter radius in pixels (default: 8)
  eps?: number; // Regularization parameter (default: 1e-4)
}

/**
 * Separable 1D horizontal & vertical box blur using sliding sum windows in O(1) per pixel.
 */
export function boxBlur(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number
): void {
  const temp = new Float32Array(src.length);

  // 1. Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let windowSum = 0;

    // Initialize window sum
    for (let x = -radius; x <= radius; x++) {
      const clampedX = Math.max(0, Math.min(width - 1, x));
      windowSum += src[rowOffset + clampedX];
    }

    const windowSize = 2 * radius + 1;

    for (let x = 0; x < width; x++) {
      temp[rowOffset + x] = windowSum / windowSize;

      // Slide window
      const leftX = Math.max(0, x - radius);
      const rightX = Math.min(width - 1, x + radius + 1);
      windowSum += src[rowOffset + rightX] - src[rowOffset + leftX];
    }
  }

  // 2. Vertical pass
  for (let x = 0; x < width; x++) {
    let windowSum = 0;

    for (let y = -radius; y <= radius; y++) {
      const clampedY = Math.max(0, Math.min(height - 1, y));
      windowSum += temp[clampedY * width + x];
    }

    const windowSize = 2 * radius + 1;

    for (let y = 0; y < height; y++) {
      dst[y * width + x] = windowSum / windowSize;

      const topY = Math.max(0, y - radius);
      const bottomY = Math.min(height - 1, y + radius + 1);
      windowSum += temp[bottomY * width + x] - temp[topY * width + x];
    }
  }
}

/**
 * Applies the Guided Filter to an anatomical probability mask p using a guidance channel I.
 * @param I Guidance image (normalized grayscale luminance [0, 1])
 * @param p Input coarse mask probability [0, 1]
 * @param width Image width
 * @param height Image height
 * @param options radius and epsilon regularization
 */
export function applyGuidedFilter(
  I: Float32Array,
  p: Float32Array,
  width: number,
  height: number,
  options: GuidedFilterOptions = {}
): Float32Array {
  const r = options.radius ?? 8;
  const eps = options.eps ?? 1e-4;
  const n = width * height;

  const meanI = new Float32Array(n);
  const meanP = new Float32Array(n);
  const corrI = new Float32Array(n);
  const corrIP = new Float32Array(n);

  // Pre-calculate products
  const II = new Float32Array(n);
  const Ip = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    II[i] = I[i] * I[i];
    Ip[i] = I[i] * p[i];
  }

  boxBlur(I, meanI, width, height, r);
  boxBlur(p, meanP, width, height, r);
  boxBlur(II, corrI, width, height, r);
  boxBlur(Ip, corrIP, width, height, r);

  // Compute a and b coefficients
  const a = new Float32Array(n);
  const b = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const varI = Math.max(0, corrI[i] - meanI[i] * meanI[i]);
    const covIP = corrIP[i] - meanI[i] * meanP[i];

    const aVal = covIP / (varI + eps);
    const bVal = meanP[i] - aVal * meanI[i];

    a[i] = aVal;
    b[i] = bVal;
  }

  // Smooth a and b
  const meanA = new Float32Array(n);
  const meanB = new Float32Array(n);
  boxBlur(a, meanA, width, height, r);
  boxBlur(b, meanB, width, height, r);

  // Compute refined output: q = meanA * I + meanB
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const out = meanA[i] * I[i] + meanB[i];
    q[i] = Math.max(0.0, Math.min(1.0, out));
  }

  return q;
}

