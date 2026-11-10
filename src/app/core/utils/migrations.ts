import { PhotoItem } from '../models/catalog.model';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migration chain to smoothly upgrade catalog items across schema versions.
 */
export function migratePhotoItem(raw: Record<string, unknown>): PhotoItem {
  let current = { ...raw };
  const rawVersion = typeof current['schemaVersion'] === 'number' ? current['schemaVersion'] : 0;

  // Migration from v0 -> v1
  if (rawVersion < 1) {
    current = migrateV0toV1(current);
  }

  return current as unknown as PhotoItem;
}

function migrateV0toV1(item: Record<string, unknown>): Record<string, unknown> {
  const flags = (item['flags'] && typeof item['flags'] === 'object'
    ? item['flags']
    : {}) as Record<string, unknown>;

  const rights = (item['rights'] && typeof item['rights'] === 'object'
    ? item['rights']
    : {}) as Record<string, unknown>;

  const exif = (item['exif'] && typeof item['exif'] === 'object'
    ? item['exif']
    : {}) as Record<string, unknown>;

  // Privacy: default GPS precision to 'hidden'
  if (exif['gps']) {
    const gps = exif['gps'] as Record<string, unknown>;
    if (!gps['precision'] || gps['precision'] === 'hidden') {
      delete exif['gps'];
    }
  }

  return {
    ...item,
    schemaVersion: 1,
    flags: {
      hasPeople: Boolean(flags['hasPeople']),
      retouched: Boolean(flags['retouched']),
      showBeforeAfter: Boolean(flags['showBeforeAfter']),
    },
    rights: {
      copyright: typeof rights['copyright'] === 'string' ? rights['copyright'] : '© Theng Nioh',
      license: typeof rights['license'] === 'string' ? rights['license'] : 'All Rights Reserved',
      credit: rights['credit'],
      sourceUrl: rights['sourceUrl'],
    },
    exif,
    collectionIds: Array.isArray(item['collectionIds']) ? item['collectionIds'] : [],
    tags: Array.isArray(item['tags']) ? item['tags'] : [],
    mood: Array.isArray(item['mood']) ? item['mood'] : [],
  };
}

/**
 * Deterministic JSON stringifier with stable key ordering and 2-space indentation.
 * Ensures clean, minimal Git diffs for catalog shards and indexes.
 */
export function serializeStableJson(value: unknown): string {
  return JSON.stringify(sortKeysRecursively(value), null, 2) + '\n';
}

function sortKeysRecursively(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(sortKeysRecursively);
  }
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(val as Record<string, unknown>).sort();
    for (const key of keys) {
      sortedObj[key] = sortKeysRecursively((val as Record<string, unknown>)[key]);
    }
    return sortedObj;
  }
  return val;
}

