import { describe, it, expect } from 'vitest';
import {
  computeSpatialLayout,
  cullFrustum,
  computeCanvasBounds,
  selectLOD,
  calculateFitAllCamera,
  getHueCluster,
  hashStringToSeed,
  createMulberry32,
  ViewportRect,
} from './spatial-layout';
import { PhotoItem } from '../models/catalog.model';

function makeMockPhoto(id: string, hue = 40, chroma = 0.12, aspect = 1.5): PhotoItem {
  return {
    schemaVersion: 1,
    id,
    slug: `photo-${id}`,
    title: `Photo ${id}`,
    alt: `Accessible alt for ${id}`,
    width: 3000,
    height: 2000,
    aspect,
    placeholder: '',
    palette: [
      {
        hex: '#ff9900',
        oklch: { l: 0.7, c: chroma, h: hue },
        weight: 0.5,
      },
    ],
    exif: { focalLengthMm: 35, aperture: 2.8, shutterSeconds: 0.005, iso: 400 },
    sources: { variants: [] },
    grade: null,
    retouch: null,
    collectionIds: ['street'],
    tags: ['monochrome', 'street'],
    mood: ['quiet'],
    flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC0' },
  };
}

describe('spatial-layout', () => {
  describe('deterministic PRNG and hashing', () => {
    it('produces identical random numbers for identical seed', () => {
      const prng1 = createMulberry32(12345);
      const prng2 = createMulberry32(12345);
      for (let i = 0; i < 10; i++) {
        expect(prng1()).toBe(prng2());
      }
    });

    it('produces identical hash for identical string', () => {
      expect(hashStringToSeed('photo-alpha')).toBe(hashStringToSeed('photo-alpha'));
      expect(hashStringToSeed('photo-alpha')).not.toBe(hashStringToSeed('photo-beta'));
    });
  });

  describe('getHueCluster', () => {
    it('categorizes neutral for very low chroma', () => {
      const p = makeMockPhoto('1', 50, 0.02);
      expect(getHueCluster(p)).toBe('neutral');
    });

    it('categorizes warm for hue 0-90', () => {
      const p = makeMockPhoto('1', 45, 0.15);
      expect(getHueCluster(p)).toBe('warm');
    });

    it('categorizes natural for hue 90-180', () => {
      const p = makeMockPhoto('1', 130, 0.15);
      expect(getHueCluster(p)).toBe('natural');
    });

    it('categorizes cool for hue 180-270', () => {
      const p = makeMockPhoto('1', 220, 0.15);
      expect(getHueCluster(p)).toBe('cool');
    });

    it('categorizes twilight for hue 270-360', () => {
      const p = makeMockPhoto('1', 310, 0.15);
      expect(getHueCluster(p)).toBe('twilight');
    });
  });

  describe('computeSpatialLayout', () => {
    it('produces deterministic output across multiple invocations', () => {
      const photos = [
        makeMockPhoto('p1', 30),
        makeMockPhoto('p2', 120),
        makeMockPhoto('p3', 210),
        makeMockPhoto('p4', 300),
      ];

      const run1 = computeSpatialLayout(photos, 'hue', 300);
      const run2 = computeSpatialLayout(photos, 'hue', 300);

      expect(run1.length).toBe(4);
      expect(run1).toEqual(run2);
    });

    it('handles empty photo array gracefully', () => {
      expect(computeSpatialLayout([])).toEqual([]);
    });
  });

  describe('cullFrustum', () => {
    const photos = [
      makeMockPhoto('p1', 30),
      makeMockPhoto('p2', 120),
      makeMockPhoto('p3', 210),
    ];
    const items = computeSpatialLayout(photos, 'hue', 300);

    it('includes items within viewport', () => {
      const target = items[0];
      const viewport: ViewportRect = {
        cameraX: target.x,
        cameraY: target.y,
        zoom: 1.0,
        viewportWidth: 800,
        viewportHeight: 600,
      };

      const visible = cullFrustum(items, viewport, 50);
      expect(visible.some((v) => v.id === target.id)).toBe(true);
    });

    it('excludes items far outside viewport', () => {
      const viewport: ViewportRect = {
        cameraX: 99999,
        cameraY: 99999,
        zoom: 1.0,
        viewportWidth: 400,
        viewportHeight: 300,
      };

      const visible = cullFrustum(items, viewport, 0);
      expect(visible.length).toBe(0);
    });
  });

  describe('computeCanvasBounds & calculateFitAllCamera', () => {
    it('computes accurate bounds and fit-all zoom', () => {
      const photos = [makeMockPhoto('p1'), makeMockPhoto('p2')];
      const items = computeSpatialLayout(photos, 'hue', 300);
      const bounds = computeCanvasBounds(items);

      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);

      const fit = calculateFitAllCamera(bounds, 1200, 800);
      expect(fit.zoom).toBeGreaterThan(0);
      expect(fit.cameraX).toBeCloseTo((bounds.minX + bounds.maxX) / 2, 1);
    });
  });

  describe('selectLOD', () => {
    it('selects 640 for small screen width', () => {
      expect(selectLOD(320)).toBe(640);
      expect(selectLOD(640)).toBe(640);
    });

    it('selects 1280 for medium screen width', () => {
      expect(selectLOD(800)).toBe(1280);
      expect(selectLOD(1200)).toBe(1280);
    });

    it('selects 2048 for large screen width', () => {
      expect(selectLOD(1600)).toBe(2048);
      expect(selectLOD(2560)).toBe(2048);
    });
  });
});

