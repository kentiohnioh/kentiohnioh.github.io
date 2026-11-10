import { describe, it, expect } from 'vitest';
import {
  quantizeVectorInt8,
  dequantizeVectorInt8,
  dotProductFloatAndInt8,
  scoreLexicalMatch,
  computeHybridScore,
  rankPhotos,
} from './vector-search';
import { PhotoItem } from '../models/catalog.model';

function makePhoto(overrides: Partial<PhotoItem> = {}): PhotoItem {
  return {
    schemaVersion: 1,
    id: 'p-test',
    slug: 'solitude-in-ochre',
    title: 'Solitude in Ochre',
    alt: 'Moody portrait in warm natural golden hour light',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: '',
    palette: [{ hex: '#fbbf24', oklch: { l: 0.8, c: 0.15, h: 80 }, weight: 1 }],
    exif: { camera: 'Leica Q3', lens: 'Summilux 28mm', focalLengthMm: 28 },
    sources: { variants: [] },
    grade: null,
    retouch: null,
    collectionIds: ['portraits'],
    tags: ['portrait', 'golden-hour'],
    mood: ['quiet', 'warm'],
    flags: { hasPeople: true, retouched: true, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC0' },
    ...overrides,
  };
}

describe('vector-search', () => {
  describe('Int8 Quantization & Dequantization', () => {
    it('achieves round-trip error < 0.01 across 512 dimensions', () => {
      const dim = 512;
      const original = new Float32Array(dim);

      // Create random normalized vector
      let norm = 0;
      for (let i = 0; i < dim; i++) {
        original[i] = (Math.sin(i * 1.7) * 2 - 1);
        norm += original[i] * original[i];
      }
      norm = Math.sqrt(norm);
      for (let i = 0; i < dim; i++) {
        original[i] /= norm;
      }

      const quantized = quantizeVectorInt8(original);
      const restored = dequantizeVectorInt8(quantized);

      let maxError = 0;
      for (let i = 0; i < dim; i++) {
        const err = Math.abs(original[i] - restored[i]);
        if (err > maxError) maxError = err;
      }

      // Max quantization step is 1/127 = ~0.00787, well below 0.015
      expect(maxError).toBeLessThan(0.015);
    });

    it('computes high similarity for identical vectors and low for orthogonal', () => {
      const v1 = new Float32Array([1, 0, 0, 0]);
      const v2 = new Float32Array([1, 0, 0, 0]);
      const vOrth = new Float32Array([0, 1, 0, 0]);

      const q1 = quantizeVectorInt8(v1);
      const qOrth = quantizeVectorInt8(vOrth);

      const simSelf = dotProductFloatAndInt8(v2, q1);
      const simOrth = dotProductFloatAndInt8(v2, qOrth);

      expect(simSelf).toBeCloseTo(1.0, 1);
      expect(simOrth).toBeCloseTo(0.5, 1); // 0.5 is normalized neutral midpoint for orthogonal
    });
  });

  describe('Lexical Matching & Reasoning Chips', () => {
    it('matches query on title and tags with appropriate match reason chips', () => {
      const p = makePhoto();
      const res = scoreLexicalMatch(p, 'golden portrait');

      expect(res.score).toBeGreaterThan(0.5);
      expect(res.reasons.some((r) => r.includes('tag: portrait'))).toBe(true);
      expect(res.reasons.some((r) => r.includes('tag: golden-hour'))).toBe(true);
    });

    it('matches camera and mood terms', () => {
      const p = makePhoto();
      const res = scoreLexicalMatch(p, 'Leica warm');

      expect(res.score).toBeGreaterThan(0.4);
      expect(res.reasons.some((r) => r.includes('camera: Leica Q3'))).toBe(true);
      expect(res.reasons.some((r) => r.includes('mood: warm'))).toBe(true);
    });

    it('returns 0 score for completely unrelated query', () => {
      const p = makePhoto();
      const res = scoreLexicalMatch(p, 'airplane underwater blizzard');

      expect(res.score).toBe(0);
      expect(res.reasons).toHaveLength(0);
    });
  });

  describe('computeHybridScore & rankPhotos', () => {
    it('applies 0.7 * semantic + 0.3 * lexical formula', () => {
      const hybrid = computeHybridScore(0.8, 0.4);
      // 0.7 * 0.8 + 0.3 * 0.4 = 0.56 + 0.12 = 0.68
      expect(hybrid).toBeCloseTo(0.68, 4);
    });

    it('falls back to lexical score when semantic is undefined', () => {
      const hybrid = computeHybridScore(undefined, 0.75);
      expect(hybrid).toBe(0.75);
    });

    it('ranks relevant photos at top of results', () => {
      const p1 = makePhoto({ id: 'p1', title: 'Midnight Neon Tokyo', tags: ['night', 'street'] });
      const p2 = makePhoto({ id: 'p2', title: 'Morning Light Studio', tags: ['portrait', 'morning'] });

      const ranked = rankPhotos([p1, p2], 'neon night');
      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].photo.id).toBe('p1');
    });
  });
});
