import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoItem } from '../../../core/models/catalog.model';
import { PhotoCanvasComponent } from '../../../shared/ui/photo-canvas/photo-canvas.component';

@Component({
  selector: 'app-split-loupe',
  standalone: true,
  imports: [CommonModule, PhotoCanvasComponent],
  template: `
    <div
      #splitBox
      class="relative w-full aspect-[3/2] bg-neutral-950 rounded-xl overflow-hidden select-none cursor-ew-resize border border-neutral-800"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (keydown)="onKeydown($event)"
      tabindex="0"
      role="slider"
      [attr.aria-valuenow]="(splitPosition() * 100).toFixed(0)"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Before versus After split-screen comparison"
    >
      <!-- Base Layer: After (Final Graded / Retouched) -->
      <div class="absolute inset-0">
        <app-photo-canvas
          [photo]="photo"
          [interactive]="false"
          class="w-full h-full block"
        ></app-photo-canvas>
      </div>

      <!-- Top Clipped Layer: Before (Un-retouched Master) -->
      @if (photo.sources.before) {
        <div
          class="absolute inset-0 overflow-hidden"
          [style.clipPath]="clipPathCss()"
        >
          <app-photo-canvas
            [photo]="beforePhoto()"
            [interactive]="false"
            class="w-full h-full block"
          ></app-photo-canvas>
        </div>
      }

      <!-- Draggable Split Divider Line -->
      <div
        class="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none"
        [style.left.%]="splitPosition() * 100"
      >
        <!-- Center Handle -->
        <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-neutral-900 border-2 border-white shadow-xl flex items-center justify-center text-[10px] font-mono text-neutral-200">
          &harr;
        </div>
      </div>

      <!-- Corner Labels -->
      <div class="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono uppercase tracking-widest text-neutral-300 border border-neutral-700 pointer-events-none">
        Original (Before)
      </div>
      <div class="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-500/30 pointer-events-none">
        Graded (After)
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
export class SplitLoupeComponent {
  @Input({ required: true }) photo!: PhotoItem;
  @ViewChild('splitBox') boxRef!: ElementRef<HTMLDivElement>;

  readonly splitPosition = signal<number>(0.5); // 0.0 to 1.0
  private isDragging = false;

  readonly clipPathCss = computed(() => {
    const pct = (this.splitPosition() * 100).toFixed(2);
    return `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
  });

  readonly beforePhoto = computed<PhotoItem>(() => {
    if (!this.photo.sources.before) return this.photo;
    return {
      ...this.photo,
      grade: null,
      retouch: null,
      sources: {
        ...this.photo.sources,
        variants: [this.photo.sources.before],
      },
    };
  });

  onPointerDown(event: PointerEvent): void {
    this.isDragging = true;
    this.updateSplitFromPointer(event);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.updateSplitFromPointer(event);
  }

  onPointerUp(event: PointerEvent): void {
    this.isDragging = false;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.splitPosition.update((p) => Math.max(0, p - 0.05));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.splitPosition.update((p) => Math.min(1, p + 0.05));
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.splitPosition.set(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.splitPosition.set(1);
    }
  }

  private updateSplitFromPointer(event: PointerEvent): void {
    if (!this.boxRef?.nativeElement) return;
    const rect = this.boxRef.nativeElement.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    this.splitPosition.set(Math.max(0, Math.min(1, pos)));
  }
}
