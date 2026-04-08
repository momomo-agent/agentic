# M42 Technical Design: Wake Word + Voice Latency + HTTPS

## Overview
Three focused improvements to the server-side voice pipeline:
1. Route wake word events from `useWakeWord.js` into the server STT pipeline
2. Add timing instrumentation and a benchmark script to enforce <2s latency
3. HTTPS already partially implemented via `httpsServer.js` — wire it into the startup flow

## Architecture

### Wake Word Pipeline
- `src/server/hub.js` already exports `startWakeWordDetection` and `broadcastWakeword`
- `src/server/api.js` already imports `startWakeWordPipeline` from `src/runtime/sense.js`
- Gap: wake word event from client UI composable (`useWakeWord.js`) must POST to server to trigger STT, not just update local UI state

### Voice Latency
- Instrument `src/server/api.js` POST `/api/transcribe` and POST `/api/chat` with `Date.now()` timestamps
- Add `scripts/benchmark-voice.js` that sends a test audio buffer and measures round-trip

### HTTPS
- `src/server/httpsServer.js` and `src/server/cert.js` exist but may not be wired into `bin/agentic-service.js`
- Ensure startup uses HTTPS server when `--https` flag or `HTTPS=true` env var is set

## Dependencies
- `selfsigned` (already used in cert.js)
- No new npm packages required
