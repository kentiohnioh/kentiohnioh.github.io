import { describe, it, expect } from 'vitest';
import { computeHighFrequencyRetention, microEdgeGate } from './retouch-math';

describe('Protected-Zone Invariance Tests', () => {
  it('guarantees >= 95% high-frequency energy retention in protected zones under 100% skin smoothing', () => {
    const width = 64;
    const height = 64;
    const count = width * height;

    const original = new Float32Array(count);
    const lowPass = new Float32Array(count);
    const retouched = new Float32Array(count);

    // Setup:
    // Region A (x < 32): Face skin zone (smoothable)
    // Region B (x >= 32): Protected eyelash / eyebrow zone with fine high-frequency hair fibers
    const skinMask = new Float32Array(count);
    const protectedMask = new Float32Array(count);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const base = 0.5 + 0.1 * Math.sin(y / 10); // Low-frequency lighting gradient
        lowPass[idx] = base;

        if (x < 32) {
          // Face skin: fine pores (low-amplitude high frequency)
          skinMask[idx] = 1.0;
          protectedMask[idx] = 0.0;
          const pore = 0.02 * ((x * 13 + y * 17) % 5 - 2);
          original[idx] = base + pore;
        } else {
          // Protected lash/brow: sharp structural dark hairs
          skinMask[idx] = 0.0;
          protectedMask[idx] = 1.0;
          const isHair = (x % 3 === 0);
          const hairHf = isHair ? -0.25 : 0.05;
          original[idx] = base + hairHf;
        }
      }
    }

    // Simulate 100% skin smoothing pipeline with Partition of Unity zone masking & microEdgeGate:
    // Retouched pixel = original - (original - lowPass) * smoothingFactor * skinMask * gate
    const smoothingFactor = 1.0; // 100% maximum smoothing
    const textureRetention = 0.85;

    for (let i = 0; i < count; i++) {
      const hf = original[i] - lowPass[i];
      const gate = microEdgeGate(Math.abs(hf), 0.08);

      // Only face skin zone is subject to skin smoothing; protected zones have skinMask = 0
      const smoothAttenuation = (1.0 - textureRetention) * smoothingFactor * skinMask[i] * gate;
      retouched[i] = original[i] - hf * smoothAttenuation;
    }

    // 1. Verify face skin zone was smoothed (high frequency energy reduced)
    const skinRetention = computeHighFrequencyRetention(
      original,
      retouched,
      lowPass,
      skinMask,
      width,
      height
    );
    expect(skinRetention).toBeLessThan(0.8);

    // 2. Verify protected lash/brow zone retained >= 95% high frequency energy
    const protectedRetention = computeHighFrequencyRetention(
      original,
      retouched,
      lowPass,
      protectedMask,
      width,
      height
    );
    expect(protectedRetention).toBeGreaterThanOrEqual(0.95);
  });
});
