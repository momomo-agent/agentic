# M95: Technical Design — Final Push: Test Pass Rate + Gap Re-evaluation

## Overview

M95 is the final milestone to achieve Vision ≥90% + PRD ≥90%. Three tasks:
1. Fix remaining test failures to reach ≥90% pass rate
2. Clean up agentic-sense external package wiring (remove stale import map entries)
3. Run fresh DBB/PRD/Vision gap evaluation

## Root Cause Analysis (Test Failures)

Investigation revealed 3 categories of test failures:

### Category A: Stale `#agentic-sense` in package.json imports map
- `package.json` `imports` field still has `"#agentic-sense": "./src/runtime/adapters/sense.js"`
- Tests in M84, M86, M87, integration all assert this should be REMOVED
- Source code (`adapters/sense.js`) already imports from `'agentic-sense'` (npm package) — correct
- **Fix:** Remove `#agentic-sense` from `imports` in package.json

### Category B: Old tests mock `'#agentic-sense'` (with hash prefix)
- `test/runtime/sense-wakeword-m93.test.js` — mocks `'#agentic-sense'`
- `test/runtime/sense-wakeword-m80.test.js` — mocks `'#agentic-sense'`
- These mocks don't intercept the real import (`'agentic-sense'` without hash)
- vitest config has NO alias for `#agentic-sense`
- **Fix:** Change mocks from `'#agentic-sense'` to `'agentic-sense'`

### Category C: Other stale mocks / broken tests
- Will be identified during Task 1 execution — run full suite, triage failures

## Task Breakdown

### Task 1: Fix Test Suite (task-1775588279635)

**Files to modify:**
- `package.json` — remove `#agentic-sense` from `imports` map
- `test/runtime/sense-wakeword-m93.test.js` — fix mock path `'#agentic-sense'` → `'agentic-sense'`
- `test/runtime/sense-wakeword-m80.test.js` — fix mock path `'#agentic-sense'` → `'agentic-sense'`
- Additional files TBD based on test run output

**Algorithm:**
1. Fix Category A + B issues (known root causes)
2. Run `npm test 2>&1 | tee /tmp/test-output.txt`
3. Parse failures, group by test file
4. For each failing test: read source + test, identify root cause, fix
5. Re-run after each batch of fixes, verify no regressions
6. Repeat until pass rate ≥90%

### Task 2: agentic-sense Wiring (task-1775588279869)

**Files to modify:**
- `package.json` — ensure all 4 agentic-* deps present, remove stale import map entries
- Verify: `grep -r '#agentic-sense\|#agentic-voice\|#agentic-store\|#agentic-embed' src/` = empty

**Already correct (no changes needed):**
- `src/runtime/adapters/sense.js` — imports `'agentic-sense'` directly ✓
- `src/runtime/adapters/embed.js` — imports `'agentic-embed'` directly ✓
- `package.json` dependencies — all 4 agentic-* listed with `file:` refs ✓

### Task 3: Gap Evaluation (task-1775588280002)

**Approach:** Pure verification — run gap evaluators, report scores.
- Depends on Task 1 and Task 2 completing first
- No source code changes

## Dependencies

- Task 1 and Task 2 can run in parallel (both touch package.json but different fields)
- Task 3 depends on both Task 1 and Task 2

## Risk

- Coverage threshold set at 98% in vitest.config.js — may need adjustment if current coverage is lower
- Some tests may be stubs (testing unimplemented features) — skip those rather than counting as failures
