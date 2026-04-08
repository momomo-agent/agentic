# 修复 /api/status Ollama 真实检测

## Progress

- Added `getOllamaStatus()` in `src/server/api.js`: fetches `http://localhost:11434/api/tags` with 2s timeout
- Updated `GET /api/status` to use real Ollama detection instead of hardcoded stub
- Edge cases handled: ECONNREFUSED, timeout, non-200 → `{ running: false, models: [] }`
