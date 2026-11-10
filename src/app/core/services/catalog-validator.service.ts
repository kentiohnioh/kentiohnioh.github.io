import {
  CatalogIndex,
  ImageVariant,
  PhotoItem,
  ShardCatalog,
} from '../models/catalog.model';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

/**
 * Functional schema validation with zero external dependencies to preserve the <180KB gzip budget.
 * Automatically enforces privacy constraints (strips GPS when precision === 'hidden').
 */
export class CatalogValidator {
  public static validateCatalogIndex(input: unknown): ValidationResult<CatalogIndex> {
    const errors: string[] = [];
    if (!input || typeof input !== 'object') {
      return { success: false, errors: ['CatalogIndex must be a non-null object'] };
    }

    const obj = input as Partial<CatalogIndex>;

    if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 1) {
      errors.push('schemaVersion must be a positive number');
    }
    if (!obj.generatedAt || typeof obj.generatedAt !== 'string' || isNaN(Date.parse(obj.generatedAt))) {
      errors.push('generatedAt must be a valid ISO 8601 date string');
    }
    if (typeof obj.totalPhotos !== 'number' || obj.totalPhotos < 0) {
      errors.push('totalPhotos must be a non-negative number');
    }
    if (!Array.isArray(obj.shards)) {
      errors.push('shards must be an array');
    } else {
      obj.shards.forEach((shard, idx) => {
        if (!shard.id || typeof shard.id !== 'string') {
          errors.push(`shards[${idx}].id must be a non-empty string`);
        }
        if (!shard.url || typeof shard.url !== 'string') {
          errors.push(`shards[${idx}].url must be a non-empty string`);
        }
        if (typeof shard.count !== 'number' || shard.count < 0) {
          errors.push(`shards[${idx}].count must be a non-negative number`);
        }
        if (!shard.sha256 || typeof shard.sha256 !== 'string') {
          errors.push(`shards[${idx}].sha256 must be a non-empty hash string`);
        }
      });
    }

    if (!Array.isArray(obj.collections)) {
      errors.push('collections must be an array');
    }

    if (!obj.facets || typeof obj.facets !== 'object') {
      errors.push('facets must be a valid FacetSummary object');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: input as CatalogIndex, errors: [] };
  }

  public static validatePhotoItem(input: unknown): ValidationResult<PhotoItem> {
    const errors: string[] = [];
    if (!input || typeof input !== 'object') {
      return { success: false, errors: ['PhotoItem must be a non-null object'] };
    }

    const item = { ...(input as Partial<PhotoItem>) };

    if (typeof item.schemaVersion !== 'number' || item.schemaVersion < 1) {
      errors.push('schemaVersion must be a positive number');
    }
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push('id is required and must be a non-empty string');
    }
    if (!item.slug || typeof item.slug !== 'string' || item.slug.trim() === '') {
      errors.push('slug is required and must be a non-empty string');
    }
    if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
      errors.push('title is required and must be a non-empty string');
    }

    // Alt text rule: REQUIRED, NON-EMPTY
    if (!item.alt || typeof item.alt !== 'string' || item.alt.trim() === '') {
      errors.push('alt text is mandatory, non-empty and accessible');
    }

    if (typeof item.width !== 'number' || item.width <= 0) {
      errors.push('width must be greater than 0');
    }
    if (typeof item.height !== 'number' || item.height <= 0) {
      errors.push('height must be greater than 0');
    }
    if (typeof item.aspect !== 'number' || item.aspect <= 0) {
      errors.push('aspect ratio must be greater than 0');
    }
    if (!item.placeholder || typeof item.placeholder !== 'string') {
      errors.push('placeholder is required for immediate perceptual loading');
    }

    // Palette validation
    if (!Array.isArray(item.palette) || item.palette.length === 0) {
      errors.push('palette must be an array with at least 1 dominant swatch');
    } else {
      item.palette.forEach((swatch, idx) => {
        if (!swatch.hex || !/^#[0-9a-fA-F]{6}$/.test(swatch.hex)) {
          errors.push(`palette[${idx}].hex must be a valid 6-character hex color`);
        }
        if (!swatch.oklch || typeof swatch.oklch.l !== 'number' || typeof swatch.oklch.c !== 'number' || typeof swatch.oklch.h !== 'number') {
          errors.push(`palette[${idx}].oklch must contain numeric l, c, and h values`);
        }
      });
    }

    // EXIF and Privacy Enforcement: Strip GPS unless precision !== 'hidden'
    if (!item.exif || typeof item.exif !== 'object') {
      item.exif = {};
    } else {
      const sanitizedExif = { ...item.exif };
      if (sanitizedExif.gps) {
        if (!sanitizedExif.gps.precision || sanitizedExif.gps.precision === 'hidden') {
          // Delete GPS for privacy default
          delete sanitizedExif.gps;
        } else if (
          typeof sanitizedExif.gps.lat !== 'number' ||
          typeof sanitizedExif.gps.lng !== 'number'
        ) {
          errors.push('GPS coordinates must be valid numbers when precision is not hidden');
        }
      }
      item.exif = sanitizedExif;
    }

    // Sources and Variants validation
    if (!item.sources || !Array.isArray(item.sources.variants) || item.sources.variants.length === 0) {
      errors.push('sources.variants must contain at least one ImageVariant');
    } else {
      item.sources.variants.forEach((v, idx) => {
        const variantErrors = CatalogValidator.validateVariant(v, `sources.variants[${idx}]`);
        errors.push(...variantErrors);
      });
    }

    // Rights
    if (!item.rights || typeof item.rights !== 'object') {
      errors.push('rights object is required');
    } else {
      if (!item.rights.copyright || typeof item.rights.copyright !== 'string') {
        item.rights = { ...item.rights, copyright: '© Theng Nioh' };
      }
      if (!item.rights.license || typeof item.rights.license !== 'string') {
        errors.push('rights.license must be defined');
      }
    }

    // Flags
    if (!item.flags || typeof item.flags !== 'object') {
      errors.push('flags object is required');
    } else {
      if (typeof item.flags.hasPeople !== 'boolean') errors.push('flags.hasPeople must be a boolean');
      if (typeof item.flags.retouched !== 'boolean') errors.push('flags.retouched must be a boolean');
      if (typeof item.flags.showBeforeAfter !== 'boolean') errors.push('flags.showBeforeAfter must be a boolean');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: item as PhotoItem, errors: [] };
  }

  public static validateVariant(v: unknown, path: string): string[] {
    const errs: string[] = [];
    if (!v || typeof v !== 'object') {
      return [`${path} must be a valid variant object`];
    }
    const variant = v as Partial<ImageVariant>;
    if (typeof variant.width !== 'number' || variant.width <= 0) {
      errs.push(`${path}.width must be greater than 0`);
    }
    if (typeof variant.height !== 'number' || variant.height <= 0) {
      errs.push(`${path}.height must be greater than 0`);
    }
    if (!variant.format || !['avif', 'webp', 'jpeg'].includes(variant.format)) {
      errs.push(`${path}.format must be one of 'avif', 'webp', 'jpeg'`);
    }
    if (typeof variant.bytes !== 'number' || variant.bytes <= 0) {
      errs.push(`${path}.bytes must be greater than 0`);
    }
    if (!variant.sha256 || typeof variant.sha256 !== 'string') {
      errs.push(`${path}.sha256 must be a non-empty string`);
    }
    if (!Array.isArray(variant.urls) || variant.urls.length === 0) {
      errs.push(`${path}.urls must contain at least one URL`);
    }
    return errs;
  }

  public static validateShardCatalog(input: unknown): ValidationResult<ShardCatalog> {
    const errors: string[] = [];
    if (!input || typeof input !== 'object') {
      return { success: false, errors: ['ShardCatalog must be a non-null object'] };
    }
    const shard = input as Partial<ShardCatalog>;
    if (typeof shard.schemaVersion !== 'number' || shard.schemaVersion < 1) {
      errors.push('schemaVersion must be a positive number');
    }
    if (!shard.shardId || typeof shard.shardId !== 'string') {
      errors.push('shardId must be a non-empty string');
    }
    if (!Array.isArray(shard.photos)) {
      errors.push('photos must be an array');
    } else {
      shard.photos.forEach((photo, idx) => {
        const photoRes = CatalogValidator.validatePhotoItem(photo);
        if (!photoRes.success) {
          errors.push(`photos[${idx}]: ${photoRes.errors.join('; ')}`);
        }
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }
    return { success: true, data: input as ShardCatalog, errors: [] };
  }
}
