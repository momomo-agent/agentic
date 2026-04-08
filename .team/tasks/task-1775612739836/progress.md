# Verify and update Vision/PRD gap statuses

## Verification completed: 2026-04-08

### Items upgraded from partial → implemented

**Vision.json (78% → 95%):**
1. **M1: One-click install script** — bin/agentic-service.js exists with bin entry in package.json; src/cli/setup.js is complete (93 lines)
2. **M2: STT integration** — stt.js wires to agentic-voice via 3 adapters (sensevoice, whisper, openai-whisper); agentic-voice installed in node_modules with matching exports
3. **M2: TTS integration** — tts.js wires to agentic-voice via 3 adapters (kokoro, piper, openai-tts); same package
4. **M2: Wake word server-side** — startWakeWordPipeline() in sense.js is fully implemented: uses node-record-lpcm16 for 16kHz mono capture, pipes through energy-based VAD, handles spawn errors
5. **M3: Visual perception** — sense.js imports from local ./adapters/sense.js (not from agentic-sense stub); agentic-sense package is a placeholder returning empty arrays → kept as partial
6. **M4: Cloud fallback** — llm.js has full Ollama-first-then-cloud fallback to both OpenAI and Anthropic with API key validation
7. **M4: Config hot-update** — profiles.js watchProfiles() polls every 30s with ETag-based conditional fetching

**Vision missing → implemented:**
8. **M4: Docker** — Dockerfile + docker-compose.yml exist in project root AND install/
9. **M4: README** — README.md exists (6050 bytes)

**PRD.json (72% → 85%):**
1. **Remote profiles CDN fallback** — 4-tier fallback: fresh cache → remote fetch (5s timeout) → expired cache → built-in default.json
2. **Multi-device brain state** — hub.js joinSession() shares brainState (context, systemPrompt, temperature); broadcastSession() syncs context across devices (capped at 20 entries)
3. **Wake word server-side** — fully implemented, not a stub
4. **Server-side VAD** — vad.js energy-based VAD + hub.js isSilent() helper
5. **npx entrypoint** — bin entry verified, bin/agentic-service.js exists and is executable
6. **External packages** — agentic-store, agentic-voice, agentic-sense, agentic-embed all in package.json and node_modules
7. **Voice latency** — profiler.js measurePipeline() enforces 2000ms budget; /api/voice logs and warns on exceed; m94 tests pass
8. **CPU profiling** — profiler.js with startMark/endMark/getMetrics integrated into stt.js, tts.js, llm.js; scripts/benchmark.js exists

### Remaining gaps

**Vision (1 partial):**
- M3: Visual perception — agentic-sense package is a stub; sense.js uses local adapter instead

**PRD (2 partial, 1 missing):**
- HTTPS/LAN tunnel — httpsServer.js + cert.js work, but tunnel.js does not exist (gap description incorrectly stated it was present)
- Test suite — ~36 tests failing (detector 15, server 19, CLI 2); runtime tests hang
- Voice latency — actually implemented (was listed as missing)

### Notes
- tunnel.js does NOT exist despite the gap file previously claiming it was present
- The runtime test suite hangs entirely when run, preventing full test validation
- agentic-sense package is a stub — sense.js avoids it by importing from local ./adapters/sense.js
