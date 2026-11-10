import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GpuRendererService } from './gpu-renderer.service';
import { FILM_PROFILES } from '../../core/utils/film-profiles';

describe('GpuRendererService', () => {
  let renderer: GpuRendererService;

  beforeEach(() => {
    renderer = new GpuRendererService();
  });

  it('initializes with capability detection', () => {
    expect(renderer.webGl2Supported()).toBe(true);
    expect(renderer.isRestoring()).toBe(false);
  });

  it('falls back to 2D canvas context when WebGL2 context is unavailable', () => {
    const mock2dCtx = {
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    };

    const mockCanvas = {
      clientWidth: 640,
      clientHeight: 427,
      width: 0,
      height: 0,
      getContext: vi.fn().mockImplementation((type: string) => {
        if (type === 'webgl2') return null; // WebGL2 unsupported
        if (type === '2d') return mock2dCtx;
        return null;
      }),
      addEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;

    const mockBitmap = {
      width: 640,
      height: 427,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    renderer.render({
      canvas: mockCanvas,
      bitmap: mockBitmap,
      cacheKey: 'fallback-test',
      recipe: FILM_PROFILES['kodachrome-64'].recipe,
    });

    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(mock2dCtx.drawImage).toHaveBeenCalled();
  });

  it('handles 3D LUT texture request gracefully when WebGL context is not yet active', () => {
    // When gl is null, getOrCreate3dLut should return null without throwing
    const lut = renderer.getOrCreate3dLut('portra-400', 17);
    expect(lut).toBeNull();
  });
});
