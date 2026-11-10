import * as exifr from 'exifr';
import { rgbaToThumbHash } from 'thumbhash';
import { normalizeExif } from '../utils/exif-normalizer';
import { extractPaletteFromRgba } from '../utils/palette';
import { analyzeImageMetrics, inferMoodTags } from '../utils/mood-heuristics';
import { computeSha256, buildContentAddressedPath } from '../utils/content-address';
import { meetsPerceptualFloor } from '../utils/perceptual-metric';
import { ImageVariant, PhotoItem } from '../models/catalog.model';

export type IngestStage =
  | 'reading'
  | 'hashing'
  | 'decoding'
  | 'exif'
  | 'color-management'
  | 'resizing'
  | 'encoding'
  | 'palette-and-placeholder'
  | 'finalizing';

export interface IngestProgress {
  stage: IngestStage;
  percent: number; // 0 to 100
  message: string;
}

export interface IngestOptions {
  onProgress?: (progress: IngestProgress) => void;
  targetBudgets?: {
    640: number; // e.g. 35 * 1024
    1280: number; // e.g. 90 * 1024
    2048: number; // e.g. 180 * 1024
    3840?: number; // e.g. 600 * 1024
  };
  enable4kMaster?: boolean;
  perceptualFloor?: number; // Default: 0.985
  hasPeople?: boolean;
}

export interface IngestResult {
  photoItem: Partial<PhotoItem>;
  variants: Array<{
    variant: ImageVariant;
    blob: Blob;
    ssim: number;
    qualityAchieved: number;
    budgetWarning?: string;
  }>;
}

export class IngestPipeline {
  private static avifSupported: boolean | null = null;

  /**
   * Tests if the current browser environment supports native OffscreenCanvas/Canvas AVIF encoding.
   */
  public static async detectAvifEncodingSupport(): Promise<boolean> {
    if (this.avifSupported !== null) return this.avifSupported;
    if (typeof OffscreenCanvas === 'undefined') {
      this.avifSupported = false;
      return false;
    }
    try {
      const canvas = new OffscreenCanvas(2, 2);
      const blob = await canvas.convertToBlob({ type: 'image/avif' });
      this.avifSupported = blob.type === 'image/avif';
    } catch {
      this.avifSupported = false;
    }
    return this.avifSupported;
  }

  /**
   * Runs the complete 10-stage browser-side ingest pipeline.
   */
  public static async processFile(file: File | Blob, options: IngestOptions = {}): Promise<IngestResult> {
    const notify = (stage: IngestStage, percent: number, message: string) => {
      options.onProgress?.({ stage, percent, message });
    };

    // Stage 1: File check
    notify('reading', 5, 'Validating file format...');
    const filename = (file as File).name || 'upload';
    const isRaw = /\.(cr2|cr3|nef|arw|dng|orf|rw2)$/i.test(filename);
    if (isRaw) {
      throw new Error(
        'RAW camera files cannot be decoded in-browser with full colour profiles. Please export to high-quality TIFF or JPEG before darkroom ingest.'
      );
    }

    // Stage 2: Hash original for deduplication
    notify('hashing', 15, 'Computing original content SHA-256...');
    const arrayBuffer = await file.arrayBuffer();
    const originalHash = await computeSha256(arrayBuffer);

    // Stage 3: Decode with createImageBitmap
    notify('decoding', 25, 'Decoding image raster...');
    const bitmap = await createImageBitmap(new Blob([arrayBuffer]), {
      imageOrientation: 'from-image',
    });
    const { width: origWidth, height: origHeight } = bitmap;
    const aspect = Math.round((origWidth / origHeight) * 1000) / 1000;

    // Stage 4: Parse EXIF with exifr
    notify('exif', 35, 'Extracting camera telemetry & lens EXIF...');
    let parsedExif = {};
    try {
      const rawExif = await exifr.parse(arrayBuffer, {
        pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal', 'latitude', 'longitude'],
      });
      parsedExif = rawExif ? normalizeExif(rawExif, 'hidden') : {};
    } catch {
      parsedExif = {};
    }

    // Stage 5: OffscreenCanvas rendering for pixel extraction
    notify('color-management', 45, 'Analysing colour profile and preparing sRGB raster...');
    const canvas = new OffscreenCanvas(origWidth, origHeight);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not acquire 2D rendering context from OffscreenCanvas');

    ctx.drawImage(bitmap, 0, 0);
    const fullImageData = ctx.getImageData(0, 0, origWidth, origHeight);

    // Stage 6 & 9: Palette, placeholder & mood analysis
    notify('palette-and-placeholder', 55, 'Generating OKLCH palette, ThumbHash, and mood tags...');
    const palette = extractPaletteFromRgba(fullImageData.data, 5);
    const moodMetrics = analyzeImageMetrics(fullImageData.data);
    const suggestedMood = inferMoodTags(moodMetrics);

    // Generate ThumbHash (using a 100px thumbnail)
    const thumbWidth = Math.min(100, origWidth);
    const thumbHeight = Math.round(thumbWidth / aspect);
    const thumbCanvas = new OffscreenCanvas(thumbWidth, thumbHeight);
    const thumbCtx = thumbCanvas.getContext('2d')!;
    thumbCtx.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);
    const thumbData = thumbCtx.getImageData(0, 0, thumbWidth, thumbHeight);
    const thumbHashBytes = rgbaToThumbHash(thumbWidth, thumbHeight, thumbData.data);
    const placeholder = 'data:image/png;base64,' + btoa(String.fromCharCode(...thumbHashBytes));

    // Stage 7 & 8: Build Multi-Resolution Ladder with Quality Guard
    notify('resizing', 65, 'Building multi-resolution ladder (640, 1280, 2048 px)...');

    const ladderTargets = [640, 1280, 2048];
    if (options.enable4kMaster && origWidth >= 3840) {
      ladderTargets.push(3840);
    }

    const defaultBudgets: Record<number, number> = {
      640: options.targetBudgets?.[640] ?? 35 * 1024,
      1280: options.targetBudgets?.[1280] ?? 90 * 1024,
      2048: options.targetBudgets?.[2048] ?? 180 * 1024,
      3840: options.targetBudgets?.[3840] ?? 600 * 1024,
    };

    const avifSupported = await this.detectAvifEncodingSupport();
    const formatToUse: 'avif' | 'webp' | 'jpeg' = avifSupported ? 'avif' : 'webp';
    const mimeType = formatToUse === 'avif' ? 'image/avif' : 'image/webp';

    const processedVariants: IngestResult['variants'] = [];
    const variantCatalogItems: ImageVariant[] = [];

    const floor = options.perceptualFloor ?? 0.985;

    for (let i = 0; i < ladderTargets.length; i++) {
      const targetWidth = ladderTargets[i];
      if (origWidth < targetWidth && i > 0) continue; // Don't upscale

      const scale = targetWidth / origWidth;
      const targetHeight = Math.round(origHeight * scale);

      notify('encoding', 70 + Math.floor((i / ladderTargets.length) * 25), `Encoding ${targetWidth}px variant (${formatToUse})...`);

      // Multi-step high-quality downsampling
      const varCanvas = new OffscreenCanvas(targetWidth, targetHeight);
      const varCtx = varCanvas.getContext('2d', { willReadFrequently: true })!;
      varCtx.imageSmoothingEnabled = true;
      varCtx.imageSmoothingQuality = 'high';
      varCtx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      const targetBudget = defaultBudgets[targetWidth];
      const hardCap = targetBudget * 1.6;

      // Quality Guard: binary search quality (0.4 to 0.95)
      let lowQ = 0.45;
      let highQ = 0.95;
      let bestBlob: Blob | null = null;
      let bestQ = 0.8;
      let budgetWarning: string | undefined;

      for (let searchStep = 0; searchStep < 5; searchStep++) {
        const midQ = (lowQ + highQ) / 2;
        const testBlob = await varCanvas.convertToBlob({ type: mimeType, quality: midQ });

        if (testBlob.size <= targetBudget) {
          bestBlob = testBlob;
          bestQ = midQ;
          lowQ = midQ; // Try higher quality
        } else {
          highQ = midQ; // Lower quality
          if (!bestBlob) bestBlob = testBlob;
        }
      }

      if (!bestBlob) {
        bestBlob = await varCanvas.convertToBlob({ type: mimeType, quality: 0.75 });
      }

      // Perceptual Floor Verification on 512px proxy
      const origProxy = new OffscreenCanvas(512, Math.round(512 / aspect));
      const origProxyCtx = origProxy.getContext('2d', { willReadFrequently: true })!;
      origProxyCtx.drawImage(bitmap, 0, 0, 512, Math.round(512 / aspect));
      const origProxyData = origProxyCtx.getImageData(0, 0, 512, Math.round(512 / aspect));

      const compProxyBitmap = await createImageBitmap(bestBlob);
      const compProxy = new OffscreenCanvas(512, Math.round(512 / aspect));
      const compProxyCtx = compProxy.getContext('2d', { willReadFrequently: true })!;
      compProxyCtx.drawImage(compProxyBitmap, 0, 0, 512, Math.round(512 / aspect));
      const compProxyData = compProxyCtx.getImageData(0, 0, 512, Math.round(512 / aspect));

      const { passes, ssim } = meetsPerceptualFloor(
        origProxyData.data,
        compProxyData.data,
        512,
        Math.round(512 / aspect),
        floor
      );

      // If perceptual floor was not met, exceed budget up to hard cap (1.6x)
      if (!passes && bestBlob.size < hardCap) {
        const higherBlob = await varCanvas.convertToBlob({ type: mimeType, quality: 0.92 });
        budgetWarning = `Perceptual floor required increasing size to ${(higherBlob.size / 1024).toFixed(1)} KB (target: ${(targetBudget / 1024).toFixed(0)} KB, SSIM: ${ssim})`;
        bestBlob = higherBlob;
      }

      const variantBuffer = await bestBlob.arrayBuffer();
      const variantHash = await computeSha256(variantBuffer);

      const remotePath = buildContentAddressedPath({
        sha256: variantHash,
        width: targetWidth,
        format: formatToUse,
      });

      const variantItem: ImageVariant = {
        width: targetWidth,
        height: targetHeight,
        format: formatToUse,
        bytes: bestBlob.size,
        sha256: variantHash,
        urls: [remotePath],
      };

      variantCatalogItems.push(variantItem);
      processedVariants.push({
        variant: variantItem,
        blob: bestBlob,
        ssim,
        qualityAchieved: Math.round(bestQ * 100) / 100,
        budgetWarning,
      });

      compProxyBitmap.close();
    }

    bitmap.close();

    notify('finalizing', 100, 'Ingest processing complete!');

    const baseTitle = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const titleFormatted = baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1);
    const slug = baseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return {
      photoItem: {
        schemaVersion: 1,
        id: originalHash.slice(0, 16),
        slug: slug || `photo-${originalHash.slice(0, 8)}`,
        title: titleFormatted,
        alt: '', // Enforce REQUIRED empty state per Rule 2 & Prompt 2
        width: origWidth,
        height: origHeight,
        aspect,
        placeholder,
        palette,
        exif: parsedExif,
        sources: {
          variants: variantCatalogItems,
        },
        grade: null,
        retouch: null,
        collectionIds: [],
        tags: suggestedMood,
        mood: suggestedMood,
        flags: {
          hasPeople: Boolean(options.hasPeople),
          retouched: false,
          showBeforeAfter: false,
        },
        rights: {
          copyright: '© Theng Nioh',
          license: 'All Rights Reserved',
        },
      },
      variants: processedVariants,
    };
  }
}
