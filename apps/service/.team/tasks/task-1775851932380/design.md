# Design: Fix config persistence — api-layer and api-m2 tests failing

## Module
Server (ARCHITECTURE.md § Server) — specifically `src/server/api.js` PUT /api/config handler and `src/config.js` persistence layer.

## Root Cause Analysis
The task reported two test failures:
1. `api-layer.test.js:52` — PUT /api/config then GET round-trip not returning saved value
2. `api-m2.test.js:83` — config file on disk contains malformed JSON (SyntaxError)

Hypothesis: `_writeToDisk()` in config.js was producing invalid JSON — either appending instead of overwriting, or concurrent writes racing.

## Verified Implementation
The current `_writeToDisk()` in `src/config.js:320-326` uses atomic write pattern:
1. Write to `CONFIG_PATH + '.tmp'` with `JSON.stringify(clean, null, 2)`
2. Atomic rename via `fs.rename(tmp, CONFIG_PATH)`

This pattern prevents partial writes and race conditions. The fix was applied in a prior commit.

## Files Involved
- `src/config.js` — `_writeToDisk()` (lines 320-326), `setConfig()` (lines 43-51)
- `src/server/api.js` — PUT /api/config handler (lines 269-276)

## Verification
- `test/server/api-layer.test.js` — 8/8 passing
- `test/server/api-m2.test.js` — 8/8 passing
- Full suite: 171 files, 951 tests passed

## Status
RESOLVED — no code changes needed, issue was already fixed.
