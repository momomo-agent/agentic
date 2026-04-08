# DBB 规范修复

## Progress

- `src/runtime/memory.js`: imported `del` from store, added `remove(key)` + `export { remove as delete }`
- `src/server/brain.js`: added `normalizeMessages()` to convert `{role:'tool'}` → Anthropic tool_result format; fixed Ollama tool_use input JSON.parse guard; both Ollama and OpenAI paths use normalized messages
- `bin/agentic-service.js`: SIGINT handler already correct, no change needed
- `src/detector/profiles.js`: CDN URL valid, fallback chain correct, no change needed
- `src/detector/optimizer.js`: onProgress already wired at call site, no change needed
