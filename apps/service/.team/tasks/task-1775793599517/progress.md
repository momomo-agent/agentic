## Progress — task-1775793599517

- Implemented in `src/server/brain.js` (design referenced `runtime/llm.js` which doesn't exist — the LLM logic lives in brain.js)
- Added module-level cloud fallback state: `_cloudMode`, `_errorCount`, `_probeTimer`
- 5s first-token timeout: AbortController in `chatWithTools` aborts Ollama if no first token within 5s
- 3 consecutive errors: `_errorCount` increments on each Ollama failure, enters cloud mode at 3
- Auto-restore: `startProbing()` pings Ollama `/api/tags` every 60s, restores local on success
- Config change resets all fallback state
- `ollamaChat` now accepts optional `externalSignal` parameter for abort control
- Also fixed Dockerfile EXPOSE 3000→1234 and updated corresponding test
