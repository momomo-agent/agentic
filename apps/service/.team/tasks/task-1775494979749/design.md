# Design: REST API 端点实现

## File
`src/server/api.js` (routes section)

## Endpoints

### POST /api/chat
- Body: `{ message: string, history: Array }`
- Set `Content-Type: text/event-stream`
- Call `brain.chat(messages, tools, chunk => res.write('data: '+chunk+'\n\n'))`
- On end: `res.write('data: [DONE]\n\n'); res.end()`

### POST /api/transcribe
- Body: `{ audio: string }` (base64)
- `stt.transcribe(Buffer.from(audio, 'base64'))` → `{ text }`

### POST /api/synthesize
- Body: `{ text: string }`
- `tts.synthesize(text)` → audioBuffer
- `res.set('Content-Type', 'audio/wav').send(audioBuffer)`

### GET /api/status
- Return `{ hardware: detector.detect(), profile: profiles.current, devices: hub.list() }`

### GET /api/config
- Read and return config.json

### PUT /api/config
- Merge body into config.json, persist, return updated config

## Error Handling
- Missing required fields → 400 `{ error: "..." }`
- Runtime errors → 500 `{ error: "..." }`

## Test Cases
- POST /api/chat → SSE stream with at least one data event
- POST /api/transcribe with valid audio → `{ text: string }`
- GET /api/status → has hardware, profile, devices
- PUT /api/config → persisted on GET
