import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../core/services/ambient-glow.service';
import { DockComponent } from './dock/dock.component';
import { ViewfinderHudComponent } from './viewfinder/viewfinder-hud.component';
import { KineticGridComponent } from './modes/kinetic-grid/kinetic-grid.component';
import { SpatialCanvasComponent } from './modes/spatial-canvas/spatial-canvas.component';
import { ContactSheetComponent } from './modes/contact-sheet/contact-sheet.component';
import { VisualZineComponent } from './modes/visual-zine/visual-zine.component';
import { VibeSearchComponent } from './vibe-search/vibe-search.component';

@Component({
  selector: 'app-gallery-shell',
  standalone: true,
  imports: [
    CommonModule,
    DockComponent,
    ViewfinderHudComponent,
    KineticGridComponent,
    SpatialCanvasComponent,
    ContactSheetComponent,
    VisualZineComponent,
    VibeSearchComponent,
  ],
  template: `
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 relative" aria-label="Visual Discovery Gallery">
      <!-- Loading State -->
      @if (catalogState.loadingState() === 'loading') {
        <div class="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs text-neutral-400 tracking-widest uppercase font-mono">Loading photographs & telemetry...</p>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (catalogState.loadingState() === 'error') {
        <div class="glass-panel p-8 text-center max-w-md mx-auto my-16 rounded-2xl border border-neutral-800" role="alert">
          <p class="text-safelight-red font-mono text-xs uppercase tracking-wider mb-2">Connection Notice</p>
          <p class="text-neutral-300 text-sm mb-5">{{ catalogState.errorMessage() }}</p>
          <button
            (click)="retryLoad()"
            class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-xl text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Retry Connection
          </button>
        </div>
      }

      <!-- Active Content -->
      @if (catalogState.loadingState() === 'loaded') {
        <!-- Header Bar -->
        <header class="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-4 border-b border-neutral-800/80 gap-4">
          <div>
            <h1 class="text-3xl sm:text-4xl font-serif text-neutral-100 tracking-tight">Theng Nioh</h1>
            <p class="text-sm text-neutral-400 mt-1 font-sans">
              Personal photography &bull; natural light and human stillness
              <span class="font-mono text-xs text-emerald-400/90 ml-2" aria-live="polite">
                {{ catalogState.filteredPhotos().length }} works
              </span>
            </p>
          </div>

          <!-- Active filters indication -->
          @if (catalogState.filteredPhotos().length < catalogState.photos().length) {
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-neutral-400">Filters active:</span>
              <button
                (click)="clearFilters()"
                class="px-2 py-0.5 rounded text-[11px] font-mono text-safelight-red hover:bg-neutral-900 border border-safelight-red/30 transition-colors"
                aria-label="Reset all filters"
              >
                Clear all &times;
              </button>
            </div>
          }
        </header>

        <!-- Viewfinder Filter Drawer (Collapsible) -->
        @if (viewfinderOpen()) {
          <div class="mb-8">
            <app-viewfinder-hud (close)="viewfinderOpen.set(false)"></app-viewfinder-hud>
          </div>
        }

        <!-- Zero Results State -->
        @if (catalogState.filteredPhotos().length === 0) {
          <div class="py-24 text-center max-w-md mx-auto">
            <div class="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-500">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="1.5"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h8"/>
              </svg>
            </div>
            @if (catalogState.photos().length === 0) {
              <p class="text-neutral-300 font-serif text-lg mb-2">No photographs published yet.</p>
              <p class="text-neutral-500 text-xs font-mono mb-6">Check back soon for new photographic exhibitions.</p>
            } @else {
              <p class="text-neutral-300 font-serif text-lg mb-2">No photographs matched your criteria.</p>
              <p class="text-neutral-500 text-xs font-mono mb-6">Try relaxing focal length, aperture stops, or clearing active filters.</p>
              <button
                (click)="clearFilters()"
                class="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-emerald-400 text-xs font-mono tracking-wider hover:bg-neutral-800 transition-colors"
              >
                Reset All Dials
              </button>
            }
          </div>
        } @else {
          <!-- Mode Switcher Display -->
          @switch (catalogState.galleryMode()) {
            @case ('sway') {
              <app-kinetic-grid></app-kinetic-grid>
            }
            @case ('spatial') {
              <app-spatial-canvas></app-spatial-canvas>
            }
            @case ('contact') {
              <app-contact-sheet></app-contact-sheet>
            }
            @case ('zine') {
              <app-visual-zine></app-visual-zine>
            }
          }
        }
      }

      <!-- Fixed Floating Glass Dock -->
      <app-gallery-dock
        (toggleViewfinder)="toggleViewfinder()"
        (openVibeSearch)="vibeSearchOpen.set(true)"
      ></app-gallery-dock>

      <!-- Vibe Search Dialog -->
      @if (vibeSearchOpen()) {
        <app-vibe-search (close)="vibeSearchOpen.set(false)"></app-vibe-search>
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class GalleryShellComponent implements OnInit {
  readonly catalogState = inject(CatalogStateService);
  private readonly glowService = inject(AmbientGlowService);
  private readonly route = inject(ActivatedRoute);

  readonly viewfinderOpen = signal<boolean>(false);
  readonly vibeSearchOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.catalogState.applyQueryParams(params);
    });

    if (this.catalogState.photos().length === 0 && this.catalogState.loadingState() === 'idle') {
      this.catalogState.loadIndex().then(() => {
        const first = this.catalogState.photos()[0];
        if (first?.palette) {
          this.glowService.updateGlowFromPalette(first.palette);
        }
      });
    }
  }

  toggleViewfinder(): void {
    this.viewfinderOpen.update((open) => !open);
  }

  clearFilters(): void {
    this.catalogState.setFilters({
      collectionId: null,
      mood: null,
      focalStop: null,
      apertureStop: null,
      shutterStop: null,
      isoStop: null,
      colorHex: null,
      focalBucket: null,
      searchQuery: null,
      hasPeople: null,
      retouchedOnly: null,
    });
  }

  retryLoad(): void {
    this.catalogState.loadIndex();
  }
}
