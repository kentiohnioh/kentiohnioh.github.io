import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImageSourceLoader } from './image-source-loader.service';

describe('ImageSourceLoader (Public Failover Loader)', () => {
  let loader: ImageSourceLoader;

  beforeEach(() => {
    ImageSourceLoader.resetHealthMemory();
    loader = new ImageSourceLoader();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads from primary URL when it responds successfully', async () => {
    const fakeBlob = new Blob(['sample-image-bytes'], { type: 'image/webp' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => fakeBlob,
    });
    vi.stubGlobal('fetch', mockFetch);

    const urls = [
      'https://huggingface.co/datasets/thengnioh/photos/resolve/main/photo-1.webp',
      'https://cdn.jsdelivr.net/gh/thengnioh/photos@main/photo-1.webp',
    ];

    const result = await loader.load(urls);

    expect(result.resolvedUrl).toBe(urls[0]);
    expect(result.providerHost).toBe('huggingface.co');
    expect(result.hedged).toBe(false);
    expect(result.blob).toBe(fakeBlob);
  });

  it('switches to mirror URL when primary URL returns 404', async () => {
    const fakeMirrorBlob = new Blob(['mirror-image-bytes'], { type: 'image/webp' });

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('huggingface.co')) {
        return { ok: false, status: 404, statusText: 'Not Found' };
      }
      return {
        ok: true,
        status: 200,
        blob: async () => fakeMirrorBlob,
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const urls = [
      'https://huggingface.co/datasets/thengnioh/photos/resolve/main/photo-1.webp',
      'https://cdn.jsdelivr.net/gh/thengnioh/photos@main/photo-1.webp',
    ];

    const result = await loader.load(urls);

    expect(result.resolvedUrl).toBe(urls[1]);
    expect(result.providerHost).toBe('cdn.jsdelivr.net');
    expect(result.blob).toBe(fakeMirrorBlob);
  });

  it('rejects when all candidate sources fail', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    const urls = [
      'https://huggingface.co/photo.webp',
      'https://cdn.jsdelivr.net/photo.webp',
    ];

    await expect(loader.load(urls)).rejects.toThrow('All image sources failed');
  });

  it('deprioritizes a failing provider in session memory for subsequent requests', async () => {
    const mirrorBlob = new Blob(['bytes'], { type: 'image/webp' });

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('failing-primary.com')) {
        return { ok: false, status: 503, statusText: 'Service Unavailable' };
      }
      return { ok: true, status: 200, blob: async () => mirrorBlob };
    });
    vi.stubGlobal('fetch', mockFetch);

    const urls = [
      'https://failing-primary.com/photo-1.webp',
      'https://healthy-mirror.com/photo-1.webp',
    ];

    // First request fails primary twice -> triggers deprioritization
    await loader.load(urls);
    await loader.load(urls);

    // On subsequent load, healthy mirror should be sorted first automatically
    const sorted = loader.sortUrlsByProviderHealth(urls);
    expect(sorted[0]).toContain('healthy-mirror.com');
    expect(sorted[1]).toContain('failing-primary.com');
  });
});

