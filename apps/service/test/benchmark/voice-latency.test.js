import { test } from 'vitest';
import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

test('voice-latency', async () => {
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test 1: benchmark script passes (p95 <= 2000ms)
{
  const results = JSON.parse(readFileSync(path.join(__dirname, 'results.json'), 'utf8'));
  assert.ok(results.pass, `Voice latency benchmark failed: p95=${results.p95}ms > 2000ms`);
  assert.ok(results.p95 <= 2000, `p95 latency ${results.p95}ms exceeds 2000ms threshold`);
  console.log(`PASS: p95 latency ${results.p95}ms <= 2000ms`);
}

// Test 2: api.js logs latency per voice request
{
  const apiSrc = readFileSync(new URL('../../src/server/api.js', import.meta.url), 'utf8');
  assert.ok(apiSrc.includes('[voice] latency:'), 'api.js must log [voice] latency: per request');
  console.log('PASS: api.js logs [voice] latency: per request');
}

// Test 3: api.js logs LATENCY EXCEEDED when >2000ms
{
  const apiSrc = readFileSync(new URL('../../src/server/api.js', import.meta.url), 'utf8');
  assert.ok(apiSrc.includes('LATENCY EXCEEDED'), 'api.js must log LATENCY EXCEEDED when >2000ms');
  assert.ok(apiSrc.includes('ms > 2000'), 'api.js must check ms > 2000');
  console.log('PASS: api.js logs LATENCY EXCEEDED when threshold exceeded');
}

// Test 4: benchmark measures all three stages (STT+LLM+TTS)
{
  const benchSrc = readFileSync(path.join(__dirname, 'voice-latency.js'), 'utf8');
  assert.ok(benchSrc.includes('STT') || benchSrc.includes('stt'), 'benchmark must include STT stage');
  assert.ok(benchSrc.includes('LLM') || benchSrc.includes('llm'), 'benchmark must include LLM stage');
  assert.ok(benchSrc.includes('TTS') || benchSrc.includes('tts'), 'benchmark must include TTS stage');
  console.log('PASS: benchmark measures STT+LLM+TTS stages');
}

// Test 5: benchmark exits with non-zero if p95 > 2000ms
{
  const benchSrc = readFileSync(path.join(__dirname, 'voice-latency.js'), 'utf8');
  assert.ok(benchSrc.includes('process.exit(1)'), 'benchmark must exit(1) on failure');
  console.log('PASS: benchmark exits with code 1 on failure');
}

console.log('\nAll voice latency benchmark tests passed.');
});
