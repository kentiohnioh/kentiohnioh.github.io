# Theng Nioh — Personal Photography Portfolio

> **Zero-cost-to-host personal photography portfolio & visual discovery platform.**  
> Built with modern zoneless Angular 21, WebGL2 hardware-accelerated color grading, client-side AVIF/WebP ladder compression, and dual-cloud static delivery.  
> Live at [https://thengnioh.github.io/](https://thengnioh.github.io/)

---

## Highlights & Features

### Public Visual Discovery
- **3 Fluid Gallery Modes**:
  - **Kinetic Sway Grid**: Editorial masonry grid with pointer-driven 3D gyro tilt and velocity smoothing.
  - **Spatial 2D Infinite Canvas**: Figma-style 2D pan/zoom with phyllotaxis spiral clustering and frustum culling.
  - **Darkroom Contact Sheet**: Film-strip proof layout with frame stamps (`01A`, `02A`) and a 2.5x circular optical magnifying loupe.
  - **Visual Zine (Story Mode)**: Horizontal editorial magazine with CSS scroll-snap and print layout.
- **Viewfinder Filter Dials**:
  - Mechanical camera dials with detent stops: Focal Length (`24mm` to `135mm+`), Aperture (`f/1.4` to `f/11+`), Shutter Speed, ISO, Atmosphere Mood, and OKLab $\Delta E$ color swatch resonance.
  - Live facet counts grey out zero-result combinations.
- **Photo Inspector (`/photo/:slug`)**:
  - Live 256-bin RGB and perceptual Luminance histogram with shadow crush & highlight clipping indicators.
  - Composition overlay: Rule of Thirds, Golden Ratio, Golden Spiral, and Estimated Lighting vector diagram.
  - Interactive Before/After Split-Loupe slider.
  - "Try My Colour Grade" booth: visitors can test the photo's 3D LUT recipe on a sample or their own local photo with 100% on-device privacy.
- **On-Device AI Vibe Search**:
  - Instant lexical matching ($< 1$ ms) combined with Int8-quantized semantic vector search.
  - "Why matched" reasoning chips.
- **Protected Delivery & Zero Raw `<img>` Tags**:
  - All public photos render directly to WebGL2 canvas textures from memory Blobs. Right-click deterrence and drag protection enforced.

### Local Admin Studio (`/admin`)
- **12-Zone Anatomical Retouch Engine**:
  - MediaPipe Vision FaceLandmarker (478 3D landmarks) producing 12 anatomical masks.
  - Partition of Unity normalizer ($\sum w_i = 1.000 \pm 0.004$) and $O(N)$ linear-time Guided Filter.
  - 19 sliders with natural ethics caps (skin smoothing capped at 60%, teeth/eye whitening at 50%).
- **Live 3D LUT Color Studio**:
  - 5 signature film stocks: Kodachrome 64, Portra 400, Tri-X 400, Fuji Pro 400H, CineStill 800T.
  - Public skin protection mask ensures portraits never shift to unnatural hues under extreme grades.
- **5-Step Publishing Wizard**:
  - Hard validation gates: blocks publish if any photo lacks accessible `alt` text or copyright.
  - Dual-cloud publishing (Hugging Face Datasets + jsDelivr mirror) with zero monthly cost ($0/month).
- **Physical Bundle Isolation**:
  - Admin studio, MediaPipe models, WASM encoders, and publish scripts are **100% tree-shaken and physically absent** from the production public build.

---

## Quick Start

### 1. Requirements
- Node.js &ge; 22 (tested on Node v24.13.0)
- npm &ge; 10 (tested on npm 11.6.2)

### 2. Installation
```bash
git clone https://github.com/thengnioh/thengnioh.github.io.git
cd thengnioh.github.io
npm ci
```

### 3. Running Locally
- **Public Portfolio (Production Preview)**:
  ```bash
  npm start # or: ng serve
  # Navigate to http://localhost:4200
  ```
- **Admin Darkroom Studio (Localhost Only)**:
  ```bash
  npm run start:admin # or: ng serve --configuration admin
  # Navigate to http://localhost:4200/admin
  ```

---

## Build & Test Commands

| Command | Purpose |
|:---|:---|
| `npm test` | Runs the full Vitest unit test suite (37 test suites, 171 tests) |
| `npm run build` | Builds the production public bundle (`dist/theng-nioh`) |
| `npm run build:admin` | Builds the admin bundle with local studio chunks |
| `npm run verify:bundle` | Asserts that zero admin chunks, MediaPipe, or encoders leak into public build |
| `npm run validate:catalog` | Validates `public/catalog/index.json` and shards against strict schema |
| `npm run scan:secrets` | Scans repository and outputs for leaked tokens or API keys |

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Architectural data flow diagrams and pipeline breakdown.
- [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md): WCAG 2.2 AA audit, keyboard maps, and screen-reader walkthroughs.
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md): Performance budgets, measured bundle sizes (73 KB gzip), and memory guards.
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md): Operations guide, fresh clone walkthrough, token security, and disaster recovery.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): Key architectural decisions and rationale.
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md): Honest capabilities, deterrence boundaries, and browser limitations.
- [`docs/EVAL_SEARCH.md`](docs/EVAL_SEARCH.md): 30-query retrieval benchmark (90.7% top-5 precision).
- [`docs/PROGRESS.md`](docs/PROGRESS.md): Verified progression log for Phases 0 through 10.
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md): Code standards and Definition of Done.

---

## License & Copyright

All photographic works &copy; Theng Nioh. All rights reserved.  
Source code released under the MIT License.
