# Test Result: TTS 运行时

## Summary
- Total: 9 | Passed: 9 | Failed: 0

## Tests

### TTS runtime (unit) — test/server/tts.test.js
- ✅ returns audio buffer for valid text
- ✅ throws EMPTY_TEXT for empty string
- ✅ throws EMPTY_TEXT for whitespace-only string
- ✅ throws EMPTY_TEXT for null
- ✅ propagates provider errors
- ✅ throws when agentic-voice unavailable

### POST /api/synthesize (integration) — test/server/tts-api.test.js
- ✅ returns 400 when no text
- ✅ returns audio/wav for valid text
- ✅ returns 500 when provider throws

## DBB Verification
- ✅ `src/runtime/tts.js` exports `synthesize(text) → Promise<Buffer>`
- ✅ `POST /api/synthesize` accepts `{ text }`, returns audio/wav binary
- ✅ empty/whitespace text returns 400 (EMPTY_TEXT code)
- ✅ agentic-voice unavailable throws clear error

## Edge Cases
- Whitespace-only text: correctly throws EMPTY_TEXT
- Concurrent requests: not tested (out of scope)
