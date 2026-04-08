# Milestone m29: Vision Gap Closure — 70% → ≥90%

## Goal
Close the Vision match gap from 70% to ≥90% by resolving ARCHITECTURE.md discrepancies and fixing remaining code bugs.

## Context
- PRD already meets goal at 91%. Vision is the sole blocker at 70%.
- 7 test failures in `architecture-alignment-m28.test.ts` — all caused by stale ARCHITECTURE.md.
- ARCHITECTURE.md discrepancies have been resolved by developer.
- VISION.md near-term roadmap updated to reflect current implementation state.

## Status: 4/5 tasks complete, 1 unblocked (T4)

### ✅ T1: Update ARCHITECTURE.md to reflect implementation (developer, P0) — DONE
All 7 discrepancies resolved:
1. Line 9: updated to ~978 lines with refactor trigger note
2. Line 149: {output, exitCode} with 0/1/2 codes documented
3. "Implemented Features" section added: glob, env vars, cmd substitution, redirection, bg jobs
4. Auto-merged CR text removed
5. Pipe error short-circuit behavior documented
6. readOnly read from fs.readOnly documented
7. Future Enhancements trimmed to genuinely unimplemented items only

### ✅ T2: Fix standalone grep no-match exit code (tester, P1) — DONE
Fix applied and verified.

### ✅ T3: Add Node.js filesystem integration tests (tester, P1) — DONE
`test/node-fs-integration.test.ts` created with 21 passing tests.

### ✅ T5: Update VISION.md near-term roadmap (pm, P1) — DONE
Roadmap updated — recursive glob patterns removed, remaining items noted with current state.

### ⏳ T4: Re-run vision gap analysis (tester, P0) — UNBLOCKED
Now that T1 and T5 are complete, tester should:
- Re-run gap analysis against updated ARCHITECTURE.md, VISION.md, and code
- Update `.team/gaps/vision.json` with new match score
- Target: Vision ≥90%

## Acceptance Criteria
- [ ] All 7 architecture-alignment-m28 tests pass
- [ ] Vision gap analysis shows ≥90% match
- [x] ARCHITECTURE.md accurately reflects current implementation (T1 — done)
- [x] Standalone grep no-match returns exit code 1 (T2 — done)
- [x] At least 1 Node.js integration test file exists and passes (T3 — done, 21 tests)
- [x] VISION.md near-term roadmap reflects current implementation state (T5 — done)
