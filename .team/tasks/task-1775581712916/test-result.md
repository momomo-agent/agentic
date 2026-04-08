# Test Result: Fix stale agentic-sense mocks and test bugs

## Summary
- **Total tests**: 15
- **Passed**: 15
- **Failed**: 0

## Results by file

### m87-sense-pipeline.test.js — 4/4 passed
All AgenticSense mock tests pass including async `init()` handling.

### m84-sense-external-package.test.js — 5/5 passed
All external package tests pass with `init()` in mock.

### m77-sense-imports.test.js — 6/6 passed (1 test bug fixed)
**Bug found and fixed**: Line 24 used `senseRuntimePath` (sense.js) as `checkPath` when it exists, but `sense.js` imports from `./adapters/sense.js` — not `agentic-sense` directly. Fixed to always check `adapterPath` for the `agentic-sense` string, which is where the import lives.

## DBB Criteria
- [x] m87-sense-pipeline, m84-sense-external-package, m77-sense-imports all pass
- [x] All `AgenticSense` mocks include `init()` method
- [x] m87 `createPipeline()` async handling correct
- [x] m77 `#agentic-sense` import map absence assertion passes
