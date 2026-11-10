import { describe, it, expect } from 'vitest';
import { fitSubjectSkinModel, evaluateSkinGateProbability, SkinPatchSample } from './skin-model';

describe('Subject-Relative Skin Color Model & Fairness (Fitzpatrick I-VI)', () => {
  // Test 1: Fitzpatrick I-II (Fair skin)
  it('correctly models and identifies Fitzpatrick I-II (fair) skin tones', () => {
    // RGB samples for light skin tone: R: 235, G: 200, B: 180
    const fairSamples: SkinPatchSample[] = [
      { r: 235, g: 200, b: 180 },
      { r: 230, g: 195, b: 175 },
      { r: 240, g: 205, b: 185 },
      { r: 228, g: 192, b: 170 },
      { r: 236, g: 198, b: 178 },
    ];

    const model = fitSubjectSkinModel(fairSamples);

    // Test in-distribution fair skin pixel
    const pSkin = evaluateSkinGateProbability(233, 199, 179, model);
    expect(pSkin).toBeGreaterThan(0.85);

    // Test non-skin green foliage pixel (R: 40, G: 150, B: 50)
    const pFoliage = evaluateSkinGateProbability(40, 150, 50, model);
    expect(pFoliage).toBeLessThan(0.01);
  });

  // Test 2: Fitzpatrick III-IV (East Asian / Mediterranean / Olive skin)
  it('correctly models and identifies Fitzpatrick III-IV (medium/olive) skin tones', () => {
    // RGB samples for medium tone: R: 195, G: 155, B: 120
    const mediumSamples: SkinPatchSample[] = [
      { r: 195, g: 155, b: 120 },
      { r: 190, g: 150, b: 115 },
      { r: 200, g: 160, b: 125 },
      { r: 188, g: 148, b: 112 },
      { r: 192, g: 152, b: 118 },
    ];

    const model = fitSubjectSkinModel(mediumSamples);

    const pSkin = evaluateSkinGateProbability(194, 153, 119, model);
    expect(pSkin).toBeGreaterThan(0.85);

    const pSky = evaluateSkinGateProbability(80, 140, 230, model);
    expect(pSky).toBeLessThan(0.01);
  });

  // Test 3: Fitzpatrick V-VI (Deep Bronze / Dark skin)
  it('correctly models and identifies Fitzpatrick V-VI (deep bronze / dark) skin tones without zero-coverage', () => {
    // RGB samples for deep bronze skin tone: R: 105, G: 68, B: 48
    const darkSamples: SkinPatchSample[] = [
      { r: 105, g: 68, b: 48 },
      { r: 100, g: 65, b: 45 },
      { r: 110, g: 72, b: 52 },
      { r: 98, g: 63, b: 42 },
      { r: 103, g: 67, b: 47 },
    ];

    const model = fitSubjectSkinModel(darkSamples);

    // Assert that the subject-relative model detects darker skin tones with high probability
    const pDarkSkin = evaluateSkinGateProbability(104, 69, 49, model);
    expect(pDarkSkin).toBeGreaterThan(0.85);

    // Negative check on blue clothing
    const pBlueClothes = evaluateSkinGateProbability(30, 40, 110, model);
    expect(pBlueClothes).toBeLessThan(0.01);
  });
});
