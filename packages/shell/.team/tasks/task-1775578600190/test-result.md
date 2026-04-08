# Test Result: Verify coverage gate and test count threshold

## Summary
- Total tests: 271 (≥148 ✅)
- Passed: 263
- Failed: 8
- Statement coverage: 93.53% (≥80% ✅)
- Branch coverage: 89.62% (≥75% ✅)
- Function coverage: 94.11%
- vitest.config.ts thresholds block: configured ✅

## DBB Verification

### DBB-004: Coverage gate enforced
- ✅ Statement coverage 93.53% ≥ 80%
- ✅ Branch coverage 89.62% ≥ 75%
- ✅ Test count 271 ≥ 148
- ✅ vitest.config.ts has `thresholds: { statements: 80, branches: 75 }`

## Failing Tests (8) — Implementation Bugs

### test/wc-flags-m16.test.ts (4 failures)
Tests expect tab-separated output with filename (e.g. `'5\t/f.txt'`) but implementation returns count only (e.g. `'5'`).
- `wc -l` returns line count with filename
- `wc -l` returns 0 for empty file
- `wc -w` returns word count with filename
- `wc -c` returns char count with filename

### test/pipe-error-propagation.test.ts (2 failures)
Tests expect failed left command to pass empty stdin to right command, but implementation short-circuits.
- `cat nonexistent | grep foo` — should pass empty stdin to grep
- Multi-segment pipe with failing left side

### test/task-1775574415352.test.ts (2 failures)
Tests expect `cp dir dest` (without -r) to return `'cp: <path>: is a directory'` without `(use -r)` suffix.
- Error message format mismatch

## Edge Cases Identified
- wc flag output format inconsistency (tab vs space, with/without filename)
- pipe error propagation not fully implemented
- cp directory error message format differs from test expectation

## Conclusion
Coverage gate is properly configured and thresholds are met. The 8 failing tests are implementation bugs in wc, pipe error propagation, and cp — not coverage gate issues. Task DBB-004 is satisfied.
