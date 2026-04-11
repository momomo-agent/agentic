# 引擎健康检查 + 自动降级 (health.js)

## Progress

- Created `src/engine/health.js` with startHealthCheck, stopHealthCheck, getEngineHealth, getAllHealth, isHealthy, onHealthChange, offHealthChange
- Added 5s timeout via Promise.race for engine.status() calls
- Modified `src/engine/registry.js`: lazy dynamic import of isHealthy to avoid circular deps; added health filtering in discoverModels() and resolveModel()
- Modified `src/engine/init.js`: imports and calls startHealthCheck() after engine registration
- Added `GET /api/engines/health` route in api.js
- Wrote 8 tests in test/engine-health.test.js — all passing
