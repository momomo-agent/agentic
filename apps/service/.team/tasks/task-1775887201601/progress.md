# stt.js 切到 Engine Registry

## Progress

### Completed
- Added `async run()` to whisper.js engine
- Rewrote stt.js: removed detector imports, uses config.js + registry
- Priority: assignments.stt → modelsForCapability('stt') → legacy adapter fallback
- All tests pass including m38-stt.test.js
