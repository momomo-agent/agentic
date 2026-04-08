# m24: PRD Gap Verification & Documentation Completion — DBB (验收标准)

## Milestone Goal
Push PRD match from 72% to ≥90% by verifying existing work against PRD gaps, updating gap tracker status, and completing remaining documentation.

## Verification Criteria

### 1. PRD gap status verification (task-1775612568885)
- [ ] `prd.json` gap "PRD §4: Complete per-backend test suites" status updated from "missing" to "implemented" (53+ test files confirmed in `test/`)
- [ ] `prd.json` gap "PRD §4: Cross-backend consistency tests" status verified — if `test/cross-backend-consistency*.test.js` exists, mark "implemented"
- [ ] `prd.json` gap "PRD §4: Edge case tests" status updated — `test/edge-cases*.test.js` exists, mark "implemented"
- [ ] `prd.json` gap "PRD §5: README with usage examples" status updated — `README.md` exists at root, mark "implemented"
- [ ] `prd.json` gap "PRD §5: Per-backend configuration docs and performance comparison table" verified — if table exists in README, mark "implemented"
- [ ] `prd.json` gap "PRD §1: scan() streaming" status updated based on actual AgenticStoreBackend implementation
- [ ] `prd.json` match score recalculated and updated (target ≥87%)
- [ ] All gap statuses in `prd.json` are accurate (no stale "missing" for already-implemented features)

### 2. Performance comparison table in README (task-1775612568931)
- [ ] `README.md` contains a performance comparison table section
- [ ] Table includes all 6 backends: Memory, NodeFs, OPFS, AgenticStore, SQLite, LocalStorage
- [ ] Table columns: Backend, Relative Speed, Memory Usage, Best Use Case
- [ ] Table includes a "Storage Limit" column or section
- [ ] Content is factually consistent with ARCHITECTURE.md backend descriptions
- [ ] No source code changes — documentation only

### 3. Cross-backend error consistency verification (task-1775612568973)
- [ ] Test or verification confirms `AgenticStoreBackend.get('/nonexistent')` throws `NotFoundError`
- [ ] Test or verification confirms `NodeFsBackend.get('/nonexistent')` throws `NotFoundError`
- [ ] Test or verification confirms `AgenticStoreBackend.delete('/nonexistent')` returns `false` (no throw)
- [ ] Test or verification confirms `NodeFsBackend.delete('/nonexistent')` returns `false` (no throw)
- [ ] `prd.json` gap "PRD §3: backends silently swallow errors" updated based on findings
- [ ] Findings documented in task progress file

### 4. stat() improvements verification (task-1775612569013)
- [ ] `AgenticStoreBackend.stat()` mtime behavior documented — confirm whether it uses `Date.now()` or actual timestamps
- [ ] `OPFSBackend.stat()` directory detection verified — confirm `isDirectory` returns `true` for directory paths
- [ ] `vision.json` gap "AgenticStore stat() mtime" updated based on findings
- [ ] `vision.json` gap "OPFS stat() directory support" updated based on findings
- [ ] `vision.json` match score recalculated if gaps change status

### Cross-Cutting
- [ ] `npx tsup` builds without errors
- [ ] `node --test test/*.test.js` — full suite passes
- [ ] No regressions introduced by documentation changes

## Verification Matrix

| Criterion | Verification Method | Expected |
|-----------|-------------------|----------|
| PRD gap statuses accurate | Manual review of prd.json | All stale gaps corrected |
| PRD match ≥90% | prd.json match field | ≥90 |
| Performance table in README | Manual review | All 6 backends covered |
| Error consistency | Source/test inspection | Typed throws confirmed |
| stat() improvements | Source inspection | Gaps updated in vision.json |
