import { describe, it, expect } from 'vitest';
import { PublishValidator } from './publish-validator';
import { PhotoItem } from '../models/catalog.model';

function makeValidPhoto(id: string, slug: string): PhotoItem {
  return {
    schemaVersion: 1,
    id,
    slug,
    title: `Photo ${id}`,
    alt: `Accessible descriptive alt text for ${id}`,
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/thumbhash;base64,12345678',
    palette: [{ hex: '#34d399', oklch: { l: 0.7, c: 0.1, h: 160 }, weight: 1 }],
    exif: { focalLengthMm: 35, aperture: 2.8, shutterSeconds: 0.004, iso: 400 },
    sources: {
      variants: [
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 84000,
          sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          urls: ['https://cdn.example.com/photo.webp'],
        },
      ],
    },
    grade: null,
    retouch: null,
    collectionIds: ['street'],
    tags: ['street'],
    mood: ['quiet'],
    flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC-BY-NC-ND-4.0' },
  };
}

describe('PublishValidator', () => {
  it('passes completely valid photos through all gates', () => {
    const photos = [makeValidPhoto('p1', 'slug-1'), makeValidPhoto('p2', 'slug-2')];
    const result = PublishValidator.validatePublishReadiness(photos);

    expect(result.valid).toBe(true);
    expect(result.passedPhotos).toBe(2);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects photos with empty or missing alt text', () => {
    const badPhoto = makeValidPhoto('p1', 'slug-1');
    badPhoto.alt = ''; // Empty!

    const result = PublishValidator.validatePublishReadiness([badPhoto]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'alt')).toBe(true);
  });

  it('rejects photos with duplicate slugs', () => {
    const p1 = makeValidPhoto('p1', 'identical-slug');
    const p2 = makeValidPhoto('p2', 'identical-slug');

    const result = PublishValidator.validatePublishReadiness([p1, p2]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'slug')).toBe(true);
  });

  it('rejects photos missing copyright or license', () => {
    const p = makeValidPhoto('p1', 'slug-1');
    p.rights.copyright = '';

    const result = PublishValidator.validatePublishReadiness([p]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field.includes('copyright'))).toBe(true);
  });

  it('rejects variants with invalid SHA-256 length', () => {
    const p = makeValidPhoto('p1', 'slug-1');
    p.sources.variants[0].sha256 = 'too-short';

    const result = PublishValidator.validatePublishReadiness([p]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field.includes('sha256'))).toBe(true);
  });

  describe('computeCatalogDiff and generateGitCommands', () => {
    it('accurately identifies added, modified, and removed photos', () => {
      const prev = [makeValidPhoto('p1', 'slug-1'), makeValidPhoto('p2', 'slug-2')];

      const modP2 = makeValidPhoto('p2', 'slug-2');
      modP2.title = 'Updated Title';

      const staged = [modP2, makeValidPhoto('p3', 'slug-3')]; // p1 removed, p2 modified, p3 added

      const diff = PublishValidator.computeCatalogDiff(prev, staged);
      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].id).toBe('p3');
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].id).toBe('p2');
      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0].id).toBe('p1');
      expect(diff.summary).toContain('+1 added, ~1 modified, -1 removed');

      const cmds = PublishValidator.generateGitCommands(diff);
      expect(cmds.commit).toContain('chore(catalog):');
      expect(cmds.push).toBe('git push origin main');
    });
  });
});

