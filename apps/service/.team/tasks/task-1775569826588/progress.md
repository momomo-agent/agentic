# Fix SIGINT graceful drain during in-flight requests

## Progress

- Updated SIGINT handler in `src/server/api.js`: calls `startDrain()`, then `waitDrain(10_000)`, then `httpServer.close(() => process.exit(0))`
- Drain timeout caught and ignored so shutdown always proceeds
