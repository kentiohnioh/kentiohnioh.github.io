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

### What Was Built
1. **Repository Layout & Architecture**:
   - `src/app/core/{models,services,utils,constants}`
   - `src/app/features/{gallery,inspector,zine,about,admin,not-found}`
   - `src/app/shared/{directives,pipes,ui}`
   - `public/catalog/{shards,embeddings}`
   - `scripts/{fetch-samples.mjs,validate-catalog.mjs,verify-bundle.mjs}`
   - `docs/{ARCHITECTURE.md,DECISIONS.md,LIMITATIONS.md,OPERATIONS.md,PROGRESS.md,SPIKES.md}`
2. **Dual Build Configurations (Rule 8 Enforced)**:
   - `production` (public): Admin routes and studio code are 100% tree-shaken and physically absent from `dist/theng-nioh/browser`.
   - `admin` (local studio only): Enables `/admin` route via `app.routes.admin.ts` and `environment.admin.ts`.
3. **Strict Data Models**:
   - `CatalogIndex`, `ShardRef`, `PhotoItem`, `PaletteSwatch`, `PhotoSources`, `ImageVariant`, `ExifTelemetry`, `ColorGradeRecipe`, `RetouchRecord`, `RetouchRecipe`, `MaskStroke`, `AnatomicalZoneId`, `ZineCollection`.
4. **Schema Safety & Privacy Enforcement**:
   - Zero-dependency `CatalogValidator` with strict negative checks.
   - Privacy gate: Automatically purges GPS coordinates whenever `precision === 'hidden'`.
   - Schema version migration chain (`migratePhotoItem`) upgrading legacy/v0 entries to schemaVersion 1.
   - Deterministic stable JSON serializer (`serializeStableJson`) ensuring clean, minimal Git diffs.
5. **Sharded Catalog & Sample Data**:
   - `scripts/fetch-samples.mjs`: Generated 10 CC0/Unsplash-licensed sample masterworks spanning diverse portraits (Fitzpatrick skin tones, wire-rimmed glasses, facial hair), architecture, street, macro nature, and night photography.
   - Initial shard: `public/catalog/shards/2026-11.json` with verified SHA-256.
   - Catalog index: `public/catalog/index.json`.
6. **Reactive State Management**:
   - `CatalogStateService`: Angular Signals for `photos`, `activeFilters`, `filteredPhotos` (computed), `galleryMode`, `selectedPhoto`, and shard loading states.
   - Full URL query parameter synchronization (`mode`, `collection`, `mood`, `tag`, `lens`, `people`, `retouched`, `q`).
7. **Personal Brand & Accessibility**:
   - Personal masthead "Theng Nioh" (no corporate/product branding).
   - About page with bio, licensing enquiry, and first-person voice ("my work", "contact me").
   - Protected artwork right-click deterrence with glass toast notifications.
   - GitHub Pages SPA 404 fallback and `.nojekyll` pipeline.

### Verification & Measured Evidence
- **Catalog Validation**: `node scripts/validate-catalog.mjs`
  - Result: `✅ CATALOG VALIDATION PASSED!` (10 validated photos, 1 verified shard, 0 schema violations, 0 duplicate slugs).
- **Unit Test Suite**: `npm test` (`ng test --watch false`)
  - Result: `Test Files: 4 passed (4), Tests: 27 passed (27)`
  - `migrations.spec.ts`: 2 tests passed (schema v0->v1 migration + deterministic key sorting).
  - `catalog-validator.spec.ts`: 15 tests passed (13 negative rejection cases + privacy GPS purge + valid case).
  - `catalog-state.spec.ts`: 8 tests passed (signals filtering, URL query sync, mock shard fetch).
  - `app.component.spec.ts`: 2 tests passed (masthead rendering & zoneless instantiation).
- **Production Bundle Verification**: `node scripts/verify-bundle.mjs`
  - Result: `✅ BUNDLE VERIFICATION PASSED!`
  - Initial JS Transfer Size: **81.4 KB gzipped** (well below the <= 180 KB target).
  - Zero admin chunks, zero occurrences of forbidden tokens (`admin`, `mediapipe`, `tasks-vision`, `jsquash`, `huggingface`) in the public bundle.
- **Admin Build**: `npm run build:admin`
  - Result: Compiled successfully; lazy `admin-shell-component` emitted as an isolated 1.88 kB chunk.

### Known Limitations
- Samples currently use SVG/placeholder data URIs pending Phase 2 Web Worker AVIF ingest and download pipeline.
- GitHub Pages CSP is delivered via meta tag since static Pages hosting does not allow custom HTTP response headers.
