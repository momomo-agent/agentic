# Fix profiles-edge-cases.test.js — expired cache fallback assertion

## Progress

### Verified: Test already passes

Ran `npx vitest run test/detector/profiles-edge-cases.test.js` — all 14 tests pass, including "should use expired cache when network fails" (line 300-344).

The test writes cache with `match: {}` and `config.llm.provider: 'cached-provider'`. When `getProfile()` uses expired cache (network mocked to fail), `matchProfile()` processes the single profile with empty match criteria, which scores `1` (catch-all) and returns the cached config correctly.

Also ran full detector test suite: 37/37 tests pass across 8 files.

No code changes needed — the issue was already resolved in a prior commit.
