# Design: SIGINT graceful drain during in-flight requests

## Files to verify/modify
- `bin/agentic-service.js` — SIGINT handler
- `src/server/api.js` — `inflight` counter, `startDrain`, `waitDrain`

## Current state
`bin/agentic-service.js` already calls `startDrain()` + `waitDrain(10_000)` in SIGINT handler.
`src/server/api.js` exports `startDrain`, `waitDrain`, tracks `inflight`.

## Verify inflight tracking
Ensure every async route handler increments/decrements `inflight`:
```js
inflight++;
try {
  // handle request
} finally {
  inflight--;
}
```

Check `/api/chat` (streaming) and `/api/transcribe` routes both wrap with inflight tracking.

## Test cases
- Send request, send SIGINT mid-request → request completes, then process exits 0
- No in-flight requests → SIGINT exits immediately
