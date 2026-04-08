# Design: src/server/api.js — REST API端点

## File
`src/server/api.js` — already exists, verify completeness

## Current Endpoints
- `POST /api/chat` — SSE stream via brain.chat
- `GET /api/status` — hardware + ollama + devices
- `GET /api/devices` — device list from hub
- `GET /api/config` / `PUT /api/config` — config persistence
- `POST /api/transcribe` — multipart audio → STT
- `POST /api/synthesize` — text → audio/wav
- `GET /api/logs` — last 50 log entries

## Missing Endpoints (per task description)
- `GET /api/health` → `{ ok: true, uptime: process.uptime() }`

## Function Signatures
```js
export function createRouter(): express.Router
export function createApp(): express.Application
export async function startServer(port?: number, opts?: { https?: boolean }): Promise<http.Server>
export function stopServer(server: http.Server): Promise<void>
```

## Edge Cases
- `POST /api/chat` with missing/non-string `message` → 400
- `POST /api/transcribe` with no file → 400
- `POST /api/synthesize` with empty text → 400
- `PUT /api/config` write failure → 500
- Port in use → throw `Error('Port <n> is already in use')`

## Dependencies
- `./brain.js`, `./hub.js`, `./middleware.js`, `./httpsServer.js`
- `../runtime/stt.js`, `../runtime/tts.js`, `../detector/hardware.js`

## Tests
- `GET /api/health` → `{ ok: true }`
- `POST /api/chat` without message → 400
- `POST /api/transcribe` without file → 400
- `GET /api/devices` → array
