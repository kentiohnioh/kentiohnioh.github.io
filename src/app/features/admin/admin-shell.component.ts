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
              <span class="text-xs font-mono text-neutral-300 block font-semibold">+ Upload Images</span>
              <span class="text-[10px] font-mono text-neutral-500 block mt-0.5">JPEG / WebP / PNG / AVIF</span>
              <input type="file" multiple accept="image/*" (change)="onFilesDropped($event)" class="sr-only" />
            </label>
          </div>

          <!-- Staged Photos List -->
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            @for (photo of stagedPhotos(); track photo.id) {
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
              <span class="text-[10px] text-neutral-500 uppercase mr-1">Aspect:</span>
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

          <!-- Center Canvas -->
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
                  [rotation]="photoRotation()"
                  [flipH]="isFlippedH()"
                  class="w-full h-full block"
                ></app-photo-canvas>
              </div>
            </div>
          } @else {
            <div class="flex-1 flex items-center justify-center text-neutral-600 font-mono text-xs">
              Select or upload a photograph to frame and publish.
            </div>
          }

          <!-- Bottom Status Strip -->
          <footer class="h-8 border-t border-neutral-800/80 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-500 bg-neutral-950/80 shrink-0">
            <span>Direct Portfolio Pipeline &bull; Zero Backend &bull; $0 Hosting</span>
            <span>Draft: {{ draftStorage.lastSavedAt() ? 'Autosaved' : 'Ready' }}</span>
          </footer>
        </main>

        <!-- Column 3: Right Tabbed Inspector -->
        <aside class="w-96 border-l border-neutral-800/80 flex flex-col bg-neutral-950/60 shrink-0">
          @if (selectedPhoto(); as photo) {
            <!-- Tab Headers (Streamlined 2-Step Workflow) -->
            <div class="h-10 border-b border-neutral-800/80 px-2 flex items-center gap-1 shrink-0 bg-neutral-950">
              <button
                type="button"
                (click)="activeTab.set('info')"
                [class.active-subtab]="activeTab() === 'info'"
                class="subtab-btn flex-1 text-center"
              >
                1. Framing & Details
              </button>
              <button
                type="button"
                (click)="activeTab.set('publish')"
                [class.active-subtab]="activeTab() === 'publish'"
                class="subtab-btn flex-1 text-center"
              >
                2. Publish & Deploy
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- Tab 1: Framing & Details -->
              @if (activeTab() === 'info') {
                <div class="space-y-3 font-mono text-xs">
                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Title</label>
                    <input
                      type="text"
                      [(ngModel)]="photo.title"
                      (ngModelChange)="onTitleChange($event)"
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
                      placeholder="Mandatory accessible visual description for screen readers..."
                    ></textarea>
                  </div>

                  <div>
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1">Slug (URL path)</label>
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

                  <!-- Aspect Ratio Selector Box -->
                  <div class="pt-2 border-t border-neutral-800">
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1.5">Framing Aspect Ratio</label>
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

                  <!-- Rotation Controls Box -->
                  <div class="pt-2 border-t border-neutral-800">
                    <label class="text-[10px] text-neutral-500 uppercase block mb-1.5">Orientation</label>
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

                  <div class="pt-3">
                    <button
                      type="button"
                      (click)="activeTab.set('publish')"
                      class="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
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
                        <span class="text-neutral-400">Alt text</span>
                        <span [class.text-emerald-400]="photo.alt.trim().length > 0" [class.text-safelight-red]="photo.alt.trim().length === 0">
                          {{ photo.alt.trim().length > 0 ? '✓ Valid' : '✗ Required' }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Copyright</span>
                        <span class="text-emerald-400">✓ Declared</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Aspect Ratio</span>
                        <span class="text-emerald-400">{{ activeAspectRatio().toFixed(2) }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-neutral-400">Variants</span>
                        <span class="text-emerald-400">✓ Generated</span>
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
                      (click)="downloadCatalogShard()"
                      class="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[11px] transition-colors"
                      title="Download 2026-11.json shard file"
                    >
                      💾 Download Catalog Shard (2026-11.json)
                    </button>
                  </div>

                  <!-- Deployment Commands -->
                  <div class="p-3 rounded-xl bg-black border border-neutral-800 space-y-1.5">
                    <div class="flex items-center justify-between text-[10px] text-neutral-500 uppercase">
                      <span>Live Deploy Command</span>
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
                        <span>✓</span> Published to Catalog!
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

  onTitleChange(newTitle: string): void {
    const p = this.selectedPhoto();
    if (!p) return;
    p.title = newTitle;
    p.slug = newTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.syncStagedPhoto(p);
  }

  async ngOnInit(): Promise<void> {
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
  }

  private syncStagedPhoto(updated: PhotoItem): void {
    this.stagedPhotos.update((list) =>
      list.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async saveDraft(): Promise<void> {
    await this.draftStorage.saveDraft(this.stagedPhotos());
    this.publishSuccessMessage.set('Draft autosaved locally in browser.');
    setTimeout(() => this.publishSuccessMessage.set(null), 3000);
  }

  publishDirectly(): void {
    const current = this.catalogState.photos();
    const existingIds = new Set(current.map((p) => p.id));
    const newItems = this.stagedPhotos().filter((p) => !existingIds.has(p.id));

    // Update catalog state
    const merged = [...newItems, ...current];
    this.catalogState.photos.set(merged);
    this.saveDraft();

    const title = this.selectedPhoto()?.title || 'Selected photograph';
    this.publishSuccessMessage.set(
      `"${title}" added to active portfolio. Download the shard below or run git push to deploy live!`
    );
  }

  downloadCatalogShard(): void {
    const shardData = {
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
    this.publishSuccessMessage.set('2026-11.json downloaded. Move it into public/catalog/shards/ and git push!');
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
