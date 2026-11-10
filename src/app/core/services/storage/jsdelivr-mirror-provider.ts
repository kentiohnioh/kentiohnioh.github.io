import { StorageProvider } from './storage-provider.interface';

export interface JsDelivrMirrorConfig {
  owner: string; // e.g. "thengnioh"
  repo: string; // e.g. "thengnioh-photos"
  branch?: string; // Default: "main"
}

/**
 * Secondary Mirror: jsDelivr CDN over a dedicated GitHub photos repository.
 * Files must stay under 20 MB each and total repository size under 1 GB.
 * Guarantees global edge caching with CORS headers.
 */
export class JsDelivrMirrorProvider implements StorageProvider {
  readonly id = 'jsdelivr-github-mirror';
  readonly name = 'jsDelivr GitHub Mirror (Secondary)';

  private readonly branch: string;
  private inMemoryGitHubToken: string | null = null;

  constructor(private readonly config: JsDelivrMirrorConfig) {
    this.branch = config.branch || 'main';
  }

  setGitHubToken(token: string): void {
    this.inMemoryGitHubToken = token.trim();
  }

  clearToken(): void {
    this.inMemoryGitHubToken = null;
  }

  publicUrl(remotePath: string): string {
    const cleanPath = remotePath.replace(/^\/+/, '');
    return `https://cdn.jsdelivr.net/gh/${this.config.owner}/${this.config.repo}@${this.branch}/${cleanPath}`;
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
      const resp = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}`);
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
    if (!this.inMemoryGitHubToken) {
      throw new Error(
        'jsDelivr Mirror: GitHub PAT write token not provided in memory. Use Node publish script or set token.'
      );
    }

    const cleanPath = remotePath.replace(/^\/+/, '');
    const apiUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${cleanPath}`;

    onProgress?.(20);

    // Convert file to base64
    let base64Content: string;
    if (file instanceof Blob) {
      const buffer = await file.arrayBuffer();
      base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    } else {
      base64Content = btoa(String.fromCharCode(...file));
    }

    onProgress?.(60);

    // Check if file already exists to get SHA
    let existingSha: string | undefined;
    try {
      const checkResp = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.inMemoryGitHubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (checkResp.ok) {
        const data = await checkResp.json();
        existingSha = data.sha;
      }
    } catch {
      // New file
    }

    const bodyPayload = {
      message: `publish: ${cleanPath}`,
      content: base64Content,
      branch: this.branch,
      ...(existingSha ? { sha: existingSha } : {}),
    };

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.inMemoryGitHubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    onProgress?.(90);

    if (!putResp.ok) {
      const errorMsg = await putResp.text();
      throw new Error(`GitHub Mirror upload failed (HTTP ${putResp.status}): ${errorMsg}`);
    }

    onProgress?.(100);
    return this.publicUrl(remotePath);
  }
}
