# M45: Runtime Layer + Server Layer + Admin UI

## Goals
Address critical P0 architecture gaps: implement missing runtime modules, server layer, admin panel, and default profile.

## Scope
- src/runtime/llm.js — chat(messages, options) → stream
- src/runtime/stt.js — transcribe(audioBuffer) → text
- src/runtime/tts.js — synthesize(text) → audioBuffer
- src/server/hub.js + brain.js + api.js — device mgmt, LLM inference, REST endpoints
- src/ui/admin/ — admin panel (device mgmt, model config, system status)
- profiles/default.json — built-in default hardware profile

## Acceptance Criteria
- All runtime modules export their specified interfaces
- Server layer handles device registration and LLM inference
- Admin panel accessible at /admin route
- Default profile loads when no CDN profile available
