# Design: Fix SIGINT graceful drain during in-flight requests

## Problem
The SIGINT handler in `src/server/api.js` calls `httpServer.close()` immediately without waiting for in-flight requests to drain first.

## Current State
```js
process.once('SIGINT', () => { stopWake(); httpServer.close(); });
```

`startDrain()` and `waitDrain()` are already implemented in `api.js` but not called in the SIGINT handler.

## File to Modify
- `src/server/api.js`

## Fix
Update the SIGINT handler to call `startDrain()` then `waitDrain()` before closing:

```js
process.once('SIGINT', async () => {
  startDrain();
  stopWake();
  try { await waitDrain(10_000); } catch { /* timeout, proceed */ }
  httpServer.close(() => process.exit(0));
});
```

## Function Signatures (already exist, no change)
```js
export function startDrain(): void
export function waitDrain(timeout?: number): Promise<void>
```

## Logic
1. `startDrain()` sets `draining = true` → new requests get 503
2. `waitDrain()` polls `inflight === 0` every 50ms, resolves when clear
3. After drain (or timeout), close server and exit

## Edge Cases
- No in-flight requests → `waitDrain` resolves immediately
- Drain timeout (10s) → proceed with close anyway, don't hang
- Double SIGINT → `process.once` ensures handler runs only once

## Test Cases
- `test/sigint.test.js` — verifies `server.close` is called on SIGINT
- `test/m48-sigint-drain.test.js` — verifies drain completes before close
