import { test } from 'vitest';
// DBB-003, DBB-004: store.delete() and store.del() aliases (static analysis)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

test('m15-store-delete', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/store/index.js'), 'utf8');

// DBB-003: export { del as delete } must exist
assert.ok(/export\s*\{[^}]*del\s+as\s+delete[^}]*\}/.test(src), 'store must export del as delete');

// DBB-004: del function must exist
assert.ok(/export\s+async\s+function\s+del/.test(src), 'store must export del function');

console.log('PASS: store exports del as delete (DBB-003)');
console.log('PASS: store exports del function (DBB-004)');
});
