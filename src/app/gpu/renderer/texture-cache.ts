import { ImageVariant, PhotoItem } from '../../core/models/catalog.model';

export interface CachedTexture {
  key: string;
  texture: WebGLTexture;
  width: number;
  height: number;
  bytes: number;
  lastUsed: number;
}

/**
 * LRU Texture Cache with strict GPU memory budgeting.
 * Standard budget: 256 MB on desktop, 128 MB on mobile / low-memory devices.
 */
export class TextureCache {
  private readonly cache = new Map<string, CachedTexture>();
  private currentBytes = 0;
  private readonly maxBytes: number;
  private lruCounter = 0;

  constructor(maxMemoryMb?: number) {
    if (maxMemoryMb) {
      this.maxBytes = maxMemoryMb * 1024 * 1024;
    } else {
      // Determine budget based on device memory API where available
      let mb = 256;
      if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
        const mem = (navigator as unknown as { deviceMemory: number }).deviceMemory;
        if (mem && mem <= 4) mb = 128;
      }
      this.maxBytes = mb * 1024 * 1024;
    }
  }

  get memoryUsedBytes(): number {
    return this.currentBytes;
  }

  get memoryBudgetBytes(): number {
    return this.maxBytes;
  }

  get entryCount(): number {
    return this.cache.size;
  }

  /**
   * Selects the optimal level-of-detail (LOD) image variant.
   * Chooses the smallest variant whose width satisfies (onScreenWidth * dpr).
   */
  public selectLodVariant(photo: PhotoItem, onScreenWidth: number, dpr = 1): ImageVariant {
    const requiredPixels = onScreenWidth * dpr;
    const sorted = [...photo.sources.variants].sort((a, b) => a.width - b.width);

    // Find the smallest variant that satisfies on-screen width
    for (const v of sorted) {
      if (v.width >= requiredPixels) {
        return v;
      }
    }

    // If none are large enough, return the largest available variant
    return sorted[sorted.length - 1];
  }

  /**
   * Retrieves a texture from the cache, updating its LRU timestamp.
   */
  get(key: string): WebGLTexture | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    entry.lastUsed = ++this.lruCounter;
    return entry.texture;
  }

  /**
   * Adds a newly uploaded texture to the cache, evicting LRU entries if budget is exceeded.
   */
  put(gl: WebGL2RenderingContext, key: string, texture: WebGLTexture, width: number, height: number): void {
    if (this.cache.has(key)) {
      this.touch(key);
      return;
    }

    // RGBA8 texture with mipmaps uses approximately 5.33 bytes per pixel
    const bytes = Math.round(width * height * 5.33);

    // Evict least-recently-used textures until within budget
    while (this.currentBytes + bytes > this.maxBytes && this.cache.size > 0) {
      this.evictOldest(gl);
    }

    this.cache.set(key, {
      key,
      texture,
      width,
      height,
      bytes,
      lastUsed: ++this.lruCounter,
    });

    this.currentBytes += bytes;
  }

  touch(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = ++this.lruCounter;
    }
  }

  private evictOldest(gl: WebGL2RenderingContext): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      try {
        gl.deleteTexture(entry.texture);
      } catch {
        // Handle context loss
      }
      this.currentBytes -= entry.bytes;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clears all textures (e.g. on context loss or manual teardown).
   */
  clear(gl?: WebGL2RenderingContext): void {
    if (gl) {
      for (const entry of this.cache.values()) {
        try {
          gl.deleteTexture(entry.texture);
        } catch {
          // Context already lost
        }
      }
    }
    this.cache.clear();
    this.currentBytes = 0;
  }
}
