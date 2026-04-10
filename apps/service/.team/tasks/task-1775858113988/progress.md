# Fix missing kokoro.js adapter — runtime/tts.js references adapters/voice/kokoro.js but file does not exist

## Progress

### Completed
- Created `src/runtime/adapters/voice/kokoro.js` (~35 lines)
- Follows same pattern as piper.js/elevenlabs.js adapters
- Exports `synthesize(text)` → Buffer (matches adapter contract in tts.js:51-57)
- Reads config from `~/.agentic-service/config.json` for baseUrl/voice overrides
- Default base URL: `http://localhost:8880` (standard kokoro-tts port)
- Uses OpenAI-compatible `/v1/audio/speech` endpoint

### Verification
- Syntax check: passed
- Full test suite: 173/174 files pass, 980 tests pass, 11 skipped
- 2 pre-existing failures in `test/server/tts.test.js` (confirmed not caused by this change)
- No regressions introduced
