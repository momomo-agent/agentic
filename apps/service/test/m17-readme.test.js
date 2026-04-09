import { test } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import assert from 'assert';

test('m17-readme', async () => {
const root = join(import.meta.dirname, '..');
const readmePath = join(root, 'README.md');

assert.ok(existsSync(readmePath), 'README.md must exist at project root');

const content = readFileSync(readmePath, 'utf8');

// Install methods
assert.ok(content.includes('npx'), 'README must include npx install method');
assert.ok(content.includes('npm i -g') || content.includes('npm install -g'), 'README must include global npm install');

// API endpoints
const endpoints = ['/api/chat', '/api/transcribe', '/api/synthesize', '/api/status', '/api/config'];
for (const ep of endpoints) {
  assert.ok(content.includes(ep), `README must document endpoint ${ep}`);
}

console.log('PASS: README.md exists');
console.log('PASS: Contains npx install method');
console.log('PASS: Contains global npm install method');
for (const ep of endpoints) console.log(`PASS: Documents ${ep}`);
console.log(`\nTotal: ${3 + endpoints.length} passed, 0 failed`);
});
