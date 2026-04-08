# SIGINT Graceful Drain During In-Flight Requests

## Files to modify
- `bin/agentic-service.js` or `src/server/api.js` — add SIGINT handler

## Algorithm
1. Track in-flight request count with a counter
2. On `process.on('SIGINT')`: set `draining = true`, stop accepting new requests (return 503)
3. Wait for counter to reach 0 (poll or use a promise), then call `server.close()`
4. Timeout after 10s: force exit

## Function signatures
```js
let inflight = 0
// middleware: req → inflight++; res.on('finish') → inflight--
// SIGINT handler:
process.once('SIGINT', async () => {
  draining = true
  await waitDrain(10_000)  // → Promise<void>
  server.close(() => process.exit(0))
})
```

## Edge cases
- SSE/streaming responses: count as in-flight until stream ends
- Timeout exceeded: log warning, force `process.exit(1)`

## Test cases
- SIGINT during idle → server closes immediately
- SIGINT during active request → waits for finish before closing
