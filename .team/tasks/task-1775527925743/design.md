# Design: SIGINT graceful drain during in-flight requests

## Files
- `bin/agentic-service.js` — SIGINT handler
- `src/server/api.js` — `startDrain()`, `waitDrain(timeout)`, `inflight` counter

## Current State
`startDrain` and `waitDrain` are exported from `src/server/api.js`. `inflight` counter tracks active requests.

## SIGINT Handler (bin/agentic-service.js)
```js
process.once('SIGINT', async () => {
  startDrain();
  await waitDrain(10_000);
  process.exit(0);
});
```

## waitDrain Logic
```js
export function waitDrain(timeout = 10_000) {
  return new Promise((resolve) => {
    if (inflight === 0) return resolve();
    const deadline = setTimeout(resolve, timeout);
    const check = setInterval(() => {
      if (inflight === 0) { clearInterval(check); clearTimeout(deadline); resolve(); }
    }, 100);
  });
}
```

## Edge Cases
- No in-flight requests: exits immediately
- Requests still active after 10s: force exit via timeout
- `draining=true` must reject new requests with 503

## Test Cases
- SIGINT with 0 in-flight → exits immediately
- SIGINT with 1 in-flight → waits for completion then exits
- SIGINT with stuck request → exits after 10s timeout
