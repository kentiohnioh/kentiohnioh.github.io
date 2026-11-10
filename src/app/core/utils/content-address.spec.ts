import { describe, it, expect } from 'vitest';
import {
  computeSha256,
  buildContentAddressedPath,
} from './content-address';

describe('Content-Addressed File Naming & Sharding', () => {
  it('computes consistent SHA-256 for identical byte buffers', async () => {
    const dataA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const dataB = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const hashA = await computeSha256(dataA);
    const hashB = await computeSha256(dataB);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('builds canonical monthly sharded paths with 12-char hash and width', () => {
    const fixedDate = new Date('2026-11-10T12:00:00Z');
    const sha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const path640 = buildContentAddressedPath({
      sha256: sha,
      width: 640,
      format: 'avif',
      date: fixedDate,
    });

    const path1280 = buildContentAddressedPath({
      sha256: sha,
      width: 1280,
      format: 'webp',
      date: fixedDate,
    });

    expect(path640).toBe('photos/2026-11/e3b0c44298fc-640.avif');
    expect(path1280).toBe('photos/2026-11/e3b0c44298fc-1280.webp');
  });

  it('automatically shards by hash prefix when directory density exceeds 5,000 files', () => {
    const fixedDate = new Date('2026-11-10T12:00:00Z');
    const sha = 'ab98c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const shardedPath = buildContentAddressedPath({
      sha256: sha,
      width: 2048,
      format: 'avif',
      date: fixedDate,
      filesInFolderEstimate: 6200,
    });

    expect(shardedPath).toBe('photos/2026-11/ab/ab98c44298fc-2048.avif');
  });
});

