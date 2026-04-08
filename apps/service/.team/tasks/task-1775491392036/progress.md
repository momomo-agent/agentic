# 实现 /api/config 持久化

## Progress

- Added `readConfig()` / `writeConfig()` in `src/server/api.js` using `~/.agentic-service/config.json`
- Atomic write via `.tmp` + rename to prevent corruption
- Updated `GET /api/config` and `PUT /api/config` routes with persistence and error handling
