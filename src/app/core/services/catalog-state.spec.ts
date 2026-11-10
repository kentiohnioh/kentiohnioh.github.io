import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CatalogStateService } from './catalog-state.service';
import { PhotoItem } from '../models/catalog.model';

const fixturePhotos: PhotoItem[] = [
  {
    schemaVersion: 1,
    id: 'photo-1',
    slug: 'solitude-portrait',
    title: 'Solitude in Ochre',
    alt: 'Portrait of a woman',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'hash',
    palette: [{ hex: '#8a4b28', oklch: { l: 0.45, c: 0.12, h: 48 }, weight: 1 }],
    exif: { camera: 'Leica SL2', focalLengthMm: 50, aperture: 1.4 },
    sources: { variants: [{ width: 1280, height: 853, format: 'webp', bytes: 84000, sha256: 'h1', urls: ['u1'] }] },
    grade: null,
    retouch: null,
    collectionIds: ['portraits'],
    tags: ['portrait', 'ochre'],
    mood: ['warm', 'intimate'],
    flags: { hasPeople: true, retouched: true, showBeforeAfter: true },
    rights: { copyright: '© Theng Nioh', license: 'CC' },
  },
  {
    schemaVersion: 1,
    id: 'photo-2',
    slug: 'architecture-study',
    title: 'Concrete Geometry',
    alt: 'Architectural angle',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'hash',
    palette: [{ hex: '#777777', oklch: { l: 0.52, c: 0, h: 0 }, weight: 1 }],
    exif: { camera: 'Fujifilm GFX', focalLengthMm: 30, aperture: 8.0 },
    sources: { variants: [{ width: 1280, height: 853, format: 'webp', bytes: 78000, sha256: 'h2', urls: ['u2'] }] },
    grade: null,
    retouch: null,
    collectionIds: ['architecture'],
    tags: ['concrete', 'minimalism'],
    mood: ['monochrome'],
    flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC' },
  },
  {
    schemaVersion: 1,
    id: 'photo-3',
    slug: 'shinjuku-night',
    title: 'Midnight Rain',
    alt: 'Rain reflections',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'hash',
    palette: [{ hex: '#00e5ff', oklch: { l: 0.82, c: 0.18, h: 200 }, weight: 1 }],
    exif: { camera: 'Leica Q3', focalLengthMm: 28, aperture: 1.7 },
    sources: { variants: [{ width: 1280, height: 853, format: 'webp', bytes: 90000, sha256: 'h3', urls: ['u3'] }] },
    grade: null,
    retouch: null,
    collectionIds: ['street'],
    tags: ['street', 'neon'],
    mood: ['cool', 'vivid'],
    flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC' },
  },
];

describe('CatalogStateService', () => {
  let service: CatalogStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
      ],
    });
    service = TestBed.inject(CatalogStateService);
    service.photos.set(fixturePhotos);
  });

  it('filters photos by collectionId', () => {
    service.setFilters({ collectionId: 'portraits' });
    const filtered = service.filteredPhotos();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('photo-1');
  });

  it('filters photos by mood', () => {
    service.setFilters({ mood: 'cool' });
    const filtered = service.filteredPhotos();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('photo-3');
  });

  it('filters photos by people flag', () => {
    service.setFilters({ hasPeople: true });
    expect(service.filteredPhotos()).toHaveLength(1);

    service.setFilters({ hasPeople: false });
    expect(service.filteredPhotos()).toHaveLength(2);
  });

  it('filters photos by retouched flag', () => {
    service.setFilters({ retouchedOnly: true });
    expect(service.filteredPhotos()).toHaveLength(1);
    expect(service.filteredPhotos()[0].id).toBe('photo-1');
  });

  it('filters photos by focal length bucket', () => {
    service.setFilters({ focalBucket: 'standard' }); // 35mm < fl <= 70mm -> photo-1 has 50mm
    expect(service.filteredPhotos()).toHaveLength(1);
    expect(service.filteredPhotos()[0].id).toBe('photo-1');
  });

  it('filters photos by lexical search query matching title or tags', () => {
    service.setFilters({ searchQuery: 'concrete' });
    expect(service.filteredPhotos()).toHaveLength(1);
    expect(service.filteredPhotos()[0].id).toBe('photo-2');
  });

  it('applies query parameters to filters and gallery mode', () => {
    service.applyQueryParams({
      mode: 'spatial',
      collection: 'street',
      mood: 'cool',
      people: 'false',
    });

    expect(service.galleryMode()).toBe('spatial');
    expect(service.activeFilters().collectionId).toBe('street');
    expect(service.activeFilters().mood).toBe('cool');
    expect(service.activeFilters().hasPeople).toBe(false);
  });

  it('loads catalog shards and merges photos via mock fetch', async () => {
    const mockShard = {
      schemaVersion: 1,
      shardId: 'test-shard',
      generatedAt: new Date().toISOString(),
      photos: [
        {
          schemaVersion: 1,
          id: 'new-photo-99',
          slug: 'new-slug',
          title: 'New Landscape',
          alt: 'Landscape alt',
          width: 2048,
          height: 1365,
          aspect: 1.5,
          placeholder: 'hash',
          palette: [{ hex: '#112233', oklch: { l: 0.3, c: 0.1, h: 220 }, weight: 1 }],
          exif: {},
          sources: { variants: [{ width: 1280, height: 853, format: 'webp', bytes: 70000, sha256: 'h', urls: ['u'] }] },
          grade: null,
          retouch: null,
          collectionIds: [],
          tags: [],
          mood: [],
          flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
          rights: { copyright: '© Theng Nioh', license: 'CC' },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockShard,
    });
    vi.stubGlobal('fetch', mockFetch);

    service.photos.set([]);
    await service.loadShard('catalog/shards/test.json', 'test-shard');

    expect(service.photos()).toHaveLength(1);
    expect(service.photos()[0].id).toBe('new-photo-99');
    expect(service.shardStatus()['test-shard']).toBe('loaded');

    vi.unstubAllGlobals();
  });
});
