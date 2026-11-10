import { describe, it, expect } from 'vitest';
import { computeHistogram } from './histogram-math';

describe('histogram-math', () => {
  it('correctly bins a pure white image and detects 100% highlight clipping', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // Fill with 255, 255, 255, 255
    pixels.fill(255);

    const hist = computeHistogram(pixels, width, height);

    expect(hist.r[255]).toBe(100);
    expect(hist.g[255]).toBe(100);
    expect(hist.b[255]).toBe(100);
    expect(hist.luma[255]).toBe(100);
    expect(hist.highlightClipPercent).toBe(100);
    expect(hist.shadowClipPercent).toBe(0);
  });

  it('correctly bins a pure black image and detects 100% shadow crushing', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // Fill R, G, B with 0, Alpha with 255
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }

    const hist = computeHistogram(pixels, width, height);

    expect(hist.r[0]).toBe(100);
    expect(hist.luma[0]).toBe(100);
    expect(hist.shadowClipPercent).toBe(100);
    expect(hist.highlightClipPercent).toBe(0);
  });

  it('correctly computes intermediate values without clipping', () => {
    const width = 2;
    const height = 2;
    const pixels = new Uint8ClampedArray([
      128, 128, 128, 255,
      128, 128, 128, 255,
      128, 128, 128, 255,
      128, 128, 128, 255,
    ]);

    const hist = computeHistogram(pixels, width, height);

    expect(hist.r[128]).toBe(4);
    expect(hist.luma[128]).toBe(4);
    expect(hist.shadowClipPercent).toBe(0);
    expect(hist.highlightClipPercent).toBe(0);
  });

  it('handles empty image buffer gracefully', () => {
    const hist = computeHistogram(new Uint8ClampedArray(0), 0, 0);
    expect(hist.shadowClipPercent).toBe(0);
    expect(hist.highlightClipPercent).toBe(0);
    expect(hist.maxBinCount).toBe(1);
  });
});
