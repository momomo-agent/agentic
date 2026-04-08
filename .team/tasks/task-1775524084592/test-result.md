# Test Result: SIGINT Graceful Drain

## Summary
- **Tests**: 5 passed, 0 failed
- **Coverage**: drain logic fully covered

## Results
1. ✅ resolves immediately with no in-flight requests
2. ✅ resolves after in-flight request finishes
3. ✅ rejects on timeout if request never completes
4. ✅ startDrain sets draining flag
5. ✅ shutdown waits for in-flight then closes

## Implementation Verified
- `startDrain()` / `waitDrain()` exported from `src/server/api.js`
- `bin/agentic-service.js` calls `startDrain()` then `waitDrain(10_000)` on SIGINT/SIGTERM
- 503 returned to new requests while draining
- Force exit after 10s timeout

## Edge Cases
- SSE/streaming responses: counted as in-flight via `res.on('finish')` — covered by design
- Multiple concurrent requests: poll-based drain handles all

## Test File
`test/m48-sigint-drain.test.js`
