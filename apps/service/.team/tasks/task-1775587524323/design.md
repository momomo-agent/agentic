# Task Design: Verify voice latency <2s end-to-end benchmark

## Objective
Verify STT+LLM+TTS pipeline latency is <2s end-to-end. Run existing latency benchmarks, confirm they pass, and report actual measured values. If not met, profile bottleneck and document findings.

## Key Files (all verified to exist)
- `src/runtime/profiler.js` — exports `startMark(label)`, `endMark(label) → number`, `getMetrics()`, `measurePipeline(stages) → { stages, total, pass }`
- `src/runtime/latency-log.js` — exports `record(stage, ms)`, `p95(stage)`, `reset()`; per-stage percentile tracking
- `scripts/benchmark.js` — standalone CLI benchmark, runs STT→LLM→TTS, exits 0 if <2000ms
- `test/m19-benchmark.test.js` — validates benchmark script structure (transcribe/chat/synthesize calls, Date.now, JSON.stringify, exit codes)
- `test/benchmark/voice-latency.js` — test-oriented benchmark, 5 samples, p50/p95/max, writes results.json
- `test/benchmark/voice-latency.test.js` — verifies results.json pass=true
- `test/m88-voice-latency-benchmark.test.js` — unit tests measurePipeline() with hardcoded durations
- `test/m72-latency.test.js` — mock-based test with fast adapters (50ms STT, 100ms LLM, 50ms TTS)
- `test/m80-voice-latency.test.js` — tests record/p95/reset from latency-log.js

## Verification Steps

### Step 1: Run existing benchmark tests
```bash
npx vitest run test/m88-voice-latency-benchmark.test.js
npx vitest run test/m72-latency.test.js
npx vitest run test/m80-voice-latency.test.js
npx vitest run test/benchmark/voice-latency.test.js
```

### Step 2: Verify results files
- `test/benchmark/results.json` — should have `pass: true`
- `test/results/latency-report.json` — should have p95 <= 2000ms

### Step 3: Run standalone benchmark (if environment supports it)
```bash
node scripts/benchmark.js
```
Expected output: `{ stt: <ms>, llm: <ms>, tts: <ms>, total: <ms> }` with total < 2000ms

### Step 4: If benchmarks fail
- Profile each stage (STT, LLM, TTS) individually
- Identify which stage exceeds its budget
- Document bottleneck in task output
- Acceptable: CPU-only hardware may exceed 2s — document as known limitation

## Function Signatures to Verify

```javascript
// src/runtime/profiler.js
startMark(label: string) → void
endMark(label: string) → number           // returns elapsed ms
getMetrics() → Record<string, number>
measurePipeline(stages: string[]) → { stages: Record<string,number>, total: number, pass: boolean }

// src/runtime/latency-log.js
record(stage: string, ms: number) → void
p95(stage: string) → number | null
reset() → void
```

## Edge Cases
- Empty/missing results.json → benchmark hasn't run yet, need to run it
- Benchmark script exits 1 → latency exceeded, profile the bottleneck
- Test environment has no real STT/LLM/TTS → mock-based tests are the verification path
- p95 may be null if insufficient samples recorded

## Dependencies
- No code changes expected — verification only
- If tests fail due to missing imports, file a follow-up task
