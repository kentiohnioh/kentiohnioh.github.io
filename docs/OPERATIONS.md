# Operations, Publishing & Disaster Recovery Guide

This operations guide defines the complete lifecycle for Theng Nioh's personal photography portfolio: from local raw file ingest to zero-cost dual-cloud publishing, token security, and disaster recovery.

---

## 1. Quick Start (Fresh Clone Walkthrough)

To rebuild and run the site from scratch:
```bash
# 1. Install dependencies
npm ci

# 2. Start the local admin studio (Admin build only)
npm run start:admin # or: ng serve --configuration admin

# 3. Open browser at http://localhost:4200/admin
```
The local admin studio lets you ingest raw photographs, retouch portraits with 12 anatomical masks, apply film stock color profiles, and run the 5-step Publishing Wizard with hard integrity gates.

To preview the production public site:
```bash
npm start # or: ng serve
```

---

## 2. Ingest & Processing Pipeline

1. **Drop Raw Photos**:
   - Supported inputs: Raw / JPEG / PNG / HEIC / WebP / AVIF.
   - EXIF telemetry is extracted via `exifr` and normalized into standard shutter, aperture, ISO, and lens records.
   - GPS coordinates are purged unless explicitly marked `precision: 'exact'` or `'approx'`. Default is strictly `'hidden'`.
2. **Resolution Ladder Generation**:
   - Generates 3 standard public variants:
     - `640px` long edge (&le; 35 KB)
     - `1280px` long edge (&le; 90 KB)
     - `2048px` long edge (&le; 180 KB)
   - Enforces the perceptual quality floor: **SSIM &ge; 0.985**.
3. **Palette & Dominant Mood**:
   - K-Means clustering in OKLab computes 5 dominant swatches with OKLCH coordinates.
   - Mood heuristics categorize lightness, contrast, saturation, and temperature.

---

## 3. Retouch & Color Grade Recovery from Recipes

Every retouched photo stores its parameters in standardized JSON records:
- **Retouch Recipe** (`RetouchRecipe`):
  - 19 sliders with natural ethics caps (skin smoothing capped at 60%, teeth/eye whitening at 50%).
  - Spot healing replacement patches with smoothstep falloff.
  - Manual brush strokes stored as normalized vector coordinates.
- **Color Grade Recipe** (`ColorGradeRecipe`):
  - Film stock profile (`Kodachrome 64`, `Portra 400`, `Tri-X 400`, `Fujifilm Pro 400H`, `CineStill 800T`).
  - Exposure, tone curve, split toning, luminance-weighted film grain, and skin protection mask.

**To re-run or batch re-apply recipes:**
- In `/admin/retouch-studio`, paste or load any saved JSON recipe. The WebGL2 pipeline reproduces the exact output pixel-for-pixel deterministically.
- In `/admin/color-studio`, recipes can be exported, copied, or batch-applied to entire collections.

---

## 4. Token Security & Rotation

- **Zero-Storage Policy**: Tokens (Hugging Face write tokens, GitHub Personal Access Tokens) are **NEVER** written to `localStorage`, `IndexedDB`, session cookies, Git commits, or logs.
- Tokens reside strictly in volatile component memory during the active browser session.
- Closing or refreshing the admin tab immediately purges tokens from memory.
- **Token Rotation**:
  1. Revoke the existing token in Hugging Face Settings -> Access Tokens or GitHub Settings -> Developer Settings -> Fine-grained tokens.
  2. Generate a new fine-grained token with scoped repository write permissions.
  3. Enter the new token in the volatile Publish Wizard input when executing remote deployment.

---

## 5. Storage Provider Migration

If Hugging Face Datasets or jsDelivr free-tier policies change, all image URLs can be migrated to any S3-compatible storage (e.g. Cloudflare R2, Backblaze B2, AWS S3) without changing frontend code:
1. Run the URL migration script:
   ```bash
   node scripts/migrate-storage.mjs --from="huggingface" --to="https://cdn.your-domain.com"
   ```
2. Verify all migrated URLs with:
   ```bash
   node scripts/publish.mjs
   ```
   Ensures HTTP 200, matching SHA-256 hashes, and valid CORS `Access-Control-Allow-Origin: *` headers.

---

## 6. Disaster Recovery & Zero-Loss Guarantees

1. **Git Repository is the Single Source of Truth**:
   - The GitHub repository `thengnioh.github.io` contains the entire public code, sharded catalog manifests (`public/catalog/index.json` and `shards/`), and vector search embeddings.
   - Cloning `main` to any fresh machine restores 100% of the site without external databases or server backends.
2. **Original Master Photographs**:
   - Original uncompressed camera master files are archived on the photographer's local workstation plus an external encrypted backup drive.
   - Master files never enter public distribution or web hosting targets.
3. **Crash Recovery**:
   - The local admin studio automatically saves in-progress edits to browser IndexedDB/localStorage. If the browser tab crashes or is closed, reopening `/admin` offers instant session restoration.
