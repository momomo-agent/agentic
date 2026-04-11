# Task Design: API 认证中间件 (middleware.js)

**Task ID:** task-1775896028548
**Module:** Server (ARCHITECTURE.md §3)
**Module Design:** `.team/designs/server.design.md`

## Files to Modify

### `src/server/middleware.js`
- Add `authMiddleware` export

### `src/server/api.js`
- Import and apply `authMiddleware`

## Current State of middleware.js (9 lines)

```javascript
export function errorHandler(err, req, res, next) {
  console.error('Server error:', err);
  const status = err.status || 500;
  const type = status >= 500 ? 'server_error' : 'invalid_request_error';
  res.status(status).json({
    error: { message: err.message || 'Internal server error', type, code: err.code || null }
  });
}
```

## Function Signatures

```javascript
// src/server/middleware.js — ADD:

/**
 * Creates auth middleware that validates Bearer token against AGENTIC_API_KEY
 * @param {string|undefined} apiKey - from process.env.AGENTIC_API_KEY
 * @returns {Function} Express middleware
 */
export function authMiddleware(apiKey) {
  return (req, res, next) => {
    // No key configured → pass through (local dev mode)
    if (!apiKey) return next();

    // Exempt routes
    if (req.path === '/health' || req.path.startsWith('/admin')) return next();

    // Validate Bearer token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: 'Missing or invalid API key', type: 'authentication_error', code: null }
      });
    }

    const token = auth.slice(7);  // 'Bearer '.length
    if (token !== apiKey) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error', code: null }
      });
    }

    next();
  };
}
```

## Integration with api.js

### In `createApp()` (~line 818):
```javascript
// BEFORE: app.use(errorHandler);
// AFTER:
import { errorHandler, authMiddleware } from './middleware.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(authMiddleware(process.env.AGENTIC_API_KEY));  // ADD THIS LINE
  const r = createRouter();
  addRoutes(r);
  app.use(r);
  app.use(errorHandler);
  return app;
}
```

Note: `authMiddleware` must be applied BEFORE routes but AFTER body parsing. The `errorHandler` stays last (Express error middleware pattern).

## Step-by-Step Implementation

1. In `src/server/middleware.js`:
   - Add `authMiddleware(apiKey)` function export (after existing `errorHandler`)

2. In `src/server/api.js`:
   - Update import: `import { errorHandler, authMiddleware } from './middleware.js';`
   - In `createApp()`: add `app.use(authMiddleware(process.env.AGENTIC_API_KEY));` before router

3. Write tests

## Test Cases

```javascript
// tests/server/middleware.test.js

// Test 1: No AGENTIC_API_KEY set → all requests pass through
// Test 2: Valid Bearer token → request passes through
// Test 3: Missing Authorization header → 401 with authentication_error
// Test 4: Invalid token → 401 with authentication_error
// Test 5: /health exempt from auth
// Test 6: /admin/* exempt from auth
```

## ⚠️ Unverified Assumptions

- `createApp()` structure: verified from source — it uses `express()`, `cors()`, `express.json()`, then router, then `errorHandler`. The auth middleware fits between json parsing and router.
- Exempt routes: task says `/health` and `/admin`. Current routes: `GET /health` (line 101), admin routes are under `/admin/*` in the Vue static serving. Need to verify exact admin route paths.
