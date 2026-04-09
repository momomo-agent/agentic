import { test } from 'vitest';
// Tests for task-1775528544066: README completeness
import assert from 'assert';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test('m72-readme', async () => {
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push(name); }
}

const readme = readFileSync(resolve(new URL('..', import.meta.url).pathname, 'README.md'), 'utf8');

console.log('M72 README completeness tests\n');

test('DBB: covers npx install', () => assert.ok(readme.includes('npx agentic-service')));
test('DBB: covers global npm install', () => assert.ok(readme.match(/npm install -g|npm i -g/)));
test('DBB: lists POST /api/chat', () => assert.ok(readme.includes('/api/chat')));
test('DBB: lists POST /api/transcribe', () => assert.ok(readme.includes('/api/transcribe')));
test('DBB: lists POST /api/synthesize', () => assert.ok(readme.includes('/api/synthesize')));
test('DBB: lists GET /api/status', () => assert.ok(readme.includes('/api/status')));
test('DBB: lists GET /api/config', () => assert.ok(readme.includes('/api/config')));
test('DBB: lists PUT /api/config', () => assert.ok(readme.includes('/api/config')));
test('DBB: documents config options', () => assert.ok(readme.includes('profile') || readme.includes('model')));

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
});
