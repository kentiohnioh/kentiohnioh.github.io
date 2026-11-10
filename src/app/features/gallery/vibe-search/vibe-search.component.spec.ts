import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { VibeSearchComponent } from './vibe-search.component';
import { CatalogStateService } from '../../../core/services/catalog-state.service';
import { PhotoItem } from '../../../core/models/catalog.model';

const mockPhoto: PhotoItem = {
  schemaVersion: 1,
  id: 'p-vibe',
  slug: 'midnight-rain',
  title: 'Midnight Rain',
  alt: 'Moody rain reflection in neon street',
  width: 2048,
  height: 1365,
  aspect: 1.5,
  placeholder: '',
  palette: [{ hex: '#34d399', oklch: { l: 0.7, c: 0.1, h: 160 }, weight: 1 }],
  exif: { camera: 'Leica Q3', focalLengthMm: 28, aperture: 1.7 },
  sources: { variants: [] },
  grade: null,
  retouch: null,
  collectionIds: ['street'],
  tags: ['street', 'neon'],
  mood: ['cinematic', 'quiet'],
  flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
  rights: { copyright: '© Theng Nioh', license: 'CC0' },
};

describe('VibeSearchComponent', () => {
  let component: VibeSearchComponent;
  let fixture: ComponentFixture<VibeSearchComponent>;
  let catalogState: CatalogStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VibeSearchComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VibeSearchComponent);
    component = fixture.componentInstance;
    catalogState = TestBed.inject(CatalogStateService);
    catalogState.photos.set([mockPhoto]);
    fixture.detectChanges();
  });

  it('renders input and responds to query', () => {
    expect(component).toBeTruthy();
    expect(component.results()).toHaveLength(0);

    component.query.set('neon street');
    expect(component.results()).toHaveLength(1);
    expect(component.results()[0].photo.id).toBe('p-vibe');
    expect(component.results()[0].matchReasons.length).toBeGreaterThan(0);
  });

  it('clears query cleanly', () => {
    component.query.set('cinematic');
    expect(component.results()).toHaveLength(1);

    component.clearQuery();
    expect(component.query()).toBe('');
    expect(component.results()).toHaveLength(0);
  });
});
