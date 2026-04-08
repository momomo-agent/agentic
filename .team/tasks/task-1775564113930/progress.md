# Fix NodeFsBackend race condition test

## Progress

Fixed `test/concurrent.test.ts`: replaced `null || v2` assertion with `null || v1 || v2` to cover all valid race outcomes. Verified with 5/5 passing runs.
