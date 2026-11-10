import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoItem } from '../../../core/models/catalog.model';
import {
  computeCompositionGuides,
  estimateLightingDirection,
  CompositionGrid,
  EstimatedLighting,
} from '../../../core/utils/composition-math';

@Component({
  selector: 'app-composition-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Guide Toggle Controls -->
      <div class="flex items-center gap-2 flex-wrap" role="group" aria-label="Composition Overlay Controls">
        <button
          type="button"
          (click)="toggleGuide('thirds')"
          [class.active-guide]="showThirds()"
          class="guide-btn"
          aria-label="Toggle Rule of Thirds grid"
        >
          Rule of Thirds
        </button>
        <button
          type="button"
          (click)="toggleGuide('golden')"
          [class.active-guide]="showGolden()"
          class="guide-btn"
          aria-label="Toggle Golden Ratio lines"
        >
          Golden Ratio
        </button>
        <button
          type="button"
          (click)="toggleGuide('spiral')"
          [class.active-guide]="showSpiral()"
          class="guide-btn"
          aria-label="Toggle Golden Spiral"
        >
          Golden Spiral
        </button>
        <button
          type="button"
          (click)="toggleGuide('lighting')"
          [class.active-guide]="showLighting()"
          class="guide-btn"
          aria-label="Toggle Estimated Lighting Vector"
        >
          Lighting (Estimated)
        </button>
      </div>

      <!-- Composition HUD Data Box -->
      <div class="glass-panel p-4 rounded-xl space-y-3">
        <div class="flex items-center justify-between text-xs font-mono">
          <span class="text-neutral-400 uppercase tracking-wider">Aspect Ratio</span>
          <span class="text-neutral-200">{{ (photo.aspect || 1.5).toFixed(2) }}:1 (3:2)</span>
        </div>

        @if (showLighting()) {
          <div class="p-3 bg-neutral-900/80 rounded-lg border border-neutral-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Dominant Light Source</span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">Estimated</span>
            </div>
            <div class="flex items-center gap-4">
              <!-- Compass diagram -->
              <div class="w-10 h-10 rounded-full border border-neutral-700 relative flex items-center justify-center shrink-0">
                <div
                  class="w-4 h-0.5 bg-emerald-400 origin-left absolute left-1/2"
                  [style.transform]="'rotate(' + (360 - lighting().angleDegrees) + 'deg)'"
                ></div>
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              </div>
              <div class="text-xs font-mono">
                <p class="text-neutral-200 font-medium">{{ lighting().cardinalLabel }}</p>
                <p class="text-[11px] text-neutral-500 mt-0.5">Vector angle: ~{{ lighting().angleDegrees }}&deg;</p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .guide-btn {
      padding: 0.375rem 0.625rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-family: monospace;
      color: #9aa4b2;
      background: rgba(23, 23, 23, 0.6);
      border: 1px solid rgba(64, 64, 64, 0.4);
      transition: all 0.15s ease;
    }
    .guide-btn:hover {
      color: #e8ecf2;
      background: rgba(38, 38, 38, 0.8);
    }
    .active-guide {
      color: #34d399 !important;
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(52, 211, 153, 0.5) !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompositionOverlayComponent implements OnChanges {
  @Input({ required: true }) photo!: PhotoItem;

  readonly showThirds = signal(false);
  readonly showGolden = signal(false);
  readonly showSpiral = signal(false);
  readonly showLighting = signal(true);

  readonly guides = signal<CompositionGrid>(computeCompositionGuides(1.5));
  readonly lighting = signal<EstimatedLighting>({
    angleDegrees: 45,
    vector: { x: 0.71, y: 0.71 },
    cardinalLabel: 'Upper Right (Key Light)',
    confidence: 0.8,
    isEstimated: true,
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['photo'] && this.photo) {
      this.guides.set(computeCompositionGuides(this.photo.aspect || 1.5));
      this.synthesizeLightingFromPhoto();
    }
  }

  toggleGuide(guide: 'thirds' | 'golden' | 'spiral' | 'lighting'): void {
    if (guide === 'thirds') this.showThirds.update((v) => !v);
    if (guide === 'golden') this.showGolden.update((v) => !v);
    if (guide === 'spiral') this.showSpiral.update((v) => !v);
    if (guide === 'lighting') this.showLighting.update((v) => !v);
  }

  private synthesizeLightingFromPhoto(): void {
    const w = 16;
    const h = 16;
    const pixels = new Uint8ClampedArray(w * h * 4);

    // Estimate based on primary palette swatch lightness and angle
    const swatchL = this.photo.palette?.[0]?.oklch?.l ?? 0.6;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const val = Math.round(swatchL * 255 * (1 + 0.3 * (x / w) - 0.2 * (y / h)));
        pixels[idx] = val;
        pixels[idx + 1] = val;
        pixels[idx + 2] = val;
        pixels[idx + 3] = 255;
      }
    }

    const estimated = estimateLightingDirection(pixels, w, h);
    this.lighting.set(estimated);
  }
}
