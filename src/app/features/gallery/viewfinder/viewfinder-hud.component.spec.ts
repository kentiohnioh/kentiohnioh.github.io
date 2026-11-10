import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ViewfinderHudComponent } from './viewfinder-hud.component';
import { CatalogStateService } from '../../../core/services/catalog-state.service';
import { PhotoItem } from '../../../core/models/catalog.model';

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

describe('ViewfinderHudComponent', () => {
  let component: ViewfinderHudComponent;
  let fixture: ComponentFixture<ViewfinderHudComponent>;
  let catalogState: CatalogStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewfinderHudComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewfinderHudComponent);
    component = fixture.componentInstance;
    catalogState = TestBed.inject(CatalogStateService);
    catalogState.photos.set([mockPhoto]);
    fixture.detectChanges();
  });

  it('renders dial stops and facet counts', () => {
    expect(component).toBeTruthy();
    expect(component.focalStops.length).toBeGreaterThan(0);
    expect(component.apertureStops.length).toBeGreaterThan(0);
  });

  it('updates focal stop when selected', () => {
    component.setFocalStop('street');
    expect(catalogState.activeFilters().focalStop).toBe('street');
  });

  it('updates color filter when swatch selected', () => {
    component.setColorFilter('#34d399');
    expect(catalogState.activeFilters().colorHex).toBe('#34d399');
  });

  it('resets all dials when clearAllFilters invoked', () => {
    component.setFocalStop('street');
    component.setApertureStop('f2.8');
    expect(component.hasActiveFilters()).toBe(true);

    component.clearAllFilters();
    expect(catalogState.activeFilters().focalStop).toBeNull();
    expect(catalogState.activeFilters().apertureStop).toBeNull();
    expect(component.hasActiveFilters()).toBe(false);
  });
});

