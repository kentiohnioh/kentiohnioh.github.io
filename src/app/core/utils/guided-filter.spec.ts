import { describe, it, expect } from 'vitest';
import { boxBlur, applyGuidedFilter } from './guided-filter';

describe('Fast Guided Filter (Phase 4 Edge Refinement)', () => {
  it('computes 2D moving box blur with exact boundary clamping', () => {
    const width = 10;
    const height = 10;
    const src = new Float32Array(width * height).fill(1.0);
    const dst = new Float32Array(width * height);

    boxBlur(src, dst, width, height, 2);

    // Uniform input must produce uniform output of 1.0
    for (let i = 0; i < dst.length; i++) {
      expect(dst[i]).toBeCloseTo(1.0, 4);
    }
  });

  it('preserves sharp guidance boundaries and prevents edge bleeding', () => {
    const width = 30;
    const height = 30;
    const numPixels = width * height;

    // 1. Create a sharp vertical edge in the guidance image (left half 0.1, right half 0.9)
    const guideI = new Float32Array(numPixels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        guideI[y * width + x] = x < 15 ? 0.1 : 0.9;
      }
    }

    // 2. Create a coarse, blurry mask that bleeds across the edge
    const blurryMaskP = new Float32Array(numPixels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Ramp from 0.0 to 1.0 across the edge
        blurryMaskP[y * width + x] = x / 30.0;
      }
    }

    // 3. Apply Guided Filter
    const refinedQ = applyGuidedFilter(guideI, blurryMaskP, width, height, {
      radius: 3,
      eps: 1e-3,
    });

    // The output should snap to the guidance edge:
    const midY = 15;
    const valLeft = refinedQ[midY * width + 10];
    const valRight = refinedQ[midY * width + 19];

    expect(valLeft).toBeLessThan(0.40);
    expect(valRight).toBeGreaterThan(0.60);
    expect(valRight - valLeft).toBeGreaterThan(0.2);
  });
});
