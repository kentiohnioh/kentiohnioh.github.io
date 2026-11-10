import { describe, it, expect } from 'vitest';
import { CatalogValidator } from '../../src/app/core/services/catalog-validator.service';
import { PhotoItem } from '../../src/app/core/models/catalog.model';

const validBasePhoto: PhotoItem = {
  schemaVersion: 1,
  id: 'valid-photo-001',
  slug: 'valid-photo-slug',
  title: 'Valid Photography Subject',
  alt: 'A detailed accessible description of the photograph.',
  width: 2048,
  height: 1365,
  aspect: 1.5,
  placeholder: 'data:image/svg+xml;utf8,<svg></svg>',
  palette: [
    { hex: '#2b1d14', oklch: { l: 0.22, c: 0.04, h: 42 }, weight: 0.7 },
    { hex: '#8a4b28', oklch: { l: 0.45, c: 0.12, h: 48 }, weight: 0.3 }
  ],
  exif: {
    camera: 'Leica SL2',
    lens: 'Summilux-SL 50mm f/1.4 ASPH.',
    focalLengthMm: 50,
    aperture: 1.4,
    shutterSeconds: 0.002,
    iso: 100
  },
  sources: {
    variants: [
      {
        width: 1280,
        height: 853,
        format: 'webp',
        bytes: 84000,
        sha256: 'abc123hash',
        urls: ['https://storage.example.com/photos/1280.webp']
      }
    ]
  },
  grade: null,
  retouch: null,
  collectionIds: ['portraits'],
  tags: ['portrait', 'studio'],
  mood: ['warm'],
  flags: {
    hasPeople: true,
    retouched: false,
    showBeforeAfter: false
  },
  rights: {
    copyright: '© Theng Nioh',
    license: 'All Rights Reserved'
  }
};

describe('CatalogValidator', () => {
  it('passes a fully compliant PhotoItem', () => {
    const result = CatalogValidator.validatePhotoItem(validBasePhoto);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Negative Case 1: Empty alt text
  it('rejects an empty alt text string', () => {
    const invalid = { ...validBasePhoto, alt: '   ' };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('alt text is mandatory'))).toBe(true);
  });

  // Negative Case 2: Missing id
  it('rejects missing or empty id', () => {
    const invalid = { ...validBasePhoto, id: '' };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('id is required'))).toBe(true);
  });

  // Negative Case 3: Missing slug
  it('rejects missing or whitespace slug', () => {
    const invalid = { ...validBasePhoto, slug: ' ' };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('slug is required'))).toBe(true);
  });

  // Negative Case 4: Non-positive width
  it('rejects zero or negative width', () => {
    const invalid = { ...validBasePhoto, width: 0 };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('width must be greater than 0'))).toBe(true);
  });

  // Negative Case 5: Non-positive height
  it('rejects zero or negative height', () => {
    const invalid = { ...validBasePhoto, height: -100 };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('height must be greater than 0'))).toBe(true);
  });

  // Negative Case 6: Non-positive aspect ratio
  it('rejects non-positive aspect ratio', () => {
    const invalid = { ...validBasePhoto, aspect: 0 };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('aspect ratio must be greater than 0'))).toBe(true);
  });

  // Negative Case 7: Missing placeholder
  it('rejects missing placeholder', () => {
    const invalid = { ...validBasePhoto, placeholder: '' };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('placeholder is required'))).toBe(true);
  });

  // Negative Case 8: Empty palette
  it('rejects empty palette array', () => {
    const invalid = { ...validBasePhoto, palette: [] };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('palette must be an array with at least 1 dominant swatch'))).toBe(true);
  });

  // Negative Case 9: Invalid hex in palette
  it('rejects malformed hex colour in palette swatch', () => {
    const invalid = {
      ...validBasePhoto,
      palette: [{ hex: 'not-a-hex', oklch: { l: 0.5, c: 0.1, h: 50 }, weight: 1 }]
    };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('valid 6-character hex color'))).toBe(true);
  });

  // Negative Case 10: Empty variants array in sources
  it('rejects empty sources.variants array', () => {
    const invalid = { ...validBasePhoto, sources: { variants: [] } };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('sources.variants must contain at least one ImageVariant'))).toBe(true);
  });

  // Negative Case 11: Invalid format in variant
  it('rejects unapproved image format in variant', () => {
    const invalid = {
      ...validBasePhoto,
      sources: {
        variants: [
          {
            width: 1280,
            height: 800,
            format: 'bmp' as any,
            bytes: 50000,
            sha256: 'hash',
            urls: ['https://example.com/test.bmp']
          }
        ]
      }
    };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes("must be one of 'avif', 'webp', 'jpeg'"))).toBe(true);
  });

  // Negative Case 12: Variant bytes <= 0
  it('rejects variant with non-positive byte size', () => {
    const invalid = {
      ...validBasePhoto,
      sources: {
        variants: [
          {
            width: 1280,
            height: 800,
            format: 'webp',
            bytes: 0,
            sha256: 'hash',
            urls: ['https://example.com/test.webp']
          }
        ]
      }
    };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('bytes must be greater than 0'))).toBe(true);
  });

  // Negative Case 13: Empty urls array in variant
  it('rejects variant with empty urls array', () => {
    const invalid = {
      ...validBasePhoto,
      sources: {
        variants: [
          {
            width: 1280,
            height: 800,
            format: 'webp',
            bytes: 50000,
            sha256: 'hash',
            urls: []
          }
        ]
      }
    };
    const res = CatalogValidator.validatePhotoItem(invalid);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.includes('urls must contain at least one URL'))).toBe(true);
  });

  // Privacy Rule Test: GPS purging
  it('automatically purges GPS coordinates when precision is hidden', () => {
    const withHiddenGps = {
      ...validBasePhoto,
      exif: {
        ...validBasePhoto.exif,
        gps: { lat: 35.6895, lng: 139.6917, precision: 'hidden' as const }
      }
    };
    const res = CatalogValidator.validatePhotoItem(withHiddenGps);
    expect(res.success).toBe(true);
    expect(res.data?.exif.gps).toBeUndefined();
  });
});

