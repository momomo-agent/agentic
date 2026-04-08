# Design: src/server/api.js

## Status
File already exists at `src/server/api.js` with full implementation.

## Interface
```javascript
createApp(): Express  // returns configured Express app
startServer(port: number, opts?: {https: boolean}): Promise<http.Server>
```

## Endpoints
```
POST /api/chat        { message, history } → SSE stream of text chunks
POST /api/transcribe  multipart audio file → { text }
POST /api/synthesize  { text } → audio/wav buffer
GET  /api/status      → { hardware, profile, ollama, devices }
GET  /api/config      → current config object
PUT  /api/config      { ...fields } → updated config
GET  /api/devices     → array of registered devices
GET  /api/logs        → recent log entries
```

## Key Logic
- `/api/chat` sets `Content-Type: text/event-stream`, streams brain.chat() chunks as `data: <text>\n\n`
- `/api/transcribe` uses multer memoryStorage, passes `req.file.buffer` to `stt.transcribe()`
- `/api/synthesize` calls `tts.synthesize(text)`, sets `Content-Type: audio/wav`
- Config persisted to `~/.agentic-service/config.json`
- LAN IP logged on startup for device discovery

## Edge Cases
- `stt.transcribe` throws → 500 with error message
- Config file missing → returns `{}`
- No audio file in transcribe request → 400

## Test Cases
- `GET /api/status` returns object with `hardware` key
- `GET /api/config` returns JSON object
- `POST /api/chat` with `{message:'hi'}` streams SSE data
