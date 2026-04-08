# Milestone m29 Technical Design — Vision Gap Closure (70% → ≥90%)

## Problem Statement

Vision gap analysis scores 70% due to:
- 7 architecture-alignment test failures caused by stale ARCHITECTURE.md
- 1 code bug: standalone grep no-match returns exit code 0 instead of 1
- Missing real filesystem integration tests (only mock backends exist)

PRD is already at 91% and not at risk.

## Technical Approach

### T1: Update ARCHITECTURE.md (architect, P0)

Owner: architect. Changes to `ARCHITECTURE.md` — see task-1775623204028 for details. No code changes.

Seven discrepancy fixes:
1. Line 9: "~400 lines" → "~970 lines"
2. Line 147: Document `{output, exitCode}` return type with 0/1/2 codes
3. Lines 207-212: Move 5 features from "Future Enhancements" to documented sections
4. Lines 221-228: Remove trailing auto-merged CR text
5. Document pipe error short-circuit behavior
6. Document `fs.readOnly` property for permission checking
7. Update Future Enhancements to only unimplemented features

### T2: Fix standalone grep no-match exit code (developer, P1)

Owner: developer. One-line fix in `src/index.ts` at `execPipeline()` standalone path (lines 188-189).

The grep no-match exit code 1 is already correctly handled in:
- Pipe path: line 180 — `(segCmd === 'grep' && output === '') ? 1`
- Input redirect path: line 113 — `(lhsCmd === 'grep' && cmdOutput === '') ? 1`

But the standalone path just calls `exitCodeFor('')` which returns 0.

**Fix**: Extract command name before `execSingle()`, apply same grep check after.

See `task-1775623225684/design.md` for full details.

### T3: Add Node.js filesystem integration tests (developer, P1)

Owner: developer. New file `test/node-fs-integration.test.ts`.

Wraps real Node.js `fs` module in `AgenticFileSystem` interface, creates temp directory, tests core commands against real filesystem.

See `task-1775623225723/design.md` for full details.

### T4: Re-run vision gap analysis (tester, P0)

Owner: tester. Blocked on T1-T3. Re-run gap analysis tooling, update `.team/gaps/vision.json`.

## Dependency Graph

```
T1 (architect) ──┐
T2 (developer) ──┼──→ T4 (tester)
T3 (developer) ──┘
```

T1, T2, T3 are independent and can proceed in parallel. T4 blocks on all three.

## Files Modified

| File | Task | Action |
|------|------|--------|
| `ARCHITECTURE.md` | T1 | Rewrite sections |
| `src/index.ts` | T2 | 2-line change in execPipeline() |
| `test/node-fs-integration.test.ts` | T3 | New file (~150 lines) |
| `.team/gaps/vision.json` | T4 | Update scores |
| `.team/gaps/architecture.json` | T4 | Update scores |

## Risk Assessment

- **T1**: Low risk — documentation-only change. No code behavior affected.
- **T2**: Very low risk — isolated 2-line fix, existing pipe/input-redirect paths prove the pattern works.
- **T3**: Low risk — new test file only, no production code changes. Temp directory cleanup is the main concern (use `afterAll` with `fs.rmSync(recursive)`).
- **T4**: No risk — read-only analysis.

## Verification

1. All 9 architecture-alignment-m28 tests pass (validates T1)
2. `grep "xyz" /file_with_no_xyz` returns exit code 1 (validates T2)
3. `vitest run test/node-fs-integration.test.ts` passes (validates T3)
4. `.team/gaps/vision.json` shows match ≥ 90 (validates T4)
5. No regressions: full `vitest run` passes
