# Milestone m25 Technical Design

## Objective
Re-run gap analysis on the current codebase and update stale gap files (prd.json, vision.json, architecture.json) to reflect actual implementation state. The current files were generated April 7 before m15-m24 completed.

## Approach
Each task is a data-update task — no source code changes. The developer reads the gap analysis JSON files, cross-references the actual codebase state, updates stale entries, and recalculates match scores.

## Architecture Context

Gap analysis files live in `.team/gaps/`:
- `prd.json` — PRD requirement coverage (currently 72%, should be ~90%+)
- `vision.json` — Vision spec coverage (currently 90%, should stay 90%+)
- `architecture.json` — Architecture spec coverage (currently 82%, should be ~95%+)

Each file has the schema:
```json
{
  "match": <number 0-100>,
  "timestamp": "<ISO string>",
  "gaps": [
    { "description": "<string>", "status": "implemented|partial|missing" }
  ]
}
```

## Known Stale Items (verified in codebase)

### prd.json (5 "missing" → all exist)
1. "Per-backend test suites" — 40+ test files in `test/` (e.g., `memory-storage.test.js`, `sqlite-backend.test.js`, `opfs-m15.test.js`)
2. "Cross-backend consistency tests" — 4 files: `cross-backend.test.js`, `cross-backend-consistency.test.js`, `cross-backend-extra.test.js`, `cross-backend-scanstream.test.js`
3. "Edge case tests" — `edge-cases.test.js`, `edge-cases.test.ts`, `edge-cases-error-types.test.js`
4. "README with usage examples" — `README.md` exists with backend examples and performance table
5. "Per-backend configuration docs" — README has backend config examples

### vision.json (1 "missing" → exists; 1 "partial" → fixed)
1. "SQLiteBackend not in createBackend()" — implemented in `src/index.ts` lines 38-52 (sqliteDb option + auto-detect better-sqlite3)
2. "batchGet/batchSet/scanStream not exposed" — exposed on AgenticFileSystem in `src/filesystem.ts`

### architecture.json (3 "missing" → all exist/fixed)
1. "ARCHITECTURE.md does not exist" — `ARCHITECTURE.md` exists (75 lines)
2. "OPFSBackend missing empty-path validation" — fixed in m15
3. "No cross-backend consistency tests" — 4 test files exist

## Task Dependency Chain
- Task-1775613064143 (re-run gap analysis) — independent, can run first
- Task-1775613064181 (update vision.json) — depends on 64143 for fresh analysis approach
- Task-1775613064216 (update architecture.json) — depends on 64143 for fresh analysis approach
- All three can run in parallel if the developer reads the stale files first

## Verification
After all tasks complete:
- `vision.json.match >= 90` AND `prd.json.match >= 90` (DBB-016)
- All gap files have timestamps newer than 2026-04-07T17:14:12Z (DBB-014)
- No "missing" items for work that demonstrably exists (DBB-015)
