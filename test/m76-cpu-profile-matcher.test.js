import { test } from 'vitest';
import { matchProfile } from '../src/detector/matcher.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test('m76-cpu-profile-matcher', async () => {
let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { console.log(`  PASS: ${name}`); passed++; }
  else { console.error(`  FAIL: ${name}`); failed++; }
}

const data = JSON.parse(readFileSync(resolve('profiles/default.json'), 'utf8'));

// 1. cpu-only hardware matches cpu-only profile
const cpuConfig = matchProfile(data, { gpu: { type: 'cpu-only' }, memory: 4 });
ok('cpu-only hardware returns gemma2:2b config', cpuConfig?.llm?.model === 'gemma2:2b');
ok('cpu-only hardware returns q4 quantization', cpuConfig?.llm?.quantization === 'q4');

// 2. apple-silicon hardware still matches apple-silicon profile
const appleConfig = matchProfile(data, { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 16 });
ok('apple-silicon hardware unaffected', appleConfig?.llm?.model === 'gemma4:26b');

// 3. nvidia hardware still matches nvidia profile
const nvidiaConfig = matchProfile(data, { platform: 'linux', gpu: { type: 'nvidia' }, memory: 8 });
ok('nvidia hardware unaffected', nvidiaConfig?.llm?.model === 'gemma4:13b');

// 4. unknown hardware falls through to catch-all
const fallbackConfig = matchProfile(data, { gpu: { type: 'unknown' }, memory: 4 });
ok('unknown hardware falls to catch-all', !!fallbackConfig?.llm?.model);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
