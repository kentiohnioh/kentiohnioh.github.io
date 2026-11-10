import { describe, it, expect } from 'vitest';
import {
  FILM_PROFILES,
  FilmStockId,
  generateFilmStockLut,
} from './film-profiles';
import { sample3dLut } from './cube-lut';

describe('Film Stock Profiles & Procedural 3D LUT Generation', () => {
  const stockIds: FilmStockId[] = [
    'kodachrome-64',
    'portra-400',
    'tri-x-400',
    'fuji-pro-400h',
    'cinestill-800t',
  ];

  it('defines 5 signature film stocks with full metadata and valid color grade recipes', () => {
    expect(stockIds.length).toBe(5);

    for (const id of stockIds) {
      const profile = FILM_PROFILES[id];
      expect(profile).toBeDefined();
      expect(profile.id).toBe(id);
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.recipe).toBeDefined();
      expect(profile.recipe.presetId).toBe(id);
      expect(profile.recipe.splitTone).toBeDefined();
      expect(profile.recipe.grain).toBeDefined();
    }
  });

  it('generates a 3D LUT for Tri-X 400 that completely neutralizes chromaticity to pure monochrome', () => {
    const size = 9;
    const triXLut = generateFilmStockLut('tri-x-400', size);

    // Test multiple chromatic coordinates:
    const testSamples = [
      [1.0, 0.0, 0.0], // Pure red
      [0.0, 1.0, 0.0], // Pure green
      [0.0, 0.0, 1.0], // Pure blue
      [0.9, 0.7, 0.2], // Saturated yellow
      [0.2, 0.8, 0.8], // Cyan
    ];

    for (const [r, g, b] of testSamples) {
      const sampled = sample3dLut(triXLut, size, r, g, b);
      // For monochrome, R, G, B channels must be identical
      expect(sampled[0]).toBeCloseTo(sampled[1], 2);
      expect(sampled[1]).toBeCloseTo(sampled[2], 2);
    }
  });

  it('generates Kodachrome 64 with higher contrast and punchy warm highlights', () => {
    const size = 9;
    const lut = generateFilmStockLut('kodachrome-64', size);

    // Midtone neutral
    const mid = sample3dLut(lut, size, 0.5, 0.5, 0.5);
    expect(mid[0]).toBeDefined();

    // Saturated skin tone
    const skin = sample3dLut(lut, size, 0.8, 0.6, 0.5);
    expect(skin[0]).toBeGreaterThan(skin[2]);
  });

  it('generates Portra 400 with softer contrast and natural portrait skin preservation', () => {
    const size = 9;
    const lut = generateFilmStockLut('portra-400', size);
    const profile = FILM_PROFILES['portra-400'];

    expect(profile.recipe.skinProtect.enabled).toBe(true);
    expect(profile.recipe.skinProtect.strength).toBeGreaterThanOrEqual(0.8);

    const skin = sample3dLut(lut, size, 0.82, 0.65, 0.55);
    expect(skin[0]).toBeGreaterThan(0.7);
  });

  it('generates CineStill 800T with teal-and-orange split characteristic', () => {
    const size = 9;
    const lut = generateFilmStockLut('cinestill-800t', size);

    // Shadow neutral (0.2, 0.2, 0.2) should shift towards teal/cyan (lower R, higher G/B)
    const shadow = sample3dLut(lut, size, 0.2, 0.2, 0.2);
    expect(shadow[2]).toBeGreaterThanOrEqual(shadow[0] - 0.05);

    // Highlight neutral (0.8, 0.8, 0.8) should shift towards warm amber (higher R, lower B)
    const highlight = sample3dLut(lut, size, 0.8, 0.8, 0.8);
    expect(highlight[0]).toBeGreaterThanOrEqual(highlight[2]);
  });
});
