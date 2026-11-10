import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

console.log('===> Verifying production bundle tree-shaking and isolation...');

const DIST_ROOT = path.resolve('dist', 'theng-nioh');
const BROWSER_DIR = fs.existsSync(path.join(DIST_ROOT, 'browser'))
  ? path.join(DIST_ROOT, 'browser')
  : DIST_ROOT;

if (!fs.existsSync(BROWSER_DIR)) {
  console.error(`ERROR: Build output directory not found at: ${BROWSER_DIR}`);
  console.error('Please run "npm run build" before running bundle verification.');
  process.exit(1);
}

const FORBIDDEN_TOKENS = ['admin', 'mediapipe', 'tasks-vision', 'jsquash', 'huggingface'];
const violations = [];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

const allEmittedFiles = getAllFiles(BROWSER_DIR);
console.log(`Scanning ${allEmittedFiles.length} files in ${BROWSER_DIR}...`);

let totalJsBytes = 0;
let totalJsGzipBytes = 0;
let mainJsFound = false;

for (const filePath of allEmittedFiles) {
  const relPath = path.relative(BROWSER_DIR, filePath);
  const lowerRelPath = relPath.toLowerCase();

  // 1. Check filename for forbidden keywords
  for (const token of FORBIDDEN_TOKENS) {
    if (lowerRelPath.includes(token)) {
      violations.push(`Forbidden token "${token}" found in emitted filename: ${relPath}`);
    }
  }

  // 2. Scan JavaScript files for content leakage and compute sizes
  if (filePath.endsWith('.js')) {
    const content = fs.readFileSync(filePath);
    const contentStr = content.toString('utf-8');

    // Calculate gzip size
    const gzipped = zlib.gzipSync(content);
    totalJsBytes += content.length;
    totalJsGzipBytes += gzipped.length;

    if (relPath.startsWith('main-') || relPath.startsWith('main.')) {
      mainJsFound = true;
      console.log(`  - Main entry [${relPath}]: ${(content.length / 1024).toFixed(1)} KB (Gzip: ${(gzipped.length / 1024).toFixed(1)} KB)`);
    }

    for (const token of FORBIDDEN_TOKENS) {
      if (contentStr.toLowerCase().includes(token)) {
        violations.push(`Forbidden token "${token}" leaked into code bundle: ${relPath}`);
      }
    }
  }
}

console.log(`\nBundle Size Summary:`);
console.log(`  Total JavaScript: ${(totalJsBytes / 1024).toFixed(1)} KB uncompressed, ${(totalJsGzipBytes / 1024).toFixed(1)} KB gzipped`);
console.log(`  Performance Budget Target: <= 180 KB gzip`);

if (violations.length > 0) {
  console.error('\n❌ BUNDLE VERIFICATION FAILED! Admin code or sensitive libraries leaked into public bundle:');
  violations.forEach((v, idx) => console.error(`  ${idx + 1}) ${v}`));
  process.exit(1);
} else {
  console.log('\n✅ BUNDLE VERIFICATION PASSED!');
  console.log('  - Zero admin chunks or references found.');
  console.log('  - MediaPipe, tasks-vision, jsquash, and huggingface are 100% physically absent from public dist.');
  process.exit(0);
}
