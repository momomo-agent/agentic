import { test } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test('m76-cpu-profile', async () => {
let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { console.log(`  PASS: ${name}`); passed++; }
  else { console.error(`  FAIL: ${name}`); failed++; }
}

const data = JSON.parse(readFileSync(resolve('profiles/default.json'), 'utf8'));
const profiles = data.profiles;

// 1. cpu-only profile exists
const cpuOnly = profiles.find(p => p.match?.gpu === 'cpu-only');
ok('cpu-only profile exists', !!cpuOnly);

// 2. Uses gemma2:2b or gemma3:1b with q4
if (cpuOnly) {
  const model = cpuOnly.config?.llm?.model;
  ok('cpu-only uses gemma2:2b or gemma3:1b', model === 'gemma2:2b' || model === 'gemma3:1b');
  ok('cpu-only uses q4 quantization', cpuOnly.config?.llm?.quantization === 'q4');
}

// 3. cpu-only appears before catch-all {}
const cpuIdx = profiles.findIndex(p => p.match?.gpu === 'cpu-only');
const catchAllIdx = profiles.findIndex(p => Object.keys(p.match).length === 0);
ok('cpu-only appears before catch-all', cpuIdx !== -1 && (catchAllIdx === -1 || cpuIdx < catchAllIdx));

// 4. Existing profiles unaffected
const apple = profiles.find(p => p.match?.gpu === 'apple-silicon');
ok('apple-silicon profile intact', !!apple && apple.config?.llm?.model === 'gemma4:26b');
const nvidia = profiles.find(p => p.match?.gpu === 'nvidia');
ok('nvidia profile intact', !!nvidia && nvidia.config?.llm?.model === 'gemma4:13b');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
