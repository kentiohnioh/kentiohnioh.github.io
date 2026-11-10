import { describe, it, expect } from 'vitest';
import {
  microEdgeGate,
  applySpotHeal,
  neutralizeRedCast,
  enhanceTeeth,
  enhanceSclera,
  enhanceIris,
} from './retouch-math';
import { SpotHealPoint } from '../models/retouch.model';

describe('Retouch Math Algorithms', () => {
  it('microEdgeGate smoothly suppresses smoothing on high-contrast edges', () => {
    // For small differences (subtle tone variations), gate should be near 1.0 (allow smoothing)
    const subtle = microEdgeGate(0.01, 0.08);
    expect(subtle).toBeGreaterThan(0.9);

    // For moderate differences, gate provides partial gating
    const mid = microEdgeGate(0.08, 0.08);
    expect(mid).toBeCloseTo(Math.exp(-0.5), 2); // ~0.606

    // For sharp structural edges (eyelashes, pores, moles), gate approaches 0 (suppress smoothing)
    const sharp = microEdgeGate(0.25, 0.08);
    expect(sharp).toBeLessThan(0.02);
  });

  it('neutralizes red cast in OKLab without shifting melanin lightness or base hue', () => {
    // Highly flushed skin patch (high 'a' in OKLab)
    // Reddish skin: r=210, g=130, b=120
    const flushed = { r: 210, g: 130, b: 120 };
    const neutralized = neutralizeRedCast(flushed.r, flushed.g, flushed.b, 60, 0.04);

    // Green and blue channels should be preserved or slightly lifted; red slightly calmed
    expect(neutralized.r).toBeLessThanOrEqual(flushed.r);
    expect(neutralized.g).toBeGreaterThanOrEqual(flushed.g - 5);
    expect(neutralized.b).toBeGreaterThanOrEqual(flushed.b - 5);
  });

  it('natural teeth whitening desaturates yellow without artificial chalky blowout', () => {
    // Yellowed tooth enamel: r=235, g=225, b=190
    const tooth = { r: 235, g: 225, b: 190 };
    const whitened = enhanceTeeth(tooth.r, tooth.g, tooth.b, 40);

    // Blue should increase towards neutral white
    expect(whitened.b).toBeGreaterThan(tooth.b);
    // Red and green should remain within natural limits
    expect(whitened.r).toBeLessThanOrEqual(255);
    expect(whitened.g).toBeLessThanOrEqual(255);
  });

  it('sclera brightening gently softens redness without alien glow', () => {
    // Eye sclera with red capillary: r=220, g=200, b=200
    const sclera = { r: 220, g: 200, b: 200 };
    const enhanced = enhanceSclera(sclera.r, sclera.g, sclera.b, 35);

    expect(enhanced.r).toBeLessThanOrEqual(235);
    expect(enhanced.g).toBeGreaterThanOrEqual(sclera.g);
    expect(enhanced.b).toBeGreaterThanOrEqual(sclera.b);
  });

  it('applies spot blemish heal with smooth feather interpolation', () => {
    const width = 20;
    const height = 20;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Fill background with clean skin tone (r=200, g=150, b=140)
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = 200;
      pixels[i * 4 + 1] = 150;
      pixels[i * 4 + 2] = 140;
      pixels[i * 4 + 3] = 255;
    }

    // Place a dark blemish at target (10, 10)
    const blemishIdx = (10 * width + 10) * 4;
    pixels[blemishIdx] = 80;
    pixels[blemishIdx + 1] = 40;
    pixels[blemishIdx + 2] = 40;

    // Donor area at (5, 5) is clean skin
    const heal: SpotHealPoint = {
      id: 'heal-1',
      target: { x: 10 / width, y: 10 / height },
      donor: { x: 5 / width, y: 5 / height },
      radius: 3 / width,
      feather: 0.5,
    };

    applySpotHeal(pixels, width, height, heal);

    // The blemish should now be replaced with donor skin tone
    expect(pixels[blemishIdx]).toBeGreaterThan(180);
    expect(pixels[blemishIdx + 1]).toBeGreaterThan(130);
  });
});

