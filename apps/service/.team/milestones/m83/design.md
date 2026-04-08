# M83 Technical Design — Test Suite Repair

## Overview
Fix 5 categories of test failures to restore ≥90% pass rate.

## Fix Areas

### 1. TTS init (task-1775535887205)
- `test/m43-agentic-voice.test.js` imports `tts.js` but never calls `init()`
- Fix: add `beforeAll(() => tts.init())` in test setup, or mock adapter directly

### 2. WebSocket disconnect (task-1775535895843)
- `hub.js:232` calls `unregisterDevice(deviceId)` on `ws.close` — already correct
- Issue: tests may not trigger the `close` event properly
- Fix: ensure test calls `ws.emit('close')` after connection

### 3. Org name mismatch (task-1775535895884)
- `src/detector/profiles.js:6` uses `momomo/agentic-service`
- `test/server/m9-dbb.test.js:55` expects `momo-ai/agentic-service`
- Fix: update `PROFILES_URL` in `profiles.js` to use `momo-ai` org

### 4. VAD callback (task-1775535895922)
- `useVAD.js:1` signature: `{ onStart, onStop, threshold, silenceMs }`
- Tests pass `onStart` and `onStop` correctly — issue is likely in other VAD test files
- Check `test/ui/m28-vad.test.js` and `test/m62-server-vad.test.js` for wrong param names

### 5. Mock initialization (task-1775535895960)
- Audit all failing test files for missing `await module.init()` or incorrect mock reset patterns
- Pattern: modules with lazy `adapter = null` need explicit init in test `beforeAll`
