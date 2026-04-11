# Module Design: Server（HTTP/WebSocket）

**ARCHITECTURE.md Section:** 3. Server（HTTP/WebSocket）
**Status:** ready-for-review

## Verified Exports (from src/server/api.js, 975 lines)

```javascript
export function startDrain()                          // line 73
export function resetDrain()                          // line 74
export function waitDrain(timeout = 10_000)           // line 76
export function createRouter()                        // line ~860
export function createApp()                           // line ~866
export async function startServer(port = 3000, { https: useHttps = false } = {})  // line ~893
export function stopServer(server)                    // line ~970
```

## Verified Internal Functions (api.js)

```javascript
function apiError(res, status, message, type, code)   // line 24 — OpenAI error format helper
function isValidAudio(buffer)                          // line 42 — magic byte validation
function getLanIp()                                    // line 50
function getOllamaHost(config)                         // (removed — health check replaces direct Ollama status)
async function getOllamaStatus()                       // (still present for /api/health endpoint)
function addRoutes(r)                                  // line ~100 — all route definitions
```

## Verified Internal State (api.js)

```javascript
let inflight = 0;     // line 70 — in-flight request counter
let draining = false;  // line 71 — drain mode flag
```

## Internal Dependencies

- `./brain.js` → `chat()`
- `../runtime/profiler.js` → `getMetrics`, `startMark`, `endMark`
- `../runtime/vad.js` → `detectVoiceActivity`
- `../runtime/stt.js` → `init`, `transcribe` (via `*` import)
- `../runtime/tts.js` → `init`, `synthesize` (via `*` import)
- `./middleware.js` → `errorHandler`
- `./hub.js` → `getDevices`, `initWebSocket`, `startWakeWordDetection`, `broadcastWakeword`, `setSessionData`, `broadcastSession`
- `../config.js` → `getConfig`, `setConfig`, `reloadConfig`, `CONFIG_PATH`, `addToPool`, `removeFromPool`, `getAssignments`, `setAssignments`
- `../engine/registry.js` → `getEngines`, `discoverModels`, `getEngine`, `modelsForCapability`, `resolveModel`
- `../engine/health.js` → `getAllHealth`
- `../runtime/embed.js` → `embed`
- `./queue.js` → `createQueue`, `enqueue`, `getQueueStats`

## IMPLEMENTED: Request Queue (queue.js, 53 lines)

```javascript
export function createQueue(name, options = {})        // line 10
export function enqueue(queue, fn)                     // line 31 → Promise
export function getQueueStats(queue)                   // line 45 → QueueStats
```

### Integration in api.js (verified lines 19-22):
```javascript
import { createQueue, enqueue, getQueueStats } from './queue.js';
const localQueue = createQueue('local', { maxConcurrency: 1, maxQueueSize: 50 });
const cloudQueue = createQueue('cloud', { maxConcurrency: 5, maxQueueSize: 100 });
```

### Queue behavior:
- `enqueue()` returns Promise that resolves when fn completes
- Queue full → throws `{ status: 429, retryAfter: 5 }`
- `processNext()` internal function handles concurrency gating
- ⚠️ Task status: inProgress — queue integration into chat routes may still be in progress

## IMPLEMENTED: Health Endpoint (`GET /api/health`)

- Nested response structure (matches ARCHITECTURE.md):
  ```json
  { "status": "ok|degraded", "uptime": 123.4, "components": { "ollama": {...}, "stt": {...}, "tts": {...} }, "responseTime": 45 }
  ```
- Always HTTP 200; top-level `status` is `'ok'` or `'degraded'`

## IMPLEMENTED: OpenAI Error Format

- `apiError(res, status, message, type, code)` helper at line 24
- All `/v1/*` error responses include `{ error: { message, type, code } }`
- `errorHandler` in middleware.js also returns `{ error: { message, type, code } }`

## IMPLEMENTED: Audio Format Validation

- `isValidAudio(buffer)` checks magic bytes (line 42)
- `AUDIO_SIGNATURES` covers wav, mp3, ogg, flac, webm, mp4/m4a, amr
- Applied to `POST /v1/audio/transcriptions` before `stt.transcribe()`

## IMPLEMENTED: Auth Middleware (task-1775896028548, ✅ done)

- `src/server/middleware.js` (32 lines) — exports `authMiddleware(apiKey)` + `errorHandler`
- `AGENTIC_API_KEY` env var enables auth; no key = all requests pass
- Bearer token validation on `/api/*` and `/v1/*`
- Exempt routes: `/health`, `/api/health`, `/admin/*`
- Returns `{ error: { message, type: 'authentication_error', code: null } }` on 401

## IMPLEMENTED: Graceful Shutdown (task-1775896028586, ✅ done)

- `src/server/shutdown.js` (52 lines) — `registerShutdown(server, hub, queue, { stopHealthCheck })`
- Handles both SIGINT and SIGTERM
- Sequence: startDrain → waitDrain(10s) → closeAllConnections → stopHealthCheck → server.close
- 15s force-exit safety net via `setTimeout(...).unref()`
- `hub.closeAllConnections(reason)` at hub.js line 311

## Implementation Order (M103)

1. ✅ task-1775896070822 (fix /api/health response) — DONE
2. ✅ task-1775896028427 (engine health check) — DONE
3. ✅ task-1775896028470 (request queue) — DONE
4. ✅ task-1775896028548 (auth middleware) — DONE
5. ✅ task-1775896028509 (retry mechanism) — DONE (ollama.js + cloud.js both have withRetry)
6. ✅ task-1775896028586 (graceful shutdown) — DONE
7. ⬜ task-1775896070855 (update ARCHITECTURE.md Known Limitations) — TODO

## Constraints

- `createApp()` applies `errorHandler` middleware last (correct Express pattern)
- Auth middleware must go BEFORE routes but AFTER body parsing
- HTTPS fallback to HTTP on cert failure is handled in `startServer()`
- WebSocket init must happen after server listen
- `apiError()` helper is only for OpenAI-compatible routes
- Audio validation uses magic bytes only — no dependency on file extension or Content-Type header
- All OpenAI-compatible error responses MUST include `{ error: { message, type, code } }`
