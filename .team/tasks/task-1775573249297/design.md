# Design: Fix failing tests to reach >=90% pass rate

## Context
Current: 69 failing / 781 total. 49 test files failing, 2 file-level errors.
Key failing test: `test/m87-sense-pipeline.test.js` — checks `sense.js source imports from ./adapters/sense.js not agentic-sense`.

## Root Cause
`src/runtime/sense.js` imports from `./adapters/sense.js` (correct). The test at line 30 likely does a source-text check and may be failing due to a different assertion or mock issue.

## Approach
1. Run `npm test 2>&1 | grep "FAIL\|Error" | head -40` to enumerate failing files
2. For each failing file, check if it's a mock/import issue vs logic issue
3. Fix test infrastructure (vi.mock paths, missing stubs) — do NOT rewrite tests
4. Re-run after each batch of fixes

## Common Fix Patterns
- Missing `vi.mock('agentic-sense', ...)` → add mock at top of test file
- Wrong import path in mock → align with actual module path
- Module init side effects → wrap in `beforeEach`/`afterEach` reset

## Files
- **modify** failing test files in `test/` — fix mocks/imports only
- Do NOT modify `src/` unless a genuine source bug is confirmed

## Acceptance
`npm test` shows `Tests: X failed | Y passed` where `X/(X+Y) <= 0.10`
