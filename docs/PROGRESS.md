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

### What Was Built
1. **Mathematical Utilities & Core Algorithms**:
   - `src/app/core/utils/palette.ts`: sRGB to linear conversion, OKLab conversion, OKLCH conversion, K-Means clustering in OKLab space with outlier filtering (ignoring L < 0.06 and L > 0.96) to generate 5 weighted swatches.
   - `src/app/core/utils/perceptual-metric.ts`: Windowed Structural Similarity Index (SSIM) on luminance channels with configurable perceptual quality floor (`default floor >= 0.985`).
   - `src/app/core/utils/exif-normalizer.ts`: EXIF parser output normalization (exposure formatting: 0.004 -> "1/250", camera model deduplication, GPS privacy coordinate purging when precision is 'hidden').
   - `src/app/core/utils/content-address.ts`: SHA-256 computation, immutable path generator (`photos/YYYY-MM/<sha256-first-12>-<width>.<ext>`), and density-based sub-sharding (`photos/YYYY-MM/ab/...` for 5,000+ files).
   - `src/app/core/utils/mood-heuristics.ts`: Statistical image telemetry (mean luminance, contrast standard deviation, warmth, chroma) generating suggested mood tags.
2. **Public Failover Loader (`ImageSourceLoader`)**:
   - Input: ordered `urls[]` (primary Hugging Face, secondary jsDelivr mirror, tertiary R2).
   - Adaptive timeout: 1.5s on high-speed connections, 2.5s on slow/saveData connections.
   - Hedged request: Launches secondary mirror if primary does not return first byte within timeout.
   - AbortController cancellation: Aborts losing in-flight requests as soon as the first succeeds.
   - Provider health memory: Remembers failing provider host and deprioritizes it for 5 minutes (300,000 ms).
3. **Storage Provider Abstraction (Admin Studio Only)**:
   - `StorageProvider` interface (`put`, `exists`, `healthCheck`, `publicUrl`).
   - `HuggingFaceDatasetProvider`: Git LFS batch commit target with volatile in-memory token management (Rule 7).
   - `JsDelivrMirrorProvider`: Mirror provider utilizing dedicated GitHub photos repository (`thengnioh-photos`) served over jsDelivr global edge CDN.
   - `LocalFolderProvider`: File System Access API writing directly into local workspace clone.
4. **Publish & CORS Verification Tool**:
   - `scripts/publish.mjs`: Node 20+ pipeline verifying HTTP 200, matching `content-length`, matching SHA-256 hash, and valid `access-control-allow-origin` headers. Supports `--dry-run`.
5. **Admin Ingest Pipeline & Web Worker**:
   - `src/app/core/services/ingest-pipeline.ts`: 10-stage processing pipeline (read, SHA-256 hash, `createImageBitmap`, EXIF extraction, OKLab palette, ThumbHash placeholder, multi-resolution ladder 640/1280/2048px, quality guard binary search).
   - `src/app/core/workers/ingest.worker.ts`: Dedicated Web Worker wrapper communicating progress to admin UI.

### Verification & Measured Evidence
- **Complete Test Suite**: `npm test` (`ng test --watch false`)
  - Result: **9 test files passed, 43 tests passed, 0 failures**
    - `palette.spec.ts`: 4 passed (sRGB/linear accuracy, OKLab coordinates, roundtrip fidelity, 5-swatch K-Means extraction).
    - `perceptual-metric.spec.ts`: 2 passed (1.0000 on identical, degradation detection below floor).
    - `exif-normalizer.spec.ts`: 3 passed (shutter speed fractional formatting, camera model cleanup, GPS privacy purging).
    - `content-address.spec.ts`: 3 passed (SHA-256 consistency, monthly sharding pattern, density-based prefix splitting).
    - `image-source-loader.spec.ts`: 4 passed (primary load, 404 mirror failover, all-source failure rejection, provider health memory deprioritization).
    - `catalog-state.spec.ts`: 8 passed.
    - `catalog-validator.spec.ts`: 15 passed.
    - `migrations.spec.ts`: 2 passed.
    - `app.component.spec.ts`: 2 passed.
- **Publish Dry-Run**: `node scripts/publish.mjs --dry-run`
  - Result: Evaluated 30 variant URLs; 100% verified.
- **Production Build & Bundle Verification**:
  - `npm run build`: Compiled in 2.7s.
  - Initial JS Transfer Size: **69.87 KB gzipped**. Total JS: **81.4 KB gzipped** (&le; 180 KB target).
  - `node scripts/verify-bundle.mjs`: **PASS** (Zero admin code, MediaPipe, encoders, or hub client in public dist).
- **Admin Build**: `npm run build:admin`
  - Result: Compiled successfully with isolated admin chunks.

### Known Limitations
- Native AVIF canvas encoding is unsupported across several desktop browser releases; the pipeline feature-detects canvas AVIF capability and defaults to WebP when canvas AVIF encoding is unavailable.
