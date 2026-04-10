# Fix config.js atomic write — ENOENT on rename after mkdir

## Progress

### Root Cause

Two issues causing flaky test failures:

1. **Shared state between parallel tests**: `test/config-persistence.test.js` and `test/server/config-persistence.test.js` both write to `~/.agentic-service/config.json`. When vitest runs them in parallel, one test's cleanup can delete files mid-operation in the other.

2. **`_writeToDisk` not resilient to ENOENT**: If the `.tmp` file or directory is removed between `writeFile` and `rename`, the operation fails.

### Fixes Applied (already committed by prior session)

1. `src/config.js` `_writeToDisk`: ENOENT retry on rename failure.
2. `test/config-persistence.test.js`: Isolated temp dir via `AGENTIC_CONFIG_DIR`.
3. `test/detector/hot-reload.test.js` + `test/server/m13-dbb.test.js`: Increased wait timeouts.

### Verification

3 consecutive full suite runs: 173 files, 972 tests, 0 failures.
