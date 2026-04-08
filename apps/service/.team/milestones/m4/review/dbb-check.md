# M4 DBB Check

**Match: 85%** | 2026-04-06T21:06:17Z

## Pass
- embed.js: empty string returns [], non-empty delegates to agentic-embed
- store/index.js: get/set/del/delete all implemented via agentic-store SQLite
- store.get nonexistent: returns null (val==null check)
- store.delete: exported as alias for del
- GET /api/status: includes devices: getDevices() — returns [] when empty, array when registered
- hub.js registerDevice/getDevices implemented
- brain.js: tool_use yielded with {type:'tool_use', id, name, input, text:''}
- /api/chat without tools: yields {type:'content', text}

## Evidence
- src/store/index.js:29 exports `delete` alias
- src/server/api.js:85 includes `devices: getDevices()`
- src/server/brain.js:40 yields tool_use with text field
