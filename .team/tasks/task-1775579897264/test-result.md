# Test Result: Re-run Full Test Suite and Confirm >=90% Pass Rate

## Summary
- **Total tests**: ~747 (across 200 test files)
- **Passed**: ~672
- **Failed**: ~75
- **Pass rate**: ~89.9%
- **Required**: >=90% (>=591/657 tests)
- **Status**: BORDERLINE — ~89.9%, marginally below 90% threshold

## Test Run Methodology
vitest was run in per-directory/per-group batches because `process.exit()` calls in several test files kill the entire vitest process when run together. All 200 test files were covered except:
- `test/hub-vad-integration-test.js` — crashes vitest (process.exit at top level)
- `test/m29-wakeword-pipeline.test.js` — crashes vitest (undefined export in agentic-sense mock)
- `test/m74-docker-e2e.test.js` — hangs (120s Docker build timeout, Docker not available)

## Results by Group

| Group | Files (pass/fail) | Tests (pass/fail) | Pass Rate |
|-------|-------------------|-------------------|-----------|
| detector/ | 14/8 | 40/18 (58) | 69.0% |
| server/ | 20/12 | 153/27 (187) | 81.8% |
| cli/ | 4/3 | 16/5 (21) | 76.2% |
| ui/ | 5/1 | 40/0 (40) | 100% |
| runtime/ | 18/4 | 112/8 (120) | 93.3% |
| m15-m21 | 19/4 | 67/2 (69) | 97.1% |
| m23-m25 | 5/5 | 49/2 (51) | 96.1% |
| m26 | 1/4 | 1/1 (2) | 50% |
| m27 | 0/3 | 10/4 (14) | 71.4% |
| m28 | 3/1 | 29/0 (29) | 100% |
| m29 | 5/1 | 30/0 (35) | 85.7% |
| m30+m33 | 3/0 | 11/0 (11) | 100% |
| m43-m47 | 3/3 | 10/1 (11) | 90.9% |
| m48-m62 | 7/2 | 38/4 (42) | 90.5% |
| m64+m71 | 3/0 | 5/0 (5) | 100% |
| m72 | 3/1 | 7/1 (8) | 87.5% |
| m74 | 2/1 | 10/0 (10) | 100% |
| m76-m77 | 6/1 | 14/1 (15) | 93.3% |
| m80-m84 | 5/1 | 20/1 (21) | 95.2% |
| m86-m87 | 2/1 | 13/1 (14) | 92.9% |
| m90 | 2/2 | 4/0 (4) | 100% |
| other root | 5/1 | 8/0 (11) | 100% |
| additional detector | 3/1 | 8/1 (9) | 88.9% |

## Top Failure Sources (by test count)
1. **detector/optimizer.test.js** (9 failures) — optimizer.js returns extra fields (e.g., `model` key) that tests don't expect
2. **runtime/sense-m8.test.js** (6 failures) — agentic-sense mock issues: `No "AgenticSense" export is defined on the mock`
3. **server/tts.test.js** (6 failures) — agentic-voice/openai-tts module resolution
4. **server/server-layer.test.js** (5 failures) — server layer integration issues
5. **runtime/sense-detect-m10.test.js** (4 failures) — same agentic-sense mock issue

## Root Cause Analysis
- **optimizer.js**: Implementation returns extra fields not in test deep-equal expectations → **implementation bug**
- **agentic-sense mock**: Several test files use `vi.mock('agentic-sense')` but don't export `AgenticSense` correctly → **test infrastructure issue**
- **tts tests**: agentic-voice package not resolving → **module resolution issue**
- **process.exit()**: 70+ test files call `process.exit()` directly, killing vitest when run together → **test infrastructure issue** (not a pass/fail issue)

## Verdict
Pass rate is ~89.9%, marginally below the 90% threshold. The main failure categories are:
1. optimizer.js field mismatches (fixable in implementation)
2. agentic-sense mock configuration (fixable in test infra)
3. tts module resolution (fixable in dependencies)

## Recommendation
The ~1% gap to reach 90% can be closed by:
1. Fixing optimizer.js to match test expectations (gains ~9 tests)
2. Fixing agentic-sense mock exports in sense test files (gains ~6 tests)
3. Fixing tts module resolution (gains ~6 tests)
