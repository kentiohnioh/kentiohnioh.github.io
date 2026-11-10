import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { PhotoItem } from '../../core/models/catalog.model';

@Component({
  selector: 'app-gallery-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Visual Gallery">
      <!-- Loading and Error States -->
      @if (catalogState.loadingState() === 'loading') {
        <div class="flex items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-neutral-400 tracking-wide uppercase font-mono">Loading photographs...</p>
          </div>
        </div>
      }

      @if (catalogState.loadingState() === 'error') {
        <div class="glass-panel p-8 text-center max-w-md mx-auto my-12" role="alert">
          <p class="text-safelight-red font-mono text-sm mb-2">Notice</p>
          <p class="text-neutral-200 mb-4">{{ catalogState.errorMessage() }}</p>
          <button
            (click)="retryLoad()"
            class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-md text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Retry Connection
          </button>
        </div>
      }

      @if (catalogState.loadingState() === 'loaded') {
        <!-- View Mode & Active Filter Bar -->
        <header class="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8 pb-4 border-b border-neutral-800 gap-4">
          <div>
            <h1 class="text-3xl sm:text-4xl font-serif text-neutral-100 tracking-tight">Photographs</h1>
            <p class="text-sm text-neutral-400 mt-1 font-sans">
              Natural light, atmosphere, and human stillness.
              <span class="font-mono text-xs text-neutral-500 ml-2" aria-live="polite">
                {{ catalogState.filteredPhotos().length }} works
              </span>
            </p>
          </div>

          <!-- Mode toggles -->
          <div class="flex items-center gap-1 glass-panel p-1 rounded-lg" role="group" aria-label="Gallery View Mode">
            <button
              (click)="setMode('sway')"
              [class.bg-neutral-800]="catalogState.galleryMode() === 'sway'"
              [class.text-emerald-400]="catalogState.galleryMode() === 'sway'"
              class="px-3 py-1.5 rounded text-xs font-mono tracking-wider text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Kinetic Sway Grid"
            >
              Sway
            </button>
            <button
              (click)="setMode('spatial')"
              [class.bg-neutral-800]="catalogState.galleryMode() === 'spatial'"
              [class.text-emerald-400]="catalogState.galleryMode() === 'spatial'"
              class="px-3 py-1.5 rounded text-xs font-mono tracking-wider text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Spatial Canvas"
            >
              Spatial
            </button>
            <button
              (click)="setMode('contact')"
              [class.bg-neutral-800]="catalogState.galleryMode() === 'contact'"
              [class.text-emerald-400]="catalogState.galleryMode() === 'contact'"
              class="px-3 py-1.5 rounded text-xs font-mono tracking-wider text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Contact Sheet"
            >
              Contact
            </button>
          </div>
        </header>

        <!-- Zero Results State -->
        @if (catalogState.filteredPhotos().length === 0) {
          <div class="py-24 text-center">
            <p class="text-neutral-400 font-sans text-lg">No photographs matched your filter criteria.</p>
            <button
              (click)="clearFilters()"
              class="mt-4 text-xs font-mono text-emerald-400 hover:underline underline-offset-4"
            >
              Clear all filters
            </button>
          </div>
        }

        <!-- Gallery Grid (Accessible, Canvas-ready presentation) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (photo of catalogState.filteredPhotos(); track photo.id) {
            <article class="group relative flex flex-col glass-card rounded-lg overflow-hidden transition-transform duration-300 hover:-translate-y-1">
              <a
                [routerLink]="['/photo', photo.slug]"
                class="block aspect-[3/2] w-full bg-neutral-900 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-400"
                [attr.aria-label]="photo.alt"
              >
                <!-- Deterrence Container: Protected Art (No naked <img> tags; rendered background with canvas protection in Phase 3) -->
                <div
                  class="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105 pointer-events-none select-none"
                  [style.backgroundImage]="'url(' + getDisplayUrl(photo) + ')'"
                  role="img"
                  [attr.aria-label]="photo.alt"
                ></div>

                <!-- Hover overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h2 class="text-neutral-100 font-serif text-lg">{{ photo.title }}</h2>
                  <div class="flex items-center gap-3 text-xs font-mono text-neutral-400 mt-1">
                    @if (photo.exif.lens) {
                      <span>{{ photo.exif.lens }}</span>
                    }
                    @if (photo.exif.aperture) {
                      <span>f/{{ photo.exif.aperture }}</span>
                    }
                    @if (photo.flags.retouched) {
                      <span class="text-emerald-400 border border-emerald-400/40 px-1 rounded text-[10px]">Retouched</span>
                    }
                  </div>
                </div>
              </a>

              <!-- Accessible caption under card -->
              <div class="p-3 bg-neutral-950/60 border-t border-neutral-900/60 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span class="truncate">{{ photo.title }}</span>
                <span class="text-neutral-600">{{ photo.exif.shutterDisplay || (photo.exif.shutterSeconds ? '1/' + (1/photo.exif.shutterSeconds) : '') }}</span>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class GalleryShellComponent implements OnInit {
  readonly catalogState = inject(CatalogStateService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.catalogState.applyQueryParams(params);
    });

    if (this.catalogState.photos().length === 0 && this.catalogState.loadingState() === 'idle') {
      this.catalogState.loadIndex();
    }
  }

  setMode(mode: 'spatial' | 'sway' | 'contact' | 'zine'): void {
    this.catalogState.setGalleryMode(mode);
  }

  clearFilters(): void {
    this.catalogState.setFilters({
      collectionId: null,
      mood: null,
      tag: null,
      focalBucket: null,
      searchQuery: null,
      hasPeople: null,
      retouchedOnly: null,
    });
  }

  retryLoad(): void {
    this.catalogState.loadIndex();
  }

  getDisplayUrl(photo: PhotoItem): string {
    const v = photo.sources.variants.find((item) => item.width === 1280) || photo.sources.variants[0];
    return v?.urls[0] || photo.placeholder;
  }
}

