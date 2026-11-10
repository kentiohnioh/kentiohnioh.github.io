/**
 * Content-Addressed File Naming & Sharding Pipeline.
 * Path pattern: photos/YYYY-MM/<sha256-first-12>-<width>.<ext>
 * Immutable, cache-forever friendly, and deduplicated automatically.
 */

export interface ContentAddressedPathOptions {
  sha256: string;
  width: number;
  format: 'avif' | 'webp' | 'jpeg';
  date?: string | Date; // Defaults to current date
  filesInFolderEstimate?: number;
}

/**
 * Computes SHA-256 hex string from ArrayBuffer or Uint8Array.
 * Uses Web Crypto API (browser & modern Node.js).
 */
export async function computeSha256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API subtle is not available in current environment');
  }

  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an immutable content-addressed storage path.
 * Format: photos/YYYY-MM/<sha256-12>-<width>.<ext>
 * If folder density exceeds ~5,000 items, splits by two-character hash prefix.
 */
export function buildContentAddressedPath(options: ContentAddressedPathOptions): string {
  const d = options.date ? new Date(options.date) : new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const monthFolder = `${year}-${month}`;

  const shortHash = options.sha256.slice(0, 12).toLowerCase();
  const filename = `${shortHash}-${options.width}.${options.format}`;

  // If density approaches directory limits (5,000+ files), shard by hash prefix
  if (options.filesInFolderEstimate && options.filesInFolderEstimate >= 5000) {
    const prefix = shortHash.slice(0, 2);
    return `photos/${monthFolder}/${prefix}/${filename}`;
  }

  return `photos/${monthFolder}/${filename}`;
}
