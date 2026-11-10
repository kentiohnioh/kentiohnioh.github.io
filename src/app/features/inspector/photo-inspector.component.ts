import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { PhotoItem } from '../../core/models/catalog.model';

@Component({
  selector: 'app-photo-inspector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Photo Inspector">
      <!-- Back Navigation -->
      <nav class="mb-6 flex items-center justify-between">
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-neutral-100 uppercase tracking-widest transition-colors"
        >
          <span aria-hidden="true">&larr;</span> Back to Gallery
        </a>
        <span class="text-xs font-mono text-neutral-600">INSPECTOR HUD</span>
      </nav>

      @if (photo(); as p) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <!-- Main Visual Viewport -->
          <div class="lg:col-span-2 glass-panel p-2 rounded-xl overflow-hidden relative group">
            <div
              class="w-full aspect-[3/2] bg-neutral-950 rounded-lg overflow-hidden relative select-none flex items-center justify-center"
              role="img"
              [attr.aria-label]="p.alt"
            >
              <div
                class="w-full h-full bg-contain bg-no-repeat bg-center"
                [style.backgroundImage]="'url(' + getDisplayUrl(p) + ')'"
              ></div>

              <!-- Retouched Badge -->
              @if (p.flags.retouched) {
                <div class="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md border border-emerald-400/30 px-2.5 py-1 rounded text-xs font-mono text-emerald-400">
                  Retouched
                </div>
              }
            </div>

            <p class="sr-only">{{ p.longDescription || p.alt }}</p>
          </div>

          <!-- Metadata & Telemetry Inspector -->
          <aside class="space-y-6">
            <!-- Title & Context -->
            <div class="border-b border-neutral-800 pb-4">
              <h1 class="text-2xl font-serif text-neutral-100 mb-1">{{ p.title }}</h1>
              <p class="text-sm text-neutral-400">{{ p.caption || p.alt }}</p>
              @if (p.takenAt) {
                <time [attr.datetime]="p.takenAt" class="text-xs font-mono text-neutral-500 block mt-2">
                  Captured: {{ p.takenAt }}
                </time>
              }
            </div>

            <!-- EXIF Telemetry -->
            <div class="glass-panel p-4 rounded-lg space-y-3">
              <h2 class="text-xs font-mono uppercase tracking-wider text-neutral-400">Camera Telemetry</h2>
              <dl class="grid grid-cols-2 gap-y-2 text-xs font-mono">
                @if (p.exif.camera) {
                  <dt class="text-neutral-500">Body</dt>
                  <dd class="text-neutral-200">{{ p.exif.camera }}</dd>
                }
                @if (p.exif.lens) {
                  <dt class="text-neutral-500">Optics</dt>
                  <dd class="text-neutral-200">{{ p.exif.lens }}</dd>
                }
                @if (p.exif.focalLengthMm) {
                  <dt class="text-neutral-500">Focal Length</dt>
                  <dd class="text-neutral-200">{{ p.exif.focalLengthMm }}mm</dd>
                }
                @if (p.exif.aperture) {
                  <dt class="text-neutral-500">Aperture</dt>
                  <dd class="text-neutral-200">f/{{ p.exif.aperture }}</dd>
                }
                @if (p.exif.shutterDisplay || p.exif.shutterSeconds) {
                  <dt class="text-neutral-500">Shutter</dt>
                  <dd class="text-neutral-200">{{ p.exif.shutterDisplay || ('1/' + (1/p.exif.shutterSeconds!)) }}s</dd>
                }
                @if (p.exif.iso) {
                  <dt class="text-neutral-500">ISO</dt>
                  <dd class="text-neutral-200">{{ p.exif.iso }}</dd>
                }
              </dl>
            </div>

            <!-- OKLCH Dominant Palette -->
            <div class="glass-panel p-4 rounded-lg space-y-3">
              <h2 class="text-xs font-mono uppercase tracking-wider text-neutral-400">Dominant Palette (OKLCH)</h2>
              <div class="flex items-center gap-2">
                @for (swatch of p.palette; track swatch.hex) {
                  <div class="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      class="w-full h-8 rounded border border-neutral-700/60 shadow-sm"
                      [style.backgroundColor]="swatch.hex"
                      [title]="swatch.hex"
                    ></div>
                    <span class="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">{{ swatch.hex }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Rights & Licensing -->
            <div class="text-xs font-mono text-neutral-500 border-t border-neutral-800/80 pt-4 space-y-1">
              <p>{{ p.rights.copyright }}</p>
              <p>License: {{ p.rights.license }}</p>
              @if (p.rights.credit) {
                <p>Credit: {{ p.rights.credit }}</p>
              }
            </div>
          </aside>
        </div>
      } @else {
        <div class="py-24 text-center">
          <p class="text-neutral-400 font-sans text-lg">Photograph not found or loading...</p>
          <a routerLink="/" class="mt-4 inline-block text-xs font-mono text-emerald-400 hover:underline">
            Return to gallery
          </a>
        </div>
      }
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class PhotoInspectorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogState = inject(CatalogStateService);

  readonly photo = signal<PhotoItem | null>(null);

  async ngOnInit(): Promise<void> {
    if (this.catalogState.photos().length === 0) {
      await this.catalogState.loadIndex();
    }

    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        const item = this.catalogState.photos().find((p) => p.slug === slug || p.id === slug) ?? null;
        this.photo.set(item);
        if (item) {
          this.catalogState.selectPhoto(item.id);
        }
      }
    });
  }

  getDisplayUrl(photo: PhotoItem): string {
    const v = photo.sources.variants.find((item) => item.width === 2048) ||
              photo.sources.variants.find((item) => item.width === 1280) ||
              photo.sources.variants[0];
    return v?.urls[0] || photo.placeholder;
  }
}
