import { Component, HostListener, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogStateService, GalleryMode } from '../../../core/services/catalog-state.service';

@Component({
  selector: 'app-gallery-dock',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-out"
      [class.translate-y-24]="isAutoHidden() && !isFocused()"
      role="navigation"
      aria-label="Gallery View and Navigation Controls"
    >
      <div
        class="glass-panel px-3 py-2 rounded-2xl flex items-center gap-2 border border-neutral-700/60 shadow-2xl backdrop-blur-xl bg-neutral-950/80"
        (focusin)="onFocusIn()"
        (focusout)="onFocusOut()"
      >
        <!-- Gallery Mode Segmented Switch -->
        <div class="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800" role="tablist" aria-label="Gallery View Modes">
          <button
            type="button"
            (click)="setMode('sway')"
            [attr.aria-selected]="catalogState.galleryMode() === 'sway'"
            role="tab"
            [class.active-mode]="catalogState.galleryMode() === 'sway'"
            class="mode-btn"
            title="Kinetic Sway Grid [Press 1]"
          >
            <span class="sr-only">Kinetic Sway Grid (Press 1)</span>
            <span class="font-mono text-xs">Sway</span>
            <span class="key-hint">1</span>
          </button>

          <button
            type="button"
            (click)="setMode('spatial')"
            [attr.aria-selected]="catalogState.galleryMode() === 'spatial'"
            role="tab"
            [class.active-mode]="catalogState.galleryMode() === 'spatial'"
            class="mode-btn"
            title="Spatial 2D Canvas [Press 2]"
          >
            <span class="sr-only">Spatial 2D Canvas (Press 2)</span>
            <span class="font-mono text-xs">Spatial</span>
            <span class="key-hint">2</span>
          </button>

          <button
            type="button"
            (click)="setMode('contact')"
            [attr.aria-selected]="catalogState.galleryMode() === 'contact'"
            role="tab"
            [class.active-mode]="catalogState.galleryMode() === 'contact'"
            class="mode-btn"
            title="Contact Sheet [Press 3]"
          >
            <span class="sr-only">Contact Sheet (Press 3)</span>
            <span class="font-mono text-xs">Contact</span>
            <span class="key-hint">3</span>
          </button>

          <button
            type="button"
            (click)="setMode('zine')"
            [attr.aria-selected]="catalogState.galleryMode() === 'zine'"
            role="tab"
            [class.active-mode]="catalogState.galleryMode() === 'zine'"
            class="mode-btn"
            title="Visual Zine Story [Press 4]"
          >
            <span class="sr-only">Visual Zine (Press 4)</span>
            <span class="font-mono text-xs">Zine</span>
            <span class="key-hint">4</span>
          </button>
        </div>

        <div class="w-px h-6 bg-neutral-800 mx-1" aria-hidden="true"></div>

        <!-- Viewfinder Filter Toggle -->
        <button
          type="button"
          (click)="toggleViewfinder.emit()"
          [class.text-emerald-400]="activeFilterCount() > 0"
          [class.border-emerald-500/40]="activeFilterCount() > 0"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 text-xs font-mono text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          aria-label="Toggle camera optical dials and filters"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke-width="2"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          </svg>
          <span>Dials</span>
          @if (activeFilterCount() > 0) {
            <span class="w-4 h-4 rounded-full bg-emerald-400 text-neutral-950 font-mono text-[10px] font-bold flex items-center justify-center">
              {{ activeFilterCount() }}
            </span>
          }
        </button>

        <!-- Vibe Search Toggle / Input -->
        <div class="relative flex items-center">
          <input
            #searchInput
            type="text"
            [value]="catalogState.activeFilters().searchQuery || ''"
            (input)="onSearchInput($event)"
            placeholder="Search mood or lens..."
            aria-label="Search photographs by atmosphere or lens"
            class="w-32 sm:w-44 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:w-48 transition-all"
          />
        </div>

        <!-- About Link -->
        <a
          routerLink="/about"
          class="px-2.5 py-1.5 rounded-xl text-xs font-mono text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors"
          aria-label="About the photographer Theng Nioh"
        >
          About
        </a>
      </div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
    }
    .mode-btn {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      border-radius: 0.625rem;
      color: #9aa4b2;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .mode-btn:hover {
      color: #e8ecf2;
      background: rgba(255, 255, 255, 0.04);
    }
    .active-mode {
      background: rgba(52, 211, 153, 0.15) !important;
      color: #34d399 !important;
      box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.4);
    }
    .key-hint {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: #737373;
    }
    .active-mode .key-hint {
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
    }
  `],
})
export class DockComponent {
  readonly catalogState = inject(CatalogStateService);
  @Output() toggleViewfinder = new EventEmitter<void>();

  readonly isAutoHidden = signal(false);
  readonly isFocused = signal(false);

  private lastScrollY = 0;
  private idleTimer: any = null;

  readonly activeFilterCount = computed(() => {
    const f = this.catalogState.activeFilters();
    let count = 0;
    if (f.focalStop && f.focalStop !== 'all') count++;
    if (f.apertureStop && f.apertureStop !== 'all') count++;
    if (f.shutterStop && f.shutterStop !== 'all') count++;
    if (f.isoStop && f.isoStop !== 'all') count++;
    if (f.mood && f.mood !== 'all') count++;
    if (f.colorHex) count++;
    if (f.collectionId) count++;
    if (f.hasPeople !== null && f.hasPeople !== undefined) count++;
    return count;
  });

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Ignore keyboard shortcuts if user is typing in an input
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.key === '1') {
      this.setMode('sway');
    } else if (event.key === '2') {
      this.setMode('spatial');
    } else if (event.key === '3') {
      this.setMode('contact');
    } else if (event.key === '4') {
      this.setMode('zine');
    } else if (event.key === 'v' || event.key === 'V') {
      this.toggleViewfinder.emit();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const currentY = window.scrollY;
    if (currentY > this.lastScrollY + 60 && currentY > 200) {
      this.isAutoHidden.set(true);
    } else if (currentY < this.lastScrollY - 20) {
      this.isAutoHidden.set(false);
    }
    this.lastScrollY = currentY;
    this.resetIdleTimer();
  }

  onFocusIn(): void {
    this.isFocused.set(true);
    this.isAutoHidden.set(false);
  }

  onFocusOut(): void {
    this.isFocused.set(false);
  }

  setMode(mode: GalleryMode): void {
    this.catalogState.setGalleryMode(mode);
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.catalogState.setFilters({ searchQuery: query || null });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      // Keep dock visible on desktop idle, subtle fade only
    }, 4000);
  }
}
