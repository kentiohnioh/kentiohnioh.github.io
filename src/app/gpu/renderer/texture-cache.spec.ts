import { describe, it, expect, vi } from 'vitest';
import { TextureCache } from './texture-cache';
import { PhotoItem } from '../../core/models/catalog.model';

const mockPhoto: PhotoItem = {
  schemaVersion: 1,
  id: 'lod-test-photo',
  slug: 'lod-test',
  title: 'LOD Test',
  alt: 'LOD selection test',
  width: 2048,
  height: 1365,
  aspect: 1.5,
  placeholder: 'hash',
  palette: [],
  exif: {},
  sources: {
    variants: [
      { width: 640, height: 427, format: 'webp', bytes: 30000, sha256: 'h640', urls: ['u640'] },
      { width: 1280, height: 853, format: 'webp', bytes: 85000, sha256: 'h1280', urls: ['u1280'] },
      { width: 2048, height: 1365, format: 'webp', bytes: 170000, sha256: 'h2048', urls: ['u2048'] },
    ],
  },
  grade: null,
  retouch: null,
  collectionIds: [],
  tags: [],
  mood: [],
  flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
  rights: { copyright: '© Theng Nioh', license: 'CC' },
};

describe('TextureCache & LOD Selection', () => {
  it('selects the smallest variant satisfying onScreenWidth x devicePixelRatio', () => {
    const cache = new TextureCache();

    // Case 1: Thumbnail 300px on 1x display (needs >= 300px -> picks 640px)
    const lod1 = cache.selectLodVariant(mockPhoto, 300, 1);
    expect(lod1.width).toBe(640);

    // Case 2: Thumbnail 400px on 2x retina display (needs >= 800px -> picks 1280px)
    const lod2 = cache.selectLodVariant(mockPhoto, 400, 2);
    expect(lod2.width).toBe(1280);

    // Case 3: Large Inspector 1000px on 2x display (needs >= 2000px -> picks 2048px)
    const lod3 = cache.selectLodVariant(mockPhoto, 1000, 2);
    expect(lod3.width).toBe(2048);

    // Case 4: Huge 4K screen (needs > 2048px -> caps at largest available 2048px)
    const lod4 = cache.selectLodVariant(mockPhoto, 2500, 2);
    expect(lod4.width).toBe(2048);
  });

  it('evicts least recently used textures when memory budget is exceeded', () => {
    // Create cache with tiny budget of 1 MB (~1,048,576 bytes)
    const cache = new TextureCache(1);
    const mockDeleteTexture = vi.fn();
    const mockGl = { deleteTexture: mockDeleteTexture } as unknown as WebGL2RenderingContext;

    // Put Texture 1: 300x300 (~479,700 bytes)
    const tex1 = {} as WebGLTexture;
    cache.put(mockGl, 'tex1', tex1, 300, 300);
    expect(cache.entryCount).toBe(1);

    // Put Texture 2: 300x300 (~479,700 bytes, total ~959,400 bytes, under 1 MB)
    const tex2 = {} as WebGLTexture;
    cache.put(mockGl, 'tex2', tex2, 300, 300);
    expect(cache.entryCount).toBe(2);

    // Touch Texture 1 so Texture 2 becomes the oldest
    cache.get('tex1');

    // Put Texture 3: 300x300 (exceeds 1 MB, must evict oldest = tex2!)
    const tex3 = {} as WebGLTexture;
    cache.put(mockGl, 'tex3', tex3, 300, 300);

    expect(mockDeleteTexture).toHaveBeenCalledWith(tex2);
    expect(cache.get('tex2')).toBeNull();
    expect(cache.get('tex1')).toBe(tex1);
    expect(cache.get('tex3')).toBe(tex3);
  });
});

