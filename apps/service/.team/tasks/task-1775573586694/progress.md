# Implement wake word server-side audio pipeline

## Progress

- Replaced `mic`-based stub with `node-record-lpcm16` implementation
- Added `stopWakeWordPipeline()` export
- Uses `detectVoiceActivity()` from vad.js for audio detection
- Added `node-record-lpcm16: ^1.0.1` to package.json dependencies
- Handles double-start (stops existing recorder first)
- Handles missing package gracefully (logs warning, does not throw)
