# M20 Technical Design: Server层实现 + Admin UI + 默认Profile

## T1: src/server/hub.js
In-memory device registry. Exports `registerDevice`, `getDevices`, `updateStatus`.

## T2: src/server/brain.js
Wraps `runtime/llm.js`. Exports `chat(messages, options) → AsyncIterable`. Supports tool registration via `registerTool(name, fn)`.

## T3: src/server/api.js
Express router. Mounts hub + brain. Endpoints: `POST /api/chat`, `POST /api/transcribe`, `POST /api/synthesize`, `GET /api/status`, `GET /api/config`, `PUT /api/config`, `GET /api/devices`.

## T4: src/ui/admin/
Vue 3 SPA at `/admin`. Three views: Devices, Status, Config. Fetches from `/api/*`.

## T5: profiles/default.json
Static JSON with llm/stt/tts/fallback fields for standard x64 CPU-only hardware.

## Dependencies
- T3 depends on T1 + T2
- T4 depends on T3 (API must exist)
- T5 is independent
