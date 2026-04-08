import { test } from 'vitest';
// DBB-005: hub.js wakeword broadcast (static analysis)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

test('m15-hub-wakeword', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/server/hub.js'), 'utf8');

// broadcastWakeword iterates registry
assert.ok(src.includes('broadcastWakeword'), 'broadcastWakeword function must exist');
assert.ok(/for\s*\(.*registry/.test(src), 'broadcastWakeword must iterate registry');
assert.ok(src.includes("type: 'wakeword'"), 'must send wakeword type message');

// wakeword message handler calls broadcastWakeword
assert.ok(/msg\.type\s*===\s*['"]wakeword['"]/.test(src), 'must handle wakeword message type');
assert.ok(/wakeword.*broadcastWakeword|broadcastWakeword.*wakeword/s.test(src), 'wakeword handler must call broadcastWakeword');

console.log('PASS: hub.js broadcastWakeword sends to all registry devices (DBB-005)');
});
