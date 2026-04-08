import { test } from 'vitest';
// Tests for task-1775528544032: npx entrypoint verification
import assert from 'assert';
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';

test('m72-npx-entrypoint', async () => {
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push(name); }
}

const root = new URL('..', import.meta.url).pathname;
const binPath = resolve(root, 'bin/agentic-service.js');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

console.log('M72 npx entrypoint tests\n');

test('DBB: bin/agentic-service.js has shebang', () => {
  const first = readFileSync(binPath, 'utf8').split('\n')[0];
  assert.strictEqual(first, '#!/usr/bin/env node');
});

test('DBB: bin/agentic-service.js is executable', () => {
  const mode = statSync(binPath).mode;
  assert.ok(mode & 0o111, 'file is not executable');
});

test('DBB: package.json bin field points to bin/agentic-service.js', () => {
  assert.strictEqual(pkg.bin?.['agentic-service'], 'bin/agentic-service.js');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
});
