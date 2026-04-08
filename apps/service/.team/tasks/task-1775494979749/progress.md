# REST API 端点实现

## Status: Complete

All 6 endpoints already fully implemented in `src/server/api.js`. No changes needed.

- POST /api/chat — SSE stream via async generator, ends with `[DONE]`
- POST /api/transcribe — multipart audio → `{ text }`
- POST /api/synthesize — returns audio/wav
- GET /api/status — hardware, profile, devices
- GET /api/config — reads config.json
- PUT /api/config — persists config
