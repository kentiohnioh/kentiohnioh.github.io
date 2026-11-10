import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogStateService } from '../../../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../../../core/services/ambient-glow.service';
import { PhotoCanvasComponent } from '../../../../shared/ui/photo-canvas/photo-canvas.component';
import { PhotoItem } from '../../../../core/models/catalog.model';

interface ZineSpread {
  pageNumber: number;
  type: 'intro' | 'photo' | 'statement';
  photo?: PhotoItem;
  title?: string;
  notes?: string;
  location?: string;
  quote?: string;
}

@Component({
  selector: 'app-visual-zine',
  standalone: true,
  imports: [CommonModule, PhotoCanvasComponent],
  template: `
    <article
      #zineContainer
      class="zine-viewport relative w-full h-[calc(100vh-140px)] min-h-[600px] overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex flex-row items-center bg-neutral-950 border border-neutral-800 rounded-2xl select-none"
      role="region"
      aria-label="Visual Zine Editorial Magazine"
      tabindex="0"
      (scroll)="onScroll()"
      (keydown)="onKeydown($event)"
    >
      <!-- Horizontal Spreads with CSS Scroll Snap -->
      @for (spread of spreads(); track spread.pageNumber; let idx = $index) {
        <section
          class="zine-page shrink-0 w-full h-full snap-center flex items-center justify-center p-6 sm:p-12 relative"
          [attr.aria-label]="'Page ' + spread.pageNumber"
        >
          <!-- Intro Cover Page -->
          @if (spread.type === 'intro') {
            <div class="max-w-xl text-center flex flex-col items-center">
              <span class="text-xs font-mono uppercase tracking-[0.3em] text-emerald-400 mb-4">THENG NIOH &bull; VOL. I</span>
              <h1 class="text-4xl sm:text-6xl font-serif text-neutral-100 font-light tracking-tight mb-6">
                {{ spread.title || 'In Stillness' }}
              </h1>
              <div class="w-12 h-px bg-neutral-700 mb-6"></div>
              <p class="text-neutral-400 font-serif italic text-lg leading-relaxed max-w-md">
                "Light does not require an audience to make silence visible. These pages assemble fleeting moments of quietude."
              </p>
              <span class="mt-8 text-xs font-mono text-neutral-600 uppercase tracking-widest">
                Scroll horizontally or press &rarr;
              </span>
            </div>
          }

          <!-- Editorial Photo Spread -->
          @if (spread.type === 'photo' && spread.photo) {
            <div class="w-full max-w-5xl h-full flex flex-col lg:flex-row items-center gap-8 justify-center">
              <!-- Protected Canvas Plate -->
              <div class="relative w-full lg:w-3/5 h-3/5 lg:h-4/5 bg-neutral-900 rounded-lg overflow-hidden shadow-2xl glass-card">
                <app-photo-canvas
                  [photo]="spread.photo"
                  [interactive]="true"
                  class="w-full h-full block"
                ></app-photo-canvas>
              </div>

              <!-- Editorial Story Column -->
              <div class="w-full lg:w-2/5 flex flex-col justify-center text-left">
                <div class="flex items-center gap-2 text-[10px] font-mono text-emerald-400 mb-2 uppercase tracking-widest">
                  <span>PLATE {{ spread.pageNumber }}</span>
                  <span>&bull;</span>
                  <span>{{ spread.photo.exif.focalLengthMm || 35 }}MM</span>
                </div>

                <h2 class="text-2xl sm:text-3xl font-serif text-neutral-100 font-normal tracking-tight mb-3">
                  {{ spread.photo.title }}
                </h2>

                <p class="text-neutral-300 font-sans text-sm leading-relaxed mb-6 font-light">
                  {{ spread.notes || spread.photo.alt }}
                </p>

                <!-- Location Telemetry with GPS Privacy Guard -->
                @if (spread.location) {
                  <div class="text-xs font-mono text-neutral-500 flex items-center gap-2 pt-4 border-t border-neutral-900">
                    <svg class="w-3.5 h-3.5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>{{ spread.location }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Photographer Statement / Outro Spread -->
          @if (spread.type === 'statement') {
            <div class="max-w-lg text-center flex flex-col items-center">
              <span class="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">COLOPHON</span>
              <h2 class="text-3xl font-serif text-neutral-100 mb-4">Photographer's Note</h2>
              <p class="text-neutral-300 font-serif italic text-base leading-relaxed mb-6">
                "Every frame captured here honors the subject without digital reshaping or artificial enhancements. The camera merely witnesses."
              </p>
              <div class="text-xs font-mono text-neutral-500 tracking-wider">
                &copy; Theng Nioh &bull; Tokyo / Global
              </div>
            </div>
          }

          <!-- Page Indicator Footer -->
          <footer class="absolute bottom-4 right-8 font-mono text-xs text-neutral-600">
            {{ spread.pageNumber }} / {{ spreads().length }}
          </footer>
        </section>
      }

      <!-- Floating Page Navigation Arrows -->
      <button
        type="button"
        (click)="prevPage()"
        [disabled]="currentPage() <= 1"
        class="nav-arrow left-4"
        aria-label="Previous zine page"
      >
        &larr;
      </button>

      <button
        type="button"
        (click)="nextPage()"
        [disabled]="currentPage() >= spreads().length"
        class="nav-arrow right-4"
        aria-label="Next zine page"
      >
        &rarr;
      </button>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
    .zine-viewport {
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: rgba(64, 64, 64, 0.4) transparent;
    }
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 10, 0.6);
      border: 1px solid rgba(80, 80, 80, 0.4);
      color: #9aa4b2;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
      z-index: 20;
    }
    .nav-arrow:hover:not(:disabled) {
      background: rgba(30, 30, 30, 0.9);
      color: #e8ecf2;
      border-color: #34d399;
    }
    .nav-arrow:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }
    @media print {
      .zine-viewport {
        overflow: visible !important;
        height: auto !important;
        display: block !important;
        background: #fff !important;
        color: #000 !important;
      }
      .nav-arrow {
        display: none !important;
      }
      .glass-card {
        box-shadow: none !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualZineComponent implements OnInit {
  @ViewChild('zineContainer') containerRef!: ElementRef<HTMLDivElement>;

  readonly catalogState = inject(CatalogStateService);
  private readonly glowService = inject(AmbientGlowService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly currentPage = signal(1);

  readonly spreads = computed<ZineSpread[]>(() => {
    const photos = this.catalogState.filteredPhotos();
    const list: ZineSpread[] = [
      {
        pageNumber: 1,
        type: 'intro',
        title: 'Solitude & Light',
      },
    ];

    let page = 2;
    for (const photo of photos) {
      let location: string | undefined;
      if (photo.exif.gps && photo.exif.gps.precision !== 'hidden') {
        location = photo.exif.gps.precision === 'exact'
          ? `${photo.exif.gps.lat.toFixed(3)}°, ${photo.exif.gps.lng.toFixed(3)}°`
          : 'Approximate Field Coordinates';
      }

      list.push({
        pageNumber: page++,
        type: 'photo',
        photo,
        notes: photo.caption || photo.alt,
        location,
      });
    }

    list.push({
      pageNumber: page,
      type: 'statement',
    });

    return list;
  });

  ngOnInit(): void {
    // Check if deep linked ?page=X
    this.route.queryParams.subscribe((params) => {
      const page = parseInt(params['page'], 10);
      if (!isNaN(page) && page >= 1) {
        this.scrollToPage(page);
      }
    });
  }

  onScroll(): void {
    if (!this.containerRef?.nativeElement) return;
    const el = this.containerRef.nativeElement;
    const pageWidth = el.clientWidth;
    if (pageWidth <= 0) return;

    const pageIndex = Math.round(el.scrollLeft / pageWidth) + 1;
    if (pageIndex !== this.currentPage()) {
      this.currentPage.set(pageIndex);
      const spread = this.spreads()[pageIndex - 1];
      if (spread?.photo?.palette) {
        this.glowService.updateGlowFromPalette(spread.photo.palette);
      }
    }
  }

  scrollToPage(page: number): void {
    if (!this.containerRef?.nativeElement) return;
    const el = this.containerRef.nativeElement;
    const targetScroll = (page - 1) * el.clientWidth;
    el.scrollTo({ left: targetScroll, behavior: 'smooth' });
    this.currentPage.set(page);
  }

  prevPage(): void {
    const cur = this.currentPage();
    if (cur > 1) this.scrollToPage(cur - 1);
  }

  nextPage(): void {
    const cur = this.currentPage();
    if (cur < this.spreads().length) this.scrollToPage(cur + 1);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.nextPage();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.prevPage();
    }
  }
}
