import fs from 'node:fs';
import path from 'node:path';

console.log('===> Scanning repository and build outputs for leaked secrets & tokens...');

const FORBIDDEN_PATTERNS = [
  /ghp_[a-zA-Z0-9]{30,}/, // GitHub Personal Access Token
  /github_pat_[a-zA-Z0-9_]{30,}/, // Fine-grained GitHub PAT
  /hf_[a-zA-Z0-9]{30,}/, // Hugging Face User Access Token
  /BEGIN\s+RSA\s+PRIVATE\s+KEY/, // RSA Private Key
  /BEGIN\s+OPENSSH\s+PRIVATE\s+KEY/, // OpenSSH Private Key
  /sk_[a-zA-Z0-9]{24,}/, // Stripe / Generic Secret Key
];

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.system_generated',
  'brain',
  '.gemini',
]);

let violations = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      // Only scan text, source, json, md, html files
      const ext = path.extname(entry.name).toLowerCase();
      if (!['.ts', '.js', '.mjs', '.json', '.html', '.md', '.css', '.glsl', '.yml', '.yaml'].includes(ext)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`❌ CRITICAL SECURITY VIOLATION: Potential secret detected in ${fullPath}`);
          console.error(`   Pattern: ${pattern}`);
          violations++;
        }
      }
    }
  }
}

scanDir(process.cwd());

if (violations > 0) {
  console.error(`\n❌ Secret scan failed with ${violations} violation(s). Remove all hardcoded tokens.`);
  process.exit(1);
} else {
  console.log('✅ Secret scan clean: Zero tokens, private keys, or API credentials detected in codebase.');
  process.exit(0);
}
