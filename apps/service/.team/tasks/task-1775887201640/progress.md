# tts.js 切到 Engine Registry

## Progress

### Completed
- Added `async run()` to tts.js engine
- Rewrote runtime/tts.js: removed detector/fs/path/os imports, uses config.js + registry
- Priority: assignments.tts → modelsForCapability('tts') → legacy adapter fallback
- Updated test/server/tts.test.js to mock config.js + registry
- All tests pass including m38-tts.test.js
