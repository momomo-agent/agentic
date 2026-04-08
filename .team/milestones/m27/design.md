# M27 Technical Design

## Files
- `src/runtime/stt.js` — transcribe(audioBuffer) → text
- `src/runtime/tts.js` — synthesize(text) → audioBuffer
- `src/runtime/sense.js` — detect/detectFrame/initHeadless
- `src/runtime/memory.js` — add/search/remove with cosine similarity
- `src/server/hub.js` — device registry, WebSocket, sessions
- `src/server/brain.js` — LLM chat + tool calling
- `src/server/api.js` — Express REST endpoints
- `profiles/default.json` — built-in hardware profiles

## Patterns

### stt/tts
Adapter map: provider string → dynamic import → fallback to default adapter.
Error codes: `EMPTY_AUDIO`, `EMPTY_TEXT` for input validation.

### sense
Browser path: `init(videoElement)` + `start()` polls at 100ms interval.
Server path: `initHeadless(options)` + `detectFrame(buffer)`.
Object confidence threshold: 0.5.

### memory
Sequential lock via promise chain prevents index corruption on concurrent `add()`.
Cosine similarity over bge-m3 vectors. Index at `mem:__index__`.

### hub
`registry` Map holds live WS connections. `devices` Map holds persistent metadata.
Offline threshold: 60s, checked every 10s. Capture timeout: 10s.

### brain
Ollama streaming first; falls back to OpenAI when tool_use unsupported.
Tools registered via `registerTool(name, fn)`.

### api
Config atomic write: write to `.tmp` then rename.
Log ring buffer: 200 entries max, `/api/logs` returns last 50.
