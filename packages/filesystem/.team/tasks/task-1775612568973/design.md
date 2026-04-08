# Task Design: Verify cross-backend error consistency

## Objective
Verify that all backends throw consistent typed errors (NotFoundError, PermissionDeniedError, IOError) instead of silently swallowing errors. Update prd.json gap status based on findings.

## Files to Modify
- `.team/gaps/prd.json` — update error consistency gap status
- `.team/tasks/task-1775612568973/progress.md` — document findings

## Verification Steps

### Step 1: Read error types
Read `src/errors.ts` to confirm NotFoundError, PermissionDeniedError, IOError are defined.

### Step 2: Check AgenticStoreBackend error handling
Read `src/backends/agentic-store.ts`:
- `get()` — does it throw NotFoundError when key not found? Or return null?
- `delete()` — does it throw on missing key? Or return false silently?
- Are there any empty catch blocks?

### Step 3: Check NodeFsBackend error handling
Read `src/backends/node-fs.ts`:
- `get()` — does it throw NotFoundError for missing files?
- `delete()` — does it throw or return false for missing files?
- Are there any empty catch blocks?

### Step 4: Check OPFSBackend error handling
Read `src/backends/opfs.ts`:
- `get()` — does it throw NotFoundError for missing files?
- `delete()` — does it throw on missing files? Or catch and return false?
- Are there any empty catch blocks?

### Step 5: Cross-reference with existing tests
Check if existing test files validate error behavior:
```bash
grep -l "NotFoundError" test/*.test.js
grep -l "PermissionDeniedError" test/*.test.js
grep -l "IOError" test/*.test.js
```

### Step 6: Update prd.json
Based on findings:
- If all backends throw typed errors → update "PRD §3: backends silently swallow errors" from "partial" to "implemented"
- If some backends still swallow → keep "partial" and document which backends need fixes
- Recalculate match score

## Expected Outcome
Earlier milestones (m15, m16, m22) implemented typed error classes and fixed error handling. Expected finding: error consistency is now "implemented" across all backends.

## Edge Cases
- `get()` returning `null` for missing files is VALID per the StorageBackend interface — this is NOT an error
- `delete()` returning `false` for missing files is VALID — only throw if there's a permission/system error
- Do NOT confuse "not found" semantics (null/false) with error swallowing (catching and ignoring real errors)
