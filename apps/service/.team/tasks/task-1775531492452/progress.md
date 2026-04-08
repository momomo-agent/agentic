# Implement server-side wake word pipeline in sense.js

## Progress

- Replaced stub `startWakeWordPipeline` with real mic-based audio capture using `mic` package
- Energy-based detection (RMS > 1000) triggers wake word callback
- Graceful degradation if `mic` unavailable or mic fails to start
- Made `startWakeWordPipeline` and `startHeadless` async
- Updated `hub.js` to `await sense.startHeadless()`
- Added `mic: ^2.1.2` to `package.json` dependencies
