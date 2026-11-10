# Operations & Publishing Guide

## Local Development
- Public site preview: `npm start` (or `ng serve`)
- Admin studio (local only): `npm run start:admin` (or `ng serve --configuration admin`)

## Ingest Pipeline (Admin Darkroom Studio)
1. Drop image files (JPEG, PNG, HEIC, WebP, AVIF) into the admin studio.
2. Ingest pipeline extracts EXIF via `exifr`, normalizes camera/lens telemetry, purges hidden GPS coordinates, and computes OKLCH palette swatches.
3. Automatically generates the 3-tier public resolution ladder:
   - 640 px long edge (&le; 35 KB)
   - 1280 px long edge (&le; 90 KB)
   - 2048 px long edge (&le; 180 KB)
4. Quality Guard enforces the perceptual floor (SSIM &ge; 0.985) via binary search.
5. Emits content-addressed files: `photos/YYYY-MM/<sha256-first-12>-<width>.<ext>`.

## Publishing & Dual-Cloud Replication
1. **Primary Target**: Hugging Face Dataset (`thengnioh/photography-archive`).
   - Token is input into volatile UI memory during active session; never stored in localStorage, cookies, or git.
2. **Secondary Mirror**: jsDelivr via dedicated GitHub repository (`thengnioh/thengnioh-photos`).
3. **Automated Verification**:
   ```bash
   node scripts/publish.mjs
   ```
   Verifies:
   - HTTP 200 status code
   - Matching `content-length`
   - Matching SHA-256 content hash
   - Valid `access-control-allow-origin` (CORS header)

## Disaster Recovery
- Site rebuildable completely from the Git repository alone.
- Original high-resolution masters live on the owner's primary machine + external backup.
- Storage URLs can be rewritten or remirrored to any S3-compatible provider (e.g. Cloudflare R2) without changing frontend application code.
