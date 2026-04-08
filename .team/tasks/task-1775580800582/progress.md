# Add performance benchmark suite

## Progress

Created `test/perf.test.ts` with 3 benchmarks. All pass:
- grep on 1MB file < 500ms ✓
- find on 1000 files < 1000ms ✓
- ls pagination on 1000-entry dir < 100ms ✓
