/**
 * Spatial 2D Canvas Layout, Frustum Culling, and LOD Selection.
 * Pure mathematical algorithms for deterministic positioning, spatial indexing, and culling.
 */

import { PhotoItem } from '../models/catalog.model';

export type SpatialClusterMode = 'hue' | 'collection' | 'timeline';

export interface SpatialItem {
  id: string;
  photo: PhotoItem;
  x: number; // Virtual canvas X (center)
  y: number; // Virtual canvas Y (center)
  width: number; // Virtual canvas width
  height: number; // Virtual canvas height
  clusterId: string;
}

export interface ViewportRect {
  cameraX: number; // Center of camera in canvas coordinates
  cameraY: number; // Center of camera in canvas coordinates
  zoom: number; // 0.2 to 3.0
  viewportWidth: number; // Screen px width
  viewportHeight: number; // Screen px height
}

export interface CanvasBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * 32-bit deterministic Mulberry32 PRNG.
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a 32-bit integer for deterministic seeding.
 */
export function hashStringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Determine OKLCH hue cluster ID:
 * - 'neutral': chroma < 0.04
 * - 'warm': hue 0-90
 * - 'natural': hue 90-180
 * - 'cool': hue 180-270
 * - 'twilight': hue 270-360
 */
export function getHueCluster(photo: PhotoItem): string {
  const swatch = photo.palette?.[0];
  if (!swatch?.oklch || swatch.oklch.c < 0.04) {
    return 'neutral';
  }
  const h = (swatch.oklch.h % 360 + 360) % 360;
  if (h < 90) return 'warm';
  if (h < 180) return 'natural';
  if (h < 270) return 'cool';
  return 'twilight';
}

/**
 * Compute deterministic layout positions for an array of photos.
 */
export function computeSpatialLayout(
  photos: PhotoItem[],
  clusterMode: SpatialClusterMode = 'hue',
  baseTileWidth = 320
): SpatialItem[] {
  if (photos.length === 0) return [];

  // Group photos by cluster
  const clusters = new Map<string, PhotoItem[]>();
  for (const photo of photos) {
    let key = 'all';
    if (clusterMode === 'hue') {
      key = getHueCluster(photo);
    } else if (clusterMode === 'collection') {
      key = photo.collectionIds?.[0] || 'general';
    } else if (clusterMode === 'timeline') {
      key = photo.takenAt ? photo.takenAt.substring(0, 7) : 'archive';
    }

    const list = clusters.get(key) ?? [];
    list.push(photo);
    clusters.set(key, list);
  }

  // Pre-defined cluster anchor centroids
  const clusterAnchors = new Map<string, { cx: number; cy: number }>([
    ['neutral', { cx: 0, cy: 0 }],
    ['warm', { cx: -900, cy: -600 }],
    ['natural', { cx: 900, cy: -600 }],
    ['cool', { cx: 900, cy: 600 }],
    ['twilight', { cx: -900, cy: 600 }],
    ['general', { cx: 0, cy: 0 }],
    ['all', { cx: 0, cy: 0 }],
  ]);

  const items: SpatialItem[] = [];
  let clusterIndex = 0;

  for (const [clusterId, clusterPhotos] of clusters.entries()) {
    let anchor = clusterAnchors.get(clusterId);
    if (!anchor) {
      // Procedural circle arrangement for arbitrary collection IDs
      const angle = (clusterIndex / Math.max(1, clusters.size)) * Math.PI * 2;
      const radius = 1000;
      anchor = {
        cx: Math.cos(angle) * radius,
        cy: Math.sin(angle) * radius,
      };
      clusterIndex++;
    }

    // Arrange cluster items in a deterministic phyllotaxis / golden spiral
    const goldenAngle = 2.399963229728653; // ~137.5 degrees
    const spacing = baseTileWidth * 0.95;

    for (let i = 0; i < clusterPhotos.length; i++) {
      const photo = clusterPhotos[i];
      const seed = hashStringToSeed(photo.id);
      const prng = createMulberry32(seed);

      const r = spacing * Math.sqrt(i + 1);
      const theta = (i + 1) * goldenAngle + (prng() - 0.5) * 0.2;

      // Small jitter based on photo hash
      const jitterX = (prng() - 0.5) * 40;
      const jitterY = (prng() - 0.5) * 40;

      const x = anchor.cx + r * Math.cos(theta) + jitterX;
      const y = anchor.cy + r * Math.sin(theta) + jitterY;

      const aspect = photo.aspect > 0 ? photo.aspect : 1.5;
      const width = baseTileWidth;
      const height = baseTileWidth / aspect;

      items.push({
        id: photo.id,
        photo,
        x,
        y,
        width,
        height,
        clusterId,
      });
    }
  }

  return items;
}

/**
 * Frustum culling: filter spatial items to only those currently visible within the viewport
 * plus a buffer zone for smooth panning without pop-in.
 */
export function cullFrustum(
  items: SpatialItem[],
  viewport: ViewportRect,
  bufferPx = 150
): SpatialItem[] {
  if (items.length === 0 || viewport.zoom <= 0) return [];

  const halfWidth = viewport.viewportWidth / (2 * viewport.zoom) + bufferPx;
  const halfHeight = viewport.viewportHeight / (2 * viewport.zoom) + bufferPx;

  const left = viewport.cameraX - halfWidth;
  const right = viewport.cameraX + halfWidth;
  const top = viewport.cameraY - halfHeight;
  const bottom = viewport.cameraY + halfHeight;

  return items.filter((item) => {
    const itemHalfW = item.width / 2;
    const itemHalfH = item.height / 2;

    const itemLeft = item.x - itemHalfW;
    const itemRight = item.x + itemHalfW;
    const itemTop = item.y - itemHalfH;
    const itemBottom = item.y + itemHalfH;

    return !(
      itemRight < left ||
      itemLeft > right ||
      itemBottom < top ||
      itemTop > bottom
    );
  });
}

/**
 * Compute the bounding box of a list of spatial items.
 */
export function computeCanvasBounds(items: SpatialItem[]): CanvasBounds {
  if (items.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const hw = item.width / 2;
    const hh = item.height / 2;
    minX = Math.min(minX, item.x - hw);
    maxX = Math.max(maxX, item.x + hw);
    minY = Math.min(minY, item.y - hh);
    maxY = Math.max(maxY, item.y + hh);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Choose target LOD width based on on-screen pixel size.
 */
export function selectLOD(screenPixelWidth: number): 640 | 1280 | 2048 {
  if (screenPixelWidth <= 720) return 640;
  if (screenPixelWidth <= 1440) return 1280;
  return 2048;
}

/**
 * Calculate camera position and zoom to fit all items within viewport.
 */
export function calculateFitAllCamera(
  bounds: CanvasBounds,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx = 100
): { cameraX: number; cameraY: number; zoom: number } {
  if (bounds.width <= 0 || bounds.height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { cameraX: 0, cameraY: 0, zoom: 1.0 };
  }

  const cameraX = (bounds.minX + bounds.maxX) / 2;
  const cameraY = (bounds.minY + bounds.maxY) / 2;

  const availW = Math.max(50, viewportWidth - paddingPx * 2);
  const availH = Math.max(50, viewportHeight - paddingPx * 2);

  const zoomX = availW / bounds.width;
  const zoomY = availH / bounds.height;
  const rawZoom = Math.min(zoomX, zoomY);

  // Clamp zoom between 0.25 and 1.25 for fit-all
  const zoom = Math.max(0.25, Math.min(1.25, rawZoom));

  return { cameraX, cameraY, zoom };
}

