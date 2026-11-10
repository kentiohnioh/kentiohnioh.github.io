import { describe, it, expect } from 'vitest';
import {
  migratePhotoItem,
  serializeStableJson,
  CURRENT_SCHEMA_VERSION,
} from '../../src/app/core/utils/migrations';

describe('Migrations and Serialization', () => {
  it('migrates legacy v0 photo record to schemaVersion 1 with default flags and rights', () => {
    const rawLegacy = {
      id: 'legacy-photo-01',
      slug: 'legacy-photo-slug',
      title: 'Legacy Photo Title',
      alt: 'Accessible description',
      width: 1920,
      height: 1080,
      aspect: 1.77,
      placeholder: 'hash',
      palette: [{ hex: '#000000', oklch: { l: 0, c: 0, h: 0 }, weight: 1 }],
      exif: {
        camera: 'Classic Camera',
        gps: { lat: 10, lng: 20, precision: 'hidden' },
      },
      sources: {
        variants: [
          {
            width: 1280,
            height: 720,
            format: 'webp',
            bytes: 50000,
            sha256: 'hash',
            urls: ['https://example.com/test.webp'],
          },
        ],
      },
    };

    const migrated = migratePhotoItem(rawLegacy as any);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.flags).toEqual({
      hasPeople: false,
      retouched: false,
      showBeforeAfter: false,
    });
    expect(migrated.rights.copyright).toBe('© Theng Nioh');
    expect(migrated.rights.license).toBe('All Rights Reserved');
    // Ensure hidden GPS is purged
    expect(migrated.exif.gps).toBeUndefined();
  });

  it('produces deterministic stable JSON output regardless of key insertion order', () => {
    const objA = {
      zebra: 1,
      alpha: 'first',
      middle: {
        zeta: true,
        beta: [1, 2, 3],
      },
    };

    const objB = {
      alpha: 'first',
      middle: {
        beta: [1, 2, 3],
        zeta: true,
      },
      zebra: 1,
    };

    const serializedA = serializeStableJson(objA);
    const serializedB = serializeStableJson(objB);

    expect(serializedA).toBe(serializedB);
    expect(serializedA.indexOf('alpha')).toBeLessThan(serializedA.indexOf('middle'));
    expect(serializedA.indexOf('middle')).toBeLessThan(serializedA.indexOf('zebra'));
  });
});
