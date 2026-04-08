# Fix AgenticStoreBackend stat() mtime to use stored timestamp instead of Date.now()

## Progress

### Verification Complete

**Implementation is correct.** `set()` stores `Date.now()` at write time via `\x00mtime` key suffix. `stat()` reads the stored value instead of computing at call time.

### Bug Fix Applied

Fixed edge case in `stat()` mtime parsing: `Number(mtimeRaw)` returns `NaN` for non-numeric values (e.g., corrupted metadata). Added `|| 0` fallback:

```ts
// Before:
const mtime = mtimeRaw ? Number(mtimeRaw) : 0
// After:
const mtime = mtimeRaw ? Number(mtimeRaw) || 0 : 0
```

### Tests Verified

All 7 mtime tests in `test/agentic-store-mtime.test.js` pass:
- Two stat() calls return same mtime ✓
- mtime is from write time, not stat() time ✓
- Overwrite updates mtime ✓
- delete() removes mtime key ✓
- Legacy file returns mtime: 0 ✓
- list() doesn't expose mtime keys ✓
- scanStream() doesn't scan mtime keys ✓

### Result

599/602 tests pass (3 OPFS browser-only skipped).
