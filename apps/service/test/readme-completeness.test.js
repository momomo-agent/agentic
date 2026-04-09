import { test } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
test('readme-completeness', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));

const readme = readFileSync(join(__dirname, '../README.md'), 'utf8');

const checks = [
  ['Install section', /## Install/i],
  ['Usage/Quick Start section', /## Quick Start/i],
  ['API Endpoints section', /## API Endpoints/i],
  ['Environment Variables section', /Environment Variables/i],
  ['POST /api/chat', /\/api\/chat/],
  ['POST /api/transcribe', /\/api\/transcribe/],
  ['POST /api/synthesize', /\/api\/synthesize/],
  ['GET /api/status', /\/api\/status/],
  ['GET /api/config', /\/api\/config/],
  ['PUT /api/config', /\/api\/config/],
  ['npx install', /npx agentic-service/],
  ['global install', /npm i -g/],
];

let passed = 0, failed = 0;
for (const [name, pattern] of checks) {
  if (pattern.test(readme)) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.log(`FAIL: ${name}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
