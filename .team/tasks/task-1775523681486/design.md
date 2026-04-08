# Multi-Device Brain State Sharing — Technical Design

## Files to Modify
- `src/server/hub.js` — extend `broadcastSession` to include full session data
- `src/server/api.js` — call `broadcastSession` after chat/config updates

## Current State
`hub.js` has:
- `sessions` Map: `sessionId → { data: {}, deviceIds: Set }`
- `setSessionData(sessionId, key, value)`
- `broadcastSession(sessionId)` — sends `{ type: 'session', sessionId }` only (no data)

## Gap
Devices receive `sessionId` but not the actual state. They can't sync conversation history or active profile.

## Function Signatures
```js
// hub.js — update broadcastSession
export function broadcastSession(sessionId: string): void
// Sends { type: 'session', sessionId, data: sessions.get(sessionId).data } to all registry devices

// api.js — after POST /api/chat completes a turn:
setSessionData(sessionId, 'history', updatedHistory);
broadcastSession(sessionId);
```

## Algorithm
1. `broadcastSession`: read `sessions.get(sessionId).data`, include in WS message
2. In `api.js` `POST /api/chat` handler: after LLM response, call `setSessionData(sessionId, 'history', messages)` then `broadcastSession(sessionId)`
3. Client-side: on `message.type === 'session'`, merge `message.data.history` into local chat state

## Edge Cases
- `sessionId` not in sessions map → skip broadcast silently
- Large history → only broadcast last 20 messages to avoid WS frame size issues
- Device disconnected mid-broadcast → catch send error, remove from registry

## Test Cases
- Two devices on same sessionId both receive updated history after chat turn
- Disconnected device removed from registry on send error
