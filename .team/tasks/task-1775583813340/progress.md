# Verify wake word server-side pipeline is not a stub

## Progress

- Verified `src/runtime/sense.js:startWakeWordPipeline()` (lines 66-92) has real implementation:
  - Dynamically imports `node-record-lpcm16`
  - Creates recorder with `record.record({ sampleRate: 16000, channels: 1 })`
  - Pipes audio stream through VAD (`detectVoiceActivity`)
  - Emits `wake_word` event and calls `onWakeWord` callback on voice detection
  - Gracefully degrades with `console.warn` if package missing
- Existing test file `test/runtime/sense-wakeword-m93.test.js` already covers both required test cases:
  1. Missing dep: resolves without throwing when `node-record-lpcm16` unavailable ✓
  2. Happy path: `onWakeWord` called when audio RMS exceeds threshold ✓
- All tests pass (2/2)
- No code changes needed — verification only
