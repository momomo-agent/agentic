# Task Design: Verify and update PRD gap status

## Objective
Audit `.team/gaps/prd.json` against the actual codebase and correct stale gap statuses. Recalculate the PRD match score.

## Files to Modify
- `.team/gaps/prd.json` — update gap statuses and match score

## Verification Steps

### Step 1: Audit test coverage gaps
```bash
# Check if per-backend test files exist
ls test/*.test.js | wc -l                    # expect ≥53
ls test/*memory*.test.js                      # MemoryStorage tests
ls test/*node*fs*.test.js                     # NodeFsBackend tests
ls test/*agentic*store*.test.js               # AgenticStoreBackend tests
ls test/*opfs*.test.js                        # OPFSBackend tests
ls test/*sqlite*.test.js                      # SQLiteBackend tests
ls test/*local*storage*.test.js               # LocalStorageBackend tests
```
If per-backend test files exist → update "PRD §4: Complete per-backend test suites" from "missing" to "implemented"

### Step 2: Audit cross-backend tests
```bash
ls test/cross-backend*.test.js               # cross-backend consistency tests
ls test/*consistency*.test.js
```
If found → update "PRD §4: Cross-backend consistency tests" from "missing" to "implemented"

### Step 3: Audit edge case tests
```bash
ls test/edge-case*.test.js                   # edge case tests
```
If found → update "PRD §4: Edge case tests" from "missing" to "implemented"

### Step 4: Audit README
```bash
test -f README.md && echo "EXISTS" || echo "MISSING"
grep -c "usage\|example\|quickstart" README.md   # check for usage content
```
If README.md exists with usage examples → update "PRD §5: README" from "missing" to "implemented"

### Step 5: Audit scan() streaming
Read `src/backends/agentic-store.ts` — check if `scanStream()` uses lazy iteration (cursor/iterator pattern) or loads all content. If it streams → update "PRD §1: scan() streaming" from "partial" to "implemented"

### Step 6: Recalculate match score
```
match = (count of "implemented" gaps) / (total gaps) * 100
```
Round to nearest integer. Update `prd.json` `match` field.

## Expected Outcome
- Most "missing" gaps should become "implemented"
- "partial" gaps may become "implemented" if fully resolved
- Match score should increase from 72% to ≥87%

## Edge Cases
- Some gaps may still be genuinely "partial" — do NOT downgrade without evidence
- If cross-backend tests don't exist yet, keep that gap as-is (task-1775607507903 in m22 may still be in progress)
- Match score must be calculated AFTER all status updates
