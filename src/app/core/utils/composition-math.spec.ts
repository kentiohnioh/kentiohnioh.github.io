import { describe, it, expect } from 'vitest';
import { computeCompositionGuides, estimateLightingDirection } from './composition-math';

describe('composition-math', () => {
  describe('computeCompositionGuides', () => {
    it('computes accurate Rule of Thirds coordinates', () => {
      const guides = computeCompositionGuides();
      expect(guides.thirds.xLines[0]).toBeCloseTo(0.3333, 3);
      expect(guides.thirds.xLines[1]).toBeCloseTo(0.6667, 3);
      expect(guides.thirds.powerPoints).toHaveLength(4);
    });

    it('computes accurate Golden Ratio lines and points', () => {
      const guides = computeCompositionGuides();
      expect(guides.goldenRatio.xLines[0]).toBeCloseTo(0.382, 3);
      expect(guides.goldenRatio.xLines[1]).toBeCloseTo(0.618, 3);
      expect(guides.goldenRatio.powerPoints).toHaveLength(4);
    });

    it('generates non-empty Golden Spiral SVG path', () => {
      const guides = computeCompositionGuides();
      expect(guides.goldenSpiralPath).toContain('M ');
      expect(guides.goldenSpiralPath).toContain(' L ');
    });
  });

  describe('estimateLightingDirection', () => {
    it('identifies light coming from upper right', () => {
      const width = 4;
      const height = 4;
      const pixels = new Uint8ClampedArray(width * height * 4);

      // Make top-right quadrant bright (white 255), rest dark (0)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (x >= 2 && y < 2) {
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
          } else {
            pixels[idx] = 10;
            pixels[idx + 1] = 10;
            pixels[idx + 2] = 10;
          }
          pixels[idx + 3] = 255;
        }
      }

      const lighting = estimateLightingDirection(pixels, width, height);
      expect(lighting.isEstimated).toBe(true);
      expect(lighting.cardinalLabel).toContain('Upper Right');
      expect(lighting.angleDegrees).toBeGreaterThanOrEqual(25);
      expect(lighting.angleDegrees).toBeLessThan(65);
    });

    it('detects diffused/ambient light when image is uniform', () => {
      const width = 4;
      const height = 4;
      const pixels = new Uint8ClampedArray(width * height * 4);
      pixels.fill(128);

      const lighting = estimateLightingDirection(pixels, width, height);
      expect(lighting.cardinalLabel).toContain('Diffused');
      expect(lighting.isEstimated).toBe(true);
    });
  });
});

