import {
  Component,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogStateService } from '../../../core/services/catalog-state.service';
import { PhotoItem } from '../../../core/models/catalog.model';
import { rankPhotos, SearchMatchResult } from '../../../core/utils/vector-search';
import { PhotoCanvasComponent } from '../../../shared/ui/photo-canvas/photo-canvas.component';

@Component({
  selector: 'app-vibe-search',
  standalone: true,
  imports: [CommonModule, PhotoCanvasComponent],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-20"
      (click)="onBackdropClick($event)"
      role="dialog"
      aria-modal="true"
      aria-label="Vibe Search by Atmosphere, Mood and Optics"
    >
      <div
        class="w-full max-w-3xl glass-panel rounded-2xl border border-neutral-700/80 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] bg-neutral-950/90"
        (click)="$event.stopPropagation()"
      >
        <!-- Search Header -->
        <div class="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <h2 class="text-sm font-mono uppercase tracking-widest text-neutral-200">AI Vibe & Semantic Search</h2>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Close search"
          >
            &times;
          </button>
        </div>

        <!-- Search Input Bar -->
        <div class="relative mb-4">
          <input
            #searchInput
            type="text"
            [value]="query()"
            (input)="onQueryInput($event)"
            placeholder="Type mood (e.g. 'golden hour silence', 'cinematic rain', '35mm street')..."
            class="w-full px-4 py-3 bg-neutral-900/90 border border-neutral-700 rounded-xl text-sm font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            autofocus
          />
          @if (query()) {
            <button
              (click)="clearQuery()"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 font-mono text-xs"
            >
              Clear
            </button>
          }
        </div>

        <!-- Privacy & Status Telemetry -->
        <div class="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-4 px-1">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>100% On-Device &bull; Zero Queries Leave Your Device</span>
          </div>
          <span>{{ results().length }} matches</span>
        </div>

        <!-- Results List -->
        <div class="overflow-y-auto space-y-3 flex-1 pr-1" role="list">
          @if (results().length === 0 && query().trim().length > 0) {
            <div class="py-16 text-center text-neutral-500">
              <p class="font-serif text-lg text-neutral-300 mb-1">No photographs matched this vibe.</p>
              <p class="text-xs font-mono">Try searching by lens (e.g. "35mm"), atmosphere ("misty", "warm"), or camera body.</p>
            </div>
          }

          @for (res of results(); track res.photo.id) {
            <article
              (click)="openPhoto(res.photo)"
              class="flex items-center gap-4 p-2.5 rounded-xl bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 cursor-pointer transition-colors group"
              role="button"
            >
              <!-- Thumbnail Canvas -->
              <div class="w-24 h-16 rounded-lg overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800">
                <app-photo-canvas
                  [photo]="res.photo"
                  [interactive]="false"
                  class="w-full h-full block"
                ></app-photo-canvas>
              </div>

              <!-- Metadata & Match Chips -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-serif text-neutral-200 group-hover:text-emerald-400 transition-colors truncate">
                    {{ res.photo.title }}
                  </h3>
                  <span class="text-[10px] font-mono text-neutral-500 shrink-0 ml-2">
                    Score: {{ (res.score * 100).toFixed(0) }}%
                  </span>
                </div>

                <p class="text-xs font-mono text-neutral-400 mt-0.5 truncate">
                  {{ res.photo.exif.camera || 'Camera' }} &bull; {{ res.photo.exif.focalLengthMm || 0 }}mm &bull; f/{{ res.photo.exif.aperture || 0 }}
                </p>

                <!-- Why Matched Chips -->
                <div class="flex items-center gap-1.5 flex-wrap mt-2">
                  @for (reason of res.matchReasons; track reason) {
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {{ reason }}
                    </span>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VibeSearchComponent {
  readonly catalogState = inject(CatalogStateService);
  private readonly router = inject(Router);

  @Output() close = new EventEmitter<void>();

  readonly query = signal<string>('');

  readonly results = computed<SearchMatchResult[]>(() => {
    const q = this.query().trim();
    if (!q) return [];
    return rankPhotos(this.catalogState.photos(), q);
  });

  onQueryInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.query.set(val);
  }

  clearQuery(): void {
    this.query.set('');
  }

  openPhoto(photo: PhotoItem): void {
    this.close.emit();
    this.router.navigate(['/photo', photo.slug]);
  }

  onBackdropClick(event: MouseEvent): void {
    this.close.emit();
  }
}
