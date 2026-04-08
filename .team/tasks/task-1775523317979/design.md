# Task Design: Voice Latency <2s Benchmark

## Goal
Measure STT+LLM+TTS end-to-end latency and enforce <2s gate.

## Files to Modify
- `src/server/api.js` — add timing headers to `/api/transcribe` and `/api/chat`
- `scripts/benchmark-voice.js` — new benchmark script

## Timing Instrumentation

```js
// src/server/api.js — in POST /api/transcribe handler
const t0 = Date.now();
const text = await stt.transcribe(req.file.buffer);
res.set('X-STT-Ms', Date.now() - t0);

// in POST /api/chat handler
const t0 = Date.now();
// ... stream response ...
// log total on stream end
console.log(`[latency] chat ${Date.now() - t0}ms`);
```

## Benchmark Script

```js
// scripts/benchmark-voice.js
// Usage: node scripts/benchmark-voice.js
// Sends a 1s sine-wave WAV to /api/transcribe, then /api/chat, measures total
```

### Function Signatures
```js
async function runBenchmark(baseUrl: string, iterations: number): Promise<void>
// Logs per-iteration ms and pass/fail against 2000ms threshold
// Exits with code 1 if median > 2000ms
```

## Edge Cases
- If Ollama is not running, benchmark logs warning and skips LLM step
- Uses `node:perf_hooks` `performance.now()` for sub-ms precision

## Test Cases
- `X-STT-Ms` header present on `/api/transcribe` response
- Benchmark script exits 0 when latency passes, 1 when it fails
