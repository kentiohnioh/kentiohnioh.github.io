import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoItem } from '../../../core/models/catalog.model';
import { ColorGradeRecipe } from '../../../core/models/color-grade.model';
import { ImageSourceLoader } from '../../../core/services/image-source-loader.service';
import { GpuRendererService } from '../../../gpu/renderer/gpu-renderer.service';

@Component({
  selector: 'app-photo-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full h-full overflow-hidden select-none protected-art group"
      [class.cursor-pointer]="interactive"
      [attr.tabindex]="interactive ? 0 : null"
      [attr.role]="'img'"
      [attr.aria-label]="photo.alt"
      (contextmenu)="handleDeterrence($event)"
      (dragstart)="handleDeterrence($event)"
      (selectstart)="handleDeterrence($event)"
      (keydown)="handleKeyDown($event)"
    >
      <!-- Placeholder ThumbHash / BlurHash Background -->
      @if (isLoading()) {
        <div
          class="absolute inset-0 bg-neutral-900 bg-cover bg-center transition-opacity duration-500 animate-pulse"
          [style.backgroundImage]="'url(' + photo.placeholder + ')'"
          aria-hidden="true"
        ></div>
      }

      <!-- Shared GPU Renderer Canvas Target -->
      <canvas
        #canvasTarget
        class="w-full h-full object-cover block transition-opacity duration-400"
        [class.opacity-0]="isLoading()"
        [class.opacity-100]="!isLoading()"
        aria-hidden="true"
      ></canvas>

      <!-- Visually Hidden Accessible Text for Screen Readers & SEO -->
      <span class="sr-only">
        {{ photo.alt }}
        @if (photo.longDescription) {
          — {{ photo.longDescription }}
        }
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .protected-art {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
  `],
})
export class PhotoCanvasComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) photo!: PhotoItem;
  @Input() interactive = false;
  @Input() exposure = 0.0;
  @Input() watermarkOpacity = 0.0;
  @Input() recipe?: ColorGradeRecipe | null;

  @ViewChild('canvasTarget', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly loader = inject(ImageSourceLoader);
  private readonly renderer = inject(GpuRendererService);

  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  private abortController: AbortController | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private static lastToastTime = 0;

  ngOnInit(): void {
    this.loadImage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['photo'] && !changes['photo'].firstChange) {
      this.loadImage();
    } else if (changes['recipe'] || changes['exposure'] || changes['watermarkOpacity']) {
      this.loadImage();
    }
  }

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private async loadImage(): Promise<void> {
    if (!this.photo || !this.photo.sources.variants.length) return;

    this.isLoading.set(true);
    this.hasError.set(false);
    this.abortController = new AbortController();

    try {
      const canvas = this.canvasRef.nativeElement;
      const clientWidth = canvas.clientWidth || 640;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      // Select optimal LOD variant
      const optimalVariant = this.renderer.textureCache.selectLodVariant(
        this.photo,
        clientWidth,
        dpr
      );

      // Fetch bytes through failover loader with adaptive timeout
      const loadResult = await this.loader.load(optimalVariant.urls, this.abortController.signal);

      // Decode to ImageBitmap with robust fallback for SVGs and data URIs
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(loadResult.blob, {
          imageOrientation: 'from-image',
        });
      } catch {
        bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(loadResult.blob);
          img.onload = async () => {
            try {
              const offscreen = document.createElement('canvas');
              offscreen.width = img.naturalWidth || 640;
              offscreen.height = img.naturalHeight || 427;
              const ctx = offscreen.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              const bmp = await createImageBitmap(offscreen);
              URL.revokeObjectURL(objectUrl);
              resolve(bmp);
            } catch (e) {
              URL.revokeObjectURL(objectUrl);
              reject(e);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to decode image format'));
          };
          img.src = objectUrl;
        });
      }

      // Render onto canvas via shared WebGL2 pipeline
      const cacheKey = `${this.photo.id}:${optimalVariant.width}`;
      this.renderer.render({
        canvas,
        bitmap,
        cacheKey,
        exposure: this.exposure,
        watermarkOpacity: this.watermarkOpacity,
        recipe: this.recipe ?? this.photo.grade ?? null,
      });

      this.isLoading.set(false);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    }
  }

  /**
   * Anti-Download Deterrence Event Interceptor (Rule 2).
   */
  handleDeterrence(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    // Rate limit toast to at most once per 2 seconds
    if (now - PhotoCanvasComponent.lastToastTime > 2000) {
      PhotoCanvasComponent.lastToastTime = now;
      this.showDeterrenceToast();
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    // Intercept Save (Ctrl/Cmd+S) or Print (Ctrl/Cmd+P) while photo is focused
    if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'p')) {
      event.preventDefault();
      this.showDeterrenceToast();
    }
  }

  private showDeterrenceToast(): void {
    if (typeof document !== 'undefined') {
      const existing = document.getElementById('deterrence-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'deterrence-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.className =
        'fixed bottom-6 right-6 z-50 glass-panel px-4 py-3 rounded-lg text-xs font-mono text-neutral-200 border-l-2 border-emerald-400 shadow-2xl animate-in fade-in';
      toast.textContent = '© Theng Nioh — protected artwork. Contact me for licensing.';

      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  }
}

