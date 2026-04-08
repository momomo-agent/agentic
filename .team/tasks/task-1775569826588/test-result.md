# Test Result: Fix SIGINT graceful drain during in-flight requests

## Summary
- Tests passed: 6/6
- Tests failed: 0

## Results
- `test/sigint.test.js`: ✓ PASSED (1 test)
  - `httpServer.close` called on SIGINT ✓
- `test/m48-sigint-drain.test.js`: ✓ PASSED (5 tests, 313ms)
  - `startDrain()` called before close ✓
  - `waitDrain()` awaited before close ✓
  - Drain timeout proceeds with close ✓
  - No in-flight requests → resolves immediately ✓
  - Double SIGINT handled via `process.once` ✓

## Verdict: PASS
