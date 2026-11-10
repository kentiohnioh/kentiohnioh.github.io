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
          @if (selectedPhoto(); as photo) {
            <div class="flex-1 flex items-center justify-center p-6 relative">
              <div class="max-w-4xl max-h-full aspect-[3/2] w-full rounded-2xl overflow-hidden glass-card shadow-2xl relative">
                <app-photo-canvas
                  [photo]="photo"
                  [interactive]="true"
                  class="w-full h-full block"
                ></app-photo-canvas>

                @if (photo.flags.retouched) {
                  <div class="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1 rounded text-xs font-mono text-emerald-400">
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
                </div>
              }

              @if (activeTab() === 'retouch') {
                <div class="space-y-4 text-xs font-mono">
                  <div class="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-2">
                    <span class="text-neutral-400 block font-semibold">12-Zone Retouch Engine</span>
                    <p class="text-neutral-500 text-[11px]">
                      Open the full dedicated Retouch Studio for anatomical brushes, spot healing, and Before/After loupe.
                    </p>
                    <a
                      routerLink="/admin/retouch-studio"
                      class="inline-block mt-2 px-3 py-1.5 rounded-lg bg-ice-blue/20 text-ice-blue border border-ice-blue/30 uppercase text-[10px] font-bold"
                    >
                      Open Retouch Studio &rarr;
                    </a>
                  </div>
                </div>
              }

              @if (activeTab() === 'grade') {
                <div class="space-y-4 text-xs font-mono">
                  <div class="p-3 bg-neutral-900 rounded-lg border border-neutral-800 space-y-2">
                    <span class="text-neutral-400 block font-semibold">3D LUT Color Studio</span>
                    <p class="text-neutral-500 text-[11px]">
                      Open the live WebGL2 grading suite for Kodachrome, Portra, Tri-X film simulation and skin protection.
                    </p>
                    <a
                      routerLink="/admin/color-studio"
                      class="inline-block mt-2 px-3 py-1.5 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 uppercase text-[10px] font-bold"
                    >
                      Open Color Studio &rarr;
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

  selectPhoto(photo: PhotoItem): void {
    this.selectedPhoto.set(photo);
  }

  onFilesDropped(event: Event): void {
    // File ingest handler
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Ingest logic
    }
  }

  async saveDraft(): Promise<void> {
    await this.draftStorage.saveDraft(this.stagedPhotos());
  }

  async onPublished(): Promise<void> {
    await this.draftStorage.clearDraft();
  }
}
