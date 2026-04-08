# M6 DBB Check

**Match: 82%** | 2026-04-06T21:06:17Z

## Pass
- POST /api/chat: Content-Type text/event-stream, SSE chunks
- POST /api/transcribe: returns {text}
- POST /api/synthesize: returns audio/wav binary
- GET /api/status: {hardware, profile, devices} all present
- GET/PUT /api/config: read/write with atomic write
- WebSocket registration: hub.js registerDevice on 'register' message
- brain.js tool_use: yields tool_use chunks with text field

## Partial
- /admin: static served but build not confirmed
- push-to-talk / VAD: frontend feature, not verifiable from source scan
