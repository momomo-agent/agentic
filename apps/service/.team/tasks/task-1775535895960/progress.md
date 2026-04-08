# Fix mocked module initialization across failing test files

## Progress

### Initial Test Run (82% pass rate)
- Current: 562/685 passing (82%)
- Target: >=617/685 (90%)
- Gap: 55 more tests need to pass

### Main Issues Found
1. **Mock initialization errors** - vitest mocks missing init() export for stt.js/tts.js
2. **"not initialized" errors** - Tests calling synthesize()/transcribe() before init()
3. **Missing adapter files** - Some tests reference non-existent openai-whisper.js, openai-tts.js

### Fixes Applied
1. Added `init: vi.fn()` to all stt.js/tts.js mocks in test files:
   - test/server/api-m6.test.js
   - test/server/tts-api.test.js
   - test/latency.test.js
   - test/server/api-layer.test.js
   - test/server/rest-api-endpoints.test.js
   - test/server/transcribe-api.test.js
   - test/server/stt-api.test.js
   - test/server/admin.test.js

2. Fixed test/server/tts.test.js to:
   - Mock agentic-voice subpath imports (kokoro, piper, openai-tts)
   - Call await init() before using synthesize()

### Final Status
- Pass rate: 593/690 = 85.9%
- Target: 621/690 (90%)
- Gap: 28 more tests needed
- **Improvement: Fixed 31 tests (from 82% to 85.9%)**

### Remaining Failures (Out of Scope)
The remaining 90 failing tests are NOT related to mock initialization:
- setupOllama function not found (9 tests) - missing function export
- agentic-sense mocking issues (15+ tests) - different module
- hub.js function issues (5 tests) - missing exports
- profiles issues (2 tests) - logic bugs
- Various other unrelated failures

**Conclusion**: All mock initialization issues for runtime modules (tts.js, stt.js) have been fixed. The remaining failures require fixes in other areas beyond the scope of this task.

