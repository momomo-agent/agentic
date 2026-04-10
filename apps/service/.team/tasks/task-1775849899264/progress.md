# Fix m28-profiles-cache.test.js — cache timestamp not updated after fetch (regression)

## Progress

### Investigation
- The reported bug: `saveCache()` was preserving old timestamps instead of using `Date.now()`
- Checked `src/detector/profiles.js:87-94` — `saveCache()` correctly uses `timestamp: Date.now()`
- The fix was already applied (likely by previous task-1775847933739)

### Verification
- `test/m28-profiles-cache.test.js`: all 5 tests pass
- Full suite: 169 files, 910 passed, 0 failed
- No code changes needed — bug was already resolved
