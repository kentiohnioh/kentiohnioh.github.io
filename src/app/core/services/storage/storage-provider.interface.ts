/**
 * Storage Provider Abstraction for Zero-Cost Dual-Cloud Architecture.
 * Providers are local admin modules only and are never included in the public bundle.
 */

export interface StorageProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Uploads a file or binary payload to the content-addressed remote path.
   * Returns the canonical public URL.
   */
  put(
    file: Blob | Uint8Array,
    remotePath: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<string>;

  /**
   * Checks whether the file already exists on the remote target to avoid redundant uploads.
   */
  exists(remotePath: string): Promise<boolean>;

  /**
   * Performs an end-to-end health check verifying availability and CORS headers.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Generates the immutable public URL for a given relative path.
   */
  publicUrl(remotePath: string): string;
}
