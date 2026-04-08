# Design: Verify wake word pipeline is not a stub

## Analysis
`src/runtime/sense.js:startWakeWordPipeline()` (line 66-92) already has real implementation:
- Dynamically imports `node-record-lpcm16`
- Calls `record.record({ sampleRate: 16000, channels: 1 })`
- Pipes audio through VAD, emits `wake_word` event
- Gracefully degrades if package missing (console.warn + return)

## Verification task
No code changes needed. Tester must confirm:
1. Function is not a stub — real mic capture path exists ✓
2. Test covers missing-dep path (mock `import('node-record-lpcm16')` to throw)
3. Test covers happy path (mock recorder with fake stream emitting data)

## Files to check
- `src/runtime/sense.js:66-92` — implementation
- `test/sense.test.js` or `test/sense-*.test.js` — test coverage

## Test cases
- Missing dep: `startWakeWordPipeline(cb)` resolves without throwing, logs warning
- Happy path: mock recorder emits buffer with RMS > 0.01, `onWakeWord` callback called
