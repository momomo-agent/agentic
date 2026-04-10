# M98 DBB Check — 2026-04-11 (re-verified 05:50 UTC)

## Result: 95% (20/21 pass, 1 fail — DBB-020 VISION.md stale references)

All M98 criteria verified against actual codebase:

- **src/index.js**: Exports startServer, createApp, stopServer, detect, getProfile, matchProfile, ensureOllama, chat, stt, tts, embed. package.json main field set correctly.
- **Docker**: Port 1234 consistent across Dockerfile EXPOSE, docker-compose.yml port mapping 1234:1234. OLLAMA_HOST=http://host.docker.internal:11434 and ./data:/app/data volume present.
- **Cloud fallback**: brain.js implements FIRST_TOKEN_TIMEOUT_MS=5000, MAX_ERRORS=3, PROBE_INTERVAL_MS=60000. Timeout/abort triggers cloud mode, error counting increments on failure, 60s probe restores local on success.
- **Documentation**: ARCHITECTURE.md clean — no stale CR content, directory tree covers all src/ files, store/adapters/profiler/latency-log/sox/download-state all formally documented.
- **sense.js API**: All 10 exported functions documented (init, on, start, stop, detect, initHeadless, startHeadless, detectFrame, startWakeWordPipeline, stopWakeWordPipeline). Matches actual code.
- **Tests**: 174 test files, 981 passed, 0 failures, 11 skipped.
- **FAIL — DBB-020**: VISION.md lines 39-45 still reference phantom files: `detector/optimizer.js` (should be `matcher.js`), `runtime/llm.js` (actual is `server/brain.js`), `memory.js` (actual is `store/index.js`). Missing `engine/` directory. ARCHITECTURE.md documents the divergence but VISION.md tree not updated.
