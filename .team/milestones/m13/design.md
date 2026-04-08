# M13 Technical Design: DBB修复 + Docker + 配置热更新

## Overview

Four targeted fixes/additions across `src/server/hub.js`, `src/server/brain.js`, `install/`, and `src/detector/profiles.js`.

## Changes

### 1. hub.js — heartbeat 60s + wakeword广播 + SIGINT关闭

**Heartbeat timeout**: Change ping interval check from `40000ms` → `60000ms`. The `setInterval` ping loop runs every 30s; a device missing 2 consecutive pongs (60s) is considered dead.

**Wakeword broadcast**: On `msg.type === 'wakeword'`, broadcast `{ type: 'wakeword', from: deviceId }` to all connected WebSocket clients in `registry`.

**SIGINT**: In `initWebSocket`, after creating `wss`, register `process.on('SIGINT', ...)` to close all WS connections and call `server.close()` then `process.exit(0)`.

### 2. brain.js — tool_use响应含text字段

When yielding a `tool_use` chunk, wrap it as `{ type: 'tool_use', text: '', id, name, input }` — add `text: ''` to the yielded object so consumers always see a `text` field.

### 3. install/ — Dockerfile + docker-compose.yml

- `install/Dockerfile`: Node 20 Alpine, copy source, `npm ci --omit=dev`, expose port 3000, `CMD ["node", "bin/agentic-service.js"]`
- `install/docker-compose.yml`: single service `agentic-service`, build context `..`, port `3000:3000`, volume `./data:/app/data`

### 4. profiles.js — watchProfiles → loadConfig热更新

Add `watchProfiles(intervalMs, onReload)` that polls remote profiles on an interval. On successful fetch with changed content, calls `onReload(newProfile)`. On fetch/parse error, logs and retains previous profile. In-flight requests are safe because `onReload` only swaps the config reference atomically.

## File Map

| File | Change |
|------|--------|
| `src/server/hub.js` | heartbeat 60s, wakeword broadcast, SIGINT handler |
| `src/server/brain.js` | add `text: ''` to tool_use yield |
| `install/Dockerfile` | new file |
| `install/docker-compose.yml` | new file |
| `src/detector/profiles.js` | add `watchProfiles(intervalMs, onReload)` |
