import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogStateService } from '../../../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../../../core/services/ambient-glow.service';
import { PhotoCanvasComponent } from '../../../../shared/ui/photo-canvas/photo-canvas.component';
import { PhotoItem } from '../../../../core/models/catalog.model';

@Component({
  selector: 'app-contact-sheet',
  standalone: true,
  imports: [CommonModule, PhotoCanvasComponent],
  template: `
    <div
      #contactContainer
      class="contact-sheet-viewport bg-black text-neutral-300 p-6 sm:p-10 rounded-2xl border border-neutral-900 shadow-2xl relative select-none"
      role="region"
      aria-label="Darkroom Contact Sheet Proofs"
      tabindex="0"
      (keydown)="onKeydown($event)"
    >
      <!-- Film Edge Header Bar -->
      <header class="flex items-center justify-between pb-6 border-b border-neutral-900 mb-8 font-mono text-xs text-neutral-500 uppercase tracking-widest">
        <div class="flex items-center gap-3">
          <span class="text-safelight-red font-bold tracking-widest">KODAK TRI-X 400</span>
          <span>&bull;</span>
          <span>ROLL #2026-NIOH</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-neutral-600">PROOF SHEET</span>
          <span class="text-emerald-400">{{ catalogState.filteredPhotos().length }} FRAMES</span>
        </div>
      </header>

      <!-- Contact Sheet Proof Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        @for (photo of catalogState.filteredPhotos(); track photo.id; let idx = $index) {
          <article
            class="film-frame relative flex flex-col bg-neutral-950 p-2 border border-neutral-800 rounded group transition-all"
            [class.ring-2]="selectedIndex() === idx"
            [class.ring-emerald-400]="selectedIndex() === idx"
            (mouseenter)="onFrameHover(photo, idx)"
            (mousemove)="onFrameMouseMove($event, photo, idx)"
            (mouseleave)="onFrameMouseLeave()"
            (click)="selectAndOpen(photo, idx)"
            role="button"
            [attr.aria-label]="'Frame ' + formatFrameNumber(idx) + ': ' + photo.title"
          >
            <!-- Frame Number Stamp -->
            <div class="flex items-center justify-between mb-1 text-[10px] font-mono text-neutral-500">
              <span class="text-amber-500/80 font-bold tracking-wider">{{ formatFrameNumber(idx) }}</span>
              <span class="text-[9px] text-neutral-600">{{ photo.exif.iso ? 'ISO ' + photo.exif.iso : '' }}</span>
            </div>

            <!-- Canvas Tile -->
            <div class="aspect-[3/2] w-full bg-neutral-900 overflow-hidden relative">
              <app-photo-canvas
                [photo]="photo"
                [interactive]="false"
                class="w-full h-full block"
              ></app-photo-canvas>
            </div>

            <!-- EXIF Monospace Stamp -->
            <footer class="mt-2 text-[10px] font-mono text-neutral-400 flex items-center justify-between border-t border-neutral-900 pt-1">
              <span class="truncate max-w-[60%] text-neutral-300">{{ photo.title }}</span>
              <span class="text-neutral-500">{{ photo.exif.shutterDisplay || '' }}</span>
            </footer>
          </article>
        }
      </div>

      <!-- Draggable Optical Loupe Magnifier -->
      @if (loupeActive() && activePhoto()) {
        <div
          class="optical-loupe pointer-events-none fixed z-50 rounded-full border-2 border-emerald-400 shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden bg-neutral-950 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
          [style.left.px]="loupeX()"
          [style.top.px]="loupeY()"
          [style.width.px]="loupeSize"
          [style.height.px]="loupeSize"
          role="status"
          aria-label="Magnifying loupe active"
        >
          <!-- Magnified Photo Canvas Surface -->
          <div
            class="w-[300px] h-[200px] relative origin-center"
            [style.transform]="loupeZoomTransform()"
          >
            <app-photo-canvas
              [photo]="activePhoto()!"
              [interactive]="false"
              class="w-full h-full block"
            ></app-photo-canvas>
          </div>

          <!-- Loupe Crosshair overlay -->
          <div class="absolute inset-0 border border-emerald-400/20 rounded-full flex items-center justify-center">
            <div class="w-2 h-2 rounded-full border border-emerald-400/60"></div>
          </div>

          <!-- Loupe metadata badge -->
          <div class="absolute bottom-3 px-2 py-0.5 rounded bg-black/80 font-mono text-[9px] text-emerald-400 border border-emerald-500/30">
            {{ activePhoto()!.exif.focalLengthMm || 0 }}mm &bull; f/{{ activePhoto()!.exif.aperture || 0 }} &bull; 2.5x
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .film-frame {
      cursor: crosshair;
    }
    .optical-loupe {
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.8), 0 10px 40px rgba(0, 0, 0, 0.95);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSheetComponent {
  readonly catalogState = inject(CatalogStateService);
  private readonly glowService = inject(AmbientGlowService);
  private readonly router = inject(Router);

  readonly selectedIndex = signal<number>(0);
  readonly loupeActive = signal<boolean>(false);
  readonly loupeX = signal<number>(0);
  readonly loupeY = signal<number>(0);
  readonly loupeNormX = signal<number>(0.5);
  readonly loupeNormY = signal<number>(0.5);

  readonly activePhoto = signal<PhotoItem | null>(null);
  readonly loupeSize = 180; // Diameter in px

  readonly loupeZoomTransform = computed(() => {
    const nx = this.loupeNormX();
    const ny = this.loupeNormY();
    // Translate origin to centered point in normalized frame
    const tx = (0.5 - nx) * 180;
    const ty = (0.5 - ny) * 120;
    return `translate3d(${tx}px, ${ty}px, 0) scale(2.2)`;
  });

  formatFrameNumber(idx: number): string {
    const num = idx + 1;
    const prefix = num < 10 ? `0${num}` : `${num}`;
    return `${prefix}A`;
  }

  onFrameHover(photo: PhotoItem, idx: number): void {
    this.selectedIndex.set(idx);
    this.activePhoto.set(photo);
    if (photo.palette) {
      this.glowService.updateGlowFromPalette(photo.palette);
    }
  }

  onFrameMouseMove(event: MouseEvent, photo: PhotoItem, idx: number): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    this.loupeX.set(event.clientX);
    this.loupeY.set(event.clientY);
    this.loupeNormX.set(normX);
    this.loupeNormY.set(normY);
    this.loupeActive.set(true);
    this.activePhoto.set(photo);
    this.selectedIndex.set(idx);
  }

  onFrameMouseLeave(): void {
    this.loupeActive.set(false);
  }

  selectAndOpen(photo: PhotoItem, idx: number): void {
    this.selectedIndex.set(idx);
    this.router.navigate(['/photo', photo.slug]);
  }

  onKeydown(event: KeyboardEvent): void {
    const photos = this.catalogState.filteredPhotos();
    if (photos.length === 0) return;

    let idx = this.selectedIndex();
    if (event.key === 'ArrowRight') {
      idx = Math.min(photos.length - 1, idx + 1);
    } else if (event.key === 'ArrowLeft') {
      idx = Math.max(0, idx - 1);
    } else if (event.key === 'ArrowDown') {
      idx = Math.min(photos.length - 1, idx + 5);
    } else if (event.key === 'ArrowUp') {
      idx = Math.max(0, idx - 5);
    } else if (event.key === 'Enter') {
      const selected = photos[idx];
      if (selected) this.router.navigate(['/photo', selected.slug]);
      return;
    } else {
      return;
    }

    event.preventDefault();
    this.selectedIndex.set(idx);
    const photo = photos[idx];
    if (photo) {
      this.activePhoto.set(photo);
      this.onFrameHover(photo, idx);
    }
  }
}

