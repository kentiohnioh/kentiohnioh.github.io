/**
 * Strict Catalog Data Contracts for Theng Nioh Photography Portfolio.
 * All properties are documented, strictly typed, and serializable to clean JSON.
 */

import { ColorGradeRecipe } from './color-grade.model';
import { RetouchRecord } from './retouch.model';

export interface CatalogIndex {
  schemaVersion: number;
  generatedAt: string; // ISO 8601
  totalPhotos: number;
  shards: ShardRef[];
  collections: CollectionRef[];
  facets: FacetSummary;
  embeddings?: EmbeddingIndexRef;
}

export interface ShardRef {
  id: string; // e.g. "2026-11"
  url: string; // Relative path e.g. "catalog/shards/2026-11.json"
  count: number;
  sha256: string;
}

export interface CollectionRef {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  count: number;
}

export interface EmbeddingIndexRef {
  modelId: string;
  dimensions: number;
  quantization: 'int8';
  shardUrl: string;
  updatedAt: string;
}

export interface PhotoItem {
  schemaVersion: number;
  id: string; // Content hash (SHA-256 first 16 chars)
  slug: string; // Unique URL-friendly slug
  title: string;
  alt: string; // Required, non-empty, accessible description
  longDescription?: string;
  caption?: string;
  takenAt?: string; // ISO 8601
  width: number;
  height: number;
  aspect: number; // width / height
  placeholder: string; // Base64 encoded ThumbHash or BlurHash
  palette: PaletteSwatch[]; // Dominant 5 swatches
  exif: ExifTelemetry;
  sources: PhotoSources;
  grade: ColorGradeRecipe | null;
  retouch: RetouchRecord | null;
  collectionIds: string[];
  tags: string[];
  mood: string[]; // e.g. ["low-key", "warm", "monochrome"]
  flags: {
    hasPeople: boolean;
    retouched: boolean;
    showBeforeAfter: boolean;
  };
  rights: {
    copyright: string; // Default: "© Theng Nioh"
    license: string;
    credit?: string;
    sourceUrl?: string;
  };
  embeddingSlot?: number; // Slot index in the binary embeddings file
}

export interface PaletteSwatch {
  hex: string;
  oklch: {
    l: number; // 0 to 1
    c: number; // 0 to ~0.4
    h: number; // 0 to 360
  };
  weight: number; // 0 to 1, normalized sum ~ 1
}

export interface PhotoSources {
  variants: ImageVariant[]; // Ordered by width: 640, 1280, 2048 (and optional 3840)
  before?: ImageVariant; // Optional un-retouched variant for split-loupe inspector
  skinMask?: ImageVariant; // Tiny 256-512px single-channel alpha mask for public skin-hue protection
}

export interface ImageVariant {
  width: number;
  height: number;
  format: 'avif' | 'webp' | 'jpeg';
  bytes: number;
  sha256: string;
  urls: string[]; // Ordered by priority: primary (e.g. Hugging Face), followed by mirrors
}

export interface ExifTelemetry {
  camera?: string;
  lens?: string;
  focalLengthMm?: number;
  aperture?: number; // e.g. 1.8 for f/1.8
  shutterSeconds?: number; // e.g. 0.004 for 1/250s
  shutterDisplay?: string; // e.g. "1/250"
  iso?: number;
  gps?: {
    lat: number;
    lng: number;
    precision: 'exact' | 'approx' | 'hidden';
  };
}

export interface FacetSummary {
  focalBuckets: Record<string, number>; // e.g. { "24mm": 12, "35mm": 40, "50mm": 25, "85mm+": 18 }
  apertureBuckets: Record<string, number>; // e.g. { "f/1.2-f/2": 35, "f/2.8-f/4": 40, "f/5.6+": 20 }
  isoBuckets: Record<string, number>; // e.g. { "100-400": 60, "800-3200": 30, "6400+": 5 }
  moods: Record<string, number>;
  hueFamilies: Record<string, number>; // e.g. { "warm": 45, "cool": 30, "mono": 15 }
}

export interface ShardCatalog {
  schemaVersion: number;
  shardId: string;
  generatedAt: string;
  photos: PhotoItem[];
}
