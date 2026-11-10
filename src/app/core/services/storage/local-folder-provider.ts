import { StorageProvider } from './storage-provider.interface';

/**
 * Local Folder Provider using File System Access API.
 * Allows the photographer to write processed content directly into a local clone
 * without network round-trips, before running git push or scripts/publish.mjs.
 */
export class LocalFolderProvider implements StorageProvider {
  readonly id = 'local-folder';
  readonly name = 'Local Repository Folder';

  private directoryHandle: FileSystemDirectoryHandle | null = null;

  async requestDirectoryAccess(): Promise<boolean> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      return false;
    }
    try {
      this.directoryHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      return true;
    } catch {
      return false;
    }
  }

  hasDirectoryHandle(): boolean {
    return Boolean(this.directoryHandle);
  }

  publicUrl(remotePath: string): string {
    const clean = remotePath.replace(/^\/+/, '');
    return clean;
  }

  async exists(remotePath: string): Promise<boolean> {
    if (!this.directoryHandle) return false;
    try {
      const parts = remotePath.split('/').filter(Boolean);
      let currentDir = this.directoryHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i]);
      }
      await currentDir.getFileHandle(parts[parts.length - 1]);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.directoryHandle);
  }

  async put(
    file: Blob | Uint8Array,
    remotePath: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<string> {
    if (!this.directoryHandle) {
      throw new Error('LocalFolderProvider: Directory handle not selected. Call requestDirectoryAccess first.');
    }

    onProgress?.(10);
    const parts = remotePath.split('/').filter(Boolean);
    let currentDir = this.directoryHandle;

    // Navigate or create subdirectories
    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
    }

    onProgress?.(40);
    const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await fileHandle.createWritable();

    onProgress?.(70);
    await writable.write(file instanceof Blob ? file : new Blob([file as Uint8Array<ArrayBuffer>]));
    await writable.close();

    onProgress?.(100);
    return this.publicUrl(remotePath);
  }
}

