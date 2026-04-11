# Task Design: OpenAI 兼容错误格式 — 添加 code 字段

**Task:** task-1775893487814
**Module:** Server（HTTP/WebSocket）— ARCHITECTURE.md §3
**Module Design:** `.team/designs/server.design.md`

## Overview

All API error responses currently use `{ error: { message, type } }` but OpenAI spec requires `{ error: { message, type, code } }`. The `code` field is missing. Additionally, non-OpenAI endpoints (admin routes) use bare `{ error: string }` format — those are out of scope for this task (they're internal APIs).

## Current Error Patterns (verified from `src/server/api.js`)

### OpenAI-compatible endpoints (MUST fix — add `code`):
- Line 96: `{ error: { message: 'No messages provided', type: 'invalid_request_error' } }` — missing `code`
- Line 145: `{ error: { message: error.message, type: 'server_error' } }` — missing `code`
- Line 152: `{ error: { message: 'input is required', type: 'invalid_request_error' } }` — missing `code`
- Line 171: `{ error: { message: error.message, type: 'server_error' } }` — missing `code`
- Line 177: `{ error: { message: 'file is required', type: 'invalid_request_error' } }` — missing `code`
- Line 188: `{ error: { message: error.message, type: 'server_error' } }` — missing `code`
- Line 195: `{ error: { message: 'input is required', type: 'invalid_request_error' } }` — missing `code`
- Line 203: `{ error: { message: error.message, type: 'server_error' } }` — missing `code`

### Anthropic-compatible endpoint (different format, out of scope):
- Lines 212, 283: `{ type: 'error', error: { type: '...', message: '...' } }` — Anthropic format, not OpenAI

### `middleware.js` errorHandler (line 1-4):
- Returns `{ error: string }` — should be updated to OpenAI format as it's the catch-all

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/server/api.js` | Add `code` field to all OpenAI-compatible error responses | ~8 locations |
| `src/server/middleware.js` | Update errorHandler to return `{ error: { message, type, code } }` | 4 lines |
| `test/server/m103-error-format.test.js` | Create | ~60 lines |

## Implementation Plan

### Step 1: Add helper function in `src/server/api.js`

Add near the top (after line 17):
```javascript
function apiError(res, status, message, type = 'invalid_request_error', code = null) {
  res.status(status).json({ error: { message, type, code } });
}
```

### Step 2: Replace error responses in OpenAI-compatible routes

| Line | Current | New |
|------|---------|-----|
| 96 | `res.status(400).json({ error: { message: 'No messages provided', type: 'invalid_request_error' } })` | `apiError(res, 400, 'No messages provided', 'invalid_request_error', 'missing_required_field')` |
| 145 | `res.status(500).json({ error: { message: error.message, type: 'server_error' } })` | `apiError(res, 500, error.message, 'server_error', null)` |
| 152 | `res.status(400).json({ error: { message: 'input is required', type: 'invalid_request_error' } })` | `apiError(res, 400, 'input is required', 'invalid_request_error', 'missing_required_field')` |
| 171 | `res.status(500).json({ error: { message: error.message, type: 'server_error' } })` | `apiError(res, 500, error.message, 'server_error', null)` |
| 177 | `res.status(400).json({ error: { message: 'file is required', type: 'invalid_request_error' } })` | `apiError(res, 400, 'file is required', 'invalid_request_error', 'missing_required_field')` |
| 188 | `res.status(500).json({ error: { message: error.message, type: 'server_error' } })` | `apiError(res, 500, error.message, 'server_error', null)` |
| 195 | `res.status(400).json({ error: { message: 'input is required', type: 'invalid_request_error' } })` | `apiError(res, 400, 'input is required', 'invalid_request_error', 'missing_required_field')` |
| 203 | `res.status(500).json({ error: { message: error.message, type: 'server_error' } })` | `apiError(res, 500, error.message, 'server_error', null)` |

### Step 3: Update `src/server/middleware.js`

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

### Step 4: Test file `test/server/m103-error-format.test.js`

Test cases:
1. **DBB-004**: POST `/v1/chat/completions` with empty body → response has `error.code` field
2. **DBB-005**: POST `/v1/chat/completions` with non-existent model → `code` present (null is acceptable per OpenAI spec)
3. **DBB-006**: POST `/v1/chat/completions` with no messages → `{ error: { message, type: 'invalid_request_error', code: 'missing_required_field' } }`
4. POST `/v1/audio/transcriptions` with no file → error has `code` field
5. POST `/v1/audio/speech` with no input → error has `code` field

## Scope Exclusions

- Admin routes (`/api/config`, `/api/engines/*`, etc.) use bare `{ error: string }` — these are internal APIs, not OpenAI-compatible, leave as-is
- Anthropic-compatible endpoint (`/v1/messages`) uses Anthropic error format — leave as-is

## ⚠️ Unverified Assumptions

None — all error locations verified from source grep.
