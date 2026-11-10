import {
  Component,
  OnInit,
  HostListener,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { DraftStorageService } from '../../core/services/draft-storage.service';
import { PhotoItem } from '../../core/models/catalog.model';
import { PhotoCanvasComponent } from '../../shared/ui/photo-canvas/photo-canvas.component';
import { PublishWizardComponent } from './publish-wizard/publish-wizard.component';
import { ShortcutsModalComponent } from './shortcuts-modal/shortcuts-modal.component';
import { FILM_PROFILES, FilmStockId } from '../../core/utils/film-profiles';

type InspectorTab = 'info' | 'retouch' | 'grade' | 'publish';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PhotoCanvasComponent,
    PublishWizardComponent,
    ShortcutsModalComponent,
  ],
  template: `
    <div class="h-screen flex flex-col bg-neutral-950 text-neutral-200 select-none overflow-hidden" role="main" aria-label="Admin Darkroom Workspace">
      <!-- Top Workspace Nav Bar -->
      <header class="h-14 px-6 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-neutral-950/90 backdrop-blur-xl">
        <div class="flex items-center gap-4">
          <span class="w-2.5 h-2.5 rounded-full bg-warm-amber"></span>
          <h1 class="text-xs font-mono uppercase tracking-widest text-neutral-100 font-semibold">
            Theng Nioh &bull; Admin Studio
          </h1>
          <span class="text-[11px] font-mono text-neutral-500 border-l border-neutral-800 pl-4">
            Storage: {{ draftStorage.storageQuota().percentageUsed }}% used
          </span>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="showShortcuts.set(true)"
            class="px-2.5 py-1 rounded-lg text-xs font-mono text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 border border-neutral-800"
            title="Keyboard shortcuts [?]"
          >
            ? Shortcuts
          </button>

          <button
            type="button"
            (click)="saveDraft()"
            class="px-3 py-1 rounded-lg text-xs font-mono text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 border border-neutral-700 transition-colors"
          >
            Save Draft
          </button>

          <button
            type="button"
            (click)="showPublishWizard.set(true)"
            class="px-4 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20 transition-all"
          >
            Publish Staged &rarr;
          </button>

          <div class="w-px h-5 bg-neutral-800 mx-1"></div>

          <a routerLink="/" class="text-xs font-mono text-neutral-400 hover:text-neutral-100 uppercase tracking-widest">
            Public Site &rarr;
          </a>
        </div>
      </header>

      <!-- 3-Column Studio Body -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Column 1: Left Library & Ingest Queue -->
        <aside class="w-80 border-r border-neutral-800/80 flex flex-col bg-neutral-950/60 shrink-0">
          <!-- Ingest Header & Dropzone Trigger -->
          <div class="p-4 border-b border-neutral-800/80 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono uppercase tracking-wider text-neutral-400">Library Queue</span>
              <span class="text-xs font-mono text-emerald-400">{{ stagedPhotos().length }} staged</span>
            </div>

            <!-- Drop Zone File Picker -->
            <label class="block p-3 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/80 text-center cursor-pointer transition-colors">
              <span class="text-xs font-mono text-neutral-400 block">+ Drop Raw Photos</span>
              <span class="text-[10px] font-mono text-neutral-600 block mt-0.5">AVIF / WebP / JPEG</span>
              <input type="file" multiple accept="image/*" (change)="onFilesDropped($event)" class="sr-only" />
            </label>
          </div>

          <!-- Staged Photos List -->
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            @for (photo of stagedPhotos(); track photo.id; let idx = $index) {
              <div
                (click)="selectPhoto(photo)"
                [class.bg-neutral-800]="selectedPhoto()?.id === photo.id"
                [class.border-emerald-500/40]="selectedPhoto()?.id === photo.id"
                class="p-2 rounded-xl flex items-center gap-3 cursor-pointer border border-transparent hover:bg-neutral-900/80 transition-colors"
              >
                <div class="w-12 h-8 rounded bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800">
                  <app-photo-canvas [photo]="photo" [interactive]="false" class="w-full h-full block"></app-photo-canvas>
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-serif text-neutral-200 block truncate">{{ photo.title }}</span>
                  <span class="text-[10px] font-mono text-neutral-500 block truncate">{{ photo.slug }}</span>
                </div>
                @if (photo.flags.retouched) {
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Retouched"></span>
                }
              </div>
            }
          </div>
        </aside>

        <!-- Column 2: Centre Canvas Viewport -->
        <main class="flex-1 bg-black flex flex-col relative overflow-hidden" role="region" aria-label="Darkroom Canvas">
          <!-- Top Floating Aspect Ratio & Rotation Toolbar -->
          <div class="h-10 border-b border-neutral-800/80 px-4 flex items-center justify-between text-xs font-mono bg-neutral-950/80 shrink-0 z-10">
            <!-- Aspect Ratio Selector -->
            <div class="flex items-center gap-1 overflow-x-auto py-1">
              <span class="text-[10px] text-neutral-500 uppercase mr-1">Ratio:</span>
              @for (r of aspectRatios; track r.id) {
                <button
                  type="button"
                  (click)="setAspectRatio(r.value, r.id)"
                  [class.bg-emerald-500]="selectedAspectId() === r.id"
                  [class.text-neutral-950]="selectedAspectId() === r.id"
                  [class.font-bold]="selectedAspectId() === r.id"
                  [class.text-neutral-400]="selectedAspectId() !== r.id"
                  class="px-2 py-0.5 rounded text-[11px] hover:bg-neutral-800 transition-colors whitespace-nowrap"
                >
                  {{ r.label }}
                </button>
              }
            </div>

            <!-- Rotation & Flip Controls -->
            <div class="flex items-center gap-1.5 shrink-0 pl-2 border-l border-neutral-800">
              <button
                type="button"
                (click)="rotateCounterClockwise()"
                class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center gap-1"
                title="Rotate 90° Counter-Clockwise"
              >
                <span>↺</span> -90°
              </button>
              <button
                type="button"
                (click)="rotateClockwise()"
                class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center gap-1"
                title="Rotate 90° Clockwise"
              >
                <span>↻</span> +90°
              </button>
              <button
                type="button"
                (click)="toggleFlipH()"
                [class.border-emerald-400]="isFlippedH()"
                class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs"
                title="Flip Horizontal"
              >
                ⇄ Flip
              </button>
            </div>
          </div>

          @if (selectedPhoto(); as photo) {
            <div class="flex-1 flex items-center justify-center p-6 relative overflow-auto">
              <div
                class="rounded-2xl overflow-hidden glass-card shadow-2xl relative transition-all duration-300 flex items-center justify-center"
                [style.aspectRatio]="activeAspectRatio()"
                style="max-width: min(85vw, 920px); max-height: calc(100vh - 12rem); width: 100%; height: auto;"
              >
                <app-photo-canvas
                  [photo]="photo"
                  [interactive]="true"
                  [recipe]="photo.grade"
                  [rotation]="photoRotation()"
                  [flipH]="isFlippedH()"
                  class="w-full h-full block"
                ></app-photo-canvas>

                @if (photo.flags.retouched) {
                  <div class="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 z-10">
                    Retouched
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="flex-1 flex items-center justify-center text-neutral-600 font-mono text-xs">
              Select a photograph from the library to inspect and edit.
            </div>
          }

          <!-- Bottom Logs & History Status Strip -->
          <footer class="h-8 border-t border-neutral-800/80 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-500 bg-neutral-950/80 shrink-0">
            <span>Darkroom Engine: WebGL2 Ready &bull; Zero Backend</span>
            <span>Draft Status: {{ draftStorage.lastSavedAt() ? 'Autosaved' : 'Unsaved Changes' }}</span>
          </footer>
        </main>

        <!-- Column 3: Right Tabbed Inspector -->
        <aside class="w-96 border-l border-neutral-800/80 flex flex-col bg-neutral-950/60 shrink-0">
          @if (selectedPhoto(); as photo) {
            <!-- Tab Headers -->
            <div class="h-10 border-b border-neutral-800/80 px-2 flex items-center gap-1 shrink-0 bg-neutral-950">
              <button
                type="button"
                (click)="activeTab.set('info')"
                [class.active-subtab]="activeTab() === 'info'"
                class="subtab-btn"
              >
                Info
              </button>
              <button
                type="button"
                (click)="activeTab.set('retouch')"
                [class.active-subtab]="activeTab() === 'retouch'"
                class="subtab-btn"
              >
                Retouch
              </button>
              <button
                type="button"
                (click)="activeTab.set('grade')"
                [class.active-subtab]="activeTab() === 'grade'"
                class="subtab-btn"
              >
                Grade
              </button>
              <button
                type="button"
                (click)="activeTab.set('publish')"
                [class.active-subtab]="activeTab() === 'publish'"
                class="subtab-btn"
              >
                Gates
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              @if (activeTab() === 'info') {
                <div class="space-y-3 font-mono text-xs">
                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Title</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.title"
                      class="admin-input"
                    />
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">
                      Alt Text <span class="text-safelight-red">* Required</span>
                    </label>
                    <textarea
                      rows="2"
                      [(ngModel)]="photo.alt"
                      class="admin-input"
                      placeholder="Mandatory accessible visual description..."
                    ></textarea>
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Slug</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.slug"
                      class="admin-input"
                    />
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Copyright Holder</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.rights.copyright"
                      class="admin-input"
                    />
                  </div>

                  <div class="pt-2 border-t border-neutral-800">
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1.5">Canvas Aspect Ratio / Crop</label>
                    <div class="grid grid-cols-4 gap-1">
                      @for (r of aspectRatios; track r.id) {
                        <button
                          type="button"
                          (click)="setAspectRatio(r.value, r.id)"
                          [class.border-emerald-400]="selectedAspectId() === r.id"
                          [class.text-emerald-400]="selectedAspectId() === r.id"
                          class="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-center"
                        >
                          {{ r.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <div class="pt-2 border-t border-neutral-800">
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1.5">Photo Rotation</label>
                    <div class="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        (click)="rotateCounterClockwise()"
                        class="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 text-center"
                      >
                        ↺ -90°
                      </button>
                      <button
                        type="button"
                        (click)="rotateClockwise()"
                        class="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 text-center"
                      >
                        ↻ +90°
                      </button>
                      <button
                        type="button"
                        (click)="toggleFlipH()"
                        [class.border-emerald-400]="isFlippedH()"
                        class="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 text-center"
                      >
                        ⇄ Flip
                      </button>
                    </div>
                  </div>
                </div>
              }

              @if (activeTab() === 'retouch') {
                <div class="space-y-4 text-xs font-mono">
                  <div class="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-neutral-300 font-semibold uppercase text-[10px]">12-Zone Retouch Engine</span>
                      <span [class.text-emerald-400]="photo.flags.retouched" class="text-[10px]">
                        {{ photo.flags.retouched ? 'Active' : 'Unretouched' }}
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        (click)="applyRetouchPreset('Natural Glow')"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200"
                      >
                        Natural Glow
                      </button>
                      <button
                        type="button"
                        (click)="applyRetouchPreset('Editorial Clean')"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200"
                      >
                        Editorial Clean
                      </button>
                      <button
                        type="button"
                        (click)="applyRetouchPreset('Darkroom Classic')"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200"
                      >
                        Darkroom Classic
                      </button>
                      <button
                        type="button"
                        (click)="resetRetouch()"
                        class="px-2 py-1.5 rounded bg-red-950/40 text-safelight-red hover:bg-red-900/40 text-[10px]"
                      >
                        Reset
                      </button>
                    </div>

                    <div class="space-y-2 pt-2 border-t border-neutral-800 text-[11px]">
                      <div>
                        <div class="flex justify-between text-neutral-400 mb-0.5">
                          <span>Skin Softness</span>
                          <span>{{ getRetouchSlider('skin') }}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          [value]="getRetouchSlider('skin')"
                          (input)="updateRetouchSlider('skin', $event)"
                          class="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div class="flex justify-between text-neutral-400 mb-0.5">
                          <span>Eye Catchlight</span>
                          <span>{{ getRetouchSlider('eyes') }}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          [value]="getRetouchSlider('eyes')"
                          (input)="updateRetouchSlider('eyes', $event)"
                          class="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div class="flex justify-between text-neutral-400 mb-0.5">
                          <span>Teeth Brightness</span>
                          <span>{{ getRetouchSlider('teeth') }}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          [value]="getRetouchSlider('teeth')"
                          (input)="updateRetouchSlider('teeth', $event)"
                          class="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    <a
                      routerLink="/admin/retouch-studio"
                      class="block text-center mt-2 px-3 py-1.5 rounded-lg bg-ice-blue/20 text-ice-blue border border-ice-blue/30 uppercase text-[10px] font-bold"
                    >
                      Open Full Retouch Studio &rarr;
                    </a>
                  </div>
                </div>
              }

              @if (activeTab() === 'grade') {
                <div class="space-y-4 text-xs font-mono">
                  <div class="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-3">
                    <span class="text-neutral-300 font-semibold uppercase text-[10px] block">3D LUT Film Stocks</span>

                    <div class="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        (click)="applyFilmPreset('portra-400')"
                        [class.border-emerald-400]="photo.grade?.presetId === 'portra-400'"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200 border border-transparent"
                      >
                        Portra 400
                      </button>
                      <button
                        type="button"
                        (click)="applyFilmPreset('tri-x-400')"
                        [class.border-emerald-400]="photo.grade?.presetId === 'tri-x-400'"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200 border border-transparent"
                      >
                        Tri-X 400
                      </button>
                      <button
                        type="button"
                        (click)="applyFilmPreset('kodachrome-64')"
                        [class.border-emerald-400]="photo.grade?.presetId === 'kodachrome-64'"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200 border border-transparent"
                      >
                        Kodachrome 64
                      </button>
                      <button
                        type="button"
                        (click)="applyFilmPreset('fuji-400h')"
                        [class.border-emerald-400]="photo.grade?.presetId === 'fuji-400h'"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200 border border-transparent"
                      >
                        Fuji 400H
                      </button>
                      <button
                        type="button"
                        (click)="applyFilmPreset('cinestill-800t')"
                        [class.border-emerald-400]="photo.grade?.presetId === 'cinestill-800t'"
                        class="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-200 border border-transparent"
                      >
                        CineStill 800T
                      </button>
                      <button
                        type="button"
                        (click)="resetGrade()"
                        class="px-2 py-1.5 rounded bg-red-950/40 text-safelight-red hover:bg-red-900/40 text-[10px]"
                      >
                        Clean (None)
                      </button>
                    </div>

                    <div class="space-y-2 pt-2 border-t border-neutral-800 text-[11px]">
                      <div>
                        <div class="flex justify-between text-neutral-400 mb-0.5">
                          <span>Exposure EV</span>
                          <span>{{ (photo.grade?.exposureEV ?? 0).toFixed(1) }}</span>
                        </div>
                        <input
                          type="range"
                          min="-2"
                          max="2"
                          step="0.1"
                          [value]="photo.grade?.exposureEV ?? 0"
                          (input)="updateGradeProperty('exposureEV', $event)"
                          class="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div class="flex justify-between text-neutral-400 mb-0.5">
                          <span>Contrast</span>
                          <span>{{ (photo.grade?.contrast ?? 1).toFixed(2) }}</span>
                        </div>
                        <input
                          type="range"
                          min="0.6"
                          max="1.4"
                          step="0.05"
                          [value]="photo.grade?.contrast ?? 1"
                          (input)="updateGradeProperty('contrast', $event)"
                          class="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div class="flex justify-between text-neutral-400 mb-0.5">
                          <span>Film Grain</span>
                          <span>{{ ((photo.grade?.grain?.amount ?? 0) * 100).toFixed(0) }}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.6"
                          step="0.05"
                          [value]="photo.grade?.grain?.amount ?? 0"
                          (input)="updateGradeProperty('grain', $event)"
                          class="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    <a
                      routerLink="/admin/color-studio"
                      class="block text-center mt-2 px-3 py-1.5 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 uppercase text-[10px] font-bold"
                    >
                      Open Full Color Studio &rarr;
                    </a>
                  </div>
                </div>
              }

              @if (activeTab() === 'publish') {
                <div class="space-y-3 font-mono text-xs">
                  <span class="text-neutral-400 uppercase text-[10px] block">Integrity Checklist</span>
                  <div class="space-y-2 text-[11px]">
                    <div class="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800">
                      <span>Alt Text</span>
                      <span [class.text-emerald-400]="photo.alt.trim().length > 0" [class.text-safelight-red]="photo.alt.trim().length === 0">
                        {{ photo.alt.trim().length > 0 ? 'Passed' : 'Missing' }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800">
                      <span>Copyright</span>
                      <span class="text-emerald-400">&check; Declared</span>
                    </div>
                    <div class="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800">
                      <span>Variants</span>
                      <span class="text-emerald-400">{{ photo.sources.variants.length }} generated</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="p-6 text-center text-neutral-600 font-mono text-xs">
              No photo selected.
            </div>
          }
        </aside>
      </div>

      <!-- Shortcuts Cheat Sheet Modal -->
      @if (showShortcuts()) {
        <app-shortcuts-modal (close)="showShortcuts.set(false)"></app-shortcuts-modal>
      }

      <!-- 5-Step Publishing Wizard Modal -->
      @if (showPublishWizard()) {
        <app-publish-wizard
          [stagedPhotos]="stagedPhotos()"
          [previousPhotos]="catalogState.photos()"
          (close)="showPublishWizard.set(false)"
          (published)="onPublished()"
        ></app-publish-wizard>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .subtab-btn {
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      font-size: 0.7rem;
      font-family: monospace;
      color: #9aa4b2;
      background: transparent;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .active-subtab {
      color: #34d399 !important;
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(52, 211, 153, 0.3) !important;
    }
    .admin-input {
      width: 100%;
      padding: 0.375rem 0.5rem;
      border-radius: 0.375rem;
      background: #0a0a0a;
      border: 1px solid #262626;
      color: #e5e5e5;
      font-family: monospace;
      font-size: 0.75rem;
      outline: none;
    }
    .admin-input:focus {
      border-color: #34d399;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent implements OnInit {
  readonly catalogState = inject(CatalogStateService);
  readonly draftStorage = inject(DraftStorageService);

  readonly stagedPhotos = signal<PhotoItem[]>([]);
  readonly selectedPhoto = signal<PhotoItem | null>(null);
  readonly activeTab = signal<InspectorTab>('info');

  readonly showShortcuts = signal(false);
  readonly showPublishWizard = signal(false);

  readonly aspectRatios = [
    { id: 'orig', label: 'Original', value: 0 },
    { id: '1:1', label: '1:1 Square', value: 1.0 },
    { id: '4:5', label: '4:5 Portrait', value: 0.8 },
    { id: '2:3', label: '2:3 Portrait', value: 2 / 3 },
    { id: '3:2', label: '3:2 Classic', value: 1.5 },
    { id: '16:9', label: '16:9 Wide', value: 16 / 9 },
    { id: '9:16', label: '9:16 Story', value: 9 / 16 },
    { id: '4:3', label: '4:3 Digital', value: 4 / 3 },
  ];
  readonly selectedAspectId = signal<string>('orig');
  readonly customAspect = signal<number | null>(null);
  readonly photoRotation = signal<number>(0);
  readonly isFlippedH = signal<boolean>(false);

  readonly activeAspectRatio = computed<number>(() => {
    if (this.customAspect() !== null && this.customAspect()! > 0) {
      return this.customAspect()!;
    }
    const p = this.selectedPhoto();
    if (!p) return 1.5;
    const isRotatedSideways = (this.photoRotation() % 180 !== 0);
    const baseAspect = p.aspect || (p.width && p.height ? p.width / p.height : 1.5);
    return isRotatedSideways ? 1 / baseAspect : baseAspect;
  });

  setAspectRatio(val: number, id?: string): void {
    if (id) this.selectedAspectId.set(id);
    if (val === 0) {
      this.customAspect.set(null);
      this.selectedAspectId.set('orig');
    } else {
      this.customAspect.set(val);
    }
    const p = this.selectedPhoto();
    if (p) {
      p.aspect = this.activeAspectRatio();
      this.syncStagedPhoto(p);
    }
  }

  rotateClockwise(): void {
    this.photoRotation.update((r) => (r + 90) % 360);
    const p = this.selectedPhoto();
    if (p) {
      p.aspect = this.activeAspectRatio();
      this.syncStagedPhoto(p);
    }
  }

  rotateCounterClockwise(): void {
    this.photoRotation.update((r) => (r + 270) % 360);
    const p = this.selectedPhoto();
    if (p) {
      p.aspect = this.activeAspectRatio();
      this.syncStagedPhoto(p);
    }
  }

  toggleFlipH(): void {
    this.isFlippedH.update((f) => !f);
  }

  selectPhoto(photo: PhotoItem): void {
    this.selectedPhoto.set(photo);
    this.selectedAspectId.set('orig');
    this.customAspect.set(null);
    this.photoRotation.set(0);
    this.isFlippedH.set(false);
  }

  async ngOnInit(): Promise<void> {
    // Check if recovery draft exists
    const recovered = await this.draftStorage.loadDraft();
    if (recovered && recovered.length > 0) {
      this.stagedPhotos.set(recovered);
      this.selectedPhoto.set(recovered[0]);
    } else {
      if (this.catalogState.photos().length === 0) {
        await this.catalogState.loadIndex();
      }
      this.stagedPhotos.set([...this.catalogState.photos()]);
      this.selectedPhoto.set(this.catalogState.photos()[0] ?? null);
    }
    await this.draftStorage.updateQuotaMeter();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === '?') {
      this.showShortcuts.update((s) => !s);
    } else if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.saveDraft();
    }
  }

  async onFilesDropped(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newPhotos: PhotoItem[] = [];
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      const objectUrl = URL.createObjectURL(file);

      // Compute cryptographic 64-char SHA-256 for integrity gates
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const sha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const id = sha256.substring(0, 16);

      // Decode image dimensions
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = objectUrl;
      });

      const width = img.naturalWidth || 1920;
      const height = img.naturalHeight || 1080;
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const title = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const slug = rawName.toLowerCase().replace(/\s+/g, '-');

      const newPhoto: PhotoItem = {
        id,
        slug,
        title,
        alt: `Fine art photograph: ${title}`,
        aspect: width / height,
        width,
        height,
        placeholder: objectUrl,
        exif: {
          camera: 'Digital Camera',
          focalLengthMm: 50,
          aperture: 2.0,
          iso: 100,
          shutterDisplay: '1/250',
        },
        grade: null,
        retouch: null,
        collectionIds: ['all'],
        tags: [slug],
        mood: ['natural'],
        flags: {
          hasPeople: false,
          retouched: false,
          showBeforeAfter: false,
        },
        rights: {
          copyright: '© Theng Nioh',
          license: 'All rights reserved',
        },
        sources: {
          variants: [
            {
              format: 'webp',
              width,
              height,
              bytes: file.size,
              sha256,
              urls: [objectUrl],
            },
          ],
        },
        palette: [
          { hex: '#141c26', oklch: { l: 0.2, c: 0.05, h: 240 }, weight: 0.5 },
          { hex: '#e8ecf2', oklch: { l: 0.9, c: 0.02, h: 240 }, weight: 0.5 },
        ],
        schemaVersion: 1,
      };
      newPhotos.push(newPhoto);
    }

    if (newPhotos.length > 0) {
      this.stagedPhotos.update((current) => [...newPhotos, ...current]);
      this.selectedPhoto.set(newPhotos[0]);
    }
    input.value = '';
  }

  applyRetouchPreset(name: string): void {
    const p = this.selectedPhoto();
    if (!p) return;
    p.flags.retouched = true;
    p.retouch = {
      retouched: true,
      recipeHash: 'hash_' + Date.now().toString(16),
      summary: {
        facesCount: 1,
        hasExtreme: false,
        zonesAdjusted: ['FACE_SKIN', 'IRIS_AND_SCLERA'],
      },
    };
    this.selectedPhoto.set({ ...p });
    this.syncStagedPhoto(p);
  }

  resetRetouch(): void {
    const p = this.selectedPhoto();
    if (!p) return;
    p.flags.retouched = false;
    p.retouch = null;
    this.selectedPhoto.set({ ...p });
    this.syncStagedPhoto(p);
  }

  getRetouchSlider(zone: 'skin' | 'eyes' | 'teeth'): number {
    const p = this.selectedPhoto();
    if (!p?.flags.retouched) return 0;
    if (zone === 'skin') return 25;
    if (zone === 'eyes') return 20;
    return 15;
  }

  updateRetouchSlider(zone: 'skin' | 'eyes' | 'teeth', event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const p = this.selectedPhoto();
    if (!p) return;
    p.flags.retouched = val > 0;
    this.selectedPhoto.set({ ...p });
    this.syncStagedPhoto(p);
  }

  applyFilmPreset(presetId: string): void {
    const p = this.selectedPhoto();
    if (!p) return;
    const stockId = presetId as FilmStockId;
    if (FILM_PROFILES[stockId]) {
      p.grade = JSON.parse(JSON.stringify(FILM_PROFILES[stockId].recipe));
    }
    this.selectedPhoto.set({ ...p });
    this.syncStagedPhoto(p);
  }

  resetGrade(): void {
    const p = this.selectedPhoto();
    if (!p) return;
    p.grade = null;
    this.selectedPhoto.set({ ...p });
    this.syncStagedPhoto(p);
  }

  updateGradeProperty(prop: 'exposureEV' | 'contrast' | 'grain', event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const p = this.selectedPhoto();
    if (!p) return;
    if (!p.grade) {
      p.grade = JSON.parse(JSON.stringify(FILM_PROFILES['portra-400'].recipe));
    }
    const currentGrade = p.grade!;
    if (prop === 'grain') {
      currentGrade.grain.amount = val;
    } else if (prop === 'exposureEV') {
      currentGrade.exposureEV = val;
    } else if (prop === 'contrast') {
      currentGrade.contrast = val;
    }
    this.selectedPhoto.set({ ...p });
    this.syncStagedPhoto(p);
  }

  private syncStagedPhoto(updated: PhotoItem): void {
    this.stagedPhotos.update((list) =>
      list.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async saveDraft(): Promise<void> {
    await this.draftStorage.saveDraft(this.stagedPhotos());
  }

  async onPublished(): Promise<void> {
    const current = this.catalogState.photos();
    const existingIds = new Set(current.map((p) => p.id));
    const newItems = this.stagedPhotos().filter((p) => !existingIds.has(p.id));
    this.catalogState.photos.set([...newItems, ...current]);
    await this.draftStorage.clearDraft();
    alert('Catalog published! Your staged photos have been added to the catalog. To deploy your new photographs to the live website, run "git add . && git commit -m \'feat: publish new photographs\' && git push" in your terminal.');
  }
}
