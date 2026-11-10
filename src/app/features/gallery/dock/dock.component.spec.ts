import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DockComponent } from './dock.component';
import { CatalogStateService } from '../../../core/services/catalog-state.service';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;
  let catalogState: CatalogStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        CatalogStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DockComponent);
    component = fixture.componentInstance;
    catalogState = TestBed.inject(CatalogStateService);
    fixture.detectChanges();
  });

  it('initializes and switches modes when clicked', () => {
    expect(component).toBeTruthy();
    expect(catalogState.galleryMode()).toBe('sway');

    component.setMode('spatial');
    expect(catalogState.galleryMode()).toBe('spatial');

    component.setMode('contact');
    expect(catalogState.galleryMode()).toBe('contact');

    component.setMode('zine');
    expect(catalogState.galleryMode()).toBe('zine');
  });

  it('handles keyboard shortcuts (1, 2, 3, 4)', () => {
    component.onKeydown(new KeyboardEvent('keydown', { key: '2' }));
    expect(catalogState.galleryMode()).toBe('spatial');

    component.onKeydown(new KeyboardEvent('keydown', { key: '3' }));
    expect(catalogState.galleryMode()).toBe('contact');

    component.onKeydown(new KeyboardEvent('keydown', { key: '4' }));
    expect(catalogState.galleryMode()).toBe('zine');

    component.onKeydown(new KeyboardEvent('keydown', { key: '1' }));
    expect(catalogState.galleryMode()).toBe('sway');
  });

  it('computes active filter count accurately', () => {
    expect(component.activeFilterCount()).toBe(0);

    catalogState.setFilters({ focalStop: 'wide', mood: 'quiet' });
    expect(component.activeFilterCount()).toBe(2);
  });
});

