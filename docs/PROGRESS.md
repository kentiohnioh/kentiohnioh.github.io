# Progress & Verification Log — Theng Nioh Photography Portfolio

## Phase 0: Constitution & Workspace Verification
- **Status**: Completed
- **Angular CLI**: v21.2.13
- **Node.js**: v24.13.0
- **npm**: v11.6.2
- **Zoneless Change Detection**: Verified active via `provideZonelessChangeDetection()`
- **Style System**: Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS design tokens
- **Unit Test Runner**: Vitest (`@angular/build:unit-test`)

---

## Phase 1: Foundation, Data Model, Build Configurations
- **Status**: Completed & Verified
- **Commit**: `e313025`

---

## Phase 2: Ingest, Compression and Dual-Cloud Storage
- **Status**: Completed & Verified
- **Commit**: `8ef55be`

---

## Phase 3: GPU Rendering Core and Public Delivery
- **Status**: Completed & Verified
- **Commit**: `93c0a32`

### What Was Built
1. **Single Shared WebGL2 Rendering Core** (`src/app/gpu/renderer/gpu-renderer.service.ts`):
   - Single shared context architecture preventing the 16-context browser limitation.
   - Standard unit quad geometry (VAO/VBO), uniform caching, and triangular PDF dithering to eliminate 8-bit quantization banding.
   - Immediate `bitmap.close()` disposal upon texture upload to ensure strict memory isolation.
   - Capability detection and graceful 2D-canvas degradation fallback.
   - `webglcontextlost` and `webglcontextrestored` event handlers with reactive state management (`isRestoring`).
2. **LRU Texture Cache with Byte Budgeting** (`src/app/gpu/renderer/texture-cache.ts`):
   - Strict GPU memory budgeting (default 256 MB desktop, 128 MB on mobile / low-memory devices).
   - Monotonic sequential operation counter for sub-millisecond LRU eviction order.
   - Optimal Level-of-Detail (LOD) variant selection algorithm matching $(onScreenWidth \times devicePixelRatio)$.
3. **GLSL Shaders** (`src/app/gpu/shaders/`):
   - `photo.vert.glsl`: Model-view-projection quad transform.
   - `photo.frag.glsl`: Linear light sampling, exposure compensation, triangular dithering, and subtle corner signature watermark.
4. **Accessible Ambient Glow System** (`src/app/core/services/ambient-glow.service.ts`):
   - Derives ambient blurred radial gradients from the active photo's dominant OKLCH palette.
   - Contrast clamp ($0.10 \le L \le 0.28$, $C \le 0.10$) guaranteeing WCAG 2.2 AA text contrast ratio $\ge 4.5:1$ against `#e8ecf2` body text.
   - Sets `--ambient-glow-1`, `--ambient-glow-2`, `--ambient-glow-3` on `:root`.
   - Motion safety: 600ms transitions disabled under `prefers-reduced-motion`.
5. **Protected Photo Surface (`PhotoCanvasComponent`)** (`src/app/shared/ui/photo-canvas/photo-canvas.component.ts`):
   - Zero `<img>` elements in public DOM: fetches raw bytes via `ImageSourceLoader` into `Blob` and renders directly via `GpuRendererService`.
   - Download deterrence: intercepting `contextmenu`, `dragstart`, `selectstart`, `-webkit-touch-callout: none`.
   - Rate-limited glass toast: *"© Theng Nioh — protected artwork. Contact me for licensing."*
   - Full accessibility: `role="img"`, `aria-label` from `photo.alt`, hidden long description for screen readers, keyboard focusable (`tabindex="0"`).
   - Real DOM captions and EXIF telemetry preserved for search indexability.

### Verification & Measured Evidence
- **Complete Test Suite**: `npm test` (`ng test --watch false`)
  - Result: **12 test files passed, 49 tests passed, 0 failures**
    - `texture-cache.spec.ts`: 2 passed (monotonic LRU eviction under budget cap, 4-tier LOD selection by DPR).
    - `ambient-glow.spec.ts`: 2 passed (WCAG 2.2 AA contrast ratio &ge; 4.5:1 verified mathematically against body text, CSS custom property formatting).
    - `gpu-renderer.spec.ts`: 2 passed (initialization capability detection, 2D canvas fallback path).
    - `image-source-loader.spec.ts`: 4 passed.
    - `catalog-state.spec.ts`: 8 passed.
    - `catalog-validator.spec.ts`: 15 passed.
    - `palette.spec.ts`: 4 passed.
    - `exif-normalizer.spec.ts`: 3 passed.
    - `content-address.spec.ts`: 3 passed.
    - `perceptual-metric.spec.ts`: 2 passed.
    - `migrations.spec.ts`: 2 passed.
    - `app.component.spec.ts`: 2 passed.
- **Zero `<img>` Elements Audit**:
  - Command: `Select-String -Path "src\app\features\**\*", "src\app\shared\**\*" -Pattern "<img"`
  - Result: **0 `<img>` elements** across all public gallery, inspector, and navigation views.
- **Production Build & Bundle Verification**:
  - `npm run build`: Compiled in 2.8s.
  - Initial JS Transfer Size: **70.13 KB gzipped** (well below the &le; 180 KB target).
  - Total JS Transfer Size: **87.1 KB gzipped**.
  - `node scripts/verify-bundle.mjs`: **PASS** (Zero admin chunks or forbidden tokens in public dist).
- **Admin Build**: `npm run build:admin`
  - Result: Compiled successfully with isolated admin chunks.

### Known Limitations
- Client-side download deterrence stops casual right-click and save shortcuts, but cannot prevent OS-level screen capture or DevTools network extraction (as documented in `docs/LIMITATIONS.md`).
- Hardware WebGL2 acceleration depends on client GPU support; systems without WebGL2 cleanly fall back to high-quality 2D canvas rendering with grading disabled.

---

## Phase 4: Retouch Engine I — Detection & 12 Masks
- **Status**: Completed & Verified

### What Was Built
1. **Strict 12-Zone Partition of Unity Normalizer** (`src/app/core/utils/mask-fusion.ts`):
   - Implements strict hierarchical priority order:
     1. Iris (`iris_l`, `iris_r`)
     2. Sclera (`sclera_l`, `sclera_r`)
     3. Teeth (`teeth`)
     4. Lips (`lips`)
     5. Eyebrows (`brow_l`, `brow_r`)
     6. Facial hair / stubble (`beard`)
     7. Hairline / scalp (`hair`)
     8. Skin (`skin`)
     9. Background / torso fallback (`background`)
   - Normalizes across all 12 zones so that $\sum_{i=1}^{12} w_i = 1.000 \pm 0.004$ at every single pixel.
   - Zero seam artifacts and zero halo accumulation across overlapping facial features.
2. **Subject-Relative Skin Model in OKLab** (`src/app/core/utils/skin-model.ts`):
   - Evaluates skin tones across Fitzpatrick scale I through VI.
   - Adaptive 2D Gaussian in OKLab color space $(a, b)$ relative to the detected subject's median skin chromaticity.
   - Mahalanobis distance metric ($D_M \le 3.0$) with soft Gaussian rolloff, robust to varying lighting conditions and ethnicities.
3. **Edge-Preserving Guided Filter** (`src/app/core/utils/guided-filter.ts`):
   - Pure algorithm implementation based on He, Sun & Tang ($O(N)$ linear time).
   - Fast separable box filter for moving average and covariance computation.
   - Refines MediaPipe polygon rasterizations against photo luminance edges, preserving hair strands, pores, and glasses rims without halos.
4. **Retouch Detection Engine Service** (`src/app/core/services/retouch-engine.service.ts`):
   - Admin-only service leveraging `@mediapipe/tasks-vision` `FaceLandmarker` with lazy dynamic import.
   - Derives all 12 zones from 478 landmarks (including iris points 468-477).
   - Downsamples to a maximum dimension of 1024px for swift sub-second mask extraction.
   - Exports the public skin protection mask (`exportSkinProtectionMask()`) as an 8-bit single-channel grayscale buffer.
5. **Interactive Mask Lab** (`src/app/features/admin/mask-lab/mask-lab.component.ts`):
   - Developer QA component at `/admin/mask-lab`.
   - File dropzone supporting drag-and-drop and sample selection.
   - Dual canvas rendering: side-by-side or overlay visualization of detected landmarks and individual zone masks with colored false-color overlays.
   - Real-time Partition of Unity integrity verification and zone coverage diagnostics.

### Verification & Measured Evidence
- **Complete Test Suite**: `npm test` (`ng test --watch false`)
  - Result: **15 test files passed, 57 tests passed, 0 failures**
    - `mask-fusion.spec.ts`: 3 passed (validates strict Partition of Unity $\sum w_i = 1.000 \pm 0.004$ across $256 \times 256$ pixels with random overlapping weights; tests priority suppression of skin beneath lips and irises).
    - `skin-model.spec.ts`: 3 passed (verifies correct classification across Fitzpatrick I-VI with Mahalanobis distance gating; rejects non-skin colors).
    - `guided-filter.spec.ts`: 2 passed (verifies edge-preserving smoothing across sharp step edges without halo artifacts).
- **Bundle Tree-Shaking & Isolation Verification**:
  - `npm run build`: Production build completed cleanly in 5.0s.
  - `node scripts/verify-bundle.mjs`: **PASS** (Zero admin chunks, zero `@mediapipe` references in public dist).
  - Production initial bundle: **70.30 KB gzipped** (well below budget of &le; 180 KB).
  - `npm run build:admin`: Admin build completed cleanly; admin chunks (`mask-lab-component`, 165 kB raw / 42 kB gzip) load strictly on lazy demand under `/admin/mask-lab`.

### Known Limitations
- MediaPipe FaceLandmarker requires WebAssembly and WebGL acceleration. In environments lacking SIMD/WASM support, detection fallback times may be increased.
- Extreme head poses exceeding 60 degrees yaw may yield partial landmark confidence, where fallback convex hulls are utilized.
