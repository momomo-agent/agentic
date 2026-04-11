# API 认证中间件 (middleware.js)

## Progress

- Added `authMiddleware(apiKey)` to `src/server/middleware.js`
- Reads API_KEY from `process.env.API_KEY`; skips auth when not set
- Exempts `/health` and `/admin` paths
- Returns 401 with `authentication_error` type for missing/invalid Bearer tokens
- Integrated into `createApp()` in api.js
- 7 tests in test/server/auth-middleware.test.js — all passing
