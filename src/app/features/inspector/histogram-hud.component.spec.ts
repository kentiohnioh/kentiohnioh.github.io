import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HistogramHudComponent } from './histogram/histogram-hud.component';
import { PhotoItem } from '../../core/models/catalog.model';

const mockPhoto: PhotoItem = {
  schemaVersion: 1,
  id: 'p-1',
  slug: 'test',
  title: 'Test',
  alt: 'Alt',
  width: 2048,
  height: 1365,
  aspect: 1.5,
  placeholder: '',
  palette: [{ hex: '#fbbf24', oklch: { l: 0.8, c: 0.15, h: 80 }, weight: 1 }],
  exif: { shutterDisplay: '1/500s', aperture: 2.8, iso: 100 },
  sources: { variants: [] },
  grade: null,
  retouch: null,
  collectionIds: [],
  tags: [],
  mood: [],
  flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
  rights: { copyright: '© Theng Nioh', license: 'CC0' },
};

describe('HistogramHudComponent', () => {
  let component: HistogramHudComponent;
  let fixture: ComponentFixture<HistogramHudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistogramHudComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HistogramHudComponent);
    component = fixture.componentInstance;
    component.photo = mockPhoto;
    fixture.detectChanges();
  });

  it('renders telemetry and default channel states', () => {
    expect(component).toBeTruthy();
    expect(component.channels().luma).toBe(true);
    expect(component.channels().r).toBe(true);
  });

  it('toggles channels accurately', () => {
    component.toggleChannel('r');
    expect(component.channels().r).toBe(false);
    component.toggleChannel('r');
    expect(component.channels().r).toBe(true);
  });
});
