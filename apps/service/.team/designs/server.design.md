# Module Design: Server（HTTP/WebSocket）

**ARCHITECTURE.md Section:** 3. Server（HTTP/WebSocket）
**Status:** ready-for-review

## Verified Exports (from src/server/api.js)

```javascript
export function startDrain()                          // line 41
export function resetDrain()                          // line 42
export function waitDrain(timeout = 10_000)           // line 44
export function createRouter()                        // line 712
export function createApp()                           // line 718
export async function startServer(port = 3000, { https: useHttps = false } = {})  // line 743
export function stopServer(server)                    // line 809
```

## Internal Dependencies

- `./brain.js` → `chat()`
- `../runtime/profiler.js` → `getMetrics`, `startMark`, `endMark`
- `../runtime/vad.js` → `detectVoiceActivity`
- `../runtime/stt.js` → `init`, `transcribe` (via `*` import)
- `../runtime/tts.js` → `init`, `synthesize` (via `*` import)
- `./middleware.js` → `errorHandler`
- `./hub.js` → `getDevices`, `initWebSocket`, `startWakeWordDetection`, `broadcastWakeword`, `setSessionData`, `broadcastSession`
- `../config.js` → `getConfig`, `setConfig`, `reloadConfig`, `CONFIG_PATH`, `getModelPool`, `addToPool`, `removeFromPool`, `getAssignments`, `setAssignments`

## SIGINT / Graceful Shutdown

Already implemented in `startServer()` (lines 791-795):
- Calls `startDrain()` to reject new requests with 503
- Calls `waitDrain(10_000)` to wait for in-flight requests
- Calls `httpServer.close()` then `process.exit(0)`

## Port Note

`startServer()` defaults to port 3000 in its signature, but `bin/agentic-service.js` passes `--port 1234` default. Docker must match 1234.

## M103 Additions

### Health Endpoint (`GET /api/health`)
- New route in `addRoutes(r)`, separate from existing `GET /health` liveness probe
- Returns per-component status: `{ status, uptime, ollama, stt, tts, responseTime }`
- Uses `getOllamaStatus()` (local, 2s timeout) + `modelsForCapability()` (imported)
- Always HTTP 200; top-level `status` is `'ok'` or `'degraded'`
- See task-1775893487734/design.md

### OpenAI Error Format (`code` field)
- New `apiError(res, status, message, type, code)` helper in api.js
- All `/v1/*` error responses updated to include `code` field
- `middleware.js` errorHandler updated to `{ error: { message, type, code } }`
- See task-1775893487814/design.md

### Audio Format Validation
- `isValidAudio(buffer)` checks magic bytes before STT processing
- `AUDIO_SIGNATURES` array covers wav, mp3, ogg, flac, webm, mp4/m4a, amr
- Applied to `POST /v1/audio/transcriptions` before `stt.transcribe()`
- See task-1775893487853/design.md

### Implementation Order

1. task-1775893487814 (error format + apiError helper) — no dependencies
2. task-1775893487734 (health endpoint) — no dependencies, benefits from apiError for error cases
3. task-1775893487853 (audio validation) — uses apiError from step 1

## Constraints

- `createApp()` applies `errorHandler` middleware last (correct Express pattern)
- HTTPS fallback to HTTP on cert failure is handled in `startServer()`
- WebSocket init must happen after server listen
- `apiError()` helper is only for OpenAI-compatible routes; admin/Anthropic routes keep their own format
- Audio validation uses magic bytes only — no dependency on file extension or Content-Type header
- All OpenAI-compatible error responses MUST include `{ error: { message, type, code } }` (M103)
