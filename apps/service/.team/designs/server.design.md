# Module Design: Server（HTTP/WebSocket）

**ARCHITECTURE.md Section:** 3. Server（HTTP/WebSocket）
**Status:** ready-for-review

## Verified Exports (from src/server/api.js)

```javascript
export function startDrain()                          // line 68
export function resetDrain()                          // line 69
export function waitDrain(timeout = 10_000)           // line 71
export function createRouter()                        // line ~812 (after addRoutes)
export function createApp()                           // line ~818
export async function startServer(port = 3000, { https: useHttps = false } = {})  // line ~843
export function stopServer(server)                    // line ~929
```

## Verified Internal Functions (api.js)

```javascript
function apiError(res, status, message, type, code)   // line 19 — OpenAI error format helper
function isValidAudio(buffer)                          // line 37 — magic byte validation
function getLanIp()                                    // line 45
function getOllamaHost(config)                         // line 81
async function getOllamaStatus()                       // line 85 — 2s timeout to Ollama /api/tags
function addRoutes(r)                                  // line 100 — all route definitions
```

## Verified Internal State (api.js)

```javascript
let inflight = 0;     // line 65 — in-flight request counter
let draining = false;  // line 66 — drain mode flag
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

Already implemented in `startServer()` (lines 913-918):
- `process.once('SIGINT', ...)` handler
- Calls `startDrain()` to set `draining = true`
- Calls `waitDrain(10_000)` — polls `inflight` every 50ms, rejects after 10s
- Calls `httpServer.close(() => process.exit(0))`

⚠️ Current limitations (M103 tasks will address):
- Only handles SIGINT, not SIGTERM
- Does not close WebSocket connections (hub.js has no closeAll export)
- Does not stop health check timers (health.js doesn't exist yet)
- Does not clean up temp files

## Port Note

`startServer()` defaults to port 3000 in its signature, but `bin/agentic-service.js` passes `--port 1234` default. Docker must match 1234.

## M103 Additions

### Health Endpoint (`GET /api/health`)
- Route in `addRoutes(r)` at line 104, separate from `GET /health` liveness probe (line 101)
- Current response (NESTED — matches ARCHITECTURE.md, verified lines 134-143):
  ```json
  { "status": "ok|degraded", "uptime": 123.4, "components": { "ollama": {...}, "stt": {...}, "tts": {...} }, "responseTime": 45 }
  ```
- Uses `getOllamaStatus()` (local, 2s timeout) + `modelsForCapability('stt'|'tts')`
- Always HTTP 200; top-level `status` is `'ok'` or `'degraded'`

### Request Queue (NEW — M103)
- New file: `src/server/queue.js`
- Wraps chat endpoints with concurrency control
- Local model: concurrency=1, Cloud: concurrency=5
- Queue full → HTTP 429 + Retry-After header
- New endpoint: `GET /api/queue/stats`

### Auth Middleware (NEW — M103)
- Added to `src/server/middleware.js` alongside existing `errorHandler`
- `AGENTIC_API_KEY` env var enables auth
- Bearer token validation
- Exempt routes: `/health`, `/admin/*`

### Graceful Shutdown Enhancement (NEW — M103)
- Extend existing SIGINT handler to also handle SIGTERM
- Add WebSocket close notification
- Stop health check timers
- Clean up temp files

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

### Implementation Order (M103 expanded)

1. task-1775896028548 (auth middleware) — no dependencies, adds to middleware.js
2. task-1775896070822 (fix /api/health response) — no dependencies, modifies api.js
3. task-1775896028427 (engine health check) — new file, no dependencies
4. task-1775896028470 (request queue) — new file, no dependencies
5. task-1775896028509 (retry mechanism) — modifies ollama.js + cloud.js
6. task-1775896028586 (graceful shutdown) — depends on health.js (task-1775896028427)

## Constraints

- `createApp()` applies `errorHandler` middleware last (correct Express pattern)
- HTTPS fallback to HTTP on cert failure is handled in `startServer()`
- WebSocket init must happen after server listen
- `apiError()` helper is only for OpenAI-compatible routes; admin/Anthropic routes keep their own format
- Audio validation uses magic bytes only — no dependency on file extension or Content-Type header
- All OpenAI-compatible error responses MUST include `{ error: { message, type, code } }` (M103)
