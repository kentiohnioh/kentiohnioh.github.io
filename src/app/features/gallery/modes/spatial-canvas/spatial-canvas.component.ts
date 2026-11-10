import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
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
import {
  SpatialItem,
  SpatialClusterMode,
  computeSpatialLayout,
  cullFrustum,
  computeCanvasBounds,
  calculateFitAllCamera,
  selectLOD,
  ViewportRect,
} from '../../../../core/utils/spatial-layout';

@Component({
  selector: 'app-spatial-canvas',
  standalone: true,
  imports: [CommonModule, PhotoCanvasComponent],
  template: `
    <div
      #container
      class="relative w-full h-[calc(100vh-140px)] min-h-[600px] overflow-hidden bg-neutral-950 select-none cursor-grab active:cursor-grabbing border border-neutral-800/80 rounded-2xl"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (wheel)="onWheel($event)"
      tabindex="0"
      role="region"
      aria-label="Spatial 2D Infinite Canvas"
    >
      <!-- Canvas World Container with 2D Camera Transform -->
      <div
        class="absolute will-change-transform origin-top-left"
        [style.transform]="cameraTransform()"
      >
        @for (item of visibleItems(); track item.id) {
          <article
            class="absolute transition-transform duration-200 hover:scale-105 hover:z-30 group"
            [style.left.px]="item.x - item.width / 2"
            [style.top.px]="item.y - item.height / 2"
            [style.width.px]="item.width"
            [style.height.px]="item.height"
            (dblclick)="onItemDoubleClick(item)"
            (mouseenter)="onItemHover(item)"
          >
            <!-- Protected WebGL Canvas tile -->
            <div class="w-full h-full rounded-lg overflow-hidden glass-card shadow-2xl relative">
              <app-photo-canvas
                [photo]="item.photo"
                [interactive]="false"
                class="w-full h-full block"
              ></app-photo-canvas>

              <!-- Hover Metadata Tag -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end pointer-events-none">
                <span class="text-xs font-serif text-neutral-100 font-medium truncate">{{ item.photo.title }}</span>
                <span class="text-[10px] font-mono text-neutral-400">{{ item.photo.exif.focalLengthMm || 0 }}mm &bull; f/{{ item.photo.exif.aperture || 0 }}</span>
              </div>
            </div>
          </article>
        }
      </div>

      <!-- Minimap HUD -->
      <div
        class="absolute top-4 right-4 w-40 h-28 glass-panel rounded-xl p-2 z-20 border border-neutral-800 flex flex-col justify-between"
        aria-hidden="true"
      >
        <div class="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span>Minimap</span>
          <span>{{ (cameraZoom() * 100).toFixed(0) }}%</span>
        </div>
        <div #minimapBox class="relative w-full h-16 bg-neutral-900 rounded overflow-hidden" (click)="onMinimapClick($event)">
          <!-- Item dots in minimap -->
          @for (dot of minimapDots(); track dot.id) {
            <div
              class="absolute w-1 h-1 rounded-full bg-neutral-600"
              [style.left.%]="dot.mx"
              [style.top.%]="dot.my"
            ></div>
          }
          <!-- Camera Viewport Box -->
          <div
            class="absolute border border-emerald-400/80 bg-emerald-400/10 pointer-events-none rounded-[1px]"
            [style.left.%]="minimapCameraRect().left"
            [style.top.%]="minimapCameraRect().top"
            [style.width.%]="minimapCameraRect().width"
            [style.height.%]="minimapCameraRect().height"
          ></div>
        </div>
        <div class="flex items-center justify-between text-[9px] font-mono text-neutral-500">
          <span>Drag to pan</span>
          <span>Wheel to zoom</span>
        </div>
      </div>

      <!-- Floating Controls Pill -->
      <div class="absolute top-4 left-4 z-20 flex items-center gap-2 glass-panel p-1.5 rounded-xl border border-neutral-800">
        <button
          type="button"
          (click)="fitAll()"
          class="px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          aria-label="Fit all photos in view"
        >
          Fit All
        </button>
        <div class="w-px h-4 bg-neutral-800"></div>
        <button
          type="button"
          (click)="setClusterMode('hue')"
          [class.text-emerald-400]="clusterMode() === 'hue'"
          class="px-2 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          By Color
        </button>
        <button
          type="button"
          (click)="setClusterMode('collection')"
          [class.text-emerald-400]="clusterMode() === 'collection'"
          class="px-2 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          By Collection
        </button>
      </div>

      <!-- Accessible Parallel Focusable List (Screen Readers & Keyboard) -->
      <div class="sr-only" role="list" aria-label="Accessible list of photos on spatial canvas">
        @for (item of spatialItems(); track item.id) {
          <button
            type="button"
            (focus)="focusPhoto(item)"
            (click)="openPhoto(item)"
            [attr.aria-label]="item.photo.title + ', ' + item.photo.alt"
          >
            {{ item.photo.title }} - {{ item.photo.exif.camera || 'Photograph' }}
          </button>
        }
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
export class SpatialCanvasComponent implements OnInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('minimapBox') minimapBoxRef!: ElementRef<HTMLDivElement>;

  readonly catalogState = inject(CatalogStateService);
  private readonly glowService = inject(AmbientGlowService);
  private readonly router = inject(Router);

  // Camera state Signals
  readonly cameraX = signal(0);
  readonly cameraY = signal(0);
  readonly cameraZoom = signal(0.75);
  readonly clusterMode = signal<SpatialClusterMode>('hue');

  readonly viewportWidth = signal(1200);
  readonly viewportHeight = signal(700);

  // Drag interaction state
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private animFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Spatial layout derivation
  readonly spatialItems = computed(() => {
    const photos = this.catalogState.filteredPhotos();
    return computeSpatialLayout(photos, this.clusterMode(), 320);
  });

  readonly canvasBounds = computed(() => {
    return computeCanvasBounds(this.spatialItems());
  });

  // Frustum culling derivation
  readonly visibleItems = computed(() => {
    const items = this.spatialItems();
    const viewport: ViewportRect = {
      cameraX: this.cameraX(),
      cameraY: this.cameraY(),
      zoom: this.cameraZoom(),
      viewportWidth: this.viewportWidth(),
      viewportHeight: this.viewportHeight(),
    };
    return cullFrustum(items, viewport, 200);
  });

  // Camera CSS transform
  readonly cameraTransform = computed(() => {
    const cx = this.cameraX();
    const cy = this.cameraY();
    const z = this.cameraZoom();
    const vw = this.viewportWidth();
    const vh = this.viewportHeight();

    const tx = vw / 2 - cx * z;
    const ty = vh / 2 - cy * z;

    return `translate3d(${tx}px, ${ty}px, 0) scale(${z})`;
  });

  // Minimap derivations
  readonly minimapDots = computed(() => {
    const bounds = this.canvasBounds();
    if (bounds.width <= 0 || bounds.height <= 0) return [];
    const items = this.spatialItems();

    return items.map((item) => {
      const mx = ((item.x - bounds.minX) / bounds.width) * 100;
      const my = ((item.y - bounds.minY) / bounds.height) * 100;
      return { id: item.id, mx: Math.max(0, Math.min(100, mx)), my: Math.max(0, Math.min(100, my)) };
    });
  });

  readonly minimapCameraRect = computed(() => {
    const bounds = this.canvasBounds();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return { left: 0, top: 0, width: 100, height: 100 };
    }

    const z = this.cameraZoom();
    const viewW = this.viewportWidth() / z;
    const viewH = this.viewportHeight() / z;

    const left = ((this.cameraX() - viewW / 2 - bounds.minX) / bounds.width) * 100;
    const top = ((this.cameraY() - viewH / 2 - bounds.minY) / bounds.height) * 100;
    const width = (viewW / bounds.width) * 100;
    const height = (viewH / bounds.height) * 100;

    return {
      left: Math.max(0, Math.min(100, left)),
      top: Math.max(0, Math.min(100, top)),
      width: Math.max(5, Math.min(100, width)),
      height: Math.max(5, Math.min(100, height)),
    };
  });

  ngOnInit(): void {
    // Start inertia loop
    this.startInertiaLoop();
  }

  ngAfterViewInit(): void {
    if (this.containerRef?.nativeElement) {
      const el = this.containerRef.nativeElement;
      this.viewportWidth.set(el.clientWidth || 1200);
      this.viewportHeight.set(el.clientHeight || 700);

      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.viewportWidth.set(entry.contentRect.width);
          this.viewportHeight.set(entry.contentRect.height);
        }
      });
      this.resizeObserver.observe(el);

      // Fit all initially
      setTimeout(() => this.fitAll(), 50);
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  // Pointer Drag Handlers
  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return; // Only left-click drag
    this.isDragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.velocityX = 0;
    this.velocityY = 0;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    const z = this.cameraZoom();
    this.cameraX.update((x) => x - dx / z);
    this.cameraY.update((y) => y - dy / z);

    this.velocityX = dx;
    this.velocityY = dy;
  }

  onPointerUp(event: PointerEvent): void {
    this.isDragging = false;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const currentZ = this.cameraZoom();
    const newZ = Math.max(0.2, Math.min(2.5, currentZ * zoomFactor));

    // Zoom towards cursor
    if (this.containerRef?.nativeElement) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      const pointerScreenX = event.clientX - rect.left - rect.width / 2;
      const pointerScreenY = event.clientY - rect.top - rect.height / 2;

      const deltaX = pointerScreenX / currentZ - pointerScreenX / newZ;
      const deltaY = pointerScreenY / currentZ - pointerScreenY / newZ;

      this.cameraX.update((x) => x + deltaX);
      this.cameraY.update((y) => y + deltaY);
    }

    this.cameraZoom.set(newZ);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    const panStep = 80 / this.cameraZoom();
    if (event.key === 'ArrowLeft') {
      this.cameraX.update((x) => x - panStep);
    } else if (event.key === 'ArrowRight') {
      this.cameraX.update((x) => x + panStep);
    } else if (event.key === 'ArrowUp') {
      this.cameraY.update((y) => y - panStep);
    } else if (event.key === 'ArrowDown') {
      this.cameraY.update((y) => y + panStep);
    } else if (event.key === '+' || event.key === '=') {
      this.cameraZoom.update((z) => Math.min(2.5, z * 1.15));
    } else if (event.key === '-' || event.key === '_') {
      this.cameraZoom.update((z) => Math.max(0.2, z * 0.85));
    } else if (event.key === '0') {
      this.fitAll();
    }
  }

  fitAll(): void {
    const bounds = this.canvasBounds();
    const fit = calculateFitAllCamera(
      bounds,
      this.viewportWidth(),
      this.viewportHeight(),
      80
    );
    this.cameraX.set(fit.cameraX);
    this.cameraY.set(fit.cameraY);
    this.cameraZoom.set(fit.zoom);
  }

  setClusterMode(mode: SpatialClusterMode): void {
    this.clusterMode.set(mode);
  }

  onItemDoubleClick(item: SpatialItem): void {
    this.cameraX.set(item.x);
    this.cameraY.set(item.y);
    this.cameraZoom.set(1.2);
  }

  onItemHover(item: SpatialItem): void {
    if (item.photo.palette) {
      this.glowService.updateGlowFromPalette(item.photo.palette);
    }
  }

  onMinimapClick(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickXRatio = (event.clientX - rect.left) / rect.width;
    const clickYRatio = (event.clientY - rect.top) / rect.height;

    const bounds = this.canvasBounds();
    this.cameraX.set(bounds.minX + clickXRatio * bounds.width);
    this.cameraY.set(bounds.minY + clickYRatio * bounds.height);
  }

  focusPhoto(item: SpatialItem): void {
    this.cameraX.set(item.x);
    this.cameraY.set(item.y);
    this.onItemHover(item);
  }

  openPhoto(item: SpatialItem): void {
    this.router.navigate(['/photo', item.photo.slug]);
  }

  private startInertiaLoop(): void {
    const loop = () => {
      if (!this.isDragging && (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1)) {
        const z = this.cameraZoom();
        this.cameraX.update((x) => x - this.velocityX / z);
        this.cameraY.update((y) => y - this.velocityY / z);

        this.velocityX *= 0.92; // Friction decay
        this.velocityY *= 0.92;
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }
}

