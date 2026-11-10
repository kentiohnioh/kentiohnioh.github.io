import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { CatalogIndex, PhotoItem, ShardCatalog } from '../models/catalog.model';
import { CatalogValidator } from './catalog-validator.service';

export type GalleryMode = 'spatial' | 'sway' | 'contact' | 'zine';

export interface FilterCriteria {
  collectionId?: string | null;
  mood?: string | null;
  tag?: string | null;
  focalBucket?: string | null;
  apertureBucket?: string | null;
  hasPeople?: boolean | null;
  retouchedOnly?: boolean | null;
  searchQuery?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CatalogStateService {
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });

  // State Signals
  readonly index = signal<CatalogIndex | null>(null);
  readonly photos = signal<PhotoItem[]>([]);
  readonly galleryMode = signal<GalleryMode>('sway');
  readonly selectedPhotoId = signal<string | null>(null);
  readonly activeFilters = signal<FilterCriteria>({});
  readonly loadingState = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly shardStatus = signal<Record<string, 'idle' | 'loading' | 'loaded' | 'error'>>({});

  // Computed derivations
  readonly selectedPhoto = computed(() => {
    const id = this.selectedPhotoId();
    if (!id) return null;
    return this.photos().find((p) => p.id === id || p.slug === id) ?? null;
  });

  readonly filteredPhotos = computed(() => {
    const all = this.photos();
    const f = this.activeFilters();

    return all.filter((photo) => {
      if (f.collectionId && !photo.collectionIds.includes(f.collectionId)) {
        return false;
      }
      if (f.mood && !photo.mood.includes(f.mood)) {
        return false;
      }
      if (f.tag && !photo.tags.includes(f.tag)) {
        return false;
      }
      if (f.hasPeople !== undefined && f.hasPeople !== null && photo.flags.hasPeople !== f.hasPeople) {
        return false;
      }
      if (f.retouchedOnly && !photo.flags.retouched) {
        return false;
      }
      if (f.focalBucket) {
        const fl = photo.exif.focalLengthMm;
        if (!fl) return false;
        if (f.focalBucket === 'ultra-wide' && fl >= 24) return false;
        if (f.focalBucket === 'wide' && (fl < 24 || fl > 35)) return false;
        if (f.focalBucket === 'standard' && (fl <= 35 || fl > 70)) return false;
        if (f.focalBucket === 'telephoto' && fl <= 70) return false;
      }
      if (f.searchQuery) {
        const q = f.searchQuery.trim().toLowerCase();
        const matchesTitle = photo.title.toLowerCase().includes(q);
        const matchesAlt = photo.alt.toLowerCase().includes(q);
        const matchesTags = photo.tags.some((t) => t.toLowerCase().includes(q));
        const matchesMood = photo.mood.some((m) => m.toLowerCase().includes(q));
        const matchesCamera = photo.exif.camera?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAlt && !matchesTags && !matchesMood && !matchesCamera) {
          return false;
        }
      }
      return true;
    });
  });

  /**
   * Load the catalog index from public/catalog/index.json, then load required shards.
   */
  async loadIndex(basePath = 'catalog/index.json'): Promise<void> {
    this.loadingState.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await fetch(basePath);
      if (!response.ok) {
        throw new Error(`Failed to load catalog index: ${response.status} ${response.statusText}`);
      }
      const raw = await response.json();
      const validation = CatalogValidator.validateCatalogIndex(raw);
      if (!validation.success || !validation.data) {
        throw new Error(`Catalog index validation failed: ${validation.errors.join('; ')}`);
      }

      this.index.set(validation.data);

      // Load all listed shards
      for (const shardRef of validation.data.shards) {
        await this.loadShard(shardRef.url, shardRef.id);
      }

      this.loadingState.set('loaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage.set(msg);
      this.loadingState.set('error');
    }
  }

  /**
   * Load an individual shard on demand.
   */
  async loadShard(shardUrl: string, shardId: string): Promise<void> {
    const statusMap = { ...this.shardStatus() };
    statusMap[shardId] = 'loading';
    this.shardStatus.set(statusMap);

    try {
      const response = await fetch(shardUrl);
      if (!response.ok) {
        throw new Error(`Failed to load shard ${shardId}: ${response.status}`);
      }
      const raw = await response.json();
      const validation = CatalogValidator.validateShardCatalog(raw);
      if (!validation.success || !validation.data) {
        throw new Error(`Shard ${shardId} validation failed: ${validation.errors.join('; ')}`);
      }

      // Merge new photos avoiding duplicates by id
      const current = this.photos();
      const existingIds = new Set(current.map((p) => p.id));
      const newItems = validation.data.photos.filter((p) => !existingIds.has(p.id));

      this.photos.set([...current, ...newItems]);

      const updatedStatus = { ...this.shardStatus() };
      updatedStatus[shardId] = 'loaded';
      this.shardStatus.set(updatedStatus);
    } catch (err) {
      const updatedStatus = { ...this.shardStatus() };
      updatedStatus[shardId] = 'error';
      this.shardStatus.set(updatedStatus);
      console.error(`Error loading shard ${shardId}:`, err);
    }
  }

  /**
   * Update active filters and push changes to URL query parameters.
   */
  setFilters(filters: Partial<FilterCriteria>): void {
    const updated = { ...this.activeFilters(), ...filters };
    this.activeFilters.set(updated);
    this.syncToUrl();
  }

  setGalleryMode(mode: GalleryMode): void {
    this.galleryMode.set(mode);
    this.syncToUrl();
  }

  selectPhoto(idOrSlug: string | null): void {
    this.selectedPhotoId.set(idOrSlug);
  }

  /**
   * Initialize state from query parameters on route activation.
   */
  applyQueryParams(params: Params): void {
    const mode = params['mode'] as GalleryMode;
    if (['spatial', 'sway', 'contact', 'zine'].includes(mode)) {
      this.galleryMode.set(mode);
    }

    const filters: FilterCriteria = {
      collectionId: params['collection'] || null,
      mood: params['mood'] || null,
      tag: params['tag'] || null,
      focalBucket: params['lens'] || null,
      searchQuery: params['q'] || null,
      hasPeople: params['people'] !== undefined ? params['people'] === 'true' : null,
      retouchedOnly: params['retouched'] === 'true',
    };
    this.activeFilters.set(filters);
  }

  private syncToUrl(): void {
    if (!this.router) return;

    const f = this.activeFilters();
    const queryParams: Record<string, string | null> = {
      mode: this.galleryMode() === 'sway' ? null : this.galleryMode(),
      collection: f.collectionId || null,
      mood: f.mood || null,
      tag: f.tag || null,
      lens: f.focalBucket || null,
      q: f.searchQuery || null,
      people: f.hasPeople !== null && f.hasPeople !== undefined ? String(f.hasPeople) : null,
      retouched: f.retouchedOnly ? 'true' : null,
    };

    // Clean up nulls
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== null) cleaned[k] = v;
    }

    this.router.navigate([], {
      queryParams: cleaned,
      queryParamsHandling: 'replace',
      replaceUrl: true,
    });
  }
}

