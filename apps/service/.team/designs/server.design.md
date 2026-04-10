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

## Constraints

- `createApp()` applies `errorHandler` middleware last (correct Express pattern)
- HTTPS fallback to HTTP on cert failure is handled in `startServer()`
- WebSocket init must happen after server listen
