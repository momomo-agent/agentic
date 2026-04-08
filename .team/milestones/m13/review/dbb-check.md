# M13 DBB Check

**Match: 78%** | 2026-04-06T21:06:17Z

## Pass
- hub.js: heartbeat timeout interval checks `now - device.lastSeen > 60000` — 60s correct
- hub.js: device sending ping every 30s keeps lastPong fresh, stays online
- brain.js: tool_use yields `{type:'tool_use', text:'', ...}` — text field present
- hub.js: broadcastWakeword() sends to all registry entries on 'wakeword' message
- SIGINT: hub.js process.once('SIGINT') → wss.close() → process.exit(0)
- llm.js: watchProfiles() reloads config on remote change

## Partial
- Docker: Dockerfile/docker-compose.yml exist but not verified to build/run
- Invalid profiles hot-reload: watchProfiles error handling not confirmed
