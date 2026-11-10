import { describe, it, expect } from 'vitest';
import {
  matchesFocalStop,
  matchesApertureStop,
  matchesShutterStop,
  matchesIsoStop,
  matchesColorSwatch,
  matchesViewfinderFilters,
  computeFacetCounts,
  hexToOklab,
  deltaEOklab,
  oklchToOklab,
  ViewfinderFilters,
} from './viewfinder-filter';
import { PhotoItem } from '../models/catalog.model';

function mockPhoto(overrides: Partial<PhotoItem> = {}): PhotoItem {
  return {
    schemaVersion: 1,
    id: 'test-1',
    slug: 'test-1',
    title: 'Test Photo',
    alt: 'Accessible alt',
    width: 3000,
    height: 2000,
    aspect: 1.5,
    placeholder: '',
    palette: [
      {
        hex: '#34d399',
        oklch: { l: 0.78, c: 0.15, h: 160 },
        weight: 0.6,
      },
    ],
    exif: {
      focalLengthMm: 35,
      aperture: 2.8,
      shutterSeconds: 0.004,
      iso: 400,
      camera: 'Sony A7R IV',
      lens: 'FE 35mm F1.4 GM',
    },
    sources: { variants: [] },
    grade: null,
    retouch: null,
    collectionIds: ['monochrome'],
    tags: ['street', 'night'],
    mood: ['quiet', 'cinematic'],
    flags: { hasPeople: true, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC0' },
    ...overrides,
  };
}

describe('viewfinder-filter', () => {
  describe('Focal length dial', () => {
    it('matches 35mm to street stop', () => {
      const p = mockPhoto({ exif: { focalLengthMm: 35 } });
      expect(matchesFocalStop(p, 'street')).toBe(true);
      expect(matchesFocalStop(p, 'wide')).toBe(false);
      expect(matchesFocalStop(p, 'portrait')).toBe(false);
      expect(matchesFocalStop(p, 'all')).toBe(true);
    });

    it('matches 24mm to wide stop', () => {
      const p = mockPhoto({ exif: { focalLengthMm: 24 } });
      expect(matchesFocalStop(p, 'wide')).toBe(true);
      expect(matchesFocalStop(p, 'street')).toBe(false);
    });

    it('matches 85mm to portrait stop', () => {
      const p = mockPhoto({ exif: { focalLengthMm: 85 } });
      expect(matchesFocalStop(p, 'portrait')).toBe(true);
    });
  });

  describe('Aperture dial', () => {
    it('matches f/2.8 stop accurately', () => {
      const p = mockPhoto({ exif: { aperture: 2.8 } });
      expect(matchesApertureStop(p, 'f2.8')).toBe(true);
      expect(matchesApertureStop(p, 'f1.4')).toBe(false);
      expect(matchesApertureStop(p, 'f5.6')).toBe(false);
      expect(matchesApertureStop(p, 'all')).toBe(true);
    });

    it('matches f/1.4 stop accurately', () => {
      const p = mockPhoto({ exif: { aperture: 1.4 } });
      expect(matchesApertureStop(p, 'f1.4')).toBe(true);
    });
  });

  describe('Shutter dial', () => {
    it('matches medium shutter speed', () => {
      const p = mockPhoto({ exif: { shutterSeconds: 0.004 } }); // 1/250s
      expect(matchesShutterStop(p, 'medium')).toBe(true);
      expect(matchesShutterStop(p, 'fast')).toBe(false);
      expect(matchesShutterStop(p, 'long')).toBe(false);
    });

    it('matches long exposure', () => {
      const p = mockPhoto({ exif: { shutterSeconds: 2.5 } });
      expect(matchesShutterStop(p, 'long')).toBe(true);
      expect(matchesShutterStop(p, 'fast')).toBe(false);
    });
  });

  describe('ISO dial', () => {
    it('matches ISO 400 stop', () => {
      const p = mockPhoto({ exif: { iso: 400 } });
      expect(matchesIsoStop(p, '400')).toBe(true);
      expect(matchesIsoStop(p, '100')).toBe(false);
      expect(matchesIsoStop(p, '6400')).toBe(false);
    });
  });

  describe('OKLab Delta-E and color swatch matching', () => {
    it('computes low Delta-E for identical or very close colors', () => {
      const c1 = hexToOklab('#34d399');
      const c2 = hexToOklab('#34d399');
      expect(deltaEOklab(c1, c2)).toBeCloseTo(0, 5);

      const closeGreen = hexToOklab('#30ce94');
      expect(deltaEOklab(c1, closeGreen)).toBeLessThan(0.05);
    });

    it('matches photo with emerald swatch palette', () => {
      const p = mockPhoto({
        palette: [
          {
            hex: '#34d399',
            oklch: { l: 0.78, c: 0.15, h: 160 },
            weight: 0.7,
          },
        ],
      });
      expect(matchesColorSwatch(p, '#34d399')).toBe(true);
      expect(matchesColorSwatch(p, '#f43f5e')).toBe(false); // Rose is far away
    });
  });

  describe('matchesViewfinderFilters and computeFacetCounts', () => {
    const photos = [
      mockPhoto({ id: '1', exif: { focalLengthMm: 35, aperture: 2.8, shutterSeconds: 0.004, iso: 400 }, mood: ['quiet'] }),
      mockPhoto({ id: '2', exif: { focalLengthMm: 24, aperture: 1.4, shutterSeconds: 0.0005, iso: 100 }, mood: ['dramatic'] }),
      mockPhoto({ id: '3', exif: { focalLengthMm: 85, aperture: 1.8, shutterSeconds: 0.002, iso: 800 }, mood: ['quiet'] }),
    ];

    it('filters composite criteria correctly', () => {
      const filters: ViewfinderFilters = {
        focalStop: 'street',
        mood: 'quiet',
      };
      const filtered = photos.filter((p) => matchesViewfinderFilters(p, filters));
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('computes facet counts across stops', () => {
      const facets = computeFacetCounts(photos, { focalStop: 'all' });
      expect(facets.focal['street']).toBe(1);
      expect(facets.focal['wide']).toBe(1);
      expect(facets.focal['portrait']).toBe(1);
      expect(facets.focal['tele']).toBe(0);
      expect(facets.mood['quiet']).toBe(2);
      expect(facets.mood['dramatic']).toBe(1);
    });
  });
});

