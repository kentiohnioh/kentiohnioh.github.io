import { describe, it, expect, beforeEach } from 'vitest';
import { DraftStorageService } from './draft-storage.service';
import { PhotoItem } from '../models/catalog.model';

function makeMockPhoto(): PhotoItem {
  return {
    schemaVersion: 1,
    id: 'draft-p1',
    slug: 'draft-slug',
    title: 'Draft Title',
    alt: 'Draft Alt',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'hash',
    palette: [{ hex: '#34d399', oklch: { l: 0.7, c: 0.1, h: 160 }, weight: 1 }],
    exif: {},
    sources: { variants: [] },
    grade: null,
    retouch: null,
    collectionIds: [],
    tags: [],
    mood: [],
    flags: { hasPeople: false, retouched: false, showBeforeAfter: false },
    rights: { copyright: '© Theng Nioh', license: 'CC' },
  };
}

describe('DraftStorageService', () => {
  let service: DraftStorageService;

  beforeEach(() => {
    localStorage.clear();
    service = new DraftStorageService();
  });

  it('guarantees tokens and secrets are never stored (deep sanitization)', () => {
    const maliciousPayload = {
      title: 'Valid Photo',
      githubToken: 'ghp_secret1234567890',
      nested: {
        hfToken: 'hf_supersecret',
        apiKey: '12345',
        safeProperty: 'Keep me',
      },
    };

    const clean = service.sanitizeForStorage(maliciousPayload) as any;
    expect(clean.title).toBe('Valid Photo');
    expect(clean.githubToken).toBeUndefined();
    expect(clean.nested.hfToken).toBeUndefined();
    expect(clean.nested.apiKey).toBeUndefined();
    expect(clean.nested.safeProperty).toBe('Keep me');
  });

  it('saves and loads draft photos correctly for crash recovery', async () => {
    const photos = [makeMockPhoto()];
    const saved = await service.saveDraft(photos);
    expect(saved).toBe(true);
    expect(service.lastSavedAt()).toBeTruthy();

    const loaded = await service.loadDraft();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].id).toBe('draft-p1');
  });

  it('clears draft after successful publish', async () => {
    await service.saveDraft([makeMockPhoto()]);
    await service.clearDraft();

    const loaded = await service.loadDraft();
    expect(loaded).toBeNull();
    expect(service.lastSavedAt()).toBeNull();
  });
});
