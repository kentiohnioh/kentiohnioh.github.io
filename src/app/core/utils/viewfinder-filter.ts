/**
 * Viewfinder Filter and Camera Dial Calculations.
 * Computes discrete detent stops, facet distributions, and OKLab Delta-E color matching.
 */

import { PhotoItem, PaletteSwatch } from '../models/catalog.model';
import { rgbToOklab, OklabColor } from './palette';

export interface ViewfinderFilters {
  focalStop?: string | null; // e.g. "24mm", "35mm", "50mm", "85mm", "135mm+"
  apertureStop?: string | null; // e.g. "f/1.4", "f/2.8", "f/5.6", "f/11+"
  shutterStop?: string | null; // e.g. "fast", "medium", "slow", "long"
  isoStop?: string | null; // e.g. "100", "400", "1600", "6400+"
  mood?: string | null; // e.g. "quiet", "dramatic", "warm", "monochrome"
  colorHex?: string | null; // Swatch hex e.g. "#34d399"
  collectionId?: string | null;
  hasPeople?: boolean | null;
  retouchedOnly?: boolean | null;
  searchQuery?: string | null;
}

export interface DialStopDefinition {
  id: string;
  label: string;
  sublabel?: string;
}

export const FOCAL_DIAL_STOPS: DialStopDefinition[] = [
  { id: 'all', label: 'ALL', sublabel: 'Lenses' },
  { id: 'wide', label: '24mm', sublabel: '<=28mm' },
  { id: 'street', label: '35mm', sublabel: '29-45mm' },
  { id: 'normal', label: '50mm', sublabel: '46-60mm' },
  { id: 'portrait', label: '85mm', sublabel: '61-105mm' },
  { id: 'tele', label: '135mm', sublabel: '>105mm' },
];

export const APERTURE_DIAL_STOPS: DialStopDefinition[] = [
  { id: 'all', label: 'ALL', sublabel: 'Aperture' },
  { id: 'f1.4', label: 'f/1.4', sublabel: '<= f/2.0' },
  { id: 'f2.8', label: 'f/2.8', sublabel: 'f/2.1 - f/3.5' },
  { id: 'f4.0', label: 'f/4.0', sublabel: 'f/3.6 - f/5.0' },
  { id: 'f5.6', label: 'f/5.6', sublabel: 'f/5.1 - f/8.0' },
  { id: 'f11', label: 'f/11+', sublabel: '> f/8.0' },
];

export const SHUTTER_DIAL_STOPS: DialStopDefinition[] = [
  { id: 'all', label: 'ALL', sublabel: 'Shutter' },
  { id: 'fast', label: '1/2000s', sublabel: '<= 1/1000s' },
  { id: 'medium', label: '1/250s', sublabel: '1/500s - 1/125s' },
  { id: 'slow', label: '1/30s', sublabel: '1/60s - 1/15s' },
  { id: 'long', label: '1s+', sublabel: '>= 1/8s' },
];

export const ISO_DIAL_STOPS: DialStopDefinition[] = [
  { id: 'all', label: 'ALL', sublabel: 'ISO' },
  { id: '100', label: '100', sublabel: '<= 200' },
  { id: '400', label: '400', sublabel: '250 - 640' },
  { id: '800', label: '800', sublabel: '800 - 1250' },
  { id: '1600', label: '1600', sublabel: '1600 - 3200' },
  { id: '6400', label: '6400+', sublabel: '>= 3200' },
];

export const MOOD_DIAL_STOPS: DialStopDefinition[] = [
  { id: 'all', label: 'ALL', sublabel: 'Atmosphere' },
  { id: 'quiet', label: 'Quiet', sublabel: 'Stillness' },
  { id: 'dramatic', label: 'Dramatic', sublabel: 'High contrast' },
  { id: 'warm', label: 'Warm', sublabel: 'Golden light' },
  { id: 'monochrome', label: 'Mono', sublabel: 'Black & white' },
  { id: 'cinematic', label: 'Cinematic', sublabel: 'Film depth' },
  { id: 'nocturne', label: 'Nocturne', sublabel: 'Night' },
];

export const COLOR_SWATCH_PRESETS = [
  { id: 'emerald', hex: '#34d399', label: 'Emerald' },
  { id: 'amber', hex: '#fbbf24', label: 'Warm Amber' },
  { id: 'ice', hex: '#60a5fa', label: 'Ice Blue' },
  { id: 'rose', hex: '#f43f5e', label: 'Safelight Rose' },
  { id: 'obsidian', hex: '#1e293b', label: 'Obsidian' },
];

/**
 * Parse hex string to OKLab color.
 */
export function hexToOklab(hex: string): OklabColor {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return rgbToOklab(r, g, b);
}

/**
 * Convert OKLCH swatch to OKLab.
 */
export function oklchToOklab(l: number, c: number, hDeg: number): OklabColor {
  const rad = (hDeg * Math.PI) / 180;
  return {
    l,
    a: c * Math.cos(rad),
    b: c * Math.sin(rad),
  };
}

/**
 * Compute Euclidean Delta-E in OKLab color space.
 */
export function deltaEOklab(c1: OklabColor, c2: OklabColor): number {
  const dl = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Check if photo matches target color within maxDeltaE threshold.
 */
export function matchesColorSwatch(
  photo: PhotoItem,
  targetHex: string,
  maxDeltaE = 0.22
): boolean {
  if (!photo.palette || photo.palette.length === 0) return false;
  const targetOklab = hexToOklab(targetHex);

  for (const swatch of photo.palette) {
    if (!swatch.oklch) continue;
    const swatchOklab = oklchToOklab(swatch.oklch.l, swatch.oklch.c, swatch.oklch.h);
    const dE = deltaEOklab(targetOklab, swatchOklab);
    if (dE <= maxDeltaE) {
      return true;
    }
  }
  return false;
}

/**
 * Test if photo matches a specific focal stop.
 */
export function matchesFocalStop(photo: PhotoItem, stopId: string): boolean {
  if (!stopId || stopId === 'all') return true;
  const fl = photo.exif?.focalLengthMm;
  if (!fl) return false;

  switch (stopId) {
    case 'wide':
      return fl <= 28;
    case 'street':
      return fl > 28 && fl <= 45;
    case 'normal':
      return fl > 45 && fl <= 60;
    case 'portrait':
      return fl > 60 && fl <= 105;
    case 'tele':
      return fl > 105;
    default:
      return true;
  }
}

/**
 * Test if photo matches a specific aperture stop.
 */
export function matchesApertureStop(photo: PhotoItem, stopId: string): boolean {
  if (!stopId || stopId === 'all') return true;
  const f = photo.exif?.aperture;
  if (!f) return false;

  switch (stopId) {
    case 'f1.4':
      return f <= 2.0;
    case 'f2.8':
      return f > 2.0 && f <= 3.5;
    case 'f4.0':
      return f > 3.5 && f <= 5.0;
    case 'f5.6':
      return f > 5.0 && f <= 8.0;
    case 'f11':
      return f > 8.0;
    default:
      return true;
  }
}

/**
 * Test if photo matches a specific shutter stop.
 */
export function matchesShutterStop(photo: PhotoItem, stopId: string): boolean {
  if (!stopId || stopId === 'all') return true;
  const sec = photo.exif?.shutterSeconds;
  if (!sec) return false;

  switch (stopId) {
    case 'fast':
      return sec <= 0.001; // <= 1/1000s
    case 'medium':
      return sec > 0.001 && sec <= 0.01; // ~ 1/1000s to 1/100s
    case 'slow':
      return sec > 0.01 && sec <= 0.125; // ~ 1/100s to 1/8s
    case 'long':
      return sec > 0.125; // > 1/8s
    default:
      return true;
  }
}

/**
 * Test if photo matches a specific ISO stop.
 */
export function matchesIsoStop(photo: PhotoItem, stopId: string): boolean {
  if (!stopId || stopId === 'all') return true;
  const iso = photo.exif?.iso;
  if (!iso) return false;

  switch (stopId) {
    case '100':
      return iso <= 200;
    case '400':
      return iso > 200 && iso <= 640;
    case '800':
      return iso > 640 && iso <= 1250;
    case '1600':
      return iso > 1250 && iso <= 3200;
    case '6400':
      return iso >= 3200;
    default:
      return true;
  }
}

/**
 * Check if a photo matches the full suite of ViewfinderFilters.
 */
export function matchesViewfinderFilters(
  photo: PhotoItem,
  filters: ViewfinderFilters
): boolean {
  if (!matchesFocalStop(photo, filters.focalStop || 'all')) return false;
  if (!matchesApertureStop(photo, filters.apertureStop || 'all')) return false;
  if (!matchesShutterStop(photo, filters.shutterStop || 'all')) return false;
  if (!matchesIsoStop(photo, filters.isoStop || 'all')) return false;

  if (filters.mood && filters.mood !== 'all') {
    if (!photo.mood?.some((m) => m.toLowerCase() === filters.mood!.toLowerCase())) {
      return false;
    }
  }

  if (filters.colorHex) {
    if (!matchesColorSwatch(photo, filters.colorHex)) {
      return false;
    }
  }

  if (filters.collectionId && !photo.collectionIds?.includes(filters.collectionId)) {
    return false;
  }

  if (
    filters.hasPeople !== null &&
    filters.hasPeople !== undefined &&
    photo.flags.hasPeople !== filters.hasPeople
  ) {
    return false;
  }

  if (filters.retouchedOnly && !photo.flags.retouched) {
    return false;
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.trim().toLowerCase();
    const titleMatch = photo.title.toLowerCase().includes(q);
    const altMatch = photo.alt.toLowerCase().includes(q);
    const tagMatch = photo.tags?.some((t) => t.toLowerCase().includes(q));
    const cameraMatch = photo.exif?.camera?.toLowerCase().includes(q);
    const lensMatch = photo.exif?.lens?.toLowerCase().includes(q);
    if (!titleMatch && !altMatch && !tagMatch && !cameraMatch && !lensMatch) {
      return false;
    }
  }

  return true;
}

/**
 * Compute facet counts for each dial stop given the current photo pool.
 */
export function computeFacetCounts(
  photos: PhotoItem[],
  currentFilters: ViewfinderFilters
): {
  focal: Record<string, number>;
  aperture: Record<string, number>;
  shutter: Record<string, number>;
  iso: Record<string, number>;
  mood: Record<string, number>;
} {
  const focal: Record<string, number> = {};
  const aperture: Record<string, number> = {};
  const shutter: Record<string, number> = {};
  const iso: Record<string, number> = {};
  const mood: Record<string, number> = {};

  // For each category, compute count while ignoring that category's own filter
  // so the user can see what options would result if they turned that dial
  for (const stop of FOCAL_DIAL_STOPS) {
    const testFilters = { ...currentFilters, focalStop: stop.id };
    focal[stop.id] = photos.filter((p) => matchesViewfinderFilters(p, testFilters)).length;
  }

  for (const stop of APERTURE_DIAL_STOPS) {
    const testFilters = { ...currentFilters, apertureStop: stop.id };
    aperture[stop.id] = photos.filter((p) => matchesViewfinderFilters(p, testFilters)).length;
  }

  for (const stop of SHUTTER_DIAL_STOPS) {
    const testFilters = { ...currentFilters, shutterStop: stop.id };
    shutter[stop.id] = photos.filter((p) => matchesViewfinderFilters(p, testFilters)).length;
  }

  for (const stop of ISO_DIAL_STOPS) {
    const testFilters = { ...currentFilters, isoStop: stop.id };
    iso[stop.id] = photos.filter((p) => matchesViewfinderFilters(p, testFilters)).length;
  }

  for (const stop of MOOD_DIAL_STOPS) {
    const testFilters = { ...currentFilters, mood: stop.id };
    mood[stop.id] = photos.filter((p) => matchesViewfinderFilters(p, testFilters)).length;
  }

  return { focal, aperture, shutter, iso, mood };
}

