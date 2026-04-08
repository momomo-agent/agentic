# M11 DBB Check

**Match: 85%** | 2026-04-06T21:06:17Z

## Pass
- hub.js registerDevice(id,meta): returns {id, registeredAt}
- hub.js heartbeat(id): updates lastSeen, interval marks offline after 60s
- hub.js getDevices(): returns all devices with status
- brain.js chat(): async generator, yields {type:'content'} and {type:'tool_use'}
- brain.js fallback: Ollama failure → cloud (openai/anthropic)
- All REST endpoints implemented in api.js
- profiles/default.json: apple-silicon and nvidia profiles with llm/stt/tts/fallback

## Partial
- /admin UI: static served but build not confirmed
- profiles/default.json: missing explicit cpu-only profile (fallback is empty match {})
