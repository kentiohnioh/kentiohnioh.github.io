import { spawn } from 'node:child_process';

console.log('===> Starting Theng Nioh Admin Studio & Live Publish Bridge...');

// 1. Spawn Admin Bridge on port 4201
const bridge = spawn('node', ['scripts/admin-bridge.mjs'], { stdio: 'inherit' });

// 2. Spawn Angular Dev Server on port 4200
const isWindows = process.platform === 'win32';
const npxBin = isWindows ? 'npx.cmd' : 'npx';
const ng = spawn(npxBin, ['ng', 'serve', '--configuration', 'admin'], { stdio: 'inherit' });

bridge.on('error', (err) => console.error('[Bridge Error]', err));
ng.on('error', (err) => console.error('[Angular Serve Error]', err));

const cleanup = () => {
  try {
    bridge.kill();
    ng.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
