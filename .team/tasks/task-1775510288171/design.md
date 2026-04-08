# Design: 实现 src/server/api.js

## File
- `src/server/api.js` (create)

## Interface
```js
import express from 'express';
import { registerDevice, getDevices, updateStatus } from './hub.js';
import { chat } from './brain.js';
import { transcribe } from '../runtime/stt.js';
import { synthesize } from '../runtime/tts.js';
import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';

export function createRouter(): express.Router
```

## Endpoints

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/status | `{ hardware, profile, devices: getDevices() }` |
| GET | /api/devices | `getDevices()` |
| POST | /api/chat | SSE stream from `chat(history, {})` |
| POST | /api/transcribe | `{ text: await transcribe(req.body.audio) }` |
| POST | /api/synthesize | audio buffer from `synthesize(req.body.text)` |
| GET | /api/config | current runtime config JSON |
| PUT | /api/config | merge + persist config |

## POST /api/chat SSE pattern
```js
res.setHeader('Content-Type', 'text/event-stream');
for await (const chunk of chat(messages, {})) {
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}
res.end();
```

## Edge Cases
- Missing `message` in POST /api/chat → 400
- `chat` throws → end SSE with error event
- `transcribe`/`synthesize` throws → 500 with JSON error

## Dependencies
- hub.js, brain.js, runtime/stt.js, runtime/tts.js, detector/hardware.js, detector/profiles.js

## Test Cases
- GET /api/status → 200 with required fields
- POST /api/chat missing body → 400
- POST /api/chat valid → SSE chunks received
