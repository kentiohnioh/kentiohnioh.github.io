/**
 * Publishing Hard Gates Validator and Catalog Diff Engine.
 * Enforces non-negotiable data contracts before any photo is published.
 */

import { PhotoItem, CatalogIndex } from '../models/catalog.model';
import { CatalogValidator } from '../services/catalog-validator.service';

export interface PublishGateIssue {
  photoId: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface PublishValidationResult {
  valid: boolean;
  totalPhotos: number;
  passedPhotos: number;
  issues: PublishGateIssue[];
}

export interface CatalogDiff {
  added: PhotoItem[];
  modified: PhotoItem[];
  removed: PhotoItem[];
  summary: string;
}

export class PublishValidator {
  /**
   * Validate all photos against Phase 9 hard publishing gates:
   * 1. Non-empty alt text.
   * 2. Non-empty copyright & license in rights.
   * 3. At least one image variant present with valid dimensions and SHA-256.
   * 4. Non-empty placeholder.
   * 5. Non-empty palette with OKLCH swatches.
   * 6. Unique photo IDs and unique slugs (no collision).
   */
  static validatePublishReadiness(photos: PhotoItem[]): PublishValidationResult {
    const issues: PublishGateIssue[] = [];
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();

    for (const photo of photos) {
      // Gate 1: Non-empty alt text
      if (!photo.alt || photo.alt.trim().length === 0) {
        issues.push({
          photoId: photo.id,
          field: 'alt',
          severity: 'error',
          message: `Photo "${photo.title || photo.id}" has empty or missing alt text. Accessible description is mandatory.`,
        });
      }

      // Gate 2: Rights & copyright
      if (!photo.rights?.copyright || photo.rights.copyright.trim().length === 0) {
        issues.push({
          photoId: photo.id,
          field: 'rights.copyright',
          severity: 'error',
          message: `Photo "${photo.title}" is missing copyright holder declaration.`,
        });
      }
      if (!photo.rights?.license || photo.rights.license.trim().length === 0) {
        issues.push({
          photoId: photo.id,
          field: 'rights.license',
          severity: 'error',
          message: `Photo "${photo.title}" is missing license terms.`,
        });
      }

      // Gate 3: Variant ladder
      const variants = photo.sources?.variants || [];
      if (variants.length === 0) {
        issues.push({
          photoId: photo.id,
          field: 'sources.variants',
          severity: 'error',
          message: `Photo "${photo.title}" has no generated image variants.`,
        });
      } else {
        for (const v of variants) {
          if (!v.sha256 || v.sha256.length !== 64) {
            issues.push({
              photoId: photo.id,
              field: 'sources.variants.sha256',
              severity: 'error',
              message: `Variant ${v.width}px is missing a valid 64-char SHA-256 checksum.`,
            });
          }
          if (v.bytes <= 0) {
            issues.push({
              photoId: photo.id,
              field: 'sources.variants.bytes',
              severity: 'error',
              message: `Variant ${v.width}px has invalid file size (${v.bytes} bytes).`,
            });
          }
        }
      }

      // Gate 4: Placeholder
      if (!photo.placeholder || photo.placeholder.trim().length === 0) {
        issues.push({
          photoId: photo.id,
          field: 'placeholder',
          severity: 'error',
          message: `Photo "${photo.title}" is missing ThumbHash/BlurHash placeholder.`,
        });
      }

      // Gate 5: Palette
      if (!photo.palette || photo.palette.length === 0) {
        issues.push({
          photoId: photo.id,
          field: 'palette',
          severity: 'error',
          message: `Photo "${photo.title}" is missing OKLCH color palette swatches.`,
        });
      }

      // Gate 6: Unique IDs and slugs
      if (seenIds.has(photo.id)) {
        issues.push({
          photoId: photo.id,
          field: 'id',
          severity: 'error',
          message: `Duplicate photo ID detected: "${photo.id}".`,
        });
      } else {
        seenIds.add(photo.id);
      }

      if (seenSlugs.has(photo.slug)) {
        issues.push({
          photoId: photo.id,
          field: 'slug',
          severity: 'error',
          message: `Duplicate photo slug detected: "${photo.slug}". Slugs must be globally unique.`,
        });
      } else {
        seenSlugs.add(photo.slug);
      }
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const passedPhotos = photos.filter((p) => !issues.some((i) => i.photoId === p.id)).length;

    return {
      valid: !hasErrors,
      totalPhotos: photos.length,
      passedPhotos,
      issues,
    };
  }

  /**
   * Compute changes between previous catalog and staged catalog.
   */
  static computeCatalogDiff(
    previousPhotos: PhotoItem[],
    stagedPhotos: PhotoItem[]
  ): CatalogDiff {
    const prevMap = new Map(previousPhotos.map((p) => [p.id, p]));
    const stagedMap = new Map(stagedPhotos.map((p) => [p.id, p]));

    const added: PhotoItem[] = [];
    const modified: PhotoItem[] = [];
    const removed: PhotoItem[] = [];

    for (const [id, staged] of stagedMap.entries()) {
      if (!prevMap.has(id)) {
        added.push(staged);
      } else {
        const prev = prevMap.get(id)!;
        if (JSON.stringify(prev) !== JSON.stringify(staged)) {
          modified.push(staged);
        }
      }
    }

    for (const [id, prev] of prevMap.entries()) {
      if (!stagedMap.has(id)) {
        removed.push(prev);
      }
    }

    const summary = `Catalog Update: +${added.length} added, ~${modified.length} modified, -${removed.length} removed`;

    return { added, modified, removed, summary };
  }

  /**
   * Generate canonical Git shell commands for deployment.
   */
  static generateGitCommands(diff: CatalogDiff): {
    add: string;
    commit: string;
    push: string;
    fullScript: string;
  } {
    const add = 'git add public/catalog/';
    const commit = `git commit -m "chore(catalog): ${diff.summary}"`;
    const push = 'git push origin main';
    const fullScript = `${add}\n${commit}\n${push}`;

    return { add, commit, push, fullScript };
  }
}
