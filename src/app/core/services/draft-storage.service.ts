import { Injectable, signal } from '@angular/core';
import { PhotoItem } from '../models/catalog.model';

export interface StorageQuotaInfo {
  usedBytes: number;
  totalQuotaBytes: number;
  percentageUsed: number;
}

export interface DraftEnvelope {
  savedAt: string;
  schemaVersion: number;
  photos: PhotoItem[];
}

@Injectable({
  providedIn: 'root',
})
export class DraftStorageService {
  private readonly DB_NAME = 'theng_nioh_admin_drafts';
  private readonly STORE_NAME = 'catalog_drafts';
  private readonly DRAFT_KEY = 'active_catalog_draft';

  readonly lastSavedAt = signal<string | null>(null);
  readonly storageQuota = signal<StorageQuotaInfo>({
    usedBytes: 0,
    totalQuotaBytes: 50 * 1024 * 1024, // 50MB baseline
    percentageUsed: 0,
  });

  /**
   * Deep sanitize a photo record to guarantee NO credentials, tokens, or auth keys are stored.
   */
  sanitizeForStorage(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeForStorage(item));
    }

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase();
      // Strip any accidental auth/token/secret keys
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('auth') ||
        lower.includes('key')
      ) {
        continue;
      }
      clean[k] = this.sanitizeForStorage(v);
    }
    return clean;
  }

  /**
   * Save staged photos draft to storage.
   */
  async saveDraft(photos: PhotoItem[]): Promise<boolean> {
    const sanitized = this.sanitizeForStorage(photos) as PhotoItem[];
    const envelope: DraftEnvelope = {
      savedAt: new Date().toISOString(),
      schemaVersion: 1,
      photos: sanitized,
    };

    const jsonStr = JSON.stringify(envelope);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.DRAFT_KEY, jsonStr);
        this.lastSavedAt.set(envelope.savedAt);
        await this.updateQuotaMeter(jsonStr.length);
        return true;
      }
    } catch (err) {
      console.warn('Draft autosave to localStorage failed:', err);
    }

    return false;
  }

  /**
   * Load stored draft from storage for crash recovery.
   */
  async loadDraft(): Promise<PhotoItem[] | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(this.DRAFT_KEY);
        if (!item) return null;

        const envelope = JSON.parse(item) as DraftEnvelope;
        if (envelope && Array.isArray(envelope.photos)) {
          this.lastSavedAt.set(envelope.savedAt);
          return envelope.photos;
        }
      }
    } catch (err) {
      console.warn('Failed to recover draft:', err);
    }
    return null;
  }

  /**
   * Clear active draft after successful publish.
   */
  async clearDraft(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.DRAFT_KEY);
        this.lastSavedAt.set(null);
        await this.updateQuotaMeter(0);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Measure browser storage quota.
   */
  async updateQuotaMeter(usedBytesHint = 0): Promise<StorageQuotaInfo> {
    let usedBytes = usedBytesHint;
    let totalQuotaBytes = 50 * 1024 * 1024; // 50 MB default

    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.estimate === 'function'
    ) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) usedBytes = estimate.usage;
        if (estimate.quota) totalQuotaBytes = estimate.quota;
      } catch {
        // Fall back to estimated hint
      }
    }

    const percentageUsed = Math.min(100, Math.round((usedBytes / totalQuotaBytes) * 1000) / 10);
    const info: StorageQuotaInfo = { usedBytes, totalQuotaBytes, percentageUsed };
    this.storageQuota.set(info);
    return info;
  }
}

