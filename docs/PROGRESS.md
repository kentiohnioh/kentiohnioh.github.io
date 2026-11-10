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
