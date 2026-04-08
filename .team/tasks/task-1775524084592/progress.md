# SIGINT graceful drain during in-flight requests

## Progress

Added `inflight` counter + `draining` flag to `src/server/api.js`. Middleware increments on request, decrements on `finish`. `startDrain()` sets flag (new requests get 503). `waitDrain()` polls until inflight=0 or timeout. Updated `bin/agentic-service.js` shutdown to call `startDrain()` then `waitDrain(10_000)` before closing servers; timeout forces `process.exit(1)`.
