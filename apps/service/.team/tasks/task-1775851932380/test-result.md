# Test Result: Fix config persistence — api-layer and api-m2 tests failing

## Summary
PASS — All config persistence tests pass (26/26). Atomic write fix in `src/config.js:320-326` verified.

## Test Results

| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| test/server/api-layer.test.js | 8 | 8 | 0 |
| test/server/api-m2.test.js | 8 | 8 | 0 |
| test/config-persistence.test.js (new) | 10 | 10 | 0 |
| **Total** | **26** | **26** | **0** |

## Full Suite (DBB-021)
- 171 test files passed, 951 tests passed, 11 skipped, 0 failures

## New Tests Added (test/config-persistence.test.js)

1. setConfig writes valid JSON to disk
2. No .tmp file remains after successful write
3. Multiple sequential writes produce valid JSON each time
4. Deep merge preserves nested objects across writes
5. _hardware and _profileSource are stripped from disk
6. reloadConfig reads fresh data from disk
7. getConfig returns defaults when config file is missing
8. getConfig returns defaults when config file contains invalid JSON
9. onConfigChange listener fires on setConfig
10. Unsubscribed listener does not fire

## Verification Against Design
- Root cause (malformed JSON from _writeToDisk): Verified fixed — atomic write pattern (tmp + rename) produces valid JSON on every write
- PUT/GET round-trip: Verified in api-layer.test.js and api-m2.test.js
- Disk persistence: Verified — config.json on disk is always valid JSON
- No .tmp file leak: Verified — temp file is cleaned up after rename

## Edge Cases
- Concurrent rapid writes: Not tested (requires process-level concurrency)
- Disk full / permission denied: Not tested (environment-dependent)

## Verdict: PASS
