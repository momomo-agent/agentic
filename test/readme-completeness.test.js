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
  ['API Reference section', /## API Reference/i],
  ['Docker section', /## Docker/i],
  ['Environment Variables section', /## Environment Variables/i],
  ['POST /api/chat', /POST \/api\/chat/],
  ['POST /api/transcribe', /POST \/api\/transcribe/],
  ['POST /api/synthesize', /POST \/api\/synthesize/],
  ['GET /api/status', /GET \/api\/status/],
  ['GET /api/config', /GET \/api\/config/],
  ['PUT /api/config', /PUT \/api\/config/],
  ['npx install', /npx agentic-service/],
  ['global install', /npm i -g/],
  ['docker run', /docker run/],
  ['docker-compose', /docker-compose/],
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
