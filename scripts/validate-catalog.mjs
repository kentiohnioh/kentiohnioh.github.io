import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CATALOG_INDEX_PATH = path.resolve('public', 'catalog', 'index.json');

console.log('===> Validating catalog schema integrity...');

if (!fs.existsSync(CATALOG_INDEX_PATH)) {
  console.error(`ERROR: Catalog index file not found at: ${CATALOG_INDEX_PATH}`);
  process.exit(1);
}

let indexRaw;
try {
  indexRaw = JSON.parse(fs.readFileSync(CATALOG_INDEX_PATH, 'utf-8'));
} catch (e) {
  console.error(`ERROR: Failed to parse index.json: ${e.message}`);
  process.exit(1);
}

const errors = [];

// Validate Index
if (typeof indexRaw.schemaVersion !== 'number' || indexRaw.schemaVersion < 1) {
  errors.push('index.json: schemaVersion must be >= 1');
}
if (!indexRaw.generatedAt || isNaN(Date.parse(indexRaw.generatedAt))) {
  errors.push('index.json: generatedAt must be a valid ISO date');
}
if (typeof indexRaw.totalPhotos !== 'number' || indexRaw.totalPhotos < 0) {
  errors.push('index.json: totalPhotos must be a non-negative number');
}
if (!Array.isArray(indexRaw.shards) || indexRaw.shards.length === 0) {
  errors.push('index.json: shards must contain at least one shard reference');
}

const seenPhotoIds = new Set();
const seenSlugs = new Set();
let aggregatedPhotoCount = 0;

for (const shardRef of indexRaw.shards || []) {
  const shardRelPath = shardRef.url;
  const shardAbsPath = path.resolve('public', shardRelPath);

  if (!fs.existsSync(shardAbsPath)) {
    errors.push(`Shard file missing: ${shardRelPath} (resolved: ${shardAbsPath})`);
    continue;
  }

  const rawContent = fs.readFileSync(shardAbsPath, 'utf-8');
  const actualHash = crypto.createHash('sha256').update(rawContent).digest('hex');

  if (actualHash !== shardRef.sha256) {
    errors.push(
      `Shard ${shardRef.id} SHA-256 mismatch! Expected: ${shardRef.sha256}, Actual: ${actualHash}`
    );
  }

  let shardData;
  try {
    shardData = JSON.parse(rawContent);
  } catch (e) {
    errors.push(`Failed to parse shard JSON at ${shardRelPath}: ${e.message}`);
    continue;
  }

  if (shardData.shardId !== shardRef.id) {
    errors.push(`Shard id mismatch inside file: expected ${shardRef.id}, got ${shardData.shardId}`);
  }
  if (!Array.isArray(shardData.photos)) {
    errors.push(`Shard ${shardRef.id}: photos must be an array`);
    continue;
  }
  if (shardData.photos.length !== shardRef.count) {
    errors.push(
      `Shard ${shardRef.id}: photo count (${shardData.photos.length}) does not match shardRef.count (${shardRef.count})`
    );
  }

  aggregatedPhotoCount += shardData.photos.length;

  shardData.photos.forEach((photo, idx) => {
    const loc = `Shard ${shardRef.id} [Photo ${idx} / ${photo.id || 'unidentified'}]`;

    if (!photo.id || typeof photo.id !== 'string') errors.push(`${loc}: id is missing or non-string`);
    if (!photo.slug || typeof photo.slug !== 'string') errors.push(`${loc}: slug is missing or non-string`);
    if (!photo.title || typeof photo.title !== 'string') errors.push(`${loc}: title is missing`);
    if (!photo.alt || typeof photo.alt !== 'string' || photo.alt.trim() === '') {
      errors.push(`${loc}: alt text is MANDATORY and cannot be empty`);
    }

    if (typeof photo.width !== 'number' || photo.width <= 0) errors.push(`${loc}: width <= 0`);
    if (typeof photo.height !== 'number' || photo.height <= 0) errors.push(`${loc}: height <= 0`);
    if (typeof photo.aspect !== 'number' || photo.aspect <= 0) errors.push(`${loc}: aspect <= 0`);

    if (!photo.placeholder || typeof photo.placeholder !== 'string') {
      errors.push(`${loc}: placeholder must be a valid non-empty string`);
    }

    // Palette validation
    if (!Array.isArray(photo.palette) || photo.palette.length === 0) {
      errors.push(`${loc}: palette must contain swatches`);
    } else {
      photo.palette.forEach((swatch, sIdx) => {
        if (!swatch.hex || !/^#[0-9a-fA-F]{6}$/.test(swatch.hex)) {
          errors.push(`${loc}: palette[${sIdx}].hex is invalid`);
        }
      });
    }

    // Variants validation
    if (!photo.sources || !Array.isArray(photo.sources.variants) || photo.sources.variants.length === 0) {
      errors.push(`${loc}: sources.variants must contain at least one variant`);
    } else {
      photo.sources.variants.forEach((v, vIdx) => {
        if (typeof v.width !== 'number' || v.width <= 0) errors.push(`${loc}: variant[${vIdx}].width <= 0`);
        if (typeof v.height !== 'number' || v.height <= 0) errors.push(`${loc}: variant[${vIdx}].height <= 0`);
        if (!v.format || !['avif', 'webp', 'jpeg'].includes(v.format)) {
          errors.push(`${loc}: variant[${vIdx}].format '${v.format}' is invalid`);
        }
        if (typeof v.bytes !== 'number' || v.bytes <= 0) errors.push(`${loc}: variant[${vIdx}].bytes <= 0`);
        if (!Array.isArray(v.urls) || v.urls.length === 0) {
          errors.push(`${loc}: variant[${vIdx}].urls must be non-empty`);
        }
      });
    }

    // Rights
    if (!photo.rights || typeof photo.rights !== 'object') {
      errors.push(`${loc}: rights object is missing`);
    } else {
      if (!photo.rights.copyright) errors.push(`${loc}: rights.copyright is missing`);
      if (!photo.rights.license) errors.push(`${loc}: rights.license is missing`);
    }

    // Privacy rule: GPS precision
    if (photo.exif && photo.exif.gps && photo.exif.gps.precision === 'hidden') {
      errors.push(`${loc}: GPS coordinates must be purged when precision is 'hidden' for privacy compliance`);
    }

    // Duplicate detection
    if (photo.id) {
      if (seenPhotoIds.has(photo.id)) {
        errors.push(`${loc}: duplicate photo id detected: ${photo.id}`);
      }
      seenPhotoIds.add(photo.id);
    }

    if (photo.slug) {
      if (seenSlugs.has(photo.slug)) {
        errors.push(`${loc}: duplicate photo slug detected: ${photo.slug}`);
      }
      seenSlugs.add(photo.slug);
    }
  });
}

if (aggregatedPhotoCount !== indexRaw.totalPhotos) {
  errors.push(
    `Total photos count mismatch: index.totalPhotos=${indexRaw.totalPhotos}, aggregated photos in shards=${aggregatedPhotoCount}`
  );
}

if (errors.length > 0) {
  console.error('\n❌ CATALOG SCHEMA VALIDATION FAILED WITH ERRORS:');
  errors.forEach((err, i) => console.error(`  ${i + 1}) ${err}`));
  process.exit(1);
} else {
  console.log(`\n✅ CATALOG VALIDATION PASSED!`);
  console.log(`  - Total validated photographs: ${seenPhotoIds.size}`);
  console.log(`  - Total validated shards: ${indexRaw.shards.length}`);
  console.log(`  - Zero schema violations, zero duplicate slugs.`);
  process.exit(0);
}

