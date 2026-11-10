import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoItem } from '../../../core/models/catalog.model';
import { HistogramData, computeHistogram } from '../../../core/utils/histogram-math';

@Component({
  selector: 'app-histogram-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel p-4 rounded-xl space-y-4" role="region" aria-label="Photo Histogram and Exposure Telemetry">
      <div class="flex items-center justify-between border-b border-neutral-800/80 pb-2">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <h2 class="text-xs font-mono uppercase tracking-widest text-neutral-300">Histogram & Telemetry</h2>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-mono">
          <button
            type="button"
            (click)="toggleChannel('luma')"
            [class.text-neutral-100]="channels().luma"
            [class.bg-neutral-800]="channels().luma"
            class="px-2 py-0.5 rounded text-neutral-500 hover:text-neutral-300"
          >
            Luma
          </button>
          <button
            type="button"
            (click)="toggleChannel('r')"
            [class.text-safelight-red]="channels().r"
            [class.bg-neutral-800]="channels().r"
            class="px-2 py-0.5 rounded text-neutral-500 hover:text-neutral-300"
          >
            R
          </button>
          <button
            type="button"
            (click)="toggleChannel('g')"
            [class.text-emerald-400]="channels().g"
            [class.bg-neutral-800]="channels().g"
            class="px-2 py-0.5 rounded text-neutral-500 hover:text-neutral-300"
          >
            G
          </button>
          <button
            type="button"
            (click)="toggleChannel('b')"
            [class.text-ice-blue]="channels().b"
            [class.bg-neutral-800]="channels().b"
            class="px-2 py-0.5 rounded text-neutral-500 hover:text-neutral-300"
          >
            B
          </button>
        </div>
      </div>

      <!-- Canvas Histogram Plot -->
      <div class="relative w-full h-24 bg-neutral-950/90 rounded-lg overflow-hidden border border-neutral-800/80">
        <canvas #histCanvas class="w-full h-full block" width="256" height="96"></canvas>

        <!-- Shadow & Highlight Clipping Warnings -->
        @if (histData().shadowClipPercent > 1.0) {
          <div
            class="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-[9px] font-mono text-ice-blue flex items-center gap-1"
            title="Deep shadows clipped below threshold"
          >
            <span>Shadows crushed:</span>
            <span class="font-bold">{{ histData().shadowClipPercent }}%</span>
          </div>
        }

        @if (histData().highlightClipPercent > 1.0) {
          <div
            class="absolute top-1.5 right-2 px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-[9px] font-mono text-safelight-red flex items-center gap-1"
            title="Blown highlights exceeding peak threshold"
          >
            <span>Highlights clipped:</span>
            <span class="font-bold">{{ histData().highlightClipPercent }}%</span>
          </div>
        }
      </div>

      <!-- Exposure Telemetry Real DOM Badges -->
      <dl class="grid grid-cols-3 gap-2 text-xs font-mono">
        <div class="p-2 bg-neutral-900/60 rounded border border-neutral-800">
          <dt class="text-[10px] text-neutral-500 uppercase">Shutter</dt>
          <dd class="text-neutral-200 mt-0.5 font-medium">{{ photo.exif.shutterDisplay || '1/250s' }}</dd>
        </div>
        <div class="p-2 bg-neutral-900/60 rounded border border-neutral-800">
          <dt class="text-[10px] text-neutral-500 uppercase">Aperture</dt>
          <dd class="text-neutral-200 mt-0.5 font-medium">f/{{ photo.exif.aperture || 2.8 }}</dd>
        </div>
        <div class="p-2 bg-neutral-900/60 rounded border border-neutral-800">
          <dt class="text-[10px] text-neutral-500 uppercase">ISO</dt>
          <dd class="text-neutral-200 mt-0.5 font-medium">{{ photo.exif.iso || 400 }}</dd>
        </div>
      </dl>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramHudComponent implements OnChanges {
  @Input({ required: true }) photo!: PhotoItem;
  @ViewChild('histCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly channels = signal({
    luma: true,
    r: true,
    g: true,
    b: true,
  });

  readonly histData = signal<HistogramData>({
    r: new Uint32Array(256),
    g: new Uint32Array(256),
    b: new Uint32Array(256),
    luma: new Uint32Array(256),
    shadowClipPercent: 0,
    highlightClipPercent: 0,
    maxBinCount: 1,
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['photo'] && this.photo) {
      this.synthesizeHistogramFromPhoto();
    }
  }

  toggleChannel(channel: 'luma' | 'r' | 'g' | 'b'): void {
    this.channels.update((c) => ({ ...c, [channel]: !c[channel] }));
    this.drawHistogram();
  }

  /**
   * Updates histogram from direct pixel buffer (e.g. read back from WebGL canvas at 10Hz).
   */
  updatePixels(pixels: Uint8ClampedArray | Uint8Array, width: number, height: number): void {
    const data = computeHistogram(pixels, width, height);
    this.histData.set(data);
    this.drawHistogram();
  }

  /**
   * Synthesize an initial realistic histogram based on photo palette & exposure metadata
   * until live canvas pixel readback completes.
   */
  private synthesizeHistogramFromPhoto(): void {
    const w = 64;
    const h = 64;
    const pixels = new Uint8ClampedArray(w * h * 4);

    // Seeded synthetic distribution centered on palette swatches
    const primaryL = this.photo.palette?.[0]?.oklch?.l ?? 0.5;
    const centerBin = Math.round(primaryL * 255);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const norm = (x / w - 0.5) * 2;
        const val = Math.min(255, Math.max(0, Math.round(centerBin + norm * 70 + (y % 5) * 6)));
        pixels[idx] = val;
        pixels[idx + 1] = Math.min(255, Math.max(0, val - 8));
        pixels[idx + 2] = Math.min(255, Math.max(0, val + 12));
        pixels[idx + 3] = 255;
      }
    }

    const data = computeHistogram(pixels, w, h);
    this.histData.set(data);
    setTimeout(() => this.drawHistogram(), 20);
  }

  private drawHistogram(): void {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = this.histData();
    const max = Math.max(1, data.maxBinCount);
    const ch = this.channels();

    // Render channels using additive blending
    ctx.globalCompositeOperation = 'screen';

    if (ch.r) {
      this.renderChannelCurve(ctx, data.r, max, w, h, 'rgba(244, 63, 94, 0.6)');
    }
    if (ch.g) {
      this.renderChannelCurve(ctx, data.g, max, w, h, 'rgba(52, 211, 153, 0.6)');
    }
    if (ch.b) {
      this.renderChannelCurve(ctx, data.b, max, w, h, 'rgba(96, 165, 250, 0.6)');
    }
    if (ch.luma) {
      ctx.globalCompositeOperation = 'source-over';
      this.renderChannelCurve(ctx, data.luma, max, w, h, 'rgba(255, 255, 255, 0.85)');
    }
  }

  private renderChannelCurve(
    ctx: CanvasRenderingContext2D,
    bins: Uint32Array,
    maxCount: number,
    w: number,
    h: number,
    fillStyle: string
  ): void {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w;
      const count = Math.min(bins[i], maxCount);
      const barHeight = (count / maxCount) * (h - 4);
      const y = h - barHeight;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

