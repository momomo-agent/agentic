# API 认证中间件 (middleware.js)

## Progress

- Added `authMiddleware(apiKey)` to `src/server/middleware.js`
- Reads API_KEY from `process.env.AGENTIC_API_KEY` (fixed from API_KEY per design spec)
- Exempts `/health`, `/api/health`, and `/admin` paths (added /api/health per DBB-025)
- Returns 401 with `authentication_error` type for missing/invalid Bearer tokens
- Integrated into `createApp()` in api.js
- 7 tests in test/server/auth-middleware.test.js — all passing
- Additional 9 tests in test/server/middleware.test.js — all passing (includes /api/health exempt, empty Bearer token edge case)
- Status: REVIEW
