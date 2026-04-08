# M95 DBB — Final Push: Test Pass Rate + Gap Re-evaluation

## Milestone Goal
Push Vision 72% → 90%+ and PRD 78% → 90%+ by fixing remaining test failures and running fresh gap evaluations.

---

## 1. Test Pass Rate ≥90% (task-1775588279635)

**Requirement:** Full test suite passes at ≥90% rate (≥599/665 or equivalent).

**Verification:**
- [ ] `npm test 2>&1` runs to completion without timeout
- [ ] Pass rate ≥90% reported in final summary line
- [ ] Top 20 failing tests identified and categorized by failure type
- [ ] Each fixed test: root cause documented, fix applied, test passes individually
- [ ] No regressions: previously passing tests still pass after fixes
- [ ] Failing tests are grouped by module (detector, runtime, server, ui, cli)
- [ ] Stub/unimplemented tests are excluded from denominator or marked `.skip`

**Current state:** 81.7% (537/657) with 120 failing. M92 fixed stale mock issues.

**Acceptance:** `npm test` shows ≥90% pass rate

---

## 2. agentic-sense External Package Wiring (task-1775588279869)

**Requirement:** agentic-sense is properly wired as an external npm package — no import map references.

**Verification:**
- [ ] `grep -r '#agentic-sense' src/` returns no matches (currently clean)
- [ ] `package.json` lists `"agentic-sense"` in dependencies (currently: `file:./vendor/agentic-sense.tgz`)
- [ ] `src/runtime/sense.js` imports from `'agentic-sense'` (not `#agentic-sense`)
- [ ] Vendor tgz exists: `vendor/agentic-sense.tgz` present and non-empty
- [ ] `test/m64-agentic-sense-wiring.test.js` or equivalent wiring test passes
- [ ] `require('agentic-sense')` resolves without error in Node.js
- [ ] Same verification for agentic-voice, agentic-store, agentic-embed (all 4 packages)

**Acceptance:** All 4 agentic-* packages resolve from package.json deps, zero import map references

---

## 3. Fresh DBB/PRD/Vision Gap Evaluation (task-1775588280002)

**Requirement:** Re-run all 3 gap evaluations with current codebase state.

**Verification:**
- [ ] DBB evaluation run: architecture match score ≥90%
- [ ] Vision evaluation run: feature completeness ≥90%
- [ ] PRD evaluation run: requirement coverage ≥90%
- [ ] Scores documented in milestone status or output
- [ ] Any remaining gaps <90% listed with specific file/line references
- [ ] Evaluation uses current HEAD (post M91-M94 fixes)

**Acceptance:** Vision ≥90% AND PRD ≥90%

---

## Summary

| # | Criterion | Measurable | Target |
|---|-----------|------------|--------|
| 1 | Test pass rate | npm test summary | ≥90% |
| 2 | agentic-sense wiring | Import map refs = 0 | 0/0 |
| 3 | Package resolution | All 4 agentic-* resolve | 4/4 |
| 4 | DBB match score | Architecture coverage | ≥90% |
| 5 | Vision match score | Feature completeness | ≥90% |
| 6 | PRD match score | Requirement coverage | ≥90% |
