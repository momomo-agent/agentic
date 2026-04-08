# HTTPS/LAN安全访问接入

## Progress

- Modified `src/server/api.js`: `startServer()` now always starts HTTP, optionally starts HTTPS on port+443, returns `{ http, https }` or single server
- Modified `bin/agentic-service.js`: `shutdown()` handles both single and dual server return values
