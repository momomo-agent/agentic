import { test } from 'vitest';
import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { startMark, endMark, getMetrics, measurePipeline } from '../src/runtime/profiler.js';
import { record, p95, reset } from '../src/runtime/latency-log.js';

// ─── DBB 3.1: Profiler instrumentation in all three pipeline stages ───

test('m94: stt.js wraps transcribe with profiler startMark/endMark', () => {
  const src = readFileSync(new URL('../src/runtime/stt.js', import.meta.url), 'utf8');
  assert.ok(src.includes("startMark('stt')"), 'stt.js must call startMark("stt")');
  assert.ok(src.includes("endMark('stt')"), 'stt.js must call endMark("stt")');
});

test('m94: tts.js wraps synthesize with profiler startMark/endMark', () => {
  const src = readFileSync(new URL('../src/runtime/tts.js', import.meta.url), 'utf8');
  assert.ok(src.includes("startMark('tts')"), 'tts.js must call startMark("tts")');
  assert.ok(src.includes("endMark('tts')"), 'tts.js must call endMark("tts")');
});

test('m94: llm.js or brain.js wraps chat with profiler startMark/endMark', () => {
  const brainSrc = readFileSync(new URL('../src/server/brain.js', import.meta.url), 'utf8');
  const hasBrainProfiler = brainSrc.includes("startMark('llm')") && brainSrc.includes("endMark('llm')");
  assert.ok(hasBrainProfiler, 'brain.js must profile llm stage');
});

// ─── DBB 3.2: Latency-log.js records per-stage latency ───

test('m94: stt.js records latency via latency-log.record', () => {
  const src = readFileSync(new URL('../src/runtime/stt.js', import.meta.url), 'utf8');
  assert.ok(src.includes("record('stt'"), 'stt.js must record stt latency');
});

test('m94: tts.js records latency via latency-log.record', () => {
  const src = readFileSync(new URL('../src/runtime/tts.js', import.meta.url), 'utf8');
  assert.ok(src.includes("record('tts'"), 'tts.js must record tts latency');
});

// ─── DBB 3.3: Voice API endpoint pipeline structure ───

test('m94: /api/voice endpoint implements STT → LLM → TTS pipeline', () => {
  const src = readFileSync(new URL('../src/server/api.js', import.meta.url), 'utf8');
  assert.ok(src.includes('stt.transcribe'), 'voice endpoint must call stt.transcribe');
  assert.ok(src.includes('tts.synthesize'), 'voice endpoint must call tts.synthesize');
  // Verify the voice endpoint section specifically calls chat(messages)
  const voiceSection = src.slice(src.indexOf("r.post('/api/voice'"));
  assert.ok(voiceSection.includes('chat(messages)') || voiceSection.includes('chat( '), 'voice endpoint must call chat for LLM');
  // Verify order: stt before chat before tts within the voice endpoint
  const sttIdx = voiceSection.indexOf('stt.transcribe');
  const chatIdx = voiceSection.search(/chat\s*\(/);
  const ttsIdx = voiceSection.indexOf('tts.synthesize');
  assert.ok(sttIdx < chatIdx && chatIdx < ttsIdx, 'Pipeline must be STT → LLM → TTS order');
});

test('m94: /api/voice logs [voice] latency per request', () => {
  const src = readFileSync(new URL('../src/server/api.js', import.meta.url), 'utf8');
  assert.ok(src.includes('[voice] latency:'), 'Must log [voice] latency: per voice request');
});

test('m94: /api/voice logs LATENCY EXCEEDED when >2000ms', () => {
  const src = readFileSync(new URL('../src/server/api.js', import.meta.url), 'utf8');
  assert.ok(src.includes('LATENCY EXCEEDED'), 'Must log LATENCY EXCEEDED on threshold breach');
  assert.ok(src.includes('> 2000'), 'Threshold must be 2000ms');
});

// ─── DBB 3.4: measurePipeline threshold behavior ───

test('m94: measurePipeline passes when total < 2000ms', () => {
  const result = measurePipeline([
    { name: 'stt', durationMs: 50 },
    { name: 'llm', durationMs: 500 },
    { name: 'tts', durationMs: 50 },
  ]);
  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.total, 600);
});

test('m94: measurePipeline fails at exactly 2000ms', () => {
  const result = measurePipeline([
    { name: 'stt', durationMs: 500 },
    { name: 'llm', durationMs: 1000 },
    { name: 'tts', durationMs: 500 },
  ]);
  assert.strictEqual(result.pass, false, 'Should fail at exactly 2000ms (strict <)');
  assert.strictEqual(result.total, 2000);
});

test('m94: measurePipeline fails when total > 2000ms', () => {
  const result = measurePipeline([
    { name: 'stt', durationMs: 800 },
    { name: 'llm', durationMs: 1500 },
    { name: 'tts', durationMs: 800 },
  ]);
  assert.strictEqual(result.pass, false);
  assert.strictEqual(result.total, 3100);
});

test('m94: measurePipeline passes just under 2000ms', () => {
  const result = measurePipeline([
    { name: 'stt', durationMs: 600 },
    { name: 'llm', durationMs: 1000 },
    { name: 'tts', durationMs: 399 },
  ]);
  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.total, 1999);
});

// ─── DBB 3.5: Benchmark results exist and pass ───

test('m94: benchmark results.json exists with p95 <= 2000ms', () => {
  const results = JSON.parse(readFileSync('test/benchmark/results.json', 'utf8'));
  assert.ok(results.p95 !== undefined, 'results.json must have p95');
  assert.ok(results.p95 <= 2000, `p95=${results.p95}ms exceeds 2000ms`);
  assert.strictEqual(results.target, 2000, 'Target must be 2000ms');
  assert.strictEqual(results.pass, true, 'Benchmark must pass');
});

test('m94: benchmark results include p50, p95, max', () => {
  const results = JSON.parse(readFileSync('test/benchmark/results.json', 'utf8'));
  assert.ok(typeof results.p50 === 'number', 'Must have p50');
  assert.ok(typeof results.p95 === 'number', 'Must have p95');
  assert.ok(typeof results.max === 'number', 'Must have max');
  assert.ok(results.p50 <= results.p95, 'p50 must be <= p95');
  assert.ok(results.p95 <= results.max, 'p95 must be <= max');
});

// ─── DBB 3.6: /api/perf endpoint shape ───

test('m94: getMetrics returns {last, avg, count} per stage', () => {
  // Use a separate label to avoid contamination from prior tests
  const label = 'm94_test_stage_' + Date.now();
  startMark(label);
  const elapsed = endMark(label);
  const metrics = getMetrics();
  assert.ok(metrics[label], `Must have ${label} metric`);
  assert.strictEqual(metrics[label].last, elapsed);
  assert.ok(typeof metrics[label].avg === 'number', 'avg must be a number');
  assert.ok(metrics[label].avg >= 0, 'avg must be >= 0');
  assert.strictEqual(metrics[label].count, 1);
});

// ─── DBB 3.7: latency-log p95 calculation ───

test('m94: latency-log p95 is correct for known distribution', () => {
  reset();
  // Record 100 samples: 1ms through 100ms
  for (let i = 1; i <= 100; i++) record('p95test', i);
  const p = p95('p95test');
  // Math.floor(100 * 0.95) = 95, so index 95 of 0-indexed sorted array = value 96
  assert.strictEqual(p, 96, `p95 should be 96, got ${p}`);
  reset();
});

test('m94: latency-log p95 returns 0 for empty stage', () => {
  reset();
  assert.strictEqual(p95('nonexistent'), 0);
});

// ─── DBB 3.8: Benchmark script structure ───

test('m94: scripts/benchmark.js measures each stage individually', () => {
  const src = readFileSync(new URL('../scripts/benchmark.js', import.meta.url), 'utf8');
  assert.ok(src.includes('stt'), 'Must measure STT stage');
  assert.ok(src.includes('llm'), 'Must measure LLM stage');
  assert.ok(src.includes('tts'), 'Must measure TTS stage');
  assert.ok(src.includes('total'), 'Must compute total');
  assert.ok(src.includes('2000'), 'Must check against 2000ms threshold');
});

test('m94: scripts/benchmark.js exits non-zero on failure', () => {
  const src = readFileSync(new URL('../scripts/benchmark.js', import.meta.url), 'utf8');
  assert.ok(src.includes('process.exit(1)'), 'Must exit(1) when total >= 2000ms');
});

test('m94: scripts/benchmark.js outputs JSON result', () => {
  const src = readFileSync(new URL('../scripts/benchmark.js', import.meta.url), 'utf8');
  assert.ok(src.includes('JSON.stringify'), 'Must output JSON');
  assert.ok(src.includes('stt:') && src.includes('llm:') && src.includes('tts:'), 'JSON must include per-stage timings');
});
