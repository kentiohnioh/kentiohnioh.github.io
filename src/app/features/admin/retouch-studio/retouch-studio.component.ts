import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  ElementRef,
  viewChild,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetouchStateService, RetouchTool } from '../../../core/services/retouch-state.service';
import { RetouchEngineService } from '../../../core/services/retouch-engine.service';
import {
  RETOUCH_SLIDER_DEFINITIONS,
  RetouchCategory,
  SliderDefinition,
  RetouchPresetName,
} from '../../../core/utils/retouch-presets';
import { AnatomicalZoneId, SpotHealPoint } from '../../../core/models/retouch.model';
import { RetouchPipeline } from '../../../gpu/renderer/retouch-pipeline';

@Component({
  selector: 'app-retouch-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-[calc(100vh-4rem)] bg-[#080b10] text-[#e8ecf2] font-sans overflow-hidden">
      <!-- Left / Top Controls Toolbar -->
      <aside class="w-80 border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-md">
        <!-- Header & Ethics Badge -->
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold tracking-wider uppercase text-white/90">Retouch Studio</h2>
            <p class="text-xs text-white/50">12-Zone AI Retouch & Shaders</p>
          </div>
          <span
            class="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold uppercase"
            [class.bg-emerald-500/20]="!state.isExtreme()"
            [class.text-emerald-400]="!state.isExtreme()"
            [class.border]="true"
            [class.border-emerald-500/30]="!state.isExtreme()"
            [class.bg-rose-500/20]="state.isExtreme()"
            [class.text-rose-400]="state.isExtreme()"
            [class.border-rose-500/30]="state.isExtreme()"
          >
            {{ state.isExtreme() ? 'EXTREME (CAPPED)' : 'NATURAL ETHICS' }}
          </span>
        </div>

        <!-- Presets Bar -->
        <div class="p-3 border-b border-white/10">
          <label class="block text-[11px] font-mono uppercase text-white/50 mb-1.5">Presets</label>
          <div class="grid grid-cols-4 gap-1">
            @for (p of presets; track p) {
              <button
                type="button"
                (click)="state.applyPreset(p)"
                [class.bg-emerald-500/20]="state.activePreset() === p"
                [class.border-emerald-500/50]="state.activePreset() === p"
                [class.text-emerald-300]="state.activePreset() === p"
                class="px-2 py-1 text-xs rounded border border-white/10 hover:border-white/30 text-white/80 transition-colors"
              >
                {{ p }}
              </button>
            }
          </div>
        </div>

        <!-- Tools Selector -->
        <div class="p-3 border-b border-white/10">
          <label class="block text-[11px] font-mono uppercase text-white/50 mb-1.5">Interactive Tools</label>
          <div class="grid grid-cols-4 gap-1 mb-2">
            <button
              type="button"
              (click)="setTool('select')"
              [class.bg-emerald-500/20]="state.activeTool() === 'select'"
              [class.border-emerald-500/50]="state.activeTool() === 'select'"
              class="px-2 py-1.5 text-xs rounded border border-white/10 hover:border-white/20 text-center"
              title="Select / Pan (V)"
            >
              Select (V)
            </button>
            <button
              type="button"
              (click)="setTool('brush')"
              [class.bg-emerald-500/20]="state.activeTool() === 'brush'"
              [class.border-emerald-500/50]="state.activeTool() === 'brush'"
              class="px-2 py-1.5 text-xs rounded border border-white/10 hover:border-white/20 text-center"
              title="Smart Mask Brush (B)"
            >
              Brush (B)
            </button>
            <button
              type="button"
              (click)="setTool('eraser')"
              [class.bg-emerald-500/20]="state.activeTool() === 'eraser'"
              [class.border-emerald-500/50]="state.activeTool() === 'eraser'"
              class="px-2 py-1.5 text-xs rounded border border-white/10 hover:border-white/20 text-center"
              title="Mask Eraser (E)"
            >
              Eraser (E)
            </button>
            <button
              type="button"
              (click)="setTool('healer')"
              [class.bg-emerald-500/20]="state.activeTool() === 'healer'"
              [class.border-emerald-500/50]="state.activeTool() === 'healer'"
              class="px-2 py-1.5 text-xs rounded border border-white/10 hover:border-white/20 text-center"
              title="Spot Blemish Healer (H)"
            >
              Heal (H)
            </button>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              (click)="state.toggleMaskVisualizer()"
              [class.bg-sky-500/20]="state.visualizeZone() >= 0"
              [class.border-sky-500/50]="state.visualizeZone() >= 0"
              class="flex-1 py-1 rounded border border-white/10 hover:border-white/20"
              title="Toggle Mask Overlay (M)"
            >
              Mask Visualizer (M)
            </button>
            <button
              type="button"
              (click)="toggleSplit()"
              [class.bg-amber-500/20]="state.splitPosition() >= 0"
              [class.border-amber-500/50]="state.splitPosition() >= 0"
              class="flex-1 py-1 rounded border border-white/10 hover:border-white/20"
              title="Toggle Before/After Split (Space)"
            >
              Split View
            </button>
          </div>
        </div>

        <!-- History Stack Controls -->
        <div class="p-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="state.undo()"
              [disabled]="!state.canUndo()"
              class="px-2 py-1 rounded border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              type="button"
              (click)="state.redo()"
              [disabled]="!state.canRedo()"
              class="px-2 py-1 rounded border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              Redo
            </button>
          </div>
          <button
            type="button"
            (click)="state.resetAll()"
            class="px-2 py-1 text-white/50 hover:text-white/90 text-xs"
          >
            Reset All
          </button>
        </div>

        <!-- File Loader / Image Status -->
        <div class="p-4 mt-auto border-t border-white/10">
          <input
            #fileInput
            type="file"
            accept="image/*"
            class="hidden"
            (change)="onFileSelected($event)"
          />
          <button
            type="button"
            (click)="fileInput.click()"
            class="w-full py-2 px-3 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-medium transition-colors"
          >
            Open Portrait Photo...
          </button>
          @if (isDetecting()) {
            <p class="text-[11px] text-amber-400 mt-2 text-center animate-pulse">
              Computing 12-Zone AI Segmentation...
            </p>
          }
        </div>
      </aside>

      <!-- Center Interactive Viewport -->
      <main class="flex-1 flex flex-col items-center justify-center relative p-4 bg-black/60">
        <!-- Viewport Canvas Container -->
        <div class="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-lg shadow-2xl border border-white/10">
          <canvas #glCanvas class="max-w-full max-h-[calc(100vh-6rem)] object-contain block"></canvas>
          <canvas
            #overlayCanvas
            (mousedown)="onCanvasMouseDown($event)"
            (mousemove)="onCanvasMouseMove($event)"
            (mouseup)="onCanvasMouseUp()"
            class="absolute inset-0 w-full h-full cursor-crosshair"
          ></canvas>
        </div>

        <!-- Split / Overlay HUD Indicator -->
        @if (state.splitPosition() >= 0) {
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white/70">
            Before (Original) | After (Retouched)
          </div>
        }
      </main>

      <!-- Right 19 Sliders Inspector Sidebar -->
      <aside class="w-88 border-l border-white/10 flex flex-col bg-black/40 backdrop-blur-md overflow-hidden">
        <!-- Categories Tab Bar -->
        <div class="flex border-b border-white/10 bg-black/30 overflow-x-auto text-xs">
          @for (cat of categories; track cat) {
            <button
              type="button"
              (click)="activeCategory.set(cat)"
              [class.border-b-2]="activeCategory() === cat"
              [class.border-emerald-400]="activeCategory() === cat"
              [class.text-white]="activeCategory() === cat"
              [class.text-white/50]="activeCategory() !== cat"
              class="px-3 py-2.5 font-medium whitespace-nowrap hover:text-white transition-colors"
            >
              {{ cat }}
            </button>
          }
        </div>

        <!-- Slider List for Active Category -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          @for (slider of currentCategorySliders(); track slider.key) {
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-white/80 font-medium">{{ slider.label }}</span>
                <span class="font-mono text-white/50 text-[11px]">
                  {{ state.sliders()[slider.key] }}{{ slider.unit }}
                  @if (slider.ethicalCap !== slider.max && slider.ethicalCap !== slider.min) {
                    <span class="text-white/30" title="Ethical Natural Cap">
                      (Cap: {{ slider.ethicalCap }}{{ slider.unit }})
                    </span>
                  }
                </span>
              </div>
              <input
                type="range"
                [min]="slider.min"
                [max]="slider.max"
                [value]="state.sliders()[slider.key]"
                (input)="onSliderChange(slider.key, $event)"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded cursor-pointer"
              />
              <p class="text-[10px] text-white/40 leading-tight">
                {{ slider.description }}
              </p>
            </div>
          }
        </div>
      </aside>
    </div>
  `,
})
export class RetouchStudioComponent implements OnInit, OnDestroy {
  readonly state = inject(RetouchStateService);
  private readonly retouchEngine = inject(RetouchEngineService);

  readonly glCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('glCanvas');
  readonly overlayCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('overlayCanvas');

  readonly presets: RetouchPresetName[] = ['Natural', 'Editorial', 'Subtle', 'Reset'];
  readonly categories: RetouchCategory[] = ['Skin', 'Eyes', 'Mouth', 'Details', 'Lighting', 'Atmosphere'];
  readonly activeCategory = signal<RetouchCategory>('Skin');

  readonly isDetecting = signal<boolean>(false);
  private pipeline: RetouchPipeline | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private sourceTexture: WebGLTexture | null = null;
  private maskTextures: { texA: WebGLTexture; texB: WebGLTexture; texC: WebGLTexture } | null = null;
  private imageBitmap: ImageBitmap | null = null;
  private isDrawing = false;

  readonly currentCategorySliders = computed(() => {
    const cat = this.activeCategory();
    return RETOUCH_SLIDER_DEFINITIONS.filter(s => s.category === cat);
  });

  ngOnInit(): void {
    // Initial setup will trigger after view child resolves
  }

  ngAfterViewInit(): void {
    this.initWebGL();
    this.loadSamplePortrait();
  }

  ngOnDestroy(): void {
    this.pipeline?.destroy();
    if (this.sourceTexture && this.gl) {
      this.gl.deleteTexture(this.sourceTexture);
    }
  }

  private initWebGL(): void {
    const canvas = this.glCanvas().nativeElement;
    const gl = canvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false });
    if (!gl) {
      console.warn('WebGL2 not supported for retouch studio');
      return;
    }
    this.gl = gl;
    this.pipeline = new RetouchPipeline();
    this.pipeline.init(gl);
  }

  private async loadSamplePortrait(): Promise<void> {
    // Generate a default 512x512 soft portrait canvas for instant studio readiness
    const off = document.createElement('canvas');
    off.width = 512;
    off.height = 512;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Draw stylized portrait gradient with facial features
    ctx.fillStyle = '#1c1b22';
    ctx.fillRect(0, 0, 512, 512);

    // Face oval
    ctx.beginPath();
    ctx.ellipse(256, 260, 140, 180, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#dfad92';
    ctx.fill();

    // Eyes
    ctx.beginPath();
    ctx.ellipse(200, 230, 24, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(312, 230, 24, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Irises
    ctx.beginPath();
    ctx.arc(200, 230, 10, 0, Math.PI * 2);
    ctx.arc(312, 230, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#346688';
    ctx.fill();

    // Lips
    ctx.beginPath();
    ctx.ellipse(256, 350, 40, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#b84455';
    ctx.fill();

    const bitmap = await createImageBitmap(off);
    this.processLoadedImage(bitmap);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const bitmap = await createImageBitmap(file);
    await this.processLoadedImage(bitmap);
  }

  private async processLoadedImage(bitmap: ImageBitmap): Promise<void> {
    this.imageBitmap = bitmap;
    const canvas = this.glCanvas().nativeElement;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const overlay = this.overlayCanvas().nativeElement;
    overlay.width = bitmap.width;
    overlay.height = bitmap.height;

    // Upload to WebGL source texture
    if (this.gl) {
      if (this.sourceTexture) this.gl.deleteTexture(this.sourceTexture);
      this.sourceTexture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        bitmap.width, bitmap.height, 0,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmap
      );
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }

    // Run AI 12-zone segmentation
    this.isDetecting.set(true);
    try {
      const off = document.createElement('canvas');
      off.width = bitmap.width;
      off.height = bitmap.height;
      const ctx = off.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const masks = await this.retouchEngine.generateMasks(off, bitmap.width, bitmap.height);
        if (this.pipeline && masks.fusedBuffers) {
          this.maskTextures = this.pipeline.createMaskTextures(
            masks.fusedBuffers.zoneWeights,
            masks.fusedBuffers.width,
            masks.fusedBuffers.height
          );
        }
      }
    } catch (e) {
      console.warn('AI segmentation skipped or failed, using baseline masks:', e);
    } finally {
      this.isDetecting.set(false);
      this.renderFrame();
    }
  }

  renderFrame(): void {
    if (!this.pipeline || !this.sourceTexture || !this.maskTextures || !this.imageBitmap) return;

    this.pipeline.render(this.glCanvas().nativeElement, {
      sourceTexture: this.sourceTexture,
      imageWidth: this.imageBitmap.width,
      imageHeight: this.imageBitmap.height,
      sliders: this.state.sliders(),
      splitPosition: this.state.splitPosition(),
      visualizeZone: this.state.visualizeZone(),
      maskTexA: this.maskTextures.texA,
      maskTexB: this.maskTextures.texB,
      maskTexC: this.maskTextures.texC,
    });
  }

  onSliderChange(key: keyof import('../../../core/models/retouch.model').RetouchSliders, event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.state.updateSlider(key, val);
    this.renderFrame();
  }

  setTool(tool: RetouchTool): void {
    this.state.activeTool.set(tool);
  }

  toggleSplit(): void {
    const cur = this.state.splitPosition();
    this.state.splitPosition.set(cur < 0 ? 0.5 : -1.0);
    this.renderFrame();
  }

  // Interactive Canvas Events
  onCanvasMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const rect = this.overlayCanvas().nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (this.state.activeTool() === 'healer') {
      const heal: SpotHealPoint = {
        id: 'heal-' + Date.now(),
        target: { x, y },
        donor: { x: Math.max(0.05, x - 0.04), y: Math.max(0.05, y - 0.04) },
        radius: 0.02,
        feather: 0.5,
      };
      this.state.addHealPoint(heal);
      this.renderOverlay();
      this.renderFrame();
    }
  }

  onCanvasMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    if (this.state.splitPosition() >= 0) {
      const rect = this.overlayCanvas().nativeElement.getBoundingClientRect();
      const x = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
      this.state.splitPosition.set(x);
      this.renderFrame();
    }
  }

  onCanvasMouseUp(): void {
    this.isDrawing = false;
  }

  private renderOverlay(): void {
    const canvas = this.overlayCanvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw active spot heal markers
    for (const h of this.state.heals()) {
      const tx = h.target.x * canvas.width;
      const ty = h.target.y * canvas.height;
      const dx = h.donor.x * canvas.width;
      const dy = h.donor.y * canvas.height;
      const r = h.radius * Math.min(canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(dx, dy);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Keyboard Shortcuts
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement) return;

    if (e.key === 'm' || e.key === 'M') {
      this.state.toggleMaskVisualizer();
      this.renderFrame();
    } else if (e.key === 'b' || e.key === 'B') {
      this.setTool('brush');
    } else if (e.key === 'e' || e.key === 'E') {
      this.setTool('eraser');
    } else if (e.key === 'h' || e.key === 'H') {
      this.setTool('healer');
    } else if (e.key === 'v' || e.key === 'V') {
      this.setTool('select');
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.toggleSplit();
    } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        this.state.redo();
      } else {
        this.state.undo();
      }
      this.renderFrame();
    } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      this.state.redo();
      this.renderFrame();
    }
  }
}