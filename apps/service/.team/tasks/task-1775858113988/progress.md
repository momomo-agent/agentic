# Progress: Fix missing kokoro.js adapter

## Status: Complete

- `src/runtime/adapters/voice/kokoro.js` already existed on disk (created by prior session)
- Exports `synthesize(text)` matching the adapter contract
- Fixed `test/server/tts.test.js` — added `fs` mock to isolate from real config file (was causing 2 test failures)
- Full suite: 174/174 files pass, 981 tests passed, 0 failures
