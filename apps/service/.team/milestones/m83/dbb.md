# M83 DBB — Test Suite Repair

## Verification Criteria

1. **TTS init** — `test/m43-agentic-voice.test.js` passes: `synthesize()` does not throw "not initialized"
2. **WebSocket disconnect** — hub disconnect test passes: device removed from registry after `ws.close()`
3. **Org name** — `test/server/m9-dbb.test.js` passes: CDN URL contains `momo-ai/agentic-service`
4. **VAD callbacks** — `test/m43-vad.test.js` passes: `onStart` fires on loud frame, `onStop` fires after silence
5. **Coverage** — `npm test` overall pass rate ≥ 90% (no more than 12 failing tests out of 119)
