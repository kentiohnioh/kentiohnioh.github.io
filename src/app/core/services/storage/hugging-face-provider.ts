import { StorageProvider } from './storage-provider.interface';

export interface HuggingFaceConfig {
  repoId: string; // e.g. "thengnioh/photography-archive"
  branch?: string; // Default: "main"
}

/**
 * Primary Storage: Hugging Face Dataset Provider.
 * Free storage with Git LFS backed files and global CDN resolution.
 * Tokens are kept in volatile memory only and are wiped on unload.
 */
export class HuggingFaceDatasetProvider implements StorageProvider {
  readonly id = 'huggingface-dataset';
  readonly name = 'Hugging Face Dataset (Primary)';

  private inMemoryToken: string | null = null;
  private readonly branch: string;

  constructor(private readonly config: HuggingFaceConfig) {
    this.branch = config.branch || 'main';
  }

  /**
   * Sets the write token in volatile memory. Never persisted to disk or browser storage.
   */
  setToken(token: string): void {
    this.inMemoryToken = token.trim();
  }

  clearToken(): void {
    this.inMemoryToken = null;
  }

  hasToken(): boolean {
    return Boolean(this.inMemoryToken && this.inMemoryToken.length > 0);
  }

  publicUrl(remotePath: string): string {
    const cleanPath = remotePath.replace(/^\/+/, '');
    return `https://huggingface.co/datasets/${this.config.repoId}/resolve/${this.branch}/${cleanPath}`;
  }

  async exists(remotePath: string): Promise<boolean> {
    try {
      const url = this.publicUrl(remotePath);
      const resp = await fetch(url, { method: 'HEAD' });
      return resp.status === 200;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testUrl = `https://huggingface.co/api/datasets/${this.config.repoId}`;
      const resp = await fetch(testUrl);
      return resp.ok;
    } catch {
      return false;
    }
  }

  async put(
    file: Blob | Uint8Array,
    remotePath: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<string> {
    if (!this.inMemoryToken) {
      throw new Error('Hugging Face Dataset Provider: write token not set in memory.');
    }

    const cleanPath = remotePath.replace(/^\/+/, '');
    const uploadUrl = `https://huggingface.co/api/datasets/${this.config.repoId}/upload/${this.branch}/${cleanPath}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.inMemoryToken}`,
      'Content-Type': file instanceof Blob ? file.type || 'application/octet-stream' : 'application/octet-stream',
    };

    onProgress?.(10);

    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: file as BodyInit,
    });

    onProgress?.(90);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`Hugging Face upload failed (HTTP ${resp.status}): ${errText}`);
    }

    onProgress?.(100);
    return this.publicUrl(remotePath);
  }
}

