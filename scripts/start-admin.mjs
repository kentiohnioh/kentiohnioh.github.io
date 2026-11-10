import { spawn } from 'node:child_process';
import path from 'node:path';

console.log('===> Starting Theng Nioh Admin Studio & Live Publish Bridge...');

const bridgeScript = path.resolve('scripts/admin-bridge.mjs');
const ngScript = path.resolve('node_modules/@angular/cli/bin/ng.js');

// 1. Spawn Admin Bridge on port 4201
const bridge = spawn(process.execPath, [bridgeScript], { stdio: 'inherit' });

// 2. Spawn Angular Dev Server on port 4200 directly with Node binary
const ng = spawn(process.execPath, [ngScript, 'serve', '--configuration', 'admin'], {
  stdio: 'inherit',
});

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
