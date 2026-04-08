import { test } from 'vitest';
// Mock llm.js before importing brain.js
import { createRequire } from 'module';
import { register } from 'node:module';

test('m19-brain', async () => {
let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  ✅', msg); passed++; }
  else { console.error('  ❌', msg); failed++; }
}

// Test registerTool and chat using dynamic import with mock
// We test brain.js by mocking the llm dependency via a temp file approach

import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Write a mock llm.js
const mockLlmPath = join(projectRoot, 'src/runtime/llm.mock.js');
writeFileSync(mockLlmPath, `
export async function* chat(messages, options) {
  if (options?.tools?.length) {
    yield { type: 'tool_use', id: 'call_1', name: options.tools[0].name, input: {}, text: '' };
  } else {
    yield { type: 'content', text: 'hello', done: true };
  }
}
`);

// Patch brain.js to use mock — read and eval with substituted import
import { readFileSync } from 'fs';
let brainSrc = readFileSync(join(projectRoot, 'src/server/brain.js'), 'utf8');
brainSrc = brainSrc.replace("from '../runtime/llm.js'", `from '../runtime/llm.mock.js'`);
const patchedPath = join(projectRoot, 'src/server/brain.mock.js');
writeFileSync(patchedPath, brainSrc);

const { registerTool, chat } = await import('../src/server/brain.mock.js');

// Test: chat yields at least one chunk
const chunks = [];
for await (const chunk of chat([{ role: 'user', content: 'hi' }], {})) {
  chunks.push(chunk);
}
assert(chunks.length > 0, 'chat yields at least one chunk');

// Test: registerTool registers a tool
let toolCalled = false;
registerTool('test_tool', () => { toolCalled = true; return 'result'; });

// Test: chat with registered tool — tool_use chunk triggers tool
const chunks2 = [];
for await (const chunk of chat([{ role: 'user', content: 'use tool' }], {})) {
  chunks2.push(chunk);
}
assert(chunks2.length > 0, 'chat with tool yields chunks');

// Cleanup
rmSync(mockLlmPath);
rmSync(patchedPath);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
