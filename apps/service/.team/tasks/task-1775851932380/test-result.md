# Test Result: Fix config persistence — api-layer and api-m2 tests failing

## Summary
PASS — All config persistence tests pass (27/27). Atomic write fix in `src/config.js:320-326` verified.

## Test Results

| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| test/server/api-layer.test.js | 8 | 8 | 0 |
| test/server/api-m2.test.js | 8 | 8 | 0 |
| test/server/config-persistence.test.js (new) | 11 | 11 | 0 |
| **Total** | **27** | **27** | **0** |

## Full Suite (DBB-021)
- 173 test files passed, 972 tests passed, 11 skipped, 0 failures

## New Tests Added (test/server/config-persistence.test.js)

1. No .tmp file remains after successful PUT
2. Config file is valid JSON after PUT (verified via GET round-trip)
3. PUT response confirms success with {ok: true}
4. Deep merge preserves nested objects across writes
5. PUT preserves default keys not in update
6. _hardware key is not returned by GET after PUT
7. _profileSource key is not persisted to disk
8. Multiple rapid sequential PUTs all persist correctly (last write wins)
9. PUT returns {ok: true}
10. GET after PUT returns the updated value
11. PUT with empty object does not break config

## Verification Against Design
- Root cause (malformed JSON from _writeToDisk): Verified fixed — atomic write pattern (tmp + rename) produces valid JSON on every write
- PUT/GET round-trip: Verified in api-layer.test.js, api-m2.test.js, and config-persistence.test.js
- Disk persistence: Verified — config.json on disk is always valid JSON
- No .tmp file leak: Verified — temp file is cleaned up after rename
- Deep merge: Verified — nested objects merge correctly, defaults preserved
- Internal key stripping: Verified — _hardware and _profileSource stripped from disk

## Edge Cases
- Cross-test config cache isolation: Config module singleton cache can leak between vitest test files. Mitigated with reloadConfig() in beforeEach.
- Concurrent rapid writes: Sequential rapid writes verified (5 PUTs); true concurrent writes not tested (requires process-level concurrency)
- Disk full / permission denied: Not tested (environment-dependent)

## Verdict: PASS
