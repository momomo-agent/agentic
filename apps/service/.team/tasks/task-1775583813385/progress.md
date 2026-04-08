# Verify cloud fallback and npx entrypoint

## Progress

### Cloud fallback
- Verified `src/runtime/llm.js:chat()` (lines 128-143) implements fallback:
  - Ollama fetch fails → catches error, loads `config.fallback.{provider,model}`
  - Routes to `chatWithOpenAI` or `chatWithAnthropic`
  - Throws clear error if API key not set
- Created `test/runtime/cloud-fallback-m93.test.js` with 3 tests:
  1. Falls back to OpenAI when Ollama fails ✓
  2. Throws with clear error when no API key set ✓
  3. Does NOT fall back when Ollama succeeds ✓
- No code changes to llm.js needed

### npx entrypoint
- Verified `bin/agentic-service.js` uses `commander` which provides `--help` out of the box
- `node bin/agentic-service.js --help` exits 0 ✓
- Added test for --help in cloud-fallback-m93.test.js ✓
- No code changes to bin/agentic-service.js needed

All 4 tests pass.
