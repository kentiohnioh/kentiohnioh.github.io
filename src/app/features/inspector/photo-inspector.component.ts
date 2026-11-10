import {
  Component,
  OnInit,
  HostListener,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../core/services/ambient-glow.service';
import { PhotoCanvasComponent } from '../../shared/ui/photo-canvas/photo-canvas.component';
import { PhotoItem } from '../../core/models/catalog.model';
import { HistogramHudComponent } from './histogram/histogram-hud.component';
import { CompositionOverlayComponent } from './composition/composition-overlay.component';
import { SplitLoupeComponent } from './split-loupe/split-loupe.component';
import { GradeBoothComponent } from './grade-booth/grade-booth.component';

type InspectorTab = 'main' | 'split' | 'composition' | 'booth';

@Component({
  selector: 'app-photo-inspector',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PhotoCanvasComponent,
    HistogramHudComponent,
    CompositionOverlayComponent,
    SplitLoupeComponent,
    GradeBoothComponent,
  ],
  template: `
    <article class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20" aria-label="Photo Inspector HUD">
      <!-- Top Navigation & Controls Bar -->
      <nav class="mb-6 flex items-center justify-between border-b border-neutral-800/80 pb-4">
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-emerald-400 uppercase tracking-widest transition-colors"
          aria-label="Return to gallery [Esc]"
        >
          <span aria-hidden="true">&larr;</span> Back to Gallery
          <span class="text-[10px] text-neutral-600 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">Esc</span>
        </a>

        <!-- Previous / Next Photo Navigation Buttons -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="prevPhoto()"
            [disabled]="currentIndex() <= 0"
            class="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-100 disabled:opacity-20 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Previous photo [&larr;]"
          >
            &larr; Prev
          </button>
          <span class="text-xs font-mono text-neutral-600">
            {{ currentIndex() + 1 }} / {{ catalogState.photos().length }}
          </span>
          <button
            type="button"
            (click)="nextPhoto()"
            [disabled]="currentIndex() >= catalogState.photos().length - 1"
            class="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-100 disabled:opacity-20 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Next photo [&rarr;]"
          >
            Next &rarr;
          </button>
        </div>
      </nav>

      @if (photo(); as p) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <!-- Main Visual Viewport Column -->
          <div class="lg:col-span-2 space-y-4">
            <!-- Mode Segmented Tabs -->
            <div class="flex items-center gap-2 border-b border-neutral-800/60 pb-2">
              <button
                type="button"
                (click)="activeTab.set('main')"
                [class.active-tab]="activeTab() === 'main'"
                class="tab-btn"
              >
                Photograph
              </button>

              @if (p.flags.showBeforeAfter && p.sources.before) {
                <button
                  type="button"
                  (click)="activeTab.set('split')"
                  [class.active-tab]="activeTab() === 'split'"
                  class="tab-btn"
                >
                  Split-Loupe (Before/After)
                </button>
              }

              <button
                type="button"
                (click)="activeTab.set('composition')"
                [class.active-tab]="activeTab() === 'composition'"
                class="tab-btn"
              >
                Composition & Lighting
              </button>

              <button
                type="button"
                (click)="activeTab.set('booth')"
                [class.active-tab]="activeTab() === 'booth'"
                class="tab-btn"
              >
                Try My Grade
              </button>
            </div>

            <!-- Viewport Container -->
            @switch (activeTab()) {
              @case ('main') {
                <div class="glass-panel p-2 rounded-2xl overflow-hidden relative group">
                  <div class="w-full aspect-[3/2] bg-neutral-950 rounded-xl overflow-hidden relative select-none flex items-center justify-center">
                    <app-photo-canvas
                      [photo]="p"
                      [interactive]="true"
                      [watermarkOpacity]="0.08"
                      class="w-full h-full block"
                    ></app-photo-canvas>

                    @if (p.flags.retouched) {
                      <div class="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 pointer-events-none">
                        Retouched
                      </div>
                    }
                  </div>
                  <p class="sr-only">{{ p.longDescription || p.alt }}</p>
                </div>
              }
              @case ('split') {
                <app-split-loupe [photo]="p"></app-split-loupe>
              }
              @case ('composition') {
                <div class="space-y-4">
                  <div class="w-full aspect-[3/2] bg-neutral-950 rounded-xl overflow-hidden relative border border-neutral-800">
                    <app-photo-canvas
                      [photo]="p"
                      [interactive]="false"
                      class="w-full h-full block"
                    ></app-photo-canvas>
                  </div>
                  <app-composition-overlay [photo]="p"></app-composition-overlay>
                </div>
              }
              @case ('booth') {
                <app-grade-booth [photo]="p"></app-grade-booth>
              }
            }
          </div>

          <!-- Metadata & Telemetry Sidebar Column -->
          <aside class="space-y-6">
            <!-- Title & Context -->
            <div class="border-b border-neutral-800 pb-4">
              <span class="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
                {{ p.collectionIds[0] || 'ARCHIVE' }}
              </span>
              <h1 class="text-3xl font-serif text-neutral-100 mb-1.5">{{ p.title }}</h1>
              <p class="text-sm text-neutral-400 font-sans font-light">{{ p.caption || p.alt }}</p>
              @if (p.takenAt) {
                <time [attr.datetime]="p.takenAt" class="text-xs font-mono text-neutral-500 block mt-2">
                  Captured: {{ p.takenAt }}
                </time>
              }
            </div>

            <!-- Live Histogram HUD -->
            <app-histogram-hud [photo]="p"></app-histogram-hud>

            <!-- OKLCH Dominant Palette -->
            <div class="glass-panel p-4 rounded-xl space-y-3">
              <h2 class="text-xs font-mono uppercase tracking-wider text-neutral-400">Dominant Palette (OKLCH)</h2>
              <div class="flex items-center gap-2">
                @for (swatch of p.palette; track swatch.hex) {
                  <div class="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      class="w-full h-8 rounded border border-neutral-700/60 shadow-sm transition-transform group-hover:scale-105"
                      [style.backgroundColor]="swatch.hex"
                      [title]="swatch.hex"
                    ></div>
                    <span class="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">{{ swatch.hex }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Rights & Licensing -->
            <div class="text-xs font-mono text-neutral-500 border-t border-neutral-800/80 pt-4 space-y-1">
              <p>{{ p.rights.copyright }}</p>
              <p>License: {{ p.rights.license }}</p>
              @if (p.rights.credit) {
                <p>Credit: {{ p.rights.credit }}</p>
              }
            </div>
          </aside>
        </div>
      } @else {
        <div class="py-24 text-center">
          <p class="text-neutral-400 font-sans text-lg">Photograph not found or loading...</p>
          <a routerLink="/" class="mt-4 inline-block text-xs font-mono text-emerald-400 hover:underline">
            Return to gallery
          </a>
        </div>
      }
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
    .tab-btn {
      padding: 0.375rem 0.625rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-family: monospace;
      color: #9aa4b2;
      background: transparent;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #e8ecf2;
      background: rgba(255, 255, 255, 0.04);
    }
    .active-tab {
      color: #34d399 !important;
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(52, 211, 153, 0.4) !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoInspectorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly catalogState = inject(CatalogStateService);
  private readonly glowService = inject(AmbientGlowService);

  readonly photo = signal<PhotoItem | null>(null);
  readonly activeTab = signal<InspectorTab>('main');

  readonly currentIndex = computed(() => {
    const p = this.photo();
    if (!p) return -1;
    return this.catalogState.photos().findIndex((item) => item.id === p.id);
  });

  async ngOnInit(): Promise<void> {
    if (this.catalogState.photos().length === 0) {
      await this.catalogState.loadIndex();
    }

    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        const item = this.catalogState.photos().find((p) => p.slug === slug || p.id === slug) ?? null;
        this.photo.set(item);
        if (item) {
          this.catalogState.selectPhoto(item.id);
          if (item.palette) {
            this.glowService.updateGlowFromPalette(item.palette);
          }
        }
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.router.navigate(['/']);
    } else if (event.key === 'ArrowLeft') {
      this.prevPhoto();
    } else if (event.key === 'ArrowRight') {
      this.nextPhoto();
    }
  }

  prevPhoto(): void {
    const idx = this.currentIndex();
    if (idx > 0) {
      const prev = this.catalogState.photos()[idx - 1];
      this.router.navigate(['/photo', prev.slug]);
    }
  }

  nextPhoto(): void {
    const idx = this.currentIndex();
    if (idx >= 0 && idx < this.catalogState.photos().length - 1) {
      const next = this.catalogState.photos()[idx + 1];
      this.router.navigate(['/photo', next.slug]);
    }
  }
}
