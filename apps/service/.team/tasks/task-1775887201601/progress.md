# stt.js 切到 Engine Registry

## Progress

### Completed
- Added `async run()` to whisper.js engine
- Rewrote stt.js: removed detector imports, uses config.js + registry
- Priority: assignments.stt → modelsForCapability('stt') → legacy adapter fallback
- All tests pass including m38-stt.test.js

### Final Verification (2026-04-11)
- Confirmed no `detector/` imports in stt.js
- cloud.js STT branch verified (lines 69-82)
- whisper.js run() verified (lines 73-84)
- Full test suite: 181 files, 1077 tests passed, 0 failures
