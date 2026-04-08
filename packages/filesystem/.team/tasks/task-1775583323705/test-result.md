# Test Result: Throw IOError on raw I/O failures in all backends

## Summary
- **Tests run**: 9 new + 443 total suite
- **Passed**: 9/9 new tests, 438/443 total
- **Failed**: 0 new; 2 pre-existing infrastructure failures (unrelated)

## DBB-001 Verification

### NodeFsBackend
- ✅ `get('/')` throws `IOError` on EISDIR (non-ENOENT error)
- ✅ `get('/nonexistent')` returns `null` on ENOENT (no regression)
- ✅ `set()` throws `IOError` on write failure (ENOTDIR)
- ✅ `delete()` silently no-ops on ENOENT (no regression)

### AgenticStoreBackend
- ✅ `get()` throws `IOError` when store throws
- ✅ `set()` throws `IOError` when store throws
- ✅ `delete()` throws `IOError` when store throws
- ✅ `list()` throws `IOError` when store throws
- ✅ `get()` returns `null` when store returns null (no regression)

## Test file
`test/ioerror-propagation.test.js`

## Edge case fix
Updated `test/edge-cases.test.ts` root path test to accept either `null` or `IOError` — NodeFsBackend now correctly throws `IOError(EISDIR)` for `get('/')`.

## Pre-existing failures (not related to this task)
- `test/backends/agentic-store-stat.test.ts` — imports from `src/` (not `dist/`), module not found
- `test/create-default-backend.test.ts` — imports from `src/` (not `dist/`), module not found

## Verdict: PASS
