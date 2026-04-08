# Design: src/server/api.js

## File
`src/server/api.js`

## Interface
```js
function mount(app)  // app: Express instance
```

## Routes
- `POST /api/chat` — `{ message, history }` → SSE stream (brain.process)
- `POST /api/transcribe` — `{ audio }` (base64) → `{ text }`
- `POST /api/synthesize` — `{ text }` → audio/wav buffer
- `GET /api/status` → `{ hardware, profile, devices }`
- `GET /api/config` → current config JSON
- `PUT /api/config` — body: partial config → merged config

## Logic
- `/api/chat`: set SSE headers, iterate brain.process generator, write chunks, end on done
- `/api/transcribe`: decode base64 → Buffer, call stt.transcribe
- `/api/synthesize`: call tts.synthesize, set Content-Type: audio/wav
- `/api/status`: call hardware.detect() + profiles.getProfile() + hub.getDevices()

## Dependencies
- `src/server/brain.js`, `src/server/hub.js`
- `src/runtime/stt.js`, `src/runtime/tts.js`
- `src/detector/hardware.js`, `src/detector/profiles.js`

## Test Cases
- POST /api/chat → SSE events with text chunks
- POST /api/transcribe with valid base64 WAV → { text }
- GET /api/status → object with hardware/profile/devices keys
