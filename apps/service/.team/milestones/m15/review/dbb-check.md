# M15 DBB Check

**Match: 86%** | 2026-04-06T21:06:17Z

## Pass
- sense.js: uses setInterval (not requestAnimationFrame) — Node.js compatible
- store/index.js: exports `del` and `delete` alias — both work
- hub.js: broadcastWakeword() iterates registry, sends {type:'wakeword'} to all
- hub.js: heartbeat timeout = 60000ms (line 140: `now - device.lastPong > 60000`)
- brain.js: tool_use yields include `text: ''` field
