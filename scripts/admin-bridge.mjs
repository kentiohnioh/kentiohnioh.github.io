import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const PORT = 4201;

const server = http.createServer(async (req, res) => {
  // CORS Headers for localhost:4200
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', port: PORT }));
    return;
  }

  // Publish endpoint
  if (req.method === 'POST' && req.url === '/api/publish') {
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      const { photos = [], collections = [] } = JSON.parse(body);

      // 1. Write the monthly shard
      const shardPath = path.resolve('public', 'catalog', 'shards', '2026-11.json');
      const shardData = {
        shardId: '2026-11',
        generatedAt: new Date().toISOString(),
        photos,
      };
      const shardStr = JSON.stringify(shardData, null, 2);
      fs.writeFileSync(shardPath, shardStr, 'utf-8');

      // 2. Compute SHA-256 hash
      const shardHash = crypto.createHash('sha256').update(shardStr).digest('hex');

      // 3. Update public/catalog/index.json
      const indexPath = path.resolve('public', 'catalog', 'index.json');
      let indexData = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        totalPhotos: photos.length,
        collections: [],
        facets: {
          apertureBuckets: {},
          focalBuckets: {},
          hueFamilies: {},
          isoBuckets: {},
          moods: {},
        },
        shards: [
          {
            id: '2026-11',
            count: photos.length,
            url: 'catalog/shards/2026-11.json',
            sha256: shardHash,
          },
        ],
      };

      if (fs.existsSync(indexPath)) {
        try {
          indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        } catch {
          // Use default template
        }
      }

      indexData.generatedAt = shardData.generatedAt;
      indexData.totalPhotos = photos.length;
      indexData.shards = [
        {
          id: '2026-11',
          count: photos.length,
          url: 'catalog/shards/2026-11.json',
          sha256: shardHash,
        },
      ];

      // Update collections with photo counts and cover photos
      if (collections && collections.length > 0) {
        indexData.collections = collections.map((col) => {
          const matchingPhotos = photos.filter((p) =>
            p.collectionIds?.includes(col.id) || p.collectionIds?.includes(col.slug)
          );
          return {
            ...col,
            count: matchingPhotos.length,
            coverPhotoId: matchingPhotos[0]?.id || col.coverPhotoId || '',
          };
        });
      }

      // Compute facets from photos
      const moods = {};
      for (const p of photos) {
        for (const m of p.mood || []) {
          moods[m] = (moods[m] || 0) + 1;
        }
      }
      indexData.facets.moods = moods;

      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');

      // 4. Git Add, Commit & Push
      let gitOutput = '';
      try {
        const addRes = await execAsync('git add public/catalog/shards/2026-11.json public/catalog/index.json');
        gitOutput += addRes.stdout || '';

        const commitRes = await execAsync('git commit -m "feat(catalog): publish photographs and albums from admin studio"');
        gitOutput += commitRes.stdout || '';

        const pushRes = await execAsync('git push origin main');
        gitOutput += pushRes.stdout || '';
      } catch (gitErr) {
        // If git commit had nothing to commit or push failed, capture it
        const msg = gitErr.message || String(gitErr);
        if (!msg.includes('nothing to commit')) {
          console.warn('Git operation warning:', msg);
          gitOutput += ` (Git notice: ${msg})`;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          count: photos.length,
          gitOutput,
          message: `Successfully published ${photos.length} photograph(s) and synced to GitHub live site!`,
        })
      );
    } catch (err) {
      console.error('Publish error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Admin Bridge] Listening on http://127.0.0.1:${PORT}`);
});

