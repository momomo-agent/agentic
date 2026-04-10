# Fix config persistence — api-layer and api-m2 tests failing

## Progress

### Investigation (2026-04-11)

Ran both failing tests:
- `test/server/api-layer.test.js` — all 8 tests pass
- `test/server/api-m2.test.js` — all 8 tests pass

The config persistence bug described in the task (malformed JSON on disk, PUT/GET round-trip failure) has already been fixed in a prior commit.

Full test suite verification: 171 test files, 951 tests passed, 11 skipped. No regressions.

### Resolution

Issue was already resolved. Marking as done.
