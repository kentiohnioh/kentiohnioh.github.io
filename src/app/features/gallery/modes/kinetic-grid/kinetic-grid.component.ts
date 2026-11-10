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
import { RouterLink } from '@angular/router';
import { CatalogStateService } from '../../../../core/services/catalog-state.service';
import { AmbientGlowService } from '../../../../core/services/ambient-glow.service';
import { PhotoCanvasComponent } from '../../../../shared/ui/photo-canvas/photo-canvas.component';
import { PhotoItem } from '../../../../core/models/catalog.model';
import { QualityGovernor, QualityLevel } from '../../../../core/utils/quality-governor';

@Component({
  selector: 'app-kinetic-grid',
  standalone: true,
  imports: [CommonModule, RouterLink, PhotoCanvasComponent],
  template: `
    <div
      #gridContainer
      class="kinetic-grid-viewport min-h-screen py-8"
      role="feed"
      aria-label="Kinetic Sway Editorial Photo Grid"
    >
      <!-- Grid Cards with 3D Gyro Perspective -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 perspective-[1000px]"
        [class.motion-reduced]="qualityLevel() === 'minimal'"
      >
        @for (photo of catalogState.filteredPhotos(); track photo.id; let idx = $index) {
          <article
            (mouseenter)="onHover(photo, idx)"
            (mouseleave)="onLeave(idx)"
            (mousemove)="onCardMouseMove($event, idx)"
            class="group relative flex flex-col glass-card rounded-xl overflow-hidden transition-all duration-300 transform-gpu"
            [style.transform]="getCardTransform(idx)"
          >
            <a
              [routerLink]="['/photo', photo.slug]"
              class="block aspect-[3/2] w-full bg-neutral-900 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-t-xl"
              [attr.aria-label]="photo.title + '. ' + photo.alt"
            >
              <!-- Protected Canvas Surface (Zero <img> tags) -->
              <app-photo-canvas
                [photo]="photo"
                [interactive]="true"
                class="w-full h-full block"
              ></app-photo-canvas>

              <!-- Editorial Vignette & Hover Telemetry -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 pointer-events-none"
              >
                <div class="flex items-center gap-2 mb-1">
                  @if (photo.flags.retouched) {
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Retouched
                    </span>
                  }
                  @if (photo.exif.camera) {
                    <span class="text-[11px] font-mono text-neutral-400">{{ photo.exif.camera }}</span>
                  }
                </div>
                <h2 class="text-neutral-100 font-serif text-xl tracking-tight leading-snug">{{ photo.title }}</h2>
                <div class="flex items-center gap-3 text-xs font-mono text-neutral-300 mt-2">
                  @if (photo.exif.focalLengthMm) {
                    <span>{{ photo.exif.focalLengthMm }}mm</span>
                  }
                  @if (photo.exif.aperture) {
                    <span>f/{{ photo.exif.aperture }}</span>
                  }
                  @if (photo.exif.shutterDisplay) {
                    <span>{{ photo.exif.shutterDisplay }}s</span>
                  }
                  @if (photo.exif.iso) {
                    <span>ISO {{ photo.exif.iso }}</span>
                  }
                </div>
              </div>
            </a>

            <!-- Tactile Caption Under Card -->
            <footer class="p-3.5 bg-neutral-950/80 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono">
              <span class="text-neutral-300 truncate max-w-[70%] font-medium">{{ photo.title }}</span>
              <span class="text-neutral-500 text-[11px]">{{ photo.exif.lens || 'Prime Lens' }}</span>
            </footer>
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .motion-reduced {
      perspective: none !important;
    }
    .motion-reduced article {
      transform: none !important;
      transition: opacity 0.2s ease !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KineticGridComponent implements OnInit, OnDestroy {
  readonly catalogState = inject(CatalogStateService);
  private readonly glowService = inject(AmbientGlowService);

  readonly qualityLevel = signal<QualityLevel>('full');

  // Interactive tilt & sway state per active hover card
  private activeHoverIndex = signal<number | null>(null);
  private tiltX = signal(0);
  private tiltY = signal(0);
  private scrollVelocity = signal(0);

  private governor = new QualityGovernor();
  private lastScrollY = 0;
  private lastScrollTime = 0;
  private animFrameId: number | null = null;
  private lastFrameTimestamp = 0;

  ngOnInit(): void {
    // Check reduced motion preference safely
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.governor.setReducedMotionPreference(mediaQuery.matches);
      this.qualityLevel.set(this.governor.getLevel());

      mediaQuery.addEventListener('change', (e) => {
        this.governor.setReducedMotionPreference(e.matches);
        this.qualityLevel.set(this.governor.getLevel());
      });
    }

    this.startGovernorLoop();
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const now = performance.now();
    const currentY = window.scrollY;
    const dt = Math.max(1, now - this.lastScrollTime);
    const dy = currentY - this.lastScrollY;

    // Velocity in px per millisecond
    const velocity = dy / dt;
    this.scrollVelocity.set(Math.max(-1.5, Math.min(1.5, velocity)));

    this.lastScrollY = currentY;
    this.lastScrollTime = now;
  }

  onHover(photo: PhotoItem, index: number): void {
    this.activeHoverIndex.set(index);
    if (photo.palette) {
      this.glowService.updateGlowFromPalette(photo.palette);
    }
  }

  onLeave(index: number): void {
    if (this.activeHoverIndex() === index) {
      this.activeHoverIndex.set(null);
      this.tiltX.set(0);
      this.tiltY.set(0);
    }
  }

  onCardMouseMove(event: MouseEvent, index: number): void {
    if (this.qualityLevel() === 'minimal') return;

    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Tilt range: +/- 6 degrees
    const maxAngle = this.qualityLevel() === 'reduced' ? 3 : 6;
    const rotateY = ((x - centerX) / centerX) * maxAngle;
    const rotateX = -((y - centerY) / centerY) * maxAngle;

    this.tiltX.set(rotateX);
    this.tiltY.set(rotateY);
  }

  getCardTransform(index: number): string {
    if (this.qualityLevel() === 'minimal') {
      return 'none';
    }

    // Scroll inertia sway factor
    const sway = this.scrollVelocity() * (this.qualityLevel() === 'reduced' ? 1.5 : 3.0);

    if (this.activeHoverIndex() === index) {
      const rx = this.tiltX() + sway;
      const ry = this.tiltY();
      return `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    }

    if (Math.abs(sway) > 0.05) {
      return `rotateX(${sway.toFixed(2)}deg)`;
    }

    return 'none';
  }

  private startGovernorLoop(): void {
    const loop = (timestamp: number) => {
      if (this.lastFrameTimestamp > 0) {
        const frameDuration = timestamp - this.lastFrameTimestamp;
        const changed = this.governor.recordFrame(frameDuration);
        if (changed) {
          this.qualityLevel.set(this.governor.getLevel());
        }
      }
      this.lastFrameTimestamp = timestamp;

      // Decay scroll velocity smoothly towards 0
      const currentVel = this.scrollVelocity();
      if (Math.abs(currentVel) > 0.001) {
        this.scrollVelocity.set(currentVel * 0.9);
      } else if (currentVel !== 0) {
        this.scrollVelocity.set(0);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }
}
