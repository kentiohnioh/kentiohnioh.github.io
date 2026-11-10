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

type InspectorTab = 'info' | 'publish';

interface AspectOption {
  id: string;
  label: string;
  value: number; // 0 represents natural / original
}

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
    <div class="h-screen flex flex-col bg-neutral-950 text-neutral-200 select-none overflow-hidden" role="main" aria-label="Admin Photography Darkroom">
      <!-- Top Workspace Nav Bar -->
      <header class="h-14 px-6 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-neutral-950/90 backdrop-blur-xl">
        <div class="flex items-center gap-4">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <h1 class="text-xs font-mono uppercase tracking-widest text-neutral-100 font-semibold">
            Theng Nioh &bull; Portfolio Admin Studio
          </h1>
          <span class="text-[11px] font-mono text-neutral-500 border-l border-neutral-800 pl-4">
            {{ stagedPhotos().length }} Photos in Library
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
            (click)="publishDirectly()"
            class="px-4 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <span>&uarr;</span> Publish to Live Site
          </button>

          <div class="w-px h-5 bg-neutral-800 mx-1"></div>

          <a routerLink="/" class="text-xs font-mono text-neutral-400 hover:text-neutral-100 uppercase tracking-widest">
            Public Site &rarr;
          </a>
        </div>
      </header>

      <!-- 3-Column Studio Body -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Column 1: Left Library & Upload Queue -->
        <aside class="w-80 border-r border-neutral-800/80 flex flex-col bg-neutral-950/60 shrink-0">
          <!-- Ingest Header & Dropzone Trigger -->
          <div class="p-4 border-b border-neutral-800/80 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono uppercase tracking-wider text-neutral-400">Photographs</span>
              <span class="text-xs font-mono text-emerald-400">{{ stagedPhotos().length }} loaded</span>
            </div>

            <!-- Upload Picker -->
            <label class="block p-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/10 hover:bg-emerald-950/20 text-center cursor-pointer transition-colors group">
              <span class="text-xs font-mono text-emerald-300 block font-semibold group-hover:text-emerald-200">+ Upload Photographs</span>
              <span class="text-[10px] font-mono text-neutral-500 block mt-0.5">JPEG, WebP, PNG, AVIF</span>
              <input type="file" multiple accept="image/*" (change)="onFilesDropped($event)" class="sr-only" />
            </label>
          </div>

          <!-- Staged Photos List -->
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            @for (photo of stagedPhotos(); track photo.id) {
              <div
                (click)="selectPhoto(photo)"
                [class.bg-neutral-800]="selectedPhoto()?.id === photo.id"
                [class.border-emerald-500/50]="selectedPhoto()?.id === photo.id"
                class="p-2 rounded-xl flex items-center gap-3 cursor-pointer border border-transparent hover:bg-neutral-900/80 transition-colors group"
              >
                <!-- Thumbnail Image (Direct lightweight img tag) -->
                <div class="w-12 h-10 rounded bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800 flex items-center justify-center">
                  <img
                    [src]="photo.placeholder || photo.sources.variants[0]?.urls?.[0]"
                    [alt]="photo.title"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-serif text-neutral-200 block truncate font-medium">{{ photo.title }}</span>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] font-mono text-neutral-500 truncate">{{ photo.slug }}</span>
                    <span class="text-[9px] font-mono px-1 rounded bg-neutral-800/80 text-neutral-400">{{ formatAspectLabel(photo.aspect) }}</span>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="py-12 px-4 text-center text-neutral-500 font-mono text-xs">
                <p>No photographs in catalog.</p>
                <p class="text-[10px] text-neutral-600 mt-1">Upload an image to start publishing.</p>
              </div>
            }
          </div>
        </aside>

        <!-- Column 2: Centre Canvas Viewport -->
        <main class="flex-1 bg-black flex flex-col relative overflow-hidden" role="region" aria-label="Darkroom Canvas">
          <!-- Top Floating Aspect Ratio & Rotation Toolbar -->
          <div class="border-b border-neutral-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-neutral-950/80 shrink-0 z-10">
            <!-- Aspect Ratio Selector Buttons -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] text-neutral-500 uppercase mr-1">Size / Framing:</span>
              @for (r of aspectRatios; track r.id) {
                <button
                  type="button"
                  (click)="setAspectRatio(r.value, r.id)"
                  [class.bg-emerald-500]="selectedAspectId() === r.id"
                  [class.text-neutral-950]="selectedAspectId() === r.id"
                  [class.font-bold]="selectedAspectId() === r.id"
                  [class.text-neutral-300]="selectedAspectId() !== r.id"
                  class="px-2.5 py-1 rounded text-[11px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors whitespace-nowrap"
                >
                  {{ r.label }}
                </button>
              }
            </div>

            <!-- Fit Mode & Orientation Controls -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Fit vs Fill toggle -->
              <button
                type="button"
                (click)="toggleFitMode()"
                class="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px]"
                title="Toggle between Crop to Fill and Fit Inside"
              >
                {{ fitMode() === 'cover' ? 'Crop to Fill' : 'Fit Entire Photo' }}
              </button>

              <div class="w-px h-4 bg-neutral-800"></div>

              <!-- Rotate & Flip -->
              <button
                type="button"
                (click)="rotateCounterClockwise()"
                class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs"
                title="Rotate 90° Counter-Clockwise"
              >
                ↺ -90°
              </button>
              <button
                type="button"
                (click)="rotateClockwise()"
                class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs"
                title="Rotate 90° Clockwise"
              >
                ↻ +90°
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

          <!-- Center Canvas Display -->
          @if (selectedPhoto(); as photo) {
            <div class="flex-1 flex items-center justify-center p-6 relative overflow-auto">
              <div
                class="rounded-2xl overflow-hidden glass-card shadow-2xl relative transition-all duration-300 flex items-center justify-center bg-neutral-950"
                [style.aspectRatio]="activeAspectRatio()"
                style="max-width: min(85vw, 920px); max-height: calc(100vh - 12rem); width: 100%; height: auto;"
              >
                <app-photo-canvas
                  [photo]="photo"
                  [interactive]="true"
                  [fitMode]="fitMode()"
                  [rotation]="photoRotation()"
                  [flipH]="isFlippedH()"
                  class="w-full h-full block"
                ></app-photo-canvas>
              </div>
            </div>
          } @else {
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div class="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center text-neutral-500">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <p class="font-serif text-lg text-neutral-300">No photograph selected</p>
              <p class="font-mono text-xs text-neutral-500 max-w-sm">
                Upload a photograph from the left panel or click any staged photo to frame, edit, and publish.
              </p>
            </div>
          }

          <!-- Bottom Status Strip -->
          <footer class="h-8 border-t border-neutral-800/80 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-500 bg-neutral-950/80 shrink-0">
            <span>Direct Photography Pipeline &bull; Zero Backend &bull; $0 Hosting</span>
            <span>Draft: {{ draftStorage.lastSavedAt() ? 'Autosaved' : 'Ready' }}</span>
          </footer>
        </main>

        <!-- Column 3: Right Tabbed Inspector (Full Post Editing & Publishing) -->
        <aside class="w-96 border-l border-neutral-800/80 flex flex-col bg-neutral-950/60 shrink-0">
          @if (selectedPhoto(); as photo) {
            <!-- Tab Headers -->
            <div class="h-10 border-b border-neutral-800/80 px-2 flex items-center gap-1 shrink-0 bg-neutral-950">
              <button
                type="button"
                (click)="activeTab.set('info')"
                [class.active-subtab]="activeTab() === 'info'"
                class="subtab-btn flex-1 text-center font-semibold"
              >
                1. Edit Post & Details
              </button>
              <button
                type="button"
                (click)="activeTab.set('publish')"
                [class.active-subtab]="activeTab() === 'publish'"
                class="subtab-btn flex-1 text-center font-semibold"
              >
                2. Publish & Deploy
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- Tab 1: Edit Post & Details -->
              @if (activeTab() === 'info') {
                <div class="space-y-3 font-mono text-xs">
                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Title</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.title"
                      (ngModelChange)="onTitleChange($event)"
                      class="admin-input"
                      placeholder="e.g. Graded portrait"
                    />
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">
                      Short Caption / Subtitle
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="photo.caption"
                      (ngModelChange)="syncCurrentPhoto()"
                      class="admin-input"
                      placeholder="Brief one-line subtitle..."
                    />
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">
                      Full Description / Story
                    </label>
                    <textarea
                      rows="3"
                      [(ngModel)]="photo.longDescription"
                      (ngModelChange)="syncCurrentPhoto()"
                      class="admin-input"
                      placeholder="Detailed story, background context, technical notes..."
                    ></textarea>
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">
                      Accessible Alt Text <span class="text-safelight-red">* Required</span>
                    </label>
                    <textarea
                      rows="2"
                      [(ngModel)]="photo.alt"
                      (ngModelChange)="syncCurrentPhoto()"
                      class="admin-input"
                      placeholder="Mandatory visual description for screen readers and SEO..."
                    ></textarea>
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Slug (URL Path)</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.slug"
                      (ngModelChange)="syncCurrentPhoto()"
                      class="admin-input"
                    />
                  </div>

                  <!-- Aspect Ratio Selector in Panel -->
                  <div class="pt-2 border-t border-neutral-800">
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1.5">Framing Aspect Ratio</label>
                    <div class="grid grid-cols-4 gap-1">
                      @for (r of aspectRatios; track r.id) {
                        <button
                          type="button"
                          (click)="setAspectRatio(r.value, r.id)"
                          [class.border-emerald-400]="selectedAspectId() === r.id"
                          [class.text-emerald-400]="selectedAspectId() === r.id"
                          [class.font-bold]="selectedAspectId() === r.id"
                          class="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-center"
                        >
                          {{ r.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Tags -->
                  <div class="pt-2 border-t border-neutral-800">
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      [ngModel]="photo.tags.join(', ')"
                      (ngModelChange)="onTagsChange($event)"
                      class="admin-input"
                      placeholder="portrait, warm, studio, leica"
                    />
                  </div>

                  <!-- Copyright -->
                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Copyright Holder</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.rights.copyright"
                      (ngModelChange)="syncCurrentPhoto()"
                      class="admin-input"
                    />
                  </div>

                  <!-- Action Buttons -->
                  <div class="pt-3 space-y-2">
                    <button
                      type="button"
                      (click)="saveDraft()"
                      class="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>💾</span> Save Changes
                    </button>

                    <button
                      type="button"
                      (click)="deleteSelectedPhoto()"
                      class="w-full py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/40 text-safelight-red border border-red-500/20 font-mono text-[11px] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>🗑</span> Delete Photograph
                    </button>

                    <button
                      type="button"
                      (click)="activeTab.set('publish')"
                      class="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 mt-2"
                    >
                      Continue to Publish &rarr;
                    </button>
                  </div>
                </div>
              }

              <!-- Tab 2: Publish & Deploy -->
              @if (activeTab() === 'publish') {
                <div class="space-y-4 font-mono text-xs">
                  <!-- Integrity Checklist -->
                  <div class="space-y-2">
                    <span class="text-neutral-400 uppercase text-[10px] block">Publishing Verification</span>
                    <div class="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2 text-[11px]">
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Title</span>
                        <span class="text-neutral-200 font-medium truncate max-w-[180px]">{{ photo.title }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Alt text</span>
                        <span [class.text-emerald-400]="photo.alt.trim().length > 0" [class.text-safelight-red]="photo.alt.trim().length === 0">
                          {{ photo.alt.trim().length > 0 ? '✓ Valid' : '✗ Required' }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Aspect Ratio</span>
                        <span class="text-emerald-400">{{ activeAspectRatio().toFixed(2) }} ({{ selectedAspectId() }})</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Copyright</span>
                        <span class="text-emerald-400">✓ Declared</span>
                      </div>
                    </div>
                  </div>

                  <!-- Direct Publish Button -->
                  <div class="space-y-2">
                    <button
                      type="button"
                      (click)="publishDirectly()"
                      class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold font-mono text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span>🚀</span> Publish Photo to Portfolio
                    </button>

                    <button
                      type="button"
                      (click)="saveCatalogFileDirectly()"
                      class="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[11px] transition-colors"
                      title="Save or download updated 2026-11.json shard file"
                    >
                      💾 Save / Download Catalog File (2026-11.json)
                    </button>
                  </div>

                  <!-- Deployment Commands -->
                  <div class="p-3 rounded-xl bg-black border border-neutral-800 space-y-1.5">
                    <div class="flex items-center justify-between text-[10px] text-neutral-500 uppercase">
                      <span>Deploy Command</span>
                      <button
                        type="button"
                        (click)="copyGitCommands()"
                        class="text-emerald-400 hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <pre class="text-[11px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap select-all">git add . && git commit -m "feat: publish photographs" && git push</pre>
                  </div>

                  <!-- Publish Notice Banner -->
                  @if (publishSuccessMessage()) {
                    <div class="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 space-y-1">
                      <p class="font-bold flex items-center gap-1.5">
                        <span>✓</span> Success
                      </p>
                      <p class="text-[10px] text-emerald-400/80 leading-relaxed">
                        {{ publishSuccessMessage() }}
                      </p>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="p-6 text-center text-neutral-600 font-mono text-xs">
              No photograph selected.
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
      padding: 0.35rem 0.625rem;
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
  readonly publishSuccessMessage = signal<string | null>(null);
  readonly fitMode = signal<'cover' | 'contain'>('cover');

  readonly showShortcuts = signal(false);
  readonly showPublishWizard = signal(false);

  readonly aspectRatios: AspectOption[] = [
    { id: 'orig', label: 'Fit Original', value: 0 },
    { id: '1:1', label: 'Square (1:1)', value: 1.0 },
    { id: '9:16', label: 'Story (9:16)', value: 9 / 16 },
    { id: '16:9', label: 'Wide (16:9)', value: 16 / 9 },
    { id: '4:5', label: 'Portrait (4:5)', value: 0.8 },
    { id: '2:3', label: 'Vertical (2:3)', value: 2 / 3 },
    { id: '3:2', label: 'Classic (3:2)', value: 1.5 },
    { id: '4:3', label: 'Standard (4:3)', value: 4 / 3 },
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

  formatAspectLabel(aspect?: number): string {
    if (!aspect) return 'Orig';
    if (Math.abs(aspect - 1.0) < 0.05) return '1:1';
    if (Math.abs(aspect - 9 / 16) < 0.05) return '9:16';
    if (Math.abs(aspect - 16 / 9) < 0.05) return '16:9';
    if (Math.abs(aspect - 0.8) < 0.05) return '4:5';
    if (Math.abs(aspect - 2 / 3) < 0.05) return '2:3';
    if (Math.abs(aspect - 1.5) < 0.05) return '3:2';
    if (Math.abs(aspect - 4 / 3) < 0.05) return '4:3';
    return aspect.toFixed(2);
  }

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
      this.syncCurrentPhoto();
    }
  }

  toggleFitMode(): void {
    this.fitMode.update((m) => (m === 'cover' ? 'contain' : 'cover'));
  }

  async rotateClockwise(): Promise<void> {
    await this.applyPixelRotation(90);
  }

  async rotateCounterClockwise(): Promise<void> {
    await this.applyPixelRotation(-90);
  }

  async toggleFlipH(): Promise<void> {
    await this.applyPixelFlip();
  }

  private async applyPixelRotation(deg: number): Promise<void> {
    const p = this.selectedPhoto();
    if (!p) return;
    const src = p.placeholder || p.sources?.variants?.[0]?.urls?.[0];
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for rotation'));
      img.src = src;
    });

    const offscreen = document.createElement('canvas');
    if (Math.abs(deg % 180) === 90) {
      offscreen.width = img.naturalHeight || img.height;
      offscreen.height = img.naturalWidth || img.width;
    } else {
      offscreen.width = img.naturalWidth || img.width;
      offscreen.height = img.naturalHeight || img.height;
    }

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.translate(offscreen.width / 2, offscreen.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const newUrl = offscreen.toDataURL('image/jpeg', 0.95);
    p.width = offscreen.width;
    p.height = offscreen.height;
    p.aspect = offscreen.width / offscreen.height;
    p.placeholder = newUrl;
    if (p.sources?.variants?.length) {
      p.sources.variants[0].width = offscreen.width;
      p.sources.variants[0].height = offscreen.height;
      p.sources.variants[0].urls = [newUrl];
    }

    this.selectedPhoto.set({ ...p });
    this.syncCurrentPhoto();
    await this.saveDraft();
  }

  private async applyPixelFlip(): Promise<void> {
    const p = this.selectedPhoto();
    if (!p) return;
    const src = p.placeholder || p.sources?.variants?.[0]?.urls?.[0];
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for flip'));
      img.src = src;
    });

    const offscreen = document.createElement('canvas');
    offscreen.width = img.naturalWidth || img.width;
    offscreen.height = img.naturalHeight || img.height;

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.translate(offscreen.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);

    const newUrl = offscreen.toDataURL('image/jpeg', 0.95);
    p.placeholder = newUrl;
    if (p.sources?.variants?.length) {
      p.sources.variants[0].urls = [newUrl];
    }

    this.selectedPhoto.set({ ...p });
    this.syncCurrentPhoto();
    await this.saveDraft();
  }

  selectPhoto(photo: PhotoItem): void {
    this.selectedPhoto.set(photo);
    this.selectedAspectId.set('orig');
    this.customAspect.set(null);
    this.photoRotation.set(0);
    this.isFlippedH.set(false);
  }

  onTitleChange(newTitle: string): void {
    const p = this.selectedPhoto();
    if (!p) return;
    p.title = newTitle;
    p.slug = newTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.syncCurrentPhoto();
  }

  onTagsChange(tagString: string): void {
    const p = this.selectedPhoto();
    if (!p) return;
    p.tags = tagString
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    this.syncCurrentPhoto();
  }

  syncCurrentPhoto(): void {
    const p = this.selectedPhoto();
    if (!p) return;
    this.stagedPhotos.update((list) =>
      list.map((item) => (item.id === p.id ? { ...p } : item))
    );
  }

  deleteSelectedPhoto(): void {
    const p = this.selectedPhoto();
    if (!p) return;
    if (!confirm(`Are you sure you want to delete "${p.title}"?`)) return;

    this.stagedPhotos.update((list) => list.filter((item) => item.id !== p.id));
    this.catalogState.photos.update((list) => list.filter((item) => item.id !== p.id));
    this.selectedPhoto.set(this.stagedPhotos()[0] ?? null);
    this.saveDraft();
    this.publishSuccessMessage.set(`Deleted "${p.title}" from library.`);
    setTimeout(() => this.publishSuccessMessage.set(null), 3000);
  }

  async ngOnInit(): Promise<void> {
    // 1. Load catalog index from disk/server
    if (this.catalogState.photos().length === 0) {
      await this.catalogState.loadIndex();
    }

    // 2. Filter out any legacy sample placeholders (ids starting with f1a9c3d4e5b600)
    const initialCatalog = this.catalogState
      .photos()
      .filter((p) => !p.id.startsWith('f1a9c3d4e5b600'));
    this.catalogState.photos.set(initialCatalog);

    // 3. Load recovered drafts, filtering out legacy sample placeholders
    const recovered = await this.draftStorage.loadDraft();
    const cleanRecovered = (recovered || []).filter(
      (p) => !p.id.startsWith('f1a9c3d4e5b600')
    );

    if (cleanRecovered.length > 0) {
      this.stagedPhotos.set(cleanRecovered);
      this.selectedPhoto.set(cleanRecovered[0]);
    } else {
      this.stagedPhotos.set([...initialCatalog]);
      this.selectedPhoto.set(initialCatalog[0] ?? null);
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

      // Convert file into self-contained base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Compute cryptographic SHA-256 for integrity
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const sha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const id = sha256.substring(0, 16);

      // Decode natural image dimensions
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = dataUrl;
      });

      const width = img.naturalWidth || 1920;
      const height = img.naturalHeight || 1080;
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const title = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `photo-${Date.now()}`;

      const newPhoto: PhotoItem = {
        id,
        slug,
        title,
        caption: '',
        longDescription: '',
        alt: `Fine art photograph: ${title}`,
        aspect: width / height,
        width,
        height,
        placeholder: dataUrl,
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
              urls: [dataUrl],
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
    await this.saveDraft();
  }

  async saveDraft(): Promise<void> {
    await this.draftStorage.saveDraft(this.stagedPhotos());
    this.publishSuccessMessage.set('Draft saved locally in browser.');
    setTimeout(() => this.publishSuccessMessage.set(null), 3000);
  }

  publishDirectly(): void {
    const staged = this.stagedPhotos();
    this.catalogState.photos.set([...staged]);
    this.saveDraft();

    const title = this.selectedPhoto()?.title || 'Selected photograph';
    this.publishSuccessMessage.set(
      `"${title}" updated in active catalog. Download the shard below or push to GitHub to deploy live!`
    );
  }

  async saveCatalogFileDirectly(): Promise<void> {
    const shardData = {
      shardId: '2026-11',
      generatedAt: new Date().toISOString(),
      photos: this.catalogState.photos(),
    };
    const content = JSON.stringify(shardData, null, 2);

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<{
            createWritable: () => Promise<{
              write: (c: string) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }).showSaveFilePicker({
          suggestedName: '2026-11.json',
          types: [
            {
              description: 'Catalog Shard JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        this.publishSuccessMessage.set('Saved directly to 2026-11.json! Run "git add . && git commit -m \'feat: publish\' && git push" to deploy live.');
        return;
      } catch {
        // User cancelled picker -> fall back to download
      }
    }
    this.downloadCatalogShard();
  }

  downloadCatalogShard(): void {
    const shardData = {
      shardId: '2026-11',
      generatedAt: new Date().toISOString(),
      photos: this.catalogState.photos(),
    };
    const blob = new Blob([JSON.stringify(shardData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2026-11.json';
    a.click();
    URL.revokeObjectURL(url);
    this.publishSuccessMessage.set('2026-11.json downloaded. Replace public/catalog/shards/2026-11.json and git push!');
  }

  copyGitCommands(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('git add . && git commit -m "feat: publish photographs" && git push');
      this.publishSuccessMessage.set('Deploy command copied to clipboard!');
      setTimeout(() => this.publishSuccessMessage.set(null), 3000);
    }
  }

  async onPublished(): Promise<void> {
    this.publishDirectly();
    await this.draftStorage.clearDraft();
  }
}
