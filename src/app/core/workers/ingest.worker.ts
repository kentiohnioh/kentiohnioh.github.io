/// <reference lib="webworker" />

import { IngestPipeline } from '../services/ingest-pipeline';

addEventListener('message', async ({ data }) => {
  const { file, options, id } = data;

  try {
    const result = await IngestPipeline.processFile(file, {
      ...options,
      onProgress: (progress) => {
        postMessage({ type: 'progress', id, progress });
      },
    });

    postMessage({ type: 'success', id, result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    postMessage({ type: 'error', id, error: errorMsg });
  }
});

