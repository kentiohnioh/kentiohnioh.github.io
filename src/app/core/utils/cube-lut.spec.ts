import { describe, it, expect } from 'vitest';
import {
  parseCubeLut,
  serializeCubeLut,
  generateIdentityLut,
  sample3dLut,
  convertLutToRgba8,
} from './cube-lut';

describe('Cube LUT Parser, Serializer & Sampling', () => {
  it('generates an exact identity 3D LUT', () => {
    const size = 17;
    const lut = generateIdentityLut(size);
    expect(lut.length).toBe(size * size * size * 3);

    // Corner: (0, 0, 0) -> [0, 0, 0]
    expect(lut[0]).toBe(0);
    expect(lut[1]).toBe(0);
    expect(lut[2]).toBe(0);

    // Corner: (1, 1, 1) -> [1, 1, 1]
    const lastIdx = (size * size * size - 1) * 3;
    expect(lut[lastIdx]).toBeCloseTo(1.0, 5);
    expect(lut[lastIdx + 1]).toBeCloseTo(1.0, 5);
    expect(lut[lastIdx + 2]).toBeCloseTo(1.0, 5);
  });

  it('samples identity LUT with trilinear interpolation accurately across arbitrary coordinates', () => {
    const size = 17;
    const lut = generateIdentityLut(size);

    const testCoords = [
      [0.0, 0.0, 0.0],
      [1.0, 1.0, 1.0],
      [0.5, 0.5, 0.5],
      [0.23, 0.67, 0.89],
      [0.123, 0.456, 0.789],
    ];

    for (const [r, g, b] of testCoords) {
      const sampled = sample3dLut(lut, size, r, g, b);
      expect(sampled[0]).toBeCloseTo(r, 4);
      expect(sampled[1]).toBeCloseTo(g, 4);
      expect(sampled[2]).toBeCloseTo(b, 4);
    }
  });

  it('serializes and parses a .CUBE file cleanly', () => {
    const size = 4;
    const originalLut = generateIdentityLut(size);
    const cubeText = serializeCubeLut('Test Identity', size, originalLut);

    expect(cubeText).toContain('TITLE "Test Identity"');
    expect(cubeText).toContain('LUT_3D_SIZE 4');

    const parsed = parseCubeLut(cubeText);
    expect(parsed.title).toBe('Test Identity');
    expect(parsed.size).toBe(4);
    expect(parsed.is3D).toBe(true);
    expect(parsed.data.length).toBe(4 * 4 * 4 * 3);

    for (let i = 0; i < parsed.data.length; i++) {
      expect(parsed.data[i]).toBeCloseTo(originalLut[i], 4);
    }
  });

  it('handles comments, empty lines, and whitespace in .CUBE files', () => {
    const rawCube = `
      # Comment header
      # Another comment
      TITLE "Custom Film Stock"

      # Domain specification
      DOMAIN_MIN 0.0 0.0 0.0
      DOMAIN_MAX 1.0 1.0 1.0

      LUT_3D_SIZE 2

      # Data entries (2^3 = 8 triplets)
      0.0 0.0 0.0
      1.0 0.0 0.0
      0.0 1.0 0.0
      1.0 1.0 0.0
      0.0 0.0 1.0
      1.0 0.0 1.0
      0.0 1.0 1.0
      1.0 1.0 1.0
    `;

    const parsed = parseCubeLut(rawCube);
    expect(parsed.title).toBe('Custom Film Stock');
    expect(parsed.size).toBe(2);
    expect(parsed.data.length).toBe(24);
  });

  it('throws an error on corrupted or mismatched .CUBE data', () => {
    const corruptCube = `
      LUT_3D_SIZE 2
      0.0 0.0 0.0
      1.0 1.0 1.0
      # Only 2 rows provided instead of 8
    `;

    expect(() => parseCubeLut(corruptCube)).toThrow(/Expected 24 floats/);
  });

  it('converts Float32Array to RGBA8 Uint8Array for WebGL upload', () => {
    const size = 2;
    const lut = generateIdentityLut(size);
    const rgba = convertLutToRgba8(lut, size);

    expect(rgba.length).toBe(2 * 2 * 2 * 4);
    // Alpha channel must be 255
    for (let i = 0; i < 8; i++) {
      expect(rgba[i * 4 + 3]).toBe(255);
    }
  });
});
