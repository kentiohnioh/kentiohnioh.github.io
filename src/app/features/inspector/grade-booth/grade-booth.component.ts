import {
  Component,
  Input,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoItem, ImageVariant } from '../../../core/models/catalog.model';
import { PhotoCanvasComponent } from '../../../shared/ui/photo-canvas/photo-canvas.component';

@Component({
  selector: 'app-grade-booth',
  standalone: true,
  imports: [CommonModule, PhotoCanvasComponent],
  template: `
    <div class="glass-panel p-6 rounded-2xl border border-neutral-800 space-y-6" role="region" aria-label="Try My Colour Grade Virtual Booth">
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
        <div>
          <span class="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Interactive Studio</span>
          <h2 class="text-xl font-serif text-neutral-100 mt-0.5">Try My Colour Grade</h2>
          <p class="text-xs text-neutral-400 mt-1 font-sans">
            Apply this photograph's custom 3D LUT and tone curve recipe to a sample portrait or your own photo.
          </p>
        </div>

        <!-- Privacy Shield Indicator -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400 shrink-0">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <span>100% On-Device &bull; No Upload</span>
        </div>
      </header>

      <!-- Source Selection & File Picker -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="useBundledSample()"
          [class.active-tab]="!customImageBlobUrl()"
          class="px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors"
        >
          Bundled Sample Portrait
        </button>

        <label class="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono cursor-pointer transition-colors flex items-center gap-2">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <span>Upload Test Photo</span>
          <input
            type="file"
            accept="image/*"
            (change)="onFileSelected($event)"
            class="sr-only"
          />
        </label>

        @if (customImageBlobUrl()) {
          <span class="text-xs font-mono text-emerald-400">Custom image loaded</span>
        }
      </div>

      <!-- Live Test Canvas with Applied Grade Recipe -->
      <div class="aspect-[3/2] w-full max-w-2xl mx-auto bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl relative">
        <app-photo-canvas
          [photo]="testPhoto()"
          [recipe]="photo.grade ?? undefined"
          [interactive]="false"
          class="w-full h-full block"
        ></app-photo-canvas>

        <div class="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono text-neutral-300 border border-neutral-700">
          Recipe: {{ photo.grade?.presetId || 'Custom Grade' }} &bull; Strength: 100%
        </div>
      </div>

      <!-- Recipe Parameters Summary -->
      @if (photo.grade) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
          <div class="p-2.5 bg-neutral-900/60 rounded border border-neutral-800">
            <span class="text-[10px] text-neutral-500 block">Exposure</span>
            <span class="text-neutral-200">{{ photo.grade.exposureEV > 0 ? '+' : '' }}{{ photo.grade.exposureEV.toFixed(2) }} EV</span>
          </div>
          <div class="p-2.5 bg-neutral-900/60 rounded border border-neutral-800">
            <span class="text-[10px] text-neutral-500 block">Temperature</span>
            <span class="text-neutral-200">{{ photo.grade.temperature > 0 ? '+' : '' }}{{ photo.grade.temperature }}</span>
          </div>
          <div class="p-2.5 bg-neutral-900/60 rounded border border-neutral-800">
            <span class="text-[10px] text-neutral-500 block">Grain</span>
            <span class="text-neutral-200">{{ photo.grade.grain.amount }}%</span>
          </div>
          <div class="p-2.5 bg-neutral-900/60 rounded border border-neutral-800">
            <span class="text-[10px] text-neutral-500 block">Skin Protection</span>
            <span class="text-emerald-400">Active</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .active-tab {
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(52, 211, 153, 0.5) !important;
      color: #34d399 !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeBoothComponent {
  @Input({ required: true }) photo!: PhotoItem;

  readonly customImageBlobUrl = signal<string | null>(null);

  readonly testPhoto = computed<PhotoItem>(() => {
    const customUrl = this.customImageBlobUrl();
    if (customUrl) {
      const customVariant: ImageVariant = {
        width: 1280,
        height: 853,
        format: 'webp',
        bytes: 100000,
        sha256: 'custom',
        urls: [customUrl],
      };
      return {
        ...this.photo,
        id: 'visitor-custom',
        title: 'Visitor Test Photo',
        sources: {
          variants: [customVariant],
        },
      };
    }

    // Default bundled sample
    return this.photo;
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      this.customImageBlobUrl.set(blobUrl);
    }
  }

  useBundledSample(): void {
    if (this.customImageBlobUrl()) {
      URL.revokeObjectURL(this.customImageBlobUrl()!);
      this.customImageBlobUrl.set(null);
    }
  }
}
