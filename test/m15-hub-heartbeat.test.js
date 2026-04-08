import { test } from 'vitest';
// DBB-006: hub.js heartbeat timeout is 60s
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

test('m15-hub-heartbeat', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/server/hub.js'), 'utf8');

const matches60k = [...src.matchAll(/>\s*60000/g)];
assert.ok(matches60k.length >= 2, `Expected >= 2 occurrences of > 60000, found ${matches60k.length}`);

const matches40k = [...src.matchAll(/>\s*40000/g)];
assert.equal(matches40k.length, 0, 'Should not have 40000ms timeout');

console.log('PASS: hub.js uses 60000ms heartbeat timeout (DBB-006)');
});
