# M17 Technical Design: DBB修复 + 架构对齐 + 最终验收

## Summary
M17 fixes 4 DBB failures identified in prior milestones. Analysis of current source shows most issues are already resolved; only one real code change is needed.

## Tasks

### task-1775509406861: store.delete() 别名
- **Status**: No change needed
- `src/store/index.js` already exports `export { del as delete }`

### task-1775509421092: brain.js tool_use text 字段
- **Status**: No change needed
- Both Ollama and OpenAI paths already yield `text: ''` in tool_use chunks

### task-1775509421126: heartbeat 超时 60s
- **Status**: No change needed
- `hub.js` uses `> 60000` in both the status-check interval and the ping/pong cleanup

### task-1775509421158: hub.js wakeword 广播含 deviceId
- **Status**: Code change required
- `broadcastWakeword()` → `broadcastWakeword(sourceDeviceId)`
- Broadcast payload: `{ type: 'wakeword', deviceId: sourceDeviceId ?? null }`
- Call site: `broadcastWakeword(deviceId)` in the `msg.type === 'wakeword'` handler

## File Changes
| File | Change |
|------|--------|
| `src/server/hub.js` | `broadcastWakeword` accepts `sourceDeviceId`, includes it in payload |

## Architecture Notes
No CR needed — change is within existing `hub.js` contract. The `broadcastWakeword` function is internal to the server layer.
