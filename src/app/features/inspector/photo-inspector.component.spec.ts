import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PhotoInspectorComponent } from './photo-inspector.component';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../core/services/ambient-glow.service';
import { PhotoItem } from '../../core/models/catalog.model';

const mockPhotos: PhotoItem[] = [
  {
    schemaVersion: 1,
    id: 'p-1',
    slug: 'solitude-in-ochre',
    title: 'Solitude in Ochre',
    alt: 'Moody portrait',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: '',
    palette: [{ hex: '#fbbf24', oklch: { l: 0.8, c: 0.15, h: 80 }, weight: 1 }],
    exif: { camera: 'Leica Q3', lens: '28mm Summilux', focalLengthMm: 28, aperture: 1.7, shutterSeconds: 0.002, iso: 200 },
    sources: {
      variants: [{ width: 1280, height: 853, format: 'webp', bytes: 80000, sha256: 'h1', urls: ['u1'] }],
      before: { width: 1280, height: 853, format: 'webp', bytes: 85000, sha256: 'hb', urls: ['ub'] },
    },
    grade: {
      schemaVersion: 1,
      presetId: 'portra-400',
      exposureEV: 0.2,
      contrast: 10,
      highlights: -10,
      shadows: 15,
      whites: 0,
      blacks: -5,
      temperature: 5,
      tint: -2,
      vibrance: 15,
      saturation: 10,
      splitTone: { shadowHue: 0, shadowSat: 0, highlightHue: 0, highlightSat: 0, balance: 0 },
      halation: { threshold: 0.8, radius: 10, strength: 0.2, tint: 0 },
      vignette: { amount: 10, midpoint: 50, roundness: 0, feather: 50 },
      grain: { amount: 15, size: 1.0, roughness: 50, seed: 123 },
      skinProtect: { enabled: true, strength: 0.8 },
    },
    retouch: null,
    collectionIds: ['portraits'],
    tags: ['portrait'],
    mood: ['quiet'],
    flags: { hasPeople: true, retouched: true, showBeforeAfter: true },
    rights: { copyright: '© Theng Nioh', license: 'CC0' },
  },
  {
    schemaVersion: 1,
    id: 'p-2',
    slug: 'tokyo-geometry',
    title: 'Tokyo Geometry',
    alt: 'Architectural angle',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: '',
    palette: [{ hex: '#60a5fa', oklch: { l: 0.6, c: 0.12, h: 220 }, weight: 1 }],
    exif: { camera: 'Fujifilm GFX', focalLengthMm: 45, aperture: 5.6 },
    sources: { variants: [] },
    grade: null,
    retouch: null,
    collectionIds: ['architecture'],
    tags: ['minimal'],
    mood: ['cool'],
    flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC0' },
  },
];

describe('PhotoInspectorComponent', () => {
  let component: PhotoInspectorComponent;
  let fixture: ComponentFixture<PhotoInspectorComponent>;
  let catalogState: CatalogStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoInspectorComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
        AmbientGlowService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoInspectorComponent);
    component = fixture.componentInstance;
    catalogState = TestBed.inject(CatalogStateService);
    catalogState.photos.set(mockPhotos);
    component.photo.set(mockPhotos[0]);
    fixture.detectChanges();
  });

  it('renders photo and metadata cleanly', () => {
    expect(component).toBeTruthy();
    expect(component.photo()?.title).toBe('Solitude in Ochre');
    expect(component.currentIndex()).toBe(0);
  });

  it('switches tabs between main, split, composition, and booth', () => {
    expect(component.activeTab()).toBe('main');

    component.activeTab.set('split');
    expect(component.activeTab()).toBe('split');

    component.activeTab.set('composition');
    expect(component.activeTab()).toBe('composition');

    component.activeTab.set('booth');
    expect(component.activeTab()).toBe('booth');
  });

  it('computes next and previous navigation indexes correctly', () => {
    expect(component.currentIndex()).toBe(0);
    // nextPhoto changes route
    component.photo.set(mockPhotos[1]);
    expect(component.currentIndex()).toBe(1);
  });
});
