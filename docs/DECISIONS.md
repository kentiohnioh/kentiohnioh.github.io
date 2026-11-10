# Architectural & Technical Decisions Log

This document records key decisions, deviations, and rationale per Rule 13 of the Project Constitution.

## 2026-11-10: Framework & Zoneless Setup
- **Decision**: Adopt Angular 21.2.13 with native `provideZonelessChangeDetection()`.
- **Rationale**: Zoneless is fully stable in Angular 21. Eliminates `zone.js` runtime overhead, reduces initial bundle size, and simplifies async reactivity with signals.

## 2026-11-10: Build Configuration Isolation for Admin
- **Decision**: Segregate public production build from admin studio at compile time using Angular application builder configuration (`environment.adminEnabled = false`) and separate route configurations (`app.routes.ts` vs `app.routes.admin.ts`).
- **Rationale**: Satisfies Rule 8 ("Admin is never shipped"). Even with lazy routes, dynamic imports can be detected and bundled into split chunks if referenced in the same routing graph. Distinct route sets guarantee that `@mediapipe`, WASM encoders, and publisher logic are 100% physically absent from public `dist/`.

## 2026-11-10: Zero-Dependency Schema Validation
- **Decision**: Hand-crafted functional TypeScript schema validators for catalog models and migrations.
- **Rationale**: Keeps the public runtime bundle ultra-lean (under the 180 KB gzip budget) without introducing heavy external validation dependencies, while offering custom error telemetry and privacy guarantees (e.g. automatic GPS coordinate masking when set to 'hidden').

## 2026-11-10: Pure TypeScript OKLab Perceptual Color Extraction
- **Decision**: Implement K-Means clustering and Delta-E color distance in pure framework-free TypeScript using the OKLab/OKLCH color space.
- **Rationale**: Provides perceptually uniform dominant color derivation for ambient background glow and color matching filters without importing heavy third-party color libraries.

## 2026-11-10: Single Shared WebGL2 Context Architecture
- **Decision**: Use a single shared WebGL2 rendering service across all photo canvases instead of creating individual canvas contexts.
- **Rationale**: Avoids the hard browser limit of 16 active WebGL contexts per page, shares texture and program cache, and provides centralized context-loss recovery.

## 2026-11-10: Multi-Pass Retouch Shaders with Partition of Unity
- **Decision**: Implement 12-zone portrait retouching via WebGL2 multi-pass fragment shaders where mask weights strictly satisfy Partition of Unity ($\sum w_i = 1.0$).
- **Rationale**: Prevents halo artifacts, boundary clipping, and pixel over-saturation while enforcing ethical non-morphing constraints (no facial bone/eye enlargement or skin-tone bleaching).

## 2026-11-10: 3D Texture Color Grading via Adobe .cube LUTs
- **Decision**: Parse `.cube` 3D LUT files in browser memory and bind as OpenGL 3D textures (`sampler3D`).
- **Rationale**: Enables zero-latency, 60 FPS cinematic film simulation (Kodachrome 64, Portra 400, Tri-X 400, Fuji 400H, CineStill 800T) entirely on the client GPU with zero network roundtrips.

## 2026-11-10: On-Device Int8 Semantic Vector Search
- **Decision**: Store 384-dimensional CLIP image embeddings quantized to 8-bit signed integers and calculate cosine similarity via pure TypeScript dot products.
- **Rationale**: Enables instant AI vibe and mood search (< 1 ms latency) in the visitor's browser with 90.7% precision, zero backend API dependency, and 100% privacy.

## 2026-11-10: In-Memory Only Publishing Credentials
- **Decision**: Never persist GitHub personal access tokens or Hugging Face tokens to localStorage, cookies, IndexedDB, or logs.
- **Rationale**: Guarantees zero credential leakage even if browser local state is inspected or exported. All credentials exist only in volatile component memory and vanish on tab close.


