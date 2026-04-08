# Task Design: Wake Word Server-Side Pipeline Integration

## Goal
When the client detects a wake word via `useWakeWord.js`, it must POST to the server to trigger the STT pipeline — not just update local UI state.

## Files to Modify
- `src/server/api.js` — add POST `/api/wake` endpoint
- `src/ui/client/src/composables/useWakeWord.js` — POST to `/api/wake` on detection

## API Endpoint

```js
// src/server/api.js
router.post('/api/wake', async (req, res) => {
  // Signal hub to start listening for audio
  broadcastWakeword({ source: 'client', ts: Date.now() });
  res.json({ ok: true });
});
```

## Client Change

```js
// useWakeWord.js — on wake word detected:
await fetch('/api/wake', { method: 'POST' });
```

## Logic Flow
1. Client `useWakeWord.js` detects wake word keyword
2. POSTs to `POST /api/wake`
3. Server calls `broadcastWakeword()` → hub notifies all connected devices
4. Devices begin streaming audio → STT pipeline processes it

## Edge Cases
- If `/api/wake` fails (network error), client logs warning but does not crash
- `broadcastWakeword` is already implemented in `hub.js` — no changes needed there

## Test Cases
- POST `/api/wake` returns `{ ok: true }` with status 200
- After POST, hub WebSocket clients receive a `wakeword` event
