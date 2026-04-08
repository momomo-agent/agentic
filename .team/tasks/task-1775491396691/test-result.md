# Test Result: 修复 EADDRINUSE 检测

## Summary
- Total: 11 | Passed: 11 | Failed: 0

## Test Files
- `test/server/eaddrinuse.test.js` (3 tests) — new
- `test/server/api-m2.test.js` (8 tests) — existing

## Results

### EADDRINUSE detection
- ✓ rejects with "Port X is already in use" when port is occupied
- ✓ each startServer call creates a fresh app instance (no singleton leak)
- ✓ stopServer then startServer on same port succeeds

### GET /api/status — Ollama real detection
- ✓ returns ollama.running (boolean) and ollama.models (array)
- ✓ returns running:false when Ollama is not reachable
- ✓ does not throw when Ollama is unreachable (no 500)

### GET /api/config — persistence
- ✓ returns {} when no config file exists
- ✓ PUT then GET returns same value
- ✓ config persists on disk as JSON
- ✓ GET returns {} after config file is deleted

### startServer — EADDRINUSE (existing)
- ✓ rejects with port-in-use message when port is taken by external process

## DBB Verification
- ✓ Port occupied → startServer() rejects with "Port X is already in use"
- ✓ No module-level singleton — each call creates fresh app instance
- ✓ Tests can independently start/stop server instances without state leak

## Edge Cases
- Non-EADDRINUSE errors are passed through as-is (covered by implementation, not tested — would require simulating OS-level errors)
