# M2 DBB Check

**Match: 90%** | 2026-04-06T21:06:17Z

## Pass
- GET /api/status: getOllamaStatus() pings localhost:11434 with AbortSignal.timeout(2000) — real detection
- Ollama not running: returns {running:false, models:[]}
- Ollama running: returns {running:true, models:[...real list]}
- Timeout >2s treated as not running, no exception thrown
- GET /api/config: reads from ~/.agentic-service/config.json
- PUT /api/config: atomic write via tmp file + rename
- No config file: readConfig() catches error and returns {}
- Write failure: returns 500 with error message
- EADDRINUSE: startServer() rejects with "Port X is already in use"

## Partial
- Multiple startServer() calls / state leak: stopServer() exported but test isolation depends on test setup
