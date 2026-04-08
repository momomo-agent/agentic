# Design: 语音延迟基准测试

## File
`test/bench-voice-latency.js`

## Interface
```js
// CLI: node test/bench-voice-latency.js [--runs=10]
// Output: { p50, p95, min, max } in ms
```

## Logic
1. Load test WAV from `test/fixtures/hello.wav` (or generate silence)
2. For each run:
   - t0 = Date.now()
   - `await stt.transcribe(wavBuffer)` → text
   - `for await chunk of llm.chat([{role:'user',content:text}])` → collect full response
   - `await tts.synthesize(response)` → audioBuffer
   - latency = Date.now() - t0
3. Sort latencies, compute p50/p95/min/max
4. Print report; exit 1 if p50 > 2000

## Dependencies
- `src/runtime/stt.js`, `llm.js`, `tts.js`
- `init()` called before runs

## Test Cases
- Script exits 0 when all runtimes available and p50 <2s
- Script prints latency report to stdout
