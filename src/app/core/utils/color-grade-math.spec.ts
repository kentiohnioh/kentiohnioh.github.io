import { describe, it, expect } from 'vitest';
import {
  applyExposure,
  applyTemperatureAndTint,
  applyToneControls,
  applyVibranceAndSaturation,
  applySplitToning,
  evaluateLuminanceGrainWeight,
  calculateVignetteMultiplier,
  blendSkinProtection,
  RGB,
} from './color-grade-math';

describe('Color Grade Math Algorithms', () => {
  it('applies photographic exposure doubling at +1.0 EV and halving at -1.0 EV', () => {
    const base: RGB = [0.2, 0.4, 0.6];
    const plusOne = applyExposure(base, 1.0);
    expect(plusOne[0]).toBeCloseTo(0.4, 4);
    expect(plusOne[1]).toBeCloseTo(0.8, 4);
    expect(plusOne[2]).toBeCloseTo(1.2, 4);

    const minusOne = applyExposure(base, -1.0);
    expect(minusOne[0]).toBeCloseTo(0.1, 4);
    expect(minusOne[1]).toBeCloseTo(0.2, 4);
    expect(minusOne[2]).toBeCloseTo(0.3, 4);
  });

  it('adjusts temperature warmly by increasing red and decreasing blue', () => {
    const base: RGB = [0.5, 0.5, 0.5];
    const warm = applyTemperatureAndTint(base, 50, 0);
    expect(warm[0]).toBeGreaterThan(base[0]);
    expect(warm[2]).toBeLessThan(base[2]);

    const cool = applyTemperatureAndTint(base, -50, 0);
    expect(cool[0]).toBeLessThan(base[0]);
    expect(cool[2]).toBeGreaterThan(base[2]);
  });

  it('applies contrast around 0.18 midpoint', () => {
    const shadow: RGB = [0.1, 0.1, 0.1];
    const highlight: RGB = [0.8, 0.8, 0.8];

    const highContrastShadow = applyToneControls(shadow, 50, 0, 0, 0, 0);
    const highContrastHighlight = applyToneControls(highlight, 50, 0, 0, 0, 0);

    // Shadows get darker, highlights get brighter
    expect(highContrastShadow[0]).toBeLessThan(shadow[0]);
    expect(highContrastHighlight[0]).toBeGreaterThan(highlight[0]);
  });

  it('vibrance boosts low-saturation tones while protecting highly saturated colors', () => {
    const muted: RGB = [0.45, 0.5, 0.52]; // Low saturation
    const saturated: RGB = [0.9, 0.1, 0.1]; // High saturation

    const vibMuted = applyVibranceAndSaturation(muted, 50, 0);
    const vibSat = applyVibranceAndSaturation(saturated, 50, 0);

    // Muted color gains significant saturation difference
    const mutedDiffBefore = Math.abs(muted[0] - muted[1]);
    const mutedDiffAfter = Math.abs(vibMuted[0] - vibMuted[1]);
    expect(mutedDiffAfter).toBeGreaterThan(mutedDiffBefore * 1.2);

    // Saturated color change is constrained
    expect(vibSat[0]).toBeCloseTo(saturated[0], 1);
  });

  it('evaluates film grain response curve with peak in midtones and minimums at limits', () => {
    const blackGrain = evaluateLuminanceGrainWeight(0.0);
    const midtoneGrain = evaluateLuminanceGrainWeight(0.5);
    const highlightGrain = evaluateLuminanceGrainWeight(1.0);

    expect(blackGrain).toBeCloseTo(0.0, 4);
    expect(highlightGrain).toBeCloseTo(0.0, 4);
    expect(midtoneGrain).toBeCloseTo(1.0, 4);
  });

  it('calculates vignette falloff properly with midpoint and feather', () => {
    const vignette = {
      amount: -50, // Darken edges
      midpoint: 50,
      roundness: 0,
      feather: 50,
    };

    // Center pixel (0.5, 0.5) has no vignette attenuation
    const center = calculateVignetteMultiplier(0.5, 0.5, vignette);
    expect(center).toBe(1.0);

    // Far corner pixel (0.0, 0.0) is darkened
    const corner = calculateVignetteMultiplier(0.0, 0.0, vignette);
    expect(corner).toBeLessThan(1.0);
  });

  it('blends skin protection mask to protect natural skin tones from aggressive grading', () => {
    const origSkin: RGB = [0.85, 0.65, 0.55]; // Healthy warm skin
    const extremeTealGrade: RGB = [0.2, 0.8, 0.9]; // Harsh stylized teal grade

    // 1. With 0% protection, output is completely teal
    const unprotected = blendSkinProtection(extremeTealGrade, origSkin, 1.0, 0.0);
    expect(unprotected[0]).toBeCloseTo(extremeTealGrade[0], 4);

    // 2. With 85% skin protection on full skin mask, output restores original warm skin tone
    const protectedSkin = blendSkinProtection(extremeTealGrade, origSkin, 1.0, 0.85);
    expect(protectedSkin[0]).toBeGreaterThan(0.7);
    expect(protectedSkin[0]).toBeGreaterThan(protectedSkin[1]); // R > G (natural warm skin)

    // 3. Background pixels (skin weight = 0) keep full creative grade
    const background = blendSkinProtection(extremeTealGrade, origSkin, 0.0, 0.85);
    expect(background[0]).toBeCloseTo(extremeTealGrade[0], 4);
  });
});
