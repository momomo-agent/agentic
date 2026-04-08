import { test } from 'vitest';
// DBB-007: brain.js tool_use response includes text field (static analysis)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

test('m15-brain-tool-use', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/server/brain.js'), 'utf8');

const toolUseYields = [...src.matchAll(/yield\s*\{[^\n]*type:\s*['"]tool_use['"][^\n]*/g)];
assert.ok(toolUseYields.length >= 1, 'Expected at least one tool_use yield');

for (const match of toolUseYields) {
  assert.ok(match[0].includes('text:'), `tool_use yield missing text field: ${match[0].trim()}`);
}

console.log(`PASS: brain.js ${toolUseYields.length} tool_use yield(s) all include text field (DBB-007)`);
});
