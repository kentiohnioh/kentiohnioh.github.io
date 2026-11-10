import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from './admin-shell.component';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { DraftStorageService } from '../../core/services/draft-storage.service';
import { PhotoItem } from '../../core/models/catalog.model';

const mockPhotos: PhotoItem[] = [
  {
    schemaVersion: 1,
    id: 'p-admin-1',
    slug: 'solitude-ochre',
    title: 'Solitude Ochre',
    alt: 'Portrait in warm light',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'hash',
    palette: [{ hex: '#34d399', oklch: { l: 0.7, c: 0.1, h: 160 }, weight: 1 }],
    exif: {},
    sources: { variants: [{ width: 1280, height: 853, format: 'webp', bytes: 80000, sha256: 'h1', urls: ['u1'] }] },
    grade: null,
    retouch: null,
    collectionIds: [],
    tags: [],
    mood: [],
    flags: { hasPeople: false, retouched: true, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC' },
  },
];

describe('AdminShellComponent', () => {
  let component: AdminShellComponent;
  let fixture: ComponentFixture<AdminShellComponent>;
  let catalogState: CatalogStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminShellComponent, FormsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
        DraftStorageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShellComponent);
    component = fixture.componentInstance;
    catalogState = TestBed.inject(CatalogStateService);
    catalogState.photos.set(mockPhotos);
    component.stagedPhotos.set(mockPhotos);
    component.selectedPhoto.set(mockPhotos[0]);
    fixture.detectChanges();
  });

  it('renders workspace with library and selected photo', () => {
    expect(component).toBeTruthy();
    expect(component.stagedPhotos()).toHaveLength(1);
    expect(component.selectedPhoto()?.id).toBe('p-admin-1');
  });

  it('switches tabs in the right inspector', () => {
    expect(component.activeTab()).toBe('info');

    component.activeTab.set('publish');
    expect(component.activeTab()).toBe('publish');

    component.activeTab.set('info');
    expect(component.activeTab()).toBe('info');
  });

  it('toggles shortcuts cheat sheet modal with ? key', () => {
    expect(component.showShortcuts()).toBe(false);
    component.onKeydown(new KeyboardEvent('keydown', { key: '?' }));
    expect(component.showShortcuts()).toBe(true);
  });
});

