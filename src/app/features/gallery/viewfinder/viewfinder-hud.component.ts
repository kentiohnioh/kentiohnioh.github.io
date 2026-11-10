import { Component, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogStateService } from '../../../core/services/catalog-state.service';
import {
  FOCAL_DIAL_STOPS,
  APERTURE_DIAL_STOPS,
  SHUTTER_DIAL_STOPS,
  ISO_DIAL_STOPS,
  MOOD_DIAL_STOPS,
  COLOR_SWATCH_PRESETS,
  DialStopDefinition,
} from '../../../core/utils/viewfinder-filter';

@Component({
  selector: 'app-viewfinder-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside
      class="viewfinder-drawer glass-panel border border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 max-w-4xl mx-auto"
      role="region"
      aria-label="Camera Viewfinder Optical Dials"
    >
      <!-- Viewfinder Top Bar -->
      <div class="flex items-center justify-between pb-4 border-b border-neutral-800/80 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
          <h2 class="text-xs font-mono uppercase tracking-widest text-neutral-200">
            Optics & Exposure Telemetry
          </h2>
          <span
            class="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400"
            aria-live="polite"
          >
            {{ catalogState.filteredPhotos().length }} matching
          </span>
        </div>

        <div class="flex items-center gap-2">
          @if (hasActiveFilters()) {
            <button
              (click)="clearAllFilters()"
              class="px-3 py-1 rounded text-xs font-mono text-neutral-400 hover:text-safelight-red hover:bg-neutral-900 transition-colors"
              aria-label="Clear all optical filters"
            >
              Reset Dials
            </button>
          }
          <button
            (click)="close.emit()"
            class="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Close viewfinder controls"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Dials Matrix -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Focal Length Dial -->
        <fieldset class="dial-column">
          <legend class="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center justify-between w-full">
            <span>Focal Length</span>
            <span class="text-neutral-600">mm</span>
          </legend>
          <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Focal length stops">
            @for (stop of focalStops; track stop.id) {
              <button
                type="button"
                (click)="setFocalStop(stop.id)"
                [attr.aria-checked]="currentFocal() === stop.id"
                role="radio"
                [disabled]="facets().focal[stop.id] === 0"
                [class.active-stop]="currentFocal() === stop.id"
                [class.disabled-stop]="facets().focal[stop.id] === 0"
                class="dial-notch-btn"
              >
                <div class="flex items-center gap-2">
                  <span class="tick-mark"></span>
                  <span class="font-mono text-xs">{{ stop.label }}</span>
                </div>
                <span class="count-tag font-mono text-[10px]">
                  {{ facets().focal[stop.id] }}
                </span>
              </button>
            }
          </div>
        </fieldset>

        <!-- Aperture Dial -->
        <fieldset class="dial-column">
          <legend class="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center justify-between w-full">
            <span>Aperture</span>
            <span class="text-neutral-600">f-stop</span>
          </legend>
          <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Aperture stops">
            @for (stop of apertureStops; track stop.id) {
              <button
                type="button"
                (click)="setApertureStop(stop.id)"
                [attr.aria-checked]="currentAperture() === stop.id"
                role="radio"
                [disabled]="facets().aperture[stop.id] === 0"
                [class.active-stop]="currentAperture() === stop.id"
                [class.disabled-stop]="facets().aperture[stop.id] === 0"
                class="dial-notch-btn"
              >
                <div class="flex items-center gap-2">
                  <span class="tick-mark"></span>
                  <span class="font-mono text-xs">{{ stop.label }}</span>
                </div>
                <span class="count-tag font-mono text-[10px]">
                  {{ facets().aperture[stop.id] }}
                </span>
              </button>
            }
          </div>
        </fieldset>

        <!-- Shutter Dial -->
        <fieldset class="dial-column">
          <legend class="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center justify-between w-full">
            <span>Shutter</span>
            <span class="text-neutral-600">speed</span>
          </legend>
          <div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Shutter speed stops">
            @for (stop of shutterStops; track stop.id) {
              <button
                type="button"
                (click)="setShutterStop(stop.id)"
                [attr.aria-checked]="currentShutter() === stop.id"
                role="radio"
                [disabled]="facets().shutter[stop.id] === 0"
                [class.active-stop]="currentShutter() === stop.id"
                [class.disabled-stop]="facets().shutter[stop.id] === 0"
                class="dial-notch-btn"
              >
                <div class="flex items-center gap-2">
                  <span class="tick-mark"></span>
                  <span class="font-mono text-xs">{{ stop.label }}</span>
                </div>
                <span class="count-tag font-mono text-[10px]">
                  {{ facets().shutter[stop.id] }}
                </span>
              </button>
            }
          </div>
        </fieldset>

        <!-- ISO & Mood Column -->
        <div class="flex flex-col gap-5">
          <!-- ISO Dial -->
          <fieldset class="dial-column">
            <legend class="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center justify-between w-full">
              <span>Sensitivity</span>
              <span class="text-neutral-600">ISO</span>
            </legend>
            <div class="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="ISO stops">
              @for (stop of isoStops; track stop.id) {
                <button
                  type="button"
                  (click)="setIsoStop(stop.id)"
                  [attr.aria-checked]="currentIso() === stop.id"
                  role="radio"
                  [disabled]="facets().iso[stop.id] === 0"
                  [class.active-stop]="currentIso() === stop.id"
                  [class.disabled-stop]="facets().iso[stop.id] === 0"
                  class="dial-notch-btn text-center justify-center p-2"
                >
                  <span class="font-mono text-xs">{{ stop.label }}</span>
                </button>
              }
            </div>
          </fieldset>

          <!-- Color Swatch Delta-E Filter -->
          <div>
            <span class="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2 block">
              Color Resonance
            </span>
            <div class="flex items-center gap-2" role="radiogroup" aria-label="Color swatch filters">
              <button
                type="button"
                (click)="setColorFilter(null)"
                [class.ring-2]="!currentColor()"
                [class.ring-emerald-400]="!currentColor()"
                class="w-6 h-6 rounded-full border border-neutral-700 bg-neutral-900 text-[10px] flex items-center justify-center text-neutral-400 hover:text-neutral-100"
                aria-label="All colors"
              >
                &times;
              </button>
              @for (swatch of colorPresets; track swatch.id) {
                <button
                  type="button"
                  (click)="setColorFilter(swatch.hex)"
                  [attr.aria-label]="swatch.label"
                  [style.backgroundColor]="swatch.hex"
                  [class.ring-2]="currentColor() === swatch.hex"
                  [class.ring-white]="currentColor() === swatch.hex"
                  class="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950"
                ></button>
              }
            </div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
    }
    .dial-notch-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.625rem;
      border-radius: 0.375rem;
      background: rgba(23, 23, 23, 0.4);
      border: 1px solid rgba(64, 64, 64, 0.3);
      color: #9aa4b2;
      transition: all 0.15s ease;
      text-align: left;
    }
    .dial-notch-btn:hover:not(:disabled) {
      background: rgba(38, 38, 38, 0.7);
      color: #e8ecf2;
      border-color: rgba(115, 115, 115, 0.5);
    }
    .tick-mark {
      width: 4px;
      height: 4px;
      border-radius: 9999px;
      background: #525252;
    }
    .active-stop {
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(52, 211, 153, 0.5) !important;
      color: #34d399 !important;
    }
    .active-stop .tick-mark {
      background: #34d399;
      box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
    }
    .disabled-stop {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .count-tag {
      color: #737373;
    }
  `],
})
export class ViewfinderHudComponent {
  readonly catalogState = inject(CatalogStateService);
  @Output() close = new EventEmitter<void>();

  readonly focalStops = FOCAL_DIAL_STOPS;
  readonly apertureStops = APERTURE_DIAL_STOPS;
  readonly shutterStops = SHUTTER_DIAL_STOPS;
  readonly isoStops = ISO_DIAL_STOPS;
  readonly moodStops = MOOD_DIAL_STOPS;
  readonly colorPresets = COLOR_SWATCH_PRESETS;

  readonly facets = computed(() => this.catalogState.facetCounts());

  readonly currentFocal = computed(() => this.catalogState.activeFilters().focalStop || 'all');
  readonly currentAperture = computed(() => this.catalogState.activeFilters().apertureStop || 'all');
  readonly currentShutter = computed(() => this.catalogState.activeFilters().shutterStop || 'all');
  readonly currentIso = computed(() => this.catalogState.activeFilters().isoStop || 'all');
  readonly currentColor = computed(() => this.catalogState.activeFilters().colorHex || null);

  readonly hasActiveFilters = computed(() => {
    const f = this.catalogState.activeFilters();
    return Boolean(
      (f.focalStop && f.focalStop !== 'all') ||
      (f.apertureStop && f.apertureStop !== 'all') ||
      (f.shutterStop && f.shutterStop !== 'all') ||
      (f.isoStop && f.isoStop !== 'all') ||
      (f.mood && f.mood !== 'all') ||
      f.colorHex ||
      f.collectionId ||
      f.searchQuery
    );
  });

  setFocalStop(id: string): void {
    this.catalogState.setFilters({ focalStop: id === 'all' ? null : id });
  }

  setApertureStop(id: string): void {
    this.catalogState.setFilters({ apertureStop: id === 'all' ? null : id });
  }

  setShutterStop(id: string): void {
    this.catalogState.setFilters({ shutterStop: id === 'all' ? null : id });
  }

  setIsoStop(id: string): void {
    this.catalogState.setFilters({ isoStop: id === 'all' ? null : id });
  }

  setColorFilter(hex: string | null): void {
    this.catalogState.setFilters({ colorHex: hex });
  }

  clearAllFilters(): void {
    this.catalogState.setFilters({
      focalStop: null,
      apertureStop: null,
      shutterStop: null,
      isoStop: null,
      mood: null,
      colorHex: null,
      collectionId: null,
      searchQuery: null,
      hasPeople: null,
      retouchedOnly: null,
    });
  }
}
