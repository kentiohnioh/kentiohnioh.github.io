import { describe, it, expect } from 'vitest';
import { AmbientGlowService } from './ambient-glow.service';
import { PaletteSwatch } from '../models/catalog.model';
import { sRgbToLinear } from '../utils/palette';

function getRelativeLuminance(r: number, g: number, b: number): number {
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function computeContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('AmbientGlowService', () => {
  const glowService = new AmbientGlowService();

  it('clamps extreme bright and vivid swatches so text contrast satisfies WCAG 2.2 AA (>= 4.5:1)', () => {
    // Highly vivid fluorescent swatch (L = 0.85, C = 0.35)
    const intenseSwatch: PaletteSwatch = {
      hex: '#00ffff',
      oklch: { l: 0.85, c: 0.35, h: 195 },
      weight: 1.0,
    };

    const clampedRgb = glowService.clampSwatchForAmbientContrast(intenseSwatch);

    // Body text relative luminance: #e8ecf2 (r: 232, g: 236, b: 242)
    const textLum = getRelativeLuminance(232, 236, 242);
    const ambientLum = getRelativeLuminance(clampedRgb.r, clampedRgb.g, clampedRgb.b);

    const contrastRatio = computeContrastRatio(textLum, ambientLum);

    // Assert WCAG 2.2 AA contrast ratio >= 4.5:1
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('updates CSS custom properties with clamped RGBA values', () => {
    const swatches: PaletteSwatch[] = [
      { hex: '#8a4b28', oklch: { l: 0.45, c: 0.12, h: 48 }, weight: 0.5 },
      { hex: '#2b1d14', oklch: { l: 0.22, c: 0.04, h: 42 }, weight: 0.3 },
      { hex: '#c88c5d', oklch: { l: 0.65, c: 0.11, h: 58 }, weight: 0.2 },
    ];

    glowService.updateGlowFromPalette(swatches);

    const [g1, g2, g3] = glowService.currentColors();
    expect(g1).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.12\)$/);
    expect(g2).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.08\)$/);
    expect(g3).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.05\)$/);
  });
});

