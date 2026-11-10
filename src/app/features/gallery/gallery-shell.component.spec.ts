import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { GalleryShellComponent } from './gallery-shell.component';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../core/services/ambient-glow.service';
import { PhotoItem } from '../../core/models/catalog.model';

const mockPhoto: PhotoItem = {
  schemaVersion: 1,
  id: 'p-1',
  slug: 'test-slug',
  title: 'Test Photo',
  alt: 'Test Alt',
  width: 2048,
  height: 1365,
  aspect: 1.5,
  placeholder: '',
  palette: [{ hex: '#34d399', oklch: { l: 0.7, c: 0.1, h: 160 }, weight: 1 }],
  exif: { focalLengthMm: 35, aperture: 2.8, shutterSeconds: 0.004, iso: 400 },
  sources: { variants: [] },
  grade: null,
  retouch: null,
  collectionIds: ['street'],
  tags: ['street'],
  mood: ['quiet'],
  flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
  rights: { copyright: '© Theng Nioh', license: 'CC0' },
};

describe('GalleryShellComponent', () => {
  let component: GalleryShellComponent;
  let fixture: ComponentFixture<GalleryShellComponent>;
  let catalogState: CatalogStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryShellComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
        AmbientGlowService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryShellComponent);
    component = fixture.componentInstance;
    catalogState = TestBed.inject(CatalogStateService);
    catalogState.photos.set([mockPhoto]);
    catalogState.loadingState.set('loaded');
    fixture.detectChanges();
  });

  it('renders correctly with default sway mode', () => {
    expect(component).toBeTruthy();
    expect(catalogState.galleryMode()).toBe('sway');
  });

  it('toggles viewfinder open and closed', () => {
    expect(component.viewfinderOpen()).toBe(false);
    component.toggleViewfinder();
    expect(component.viewfinderOpen()).toBe(true);
    component.toggleViewfinder();
    expect(component.viewfinderOpen()).toBe(false);
  });

  it('clears all active filters', () => {
    catalogState.setFilters({ focalStop: 'wide', mood: 'quiet' });
    expect(catalogState.activeFilters().focalStop).toBe('wide');

    component.clearFilters();
    expect(catalogState.activeFilters().focalStop).toBeNull();
    expect(catalogState.activeFilters().mood).toBeNull();
  });
});

