#!/usr/bin/env node
// Test: README completeness
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const readme = readFileSync(resolve(__dirname, '../README.md'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

// Install methods
test('README covers npx install', () => assert.ok(readme.includes('npx agentic-service')));
test('README covers global npm install', () => assert.ok(readme.includes('npm i -g agentic-service')));
test('README covers Docker install', () => assert.ok(readme.includes('docker run')));

// API endpoints
for (const ep of ['POST /api/chat', 'POST /api/transcribe', 'POST /api/synthesize', 'GET /api/status', 'GET /api/config', 'PUT /api/config']) {
  test(`README documents ${ep}`, () => assert.ok(readme.includes(ep), `missing: ${ep}`));
}

// Config options
test('README documents config options', () => assert.ok(readme.includes('config.json')));
test('README documents model option', () => assert.ok(readme.includes('"model"')));
test('README documents port option', () => assert.ok(readme.includes('"port"')));
test('README documents cloudFallback option', () => assert.ok(readme.includes('cloudFallback')));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
