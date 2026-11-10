import { describe, it, expect } from 'vitest';
import { computeSsim, meetsPerceptualFloor } from './perceptual-metric';

describe('Perceptual Quality Guard (SSIM)', () => {
  it('returns exactly 1.0 SSIM for identical images', () => {
    const width = 64;
    const height = 64;
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 120; // R
      rgba[i + 1] = 150; // G
      rgba[i + 2] = 180; // B
      rgba[i + 3] = 255;
    }

    const ssim = computeSsim(rgba, rgba, width, height);
    expect(ssim).toBeCloseTo(1.0, 4);

    const check = meetsPerceptualFloor(rgba, rgba, width, height, 0.985);
    expect(check.passes).toBe(true);
    expect(check.ssim).toBeCloseTo(1.0, 4);
  });

  it('detects degradation and lowers SSIM when noise/blur is added', () => {
    const width = 64;
    const height = 64;
    const orig = new Uint8ClampedArray(width * height * 4);
    const noisy = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < orig.length; i += 4) {
      const base = ((i / 4) % 256);
      orig[i] = base;
      orig[i + 1] = base;
      orig[i + 2] = base;
      orig[i + 3] = 255;

      // Heavy noise degradation
      noisy[i] = Math.max(0, Math.min(255, base + (i % 2 === 0 ? 40 : -40)));
      noisy[i + 1] = Math.max(0, Math.min(255, base + (i % 2 === 0 ? 40 : -40)));
      noisy[i + 2] = Math.max(0, Math.min(255, base + (i % 2 === 0 ? 40 : -40)));
      noisy[i + 3] = 255;
    }

    const ssim = computeSsim(orig, noisy, width, height);
    expect(ssim).toBeLessThan(0.985);

    const check = meetsPerceptualFloor(orig, noisy, width, height, 0.985);
    expect(check.passes).toBe(false);
  });
});
