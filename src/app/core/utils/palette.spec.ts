import { describe, it, expect } from 'vitest';
import {
  rgbToOklab,
  oklabToRgb,
  oklabToOklch,
  extractPaletteFromRgba,
  sRgbToLinear,
  linearToSRgb,
} from './palette';

describe('OKLab & Palette Extraction', () => {
  it('converts sRGB to linear and back with minimal rounding error', () => {
    for (let c = 0; c <= 255; c += 15) {
      const lin = sRgbToLinear(c);
      const back = linearToSRgb(lin);
      expect(Math.abs(back - c)).toBeLessThanOrEqual(1);
    }
  });

  it('transforms pure red to expected OKLab coordinates', () => {
    const lab = rgbToOklab(255, 0, 0);
    expect(lab.l).toBeGreaterThan(0.5);
    expect(lab.l).toBeLessThan(0.7);
    expect(lab.a).toBeGreaterThan(0.15); // Positive a* (red)

    const oklch = oklabToOklch(lab);
    expect(oklch.c).toBeGreaterThan(0.15);
    expect(oklch.h).toBeGreaterThan(20);
    expect(oklch.h).toBeLessThan(35);
  });

  it('roundtrips OKLab conversion through sRGB accurately', () => {
    const origR = 180;
    const origG = 120;
    const origB = 80;

    const lab = rgbToOklab(origR, origG, origB);
    const rgb = oklabToRgb(lab);

    expect(Math.abs(rgb.r - origR)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgb.g - origG)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgb.b - origB)).toBeLessThanOrEqual(2);
  });

  it('extracts 5 normalized swatches from a synthetic gradient buffer', () => {
    const width = 100;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);

    // Create a synthetic image with 3 distinct color regions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 33) {
          // Warm Ochre
          rgba[idx] = 180;
          rgba[idx + 1] = 100;
          rgba[idx + 2] = 50;
        } else if (x < 66) {
          // Cool Blue
          rgba[idx] = 40;
          rgba[idx + 1] = 120;
          rgba[idx + 2] = 200;
        } else {
          // Forest Green
          rgba[idx] = 45;
          rgba[idx + 1] = 130;
          rgba[idx + 2] = 70;
        }
        rgba[idx + 3] = 255;
      }
    }

    const swatches = extractPaletteFromRgba(rgba, 5);

    expect(swatches.length).toBeGreaterThanOrEqual(3);
    expect(swatches.length).toBeLessThanOrEqual(5);

    // Assert weights sum to approximately 1.00
    const sumWeights = swatches.reduce((acc, s) => acc + s.weight, 0);
    expect(sumWeights).toBeGreaterThanOrEqual(0.95);
    expect(sumWeights).toBeLessThanOrEqual(1.05);

    // All swatches have valid hex codes
    swatches.forEach((s) => {
      expect(s.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(s.oklch.l).toBeGreaterThan(0);
      expect(s.oklch.l).toBeLessThanOrEqual(1);
    });
  });
});
