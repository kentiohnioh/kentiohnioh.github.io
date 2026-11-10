import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  ElementRef,
  viewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GpuRendererService } from '../../../gpu/renderer/gpu-renderer.service';
import { ColorGradeRecipe } from '../../../core/models/color-grade.model';
import { FILM_PROFILES, FilmStockId } from '../../../core/utils/film-profiles';

@Component({
  selector: 'app-color-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-[calc(100vh-4rem)] bg-[#080b10] text-[#e8ecf2] font-sans overflow-hidden">
      <!-- Left Film Stocks Sidebar -->
      <aside class="w-72 border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-md">
        <div class="p-4 border-b border-white/10">
          <h2 class="text-sm font-semibold tracking-wider uppercase text-white/90">3D LUT Film Stocks</h2>
          <p class="text-xs text-white/50">Hardware-accelerated emulation</p>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          @for (stock of filmStocks; track stock.id) {
            <button
              type="button"
              (click)="selectFilmStock(stock.id)"
              [class.bg-emerald-500/15]="activeStockId() === stock.id"
              [class.border-emerald-500/50]="activeStockId() === stock.id"
              class="w-full text-left p-3 rounded-lg border border-white/10 hover:border-white/30 transition-all group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-white group-hover:text-emerald-400">
                  {{ stock.name }}
                </span>
                <span class="text-[10px] font-mono text-white/40 uppercase">ISO {{ stock.iso }}</span>
              </div>
              <p class="text-[11px] text-white/50 mt-1 line-clamp-2">
                {{ stock.description }}
              </p>
            </button>
          }

          <button
            type="button"
            (click)="selectNeutral()"
            [class.bg-emerald-500/15]="activeStockId() === null"
            [class.border-emerald-500/50]="activeStockId() === null"
            class="w-full text-left p-3 rounded-lg border border-white/10 hover:border-white/30 transition-all text-xs text-white/70"
          >
            Linear / Neutral Identity
          </button>
        </div>

        <!-- File Loader -->
        <div class="p-4 border-t border-white/10">
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
            Load Custom Image...
          </button>
        </div>
      </aside>

      <!-- Center Viewport -->
      <main class="flex-1 flex flex-col items-center justify-center relative p-4 bg-black/60">
        <div class="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-lg shadow-2xl border border-white/10">
          <canvas #canvasTarget class="max-w-full max-h-[calc(100vh-6rem)] object-contain block"></canvas>
        </div>
      </main>

      <!-- Right Grading Controls Sidebar -->
      <aside class="w-80 border-l border-white/10 flex flex-col bg-black/40 backdrop-blur-md overflow-hidden">
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
          <span class="text-xs font-mono uppercase tracking-wider text-white/50">Grading Parameters</span>
          <button
            type="button"
            (click)="copyRecipeJson()"
            class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-mono"
          >
            {{ copied() ? 'Copied!' : 'Copy Recipe' }}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          <!-- 3D LUT Strength -->
          <div class="space-y-1">
            <div class="flex justify-between">
              <span class="text-white/80">3D LUT Strength</span>
              <span class="font-mono text-white/50">{{ Math.round((recipe.lut?.strength || 0) * 100) }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              [value]="(recipe.lut?.strength || 0) * 100"
              (input)="updateLutStrength($event)"
              class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
            />
          </div>

          <!-- White Balance -->
          <div class="space-y-3 pt-2 border-t border-white/10">
            <h3 class="text-[11px] font-mono uppercase text-white/40">White Balance</h3>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Temperature</span>
                <span class="font-mono text-white/50">{{ recipe.temperature }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.temperature"
                (input)="render()"
                class="w-full accent-amber-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Tint</span>
                <span class="font-mono text-white/50">{{ recipe.tint }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.tint"
                (input)="render()"
                class="w-full accent-fuchsia-400 bg-white/10 h-1 rounded"
              />
            </div>
          </div>

          <!-- Tone Controls -->
          <div class="space-y-3 pt-2 border-t border-white/10">
            <h3 class="text-[11px] font-mono uppercase text-white/40">Tone & Dynamic Range</h3>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Exposure EV</span>
                <span class="font-mono text-white/50">{{ recipe.exposureEV }} EV</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                [value]="recipe.exposureEV * 10"
                (input)="updateExposure($event)"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Contrast</span>
                <span class="font-mono text-white/50">{{ recipe.contrast }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.contrast"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Highlights</span>
                <span class="font-mono text-white/50">{{ recipe.highlights }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.highlights"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Shadows</span>
                <span class="font-mono text-white/50">{{ recipe.shadows }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.shadows"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
          </div>

          <!-- Color Fidelity & Skin Protection -->
          <div class="space-y-3 pt-2 border-t border-white/10">
            <h3 class="text-[11px] font-mono uppercase text-white/40">Fidelity & Skin Protection</h3>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Vibrance</span>
                <span class="font-mono text-white/50">{{ recipe.vibrance }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.vibrance"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Saturation</span>
                <span class="font-mono text-white/50">{{ recipe.saturation }}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.saturation"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Skin Protection</span>
                <span class="font-mono text-white/50">{{ Math.round(recipe.skinProtect.strength * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                [value]="recipe.skinProtect.strength * 100"
                (input)="updateSkinProtect($event)"
                class="w-full accent-rose-400 bg-white/10 h-1 rounded"
              />
            </div>
          </div>

          <!-- Grain & Vignette -->
          <div class="space-y-3 pt-2 border-t border-white/10">
            <h3 class="text-[11px] font-mono uppercase text-white/40">Analog Texture</h3>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Film Grain Amount</span>
                <span class="font-mono text-white/50">{{ recipe.grain.amount }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                [(ngModel)]="recipe.grain.amount"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-white/70">Vignette</span>
                <span class="font-mono text-white/50">{{ recipe.vignette.amount }}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                [(ngModel)]="recipe.vignette.amount"
                (input)="render()"
                class="w-full accent-emerald-400 bg-white/10 h-1 rounded"
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
})
export class ColorStudioComponent implements OnInit, OnDestroy {
  readonly renderer = inject(GpuRendererService);
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasTarget');

  readonly Math = Math;
  readonly filmStocks = Object.values(FILM_PROFILES);
  readonly activeStockId = signal<FilmStockId | null>('kodachrome-64');
  readonly copied = signal(false);

  recipe: ColorGradeRecipe = { ...FILM_PROFILES['kodachrome-64'].recipe };
  private imageBitmap: ImageBitmap | null = null;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.createSampleImage();
  }

  ngOnDestroy(): void {}

  private async createSampleImage(): Promise<void> {
    const off = document.createElement('canvas');
    off.width = 640;
    off.height = 427;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Atmospheric photo simulation
    const grad = ctx.createLinearGradient(0, 0, 640, 427);
    grad.addColorStop(0, '#1c2438');
    grad.addColorStop(0.5, '#785448');
    grad.addColorStop(1, '#c89a78');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 427);

    // Warm subject shape
    ctx.beginPath();
    ctx.ellipse(320, 240, 120, 160, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e8ba98';
    ctx.fill();

    const bmp = await createImageBitmap(off);
    this.imageBitmap = bmp;
    this.render();
  }

  async onFileSelected(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.imageBitmap = await createImageBitmap(file);
    this.render();
  }

  selectFilmStock(id: FilmStockId): void {
    this.activeStockId.set(id);
    this.recipe = JSON.parse(JSON.stringify(FILM_PROFILES[id].recipe));
    this.render();
  }

  selectNeutral(): void {
    this.activeStockId.set(null);
    this.recipe = {
      schemaVersion: 1,
      presetId: null,
      exposureEV: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0,
      splitTone: { shadowHue: 0, shadowSat: 0, highlightHue: 0, highlightSat: 0, balance: 0 },
      halation: { threshold: 0.9, radius: 10, strength: 0, tint: 0 },
      vignette: { amount: 0, midpoint: 50, roundness: 0, feather: 50 },
      grain: { amount: 0, size: 1.0, roughness: 50, seed: 42 },
      skinProtect: { enabled: true, strength: 0.8 },
    };
    this.render();
  }

  updateLutStrength(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value) / 100;
    if (this.recipe.lut) {
      this.recipe.lut.strength = val;
    }
    this.render();
  }

  updateExposure(e: Event): void {
    this.recipe.exposureEV = parseFloat((e.target as HTMLInputElement).value) / 10;
    this.render();
  }

  updateSkinProtect(e: Event): void {
    this.recipe.skinProtect.strength = parseFloat((e.target as HTMLInputElement).value) / 100;
    this.render();
  }

  render(): void {
    if (!this.imageBitmap) return;

    this.renderer.render({
      canvas: this.canvasRef().nativeElement,
      bitmap: this.imageBitmap,
      cacheKey: 'color-studio-preview',
      recipe: this.recipe,
    });
  }

  copyRecipeJson(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(this.recipe, null, 2));
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
