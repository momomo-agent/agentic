# brain.js 切到 Engine Registry

## Progress

### Completed
- Added `async *run()` to ollama.js and cloud.js engines
- Rewrote brain.js to use registry (resolveModel/modelsForCapability/getEngine)
- Removed getModelPool dependency; preserved cloud fallback state machine
- Updated 6 test files to mock engine/registry.js
- All 181 test files pass (1077 tests)
